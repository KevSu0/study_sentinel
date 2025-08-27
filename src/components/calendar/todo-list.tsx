import React, {useState} from 'react';
import {useCalendarEvents} from '@/hooks/use-calendar-events';
import {CalendarEvent, StudyBlock, PersonalEvent} from '@/lib/types';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

interface TodoListProps {
  currentDay: Date;
}

export function TodoList({currentDay}: TodoListProps) {
  const {events, addEvent, updateEvent} = useCalendarEvents();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const formattedCurrentDay = currentDay.toISOString().split('T')[0];

  const unscheduledEvents = events.filter(event => {
    if (event.date !== formattedCurrentDay) {
      return false;
    }
    if ('startTime' in event && event.startTime) {
      return false;
    }
    return true;
  });

  const handleAddTask = () => {
    if (newTaskTitle.trim() === '') return;

    const newEvent: Omit<StudyBlock, 'id'> = {
      title: newTaskTitle.trim(),
      date: formattedCurrentDay,
      type: 'study_block',
      isCompleted: false,
    };

    addEvent(newEvent);
    setNewTaskTitle('');
  };

  const handleToggleComplete = (event: CalendarEvent) => {
    if ('isCompleted' in event) {
      const updatedEvent = {...event, isCompleted: !event.isCompleted};
      updateEvent(updatedEvent as StudyBlock | PersonalEvent);
    }
  };

  return (
    <Card data-testid="day-view-todo-list">
      <CardHeader>
        <CardTitle>Today's To-Do</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {unscheduledEvents.map(event => (
            <div key={event.id} className="flex items-center space-x-2">
              <Checkbox
                id={event.id}
                checked={'isCompleted' in event ? event.isCompleted : false}
                onCheckedChange={() => handleToggleComplete(event)}
                disabled={'isCompleted' in event ? false : true}
              />
              <label
                htmlFor={event.id}
                className={`text-sm font-medium leading-none ${
                  'isCompleted' in event && event.isCompleted
                    ? 'line-through text-muted-foreground'
                    : ''
                }`}
              >
                {event.title}
              </label>
            </div>
          ))}
        </div>
        <div className="mt-4 flex w-full max-w-sm items-center space-x-2">
          <Input
            type="text"
            placeholder="Add a new task"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddTask()}
          />
          <Button onClick={handleAddTask}>Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}