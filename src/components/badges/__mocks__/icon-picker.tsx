import React from 'react';

export const IconPicker = ({
  selectedIcon,
  onSelectIcon,
}: {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}) => {
  return (
    <button
      data-testid="icon-picker-trigger"
      onClick={() => onSelectIcon('activity')}
    >
      {selectedIcon}
    </button>
  );
};