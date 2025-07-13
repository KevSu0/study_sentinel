
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
import {
  useDashboardLayout,
  WIDGET_NAMES,
  type DashboardWidget,
} from '@/hooks/use-dashboard-layout.tsx';
import {DndContext, closestCenter, type DragEndEvent} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {GripVertical, LayoutGrid, List} from 'lucide-react';
import {useViewMode} from '@/hooks/use-view-mode';
import {Separator} from '../ui/separator';

interface CustomizeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function SortableItem({
  widget,
  onToggle,
}: {
  widget: DashboardWidget;
  onToggle: () => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition} =
    useSortable({id: widget.id});

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
  const {viewMode, setViewMode} = useViewMode();

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (over && active.id !== over.id) {
      const oldIndex = layout.findIndex(item => item.id === active.id);
      const newIndex = layout.findIndex(item => item.id === over.id);
      setLayout(arrayMove(layout, oldIndex, newIndex));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Change view modes, drag to reorder widgets, and toggle their visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6 flex-1 overflow-y-auto pr-2">
          <div>
            <Label className="text-base font-medium">View Mode</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'outline'}
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="mr-2" />
                Card View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                <List className="mr-2" />
                List View
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-base font-medium">Widgets</Label>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={layout.map(w => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 mt-2">
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
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
