import { useRef, useSyncExternalStore } from "react";
import type { StoreApi } from "@/state/store";

export function useStoreSelector<State, Selected>(
  store: StoreApi<State>,
  selector: (state: State) => Selected,
  isEqual: (previous: Selected, next: Selected) => boolean = Object.is
): Selected {
  const stateSnapshot = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );

  const selectedSnapshot = selector(stateSnapshot);
  const selectedRef = useRef(selectedSnapshot);

  if (!isEqual(selectedRef.current, selectedSnapshot)) {
    selectedRef.current = selectedSnapshot;
  }

  return selectedRef.current;
}
