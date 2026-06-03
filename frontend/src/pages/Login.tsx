import { Form, Input, Button, Typography, message } from 'antd';
import {
  CheckCircleFilled,
  RocketOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore, User } from '../store/auth.store';

const { Title, Text } = Typography;

const FEATURES = [
  'WBS 계층 구조 + 액션 아이템 기반 관리',
  '실시간 진척도 자동 계산 및 롤업',
  '담당자 지정 & 이메일/Slack 알림',
  'WBS 버전 관리 및 변경 이력 추적',
];

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form] = Form.useForm<{ email: string; password: string }>();

  async function onFinish(values: { email: string; password: string }) {
    try {
      const { data } = await api.post<{ user: User; access: string; refresh: string }>(
        '/auth/login',
        values,
      );
      setAuth(data.user, data.access, data.refresh);
      navigate('/projects');
    } catch {
      message.error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Left: Brand panel ─────────────────────── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(145deg, #0A1628 0%, #0D2D58 45%, #0057B3 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(0,115,234,0.12)', top: -100, right: -100,
        }} />
        <div style={{
          position: 'absolute', width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(0,200,117,0.08)', bottom: -60, left: -60,
        }} />

        <div style={{ maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #0073EA 0%, #00C875 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,115,234,0.4)',
            }}>
              <RocketOutlined style={{ color: '#fff', fontSize: 24 }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, lineHeight: 1 }}>
                AI-Mate PMS
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 3 }}>
                스마트 프로젝트 관리 시스템
              </div>
            </div>
          </div>

          {/* Headline */}
          <Title level={2} style={{
            color: '#fff', marginBottom: 12,
            fontSize: 30, fontWeight: 800, lineHeight: 1.3,
          }}>
            프로젝트를<br />
            <span style={{ color: '#00C875' }}>액션 중심</span>으로 관리하세요
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6 }}>
            WBS의 각 공정을 실제 업무 행위(Action Item) 단위로 나누어<br />
            담당자별 진척도를 자동으로 추적합니다.
          </Text>

          {/* Features */}
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map((feat) => (
              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircleFilled style={{ color: '#00C875', fontSize: 16, flexShrink: 0 }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{feat}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Login form ─────────────────────── */}
      <div style={{
        width: 480,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 52px',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>
            로그인
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 32, fontSize: 14 }}>
            계정에 로그인하여 시작하세요.
          </Text>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>이메일</span>}
              rules={[
                { required: true, message: '이메일을 입력해주세요.' },
                { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
              ]}
            >
              <Input
                placeholder="example@company.com"
                style={{ height: 44 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 500, fontSize: 13 }}>비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}
            >
              <Input.Password placeholder="비밀번호를 입력하세요" style={{ height: 44 }} />
            </Form.Item>

            <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                style={{ height: 46, fontSize: 15 }}
              >
                로그인
              </Button>
            </Form.Item>
          </Form>

          <div style={{
            marginTop: 32, padding: 16, borderRadius: 10,
            background: '#F6F7FB', border: '1px solid #EAECF0',
          }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              테스트 계정
            </Text>
            <Text style={{ fontSize: 13 }}>admin@aimate.com / admin1234</Text>
          </div>
        </div>
      </div>
    </div>
  );
}
