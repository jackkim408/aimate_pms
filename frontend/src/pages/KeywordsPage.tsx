import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Button, Table, Input, Space, Typography, message,
  Modal, Form, InputNumber, Tag, Tooltip, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, ReloadOutlined, TagOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { api } from '../api/client';

const { Title, Text } = Typography;

/* ── 타입 ────────────────────────────────────────── */
interface Keyword {
  id: number;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  projectId?: number | null;
}
interface KeywordForm {
  name: string;
  description?: string;
  sortOrder: number;
}
type FilterKey = 'all' | 'active' | 'inactive';

const FILTER_TABS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all',      label: '전체',   color: '#667085' },
  { key: 'active',   label: '활성',   color: '#00C875' },
  { key: 'inactive', label: '비활성', color: '#98A2B3' },
];

/* ── 드래그 핸들 컨텍스트 ─────────────────────────── */
interface RowCtx {
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
  listeners?: SyntheticListenerMap;
  isDragging?: boolean;
}
const RowContext = React.createContext<RowCtx>({});

function DragHandle() {
  const { setActivatorNodeRef, listeners, isDragging } = useContext(RowContext);
  return (
    <Tooltip title="드래그하여 순서 변경" placement="right">
      <HolderOutlined
        ref={setActivatorNodeRef as React.Ref<HTMLSpanElement>}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          fontSize: 16,
          color: isDragging ? '#0073EA' : '#C0C8D8',
          touchAction: 'none',
          transition: 'color 0.15s',
        }}
        {...listeners}
      />
    </Tooltip>
  );
}

/* ── 드래그 가능한 행 ─────────────────────────────── */
interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

function DraggableRow(props: RowProps) {
  const {
    attributes, listeners,
    setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: props['data-row-key'] });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    // 드래그 중인 원본 행 — 반투명 placeholder로 표시
    opacity:    isDragging ? 0.25 : 1,
    background: isDragging ? '#F0F6FF' : undefined,
  };

  const ctx = useMemo<RowCtx>(
    () => ({ setActivatorNodeRef, listeners, isDragging }),
    [setActivatorNodeRef, listeners, isDragging],
  );

  return (
    <RowContext.Provider value={ctx}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  );
}

/* ── 드래그 오버레이 카드 ─────────────────────────── */
function DragCard({ keyword }: { keyword: Keyword }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      background: '#fff',
      border: '2px solid #0073EA',
      borderRadius: 10,
      boxShadow: '0 10px 40px rgba(0,115,234,0.22)',
      cursor: 'grabbing',
      pointerEvents: 'none',
      minWidth: 220,
      userSelect: 'none',
    }}>
      <HolderOutlined style={{ color: '#0073EA', fontSize: 16 }} />
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: keyword.isActive ? '#E8F3FF' : '#F2F4F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <TagOutlined style={{ color: keyword.isActive ? '#0073EA' : '#C0C8D8', fontSize: 13 }} />
      </div>
      <Text style={{ fontWeight: 700, fontSize: 14 }}>{keyword.name}</Text>
      {keyword.description && (
        <Text type="secondary" style={{ fontSize: 12 }}>{keyword.description}</Text>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   KeywordsPage
════════════════════════════════════════════════════ */
export default function KeywordsPage() {
  const [keywords, setKeywords]       = useState<Keyword[]>([]);
  const [displayItems, setDisplayItems] = useState<Keyword[]>([]); // 테이블 표시 전용
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<FilterKey>('active');
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingKw, setEditingKw]     = useState<Keyword | null>(null);
  const [form] = Form.useForm<KeywordForm>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  /* ── 데이터 패치 ────────────────────────────────── */
  async function fetchKeywords() {
    setLoading(true);
    try {
      const { data } = await api.get<Keyword[]>('/keywords?all=1');
      setKeywords(data);
    } catch {
      message.error('키워드 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchKeywords(); }, []);

  /* ── 필터·검색 결과 → displayItems 동기화 ────────
     드래그 중이 아닐 때만 서버 상태로 덮어씁니다.    */
  const filtered = useMemo(() =>
    keywords
      .filter(k =>
        filter === 'all'    ? true :
        filter === 'active' ? k.isActive :
        !k.isActive
      )
      .filter(k =>
        !search ||
        k.name.includes(search) ||
        (k.description ?? '').includes(search)
      ),
    [keywords, filter, search],
  );

  useEffect(() => {
    // 드래그 중에는 외부 변화가 displayItems를 덮어쓰지 않도록 함
    if (!activeId) setDisplayItems(filtered);
  }, [filtered, activeId]);

  const activeKeyword = activeId
    ? displayItems.find(k => String(k.id) === activeId) ?? null
    : null;

  const counts: Record<FilterKey, number> = {
    all:      keywords.length,
    active:   keywords.filter(k =>  k.isActive).length,
    inactive: keywords.filter(k => !k.isActive).length,
  };

  /* ── 드래그 이벤트 ──────────────────────────────── */
  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const fromIdx = displayItems.findIndex(k => String(k.id) === String(active.id));
    const toIdx   = displayItems.findIndex(k => String(k.id) === String(over.id));

    if (fromIdx < 0 || toIdx < 0) return;

    const newOrder = arrayMove(displayItems, fromIdx, toIdx);

    // 즉시 화면 반영 (setKeywords 거치지 않고 직접 업데이트)
    setDisplayItems(newOrder);

    const updates = newOrder.map((k, i) => ({ id: k.id, sortOrder: i }));

    try {
      await api.post('/keywords/reorder', updates);
      message.success('순서가 저장되었습니다.');
      // 서버와 동기화 (keywords 상태 갱신 → filtered → displayItems 재동기화)
      fetchKeywords();
    } catch {
      message.error('순서 저장에 실패했습니다.');
      fetchKeywords(); // 실패 시 서버 순서로 원복
    }
  }

  /* ── 모달 제어 ──────────────────────────────────── */
  function openCreate() {
    setEditingKw(null);
    form.setFieldsValue({ name: '', description: '', sortOrder: counts.active });
    setModalOpen(true);
  }
  function openEdit(kw: Keyword) {
    setEditingKw(kw);
    form.setFieldsValue({ name: kw.name, description: kw.description ?? '', sortOrder: kw.sortOrder });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditingKw(null); form.resetFields(); }

  async function onSubmit(values: KeywordForm) {
    setSaving(true);
    try {
      if (editingKw) {
        await api.patch(`/keywords/${editingKw.id}`, values);
        message.success('키워드가 수정되었습니다.');
      } else {
        await api.post('/keywords', values);
        message.success(`'${values.name}' 키워드가 추가되었습니다.`);
      }
      closeModal();
      fetchKeywords();
    } catch {
      message.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(kw: Keyword) {
    try {
      await api.patch(`/keywords/${kw.id}`, { isActive: !kw.isActive });
      message.success(kw.isActive ? `'${kw.name}' 비활성화` : `'${kw.name}' 활성화`);
      fetchKeywords();
    } catch { message.error('변경 실패'); }
  }
  async function handleDeactivate(kw: Keyword) {
    try {
      await api.delete(`/keywords/${kw.id}`);
      message.success(`'${kw.name}' 비활성화`);
      fetchKeywords();
    } catch { message.error('실패'); }
  }

  /* ── 테이블 컬럼 ────────────────────────────────── */
  const columns: ColumnsType<Keyword> = [
    {
      key: 'drag',
      width: 40,
      align: 'center',
      render: () => <DragHandle />,
    },
    {
      title: '순서',
      dataIndex: 'sortOrder',
      width: 56,
      align: 'center',
      render: (v: number) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '키워드명',
      dataIndex: 'name',
      render: (name: string, r: Keyword) => (
        <Space size={8}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: r.isActive ? '#E8F3FF' : '#F2F4F7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TagOutlined style={{ color: r.isActive ? '#0073EA' : '#C0C8D8', fontSize: 13 }} />
          </div>
          <Text style={{ fontWeight: 600, fontSize: 14, color: r.isActive ? '#172B4D' : '#98A2B3' }}>
            {name}
          </Text>
        </Space>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      ellipsis: true,
      render: (v?: string | null) => <Text type="secondary" style={{ fontSize: 13 }}>{v || '—'}</Text>,
    },
    {
      title: '범위',
      dataIndex: 'projectId',
      width: 80, align: 'center',
      render: (v?: number | null) => (
        <Tag color={v ? 'blue' : 'default'} style={{ fontSize: 11, borderRadius: 20, padding: '0 8px' }}>
          {v ? '프로젝트' : '공용'}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      width: 88, align: 'center',
      render: (v: boolean) => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 20, padding: '0 10px', fontWeight: 600 }}>
          {v ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'actions',
      width: 96, align: 'center',
      render: (_: unknown, r: Keyword) => (
        <Space size={4}>
          <Tooltip title="편집">
            <Button size="small" icon={<EditOutlined />} style={{ borderRadius: 6 }} onClick={() => openEdit(r)} />
          </Tooltip>
          {r.isActive ? (
            <Popconfirm
              title="비활성화하시겠습니까?"
              description="이미 매핑된 공정의 액션에는 영향이 없습니다."
              onConfirm={() => handleDeactivate(r)}
              okText="비활성화" cancelText="취소"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="비활성화">
                <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip title="다시 활성화">
              <Button
                size="small" icon={<ReloadOutlined />}
                style={{ borderRadius: 6, color: '#00C875', borderColor: '#95DE64' }}
                onClick={() => toggleActive(r)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const isEditing = !!editingKw;

  return (
    <>
      {/* ── 헤더 ──────────────────────────────────── */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>액션 키워드 관리</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <HolderOutlined style={{ color: '#0073EA', marginRight: 4 }} />
            아이콘을 드래그하면 WBS 매핑 화면에 표시되는 순서가 변경됩니다.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" style={{ borderRadius: 10 }} onClick={openCreate}>
          새 키워드
        </Button>
      </div>

      {/* ── 필터 탭 + 검색 ────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', marginBottom: 14,
        background: '#fff', borderRadius: 10, border: '1px solid var(--border)',
      }}>
        <Space size={4}>
          {FILTER_TABS.map(tab => {
            const active = filter === tab.key;
            return (
              <div
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '5px 16px', borderRadius: 20, cursor: 'pointer',
                  background: active ? tab.color + '18' : 'transparent',
                  border: `1.5px solid ${active ? tab.color : 'transparent'}`,
                  transition: 'all 0.15s', userSelect: 'none',
                }}
              >
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
          placeholder="키워드명 또는 설명 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 240, borderRadius: 8 }}
        />
      </div>

      {/* ── 드래그 테이블 ─────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={displayItems.map(k => String(k.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="wbs-table">
            <Table
              dataSource={displayItems}
              columns={columns}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{ pageSize: 20, size: 'small', showSizeChanger: false }}
              rowClassName={(r: Keyword) => !r.isActive ? 'kw-inactive-row' : ''}
              components={{ body: { row: DraggableRow } }}
            />
          </div>
        </SortableContext>

        {/* 커서를 따라다니는 플로팅 카드 */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeKeyword ? <DragCard keyword={activeKeyword} /> : null}
        </DragOverlay>
      </DndContext>

      {/* ── 추가/수정 모달 ─────────────────────────── */}
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
            {isEditing ? `키워드 수정 — ${editingKw?.name}` : '새 키워드 추가'}
          </Space>
        }
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={440}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} style={{ marginTop: 20 }}>
          <Form.Item
            name="name"
            label="키워드명"
            rules={[{ required: true, message: '키워드명을 입력해주세요.' }]}
          >
            <Input
              prefix={<TagOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder="예: 검토, 리뷰, 작성, 승인"
              size="large"
            />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={2} placeholder="이 키워드가 언제 사용되는지 간단히 설명하세요." />
          </Form.Item>
          <Form.Item name="sortOrder" label="표시 순서" extra="숫자가 작을수록 앞에 표시됩니다.">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space style={{ width: '100%' }}>
              <Button block onClick={closeModal} style={{ flex: 1 }}>취소</Button>
              <Button
                type="primary" htmlType="submit" block size="large" loading={saving}
                style={{ flex: 2, background: isEditing ? '#FF8B00' : undefined, borderColor: isEditing ? '#FF8B00' : undefined }}
              >
                {isEditing ? '수정 완료' : '키워드 추가'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .kw-inactive-row td { opacity: 0.5; }
        .kw-inactive-row:hover td { opacity: 0.75 !important; }
      `}</style>
    </>
  );
}
