#!/bin/bash
set -e

# WAF v2 REGIONAL — gắn vào ALB (Day 12-13)
# Scope REGIONAL: cùng region với EC2/ALB
# Nếu sau này dùng CloudFront: tạo thêm WebACL scope CLOUDFRONT ở us-east-1

REGION=${AWS_REGION:-ap-southeast-1}

echo "=== Quillo WAF Setup ==="
echo "Region: $REGION"

# 1. Tạo WAF WebACL
echo "Creating WAF WebACL..."
WEBACL_RESULT=$(aws wafv2 create-web-acl \
  --name quillo-waf \
  --scope REGIONAL \
  --region $REGION \
  --default-action Allow={} \
  --description "Quillo API WAF - SQLi/XSS/Rate limit protection" \
  --rules '
[
  {
    "Name": "AWSManagedRulesCommonRuleSet",
    "Priority": 1,
    "OverrideAction": { "None": {} },
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesCommonRuleSet"
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "CommonRuleSet"
    }
  },
  {
    "Name": "AWSManagedRulesKnownBadInputsRuleSet",
    "Priority": 2,
    "OverrideAction": { "None": {} },
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesKnownBadInputsRuleSet"
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "KnownBadInputs"
    }
  },
  {
    "Name": "RateLimitPerIP",
    "Priority": 3,
    "Action": { "Block": {} },
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimitPerIP"
    }
  }
]
' \
  --visibility-config \
    SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=QuilloWAF \
  --output json)

WEBACL_ARN=$(echo $WEBACL_RESULT | python3 -c "import sys,json; print(json.load(sys.stdin)['Summary']['ARN'])")
WEBACL_ID=$(echo $WEBACL_RESULT | python3 -c "import sys,json; print(json.load(sys.stdin)['Summary']['Id'])")

echo "  WebACL ARN: $WEBACL_ARN"
echo "  WebACL ID:  $WEBACL_ID"

# 2. Lưu output cho Day 12-13
mkdir -p infrastructure/outputs
echo $WEBACL_ARN > infrastructure/outputs/waf-webacl-arn.txt
echo $WEBACL_ID  > infrastructure/outputs/waf-webacl-id.txt

echo ""
echo "=== WAF setup DONE ==="
echo "WebACL ARN saved: infrastructure/outputs/waf-webacl-arn.txt"
echo ""
echo "NEXT STEP (Day 12-13): Associate WebACL với ALB sau khi tạo:"
echo "  aws wafv2 associate-web-acl \\"
echo "    --web-acl-arn \$(cat infrastructure/outputs/waf-webacl-arn.txt) \\"
echo "    --resource-arn <ALB_ARN> \\"
echo "    --region $REGION"
