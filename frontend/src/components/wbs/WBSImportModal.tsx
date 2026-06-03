import { useState } from 'react';
import {
  Modal, Button, Steps, Table, Space, Typography,
  Alert, Tag, Spin, Result, message, Upload,
} from 'antd';
import {
  DownloadOutlined, UploadOutlined, FileExcelOutlined,
  CheckCircleOutlined, InboxOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';
import {
  downloadWBSTemplate,
  parseWBSExcel,
  WBSImportRow,
} from '../../utils/excelTemplate';

const { Text, Title } = Typography;

interface WBSImportModalProps {
  open: boolean;
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const STEP = { UPLOAD: 0, PREVIEW: 1, DONE: 2 };

export default function WBSImportModal({
  open, projectId, onClose, onSuccess,
}: WBSImportModalProps) {
  const [step, setStep] = useState(STEP.UPLOAD);
  const [rows, setRows] = useState<WBSImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadWBSTemplate();
      message.success('템플릿이 다운로드되었습니다.');
    } catch {
      message.error('다운로드에 실패했습니다.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const parsed = await parseWBSExcel(file);
      if (parsed.length === 0) {
        message.warning('데이터가 없습니다. 헤더 행 아래에 공정 데이터를 입력해주세요.');
        return;
      }
      setRows(parsed);
      setStep(STEP.PREVIEW);
    } catch {
      message.error('Excel 파일을 읽는 중 오류가 발생했습니다. 템플릿 형식을 확인해주세요.');
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const { data } = await api.post<{ created: number }>(
        `/projects/${projectId}/tasks/import`,
        rows,
      );
      setImportedCount(data.created);
      setStep(STEP.DONE);
    } catch {
      message.error('가져오기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    const wasDone = step === STEP.DONE;
    setStep(STEP.UPLOAD);
    setRows([]);
    onClose();
    if (wasDone) onSuccess();
  }

  /* ── 미리보기 테이블 컬럼 ─────────────────────── */
  const previewColumns = [
    {
      title: '공정명',
      dataIndex: 'name',
      render: (name: string, r: WBSImportRow) => (
        <span style={{ paddingLeft: (r.depth - 1) * 20 }}>
          {r.depth > 1 && (
            <span style={{ color: '#C0C8D8', marginRight: 4, fontSize: 11 }}>└─</span>
          )}
          <span style={{ fontWeight: r.depth === 1 ? 700 : 400 }}>{name}</span>
          {r.isMilestone && (
            <Tag color="gold" style={{ marginLeft: 6, fontSize: 10, padding: '0 5px' }}>M</Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Depth',
      dataIndex: 'depth',
      width: 66,
      align: 'center' as const,
      render: (d: number) => (
        <Tag color={['', 'blue', 'cyan', 'geekblue', 'purple', 'magenta'][d] || 'default'}>
          {d}
        </Tag>
      ),
    },
    {
      title: '계획 기간',
      width: 170,
      render: (_: unknown, r: WBSImportRow) =>
        r.planStart || r.planEnd ? (
          <Text style={{ fontSize: 12 }}>
            {r.planStart ?? '?'} ~ {r.planEnd ?? '?'}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>미설정</Text>
        ),
    },
    {
      title: '담당자',
      dataIndex: 'assigneeName',
      width: 90,
      render: (v?: string) =>
        v ? <Text style={{ fontSize: 12 }}>{v}</Text>
          : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: '비고',
      dataIndex: 'note',
      ellipsis: true,
      render: (v?: string) => <Text style={{ fontSize: 12 }}>{v ?? ''}</Text>,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#00C875', fontSize: 18 }} />
          <span>Excel로 WBS 일괄 등록</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      {/* Steps */}
      <Steps
        current={step}
        size="small"
        style={{ margin: '16px 0 28px' }}
        items={[
          { title: '템플릿 다운로드 & 업로드' },
          { title: '데이터 확인' },
          { title: '완료' },
        ]}
      />

      {/* ── Step 0: Download & Upload ─────────── */}
      {step === STEP.UPLOAD && (
        <div>
          <Alert
            message="Excel 템플릿으로 WBS를 빠르게 구성하세요"
            description={
              <ol style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 2, fontSize: 13 }}>
                <li>아래 버튼으로 <strong>Excel 템플릿</strong>을 다운로드합니다.</li>
                <li><strong>WBS 데이터</strong> 시트에 공정 정보를 입력합니다.</li>
                <li>저장 후 파일을 이 창에 <strong>업로드</strong>하면 자동으로 WBS가 생성됩니다.</li>
              </ol>
            }
            type="info"
            showIcon
            style={{ marginBottom: 20, borderRadius: 10 }}
          />

          {/* Download button */}
          <Button
            block
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={downloading}
            size="large"
            style={{
              height: 52, borderRadius: 10,
              borderStyle: 'dashed', borderColor: '#0073EA',
              color: '#0073EA', fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Excel 템플릿 다운로드 (.xlsx)
          </Button>

          {/* Upload dragger */}
          <Upload.Dragger
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => { handleFile(file); return false; }}
            style={{ borderRadius: 12 }}
            disabled={parsing}
          >
            <div style={{ padding: '28px 0' }}>
              {parsing ? (
                <>
                  <Spin size="large" />
                  <p style={{ marginTop: 14, color: 'var(--text-secondary)', fontSize: 14 }}>
                    Excel 파일 분석 중...
                  </p>
                </>
              ) : (
                <>
                  <InboxOutlined style={{ fontSize: 52, color: 'var(--primary)' }} />
                  <p style={{ marginTop: 14, fontSize: 15, fontWeight: 600, margin: '14px 0 4px' }}>
                    작성된 Excel 파일을 여기에 드래그하거나 클릭하여 업로드
                  </p>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    .xlsx, .xls 파일 지원
                  </Text>
                </>
              )}
            </div>
          </Upload.Dragger>
        </div>
      )}

      {/* ── Step 1: Preview ───────────────────── */}
      {step === STEP.PREVIEW && (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14,
          }}>
            <Alert
              message={`총 ${rows.length}개 공정이 확인되었습니다. 내용을 검토 후 가져오기를 실행하세요.`}
              type="success"
              showIcon
              style={{ flex: 1, marginRight: 12, borderRadius: 8 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { setStep(STEP.UPLOAD); setRows([]); }}
              style={{ flexShrink: 0 }}
            >
              다시 업로드
            </Button>
          </div>

          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map((d) => {
              const cnt = rows.filter((r) => r.depth === d).length;
              if (!cnt) return null;
              const color = ['', 'blue', 'cyan', 'geekblue', 'purple', 'magenta'][d];
              return (
                <Tag key={d} color={color} style={{ borderRadius: 20, padding: '2px 10px' }}>
                  depth {d}: {cnt}개
                </Tag>
              );
            })}
            {rows.filter((r) => r.isMilestone).length > 0 && (
              <Tag color="gold" style={{ borderRadius: 20, padding: '2px 10px' }}>
                마일스톤: {rows.filter((r) => r.isMilestone).length}개
              </Tag>
            )}
          </div>

          <Table
            dataSource={rows.map((r, i) => ({ ...r, key: i }))}
            columns={previewColumns}
            size="small"
            pagination={{ pageSize: 12, size: 'small', showSizeChanger: false }}
            scroll={{ y: 320 }}
            style={{ marginBottom: 20 }}
            rowClassName={(r: WBSImportRow) => r.depth === 1 ? 'row-parent' : ''}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button size="large" onClick={() => { setStep(STEP.UPLOAD); setRows([]); }}>
              취소
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleImport}
              loading={importing}
              size="large"
              style={{ minWidth: 160 }}
            >
              {importing ? '가져오는 중...' : `${rows.length}개 공정 가져오기`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Done ──────────────────────── */}
      {step === STEP.DONE && (
        <Result
          icon={<CheckCircleOutlined style={{ color: '#00C875' }} />}
          title={
            <Title level={4} style={{ margin: 0 }}>
              {importedCount}개 공정이 성공적으로 등록되었습니다!
            </Title>
          }
          subTitle={
            <Text type="secondary" style={{ fontSize: 14 }}>
              WBS에서 공정을 확인하고 <strong>액션 키워드</strong>를 매핑해보세요.
            </Text>
          }
          extra={
            <Button type="primary" size="large" onClick={handleClose} style={{ minWidth: 160 }}>
              WBS 확인하기
            </Button>
          }
          style={{ padding: '20px 0' }}
        />
      )}
    </Modal>
  );
}
