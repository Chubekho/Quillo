#!/bin/bash
set -e

REGION=${AWS_REGION:-ap-southeast-1}
EMAIL="khuongduyle.it@gmail.com"
WAF_WEBACL_ARN="arn:aws:wafv2:ap-southeast-1:562395967967:regional/webacl/quillo-waf/ce47fef9-7a8b-4637-bc05-0442cdc3e2e6"

echo "Creating Log Groups..."
aws logs create-log-group --log-group-name /quillo/api --region $REGION || true
aws logs create-log-group --log-group-name /quillo/worker --region $REGION || true
aws logs create-log-group --log-group-name /aws/waf/logs --region $REGION || true

echo "Creating SNS Topic..."
TOPIC_ARN=$(aws sns create-topic --name quillo-prod-alerts --region $REGION --query 'TopicArn' --output text)
echo $TOPIC_ARN > infrastructure/outputs/sns-alert-topic.txt
echo "Topic ARN: $TOPIC_ARN"

echo "Subscribing email..."
aws sns subscribe --topic-arn $TOPIC_ARN --protocol email --notification-endpoint $EMAIL --region $REGION

echo "Creating Metric Filters..."
# WAF Blocked Requests
FILTER_PATTERN="{ ($.action = \"BLOCK\") && ($.webaclId = \"$WAF_WEBACL_ARN\") }"
aws logs put-metric-filter \
  --log-group-name /aws/waf/logs \
  --filter-name WAFBlockedRequests \
  --filter-pattern "$FILTER_PATTERN" \
  --metric-transformations \
      metricName=WAFBlockedRequests,metricNamespace=Quillo,metricValue=1 \
  --region $REGION

# API Error Rate
aws logs put-metric-filter \
  --log-group-name /quillo/api \
  --filter-name ApiErrorRate \
  --filter-pattern '{ $.logLevel = "ERROR" }' \
  --metric-transformations \
      metricName=ApiErrorCount,metricNamespace=Quillo,metricValue=1 \
  --region $REGION

# Worker Error Rate
aws logs put-metric-filter \
  --log-group-name /quillo/worker \
  --filter-name WorkerErrorRate \
  --filter-pattern '{ $.logLevel = "ERROR" }' \
  --metric-transformations \
      metricName=WorkerErrorCount,metricNamespace=Quillo,metricValue=1 \
  --region $REGION

echo "Creating CloudWatch Alarms..."

aws cloudwatch put-metric-alarm \
  --alarm-name quillo_api_error_rate_high \
  --alarm-description "API Error rate is high" \
  --metric-name ApiErrorCount \
  --namespace Quillo \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $REGION

aws cloudwatch put-metric-alarm \
  --alarm-name quillo_worker_error_rate_high \
  --alarm-description "Worker Error rate is high" \
  --metric-name WorkerErrorCount \
  --namespace Quillo \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $REGION

aws cloudwatch put-metric-alarm \
  --alarm-name quillo_waf_blocked_requests_high \
  --alarm-description "High number of WAF blocked requests" \
  --metric-name WAFBlockedRequests \
  --namespace Quillo \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 500 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --region $REGION

echo "CloudWatch Setup Complete!"
