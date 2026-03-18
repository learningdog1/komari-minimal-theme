import type { ReactElement } from "react";
import { useDashboardViewModel } from "@/hooks/use-dashboard-view-model";

export function ThemeAppShell(): ReactElement | null {
  const { viewModel } = useDashboardViewModel();

  if (viewModel.isReservedRoute) {
    return null;
  }

  return (
    <main aria-live="polite" data-komari-shell="core">
      <p>Komari theme core is ready.</p>
      <p>
        Status: {viewModel.status} | Nodes: {viewModel.summary.totalNodes} | Online:{" "}
        {viewModel.summary.onlineNodes}
      </p>
      {viewModel.error ? <p>{viewModel.error}</p> : null}
      <small>{viewModel.theme.footerText}</small>
    </main>
  );
}
