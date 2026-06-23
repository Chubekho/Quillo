/**
 * Quillo — Lambda Worker (Node.js)
 * Consume SQS messages → gọi Bedrock → ghi kết quả vào RDS
 *
 * Deploy: AWS Lambda với SQS trigger
 * Dev local: chạy bằng `npm run worker:dev` (polling mode)
 */

import 'dotenv/config';
import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { prisma } from './config/database';
import { sqsClient, AWS_CONFIG } from './config/aws';
import { BedrockService } from './services/ai/bedrock.service';
import { logger } from './config/logger';

const bedrockService = new BedrockService();

// ── Lambda Handler (production) ───────────────────────────
export const handler = async (event: { Records: SQSRecord[] }) => {
  const results = await Promise.allSettled(
    event.Records.map((record) => processMessage(JSON.parse(record.body))),
  );

  // SQS Batch failure reporting — chỉ xóa message thành công
  const failures = results
    .map((r, i) => (r.status === 'rejected' ? { itemIdentifier: event.Records[i].messageId } : null))
    .filter(Boolean);

  return { batchItemFailures: failures };
};

// ── Local dev: polling mode ────────────────────────────────
async function pollLocal() {
  logger.info('Quillo Worker: starting local polling mode...');

  while (true) {
    try {
      const { Messages } = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: AWS_CONFIG.SQS_QUEUE_URL,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 10, // long polling
        }),
      );

      if (Messages && Messages.length > 0) {
        await Promise.allSettled(
          Messages.map(async (msg) => {
            if (!msg.Body || !msg.ReceiptHandle) return;
            await processMessage(JSON.parse(msg.Body));
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: AWS_CONFIG.SQS_QUEUE_URL,
                ReceiptHandle: msg.ReceiptHandle,
              }),
            );
          }),
        );
      }
    } catch (err) {
      logger.error('Worker poll error:', err);
      await sleep(5000);
    }
  }
}

// ── Core processing logic ─────────────────────────────────
async function processMessage(message: GenerationMessage) {
  const { jobId, contentId, orgId, operation, payload } = message;
  logger.info(`Processing job ${jobId}: ${operation} on content ${contentId}`);

  // Mark job as PROCESSING
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  try {
    // 1. Kiểm tra quota trước khi gọi Bedrock (tránh cháy ví)
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new Error(`Organization ${orgId} not found`);

    if (org.currentMonthTokens >= org.monthlyTokenQuota) {
      throw new Error(`Monthly token quota exceeded for org ${orgId}`);
    }

    // 2. Load content piece + persona
    const piece = await prisma.contentPiece.findUnique({
      where: { id: contentId },
      include: { persona: true },
    });
    if (!piece) throw new Error(`Content piece ${contentId} not found`);

    // 3. Lấy current body (nếu cần cho rewrite/expand/shorten)
    let currentBody: string | undefined;
    if (operation !== 'generate') {
      const activeVersion = await prisma.contentVersion.findFirst({
        where: { contentId, isActive: true },
        orderBy: { versionNo: 'desc' },
      });
      currentBody = activeVersion?.body;
    }

    // 4. Gọi Bedrock
    const result = await bedrockService.invoke(
      operation,
      piece,
      currentBody,
      (payload as any)?.instruction,
    );

    // 5. Ghi kết quả vào DB (transaction)
    const nextVersionNo = await getNextVersionNo(contentId);

    await prisma.$transaction(async (tx) => {
      // Deactivate versions cũ
      await tx.contentVersion.updateMany({
        where: { contentId },
        data: { isActive: false },
      });

      // Tạo version mới
      await tx.contentVersion.create({
        data: {
          contentId,
          versionNo: nextVersionNo,
          body: result.body,
          source: operationToSource(operation),
          isActive: true,
          promptUsed: undefined, // có thể lưu prompt nếu cần audit
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      });

      // Update content status → READY
      await tx.contentPiece.update({
        where: { id: contentId },
        data: { status: 'READY' },
      });

      // Update job → COMPLETED
      await tx.generationJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Ghi usage log
      const costUsd = estimateCost(result.model, result.inputTokens, result.outputTokens);
      await tx.usageLog.create({
        data: {
          organizationId: orgId,
          contentId,
          model: result.model,
          operation,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          estimatedCostUsd: costUsd,
        },
      });

      // Update org token counter
      await tx.organization.update({
        where: { id: orgId },
        data: { currentMonthTokens: { increment: result.inputTokens + result.outputTokens } },
      });
    });

    logger.info(`Job ${jobId} completed. Tokens: ${result.inputTokens}+${result.outputTokens}`);
  } catch (err) {
    const errorMsg = (err as Error).message;
    logger.error(`Job ${jobId} failed:`, err);

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: errorMsg,
        completedAt: new Date(),
        retryCount: { increment: 1 },
      },
    });

    // Revert content status to DRAFT
    await prisma.contentPiece.update({
      where: { id: contentId },
      data: { status: 'DRAFT' },
    });

    throw err; // Re-throw để SQS biết mà retry / gửi sang DLQ
  }
}

// ── Helpers ───────────────────────────────────────────────
async function getNextVersionNo(contentId: string): Promise<number> {
  const last = await prisma.contentVersion.findFirst({
    where: { contentId },
    orderBy: { versionNo: 'desc' },
    select: { versionNo: true },
  });
  return (last?.versionNo ?? 0) + 1;
}

function operationToSource(op: string) {
  const map: Record<string, string> = {
    generate: 'AI_GENERATE',
    rewrite: 'AI_REWRITE',
    expand: 'AI_EXPAND',
    shorten: 'AI_SHORTEN',
  };
  return map[op] as any;
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Pricing ước tính — cập nhật theo AWS Bedrock pricing page
  // https://aws.amazon.com/bedrock/pricing/
  const pricing: Record<string, { input: number; output: number }> = {
    'us.anthropic.claude-sonnet-4-5': { input: 0.000003, output: 0.000015 },
    'us.anthropic.claude-haiku-4-5': { input: 0.00000025, output: 0.00000125 },
  };
  const p = pricing[model] || { input: 0.000003, output: 0.000015 };
  return p.input * inputTokens + p.output * outputTokens;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Entry point cho local dev ─────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  pollLocal().catch((err) => {
    logger.error('Worker crashed:', err);
    process.exit(1);
  });
}

// ── Types ─────────────────────────────────────────────────
interface SQSRecord {
  messageId: string;
  body: string;
  receiptHandle?: string;
}

interface GenerationMessage {
  jobId: string;
  contentId: string;
  orgId: string;
  operation: 'generate' | 'rewrite' | 'expand' | 'shorten';
  payload?: Record<string, unknown>;
  enqueuedAt: string;
}
