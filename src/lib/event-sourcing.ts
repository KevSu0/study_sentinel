import { db, AppEvent, StudySessionEvent, TaskEvent, BadgeEvent, DailyRollup, WeeklyRollup, MonthlyRollup } from './database';

// Event manager for handling all application events
export class EventManager {
  private deviceId: string;
  private sessionId: string | null = null;
  private analyticsEngine: AnalyticsEngine;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.analyticsEngine = new AnalyticsEngine();
    this.initializeSession();
  }

  private initializeSession(): void {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Study session events
  async createStudySession(session: {
    subject: string;
    duration: number;
    startTime: number;
    endTime: number;
    notes?: string;
    rating?: number;
    tags?: string[];
  }): Promise<string> {
    const event: StudySessionEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      version: 1,
      type: 'study_session_created',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: session
    };

    const eventId = await db.addEvent(event);
    
    // Trigger analytics update
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  async updateStudySession(sessionId: string, updates: {
    subject?: string;
    duration?: number;
    startTime?: number;
    endTime?: number;
    notes?: string;
    rating?: number;
    tags?: string[];
  }): Promise<string> {
    const event: StudySessionEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      version: 1,
      type: 'study_session_updated',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: updates as any
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  async deleteStudySession(sessionId: string): Promise<string> {
    const event: StudySessionEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      version: 1,
      type: 'study_session_deleted',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: { sessionId } as any
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  // Task events
  async createTask(task: {
    title: string;
    description?: string;
    subject?: string;
    dueDate?: number;
    priority: 'low' | 'medium' | 'high';
    estimatedTime?: number;
  }): Promise<string> {
    const event: TaskEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      version: 1,
      type: 'task_created',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: { ...task, completed: false }
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  async updateTask(taskId: string, updates: {
    title?: string;
    description?: string;
    subject?: string;
    dueDate?: number;
    priority?: 'low' | 'medium' | 'high';
    completed?: boolean;
    estimatedTime?: number;
  }): Promise<string> {
    const event: TaskEvent = {
      type: 'task_updated',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: { taskId, ...updates }
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  async completeTask(taskId: string): Promise<string> {
    const event: TaskEvent = {
      type: 'task_completed',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: { taskId, completed: true }
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  async deleteTask(taskId: string): Promise<string> {
    const event: TaskEvent = {
      type: 'task_deleted',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: { taskId }
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  // Badge events
  async awardBadge(badge: {
    badgeId: string;
    badgeName: string;
    criteria: string;
  }): Promise<string> {
    const event: BadgeEvent = {
      type: 'badge_earned',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: { ...badge, earnedAt: Date.now() }
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  async revokeBadge(badgeId: string): Promise<string> {
    const event: BadgeEvent = {
      type: 'badge_revoked',
      deviceId: this.deviceId,
      sessionId: this.sessionId!,
      data: { badgeId, earnedAt: Date.now() }
    };

    const eventId = await db.addEvent(event);
    await this.analyticsEngine.processEvent(event);
    
    return eventId;
  }

  // Event replay for rebuilding state
  async replayEvents(startDate?: number, endDate?: number): Promise<void> {
    const events = await db.getEvents({ startDate, endDate });
    
    for (const event of events) {
      await this.analyticsEngine.processEvent(event);
    }
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }

  // End current session and start new one
  async startNewSession(): Promise<void> {
    this.initializeSession();
  }
}

// Analytics engine for processing events and generating roll-ups
class AnalyticsEngine {
  private isProcessing = false;
  private processingQueue: AppEvent[] = [];

  async processEvent(event: AppEvent): Promise<void> {
    this.processingQueue.push(event);
    
    if (!this.isProcessing) {
      this.isProcessing = true;
      await this.processQueue();
      this.isProcessing = false;
    }
  }

  private async processQueue(): Promise<void> {
    while (this.processingQueue.length > 0) {
      const event = this.processingQueue.shift()!;
      await this.updateAnalytics(event);
    }
  }

  private async updateAnalytics(event: AppEvent): Promise<void> {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const weekStart = this.getWeekStart(now);
    const month = now.toISOString().slice(0, 7); // YYYY-MM

    switch (event.type) {
      case 'study_session_created':
      case 'study_session_updated':
        await this.updateDailyAnalytics(date, event as StudySessionEvent);
        await this.updateWeeklyAnalytics(weekStart, event as StudySessionEvent);
        await this.updateMonthlyAnalytics(month, event as StudySessionEvent);
        break;
      
      case 'task_completed':
        await this.updateTaskAnalytics(date, event as TaskEvent);
        break;
      
      case 'badge_earned':
        await this.updateBadgeAnalytics(date, event as BadgeEvent);
        break;
    }
  }

  private async updateDailyAnalytics(date: string, event: StudySessionEvent): Promise<void> {
    let rollup = await db.getDailyRollup(date);
    
    if (!rollup) {
      rollup = this.createEmptyDailyRollup(date);
    }

    if (event.type === 'study_session_created') {
      rollup.totalStudyTime += event.data.duration;
      rollup.sessionCount += 1;
      
      if (event.data.rating) {
        rollup.averageRating = (rollup.averageRating * (rollup.sessionCount - 1) + event.data.rating) / rollup.sessionCount;
      }
      
      // Update subject breakdown
      if (rollup.subjectBreakdown[event.data.subject]) {
        rollup.subjectBreakdown[event.data.subject] += event.data.duration;
      } else {
        rollup.subjectBreakdown[event.data.subject] = event.data.duration;
      }
    }

    // Calculate consistency score
    rollup.consistencyScore = this.calculateConsistencyScore(rollup);
    
    await db.updateDailyRollup(rollup);
  }

  private async updateWeeklyAnalytics(weekStart: string, event: StudySessionEvent): Promise<void> {
    let rollup = await db.getWeeklyRollup(weekStart);
    
    if (!rollup) {
      rollup = this.createEmptyWeeklyRollup(weekStart);
    }

    if (event.type === 'study_session_created') {
      rollup.totalStudyTime += event.data.duration;
      rollup.sessionCount += 1;
      
      // Update subject breakdown
      if (rollup.subjectBreakdown[event.data.subject]) {
        rollup.subjectBreakdown[event.data.subject] += event.data.duration;
      } else {
        rollup.subjectBreakdown[event.data.subject] = event.data.duration;
      }
    }

    rollup.averageSessionLength = rollup.sessionCount > 0 ? rollup.totalStudyTime / rollup.sessionCount : 0;
    rollup.consistencyScore = this.calculateConsistencyScore(rollup);
    
    await db.updateWeeklyRollup(rollup);
  }

  private async updateMonthlyAnalytics(month: string, event: StudySessionEvent): Promise<void> {
    let rollup = await db.getMonthlyRollup(month);
    
    if (!rollup) {
      rollup = this.createEmptyMonthlyRollup(month);
    }

    if (event.type === 'study_session_created') {
      rollup.totalStudyTime += event.data.duration;
      rollup.sessionCount += 1;
      
      // Update subject breakdown
      if (rollup.subjectBreakdown[event.data.subject]) {
        rollup.subjectBreakdown[event.data.subject] += event.data.duration;
      } else {
        rollup.subjectBreakdown[event.data.subject] = event.data.duration;
      }
    }

    const daysInMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate();
    rollup.averageDailyStudyTime = rollup.totalStudyTime / daysInMonth;
    rollup.consistencyScore = this.calculateConsistencyScore(rollup);
    
    await db.updateMonthlyRollup(rollup);
  }

  private async updateTaskAnalytics(date: string, event: TaskEvent): Promise<void> {
    const rollup = await db.getDailyRollup(date);
    if (!rollup) return;

    rollup.completedTasks += 1;
    await db.updateDailyRollup(rollup);
  }

  private async updateBadgeAnalytics(date: string, event: BadgeEvent): Promise<void> {
    // Badge analytics can be expanded as needed
    const rollup = await db.getDailyRollup(date);
    if (!rollup) return;

    // Badges might affect consistency score or other metrics
    rollup.consistencyScore = this.calculateConsistencyScore(rollup);
    await db.updateDailyRollup(rollup);
  }

  private createEmptyDailyRollup(date: string): DailyRollup {
    return {
      date,
      totalStudyTime: 0,
      sessionCount: 0,
      completedTasks: 0,
      subjectBreakdown: {},
      averageRating: 0,
      streakDays: 0,
      consistencyScore: 0
    };
  }

  private createEmptyWeeklyRollup(weekStart: string): WeeklyRollup {
    return {
      weekStart,
      totalStudyTime: 0,
      sessionCount: 0,
      completedTasks: 0,
      subjectBreakdown: {},
      averageSessionLength: 0,
      bestStreak: 0,
      consistencyScore: 0
    };
  }

  private createEmptyMonthlyRollup(month: string): MonthlyRollup {
    return {
      month,
      totalStudyTime: 0,
      sessionCount: 0,
      completedTasks: 0,
      subjectBreakdown: {},
      averageDailyStudyTime: 0,
      bestStreak: 0,
      consistencyScore: 0
    };
  }

  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  private calculateConsistencyScore(rollup: any): number {
    // Calculate consistency based on various factors
    // This is a simplified calculation - can be enhanced
    const sessionConsistency = Math.min(rollup.sessionCount / 7, 1) * 40; // 40% weight
    const timeConsistency = Math.min(rollup.totalStudyTime / (7 * 60 * 60 * 1000), 1) * 30; // 30% weight
    const taskConsistency = Math.min(rollup.completedTasks / 10, 1) * 30; // 30% weight
    
    return Math.round(sessionConsistency + timeConsistency + taskConsistency);
  }

  // Analytics query methods
  async getAnalytics(range: 'day' | 'week' | 'month', date?: Date): Promise<any> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];
    
    switch (range) {
      case 'day':
        return await db.getDailyRollup(dateStr);
      case 'week':
        const weekStart = this.getWeekStart(targetDate);
        return await db.getWeeklyRollup(weekStart);
      case 'month':
        const month = targetDate.toISOString().slice(0, 7);
        return await db.getMonthlyRollup(month);
      default:
        return null;
    }
  }

  async getHeatmapData(days: number = 30): Promise<Array<{ date: string; value: number }>> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    
    const events = await db.getEvents({
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      type: 'study_session_created'
    });

    const heatmapData: Array<{ date: string; value: number }> = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
        return eventDate === dateStr;
      });
      
      const totalStudyTime = dayEvents.reduce((total, event) => {
        return total + (event as StudySessionEvent).data.duration;
      }, 0);
      
      heatmapData.push({
        date: dateStr,
        value: totalStudyTime
      });
    }
    
    return heatmapData;
  }

  async getSubjectDistribution(range: 'day' | 'week' | 'month'): Promise<Record<string, number>> {
    const analytics = await this.getAnalytics(range);
    return analytics?.subjectBreakdown || {};
  }

  async getStreakInfo(): Promise<{ currentStreak: number; bestStreak: number }> {
    // Calculate current and best streak based on daily rollups
    const rollups = await db.dailyRollups.orderBy('date').reverse().toArray();
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    for (const rollup of rollups) {
      if (rollup.totalStudyTime > 0) {
        tempStreak++;
        currentStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
      
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    }
    
    return { currentStreak, bestStreak };
  }
}

// Device ID management
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('study_sentinel_device_id');
  
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('study_sentinel_device_id', deviceId);
  }
  
  return deviceId;
}

// Export event manager instance
export let eventManager: EventManager;

// Initialize event manager
export async function initializeEventManager(): Promise<void> {
  const deviceId = getDeviceId();
  eventManager = new EventManager(deviceId);
  await db.initialize(deviceId);
}