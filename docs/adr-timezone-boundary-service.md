# ADR: Timezone Boundary Service Implementation

## Context
Study Sentinel currently uses a hybrid timezone approach with UTC-based calculations (4 AM UTC study day boundary) and browser-local time display. This creates inconsistency for India-based users and lacks explicit timezone handling.

## Decision
Implement a centralized Boundary Service with IST (Asia/Kolkata) as the default timezone. Study day boundary will be [04:00, 04:00) IST. This will be delivered via:
1. Centralized Boundary Service (Angle B)
2. IST default with Legacy toggle during 30-day parallel run (Angle A)

## Status
**Accepted** - [Date]

## Consequences
### Pros
- Consistent user experience for Indian users
- Single source of truth for time calculations
- Foundation for future per-user timezone support
- Clear migration path with rollback capability

### Cons
- Temporary dual code paths during transition
- Historical data will show different daily totals
- Additional testing and monitoring overhead

## Alternatives Considered
1. **Legacy Only**: Maintain current hybrid approach
   - Rejected: User experience issues for Indian users
2. **Server-Only Windows**: Move all time logic to API
   - Rejected: Higher complexity, offline impact
3. **Per-User Timezone Now**: Immediate multi-timezone support
   - Rejected: Over-engineering for current needs

## Migration Plan
1. Implement Boundary Service (feature flagged)
2. Run 30-day parallel calculation period
3. Provide user toggle between New (IST) and Legacy views
4. Monitor diff rates and user feedback
5. Deprecate Legacy path after successful migration

## Technical Details
- **Storage**: Continue using UTC in Firestore
- **Boundary Service**: Centralized time calculations
- **tz_rule_version**: 2 (IST_4AM), Legacy = 1 (UTC_4AM)
- **Rollback**: Single flag to revert to Legacy behavior

## Open Questions
1. Academic intent validation: Is 4 AM IST the correct boundary?
2. Third-party dashboard impact assessment needed
3. User communication strategy finalization

## Owners
- Feature DRI: [Assigned]
- Analytics Owner: [Assigned]
- QA Owner: [Assigned]
- Timeline: Shadow starts [Date], Cutover [Date], Deprecate [Date]