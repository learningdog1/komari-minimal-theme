export interface StoreApi<State> {
  getState(): State;
  setState(updater: Partial<State> | ((state: State) => Partial<State>)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<State>(initialState: State): StoreApi<State> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState() {
      return state;
    },
    setState(updater) {
      const partial =
        typeof updater === "function"
          ? (updater as (state: State) => Partial<State>)(state)
          : updater;
      state = { ...state, ...partial };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
