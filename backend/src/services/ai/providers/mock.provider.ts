import { BrandPersona, ContentPiece, ContentType } from '@prisma/client';
import { logger } from '../../../config/logger';

export interface GenerationResult {
  content: string;
  body: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

type Operation = 'generate' | 'rewrite' | 'expand' | 'shorten';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function invoke(
  prompt: string,
  contentType: string,
  operation: Operation = 'generate',
  piece?: ContentPiece & { persona?: BrandPersona | null },
  currentBody?: string,
): Promise<GenerationResult> {
  const model = 'mock-model';
  const tone = piece?.persona?.tone ?? 'chuyên nghiệp';
  const audience = piece?.targetAudience || piece?.persona?.targetAudience || 'khách hàng tiềm năng';
  const title = piece?.title ?? 'Tiêu đề mẫu';
  const brief = piece?.brief ?? prompt;

  logger.info(`[MOCK] invoke: model=${model}, op=${operation}, content=${piece?.id ?? 'none'}`);

  // Giả lập latency để polling thấy QUEUED → PROCESSING → COMPLETED
  await sleep(800);

  const mockBody = buildMockContent(operation, (piece?.type ?? contentType) as ContentType, title, brief, tone, audience, currentBody);

  const promptLength = (brief ?? '').length + (title ?? '').length + (tone ?? '').length;
  const outputLength = mockBody.length;

  return {
    content: mockBody,
    body: mockBody,
    inputTokens: Math.max(Math.round(promptLength / 4), 50),
    outputTokens: Math.max(Math.round(outputLength / 4), 50),
    model,
  };
}

function buildMockContent(
  operation: Operation,
  type: ContentType | string,
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
      return `## ${title}\n\n${brief}\n\n### Tại sao ${audience} nên quan tâm?\n\nVới giọng ${tone}, chúng tôi tin rằng mỗi khách hàng đều xứng đáng được trải nghiệm dịch vụ tốt nhất. Sản phẩm của chúng tôi không chỉ đáp ứng nhu cầu — mà còn vượt xa kỳ vọng.\n\n### Điểm nổi bật\n\nChúng tôi hiểu rằng ${audience} luôn tìm kiếm giải pháp thực sự hiệu quả. Đó là lý do mỗi tính năng đều được thiết kế dựa trên phản hồi thực tế từ hàng nghìn người সীম\n\n### Bắt đầu ngay hôm nay\n\nĐừng bỏ lỡ cơ hội trải nghiệm sự khác biệt. Đăng ký dùng thử miễn phí và khám phá lý do hàng nghìn doanh nghiệp đã tin tưởng chọn chúng tôi.\n\n**👉 [Đăng ký ngay](#) — Hoàn toàn miễn phí trong 14 ngày.**`;

    case 'SOCIAL_MEDIA':
      return `🚀 ${title}\n\n${brief}\n\nSản phẩm được thiết kế dành riêng cho ${audience} — với giọng ${tone} mà bạn yêu thích.\n\nThử ngay hôm nay! 👇\n\n#Marketing #ContentCreation #GrowthHacking #${title.replace(/\s+/g, '')}`;

    case 'AD_COPY':
      return `**${title}**\n\nDành cho ${audience}: ${brief}\n\nGiải pháp đã được hàng nghìn doanh nghiệp tin dùng. Kết quả thực — không phải lời hứa suông.\n\n🎯 **Đăng ký miễn phí ngay →**`;

    case 'EMAIL':
      return `**Subject:** ${title} — Cơ hội dành riêng cho bạn\n\n**Preheader:** Khám phá giải pháp mà ${audience} đang yêu thích\n\n---\n\nXin chào,\n\n${brief}\n\nVới giọng ${tone}, chúng tôi muốn chia sẻ rằng sản phẩm này được tạo ra với một mục tiêu duy nhất: giúp bạn đạt kết quả tốt hơn, nhanh hơn.\n\nHàng nghìn ${audience} đã trải nghiệm và phản hồi tích cực. Giờ đến lượt bạn.\n\n**[Bắt đầu dùng thử miễn phí →](#)**\n\nTrân trọng,\nĐội ngũ Quillo`;

    default:
      return `${title}\n\n${brief}\n\nNội dung được tạo với giọng ${tone}, dành cho ${audience}. Đây là bản demo — nội dung thực sẽ được tạo bởi AI.`;
  }
}
