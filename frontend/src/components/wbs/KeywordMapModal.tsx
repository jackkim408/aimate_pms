import { useState, useEffect } from 'react';
import {
  Modal,
  Checkbox,
  InputNumber,
  Typography,
  Space,
  Button,
  message,
  Divider,
  Alert,
  Row,
  Col,
} from 'antd';
import { api } from '../../api/client';
import type { Task, ActionKeyword } from '../../types';

interface Selection {
  keywordId: number;
  name: string;
  selected: boolean;
  weight: number;
  seqOrder: number;
  existingActionId?: number;
}

interface KeywordMapModalProps {
  open: boolean;
  task: Task;
  keywords: ActionKeyword[];
  users: unknown[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function KeywordMapModal({
  open,
  task,
  keywords,
  onClose,
  onSuccess,
}: KeywordMapModalProps) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelections(
      keywords.map((kw, i) => {
        const existing = task.actions?.find((a) => a.keywordId === kw.id);
        return {
          keywordId: kw.id,
          name: kw.name,
          selected: !!existing,
          weight: existing?.weight ?? 0,
          seqOrder: existing?.seqOrder ?? i + 1,
          existingActionId: existing?.id,
        };
      }),
    );
  }, [open, task, keywords]);

  const selectedList = selections.filter((s) => s.selected);
  const totalWeight = selectedList.reduce((sum, s) => sum + (s.weight || 0), 0);
  const weightOk = selectedList.length === 0 || totalWeight === 100;

  function toggle(keywordId: number) {
    setSelections((prev) =>
      prev.map((s) => (s.keywordId === keywordId ? { ...s, selected: !s.selected } : s)),
    );
  }

  function update(keywordId: number, field: 'weight' | 'seqOrder', value: number) {
    setSelections((prev) =>
      prev.map((s) =>
        s.keywordId === keywordId ? { ...s, [field]: value ?? 0 } : s,
      ),
    );
  }

  async function handleSave() {
    if (!weightOk) {
      message.warning(`가중치 합이 ${totalWeight}%입니다. 100%가 되어야 합니다.`);
      return;
    }
    setSaving(true);
    try {
      const deselected = selections.filter((s) => !s.selected && s.existingActionId);
      await Promise.all(
        deselected.map((s) => api.delete(`/actions/${s.existingActionId}`)),
      );

      for (const s of selectedList) {
        if (s.existingActionId) {
          await api.patch(`/actions/${s.existingActionId}`, {
            weight: s.weight,
            seqOrder: s.seqOrder,
          });
        } else {
          await api.post(`/tasks/${task.id}/actions`, {
            keywordId: s.keywordId,
            weight: s.weight,
            seqOrder: s.seqOrder,
            status: 'pending',
          });
        }
      }

      message.success('액션 매핑이 저장되었습니다.');
      onSuccess();
    } catch {
      message.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`액션 키워드 매핑 — ${task.wbsNumber} ${task.name}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={540}
    >
      {selectedList.length > 0 && (
        <Alert
          message={
            weightOk
              ? `가중치 합: ${totalWeight}% ✓`
              : `가중치 합: ${totalWeight}% (100%가 되어야 합니다)`
          }
          type={weightOk ? 'success' : 'warning'}
          style={{ marginBottom: 12 }}
        />
      )}

      <div style={{ maxHeight: 440, overflowY: 'auto', paddingRight: 4 }}>
        {selections.map((s) => (
          <Row
            key={s.keywordId}
            align="middle"
            style={{ marginBottom: 8, padding: '4px 8px', borderRadius: 4, background: s.selected ? '#f0f5ff' : undefined }}
          >
            <Col flex="120px">
              <Checkbox checked={s.selected} onChange={() => toggle(s.keywordId)}>
                <Typography.Text strong={s.selected}>{s.name}</Typography.Text>
              </Checkbox>
            </Col>
            {s.selected && (
              <>
                <Col flex="auto">
                  <Space size={4}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      가중치
                    </Typography.Text>
                    <InputNumber
                      min={0}
                      max={100}
                      value={s.weight}
                      onChange={(v) => update(s.keywordId, 'weight', v ?? 0)}
                      size="small"
                      style={{ width: 64 }}
                      addonAfter="%"
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      순서
                    </Typography.Text>
                    <InputNumber
                      min={1}
                      max={99}
                      value={s.seqOrder}
                      onChange={(v) => update(s.keywordId, 'seqOrder', v ?? 1)}
                      size="small"
                      style={{ width: 52 }}
                    />
                  </Space>
                </Col>
              </>
            )}
          </Row>
        ))}
      </div>

      <Divider style={{ margin: '12px 0' }} />
      <Button
        type="primary"
        block
        onClick={handleSave}
        loading={saving}
        disabled={selectedList.length > 0 && !weightOk}
      >
        저장
      </Button>
    </Modal>
  );
}
