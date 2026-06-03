import { useEffect, useState } from 'react';
import {
  Button, Table, Input, Space, Typography, message,
  Modal, Form, Select, Tag, Tooltip, Avatar,
  Row, Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  UserOutlined, MailOutlined, KeyOutlined,
  CrownOutlined, TeamOutlined, SlackOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

const { Title, Text } = Typography;

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  slackId?: string | null;
  createdAt: string;
}

interface UserForm {
  name: string;
  email: string;
  password?: string;
  role: string;
  slackId?: string;
}

type RoleKey = 'all' | 'admin' | 'manager' | 'member';

const ROLES = [
  { value: 'admin',   label: '관리자', color: 'red'     },
  { value: 'manager', label: '매니저', color: 'blue'    },
  { value: 'member',  label: '멤버',   color: 'default' },
];

const AVATAR_COLORS = ['#0073EA', '#00C875', '#FF8B00', '#E44258', '#9B59B6', '#FF5AC4'];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const roleTag = (role: string) => {
  const r = ROLES.find(x => x.value === role);
  return (
    <Tag color={r?.color ?? 'default'} style={{ borderRadius: 20, padding: '0 10px', fontWeight: 600 }}>
      {r?.label ?? role}
    </Tag>
  );
};

/* ═══════════════════════════════════════════════════════
   UsersPage
═══════════════════════════════════════════════════════ */
export default function UsersPage() {
  const currentUser = useAuthStore(s => s.user);
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleKey>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form] = Form.useForm<UserForm>();

  /* ── 데이터 패치 ──────────────────────────────────── */
  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await api.get<UserRow[]>('/users');
      setUsers(data);
    } catch {
      message.error('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchUsers(); }, []);

  /* ── 모달 제어 ────────────────────────────────────── */
  function openCreate() {
    setEditingUser(null);
    form.resetFields();
    form.setFieldValue('role', 'member');
    setModalOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name, email: user.email,
      role: user.role, slackId: user.slackId ?? '',
      password: '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  }

  /* ── 저장 ────────────────────────────────────────── */
  async function onSubmit(values: UserForm) {
    setSaving(true);
    try {
      if (editingUser) {
        const payload: Partial<UserForm> = {
          name: values.name, role: values.role,
          slackId: values.slackId || undefined,
        };
        if (values.password) payload.password = values.password;
        await api.patch(`/users/${editingUser.id}`, payload);
        message.success('사용자 정보가 수정되었습니다.');
      } else {
        await api.post('/users', values);
        message.success(`${values.name} 님이 추가되었습니다.`);
      }
      closeModal();
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  /* ── 필터·검색 ────────────────────────────────────── */
  const filtered = users
    .filter(u => roleFilter === 'all' ? true : u.role === roleFilter)
    .filter(u => !search || u.name.includes(search) || u.email.includes(search));

  const counts: Record<RoleKey, number> = {
    all:     users.length,
    admin:   users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    member:  users.filter(u => u.role === 'member').length,
  };

  const FILTER_TABS: { key: RoleKey; label: string; color: string }[] = [
    { key: 'all',     label: '전체',   color: '#667085' },
    { key: 'admin',   label: '관리자', color: '#E44258' },
    { key: 'manager', label: '매니저', color: '#0073EA' },
    { key: 'member',  label: '멤버',   color: '#00C875' },
  ];

  /* ── 테이블 컬럼 ──────────────────────────────────── */
  const columns: ColumnsType<UserRow> = [
    {
      title: '사용자',
      render: (_: unknown, r: UserRow) => (
        <Space size={12}>
          <Avatar style={{ background: avatarColor(r.name), fontWeight: 700, flexShrink: 0 }}>
            {r.name.charAt(0)}
          </Avatar>
          <div>
            <Space size={6}>
              <Text style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</Text>
              {r.id === currentUser?.id && (
                <Tag color="blue" style={{ fontSize: 10, borderRadius: 20, padding: '0 6px' }}>나</Tag>
              )}
            </Space>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '역할',
      dataIndex: 'role',
      width: 100,
      render: roleTag,
    },
    {
      title: 'Slack ID',
      dataIndex: 'slackId',
      width: 150,
      render: (v?: string | null) =>
        v ? (
          <Space size={4}>
            <SlackOutlined style={{ color: '#611f69' }} />
            <Text style={{ fontSize: 13 }}>{v}</Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
        ),
    },
    {
      title: '가입일',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => (
        <Text style={{ fontSize: 13 }}>{dayjs(v).format('YYYY-MM-DD')}</Text>
      ),
    },
    {
      title: '액션',
      width: 72,
      align: 'center',
      render: (_: unknown, r: UserRow) => (
        <Tooltip title="편집">
          <Button
            size="small"
            icon={<EditOutlined />}
            style={{ borderRadius: 6 }}
            onClick={() => openEdit(r)}
          />
        </Tooltip>
      ),
    },
  ];

  const isEditing = !!editingUser;

  return (
    <>
      {/* ── 헤더 ──────────────────────────────────── */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>사용자 관리</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            프로젝트 담당자로 지정할 사용자를 추가·수정합니다.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" style={{ borderRadius: 10 }} onClick={openCreate}>
          사용자 추가
        </Button>
      </div>

      {/* ── 통계 카드 ────────────────────────────── */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { label: '전체',   count: counts.all,     icon: <TeamOutlined />,  color: '#667085', bg: '#F9FAFB' },
          { label: '관리자', count: counts.admin,   icon: <CrownOutlined />, color: '#E44258', bg: '#FFF0F2' },
          { label: '매니저', count: counts.manager, icon: <UserOutlined />,  color: '#0073EA', bg: '#E8F3FF' },
          { label: '멤버',   count: counts.member,  icon: <UserOutlined />,  color: '#00C875', bg: '#E6FFF4' },
        ].map(s => (
          <Col span={6} key={s.label}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {s.count}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* ── 필터 탭 + 검색 ──────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', marginBottom: 14,
        background: '#fff', borderRadius: 10, border: '1px solid var(--border)',
      }}>
        <Space size={4}>
          {FILTER_TABS.map(tab => {
            const active = roleFilter === tab.key;
            return (
              <div key={tab.key} onClick={() => setRoleFilter(tab.key)} style={{
                padding: '5px 16px', borderRadius: 20, cursor: 'pointer',
                background: active ? tab.color + '18' : 'transparent',
                border: `1.5px solid ${active ? tab.color : 'transparent'}`,
                transition: 'all 0.15s', userSelect: 'none',
              }}>
                <Text style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? tab.color : 'var(--text-secondary)' }}>
                  {tab.label}
                </Text>
                <Text style={{ fontSize: 12, marginLeft: 6, fontWeight: active ? 700 : 400, color: active ? tab.color : 'var(--text-muted)' }}>
                  {counts[tab.key]}
                </Text>
              </div>
            );
          })}
        </Space>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          placeholder="이름 또는 이메일 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 240, borderRadius: 8 }}
        />
      </div>

      {/* ── 테이블 ──────────────────────────────── */}
      <div className="wbs-table">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, size: 'small', showSizeChanger: false }}
        />
      </div>

      {/* ── 추가/수정 모달 ──────────────────────── */}
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
                : <PlusOutlined style={{ color: '#fff', fontSize: 14 }} />}
            </div>
            {isEditing ? `사용자 수정 — ${editingUser?.name}` : '새 사용자 추가'}
          </Space>
        }
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} style={{ marginTop: 20 }}>

          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '이름을 입력해주세요.' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder="홍길동"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { required: true, message: '이메일을 입력해주세요.' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder="example@company.com"
              size="large"
              disabled={isEditing}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={isEditing ? '새 비밀번호 (변경 시만 입력)' : '비밀번호'}
            rules={isEditing ? [] : [
              { required: true, message: '비밀번호를 입력해주세요.' },
              { min: 6, message: '6자 이상 입력해주세요.' },
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder={isEditing ? '변경하지 않으면 빈칸으로 두세요.' : '6자 이상'}
              size="large"
            />
          </Form.Item>

          <Form.Item name="role" label="역할" rules={[{ required: true }]}>
            <Select
              size="large"
              options={ROLES.map(r => ({
                value: r.value,
                label: (
                  <Space>
                    <Tag color={r.color} style={{ borderRadius: 20 }}>{r.label}</Tag>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item name="slackId" label="Slack ID (선택)">
            <Input
              prefix={<SlackOutlined style={{ color: '#611f69' }} />}
              placeholder="@username 또는 U012AB3CD"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space style={{ width: '100%' }}>
              <Button block onClick={closeModal} style={{ flex: 1 }}>취소</Button>
              <Button
                type="primary" htmlType="submit" block size="large" loading={saving}
                style={{
                  flex: 2,
                  background:  isEditing ? '#FF8B00' : undefined,
                  borderColor: isEditing ? '#FF8B00' : undefined,
                }}
              >
                {isEditing ? '수정 완료' : '사용자 추가'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
