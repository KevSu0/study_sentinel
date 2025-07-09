import {Button} from '@/components/ui/button';
import {BookOpenCheck} from 'lucide-react';

interface EmptyStateProps {
  onAddTask: () => void;
}

export function EmptyState({onAddTask}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-card rounded-lg shadow-sm">
      <BookOpenCheck className="h-16 w-16 text-primary mb-4" />
      <h2 className="text-2xl font-bold">All Clear for Today!</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        You have no tasks scheduled for today. Take a well-deserved break or get
        ahead by planning your next study session.
      </p>
      <Button onClick={onAddTask} className="mt-6">
        Plan Your Next Task
      </Button>
    </div>
  );
}
