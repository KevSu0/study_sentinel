// This is a new component for a user-friendly duration input.
'use client';

import React, {useState, useEffect} from 'react';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

interface DurationInputProps {
  value: number; // Value is always in minutes
  onChange: (value: number) => void;
}

export function DurationInput({value, onChange}: DurationInputProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // When the external value (total minutes) changes, update the local hours/minutes state
  useEffect(() => {
    const h = Math.floor(value / 60);
    const m = value % 60;
    setHours(h);
    setMinutes(m);
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = parseInt(e.target.value, 10) || 0;
    setHours(newHours);
    onChange(newHours * 60 + minutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = parseInt(e.target.value, 10) || 0;
    setMinutes(newMinutes);
    onChange(hours * 60 + newMinutes);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 space-y-1">
        <Label htmlFor="hours" className="sr-only">Hours</Label>
        <Input
          id="hours"
          type="number"
          value={hours}
          onChange={handleHoursChange}
          placeholder="Hours"
          min="0"
        />
      </div>
      <span className="text-muted-foreground pt-5">h</span>
      <div className="flex-1 space-y-1">
        <Label htmlFor="minutes" className="sr-only">Minutes</Label>
        <Input
          id="minutes"
          type="number"
          value={minutes}
          onChange={handleMinutesChange}
          placeholder="Mins"
          min="0"
          max="59"
          step="1"
        />
      </div>
       <span className="text-muted-foreground pt-5">m</span>
    </div>
  );
}
