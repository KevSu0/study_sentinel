import {Button} from '@/components/ui/button';
import {BookOpenCheck} from 'lucide-react';

interface EmptyStateProps {
  onAddTask: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

export function EmptyState({
  onAddTask,
  title = "All Clear!",
  message = "There are no tasks here. Ready to add a new one?",
  buttonText = "Add First Task"
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-card rounded-lg shadow-sm border-2 border-dashed">
      <BookOpenCheck className="h-16 w-16 text-primary mb-4" />
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        {message}
      </p>
      <Button onClick={onAddTask} className="mt-6">
        {buttonText}
      </Button>
    </div>
  );
}
