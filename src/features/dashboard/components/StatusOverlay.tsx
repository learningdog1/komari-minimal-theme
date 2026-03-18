import React from 'react';

interface StatusOverlayProps {
  type: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
}

/**
 * Loading 状态 SVG 图标
 * 旋转弧线 + 脉冲点动画
 */
const LoadingIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
    {/* 外圈底色 */}
    <circle cx="40" cy="40" r="32" stroke="#e2e8f0" strokeWidth="3" opacity="0.6" />
    {/* 进度弧线 */}
    <circle
      cx="40" cy="40" r="32"
      stroke="#2563eb"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="160"
      strokeDashoffset="120"
      className="km-loading-arc"
    />
    {/* 中心节点 */}
    <circle cx="40" cy="40" r="8" fill="#2563eb" className="km-loading-dot" />
    {/* 脉冲环 */}
    <circle
      cx="40" cy="40" r="16"
      stroke="#2563eb"
      strokeWidth="1.5"
      opacity="0.3"
      className="km-loading-pulse"
    />
  </svg>
);

/**
 * Error 状态 SVG 图标
 * 盾牌警告造型
 */
const ErrorIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
    {/* 盾牌背景 */}
    <path
      d="M40 8L12 20v20c0 16 12 28 28 32 16-4 28-16 28-32V20L40 8z"
      fill="#fef2f2"
      stroke="#fecaca"
      strokeWidth="1.5"
    />
    {/* 警告竖线 */}
    <path
      d="M40 24v18"
      stroke="#ef4444"
      strokeWidth="4"
      strokeLinecap="round"
      className="km-error-stroke"
    />
    {/* 警告圆点 */}
    <circle cx="40" cy="52" r="3" fill="#ef4444" />
    {/* 连接断裂线 */}
    <path d="M24 44h8M48 44h8" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </svg>
);

/**
 * Empty 状态 SVG 图标
 * 空盒子 + 搜索放大镜
 */
const EmptyIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
    {/* 空盒子 */}
    <rect x="16" y="28" width="48" height="36" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* 盒盖（半开） */}
    <path d="M16 32L40 16l24 16" stroke="#94a3b8" strokeWidth="1.5" fill="#f1f5f9" />
    <path d="M16 32h48" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* 盒内虚线框 */}
    <rect x="28" y="40" width="24" height="16" rx="2" fill="#f1f5f9" stroke="#e2e8f0" strokeDasharray="3 2" />
    {/* 搜索放大镜 */}
    <circle cx="58" cy="54" r="10" stroke="#2563eb" strokeWidth="2" fill="#eff6ff" />
    <path d="M65 61l6 6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const contentMap = {
  loading: {
    title: '加载数据中',
    description: '正在同步最新节点指标...',
    Icon: LoadingIcon,
    iconClass: 'km-status-icon--loading',
  },
  error: {
    title: '获取失败',
    description: '无法连接监控服务。',
    Icon: ErrorIcon,
    iconClass: 'km-status-icon--error',
  },
  empty: {
    title: '未找到节点',
    description: '当前分组无匹配节点。',
    Icon: EmptyIcon,
    iconClass: 'km-status-icon--empty',
  },
};

/**
 * 状态覆盖层组件
 * 统一处理 loading / error / empty 三种状态，亮色主题设计。
 * 保留灯木已完成的亮色状态层成果，增强动画效果。
 */
export const StatusOverlay: React.FC<StatusOverlayProps> = ({ type, message, onRetry }) => {
  const { title, description, Icon, iconClass } = contentMap[type];

  return (
    <div className="km-status-overlay">
      <div className={`km-status-icon ${iconClass}`}>
        <Icon />
      </div>
      <h3 className="km-status-title">{title}</h3>
      <p className="km-status-desc">{type === 'error' && message ? message : description}</p>

      {type === 'error' && onRetry && (
        <button className="km-status-retry km-btn-primary" onClick={onRetry}>
          重试连接
        </button>
      )}
    </div>
  );
};
