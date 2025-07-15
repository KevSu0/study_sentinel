// This is a new file for a high-performance icon picker.
'use client';

import React, {useState, useMemo, memo} from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import * as Icons from 'lucide-react';
import {FixedSizeGrid as Grid} from 'react-window';

export const iconList = Object.keys(Icons).filter(
  key =>
    typeof (Icons as any)[key] === 'object' &&
    (Icons as any)[key].displayName &&
    key !== 'createLucideIcon' &&
    key !== 'icons'
);

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
  color: string;
}

export function IconPicker({selectedIcon, onSelectIcon, color}: IconPickerProps) {
  const [isOpen, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    if (!searchTerm) return iconList;
    return iconList.filter(icon =>
      icon.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const SelectedIconComponent = useMemo(
    () => (Icons as any)[selectedIcon] || Icons.Award,
    [selectedIcon]
  );
  
  const IconCell = memo(({columnIndex, rowIndex, style, data}: any) => {
    const { onSelect, filteredIcons, columnCount } = data;
    const index = rowIndex * columnCount + columnIndex;
    if (index >= filteredIcons.length) return null;
    const iconName = filteredIcons[index];
    const IconComponent = (Icons as any)[iconName];
    
    return (
      <div style={style} className="flex items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onSelect(iconName)}
          className={cn(
            'rounded-md',
             selectedIcon === iconName && 'bg-primary/20 ring-2 ring-primary'
          )}
        >
          <IconComponent className="h-5 w-5" />
          <span className="sr-only">{iconName}</span>
        </Button>
      </div>
    );
  });
  IconCell.displayName = "IconCell";

  const handleSelect = (iconName: string) => {
    onSelectIcon(iconName);
    setOpen(false);
    setSearchTerm('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start items-center gap-4"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-md border" style={{ borderColor: color }}>
            <SelectedIconComponent style={{color: color}} className="h-6 w-6" />
          </div>
          <span>{selectedIcon}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search icons..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        <Grid
          height={250}
          width={300}
          columnCount={6}
          columnWidth={50}
          rowCount={Math.ceil(filteredIcons.length / 6)}
          rowHeight={50}
          itemData={{ onSelect: handleSelect, filteredIcons, columnCount: 6 }}
          className="p-2"
        >
          {IconCell}
        </Grid>
      </PopoverContent>
    </Popover>
  );
}
