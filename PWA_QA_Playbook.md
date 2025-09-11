# Study Sentinel PWA QA Playbook

## Test Environment Setup

### Required Tools
- **Chrome/Edge DevTools** for PWA debugging
- **Lighthouse** for PWA auditing
- **Network throttling** for offline testing
- **Mobile devices** for real-world testing

### Test Data
- Fresh browser profile
- Sample study sessions and tasks
- AI features test data

## Core PWA Tests

### 1. Installability Test

**Objective**: Verify app can be installed as PWA

**Steps**:
1. Open app in Chrome/Edge
2. Look for install prompt in address bar
3. Click install or use "Add to Home Screen"
4. Verify app opens in standalone mode
5. Check app has proper window controls

**Expected Results**:
- Install prompt appears automatically
- App installs successfully
- Standalone mode works correctly
- App icon displays properly

**Automation**:
```javascript
// Check install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install prompt triggered');
});
```

### 2. Offline Navigation Test

**Objective**: Verify core functionality works offline

**Steps**:
1. Install app or open in browser
2. Navigate to various routes:
   - `/` (Dashboard)
   - `/stats` (Statistics)
   - `/tasks` (Task Management)
   - `/timer` (Timer)
   - `/settings` (Settings)
3. Enable "Offline" mode in DevTools
4. Refresh page and navigate between routes
5. Verify all core features work

**Expected Results**:
- All static routes load offline
- Navigation works without network
- Data persists from localStorage
- No network errors in console

**Acceptance Criteria**:
- ✅ All 12 static routes work offline
- ✅ No network requests made
- ✅ User data loads correctly
- ✅ No broken UI elements

### 3. Font Loading Test

**Objective**: Verify self-hosted fonts work offline

**Steps**:
1. Clear browser cache
2. Load app online to cache fonts
3. Go offline
4. Refresh page
5. Inspect font rendering

**Expected Results**:
- Inter font renders correctly offline
- No font loading errors
- Proper font weights display
- No layout shift during font load

**Verification**:
```css
/* Check applied fonts */
font-family: 'Inter', sans-serif;
font-weight: 300|400|500|600|700;
```

### 4. AI Features Offline Test

**Objective**: Verify AI features properly disable offline

**Steps**:
1. Navigate to `/briefing` (AI Daily Briefing)
2. Go offline
3. Verify offline UI appears
4. Navigate to `/chat` (AI Chat)
5. Verify offline UI appears
6. Go back online
7. Verify features work normally

**Expected Results**:
- Offline gate UI appears for AI routes
- No network calls made when offline
- Retry functionality works
- Features restore when online

**Acceptance Criteria**:
- ✅ Briefing page shows offline UI
- ✅ Chat page shows offline UI
- ✅ No network requests in offline mode
- ✅ Retry button functionality works

### 5. Cache Management Test

**Objective**: Verify cache strategies work correctly

**Steps**:
1. Load app online
2. Navigate through various features
3. Check cache storage in DevTools
4. Verify cache tiers:
   - Evergreen (fonts, icons)
   - Static (images, CSS/JS)
   - Publicity (CDN images)
5. Test cache clearing functionality

**Expected Results**:
- All assets properly cached
- Cache size within limits (< 50MB)
- Cache clearing works
- Proper cache expiration

### 6. Performance Test

**Objective**: Verify performance budgets are met

**Steps**:
1. Open Chrome DevTools
2. Enable performance monitoring
3. Test cold start (clear cache, load app)
4. Measure key metrics:
   - Cold start time
   - First contentful paint
   - First stats paint
5. Test with network throttling

**Expected Results**:
- Cold start < 2.0 seconds
- First stats paint < 1.2 seconds
- App shell size < 1.2 MB
- Cache usage < 50 MB

### 7. Update Flow Test

**Objective**: Verify app update process works

**Steps**:
1. Deploy new version of app
2. Open existing installed app
3. Verify update notification appears
4. Test update flow:
   - Dismiss notification
   - Accept update
   - Verify app reloads
5. Check new version is active

**Expected Results**:
- Update notification appears
- User can defer or accept update
- Update applies correctly
- No data loss during update

### 8. Mobile Device Test

**Objective**: Verify PWA works on mobile devices

**Devices to Test**:
- iOS Safari (iPhone)
- Android Chrome
- Mobile Firefox

**Steps**:
1. Install PWA on device
2. Test offline functionality
3. Verify touch interactions
4. Check display modes
5. Test performance

**Expected Results**:
- PWA installs successfully
- Offline features work
- Touch interactions responsive
- Performance acceptable

## Regression Tests

### Service Worker Registration
```javascript
// Test service worker is registered
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration()
    .then(registration => {
      console.log('Service worker registered:', registration);
    });
}
```

### Cache Verification
```javascript
// Verify caches exist
caches.keys().then(cacheNames => {
  console.log('Available caches:', cacheNames);
});
```

### Network Status
```javascript
// Test online/offline detection
console.log('Online status:', navigator.onLine);
window.addEventListener('online', () => console.log('Online'));
window.addEventListener('offline', () => console.log('Offline'));
```

## Test Matrix

| Feature | Test Case | Expected Result | Priority |
|---------|-----------|------------------|----------|
| Installability | Install prompt appears | ✅ Pass | Critical |
| Offline Navigation | All static routes work offline | ✅ Pass | Critical |
| Font Loading | Self-hosted fonts render offline | ✅ Pass | High |
| AI Features | Proper offline gating | ✅ Pass | High |
| Cache Management | Assets cached correctly | ✅ Pass | Medium |
| Performance | Budgets met | ✅ Pass | High |
| Updates | Smooth update flow | ✅ Pass | Medium |
| Mobile | Works on mobile devices | ✅ Pass | High |

## Bug Reporting

### Information to Include
1. **Browser**: Name, version, OS
2. **Device**: Desktop/mobile, specifications
3. **Network**: Online/offline status
4. **Steps**: Exact reproduction steps
5. **Expected**: What should happen
6. **Actual**: What actually happened
7. **Console**: Errors or warnings
8. **Screenshots**: Visual evidence

### Common Issues
- Service worker not registering
- Fonts not loading offline
- Cache not working
- Install prompt not appearing
- Update not applying

## Test Automation

### Automated Checks
```javascript
// PWA feature detection
const isPWA = () => {
  return ('serviceWorker' in navigator) && 
         ('PushManager' in window) &&
         ('Notification' in window);
};

// Cache verification
const verifyCache = async () => {
  const cacheNames = await caches.keys();
  const expectedCaches = ['evergreen-assets', 'static-assets', 'publicity-assets'];
  return expectedCaches.every(cache => cacheNames.includes(cache));
};
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Run PWA Tests
  run: |
    npm run test:pwa
    npm run lighthouse
```

## Release Checklist

### Pre-Release
- [ ] All PWA tests pass
- [ ] Performance budgets met
- [ ] Lighthouse score > 90
- [ ] Mobile testing completed
- [ ] Documentation updated

### Post-Release
- [ ] Monitor install rates
- [ ] Track performance metrics
- [ ] Check for bug reports
- [ ] Update documentation if needed

## Success Criteria

### Must Pass
- ✅ Installable on all supported browsers
- ✅ All core features work offline
- ✅ Performance budgets met
- ✅ No console errors in offline mode
- ✅ Update flow works correctly

### Should Pass
- ✅ Mobile experience is good
- ✅ Cache sizes are reasonable
- ✅ User feedback is positive
- ✅ Documentation is complete