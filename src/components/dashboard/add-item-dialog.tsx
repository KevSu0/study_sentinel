
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddItemDialog as UnifiedAddItemDialog } from '@/components/tasks/add-task-dialog';
import { useGlobalState } from '@/hooks/use-global-state';

export function AddItemDialog() {
  const { addTask, addRoutine, updateTask, updateRoutine } = useGlobalState();
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Item
      </Button>
      
      <UnifiedAddItemDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onAddRoutine={addRoutine}
        onUpdateRoutine={updateRoutine}
      />
    </>
  );
}
