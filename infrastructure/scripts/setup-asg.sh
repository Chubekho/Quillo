#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo ASG & Launch Template Provisioning ==="
echo "Region: $REGION"

# 1. Source all required outputs
for file in vpc-outputs.txt alb-outputs.txt ecr-outputs.txt sqs-prod-outputs.txt s3-outputs.txt redis-outputs.txt; do
  if [ ! -f "infrastructure/outputs/$file" ]; then
    echo "ERROR: infrastructure/outputs/$file not found."
    exit 1
  fi
  source "infrastructure/outputs/$file"
done

# 2. Lookup AMI ID via SSM Parameter Store for Amazon Linux 2023
echo "Looking up latest AL2023 AMI ID..."
AMI_ID=$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query 'Parameter.Value' \
  --output text \
  --region "$REGION")
echo "  AMI ID: $AMI_ID"

# 3. Build User Data script (base64 encoded without newlines)
echo "Building user-data script..."
USER_DATA=$(cat <<EOF | base64 | tr -d '\n'
#!/bin/bash
dnf install -y docker
systemctl enable --now docker

# Log into ECR and pull image
REGISTRY_URL=\$(echo "$ECR_REPO_URI" | cut -d/ -f1)
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin \$REGISTRY_URL
docker pull ${ECR_REPO_URI}:latest

# Run API container
# LƯU Ý: ALLOWED_ORIGINS placeholder — update Launch Template version sau khi CloudFront domain có ở task 12.8, rồi Instance Refresh ASG.
docker run -d --name quillo-api --restart unless-stopped -p 3001:3001 \\
  -e NODE_ENV=production \\
  -e USE_SECRETS_MANAGER=true \\
  -e APP_SECRETS_ID=quillo/app-secrets-prod \\
  -e AWS_REGION=$REGION \\
  -e AI_PROVIDER=gemini \\
  -e ALLOWED_ORIGINS=https://placeholder.cloudfront.net \\
  -e SQS_GENERATION_QUEUE_URL=$QUEUE_URL \\
  -e SQS_DLQ_URL=$DLQ_URL \\
  -e S3_EXPORTS_BUCKET=$EXPORTS_BUCKET \\
  -e REDIS_URL=$REDIS_URL \\
  ${ECR_REPO_URI}:latest
EOF
)

# 4. Create or update Launch Template
LT_NAME="quillo-lt"
echo "Checking Launch Template: $LT_NAME..."
LT_ID=$(aws ec2 describe-launch-templates --launch-template-names "$LT_NAME" --region "$REGION" --query 'LaunchTemplates[0].LaunchTemplateId' --output text 2>/dev/null || echo "None")

# Note: t3.micro used for portfolio budget. Update to t3.small/medium when needed.
cat <<EOF > /tmp/lt-data.json
{
  "ImageId": "$AMI_ID",
  "InstanceType": "t3.micro",
  "SecurityGroupIds": ["$EC2_SG_ID"],
  "IamInstanceProfile": {
    "Name": "$INSTANCE_PROFILE_NAME"
  },
  "UserData": "$USER_DATA"
}
EOF

if [ "$LT_ID" == "None" ]; then
  echo "  Creating new Launch Template..."
  LT_ID=$(aws ec2 create-launch-template \
    --launch-template-name "$LT_NAME" \
    --launch-template-data file:///tmp/lt-data.json \
    --region "$REGION" \
    --query 'LaunchTemplate.LaunchTemplateId' \
    --output text)
else
  echo "  Launch Template exists. Creating new version..."
  aws ec2 create-launch-template-version \
    --launch-template-id "$LT_ID" \
    --launch-template-data file:///tmp/lt-data.json \
    --region "$REGION" >/dev/null
    
  echo "  Updating default version to latest..."
  LATEST_VER=$(aws ec2 describe-launch-templates --launch-template-ids "$LT_ID" --region "$REGION" --query 'LaunchTemplates[0].LatestVersionNumber' --output text)
  aws ec2 modify-launch-template --launch-template-id "$LT_ID" --default-version "$LATEST_VER" --region "$REGION" >/dev/null
fi
rm -f /tmp/lt-data.json

# 5. Create Auto Scaling Group
ASG_NAME="quillo-api-asg"
echo "Checking Auto Scaling Group: $ASG_NAME..."
ASG_EXISTS=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG_NAME" --region "$REGION" --query 'AutoScalingGroups[0].AutoScalingGroupName' --output text 2>/dev/null || echo "None")

if [ "$ASG_EXISTS" == "None" ] || [ "$ASG_EXISTS" == "" ]; then
  echo "  Creating ASG (Min:2, Max:4, Desired:2)..."
  aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name "$ASG_NAME" \
    --launch-template "LaunchTemplateId=$LT_ID,Version=\$Latest" \
    --min-size 2 \
    --max-size 4 \
    --desired-capacity 2 \
    --vpc-zone-identifier "$PRIVATE_SUBNET_A_ID,$PRIVATE_SUBNET_B_ID" \
    --target-group-arns "$TARGET_GROUP_ARN" \
    --health-check-type ELB \
    --health-check-grace-period 120 \
    --tags Key=Name,Value=quillo-api-instance,PropagateAtLaunch=true \
    --region "$REGION"
    
  echo "  Creating Target Tracking Scaling Policy (CPU Target 60%)..."
  cat <<EOF > /tmp/scaling-policy.json
{
  "TargetValue": 60.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ASGAverageCPUUtilization"
  }
}
EOF
  aws autoscaling put-scaling-policy \
    --auto-scaling-group-name "$ASG_NAME" \
    --policy-name cpu-60-target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration file:///tmp/scaling-policy.json \
    --region "$REGION" >/dev/null
  rm -f /tmp/scaling-policy.json
else
  echo "  Auto Scaling Group $ASG_NAME already exists."
  echo "  (Launch template was updated. Starting Instance Refresh to roll out new version...)"
  REFRESH_ID=$(aws autoscaling start-instance-refresh \
    --auto-scaling-group-name "$ASG_NAME" \
    --strategy Rolling \
    --region "$REGION" \
    --query 'InstanceRefreshId' \
    --output text)
  echo "  Instance refresh đã bắt đầu (ID: $REFRESH_ID)."
  echo "  Theo dõi qua: aws autoscaling describe-instance-refreshes --auto-scaling-group-name $ASG_NAME --region $REGION"
fi

# 6. Final Outputs
echo "--- Saving Outputs ---"
mkdir -p infrastructure/outputs
cat <<EOF > infrastructure/outputs/asg-outputs.txt
LAUNCH_TEMPLATE_ID=$LT_ID
LAUNCH_TEMPLATE_NAME=$LT_NAME
ASG_NAME=$ASG_NAME
EOF

echo "=== Provisioning DONE ==="
echo "Note: ASG cần ~3-5 phút để launch 2 instance đầu + pass health check."
echo "Outputs saved to infrastructure/outputs/asg-outputs.txt"
