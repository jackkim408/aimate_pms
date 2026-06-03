import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

const userSelect = {
  id: true, name: true, email: true,
  role: true, slackId: true, createdAt: true,
};

const createSchema = z.object({
  email:    z.string().email('올바른 이메일을 입력해주세요.'),
  name:     z.string().min(1, '이름을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
  role:     z.enum(['admin', 'manager', 'member']).default('member'),
  slackId:  z.string().optional(),
});

const updateSchema = z.object({
  name:     z.string().min(1).optional(),
  role:     z.enum(['admin', 'manager', 'member']).optional(),
  password: z.string().min(6).optional(), // 입력 시에만 변경
  slackId:  z.string().nullable().optional(),
});

router.use(authenticate);

// GET /api/users  — 전체 목록 (담당자 선택 + 관리 화면 공용)
router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { name: 'asc' },
    });
    return res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me — 로그인한 본인 정보
router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: userSelect,
    });
    return res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/users — 사용자 생성
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    const hashed = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email:   body.email,
        name:    body.name,
        password: hashed,
        role:    body.role,
        slackId: body.slackId ?? null,
      },
      select: userSelect,
    });
    return res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id — 사용자 수정 (이름·역할·Slack·비밀번호)
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = Number(req.params.id);
    const body = updateSchema.parse(req.body);

    const data: Record<string, unknown> = {};
    if (body.name    !== undefined) data.name    = body.name;
    if (body.role    !== undefined) data.role    = body.role;
    if (body.slackId !== undefined) data.slackId = body.slackId;
    if (body.password)              data.password = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
    return res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
