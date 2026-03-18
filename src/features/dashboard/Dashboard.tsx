import React, { useState, useMemo, useEffect } from 'react';
import { useDashboardViewModel } from '@/hooks/use-dashboard-view-model';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NodeCard } from './components/NodeCard';
import { NodeTable } from './components/NodeTable';
import { FilterBar } from './components/FilterBar';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { StatusOverlay } from './components/StatusOverlay';
import { formatBandwidth } from '@/lib/formatters';
import { dashboardStoreActions } from '@/state/dashboard-store';

export const Dashboard: React.FC = () => {
  const { viewModel, actions } = useDashboardViewModel();
  const [searchQuery, setSearchQuery] = useState('');
  const [detailViewMode, setDetailViewMode] = useState<'latency' | 'load'>('latency');

  // 当选中节点变更时，默认重置为延迟视图
  useEffect(() => {
    if (!viewModel.selectedNodeId) {
      setDetailViewMode('latency');
    }
  }, [viewModel.selectedNodeId]);

  const filteredNodes = useMemo(() => {
    // 直接信任 viewModel.nodes，selectors 已处理分组和排序
    if (!searchQuery) {
      return viewModel.nodes;
    }
    const query = searchQuery.toLowerCase();
    return viewModel.nodes.filter(node =>
      node.title.toLowerCase().includes(query) ||
      node.subtitle.toLowerCase().includes(query) ||
      node.remark.toLowerCase().includes(query)
    );
  }, [viewModel.nodes, searchQuery]);

  const summary = useMemo(() => {
    const total = viewModel.nodes.length;
    const online = viewModel.nodes.filter(n => n.online).length;
    let totalDown = 0;
    let totalUp = 0;
    let abnormalCount = 0;

    viewModel.nodes.forEach(n => {
      totalDown += (n.networkDown.value || 0);
      totalUp += (n.networkUp.value || 0);
      const hasAbnormal = [
        n.metrics.cpu.severity,
        n.metrics.memory.severity,
        n.metrics.disk.severity,
        n.metrics.load.severity
      ].some(s => s === 'warning' || s === 'danger');
      if (hasAbnormal && n.online) {
        abnormalCount++;
      }
    });
    return {
      total,
      online,
      abnormalCount,
      totalDown: formatBandwidth(totalDown),
      totalUp: formatBandwidth(totalUp)
    };
  }, [viewModel.nodes]);

  const handleReorderGroups = (fromIndex: number, toIndex: number) => {
    const newGroups = [...viewModel.groups];
    const [movedGroup] = newGroups.splice(fromIndex, 1);
    if (movedGroup) {
      newGroups.splice(toIndex, 0, movedGroup);
      actions.setGroupOrder(newGroups.map(g => g.key));
    }
  };

  // 动态 Header 构建
  const renderHeader = () => {
    if (viewModel.selectedNodeId && viewModel.selectedNode) {
      const { node } = viewModel.selectedNode;
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
            <button className="km-back-btn" onClick={() => actions.selectNode(null)}>
              <span>←</span> 返回列表
            </button>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--km-header-fg)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.title}
              </h1>
            </div>
            
            <div className="km-tab-group" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', marginLeft: '0.5rem' }}>
              <button 
                className={`km-tab-item ${detailViewMode === 'latency' ? 'active' : ''}`}
                style={{ color: detailViewMode === 'latency' ? 'var(--km-brand)' : 'rgba(255,255,255,0.6)', padding: '0.375rem 1rem' }}
                onClick={() => setDetailViewMode('latency')}
              >
                延迟监控
              </button>
              <button 
                className={`km-tab-item ${detailViewMode === 'load' ? 'active' : ''}`}
                style={{ color: detailViewMode === 'load' ? 'var(--km-brand)' : 'rgba(255,255,255,0.6)', padding: '0.375rem 1rem' }}
                onClick={() => setDetailViewMode('load')}
              >
                负载参数
              </button>
            </div>
          </div>
          <div className="km-hidden-mobile" style={{ fontSize: '0.625rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
            {node.region.toUpperCase()} / 实时遥测中
          </div>
        </>
      );
    }

    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, var(--km-brand) 0%, #1d4ed8 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>K</div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--km-header-fg)' }}>{viewModel.site.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: viewModel.realtimeConnection === 'open' ? 'var(--km-online)' : 'var(--km-muted)', boxShadow: viewModel.realtimeConnection === 'open' ? '0 0 10px var(--km-online)' : 'none' }} />
                <span style={{ fontSize: '0.625rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.7)', letterSpacing: '0.05em' }}>
                  {viewModel.realtimeConnection === 'open' ? '实时连接中' : '离线/轮询'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="km-hidden-mobile" style={{ fontSize: '0.625rem', fontWeight: 900, padding: '0.5rem 1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', color: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: viewModel.realtimeConnection === 'open' ? 'var(--km-online)' : 'var(--km-muted)' }}>●</span>
            {viewModel.realtimeConnection === 'open' ? '实时连接中' : '轮询模式'}
          </div>
          <a href="/admin" className="km-admin-btn">
            后台设置
          </a>
        </div>
      </>
    );
  };

  if (viewModel.status === 'loading' && viewModel.nodes.length === 0) {
    return <DashboardLayout headerContent={renderHeader()} footerText={viewModel.theme.footerText}><StatusOverlay type="loading" /></DashboardLayout>;
  }

  if (viewModel.status === 'error' && viewModel.nodes.length === 0) {
    return <DashboardLayout headerContent={renderHeader()} footerText={viewModel.theme.footerText}><StatusOverlay type="error" message={viewModel.error || '加载失败'} onRetry={dashboardStoreActions.retry} /></DashboardLayout>;
  }

  return (
    <DashboardLayout headerContent={renderHeader()} footerText={viewModel.theme.footerText}>
      {/* 视图彻底隔离：选中节点后仅渲染详情页 */}
      {viewModel.selectedNodeId ? (
        <NodeDetailPanel
          selectedNode={viewModel.selectedNode}
          selectedPingTimeRange={viewModel.selectedPingTimeRange}
          onPingTimeRangeChange={actions.setPingTimeRange}
          viewMode={detailViewMode}
        />
      ) : (
        <>
          <section className="km-overview-panel" style={{ marginBottom: '2.5rem' }}>
            <div className="km-stat-grid-refined" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="km-stat-pill">
                <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--km-fg-muted)', marginBottom: '0.5rem' }}>受管节点</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--km-fg)', lineHeight: 1 }}>{summary.online}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--km-fg-muted)' }}>/ {summary.total}</span>
                </div>
              </div>
              <div className="km-stat-pill">
                <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--km-fg-muted)', marginBottom: '0.5rem' }}>异常状态节点</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 900, color: summary.abnormalCount > 0 ? 'var(--km-status-danger)' : 'var(--km-brand)', lineHeight: 1 }}>
                  {summary.abnormalCount}<span style={{ fontSize: '1rem', marginLeft: '4px', fontWeight: 700 }}>NODES</span>
                </div>
              </div>
              <div className="km-stat-pill">
                <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--km-fg-muted)', marginBottom: '0.5rem' }}>网络流量总览</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--km-fg)', lineHeight: 1 }}>
                      <span style={{ color: 'var(--km-brand)', marginRight: '4px', opacity: 0.8 }}>↓</span>{summary.totalDown}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--km-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>实时下载</div>
                  </div>
                  <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--km-border-light)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--km-fg)', lineHeight: 1 }}>
                      <span style={{ color: 'var(--km-fg-muted)', marginRight: '4px', opacity: 0.8 }}>↑</span>{summary.totalUp}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--km-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>实时上传</div>
                  </div>
                </div>
              </div>
              <div className="km-stat-pill" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: summary.abnormalCount > 0 ? 'var(--km-status-warning)' : 'var(--km-online)' }} /><span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--km-fg)' }}>{summary.abnormalCount > 0 ? '系统存在风险' : '系统运行正常'}</span></div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--km-fg-muted)', marginTop: '0.25rem' }}>{summary.abnormalCount > 0 ? '请检查处于异常状态的受管节点' : '全局基础设施运行健康'}</div>
              </div>
            </div>
          </section>

          <FilterBar 
            groups={viewModel.groups} 
            selectedGroup={viewModel.selectedGroup} 
            onSelectGroup={actions.setSelectedGroup} 
            viewMode={viewModel.viewMode} 
            onSelectViewMode={actions.setViewMode} 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery} 
            onReorderGroups={handleReorderGroups}
            sortKey={viewModel.sortKey}
            sortDirection={viewModel.sortDirection}
            onSortChange={actions.setSortPreference}
          />

          {filteredNodes.length === 0 ? (
            <div style={{ padding: '4rem 0' }}><StatusOverlay type="empty" /></div>
          ) : (
            <div style={{ marginTop: '0.5rem' }}>
              {viewModel.viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {filteredNodes.map(node => <NodeCard key={node.id} node={node} onClick={() => actions.selectNode(node.id)} />)}
                </div>
              ) : (
                <div style={{ borderRadius: 'var(--km-radius-lg)', overflow: 'hidden', boxShadow: 'var(--km-shadow-card)', border: '1px solid var(--km-border)' }}>
                  <NodeTable nodes={filteredNodes} onSelectNode={actions.selectNode} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};
