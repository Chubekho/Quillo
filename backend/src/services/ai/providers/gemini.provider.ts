import { GoogleGenerativeAI } from '@google/generative-ai';
import { BrandPersona, ContentPiece } from '@prisma/client';
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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in process.env');
  }

  // Phân biệt generate vs edit: nếu contentType === 'generate' (hoặc operation === 'generate') -> dùng GENERATE_MODEL, còn lại -> dùng EDIT_MODEL
  const isGenerate = contentType === 'generate' || operation === 'generate';
  const modelName = isGenerate
    ? process.env.GEMINI_GENERATE_MODEL ?? 'gemini-2.5-flash'
    : process.env.GEMINI_EDIT_MODEL ?? 'gemini-2.5-flash-lite';

  logger.info(`Gemini invoke: model=${modelName}, op=${operation}, contentType=${contentType}`);

  const persona = piece?.persona;
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

  const systemInstruction = `Bạn là chuyên gia sáng tạo nội dung marketing.\n\n${personaBlock}`;

  let userPrompt = prompt;
  if (piece && operation === 'generate') {
    const guides: Record<string, string> = {
      BLOG_POST: '- Viết dạng bài blog chuẩn SEO\n- Có H2, H3 rõ ràng\n- Độ dài 600-1200 chữ\n- Kết thúc bằng CTA',
      SOCIAL_MEDIA: '- Ngắn gọn, cuốn hút\n- Tối đa 150-200 chữ\n- Có thể gợi ý 3-5 hashtag liên quan\n- Emoji phù hợp giọng brand',
      AD_COPY: '- Headline bắt mắt (tối đa 10 chữ)\n- Body ngắn (50-100 chữ)\n- CTA rõ ràng, thúc đẩy hành động\n- Nhấn mạnh lợi ích cụ thể',
      EMAIL: '- Subject line hấp dẫn\n- Preheader text\n- Body có cấu trúc rõ ràng\n- CTA nổi bật\n- Tông thân thiện',
    };
    const contentTypeGuide = guides[piece.type] || '- Viết nội dung rõ ràng, phù hợp mục tiêu';
    userPrompt = `## Yêu cầu nội dung\n- Loại: ${piece.type}\n- Tiêu đề: ${piece.title}\n- Đối tượng: ${piece.targetAudience || persona?.targetAudience || 'Chưa chỉ định'}\n- Marketing Brief: ${piece.brief}\n\n## Hướng dẫn định dạng\n${contentTypeGuide}\n\n## Yêu cầu\nViết nội dung hoàn chỉnh, đúng giọng văn brand persona. Chỉ trả về nội dung, không thêm giải thích hay tiêu đề phụ.`;
  } else if (operation === 'rewrite' && currentBody) {
    userPrompt = `## Nội dung hiện tại cần viết lại\n${currentBody}\n\n## Yêu cầu viết lại\n${prompt || 'Viết lại nội dung trên với giọng điệu tốt hơn, phù hợp brand persona hơn.'}\n\nChỉ trả về nội dung đã viết lại, không thêm giải thích.`;
  } else if (operation === 'expand' && currentBody) {
    userPrompt = `## Nội dung hiện tại cần mở rộng\n${currentBody}\n\n## Yêu cầu\nMở rộng nội dung trên thêm khoảng 50-80%, thêm chi tiết, ví dụ, và luận điểm bổ sung. Giữ đúng giọng văn brand persona. Chỉ trả về nội dung đã mở rộng.`;
  } else if (operation === 'shorten' && currentBody) {
    userPrompt = `## Nội dung hiện tại cần rút gọn\n${currentBody}\n\n## Yêu cầu\nRút gọn nội dung trên còn khoảng 50-60% độ dài ban đầu. Giữ lại những điểm quan trọng nhất, loại bỏ phần thừa. Giữ đúng giọng văn. Chỉ trả về nội dung đã rút gọn.`;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
    });

    const result = await model.generateContent(userPrompt);
    const content = result.response.text();
    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    return {
      content,
      body: content,
      inputTokens,
      outputTokens,
      model: modelName,
    };
  } catch (err) {
    logger.error(`Gemini provider error (${modelName}):`, err);
    throw err;
  }
}
