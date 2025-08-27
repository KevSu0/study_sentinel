'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskViewMode } from '@/hooks/use-view-mode';

interface ViewModeToggleProps {
  viewMode: TaskViewMode;
  setViewMode: (mode: TaskViewMode) => void;
}

export const ViewModeToggle = ({ viewMode, setViewMode }: ViewModeToggleProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Toggle view mode">
          {viewMode === 'list' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setViewMode('list')} aria-label="List">
          <List className="mr-2 h-4 w-4" />
          List
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setViewMode('card')} aria-label="Card">
          <LayoutGrid className="mr-2 h-4 w-4" />
          Card
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};