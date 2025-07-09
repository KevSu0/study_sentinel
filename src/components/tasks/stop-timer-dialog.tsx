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

interface StopTimerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (reason: string) => void;
}

export function StopTimerDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: StopTimerDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason || 'No reason provided.');
    onOpenChange(false);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>
              Why are you stopping the timer? Your feedback helps the AI give
              better advice. (Optional)
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Label htmlFor="stop-reason" className="sr-only">
              Reason for stopping
            </Label>
            <Textarea
              id="stop-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., I got distracted, the task was harder than I thought, I needed a break..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Confirm Stop</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
