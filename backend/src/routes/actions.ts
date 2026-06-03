import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

const STATUS_PROGRESS: Record<string, number> = {
  pending: 0, received: 10, in_progress: 50, done: 100, on_hold: 0,
};

const actionUpdateSchema = z.object({
  seqOrder:   z.number().optional(),
  weight:     z.number().min(0).max(100).optional(),
  assigneeId: z.number().nullable().optional(),
  status:     z.enum(['pending', 'received', 'in_progress', 'done', 'on_hold']).optional(),
  note:       z.string().nullable().optional(),
  dueDate:    z.string().nullable().optional(),
});

const actionInclude = {
  keyword:  { select: { id: true, name: true, sortOrder: true } },
  assignee: { select: { id: true, name: true } },
};

router.use(authenticate);

// PATCH /api/actions/:id
// 액션 상태/담당자/가중치 변경 — 공정 진척도는 사용자가 직접 입력하므로 여기서 갱신하지 않음
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = Number(req.params.id);
    const body = actionUpdateSchema.parse(req.body);

    const progressPatch =
      body.status !== undefined ? { progress: STATUS_PROGRESS[body.status] ?? 0 } : {};

    const action = await prisma.taskAction.update({
      where: { id },
      data: {
        seqOrder:   body.seqOrder,
        weight:     body.weight,
        assigneeId: body.assigneeId,
        status:     body.status,
        note:       body.note,
        dueDate:
          body.dueDate === null ? null :
          body.dueDate         ? new Date(body.dueDate) : undefined,
        ...progressPatch,
      },
      include: actionInclude,
    });

    return res.json(action);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/actions/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const action = await prisma.taskAction.findUnique({
      where: { id },
      select: { taskId: true },
    });
    if (!action) return res.status(404).json({ message: '액션을 찾을 수 없습니다.' });

    await prisma.taskAction.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
