'use client';
import React, {useState, useMemo} from 'react';
import {Button} from '@/components/ui/button';
import {PlusCircle} from 'lucide-react';
import {useTasks} from '@/hooks/use-tasks';
import {TaskList} from '@/components/tasks/task-list';
import {TaskDialog} from '@/components/tasks/add-task-dialog';
import {EmptyState} from '@/components/tasks/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import type {StudyTask} from '@/lib/types';

type TaskFilter = 'all' | 'todo' | 'in_progress' | 'completed';

export default function AllTasksPage() {
  const {tasks, addTask, updateTask, deleteTask, isLoaded} = useTasks();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');

  const isTaskFormOpen = isAddDialogOpen || !!editingTask;

  const openAddTaskDialog = () => {
    setEditingTask(null);
    setAddDialogOpen(true);
  };

  const openEditTaskDialog = (task: StudyTask) => {
    setAddDialogOpen(false);
    setEditingTask(task);
  };

  const closeTaskFormDialog = () => {
    setAddDialogOpen(false);
    setEditingTask(null);
  };

  const filteredTasks = useMemo(() => {
    if (filter === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.status === filter);
  }, [tasks, filter]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">All Tasks</h1>
          <p className="text-muted-foreground">View and manage all your study tasks.</p>
        </div>
        <Button onClick={openAddTaskDialog} className="w-full sm:w-auto">
          <PlusCircle className="mr-2" />
          Add New Task
        </Button>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as TaskFilter)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="todo">To Do</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
            {!isLoaded ? (
              <div className="space-y-4 mt-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : filteredTasks.length > 0 ? (
               <TabsContent value={filter} className="mt-0">
                    <TaskList
                        tasks={filteredTasks}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                        onEdit={openEditTaskDialog}
                    />
               </TabsContent>
            ) : (
                <div className="mt-8">
                    <EmptyState 
                        onAddTask={openAddTaskDialog}
                        title={`No ${filter !== 'all' ? filter.replace('_', ' ') : ''} tasks`}
                        message="Looks like this section is empty. Create a new task to get started!"
                        buttonText="Create Task"
                    />
                </div>
            )}
        </Tabs>
      </main>

      <TaskDialog
        isOpen={isTaskFormOpen}
        onOpenChange={(open) => !open && closeTaskFormDialog()}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        taskToEdit={editingTask}
      />
    </div>
  );
}
