import {Button} from '@/components/ui/button';
import {BookOpenCheck} from 'lucide-react';
import type {ReactNode} from 'react';

interface EmptyStateProps {
  onAddTask: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
  children?: ReactNode;
}

export function EmptyState({
  onAddTask,
  title = 'All Clear!',
  message = 'There are no tasks here. Ready to add a new one?',
  buttonText = 'Add First Task',
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-card/50 rounded-lg shadow-sm border border-dashed">
      <BookOpenCheck className="h-16 w-16 text-primary/80 mb-4" />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        {message}
      </p>
      {children || (
        <Button onClick={onAddTask} className="mt-6">
          {buttonText}
        </Button>
      )}
    </div>
  );
}
