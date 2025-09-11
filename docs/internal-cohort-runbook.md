# Internal Cohort Rollout Runbook - Slice 1 (Storage & Analytics)

## Quick Reference

### Emergency Commands
```bash
# Disable analytics_v2 immediately
localStorage.setItem('analytics_v2_disabled', 'true');

# Force refresh to apply changes
window.location.reload();

# Check current flag state
console.log('analytics_v2 enabled:', localStorage.getItem('analytics_v2_disabled') !== 'true');
```

### Thresholds Summary
- **Migration Success Rate**: 100% required
- **Cold Offline Start**: ≤ 2.0s
- **Stats TTR**: ≤ 1.2s
- **Rollup Errors**: 0 allowed
- **Compaction Duration**: ≤ 300ms (p95)
- **Storage Growth**: ≤ 10KB/day
- **User Regression Rate**: < 5%

## Monitoring Dashboard

### Real-time Metrics
```javascript
// Current Status Panel
const statusPanel = {
  migration: {
    successRate: 0,
    inProgress: 0,
    failed: 0,
    lastMigration: null
  },
  performance: {
    coldStart: 0,
    ttr: 0,
    compaction: 0,
    memoryUsage: 0
  },
  errors: {
    rollup: 0,
    migration: 0,
    storage: 0,
    total: 0
  },
  storage: {
    used: 0,
    quota: 0,
    growthRate: 0,
    backups: 0
  }
};
```

### Alert Thresholds
```javascript
const alerts = {
  critical: {
    migrationFailure: true,
    coldStartDegradation: true,
    dataLoss: true,
    storageQuota: true
  },
  warning: {
    compactionSlowdown: true,
    ttrDegradation: true,
    highMemoryUsage: true,
    storageGrowth: true
  }
};
```

## Canary Rollout Procedure

### Pre-flight Checklist ✅
- [ ] Migration backup verified on 2+ devices
- [ ] Monitoring dashboards active
- [ ] Runbook distributed to on-call team
- [ ] Canary devices identified and notified
- [ ] Rollback procedures tested
- [ ] Communication channels ready

### Step 1: Enable Canary (3-5 devices)
```javascript
// Enable for specific device IDs
const canaryDevices = ['device-001', 'device-002', 'device-003'];
const currentDeviceId = getCurrentDeviceId();

if (canaryDevices.includes(currentDeviceId)) {
  localStorage.removeItem('analytics_v2_disabled');
  console.log('Canary device - analytics_v2 enabled');
}
```

### Step 2: Monitor for 4 Hours
**Check every 30 minutes:**

1. **Migration Status**
   ```javascript
   // Check migration success
   const migrationStatus = await checkMigrationStatus();
   console.log('Migration success rate:', migrationStatus.successRate);
   ```

2. **Performance Metrics**
   ```javascript
   // Monitor performance
   const perfMetrics = await getPerformanceMetrics();
   console.log('Cold start time:', perfMetrics.coldStart);
   console.log('TTR:', perfMetrics.ttr);
   console.log('Compaction time:', perfMetrics.compaction);
   ```

3. **Error Tracking**
   ```javascript
   // Check for errors
   const errors = await getErrorCounts();
   console.log('Total errors:', errors.total);
   ```

### Step 3: Gate Decision
**GREEN LIGHT (Proceed to Small Cohort if ALL):**
- Migration success rate = 100%
- Cold offline start ≤ 2.0s
- Stats TTR ≤ 1.2s
- Rollup errors = 0
- Compaction p95 ≤ 300ms
- Storage growth ≤ 10KB/day
- No user complaints

**YELLOW LIGHT (Pause & Fix):**
- Any single threshold missed
- User feedback indicates issues
- Performance degradation observed

**RED LIGHT (Rollback):**
- Migration failures detected
- Data corruption suspected
- App crashes or freezes
- Storage quota exceeded

## Small Cohort Rollout (10-20% Internal)

### Enable Percentage Rollout
```javascript
// Enable for percentage of users
const rolloutPercentage = 15; // Start with 15%
const randomValue = Math.random() * 100;

if (randomValue <= rolloutPercentage) {
  localStorage.removeItem('analytics_v2_disabled');
  console.log('Small cohort - analytics_v2 enabled');
}
```

### Monitor for 24 Hours
**Enhanced Monitoring:**
- All canary thresholds
- Crash/lockup monitoring
- User regression rate tracking
- Battery impact assessment

## Full Internal Rollout (100%)

### Enable All Internal Users
```javascript
// Enable for all internal users
const isInternalUser = await checkInternalUserStatus();
if (isInternalUser) {
  localStorage.removeItem('analytics_v2_disabled');
  console.log('Full internal - analytics_v2 enabled');
}
```

### 48-hour Monitoring
- Keep flag hot-toggle ready
- Monitor all metrics continuously
- Prepare for Slice 2 planning

## Rollback Procedures

### Level 1: Feature Flag Disable (Immediate)
```javascript
// Disable immediately
function immediateRollback() {
  localStorage.setItem('analytics_v2_disabled', 'true');
  
  // Force reload
  window.location.reload();
  
  // Log rollback
  logRollbackEvent('immediate_feature_flag');
}
```

### Level 2: Clear Caches (5 minutes)
```javascript
// Clear application caches
async function clearCachesRollback() {
  try {
    // Clear IndexedDB v2
    await deleteDatabase('StudySentinelDB_v2');
    
    // Clear service worker cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Clear localStorage flags
    localStorage.removeItem('analytics_v2_disabled');
    localStorage.removeItem('migration_v2_complete');
    
    // Reload
    window.location.reload();
    
    logRollbackEvent('clear_caches');
  } catch (error) {
    console.error('Cache clear failed:', error);
  }
}
```

### Level 3: Full Restore (30 minutes)
```javascript
// Full restore from backup
async function fullRestoreRollback() {
  try {
    // Load backup
    const backupData = await loadMigrationBackup();
    
    // Restore v1 database
    await restoreV1Database(backupData);
    
    // Clear v2 data
    await clearV2Data();
    
    // Reset flags
    localStorage.setItem('analytics_v2_disabled', 'true');
    localStorage.removeItem('migration_v2_complete');
    
    // Notify user
    showNotification('Migration rolled back - data restored from backup');
    
    logRollbackEvent('full_restore');
  } catch (error) {
    console.error('Full restore failed:', error);
    showNotification('Rollback failed - contact support');
  }
}
```

## Live Monitoring Commands

### Check Migration Status
```javascript
async function checkMigrationStatus() {
  const migrationComplete = localStorage.getItem('migration_v2_complete');
  const migrationTimestamp = localStorage.getItem('migration_v2_timestamp');
  
  return {
    complete: migrationComplete === 'true',
    timestamp: migrationTimestamp ? parseInt(migrationTimestamp) : null,
    successRate: await calculateMigrationSuccessRate(),
    inProgress: await getMigrationsInProgress(),
    failed: await getFailedMigrations()
  };
}
```

### Check Performance Metrics
```javascript
async function getPerformanceMetrics() {
  const performance = await navigator.storage.estimate();
  const memory = performance.memory;
  
  return {
    coldStart: await measureColdStartTime(),
    ttr: await measureTimeToRender(),
    compaction: await getCompactionDuration(),
    memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
    storageUsage: performance.usage / (1024 * 1024),
    storageQuota: performance.quota / (1024 * 1024)
  };
}
```

### Check Error Counts
```javascript
async function getErrorCounts() {
  return {
    migration: await getMigrationErrorCount(),
    rollup: await getRollupErrorCount(),
    storage: await getStorageErrorCount(),
    total: await getTotalErrorCount()
  };
}
```

## Communication Templates

### Incident Notification
```
SUBJECT: URGENT - Analytics v2 Migration Incident

PRIORITY: Critical

STATUS: [INVESTIGATING|MITIGATING|RESOLVED]

IMPACT: [Number] users affected

DETAILS:
- Issue: [Brief description]
- Started: [Timestamp]
- Affected: [Cohort size]
- Actions: [Steps taken]

NEXT UPDATE: [Time]
```

### Status Update
```
SUBJECT: Analytics v2 Rollout Status Update

ROLLout PHASE: [Canary|Small Cohort|Full Internal]

PROGRESS: [X]%

KEY METRICS:
- Migration Success: [X]%
- Performance: [Status]
- Errors: [Count]

NEXT STEPS: [Planned actions]
```

## Escalation Path

### On-call Contacts
1. **Primary On-call**: [Name] - [Phone/Slack]
2. **Secondary On-call**: [Name] - [Phone/Slack]
3. **Engineering Lead**: [Name] - [Phone/Email]
4. **Product Manager**: [Name] - [Phone/Email]

### Escalation Matrix
```
Issue Severity | Response Time | Escalation Level
Critical      | 15 minutes   | Level 1 (On-call)
High          | 1 hour       | Level 2 (Lead)
Medium        | 4 hours      | Level 3 (Management)
Low           | 24 hours     | Level 4 (Team)
```

## Troubleshooting Guide

### Common Issues

#### Migration Stuck
```javascript
// Check migration status
const status = await checkMigrationStatus();
if (status.inProgress > 0) {
  console.log('Migration in progress - wait or restart');
}

// Force restart migration
localStorage.removeItem('migration_v2_complete');
localStorage.removeItem('migration_v2_timestamp');
window.location.reload();
```

#### Performance Degradation
```javascript
// Check memory usage
const memory = performance.memory;
if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
  console.warn('Memory usage critical');
  // Consider triggering compaction
}

// Check storage usage
const storage = await navigator.storage.estimate();
if (storage.usage / storage.quota > 0.8) {
  console.warn('Storage usage high');
}
```

#### Data Inconsistency
```javascript
// Validate data integrity
const validation = await validateDataIntegrity();
if (!validation.valid) {
  console.error('Data integrity issues:', validation.errors);
  // Consider rollback
}
```

## Success Criteria

### Canary Success (4 hours)
- [ ] Migration success rate = 100%
- [ ] Cold offline start ≤ 2.0s
- [ ] Stats TTR ≤ 1.2s
- [ ] Rollup errors = 0
- [ ] Compaction p95 ≤ 300ms
- [ ] Storage growth ≤ 10KB/day
- [ ] No user complaints

### Small Cohort Success (24 hours)
- [ ] All canary criteria met
- [ ] Crash/lockup rate = 0%
- [ ] User regression rate < 5%
- [ ] Battery impact within limits

### Full Internal Success (48 hours)
- [ ] All small cohort criteria met
- [ ] No incidents in 24 hours
- [ ] All dashboards stable
- [ ] Ready for Slice 2 planning

---
*Keep this runbook handy during rollout and update it based on lessons learned.*