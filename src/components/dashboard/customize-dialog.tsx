
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {useDashboardLayout, WIDGET_NAMES, type DashboardWidget} from '@/hooks/use-dashboard-layout';
import {
  DndContext,
  closestCenter,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {GripVertical} from 'lucide-react';

interface CustomizeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function SortableItem({widget, onToggle}: {widget: DashboardWidget; onToggle: () => void}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: widget.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border bg-card p-3"
    >
      <div {...attributes} {...listeners} className="cursor-grab p-1">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <Label
        htmlFor={`widget-${widget.id}`}
        className="flex-grow text-sm font-medium"
      >
        {WIDGET_NAMES[widget.id]}
      </Label>
      <Switch
        id={`widget-${widget.id}`}
        checked={widget.isVisible}
        onCheckedChange={onToggle}
      />
    </div>
  );
}

export function CustomizeDialog({isOpen, onOpenChange}: CustomizeDialogProps) {
  const {layout, setLayout, toggleWidgetVisibility} = useDashboardLayout();

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (over && active.id !== over.id) {
      const oldIndex = layout.findIndex((item) => item.id === active.id);
      const newIndex = layout.findIndex((item) => item.id === over.id);
      setLayout(arrayMove(layout, oldIndex, newIndex));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Drag to reorder. Toggle to show or hide widgets.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={layout.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {layout.map(widget => (
                  <SortableItem
                    key={widget.id}
                    widget={widget}
                    onToggle={() => toggleWidgetVisibility(widget.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
