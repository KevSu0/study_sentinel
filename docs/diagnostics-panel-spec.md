# Diagnostics Panel Specification
# User-facing system health and performance monitoring

## Panel Overview

**Location**: Settings → Diagnostics Tab  
**Access**: Always available (works offline)  
**Scope**: System health, performance, storage, PWA status  

---

## 1. **PANEL LAYOUT**

### 1.1 **Main Sections**

```
┌─────────────────────────────────────────────────────────────┐
│ 🩺 System Diagnostics                                    │
├─────────────────────────────────────────────────────────────┤
│ [📊 System Status]  [💾 Storage]  [⚡ Performance]  [🔧]  │
├─────────────────────────────────────────────────────────────┤
│                                                         │
│ 📊 SYSTEM STATUS                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Service Worker: ✅ v1.2.3 (Active)                   │ │
│ │ Cache: ✅ Healthy (24.3 MB used)                     │ │
│ │ Database: ✅ IndexedDB v2                             │ │
│ │ Network: 🟡 Offline (Last online: 2 min ago)          │ │
│ │ Sync: ⚪ Disabled                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                         │
│ 💾 STORAGE                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Used: 24.3 MB / 100 MB (24.3%)                       │ │
│ │ Events: 2,847 records                                │ │
│ │ Settings: 12 KB                                       │ │
│ │ Cache: 22.1 MB                                       │ │
│ │ [Clear Publicity Cache] [Storage Details]             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚡ PERFORMANCE                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Cold Start: 1.2s                                     │ │
│ │ First Paint: 0.8s                                    │ │
│ │ DB Query Avg: 12ms                                   │ │
│ │ Last Compaction: 2 hours ago                         │ │
│ │ Roll-up Health: ✅ Good                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                         │
│ 🔧 ACTIONS                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [📋 Collect Diagnostics] [🔄 Clear All Caches]      │ │
│ │ [💾 Export Backup] [🗑️ Reset Local Data]          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. **SYSTEM STATUS SECTION**

### 2.1 **Service Worker Status**

```typescript
interface ServiceWorkerStatus {
  status: 'installed' | 'installing' | 'activated' | 'redundant' | 'error';
  version: string;
  scriptURL: string;
  state: ServiceWorkerState;
  controlled: boolean;
}

// Display Logic
function renderServiceWorkerStatus(status: ServiceWorkerStatus): ReactNode {
  const statusIcon = {
    'activated': '✅',
    'installed': '⏳',
    'installing': '🔄',
    'redundant': '⚠️',
    'error': '❌'
  }[status.status];

  return (
    <div className="flex items-center justify-between">
      <span>Service Worker: {statusIcon} v{status.version} ({status.status})</span>
      <button onClick={updateServiceWorker}>Update</button>
    </div>
  );
}
```

### 2.2 **Cache Status**

```typescript
interface CacheStatus {
  totalSize: number; // bytes
  tiers: {
    appShell: number;
    runtime: number;
    publicity: number;
  };
  entryCount: number;
  lastUpdated: Date;
}

function renderCacheStatus(cache: CacheStatus): ReactNode {
  const totalSizeMB = (cache.totalSize / 1024 / 1024).toFixed(1);
  const health = cache.totalSize > 100 * 1024 * 1024 ? 'warning' : 'good';
  
  return (
    <div className="space-y-2">
      <div>Cache: {health === 'good' ? '✅' : '⚠️'} {totalSizeMB} MB used</div>
      <div className="text-sm text-muted-foreground">
        App Shell: {(cache.tiers.appShell / 1024 / 1024).toFixed(1)} MB
        Runtime: {(cache.tiers.runtime / 1024 / 1024).toFixed(1)} MB
        Publicity: {(cache.tiers.publicity / 1024 / 1024).toFixed(1)} MB
      </div>
    </div>
  );
}
```

### 2.3 **Database Status**

```typescript
interface DatabaseStatus {
  version: string;
  ready: boolean;
  eventCount: number;
  lastMigration: Date | null;
  estimatedSize: number;
}

function renderDatabaseStatus(db: DatabaseStatus): ReactNode {
  return (
    <div className="space-y-1">
      <div>Database: {db.ready ? '✅' : '❌'} IndexedDB v{db.version}</div>
      <div className="text-sm text-muted-foreground">
        {db.eventCount.toLocaleString()} events • 
        {(db.estimatedSize / 1024 / 1024).toFixed(1)} MB
      </div>
    </div>
  );
}
```

### 2.4 **Network Status**

```typescript
interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastOnline: Date | null;
}

function renderNetworkStatus(network: NetworkStatus): ReactNode {
  const statusIcon = network.online ? '🟢' : '🟡';
  const statusText = network.online ? 'Online' : 'Offline';
  const lastOnline = network.lastOnline 
    ? ` (Last online: ${formatDistanceToNow(network.lastOnline)} ago)`
    : '';
  
  return (
    <div className="space-y-1">
      <div>Network: {statusIcon} {statusText}{lastOnline}</div>
      {network.online && (
        <div className="text-sm text-muted-foreground">
          {network.effectiveType} • {network.downlink} Mbps • {network.rtt}ms RTT
        </div>
      )}
    </div>
  );
}
```

---

## 3. **STORAGE SECTION**

### 3.1 **Storage Breakdown**

```typescript
interface StorageBreakdown {
  total: {
    used: number;
    quota: number;
    percentage: number;
  };
  breakdown: {
    events: number;
    settings: number;
    cache: number;
    other: number;
  };
  estimates: {
    dailyGrowth: number;
    projectedLimit: Date;
  };
}

function renderStorageBreakdown(storage: StorageBreakdown): ReactNode {
  const { total, breakdown } = storage;
  const usedMB = (total.used / 1024 / 1024).toFixed(1);
  const quotaMB = (total.quota / 1024 / 1024).toFixed(1);
  
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm">
          <span>Storage Usage</span>
          <span>{usedMB} MB / {quotaMB} MB ({total.percentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${total.percentage > 90 ? 'bg-red-500' : total.percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(total.percentage, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>📊 Study Events</span>
          <span>{(breakdown.events / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>⚙️ Settings</span>
          <span>{(breakdown.settings / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>🗂️ Cache</span>
          <span>{(breakdown.cache / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>📦 Other</span>
          <span>{(breakdown.other / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      </div>
    </div>
  );
}
```

### 3.2 **Storage Actions**

```typescript
interface StorageActionsProps {
  onClearPublicityCache: () => Promise<void>;
  onShowStorageDetails: () => void;
}

function StorageActions({ onClearPublicityCache, onShowStorageDetails }: StorageActionsProps): ReactNode {
  return (
    <div className="flex gap-2">
      <button 
        onClick={onClearPublicityCache}
        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
      >
        Clear Publicity Cache
      </button>
      <button 
        onClick={onShowStorageDetails}
        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
      >
        Storage Details
      </button>
    </div>
  );
}
```

---

## 4. **PERFORMANCE SECTION**

### 4.1 **Performance Metrics**

```typescript
interface PerformanceMetrics {
  coldStart: number; // ms
  firstPaint: number; // ms
  dbQueryAvg: number; // ms
  lastCompaction: Date | null;
  rollupHealth: {
    status: 'good' | 'warning' | 'error';
    lastSuccess: Date | null;
    errorCount: number;
  };
  memory: {
    used: number; // MB
    available: number; // MB
  };
}

function renderPerformanceMetrics(perf: PerformanceMetrics): ReactNode {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Cold Start</div>
          <div className={perf.coldStart > 2000 ? 'text-yellow-600' : 'text-green-600'}>
            {perf.coldStart}ms
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">First Paint</div>
          <div className={perf.firstPaint > 1200 ? 'text-yellow-600' : 'text-green-600'}>
            {perf.firstPaint}ms
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">DB Query Avg</div>
          <div className={perf.dbQueryAvg > 50 ? 'text-yellow-600' : 'text-green-600'}>
            {perf.dbQueryAvg}ms
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Memory</div>
          <div className="text-green-600">
            {perf.memory.used.toFixed(1)} MB
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Last Compaction</div>
        <div className="text-sm">
          {perf.lastCompaction 
            ? `${formatDistanceToNow(perf.lastCompaction)} ago`
            : 'Never'
          }
        </div>
        
        <div className="text-sm text-muted-foreground">Roll-up Health</div>
        <div className={`text-sm ${perf.rollupHealth.status === 'good' ? 'text-green-600' : perf.rollupHealth.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
          {perf.rollupHealth.status === 'good' ? '✅ Good' : perf.rollupHealth.status === 'warning' ? '⚠️ Warning' : '❌ Error'}
          {perf.rollupHealth.errorCount > 0 && ` (${perf.rollupHealth.errorCount} errors)`}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. **ACTIONS SECTION**

### 5.1 **Diagnostics Collection**

```typescript
interface DiagnosticsBundle {
  timestamp: Date;
  version: string;
  userAgent: string;
  platform: string;
  diagnostics: {
    serviceWorker: ServiceWorkerStatus;
    storage: StorageBreakdown;
    performance: PerformanceMetrics;
    network: NetworkStatus;
    database: DatabaseStatus;
  };
  logs: string[];
}

async function collectDiagnostics(): Promise<DiagnosticsBundle> {
  const bundle: DiagnosticsBundle = {
    timestamp: new Date(),
    version: '1.0.0',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    diagnostics: {
      serviceWorker: await getServiceWorkerStatus(),
      storage: await getStorageBreakdown(),
      performance: await getPerformanceMetrics(),
      network: await getNetworkStatus(),
      database: await getDatabaseStatus()
    },
    logs: await getRecentLogs()
  };
  
  return bundle;
}

function DiagnosticsActions() {
  const [isCollecting, setIsCollecting] = useState(false);
  
  const handleCollectDiagnostics = async () => {
    setIsCollecting(true);
    try {
      const bundle = await collectDiagnostics();
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-sentinel-diagnostics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to collect diagnostics:', error);
    } finally {
      setIsCollecting(false);
    }
  };
  
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={handleCollectDiagnostics}
        disabled={isCollecting}
        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
      >
        {isCollecting ? '📋 Collecting...' : '📋 Collect Diagnostics'}
      </button>
      
      <button
        onClick={clearAllCaches}
        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
      >
        🔄 Clear All Caches
      </button>
      
      <button
        onClick={exportBackup}
        className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
      >
        💾 Export Backup
      </button>
      
      <button
        onClick={resetLocalData}
        className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
      >
        🗑️ Reset Local Data
      </button>
    </div>
  );
}
```

### 5.2 **Action Confirmations**

```typescript
// Clear Caches Confirmation
function confirmClearCaches(): Promise<boolean> {
  return new Promise((resolve) => {
    if (confirm('Clear all caches? This will force re-download of all assets.')) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

// Reset Data Confirmation
function confirmResetData(): Promise<boolean> {
  return new Promise((resolve) => {
    if (confirm('⚠️ WARNING: This will delete all your study data and settings. This action cannot be undone.\n\nAre you sure you want to continue?')) {
      const confirmed = confirm('🚨 FINAL CONFIRMATION: All data will be permanently deleted.\n\nType "DELETE" to confirm:');
      resolve(confirmed);
    } else {
      resolve(false);
    }
  });
}
```

---

## 6. **OFFLINE FUNCTIONALITY**

### 6.1 **Offline Guarantees**

✅ **Always Available**: Panel loads completely offline  
✅ **No Dependencies**: Works without network connection  
✅ **Self-Contained**: All functionality available offline  
✅ **Graceful Degradation**: Shows cached data when live data unavailable  

### 6.2 **Offline Data Sources**

```typescript
interface OfflineDataCache {
  lastSystemStatus: SystemStatus | null;
  lastStorageMetrics: StorageBreakdown | null;
  lastPerformanceMetrics: PerformanceMetrics | null;
  lastUpdated: Date | null;
}

class OfflineDataCache {
  private cache: OfflineDataCache = {
    lastSystemStatus: null,
    lastStorageMetrics: null,
    lastPerformanceMetrics: null,
    lastUpdated: null
  };
  
  async update(data: Partial<OfflineDataCache>): Promise<void> {
    this.cache = { ...this.cache, ...data, lastUpdated: new Date() };
    localStorage.setItem('diagnostics_cache', JSON.stringify(this.cache));
  }
  
  get(): OfflineDataCache {
    return this.cache;
  }
  
  async load(): Promise<void> {
    const cached = localStorage.getItem('diagnostics_cache');
    if (cached) {
      this.cache = JSON.parse(cached);
    }
  }
}
```

---

## 7. **ACCEPTANCE CRITERIA**

### 7.1 **Functionality**

- [ ] Panel loads completely offline
- [ ] All diagnostic metrics display correctly
- [ ] Actions work without breaking app-shell
- [ ] Data updates when coming back online
- [ ] Performance metrics are accurate
- [ ] Storage usage is calculated correctly

### 7.2 **User Experience**

- [ ] Clear visual indicators for system health
- [ ] Intuitive action buttons with confirmations
- [ ] Progress feedback for long operations
- [ ] Error messages are user-friendly
- [ ] Mobile-responsive layout

### 7.3 **Technical**

- [ ] No memory leaks
- [ ] Efficient data collection
- [ ] Proper error handling
- [ ] Accessible markup
- [ ] Performance optimized

---

## 8. **IMPLEMENTATION CHECKLIST**

- [ ] Create diagnostics panel component
- [ ] Implement data collection utilities
- [ ] Add offline data caching
- [ ] Create action handlers with confirmations
- [ ] Add progress indicators
- [ ] Implement responsive design
- [ ] Add accessibility features
- [ ] Write comprehensive tests
- [ ] Add error logging
- [ ] Document API surface

---

*Generated: 2024-01-15*
*Version: 1.0.0*