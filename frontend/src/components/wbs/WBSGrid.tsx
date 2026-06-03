import { useState } from 'react';
import {
  Table, Button, Space, Popconfirm, Progress,
  Tooltip, message, Empty, Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  PartitionOutlined, FlagFilled, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import ActionCell from './ActionCell';
import KeywordMapModal from './KeywordMapModal';
import type { Task, ActionKeyword, User, TaskNode } from '../../types';

interface WBSGridProps {
  tasks: Task[];
  keywords: ActionKeyword[];
  users: User[];
  projectId: number;
  onRefresh: () => void;
  onAddChild: (task: Task) => void;
  onEdit: (task: Task) => void;
}

function buildTree(tasks: Task[]): TaskNode[] {
  const map = new Map<number, TaskNode>();
  tasks.forEach((t) => map.set(t.id, { ...t, key: t.id, children: [] }));

  const roots: TaskNode[] = [];
  tasks.forEach((t) => {
    const node = map.get(t.id)!;
    if (t.parentId !== null && map.has(t.parentId)) {
      map.get(t.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  function clean(node: TaskNode) {
    if (!node.children?.length) delete node.children;
    else node.children.forEach(clean);
  }
  roots.forEach(clean);
  return roots;
}

function calcPlanProgress(task: Task): number {
  if (!task.planStart || !task.planEnd) return 0;
  const now = dayjs();
  const start = dayjs(task.planStart);
  const end = dayjs(task.planEnd);
  const total = end.diff(start, 'day');
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((now.diff(start, 'day') / total) * 100)));
}

function getRowStyle(record: TaskNode): React.CSSProperties {
  if (record.progress >= 100) return { background: '#C6EFCE' };
  if (record.children !== undefined) return { background: '#D6E4F7' };
  const plan = calcPlanProgress(record);
  if (plan > record.progress + 5) return { background: '#FFC7CE' };
  if (record.status === 'in_progress') return { background: '#FFEB9C' };
  return {};
}

function ProgressCell({ task }: { task: TaskNode }) {
  const isParent = task.children !== undefined;
  const plan     = calcPlanProgress(task);
  const isDelayed = !isParent && plan > task.progress + 5;

  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isDelayed ? '#E44258' : '#172B4D' }}>
          {Math.round(task.progress)}%
        </span>
        {isParent ? (
          <Tooltip title="하위 공정 진척도의 평균으로 자동 계산됩니다.">
            <span style={{
              fontSize: 10, color: '#0073EA',
              background: '#E8F3FF', borderRadius: 4,
              padding: '1px 6px', fontWeight: 600, cursor: 'default',
            }}>
              자동집계
            </span>
          </Tooltip>
        ) : (
          <span style={{ fontSize: 10, color: '#98A2B3' }}>목표 {plan}%</span>
        )}
      </div>
      <Progress
        percent={Math.round(task.progress)}
        size={{ height: 5 }}
        showInfo={false}
        strokeColor={
          task.progress >= 100 ? '#00C875' :
          isDelayed             ? '#E44258' :
          isParent              ? '#6E9BD1' : '#0073EA'
        }
        trailColor="#EAECF0"
      />
    </div>
  );
}

export default function WBSGrid({
  tasks, keywords, users, onRefresh, onAddChild, onEdit,
}: WBSGridProps) {
  const [mapModalTask, setMapModalTask] = useState<Task | null>(null);

  async function handleDelete(task: Task) {
    try {
      await api.delete(`/tasks/${task.id}`);
      message.success('공정이 삭제되었습니다.');
      onRefresh();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  }

  const baseColumns: ColumnsType<TaskNode> = [
    {
      title: 'WBS',
      dataIndex: 'wbsNumber',
      width: 70,
      fixed: 'left',
      render: (v: string, r: TaskNode) => (
        <span style={{ fontWeight: r.children ? 700 : 400, color: '#344054', fontSize: 12 }}>
          {v}
        </span>
      ),
    },
    {
      title: '공정명',
      dataIndex: 'name',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      render: (name: string, r: TaskNode) => (
        <Space size={6}>
          {r.isMilestone && (
            <FlagFilled style={{ color: '#FF8B00', fontSize: 11 }} />
          )}
          <span style={{ fontWeight: r.children ? 700 : 400, fontSize: 13 }}>
            {name}
          </span>
        </Space>
      ),
    },
    {
      title: '계획 기간',
      width: 150,
      render: (_: unknown, r: TaskNode) => {
        if (!r.planStart && !r.planEnd) return <span style={{ color: '#C0C8D8' }}>—</span>;
        return (
          <span style={{ fontSize: 11, color: '#667085' }}>
            {r.planStart ? dayjs(r.planStart).format('MM/DD') : '?'}
            {' '}~{' '}
            {r.planEnd ? dayjs(r.planEnd).format('MM/DD') : '?'}
          </span>
        );
      },
    },
    {
      title: '담당자',
      width: 90,
      render: (_: unknown, r: TaskNode) =>
        r.assignee ? (
          <Space size={6}>
            <Avatar size={20} icon={<UserOutlined />} style={{ background: '#0073EA' }} />
            <span style={{ fontSize: 12 }}>{r.assignee.name}</span>
          </Space>
        ) : (
          <span style={{ color: '#C0C8D8', fontSize: 12 }}>—</span>
        ),
    },
    {
      title: '진척도',
      width: 130,
      render: (_: unknown, r: TaskNode) => <ProgressCell task={r} />,
    },
    {
      title: '',
      key: 'ops',
      width: 118,
      fixed: 'right',
      render: (_: unknown, record: TaskNode) => (
        <Space size={3}>
          <Tooltip title="하위 공정 추가">
            <Button
              size="small"
              icon={<PlusOutlined />}
              style={{ borderRadius: 6 }}
              onClick={() => onAddChild(record)}
            />
          </Tooltip>
          <Tooltip title="편집">
            <Button
              size="small"
              icon={<EditOutlined />}
              style={{ borderRadius: 6 }}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          {record.children ? (
            <Tooltip title="하위 공정이 있어 액션 매핑 불가 — 진척도는 하위 공정에서 자동 집계">
              <Button
                size="small"
                icon={<PartitionOutlined />}
                style={{ borderRadius: 6 }}
                disabled
              />
            </Tooltip>
          ) : (
            <Tooltip title="액션 키워드 매핑">
              <Button
                size="small"
                icon={<PartitionOutlined />}
                style={{ borderRadius: 6, color: '#0073EA', borderColor: '#91CAFF' }}
                onClick={() => setMapModalTask(record)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="공정을 삭제하시겠습니까?"
            description="하위 공정도 모두 삭제됩니다."
            onConfirm={() => handleDelete(record)}
            okText="삭제" cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const keywordColumns: ColumnsType<TaskNode> = keywords.map((kw) => ({
    title: (
      <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', whiteSpace: 'nowrap' }}>
        {kw.name}
      </div>
    ),
    key: `kw_${kw.id}`,
    width: 110,
    align: 'center' as const,
    render: (_: unknown, task: TaskNode) => {
      const action = task.actions?.find((a) => a.keywordId === kw.id);
      return action
        ? <ActionCell action={action} users={users} onUpdated={onRefresh} />
        : null;
    },
  }));

  if (tasks.length === 0) {
    return (
      <div className="page-card" style={{ textAlign: 'center', padding: 64 }}>
        <Empty description={
          <span style={{ color: 'var(--text-secondary)' }}>
            공정이 없습니다. <strong>공정 추가</strong> 버튼으로 시작하세요.
          </span>
        } />
      </div>
    );
  }

  return (
    <>
      <div className="wbs-table">
        <Table
          dataSource={buildTree(tasks)}
          columns={[...baseColumns, ...keywordColumns]}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content', y: 'calc(100vh - 380px)' }}
          expandable={{ defaultExpandAllRows: true }}
          onRow={(record) => ({ style: getRowStyle(record) })}
        />
      </div>

      {mapModalTask && (
        <KeywordMapModal
          open
          task={mapModalTask}
          keywords={keywords}
          users={users}
          onClose={() => setMapModalTask(null)}
          onSuccess={() => { setMapModalTask(null); onRefresh(); }}
        />
      )}
    </>
  );
}
