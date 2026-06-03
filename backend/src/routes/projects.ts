import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { recalculateWbsNumbers } from '../services/wbs.service';

const router = Router();
const prisma = new PrismaClient();

const projectSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요.'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const taskCreateSchema = z.object({
  name: z.string().min(1, '공정명을 입력해주세요.'),
  note: z.string().nullable().optional(),
  parentId: z.number().nullable().optional(),
  planStart: z.string().nullable().optional(),
  planEnd: z.string().nullable().optional(),
  assigneeId: z.number().nullable().optional(),
  isMilestone: z.boolean().optional(),
});

const ownerSelect = { id: true, name: true, email: true };

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  actions: {
    include: {
      keyword: { select: { id: true, name: true, sortOrder: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { seqOrder: 'asc' as const },
  },
};

router.use(authenticate);

// ── 프로젝트 CRUD ─────────────────────────────────────────────────────────────

router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      include: { owner: { select: ownerSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        ownerId: req.user!.id,
      },
      include: { owner: { select: ownerSelect } },
    });
    return res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: { owner: { select: ownerSelect } },
    });
    if (!project) return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
    return res.json(project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = projectSchema.partial().parse(req.body);
    const project = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
      include: { owner: { select: ownerSelect } },
    });
    return res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.project.delete({ where: { id: Number(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── 프로젝트 내 WBS 공정 ──────────────────────────────────────────────────────

// GET /api/projects/:id/tasks
router.get('/:id/tasks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = Number(req.params.id);
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
    });
    return res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/tasks
router.post('/:id/tasks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = Number(req.params.id);
    const body = taskCreateSchema.parse(req.body);

    const siblings = await prisma.task.findMany({
      where: { projectId, parentId: body.parentId ?? null },
      select: { id: true },
    });

    let depth = 0;
    if (body.parentId) {
      const parent = await prisma.task.findUnique({
        where: { id: body.parentId },
        select: { depth: true },
      });
      depth = (parent?.depth ?? 0) + 1;
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        parentId: body.parentId ?? null,
        wbsNumber: '0',
        name: body.name,
        note: body.note ?? null,
        depth,
        planStart: body.planStart ? new Date(body.planStart) : null,
        planEnd: body.planEnd ? new Date(body.planEnd) : null,
        assigneeId: body.assigneeId ?? null,
        isMilestone: body.isMilestone ?? false,
        sortOrder: siblings.length,
      },
    });

    await recalculateWbsNumbers(projectId, prisma);

    const updated = await prisma.task.findUnique({
      where: { id: task.id },
      include: taskInclude,
    });

    return res.status(201).json(updated);
  } catch (err) {
    next(err);
  }
});

// ── Excel WBS 일괄 가져오기 ───────────────────────────────────────────────────

const importRowSchema = z.object({
  name:         z.string().min(1),
  depth:        z.number().min(1).max(5),
  note:         z.string().optional(),
  planStart:    z.string().optional(),
  planEnd:      z.string().optional(),
  assigneeName: z.string().optional(),
  isMilestone:  z.boolean().optional(),
});

// POST /api/projects/:id/tasks/import
router.post('/:id/tasks/import', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = Number(req.params.id);
    const rows = z.array(importRowSchema).parse(req.body);

    // depth별 부모 ID 스택 (index = depth-1)
    const parentStack: (number | null)[] = new Array(5).fill(null);
    let created = 0;

    for (const row of rows) {
      const parentId = row.depth > 1 ? (parentStack[row.depth - 2] ?? null) : null;

      // 담당자 이름 → ID 변환
      let assigneeId: number | null = null;
      if (row.assigneeName) {
        const user = await prisma.user.findFirst({
          where: { name: { contains: row.assigneeName, mode: 'insensitive' } },
          select: { id: true },
        });
        assigneeId = user?.id ?? null;
      }

      // 형제 수 = sortOrder
      const siblingCount = await prisma.task.count({
        where: { projectId, parentId: parentId ?? null },
      });

      const task = await prisma.task.create({
        data: {
          projectId,
          parentId,
          wbsNumber:  '0',              // 나중에 재계산
          name:       row.name,
          note:       row.note ?? null,
          depth:      row.depth - 1,    // DB는 0-indexed
          planStart:  row.planStart  ? new Date(row.planStart)  : null,
          planEnd:    row.planEnd    ? new Date(row.planEnd)    : null,
          assigneeId,
          isMilestone: row.isMilestone ?? false,
          sortOrder:   siblingCount,
        },
        select: { id: true },
      });

      // 스택 갱신: 현재 depth 위치에 새 ID 저장, 더 깊은 레벨 초기화
      parentStack[row.depth - 1] = task.id;
      for (let d = row.depth; d < parentStack.length; d++) {
        parentStack[d] = null;
      }

      created++;
    }

    await recalculateWbsNumbers(projectId, prisma);

    return res.json({ created });
  } catch (err) {
    next(err);
  }
});

export default router;
