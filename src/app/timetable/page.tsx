'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useRoutines } from '@/hooks/use-routines';
import { Skeleton } from '@/components/ui/skeleton';
import { RoutineListItem } from '@/components/timetable/routine-list-item';
import { Routine } from '@/lib/types';
import { EmptyState } from '@/components/tasks/empty-state';
import { useToast } from '@/hooks/use-toast';

const AddRoutineDialog = dynamic(
  () => import('@/components/timetable/add-routine-dialog').then(m => m.AddRoutineDialog),
  { ssr: false }
);

export default function TimetablePage() {
  const { routines, addRoutine, updateRoutine, deleteRoutine, isLoaded } = useRoutines();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const { toast } = useToast();

  const openAddDialog = () => {
    setEditingRoutine(null);
    setDialogOpen(true);
  };

  const openEditDialog = (routine: Routine) => {
    setEditingRoutine(routine);
    setDialogOpen(true);
  };

  const handleDeleteRoutine = (routineId: string) => {
    deleteRoutine(routineId);
    toast({
      title: "Routine Deleted",
      description: "The routine has been removed from your timetable."
    });
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-2">
        <div>
          <h1 className="text-3xl font-bold text-primary">Weekly Timetable</h1>
          <p className="text-muted-foreground">Manage your repeating study routines.</p>
        </div>
        <Button onClick={openAddDialog} className="w-full sm:w-auto">
          <PlusCircle className="mr-2" />
          Add New Routine
        </Button>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-4">
        {!isLoaded ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : routines.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routines.map(routine => (
            <RoutineListItem
              key={routine.id}
              routine={routine}
              onEdit={openEditDialog}
              onDelete={handleDeleteRoutine}
            />
          ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full pt-16">
            <EmptyState
              onAddTask={openAddDialog}
              title="No Routines Yet"
              message="Create a new routine to build your weekly study timetable."
              buttonText="Create First Routine"
            />
          </div>
        )}
      </main>

      <AddRoutineDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        onAddRoutine={addRoutine}
        onUpdateRoutine={updateRoutine}
        routineToEdit={editingRoutine}
      />
    </div>
  );
}
