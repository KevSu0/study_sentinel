import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DurationInput } from '../duration-input';

describe('DurationInput', () => {
  it('initializes correctly with a value in minutes', () => {
    // 95 minutes = 1 hour and 35 minutes
    render(<DurationInput value={95} onChange={jest.fn()} />);

    const hoursInput = screen.getByPlaceholderText('Hours');
    const minutesInput = screen.getByPlaceholderText('Mins');

    expect(hoursInput).toHaveValue(1);
    expect(minutesInput).toHaveValue(35);
  });

  it('updates the inputs when the value prop changes', () => {
    // 125 minutes = 2 hours and 5 minutes
    const { rerender } = render(<DurationInput value={95} onChange={jest.fn()} />);
    rerender(<DurationInput value={125} onChange={jest.fn()} />);

    const hoursInput = screen.getByPlaceholderText('Hours');
    const minutesInput = screen.getByPlaceholderText('Mins');

    expect(hoursInput).toHaveValue(2);
    expect(minutesInput).toHaveValue(5);
  });

  it('calls onChange with the correct total minutes when hours are changed', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<DurationInput value={60} onChange={handleChange} />); // Initial: 1h 0m

    const hoursInput = screen.getByPlaceholderText('Hours');
    await user.clear(hoursInput);
    await user.type(hoursInput, '2');

    // 2 hours * 60 + 0 minutes = 120
    expect(handleChange).toHaveBeenCalledWith(120);
  });

  it('calls onChange with the correct total minutes when minutes are changed', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<DurationInput value={60} onChange={handleChange} />); // Initial: 1h 0m

    const minutesInput = screen.getByPlaceholderText('Mins');
    await user.clear(minutesInput);
    await user.type(minutesInput, '30');

    // 1 hour * 60 + 30 minutes = 90
    expect(handleChange).toHaveBeenCalledWith(90);
  });

  it('handles zero as an initial value', () => {
    render(<DurationInput value={0} onChange={jest.fn()} />);

    const hoursInput = screen.getByPlaceholderText('Hours');
    const minutesInput = screen.getByPlaceholderText('Mins');

    expect(hoursInput).toHaveValue(0);
    expect(minutesInput).toHaveValue(0);
  });

  it('handles empty input by defaulting to 0', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<DurationInput value={60} onChange={handleChange} />); // Initial: 1h 0m

    const hoursInput = screen.getByPlaceholderText('Hours');
    await user.clear(hoursInput); // This should trigger a change with 0

    // 0 hours * 60 + 0 minutes = 0
    expect(handleChange).toHaveBeenCalledWith(0);
  });
  
  it('handles non-numeric input gracefully by defaulting to 0', () => {
    const handleChange = jest.fn();
    render(<DurationInput value={60} onChange={handleChange} />); // Initial: 1h 0m

    const minutesInput = screen.getByPlaceholderText('Mins');
    fireEvent.change(minutesInput, { target: { value: 'abc' } });

    // 1 hour * 60 + 0 minutes (since 'abc' is parsed as NaN -> 0) = 60
    expect(handleChange).toHaveBeenCalledWith(60);
  });
});