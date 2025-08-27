import {render, screen, fireEvent} from '@testing-library/react';
import {EmptyState} from '../empty-state';
import {BookOpenCheck} from 'lucide-react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  BookOpenCheck: jest.fn(() => <div data-testid="book-icon" />),
}));

describe('EmptyState', () => {
  const mockOnAddTask = jest.fn();

  beforeEach(() => {
    // Clear mock history before each test
    mockOnAddTask.mockClear();
    (BookOpenCheck as unknown as jest.Mock).mockClear();
  });

  it('should render with default title, message, and button text', () => {
    render(<EmptyState onAddTask={mockOnAddTask} />);

    expect(screen.getByTestId('book-icon')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: /All Clear!/i})).toBeInTheDocument();
    expect(
      screen.getByText(/There are no tasks to show here. Ready to plan your next move?/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Add a New Task/i})).toBeInTheDocument();
  });

  it('should render with custom title, message, and button text', () => {
    const customProps = {
      title: 'No Tasks Found',
      message: 'You have no tasks for this day. Enjoy your free time!',
      buttonText: 'Create Task',
    };

    render(<EmptyState onAddTask={mockOnAddTask} {...customProps} />);

    expect(screen.getByRole('heading', {name: customProps.title})).toBeInTheDocument();
    expect(screen.getByText(customProps.message)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: customProps.buttonText})).toBeInTheDocument();
  });

  it('should call onAddTask when the button is clicked', () => {
    render(<EmptyState onAddTask={mockOnAddTask} />);

    const button = screen.getByRole('button', {name: /Add a New Task/i});
    fireEvent.click(button);

    expect(mockOnAddTask).toHaveBeenCalledTimes(1);
  });

  it('should render children instead of the default button when provided', () => {
    const childText = 'This is a custom child element';
    render(
      <EmptyState onAddTask={mockOnAddTask}>
        <div>{childText}</div>
      </EmptyState>
    );

    expect(screen.getByText(childText)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should not call onAddTask when children are present and clicked', () => {
    const childText = 'This is a custom child element';
    render(
      <EmptyState onAddTask={mockOnAddTask}>
        <div>{childText}</div>
      </EmptyState>
    );

    const childElement = screen.getByText(childText);
    fireEvent.click(childElement);

    expect(mockOnAddTask).not.toHaveBeenCalled();
  });
});