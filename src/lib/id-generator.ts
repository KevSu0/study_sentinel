// ID generation utilities for storage system

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateEventId(): string {
  return `evt_${generateId()}`;
}

export function generateDeviceId(): string {
  return `dev_${generateId()}`;
}

export function generateSessionId(): string {
  return `ses_${generateId()}`;
}

export function generateSyncCheckpointId(deviceId: string): string {
  return `checkpoint_${deviceId}`;
}

export function generateTaskId(): string {
  return `task_${generateId()}`;
}

export function generateBadgeId(): string {
  return `badge_${generateId()}`;
}