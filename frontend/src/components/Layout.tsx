import { useState } from 'react';
import { Avatar, Badge, Button, Dropdown, Layout as AntLayout } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FolderOpenOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SettingOutlined,
  AppstoreOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth.store';

const { Content } = AntLayout;

const NAV_ITEMS = [
  { key: '/projects', icon: <FolderOpenOutlined />, label: '프로젝트' },
  { key: '/mypage',   icon: <AppstoreOutlined />,   label: '마이페이지' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  member: '멤버',
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.name} (${ROLE_LABEL[user?.role ?? ''] ?? user?.role})`,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      danger: true,
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>

      {/* ── Sidebar ────────────────────────────────── */}
      <div style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar-bg)',
        position: 'fixed', left: 0, top: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        zIndex: 200,
        boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
      }}>

        {/* Brand */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #0073EA 0%, #00C875 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RocketOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                AI-Mate
              </div>
              <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11 }}>
                Project Management
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.28)', padding: '6px 12px 8px', textTransform: 'uppercase',
          }}>
            메뉴
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.key);
            const isHovered = hoveredKey === item.key;
            return (
              <div
                key={item.key}
                className={`nav-item${isActive ? ' active' : ''}`}
                style={{
                  background: isActive
                    ? 'rgba(0,115,234,0.22)'
                    : isHovered
                    ? 'rgba(255,255,255,0.06)'
                    : 'transparent',
                  borderLeftColor: isActive ? 'var(--primary)' : 'transparent',
                }}
                onClick={() => navigate(item.key)}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Dropdown menu={{ items: userMenu }} placement="topRight" trigger={['click']}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar
                size={34}
                style={{ background: 'linear-gradient(135deg,#0073EA,#00C875)', flexShrink: 0, fontWeight: 700 }}
              >
                {user?.name?.charAt(0) ?? 'U'}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: '#fff', fontSize: 13, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11 }}>
                  {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
                </div>
              </div>
            </div>
          </Dropdown>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────── */}
      <AntLayout style={{ marginLeft: 'var(--sidebar-width)' }}>

        {/* Top bar */}
        <div style={{
          height: 'var(--header-height)',
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 24px', gap: 4,
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <Badge count={0} showZero={false}>
            <Button
              type="text"
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              size="large"
              style={{ color: 'var(--text-secondary)' }}
            />
          </Badge>
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: 18 }} />}
            size="large"
            style={{ color: 'var(--text-secondary)' }}
          />
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Avatar
              style={{
                background: 'linear-gradient(135deg,#0073EA,#00C875)',
                cursor: 'pointer', fontWeight: 700,
              }}
            >
              {user?.name?.charAt(0) ?? 'U'}
            </Avatar>
          </Dropdown>
        </div>

        {/* Page content */}
        <Content style={{
          padding: 28,
          background: 'var(--bg-page)',
          minHeight: 'calc(100vh - var(--header-height))',
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
