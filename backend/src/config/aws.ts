import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const awsConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-1',
  // Khi dev local với LocalStack, override endpoint
  ...(process.env.AWS_ENDPOINT_URL
    ? { endpoint: process.env.AWS_ENDPOINT_URL }
    : {}),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

// Bedrock không có LocalStack support — cần AWS thật
const bedrockConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
};

export const sqsClient = new SQSClient(awsConfig);
export const s3Client = new S3Client(awsConfig);
export const bedrockClient = new BedrockRuntimeClient(bedrockConfig);
export const secretsClient = new SecretsManagerClient(awsConfig);

export const AWS_CONFIG = {
  SQS_QUEUE_URL: process.env.SQS_GENERATION_QUEUE_URL!,
  SQS_DLQ_URL: process.env.SQS_DLQ_URL!,
  S3_EXPORTS_BUCKET: process.env.S3_EXPORTS_BUCKET || 'quillo-exports',
  S3_ASSETS_BUCKET: process.env.S3_ASSETS_BUCKET || 'quillo-assets',
  BEDROCK_GENERATE_MODEL: process.env.BEDROCK_GENERATE_MODEL || 'us.anthropic.claude-sonnet-4-5',
  BEDROCK_EDIT_MODEL: process.env.BEDROCK_EDIT_MODEL || 'us.anthropic.claude-haiku-4-5',
} as const;
