#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo ElastiCache Redis Provisioning ==="
echo "Region: $REGION"

if [ ! -f "infrastructure/outputs/vpc-outputs.txt" ]; then
  echo "ERROR: infrastructure/outputs/vpc-outputs.txt not found."
  exit 1
fi

source infrastructure/outputs/vpc-outputs.txt

# 1. Create redis-sg
echo "--- 1. Security Group ---"
SG_NAME="quillo-redis-sg"
REDIS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$SG_NAME" --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$REDIS_SG_ID" == "None" ] || [ -z "$REDIS_SG_ID" ]; then
  echo "  Creating Redis Security Group..."
  REDIS_SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "Redis SG - allow 6379 from EC2" \
    --vpc-id "$VPC_ID" \
    --region "$REGION" \
    --query 'GroupId' --output text)
    
  aws ec2 create-tags --resources "$REDIS_SG_ID" --tags Key=Name,Value=$SG_NAME --region "$REGION"
  
  echo "  Adding ingress rule for port 6379 from EC2_SG ($EC2_SG_ID)..."
  aws ec2 authorize-security-group-ingress \
    --group-id "$REDIS_SG_ID" \
    --protocol tcp \
    --port 6379 \
    --source-group "$EC2_SG_ID" \
    --region "$REGION" >/dev/null
else
  echo "  Redis Security Group already exists: $REDIS_SG_ID"
fi

# 2. Create Subnet Group
echo "--- 2. Subnet Group ---"
SUBNET_GROUP_NAME="quillo-redis-subnet-group"
if aws elasticache describe-cache-subnet-groups --cache-subnet-group-name "$SUBNET_GROUP_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "  ElastiCache Subnet Group already exists."
else
  echo "  Creating ElastiCache Subnet Group..."
  aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name "$SUBNET_GROUP_NAME" \
    --cache-subnet-group-description "Subnet group for Quillo Redis" \
    --subnet-ids "$PRIVATE_SUBNET_A_ID" "$PRIVATE_SUBNET_B_ID" \
    --region "$REGION" >/dev/null
fi

# 3. Create Redis Cluster
echo "--- 3. Redis Cluster ---"
CLUSTER_ID="quillo-redis-prod"

echo "Looking up latest Redis 7.x engine version..."
REDIS_VERSION=$(aws elasticache describe-cache-engine-versions \
  --engine redis \
  --query "sort_by(CacheEngineVersions[?starts_with(EngineVersion, '7.')], &EngineVersion)[-1].EngineVersion" \
  --output text \
  --region "$REGION")
echo "  Latest Redis 7.x version: $REDIS_VERSION"

if aws elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --region "$REGION" >/dev/null 2>&1; then
  echo "  Redis Cluster already exists."
else
  echo "  Creating Redis Cluster (Single Node)..."
  # Note: cache.t3.micro for dev/portfolio. 
  # Tradeoff: Single node without Multi-AZ to save cost. Enable Multi-AZ replication group when true HA is needed.
  aws elasticache create-cache-cluster \
    --cache-cluster-id "$CLUSTER_ID" \
    --engine redis \
    --engine-version "$REDIS_VERSION" \
    --cache-node-type cache.t3.micro \
    --num-cache-nodes 1 \
    --cache-subnet-group-name "$SUBNET_GROUP_NAME" \
    --security-group-ids "$REDIS_SG_ID" \
    --tags Key=Name,Value=$CLUSTER_ID \
    --region "$REGION" >/dev/null
fi

echo "  Đang chờ Redis available, việc này mất khoảng 5-10 phút..."
aws elasticache wait cache-cluster-available --cache-cluster-id "$CLUSTER_ID" --region "$REGION"

echo "  Fetching Redis Endpoint..."
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --show-cache-node-info --region "$REGION" --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)
REDIS_PORT=$(aws elasticache describe-cache-clusters --cache-cluster-id "$CLUSTER_ID" --show-cache-node-info --region "$REGION" --query 'CacheClusters[0].CacheNodes[0].Endpoint.Port' --output text)

# Note on lack of auth/password: ElastiCache operates solely within a private VPC without internet access.
# Security relies strictly on Security Group rules. This tradeoff is acceptable for dev/portfolio.
REDIS_URL="redis://${REDIS_ENDPOINT}:${REDIS_PORT}"

echo "--- Saving Outputs ---"
mkdir -p infrastructure/outputs
cat <<EOF > infrastructure/outputs/redis-outputs.txt
REDIS_ENDPOINT=$REDIS_ENDPOINT
REDIS_PORT=$REDIS_PORT
REDIS_URL=$REDIS_URL
EOF

echo "=== Provisioning DONE ==="
echo "REDIS_URL: $REDIS_URL"
echo "Outputs saved to infrastructure/outputs/redis-outputs.txt"
