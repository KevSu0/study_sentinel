
'use client';
import { useState, useEffect } from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function RoutineLogDialog() {
  const { state, closeRoutineLogDialog, completeTimer, stopTimer } = useGlobalState();
  const { activeItem, routineLogDialog } = state;
  const [studyLog, setStudyLog] = useState('');

  useEffect(() => {
    // Reset local state when dialog opens
    if (routineLogDialog.isOpen) {
      setStudyLog('');
    }
  }, [routineLogDialog.isOpen]);

  if (!routineLogDialog.isOpen || activeItem?.type !== 'routine') {
    return null;
  }
  
  const handleConfirm = () => {
    if(routineLogDialog.action === 'complete') {
        completeTimer(studyLog);
    } else if (routineLogDialog.action === 'stop') {
        stopTimer('Stopped routine manually', studyLog);
    }
    closeRoutineLogDialog();
  };

  return (
    <Dialog open={routineLogDialog.isOpen} onOpenChange={closeRoutineLogDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Your Study Session</DialogTitle>
          <DialogDescription>
            You've finished your session for "{activeItem.item.title}". Briefly describe what you studied or accomplished.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="study-log" className="sr-only">
            What did you study?
          </Label>
          <Textarea
            id="study-log"
            value={studyLog}
            onChange={(e) => setStudyLog(e.target.value)}
            placeholder="e.g., Reviewed Chapter 3 vocabulary and completed practice exercises..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={closeRoutineLogDialog}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm & Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
