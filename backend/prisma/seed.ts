import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_KEYWORDS = [
  '검토', '리뷰', '작성', '입력', '승인', '확인', '배포', '테스트',
  '인터뷰', '분석', '설계', '구현', '디버그', '문서화', '보고', '협의',
  '수정', '검증', '제출', '수령', '정리', '공유', '교육', '데모',
  '피드백', '조율', '승인요청', '산출물검토', '회의', '기획',
  '요구사항정의', '프로토타입', '단위테스트', '통합테스트', '사용자테스트',
  '코드리뷰', '배포검증', '운영이관', '교육자료작성', '인수테스트',
];

async function main() {
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@aimate.com' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@aimate.com',
        name: '관리자',
        password: await bcrypt.hash('admin1234', 10),
        role: 'admin',
      },
    });
    console.log('✅ 관리자 계정 생성: admin@aimate.com / admin1234');
  }

  const existing = await prisma.actionKeyword.findMany({
    where: { projectId: null },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((k) => k.name));
  const toCreate = DEFAULT_KEYWORDS
    .filter((name) => !existingNames.has(name))
    .map((name, i) => ({ name, sortOrder: i, projectId: null as number | null }));

  if (toCreate.length > 0) {
    await prisma.actionKeyword.createMany({ data: toCreate });
    console.log(`✅ 기본 키워드 ${toCreate.length}개 생성 완료`);
  } else {
    console.log('ℹ️  기본 키워드가 이미 존재합니다.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
