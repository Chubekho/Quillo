#!/bin/bash
set -e

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo RDS Provisioning ==="
echo "Region: $REGION"

# 1. Guard check: Ensure vpc-outputs.txt exists
if [ ! -f "infrastructure/outputs/vpc-outputs.txt" ]; then
  echo "ERROR: infrastructure/outputs/vpc-outputs.txt không tồn tại."
  echo "Vui lòng chạy script infrastructure/scripts/setup-vpc.sh trước để khởi tạo mạng."
  exit 1
fi

source infrastructure/outputs/vpc-outputs.txt

# Create outputs directory if it doesn't exist
mkdir -p infrastructure/outputs

# 2. Master Password Generation
PASSWORD_FILE="infrastructure/outputs/rds-master-password.txt"
if [ ! -f "$PASSWORD_FILE" ]; then
  echo "Generating new random master password..."
  openssl rand -base64 18 | tr -d '/+=' | cut -c1-24 > "$PASSWORD_FILE"
else
  echo "Master password file already exists. Reusing existing password."
fi
DB_PASSWORD=$(cat "$PASSWORD_FILE")

# 3. DB Subnet Group
SUBNET_GROUP_NAME="quillo-db-subnet-group"
echo "Checking DB Subnet Group: $SUBNET_GROUP_NAME"
if aws rds describe-db-subnet-groups --db-subnet-group-name "$SUBNET_GROUP_NAME" --region $REGION >/dev/null 2>&1; then
  echo "  DB Subnet Group already exists."
else
  echo "  Creating DB Subnet Group..."
  aws rds create-db-subnet-group \
    --db-subnet-group-name "$SUBNET_GROUP_NAME" \
    --db-subnet-group-description "Quillo DB Subnet Group for RDS" \
    --subnet-ids "$PRIVATE_SUBNET_A_ID" "$PRIVATE_SUBNET_B_ID" \
    --region $REGION \
    --tags Key=Name,Value=$SUBNET_GROUP_NAME >/dev/null
fi

# 4. Find Latest PostgreSQL 16.x Version
echo "Looking up latest PostgreSQL 16.x engine version..."
PG_VERSION=$(aws rds describe-db-engine-versions \
  --engine postgres \
  --query "sort_by(DBEngineVersions[?starts_with(EngineVersion, '16.')], &EngineVersion)[-1].EngineVersion" \
  --output text \
  --region $REGION)
echo "  Latest PG 16.x version: $PG_VERSION"

# 5. Create RDS Instance
DB_INSTANCE_IDENTIFIER="quillo-prod-db"
echo "Checking RDS Instance: $DB_INSTANCE_IDENTIFIER"
if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_IDENTIFIER" --region $REGION >/dev/null 2>&1; then
  echo "  RDS Instance already exists."
else
  echo "  Creating RDS Instance (Multi-AZ)..."
  # Note: 
  # - db.t3.micro is used for dev/portfolio budget. Upgrading to db.t3.small/medium is recommended for real production traffic.
  # - deletion-protection is disabled for dev/portfolio teardown convenience. Set to true for production data safety.
  aws rds create-db-instance \
    --db-instance-identifier "$DB_INSTANCE_IDENTIFIER" \
    --engine postgres \
    --engine-version "$PG_VERSION" \
    --db-instance-class db.t3.micro \
    --multi-az \
    --allocated-storage 20 \
    --storage-type gp3 \
    --max-allocated-storage 100 \
    --db-name quillo \
    --master-username quillo_admin \
    --master-user-password "$DB_PASSWORD" \
    --vpc-security-group-ids "$RDS_SG_ID" \
    --db-subnet-group-name "$SUBNET_GROUP_NAME" \
    --no-publicly-accessible \
    --backup-retention-period 7 \
    --no-deletion-protection \
    --tags Key=Name,Value=$DB_INSTANCE_IDENTIFIER \
    --region $REGION >/dev/null
fi

# 6. Wait for RDS Instance to be available
echo "  Đang chờ RDS available, việc này mất khoảng 10-15 phút..."
aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_IDENTIFIER" --region $REGION

# 7. Fetch endpoints
echo "RDS is available. Fetching endpoints..."
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_IDENTIFIER" \
  --region $REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

RDS_PORT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_IDENTIFIER" \
  --region $REGION \
  --query 'DBInstances[0].Endpoint.Port' \
  --output text)

# 8. Save RDS outputs
echo "Saving outputs..."
cat <<EOF > infrastructure/outputs/rds-outputs.txt
RDS_ENDPOINT=$RDS_ENDPOINT
RDS_PORT=$RDS_PORT
DB_NAME=quillo
DB_USERNAME=quillo_admin
EOF

# 9 & 10. Generate DATABASE_URL and save it securely (do not echo password to terminal)
DATABASE_URL="postgresql://quillo_admin:${DB_PASSWORD}@${RDS_ENDPOINT}:${RDS_PORT}/quillo"
echo "$DATABASE_URL" > infrastructure/outputs/rds-database-url.txt

echo ""
echo "=== RDS Provisioning DONE ==="
echo "RDS configuration saved to: infrastructure/outputs/rds-outputs.txt"
echo "Master password saved to:   infrastructure/outputs/rds-master-password.txt"
echo "DATABASE_URL saved to:      infrastructure/outputs/rds-database-url.txt"
echo "(Note: DATABASE_URL is stored in the file to prevent echoing plaintext secrets in CI logs. Copy it from the file for Secrets Manager task.)"
