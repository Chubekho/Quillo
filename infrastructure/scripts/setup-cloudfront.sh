#!/bin/bash
# ON HOLD: account chưa verify CloudFront, xem PROGRESS.md Day 13
set -eo pipefail

STEP=$2
BUCKET_NAME="quillo-frontend-prod"
REGION="us-east-1"
OUTPUT_DIR="$(dirname "$0")/../outputs"

mkdir -p "$OUTPUT_DIR"

if [ "$1" != "--step" ]; then
    echo "Usage: $0 --step <oai|distribution|bucket-policy>"
    exit 1
fi

case "$STEP" in
    oac|oai)
        echo "Creating OAI (falling back from OAC due to old AWS CLI)..."
        OAI_CONFIG='{
            "CallerReference": "quillo-frontend-oai-'"$(date +%s)"'",
            "Comment": "OAI for quillo frontend"
        }'
        
        RESULT=$(aws cloudfront create-cloud-front-origin-access-identity \
            --cloud-front-origin-access-identity-config "$OAI_CONFIG" \
            --region "$REGION" \
            --output json)
            
        OAI_ID=$(echo "$RESULT" | jq -r '.CloudFrontOriginAccessIdentity.Id')
        OAI_S3_USER_ID=$(echo "$RESULT" | jq -r '.CloudFrontOriginAccessIdentity.S3CanonicalUserId')
        
        echo "Created OAI. ID: $OAI_ID"
        echo "$OAI_ID" > "$OUTPUT_DIR/cloudfront-oac.txt"
        echo "$OAI_S3_USER_ID" > "$OUTPUT_DIR/cloudfront-oai-s3-user-id.txt"
        ;;
        
    distribution)
        if [ ! -f "$OUTPUT_DIR/cloudfront-oac.txt" ]; then
            echo "Error: cloudfront-oac.txt not found. Run --step oai first."
            exit 1
        fi
        OAI_ID=$(cat "$OUTPUT_DIR/cloudfront-oac.txt")
        ORIGIN_DOMAIN="${BUCKET_NAME}.s3.ap-southeast-1.amazonaws.com"
        
        echo "Creating CloudFront distribution..."
        CALLER_REF="quillo-frontend-$(date +%s)"
        
        DIST_CONFIG='{
            "CallerReference": "'"$CALLER_REF"'",
            "Origins": {
                "Quantity": 1,
                "Items": [
                    {
                        "Id": "S3-'"$BUCKET_NAME"'",
                        "DomainName": "'"$ORIGIN_DOMAIN"'",
                        "OriginPath": "",
                        "CustomHeaders": {
                            "Quantity": 0
                        },
                        "S3OriginConfig": {
                            "OriginAccessIdentity": "origin-access-identity/cloudfront/'"$OAI_ID"'"
                        },
                        "ConnectionAttempts": 3,
                        "ConnectionTimeout": 10
                    }
                ]
            },
            "DefaultCacheBehavior": {
                "TargetOriginId": "S3-'"$BUCKET_NAME"'",
                "ViewerProtocolPolicy": "redirect-to-https",
                "AllowedMethods": {
                    "Quantity": 2,
                    "Items": ["GET", "HEAD"],
                    "CachedMethods": {
                        "Quantity": 2,
                        "Items": ["GET", "HEAD"]
                    }
                },
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "MinTTL": 0,
                "DefaultTTL": 86400,
                "MaxTTL": 31536000,
                "Compress": true,
                "SmoothStreaming": false
            },
            "CustomErrorResponses": {
                "Quantity": 2,
                "Items": [
                    {
                        "ErrorCode": 403,
                        "ResponsePagePath": "/index.html",
                        "ResponseCode": "200",
                        "ErrorCachingMinTTL": 300
                    },
                    {
                        "ErrorCode": 404,
                        "ResponsePagePath": "/index.html",
                        "ResponseCode": "200",
                        "ErrorCachingMinTTL": 300
                    }
                ]
            },
            "Comment": "Quillo Frontend Distribution",
            "PriceClass": "PriceClass_100",
            "Enabled": true,
            "DefaultRootObject": "index.html",
            "HttpVersion": "http2",
            "IsIPV6Enabled": true,
            "ViewerCertificate": {
                "CloudFrontDefaultCertificate": true
            }
        }'
        
        echo "$DIST_CONFIG" > /tmp/cf-config.json
        
        RESULT=$(aws cloudfront create-distribution \
            --distribution-config file:///tmp/cf-config.json \
            --region "$REGION" \
            --output json)
            
        DIST_ID=$(echo "$RESULT" | jq -r '.Distribution.Id')
        DOMAIN_NAME=$(echo "$RESULT" | jq -r '.Distribution.DomainName')
        
        echo "Created Distribution. ID: $DIST_ID, Domain: $DOMAIN_NAME"
        echo "$DIST_ID" > "$OUTPUT_DIR/cloudfront-distribution-id.txt"
        echo "$DOMAIN_NAME" > "$OUTPUT_DIR/cloudfront-domain.txt"
        rm /tmp/cf-config.json
        ;;
        
    bucket-policy)
        if [ ! -f "$OUTPUT_DIR/cloudfront-oai-s3-user-id.txt" ]; then
            echo "Error: cloudfront-oai-s3-user-id.txt not found. Run --step oai first."
            exit 1
        fi
        OAI_S3_USER_ID=$(cat "$OUTPUT_DIR/cloudfront-oai-s3-user-id.txt")
        
        echo "Updating Bucket Policy for $BUCKET_NAME..."
        POLICY='{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "CanonicalUser": "'"$OAI_S3_USER_ID"'"
                    },
                    "Action": "s3:GetObject",
                    "Resource": "arn:aws:s3:::'"$BUCKET_NAME"'/*"
                }
            ]
        }'
        
        echo "$POLICY" > /tmp/bucket-policy.json
        aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
        echo "Bucket policy updated successfully."
        rm /tmp/bucket-policy.json
        ;;
        
    *)
        echo "Invalid step: $STEP"
        exit 1
        ;;
esac
