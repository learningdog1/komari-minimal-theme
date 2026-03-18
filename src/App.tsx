import React from 'react';
import { useDashboardViewModel } from '@/hooks/use-dashboard-view-model';
import { Dashboard } from '@/features/dashboard/Dashboard';
import './styles/theme.css';

const App: React.FC = () => {
  const { viewModel } = useDashboardViewModel();

  // 如果是管理路由或终端路由，按照指令返回 null
  // 实际的路由逻辑已经在 src/main.tsx 中由基础系统接管
  if (viewModel.isReservedRoute) {
    return null;
  }

  return <Dashboard />;
};

export default App;
