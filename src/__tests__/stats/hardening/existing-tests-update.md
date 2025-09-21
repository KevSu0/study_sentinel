# Existing Tests Update Guide

## Tests Requiring Updates for 04:00 IST Boundary

### 1. `src/hooks/__tests__/use-stats.test.tsx`
**Updates needed:**
- Replace midnight boundary assumptions with 04:00 IST
- Update test data to use proper bucket days
- Adjust streak calculation expectations

```typescript
// Before (midnight assumption)
const date = new Date('2024-01-01T23:30:00Z');
expect(getStudyDateForTimestamp(date)).toBe('2024-01-01');

// After (04:00 IST)
const date = new Date('2024-01-01T22:30:00Z'); // 04:00 IST is 22:30 UTC
expect(getStudyDateForTimestamp(date)).toBe('2024-01-01');
```

### 2. `src/components/stats/__tests__/daily-activity-timeline.test.tsx`
**Updates needed:**
- Timeline display should start at 04:00, not 00:00
- Adjust hour calculations for IST offset
- Update expected timeline positions

### 3. `src/lib/__tests__/badges.test.ts`
**Updates needed:**
- Badge evaluation should use IST study days
- Streak calculations must account for 04:00 boundary
- Daily badge resets happen at 04:00 IST

### 4. `src/app/stats/__tests__/stats.test.tsx`
**Updates needed:**
- Date picker behavior with 04:00 boundary
- Expected stats for given date ranges
- Timezone banner integration

### 5. `src/lib/__tests__/utils.test.ts`
**Updates needed:**
- `getStudyDateForTimestamp` tests with IST scenarios
- `getStudyDay` function behavior
- Timezone conversion utilities

### 6. `src/components/dashboard/widgets/__tests__/*.test.tsx`
**Updates needed:**
- Today's progress calculation (04:00-04:00)
- Daily goal tracking boundaries
- Widget time display expectations

## Calendar/Month Logic Updates

### Replace:
```typescript
// Month-based calculations
getMonth(new Date(timestamp))
```

### With:
```typescript
// Rolling 30-day windows
const thirtyDaysAgo = subDays(new Date(), 30);
```

## Worker Integration Updates

### Tests touching synchronous compute:
```typescript
// Before
const stats = calculateStats(data);

// After
const stats = await worker.computeStats(data);
// or mock worker for test isolation
```

## Badge Test Updates

### Remove full re-evaluation assumptions:
```typescript
// Before - assumed all badges evaluated on render
expect(evaluateAllBadges).toHaveBeenCalled();

// After - incremental evaluation
expect(evaluateBadgesForChange).toHaveBeenCalledWith(badgeId);
```

## Execution

These updates should be made AFTER the initial hardening tests pass, to avoid scope creep.

Priority order:
1. Core boundary functions (`getStudyDateForTimestamp`, etc.)
2. Stats calculations
3. Badge evaluations
4. UI component tests
5. Integration tests