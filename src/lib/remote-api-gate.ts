import { ROUTINES_KEY, TASKS_KEY } from '@/lib/storage-keys';

const REMOTE_ENV_ENABLED =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env.NEXT_PUBLIC_ENABLE_REMOTE_APIS === 'true'
    : false;

type LocalHandler = {
  matches: (path: string, method: string) => boolean;
  handle: (path: string, method: string, init?: RequestInit) => Promise<Response>;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;
const TASK_STATE_MUTATION_PATTERN = /^\/api\/tasks\/[^/]+\/(archive|unarchive|push)$/;

export function areRemoteApisEnabled(): boolean {
  const flagFromStorage = readFlagFromStorage();
  if (typeof flagFromStorage === 'boolean') {
    return flagFromStorage;
  }
  return REMOTE_ENV_ENABLED;
}

export async function safeApiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const path = normalizePath(input);
  const method = extractMethod(input, init);

  if (areRemoteApisEnabled()) {
    return fetch(input as RequestInfo, init);
  }

  const handler = LOCAL_HANDLERS.find(current => current.matches(path, method));
  if (handler) {
    return handler.handle(path, method, init);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[remote-api-gate] Blocked remote call ${method} ${path}; returning empty stub.`);
  }
  await nextTick();
  return new Response(null, { status: 204 });
}

const LOCAL_HANDLERS: LocalHandler[] = [
  {
    matches: (path, method) => path === '/api/tasks' && method === 'GET',
    handle: async () => {
      const tasks = readJsonFromStorage(TASKS_KEY, []);
      await nextTick();
      return createJsonResponse(tasks);
    }
  },
  {
    matches: (path, method) => path === '/api/tasks' && method === 'POST',
    handle: async (_path, _method, init) => {
      const payload = parseJsonBody(init?.body);
      const id = ensurePermanentId(payload?.id);
      const savedTask = { ...payload, id };
      await nextTick();
      return createJsonResponse(savedTask);
    }
  },
  {
    matches: (path, method) => path.startsWith('/api/tasks/') && method === 'PUT',
    handle: async (path, _method, init) => {
      const body = parseJsonBody(init?.body) ?? {};
      const idFromPath = path.split('/').pop();
      const savedTask = { ...body, id: body.id ?? idFromPath };
      await nextTick();
      return createJsonResponse(savedTask);
    }
  },
  {
    matches: (path, method) => path.startsWith('/api/tasks/') && method === 'DELETE',
    handle: async () => {
      await nextTick();
      return new Response(null, { status: 204 });
    }
  },
  {
    matches: (path, method) => method === 'POST' && TASK_STATE_MUTATION_PATTERN.test(path),
    handle: async () => {
      await nextTick();
      return new Response(null, { status: 204 });
    }
  },
  {
    matches: (path, method) => path === '/api/routines' && method === 'GET',
    handle: async () => {
      const routines = readJsonFromStorage(ROUTINES_KEY, []);
      await nextTick();
      return createJsonResponse(routines);
    }
  },
  {
    matches: (path, method) => path === '/api/routines' && method === 'POST',
    handle: async (_path, _method, init) => {
      const payload = parseJsonBody(init?.body);
      const id = ensurePermanentId(payload?.id);
      const savedRoutine = { ...payload, id };
      await nextTick();
      return createJsonResponse(savedRoutine);
    }
  },
  {
    matches: (path, method) => path.startsWith('/api/routines/') && method === 'PUT',
    handle: async (path, _method, init) => {
      const body = parseJsonBody(init?.body) ?? {};
      const idFromPath = path.split('/').pop();
      const savedRoutine = { ...body, id: body.id ?? idFromPath };
      await nextTick();
      return createJsonResponse(savedRoutine);
    }
  },
  {
    matches: (path, method) => path.startsWith('/api/routines/') && method === 'DELETE',
    handle: async () => {
      await nextTick();
      return new Response(null, { status: 204 });
    }
  },
  {
    matches: (path, method) => path.startsWith('/api/sync/') || path.startsWith('/api/notifications/'),
    handle: async () => {
      await nextTick();
      return createJsonResponse({ ok: true });
    }
  }
];

function parseJsonBody(body: BodyInit | null | undefined): any {
  if (!body) return undefined;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  }
  if (body instanceof Blob) {
    return undefined;
  }
  return undefined;
}

function ensurePermanentId(originalId?: string): string {
  if (originalId && !originalId.startsWith('temp_')) {
    return originalId;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local_${Math.random().toString(36).slice(2)}`;
}

function createJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload ?? null), {
    status,
    headers: JSON_HEADERS
  });
}

function readJsonFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizePath(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return toPath(input);
  }

  if (input instanceof URL) {
    return input.pathname;
  }

  return toPath((input as Request).url);
}

function toPath(candidate: string): string {
  try {
    const url = new URL(candidate, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return url.pathname;
  } catch {
    return candidate.startsWith('/') ? candidate : `/${candidate}`;
  }
}

function extractMethod(input: RequestInfo | URL, init: RequestInit): string {
  if (init.method) {
    return init.method.toUpperCase();
  }

  if (typeof input === 'object' && 'method' in input) {
    return (input as Request).method?.toUpperCase() ?? 'GET';
  }

  return 'GET';
}

async function nextTick(): Promise<void> {
  await Promise.resolve();
}

function readFlagFromStorage(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem('featureFlags');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.remote_apis === 'boolean') {
      return parsed.remote_apis;
    }
    if (typeof parsed.sync_enabled === 'boolean') {
      return parsed.sync_enabled;
    }
    return null;
  } catch {
    return null;
  }
}



