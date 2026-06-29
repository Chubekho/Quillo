#!/bin/bash
set -e

REGION=${AWS_REGION:-ap-southeast-1}
ALARM_EMAIL=${ALARM_EMAIL:-""}  # bắt buộc set trước khi chạy

# Guard
if [ -z "$ALARM_EMAIL" ]; then
  echo "ERROR: ALARM_EMAIL phải được set"
  echo "Usage: ALARM_EMAIL=you@example.com bash setup-cloudwatch.sh"
  exit 1
fi

echo "=== Quillo CloudWatch Setup ==="

# 1. Log Groups
echo "Creating log groups..."
aws logs create-log-group --log-group-name /quillo/api --region $REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /quillo/worker --region $REGION 2>/dev/null || true
aws logs put-retention-policy --log-group-name /quillo/api --retention-in-days 30 --region $REGION
aws logs put-retention-policy --log-group-name /quillo/worker --retention-in-days 30 --region $REGION
echo "  Log groups: OK"

# 2. SNS Topic cho alarm notification
echo "Creating SNS topic..."
SNS_TOPIC_ARN=$(aws sns create-topic \
  --name quillo-alerts \
  --region $REGION \
  --query 'TopicArn' --output text)
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint $ALARM_EMAIL \
  --region $REGION
echo "  SNS topic: $SNS_TOPIC_ARN"
echo "  ⚠️  Check email $ALARM_EMAIL để confirm SNS subscription!"

# 3. Metric Filter — đếm ERROR logs từ /quillo/api
echo "Creating metric filters..."
aws logs put-metric-filter \
  --log-group-name /quillo/api \
  --filter-name QuilloAPIErrorCount \
  --filter-pattern '{ $.level = "error" }' \
  --metric-transformations \
    metricName=APIErrorCount,metricNamespace=Quillo,metricValue=1,defaultValue=0 \
  --region $REGION

aws logs put-metric-filter \
  --log-group-name /quillo/worker \
  --filter-name QuilloWorkerErrorCount \
  --filter-pattern '{ $.level = "error" }' \
  --metric-transformations \
    metricName=WorkerErrorCount,metricNamespace=Quillo,metricValue=1,defaultValue=0 \
  --region $REGION
echo "  Metric filters: OK"

# 4. Alarms
echo "Creating alarms..."

# Alarm 1: API error rate
aws cloudwatch put-metric-alarm \
  --alarm-name quillo-api-error-rate \
  --alarm-description "Quillo API: > 5 errors trong 5 phút" \
  --metric-name APIErrorCount \
  --namespace Quillo \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions $SNS_TOPIC_ARN \
  --ok-actions $SNS_TOPIC_ARN \
  --treat-missing-data notBreaching \
  --region $REGION

# Alarm 2: Worker error rate  
aws cloudwatch put-metric-alarm \
  --alarm-name quillo-worker-error-rate \
  --alarm-description "Quillo Worker: > 3 errors trong 5 phút" \
  --metric-name WorkerErrorCount \
  --namespace Quillo \
  --statistic Sum \
  --period 300 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions $SNS_TOPIC_ARN \
  --treat-missing-data notBreaching \
  --region $REGION

# Alarm 3: DLQ depth
aws cloudwatch put-metric-alarm \
  --alarm-name quillo-dlq-depth \
  --alarm-description "Quillo DLQ: có message thất bại cần xử lý" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --dimensions Name=QueueName,Value=quillo-generation-dlq \
  --statistic Maximum \
  --period 60 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions $SNS_TOPIC_ARN \
  --treat-missing-data notBreaching \
  --region $REGION

echo "  Alarms: OK"

# 5. Lưu SNS ARN ra file để Day 12-13 dùng
echo $SNS_TOPIC_ARN > infrastructure/outputs/sns-topic-arn.txt
echo ""
echo "=== CloudWatch setup DONE ==="
echo "SNS ARN saved: infrastructure/outputs/sns-topic-arn.txt"
