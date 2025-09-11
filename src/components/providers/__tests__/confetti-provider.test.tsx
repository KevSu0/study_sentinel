import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfettiProvider, useConfetti } from '../confetti-provider';

// This will hold the onConfettiComplete callback from the mock
let mockOnConfettiComplete: (() => void) | undefined;

// Mock the 'react-confetti' library
jest.mock('react-confetti', () => {
  // A mock implementation that accepts onConfettiComplete and other props.
  // It stores the onConfettiComplete callback in a variable scoped to this test file,
  // allowing tests to trigger it.
  const MockConfetti = (props: { onConfettiComplete?: () => void }) => {
    mockOnConfettiComplete = props.onConfettiComplete;
    return <div data-testid="mock-confetti" />;
  };
  MockConfetti.displayName = 'MockConfetti';
  return MockConfetti;
});

// A simple test component to consume the context
const TestConsumer = () => {
  const { fire } = useConfetti();
  return <button onClick={fire}>Fire Confetti</button>;
};

describe('ConfettiProvider', () => {
  // Store the original console.error and restore it after tests
  let originalError: typeof console.error;

  beforeEach(() => {
    originalError = console.error;
    // Suppress the expected "useConfetti must be used within a ConfettiProvider" error
    console.error = jest.fn();
    // Reset the mock callback holder before each test
    mockOnConfettiComplete = undefined;
  });

  afterEach(() => {
    // Restore the original console.error
    console.error = originalError;
    jest.restoreAllMocks();
  });

  it('should throw an error when useConfetti is used outside of a ConfettiProvider', () => {
    // The expect().toThrow() must wrap the function that causes the error
    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useConfetti must be used within a ConfettiProvider');
  });

  it('should render children correctly', () => {
    render(
      <ConfettiProvider>
        <div>Child Component</div>
      </ConfettiProvider>
    );
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });

  it('should not display confetti on initial render', () => {
    render(
      <ConfettiProvider>
        <TestConsumer />
      </ConfettiProvider>
    );
    expect(screen.queryByTestId('mock-confetti')).not.toBeInTheDocument();
  });

  /**
   * This test ensures that when the `fire` function is called, the confetti component
   * is rendered. It also simulates window dimensions, as the component will not
   * render without a valid size.
   */
  it('should display confetti when fire() is called', async () => {
    const user = userEvent.setup();
    render(
      <ConfettiProvider>
        <TestConsumer />
      </ConfettiProvider>
    );

    // Mock window dimensions as the confetti only renders if width > 0
    act(() => {
      window.innerWidth = 1024;
      window.innerHeight = 768;
      window.dispatchEvent(new Event('resize'));
    });

    const fireButton = screen.getByText('Fire Confetti');
    await user.click(fireButton);

    expect(screen.getByTestId('mock-confetti')).toBeInTheDocument();
  });

  /**
   * This test verifies that the confetti is displayed and then correctly removed
   * from the DOM after its animation completes. It simulates the completion
   * by manually invoking the `onConfettiComplete` callback provided to the mock component.
   */
  it('should hide confetti when onConfettiComplete is called', async () => {
    const user = userEvent.setup();
    render(
      <ConfettiProvider>
        <TestConsumer />
      </ConfettiProvider>
    );

    // Mock window dimensions
    act(() => {
      window.innerWidth = 1024;
      window.innerHeight = 768;
      window.dispatchEvent(new Event('resize'));
    });

    // Fire the confetti
    const fireButton = screen.getByText('Fire Confetti');
    await user.click(fireButton);
    expect(screen.getByTestId('mock-confetti')).toBeInTheDocument();

    // Simulate the confetti animation finishing by invoking the captured callback
    act(() => {
      if (mockOnConfettiComplete) {
        mockOnConfettiComplete();
      }
    });

    expect(screen.queryByTestId('mock-confetti')).not.toBeInTheDocument();
  });

  it('should update dimensions on window resize', async () => {
    const user = userEvent.setup();
    render(
      <ConfettiProvider>
        <TestConsumer />
      </ConfettiProvider>
    );
  
    // Set initial size to 0 to ensure no confetti is rendered
    act(() => {
      window.innerWidth = 0;
      window.innerHeight = 0;
      window.dispatchEvent(new Event('resize'));
    });
  
    const fireButton = screen.getByText('Fire Confetti');
    await user.click(fireButton);
    expect(screen.queryByTestId('mock-confetti')).not.toBeInTheDocument();
  
    // Simulate a resize event
    act(() => {
      window.innerWidth = 500;
      window.innerHeight = 500;
      window.dispatchEvent(new Event('resize'));
    });
  
    // Now that there are dimensions, confetti should appear
    await user.click(fireButton);
    expect(screen.getByTestId('mock-confetti')).toBeInTheDocument();
  });

  /**
   * This test ensures that the `useEffect` hook in `useWindowSize`
   * properly cleans up its event listener to prevent memory leaks.
   */
  it('should clean up the resize event listener on unmount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <ConfettiProvider>
        <TestConsumer />
      </ConfettiProvider>
    );

    // Check that the listener was added
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    // Unmount the component
    unmount();

    // Check that the listener was removed
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});