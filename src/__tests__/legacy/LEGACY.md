# Legacy Tests Documentation

## Overview
These tests have been quarantined from the main test suite as they test systems or behaviors that are not part of Phase-1 of the Study Sentinel unified timing system.

## Quarantined Tests

### Stats Hardening Tests (`src/__tests__/legacy/stats/`)
These tests were part of the stats hardening suite and have been moved due to:

1. **rolling-windows.test.ts** - Tests the legacy stats worker (`@/workers/stats.worker`) which is not part of Phase-1
2. **badges-incremental.test.ts** - Tests the badge progress system with mock configuration issues unrelated to Phase-1
3. **overlap-merge.test.ts** - Tests session overlap merging with different expectations than Phase-1's session reconstruction
4. **rollups.test.ts** - Tests legacy stats rollup calculations
5. **bucket-day.test.ts** - Tests legacy day bucketing logic
6. **debounce-guard.test.ts** - Tests debounce logic not implemented in Phase-1

## Running Legacy Tests
To run these tests:
```bash
npm test -- --testPathPattern="legacy/"
```

## Future Considerations
- These tests may be updated in Phase-2 if the corresponding features are reimplemented
- The overlap-merge logic may need to be reconciled with Phase-1 session reconstruction
- Consider deleting tests for features that are permanently removed

## Rationale
Quarantining these tests allows us to:
- Maintain a clean Phase-1 test suite with only relevant tests
- Preserve legacy test coverage for potential future reference
- Avoid confusion between old and new system behaviors