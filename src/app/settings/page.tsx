
// This is a new file for the settings page
'use client';

import React from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { state, setSoundSettings } = useGlobalState();
  const { isLoaded, soundSettings } = state;

  const handleSoundChange = (type: keyof typeof soundSettings, value: string | number) => {
    setSoundSettings({ [type]: value });
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col h-full">
        <header className="p-4 border-b">
          <h1 className="text-3xl font-bold text-primary">Settings</h1>
          <p className="text-muted-foreground">Customize your experience.</p>
        </header>
        <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-muted-foreground">Customize your experience.</p>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>Sound & Notifications</CardTitle>
            <CardDescription>
              Choose the sounds for timer alerts and reminders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="alarmSound">Alarm Sound</Label>
              <Select
                value={soundSettings.alarm}
                onValueChange={(value) => handleSoundChange('alarm', value)}
              >
                <SelectTrigger id="alarmSound">
                  <SelectValue placeholder="Select an alarm sound" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alarm_clock">Alarm Clock</SelectItem>
                  <SelectItem value="digital_alarm">Digital Alarm</SelectItem>
                  <SelectItem value="bell">Bell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tickSound">Timer Tick Sound</Label>
              <Select
                value={soundSettings.tick}
                onValueChange={(value) => handleSoundChange('tick', value)}
              >
                <SelectTrigger id="tickSound">
                  <SelectValue placeholder="Select a ticking sound" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="tick_tock">Tick Tock</SelectItem>
                  <SelectItem value="digital_tick">Digital Tick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notificationInterval">Reminder Interval</Label>
                <Select
                    value={String(soundSettings.notificationInterval)}
                    onValueChange={(value) => handleSoundChange('notificationInterval', Number(value))}
                >
                    <SelectTrigger id="notificationInterval">
                        <SelectValue placeholder="Select an interval" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">Every 10 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="20">Every 20 minutes</SelectItem>
                        <SelectItem value="25">Every 25 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="0">Off</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
