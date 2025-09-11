import React from 'react';
import { render } from '@testing-library/react';
import {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from '../drawer';

// Mock the 'vaul' library
jest.mock('vaul', () => {
  const MockDrawer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  MockDrawer.displayName = 'Drawer.Root';

  const MockTrigger = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  MockTrigger.displayName = 'Drawer.Trigger';

  const MockClose = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  MockClose.displayName = 'Drawer.Close';
  
  const MockPortal = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  MockPortal.displayName = 'Drawer.Portal';

  const MockOverlay = (props: any) => <div {...props} />;
  MockOverlay.displayName = 'Drawer.Overlay';

  const MockContent = ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>;
  MockContent.displayName = 'Drawer.Content';

  const MockTitle = ({ children, ...props }: { children: React.ReactNode }) => <h2 {...props}>{children}</h2>;
  MockTitle.displayName = 'Drawer.Title';

  const MockDescription = ({ children, ...props }: { children: React.ReactNode }) => <p {...props}>{children}</p>;
  MockDescription.displayName = 'Drawer.Description';

  return {
    Drawer: {
      Root: MockDrawer,
      Trigger: MockTrigger,
      Close: MockClose,
      Portal: MockPortal,
      Overlay: MockOverlay,
      Content: MockContent,
      Title: MockTitle,
      Description: MockDescription,
    },
  };
});

describe('Drawer Components', () => {
  it('should render Drawer with children', () => {
    const { getByText } = render(
      <Drawer>
        <div>Drawer Content</div>
      </Drawer>
    );
    expect(getByText('Drawer Content')).toBeInTheDocument();
  });

  it('should render DrawerTrigger with children', () => {
    const { getByText } = render(<DrawerTrigger>Open Drawer</DrawerTrigger>);
    expect(getByText('Open Drawer')).toBeInTheDocument();
  });

  it('should render DrawerClose with children', () => {
    const { getByText } = render(<DrawerClose>Close Drawer</DrawerClose>);
    expect(getByText('Close Drawer')).toBeInTheDocument();
  });

  it('should render DrawerContent with children and apply className', () => {
    const { getByText } = render(
      <DrawerContent className="custom-class">
        <div>Content</div>
      </DrawerContent>
    );
    const content = getByText('Content');
    expect(content.parentElement).toHaveClass('custom-class');
  });

  it('should render DrawerHeader and apply className', () => {
    const { container } = render(<DrawerHeader className="custom-header" />);
    expect(container.firstChild).toHaveClass('custom-header');
  });

  it('should render DrawerFooter and apply className', () => {
    const { container } = render(<DrawerFooter className="custom-footer" />);
    expect(container.firstChild).toHaveClass('custom-footer');
  });

  it('should render DrawerTitle and apply className', () => {
    const { getByText } = render(<DrawerTitle className="custom-title">Title</DrawerTitle>);
    expect(getByText('Title')).toHaveClass('custom-title');
  });

  it('should render DrawerDescription and apply className', () => {
    const { getByText } = render(
      <DrawerDescription className="custom-description">
        Description
      </DrawerDescription>
    );
    expect(getByText('Description')).toHaveClass('custom-description');
  });

  it('should render DrawerPortal with children', () => {
    const { getByText } = render(
      <Drawer>
        <DrawerPortal>
          <div>Portal Content</div>
        </DrawerPortal>
      </Drawer>
    );
    expect(getByText('Portal Content')).toBeInTheDocument();
  });

  it('should render DrawerOverlay and apply className', () => {
    const { container } = render(
        <DrawerOverlay className="custom-overlay" />
    );
    expect(container.firstChild).toHaveClass('custom-overlay');
  });
});