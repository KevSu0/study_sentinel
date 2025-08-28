export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Register our custom service worker
        const registration = await navigator.serviceWorker.register('/custom-sw.js');
        console.log('Custom SW registered: ', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                console.log('New service worker available');
                // You could show a notification to the user here
              }
            });
          }
        });
        
        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('Message from SW:', event.data);
          
          if (event.data.type === 'CACHE_UPDATED') {
            console.log('Cache updated for:', event.data.url);
          }
          
          if (event.data.type === 'OFFLINE_FALLBACK') {
            console.log('Serving offline fallback for:', event.data.url);
          }
        });
        
      } catch (registrationError) {
        console.log('SW registration failed: ', registrationError);
      }
    });
  }
};

// Utility to check if app is running in standalone mode (PWA)
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

// Utility to request persistent storage
export const requestPersistentStorage = async (): Promise<boolean> => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const persistent = await navigator.storage.persist();
      console.log('Persistent storage:', persistent);
      return persistent;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }
  return false;
};

// Utility to get storage usage
export const getStorageUsage = async (): Promise<{ used: number; quota: number } | null> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return null;
    }
  }
  return null;
};