export const API_ROOT = '/api';
export const API_PREFIX = `${API_ROOT}/`;

export const remoteApiPaths = {
  tasksCollection: () => `${API_ROOT}/tasks`,
  task: (taskId: string | number) => `${API_ROOT}/tasks/${taskId}`,
  taskMutation: (taskId: string | number, action: 'archive' | 'unarchive' | 'push') =>
    `${API_ROOT}/tasks/${taskId}/${action}`,
  routinesCollection: () => `${API_ROOT}/routines`,
  routine: (routineId: string | number) => `${API_ROOT}/routines/${routineId}`,
  notificationsSubscribe: () => `${API_ROOT}/notifications/subscribe`,
  notificationsUnsubscribe: () => `${API_ROOT}/notifications/unsubscribe`,
  syncBase: () => `${API_ROOT}/sync`,
  syncUplink: () => `${API_ROOT}/sync/uplink`,
  syncMetrics: () => `${API_ROOT}/sync/metrics`,
  alerts: () => `${API_ROOT}/alerts`,
  errors: () => `${API_ROOT}/errors`,
  metrics: () => `${API_ROOT}/metrics`,
  health: () => `${API_ROOT}/health`,
  testThrottle: () => `${API_ROOT}/test-throttle`,
  optimized: () => `${API_ROOT}/optimized`,
  retryTest: () => `${API_ROOT}/retry-test`,
  aiPrefix: () => `${API_PREFIX}ai/`,
} as const;

export type RemoteApiPathKey = keyof typeof remoteApiPaths;

export function resolveRemoteApiPath<K extends RemoteApiPathKey>(
  key: K,
  ...params: Parameters<(typeof remoteApiPaths)[K]>
): string {
  const resolver = remoteApiPaths[key] as (...args: unknown[]) => string;
  return resolver(...(params as unknown[])) as string;
}
