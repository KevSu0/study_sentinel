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
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import { useGlobalState } from '@/hooks/use-global-state';


interface StopTimerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (reason: string) => void;
}

const reasons = [
  'Too much work',
  'Boredom',
  'Laziness',
  'Took a break',
  'Other',
];

export function StopTimerDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: StopTimerDialogProps) {
  const [selectedValue, setSelectedValue] = useState('');
  const [customReason, setCustomReason] = useState('');
  const { stopTimer } = useGlobalState();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      selectedValue === 'Other' ? customReason : selectedValue;
    
    stopTimer(finalReason || 'No reason provided.');
    onConfirm(finalReason);

    onOpenChange(false);
    setSelectedValue('');
    setCustomReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>
              Why are you stopping the timer? Your feedback helps the AI give
              better advice.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <RadioGroup
              onValueChange={setSelectedValue}
              value={selectedValue}
              className="space-y-2"
            >
              {reasons.map(reason => (
                <Label
                  key={reason}
                  htmlFor={reason}
                  className="flex items-center gap-3 cursor-pointer rounded-md border p-3 transition-colors hover:bg-accent/50 has-[:checked]:bg-accent has-[:checked]:border-primary"
                >
                  <RadioGroupItem value={reason} id={reason} />
                  {reason}
                </Label>
              ))}
            </RadioGroup>
            {selectedValue === 'Other' && (
              <div className="mt-4">
                <Label htmlFor="stop-reason" className="sr-only">
                  Other reason
                </Label>
                <Textarea
                  id="stop-reason"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Please specify your reason..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedValue}>
              Confirm Stop
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
