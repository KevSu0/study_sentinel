export type BaseAppState = {
  isLoaded: boolean;
};

export type SetState<T> = (updater: (prev: T) => T) => void;

