import React from 'react';
import { DashboardNodeViewModel, NodeMetricViewModel, LoadMetricViewModel } from '@/types/view-model';
import { formatDuration, formatDecimal } from '@/lib/formatters';
import { CpuIcon, MemoryIcon, DiskIcon, NetworkIcon, LoadIcon, UptimeIcon } from '@/components/icons';

interface NodeCardProps {
  node: DashboardNodeViewModel;
  onClick: () => void;
}

// 状态指示器组件
const StatusIndicator: React.FC<{ online: boolean }> = ({ online }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.625rem',
    borderRadius: '999px',
    backgroundColor: online ? 'var(--km-status-normal-soft)' : 'var(--km-offline-soft)',
    border: `1px solid ${online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
  }}>
    <span style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: online ? 'var(--km-status-normal)' : 'var(--km-offline)',
      boxShadow: online ? '0 0 8px var(--km-online-glow)' : 'none',
      animation: online ? 'pulse 2s ease-in-out infinite' : 'none'
    }} />
    <span style={{
      fontSize: '0.6875rem',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      color: online ? 'var(--km-status-normal)' : 'var(--km-offline)'
    }}>
      {online ? '在线' : '离线'}
    </span>
  </div>
);

// 获取指标颜色
const getMetricColor = (severity?: string) => {
  switch (severity) {
    case 'danger': return 'var(--km-status-danger)';
    case 'warning': return 'var(--km-status-warning)';
    case 'notice': return 'var(--km-status-notice)';
    default: return 'var(--km-status-normal)';
  }
};

// 获取指标背景色
const getMetricBgColor = (severity?: string) => {
  switch (severity) {
    case 'danger': return 'var(--km-status-danger-soft)';
    case 'warning': return 'var(--km-status-warning-soft)';
    case 'notice': return 'var(--km-status-notice-soft)';
    default: return 'var(--km-status-normal-soft)';
  }
};

// 核心指标展示组件 (CPU / Memory / Disk)
const CoreMetricDisplay: React.FC<{
  renderIcon: (size: number, color: string) => React.ReactNode;
  label: string;
  metric: NodeMetricViewModel;
  unit?: string;
}> = ({ renderIcon, label, metric, unit = '%' }) => {
  const color = getMetricColor(metric.severity);
  const bgColor = getMetricBgColor(metric.severity);

  return (
    <div 
      className="km-card"
      data-severity={metric.severity}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.875rem',
        backgroundColor: bgColor,
        borderRadius: 'var(--km-radius-md)',
        border: `1px solid ${color}20`,
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {renderIcon(14, color)}
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--km-fg-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em'
          }}>{label}</span>
        </div>
        <span style={{
          fontSize: '1.125rem',
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums'
        }}>
          {metric.value ?? '--'}{unit}
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${Math.min(metric.value || 0, 100)}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '3px',
          transition: 'width 0.6s var(--km-ease)',
          boxShadow: (metric.value || 0) >= 70 ? `0 0 8px ${color}` : 'none'
        }} />
      </div>
    </div>
  );
};

// 负载展示组件 (配合收口：固定标题，优化数值展示)
const LoadDisplay: React.FC<{ metric: LoadMetricViewModel }> = ({ metric }) => {
  const color = getMetricColor(metric.severity);
  const ratio = metric.ratioPercent ?? (metric.value ? Math.min(metric.value * 10, 100) : 0);

  return (
    <div 
      className="km-card" 
      data-severity={metric.severity}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.875rem',
        backgroundColor: getMetricBgColor(metric.severity),
        borderRadius: 'var(--km-radius-md)',
        border: `1px solid ${color}20`,
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <LoadIcon size={14} color={color} />
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--km-fg-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em'
          }}>系统负载</span>
        </div>
        <span style={{
          fontSize: '1.125rem',
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums'
        }}>
          {metric.ratioPercent !== undefined ? `${Math.round(metric.ratioPercent)}%` : '--'}
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${Math.min(ratio, 100)}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '3px',
          transition: 'width 0.6s var(--km-ease)',
          boxShadow: ratio >= 70 ? `0 0 8px ${color}` : 'none'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', fontWeight: 600, color: 'var(--km-fg-muted)', marginTop: '-0.125rem' }}>
        <span>{metric.statusLabel || '正常'}</span>
        <span>{metric.value !== undefined ? formatDecimal(metric.value) : '--'}</span>
      </div>
    </div>
  );
};

// 网络上下行显示组件
const NetworkDisplay: React.FC<{ downMetric: NodeMetricViewModel; upMetric: NodeMetricViewModel }> = ({ downMetric, upMetric }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.625rem 0.875rem',
    backgroundColor: 'var(--km-surface-muted)',
    borderRadius: 'var(--km-radius-md)',
    border: '1px solid var(--km-border-light)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <NetworkIcon size={16} color="var(--km-brand)" />
      <span style={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        color: 'var(--km-fg-muted)',
        textTransform: 'uppercase'
      }}>网络</span>
    </div>
    <div style={{
      display: 'flex',
      gap: '1rem',
      fontSize: '0.75rem',
      fontWeight: 800,
      color: 'var(--km-fg)',
      fontVariantNumeric: 'tabular-nums'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ color: getMetricColor(downMetric.severity), opacity: 0.8, fontWeight: 900 }}>↓</span>
        <span style={{ color: getMetricColor(downMetric.severity) }}>{downMetric.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ color: getMetricColor(upMetric.severity), opacity: 0.8, fontWeight: 900 }}>↑</span>
        <span style={{ color: getMetricColor(upMetric.severity) }}>{upMetric.label}</span>
      </div>
    </div>
  </div>
);

export const NodeCard: React.FC<NodeCardProps> = ({ node, onClick }) => {
  // 计算整体负载状态 (用于左侧边框颜色)
  const avgLevel = node.metrics.cpu.severity || 'normal';
  const statusColor = getMetricColor(avgLevel);
  const isOffline = !node.online;

  return (
    <div
      onClick={onClick}
      className="km-card-elevated"
      style={{
        padding: '1.25rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: isOffline ? 'var(--km-surface-muted)' : 'var(--km-surface)',
        border: isOffline ? '1px dashed var(--km-offline)' : '1px solid var(--km-border)',
        borderLeft: `4px solid ${isOffline ? 'var(--km-offline)' : statusColor}`,
        opacity: isOffline ? 0.85 : 1,
      }}
    >
      {/* 顶部：标题和状态 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontWeight: 800,
            fontSize: '1.0625rem',
            color: isOffline ? 'var(--km-fg-muted)' : 'var(--km-fg)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem'
          }} title={node.title}>
            {node.title}
          </h3>
          <p style={{
            fontSize: '0.8125rem',
            color: isOffline ? 'var(--km-fg-muted)' : 'var(--km-fg-muted)',
            opacity: isOffline ? 0.7 : 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {node.subtitle}
          </p>
        </div>
        <StatusIndicator online={node.online} />
      </div>

      {/* 核心指标层：2×2 四宫格布局 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
        opacity: isOffline ? 0.6 : 1,
      }}>
        <CoreMetricDisplay
          renderIcon={(size, color) => <CpuIcon size={size} color={isOffline ? 'var(--km-fg-muted)' : color} />}
          label="CPU"
          metric={node.metrics.cpu}
        />
        <CoreMetricDisplay
          renderIcon={(size, color) => <MemoryIcon size={size} color={isOffline ? 'var(--km-fg-muted)' : color} />}
          label="内存"
          metric={node.metrics.memory}
        />
        <CoreMetricDisplay
          renderIcon={(size, color) => <DiskIcon size={size} color={isOffline ? 'var(--km-fg-muted)' : color} />}
          label="磁盘"
          metric={node.metrics.disk}
        />
        <LoadDisplay metric={node.metrics.load} />
      </div>

      {/* 网络上下行层 */}
      <div style={{ opacity: isOffline ? 0.6 : 1 }}>
        <NetworkDisplay
          downMetric={node.networkDown}
          upMetric={node.networkUp}
        />
      </div>

      {/* 底部信息层：标签 + Uptime */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '0.75rem',
        borderTop: `1px solid ${isOffline ? 'transparent' : 'var(--km-border-light)'}`,
        gap: '0.5rem',
        opacity: isOffline ? 0.7 : 1,
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--km-fg-secondary)',
            backgroundColor: 'var(--km-surface-muted)',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--km-radius-sm)'
          }}>
            {node.region}
          </span>
          {node.groupLabel && (
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'var(--km-brand)',
              backgroundColor: 'var(--km-brand-soft)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--km-radius-sm)'
            }}>
              {node.groupLabel}
            </span>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem'
        }}>
          <UptimeIcon size={14} color="var(--km-fg-muted)" />
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--km-fg-muted)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {formatDuration(node.metrics.uptime.value)}
          </span>
        </div>
      </div>
    </div>
  );
};
