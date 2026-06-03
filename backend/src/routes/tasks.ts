import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middlewares/auth';
import {
  recalculateWbsNumbers,
  calcTaskProgress,
  rollupProgress,
} from '../services/wbs.service';

const router = Router();
const prisma = new PrismaClient();

const STATUS_PROGRESS: Record<string, number> = {
  pending: 0, received: 10, in_progress: 50, done: 100, on_hold: 0,
};

const taskUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  note: z.string().nullable().optional(),
  planStart: z.string().nullable().optional(),
  planEnd: z.string().nullable().optional(),
  actualStart: z.string().nullable().optional(),
  actualEnd: z.string().nullable().optional(),
  assigneeId: z.number().nullable().optional(),
  isMilestone: z.boolean().optional(),
  status: z.enum(['not_started', 'in_progress', 'done', 'delayed', 'on_hold']).optional(),
});

const actionCreateSchema = z.object({
  keywordId: z.number(),
  seqOrder: z.number().default(1),
  weight: z.number().min(0).max(100),
  assigneeId: z.number().nullable().optional(),
  status: z.enum(['pending', 'received', 'in_progress', 'done', 'on_hold']).default('pending'),
  note: z.string().optional(),
  dueDate: z.string().nullable().optional(),
});

const actionInclude = {
  keyword: { select: { id: true, name: true, sortOrder: true } },
  assignee: { select: { id: true, name: true } },
};

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  actions: {
    include: actionInclude,
    orderBy: { seqOrder: 'asc' as const },
  },
};

function toDate(v?: string | null): Date | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  return new Date(v);
}

router.use(authenticate);

// PATCH /api/tasks/:id
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const body = taskUpdateSchema.parse(req.body);

    const task = await prisma.task.update({
      where: { id },
      data: {
        name: body.name,
        note: body.note,
        planStart: toDate(body.planStart),
        planEnd: toDate(body.planEnd),
        actualStart: toDate(body.actualStart),
        actualEnd: toDate(body.actualEnd),
        assigneeId: body.assigneeId,
        isMilestone: body.isMilestone,
        status: body.status,
      },
      include: taskInclude,
    });

    if (task.parentId) {
      await rollupProgress(task.parentId, prisma);
    }

    return res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const task = await prisma.task.findUnique({
      where: { id },
      select: { projectId: true, parentId: true },
    });
    if (!task) return res.status(404).json({ message: '공정을 찾을 수 없습니다.' });

    await prisma.task.delete({ where: { id } });
    await recalculateWbsNumbers(task.projectId, prisma);
    if (task.parentId) {
      await rollupProgress(task.parentId, prisma);
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/move — 부모 변경 또는 순서 이동
router.patch('/:id/move', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { parentId, sortOrder } = z
      .object({ parentId: z.number().nullable(), sortOrder: z.number() })
      .parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id },
      select: { projectId: true, parentId: true },
    });
    if (!task) return res.status(404).json({ message: '공정을 찾을 수 없습니다.' });

    let depth = 0;
    if (parentId !== null) {
      const parent = await prisma.task.findUnique({
        where: { id: parentId },
        select: { depth: true },
      });
      depth = (parent?.depth ?? 0) + 1;
    }

    await prisma.task.update({
      where: { id },
      data: { parentId, depth, sortOrder },
    });

    await recalculateWbsNumbers(task.projectId, prisma);
    return res.json({ message: 'ok' });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:taskId/actions
router.get('/:taskId/actions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.taskId);
    const actions = await prisma.taskAction.findMany({
      where: { taskId },
      include: actionInclude,
      orderBy: { seqOrder: 'asc' },
    });
    return res.json(actions);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:taskId/actions — 액션 매핑 (리프 노드만 허용)
router.post('/:taskId/actions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.taskId);

    // 하위 공정이 있으면 액션 매핑 불가
    const childCount = await prisma.task.count({ where: { parentId: taskId } });
    if (childCount > 0) {
      return res.status(400).json({
        message: '하위 공정이 있는 공정에는 액션을 매핑할 수 없습니다. 진척도는 하위 공정에서 자동 집계됩니다.',
      });
    }

    const body = actionCreateSchema.parse(req.body);

    const action = await prisma.taskAction.create({
      data: {
        taskId,
        keywordId: body.keywordId,
        seqOrder: body.seqOrder,
        weight: body.weight,
        assigneeId: body.assigneeId ?? null,
        status: body.status,
        progress: STATUS_PROGRESS[body.status] ?? 0,
        note: body.note,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: actionInclude,
    });

    const progress = await calcTaskProgress(taskId, prisma);
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { progress },
      select: { parentId: true },
    });

    if (task.parentId) {
      await rollupProgress(task.parentId, prisma);
    }

    return res.status(201).json(action);
  } catch (err) {
    next(err);
  }
});

export default router;
