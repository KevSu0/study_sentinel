# Release Notes: Timezone Update to IST

## Short version (for in-app notifications)
🇮🇳 **New:** Your study day now follows IST (4:00 AM - 4:00 AM) for more accurate daily stats. Compare with the previous UTC view using the toggle in analytics.

## Medium version (for email/update center)
**Timezone Update: Study Day Now Uses IST**

We've aligned your study day with Indian Standard Time (IST) to better reflect your actual study patterns. Your daily totals now include all sessions from 4:00 AM to 4:00 AM IST.

**What's new:**
- Study day boundary: 4:00 AM IST (was 4:00 AM UTC)
- Analytics default to IST with 30-day Legacy comparison
- Exports include timezone metadata
- Clear IST labels on all timestamps

**Use the toggle:** On analytics pages, switch between "New (IST)" and "Legacy (UTC)" to compare results during the transition.

## Long version (for blog/detailed changelog)
**Major Update: Timezone Alignment to Indian Standard Time (IST)**

We're excited to announce a significant improvement to how Study Sentinel calculates your daily study statistics. After extensive feedback from our Indian user base, we've aligned the app's study-day boundary with Indian Standard Time (IST).

### Key Changes

1. **Study Day Boundary**: Now runs from 4:00 AM to 4:00 AM IST (previously 4:00 AM to 4:00 AM UTC)

2. **Local Time Alignment**: Sessions now group according to local Indian study patterns:
   - Late-night studying (after 4 AM IST) counts toward the same day
   - Early morning sessions (before 4 AM IST) belong to the previous day

3. **Enhanced Transparency**:
   - All timestamps display IST timezone indicators
   - Analytics include timezone metadata in exports
   - 30-day comparison period with Legacy view

### Why This Matters

Previously, the UTC-based boundary created confusion for Indian users:
- A session at 11:00 PM IST was counted toward the next day
- Daily totals often didn't match users' expectations
- Export data required manual timezone calculations

This change ensures your study statistics accurately reflect how you experience each day.

### Migration Support

- **30-Day Comparison**: Use the "New (IST)/Legacy (UTC)" toggle on analytics pages
- **Export Options**: Choose between IST and Legacy formats during transition
- **Detailed Help**: Comprehensive FAQ available in the Help Center
- **Support Ready**: Our team is prepared to answer any questions

### Technical Details

- Raw timestamp storage remains in UTC (best practice)
- Only day-boundary calculations have changed
- All existing features remain unchanged
- Zero impact on session data integrity

### Next Steps

1. Check your analytics with the new IST default
2. Use the Legacy toggle to compare historical data
3. Export reports in both formats during the 30-day window
4. Reach out to support with any questions

We're confident this change will provide a clearer, more intuitive study tracking experience for our Indian users.

---

*Questions? See our [Timezone Update FAQ] or contact support.*