/**
 * Quillo — Database Seed
 * Tạo dữ liệu mẫu để dev local
 * Run: npm run db:seed
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Quillo database...');

  // Org
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-demo' },
    update: {},
    create: {
      name: 'Acme Corp (Demo)',
      slug: 'acme-demo',
      plan: 'PRO',
      monthlyTokenQuota: 1_000_000,
    },
  });
  console.log(`  ✓ Org: ${org.name}`);

  // User
  const user = await prisma.user.upsert({
    where: { email: 'admin@acme.demo' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@acme.demo',
      name: 'Admin Demo',
      passwordHash: await bcrypt.hash('password123', 12),
      role: 'OWNER',
    },
  });
  console.log(`  ✓ User: ${user.email} / password123`);

  // Brand Personas
  const persona1 = await prisma.brandPersona.upsert({
    where: { id: 'seed-persona-b2b' },
    update: {},
    create: {
      id: 'seed-persona-b2b',
      organizationId: org.id,
      name: 'Professional B2B',
      tone: 'professional',
      voice: 'Chúng tôi là đối tác tin cậy, mang lại giải pháp thực tiễn và hiệu quả đo lường được.',
      targetAudience: 'Giám đốc, trưởng phòng doanh nghiệp vừa và lớn',
      ageRange: '30-50',
      industry: 'B2B SaaS',
      language: 'vi',
      formalityLevel: 4,
      keywords: ['giải pháp', 'hiệu quả', 'ROI', 'tối ưu', 'chuyên nghiệp'],
      avoidWords: ['bạn ơi', 'cực kỳ', 'tuyệt vời', 'khủng'],
      exampleOutputs: [
        'Quillo giúp doanh nghiệp của bạn tối ưu quy trình sáng tạo nội dung, tiết kiệm 60% thời gian với chất lượng nhất quán theo brand guideline.',
      ],
      isDefault: true,
    },
  });

  const persona2 = await prisma.brandPersona.upsert({
    where: { id: 'seed-persona-casual' },
    update: {},
    create: {
      id: 'seed-persona-casual',
      organizationId: org.id,
      name: 'Casual & Fun',
      tone: 'playful',
      voice: 'Chúng tôi là người bạn đồng hành trẻ trung, luôn sẵn sàng cùng bạn tạo ra những điều thú vị.',
      targetAudience: 'Gen Z và Millennials, 18-28 tuổi, yêu thích sáng tạo',
      ageRange: '18-28',
      language: 'vi',
      formalityLevel: 1,
      keywords: ['trend', 'viral', 'sáng tạo', 'cộng đồng', 'real'],
      avoidWords: ['theo đó', 'tuy nhiên', 'nhằm mục đích'],
      exampleOutputs: [
        'Nội dung xịn không cần phải tốn cả ngày nữa 🚀 Thả brief vào, Quillo lo phần còn lại!',
      ],
      isDefault: false,
    },
  });

  console.log(`  ✓ Persona: ${persona1.name}`);
  console.log(`  ✓ Persona: ${persona2.name}`);

  // Campaign
  const campaign = await prisma.campaign.upsert({
    where: { id: 'seed-campaign-q3' },
    update: {},
    create: {
      id: 'seed-campaign-q3',
      organizationId: org.id,
      createdById: user.id,
      name: 'Q3 2025 Launch Campaign',
      description: 'Chiến dịch ra mắt tính năng mới Q3',
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ Campaign: ${campaign.name}`);

  // Sample content piece
  await prisma.contentPiece.upsert({
    where: { id: 'seed-content-blog-1' },
    update: {},
    create: {
      id: 'seed-content-blog-1',
      organizationId: org.id,
      campaignId: campaign.id,
      personaId: persona1.id,
      title: 'Tại sao AI Content giúp team marketing tiết kiệm 60% thời gian?',
      type: 'BLOG_POST',
      brief: 'Viết bài blog giải thích lợi ích của AI trong sản xuất nội dung marketing, nhấn mạnh tiết kiệm thời gian và duy trì brand consistency.',
      targetAudience: 'Marketing Manager, Content Lead',
      status: 'DRAFT',
      meta: { seoKeywords: ['AI content', 'marketing automation', 'brand consistency'] },
    },
  });

  console.log('\n✅ Seed done!');
  console.log('   Login: admin@acme.demo / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
