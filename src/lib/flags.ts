// Feature flags for progressive rollout / kill switch
// EVENTS_DEFAULT: when true, default to event-sourced writes and avoid legacy log writes
// Can be overridden via environment variables in both browser and Node test envs.

function envBool(name: string, defaultValue: boolean): boolean {
  // In Next/Jest environments, process.env is available
  try {
    const raw = (process && process.env && (process.env as any)[name]) as string | undefined;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === '1' || v === 'true' || v === 'yes' || v === 'on';
    }
  } catch {}
  return defaultValue;
}

export const EVENTS_DEFAULT: boolean = envBool('NEXT_PUBLIC_EVENTS_DEFAULT', true) || envBool('EVENTS_DEFAULT', true);

// Allow reading legacy logs (for backfill or transitional tooling). Default false.
export const ALLOW_LEGACY_LOGS_READ: boolean = envBool('NEXT_PUBLIC_ALLOW_LEGACY_LOGS_READ', false) || envBool('ALLOW_LEGACY_LOGS_READ', false);

// Include legacy logs in backups. Default false; enable only during deprecation window if needed.
export const INCLUDE_LEGACY_LOGS_IN_BACKUP: boolean = envBool('NEXT_PUBLIC_INCLUDE_LEGACY_LOGS_IN_BACKUP', false) || envBool('INCLUDE_LEGACY_LOGS_IN_BACKUP', false);
