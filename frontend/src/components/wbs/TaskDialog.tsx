import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Switch,
  Button,
  Space,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import type { Task, User } from '../../types';

interface TaskDialogProps {
  open: boolean;
  projectId: number;
  editingTask: Task | null;
  parentTask: Task | null;
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  name: string;
  note?: string;
  assigneeId?: number;
  isMilestone?: boolean;
  planStart?: dayjs.Dayjs;
  planEnd?: dayjs.Dayjs;
}

export default function TaskDialog({
  open,
  projectId,
  editingTask,
  parentTask,
  users,
  onClose,
  onSuccess,
}: TaskDialogProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      form.setFieldsValue({
        name: editingTask.name,
        note: editingTask.note ?? undefined,
        assigneeId: editingTask.assigneeId ?? undefined,
        isMilestone: editingTask.isMilestone,
        planStart: editingTask.planStart ? dayjs(editingTask.planStart) : undefined,
        planEnd: editingTask.planEnd ? dayjs(editingTask.planEnd) : undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, editingTask]);

  async function onFinish(values: FormValues) {
    try {
      const payload = {
        name: values.name,
        note: values.note ?? null,
        assigneeId: values.assigneeId ?? null,
        isMilestone: values.isMilestone ?? false,
        planStart: values.planStart?.format('YYYY-MM-DD') ?? null,
        planEnd: values.planEnd?.format('YYYY-MM-DD') ?? null,
      };

      if (editingTask) {
        await api.patch(`/tasks/${editingTask.id}`, payload);
        message.success('공정이 수정되었습니다.');
      } else {
        await api.post(`/projects/${projectId}/tasks`, {
          ...payload,
          parentId: parentTask?.id ?? null,
        });
        message.success('공정이 추가되었습니다.');
      }
      onSuccess();
    } catch {
      message.error('저장에 실패했습니다.');
    }
  }

  const title = editingTask
    ? `공정 편집 — ${editingTask.wbsNumber} ${editingTask.name}`
    : parentTask
    ? `하위 공정 추가 (${parentTask.wbsNumber} ${parentTask.name})`
    : '최상위 공정 추가';

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={480}>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="공정명"
          rules={[{ required: true, message: '공정명을 입력해주세요.' }]}
        >
          <Input placeholder="예: 요구사항 분석" />
        </Form.Item>

        <Form.Item name="note" label="비고">
          <Input.TextArea rows={2} placeholder="비고" />
        </Form.Item>

        <Space style={{ width: '100%' }} size={12}>
          <Form.Item name="planStart" label="계획 시작일" style={{ flex: 1, marginBottom: 0 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="planEnd" label="계획 종료일" style={{ flex: 1, marginBottom: 0 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item name="assigneeId" label="담당자" style={{ marginTop: 16 }}>
          <Select
            allowClear
            placeholder="담당자 선택"
            options={users.map((u) => ({ label: u.name, value: u.id }))}
          />
        </Form.Item>

        <Form.Item name="isMilestone" label="마일스톤" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block>
            {editingTask ? '수정' : '추가'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
