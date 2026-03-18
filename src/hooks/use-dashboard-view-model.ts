import { dashboardController } from "@/core/dashboard/dashboard-controller";
import { useStoreSelector } from "./use-store-selector";
import { dashboardStore } from "@/state/dashboard-store";
import { selectDashboardViewModel } from "@/state/selectors";

export function useDashboardViewModel() {
  const viewModel = useStoreSelector(dashboardStore, selectDashboardViewModel);

  return {
    actions: dashboardController,
    viewModel
  };
}
