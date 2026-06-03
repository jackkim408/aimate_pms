import { Popover, Select, Typography, Space, Progress, Avatar, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { TaskAction, User } from '../../types';
import { api } from '../../api/client';

const STATUS_OPTIONS = [
  { label: '접수대기', value: 'pending',     color: '#F2F4F7', text: '#667085', dot: '#D0D5DD' },
  { label: '접수',     value: 'received',    color: '#EFF8FF', text: '#175CD3', dot: '#2E90FA' },
  { label: '진행중',   value: 'in_progress', color: '#FFFAEB', text: '#B54708', dot: '#F79009' },
  { label: '완료',     value: 'done',        color: '#ECFDF3', text: '#027A48', dot: '#12B76A' },
  { label: '보류',     value: 'on_hold',     color: '#FFF1F3', text: '#C01048', dot: '#F63D68' },
];

const STATUS_PROGRESS: Record<string, number> = {
  pending: 0, received: 10, in_progress: 50, done: 100, on_hold: 0,
};

function getStatusStyle(status: string) {
  return (
    STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0]
  );
}

interface EditProps {
  action: TaskAction;
  users: User[];
  onUpdated: () => void;
}

function EditContent({ action, users, onUpdated }: EditProps) {
  async function patch(data: Record<string, unknown>) {
    try {
      await api.patch(`/actions/${action.id}`, data);
      onUpdated();
    } catch {
      message.error('변경에 실패했습니다.');
    }
  }

  return (
    <div style={{ width: 220 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            상태
          </Typography.Text>
          <Select
            value={action.status}
            onChange={(v) => patch({ status: v })}
            size="small"
            style={{ width: '100%', marginTop: 6 }}
            options={STATUS_OPTIONS.map((o) => ({
              label: (
                <Space size={6}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8,
                    borderRadius: '50%', background: o.dot,
                  }} />
                  {o.label}
                </Space>
              ),
              value: o.value,
            }))}
          />
        </div>
        <div>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            담당자
          </Typography.Text>
          <Select
            value={action.assigneeId ?? undefined}
            onChange={(v) => patch({ assigneeId: v ?? null })}
            size="small"
            style={{ width: '100%', marginTop: 6 }}
            allowClear
            placeholder="담당자 선택"
            options={users.map((u) => ({
              label: (
                <Space size={6}>
                  <Avatar size={16} icon={<UserOutlined />} style={{ background: '#0073EA' }} />
                  {u.name}
                </Space>
              ),
              value: u.id,
            }))}
          />
        </div>
        <div style={{
          padding: '8px 10px', background: '#F9FAFB', borderRadius: 6,
          border: '1px solid #EAECF0',
        }}>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            가중치 <strong>{action.weight}%</strong>
            &nbsp;·&nbsp;{action.seqOrder}번째 순서
          </Typography.Text>
        </div>
      </Space>
    </div>
  );
}

interface ActionCellProps {
  action: TaskAction;
  users: User[];
  onUpdated: () => void;
}

export default function ActionCell({ action, users, onUpdated }: ActionCellProps) {
  const style = getStatusStyle(action.status);
  const progress = STATUS_PROGRESS[action.status] ?? 0;

  return (
    <Popover
      content={<EditContent action={action} users={users} onUpdated={onUpdated} />}
      title={
        <Space>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{action.keyword?.name}</span>
          <span style={{
            fontSize: 11, color: 'var(--text-muted)',
            background: '#F2F4F7', borderRadius: 4, padding: '1px 6px',
          }}>
            #{action.seqOrder}
          </span>
        </Space>
      }
      trigger="click"
      placement="bottom"
    >
      <div
        className="action-chip"
        style={{ background: style.color }}
      >
        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: style.dot, flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: style.text }}>
            {style.label}
          </span>
        </div>

        {/* Assignee + weight */}
        <div style={{ fontSize: 10, color: '#98A2B3', marginBottom: 4 }}>
          {action.assignee?.name ?? '담당자 없음'} · {action.weight}%
        </div>

        {/* Progress bar */}
        <Progress
          percent={progress}
          size={{ height: 3 }}
          showInfo={false}
          strokeColor={style.dot}
          trailColor="rgba(0,0,0,0.06)"
        />
      </div>
    </Popover>
  );
}
