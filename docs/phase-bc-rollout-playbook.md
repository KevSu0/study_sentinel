# Phase B+C Rollout Playbook

## Quick Reference Guide

### Feature Flags Status Dashboard

```bash
# Current flag states (example)
analytics_v2:          ✅ ENABLED (100%)
sync_enabled:          ❌ DISABLED
sync_uplink:          ❌ DISABLED
sync_downlink:        ❌ DISABLED
push_enabled:         ❌ DISABLED
e2ee_enabled:         ❌ DISABLED
emergency_stop_sync:  ❌ DISABLED
emergency_stop_push:  ❌ DISABLED
maintenance_mode:     ❌ DISABLED
```

### Emergency Commands

```bash
# Emergency stop all features
curl -X POST https://api.studysentinel.com/admin/emergency/stop \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Enable maintenance mode
curl -X POST https://api.studysentinel.com/admin/maintenance/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check system health
curl -X GET https://api.studysentinel.com/health
```

## Slice 1: Storage & Analytics (Day 1-2)

### Pre-Deployment Checklist

- [ ] **Backup Strategy**: Create v1 database backup
- [ ] **Migration Scripts**: Test migration scripts on staging
- [ ] **Rollback Plan**: Document rollback procedures
- [ ] **Monitoring**: Set up monitoring for storage operations
- [ ] **Alerting**: Configure alert thresholds

### Deployment Steps

1. **Prepare Environment**
   ```bash
   # Create backup
   ./scripts/backup-db.sh v1
   
   # Deploy migration scripts
   ./scripts/deploy-migration.sh
   
   # Verify deployment
   ./scripts/verify-deployment.sh
   ```

2. **Enable Feature Flags**
   ```bash
   # Enable analytics v2
   curl -X POST https://api.studysentinel.com/features/flags/analytics_v2 \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "boolean"}'
   
   # Enable export/import
   curl -X POST https://api.studysentinel.com/features/flags/data_export \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "boolean"}'
   ```

3. **Monitor Rollout**
   ```bash
   # Check migration progress
   curl -X GET https://api.studysentinel.com/admin/migration/status
   
   # Monitor performance
   curl -X GET https://api.studysentinel.com/admin/performance/storage
   
   # Check error rates
   curl -X GET https://api.studysentinel.com/admin/errors/storage
   ```

### Validation Checks

- [ ] Migration completes successfully
- [ ] All data accessible after migration
- [ ] Performance metrics within SLA
- [ ] Export/import functionality working
- [ ] No data loss or corruption

### Rollback Procedures

1. **If migration fails**:
   ```bash
   # Stop migration
   curl -X POST https://api.studysentinel.com/admin/migration/stop
   
   # Restore from backup
   ./scripts/restore-db.sh v1
   
   # Disable new features
   curl -X POST https://api.studysentinel.com/features/flags/analytics_v2 \
     -H "Content-Type: application/json" \
     -d '{"enabled": false}'
   ```

2. **If performance degrades**:
   ```bash
   # Disable rollup compaction
   curl -X POST https://api.studysentinel.com/features/flags/rollup_compaction \
     -H "Content-Type: application/json" \
     -d '{"enabled": false}'
   
   # Monitor improvement
   ./scripts/monitor-performance.sh
   ```

## Slice 2: Sync Uplink (Day 3-4)

### Pre-Deployment Checklist

- [ ] **API Endpoints**: Deploy sync API endpoints
- [ ] **Database Schema**: Verify sync tables created
- [ ] **Authentication**: Test auth flow
- [ ] **Rate Limiting**: Configure rate limits
- [ ] **Quotas**: Set storage and request quotas

### Deployment Steps

1. **Deploy Sync Infrastructure**
   ```bash
   # Deploy API endpoints
   ./scripts/deploy-sync-api.sh
   
   # Set up rate limiting
   ./scripts/setup-rate-limiting.sh
   
   # Configure quotas
   ./scripts/setup-quotas.sh
   ```

2. **Enable Sync Features**
   ```bash
   # Enable sync
   curl -X POST https://api.studysentinel.com/features/flags/sync_enabled \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "boolean"}'
   
   # Enable uplink only
   curl -X POST https://api.studysentinel.com/features/flags/sync_uplink \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "boolean"}'
   ```

3. **Configure Rollout**
   ```bash
   # Start with 1% of users
   curl -X POST https://api.studysentinel.com/features/flags/sync_enabled \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 1}'
   
   # Monitor for 1 hour
   ./scripts/monitor-sync.sh 3600
   
   # Gradually increase to 100%
   curl -X POST https://api.studysentinel.com/features/flags/sync_enabled \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 100}'
   ```

### Validation Checks

- [ ] Sync uploads working correctly
- [ ] Data integrity maintained
- [ ] Performance within SLA
- [ ] Error rates within limits
- [ ] User adoption positive

### Rollback Procedures

1. **If sync fails**:
   ```bash
   # Emergency stop
   curl -X POST https://api.studysentinel.com/admin/emergency/stop-sync
   
   # Disable sync features
   curl -X POST https://api.studysentinel.com/features/flags/sync_enabled \
     -H "Content-Type: application/json" \
     -d '{"enabled": false}'
   
   # Clear outbox
   ./scripts/clear-outbox.sh
   ```

2. **If performance issues**:
   ```bash
   # Throttle sync
   curl -X POST https://api.studysentinel.com/admin/sync/throttle \
     -H "Content-Type: application/json" \
     -d '{"batchSize": 10, "delay": 5000}'
   
   # Monitor improvement
   ./scripts/monitor-sync-performance.sh
   ```

## Slice 3: Full Sync (Day 8-9)

### Pre-Deployment Checklist

- [ ] **Conflict Resolution**: Test all conflict scenarios
- [ ] **Convergence Testing**: Verify multi-device sync
- [ ] **Performance Testing**: Test with large datasets
- [ ] **Security Testing**: Verify data protection
- [ ] **User Interface**: Test sync status UI

### Deployment Steps

1. **Enable Downlink**
   ```bash
   # Enable downlink
   curl -X POST https://api.studysentinel.com/features/flags/sync_downlink \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 10}'
   ```

2. **Monitor Convergence**
   ```bash
   # Monitor conflict rates
   curl -X GET https://api.studysentinel.com/admin/sync/conflicts
   
   # Monitor convergence time
   curl -X GET https://api.studysentinel.com/admin/sync/convergence
   
   # Monitor data integrity
   curl -X GET https://api.studysentinel.com/admin/sync/integrity
   ```

3. **Gradual Rollout**
   ```bash
   # Increase to 50%
   curl -X POST https://api.studysentinel.com/features/flags/sync_downlink \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 50}'
   
   # Monitor for 4 hours
   ./scripts/monitor-sync.sh 14400
   
   # Increase to 100%
   curl -X POST https://api.studysentinel.com/features/flags/sync_downlink \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 100}'
   ```

### Validation Checks

- [ ] Bidirectional sync working
- [ ] Conflicts resolved correctly
- [ ] Multi-device convergence successful
- [ ] Performance within SLA
- [ ] User satisfaction positive

### Rollback Procedures

1. **If convergence fails**:
   ```bash
   # Pause downlink
   curl -X POST https://api.studysentinel.com/features/flags/sync_downlink \
     -H "Content-Type: application/json" \
     -d '{"enabled": false}'
   
   # Investigate conflicts
   ./scripts/investigate-conflicts.sh
   
   # Fix and retry
   ./scripts/fix-conflicts.sh
   ```

## Slice 4: Push Notifications (Day 11-12)

### Pre-Deployment Checklist

- [ ] **Push Service**: Configure push service integration
- [ ] **Certificates**: Set up push certificates
- [ ] **Consent UI**: Test consent flow
- [ ] **Quiet Hours**: Test quiet hours functionality
- [ ] **Channel Management**: Test channel settings

### Deployment Steps

1. **Configure Push Service**
   ```bash
   # Set up push service
   ./scripts/setup-push-service.sh
   
   # Configure certificates
   ./scripts/setup-push-certificates.sh
   
   # Test push service
   ./scripts/test-push-service.sh
   ```

2. **Enable Push Features**
   ```bash
   # Enable push
   curl -X POST https://api.studysentinel.com/features/flags/push_enabled \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 5}'
   
   # Enable channels
   curl -X POST https://api.studysentinel.com/features/flags/push_channel_reminders \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 5}'
   
   curl -X POST https://api.studysentinel.com/features/flags/push_channel_streak \
     -H "Content-Type: application/json" \
     -d '{"enabled": true, "type": "percentage", "value": 5}'
   ```

3. **Monitor Delivery**
   ```bash
   # Monitor delivery rates
   curl -X GET https://api.studysentinel.com/admin/push/delivery
   
   # Monitor opt-in rates
   curl -X GET https://api.studysentinel.com/admin/push/optin
   
   # Monitor quiet hours compliance
   curl -X GET https://api.studysentinel.com/admin/push/quiet-hours
   ```

### Validation Checks

- [ ] Push notifications delivered
- [ ] Opt-in flow working
- [ ] Quiet hours respected
- [ ] Channel management working
- [ ] Delivery rates > 90%

### Rollback Procedures

1. **If delivery issues**:
   ```bash
   # Pause push
   curl -X POST https://api.studysentinel.com/features/flags/push_enabled \
     -H "Content-Type: application/json" \
     -d '{"enabled": false}'
   
   # Investigate delivery issues
   ./scripts/investigate-push-issues.sh
   
   # Fix and retry
   ./scripts/fix-push-issues.sh
   ```

## Emergency Procedures

### System-Wide Emergency Stop

```bash
# Stop all features
curl -X POST https://api.studysentinel.com/admin/emergency/stop-all \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Put system in maintenance mode
curl -X POST https://api.studysentinel.com/admin/maintenance/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Notify team
./scripts/notify-team.sh "EMERGENCY: System-wide stop activated"

# Begin investigation
./scripts/emergency-investigation.sh
```

### Data Corruption Emergency

```bash
# Stop all writes
curl -X POST https://api.studysentinel.com/admin/maintenance/enable \
  -H "Content-Type: application/json" \
  -d '{"readOnly": true}'

# Backup current state
./scripts/emergency-backup.sh

# Restore from last known good state
./scripts/emergency-restore.sh

# Investigate corruption
./scripts/investigate-corruption.sh

# Notify users
./scripts/notify-users.sh "We experienced a data issue and have restored from backup"
```

### Performance Emergency

```bash
# Enable aggressive caching
curl -X POST https://api.studysentinel.com/admin/performance/enable-caching \
  -H "Content-Type: application/json" \
     -d '{"level": "aggressive"}'

# Throttle background tasks
curl -X POST https://api.studysentinel.com/admin/performance/throttle-tasks \
  -H "Content-Type: application/json" \
     -d '{"throttleLevel": 0.1}'

# Disable non-critical features
curl -X POST https://api.studysentinel.com/features/flags/analytics_v2 \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Monitor improvement
./scripts/monitor-performance-emergency.sh
```

## Monitoring Commands

### Health Checks

```bash
# System health
curl -X GET https://api.studysentinel.com/health

# Database health
curl -X GET https://api.studysentinel.com/health/database

# Sync health
curl -X GET https://api.studysentinel.com/health/sync

# Push health
curl -X GET https://api.studysentinel.com/health/push
```

### Performance Monitoring

```bash
# Response times
curl -X GET https://api.studysentinel.com/admin/performance/response-times

# Error rates
curl -X GET https://api.studysentinel.com/admin/performance/error-rates

# Resource usage
curl -X GET https://api.studysentinel.com/admin/performance/resource-usage

# User activity
curl -X GET https://api.studysentinel.com/admin/performance/user-activity
```

### Business Metrics

```bash
# User adoption
curl -X GET https://api.studysentinel.com/admin/metrics/adoption

# Feature usage
curl -X GET https://api.studysentinel.com/admin/metrics/feature-usage

# User satisfaction
curl -X GET https://api.studysentinel.com/admin/metrics/satisfaction

# Support tickets
curl -X GET https://api.studysentinel.com/admin/metrics/support-tickets
```

## Troubleshooting Guide

### Common Issues

#### Sync Issues
```bash
# Check sync status
curl -X GET https://api.studysentinel.com/admin/sync/status

# Check outbox
curl -X GET https://api.studysentinel.com/admin/sync/outbox

# Check conflicts
curl -X GET https://api.studysentinel.com/admin/sync/conflicts

# Clear stuck sync
curl -X POST https://api.studysentinel.com/admin/sync/clear-stuck
```

#### Push Issues
```bash
# Check push status
curl -X GET https://api.studysentinel.com/admin/push/status

# Check subscriptions
curl -X GET https://api.studysentinel.com/admin/push/subscriptions

# Test push
curl -X POST https://api.studysentinel.com/admin/push/test \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-device", "message": "Test notification"}'
```

#### Performance Issues
```bash
# Check slow queries
curl -X GET https://api.studysentinel.com/admin/performance/slow-queries

# Check memory usage
curl -X GET https://api.studysentinel.com/admin/performance/memory

# Check disk usage
curl -X GET https://api.studysentinel.com/admin/performance/disk
```

## Post-Launch Checklist

### Week 1
- [ ] **Daily Monitoring**: Check all metrics daily
- [ ] **User Feedback**: Collect and analyze user feedback
- [ ] **Bug Fixes**: Address critical bugs immediately
- [ ] **Performance**: Monitor performance closely
- [ ] **Support**: Prepare support team for increased volume

### Week 2-4
- [ ] **Feature Refinement**: Refine based on usage patterns
- [ ] **Performance Optimization**: Optimize based on real usage
- [ ] **Documentation**: Update documentation based on feedback
- [ ] **Training**: Train support team on new features
- [ ] **Marketing**: Plan feature promotion

### Month 2-3
- [ ] **Analytics Review**: Review usage analytics
- [ ] **User Research**: Conduct user interviews
- [ ] **Feature Planning**: Plan next iteration
- [ ] **Performance Review**: Review performance metrics
- [ ] **Cost Analysis**: Analyze infrastructure costs

## Contact Information

### Emergency Contacts
- **Lead Developer**: [Phone] | [Email] | [Slack]
- **DevOps Engineer**: [Phone] | [Email] | [Slack]
- **Product Manager**: [Phone] | [Email] | [Slack]
- **Support Lead**: [Phone] | [Email] | [Slack]

### Documentation
- **API Documentation**: https://docs.studysentinel.com/api
- **User Documentation**: https://docs.studysentinel.com/user
- **Admin Documentation**: https://docs.studysentinel.com/admin
- **Playbook**: https://docs.studysentinel.com/playbook

### Support Channels
- **Slack**: #studysentinel-support
- **Email**: support@studysentinel.com
- **Phone**: +1-555-STUDY
- **Status Page**: https://status.studysentinel.com

This playbook provides the essential information needed to successfully roll out Phase B+C features while maintaining system stability and user experience. Keep this document handy during the rollout process and update it as needed based on lessons learned.