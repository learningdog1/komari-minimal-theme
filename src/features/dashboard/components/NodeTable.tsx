import React from 'react';
import { DashboardNodeViewModel } from '@/types/view-model';
import { formatDuration, formatDecimal } from '@/lib/formatters';
import { CpuIcon, MemoryIcon, DiskIcon, NetworkIcon, UptimeIcon } from '@/components/icons';

interface NodeTableProps {
  nodes: DashboardNodeViewModel[];
  onSelectNode: (id: string) => void;
}

// 四档状态类型
type MetricLevel = 'danger' | 'warning' | 'notice' | 'normal';

// 获取指标档位（四档：danger/warning/notice/normal）
const getMetricLevel = (val?: number): MetricLevel => {
  if (val === undefined) return 'normal';
  if (val >= 90) return 'danger';
  if (val >= 70) return 'warning';
  if (val >= 50) return 'notice';
  return 'normal';
};

// 获取指标颜色
const getMetricColor = (level: MetricLevel): string => {
  const colorMap: Record<MetricLevel, string> = {
    danger: 'var(--km-status-danger)',
    warning: 'var(--km-status-warning)',
    notice: 'var(--km-status-notice)',
    normal: 'var(--km-status-normal)',
  };
  return colorMap[level];
};

// 迷你指标条组件
const MiniMetricBar: React.FC<{
  value?: number;
  color: string;
}> = ({ value, color }) => (
  <div style={{
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--km-border-light)',
    borderRadius: '2px',
    overflow: 'hidden'
  }}>
    <div style={{
      width: `${value || 0}%`,
      height: '100%',
      backgroundColor: color,
      borderRadius: '2px',
      transition: 'width 0.6s var(--km-ease)'
    }} />
  </div>
);

// 指标单元格组件
const MetricCell: React.FC<{
  icon: React.ReactNode;
  value?: number;
  unit?: string;
}> = ({ icon, value, unit = '%' }) => {
  const level = getMetricLevel(value);
  const color = getMetricColor(level);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.25rem'
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            color,
            fontVariantNumeric: 'tabular-nums'
          }}>{value ?? '--'}{unit}</span>
        </div>
        <MiniMetricBar value={value} color={color} />
      </div>
    </div>
  );
};

// 网络上下行显示组件（与 NodeCard 语义一致）
const NetworkCell: React.FC<{ downMetric: any; upMetric: any }> = ({ downMetric, upMetric }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem'
    }}>
      <NetworkIcon size={14} color="var(--km-brand)" />
      <span style={{ fontSize: '0.6875rem', color: getMetricColor(getMetricLevel(downMetric.value)), fontWeight: 900 }}>↓</span>
      <span style={{
        fontSize: '0.8125rem',
        fontWeight: 800,
        color: 'var(--km-fg)',
        fontVariantNumeric: 'tabular-nums'
      }}>{downMetric.label || '--'}</span>
    </div>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem'
    }}>
      <div style={{ width: '14px' }} />
      <span style={{ fontSize: '0.6875rem', color: getMetricColor(getMetricLevel(upMetric.value)), fontWeight: 900 }}>↑</span>
      <span style={{
        fontSize: '0.8125rem',
        fontWeight: 800,
        color: 'var(--km-fg)',
        fontVariantNumeric: 'tabular-nums'
      }}>{upMetric.label || '--'}</span>
    </div>
  </div>
);

export const NodeTable: React.FC<NodeTableProps> = ({ nodes, onSelectNode }) => {
  return (
    <div className="km-table-container">
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        minWidth: '900px'
      }}>
        <thead>
          <tr style={{
            borderBottom: '2px solid var(--km-border)',
            backgroundColor: 'var(--km-surface-muted)'
          }}>
            <th style={{
              padding: '1rem 1.25rem',
              fontSize: '0.6875rem',
              color: 'var(--km-fg-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>标识</th>
            <th style={{
              padding: '1rem',
              fontSize: '0.6875rem',
              color: 'var(--km-fg-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>标签 / 区域</th>
            <th style={{
              padding: '1rem',
              fontSize: '0.6875rem',
              color: 'var(--km-fg-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              width: '240px'
            }}>资源占用</th>
            <th style={{
              padding: '1rem',
              fontSize: '0.6875rem',
              color: 'var(--km-fg-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              width: '140px'
            }}>网络上下行</th>
            <th style={{
              padding: '1rem',
              fontSize: '0.6875rem',
              color: 'var(--km-fg-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>负载</th>
            <th style={{
              padding: '1rem',
              fontSize: '0.6875rem',
              color: 'var(--km-fg-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>运行时间</th>
            <th style={{
              padding: '1rem 1.25rem',
              fontSize: '0.6875rem',
              color: 'var(--km-fg-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textAlign: 'center'
            }}>状态</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node, index) => (
            <tr
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={`km-table-row km-table-row-status ${node.online ? 'online' : ''}`}
              style={{
                borderBottom: '1px solid var(--km-border-light)',
                opacity: node.online ? 1 : 0.7,
                backgroundColor: index % 2 === 1 ? 'rgba(241, 245, 249, 0.5)' : 'transparent'
              }}
            >
              <td style={{ padding: '1rem 1.25rem' }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '0.9375rem',
                  color: 'var(--km-fg)',
                  marginBottom: '0.25rem'
                }}>{node.title}</div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--km-fg-secondary)',
                  fontWeight: 500
                }}>{node.subtitle}</div>
              </td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  <span className="km-badge" style={{
                    backgroundColor: 'var(--km-surface-muted)',
                    color: 'var(--km-fg-secondary)'
                  }}>{node.region}</span>
                  {node.tags.slice(0, 1).map(t => (
                    <span key={t} className="km-badge" style={{
                      border: '1px solid var(--km-border)',
                      color: 'var(--km-fg-muted)'
                    }}>{t}</span>
                  ))}
                </div>
              </td>
              <td style={{ padding: '0.75rem 1rem' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <MetricCell
                    icon={<CpuIcon size={14} color={getMetricColor(getMetricLevel(node.metrics.cpu.value))} />}
                    value={node.metrics.cpu.value}
                    unit="%"
                  />
                  <MetricCell
                    icon={<MemoryIcon size={14} color={getMetricColor(getMetricLevel(node.metrics.memory.value))} />}
                    value={node.metrics.memory.value}
                    unit="%"
                  />
                  <MetricCell
                    icon={<DiskIcon size={14} color={getMetricColor(getMetricLevel(node.metrics.disk.value))} />}
                    value={node.metrics.disk.value}
                    unit="%"
                  />
                </div>
              </td>
              <td style={{ padding: '1rem' }}>
                <NetworkCell
                  downMetric={node.networkDown}
                  upMetric={node.networkUp}
                />
              </td>
              <td style={{ padding: '1rem' }}>
                {/* 负载中性展示位，等数据层方案统一后接入分档 */}
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: 'var(--km-fg)',
                  fontVariantNumeric: 'tabular-nums'
                }}>{formatDecimal(node.metrics.load.value)}</span>
              </td>
              <td style={{ padding: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}>
                  <UptimeIcon size={14} color="var(--km-fg-muted)" />
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--km-fg-secondary)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {formatDuration(node.metrics.uptime.value)}
                  </span>
                </div>
              </td>
              <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                <span className={`km-badge ${node.online ? 'km-badge-online' : 'km-badge-offline'}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <span style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: node.online ? 'var(--km-status-normal)' : 'var(--km-offline)',
                    boxShadow: node.online ? '0 0 6px var(--km-online-glow)' : 'none'
                  }} />
                  {node.online ? '在线' : '离线'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};