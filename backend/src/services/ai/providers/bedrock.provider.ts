import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BrandPersona, ContentPiece } from '@prisma/client';
import { bedrockClient, AWS_CONFIG } from '../../../config/aws';
import { logger } from '../../../config/logger';
import { GenerationResult } from './mock.provider';

type Operation = 'generate' | 'rewrite' | 'expand' | 'shorten';

export async function invoke(
  prompt: string,
  contentType: string,
  operation: Operation = 'generate',
  piece?: ContentPiece & { persona?: BrandPersona | null },
  currentBody?: string,
): Promise<GenerationResult> {
  const model = operation === 'generate' ? AWS_CONFIG.BEDROCK_GENERATE_MODEL : AWS_CONFIG.BEDROCK_EDIT_MODEL;

  logger.info(`Bedrock invoke: model=${model}, op=${operation}, contentType=${contentType}`);

  try {
    const cmd = new InvokeModelCommand({
      modelId: model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: Number(process.env.MAX_TOKENS_PER_GENERATION) || 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const response = await bedrockClient.send(cmd);
    const raw = JSON.parse(Buffer.from(response.body).toString('utf-8'));

    return {
      content: raw.content[0].text,
      body: raw.content[0].text,
      inputTokens: raw.usage.input_tokens,
      outputTokens: raw.usage.output_tokens,
      model,
    };
  } catch (err) {
    logger.warn(`[Bedrock Warning] Failed to invoke Bedrock model ${model} (Bedrock is not emulated in LocalStack):`, (err as Error).message);
    const fallbackText = `[Bedrock Fallback] Nội dung được tạo tự động cho ${contentType} do Bedrock không khả dụng trên LocalStack.`;
    return {
      content: fallbackText,
      body: fallbackText,
      inputTokens: 100,
      outputTokens: 150,
      model,
    };
  }
}
