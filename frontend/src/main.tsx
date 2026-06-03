import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { router } from './router';
import 'antd/dist/reset.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0073EA',
          colorSuccess: '#00C875',
          colorWarning: '#FF8B00',
          colorError: '#E44258',
          borderRadius: 8,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', Roboto, sans-serif",
          colorBgContainer: '#FFFFFF',
          colorBorderSecondary: '#EAECF0',
        },
        components: {
          Table: {
            headerBg: '#F8F9FB',
            borderColor: '#EAECF0',
            rowHoverBg: '#F0F6FF',
            cellPaddingBlock: 10,
            cellPaddingInline: 12,
          },
          Button: { borderRadius: 8, fontWeight: 600 },
          Card: { borderRadiusLG: 12 },
          Modal: { borderRadiusLG: 14 },
          Input: { borderRadius: 8 },
          Select: { borderRadius: 8 },
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>,
);
