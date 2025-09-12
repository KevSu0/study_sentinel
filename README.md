# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Storage System v2

This application features a comprehensive IndexedDB storage system with:

### Key Features
- **Type Safety**: Full TypeScript schema definitions with compile-time validation
- **Data Governance**: Automated policies for timestamp normalization and sync management
- **Performance**: Optimized indexing and query patterns with development monitoring
- **Testing**: 100% test coverage with functional, performance, and edge-case scenarios
- **Schema Governance**: Automated CI validation to prevent schema drift

### Quick Start
```typescript
import { StorageManagerV2 } from '@/lib/storage-v2';

// Initialize storage
const storage = new StorageManagerV2('your-device-id');
await storage.initialize();

// Add an event
const eventId = await storage.addEvent({
  type: 'study_session_created',
  deviceId: 'your-device-id',
  sessionId: 'session-123',
  data: {
    subject: 'Mathematics',
    duration: 3600000,
    startTime: Date.now(),
    endTime: Date.now() + 3600000,
    sessionId: 'session-123'
  }
});

// Query events
const recentEvents = await storage.getEvents({
  startTime: Date.now() - 86400000, // Last 24 hours
  endTime: Date.now()
});
```

### Development Features
```typescript
// Performance monitoring (development only)
if (process.env.NODE_ENV === 'development') {
  const metrics = storage.getPerformanceMetrics();
  console.log('Performance metrics:', metrics);
}
```

### Documentation
- [Release Notes](docs/RELEASE_NOTES_v2.md) - Detailed v2.0 changes and migration guide
- [Architecture Decision Record](docs/adr/adr-001-indexeddb-typing-governance.md) - Technical decisions and rationale
- [Schema Reference](docs/storage-schema-manifest.yaml) - Human-readable schema definition

### Testing
```bash
# Run storage tests
npm test -- --testPathPatterns=storage

# Validate schema consistency
node scripts/validate-schema-manifest.js
```
