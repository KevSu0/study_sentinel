
'use client';

import React, { useState, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useGlobalState } from '@/hooks/use-global-state';
import { Skeleton } from '../ui/skeleton';

const UnifiedAddItemDialog = lazy(() => import('@/components/tasks/add-task-dialog').then(m => ({ default: m.AddItemDialog })));

export function AddItemDialog() {
  const { addTask, addRoutine, updateTask, updateRoutine } = useGlobalState();
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Item
      </Button>
      
      {isDialogOpen && (
        <Suspense fallback={<Skeleton className="h-[500px] w-[500px]" />}>
            <UnifiedAddItemDialog
                isOpen={isDialogOpen}
                onOpenChange={setDialogOpen}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onAddRoutine={addRoutine}
                onUpdateRoutine={updateRoutine}
            />
        </Suspense>
      )}
    </>
  );
}
