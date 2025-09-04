/**
 * Polyfill for structuredClone in Node.js environments
 * Required for fake-indexeddb to work properly in Jest tests
 */

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    // Simple deep clone implementation for test environments
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => global.structuredClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = global.structuredClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  };
}