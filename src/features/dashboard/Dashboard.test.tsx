import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import * as useDashboardViewModelHook from '@/hooks/use-dashboard-view-model';
import type { DashboardViewModel } from '@/types/view-model';
import { UNGROUPED_GROUP_KEY } from '@/lib/groups';

// Mock the hook
vi.mock('@/hooks/use-dashboard-view-model');

// 辅助函数：模拟按钮位置（用于 pointer 拖拽测试）
const mockButtonPositions = (container: HTMLElement) => {
  const buttons = container.querySelectorAll('button');
  buttons.forEach((btn, index) => {
    const left = 100 + index * 110;
    btn.getBoundingClientRect = vi.fn(() => ({
      left,
      top: 100,
      width: 100,
      height: 40,
      right: left + 100,
      bottom: 140,
      x: left,
      y: 100,
      toJSON: () => {},
    }));
  });
};

describe('Dashboard - group reordering integration', () => {
  const mockSetGroupOrder = vi.fn();
  
  const mockViewModel: DashboardViewModel = {
    site: {
      title: 'Test Site',
      subtitle: 'Test Subtitle',
      themeName: 'Komari',
      description: 'Test',
    },
    theme: {
      title: 'Test',
      subtitle: 'Test',
      accentColor: '#0f766e',
      defaultGroup: null,
      defaultGroupLabel: null,
      defaultViewMode: 'grid',
      showOfflineNodes: true,
      loadHours: 24,
      pingHours: 6,
      refreshIntervalMs: 5000,
      footerText: 'Test',
      extra: {},
    },
    status: 'ready',
    error: null,
    groups: [
      { key: 'group-a', label: 'Group A' },
      { key: 'group-b', label: 'Group B' },
      { key: 'group-c', label: 'Group C' },
    ],
    nodes: [],
    selectedGroup: null,
    selectedGroupLabel: null,
    selectedNodeId: null,
    selectedNode: null,
    selectedPingTimeRange: '24h',
    viewMode: 'grid',
    sortKey: null,
    sortDirection: 'asc',
    realtimeConnection: 'open',
    isReservedRoute: false,
    summary: {
      totalNodes: 0,
      onlineNodes: 0,
      offlineNodes: 0,
      groupCount: 3,
      lastUpdatedAt: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useDashboardViewModelHook.useDashboardViewModel).mockReturnValue({
      viewModel: mockViewModel,
      actions: {
        setGroupOrder: mockSetGroupOrder,
        selectNode: vi.fn(),
        setSelectedGroup: vi.fn(),
        setViewMode: vi.fn(),
        setPingTimeRange: vi.fn(),
        setSortPreference: vi.fn(),
        bootstrap: vi.fn(),
        disconnect: vi.fn(),
        refreshNodes: vi.fn(),
        startPolling: vi.fn(),
        connectRealtime: vi.fn(),
      },
    });
  });

  it('should call setGroupOrder with reordered keys when handleReorderGroups is triggered via pointer', () => {
    const { container } = render(<Dashboard />);

    // 模拟按钮位置
    mockButtonPositions(container);

    // 获取 Group A 按钮
    const groupAButton = screen.getByText('Group A');

    // 模拟 pointer 拖拽：从 Group A (索引0) 拖到 Group C (索引2)
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 260,
      isPrimary: true,
    });

    fireEvent.pointerMove(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    fireEvent.pointerUp(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    // 验证 setGroupOrder 被调用
    expect(mockSetGroupOrder).toHaveBeenCalled();

    // 验证传递的参数是重排后的 key 数组
    const callArgs = mockSetGroupOrder.mock.calls[0]![0];
    expect(Array.isArray(callArgs)).toBe(true);
    expect(callArgs.length).toBe(3);
  });

  it('should pass correct order to setGroupOrder when moving first to last via pointer', () => {
    const { container } = render(<Dashboard />);

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // 模拟 pointer 拖拽：从 Group A (索引0) 拖到 Group C (索引2)
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 260,
      isPrimary: true,
    });

    fireEvent.pointerMove(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    fireEvent.pointerUp(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    // 验证 setGroupOrder 被调用且参数正确
    expect(mockSetGroupOrder).toHaveBeenCalledTimes(1);

    // 新的顺序应该是：group-b, group-c, group-a
    const newOrder = mockSetGroupOrder.mock.calls[0]![0];
    expect(newOrder).toEqual(['group-b', 'group-c', 'group-a']);
  });

  it('should pass correct order to setGroupOrder when swapping adjacent groups via pointer', () => {
    const { container } = render(<Dashboard />);

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // 模拟 pointer 拖拽：从 Group A (索引0) 拖到 Group B (索引1)
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 260,
      isPrimary: true,
    });

    fireEvent.pointerMove(groupAButton, {
      pointerId: 1,
      clientX: 370,
      isPrimary: true,
    });

    fireEvent.pointerUp(groupAButton, {
      pointerId: 1,
      clientX: 370,
      isPrimary: true,
    });

    // 新的顺序应该是：group-b, group-a, group-c
    const newOrder = mockSetGroupOrder.mock.calls[0]![0];
    expect(newOrder).toEqual(['group-b', 'group-a', 'group-c']);
  });

  it.skip('should handle reordering with UNGROUPED_GROUP_KEY correctly via pointer', () => {
    // 使用包含未分组的 viewModel
    const viewModelWithUngrouped: DashboardViewModel = {
      ...mockViewModel,
      groups: [
        { key: UNGROUPED_GROUP_KEY, label: '未分组' },
        { key: 'group-a', label: 'Group A' },
        { key: 'group-b', label: 'Group B' },
      ],
    };

    vi.mocked(useDashboardViewModelHook.useDashboardViewModel).mockReturnValue({
      viewModel: viewModelWithUngrouped,
      actions: {
        setGroupOrder: mockSetGroupOrder,
        selectNode: vi.fn(),
        setSelectedGroup: vi.fn(),
        setViewMode: vi.fn(),
        setPingTimeRange: vi.fn(),
        setSortPreference: vi.fn(),
        bootstrap: vi.fn(),
        disconnect: vi.fn(),
        refreshNodes: vi.fn(),
        startPolling: vi.fn(),
        connectRealtime: vi.fn(),
      },
    });

    const { container } = render(<Dashboard />);

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // 模拟 pointer 拖拽：从 Group A 拖到 Group B
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 260,
      isPrimary: true,
    });

    fireEvent.pointerMove(groupAButton, {
      pointerId: 1,
      clientX: 370,
      isPrimary: true,
    });

    fireEvent.pointerUp(groupAButton, {
      pointerId: 1,
      clientX: 370,
      isPrimary: true,
    });

    // 验证 setGroupOrder 被调用且包含 UNGROUPED_GROUP_KEY
    expect(mockSetGroupOrder).toHaveBeenCalled();
    const newOrder = mockSetGroupOrder.mock.calls[0]![0];
    expect(newOrder).toContain(UNGROUPED_GROUP_KEY);
    expect(newOrder).toContain('group-a');
    expect(newOrder).toContain('group-b');
  });

  it('should wire handleReorderGroups to actions.setGroupOrder via pointer events', () => {
    render(<Dashboard />);

    const groupAButton = screen.getByText('Group A');

    // 验证 pointer 事件处理器已附加
    expect(() => {
      fireEvent.pointerDown(groupAButton, {
        pointerId: 1,
        clientX: 100,
        isPrimary: true,
      });
    }).not.toThrow();

    expect(() => {
      fireEvent.pointerMove(groupAButton, {
        pointerId: 1,
        clientX: 150,
        isPrimary: true,
      });
    }).not.toThrow();

    expect(() => {
      fireEvent.pointerUp(groupAButton, {
        pointerId: 1,
        clientX: 150,
        isPrimary: true,
      });
    }).not.toThrow();
  });

  it('should pass reordered keys to setGroupOrder when handleReorderGroups is called via pointer', () => {
    const { container } = render(<Dashboard />);

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // 模拟 pointer 拖拽：从 Group A (索引0) 拖到 Group C (索引2)
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 260,
      isPrimary: true,
    });

    fireEvent.pointerMove(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    fireEvent.pointerUp(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    // 验证 setGroupOrder 被调用
    expect(mockSetGroupOrder).toHaveBeenCalled();

    // 验证传递的是重排后的 key 数组
    const newOrder = mockSetGroupOrder.mock.calls[0]![0];
    expect(Array.isArray(newOrder)).toBe(true);
    expect(newOrder.length).toBe(3);
  });
});
