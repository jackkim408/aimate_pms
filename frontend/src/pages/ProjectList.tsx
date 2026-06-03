import { useEffect, useState } from 'react';
import {
  Button, Modal, Form, Input, DatePicker,
  Typography, message, Row, Col, Tag, Tooltip,
  Empty, Spin, Space, Popconfirm,
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, UserOutlined,
  FolderOpenOutlined, RightOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { api } from '../api/client';

const { Title, Text } = Typography;

interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  owner: { id: number; name: string; email: string };
  createdAt: string;
}

interface ProjectForm {
  name: string;
  description?: string;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
}

const CARD_COLORS = ['#0073EA', '#00C875', '#FF7B00', '#E44258', '#9B59B6', '#00B0F0', '#FF5AC4'];

function getCardColor(name: string) {
  return CARD_COLORS[name.charCodeAt(0) % CARD_COLORS.length];
}

function getStatusTag(project: Project) {
  if (!project.endDate) return <Tag color="default">날짜 미설정</Tag>;
  const today = dayjs();
  const end = dayjs(project.endDate);
  if (end.isBefore(today)) return <Tag color="error">기간 초과</Tag>;
  if (end.diff(today, 'day') <= 14) return <Tag color="warning">마감 임박</Tag>;
  return <Tag color="success">진행 중</Tag>;
}

export default function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm<ProjectForm>();

  async function fetchProjects() {
    setLoading(true);
    try {
      const { data } = await api.get<Project[]>('/projects');
      setProjects(data);
    } catch {
      message.error('프로젝트 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProjects(); }, []);

  /* ── 생성/편집 모달 열기 ─────────────────────────── */
  function openCreate() {
    setEditingProject(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name,
      description: project.description,
      startDate: project.startDate ? dayjs(project.startDate) : undefined,
      endDate: project.endDate ? dayjs(project.endDate) : undefined,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProject(null);
    form.resetFields();
  }

  /* ── 저장 (생성 or 수정) ─────────────────────────── */
  async function onSubmit(values: ProjectForm) {
    setSaving(true);
    const payload = {
      name: values.name,
      description: values.description,
      startDate: values.startDate?.format('YYYY-MM-DD'),
      endDate: values.endDate?.format('YYYY-MM-DD'),
    };
    try {
      if (editingProject) {
        await api.patch(`/projects/${editingProject.id}`, payload);
        message.success('프로젝트가 수정되었습니다.');
      } else {
        await api.post('/projects', payload);
        message.success('프로젝트가 생성되었습니다.');
      }
      closeModal();
      fetchProjects();
    } catch {
      message.error(editingProject ? '수정에 실패했습니다.' : '생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  /* ── 삭제 ────────────────────────────────────────── */
  async function handleDelete(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    try {
      await api.delete(`/projects/${project.id}`);
      message.success('프로젝트가 삭제되었습니다.');
      fetchProjects();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  }

  const isEditing = !!editingProject;

  return (
    <>
      {/* ── Header ────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
              프로젝트
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {projects.length}개의 프로젝트
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            size="large"
            style={{ borderRadius: 10, paddingInline: 20 }}
          >
            새 프로젝트
          </Button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      ) : projects.length === 0 ? (
        <div className="page-card" style={{ textAlign: 'center', padding: 64 }}>
          <Empty
            image={<FolderOpenOutlined style={{ fontSize: 56, color: '#D0D5DD' }} />}
            description={
              <Text type="secondary">
                아직 프로젝트가 없습니다.<br />새 프로젝트를 만들어 시작하세요.
              </Text>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              첫 프로젝트 만들기
            </Button>
          </Empty>
        </div>
      ) : (
        <Row gutter={[20, 20]}>
          {projects.map((project) => {
            const color = getCardColor(project.name);
            return (
              <Col xs={24} sm={12} xl={8} key={project.id}>
                {/* 카드 — group hover로 액션 버튼 표시 */}
                <div
                  className="project-card"
                  style={{ position: 'relative' }}
                  onClick={() => navigate(`/projects/${project.id}/wbs`)}
                >
                  {/* ── 카드 우상단 액션 버튼 ────────── */}
                  <div
                    className="card-actions"
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      display: 'flex', gap: 4,
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <Tooltip title="프로젝트 수정">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        style={{ borderRadius: 6, background: '#fff' }}
                        onClick={(e) => openEdit(e, project)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="프로젝트 삭제"
                      description={
                        <span>
                          <strong>{project.name}</strong>을(를) 삭제하시겠습니까?<br />
                          모든 WBS 공정 데이터도 함께 삭제됩니다.
                        </span>
                      }
                      onConfirm={(e) => handleDelete(e as React.MouseEvent, project)}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="삭제"
                      cancelText="취소"
                      okButtonProps={{ danger: true }}
                      placement="bottomRight"
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ borderRadius: 6, background: '#fff' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>

                  {/* ── 카드 헤더 ────────────────────── */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(135deg, ${color}CC, ${color})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 18,
                      boxShadow: `0 4px 12px ${color}44`,
                    }}>
                      {project.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 60 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 15, color: 'var(--text-primary)',
                        marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </div>
                      {getStatusTag(project)}
                    </div>
                  </div>

                  {/* ── 설명 ─────────────────────────── */}
                  <Text type="secondary" style={{
                    fontSize: 13, display: 'block', marginBottom: 16,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {project.description || '프로젝트 설명이 없습니다.'}
                  </Text>

                  {/* ── 하단 메타 ─────────────────────── */}
                  <div style={{
                    borderTop: '1px solid var(--border)', paddingTop: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <Space size={12}>
                      {project.startDate && (
                        <Tooltip title={`${project.startDate} ~ ${project.endDate ?? '미정'}`}>
                          <Space size={4}>
                            <CalendarOutlined style={{ color: 'var(--text-muted)', fontSize: 13 }} />
                            <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {dayjs(project.startDate).format('YY.MM.DD')}
                              {project.endDate && ` ~ ${dayjs(project.endDate).format('YY.MM.DD')}`}
                            </Text>
                          </Space>
                        </Tooltip>
                      )}
                      <Space size={4}>
                        <UserOutlined style={{ color: 'var(--text-muted)', fontSize: 13 }} />
                        <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {project.owner.name}
                        </Text>
                      </Space>
                    </Space>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      color: 'var(--primary)', fontSize: 12, fontWeight: 600,
                    }}>
                      WBS 열기 <RightOutlined style={{ fontSize: 10 }} />
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}

          {/* ── 새 프로젝트 추가 카드 ─────────────── */}
          <Col xs={24} sm={12} xl={8}>
            <div
              onClick={openCreate}
              style={{
                borderRadius: 14, border: '2px dashed var(--border)',
                padding: 20, cursor: 'pointer', minHeight: 160,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'border-color 0.2s, background 0.2s',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary)';
                e.currentTarget.style.background = 'var(--primary-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                border: '2px dashed currentColor',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                <PlusOutlined />
              </div>
              <Text style={{ color: 'inherit', fontWeight: 500 }}>새 프로젝트 추가</Text>
            </div>
          </Col>
        </Row>
      )}

      {/* ── 생성 / 수정 공용 모달 ─────────────────────── */}
      <Modal
        title={
          <Space>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: isEditing ? '#FF8B00' : 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isEditing
                ? <EditOutlined style={{ color: '#fff', fontSize: 14 }} />
                : <PlusOutlined style={{ color: '#fff', fontSize: 14 }} />
              }
            </div>
            {isEditing ? `프로젝트 수정` : '새 프로젝트 생성'}
          </Space>
        }
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={500}
        destroyOnClose
      >
        {isEditing && (
          <div style={{
            background: '#FFFBE6', border: '1px solid #FFE58F',
            borderRadius: 8, padding: '8px 14px', marginBottom: 20, marginTop: 16,
            fontSize: 13, color: '#7C4D00',
          }}>
            <strong>{editingProject?.name}</strong> 프로젝트를 수정합니다.
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          style={{ marginTop: isEditing ? 0 : 20 }}
        >
          <Form.Item
            name="name"
            label="프로젝트명"
            rules={[{ required: true, message: '프로젝트명을 입력해주세요.' }]}
          >
            <Input placeholder="예: 코리안리 WBS 2026" size="large" />
          </Form.Item>

          <Form.Item name="description" label="설명">
            <Input.TextArea rows={3} placeholder="프로젝트에 대한 간략한 설명" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startDate" label="시작일">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="종료일">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Space style={{ width: '100%' }}>
              <Button block onClick={closeModal} style={{ flex: 1 }}>
                취소
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={saving}
                style={{ flex: 2, background: isEditing ? '#FF8B00' : undefined, borderColor: isEditing ? '#FF8B00' : undefined }}
              >
                {isEditing ? '수정 완료' : '프로젝트 생성'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── 카드 hover 액션 버튼 표시 CSS ─────────────── */}
      <style>{`
        .project-card:hover .card-actions {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}
