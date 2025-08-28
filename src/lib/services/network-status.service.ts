import { BehaviorSubject, interval, Subscription } from 'rxjs';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastChecked: string;
}

class NetworkStatusService {
  private onlineStatus = new BehaviorSubject<boolean>(navigator.onLine);
  private networkStatus = new BehaviorSubject<NetworkStatus>(this.getCurrentNetworkStatus());
  private pingInterval?: Subscription;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly PING_TIMEOUT = 5000; // 5 seconds

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Listen to connection changes if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', this.handleConnectionChange);
    }

    // Start periodic connectivity checks
    this.startPeriodicChecks();
  }

  private getCurrentNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection;
    return {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      lastChecked: new Date().toISOString()
    };
  }

  private handleOnline = async () => {
    // Verify actual connectivity with a ping
    const isReallyOnline = await this.pingServer();
    this.onlineStatus.next(isReallyOnline);
    this.updateNetworkStatus();
  };

  private handleOffline = () => {
    this.onlineStatus.next(false);
    this.updateNetworkStatus();
  };

  private handleConnectionChange = () => {
    this.updateNetworkStatus();
  };

  private updateNetworkStatus() {
    const status = this.getCurrentNetworkStatus();
    status.isOnline = this.onlineStatus.getValue();
    this.networkStatus.next(status);
  }

  private startPeriodicChecks() {
    this.pingInterval = interval(this.PING_INTERVAL).subscribe(async () => {
      if (navigator.onLine) {
        const isOnline = await this.pingServer();
        if (isOnline !== this.onlineStatus.getValue()) {
          this.onlineStatus.next(isOnline);
          this.updateNetworkStatus();
        }
      }
    });
  }

  private async pingServer(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.PING_TIMEOUT);
      
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // Fallback to a reliable external service
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.PING_TIMEOUT);
        
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return true; // If we reach here, we have connectivity
      } catch (fallbackError) {
        return false;
      }
    }
  }

  public isOnline(): boolean {
    return this.onlineStatus.getValue();
  }

  public getNetworkStatus(): NetworkStatus {
    return this.networkStatus.getValue();
  }

  public onStatusChange() {
    return this.onlineStatus.asObservable();
  }

  public onNetworkStatusChange() {
    return this.networkStatus.asObservable();
  }

  public async checkConnectivity(): Promise<boolean> {
    const isOnline = await this.pingServer();
    this.onlineStatus.next(isOnline);
    this.updateNetworkStatus();
    return isOnline;
  }

  public getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    const status = this.networkStatus.getValue();
    
    if (!status.isOnline) return 'offline';
    
    if (status.effectiveType) {
      switch (status.effectiveType) {
        case '4g':
          return 'excellent';
        case '3g':
          return 'good';
        case '2g':
        case 'slow-2g':
          return 'poor';
        default:
          return 'good';
      }
    }
    
    // Fallback based on RTT if available
    if (status.rtt) {
      if (status.rtt < 100) return 'excellent';
      if (status.rtt < 300) return 'good';
      return 'poor';
    }
    
    return 'good'; // Default assumption
  }

  public cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.removeEventListener('change', this.handleConnectionChange);
    }
    
    if (this.pingInterval) {
      this.pingInterval.unsubscribe();
    }
  }
}

export default NetworkStatusService;
export const networkStatusService = new NetworkStatusService();