import { describe, expect, it } from "vitest";
import type { DashboardState } from "@/types/domain";
import { DEFAULT_THEME_SETTINGS } from "@/core/config/theme-settings";
import { UNGROUPED_GROUP_KEY } from "@/lib/groups";
import { selectDashboardViewModel } from "./selectors";

const baseState: DashboardState = {
  status: "ready",
  error: null,
  isReservedRoute: false,
  realtimeConnection: "open",
  publicInfo: {
    allowCors: true,
    customBody: "",
    customHead: "",
    description: "Site description",
    disablePasswordLogin: false,
    oauthEnabled: false,
    oauthProvider: null,
    pingRecordPreserveHours: 48,
    privateSite: false,
    recordEnabled: true,
    recordPreserveHours: 72,
    siteName: "Komari",
    themeName: "Komari",
    themeSettings: {
      ...DEFAULT_THEME_SETTINGS,
      showOfflineNodes: false
    }
  },
  nodes: {
    online: {
      isOnline: true,
      lastUpdatedAt: "2026-03-07T10:00:00.000Z",
      latest: {
        cpuUsage: 42.070007167969415,
        diskTotal: 100,
        diskUsed: 50,
        load1: 0.25,
        load5: 0.5,
        load15: 0.75,
        memoryTotal: 200,
        memoryUsed: 100,
        networkDown: 1024,
        networkUp: 2048,
        uptimeSeconds: 3600
      },
      loadHistory: [],
      meta: {
        architecture: "",
        autoRenewal: false,
        billingCycleDays: undefined,
        cpuCores: 2,
        cpuName: "CPU",
        createdAt: null,
        currency: "",
        diskTotal: 100,
        expiredAt: null,
        gpuName: "",
        group: "A",
        hidden: false,
        kernelVersion: "",
        memoryTotal: 200,
        name: "Online node",
        operatingSystem: "Linux",
        price: undefined,
        publicRemark: "",
        region: "",
        swapTotal: 0,
        tags: [],
        trafficLimit: undefined,
        trafficLimitType: "",
        updatedAt: null,
        uuid: "online",
        virtualization: "",
        weight: 1
      },
      pingHistory: {
        tasks: [],
        records: []
      },
      recentHistory: []
    },
    offline: {
      isOnline: false,
      lastUpdatedAt: null,
      latest: undefined,
      loadHistory: [],
      meta: {
        architecture: "",
        autoRenewal: false,
        billingCycleDays: undefined,
        cpuCores: 2,
        cpuName: "CPU",
        createdAt: null,
        currency: "",
        diskTotal: 100,
        expiredAt: null,
        gpuName: "",
        group: "B",
        hidden: false,
        kernelVersion: "",
        memoryTotal: 200,
        name: "Offline node",
        operatingSystem: "Linux",
        price: undefined,
        publicRemark: "",
        region: "",
        swapTotal: 0,
        tags: [],
        trafficLimit: undefined,
        trafficLimitType: "",
        updatedAt: null,
        uuid: "offline",
        virtualization: "",
        weight: 0
      },
      pingHistory: {
        tasks: [],
        records: []
      },
      recentHistory: []
    }
  },
  nodeOrder: ["online", "offline"],
  selectedNodeId: null,
  preferences: {
    selectedGroup: null,
    viewMode: "grid",
    selectedPingTimeRange: "24h",
    groupOrder: null,
    sortKey: null,
    sortDirection: "asc"
  },

};

// 辅助变量：提取 baseState 中的节点用于测试构造
const onlineNode = baseState.nodes.online!;
const offlineNode = baseState.nodes.offline!;

describe("selectDashboardViewModel", () => {
  it("filters offline nodes when theme setting disables them", () => {
    const viewModel = selectDashboardViewModel(baseState);

    expect(viewModel.nodes).toHaveLength(1);
    expect(viewModel.nodes[0]?.id).toBe("online");
  });

  it("does not select a node until selectedNodeId is explicitly set", () => {
    const viewModel = selectDashboardViewModel(baseState);

    expect(viewModel.selectedNodeId).toBeNull();
    expect(viewModel.selectedNode).toBeNull();
    expect(viewModel.summary.onlineNodes).toBe(1);
  });

  it("rounds metric values for direct UI consumers", () => {
    const viewModel = selectDashboardViewModel(baseState);

    expect(viewModel.nodes[0]?.metrics.cpu.value).toBe(42);
    expect(viewModel.nodes[0]?.metrics.cpu.label).toBe("42%");
    // 新负载格式：负载率百分比 + 状态标签（load1=0.25, cpuCores=2 → 13% 空闲）
    expect(viewModel.nodes[0]?.metrics.load.label).toBe("13% 空闲");
    expect(viewModel.nodes[0]?.metrics.load.ratioPercent).toBe(13);
    expect(viewModel.nodes[0]?.metrics.load.severity).toBe("normal");
    expect(viewModel.nodes[0]?.metrics.load.statusLabel).toBe("空闲");
  });

  it("calculates load severity with four levels based on cpuCores", () => {
    // 测试四档负载严重度：空闲(normal)/正常(notice)/繁忙(warning)/过载(danger)
    const testCases = [
      // 4核服务器，load1=1.0 → 25% 空闲
      { load1: 1.0, cpuCores: 4, expectedRatio: 25, expectedSeverity: "normal", expectedLabel: "空闲" },
      // 4核服务器，load1=2.0 → 50% 正常
      { load1: 2.0, cpuCores: 4, expectedRatio: 50, expectedSeverity: "notice", expectedLabel: "正常" },
      // 4核服务器，load1=3.0 → 75% 繁忙
      { load1: 3.0, cpuCores: 4, expectedRatio: 75, expectedSeverity: "warning", expectedLabel: "繁忙" },
      // 4核服务器，load1=4.0 → 100% 过载
      { load1: 4.0, cpuCores: 4, expectedRatio: 100, expectedSeverity: "danger", expectedLabel: "过载" },
      // 16核服务器，load1=2.0 → 13% 空闲（体现cpuCores差异）
      { load1: 2.0, cpuCores: 16, expectedRatio: 13, expectedSeverity: "normal", expectedLabel: "空闲" },
    ];

    for (const tc of testCases) {
      const state: DashboardState = {
        ...baseState,
        nodes: {
          ...baseState.nodes,
          online: {
            ...onlineNode,
            latest: {
              ...onlineNode.latest,
              load1: tc.load1,
            },
            meta: {
              ...onlineNode.meta,
              cpuCores: tc.cpuCores,
            },
          },
        },
      };
      const viewModel = selectDashboardViewModel(state);
      const load = viewModel.nodes[0]?.metrics.load;

      expect(load?.ratioPercent).toBe(tc.expectedRatio);
      expect(load?.severity).toBe(tc.expectedSeverity);
      expect(load?.statusLabel).toBe(tc.expectedLabel);
    }
  });

  it("exposes networkUp and networkDown separately", () => {
    const viewModel = selectDashboardViewModel(baseState);

    // 验证networkUp/networkDown独立字段
    expect(viewModel.nodes[0]?.networkUp.value).toBe(2048);
    expect(viewModel.nodes[0]?.networkUp.label).toBe("2.0 KB/s");
    expect(viewModel.nodes[0]?.networkDown.value).toBe(1024);
    expect(viewModel.nodes[0]?.networkDown.label).toBe("1.0 KB/s");

    // 验证metrics.network保留兼容性
    expect(viewModel.nodes[0]?.metrics.network.value).toBe(1024);
    expect(viewModel.nodes[0]?.metrics.network.label).toContain("↓");
    expect(viewModel.nodes[0]?.metrics.network.label).toContain("↑");
  });

  it("keeps group keys stable while exposing display labels for the UI", () => {
    const viewModel = selectDashboardViewModel({
      ...baseState,
      publicInfo: {
        ...baseState.publicInfo,
        themeSettings: {
          ...baseState.publicInfo.themeSettings,
          defaultGroup: UNGROUPED_GROUP_KEY
        }
      },
      nodes: {
        ...baseState.nodes,
        online: {
          ...onlineNode,
          meta: {
            ...onlineNode.meta,
            group: UNGROUPED_GROUP_KEY
          }
        }
      },
      nodeOrder: ["online"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: UNGROUPED_GROUP_KEY
      }
    });

    expect(viewModel.groups).toEqual([
      {
        key: UNGROUPED_GROUP_KEY,
        label: "未分组"
      }
    ]);
    expect(viewModel.selectedGroup).toBe(UNGROUPED_GROUP_KEY);
    expect(viewModel.selectedGroupLabel).toBe("未分组");
    expect(viewModel.nodes[0]?.group).toBe(UNGROUPED_GROUP_KEY);
    expect(viewModel.nodes[0]?.groupLabel).toBe("未分组");
    expect(viewModel.theme.defaultGroup).toBe(UNGROUPED_GROUP_KEY);
    expect(viewModel.theme.defaultGroupLabel).toBe("未分组");
  });

  it("returns the same view model reference for the same state snapshot", () => {
    const first = selectDashboardViewModel(baseState);
    const second = selectDashboardViewModel(baseState);

    expect(second).toBe(first);
    expect(second.nodes).toBe(first.nodes);
    expect(second.summary).toBe(first.summary);
  });

  it("returns selected node details when a node is explicitly selected", () => {
    const viewModel = selectDashboardViewModel({
      ...baseState,
      selectedNodeId: "online"
    });

    expect(viewModel.selectedNodeId).toBe("online");
    expect(viewModel.selectedNode?.node.id).toBe("online");
  });
});

describe("selectDashboardViewModel - groupOrder and selectedGroup", () => {
  it("should sort groups by custom groupOrder when provided", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, group: "group-c" }
        },
        node2: {
          ...offlineNode,
          meta: { ...offlineNode.meta, group: "group-a" }
        },
        node3: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node3", group: "group-b" }
        }
      },
      nodeOrder: ["node1", "node2", "node3"],
      preferences: {
        ...baseState.preferences,
        groupOrder: ["group-b", "group-a", "group-c"] // Custom order
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Groups should be sorted by custom order
    expect(viewModel.groups.map(g => g.key)).toEqual(["group-b", "group-a", "group-c"]);
  });

  it("should filter out invalid groups from groupOrder after refresh", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, group: "group-a" }
        },
        node2: {
          ...offlineNode,
          meta: { ...offlineNode.meta, group: "group-b" }
        }
        // group-c no longer exists
      },
      nodeOrder: ["node1", "node2"],
      preferences: {
        ...baseState.preferences,
        groupOrder: ["group-c", "group-a", "group-b"] // group-c is invalid
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Should only include existing groups, in the order specified
    expect(viewModel.groups.map(g => g.key)).toEqual(["group-a", "group-b"]);
  });

  it("should reset selectedGroup to null when it no longer exists after refresh", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, group: "group-a" }
        }
      },
      nodeOrder: ["node1"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: "group-b" // group-b no longer exists
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // selectedGroup should be reset to null
    expect(viewModel.selectedGroup).toBeNull();
    expect(viewModel.selectedGroupLabel).toBeNull();
  });

  it("should keep selectedGroup when it still exists after refresh", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, group: "group-a" }
        },
        node2: {
          ...offlineNode,
          meta: { ...offlineNode.meta, group: "group-b" }
        }
      },
      nodeOrder: ["node1", "node2"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: "group-a"
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // selectedGroup should be preserved
    expect(viewModel.selectedGroup).toBe("group-a");
    expect(viewModel.selectedGroupLabel).toBe("group-a");
  });

  it("should filter nodes by selectedGroup", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node1", group: "group-a", name: "Node A1" }
        },
        node2: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node2", group: "group-b", name: "Node B1" }
        },
        node3: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node3", group: "group-a", name: "Node A2" }
        }
      },
      nodeOrder: ["node1", "node2", "node3"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: "group-a"
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Should only show nodes from group-a
    expect(viewModel.nodes).toHaveLength(2);
    expect(viewModel.nodes.map(n => n.id)).toContain("node1");
    expect(viewModel.nodes.map(n => n.id)).toContain("node3");
    expect(viewModel.nodes.map(n => n.id)).not.toContain("node2");
  });

  it("should show all nodes when selectedGroup is null", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node1", group: "group-a" }
        },
        node2: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node2", group: "group-b" }
        }
      },
      nodeOrder: ["node1", "node2"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: null
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Should show all nodes
    expect(viewModel.nodes).toHaveLength(2);
  });

  it("should sort nodes by sortKey and sortDirection when selectedGroup changes", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node1", group: "group-a", name: "Charlie" },
          latest: { ...onlineNode.latest, cpuUsage: 30 }
        },
        node2: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node2", group: "group-a", name: "Alpha" },
          latest: { ...onlineNode.latest, cpuUsage: 50 }
        },
        node3: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node3", group: "group-a", name: "Bravo" },
          latest: { ...onlineNode.latest, cpuUsage: 40 }
        }
      },
      nodeOrder: ["node1", "node2", "node3"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: "group-a",
        sortKey: "name",
        sortDirection: "asc"
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Should be sorted by name ascending
    expect(viewModel.nodes.map(n => n.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("should maintain sort order when filtering by selectedGroup", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node1", group: "group-a", name: "Zulu" },
          latest: { ...onlineNode.latest, cpuUsage: 10 }
        },
        node2: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node2", group: "group-b", name: "Alpha" },
          latest: { ...onlineNode.latest, cpuUsage: 90 }
        },
        node3: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node3", group: "group-a", name: "Charlie" },
          latest: { ...onlineNode.latest, cpuUsage: 50 }
        }
      },
      nodeOrder: ["node1", "node2", "node3"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: "group-a",
        sortKey: "cpu",
        sortDirection: "desc"
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Should only show group-a nodes, sorted by CPU descending
    expect(viewModel.nodes).toHaveLength(2);
    expect(viewModel.nodes[0]?.title).toBe("Charlie"); // 50% CPU
    expect(viewModel.nodes[1]?.title).toBe("Zulu");    // 10% CPU
  });

  it("should handle ungrouped nodes with UNGROUPED_GROUP_KEY", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        node1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node1", group: UNGROUPED_GROUP_KEY, name: "Grouped Node" }
        },
        node2: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "node2", group: UNGROUPED_GROUP_KEY, name: "Ungrouped Node" }
        }
      },
      nodeOrder: ["node1", "node2"],
      preferences: {
        ...baseState.preferences,
        selectedGroup: UNGROUPED_GROUP_KEY
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Should show ungrouped nodes
    expect(viewModel.selectedGroup).toBe(UNGROUPED_GROUP_KEY);
    expect(viewModel.selectedGroupLabel).toBe("未分组");
  });

  it("should recover groupOrder after refresh with new nodes in same groups", () => {
    const state: DashboardState = {
      ...baseState,
      nodes: {
        // Nodes were refreshed but groups remain the same
        newNode1: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "newNode1", group: "group-b" }
        },
        newNode2: {
          ...onlineNode,
          meta: { ...onlineNode.meta, uuid: "newNode2", group: "group-a" }
        }
      },
      nodeOrder: ["newNode1", "newNode2"],
      preferences: {
        ...baseState.preferences,
        groupOrder: ["group-a", "group-b"] // User's custom order
      }
    };

    const viewModel = selectDashboardViewModel(state);

    // Should maintain custom order even with new nodes
    expect(viewModel.groups.map(g => g.key)).toEqual(["group-a", "group-b"]);
  });
});
