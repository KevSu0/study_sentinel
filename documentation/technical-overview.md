# Technical Overview

This document provides a comprehensive technical overview of the application's architecture and data management.

### **Database**

*   **Technology:** The application uses a hybrid database approach:
    *   **Client-side:** [`Dexie.js`](src/lib/db.ts:2) (a wrapper for IndexedDB) is used for local data storage, providing offline capabilities. The database schema is defined in `src/lib/db.ts`.
    *   **Server-side:** Firebase Firestore is used for data backup and synchronization, as configured in [`src/lib/firebase.ts`](src/lib/firebase.ts:2).

*   **Schema:** The client-side database schema is defined in the `MyDatabase` class in [`src/lib/db.ts`](src/lib/db.ts:44) and includes tables for `plans`, `users`, `sessions`, `stats_daily`, `meta`, `outbox`, `routines`, `logs`, and `badges`.

    ```typescript
    class MyDatabase extends Dexie {
      public plans!: Table<Plan, string>;
      public users!: Table<User, string>;
      public sessions!: Table<Session, string>;
      public stats_daily!: Table<DailyStat, string>;
      public meta!: Table<Meta, string>;
      public outbox!: Table<Outbox, number>;
      public routines!: Table<Routine, string>;
      public logs!: Table<LogEvent, string>;
      public badges!: Table<Badge, string>;

      constructor() {
        super('MyDatabase');
        this.version(5).stores({
          plans: 'id, date, status',
          users: 'id',
          sessions: 'id, date',
          stats_daily: 'date',
          meta: 'key',
          outbox: '++id',
          routines: 'id',
          logs: 'id, timestamp, type',
          badges: 'id',
        });
      }
    }
    ```

*   **Data Access:** Data is accessed through a repository pattern, with a `BaseRepository` class in [`src/lib/repositories/base.repository.ts`](src/lib/repositories/base.repository.ts:5) providing common CRUD operations and handling offline synchronization.

### **PWA (Progressive Web App)**

*   **Status:** The application is a PWA.
*   **Files:**
    *   [`public/manifest.json`](public/manifest.json:1): Configures the PWA with the name "KuKe's Motivation", a standalone display mode, and icons.
    *   [`public/sw.js`](public/sw.js:1): The service worker, which uses Workbox to implement caching strategies for offline support and background synchronization.

    ```javascript
    // public/sw.js
    importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.2.0/workbox-sw.js');

    workbox.routing.registerRoute(
      ({ request }) => request.destination === 'document',
      new workbox.strategies.CacheFirst()
    );

    workbox.routing.registerRoute(
      ({ request }) => request.destination === 'script' || request.destination === 'style',
      new workbox.strategies.StaleWhileRevalidate()
    );
    ```

### **Data Structures and Schema**

*   **Core Types:** The main data structures are defined in [`src/lib/types.ts`](src/lib/types.ts:1) and include types for `StudyTask`, `Routine`, `Badge`, `LogEvent`, `UserProfile`, and `CalendarEvent`.

    ```typescript
    // src/lib/types.ts
    export type StudyTask = {
      id: string;
      shortId: string;
      title: string;
      description?: string;
      time: string; // e.g., "09:00"
      date: string; // e.g., "2024-07-29"
      duration?: number; // in minutes, optional for infinity timer
      points: number;
      status: TaskStatus;
      priority: TaskPriority;
      timerType: TaskTimerType;
    };
    ```

*   **Validation:** Zod is used to define schemas for validating the inputs and outputs of AI-related flows.

### **Data Roles**

*   **Conclusion:** The application is a **single-user application**. There is no evidence of a multi-user system, different data access roles (e.g., "admin"), or a permissions system.

### **Data Flow**

*   **Centralized State:** The `useGlobalState` hook ([`src/hooks/use-global-state.tsx`](src/hooks/use-global-state.tsx:885)) acts as a single source of truth, managing the application's state in a centralized context.

*   **Pattern:**
    1.  Data is loaded from IndexedDB and localStorage into the `GlobalStateProvider`.
    2.  Components use the `useGlobalState` hook to access the state and functions to modify it.
    3.  User interactions in components trigger these functions, which update the state and persist the changes to IndexedDB.
    4.  A `SyncEngine` handles the synchronization of data between the client and Firebase.

    ```typescript
    // src/hooks/use-global-state.tsx
    export function GlobalStateProvider({children}: {children: ReactNode}) {
      const [state, setState] = useState<AppState>(initialAppState);

      useEffect(() => {
        const loadInitialData = async () => {
          // ...
        };
        loadInitialData();
      }, []);

      // ...
    }
    ```

### **Data Management (CRUD)**

*   **Repository Pattern:** CRUD operations are handled by the `BaseRepository` class ([`src/lib/repositories/base.repository.ts`](src/lib/repositories/base.repository.ts:5)), which provides methods for `add`, `getAll`, `getById`, `update`, and `delete`.

*   **Offline Support:** The repository pattern includes robust offline support, queueing operations in an `outbox` table when the application is offline and syncing them when the connection is restored.

    ```typescript
    // src/lib/repositories/base.repository.ts
    async add(item: T): Promise<TKey | undefined> {
      if (navigator.onLine) {
        try {
          return await this.table.add(item);
        } catch (error) {
          // ...
          await this.addToOutbox({ /* ... */ });
          return undefined;
        }
      } else {
        await this.addToOutbox({ /* ... */ });
        return undefined;
      }
    }
    ```

### **Credentials and Authentication**

*   **Conclusion:** The application **does not have an authentication system**. It operates as a client-side application with all data stored locally. While Firebase is configured, it is not used for user authentication.

### **Data Interaction with Components**

*   **Pattern:**
    *   **Data Consumption:** Components receive data from parent components via props.
    *   **Data Modification:** Components use callback functions (also passed as props) to create or update data. These callbacks are typically the functions provided by the `useGlobalState` hook.
    *   **Forms:** React Hook Form and Zod are used for form management and validation, as seen in the `AddItemDialog` component ([`src/components/tasks/add-task-dialog.tsx`](src/components/tasks/add-task-dialog.tsx:377)).

    ```typescript
    // src/components/tasks/add-task-dialog.tsx
    const { register, handleSubmit, control, reset, watch, formState: {errors} } = useForm<TaskFormData>({
      resolver: zodResolver(taskSchema),
      // ...
    });