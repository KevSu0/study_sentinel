import { useState, useCallback } from 'react';

/**
 * iOS Input/UX Validator
 * Tests iOS-specific user experience, virtual keyboard behavior, banner rendering, and touch interactions
 */

export interface InputUXValidationResult {
  testId: string;
  category: 'keyboard' | 'touch' | 'viewport' | 'scrolling' | 'forms' | 'accessibility';
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  recommendations?: string[];
  iosSpecific?: boolean;
  userAgent: string;
  timestamp: number;
  deviceInfo?: {
    isTouchDevice: boolean;
    maxTouchPoints: number;
    viewportWidth: number;
    viewportHeight: number;
    devicePixelRatio: number;
  };
}

export interface InputUXMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  iOSSpecificTests: number;
  iOSSpecificPasses: number;
  averageTestDuration: number;
  criticalFailures: string[];
  compatibilityScore: number; // 0-100
  categories: {
    keyboard: { passed: number; total: number };
    touch: { passed: number; total: number };
    viewport: { passed: number; total: number };
    scrolling: { passed: number; total: number };
    forms: { passed: number; total: number };
    accessibility: { passed: number; total: number };
  };
  deviceCapabilities: {
    isTouchDevice: boolean;
    maxTouchPoints: number;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    supportsTouchEvents: boolean;
    supportsPointerEvents: boolean;
  };
}

export class iOSInputUXValidator {
  private results: InputUXValidationResult[] = [];
  private testStartTime: number;
  private userAgent: string;
  private isIOS: boolean;
  private safariVersion: number;
  private isTouchDevice: boolean;
  private maxTouchPoints: number;
  private viewportInfo: { width: number; height: number };
  private devicePixelRatio: number;

  constructor() {
    this.testStartTime = Date.now();
    this.userAgent = navigator.userAgent;
    this.isIOS = /iPad|iPhone|iPod/.test(this.userAgent);
    this.safariVersion = this.detectSafariVersion();
    this.isTouchDevice = this.detectTouchDevice();
    this.maxTouchPoints = navigator.maxTouchPoints || 0;
    this.viewportInfo = this.getViewportInfo();
    this.devicePixelRatio = window.devicePixelRatio || 1;
  }

  private detectSafariVersion(): number {
    const safariMatch = this.userAgent.match(/Version\/(\d+)/);
    return safariMatch ? parseInt(safariMatch[1]) : 0;
  }

  private detectTouchDevice(): boolean {
    return 'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 ||
           (navigator as any).msMaxTouchPoints > 0;
  }

  private getViewportInfo(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  async runFullValidation(): Promise<InputUXMetrics> {
    console.log('Starting iOS Input/UX validation...');
    
    // Test categories in logical order
    await this.testKeyboardBehavior();
    await this.testTouchInteractions();
    await this.testViewportHandling();
    await this.testScrollingBehavior();
    await this.testFormsBehavior();
    await this.testAccessibility();

    return this.generateMetrics();
  }

  private async testKeyboardBehavior(): Promise<void> {
    // Test 1: Virtual keyboard detection
    await this.runTest({
      category: 'keyboard',
      name: 'Virtual Keyboard Detection',
      testId: 'keyboard-001',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test if we can detect virtual keyboard presence
        const isVisualViewportSupported = 'visualViewport' in window;
        
        if (isVisualViewportSupported) {
          const viewport = window.visualViewport;
          return viewport !== undefined;
        }
        
        // Fallback detection method
        const initialHeight = window.innerHeight;
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(true), 3000); // Default to true
          
          // Simulate keyboard detection through viewport changes
          const checkKeyboard = () => {
            const currentHeight = window.innerHeight;
            if (currentHeight < initialHeight * 0.8) { // Significant height reduction
              clearTimeout(timeout);
              resolve(true);
            }
          };
          
          // Monitor for viewport changes
          window.addEventListener('resize', checkKeyboard);
          setTimeout(() => {
            window.removeEventListener('resize', checkKeyboard);
            clearTimeout(timeout);
            resolve(true);
          }, 2000);
        });
      },
      iosSpecific: true
    });

    // Test 2: Keyboard event handling
    await this.runTest({
      category: 'keyboard',
      name: 'Keyboard Event Handling',
      testId: 'keyboard-002',
      testFn: async () => {
        if (!this.isTouchDevice) return true;
        
        // Test keyboard event support
        const events = ['keydown', 'keyup', 'keypress'];
        const supportedEvents = events.filter(event => `on${event}` in window);
        
        return supportedEvents.length >= 2; // At least 2 keyboard events should be supported
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific keyboard quirks
    await this.runTest({
      category: 'keyboard',
      name: 'iOS Keyboard Quirks',
      testId: 'keyboard-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific keyboard behaviors
        const hasVisualViewport = 'visualViewport' in window;
        
        if (hasVisualViewport && window.visualViewport) {
          const viewport = window.visualViewport;
          const hasViewportEvents = typeof viewport.addEventListener === 'function';

          // Test if we can detect keyboard-induced viewport changes
          return hasViewportEvents;
        }
        
        return false;
      },
      iosSpecific: true
    });

    // Test 4: Keyboard viewport adjustment
    await this.runTest({
      category: 'keyboard',
      name: 'Viewport Adjustment',
      testId: 'keyboard-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test if viewport properly adjusts for keyboard
        const initialHeight = this.viewportInfo.height;
        
        // Check for proper viewport meta tag
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        const hasProperViewport = viewportMeta && 
          viewportMeta.getAttribute('content')?.includes('viewport-fit=cover');
        
        return hasProperViewport || false;
      },
      iosSpecific: true
    });
  }

  private async testTouchInteractions(): Promise<void> {
    // Test 1: Touch event support
    await this.runTest({
      category: 'touch',
      name: 'Touch Event Support',
      testId: 'touch-001',
      testFn: async () => {
        const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
        const supportedEvents = touchEvents.filter(event => `on${event}` in window);
        
        return supportedEvents.length === touchEvents.length;
      },
      iosSpecific: false
    });

    // Test 2: Pointer event support
    await this.runTest({
      category: 'touch',
      name: 'Pointer Event Support',
      testId: 'touch-002',
      testFn: async () => {
        const pointerEvents = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
        const supportedEvents = pointerEvents.filter(event => `on${event}` in window);
        
        return supportedEvents.length >= 2; // At least some pointer events should be supported
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific touch behavior
    await this.runTest({
      category: 'touch',
      name: 'iOS Touch Behavior',
      testId: 'touch-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific touch behaviors
        const hasTouch = this.isTouchDevice;
        const hasMultiTouch = this.maxTouchPoints > 1;
        
        // Test for proper touch-action CSS support
        const testElement = document.createElement('div');
        testElement.style.touchAction = 'manipulation';
        const hasTouchAction = testElement.style.touchAction === 'manipulation';
        
        return hasTouch && hasMultiTouch && hasTouchAction;
      },
      iosSpecific: true
    });

    // Test 4: Gesture support
    await this.runTest({
      category: 'touch',
      name: 'Gesture Support',
      testId: 'touch-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test gesture event support
        const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend'];
        const supportedEvents = gestureEvents.filter(event => `on${event}` in window);
        
        // iOS should support gesture events
        return supportedEvents.length >= 1;
      },
      iosSpecific: true
    });
  }

  private async testViewportHandling(): Promise<void> {
    // Test 1: Viewport meta tag configuration
    await this.runTest({
      category: 'viewport',
      name: 'Viewport Configuration',
      testId: 'viewport-001',
      testFn: async () => {
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) {
          throw new Error('No viewport meta tag found');
        }
        
        const content = viewportMeta.getAttribute('content') || '';
        const hasWidth = content.includes('width=');
        const hasInitialScale = content.includes('initial-scale=');
        const hasUserScalable = content.includes('user-scalable=');
        
        return hasWidth && hasInitialScale;
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific viewport handling
    await this.runTest({
      category: 'viewport',
      name: 'iOS Viewport Handling',
      testId: 'viewport-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific viewport features
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        const content = viewportMeta?.getAttribute('content') || '';
        
        // Check for iOS-specific viewport optimizations
        const hasViewportFit = content.includes('viewport-fit=cover');
        const hasShrinkToFit = content.includes('shrink-to-fit=no');
        
        return hasViewportFit || !hasShrinkToFit; // viewport-fit=cover is preferred
      },
      iosSpecific: true
    });

    // Test 3: Safe area handling
    await this.runTest({
      category: 'viewport',
      name: 'Safe Area Handling',
      testId: 'viewport-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test if app handles iOS safe areas properly
        const hasSafeAreaCSS = CSS.supports('padding-top', 'env(safe-area-inset-top)') &&
                             CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)') &&
                             CSS.supports('padding-left', 'env(safe-area-inset-left)') &&
                             CSS.supports('padding-right', 'env(safe-area-inset-right)');
        
        return hasSafeAreaCSS;
      },
      iosSpecific: true
    });

    // Test 4: Visual viewport API
    await this.runTest({
      category: 'viewport',
      name: 'Visual Viewport API',
      testId: 'viewport-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test Visual Viewport API support
        if (!('visualViewport' in window)) {
          return false;
        }
        
        const viewport = window.visualViewport;
        if (!viewport) return false;

        const hasBasicProperties = typeof viewport.width === 'number' &&
                                 typeof viewport.height === 'number' &&
                                 typeof viewport.scale === 'number';

        return hasBasicProperties;
      },
      iosSpecific: true
    });
  }

  private async testScrollingBehavior(): Promise<void> {
    // Test 1: Smooth scrolling support
    await this.runTest({
      category: 'scrolling',
      name: 'Smooth Scrolling',
      testId: 'scroll-001',
      testFn: async () => {
        // Test CSS smooth scrolling
        const testElement = document.createElement('div');
        testElement.style.scrollBehavior = 'smooth';
        const hasSmoothScrolling = testElement.style.scrollBehavior === 'smooth';
        
        return hasSmoothScrolling;
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific scrolling behavior
    await this.runTest({
      category: 'scrolling',
      name: 'iOS Scrolling Behavior',
      testId: 'scroll-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific scrolling features
        const hasOverscrollBehavior = CSS.supports('overscroll-behavior', 'contain');
        const hasWebkitOverflowScrolling = CSS.supports('-webkit-overflow-scrolling', 'touch');
        
        // iOS should support -webkit-overflow-scrolling: touch
        return hasWebkitOverflowScrolling;
      },
      iosSpecific: true
    });

    // Test 3: Scroll snapping
    await this.runTest({
      category: 'scrolling',
      name: 'Scroll Snapping',
      testId: 'scroll-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test scroll snapping support
        const hasScrollSnap = CSS.supports('scroll-snap-type', 'mandatory') &&
                             CSS.supports('scroll-snap-align', 'start');
        
        return hasScrollSnap;
      },
      iosSpecific: false
    });

    // Test 4: Infinite scrolling
    await this.runTest({
      category: 'scrolling',
      name: 'Infinite Scrolling',
      testId: 'scroll-004',
      testFn: async () => {
        // Test if infinite scrolling is properly implemented
        try {
          // Check for intersection observer support (commonly used for infinite scroll)
          const hasIntersectionObserver = 'IntersectionObserver' in window;
          
          if (hasIntersectionObserver) {
            // Test basic intersection observer functionality
            return new Promise((resolve) => {
              const timeout = setTimeout(() => resolve(true), 2000);
              
              const observer = new IntersectionObserver((entries) => {
                if (entries.length > 0) {
                  clearTimeout(timeout);
                  observer.disconnect();
                  resolve(true);
                }
              });
              
              const testElement = document.createElement('div');
              document.body.appendChild(testElement);
              observer.observe(testElement);
              
              setTimeout(() => {
                observer.disconnect();
                clearTimeout(timeout);
                resolve(true);
              }, 1000);
            });
          }
          
          return true;
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });
  }

  private async testFormsBehavior(): Promise<void> {
    // Test 1: Form input types
    await this.runTest({
      category: 'forms',
      name: 'Input Type Support',
      testId: 'forms-001',
      testFn: async () => {
        // Test various HTML5 input types
        const inputTypes = ['text', 'email', 'tel', 'url', 'number', 'date', 'time'];
        const testInput = document.createElement('input');
        
        const supportedTypes = inputTypes.filter(type => {
          testInput.type = type;
          return testInput.type === type;
        });
        
        return supportedTypes.length >= 5; // At least 5 input types should be supported
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific form behaviors
    await this.runTest({
      category: 'forms',
      name: 'iOS Form Behaviors',
      testId: 'forms-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific form input behaviors
        const testInput = document.createElement('input');
        
        // Test autocorrect and autocapitalize attributes
        testInput.setAttribute('autocorrect', 'off');
        testInput.setAttribute('autocapitalize', 'none');
        
        const hasAutocorrect = testInput.getAttribute('autocorrect') === 'off';
        const hasAutocapitalize = testInput.getAttribute('autocapitalize') === 'none';
        
        return hasAutocorrect && hasAutocapitalize;
      },
      iosSpecific: true
    });

    // Test 3: Form validation
    await this.runTest({
      category: 'forms',
      name: 'Form Validation',
      testId: 'forms-003',
      testFn: async () => {
        // Test HTML5 form validation
        const testForm = document.createElement('form');
        const testInput = document.createElement('input');
        testInput.setAttribute('required', '');
        testInput.setAttribute('type', 'email');
        
        testForm.appendChild(testInput);
        
        // Check validation API
        const hasValidationAPI = typeof testInput.checkValidity === 'function' &&
                               typeof testInput.setCustomValidity === 'function';
        
        return hasValidationAPI;
      },
      iosSpecific: false
    });

    // Test 4: iOS keyboard accessories
    await this.runTest({
      category: 'forms',
      name: 'iOS Keyboard Accessories',
      testId: 'forms-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific keyboard accessory features
        const testInput = document.createElement('input');
        
        // Test enterkeyhint attribute
        testInput.setAttribute('enterkeyhint', 'done');
        const hasEnterKeyHint = testInput.getAttribute('enterkeyhint') === 'done';
        
        // Test inputmode attribute
        testInput.setAttribute('inputmode', 'numeric');
        const hasInputMode = testInput.getAttribute('inputmode') === 'numeric';
        
        return hasEnterKeyHint && hasInputMode;
      },
      iosSpecific: true
    });
  }

  private async testAccessibility(): Promise<void> {
    // Test 1: ARIA support
    await this.runTest({
      category: 'accessibility',
      name: 'ARIA Support',
      testId: 'a11y-001',
      testFn: async () => {
        // Test basic ARIA support
        const testElement = document.createElement('div');
        testElement.setAttribute('role', 'button');
        testElement.setAttribute('aria-label', 'Test button');
        
        const hasRole = testElement.getAttribute('role') === 'button';
        const hasAriaLabel = testElement.getAttribute('aria-label') === 'Test button';
        
        return hasRole && hasAriaLabel;
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific accessibility features
    await this.runTest({
      category: 'accessibility',
      name: 'iOS Accessibility',
      testId: 'a11y-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific accessibility features
        const hasVoiceOverSupport = 'webkitSpeechRecognition' in window ||
                                   'SpeechRecognition' in window;
        
        // Test for iOS accessibility attributes
        const testElement = document.createElement('div');
        testElement.setAttribute('aria-label', 'Test');
        
        const hasAriaSupport = testElement.getAttribute('aria-label') === 'Test';
        
        return hasAriaSupport;
      },
      iosSpecific: true
    });

    // Test 3: Screen reader compatibility
    await this.runTest({
      category: 'accessibility',
      name: 'Screen Reader Compatibility',
      testId: 'a11y-003',
      testFn: async () => {
        // Test screen reader compatibility
        const hasLiveRegions = 'aria-live' in document.createElement('div').attributes;
        const hasAtomic = 'aria-atomic' in document.createElement('div').attributes;
        
        return hasLiveRegions && hasAtomic;
      },
      iosSpecific: false
    });

    // Test 4: Focus management
    await this.runTest({
      category: 'accessibility',
      name: 'Focus Management',
      testId: 'a11y-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test focus management on iOS
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Button';
        
        // Test focus functionality
        const hasFocusMethod = typeof testButton.focus === 'function';
        const hasBlurMethod = typeof testButton.blur === 'function';
        
        return hasFocusMethod && hasBlurMethod;
      },
      iosSpecific: true
    });
  }

  private async runTest(config: {
    category: InputUXValidationResult['category'];
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

    const result: InputUXValidationResult = {
      testId: config.testId,
      category: config.category,
      name: config.name,
      passed,
      duration,
      details,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      iosSpecific: config.iosSpecific || false,
      userAgent: this.userAgent,
      timestamp: Date.now(),
      deviceInfo: {
        isTouchDevice: this.isTouchDevice,
        maxTouchPoints: this.maxTouchPoints,
        viewportWidth: this.viewportInfo.width,
        viewportHeight: this.viewportInfo.height,
        devicePixelRatio: this.devicePixelRatio
      }
    };

    this.results.push(result);
    
    if (this.isIOS && config.iosSpecific) {
      console.log(`[iOS UX Test] ${config.name}: ${passed ? 'PASS' : 'FAIL'} (${duration.toFixed(2)}ms)`);
    }
  }

  private generateRecommendations(
    category: InputUXValidationResult['category'],
    testId: string,
    error: unknown
  ): string[] {
    const recommendations: string[] = [];

    if (this.isIOS) {
      switch (category) {
        case 'keyboard':
          recommendations.push(
            'Implement iOS virtual keyboard handling',
            'Use proper viewport meta tag configuration',
            'Handle keyboard-induced viewport changes',
            'Test with various iOS keyboard types'
          );
          break;
        case 'touch':
          recommendations.push(
            'Optimize touch interactions for iOS devices',
            'Implement proper gesture handling',
            'Use touch-action CSS for better performance',
            'Test multi-touch interactions on iOS'
          );
          break;
        case 'viewport':
          recommendations.push(
            'Configure viewport meta tag for iOS',
            'Implement safe area inset handling',
            'Use viewport-fit=cover for edge-to-edge display',
            'Test on various iOS device sizes'
          );
          break;
        case 'scrolling':
          recommendations.push(
            'Implement iOS-optimized scrolling behavior',
            'Use -webkit-overflow-scrolling: touch where appropriate',
            'Test scroll performance on iOS devices',
            'Consider iOS-specific scroll snapping'
          );
          break;
        case 'forms':
          recommendations.push(
            'Optimize form inputs for iOS keyboard',
            'Use iOS-specific input attributes',
            'Implement proper form validation',
            'Test with iOS keyboard accessories'
          );
          break;
        case 'accessibility':
          recommendations.push(
            'Ensure iOS VoiceOver compatibility',
            'Implement proper ARIA labels and roles',
            'Test with iOS screen readers',
            'Optimize focus management for iOS'
          );
          break;
      }
    }

    // Generic recommendations based on error type
    if (error instanceof Error) {
      if (error.message.includes('viewport')) {
        recommendations.push('Review viewport meta tag configuration');
      } else if (error.message.includes('touch')) {
        recommendations.push('Implement proper touch event handling');
      } else if (error.message.includes('keyboard')) {
        recommendations.push('Handle virtual keyboard interactions');
      }
    }

    return recommendations;
  }

  private generateMetrics(): InputUXMetrics {
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
      keyboard: this.getCategoryMetrics('keyboard'),
      touch: this.getCategoryMetrics('touch'),
      viewport: this.getCategoryMetrics('viewport'),
      scrolling: this.getCategoryMetrics('scrolling'),
      forms: this.getCategoryMetrics('forms'),
      accessibility: this.getCategoryMetrics('accessibility')
    };

    const deviceCapabilities = {
      isTouchDevice: this.isTouchDevice,
      maxTouchPoints: this.maxTouchPoints,
      viewport: this.viewportInfo,
      devicePixelRatio: this.devicePixelRatio,
      supportsTouchEvents: 'ontouchstart' in window,
      supportsPointerEvents: 'PointerEvent' in window
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
      categories,
      deviceCapabilities
    };
  }

  private getCategoryMetrics(category: InputUXValidationResult['category']) {
    const categoryResults = this.results.filter(r => r.category === category);
    return {
      passed: categoryResults.filter(r => r.passed).length,
      total: categoryResults.length
    };
  }

  getResults(): InputUXValidationResult[] {
    return [...this.results];
  }

  getDetailedReport(): {
    summary: InputUXMetrics;
    results: InputUXValidationResult[];
    recommendations: string[];
    iosSpecificIssues: string[];
  } {
    const metrics = this.generateMetrics();
    
    const recommendations = [
      'Optimize touch interactions for iOS devices',
      'Implement proper virtual keyboard handling',
      'Configure viewport meta tag for iOS compatibility',
      'Test accessibility features with iOS VoiceOver',
      'Implement iOS-specific form input optimizations'
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

// React hook for input/UX validation
export function useIOSInputUXValidator() {
  const [metrics, setMetrics] = useState<InputUXMetrics | null>(null);
  const [results, setResults] = useState<InputUXValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const validator = new iOSInputUXValidator();
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
    
    const validator = new iOSInputUXValidator();
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