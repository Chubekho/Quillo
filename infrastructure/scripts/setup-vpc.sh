#!/bin/bash
set -e

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo VPC Setup ==="
echo "Region: $REGION"

# 1. VPC
echo "Checking existing VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=quillo-vpc" --region $REGION --query 'Vpcs[0].VpcId' --output text)
if [ "$VPC_ID" == "None" ] || [ -z "$VPC_ID" ]; then
  echo "Creating VPC..."
  VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $REGION --query 'Vpc.VpcId' --output text)
  aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=quillo-vpc --region $REGION
  aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames '{"Value":true}' --region $REGION
  aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support '{"Value":true}' --region $REGION
else
  echo "VPC already exists: $VPC_ID"
fi

# 2. Subnets
echo "Setting up Subnets..."
function get_subnet() {
  aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=$1" --region $REGION --query 'Subnets[0].SubnetId' --output text
}

PUBLIC_SUBNET_A_ID=$(get_subnet quillo-public-a)
if [ "$PUBLIC_SUBNET_A_ID" == "None" ] || [ -z "$PUBLIC_SUBNET_A_ID" ]; then
  echo "  Creating Public Subnet A..."
  PUBLIC_SUBNET_A_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.0.0/24 --availability-zone ${REGION}a --region $REGION --query 'Subnet.SubnetId' --output text)
  aws ec2 create-tags --resources $PUBLIC_SUBNET_A_ID --tags Key=Name,Value=quillo-public-a --region $REGION
  aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_A_ID --map-public-ip-on-launch --region $REGION
fi

PUBLIC_SUBNET_B_ID=$(get_subnet quillo-public-b)
if [ "$PUBLIC_SUBNET_B_ID" == "None" ] || [ -z "$PUBLIC_SUBNET_B_ID" ]; then
  echo "  Creating Public Subnet B..."
  PUBLIC_SUBNET_B_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${REGION}b --region $REGION --query 'Subnet.SubnetId' --output text)
  aws ec2 create-tags --resources $PUBLIC_SUBNET_B_ID --tags Key=Name,Value=quillo-public-b --region $REGION
  aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_B_ID --map-public-ip-on-launch --region $REGION
fi

PRIVATE_SUBNET_A_ID=$(get_subnet quillo-private-a)
if [ "$PRIVATE_SUBNET_A_ID" == "None" ] || [ -z "$PRIVATE_SUBNET_A_ID" ]; then
  echo "  Creating Private Subnet A..."
  PRIVATE_SUBNET_A_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.10.0/24 --availability-zone ${REGION}a --region $REGION --query 'Subnet.SubnetId' --output text)
  aws ec2 create-tags --resources $PRIVATE_SUBNET_A_ID --tags Key=Name,Value=quillo-private-a --region $REGION
fi

PRIVATE_SUBNET_B_ID=$(get_subnet quillo-private-b)
if [ "$PRIVATE_SUBNET_B_ID" == "None" ] || [ -z "$PRIVATE_SUBNET_B_ID" ]; then
  echo "  Creating Private Subnet B..."
  PRIVATE_SUBNET_B_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.11.0/24 --availability-zone ${REGION}b --region $REGION --query 'Subnet.SubnetId' --output text)
  aws ec2 create-tags --resources $PRIVATE_SUBNET_B_ID --tags Key=Name,Value=quillo-private-b --region $REGION
fi

# 3. Internet Gateway
echo "Setting up Internet Gateway..."
IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VPC_ID" --region $REGION --query 'InternetGateways[0].InternetGatewayId' --output text)
if [ "$IGW_ID" == "None" ] || [ -z "$IGW_ID" ]; then
  echo "  Creating Internet Gateway..."
  IGW_ID=$(aws ec2 create-internet-gateway --region $REGION --query 'InternetGateway.InternetGatewayId' --output text)
  aws ec2 create-tags --resources $IGW_ID --tags Key=Name,Value=quillo-igw --region $REGION
  aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $REGION
fi

# 4. NAT Gateway
echo "Setting up NAT Gateway..."
NAT_GATEWAY_ID=$(aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available" --region $REGION --query 'NatGateways[0].NatGatewayId' --output text)
if [ "$NAT_GATEWAY_ID" == "None" ] || [ -z "$NAT_GATEWAY_ID" ]; then
  NAT_GATEWAY_ID=$(aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=pending" --region $REGION --query 'NatGateways[0].NatGatewayId' --output text)
fi

if [ "$NAT_GATEWAY_ID" == "None" ] || [ -z "$NAT_GATEWAY_ID" ]; then
  echo "  Allocating Elastic IP for NAT..."
  EIP_ALLOC_ID=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=quillo-nat-eip" --region $REGION --query 'Addresses[0].AllocationId' --output text)
  if [ "$EIP_ALLOC_ID" == "None" ] || [ -z "$EIP_ALLOC_ID" ]; then
    EIP_ALLOC_ID=$(aws ec2 allocate-address --domain vpc --region $REGION --query 'AllocationId' --output text)
    aws ec2 create-tags --resources $EIP_ALLOC_ID --tags Key=Name,Value=quillo-nat-eip --region $REGION
  fi

  echo "  Creating NAT Gateway (Note: Single NAT in AZ-a for dev/portfolio. Tradeoff: Cost vs HA)..."
  NAT_GATEWAY_ID=$(aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET_A_ID --allocation-id $EIP_ALLOC_ID --region $REGION --query 'NatGateway.NatGatewayId' --output text)
  aws ec2 create-tags --resources $NAT_GATEWAY_ID --tags Key=Name,Value=quillo-nat --region $REGION
  
  echo "  Waiting for NAT Gateway to be available..."
  aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GATEWAY_ID --region $REGION
fi

# 5. Route Tables
echo "Setting up Route Tables..."
PUBLIC_RT_ID=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=quillo-public-rt" --region $REGION --query 'RouteTables[0].RouteTableId' --output text)
if [ "$PUBLIC_RT_ID" == "None" ] || [ -z "$PUBLIC_RT_ID" ]; then
  echo "  Creating Public Route Table..."
  PUBLIC_RT_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --region $REGION --query 'RouteTable.RouteTableId' --output text)
  aws ec2 create-tags --resources $PUBLIC_RT_ID --tags Key=Name,Value=quillo-public-rt --region $REGION
  aws ec2 create-route --route-table-id $PUBLIC_RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --region $REGION >/dev/null
  aws ec2 associate-route-table --route-table-id $PUBLIC_RT_ID --subnet-id $PUBLIC_SUBNET_A_ID --region $REGION >/dev/null
  aws ec2 associate-route-table --route-table-id $PUBLIC_RT_ID --subnet-id $PUBLIC_SUBNET_B_ID --region $REGION >/dev/null
fi

PRIVATE_RT_ID=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=quillo-private-rt" --region $REGION --query 'RouteTables[0].RouteTableId' --output text)
if [ "$PRIVATE_RT_ID" == "None" ] || [ -z "$PRIVATE_RT_ID" ]; then
  echo "  Creating Private Route Table..."
  PRIVATE_RT_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --region $REGION --query 'RouteTable.RouteTableId' --output text)
  aws ec2 create-tags --resources $PRIVATE_RT_ID --tags Key=Name,Value=quillo-private-rt --region $REGION
  aws ec2 create-route --route-table-id $PRIVATE_RT_ID --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_GATEWAY_ID --region $REGION >/dev/null
  aws ec2 associate-route-table --route-table-id $PRIVATE_RT_ID --subnet-id $PRIVATE_SUBNET_A_ID --region $REGION >/dev/null
  aws ec2 associate-route-table --route-table-id $PRIVATE_RT_ID --subnet-id $PRIVATE_SUBNET_B_ID --region $REGION >/dev/null
fi

# 6. Security Groups
echo "Setting up Security Groups..."
function get_sg() {
  aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$1" --region $REGION --query 'SecurityGroups[0].GroupId' --output text
}

ALB_SG_ID=$(get_sg alb-sg)
if [ "$ALB_SG_ID" == "None" ] || [ -z "$ALB_SG_ID" ]; then
  echo "  Creating ALB Security Group..."
  ALB_SG_ID=$(aws ec2 create-security-group --group-name alb-sg --description "ALB SG - allow 80, 443" --vpc-id $VPC_ID --region $REGION --query 'GroupId' --output text)
  aws ec2 create-tags --resources $ALB_SG_ID --tags Key=Name,Value=alb-sg --region $REGION
  aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION >/dev/null
  aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION >/dev/null
fi

EC2_SG_ID=$(get_sg ec2-sg)
if [ "$EC2_SG_ID" == "None" ] || [ -z "$EC2_SG_ID" ]; then
  echo "  Creating EC2 Security Group..."
  EC2_SG_ID=$(aws ec2 create-security-group --group-name ec2-sg --description "EC2 SG - allow 3001 from ALB" --vpc-id $VPC_ID --region $REGION --query 'GroupId' --output text)
  aws ec2 create-tags --resources $EC2_SG_ID --tags Key=Name,Value=ec2-sg --region $REGION
  aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 3001 --source-group $ALB_SG_ID --region $REGION >/dev/null
fi

RDS_SG_ID=$(get_sg rds-sg)
if [ "$RDS_SG_ID" == "None" ] || [ -z "$RDS_SG_ID" ]; then
  echo "  Creating RDS Security Group..."
  RDS_SG_ID=$(aws ec2 create-security-group --group-name rds-sg --description "RDS SG - allow 5432 from EC2" --vpc-id $VPC_ID --region $REGION --query 'GroupId' --output text)
  aws ec2 create-tags --resources $RDS_SG_ID --tags Key=Name,Value=rds-sg --region $REGION
  aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $EC2_SG_ID --region $REGION >/dev/null
fi

# 7. Outputs
echo "Saving outputs to infrastructure/outputs/vpc-outputs.txt..."
mkdir -p infrastructure/outputs
cat <<EOF > infrastructure/outputs/vpc-outputs.txt
VPC_ID=$VPC_ID
PUBLIC_SUBNET_A_ID=$PUBLIC_SUBNET_A_ID
PUBLIC_SUBNET_B_ID=$PUBLIC_SUBNET_B_ID
PRIVATE_SUBNET_A_ID=$PRIVATE_SUBNET_A_ID
PRIVATE_SUBNET_B_ID=$PRIVATE_SUBNET_B_ID
ALB_SG_ID=$ALB_SG_ID
EC2_SG_ID=$EC2_SG_ID
RDS_SG_ID=$RDS_SG_ID
NAT_GATEWAY_ID=$NAT_GATEWAY_ID
IGW_ID=$IGW_ID
EOF

echo ""
echo "=== VPC setup DONE ==="
