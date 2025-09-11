# Study Sentinel PWA Implementation Guide

## Overview

Study Sentinel is a Progressive Web App (PWA) that provides a fully installable, offline-capable study tracking experience with AI-powered features.

## PWA Architecture

### Core Components

1. **Service Worker** (`src/worker/index.ts`)
   - Enhanced Workbox implementation
   - Tiered caching strategy
   - Offline fallbacks
   - Background sync

2. **Web App Manifest** (`public/manifest.json`)
   - Complete PWA configuration
   - App icons and screenshots
   - Install prompts
   - Shortcuts

3. **PWA Components** (`src/components/pwa/`)
   - `offline-gate.tsx` - AI feature offline gating
   - `update-notification.tsx` - Update management
   - `performance-monitor.tsx` - Performance tracking

4. **Self-Hosted Assets** (`public/fonts/`)
   - Inter font family (weights: 300, 400, 500, 600, 700)
   - Optimized WOFF2 format
   - Local font loading with fallbacks

## Cache Strategy

### Cache Tiers

| Tier | Strategy | Max Entries | Max Age | Use Case |
|------|----------|-------------|----------|----------|
| Evergreen | Cache First | 100 | 1 year | Fonts, icons, core assets |
| Static | Cache First | 200 | 30 days | Static images, CSS/JS |
| Publicity | Stale-While-Revalidate | 60 | 60 days | CDN images, banners |
| Audio | Cache First | 20 | 30 days | Sound effects |
| API | Stale-While-Revalidate | ∞ | 6 hours | API responses |

### Cache Matching Rules

```typescript
// Evergreen assets
request.destination === 'font' || 
request.destination === 'manifest' ||
request.url.includes('/fonts/') ||
request.url.includes('/icons/')

// Static images
request.destination === 'image' && 
!request.url.includes('actions.google.com') &&
!request.url.includes('placehold.co')

// Publicity assets
request.destination === 'image' && 
(request.url.includes('placehold.co') || 
 request.url.includes('cdn') ||
 request.url.includes('unsplash'))

// Audio files
request.destination === 'audio' || 
request.url.includes('actions.google.com')
```

## Performance Budgets

### Target Metrics
- **Cold Start (offline)**: < 2.0 seconds
- **First Stats Paint**: < 1.2 seconds
- **App Shell Size**: ≤ 1.2 MB (compressed)
- **Cache Usage**: ≤ 50 MB (dynamic assets)

### Monitoring
Performance metrics are tracked in real-time via the `PerformanceMonitor` component, available in settings.

## Offline Experience

### AI Features
- **Briefing** (`/briefing`) - Offline when no network
- **Chat** (`/chat`) - Offline when no network
- Clear offline UI with retry options
- No network calls made when offline

### Core Features
- **All other routes** work completely offline
- Data stored in localStorage
- Real-time stats calculation
- No network dependency

## Installation & Updates

### Installation
1. **Browser Install Prompt**: Automatic on supported browsers
2. **Manual Install**: Add to Home Screen from browser menu
3. **Requirements**: Modern browser with PWA support

### Update Flow
1. **Detection**: Service worker checks for updates hourly
2. **Notification**: User notified when update available
3. **Activation**: Update applied on user confirmation or next restart

## Asset Management

### Adding New Assets

#### Evergreen Assets
1. Place in appropriate directory (`public/fonts/`, `public/icons/`)
2. Add to service worker precache (automatic)
3. Update asset manifest if needed

#### Publicity Assets
1. Add via CDN or local hosting
2. Configure appropriate cache tier
3. Set proper cache limits

### Font Management

#### Self-Hosted Fonts
- **Inter** (primary): Weights 300, 400, 500, 600, 700
- **JetBrains Mono** (secondary): For code and timers
- **Location**: `public/fonts/`
- **Format**: WOFF2 with optimal compression

#### Font Loading
```css
font-display: swap;
src: local('Font Name'), url('/fonts/font.woff2') format('woff2');
```

## Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Test PWA features
npm run start
```

### PWA Testing
```bash
# Run Lighthouse audit
npm run analyze

# Test offline functionality
# Use Chrome DevTools > Application > Service Workers
```

## Troubleshooting

### Common Issues

#### Service Worker Not Registering
- Check HTTPS requirement (except localhost)
- Verify service worker scope
- Clear browser cache and retry

#### Offline Features Not Working
- Verify service worker is active
- Check cache storage in DevTools
- Ensure proper cache strategies configured

#### Font Loading Issues
- Verify font files exist in `public/fonts/`
- Check CSS @font-face rules
- Verify font MIME types in server config

#### App Not Installable
- Verify manifest.json is accessible
- Check service worker registration
- Ensure proper HTTPS setup

### Debug Tools

#### Chrome DevTools
- **Application Tab**: Service workers, cache storage, manifest
- **Network Tab**: Offline testing, cache hits
- **Performance Tab**: Load time analysis

#### Lighthouse
- PWA audit category
- Performance metrics
- Best practices validation

## Browser Support

### Fully Supported
- Chrome 90+
- Edge 90+
- Firefox 90+
- Safari 15+

### Limited Support
- Mobile browsers (varies by version)
- Older browsers (no PWA features)

## Security Considerations

### Cache Security
- All assets served over HTTPS
- Cache keys versioned automatically
- Sensitive data never cached

### Font Licensing
- Inter font: SIL Open Font License
- Verify licenses before adding new fonts
- Self-hosting ensures license compliance

## Future Enhancements

### Phase B (Future)
- Data synchronization backend
- Push notifications
- Background sync for offline changes
- Advanced offline analytics

### Phase C (Advanced)
- IndexedDB for large datasets
- Service worker updates without reload
- Advanced caching strategies
- Offline data export/import

## Contributing

### Adding PWA Features
1. Follow the cache tiering strategy
2. Test offline functionality
3. Update documentation
4. Verify performance budgets

### Performance Guidelines
1. Monitor cache sizes regularly
2. Test cold start performance
3. Verify offline capabilities
4. Keep app shell size minimal

## Support

For PWA-related issues:
1. Check browser compatibility
2. Verify service worker status
3. Consult troubleshooting guide
4. Review performance metrics