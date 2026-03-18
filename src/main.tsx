import type { ComponentType } from "react";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { ThemeRoot } from "@/core/bootstrap/theme-root";
import { ThemeAppShell } from "@/core/bootstrap/theme-app-shell";
import { isReservedRoutePath } from "@/core/config/runtime";

type RootComponent = ComponentType;

const appModules = import.meta.glob<{ default: RootComponent }>("./App.tsx", {
  eager: true
});
const UiRoot = Object.values(appModules)[0]?.default ?? ThemeAppShell;

if (!isReservedRoutePath(window.location.pathname)) {
  const container = document.getElementById("root");

  if (!container) {
    throw new Error("Missing #root container");
  }

  ReactDOM.createRoot(container).render(
    <StrictMode>
      <ThemeRoot>
        <UiRoot />
      </ThemeRoot>
    </StrictMode>
  );
}
