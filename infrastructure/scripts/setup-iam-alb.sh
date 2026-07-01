#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo IAM & ALB Provisioning ==="
echo "Region: $REGION"

# 1. Source all required outputs
for file in vpc-outputs.txt sqs-prod-outputs.txt s3-outputs.txt ecr-outputs.txt; do
  if [ ! -f "infrastructure/outputs/$file" ]; then
    echo "ERROR: infrastructure/outputs/$file not found."
    exit 1
  fi
  source "infrastructure/outputs/$file"
done

# Extract ECR ARN
ECR_ACCOUNT_ID=$(echo "$ECR_REPO_URI" | cut -d. -f1)
ECR_REPO_ARN="arn:aws:ecr:${REGION}:${ECR_ACCOUNT_ID}:repository/${ECR_REPO_NAME}"

# Extract Secret ARN for app-secrets-prod
SECRET_ARN=$(aws secretsmanager describe-secret --secret-id quillo/app-secrets-prod --region "$REGION" --query 'ARN' --output text)

echo "--- 1. IAM Role ---"
ROLE_NAME="quillo-ec2-role"
INSTANCE_PROFILE_NAME="quillo-ec2-instance-profile"

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "  Role $ROLE_NAME already exists."
else
  echo "  Creating IAM role: $ROLE_NAME"
  cat <<EOF > /tmp/trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document file:///tmp/trust-policy.json >/dev/null
  rm /tmp/trust-policy.json
fi

echo "  Attaching managed policy AmazonSSMManagedInstanceCore..."
aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"

echo "  Putting inline policy quillo-ec2-policy..."
cat <<EOF > /tmp/inline-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "$SECRET_ARN"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "$QUEUE_ARN"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::$EXPORTS_BUCKET/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams",
        "logs:PutRetentionPolicy"
      ],
      "Resource": "arn:aws:logs:$REGION:*:log-group:/quillo/api:*"
    },
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "$ECR_REPO_ARN"
    }
  ]
}
EOF
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name quillo-ec2-policy --policy-document file:///tmp/inline-policy.json
rm /tmp/inline-policy.json

if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" >/dev/null 2>&1; then
  echo "  Instance profile $INSTANCE_PROFILE_NAME already exists."
else
  echo "  Creating instance profile: $INSTANCE_PROFILE_NAME"
  aws iam create-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" --role-name "$ROLE_NAME" >/dev/null 2>&1 || true
  echo "  Sleeping 10s for IAM propagation..."
  sleep 10
fi

INSTANCE_PROFILE_ARN=$(aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" --query 'InstanceProfile.Arn' --output text)

echo "--- 2. Target Group ---"
TG_NAME="quillo-api-tg"
TG_ARN=$(aws elbv2 describe-target-groups --names "$TG_NAME" --region "$REGION" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "None")

if [ "$TG_ARN" == "None" ]; then
  echo "  Creating Target Group: $TG_NAME"
  # Note: health check path /api/v1/health is verified via backend source code
  TG_ARN=$(aws elbv2 create-target-group \
    --name "$TG_NAME" \
    --protocol HTTP \
    --port 3001 \
    --vpc-id "$VPC_ID" \
    --health-check-protocol HTTP \
    --health-check-port traffic-port \
    --health-check-path /api/v1/health \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --target-type instance \
    --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
else
  echo "  Target Group $TG_NAME already exists."
fi

echo "--- 3. ALB ---"
ALB_NAME="quillo-alb"
ALB_ARN=$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --region "$REGION" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "None")

if [ "$ALB_ARN" == "None" ]; then
  echo "  Creating ALB: $ALB_NAME"
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name "$ALB_NAME" \
    --subnets "$PUBLIC_SUBNET_A_ID" "$PUBLIC_SUBNET_B_ID" \
    --security-groups "$ALB_SG_ID" \
    --scheme internet-facing \
    --type application \
    --region "$REGION" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)
    
  echo "  Waiting for ALB to become available (this may take a few minutes)..."
  aws elbv2 wait load-balancer-available --load-balancer-arns "$ALB_ARN" --region "$REGION"
else
  echo "  ALB $ALB_NAME already exists."
fi

ALB_DNS_NAME=$(aws elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" --region "$REGION" --query 'LoadBalancers[0].DNSName' --output text)

echo "  Checking Listeners..."
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --region "$REGION" --query "Listeners[?Port==\`80\`].ListenerArn" --output text 2>/dev/null || echo "")
if [ "$LISTENER_ARN" == "" ] || [ "$LISTENER_ARN" == "None" ] || [ -z "$LISTENER_ARN" ]; then
  echo "  Creating HTTP:80 Listener..."
  aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn="$TG_ARN" \
    --region "$REGION" >/dev/null
  echo "  TODO: add HTTPS listener after ACM cert issued (domain validation requires DNS records)"
else
  echo "  HTTP:80 Listener already exists."
fi

echo "--- Saving Outputs ---"
mkdir -p infrastructure/outputs
cat <<EOF > infrastructure/outputs/alb-outputs.txt
ALB_ARN=$ALB_ARN
ALB_DNS_NAME=$ALB_DNS_NAME
TARGET_GROUP_ARN=$TG_ARN
INSTANCE_PROFILE_ARN=$INSTANCE_PROFILE_ARN
INSTANCE_PROFILE_NAME=$INSTANCE_PROFILE_NAME
EOF

echo "=== Provisioning DONE ==="
echo "ALB DNS Name: $ALB_DNS_NAME"
echo "Outputs saved to infrastructure/outputs/alb-outputs.txt"
