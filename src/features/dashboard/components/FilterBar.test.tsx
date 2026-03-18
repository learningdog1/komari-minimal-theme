import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import type { DashboardGroupOptionViewModel } from '@/types/view-model';

describe('FilterBar - group reordering (pointer events only)', () => {
  const mockGroups: DashboardGroupOptionViewModel[] = [
    { key: 'group-a', label: 'Group A' },
    { key: 'group-b', label: 'Group B' },
    { key: 'group-c', label: 'Group C' },
  ];

  const defaultProps = {
    groups: mockGroups,
    selectedGroup: null,
    onSelectGroup: vi.fn(),
    viewMode: 'grid' as const,
    onSelectViewMode: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
  };

  it('should NOT make "全部分组" draggable', () => {
    const onReorderGroups = vi.fn();
    render(
      <FilterBar
        {...defaultProps}
        onReorderGroups={onReorderGroups}
      />
    );

    const allGroupsButton = screen.getByText('全部分组');

    // 验证 draggable 属性为 false
    expect(allGroupsButton.getAttribute('draggable')).toBe('false');
  });

  it('should have draggable=false on all groups (pointer events only)', () => {
    const onReorderGroups = vi.fn();
    render(
      <FilterBar
        {...defaultProps}
        onReorderGroups={onReorderGroups}
      />
    );

    // 获取分组按钮（跳过"全部分组"）
    const groupAButton = screen.getByText('Group A');
    const groupBButton = screen.getByText('Group B');
    const groupCButton = screen.getByText('Group C');

    // 验证这些按钮的 draggable 为 false（使用 pointer events 而非 HTML5 drag）
    expect(groupAButton.getAttribute('draggable')).toBe('false');
    expect(groupBButton.getAttribute('draggable')).toBe('false');
    expect(groupCButton.getAttribute('draggable')).toBe('false');
  });
});

describe('FilterBar - pointer-based drag reordering', () => {
  const mockGroups: DashboardGroupOptionViewModel[] = [
    { key: 'group-a', label: 'Group A' },
    { key: 'group-b', label: 'Group B' },
    { key: 'group-c', label: 'Group C' },
  ];

  const defaultProps = {
    groups: mockGroups,
    selectedGroup: null,
    onSelectGroup: vi.fn(),
    viewMode: 'grid' as const,
    onSelectViewMode: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 辅助函数：模拟按钮的 getBoundingClientRect
  // 注意：第一个按钮是"全部分组"(draggable=false)，然后是 group-a, group-b, group-c
  const mockButtonPositions = (container: HTMLElement) => {
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn, index) => {
      // 每个按钮宽度约100px，间隔10px
      // index 0: "全部分组", index 1: group-a, index 2: group-b, index 3: group-c
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

  it('should trigger onReorderGroups via pointer events with correct fromIndex and toIndex', () => {
    const onReorderGroups = vi.fn();
    const { container } = render(
      <FilterBar
        {...defaultProps}
        onReorderGroups={onReorderGroups}
      />
    );

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // 按钮位置说明（考虑"全部分组"在索引0）：
    // index 0: "全部分组" (left=100, center=150)
    // index 1: "group-a"  (left=210, center=260)
    // index 2: "group-b"  (left=320, center=370)
    // index 3: "group-c"  (left=430, center=480)

    // pointerDown 在 Group A (groups数组中的索引0)，按钮中心在 260
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 260,
      isPrimary: true,
    });

    // pointerMove 到 Group C 位置 (groups数组中的索引2)，按钮中心在 480
    fireEvent.pointerMove(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    // pointerUp 在 Group C 位置
    fireEvent.pointerUp(groupAButton, {
      pointerId: 1,
      clientX: 480,
      isPrimary: true,
    });

    // 验证 onReorderGroups 被调用，参数为从索引0移动到索引2
    expect(onReorderGroups).toHaveBeenCalledTimes(1);
    expect(onReorderGroups).toHaveBeenCalledWith(0, 2);
  });

  it('should trigger onReorderGroups when swapping adjacent groups via pointer', () => {
    const onReorderGroups = vi.fn();
    const { container } = render(
      <FilterBar
        {...defaultProps}
        onReorderGroups={onReorderGroups}
      />
    );

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // pointerDown 在 Group A (groups数组中的索引0)，按钮中心在 260
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 260,
      isPrimary: true,
    });

    // pointerMove 到 Group B 位置 (groups数组中的索引1)，按钮中心在 370
    fireEvent.pointerMove(groupAButton, {
      pointerId: 1,
      clientX: 370,
      isPrimary: true,
    });

    // pointerUp 在 Group B 位置
    fireEvent.pointerUp(groupAButton, {
      pointerId: 1,
      clientX: 370,
      isPrimary: true,
    });

    // 验证参数：从索引0移动到索引1
    expect(onReorderGroups).toHaveBeenCalledWith(0, 1);
  });

  it('should set pointer capture on pointerDown', () => {
    const onReorderGroups = vi.fn();
    const setPointerCaptureMock = vi.fn();
    
    render(
      <FilterBar
        {...defaultProps}
        onReorderGroups={onReorderGroups}
      />
    );

    const groupAButton = screen.getByText('Group A');
    
    // 模拟 setPointerCapture
    groupAButton.setPointerCapture = setPointerCaptureMock;

    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 100,
      isPrimary: true,
    });

    // 验证 setPointerCapture 被调用
    expect(setPointerCaptureMock).toHaveBeenCalledWith(1);
  });

  it('should NOT trigger onSelectGroup immediately after pointer drag (justDropped protection)', () => {
    const onSelectGroup = vi.fn();
    const onReorderGroups = vi.fn();

    const { container } = render(
      <FilterBar
        {...defaultProps}
        onSelectGroup={onSelectGroup}
        onReorderGroups={onReorderGroups}
      />
    );

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // 模拟 pointer 拖拽序列（从 Group A 拖到 Group C）
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

    // 立即点击应该被阻止（justDropped 保护）
    fireEvent.click(groupAButton);

    // onSelectGroup 不应该被调用
    expect(onSelectGroup).not.toHaveBeenCalled();
  });

  it('should trigger onSelectGroup after pointer drag justDropped clears', async () => {
    const onSelectGroup = vi.fn();
    const onReorderGroups = vi.fn();

    const { container } = render(
      <FilterBar
        {...defaultProps}
        onSelectGroup={onSelectGroup}
        onReorderGroups={onReorderGroups}
      />
    );

    // 模拟按钮位置
    mockButtonPositions(container);

    const groupAButton = screen.getByText('Group A');

    // 模拟 pointer 拖拽序列（从 Group A 拖到 Group C）
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

    // 等待 justDropped 清除（setTimeout 50ms）
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // 再次点击应该正常触发
    fireEvent.click(groupAButton);

    // 现在 onSelectGroup 应该被调用
    expect(onSelectGroup).toHaveBeenCalled();
  });

  it('should reset pointer state on pointerCancel', () => {
    const onReorderGroups = vi.fn();
    const onSelectGroup = vi.fn();

    render(
      <FilterBar
        {...defaultProps}
        onSelectGroup={onSelectGroup}
        onReorderGroups={onReorderGroups}
      />
    );

    const groupAButton = screen.getByText('Group A');

    // 开始拖拽
    fireEvent.pointerDown(groupAButton, {
      pointerId: 1,
      clientX: 100,
      isPrimary: true,
    });

    // 取消拖拽
    fireEvent.pointerCancel(groupAButton, {
      pointerId: 1,
      isPrimary: true,
    });

    // 点击应该正常触发（因为拖拽已取消）
    fireEvent.click(groupAButton);

    // onSelectGroup 应该被调用
    expect(onSelectGroup).toHaveBeenCalled();
  });
});

describe('FilterBar - click behavior (Task 14)', () => {
  const mockGroups: DashboardGroupOptionViewModel[] = [
    { key: 'group-a', label: 'Group A' },
    { key: 'group-b', label: 'Group B' },
    { key: 'group-c', label: 'Group C' },
  ];

  const defaultProps = {
    groups: mockGroups,
    selectedGroup: null,
    onSelectGroup: vi.fn(),
    viewMode: 'grid' as const,
    onSelectViewMode: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should switch group on normal mouse click', () => {
    const onSelectGroup = vi.fn();
    render(
      <FilterBar
        {...defaultProps}
        onSelectGroup={onSelectGroup}
      />
    );

    // 点击 Group A 按钮
    const groupAButton = screen.getByText('Group A');
    fireEvent.click(groupAButton);

    // 验证 onSelectGroup 被调用，参数为 group-a
    expect(onSelectGroup).toHaveBeenCalledTimes(1);
    expect(onSelectGroup).toHaveBeenCalledWith('group-a');
  });

  it('should switch to null (all groups) when clicking 全部分组', () => {
    const onSelectGroup = vi.fn();
    render(
      <FilterBar
        {...defaultProps}
        selectedGroup="group-a"
        onSelectGroup={onSelectGroup}
      />
    );

    // 点击"全部分组"按钮
    const allGroupsButton = screen.getByText('全部分组');
    fireEvent.click(allGroupsButton);

    // 验证 onSelectGroup 被调用，参数为 null
    expect(onSelectGroup).toHaveBeenCalledTimes(1);
    expect(onSelectGroup).toHaveBeenCalledWith(null);
  });
});
