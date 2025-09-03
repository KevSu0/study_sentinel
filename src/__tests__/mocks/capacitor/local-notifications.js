/**
 * Capacitor LocalNotifications Plugin Mock
 * 
 * Mocks the Capacitor LocalNotifications plugin for testing notification
 * scheduling, delivery, and interaction functionality.
 */

const LocalNotificationsMock = {
  // Mock notification storage
  _scheduledNotifications: new Map(),
  _deliveredNotifications: new Map(),
  _notificationId: 1,
  _listeners: new Map(),
  
  // Schedule notifications
  schedule: jest.fn().mockImplementation(async (options) => {
    const { notifications } = options;
    const scheduledNotifications = [];
    
    for (const notification of notifications) {
      const id = notification.id || LocalNotificationsMock._notificationId++;
      const scheduledNotification = {
        id,
        title: notification.title,
        body: notification.body,
        schedule: notification.schedule,
        sound: notification.sound,
        attachments: notification.attachments,
        actionTypeId: notification.actionTypeId,
        extra: notification.extra,
        iconColor: notification.iconColor,
        ongoing: notification.ongoing,
        autoCancel: notification.autoCancel,
        largeBody: notification.largeBody,
        summaryText: notification.summaryText,
        smallIcon: notification.smallIcon,
        largeIcon: notification.largeIcon,
        channelId: notification.channelId || 'default',
        scheduledAt: Date.now()
      };
      
      LocalNotificationsMock._scheduledNotifications.set(id, scheduledNotification);
      scheduledNotifications.push({ id });
      
      // Simulate immediate delivery for testing
      if (!notification.schedule || notification.schedule.at) {
        setTimeout(() => {
          LocalNotificationsMock._deliverNotification(scheduledNotification);
        }, 100);
      }
    }
    
    return { notifications: scheduledNotifications };
  }),
  
  // Get pending notifications
  getPending: jest.fn().mockImplementation(async () => {
    const notifications = Array.from(LocalNotificationsMock._scheduledNotifications.values())
      .filter(notification => !LocalNotificationsMock._deliveredNotifications.has(notification.id));
    
    return { notifications };
  }),
  
  // Register action types
  registerActionTypes: jest.fn().mockImplementation(async (options) => {
    // Store action types for reference
    LocalNotificationsMock._actionTypes = options.types;
  }),
  
  // Cancel notifications
  cancel: jest.fn().mockImplementation(async (options) => {
    const { notifications } = options;
    
    for (const notification of notifications) {
      LocalNotificationsMock._scheduledNotifications.delete(notification.id);
      LocalNotificationsMock._deliveredNotifications.delete(notification.id);
    }
  }),
  
  // Check permissions
  checkPermissions: jest.fn().mockResolvedValue({
    display: 'granted'
  }),
  
  // Request permissions
  requestPermissions: jest.fn().mockResolvedValue({
    display: 'granted'
  }),
  
  // Create notification channel (Android)
  createChannel: jest.fn().mockImplementation(async (channel) => {
    // Store channel for reference
    LocalNotificationsMock._channels = LocalNotificationsMock._channels || new Map();
    LocalNotificationsMock._channels.set(channel.id, channel);
  }),
  
  // Delete notification channel (Android)
  deleteChannel: jest.fn().mockImplementation(async (options) => {
    const { id } = options;
    if (LocalNotificationsMock._channels) {
      LocalNotificationsMock._channels.delete(id);
    }
  }),
  
  // List notification channels (Android)
  listChannels: jest.fn().mockImplementation(async () => {
    const channels = LocalNotificationsMock._channels ? 
      Array.from(LocalNotificationsMock._channels.values()) : [];
    return { channels };
  }),
  
  // Get delivered notifications
  getDeliveredNotifications: jest.fn().mockImplementation(async () => {
    const notifications = Array.from(LocalNotificationsMock._deliveredNotifications.values());
    return { notifications };
  }),
  
  // Remove delivered notifications
  removeDeliveredNotifications: jest.fn().mockImplementation(async (options) => {
    const { notifications } = options;
    
    for (const notification of notifications) {
      LocalNotificationsMock._deliveredNotifications.delete(notification.id);
    }
  }),
  
  // Remove all delivered notifications
  removeAllDeliveredNotifications: jest.fn().mockImplementation(async () => {
    LocalNotificationsMock._deliveredNotifications.clear();
  }),
  
  // Event listeners
  addListener: jest.fn().mockImplementation((eventName, listenerFunc) => {
    if (!LocalNotificationsMock._listeners.has(eventName)) {
      LocalNotificationsMock._listeners.set(eventName, []);
    }
    LocalNotificationsMock._listeners.get(eventName).push(listenerFunc);
    
    return {
      remove: () => {
        const listeners = LocalNotificationsMock._listeners.get(eventName) || [];
        const index = listeners.indexOf(listenerFunc);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }),
  
  removeAllListeners: jest.fn().mockImplementation(() => {
    LocalNotificationsMock._listeners.clear();
  }),
  
  // Internal helper to deliver notification
  _deliverNotification: (notification) => {
    LocalNotificationsMock._deliveredNotifications.set(notification.id, {
      ...notification,
      deliveredAt: Date.now()
    });
    
    // Trigger received event
    const receivedListeners = LocalNotificationsMock._listeners.get('localNotificationReceived') || [];
    receivedListeners.forEach(listener => {
      listener({ notification });
    });
  },
  
  // Test helpers
  __scheduleTestNotification: (options = {}) => {
    const notification = {
      id: options.id || LocalNotificationsMock._notificationId++,
      title: options.title || 'Test Notification',
      body: options.body || 'This is a test notification',
      schedule: options.schedule,
      extra: options.extra,
      channelId: options.channelId || 'default',
      scheduledAt: Date.now(),
      ...options
    };
    
    LocalNotificationsMock._scheduledNotifications.set(notification.id, notification);
    return notification;
  },
  
  __deliverTestNotification: (notificationId) => {
    const notification = LocalNotificationsMock._scheduledNotifications.get(notificationId);
    if (notification) {
      LocalNotificationsMock._deliverNotification(notification);
    }
  },
  
  __simulateNotificationTap: (notificationId, actionId) => {
    const notification = LocalNotificationsMock._deliveredNotifications.get(notificationId);
    if (notification) {
      const actionPerformedListeners = LocalNotificationsMock._listeners.get('localNotificationActionPerformed') || [];
      actionPerformedListeners.forEach(listener => {
        listener({
          notification,
          actionId: actionId || 'tap'
        });
      });
    }
  },
  
  __getScheduledNotifications: () => {
    return Array.from(LocalNotificationsMock._scheduledNotifications.values());
  },
  
  __getDeliveredNotifications: () => {
    return Array.from(LocalNotificationsMock._deliveredNotifications.values());
  },
  
  __getListeners: (eventName) => {
    return LocalNotificationsMock._listeners.get(eventName) || [];
  },
  
  __simulatePermissionDenied: () => {
    LocalNotificationsMock.checkPermissions.mockResolvedValue({ display: 'denied' });
    LocalNotificationsMock.requestPermissions.mockResolvedValue({ display: 'denied' });
  },
  
  __simulatePermissionGranted: () => {
    LocalNotificationsMock.checkPermissions.mockResolvedValue({ display: 'granted' });
    LocalNotificationsMock.requestPermissions.mockResolvedValue({ display: 'granted' });
  },
  
  __simulateScheduleError: () => {
    const originalSchedule = LocalNotificationsMock.schedule;
    LocalNotificationsMock.schedule = jest.fn().mockRejectedValue(
      new Error('Failed to schedule notification')
    );
    return () => {
      LocalNotificationsMock.schedule = originalSchedule;
    };
  },
  
  __reset: () => {
    LocalNotificationsMock._scheduledNotifications.clear();
    LocalNotificationsMock._deliveredNotifications.clear();
    LocalNotificationsMock._listeners.clear();
    LocalNotificationsMock._notificationId = 1;
    LocalNotificationsMock._actionTypes = undefined;
    LocalNotificationsMock._channels = undefined;
    
    // Reset permission mocks
    LocalNotificationsMock.checkPermissions.mockResolvedValue({ display: 'granted' });
    LocalNotificationsMock.requestPermissions.mockResolvedValue({ display: 'granted' });
  }
};

module.exports = LocalNotificationsMock;