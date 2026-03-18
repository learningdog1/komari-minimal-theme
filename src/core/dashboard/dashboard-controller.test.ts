import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dashboardController } from './dashboard-controller';
import { dashboardStore } from '@/state/dashboard-store';
import type { PublicInfo } from '@/types/domain';

// Mock the store
vi.mock('@/state/dashboard-store', () => ({
  dashboardStore: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

describe('dashboardController.setPingTimeRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should downgrade 7d to 24h when only 48h preserved', () => {
    const mockPublicInfo: PublicInfo = {
      // ... other required fields
      allowCors: false,
      customBody: '',
      customHead: '',
      description: '',
      disablePasswordLogin: false,
      oauthEnabled: false,
      oauthProvider: null,
      privateSite: false,
      recordEnabled: false,
      recordPreserveHours: 0,
      siteName: '',
      themeName: '',
      themeSettings: {
        title: '',
        subtitle: '',
        accentColor: '',
        defaultGroup: null,
        defaultViewMode: 'grid',
        showOfflineNodes: true,
        loadHours: 24,
        pingHours: 6,
        refreshIntervalMs: 30000,
        footerText: '',
        extra: {}
      },
      pingRecordPreserveHours: 48
    };

    vi.mocked(dashboardStore.getState).mockReturnValue({
      publicInfo: mockPublicInfo,
      preferences: {
        selectedGroup: null,
        viewMode: 'grid',
        selectedPingTimeRange: '24h'
      }
    } as any);

    dashboardController.setPingTimeRange('7d');

    // Should downgrade to 24h since only 48h is preserved
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should keep 24h when 72h preserved', () => {
    vi.mocked(dashboardStore.getState).mockReturnValue({
      publicInfo: {
        pingRecordPreserveHours: 72
      },
      preferences: {
        selectedGroup: null,
        viewMode: 'grid',
        selectedPingTimeRange: '6h'
      }
    } as any);

    dashboardController.setPingTimeRange('24h');

    // Should keep 24h since 72h >= 24h
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should downgrade 24h to 6h when only 12h preserved', () => {
    vi.mocked(dashboardStore.getState).mockReturnValue({
      publicInfo: {
        pingRecordPreserveHours: 12
      },
      preferences: {
        selectedGroup: null,
        viewMode: 'grid',
        selectedPingTimeRange: '1h'
      }
    } as any);

    dashboardController.setPingTimeRange('24h');

    // Should downgrade to 6h since only 12h is preserved
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should keep 1h when 0h preserved (minimum fallback)', () => {
    vi.mocked(dashboardStore.getState).mockReturnValue({
      publicInfo: {
        pingRecordPreserveHours: 0
      },
      preferences: {
        selectedGroup: null,
        viewMode: 'grid',
        selectedPingTimeRange: '24h'
      }
    } as any);

    dashboardController.setPingTimeRange('1h');

    // Should keep 1h as minimum
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('dashboardController.setGroupOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter out non-existent group keys', () => {
    vi.mocked(dashboardStore.getState).mockReturnValue({
      nodeOrder: ['node1', 'node2', 'node3'],
      nodes: {
        node1: { meta: { group: 'group-a' } },
        node2: { meta: { group: 'group-b' } },
        node3: { meta: { group: 'group-a' } }
      }
    } as any);

    // Try to set order with some non-existent groups
    dashboardController.setGroupOrder(['group-c', 'group-a', 'group-d', 'group-b']);

    // Should filter out group-c and group-d, keep valid order
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should set null when all groups are non-existent', () => {
    vi.mocked(dashboardStore.getState).mockReturnValue({
      nodeOrder: ['node1'],
      nodes: {
        node1: { meta: { group: 'group-a' } }
      }
    } as any);

    dashboardController.setGroupOrder(['group-x', 'group-y']);

    // Should set null to use default label sorting
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should preserve valid order when all groups exist', () => {
    vi.mocked(dashboardStore.getState).mockReturnValue({
      nodeOrder: ['node1', 'node2', 'node3'],
      nodes: {
        node1: { meta: { group: 'group-c' } },
        node2: { meta: { group: 'group-a' } },
        node3: { meta: { group: 'group-b' } }
      }
    } as any);

    dashboardController.setGroupOrder(['group-b', 'group-a', 'group-c']);

    // Should preserve the exact order provided
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle empty groupOrder array', () => {
    vi.mocked(dashboardStore.getState).mockReturnValue({
      nodeOrder: ['node1'],
      nodes: {
        node1: { meta: { group: 'group-a' } }
      }
    } as any);

    dashboardController.setGroupOrder([]);

    // Should set null for empty array
    expect(dashboardStore.setState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should maintain order after refresh when groups still exist', () => {
    // Simulate refresh scenario: nodes may be reordered but groups remain
    vi.mocked(dashboardStore.getState).mockReturnValue({
      nodeOrder: ['node3', 'node1', 'node2'], // Different order after refresh
      nodes: {
        node1: { meta: { group: 'group-a' } },
        node2: { meta: { group: 'group-b' } },
        node3: { meta: { group: 'group-c' } }
      }
    } as any);

    // User had previously set this order
    dashboardController.setGroupOrder(['group-c', 'group-a', 'group-b']);

    // Should preserve the user's custom order
    const setStateCall = vi.mocked(dashboardStore.setState).mock.calls[0];
    expect(setStateCall).toBeDefined();
    const updaterFn = setStateCall![0] as Function;
    const result = updaterFn({
      preferences: { groupOrder: ['group-x', 'group-y'] }
    });

    expect(result.preferences.groupOrder).toEqual(['group-c', 'group-a', 'group-b']);
  });

  it('should filter out removed groups after refresh', () => {
    // Simulate refresh where group-c no longer exists
    vi.mocked(dashboardStore.getState).mockReturnValue({
      nodeOrder: ['node1', 'node2'],
      nodes: {
        node1: { meta: { group: 'group-a' } },
        node2: { meta: { group: 'group-b' } }
        // group-c was removed
      }
    } as any);

    // User had previously set order including the removed group
    dashboardController.setGroupOrder(['group-c', 'group-a', 'group-b']);

    // Should filter out group-c
    const setStateCall = vi.mocked(dashboardStore.setState).mock.calls[0];
    expect(setStateCall).toBeDefined();
    const updaterFn = setStateCall![0] as Function;
    const result = updaterFn({
      preferences: { groupOrder: null }
    });

    expect(result.preferences.groupOrder).toEqual(['group-a', 'group-b']);
  });

  it('should set null when all custom groups are removed after refresh', () => {
    // Simulate refresh where all custom groups are gone
    vi.mocked(dashboardStore.getState).mockReturnValue({
      nodeOrder: ['node1'],
      nodes: {
        node1: { meta: { group: 'new-group' } }
      }
    } as any);

    // User had previously set order for old groups
    dashboardController.setGroupOrder(['old-group-1', 'old-group-2']);

    // Should set null since none of the custom groups exist
    const setStateCall = vi.mocked(dashboardStore.setState).mock.calls[0];
    expect(setStateCall).toBeDefined();
    const updaterFn = setStateCall![0] as Function;
    const result = updaterFn({
      preferences: { groupOrder: ['old-group-1'] }
    });

    expect(result.preferences.groupOrder).toBeNull();
  });
});
