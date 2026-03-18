import type { PropsWithChildren, ReactElement } from "react";
import { useDashboardBootstrap } from "@/hooks/use-dashboard-bootstrap";

export function ThemeRoot({ children }: PropsWithChildren): ReactElement {
  useDashboardBootstrap();
  return <>{children}</>;
}
