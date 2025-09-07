
// This is a new file for the settings page
'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import Dexie from 'dexie';

export default function SettingsPage() {
  const { state, setSoundSettings, updateProfile } = useGlobalState();
  const { isLoaded, soundSettings, profile } = state;
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const userPrefsRepo = new UserPreferencesRepository();
  const supportedTimeZones = useMemo(() => {
    try {
      // Modern environments
      // @ts-ignore
      if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
        // @ts-ignore
        return Intl.supportedValuesOf('timeZone') as string[];
      }
    } catch {}
    // Fallback: a small common set
    return [
      'UTC',
      'Europe/London',
      'Europe/Berlin',
      'Africa/Lagos',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Asia/Tokyo',
      'Australia/Sydney',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
    ];
  }, []);

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
  const handleTimezoneChange = async (tz: string) => {
    try {
      updateProfile({ timezone: tz });
      await userPrefsRepo.setPreference('region.timezone', tz);
      try { localStorage.setItem('region.timezone', tz); } catch {}
      toast.success('Timezone updated');
    } catch (e) {
      console.error('Failed to update timezone', e);
      toast.error('Failed to update timezone');
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
  const wipeAllData = async () => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('This will delete all local data (tasks, routines, logs, preferences). Continue?')
      : true;
    if (!confirmed) return;
    try {
      try { (await import('@/lib/db')).db.close(); } catch {}
      try { await Dexie.delete('MyDatabase'); } catch {}
      try { localStorage.clear(); sessionStorage.clear(); } catch {}
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch {}
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
      } catch {}
      toast.success('All local data wiped. Reloading...');
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      console.error('Wipe failed', e);
      toast.error('Failed to wipe data');
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
        <div>
          <h1 className="text-3xl font-bold text-primary">Settings</h1>
          <p className="text-muted-foreground">Customize your experience.</p>
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
              {/* Sync Status Indicators */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Connection Status</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <OfflineStatusIndicator />
                  </div>
                  <div className="flex-1">
                    <SyncStatusIndicator />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-4">
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
              <CardTitle>Time & Region</CardTitle>
              <CardDescription>Set your preferred timezone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezoneSelect">Timezone</Label>
                <Select
                  value={profile.timezone || 'UTC'}
                  onValueChange={handleTimezoneChange}
                >
                  <SelectTrigger id="timezoneSelect">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {supportedTimeZones.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
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
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={migrateFromLocalStorage}>
                  Migrate from localStorage
                </Button>
                <Button variant="destructive" onClick={clearAllPreferences}>
                  Clear All Preferences
                </Button>
                <Button variant="destructive" onClick={wipeAllData}>
                  Wipe All Data (Factory Reset)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
