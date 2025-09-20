export type ServiceWorkerMessage = {
  type: string;
  [key: string]: unknown;
};

class MockServiceWorker extends EventTarget {
  public state: ServiceWorkerState;
  public readonly scriptURL: string;
  public readonly postMessage: jest.Mock;
  public onstatechange: ((this: ServiceWorker, ev: Event) => unknown) | null = null;
  public onerror: ((this: ServiceWorker, ev: ErrorEvent) => unknown) | null = null;

  constructor(state: ServiceWorkerState = 'installed', scriptURL = '/sw.js') {
    super();
    this.state = state;
    this.scriptURL = scriptURL;
    this.postMessage = jest.fn();
  }

  transitionTo(next: ServiceWorkerState) {
    this.state = next;
    const event = new Event('statechange');
    this.dispatchEvent(event);
    if (this.onstatechange) {
      this.onstatechange.call(this as unknown as ServiceWorker, event);
    }
  }
}

class MockServiceWorkerRegistration extends EventTarget {
  public installing: MockServiceWorker | null = null;
  public waiting: MockServiceWorker | null = null;
  public active: MockServiceWorker | null = new MockServiceWorker('activated');
  public readonly update = jest.fn(async () => true);
  public readonly unregister = jest.fn(async () => true);
  public readonly scope = '/';
  public updateViaCache: ServiceWorkerUpdateViaCache = 'none';

  reset() {
    this.installing = null;
    this.waiting = null;
    this.active = new MockServiceWorker('activated');
    this.update.mockClear();
    this.unregister.mockClear();
  }
}

class MockServiceWorkerContainer extends EventTarget implements ServiceWorkerContainer {
  public controller: MockServiceWorker | null = null;
  public oncontrollerchange: ((this: ServiceWorkerContainer, ev: Event) => unknown) | null = null;
  public onmessage: ((this: ServiceWorkerContainer, ev: MessageEvent) => unknown) | null = null;
  public onmessageerror: ((this: ServiceWorkerContainer, ev: MessageEvent) => unknown) | null = null;
  public readonly ready: Promise<ServiceWorkerRegistration>;

  constructor(private readonly registration: MockServiceWorkerRegistration) {
    super();
    this.ready = Promise.resolve(this.registration as unknown as ServiceWorkerRegistration);
  }

  async getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    return this.registration as unknown as ServiceWorkerRegistration;
  }

  async getRegistrations(): Promise<ServiceWorkerRegistration[]> {
    return [this.registration as unknown as ServiceWorkerRegistration];
  }

  async register(): Promise<ServiceWorkerRegistration> {
    return this.registration as unknown as ServiceWorkerRegistration;
  }

  async startMessages(): Promise<void> {
    return;
  }

  dispatchMessage(data: ServiceWorkerMessage) {
    const event = new MessageEvent('message', { data });
    this.dispatchEvent(event);
    if (this.onmessage) {
      this.onmessage.call(this, event);
    }
  }

  dispatchControllerChange() {
    const event = new Event('controllerchange');
    this.dispatchEvent(event);
    if (this.oncontrollerchange) {
      this.oncontrollerchange.call(this, event);
    }
  }

  reset() {
    this.controller = null;
    this.oncontrollerchange = null;
    this.onmessage = null;
    this.onmessageerror = null;
  }
}

export class ServiceWorkerTestHarness {
  private readonly registration: MockServiceWorkerRegistration;
  private readonly container: MockServiceWorkerContainer;

  constructor() {
    this.registration = new MockServiceWorkerRegistration();
    this.container = new MockServiceWorkerContainer(this.registration);
    this.container.controller = this.registration.active;
    this.patchNavigator();
  }

  private patchNavigator() {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: this.container,
    });
  }

  reset() {
    this.registration.reset();
    this.container.reset();
    this.container.controller = this.registration.active;
    this.patchNavigator();
  }

  async getRegistration(): Promise<ServiceWorkerRegistration> {
    const registration = await this.container.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration available');
    }
    return registration;
  }

  simulateWaitingWorker(scriptURL = '/sw.js'): MockServiceWorker {
    const worker = new MockServiceWorker('installed', scriptURL);
    this.registration.installing = worker;
    this.registration.dispatchEvent(new Event('updatefound'));
    this.registration.waiting = worker;
    this.registration.installing = null;
    worker.transitionTo('installed');
    return worker;
  }

  activateWaitingWorker() {
    const waiting = this.registration.waiting;
    if (!waiting) {
      throw new Error('No waiting worker to activate');
    }
    waiting.transitionTo('activating');
    waiting.transitionTo('activated');
    this.registration.active = waiting;
    this.registration.waiting = null;
    this.container.controller = waiting;
    this.container.dispatchControllerChange();
  }

  postMessageFromWorker(message: ServiceWorkerMessage) {
    this.container.dispatchMessage(message);
  }

  setOnline(isOnline: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: isOnline,
    });
  }

  get waitingWorker(): MockServiceWorker | null {
    return this.registration.waiting;
  }

  get activeWorker(): MockServiceWorker | null {
    return this.registration.active;
  }
}

export const swTestHarness = new ServiceWorkerTestHarness();





