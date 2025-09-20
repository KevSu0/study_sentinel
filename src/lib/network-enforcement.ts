import { diagnosticsManager } from '@/lib/diagnostics';
import { thirdPartyGate } from '@/lib/third-party/third-party-gate';
import { getOfflineResilienceManager } from '@/lib/offline-resilience-manager';
import { remoteApiPaths } from './remote-api-paths';

/**
 * Network Request Enforcement
 * Enforces zero-network guarantees and disposition table rules
 */

export interface NetworkRequestRule {
  pattern: RegExp;
  category: 'REMOVE' | 'LOCALIZE' | 'FLAG' | 'KEEP';
  featureFlag?: string;
  offlineAllowed: boolean;
  description: string;
}

export class NetworkEnforcement {
  private static instance: NetworkEnforcement;
  private rules: NetworkRequestRule[] = [];

  private constructor() {
    this.initializeRules();
  }

  static getInstance(): NetworkEnforcement {
    if (!NetworkEnforcement.instance) {
      NetworkEnforcement.instance = new NetworkEnforcement();
    }
    return NetworkEnforcement.instance;
  }

  private initializeRules(): void {
    // Based on the Network Disposition Table
    this.rules = [
      // REMOVE - Completely block these endpoints
      {
        pattern: /^\/api\/(legacy|deprecated|unused|beta)/,
        category: 'REMOVE',
        offlineAllowed: false,
        description: 'Legacy/deprecated endpoints'
      },
      {
        pattern: /firebaseio\.com/,
        category: 'REMOVE',
        offlineAllowed: false,
        description: 'Firebase SDK endpoints (unused)'
      },
      
      // LOCALIZE - Serve from cache only
      {
        pattern: /^\/(fonts|icons|images)\//,
        category: 'LOCALIZE',
        offlineAllowed: true,
        description: 'Static assets - cache only'
      },
      {
        pattern: /\.css$/,
        category: 'LOCALIZE',
        offlineAllowed: true,
        description: 'CSS files - cache only'
      },
      {
        pattern: /\.js$/,
        category: 'LOCALIZE',
        offlineAllowed: true,
        description: 'JavaScript files - cache only'
      },
      
      // FLAG - Conditional access based on feature flags
      {
        pattern: /^\/api\/sync\//,
        category: 'FLAG',
        featureFlag: 'sync_uplink',
        offlineAllowed: false,
        description: 'Sync endpoints - requires feature flag'
      },
      {
        pattern: /^\/api\/analytics\//,
        category: 'FLAG',
        featureFlag: 'analytics_v2',
        offlineAllowed: false,
        description: 'Analytics endpoints - requires feature flag'
      },
      {
        pattern: /^\/api\/ai\//,
        category: 'FLAG',
        offlineAllowed: false,
        description: 'AI endpoints - never allowed offline'
      },
      
      // KEEP - Always allow these essential endpoints
      {
        pattern: /^\/offline\.html$/,
        category: 'KEEP',
        offlineAllowed: true,
        description: 'Offline fallback page'
      },
      {
        pattern: /^\/manifest\.json$/,
        category: 'KEEP',
        offlineAllowed: true,
        description: 'PWA manifest'
      },
      {
        pattern: /^\/sw\.js$/,
        category: 'KEEP',
        offlineAllowed: true,
        description: 'Service worker'
      }
    ];
  }

  /**
   * Check if a request is allowed based on current state and rules
   */
  async checkRequestAllowed(url: string, options: RequestInit = {}): Promise<{
    allowed: boolean;
    reason: string;
    rule?: NetworkRequestRule;
    shouldQueue?: boolean;
  }> {
    const isOnline = navigator.onLine;
    
    // Find matching rule
    const rule = this.rules.find(r => r.pattern.test(url));
    
    if (!rule) {
      // Default: allow if online, deny if offline
      return {
        allowed: isOnline,
        reason: isOnline ? 'No specific rule - online' : 'No specific rule - offline',
        shouldQueue: false
      };
    }

    // Apply rule logic
    switch (rule.category) {
      case 'REMOVE':
        return {
          allowed: false,
          reason: `Endpoint blocked by rule: ${rule.description}`,
          rule
        };

      case 'LOCALIZE':
        if (!isOnline) {
          return {
            allowed: true,
            reason: `Local asset access allowed offline: ${rule.description}`,
            rule,
            shouldQueue: false
          };
        }
        // Online: check cache first, then network
        return {
          allowed: true,
          reason: `Local asset with cache-first: ${rule.description}`,
          rule,
          shouldQueue: false
        };

      case 'FLAG':
        if (!isOnline && !rule.offlineAllowed) {
          return {
            allowed: false,
            reason: `Feature flagged endpoint not allowed offline: ${rule.description}`,
            rule,
            shouldQueue: false
          };
        }
        
        // Check feature flag if specified
        if (rule.featureFlag) {
          const flagEnabled = this.checkFeatureFlag(rule.featureFlag);
          if (!flagEnabled) {
            return {
              allowed: false,
              reason: `Feature flag '${rule.featureFlag}' is disabled: ${rule.description}`,
              rule,
              shouldQueue: false
            };
          }
        }
        
        return {
          allowed: true,
          reason: `Feature flagged endpoint allowed: ${rule.description}`,
          rule,
          shouldQueue: isOnline // Queue if online and flag enabled
        };

      case 'KEEP':
        return {
          allowed: true,
          reason: `Essential endpoint always allowed: ${rule.description}`,
          rule,
          shouldQueue: false
        };

      default:
        return {
          allowed: isOnline,
          reason: 'Default rule behavior',
          shouldQueue: false
        };
    }
  }

  /**
   * Enhanced fetch with network enforcement
   */
  async enforcedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const check = await this.checkRequestAllowed(url, options);
    
    if (!check.allowed) {
      throw new Error(`Network request blocked: ${check.reason}`);
    }

    // For AI endpoints, never queue - hard disable when offline
    if (url.includes(remoteApiPaths.aiPrefix()) && !navigator.onLine) {
      throw new Error('AI features require an internet connection and are not available offline');
    }

    // Use resilient fetch for queueable requests
    if (check.shouldQueue) {
      const manager = getOfflineResilienceManager({
        enableQueue: true,
        enableRetry: true,
      });

      return manager.resilientFetch(url, options);
    }

    // Standard fetch
    if (/^https?:\/\//.test(url)) {
      return thirdPartyGate.fetchRaw(url, options);
    }
    return fetch(url, options);
  }

  /**
   * Check if a feature flag is enabled
   */
  private checkFeatureFlag(flagName: string): boolean {
    // This would integrate with your actual feature flag system
    // For now, checking localStorage as a simple implementation
    try {
      const flags = JSON.parse(localStorage.getItem('featureFlags') || '{}');
      return flags[flagName] === true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that all network requests comply with offline guarantees
   */
  async validateNetworkCompliance(): Promise<{
    compliant: boolean;
    violations: Array<{
      url: string;
      rule: NetworkRequestRule;
      reason: string;
    }>;
  }> {
    const violations: Array<{
      url: string;
      rule: NetworkRequestRule;
      reason: string;
    }> = [];

    // Monitor all fetch calls
    const originalFetch = global.fetch;
    global.fetch = async (url: string | Request, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.url;
      const check = await this.checkRequestAllowed(urlString, options);
      
      if (!check.allowed) {
        violations.push({
          url: urlString,
          rule: check.rule!,
          reason: check.reason
        });
      }
      
      return originalFetch(url, options);
    };

    // Wait a bit to catch any violations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Restore original fetch
    global.fetch = originalFetch;

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  /**
   * Get current network status and rule summary
   */
  getNetworkStatus(): {
    isOnline: boolean;
    ruleCount: number;
    summary: Record<string, number>;
  } {
    const summary = this.rules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      isOnline: navigator.onLine,
      ruleCount: this.rules.length,
      summary
    };
  }
}

// Export singleton instance
export const networkEnforcement = NetworkEnforcement.getInstance();

// Export hook for React components
export function useNetworkEnforcement() {
  return {
    checkRequestAllowed: (url: string, options?: RequestInit) => 
      networkEnforcement.checkRequestAllowed(url, options),
    enforcedFetch: (url: string, options?: RequestInit) =>
      networkEnforcement.enforcedFetch(url, options),
    validateCompliance: () => networkEnforcement.validateNetworkCompliance(),
    getNetworkStatus: () => networkEnforcement.getNetworkStatus()
  };
}

