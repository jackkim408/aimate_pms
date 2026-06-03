import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

const keywordSchema = z.object({
  name:        z.string().min(1, '키워드명을 입력해주세요.'),
  description: z.string().optional(),
  projectId:   z.number().optional(),
  sortOrder:   z.number().default(0),
  isActive:    z.boolean().optional(),   // PATCH 시 활성/비활성 토글용
});

router.use(authenticate);

// GET /api/keywords?all=1  →  비활성 포함 전체 반환 (관리 화면용)
// GET /api/keywords         →  활성 키워드만 반환 (WBS 매핑용)
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const showAll = req.query.all === '1' || req.query.all === 'true';
    const keywords = await prisma.actionKeyword.findMany({
      where: showAll ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return res.json(keywords);
  } catch (err) {
    next(err);
  }
});

// POST /api/keywords/reorder — 순서 일괄 저장
router.post('/reorder', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = z
      .array(z.object({ id: z.number(), sortOrder: z.number() }))
      .parse(req.body);

    await Promise.all(
      items.map((item) =>
        prisma.actionKeyword.update({
          where: { id: item.id },
          data:  { sortOrder: item.sortOrder },
        }),
      ),
    );

    return res.json({ updated: items.length });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = keywordSchema.parse(req.body);
    const keyword = await prisma.actionKeyword.create({
      data: {
        name:        body.name,
        description: body.description,
        sortOrder:   body.sortOrder,
        projectId:   body.projectId ?? null,
      },
    });
    return res.status(201).json(keyword);
  } catch (err) {
    next(err);
  }
});

// PATCH: 이름/설명/순서 수정 + isActive 토글 모두 처리
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = keywordSchema.partial().parse(req.body);
    const keyword = await prisma.actionKeyword.update({
      where: { id: Number(req.params.id) },
      data: body,
    });
    return res.json(keyword);
  } catch (err) {
    next(err);
  }
});

// DELETE: 소프트 삭제 (isActive = false)
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.actionKeyword.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false },
    });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
