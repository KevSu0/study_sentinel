import { db } from './database';
import { safeApiFetch } from '@/lib/remote-api-gate';
import { remoteApiPaths } from './remote-api-paths';

// Push notification manager
export class PushNotificationManager {
  private isSupported: boolean;
  private subscription: PushSubscription | null = null;
  private vapidPublicKey: string;

  constructor(vapidPublicKey: string) {
    this.vapidPublicKey = vapidPublicKey;
    this.isSupported = this.checkSupport();
  }

  private checkSupport(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      
      // Save subscription to server
      await this.saveSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      const subscription = this.subscription;
      const result = await subscription.unsubscribe();
      this.subscription = null;

      // Remove subscription from server
      if (subscription) {
        await this.removeSubscriptionFromServer(subscription);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Check if subscribed
  async isSubscribed(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      this.subscription = subscription;
      return !!subscription;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Get current subscription
  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  // Send notification locally (for testing)
  sendLocalNotification(title: string, options: NotificationOptions = {}): void {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      icon: '/icons/icon.png',
      badge: '/icons/badge.png',
      ...options
    });

    notification.onclick = () => {
      notification.close();
      window.focus();
    };
  }

  // Convert VAPID public key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  // Save subscription to server
  private async saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await safeApiFetch(remoteApiPaths.notificationsSubscribe(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error(`Failed to save subscription: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save subscription to server:', error);
      throw error;
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await safeApiFetch(remoteApiPaths.notificationsUnsubscribe(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error(`Failed to remove subscription: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      throw error;
    }
  }
}

// Notification scheduler for study reminders
export class NotificationScheduler {
  private scheduler: NotificationChannelScheduler;

  constructor() {
    this.scheduler = new NotificationChannelScheduler();
  }

  // Schedule study reminder
  async scheduleStudyReminder(time: string, subject?: string): Promise<void> {
    await this.scheduler.scheduleNotification({
      type: 'study_reminder',
      title: 'Study Time!',
      body: subject ? `Time to study ${subject}` : 'Time to start your study session',
      time,
      icon: '/icons/study.png',
      tag: 'study-reminder'
    });
  }

  // Schedule streak protection notification
  async scheduleStreakProtection(streakDays: number): Promise<void> {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const timeUntilEnd = endOfDay.getTime() - now.getTime();

    if (timeUntilEnd > 0 && timeUntilEnd < 4 * 60 * 60 * 1000) { // Within 4 hours of day end
      await this.scheduler.scheduleNotification({
        type: 'streak_protection',
        title: `${streakDays} Day Streak!`,
        body: `Don't break your streak! Study for at least 10 minutes today.`,
        time: endOfDay.toISOString().slice(11, 16), // HH:MM format
        icon: '/icons/streak.png',
        tag: 'streak-protection'
      });
    }
  }

  // Schedule session summary
  async scheduleSessionSummary(sessionData: {
    duration: number;
    subject: string;
    completedTasks: number;
  }): Promise<void> {
    const duration = Math.round(sessionData.duration / 60000); // Convert to minutes
    let body = `Great session! ${duration} min of ${sessionData.subject}`;
    
    if (sessionData.completedTasks > 0) {
      body += ` â€¢ ${sessionData.completedTasks} task${sessionData.completedTasks > 1 ? 's' : ''} completed`;
    }

    await this.scheduler.scheduleNotification({
      type: 'session_summary',
      title: 'Session Complete',
      body,
      time: new Date().toISOString().slice(11, 16), // Send immediately
      icon: '/icons/summary.png',
      tag: 'session-summary'
    });
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    await this.scheduler.cancelAllNotifications();
  }

  // Cancel notifications by type
  async cancelNotificationsByType(type: string): Promise<void> {
    await this.scheduler.cancelNotificationsByType(type);
  }

  // Get scheduled notifications
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    return await this.scheduler.getScheduledNotifications();
  }
}

// Channel-specific notification scheduler
class NotificationChannelScheduler {
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

  async scheduleNotification(notification: Omit<ScheduledNotification, 'id'>): Promise<void> {
    const id = `${notification.type}_${Date.now()}`;
    const scheduledNotification: ScheduledNotification = {
      id,
      ...notification
    };

    this.scheduledNotifications.set(id, scheduledNotification);
    
    // Store in IndexedDB for persistence
    await this.saveToStorage(scheduledNotification);
    
    // Schedule the notification
    this.scheduleNotificationTask(scheduledNotification);
  }

  private async scheduleNotificationTask(notification: ScheduledNotification): Promise<void> {
    const now = new Date();
    const [hours, minutes] = notification.time.split(':').map(Number);
    const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    // If the time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.sendNotification(notification);
    }, delay);
  }

  private sendNotification(notification: ScheduledNotification): void {
    // Check quiet hours
    if (this.isInQuietHours()) {
      return;
    }

    // Send notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: '/icons/badge.png',
        tag: notification.tag,
        requireInteraction: false
      });
    }

    // Remove from storage
    this.removeFromStorage(notification.id);
    this.scheduledNotifications.delete(notification.id);

    // Reschedule for next day if recurring
    if (notification.type === 'study_reminder') {
      this.scheduleNotificationTask(notification);
    }
  }

  private isInQuietHours(): boolean {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHours * 60 + currentMinutes;

    // Quiet hours: 22:00 to 08:00 (10 PM to 8 AM)
    const quietStart = 22 * 60; // 22:00 in minutes
    const quietEnd = 8 * 60; // 08:00 in minutes

    return currentTime >= quietStart || currentTime < quietEnd;
  }

  async cancelAllNotifications(): Promise<void> {
    this.scheduledNotifications.clear();
    await this.clearStorage();
  }

  async cancelNotificationsByType(type: string): Promise<void> {
    for (const [id, notification] of this.scheduledNotifications) {
      if (notification.type === type) {
        this.scheduledNotifications.delete(id);
        await this.removeFromStorage(id);
      }
    }
  }

  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    return Array.from(this.scheduledNotifications.values());
  }

  private async saveToStorage(notification: ScheduledNotification): Promise<void> {
    // Implementation would save to IndexedDB
    // For now, just keep in memory
  }

  private async removeFromStorage(id: string): Promise<void> {
    // Implementation would remove from IndexedDB
  }

  private async clearStorage(): Promise<void> {
    // Implementation would clear IndexedDB
  }
}

// Settings manager for notification preferences
export class NotificationSettingsManager {
  private static SETTINGS_KEY = 'notification_settings';

  async getSettings(): Promise<NotificationSettings> {
    const settings = await db.settings.get('default');
    
    return {
      studyReminders: settings?.studyReminders || false,
      streakProtection: settings?.notifications || false,
      sessionSummaries: settings?.notifications || false,
      quietHours: {
        enabled: settings?.quietHours?.enabled || true,
        start: settings?.quietHours?.start || '22:00',
        end: settings?.quietHours?.end || '08:00'
      },
      dailyCap: 5,
      channels: {
        studyReminders: settings?.studyReminders || false,
        streakProtection: settings?.notifications || false,
        sessionSummaries: settings?.notifications || false
      }
    };
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    // Update app settings
    await db.updateSettings({
      studyReminders: updatedSettings.studyReminders,
      notifications: updatedSettings.streakProtection || updatedSettings.sessionSummaries,
      quietHours: updatedSettings.quietHours
    });
  }

  async enableChannel(channel: keyof NotificationSettings['channels']): Promise<void> {
    const settings = await this.getSettings();
    settings.channels[channel] = true;
    await this.updateSettings(settings);
  }

  async disableChannel(channel: keyof NotificationSettings['channels']): Promise<void> {
    const settings = await this.getSettings();
    settings.channels[channel] = false;
    await this.updateSettings(settings);
  }

  async isChannelEnabled(channel: keyof NotificationSettings['channels']): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.channels[channel];
  }
}

// Type definitions
export interface NotificationSettings {
  studyReminders: boolean;
  streakProtection: boolean;
  sessionSummaries: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  dailyCap: number;
  channels: {
    studyReminders: boolean;
    streakProtection: boolean;
    sessionSummaries: boolean;
  };
}

export interface ScheduledNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  icon: string;
  tag: string;
}

// Global instances
let pushManager: PushNotificationManager | null = null;
let scheduler: NotificationScheduler | null = null;
let settingsManager: NotificationSettingsManager | null = null;

// Initialize notification system
export function initializeNotifications(vapidPublicKey: string): {
  pushManager: PushNotificationManager;
  scheduler: NotificationScheduler;
  settingsManager: NotificationSettingsManager;
} {
  if (!pushManager) {
    pushManager = new PushNotificationManager(vapidPublicKey);
  }
  
  if (!scheduler) {
    scheduler = new NotificationScheduler();
  }
  
  if (!settingsManager) {
    settingsManager = new NotificationSettingsManager();
  }

  return { pushManager, scheduler, settingsManager };
}

// Get notification instances
export function getNotificationManager() {
  return { pushManager, scheduler, settingsManager };
}



