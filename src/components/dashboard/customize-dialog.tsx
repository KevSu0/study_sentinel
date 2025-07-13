
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
import {useDashboardLayout, WIDGET_NAMES} from '@/hooks/use-dashboard-layout';
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';
import {GripVertical} from 'lucide-react';

interface CustomizeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CustomizeDialog({isOpen, onOpenChange}: CustomizeDialogProps) {
  const {layout, setLayout, toggleWidgetVisibility} = useDashboardLayout();

  const onDragEnd = (result: any) => {
    const {destination, source} = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newLayout = Array.from(layout);
    const [reorderedItem] = newLayout.splice(source.index, 1);
    newLayout.splice(destination.index, 0, reorderedItem);

    setLayout(newLayout);
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
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="customize-list">
              {provided => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {layout.map((widget, index) => (
                    <Draggable
                      key={widget.id}
                      draggableId={widget.id}
                      index={index}
                    >
                      {provided => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center gap-2 rounded-lg border bg-card p-3"
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab p-1">
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
                            onCheckedChange={() =>
                              toggleWidgetVisibility(widget.id)
                            }
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
