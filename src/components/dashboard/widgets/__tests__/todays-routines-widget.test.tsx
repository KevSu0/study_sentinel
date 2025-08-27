import React from 'react';
import {render, screen} from '@testing-library/react';
import {TodaysRoutinesWidget} from '../todays-routines-widget';

describe('TodaysRoutinesWidget', () => {
  it('should render the placeholder text', () => {
    render(<TodaysRoutinesWidget />);
    expect(screen.getByText("Today's Routines")).toBeInTheDocument();
  });
});