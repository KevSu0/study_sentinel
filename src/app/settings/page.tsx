
// This is a new file for the settings page
'use client';

import React, { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { OfflineStatusIndicator, SyncStatusIndicator } from '@/components/ui/offline-status-indicator';
import { UserPreferencesRepository } from '@/lib/repositories/user-preferences.repository';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { state, setSoundSettings } = useGlobalState();
  const { isLoaded, soundSettings } = state;
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const userPrefsRepo = new UserPreferencesRepository();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const allPrefs = await userPrefsRepo.getAllPreferences();
      setPreferences(allPrefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoundChange = async (type: keyof typeof soundSettings, value: string | number) => {
    setSoundSettings({ [type]: value });
    // Also save to IndexedDB
    await userPrefsRepo.setPreference(`sound.${type}`, value);
  };

  const handlePreferenceChange = async (key: string, value: any) => {
    try {
      await userPrefsRepo.setPreference(key, value);
      setPreferences(prev => ({ ...prev, [key]: value }));
      toast.success('Preference saved');
    } catch (error) {
      console.error('Failed to save preference:', error);
      toast.error('Failed to save preference');
    }
  };

  const migrateFromLocalStorage = async () => {
    try {
      await userPrefsRepo.migrateFromLocalStorage();
      await loadPreferences();
      toast.success('Successfully migrated preferences from localStorage');
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Failed to migrate preferences');
    }
  };

  const clearAllPreferences = async () => {
    try {
      await userPrefsRepo.clearAllPreferences();
      setPreferences({});
      toast.success('All preferences cleared');
    } catch (error) {
      console.error('Failed to clear preferences:', error);
      toast.error('Failed to clear preferences');
    }
  };

  if (!isLoaded || isLoading) {
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-primary">Settings</h1>
            <p className="text-muted-foreground">Customize your experience.</p>
          </div>
          <div className="flex gap-2">
            <OfflineStatusIndicator />
            <SyncStatusIndicator />
          </div>
        </div>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection & Sync</CardTitle>
              <CardDescription>
                Monitor your connection status and sync preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">Automatically sync when online</p>
                </div>
                <Switch
                  checked={preferences['sync.autoSync'] ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange('sync.autoSync', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Background Sync</Label>
                  <p className="text-sm text-muted-foreground">Sync in background when app is closed</p>
                </div>
                <Switch
                  checked={preferences['sync.backgroundSync'] ?? false}
                  onCheckedChange={(checked) => handlePreferenceChange('sync.backgroundSync', checked)}
                />
              </div>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage your stored preferences and data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Offline Storage</Label>
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(preferences).length} preferences stored locally
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={migrateFromLocalStorage}>
                  Migrate from localStorage
                </Button>
                <Button variant="destructive" onClick={clearAllPreferences}>
                  Clear All Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
