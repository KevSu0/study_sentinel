import { calculateTaskPoints, calculateRoutinePoints, calculatePoints } from '../point-calculator';
import type { StudyTask, Routine } from '../../state/types/state-types';

describe('point-calculator', () => {
  const baseTask: StudyTask = {
    id: 't1',
    shortId: 's1',
    title: 'Read chapter',
    date: '2025-09-01',
    time: '09:00',
    duration: 30,
    timerType: 'countdown',
    priority: 'low',
    status: 'todo',
    points: 0,
  };

  const baseRoutine: Routine = {
    id: 'r1',
    shortId: 'sr1',
    title: 'Morning routine',
    startTime: '09:00',
    endTime: '09:10',
    days: [1,2,3],
    priority: 'low',
    status: 'todo',
    createdAt: Date.now(),
  };

  test('calculateTaskPoints: minimum 1 point for short durations', () => {
    const pts0 = calculateTaskPoints(baseTask, 0);
    const pts4m = calculateTaskPoints(baseTask, 4 * 60_000);
    expect(pts0).toBe(1);
    expect(pts4m).toBe(1);
  });

  test('calculateTaskPoints: scales with duration and priority', () => {
    const highTask: StudyTask = { ...baseTask, priority: 'high' };
    // 15 minutes => floor(15/5)=3 basePoints, high priority multiplier 3 => 9
    const pts = calculateTaskPoints(highTask, 15 * 60_000);
    expect(pts).toBe(9);
  });

  test('calculateTaskPoints: unknown priority falls back to 1x', () => {
    const weirdTask = { ...baseTask, priority: 'weird' as any };
    const pts = calculateTaskPoints(weirdTask, 25 * 60_000); // base 5
    expect(pts).toBe(5);
  });

  test('calculateRoutinePoints: completion bonus when meeting expected duration', () => {
    // expected = 10 minutes; actual 12 => base 24, low priority 1.0x, +5 bonus => 29 (rounded)
    const pts = calculateRoutinePoints(12 * 60_000, baseRoutine);
    expect(pts).toBe(29);
  });

  test('calculateRoutinePoints: priority multiplier and no bonus when under expected', () => {
    const medRoutine: Routine = { ...baseRoutine, priority: 'medium' };
    // expected=10m, actual=8 => base 16, 1.2x => 19.2 -> 19 after rounding
    const pts = calculateRoutinePoints(8 * 60_000, medRoutine);
    expect(pts).toBe(19);
  });

  test('calculateRoutinePoints: high priority multiplier and bonus', () => {
    const highRoutine: Routine = { ...baseRoutine, priority: 'high' };
    // expected=10m, actual=10 => base 20, 1.5x => 30, +5 => 35
    const pts = calculateRoutinePoints(10 * 60_000, highRoutine);
    expect(pts).toBe(35);
  });

  test('calculatePoints: task vs routine logic', () => {
    // task: 10m -> floor(10/5)=2
    expect(calculatePoints(10 * 60_000, 'task')).toBe(2);
    // routine: 9m -> max(1, floor(9/10)=0)=1
    expect(calculatePoints(9 * 60_000, 'routine')).toBe(1);
    // default type=task
    expect(calculatePoints(4 * 60_000)).toBe(1);
  });
});

