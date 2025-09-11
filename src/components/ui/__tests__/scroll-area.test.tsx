import React from 'react';
import { render } from '@testing-library/react';
import { ScrollArea, ScrollBar } from '../scroll-area';

// Mock the '@radix-ui/react-scroll-area' library
jest.mock('@radix-ui/react-scroll-area', () => {
    const createMockComponent = (displayName: string) => {
        const MockComponent = React.forwardRef<HTMLDivElement, { children?: React.ReactNode; className?: string }>(
            ({ children, ...props }, ref) => (
                <div ref={ref} {...props}>
                    {children}
                </div>
            )
        );
        MockComponent.displayName = displayName;
        return MockComponent;
    };

    return {
        Root: createMockComponent('ScrollArea.Root'),
        Viewport: createMockComponent('ScrollArea.Viewport'),
        ScrollAreaScrollbar: createMockComponent('ScrollArea.Scrollbar'),
        ScrollAreaThumb: createMockComponent('ScrollArea.Thumb'),
        Corner: createMockComponent('ScrollArea.Corner'),
    };
});

describe('ScrollArea Components', () => {
  it('should render ScrollArea with children', () => {
    const { getByText } = render(
      <ScrollArea>
        <div>Scroll Content</div>
      </ScrollArea>
    );
    expect(getByText('Scroll Content')).toBeInTheDocument();
  });

  it('should render ScrollArea with a custom className', () => {
    const { container } = render(<ScrollArea className="custom-scroll-area" />);
    expect(container.firstChild).toHaveClass('custom-scroll-area');
  });

  it('should render ScrollBar with vertical orientation by default', () => {
    const { container } = render(<ScrollBar />);
    // The className logic in the component adds specific classes for orientation
    expect(container.firstChild).toHaveClass('h-full');
  });

  it('should render ScrollBar with horizontal orientation', () => {
    const { container } = render(<ScrollBar orientation="horizontal" />);
    expect(container.firstChild).toHaveClass('h-2.5');
  });

  it('should render ScrollBar with a custom className', () => {
    const { container } = render(<ScrollBar className="custom-scrollbar" />);
    expect(container.firstChild).toHaveClass('custom-scrollbar');
  });
});