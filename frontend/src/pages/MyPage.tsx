import { Typography, Card, Row, Col, Empty } from 'antd';
import { useAuthStore } from '../store/auth.store';

const { Title, Text } = Typography;

export default function MyPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <Title level={4} style={{ marginBottom: 24 }}>
        마이페이지 — {user?.name}님
      </Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: '진행중 액션', value: '-', color: '#1677ff' },
          { label: '마감 임박 (D-3)', value: '-', color: '#fa8c16' },
          { label: '보류/지연', value: '-', color: '#f5222d' },
        ].map((item) => (
          <Col span={8} key={item.label}>
            <Card>
              <Text type="secondary">{item.label}</Text>
              <div style={{ fontSize: 32, fontWeight: 700, color: item.color, marginTop: 8 }}>
                {item.value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      <Card title="내 액션 아이템">
        <Empty description="Phase 3에서 구현됩니다." />
      </Card>
    </>
  );
}
