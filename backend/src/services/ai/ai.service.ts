import { BrandPersona, ContentPiece } from '@prisma/client';
import { GenerationResult } from './providers/mock.provider';

type Operation = 'generate' | 'rewrite' | 'expand' | 'shorten';

export class AiService {
  async invoke(
    operation: Operation,
    piece: ContentPiece & { persona?: BrandPersona | null },
    currentBody?: string,
    instruction?: string,
  ): Promise<GenerationResult> {
    const providerName = process.env.AI_PROVIDER || 'gemini';
    const prompt = instruction || piece.brief || piece.title || '';
    const contentType = operation === 'generate' ? 'generate' : piece.type;

    if (providerName === 'mock') {
      const { invoke: mockInvoke } = await import('./providers/mock.provider');
      return mockInvoke(prompt, contentType, operation, piece, currentBody);
    } else if (providerName === 'bedrock') {
      const { invoke: bedrockInvoke } = await import('./providers/bedrock.provider');
      return bedrockInvoke(prompt, contentType, operation, piece, currentBody);
    } else {
      const { invoke: geminiInvoke } = await import('./providers/gemini.provider');
      return geminiInvoke(prompt, contentType, operation, piece, currentBody);
    }
  }

  async invokeModel(
    operation: Operation,
    piece: ContentPiece & { persona?: BrandPersona | null },
    currentBody?: string,
    instruction?: string,
  ): Promise<GenerationResult> {
    return this.invoke(operation, piece, currentBody, instruction);
  }
}

export const BedrockService = AiService;

export async function invoke(
  operation: Operation,
  piece: ContentPiece & { persona?: BrandPersona | null },
  currentBody?: string,
  instruction?: string,
): Promise<GenerationResult> {
  const service = new AiService();
  return service.invoke(operation, piece, currentBody, instruction);
}

export async function invokeModel(
  operation: Operation,
  piece: ContentPiece & { persona?: BrandPersona | null },
  currentBody?: string,
  instruction?: string,
): Promise<GenerationResult> {
  const service = new AiService();
  return service.invoke(operation, piece, currentBody, instruction);
}
