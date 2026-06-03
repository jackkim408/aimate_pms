import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Space, Typography, Spin, message,
  Breadcrumb, Row, Col, Tabs,
} from 'antd';
import {
  PlusOutlined, ArrowLeftOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  WarningOutlined, BarChartOutlined,
  FileExcelOutlined, TableOutlined, ScheduleOutlined,
} from '@ant-design/icons';
import { api } from '../api/client';
import WBSGrid from '../components/wbs/WBSGrid';
import GanttChart from '../components/wbs/GanttChart';
import TaskDialog from '../components/wbs/TaskDialog';
import WBSImportModal from '../components/wbs/WBSImportModal';
import type { Task, ActionKeyword, User, Project } from '../types';

const { Title, Text } = Typography;

function calcStats(tasks: Task[]) {
  const leaves = tasks.filter(
    (t) => !tasks.some((other) => other.parentId === t.id),
  );
  const done = leaves.filter((t) => t.progress >= 100).length;
  const delayed = leaves.filter(
    (t) => t.planProgress > t.progress + 5 && t.progress < 100,
  ).length;
  const avgProgress =
    leaves.length > 0
      ? Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length)
      : 0;
  return { total: leaves.length, done, delayed, avgProgress };
}

export default function WBSEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [keywords, setKeywords] = useState<ActionKeyword[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [pRes, tRes, kRes, uRes] = await Promise.all([
        api.get<Project>(`/projects/${projectId}`),
        api.get<Task[]>(`/projects/${projectId}/tasks`),
        api.get<ActionKeyword[]>('/keywords'),
        api.get<User[]>('/users'),
      ]);
      setProject(pRes.data);
      setTasks(tRes.data);
      setKeywords(kRes.data);
      setUsers(uRes.data);
    } catch {
      message.error('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [projectId]);

  const stats = calcStats(tasks);

  const STAT_CARDS = [
    {
      label: '전체 공정',
      value: stats.total,
      icon: <BarChartOutlined />,
      color: '#0073EA',
      bg: '#E8F3FF',
    },
    {
      label: '완료',
      value: stats.done,
      icon: <CheckCircleOutlined />,
      color: '#00C875',
      bg: '#E6FFF4',
    },
    {
      label: '지연',
      value: stats.delayed,
      icon: <WarningOutlined />,
      color: '#E44258',
      bg: '#FFF0F2',
    },
    {
      label: '평균 진척도',
      value: `${stats.avgProgress}%`,
      icon: <ClockCircleOutlined />,
      color: '#FF8B00',
      bg: '#FFF7E6',
    },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/projects')}>프로젝트</a> },
          { title: project?.name ?? '…' },
          { title: 'WBS' },
        ]}
      />

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/projects')}
            style={{ borderRadius: 8 }}
          />
          <div>
            <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
              {project?.name}
            </Title>
            {project?.startDate && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {project.startDate} ~ {project.endDate ?? '미정'}
              </Text>
            )}
          </div>
        </Space>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            size="large"
            style={{ borderRadius: 10, color: '#00C875', borderColor: '#00C875' }}
            onClick={() => setImportModalOpen(true)}
          >
            Excel 가져오기
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{ borderRadius: 10 }}
            onClick={() => { setEditingTask(null); setParentTask(null); setTaskDialogOpen(true); }}
          >
            공정 추가
          </Button>
        </Space>
      </div>

      {/* Stat cards */}
      {!loading && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {STAT_CARDS.map((s) => (
            <Col span={6} key={s.label}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {/* WBS 그리드 / 간트 차트 탭 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Tabs
          defaultActiveKey="grid"
          size="middle"
          style={{ marginTop: 4 }}
          items={[
            {
              key: 'grid',
              label: <Space size={6}><TableOutlined />WBS 그리드</Space>,
              children: (
                <>
                  {/* 색상 범례 */}
                  <div style={{
                    display: 'flex', gap: 16, marginBottom: 12,
                    padding: '7px 14px', background: '#fff',
                    borderRadius: 8, border: '1px solid var(--border)',
                    width: 'fit-content',
                  }}>
                    {[
                      { color: '#C6EFCE', label: '완료 (100%)' },
                      { color: '#D6E4F7', label: '상위 공정' },
                      { color: '#FFC7CE', label: '지연' },
                      { color: '#FFEB9C', label: '진행중' },
                      { color: '#fff',    label: '미착수', border: '#e0e0e0' },
                    ].map(item => (
                      <Space key={item.label} size={6}>
                        <div style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                          background: item.color, border: `1px solid ${item.border ?? item.color}` }} />
                        <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.label}</Text>
                      </Space>
                    ))}
                  </div>
                  <WBSGrid
                    tasks={tasks}
                    keywords={keywords}
                    users={users}
                    projectId={Number(projectId)}
                    onRefresh={fetchAll}
                    onAddChild={(t) => { setParentTask(t); setEditingTask(null); setTaskDialogOpen(true); }}
                    onEdit={(t) => { setEditingTask(t); setParentTask(null); setTaskDialogOpen(true); }}
                  />
                </>
              ),
            },
            {
              key: 'gantt',
              label: <Space size={6}><ScheduleOutlined />간트 차트</Space>,
              children: <GanttChart tasks={tasks} />,
            },
          ]}
        />
      )}

      <TaskDialog
        open={taskDialogOpen}
        projectId={Number(projectId)}
        editingTask={editingTask}
        parentTask={parentTask}
        users={users}
        onClose={() => setTaskDialogOpen(false)}
        onSuccess={() => { setTaskDialogOpen(false); fetchAll(); }}
      />

      <WBSImportModal
        open={importModalOpen}
        projectId={Number(projectId)}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => { setImportModalOpen(false); fetchAll(); }}
      />
    </div>
  );
}
