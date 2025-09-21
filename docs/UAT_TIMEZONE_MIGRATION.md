# UAT Script: Timezone Migration to IST

## Test Environment Setup

- **Browser**: Chrome, Firefox, Safari, Edge
- **Device**: Desktop, Tablet, Mobile
- **User Roles**: Regular user, Power user, Admin
- **Test Data**: Sessions spanning 3:40-4:20 IST boundary

## Test Cases

### 1. Boundary Edge Case Verification

**Objective**: Verify sessions are correctly split across day boundaries

**Steps**:
1. Create test sessions at:
   - 3:40 AM IST (previous day)
   - 3:59 AM IST (previous day)
   - 4:00 AM IST (new day)
   - 4:20 AM IST (new day)
2. Navigate to Analytics dashboard
3. Toggle between New (IST) and Legacy (UTC) views
4. Verify daily totals match expected boundaries

**Expected Results**:
- New view: 3:40-3:59 AM sessions count toward previous day
- New view: 4:00-4:20 AM sessions count toward new day
- Legacy view: All sessions group according to UTC 4 AM boundary
- Toggle updates totals immediately without page refresh

### 2. SSR/CSR Parity Check

**Objective**: Ensure server and client render identical time labels

**Steps**:
1. Hard refresh analytics page (Ctrl+Shift+R)
2. Observe timestamp labels during loading
3. Compare with labels after full hydration
4. Check all timezone labels include "IST" suffix
5. Test on slow 3G network connection

**Expected Results**:
- No visible shift in labels during hydration
- All timestamps show consistent timezone indication
- No hydration mismatch errors in console

### 3. Mobile Accessibility Test

**Objective**: Verify mobile usability and accessibility

**Steps**:
1. Open app on mobile device (or Chrome DevTools mobile emulation)
2. Navigate to analytics page
3. Test timezone toggle:
   - Tap target size ≥44×44px
   - Toggle operates with VoiceOver/TalkBack
   - Sufficient color contrast (4.5:1 minimum)
4. Test modal:
   - Scrollable if content exceeds viewport
   - Focus trap works correctly
   - Dismissible with outside tap or escape key

**Expected Results**:
- All interactive elements accessible without zoom
- Screen reader announces timezone changes correctly
- No horizontal scrolling required
- Touch targets adequately spaced

### 4. Export Reconciliation Test

**Objective**: Verify exports include correct metadata and boundaries

**Steps**:
1. Navigate to export functionality
2. Select 7-day date range with boundary-spanning sessions
3. Export in New (IST) format
4. Export in Legacy (UTC) format
5. Verify metadata fields:
   ```json
   {
     "timezone": "Asia/Kolkata",
     "boundaryRule": "IST_4AM",
     "exportDate": "2024-01-15"
   }
   ```
6. Reconcile daily totals between formats

**Expected Results**:
- IST export totals differ from UTC only at boundary
- Metadata fields present and correctly formatted
- No data loss between formats
- Export completes within 30 seconds

### 5. Toggle Persistence Test

**Objective**: Verify user preference persistence

**Steps**:
1. Navigate to analytics page
2. Switch to Legacy view
3. Navigate to different page
4. Return to analytics page
5. Verify view preference persisted
6. Clear browser cache
7. Repeat test
8. Test in private browsing mode

**Expected Results**:
- Preference persists across navigation
- Default to New (IST) for new sessions/private browsing
- No console errors related to localStorage

### 6. Banner and Modal Behavior

**Objective**: Verify comms components display correctly

**Steps**:
1. Clear localStorage to simulate first visit
2. Verify banner appears at top of app
3. Dismiss banner
4. Navigate to analytics page
5. Verify modal appears
6. Dismiss modal with "Got it" button
7. Refresh page
8. Verify neither banner nor modal reappear

**Expected Results**:
- Banner dismissible and stays dismissed
- Modal appears only on first analytics visit
- Links open help center in new tab
- No layout shift when components appear/disappear

## Accessibility Checklist

- [ ] All time labels have text alternatives
- [ ] Toggle has proper ARIA labels
- [ ] Modal has proper heading structure
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Keyboard navigation works for all controls
- [ ] Focus indicators are visible
- [ ] No title attributes on interactive elements
- [ ] Form errors associated with inputs

## Performance Criteria

- Page load time < 3 seconds on 3G
- Toggle response time < 100ms
- Export generation < 30 seconds
- No hydration layout shift

## Bug Reporting Template

**Description**:
**Steps to Reproduce**:
1.
2.
3.
**Expected Result**:
**Actual Result**:
**Browser/Device**:
**Screenshot/Recording**:

## Sign-off

UAT Tester: _______________ Date: _______________

QA Owner: _______________ Date: _______________

Release Approval: _______________ Date: _______________