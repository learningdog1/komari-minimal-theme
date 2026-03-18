import React, { useState } from 'react';
import { DashboardSelectedNodeViewModel, DashboardPingSeriesViewModel, DashboardPingPointViewModel, PingTimeRange, NodeMetricViewModel } from '@/types/view-model';
import { CpuIcon, MemoryIcon, DiskIcon, LoadIcon, NetworkIcon, TcpIcon, UdpIcon, ProcessIcon } from '@/components/icons';

interface NodeDetailPanelProps {
  selectedNode: DashboardSelectedNodeViewModel | null;
  selectedPingTimeRange: PingTimeRange;
  onPingTimeRangeChange: (range: PingTimeRange) => void;
  onClose?: () => void;
  viewMode: 'latency' | 'load';
}

// 指标卡片组件
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: number;
  unit?: string;
}> = ({ icon, label, value, unit = '' }) => {
  const getLevelColor = (val?: number) => {
    if (val === undefined) return 'var(--km-fg-muted)';
    if (val >= 90) return 'var(--km-status-danger)';
    if (val >= 70) return 'var(--km-status-warning)';
    if (val >= 50) return 'var(--km-status-notice)';
    return 'var(--km-status-normal)';
  };
  const color = getLevelColor(value);

  return (
    <div className="km-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {icon}
        <span style={{ fontSize: '0.625rem', color: 'var(--km-fg-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value ?? '--'}{value !== undefined && unit && <span style={{ fontSize: '0.875rem', fontWeight: 700, marginLeft: '2px' }}>{unit}</span>}
      </div>
      {value !== undefined && (
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--km-bg-darker)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', backgroundColor: color, transition: 'width 0.8s var(--km-ease)' }} />
        </div>
      )}
    </div>
  );
};

// 迷你趋势图组件 (强化实时重绘与波动感知)
const MiniTrendChart: React.FC<{ 
  data: number[]; 
  color?: string;
  height?: number;
}> = ({ data, color = 'var(--km-brand)', height = 32 }) => {
  // 利用 useMemo 确保路径仅在数据物理变化时重算，同时增加极小波动的放大率
  const pathD = React.useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const chartHeight = height;
    const chartWidth = 100;
    const validData = data.filter(v => v !== undefined && v !== null);
    if (validData.length < 2) return '';
    
    const maxVal = Math.max(...validData);
    const minVal = Math.min(...validData);
    // 动态比例尺：如果波动过小，人为增加 5% 的展示区间，提升“动感”
    const range = (maxVal - minVal) || (maxVal * 0.05) || 1;
    const padding = range * 0.02; 
    
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = chartHeight - (((v - minVal + padding) / (range + padding * 2)) * chartHeight);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${Math.max(0, Math.min(chartHeight, y)).toFixed(2)}`;
    });
    
    return pts.join(' ');
  }, [data, height]);

  if (!pathD) return null;
  
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <path 
        d={pathD} 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        style={{ shapeRendering: 'geometricPrecision' }}
      />
    </svg>
  );
};

// 带迷你趋势图的指标卡片
const MetricCardWithTrend: React.FC<{
  icon: React.ReactNode;
  label: string;
  metric: NodeMetricViewModel;
  trendData?: number[];
  unit?: string;
  color?: string;
  large?: boolean;
  usePercentProgress?: boolean;
  useLabel?: boolean;
}> = ({ icon, label, metric, trendData, unit = '', color = 'var(--km-brand)', large = false, usePercentProgress = true, useLabel = false }) => {
  const getLevelColor = (val?: number) => {
    if (val === undefined) return 'var(--km-fg-muted)';
    if (val >= 90) return 'var(--km-status-danger)';
    if (val >= 70) return 'var(--km-status-warning)';
    if (val >= 50) return 'var(--km-status-notice)';
    return 'var(--km-status-normal)';
  };
  const getLevelBgColor = (severity?: string) => {
    switch (severity) {
      case 'danger': return 'var(--km-status-danger-soft)';
      case 'warning': return 'var(--km-status-warning-soft)';
      case 'notice': return 'var(--km-status-notice-soft)';
      default: return 'var(--km-status-normal-soft)';
    }
  };
  const levelColor = getLevelColor(metric.value);
  const severityColor = metric.severity ? `var(--km-status-${metric.severity})` : color;
  const bgColor = metric.severity ? getLevelBgColor(metric.severity) : undefined;
  const chartColor = metric.severity ? `var(--km-status-${metric.severity})` : color;
  const cardLarge = large;
  
  return (
    <div className="km-card" data-severity={metric.severity} style={{ 
      padding: cardLarge ? '1.5rem' : '1rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: cardLarge ? '0.75rem' : '0.5rem',
      backgroundColor: bgColor || 'var(--km-surface)',
      border: bgColor ? `1px solid ${severityColor}30` : undefined
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon}
          <span style={{ fontSize: '0.75rem', color: 'var(--km-fg-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: cardLarge ? '1.25rem' : '0.75rem' }}>
        <div style={{ fontSize: cardLarge ? '1.75rem' : '1.25rem', fontWeight: 900, color: severityColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {useLabel ? (metric.label ?? '--') : (metric.value ?? '--')}{!useLabel && metric.value !== undefined && unit && <span style={{ fontSize: cardLarge ? '1rem' : '0.75rem', fontWeight: 700, marginLeft: '2px' }}>{unit}</span>}
        </div>
        {trendData && trendData.length > 1 && (
          <div style={{ flex: 1, minWidth: cardLarge ? '100px' : '60px', maxWidth: cardLarge ? '140px' : '80px' }}>
            <MiniTrendChart data={trendData} color={chartColor} height={cardLarge ? 48 : 28} />
          </div>
        )}
      </div>
      {metric.value !== undefined && usePercentProgress && (
        <div style={{ width: '100%', height: cardLarge ? '5px' : '3px', backgroundColor: 'var(--km-bg-darker)', borderRadius: '2.5px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(metric.value, 100)}%`, height: '100%', backgroundColor: levelColor, transition: 'width 0.8s var(--km-ease)' }} />
        </div>
      )}
    </div>
  );
};

// 延迟图表组件
const LatencyChart: React.FC<{ ping: DashboardPingSeriesViewModel; timeRange: PingTimeRange }> = ({ ping, timeRange }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);
  const lastUpdateRef = React.useRef<number>(0);

  if (!ping.points || ping.points.length === 0) return (
    <div style={{ height: '160px', background: 'var(--km-surface)', borderRadius: 'var(--km-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--km-fg-muted)', fontSize: '0.75rem', border: '1px dashed var(--km-border)' }}>
      暂无数据
    </div>
  );

  const points = ping.points;
  const chartWidth = 100;
  const chartHeight = 80;

  const getX = (timestamp: string) => {
    try {
      const time = new Date(timestamp).getTime();
      const now = Date.now();
      const ranges = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
      const rangeMs = ranges[timeRange] || ranges['1h'];
      const start = now - rangeMs;
      return Math.max(0, Math.min(100, ((time - start) / rangeMs) * 100));
    } catch { return 0; }
  };

  const { pathD, polyPoints } = React.useMemo(() => {
    if (!points || points.length < 2) return { pathD: '', polyPoints: '' };
    
    // 动态垂直比例尺优化
    const rawMax = Math.max(...points.map(d => d.maxMs || 0), 10);
    const rawMin = Math.min(...points.map(d => d.minMs || 0), 0);
    const range = (rawMax - rawMin) || (rawMax * 0.1);
    const vPadding = range * 0.05;
    const finalMax = rawMax + vPadding;
    const finalMin = Math.max(0, rawMin - vPadding);
    const finalRange = finalMax - finalMin;

    const coords = points.map(p => {
      const x = getX(p.bucketStartAt);
      const y = p.avgMs !== undefined ? chartHeight - (((p.avgMs - finalMin) / finalRange) * chartHeight) : chartHeight;
      return { x: x.toFixed(2), y: Math.max(0, Math.min(chartHeight, y)).toFixed(2) };
    });

    return {
      pathD: `M0,${chartHeight} ${coords.map(c => `L${c.x},${c.y}`).join(' ')} L${chartWidth},${chartHeight} Z`,
      polyPoints: coords.map(c => `${c.x},${c.y}`).join(' ')
    };
  }, [points, timeRange]);

  const getPointCoords = (index: number) => {
    const point = points[index];
    if (!point) return { x: 0, y: chartHeight };
    const x = getX(point.bucketStartAt);
    
    const rawMax = Math.max(...points.map(d => d.maxMs || 0), 10);
    const rawMin = Math.min(...points.map(d => d.minMs || 0), 0);
    const range = (rawMax - rawMin) || (rawMax * 0.1);
    const vPadding = range * 0.05;
    const finalMax = rawMax + vPadding;
    const finalMin = Math.max(0, rawMin - vPadding);
    const finalRange = finalMax - finalMin;
    
    const y = point.avgMs !== undefined ? chartHeight - (((point.avgMs - finalMin) / finalRange) * chartHeight) : chartHeight;
    return { x, y: Math.max(0, Math.min(chartHeight, y)) };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = performance.now();
    if (now - lastUpdateRef.current < 16) return;
    lastUpdateRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const padding = 24; 
    const relX = ((e.clientX - rect.left - padding) / (rect.width - padding * 2)) * 100;
    const clampedX = Math.max(0, Math.min(100, relX));

    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const pt = getPointCoords(i);
      const dist = Math.abs(pt.x - clampedX);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    const pt = getPointCoords(nearestIdx);
    setHoveredPoint({ index: nearestIdx, x: pt.x, y: pt.y });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const formatTimeRange = (start: string, end: string) => {
    try {
      const s = new Date(start).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const e = new Date(end).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return `${s} - ${e}`;
    } catch { return '--'; }
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return '--'; }
  };

  const targetPoint = hoveredPoint ? points[hoveredPoint.index] : null;

  const getTooltipInfo = (point: DashboardPingPointViewModel | null) => {
    if (!point) return null;
    if (point.isAggregated) {
      return {
        isAggregated: true,
        range: formatTimeRange(point.bucketStartAt, point.bucketEndAt),
        avg: `${point.avgMs?.toFixed(1)} ms`,
        min: `${point.minMs?.toFixed(1)} ms`,
        max: `${point.maxMs?.toFixed(1)} ms`,
        samples: point.sampleCount
      };
    }
    return {
      isAggregated: false,
      time: formatTime(point.recordedAt),
      value: `${point.valueMs?.toFixed(1)} ms`
    };
  };

  const info = getTooltipInfo(targetPoint ?? null);

  const getTooltipStyle = () => {
    const baseX = hoveredPoint ? hoveredPoint.x : 50;
    const baseY = hoveredPoint ? (getPointCoords(hoveredPoint.index).y / (chartHeight + 20)) * 100 - 15 : 50;
    const constrainedX = Math.max(10, Math.min(90, baseX));
    return {
      left: `${constrainedX}%`,
      top: `${baseY}%`,
      transform: 'translate(-50%, -100%)',
      minWidth: info?.isAggregated ? '160px' : '100px'
    };
  };

  return (
    <div style={{ position: 'relative' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg width="100%" height="160px" viewBox={`0 0 100 ${chartHeight + 20}`} preserveAspectRatio="none" className="km-chart-canvas">
        <defs>
          <linearGradient id={`grad-${ping.taskId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--km-brand)" stopOpacity={timeRange === '7d' || timeRange === '24h' ? 0.06 : 0.12} />
            <stop offset="100%" stopColor="var(--km-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length > 1 && (
          <path d={pathD} fill={`url(#grad-${ping.taskId})`} style={{ shapeRendering: 'geometricPrecision' }} />
        )}
        {points.length > 1 && (
          <polyline 
            fill="none" 
            stroke="var(--km-brand)" 
            strokeWidth="1.25" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            vectorEffect="non-scaling-stroke"
            points={polyPoints} 
            style={{ shapeRendering: 'geometricPrecision' }}
          />
        )}
      </svg>
      {hoveredPoint && (
        <div 
          style={{
            position: 'absolute',
            left: `${hoveredPoint.x}%`,
            top: `${(getPointCoords(hoveredPoint.index).y / (chartHeight + 20)) * 100}%`,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: 'var(--km-brand)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }} 
        />
      )}
      {hoveredPoint && info && (
        <div className="km-tooltip-custom" style={{ ...getTooltipStyle(), pointerEvents: 'none' }}>
          {info.isAggregated ? (
            <>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px', fontSize: '0.625rem', opacity: 0.8 }}>{info.range}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div style={{ color: 'var(--km-status-normal)' }}>平均: {info.avg}</div>
                <div style={{ textAlign: 'right', opacity: 0.7 }}>样本: {info.samples}</div>
                <div style={{ opacity: 0.7 }}>最小: {info.min}</div>
                <div style={{ textAlign: 'right', opacity: 0.7 }}>最大: {info.max}</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '2px' }}>{info.time}</div>
              <div style={{ color: 'var(--km-status-normal)', fontWeight: 800 }}>{info.value}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// 时段选择器
const TimeRangeSelector: React.FC<{ value: PingTimeRange; onChange: (range: PingTimeRange) => void }> = ({ value, onChange }) => (
  <div className="km-tab-group">
    {['1h', '6h', '24h', '7d'].map(range => (
      <button key={range} onClick={() => onChange(range as PingTimeRange)} className={`km-tab-item ${value === range ? 'active' : ''}`}>
        {range.toUpperCase()}
      </button>
    ))}
  </div>
);

export const NodeDetailPanel: React.FC<Omit<NodeDetailPanelProps, 'onClose'>> = ({
  selectedNode,
  selectedPingTimeRange,
  onPingTimeRangeChange,
  viewMode
}) => {
  if (!selectedNode) return null;
  const { node, ping, recent } = selectedNode;

  // 从 recent 数据提取趋势 (最近30点)
  const recent30 = recent?.slice(-30) || [];
  const cpuTrend = recent30.map(r => r.cpuUsage as number | undefined).filter((v): v is number => v !== undefined);
  const memoryTrend = recent30.map(r => r.memoryUsagePercent as number | undefined).filter((v): v is number => v !== undefined);
  const diskTrend = recent30.map(r => r.diskUsagePercent as number | undefined).filter((v): v is number => v !== undefined);
  const loadTrend = recent30.map(r => (r.load1 ?? r.load) as number | undefined).filter((v): v is number => v !== undefined);
  const networkUpTrend = recent30.map(r => r.networkUp as number | undefined).filter((v): v is number => v !== undefined);
  const networkDownTrend = recent30.map(r => r.networkDown as number | undefined).filter((v): v is number => v !== undefined);

  return (
    <div style={{ animation: 'km-page-in 0.4s var(--km-ease)' }}>
      {viewMode === 'latency' ? (
        <div className="km-overview-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span style={{ width: '4px', height: '18px', backgroundColor: 'var(--km-brand)', borderRadius: '2px' }} />
              延迟监控数据
            </h3>
            <TimeRangeSelector value={selectedPingTimeRange} onChange={onPingTimeRangeChange} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {ping?.map(p => (
              <div key={p.taskId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--km-fg)' }}>{p.taskName}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 'var(--km-radius-sm)', backgroundColor: p.lossPercent && p.lossPercent > 0 ? 'var(--km-status-danger-soft)' : 'var(--km-status-normal-soft)', color: p.lossPercent && p.lossPercent > 0 ? 'var(--km-status-danger)' : 'var(--km-status-normal)' }}>
                    丢包率: {p.lossPercent ?? 0}%
                  </span>
                </div>
                <LatencyChart ping={p} timeRange={selectedPingTimeRange} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 主卡区 - 稳定 3x2 网格 */}
          <div className="km-grid-primary-stats">
            <MetricCardWithTrend icon={<CpuIcon size={18} color="var(--km-brand)" />} label="CPU 使用率" metric={node.metrics.cpu} trendData={cpuTrend} unit="%" color="var(--km-brand)" large usePercentProgress />
            <MetricCardWithTrend icon={<MemoryIcon size={18} color="var(--km-status-notice)" />} label="内存占用" metric={node.metrics.memory} trendData={memoryTrend} unit="%" color="var(--km-status-notice)" large usePercentProgress />
            <MetricCardWithTrend icon={<DiskIcon size={18} color="var(--km-status-warning)" />} label="磁盘占用" metric={node.metrics.disk} trendData={diskTrend} unit="%" color="var(--km-status-warning)" large usePercentProgress />
            <MetricCardWithTrend icon={<LoadIcon size={18} color="var(--km-status-normal)" />} label="系统负载" metric={node.metrics.load} trendData={loadTrend} unit="" color="var(--km-status-normal)" large usePercentProgress />
            <MetricCardWithTrend icon={<NetworkIcon size={18} color="var(--km-brand)" />} label="网络上行 ↑" metric={node.networkUp} trendData={networkUpTrend} unit="" color="var(--km-brand)" large usePercentProgress={false} useLabel />
            <MetricCardWithTrend icon={<NetworkIcon size={18} color="var(--km-status-notice)" />} label="网络下行 ↓" metric={node.networkDown} trendData={networkDownTrend} unit="" color="var(--km-status-notice)" large usePercentProgress={false} useLabel />
          </div>
          
          {/* 次级卡区 - 紧凑网格 */}
          <div className="km-grid-secondary-stats">
            <MetricCard icon={<TcpIcon size={16} color="var(--km-brand)" />} label="TCP 连接" value={node.tcpConnections.value} />
            <MetricCard icon={<UdpIcon size={16} color="var(--km-status-notice)" />} label="UDP 连接" value={node.udpConnections.value} />
            <MetricCard icon={<ProcessIcon size={16} color="var(--km-status-warning)" />} label="进程数" value={node.processCount.value} />
          </div>
          
          {/* 底部元数据栏 - 替换 UUID 为最后同步 */}
          <div className="km-metadata-bar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--km-fg-muted)', textTransform: 'uppercase' }}>最后同步</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--km-fg)' }}>
                {node.updatedAt ? new Date(node.updatedAt).toLocaleString('zh-CN', { hour12: false }).toUpperCase() : '--'}
              </div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--km-border)', alignSelf: 'center' }} className="km-hidden-mobile" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--km-fg-muted)', textTransform: 'uppercase' }}>地域 / 供应商</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--km-fg)' }}>{node.region}</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--km-border)', alignSelf: 'center' }} className="km-hidden-mobile" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--km-fg-muted)', textTransform: 'uppercase' }}>所属分组</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--km-brand)' }}>{node.groupLabel}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
