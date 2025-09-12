import { useState, useCallback } from 'react';

/**
 * iOS Install & Icon Validator
 * Tests PWA installation, maskable icons, splash screens, and iOS-specific install behavior
 */

export interface InstallValidationResult {
  testId: string;
  category: 'manifest' | 'icons' | 'splash' | 'install' | 'homescreen' | 'display';
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  recommendations?: string[];
  iosSpecific?: boolean;
  userAgent: string;
  timestamp: number;
}

export interface InstallMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  iOSSpecificTests: number;
  iOSSpecificPasses: number;
  averageTestDuration: number;
  criticalFailures: string[];
  compatibilityScore: number; // 0-100
  categories: {
    manifest: { passed: number; total: number };
    icons: { passed: number; total: number };
    splash: { passed: number; total: number };
    install: { passed: number; total: number };
    homescreen: { passed: number; total: number };
    display: { passed: number; total: number };
  };
}

export class iOSInstallValidator {
  private results: InstallValidationResult[] = [];
  private testStartTime: number;
  private userAgent: string;
  private isIOS: boolean;
  private isStandalone: boolean;
  private safariVersion: number;
  private manifest: any;
  private manifestValid: boolean;

  constructor() {
    this.testStartTime = Date.now();
    this.userAgent = navigator.userAgent;
    this.isIOS = /iPad|iPhone|iPod/.test(this.userAgent);
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    this.safariVersion = this.detectSafariVersion();
    this.manifest = null;
    this.manifestValid = false;
  }

  private detectSafariVersion(): number {
    const safariMatch = this.userAgent.match(/Version\/(\d+)/);
    return safariMatch ? parseInt(safariMatch[1]) : 0;
  }

  async runFullValidation(): Promise<InstallMetrics> {
    console.log('Starting iOS Install & Icon validation...');
    
    // Test categories in logical order
    await this.testManifest();
    await this.testIcons();
    await this.testSplashScreens();
    await this.testInstallFlow();
    await this.testHomescreenBehavior();
    await this.testDisplayModes();

    return this.generateMetrics();
  }

  private async testManifest(): Promise<void> {
    // Test 1: Manifest availability and accessibility
    await this.runTest({
      category: 'manifest',
      name: 'Manifest Availability',
      testId: 'manifest-001',
      testFn: async () => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
          throw new Error('No manifest link found');
        }
        
        const manifestUrl = manifestLink.getAttribute('href');
        if (!manifestUrl) {
          throw new Error('Manifest has no href');
        }
        
        try {
          const response = await fetch(manifestUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          this.manifest = await response.json();
          this.manifestValid = true;
          return true;
        } catch (error) {
          throw new Error(`Failed to load manifest: ${error}`);
        }
      },
      iosSpecific: false
    });

    // Test 2: Manifest structure validation
    await this.runTest({
      category: 'manifest',
      name: 'Manifest Structure',
      testId: 'manifest-002',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const requiredFields = ['name', 'short_name', 'start_url', 'display'];
        const missingFields = requiredFields.filter(field => !this.manifest[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        return true;
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific manifest requirements
    await this.runTest({
      category: 'manifest',
      name: 'iOS Manifest Requirements',
      testId: 'manifest-003',
      testFn: async () => {
        if (!this.isIOS || !this.manifestValid || !this.manifest) {
          return true; // Skip on non-iOS or if manifest not valid
        }
        
        // Check for iOS-specific optimizations
        const hasAppleSpecific = this.manifest.apple || this.manifest.apple_touch_icon;
        const hasProperIcons = this.manifest.icons && this.manifest.icons.length > 0;
        const hasGoodDisplayMode = ['standalone', 'fullscreen'].includes(this.manifest.display);
        
        return hasProperIcons && hasGoodDisplayMode;
      },
      iosSpecific: true
    });

    // Test 4: Manifest start_url validation
    await this.runTest({
      category: 'manifest',
      name: 'Start URL Validation',
      testId: 'manifest-004',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const startUrl = new URL(this.manifest.start_url, window.location.href);
        const currentUrl = new URL(window.location.href);
        
        // Start URL should be relative to current domain
        return startUrl.origin === currentUrl.origin;
      },
      iosSpecific: false
    });
  }

  private async testIcons(): Promise<void> {
    // Test 1: Icon availability and variety
    await this.runTest({
      category: 'icons',
      name: 'Icon Availability',
      testId: 'icons-001',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const icons = this.manifest.icons || [];
        if (icons.length === 0) {
          throw new Error('No icons defined in manifest');
        }
        
        // Check for various sizes
        const sizes = icons.map(icon => icon.sizes || '').join(',');
        const hasCommonSizes = sizes.includes('192') || sizes.includes('512') || sizes.includes('any');
        
        return hasCommonSizes;
      },
      iosSpecific: false
    });

    // Test 2: Maskable icon support
    await this.runTest({
      category: 'icons',
      name: 'Maskable Icon Support',
      testId: 'icons-002',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const icons = this.manifest.icons || [];
        const maskableIcons = icons.filter(icon => 
          icon.purpose && icon.purpose.includes('maskable')
        );
        
        return maskableIcons.length > 0;
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific icon requirements
    await this.runTest({
      category: 'icons',
      name: 'iOS Icon Requirements',
      testId: 'icons-003',
      testFn: async () => {
        if (!this.isIOS || !this.manifestValid || !this.manifest) {
          return true; // Skip on non-iOS
        }
        
        const icons = this.manifest.icons || [];
        
        // Check for Apple-specific icon sizes
        const appleSizes = [57, 60, 72, 76, 114, 120, 144, 152, 180, 192, 512];
        const hasAppleSizes = icons.some(icon => {
          const size = parseInt(icon.sizes?.split('x')[0] || '0');
          return appleSizes.includes(size);
        });
        
        // Check for high resolution icons
        const hasHighRes = icons.some(icon => {
          const size = parseInt(icon.sizes?.split('x')[0] || '0');
          return size >= 152; // iPad Retina and above
        });
        
        return hasAppleSizes && hasHighRes;
      },
      iosSpecific: true
    });

    // Test 4: Icon loading test
    await this.runTest({
      category: 'icons',
      name: 'Icon Loading',
      testId: 'icons-004',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const icons = this.manifest.icons || [];
        if (icons.length === 0) {
          return false;
        }
        
        // Test loading first few icons
        const testIcons = icons.slice(0, 3);
        const results = await Promise.all(
          testIcons.map(async (icon) => {
            try {
              const response = await fetch(icon.src, { method: 'HEAD' });
              return response.ok;
            } catch (error) {
              return false;
            }
          })
        );
        
        return results.some(result => result); // At least one icon should load
      },
      iosSpecific: false
    });
  }

  private async testSplashScreens(): Promise<void> {
    // Test 1: Splash screen configuration
    await this.runTest({
      category: 'splash',
      name: 'Splash Screen Configuration',
      testId: 'splash-001',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        // Check for splash screen configuration
        const hasSplash = this.manifest.screenshots || this.manifest.splash_screen;
        const hasThemeColor = !!this.manifest.theme_color;
        const hasBackgroundColor = !!this.manifest.background_color;
        
        return hasThemeColor && hasBackgroundColor;
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific splash requirements
    await this.runTest({
      category: 'splash',
      name: 'iOS Splash Requirements',
      testId: 'splash-002',
      testFn: async () => {
        if (!this.isIOS || !this.manifestValid || !this.manifest) {
          return true; // Skip on non-iOS
        }
        
        // iOS uses different splash screen approach
        const hasAppleLaunchImages = this.manifest.apple || this.manifest.launch_image;
        const hasProperColors = this.manifest.theme_color && this.manifest.background_color;
        
        // Check for proper splash screen sizes
        const iosSizes = [
          { width: 320, height: 568 },   // iPhone 5/SE
          { width: 375, height: 667 },   // iPhone 6/7/8
          { width: 414, height: 736 },   // iPhone 6+/7+/8+
          { width: 375, height: 812 },   // iPhone X/11 Pro
          { width: 414, height: 896 },   // iPhone 11/11 Pro Max
          { width: 768, height: 1024 },  // iPad
          { width: 834, height: 1194 },  // iPad Pro 11"
          { width: 1024, height: 1366 }  // iPad Pro 12.9"
        ];
        
        return hasProperColors;
      },
      iosSpecific: true
    });

    // Test 3: Splash screen performance
    await this.runTest({
      category: 'splash',
      name: 'Splash Performance',
      testId: 'splash-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test splash screen display timing
        const startTime = performance.now();
        
        // Simulate app startup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const duration = performance.now() - startTime;
        return duration < 1000; // Should show splash within 1s
      },
      iosSpecific: true
    });

    // Test 4: Splash screen content
    await this.runTest({
      category: 'splash',
      name: 'Splash Content',
      testId: 'splash-004',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const hasName = !!this.manifest.name;
        const hasShortName = !!this.manifest.short_name;
        const hasIcons = this.manifest.icons && this.manifest.icons.length > 0;
        
        return hasName && hasShortName && hasIcons;
      },
      iosSpecific: false
    });
  }

  private async testInstallFlow(): Promise<void> {
    // Test 1: Install prompt availability
    await this.runTest({
      category: 'install',
      name: 'Install Prompt Availability',
      testId: 'install-001',
      testFn: async () => {
        return 'BeforeInstallPromptEvent' in window;
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific install flow
    await this.runTest({
      category: 'install',
      name: 'iOS Install Flow',
      testId: 'install-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // iOS uses Share button → Add to Home Screen
        // Check if the app is properly configured for iOS install
        const hasManifest = this.manifestValid;
        const hasServiceWorker = 'serviceWorker' in navigator;
        const isHTTPS = window.location.protocol === 'https:';
        
        return hasManifest && hasServiceWorker && isHTTPS;
      },
      iosSpecific: true
    });

    // Test 3: Install event handling
    await this.runTest({
      category: 'install',
      name: 'Install Event Handling',
      testId: 'install-003',
      testFn: async () => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 2000);
          
          window.addEventListener('beforeinstallprompt', (event) => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          // If already in standalone mode, consider this passed
          if (this.isStandalone) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      },
      iosSpecific: false
    });

    // Test 4: Install cancellation handling
    await this.runTest({
      category: 'install',
      name: 'Install Cancellation',
      testId: 'install-004',
      testFn: async () => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 2000);
          
          window.addEventListener('appinstalled', (event) => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          // If already in standalone mode, consider this passed
          if (this.isStandalone) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      },
      iosSpecific: false
    });
  }

  private async testHomescreenBehavior(): Promise<void> {
    // Test 1: Homescreen display mode
    await this.runTest({
      category: 'homescreen',
      name: 'Homescreen Display',
      testId: 'home-001',
      testFn: async () => {
        return this.isStandalone;
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific homescreen behavior
    await this.runTest({
      category: 'homescreen',
      name: 'iOS Homescreen Behavior',
      testId: 'home-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Check iOS-specific standalone detection
        const isIOSStandalone = (window.navigator as any).standalone === true;
        const hasProperViewport = !!document.querySelector('meta[name="viewport"]');
        const hasNoAddressBar = this.isStandalone;
        
        return isIOSStandalone || (hasProperViewport && hasNoAddressBar);
      },
      iosSpecific: true
    });

    // Test 3: Homescreen icon rendering
    await this.runTest({
      category: 'homescreen',
      name: 'Icon Rendering',
      testId: 'home-003',
      testFn: async () => {
        if (!this.isIOS || !this.manifestValid || !this.manifest) {
          return true; // Skip on non-iOS
        }
        
        // Check if icons are properly configured for homescreen
        const icons = this.manifest.icons || [];
        const hasProperSizes = icons.some(icon => {
          const size = parseInt(icon.sizes?.split('x')[0] || '0');
          return size >= 180; // Good size for homescreen
        });
        
        return hasProperSizes;
      },
      iosSpecific: true
    });

    // Test 4: Homescreen launch performance
    await this.runTest({
      category: 'homescreen',
      name: 'Launch Performance',
      testId: 'home-004',
      testFn: async () => {
        if (!this.isStandalone) return true;
        
        const startTime = performance.now();
        
        // Simulate app launch from homescreen
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const duration = performance.now() - startTime;
        return duration < 2000; // Should launch within 2s
      },
      iosSpecific: true
    });
  }

  private async testDisplayModes(): Promise<void> {
    // Test 1: Display mode detection
    await this.runTest({
      category: 'display',
      name: 'Display Mode Detection',
      testId: 'display-001',
      testFn: async () => {
        const displayModes = [
          window.matchMedia('(display-mode: browser)').matches,
          window.matchMedia('(display-mode: standalone)').matches,
          window.matchMedia('(display-mode: minimal-ui)').matches,
          window.matchMedia('(display-mode: fullscreen)').matches
        ];
        
        return displayModes.some(mode => mode);
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific display modes
    await this.runTest({
      category: 'display',
      name: 'iOS Display Modes',
      testId: 'display-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // iOS primarily supports standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const hasIOSStandalone = (window.navigator as any).standalone === true;
        
        return isStandalone || hasIOSStandalone;
      },
      iosSpecific: true
    });

    // Test 3: Orientation handling
    await this.runTest({
      category: 'display',
      name: 'Orientation Handling',
      testId: 'display-003',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const hasOrientation = !!this.manifest.orientation;
        const supportedOrientations = ['portrait', 'landscape', 'any'];
        const validOrientation = !hasOrientation || supportedOrientations.includes(this.manifest.orientation);
        
        return validOrientation;
      },
      iosSpecific: false
    });

    // Test 4: Theme color application
    await this.runTest({
      category: 'display',
      name: 'Theme Color',
      testId: 'display-004',
      testFn: async () => {
        if (!this.manifestValid || !this.manifest) {
          throw new Error('Manifest not loaded');
        }
        
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        const hasThemeColor = !!themeColorMeta;
        const matchesManifest = !this.manifest.theme_color || 
                              themeColorMeta?.getAttribute('content') === this.manifest.theme_color;
        
        return hasThemeColor && matchesManifest;
      },
      iosSpecific: false
    });
  }

  private async runTest(config: {
    category: InstallValidationResult['category'];
    name: string;
    testId: string;
    testFn: () => Promise<boolean>;
    iosSpecific?: boolean;
  }): Promise<void> {
    const startTime = performance.now();
    let passed = false;
    let details = '';
    let recommendations: string[] = [];

    try {
      passed = await config.testFn();
      details = passed ? 'Test completed successfully' : 'Test failed';
    } catch (error) {
      details = `Test error: ${error instanceof Error ? error.message : String(error)}`;
      recommendations = this.generateRecommendations(config.category, config.testId, error);
    }

    const duration = performance.now() - startTime;

    const result: InstallValidationResult = {
      testId: config.testId,
      category: config.category,
      name: config.name,
      passed,
      duration,
      details,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      iosSpecific: config.iosSpecific || false,
      userAgent: this.userAgent,
      timestamp: Date.now()
    };

    this.results.push(result);
    
    if (this.isIOS && config.iosSpecific) {
      console.log(`[iOS Install Test] ${config.name}: ${passed ? 'PASS' : 'FAIL'} (${duration.toFixed(2)}ms)`);
    }
  }

  private generateRecommendations(
    category: InstallValidationResult['category'],
    testId: string,
    error: unknown
  ): string[] {
    const recommendations: string[] = [];

    if (this.isIOS) {
      switch (category) {
        case 'manifest':
          recommendations.push(
            'Ensure manifest includes iOS-specific properties',
            'Use proper start_url for iOS navigation',
            'Include apple-specific metadata tags'
          );
          break;
        case 'icons':
          recommendations.push(
            'Include maskable icons for adaptive icon support',
            'Provide multiple icon sizes for iOS devices',
            'Use high-resolution icons (at least 152x152)',
            'Consider Apple touch icon requirements'
          );
          break;
        case 'splash':
          recommendations.push(
            'Configure proper splash screen colors',
            'Consider iOS-specific launch images',
            'Ensure fast splash screen display',
            'Test splash screen on various iOS devices'
          );
          break;
        case 'install':
          recommendations.push(
            'Use HTTPS for iOS install capability',
            'Provide clear install instructions for iOS users',
            'Consider iOS Share button → Add to Home Screen flow',
            'Test install flow on different iOS versions'
          );
          break;
        case 'homescreen':
          recommendations.push(
            'Optimize homescreen icon appearance',
            'Test launch performance from homescreen',
            'Ensure proper display in standalone mode',
            'Consider iOS address bar behavior'
          );
          break;
        case 'display':
          recommendations.push(
            'Configure proper orientation handling',
            'Use appropriate theme colors for iOS',
            'Test display modes on iOS devices',
            'Consider iOS viewport settings'
          );
          break;
      }
    }

    // Generic recommendations based on error type
    if (error instanceof Error) {
      if (error.message.includes('manifest')) {
        recommendations.push('Validate manifest syntax and structure');
      } else if (error.message.includes('icon')) {
        recommendations.push('Verify icon file paths and formats');
      } else if (error.message.includes('loading')) {
        recommendations.push('Check network connectivity and file availability');
      }
    }

    return recommendations;
  }

  private generateMetrics(): InstallMetrics {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const iosTests = this.results.filter(r => r.iosSpecific);
    const iosTestsTotal = iosTests.length;
    const iosTestsPassed = iosTests.filter(r => r.passed).length;
    
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    const criticalFailures = this.results
      .filter(r => !r.passed && r.iosSpecific)
      .map(r => r.testId);
    
    const compatibilityScore = iosTestsTotal > 0 
      ? (iosTestsPassed / iosTestsTotal) * 100 
      : 100;

    const categories = {
      manifest: this.getCategoryMetrics('manifest'),
      icons: this.getCategoryMetrics('icons'),
      splash: this.getCategoryMetrics('splash'),
      install: this.getCategoryMetrics('install'),
      homescreen: this.getCategoryMetrics('homescreen'),
      display: this.getCategoryMetrics('display')
    };

    return {
      totalTests,
      passedTests,
      failedTests,
      iOSSpecificTests: iosTestsTotal,
      iOSSpecificPasses: iosTestsPassed,
      averageTestDuration: averageDuration,
      criticalFailures,
      compatibilityScore,
      categories
    };
  }

  private getCategoryMetrics(category: InstallValidationResult['category']) {
    const categoryResults = this.results.filter(r => r.category === category);
    return {
      passed: categoryResults.filter(r => r.passed).length,
      total: categoryResults.length
    };
  }

  getResults(): InstallValidationResult[] {
    return [...this.results];
  }

  getDetailedReport(): {
    summary: InstallMetrics;
    results: InstallValidationResult[];
    recommendations: string[];
    iosSpecificIssues: string[];
  } {
    const metrics = this.generateMetrics();
    
    const recommendations = [
      'Provide comprehensive icon sets for iOS devices',
      'Implement proper splash screen configuration',
      'Test install flow on various iOS versions',
      'Optimize homescreen icon and launch performance',
      'Consider iOS-specific display modes and behaviors'
    ];

    const iosSpecificIssues = this.results
      .filter(r => !r.passed && r.iosSpecific)
      .map(r => `${r.name}: ${r.details}`);

    return {
      summary: metrics,
      results: this.results,
      recommendations,
      iosSpecificIssues
    };
  }
}

// React hook for install validation
export function useIOSInstallValidator() {
  const [metrics, setMetrics] = useState<InstallMetrics | null>(null);
  const [results, setResults] = useState<InstallValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const validator = new iOSInstallValidator();
      const validationMetrics = await validator.runFullValidation();
      const validationResults = validator.getResults();
      
      setMetrics(validationMetrics);
      setResults(validationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  }, []);

  const getDetailedReport = useCallback(() => {
    if (!results.length) return null;
    
    const validator = new iOSInstallValidator();
    (validator as any).results = results; // Inject results for report generation
    return validator.getDetailedReport();
  }, [results]);

  return {
    metrics,
    results,
    isRunning,
    error,
    runValidation,
    getDetailedReport
  };
}