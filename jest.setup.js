import '@testing-library/jest-dom';
const React = require('react');

// Mock PointerEvent for Radix UI components, only if in a browser-like environment
if (typeof MouseEvent !== 'undefined' && !global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, props) {
      super(type, props);
      this.pointerId = props.pointerId;
    }
  }
  global.PointerEvent = PointerEvent;
}

// Only run this setup in a browser-like environment
if (typeof Element !== 'undefined') {
  beforeAll(() => {
    // Mock hasPointerCapture
    if (typeof Element.prototype.hasPointerCapture === 'undefined') {
      Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
    }
    if (typeof Element.prototype.setPointerCapture === 'undefined') {
      Element.prototype.setPointerCapture = jest.fn();
    }
    if (typeof Element.prototype.releasePointerCapture === 'undefined') {
      Element.prototype.releasePointerCapture = jest.fn();
    }
    if (typeof Element.prototype.scrollIntoView === 'undefined') {
      Element.prototype.scrollIntoView = jest.fn();
    }
  });
}

jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: function (target, prop) {
      if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
        const MockIcon = (props) => {
          const testId = prop
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase() + '-icon';
          return React.createElement('div', { 'data-testid': testId, ...props });
        };
        MockIcon.displayName = prop;
        return MockIcon;
      }
      return jest.fn();
    }
  });
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));