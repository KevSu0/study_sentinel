import React, { useState, type PointerEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { type CalendarEvent, type StudyBlock, type PersonalEvent } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EventItemProps {
  event: CalendarEvent;
  onUpdate: (event: CalendarEvent) => void;
  onClick: (event: CalendarEvent) => void;
  gridCellHeight: number; // Height of a 30-minute slot in pixels
}

const isResizable = (event: CalendarEvent): event is StudyBlock | PersonalEvent => {
  return event.type === 'study_block' || event.type === 'personal_event';
};

const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function EventItem({ event, onUpdate, onClick, gridCellHeight }: EventItemProps) {
  const [isResizing, setIsResizing] = useState(false);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: { event, type: 'event' },
    disabled: isResizing,
  });

  const getEventDateTime = (time: string | undefined): Date | null => {
    if (!time) return null;
    return new Date(`${event.date}T${time}`);
  };

  let height = gridCellHeight; // Default height for non-resizable events
  if (isResizable(event) && event.startTime && event.endTime) {
    const startTime = getEventDateTime(event.startTime);
    const endTime = getEventDateTime(event.endTime);
    if (startTime && endTime) {
      const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      height = (durationInMinutes / 30) * gridCellHeight;
    }
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        height: `${height}px`,
        opacity: transform ? 0.8 : 1,
      }
    : {
        height: `${height}px`,
      };

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const handleResizeEnd = (newStartTime?: Date, newEndTime?: Date) => {
    setIsResizing(false);
    if (!isResizable(event)) return;

    const updatedEvent = {
      ...event,
      startTime: newStartTime ? formatTime(newStartTime) : event.startTime,
      endTime: newEndTime ? formatTime(newEndTime) : event.endTime,
    };
    onUpdate(updatedEvent);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {isResizable(event) && event.startTime && (
        <ResizeHandle
          edge="top"
          onResizeStart={handleResizeStart}
          onResizeEnd={(deltaY) => {
            const startTime = getEventDateTime(event.startTime);
            if (!startTime) return;
            const newStartTime = new Date(startTime.getTime() + (deltaY / gridCellHeight) * 30 * 60 * 1000);
            handleResizeEnd(newStartTime, undefined);
          }}
        />
      )}
      <div {...listeners} {...attributes} className="h-full" onClick={() => onClick(event)}>
        <Card className={cn("w-full h-full p-2 bg-blue-100 dark:bg-blue-900", isResizing && "cursor-ns-resize")}>
          <div className="font-bold">{event.title}</div>
          {isResizable(event) && event.notes && <div>{event.notes}</div>}
        </Card>
      </div>
      {isResizable(event) && event.endTime && (
        <ResizeHandle
          edge="bottom"
          onResizeStart={handleResizeStart}
          onResizeEnd={(deltaY) => {
            const endTime = getEventDateTime(event.endTime);
            if (!endTime) return;
            const newEndTime = new Date(endTime.getTime() + (deltaY / gridCellHeight) * 30 * 60 * 1000);
            handleResizeEnd(undefined, newEndTime);
          }}
        />
      )}
    </div>
  );
}

interface ResizeHandleProps {
  edge: 'top' | 'bottom';
  onResizeStart: () => void;
  onResizeEnd: (deltaY: number) => void;
}

function ResizeHandle({ edge, onResizeStart, onResizeEnd }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartY(e.clientY);
    onResizeStart();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    // We only care about the final position, handled in onPointerUp
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    const deltaY = e.clientY - startY;
    onResizeEnd(deltaY);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        'absolute left-0 right-0 h-2 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize z-10',
        edge === 'top' ? '-top-1' : '-bottom-1'
      )}
    />
  );
}