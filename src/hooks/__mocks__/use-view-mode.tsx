import React from 'react';

const mockViewModeContext = {
  viewMode: 'card',
  setViewMode: jest.fn(),
  isLoaded: true,
};

export const useViewMode = () => mockViewModeContext;

export const ViewModeProvider = ({ children }: { children: React.ReactNode }) => {
  const ViewModeContext = React.createContext(mockViewModeContext);
  return (
    <ViewModeContext.Provider value={mockViewModeContext}>
      {children}
    </ViewModeContext.Provider>
  );
};