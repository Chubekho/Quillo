import { ExportFormat } from '@prisma/client';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marked, type Token, type Tokens } from 'marked';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { s3Client, AWS_CONFIG } from '../config/aws';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../config/logger';

// html-to-docx không có type definitions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const htmlToDocx = require('html-to-docx');

const PRESIGNED_URL_TTL = 3600; // 1 giờ

interface ExportResult {
  exportId: string;
  format: ExportFormat;
  downloadUrl: string;
  expiresAt: Date;
}

export class ExportService {
  // ── Main entry point ────────────────────────────────────────
  async exportContent(
    orgId: string,
    contentId: string,
    format: ExportFormat,
  ): Promise<ExportResult> {
    // 1. Load content piece + latest version — filter multi-tenant
    const piece = await prisma.contentPiece.findFirst({
      where: { id: contentId, organizationId: orgId },
    });
    if (!piece) {
      throw new AppError(404, 'Content piece not found');
    }

    const latestVersion = await prisma.contentVersion.findFirst({
      where: { contentId },
      orderBy: { versionNo: 'desc' },
    });
    if (!latestVersion) {
      throw new AppError(404, 'No content version found — generate content first');
    }

    // 2. Tạo Export record status=PROCESSING
    const exportRecord = await prisma.export.create({
      data: {
        contentId,
        format,
        s3Key: '', // placeholder, cập nhật sau
      },
    });

    try {
      // 3. Generate buffer theo format
      const meta = { title: piece.title, type: piece.type };
      let buffer: Buffer;
      let contentType: string;
      let ext: string;

      switch (format) {
        case 'PDF':
          buffer = await this.generatePdf(latestVersion.body);
          contentType = 'application/pdf';
          ext = 'pdf';
          break;
        case 'DOCX': {
          const html = this.generateHtml(latestVersion.body, meta);
          buffer = await this.generateDocx(html);
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          ext = 'docx';
          break;
        }
        case 'HTML': {
          const html = this.generateHtml(latestVersion.body, meta);
          buffer = Buffer.from(html, 'utf-8');
          contentType = 'text/html';
          ext = 'html';
          break;
        }
        default:
          throw new AppError(400, `Unsupported format: ${format}`);
      }

      // 4. Upload S3
      const s3Key = `exports/${orgId}/${contentId}/${exportRecord.id}.${ext}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: AWS_CONFIG.S3_EXPORTS_BUCKET,
          Key: s3Key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      // 5. Presigned URL (TTL 1h)
      const expiresAt = new Date(Date.now() + PRESIGNED_URL_TTL * 1000);

      const downloadUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: AWS_CONFIG.S3_EXPORTS_BUCKET,
          Key: s3Key,
        }),
        { expiresIn: PRESIGNED_URL_TTL },
      );

      // 6. Update Export record → COMPLETED
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: {
          s3Key,
          fileSizeBytes: buffer.length,
          expiresAt,
        },
      });

      logger.info(`Export ${exportRecord.id}: ${format} for content ${contentId}, ${buffer.length} bytes`);

      return {
        exportId: exportRecord.id,
        format,
        downloadUrl,
        expiresAt,
      };
    } catch (err) {
      // Lỗi bất kỳ → update status rồi throw
      logger.error(`Export ${exportRecord.id} failed:`, err);

      await prisma.export.delete({ where: { id: exportRecord.id } }).catch(() => {});

      throw err;
    }
  }

  // ── HTML Generator ──────────────────────────────────────────
  generateHtml(body: string, meta: { title: string; type: string }): string {
    const htmlBody = marked.parse(body, { async: false }) as string;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(meta.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.8;
      color: #1a1a2e;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 24px;
      background: #fafafa;
    }
    h1 { font-size: 2em; margin-bottom: 0.6em; color: #16213e; }
    h2 { font-size: 1.5em; margin: 1.2em 0 0.4em; color: #0f3460; border-bottom: 2px solid #e94560; padding-bottom: 4px; }
    h3 { font-size: 1.2em; margin: 1em 0 0.3em; color: #533483; }
    p { margin-bottom: 1em; }
    ul, ol { margin: 0.5em 0 1em 1.5em; }
    li { margin-bottom: 0.3em; }
    strong { color: #e94560; }
    blockquote {
      border-left: 4px solid #e94560;
      padding: 8px 16px;
      margin: 1em 0;
      background: #f0f0f0;
      font-style: italic;
    }
    code { background: #eee; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #1a1a2e; color: #eee; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
    pre code { background: none; padding: 0; }
    .export-meta {
      font-size: 0.85em;
      color: #888;
      border-top: 1px solid #ddd;
      padding-top: 16px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(meta.title)}</h1>
  ${htmlBody}
  <div class="export-meta">
    <p>Exported from Quillo — ${meta.type} · ${new Date().toLocaleDateString('vi-VN')}</p>
  </div>
</body>
</html>`;
  }

  // ── PDF Generator (pdfkit, parse marked tokens) ─────────────
  async generatePdf(body: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: { Title: 'Quillo Export', Creator: 'Quillo' },
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Parse markdown tokens
      const tokens = marked.lexer(body);
      this.renderPdfTokens(doc, tokens);

      doc.end();
    });
  }

  private renderPdfTokens(doc: PDFKit.PDFDocument, tokens: Token[]): void {
    for (const token of tokens) {
      switch (token.type) {
        case 'heading': {
          const heading = token as Tokens.Heading;
          const fontSize = heading.depth === 1 ? 22 : heading.depth === 2 ? 18 : 14;
          doc.moveDown(heading.depth === 1 ? 0.5 : 0.8);
          doc.fontSize(fontSize).font('Helvetica-Bold').text(heading.text);
          doc.moveDown(0.3);
          break;
        }
        case 'paragraph': {
          const para = token as Tokens.Paragraph;
          doc.fontSize(11).font('Helvetica');
          this.renderInlineTokens(doc, para.tokens);
          doc.moveDown(0.6);
          break;
        }
        case 'list': {
          const list = token as Tokens.List;
          for (let i = 0; i < list.items.length; i++) {
            const item = list.items[i];
            const bullet = list.ordered ? `${i + 1}. ` : '• ';
            doc.fontSize(11).font('Helvetica').text(bullet + this.flattenInlineText(item.tokens), {
              indent: 15,
            });
          }
          doc.moveDown(0.5);
          break;
        }
        case 'blockquote': {
          const bq = token as Tokens.Blockquote;
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica-Oblique')
            .text(this.flattenInlineText(bq.tokens), { indent: 20 });
          doc.moveDown(0.5);
          break;
        }
        case 'code': {
          const code = token as Tokens.Code;
          doc.moveDown(0.3);
          doc.fontSize(9).font('Courier').text(code.text, { indent: 10 });
          doc.moveDown(0.5);
          break;
        }
        case 'hr':
          doc.moveDown(0.5);
          doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#cccccc');
          doc.moveDown(0.5);
          break;
        case 'space':
          doc.moveDown(0.3);
          break;
        default:
          // Fallback: render as text nếu có raw content
          if ('text' in token && typeof (token as any).text === 'string') {
            doc.fontSize(11).font('Helvetica').text((token as any).text);
            doc.moveDown(0.4);
          }
          break;
      }
    }
  }

  private renderInlineTokens(doc: PDFKit.PDFDocument, tokens: Token[]): void {
    if (!tokens || tokens.length === 0) return;

    for (const token of tokens) {
      switch (token.type) {
        case 'strong':
          doc.font('Helvetica-Bold').text((token as Tokens.Strong).text, { continued: true });
          doc.font('Helvetica');
          break;
        case 'em':
          doc.font('Helvetica-Oblique').text((token as Tokens.Em).text, { continued: true });
          doc.font('Helvetica');
          break;
        case 'codespan':
          doc.font('Courier').text((token as Tokens.Codespan).text, { continued: true });
          doc.font('Helvetica');
          break;
        case 'text':
          doc.text((token as Tokens.Text).text, { continued: true });
          break;
        case 'link':
          doc.text((token as Tokens.Link).text, { continued: true });
          break;
        default:
          if ('text' in token && typeof (token as any).text === 'string') {
            doc.text((token as any).text, { continued: true });
          }
          break;
      }
    }
    // End line after all inline tokens
    doc.text('');
  }

  private flattenInlineText(tokens: Token[]): string {
    if (!tokens) return '';
    return tokens
      .map((t) => {
        if ('text' in t && typeof (t as any).text === 'string') return (t as any).text;
        if ('tokens' in t && Array.isArray((t as any).tokens)) return this.flattenInlineText((t as any).tokens);
        return '';
      })
      .join('');
  }

  // ── DOCX Generator (html-to-docx) ──────────────────────────
  async generateDocx(html: string): Promise<Buffer> {
    const docxBuffer = await htmlToDocx(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    // html-to-docx trả về Buffer hoặc ArrayBuffer
    return Buffer.isBuffer(docxBuffer) ? docxBuffer : Buffer.from(docxBuffer);
  }

  // ── List exports cho content piece ──────────────────────────
  async listExports(orgId: string, contentId: string) {
    // Verify content piece thuộc org
    const piece = await prisma.contentPiece.findFirst({
      where: { id: contentId, organizationId: orgId },
      select: { id: true },
    });
    if (!piece) {
      throw new AppError(404, 'Content piece not found');
    }

    return prisma.export.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
