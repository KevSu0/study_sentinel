import { BehaviorSubject } from 'rxjs';

class NetworkStatusService {
  private onlineStatus = new BehaviorSubject<boolean>(navigator.onLine);

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.onlineStatus.next(true);
  };

  private handleOffline = () => {
    this.onlineStatus.next(false);
  };

  public isOnline(): boolean {
    return this.onlineStatus.getValue();
  }

  public onStatusChange() {
    return this.onlineStatus.asObservable();
  }

  public cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

export default NetworkStatusService;