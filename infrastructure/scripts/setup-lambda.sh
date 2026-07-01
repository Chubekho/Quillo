#!/usr/bin/env bash
set -euo pipefail

REGION="ap-southeast-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Source outputs
VPC_ID=$(grep VPC_ID infrastructure/outputs/vpc-outputs.txt | cut -d= -f2)
PRIVATE_SUBNET_A=$(grep PRIVATE_SUBNET_A_ID infrastructure/outputs/vpc-outputs.txt | cut -d= -f2)
PRIVATE_SUBNET_B=$(grep PRIVATE_SUBNET_B_ID infrastructure/outputs/vpc-outputs.txt | cut -d= -f2)
QUEUE_ARN=$(grep QUEUE_ARN infrastructure/outputs/sqs-prod-outputs.txt | cut -d= -f2)
RDS_SG_ID=$(grep RDS_SG_ID infrastructure/outputs/vpc-outputs.txt | cut -d= -f2)
REDIS_SG_ID="sg-016ae74182aaf7975"
SECRET_ARN="arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:quillo/app-secrets-prod*"

echo "=== 1. Creating IAM Role ==="
ROLE_NAME="quillo-lambda-role"
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  echo "Role ${ROLE_NAME} already exists."
else
  aws iam create-role --role-name "${ROLE_NAME}" --assume-role-policy-document "${TRUST_POLICY}" >/dev/null
  echo "Role ${ROLE_NAME} created."
fi

aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

INLINE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "${QUEUE_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "${SECRET_ARN}"
    }
  ]
}
EOF
)

aws iam put-role-policy --role-name "${ROLE_NAME}" --policy-name quillo-lambda-inline-policy --policy-document "${INLINE_POLICY}"
ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)
sleep 10 # wait for role to propagate

echo "=== 2. Creating Security Group ==="
LAMBDA_SG_NAME="quillo-lambda-sg"
SG_EXISTS=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${LAMBDA_SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" --region ${REGION} --query 'SecurityGroups[0].GroupId' --output text || echo "None")

if [ "${SG_EXISTS}" = "None" ] || [ "${SG_EXISTS}" = "null" ]; then
  LAMBDA_SG_ID=$(aws ec2 create-security-group \
    --group-name "${LAMBDA_SG_NAME}" \
    --description "Lambda worker SG - egress only" \
    --vpc-id "${VPC_ID}" \
    --region ${REGION} --query 'GroupId' --output text)
  echo "Created SG ${LAMBDA_SG_NAME}: ${LAMBDA_SG_ID}"
else
  LAMBDA_SG_ID="${SG_EXISTS}"
  echo "SG ${LAMBDA_SG_NAME} already exists: ${LAMBDA_SG_ID}"
fi

# Add ingress rules to RDS and Redis SGs
echo "Updating RDS and Redis SGs..."
aws ec2 authorize-security-group-ingress --group-id "${RDS_SG_ID}" --protocol tcp --port 5432 --source-group "${LAMBDA_SG_ID}" --region ${REGION} || true
aws ec2 authorize-security-group-ingress --group-id "${REDIS_SG_ID}" --protocol tcp --port 6379 --source-group "${LAMBDA_SG_ID}" --region ${REGION} || true


echo "=== 3. Creating/Updating Lambda Function ==="
FUNCTION_NAME="quillo-worker"
ZIP_FILE="fileb://infrastructure/outputs/worker-lambda.zip"
ENV_VARS="Variables={NODE_ENV=production,USE_SECRETS_MANAGER=true,APP_SECRETS_ID=quillo/app-secrets-prod,AI_PROVIDER=gemini}"
SUBNET_IDS="${PRIVATE_SUBNET_A},${PRIVATE_SUBNET_B}"

if aws lambda get-function --function-name "${FUNCTION_NAME}" --region ${REGION} >/dev/null 2>&1; then
  echo "Updating existing function code and config..."
  aws lambda update-function-code \
    --function-name "${FUNCTION_NAME}" \
    --zip-file "${ZIP_FILE}" \
    --region ${REGION} >/dev/null
  sleep 5
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --role "${ROLE_ARN}" \
    --handler index.handler \
    --timeout 300 \
    --memory-size 512 \
    --vpc-config SubnetIds="${SUBNET_IDS}",SecurityGroupIds="${LAMBDA_SG_ID}" \
    --environment "${ENV_VARS}" \
    --region ${REGION} >/dev/null
else
  echo "Creating new function..."
  aws lambda create-function \
    --function-name "${FUNCTION_NAME}" \
    --runtime nodejs20.x \
    --role "${ROLE_ARN}" \
    --handler index.handler \
    --zip-file "${ZIP_FILE}" \
    --timeout 300 \
    --memory-size 512 \
    --vpc-config SubnetIds="${SUBNET_IDS}",SecurityGroupIds="${LAMBDA_SG_ID}" \
    --environment "${ENV_VARS}" \
    --region ${REGION} >/dev/null
fi
sleep 5

echo "=== 4. Event Source Mapping ==="
# Find existing mapping
MAPPING_UUID=$(aws lambda list-event-source-mappings --function-name "${FUNCTION_NAME}" --event-source-arn "${QUEUE_ARN}" --region ${REGION} --query 'EventSourceMappings[0].UUID' --output text || echo "None")

if [ "${MAPPING_UUID}" = "None" ] || [ "${MAPPING_UUID}" = "null" ]; then
  echo "Creating Event Source Mapping..."
  aws lambda create-event-source-mapping \
    --function-name "${FUNCTION_NAME}" \
    --event-source-arn "${QUEUE_ARN}" \
    --batch-size 1 \
    --region ${REGION} >/dev/null
else
  echo "Event source mapping already exists (UUID: ${MAPPING_UUID})"
fi

echo "Done!"
