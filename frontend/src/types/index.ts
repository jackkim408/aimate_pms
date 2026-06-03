export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  owner: { id: number; name: string; email: string };
  createdAt: string;
}

export interface ActionKeyword {
  id: number;
  name: string;
  description?: string;
  sortOrder: number;
  projectId?: number | null;
  isActive: boolean;
}

export interface TaskAction {
  id: number;
  taskId: number;
  keywordId: number;
  keyword: { id: number; name: string; sortOrder: number };
  seqOrder: number;
  weight: number;
  assigneeId?: number | null;
  assignee?: { id: number; name: string } | null;
  status: string;
  progress: number;
  note?: string | null;
  dueDate?: string | null;
}

export interface Task {
  id: number;
  projectId: number;
  parentId: number | null;
  wbsNumber: string;
  name: string;
  note?: string | null;
  depth: number;
  planStart?: string | null;
  planEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  assigneeId?: number | null;
  assignee?: { id: number; name: string } | null;
  progress: number;
  planProgress: number;
  status: string;
  isMilestone: boolean;
  sortOrder: number;
  actions: TaskAction[];
}

// Ant Design Table tree node
export type TaskNode = Task & {
  key: number;
  children?: TaskNode[];
};
