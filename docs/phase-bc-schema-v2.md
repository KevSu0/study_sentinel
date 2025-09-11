# Phase B+C Schema Design v2

## Overview
IndexedDB v2 structure supporting sync, offline analytics, and advanced features while maintaining Phase A offline guarantees.

## Database Schema

### Core Tables

#### 1. `events` - Append-only event log
```typescript
interface EventRecord {
  id: string;                    // Format: event::<deviceId>::<millis>::<counter>::<rand9>
  timestamp: number;              // Milliseconds since epoch
  version: number;                // Event version, starts at 1
  type: EventType;               // Event type discriminator
  deviceId: string;              // Device identifier
  sessionId?: string;           // Session identifier (for session-related events)
  data: EventData;              // Event-specific data
  synced?: boolean;             // Sync status (optional, for optimization)
  syncCheckpoint?: string;      // Last sync checkpoint ID
  encrypted?: boolean;          // E2EE encryption status
}
```

#### 2. `outbox` - Pending sync operations
```typescript
interface OutboxRecord {
  id: string;                    // Outbox operation ID
  eventId: string;               // Reference to event
  operation: 'create' | 'update' | 'delete';
  timestamp: number;             // When operation was queued
  retryCount: number;           // Number of retry attempts
  lastAttempt?: number;         // Last sync attempt timestamp
  error?: string;               // Last error message
  priority: number;             // Sync priority (1-10, 1=highest)
}
```

#### 3. `checkpoints` - Sync state management
```typescript
interface CheckpointRecord {
  id: string;                    // Checkpoint ID (usually timestamp-based)
  deviceId: string;              // Device that created checkpoint
  timestamp: number;             // Checkpoint creation time
  lastEventId: string;           // Last synchronized event ID
  eventCount: number;            // Number of events in this checkpoint
  hash: string;                  // Merkle hash of events in checkpoint
  version: number;               // Checkpoint protocol version
}
```

#### 4. `rollups_*` - Pre-computed analytics
```typescript
interface RollupRecord {
  id: string;                    // Rollup ID (period + subject + type)
  period: 'day' | 'week' | 'month' | '7d' | '30d' | '90d';
  subject: string;               // Study subject
  type: 'duration' | 'count' | 'rating' | 'consistency' | 'heatmap';
  value: number;                 // Aggregated value
  metadata: RollupMetadata;      // Additional rollup context
  aggVersion: number;            // Aggregation version for rebuilds
  timestamp: number;             // When rollup was computed
}
```

#### 5. `settings` - Application and sync settings
```typescript
interface SettingsRecord {
  id: string;                    // Settings key
  value: any;                    // Settings value
  type: 'sync' | 'privacy' | 'analytics' | 'ui';
  version: number;               // Settings version
  timestamp: number;             // Last updated
  deviceId?: string;             // Device-specific settings
}
```

#### 6. `keys` - E2EE key management (optional)
```typescript
interface KeyRecord {
  id: string;                    // Key identifier
  type: 'encryption' | 'signing';
  keyData: ArrayBuffer;          // Encrypted key material
  keyInfo: KeyInfo;             // Key metadata (algorithm, created, expires)
  deviceId: string;              // Device that owns key
  active: boolean;               // Whether key is currently active
}
```

## Event Types

### Study Events
```typescript
type StudyEventType = 
  | 'study_session_created'
  | 'study_session_updated'
  | 'study_session_deleted';

interface StudyEventData {
  subject: string;
  duration: number;              // Minutes
  startTime: number;
  endTime: number;
  notes?: string;
  rating?: number;               // 1-5 scale
  tags?: string[];
  sessionId: string;             // Unique session identifier
}
```

### Task Events
```typescript
type TaskEventType = 
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_deleted';

interface TaskEventData {
  title: string;
  description?: string;
  subject?: string;
  dueDate?: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  estimatedTime?: number;        // Minutes
  taskId: string;                // Unique task identifier
}
```

### Badge Events
```typescript
type BadgeEventType = 
  | 'badge_earned'
  | 'badge_revoked';

interface BadgeEventData {
  badgeId: string;
  badgeName: string;
  criteria: string;
  earnedAt: number;
  sessionId?: string;
}
```

### Settings Events
```typescript
type SettingsEventType = 'settings_updated';

interface SettingsEventData {
  key: string;
  oldValue: any;
  newValue: any;
  category: string;
}
```

## Index Strategy

### Events Table Indexes
- `by_timestamp`: [timestamp] - For chronological queries
- `by_device_timestamp`: [deviceId, timestamp] - For device-specific queries
- `by_session_id`: [sessionId] - For session-related queries
- `by_type_timestamp`: [type, timestamp] - For type-specific queries
- `by_sync_status`: [synced, timestamp] - For sync optimization

### Outbox Table Indexes
- `by_priority`: [priority, timestamp] - For sync queue processing
- `by_retry_count`: [retryCount, timestamp] - For retry logic

### Checkpoints Table Indexes
- `by_device_time`: [deviceId, timestamp] - For sync state management
- `by_version`: [version, timestamp] - For protocol upgrades

## Migration Strategy

### v1 to v2 Migration
1. **Backup existing data** before migration
2. **Create new v2 schema** alongside v1
3. **Migrate events** with ID transformation to new format
4. **Rebuild rollups** using new aggregation logic
5. **Create initial checkpoint** at migration time
6. **Drop v1 tables** after verification
7. **Update application** to use v2 schema

### Data Validation
- **Event count** preserved between v1 and v2
- **Total study time** matches within 0.1%
- **All sessions** have valid subjects and durations
- **Rollup consistency** verified against raw events
- **Checkpoint hashes** validate correctly

## Performance Considerations

### Storage Optimization
- **Event compression** for large text fields (notes, descriptions)
- **Rollup compaction** during idle periods
- **Outbox cleanup** after successful sync
- **Checkpoint pruning** (keep last 30 days)

### Query Optimization
- **Index-only scans** for common queries
- **Cursor-based pagination** for large datasets
- **Materialized views** for complex analytics
- **Read-only transactions** for reporting

## Security & Privacy

### Data Protection
- **Field-level encryption** for sensitive data (notes, personal info)
- **Device isolation** through deviceId scoping
- **Zero PII** in event payloads by default
- **Consent tracking** for sync and analytics

### Access Control
- **Device-specific keys** for E2EE
- **Permission-based sync** (read/write/delete)
- **Audit logging** for data access
- **Data retention** policies enforced

## Backup & Recovery

### Export Format
```json
{
  "version": "2.0",
  "exportedAt": "2024-01-15T10:30:00Z",
  "deviceId": "abc123-def456",
  "checksum": "sha256:abc123...",
  "data": {
    "events": [...],
    "settings": [...],
    "rollups": [...]
  }
}
```

### Recovery Process
1. **Validate checksum** before import
2. **Check version compatibility**
3. **Merge with existing data** (user choice)
4. **Rebuild rollups** after import
5. **Create recovery checkpoint**