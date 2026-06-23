import {
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { BrandPersona, ContentPiece, ContentType } from '@prisma/client';
import { bedrockClient, AWS_CONFIG } from '../../config/aws';
import { logger } from '../../config/logger';

interface GenerationResult {
  body: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

type Operation = 'generate' | 'rewrite' | 'expand' | 'shorten';

export class BedrockService {
  // Model selection: dùng model mạnh cho generate, model nhẹ cho edit
  private selectModel(operation: Operation): string {
    return operation === 'generate'
      ? AWS_CONFIG.BEDROCK_GENERATE_MODEL
      : AWS_CONFIG.BEDROCK_EDIT_MODEL;
  }

  async invoke(
    operation: Operation,
    piece: ContentPiece & { persona: BrandPersona | null },
    currentBody?: string,
    instruction?: string,
  ): Promise<GenerationResult> {
    const model = this.selectModel(operation);
    const prompt = this.buildPrompt(operation, piece, currentBody, instruction);

    logger.info(`Bedrock invoke: model=${model}, op=${operation}, content=${piece.id}`);

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
      body: raw.content[0].text,
      inputTokens: raw.usage.input_tokens,
      outputTokens: raw.usage.output_tokens,
      model,
    };
  }

  // ── Prompt Builder ─────────────────────────────────────────
  private buildPrompt(
    operation: Operation,
    piece: ContentPiece & { persona: BrandPersona | null },
    currentBody?: string,
    instruction?: string,
  ): string {
    const persona = piece.persona;

    // Phần mô tả persona (nếu có)
    const personaBlock = persona
      ? `
## Brand Persona: ${persona.name}
- Giọng điệu: ${persona.tone}
- Mô tả giọng văn: ${persona.voice || 'Chưa mô tả'}
- Đối tượng khách hàng: ${persona.targetAudience}
- Mức độ trang trọng: ${persona.formalityLevel}/5
- Từ khóa ưu tiên: ${persona.keywords.join(', ') || 'Không có'}
- Từ/cụm cần tránh: ${persona.avoidWords.join(', ') || 'Không có'}
${persona.exampleOutputs.length > 0 ? `- Ví dụ nội dung mẫu:\n${persona.exampleOutputs.map((e, i) => `  [Mẫu ${i + 1}]: ${e}`).join('\n')}` : ''}
`
      : '## Brand Persona: Không có — viết với giọng văn chuyên nghiệp, trung tính.';

    const contentTypeGuide = this.getContentTypeGuide(piece.type);

    switch (operation) {
      case 'generate':
        return `Bạn là chuyên gia sáng tạo nội dung marketing.

${personaBlock}

## Yêu cầu nội dung
- Loại: ${piece.type}
- Tiêu đề: ${piece.title}
- Đối tượng: ${piece.targetAudience || persona?.targetAudience || 'Chưa chỉ định'}
- Marketing Brief: ${piece.brief}

## Hướng dẫn định dạng
${contentTypeGuide}

## Yêu cầu
Viết nội dung hoàn chỉnh, đúng giọng văn brand persona. Chỉ trả về nội dung, không thêm giải thích hay tiêu đề phụ.`;

      case 'rewrite':
        return `Bạn là chuyên gia sáng tạo nội dung marketing.

${personaBlock}

## Nội dung hiện tại cần viết lại
${currentBody}

## Yêu cầu viết lại
${instruction || 'Viết lại nội dung trên với giọng điệu tốt hơn, phù hợp brand persona hơn.'}

Chỉ trả về nội dung đã viết lại, không thêm giải thích.`;

      case 'expand':
        return `Bạn là chuyên gia sáng tạo nội dung marketing.

${personaBlock}

## Nội dung hiện tại cần mở rộng
${currentBody}

## Yêu cầu
Mở rộng nội dung trên thêm khoảng 50-80%, thêm chi tiết, ví dụ, và luận điểm bổ sung. Giữ đúng giọng văn brand persona. Chỉ trả về nội dung đã mở rộng.`;

      case 'shorten':
        return `Bạn là chuyên gia sáng tạo nội dung marketing.

${personaBlock}

## Nội dung hiện tại cần rút gọn
${currentBody}

## Yêu cầu
Rút gọn nội dung trên còn khoảng 50-60% độ dài ban đầu. Giữ lại những điểm quan trọng nhất, loại bỏ phần thừa. Giữ đúng giọng văn. Chỉ trả về nội dung đã rút gọn.`;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private getContentTypeGuide(type: ContentType): string {
    const guides: Record<ContentType, string> = {
      BLOG_POST: '- Viết dạng bài blog chuẩn SEO\n- Có H2, H3 rõ ràng\n- Độ dài 600-1200 chữ\n- Kết thúc bằng CTA',
      SOCIAL_MEDIA: '- Ngắn gọn, cuốn hút\n- Tối đa 150-200 chữ\n- Có thể gợi ý 3-5 hashtag liên quan\n- Emoji phù hợp giọng brand',
      AD_COPY: '- Headline bắt mắt (tối đa 10 chữ)\n- Body ngắn (50-100 chữ)\n- CTA rõ ràng, thúc đẩy hành động\n- Nhấn mạnh lợi ích cụ thể',
      EMAIL: '- Subject line hấp dẫn\n- Preheader text\n- Body có cấu trúc rõ ràng\n- CTA nổi bật\n- Tông thân thiện',
    };
    return guides[type] || '- Viết nội dung rõ ràng, phù hợp mục tiêu';
  }
}
