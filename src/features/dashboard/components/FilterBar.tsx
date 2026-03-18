import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DashboardViewMode, DashboardGroupOptionViewModel } from '@/types/view-model';

// 临时本地类型承接，静待并行任务补全
type LocalSortKey = 'name' | 'cpu' | 'memory' | 'disk' | 'load' | 'networkUp' | 'networkDown' | 'uptime';
type LocalSortDirection = 'asc' | 'desc';

interface FilterBarProps {
  groups: DashboardGroupOptionViewModel[];
  selectedGroup: string | null;
  onSelectGroup: (group: string | null) => void;
  viewMode: DashboardViewMode;
  onSelectViewMode: (mode: DashboardViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReorderGroups?: (fromIndex: number, toIndex: number) => void;
  // 排序入口 Props (壳层承接)
  sortKey?: LocalSortKey | null;
  sortDirection?: LocalSortDirection;
  onSortChange?: (key: LocalSortKey | null, direction: LocalSortDirection) => void;
}

const SORT_OPTIONS: { key: LocalSortKey | null; label: string }[] = [
  { key: null, label: '默认排序' },
  { key: 'name', label: '名称' },
  { key: 'cpu', label: 'CPU' },
  { key: 'memory', label: '内存' },
  { key: 'disk', label: '磁盘' },
  { key: 'load', label: '负载' },
  { key: 'networkDown', label: '下载' },
  { key: 'networkUp', label: '上传' },
  { key: 'uptime', label: '在线' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  groups,
  selectedGroup,
  onSelectGroup,
  viewMode,
  onSelectViewMode,
  searchQuery,
  onSearchChange,
  onReorderGroups,
  sortKey = null,
  sortDirection = 'asc',
  onSortChange
}) => {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [justDropped, setJustDropped] = useState(false);
  const [pointerDragging, setPointerDragging] = useState(false);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // 移动阈值（像素），超过此值才认为是拖拽
  const DRAG_THRESHOLD = 5;

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 根据指针位置计算目标分组
  const getGroupKeyAtPosition = useCallback((clientX: number): string | null => {
    let closestKey: string | null = null;
    let closestDistance = Infinity;

    for (const group of groups) {
      const btn = buttonRefs.current.get(group.key);
      if (!btn) continue;
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - centerX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestKey = group.key;
      }
    }
    return closestKey;
  }, [groups]);

  // 指针事件处理
  const handlePointerDown = useCallback((e: React.PointerEvent, key: string) => {
    if (!onReorderGroups) return;

    // 阻止默认行为，防止浏览器启动HTML5 drag
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    // 记录起始位置，等待判断是点击还是拖拽
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;
    setDraggedKey(key);
    setJustDropped(false);
  }, [onReorderGroups]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedKey || !pointerStartPos.current || !onReorderGroups) return;

    const dx = e.clientX - pointerStartPos.current.x;
    const dy = e.clientY - pointerStartPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 超过阈值才进入拖拽模式
    if (distance > DRAG_THRESHOLD && !pointerDragging) {
      setPointerDragging(true);
      setDraggingKey(draggedKey);
      hasMoved.current = true;
    }

    // 只有在拖拽模式下才更新over状态
    if (!pointerDragging) return;

    const targetKey = getGroupKeyAtPosition(e.clientX);
    if (targetKey && targetKey !== draggedKey) {
      setOverKey(targetKey);
    } else {
      setOverKey(null);
    }
  }, [draggedKey, onReorderGroups, pointerDragging, getGroupKeyAtPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // 如果没有进入拖拽模式，说明是普通点击，直接返回让onClick处理
    if (!pointerDragging || !draggedKey || !onReorderGroups) {
      resetPointerState();
      return;
    }

    const targetKey = getGroupKeyAtPosition(e.clientX);
    if (targetKey && targetKey !== draggedKey) {
      const fromIndex = groups.findIndex(g => g.key === draggedKey);
      const toIndex = groups.findIndex(g => g.key === targetKey);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        onReorderGroups(fromIndex, toIndex);
      }
    }

    setJustDropped(true);
    resetPointerState();

    // 延迟清除justDropped
    setTimeout(() => setJustDropped(false), 50);
  }, [pointerDragging, draggedKey, onReorderGroups, groups, getGroupKeyAtPosition]);

  const resetPointerState = useCallback(() => {
    setPointerDragging(false);
    setDraggedKey(null);
    setDraggingKey(null);
    setOverKey(null);
    pointerStartPos.current = null;
  }, []);

  // 分组点击处理
  const handleGroupClick = (key: string) => {
    // 只有在真正拖拽并放下后才阻止点击
    if (justDropped) {
      return;
    }
    onSelectGroup(key);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label || '排序';

  return (
    <div className="km-filter-sticky">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>

        {/* 分组切换：专业风格选择器 */}
        <div
          ref={containerRef}
          className="km-group-scroll-container"
          style={{
            backgroundColor: 'var(--km-bg-darker)',
            borderRadius: 'var(--km-radius-md)',
            border: '1px solid var(--km-border-light)',
            padding: '0.375rem',
            display: 'flex',
            gap: '0.25rem',
            flex: 1,
            minWidth: '240px',
            touchAction: 'none'
          }}
        >
          {/* 全部分组：固定不可拖拽 */}
          <button
            onClick={() => onSelectGroup(null)}
            className={`km-draggable-item${selectedGroup === null ? ' km-group-selected' : ''}`}
            draggable={false}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--km-radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 800,
              backgroundColor: selectedGroup === null ? 'var(--km-surface)' : 'transparent',
              color: selectedGroup === null ? 'var(--km-brand)' : 'var(--km-fg-muted)',
              boxShadow: selectedGroup === null ? 'var(--km-shadow-card)' : 'none',
              transition: 'all var(--km-duration) var(--km-ease)',
              border: '2px solid transparent',
              whiteSpace: 'nowrap',
              letterSpacing: '0.025em',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            全部分组
          </button>
          {groups.map((group) => {
            const isDragging = draggingKey === group.key;
            const isOver = overKey === group.key;
            const isSelected = selectedGroup === group.key;

            return (
              <button
                key={group.key}
                ref={(el) => { if (el) buttonRefs.current.set(group.key, el); }}
                // 禁用HTML5 drag，完全使用Pointer Events
                draggable={false}
                onPointerDown={(e) => handlePointerDown(e, group.key)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={resetPointerState}
                onClick={() => handleGroupClick(group.key)}
                className={`km-draggable-item${isDragging ? ' km-dragging-item' : ''}${isSelected ? ' km-group-selected' : ''}${isOver ? ' km-drag-target' : ''}`}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--km-radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  backgroundColor: isSelected ? 'var(--km-surface)' : 'transparent',
                  color: isSelected ? 'var(--km-brand)' : 'var(--km-fg-muted)',
                  boxShadow: isSelected ? 'var(--km-shadow-card)' : 'none',
                  transition: isDragging ? 'none' : 'background-color 0.15s, color 0.15s, box-shadow 0.15s, border-color 0.15s, opacity 0.15s',
                  border: '2px solid transparent',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.025em',
                  cursor: isDragging ? 'grabbing' : (onReorderGroups ? 'grab' : 'pointer'),
                  opacity: isDragging ? 0.5 : 1,
                  userSelect: 'none',
                  touchAction: 'none'
                }}
              >
                {group.label}
              </button>
            );
          })}
        </div>

        {/* 功能组：排序 + 视图切换 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* 排序入口壳层 */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
              className={`km-sort-pill ${sortKey ? 'active' : ''}`}
              title="选择排序方式"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="km-icon-shape km-icon-sort" />
              <span className="km-sort-label">{currentSortLabel}</span>
              {sortKey && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 900,
                  transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s'
                }}>↑</span>
              )}
            </button>

            {dropdownOpen && (
              <div className="km-sort-dropdown">
                {SORT_OPTIONS.map(opt => (
                  <button 
                    key={opt.key || 'default'} 
                    className={`km-sort-option ${sortKey === opt.key ? 'active' : ''}`}
                    onClick={() => {
                      const nextDir = sortKey === opt.key ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc';
                      onSortChange?.(opt.key, nextDir);
                      setDropdownOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {sortKey === opt.key && (
                      <span style={{ transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none' }}>↑</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 视图切换：纯 CSS 图标 (拒绝 Emoji) */}
          <div style={{ 
            display: 'flex', 
            padding: '0.375rem',
            backgroundColor: 'var(--km-bg-darker)', 
            borderRadius: 'var(--km-radius-md)',
            border: '1px solid var(--km-border-light)'
          }}>
            <button 
              onClick={() => onSelectViewMode('grid')}
              style={{
                width: '32px', height: '32px',
                borderRadius: 'var(--km-radius-sm)',
                backgroundColor: viewMode === 'grid' ? 'var(--km-surface)' : 'transparent',
                boxShadow: viewMode === 'grid' ? 'var(--km-shadow-card)' : 'none',
                color: viewMode === 'grid' ? 'var(--km-brand)' : 'var(--km-fg-muted)',
                transition: 'all var(--km-duration) var(--km-ease)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="网格视图"
            >
              <span className="km-icon-shape km-icon-grid" />
            </button>
            <button 
              onClick={() => onSelectViewMode('table')}
              style={{
                width: '32px', height: '32px',
                borderRadius: 'var(--km-radius-sm)',
                backgroundColor: viewMode === 'table' ? 'var(--km-surface)' : 'transparent',
                boxShadow: viewMode === 'table' ? 'var(--km-shadow-card)' : 'none',
                color: viewMode === 'table' ? 'var(--km-brand)' : 'var(--km-fg-muted)',
                transition: 'all var(--km-duration) var(--km-ease)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="列表视图"
            >
              <span className="km-icon-shape km-icon-list" />
            </button>
          </div>
        </div>
      </div>

      {/* 搜索框：深度集成 */}
      <div style={{ position: 'relative', marginTop: '1.25rem' }}>
        <div style={{
          position: 'absolute',
          left: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--km-fg-muted)',
          display: 'flex', alignItems: 'center'
        }}>
          <span className="km-icon-shape km-icon-search" />
        </div>
        <input 
          type="text" 
          placeholder="按节点标题、备注或标识搜索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="km-input-refined"
        />
      </div>
    </div>
  );
};
