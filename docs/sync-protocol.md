# Phase B+C Sync Protocol & Conflict Resolution

## Sync Protocol Overview

### Core Principles
1. **Offline-first**: All operations work offline, sync is optional
2. **Event sourcing**: Immutable event log as source of truth
3. **Idempotent operations**: Safe to retry without side effects
4. **Conflict awareness**: Detect and resolve concurrent edits
5. **Incremental sync**: Only transfer changes since last checkpoint

### Sync Flow
```
Device A                    Cloud Sync Server                Device B
    |                             |                             |
    |--1. Auth + Device Check ---->|                             |
    |<--2. Last Checkpoint -------|                             |
    |                             |                             |
    |--3. Upload Outbox ---------->|                             |
    |<--4. New Checkpoint --------|                             |
    |                             |                             |
    |--5. Download Changes ------>|--6. Store Changes -------->|
    |                             |                             |
    |--7. Ack Download ---------->|                             |
    |<--8. Final Checkpoint -----|                             |
```

## Sync API Endpoints

### Authentication & Device Registration
```typescript
POST /api/sync/register
{
  "deviceId": "device-abc123",
  "deviceInfo": {
    "platform": "web",
    "version": "1.0.0",
    "lastCheckpoint": null
  }
}

Response: 200 OK
{
  "deviceId": "device-abc123",
  "registeredAt": "2024-01-15T10:30:00Z",
  "quotas": {
    "eventsPerDay": 1000,
    "storageMB": 100
  }
}
```

### Upload Events (Outbox Sync)
```typescript
POST /api/sync/upload
{
  "deviceId": "device-abc123",
  "checkpoint": "cp-20240115-103000",
  "events": [
    {
      "id": "event::device-abc123::1705320600000::0::abc123def",
      "timestamp": 1705320600000,
      "version": 1,
      "type": "study_session_created",
      "deviceId": "device-abc123",
      "data": {
        "subject": "Mathematics",
        "duration": 120,
        "startTime": 1705320600000,
        "endTime": 1705321800000,
        "sessionId": "session-abc123"
      }
    }
  ]
}

Response: 200 OK
{
  "checkpoint": "cp-20240115-103500",
  "accepted": 1,
  "rejected": 0,
  "conflicts": []
}
```

### Download Changes
```typescript
GET /api/sync/download?since=cp-20240115-103000&device=device-abc123

Response: 200 OK
{
  "checkpoint": "cp-20240115-104000",
  "events": [...],
  "hasMore": false,
  "serverTime": "2024-01-15T10:40:00Z"
}
```

## Conflict Resolution Strategies

### Conflict Detection
Conflicts occur when:
1. **Same entity modified** by different devices within sync window
2. **Concurrent deletions** of the same entity
3. **Schema mismatches** between client and server
4. **Constraint violations** during merge

### Resolution Policies by Entity Type

#### 1. Study Sessions (Version-based with User Merge)
```typescript
interface StudySessionConflict {
  type: 'study_session';
  entityId: string;
  versions: ConflictVersion[];
  resolution: 'keep_newest' | 'keep_oldest' | 'merge' | 'user_choice';
}

// Resolution logic
function resolveStudySessionConflict(conflict: StudySessionConflict): StudySession {
  if (conflict.resolution === 'keep_newest') {
    return conflict.versions.reduce((newest, current) => 
      current.timestamp > newest.timestamp ? current : newest
    );
  }
  
  if (conflict.resolution === 'merge') {
    // Merge non-conflicting fields, prompt user for conflicts
    return mergeStudySessionFields(conflict.versions);
  }
  
  // Otherwise prompt user for choice
  return promptUserForResolution(conflict);
}
```

#### 2. Tasks (Last-Write-Wins by Timestamp + Device)
```typescript
interface TaskConflict {
  type: 'task';
  entityId: string;
  versions: TaskVersion[];
}

// Resolution logic: Sort by (timestamp, deviceId) and take latest
function resolveTaskConflict(conflict: TaskConflict): Task {
  return conflict.versions.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.deviceId.localeCompare(b.deviceId);
  })[0];
}
```

#### 3. Badges (Set Union)
```typescript
interface BadgeConflict {
  type: 'badge';
  entityId: string;
  badges: BadgeEarned[];
}

// Resolution logic: Keep all unique badges
function resolveBadgeConflict(conflict: BadgeConflict): BadgeEarned[] {
  const uniqueBadges = new Map<string, BadgeEarned>();
  
  conflict.badges.forEach(badge => {
    const existing = uniqueBadges.get(badge.badgeId);
    if (!existing || badge.earnedAt > existing.earnedAt) {
      uniqueBadges.set(badge.badgeId, badge);
    }
  });
  
  return Array.from(uniqueBadges.values());
}
```

#### 4. Settings (Field-Level Merge)
```typescript
interface SettingsConflict {
  type: 'settings';
  key: string;
  values: SettingsValue[];
}

// Resolution logic: Most recent wins, except for array/set operations
function resolveSettingsConflict(conflict: SettingsConflict): any {
  if (conflict.key === 'study_subjects') {
    // Merge subject lists, remove duplicates
    const allSubjects = conflict.values.flatMap(v => v.value);
    return [...new Set(allSubjects)];
  }
  
  if (conflict.key === 'daily_goal_minutes') {
    // Take maximum value (more conservative)
    return Math.max(...conflict.values.map(v => v.value));
  }
  
  // Default: most recent wins
  return conflict.values.reduce((newest, current) => 
    current.timestamp > newest.timestamp ? current : newest
  ).value;
}
```

## Checkpoint Management

### Checkpoint Format
```typescript
interface SyncCheckpoint {
  id: string;                    // Format: cp-YYYYMMDD-HHMMSS
  deviceId: string;              // Device that created checkpoint
  timestamp: number;             // Checkpoint creation time
  lastEventId: string;           // Last synchronized event ID
  eventCount: number;            // Events in this checkpoint
  hash: string;                  // SHA-256 hash of event IDs
  version: number;               // Protocol version
  metadata: {
    totalEvents: number;         // Total events in database
    firstEventId: string;        // First event in checkpoint
    lastEventTimestamp: number;  // Last event timestamp
  };
}
```

### Checkpoint Creation Logic
```typescript
async function createCheckpoint(deviceId: string): Promise<SyncCheckpoint> {
  const events = await getEventsSinceLastCheckpoint(deviceId);
  const eventIds = events.map(e => e.id);
  
  const checkpoint: SyncCheckpoint = {
    id: generateCheckpointId(),
    deviceId,
    timestamp: Date.now(),
    lastEventId: eventIds[eventIds.length - 1] || null,
    eventCount: events.length,
    hash: await computeMerkleHash(eventIds),
    version: 2,
    metadata: {
      totalEvents: await getTotalEventCount(),
      firstEventId: eventIds[0] || null,
      lastEventTimestamp: events[events.length - 1]?.timestamp || 0
    }
  };
  
  await saveCheckpoint(checkpoint);
  return checkpoint;
}
```

## Error Handling & Retry Logic

### Retry Strategy
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;        // Base delay in milliseconds
  maxDelay: number;         // Maximum delay
  backoffFactor: number;    // Exponential backoff factor
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2
};

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let attempt = 0;
  
  while (attempt < config.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      if (attempt === config.maxAttempts) {
        throw error;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retry attempts exceeded');
}
```

### Error Classification
```typescript
type SyncErrorType = 
  | 'network_error'           // Retry with backoff
  | 'auth_error'             // Require re-authentication
  | 'quota_exceeded'         // Wait for quota reset
  | 'conflict_error'         // Require conflict resolution
  | 'validation_error'       // Fix data issue
  | 'server_error'           // Retry with exponential backoff
  | 'schema_mismatch'        // Require migration/upgrade
  | 'device_not_registered'  // Re-register device

interface SyncError {
  type: SyncErrorType;
  message: string;
  retryable: boolean;
  userAction?: string;       // What user should do
  timestamp: number;
}
```

## Data Validation & Integrity

### Event Validation Rules
```typescript
interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
}

const EVENT_VALIDATION_RULES: Record<EventType, ValidationRule[]> = {
  'study_session_created': [
    { field: 'subject', required: true, type: 'string', min: 1, max: 100 },
    { field: 'duration', required: true, type: 'number', min: 1, max: 1440 },
    { field: 'startTime', required: true, type: 'number' },
    { field: 'endTime', required: true, type: 'number' },
    { field: 'sessionId', required: true, type: 'string' }
  ],
  'task_created': [
    { field: 'title', required: true, type: 'string', min: 1, max: 200 },
    { field: 'priority', required: true, type: 'string', enum: ['low', 'medium', 'high'] },
    { field: 'completed', required: true, type: 'boolean' },
    { field: 'taskId', required: true, type: 'string' }
  ]
};

function validateEvent(event: AppEvent): ValidationResult {
  const rules = EVENT_VALIDATION_RULES[event.type];
  const errors: string[] = [];
  
  for (const rule of rules) {
    const value = event.data[rule.field];
    
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`${rule.field} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (typeof value !== rule.type) {
        errors.push(`${rule.field} must be of type ${rule.type}`);
        continue;
      }
      
      if (rule.min && typeof value === 'number' && value < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }
      
      if (rule.max && typeof value === 'number' && value > rule.max) {
        errors.push(`${rule.field} must be at most ${rule.max}`);
      }
      
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }
      
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Performance Optimization

### Batching Strategy
```typescript
interface SyncBatch {
  id: string;
  events: AppEvent[];
  size: number;               // Bytes
  eventCount: number;
  timestamp: number;
}

async function createOptimalBatches(events: AppEvent[]): Promise<SyncBatch[]> {
  const MAX_BATCH_SIZE = 1024 * 1024; // 1MB
  const MAX_EVENTS_PER_BATCH = 100;
  const batches: SyncBatch[] = [];
  let currentBatch: SyncBatch | null = null;
  
  for (const event of events) {
    const eventSize = JSON.stringify(event).length;
    
    if (!currentBatch || 
        currentBatch.size + eventSize > MAX_BATCH_SIZE ||
        currentBatch.eventCount >= MAX_EVENTS_PER_BATCH) {
      
      currentBatch = {
        id: generateBatchId(),
        events: [],
        size: 0,
        eventCount: 0,
        timestamp: Date.now()
      };
      batches.push(currentBatch);
    }
    
    currentBatch.events.push(event);
    currentBatch.size += eventSize;
    currentBatch.eventCount++;
  }
  
  return batches;
}
```

### Compression
```typescript
async function compressEventData(events: AppEvent[]): Promise<string> {
  const json = JSON.stringify(events);
  
  // Use CompressionStream if available
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Response(json).body!.pipeThrough(new CompressionStream('gzip'));
    const compressed = await new Response(stream).text();
    return btoa(compressed);
  }
  
  // Fallback to base64 encoding
  return btoa(json);
}

async function decompressEventData(compressed: string): Promise<AppEvent[]> {
  try {
    // Try to decode as base64
    const decoded = atob(compressed);
    
    // Try to decompress if it looks like gzip
    if (decoded.startsWith('\x1f\x8b')) {
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new Response(decoded).body!.pipeThrough(new DecompressionStream('gzip'));
        const decompressed = await new Response(stream).text();
        return JSON.parse(decompressed);
      }
    }
    
    // Otherwise treat as plain JSON
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Failed to decompress event data: ${error}`);
  }
}
```