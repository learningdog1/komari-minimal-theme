import React from 'react';
import '../../styles/theme.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  footerText?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, headerContent, footerText }) => {
  return (
    <div className="km-app-container km-theme-scope" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* 品牌元素真实落地 (DOM 渲染) */}
      <div className="km-brand-pattern" aria-hidden="true" />

      {/* 顶部导航：深色/品牌色 建立强层级锚点 */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        backgroundColor: 'var(--km-header-bg)',
        color: 'var(--km-header-fg)',
        boxShadow: 'var(--km-shadow-header)',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <div style={{ 
          maxWidth: '1440px', 
          margin: '0 auto', 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {headerContent}
        </div>
      </header>

      {/* 主体内容：浅色底 突出白色卡片 */}
      <main style={{ 
        flex: 1, 
        padding: '2.5rem 1.5rem', 
        maxWidth: '1440px', 
        margin: '0 auto', 
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}>
        {children}
      </main>

      {/* 页脚：保留原有约定语义，避免重复 */}
      <footer style={{ 
        padding: '3.5rem 1.5rem', 
        textAlign: 'center', 
        color: 'var(--km-fg-muted)',
        fontSize: '0.8125rem',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderTop: '1px solid var(--km-border)',
        marginTop: '3rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ opacity: 0.9, fontWeight: 600, letterSpacing: '0.025em' }}>
          {footerText}
          {footerText && !footerText.includes('Powered by') && (
            <span style={{ marginLeft: '0.75rem' }}>Powered by Komari Monitor.</span>
          )}
          {!footerText && <span>Powered by Komari Monitor.</span>}
        </div>
      </footer>
    </div>
  );
};
