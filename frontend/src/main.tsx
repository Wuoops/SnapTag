import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import './index.css';

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const darkTokens = {
  colorPrimary: '#7c83cf',
  borderRadius: 8,
  fontFamily: FONT,
  colorBgContainer: '#2a2b2f',
  colorBgElevated: '#303136',
  colorBorder: 'rgba(255,255,255,0.10)',
  colorText: '#e8e9ec',
  colorTextSecondary: '#a1a2a8',
};

const lightTokens = {
  colorPrimary: '#b35c37',
  borderRadius: 8,
  fontFamily: FONT,
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBorder: 'rgba(0,0,0,0.10)',
  colorText: '#2d2b27',
  colorTextSecondary: '#6b6963',
};

const ThemedApp: React.FC = () => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens,
      }}
    >
      <App />
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
