import {useState} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Loader2} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {performAnalysis} from '@/lib/actions';
import type {StudyTask} from '@/lib/types';

interface AnalysisDialogProps {
  task: StudyTask;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAnalysisComplete: (analysis: StudyTask['analysis']) => void;
}

export function AnalysisDialog({
  task,
  isOpen,
  onOpenChange,
  onAnalysisComplete,
}: AnalysisDialogProps) {
  const [progressDescription, setProgressDescription] = useState(
    task.progressDescription || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const {toast} = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Required',
        description: 'Please describe your progress before analyzing.',
      });
      return;
    }

    setIsLoading(true);
    const analysisInput = {
      task: task.title,
      duration: task.duration,
      progressDescription,
    };

    const result = await performAnalysis(analysisInput);
    
    if (result && ('isOnTrack' in result || 'error' in result)) {
        onAnalysisComplete(result as StudyTask['analysis']);
    } else {
        onAnalysisComplete({
            isOnTrack: false,
            analysis: "An unexpected response was received from the AI.",
            error: "Invalid response format"
        });
    }

    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Analyze Study Progress</DialogTitle>
            <DialogDescription>
              Provide a description of your progress for the task: "{task.title}
              ". The AI monitor will give you feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Label htmlFor="progress-description">Progress Description</Label>
            <Textarea
              id="progress-description"
              value={progressDescription}
              onChange={e => setProgressDescription(e.target.value)}
              placeholder="e.g., Read pages 50-65 and took notes..."
              className="mt-1"
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
