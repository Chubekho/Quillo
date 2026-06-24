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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    // ── Mock mode: trả response giả khi chưa có quyền Bedrock ──
    if (process.env.BEDROCK_MOCK === 'true') {
      return this.mockInvoke(operation, piece, currentBody);
    }

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

  // ── Mock Invoke — persona-aware fake content ────────────────
  private async mockInvoke(
    operation: Operation,
    piece: ContentPiece & { persona: BrandPersona | null },
    currentBody?: string,
  ): Promise<GenerationResult> {
    const model = this.selectModel(operation);
    const tone = piece.persona?.tone ?? 'chuyên nghiệp';
    const audience = piece.targetAudience || piece.persona?.targetAudience || 'khách hàng tiềm năng';
    const title = piece.title;
    const brief = piece.brief;

    logger.info(`[MOCK] Bedrock invoke: model=${model}, op=${operation}, content=${piece.id}`);

    // Giả lập latency để polling thấy QUEUED → PROCESSING → COMPLETED
    await sleep(800);

    const mockBody = this.buildMockContent(operation, piece.type, title, brief, tone, audience, currentBody);

    const promptLength = (brief ?? '').length + (title ?? '').length + (tone ?? '').length;
    const outputLength = mockBody.length;

    return {
      body: mockBody,
      inputTokens: Math.max(Math.round(promptLength / 4), 50),
      outputTokens: Math.max(Math.round(outputLength / 4), 50),
      model,
    };
  }

  private buildMockContent(
    operation: Operation,
    type: ContentType,
    title: string,
    brief: string,
    tone: string,
    audience: string,
    currentBody?: string,
  ): string {
    if (operation === 'rewrite' && currentBody) {
      return `Nội dung đã được viết lại với giọng ${tone}, tối ưu cho ${audience}:\n\n${currentBody.split('\n').map((line) => line ? `${line} — được cải thiện để phù hợp hơn.` : '').join('\n')}`;
    }

    if (operation === 'expand' && currentBody) {
      return `${currentBody}\n\nPhần mở rộng:\n\nVới giọng ${tone}, chúng tôi muốn nhấn mạnh thêm rằng sản phẩm này được thiết kế đặc biệt cho ${audience}. Mỗi chi tiết đều được chăm chút để mang lại trải nghiệm tốt nhất.\n\nKhông chỉ dừng lại ở đó, đội ngũ phát triển liên tục lắng nghe phản hồi từ cộng đồng để cải tiến và hoàn thiện sản phẩm mỗi ngày.`;
    }

    if (operation === 'shorten' && currentBody) {
      const lines = currentBody.split('\n').filter(Boolean);
      return lines.slice(0, Math.ceil(lines.length * 0.5)).join('\n');
    }

    // ── Generate: tạo content mới theo content type ──
    switch (type) {
      case 'BLOG_POST':
        return `## ${title}\n\n${brief}\n\n### Tại sao ${audience} nên quan tâm?\n\nVới giọng ${tone}, chúng tôi tin rằng mỗi khách hàng đều xứng đáng được trải nghiệm dịch vụ tốt nhất. Sản phẩm của chúng tôi không chỉ đáp ứng nhu cầu — mà còn vượt xa kỳ vọng.\n\n### Điểm nổi bật\n\nChúng tôi hiểu rằng ${audience} luôn tìm kiếm giải pháp thực sự hiệu quả. Đó là lý do mỗi tính năng đều được thiết kế dựa trên phản hồi thực tế từ hàng nghìn người dùng.\n\n### Bắt đầu ngay hôm nay\n\nĐừng bỏ lỡ cơ hội trải nghiệm sự khác biệt. Đăng ký dùng thử miễn phí và khám phá lý do hàng nghìn doanh nghiệp đã tin tưởng chọn chúng tôi.\n\n**👉 [Đăng ký ngay](#) — Hoàn toàn miễn phí trong 14 ngày.**`;

      case 'SOCIAL_MEDIA':
        return `🚀 ${title}\n\n${brief}\n\nSản phẩm được thiết kế dành riêng cho ${audience} — với giọng ${tone} mà bạn yêu thích.\n\nThử ngay hôm nay! 👇\n\n#Marketing #ContentCreation #GrowthHacking #${title.replace(/\s+/g, '')}`;

      case 'AD_COPY':
        return `**${title}**\n\nDành cho ${audience}: ${brief}\n\nGiải pháp đã được hàng nghìn doanh nghiệp tin dùng. Kết quả thực — không phải lời hứa suông.\n\n🎯 **Đăng ký miễn phí ngay →**`;

      case 'EMAIL':
        return `**Subject:** ${title} — Cơ hội dành riêng cho bạn\n\n**Preheader:** Khám phá giải pháp mà ${audience} đang yêu thích\n\n---\n\nXin chào,\n\n${brief}\n\nVới giọng ${tone}, chúng tôi muốn chia sẻ rằng sản phẩm này được tạo ra với một mục tiêu duy nhất: giúp bạn đạt kết quả tốt hơn, nhanh hơn.\n\nHàng nghìn ${audience} đã trải nghiệm và phản hồi tích cực. Giờ đến lượt bạn.\n\n**[Bắt đầu dùng thử miễn phí →](#)**\n\nTrân trọng,\nĐội ngũ Quillo`;

      default:
        return `${title}\n\n${brief}\n\nNội dung được tạo với giọng ${tone}, dành cho ${audience}. Đây là bản demo — nội dung thực sẽ được tạo bởi AI khi kết nối Bedrock.`;
    }
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
