
// This is a new file for the settings page
'use client';

import React, { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceMonitor } from '@/components/pwa/performance-monitor';
import { Settings, Database, Zap, Bell, FileText } from 'lucide-react';

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
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="sounds" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Sounds</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Legal</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sounds" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sound & Notifications</CardTitle>
                <CardDescription>
                  Choose the sounds for timer alerts and reminders.
                </CardDescription>
              </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label id="alarmSoundLabel" htmlFor="alarmSound">Alarm Sound</Label>
              <Select
                value={soundSettings.alarm}
                onValueChange={(value) => handleSoundChange('alarm', value)}
              >
                <SelectTrigger id="alarmSound" aria-labelledby="alarmSoundLabel">
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
              <Label id="tickSoundLabel" htmlFor="tickSound">Timer Tick Sound</Label>
              <Select
                value={soundSettings.tick}
                onValueChange={(value) => handleSoundChange('tick', value)}
              >
                <SelectTrigger id="tickSound" aria-labelledby="tickSoundLabel">
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
                <Label id="notificationIntervalLabel" htmlFor="notificationInterval">Reminder Interval</Label>
                <Select
                    value={String(soundSettings.notificationInterval)}
                    onValueChange={(value) => handleSoundChange('notificationInterval', Number(value))}
                >
                    <SelectTrigger id="notificationInterval" aria-labelledby="notificationIntervalLabel">
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
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <PerformanceMonitor />
        </TabsContent>
        
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage & Cache</CardTitle>
              <CardDescription>
                Manage app storage and cached data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Your study data is stored locally on this device.</p>
                  <p className="mt-2">Cache helps the app work offline and load faster.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic app configuration and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Study Sentinel is a Progressive Web App (PWA) that works offline.</p>
                  <p className="mt-2">Your data is stored locally and never leaves your device.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Legal Information</CardTitle>
              <CardDescription>
                Privacy policy and terms of service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <a
                    href="/privacy"
                    className="text-sm text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="/terms"
                    className="text-sm text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </a>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Study Sentinel respects your privacy and stores all data locally.</p>
                  <p className="mt-2">No personal information is collected or shared.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
    </div>
  );
}
