import React from 'react';

const lucideReact = new Proxy(
  {},
  {
    get: function (target, prop) {
      if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
        const MockIcon = (props: React.SVGProps<SVGSVGElement>) => {
          const testId = prop
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase();
          return React.createElement('svg', { 'data-testid': `${testId}-icon`, ...props });
        };
        MockIcon.displayName = prop as string;
        return MockIcon;
      }
      return () => null;
    },
  }
);

module.exports = lucideReact;