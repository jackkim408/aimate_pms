import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

const keywordSchema = z.object({
  name: z.string().min(1, '키워드명을 입력해주세요.'),
  description: z.string().optional(),
  projectId: z.number().optional(),
  sortOrder: z.number().default(0),
});

router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const keywords = await prisma.actionKeyword.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return res.json(keywords);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = keywordSchema.parse(req.body);
    const keyword = await prisma.actionKeyword.create({
      data: {
        name: body.name,
        description: body.description,
        sortOrder: body.sortOrder,
        projectId: body.projectId ?? null,
      },
    });
    return res.status(201).json(keyword);
  } catch (err) {
    next(err);
  }
});

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

// 소프트 삭제 (isActive = false)
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
