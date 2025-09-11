import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from '../select';

// Mock all used lucide-react icons to be more robust and avoid type errors.
jest.mock('lucide-react', () => {
  const original = jest.requireActual('lucide-react');

  const createMockIcon = (displayName: string, testId: string) => {
    const MockIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
      <svg ref={ref} {...props} data-testid={testId} />
    ));
    MockIcon.displayName = displayName;
    return MockIcon;
  };

  return {
    ...original,
    Check: createMockIcon('Check', 'check-icon'),
    ChevronUp: createMockIcon('ChevronUp', 'chevron-up-icon'),
    ChevronDown: createMockIcon('ChevronDown', 'chevron-down-icon'),
  };
});

const TestSelect = ({ contentProps, disabledItem = false }: { contentProps?: any, disabledItem?: boolean }) => (
  <Select>
    <SelectTrigger>
      <SelectValue placeholder="Select a fruit" />
    </SelectTrigger>
    <SelectContent {...contentProps}>
      <SelectGroup>
        <SelectLabel>Fruits</SelectLabel>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana" disabled={disabledItem}>Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
      </SelectGroup>
      <SelectSeparator data-testid="separator" />
      <SelectGroup>
        <SelectLabel>Vegetables</SelectLabel>
        <SelectItem value="broccoli">Broccoli</SelectItem>
        <SelectItem value="carrot">Carrot</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
);

describe('Select Component', () => {
  it('renders the trigger with a placeholder', () => {
    render(<TestSelect />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Select a fruit');
  });

  it('opens the dropdown and shows options when clicked', async () => {
    render(<TestSelect />);
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);

    expect(screen.getByText('Fruits')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByTestId('separator')).toBeInTheDocument();
    expect(screen.getByText('Vegetables')).toBeInTheDocument();
    expect(screen.getByText('Broccoli')).toBeInTheDocument();
  });

  it('selects an item, updates the value, and shows a checkmark', async () => {
    render(<TestSelect />);
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Select a fruit');

    // Open dropdown
    await userEvent.click(trigger);
    
    // Select option
    const appleOption = screen.getByText('Apple');
    await userEvent.click(appleOption);

    // Check that value updated and dropdown closed
    expect(trigger).toHaveTextContent('Apple');
    expect(screen.queryByText('Fruits')).not.toBeInTheDocument();

    // Re-open dropdown to check for the indicator
    await userEvent.click(trigger);

    // Find the selected option and check for the icon within it
    const selectedOption = screen.getByRole('option', { name: 'Apple' });
    expect(within(selectedOption).getByTestId('check-icon')).toBeInTheDocument();
  });

  it('should correctly render with a disabled state', () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
      </Select>
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('renders with item-aligned position for content', async () => {
    render(<TestSelect contentProps={{ position: 'item-aligned' }} />);
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);
    // The popper-specific classes should not be present
    const content = screen.getByRole('listbox');
    expect(content.parentElement).not.toHaveClass('data-[side=bottom]:translate-y-1');
  });

  it('does not select a disabled item', async () => {
    render(<TestSelect disabledItem={true} />);
    const trigger = screen.getByRole('combobox');
    await userEvent.click(trigger);

    const bananaOption = screen.getByRole('option', { name: 'Banana' });
    expect(bananaOption).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(bananaOption);
    // The value should not change, and the dropdown should remain open
    expect(trigger).toHaveTextContent('Select a fruit');
    expect(screen.getByText('Fruits')).toBeInTheDocument();
  });
});