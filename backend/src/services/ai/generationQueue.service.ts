import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, AWS_CONFIG } from '../../config/aws';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

interface EnqueueParams {
  contentId: string;
  orgId: string;
  operation: 'generate' | 'rewrite' | 'expand' | 'shorten';
  payload?: Record<string, unknown>;
}

export class GenerationQueueService {
  async enqueue(params: EnqueueParams) {
    const { contentId, orgId, operation, payload } = params;

    // 1. Tạo job record trong DB trước (để poll được ngay)
    const job = await prisma.generationJob.create({
      data: {
        contentId,
        operation,
        status: 'QUEUED',
      },
    });

    // 2. Gửi message vào SQS
    const message = {
      jobId: job.id,
      contentId,
      orgId,
      operation,
      payload: payload || {},
      enqueuedAt: new Date().toISOString(),
    };

    try {
      const cmd = new SendMessageCommand({
        QueueUrl: AWS_CONFIG.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(message),
      });

      const result = await sqsClient.send(cmd);
      logger.info(`Job ${job.id} enqueued to SQS: ${result.MessageId}`);

      // Lưu SQS message ID để trace
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { sqsMessageId: result.MessageId },
      });
    } catch (sqsError) {
      // SQS fail → mark job failed ngay, không để user chờ
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: (sqsError as Error).message },
      });
      throw sqsError;
    }

    return job;
  }
}
