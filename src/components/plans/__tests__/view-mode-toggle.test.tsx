import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ViewModeToggle} from '../view-mode-toggle';
import {List, LayoutGrid} from 'lucide-react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  List: jest.fn(() => <div data-testid="list-icon" />),
  LayoutGrid: jest.fn(() => <div data-testid="grid-icon" />),
}));

describe('ViewModeToggle', () => {
  const setViewMode = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display the List icon when viewMode is "list"', () => {
    render(<ViewModeToggle viewMode="list" setViewMode={setViewMode} />);
    expect(screen.getByTestId('list-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('grid-icon')).not.toBeInTheDocument();
  });

  it('should display the LayoutGrid icon when viewMode is "card"', () => {
    render(<ViewModeToggle viewMode="card" setViewMode={setViewMode} />);
    expect(screen.getByTestId('grid-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('list-icon')).not.toBeInTheDocument();
  });

  it('should call setViewMode with "list" when List menu item is clicked', async () => {
    render(<ViewModeToggle viewMode="card" setViewMode={setViewMode} />);
    await userEvent.click(screen.getByRole('button', {name: /toggle view mode/i}));
    await userEvent.click(screen.getByRole('menuitem', {name: /list/i}));
    expect(setViewMode).toHaveBeenCalledWith('list');
  });

  it('should call setViewMode with "card" when Card menu item is clicked', async () => {
    render(<ViewModeToggle viewMode="list" setViewMode={setViewMode} />);
    await userEvent.click(screen.getByRole('button', {name: /toggle view mode/i}));
    await userEvent.click(screen.getByRole('menuitem', {name: /card/i}));
    expect(setViewMode).toHaveBeenCalledWith('card');
  });
});