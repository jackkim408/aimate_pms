import { PrismaClient } from '@prisma/client';

const STATUS_PROGRESS: Record<string, number> = {
  pending: 0,
  received: 10,
  in_progress: 50,
  done: 100,
  on_hold: 0,
};

export async function recalculateWbsNumbers(
  projectId: number,
  prisma: PrismaClient,
): Promise<void> {
  const allTasks = await prisma.task.findMany({
    where: { projectId },
    select: { id: true, parentId: true, sortOrder: true },
  });

  async function assignNumbers(parentId: number | null, prefix: string) {
    const siblings = allTasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (let i = 0; i < siblings.length; i++) {
      const wbsNumber = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      await prisma.task.update({
        where: { id: siblings[i].id },
        data: { wbsNumber },
      });
      await assignNumbers(siblings[i].id, wbsNumber);
    }
  }

  await assignNumbers(null, '');
}

export async function calcTaskProgress(
  taskId: number,
  prisma: PrismaClient,
): Promise<number> {
  const actions = await prisma.taskAction.findMany({
    where: { taskId },
    select: { weight: true, status: true },
  });
  if (actions.length === 0) return 0;

  const progress = actions.reduce((sum, a) => {
    return sum + (a.weight * (STATUS_PROGRESS[a.status] ?? 0)) / 100;
  }, 0);

  return Math.round(progress * 10) / 10;
}

// 부모로 진척도 롤업 — 자식들의 평균
export async function rollupProgress(
  taskId: number,
  prisma: PrismaClient,
): Promise<void> {
  const children = await prisma.task.findMany({
    where: { parentId: taskId },
    select: { id: true, progress: true, parentId: true },
  });

  let progress: number;
  if (children.length === 0) {
    progress = await calcTaskProgress(taskId, prisma);
  } else {
    const total = children.reduce((sum, c) => sum + c.progress, 0);
    progress = Math.round((total / children.length) * 10) / 10;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { progress },
    select: { parentId: true },
  });

  if (task.parentId) {
    await rollupProgress(task.parentId, prisma);
  }
}
