export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        const result = navigator.serviceWorker.register && navigator.serviceWorker.register('/sw.js');
        Promise.resolve(result)
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      } catch (err) {
        console.log('SW registration failed: ', err);
      }
    });
  }
}
