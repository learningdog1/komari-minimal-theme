import { useEffect } from "react";
import { dashboardController } from "@/core/dashboard/dashboard-controller";

export function useDashboardBootstrap(): void {
  useEffect(() => {
    void dashboardController.bootstrap();

    return () => {
      dashboardController.disconnect();
    };
  }, []);
}
