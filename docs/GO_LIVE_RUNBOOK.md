# Go-Live Runbook: IST Timezone Migration

## Quick Reference
- **Boundary**: 4:00 AM IST = 22:30 UTC (previous day)
- **Feature Flag**: `NEXT_PUBLIC_ENABLE_TIMEZONE_V2`
- **Kill Switch**: `TIMEZONE_LAUNCH_CONFIG.killSwitch.enabled`
- **Monitoring**: `/admin/timezone-metrics` (internal)

---

## Timeline Checklist

### T-48 Hours
- [ ] Freeze all UI changes unrelated to timezone
- [ ] Confirm Help Center article is live and linked
- [ ] Load support macros in helpdesk system
- [ ] Verify all team members have runbook access

### T-24 Hours
- [ ] **CRITICAL**: Update Day-0 timestamp in `src/config/launch-config.ts`
- [ ] Validate feature flags:
  - `rolloutStages`: [0.1, 0.5, 1.0]
  - `defaultView`: "new"
  - `showLegacyToggle`: true
  - `killSwitch.enabled`: false
- [ ] Smoke test on staging:
  - Banner displays correctly
  - Toggle switches views
  - Modal appears on first analytics visit
  - Exports include metadata

### T-8 Hours
- [ ] Enable banner and modal for all users
- [ ] Final accessibility check
- [ ] Verify SSR/CSR parity on time labels
- [ ] Confirm monitoring dashboards are receiving data

---

## Launch Day (T-0)

### At Day-0 IST Timestamp
1. **Deploy to 100%** (Immediate Full Rollout)
   ```bash
   # Set environment variable for full rollout
   NEXT_PUBLIC_TIMEZONE_CANARY_PERCENTAGE=100
   npm run deploy
   ```

2. **Verify Launch**
   - [ ] Banner appears for all users
   - [ ] Analytics page shows timezone toggle
   - [ ] Default view is New (IST)
   - [ ] Legacy option is available
   - [ ] Telemetry events flowing

3. **Start 30-day timer**
   - Mark calendar: Day-30 = 2025-10-22
   - Schedule Day-7/14/30 review meetings
   - **Note**: No gate reviews needed - immediate full rollout complete

---

## Post-Launch Monitoring

### Immediate Monitoring (First 24 hours)
- [ ] Monitor system health and performance
- [ ] Check support ticket volume
- [ ] Verify telemetry data collection
- [ ] Review user feedback

### Ongoing Monitoring
- Daily system health checks
- Weekly user sentiment analysis
- Monthly review of toggle usage
- Continue until Day-30 for deprecation decision

---

## Monitoring Commands

```bash
# Check current metrics
curl -X POST https://api.example.com/timezone-metrics

# Toggle kill switch (emergency)
curl -X POST https://api.example.com/timezone-kill-switch \
  -d '{"enabled": true, "reason": "High error rate"}'

# Check cohort assignment
echo "User123" | node -e "
  const userId = require('fs').readFileSync(0, 'utf8').trim();
  console.log('Cohort:', isInRolloutCohort(userId, 1) ? '10%' :
               isInRolloutCohort(userId, 2) ? '50%' : '0%');
"
```

---

## Emergency Procedures

### Immediate Rollback
1. Set kill switch:
   ```javascript
   // In admin console
   TIMEZONE_LAUNCH_CONFIG.killSwitch = {
     enabled: true,
     reason: "High error rate - rollback"
   };
   ```
2. Verify all users see Legacy view
3. Communicate rollback to users
4. Investigate root cause

### Critical Escalations
- **P0**: Release Manager → Engineering Lead → CTO
- **P1**: Engineering Lead → Release Manager
- **Support**: Support Lead → Product Manager

---

## 30-Day Window Activities

### Weekly Reviews (Day 7/14/21/28)
- [ ] Review diff telemetry
- [ ] Check support ticket trends
- [ ] Analyze toggle usage patterns
- [ ] Update stakeholders

### Day 30: End Comparison Window
- [ ] Update toggle message: "Legacy export available until Day-120"
- [ ] Remove "New/Legacy" toggle from analytics
- [ ] Keep Legacy export option

---

## Legacy Export Deprecation Timeline

### Day 60: 60-Day Notice
- [ ] In-app toast notification
- [ ] Update Help Center
- [ ] Notify support team

### Day 90: 30-Day Notice
- [ ] Banner in export dialog
- [ ] Email to power users
- [ ] Support blog post

### Day 120: Final Removal
- [ ] Remove Legacy export option
- [ ] Update all documentation
- [ ] Archive migration code

---

## Contact List

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| Release Manager | | | |
| Engineering Lead | | | |
| QA Lead | | | |
| Support Lead | | | |
| Product Manager | | | |

---

## Post-Launch

### Day 1
- [ ] Send launch summary to stakeholders
- [ ] Archive launch metrics
- [ ] Document lessons learned

### Day 7
- [ ] First stakeholder review
- [ ] Adjust comms if needed

### Day 30+
- [ ] Final retrospective
- [ ] Cleanup temporary code
- [ ] Update runbooks

---

*Keep this page bookmarked during launch week*