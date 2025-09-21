# RACI Matrix: Timezone Migration to IST

## Legend
- **R** = Responsible (Does the work)
- **A** = Accountable (Ensures delivery, one per task)
- **C** = Consulted (Provides input)
- **I** = Informed (Kept up to date)

## Activities Matrix

### 1. Pre-Launch Preparation (Day -7 to Day 0)

| Activity | FE Lead | BE Lead | QA Lead | Product | Support | Docs | Release Mgr |
|----------|---------|---------|---------|---------|---------|------|-------------|
| Finalize launch config | R | A | C | C | I | I | I |
| Configure feature flags | R | C | C | I | I | I | A |
| Implement telemetry | R | C | C | I | I | I | I |
| Prepare comms materials | C | C | C | A | C | R | I |
| Create support macros | I | I | C | C | A | R | I |
| UAT execution | C | C | R | A | I | I | I |
| Accessibility audit | C | C | R | A | I | I | I |
| Staged rollout plan | R | C | C | A | C | I | A |

### 2. Day 0: Launch (Immediate Full Rollout)

| Activity | FE Lead | BE Lead | QA Lead | Product | Support | Docs | Release Mgr |
|----------|---------|---------|---------|---------|---------|------|-------------|
| Deploy to 100% | R | R | A | I | I | I | A |
| Monitor systems | R | R | R | I | I | I | A |
| Initial health check | R | R | A | I | I | I | I |
| Verify full rollout | R | R | A | I | I | I | I |
| Communicate launch | C | I | I | A | R | R | A |

### 3. Post-Launch Monitoring (Ongoing)

| Activity | FE Lead | BE Lead | QA Lead | Product | Support | Docs | Release Mgr |
|----------|---------|---------|---------|---------|---------|------|-------------|
| Daily health checks | R | R | R | I | C | I | I |
| Review metrics | R | R | R | A | C | I | I |
| Monitor support tickets | I | I | I | A | R | I | C |
| User feedback review | C | I | I | A | R | I | I |
| Weekly status report | R | R | R | A | C | C | A |

### 5. 30-Day Window Management

| Activity | FE Lead | BE Lead | QA Lead | Product | Support | Docs | Release Mgr |
|----------|---------|---------|---------|---------|---------|------|-------------|
| Daily metrics review | R | R | R | A | C | I | I |
| Weekly stakeholder update | R | R | R | A | C | C | A |
| Support ticket analysis | I | I | I | A | R | I | C |
| User feedback review | C | I | I | A | R | I | I |
| Day 7/14/30 reviews | R | R | R | A | C | I | A |

### 6. Legacy Deprecation (Day 30+)

| Activity | FE Lead | BE Lead | QA Lead | Product | Support | Docs | Release Mgr |
|----------|---------|---------|---------|---------|---------|------|-------------|
| Final metrics analysis | R | R | R | A | C | I | I |
| Deprecation decision | C | C | C | A | C | I | R |
| Remove toggle component | R | I | A | I | I | I | I |
| Update documentation | I | I | I | C | C | A | I |
| Clean up feature flags | R | R | A | I | I | I | I |
| Archive migration docs | I | I | I | C | C | R | I |

### 7. Rollback (If Needed)

| Activity | FE Lead | BE Lead | QA Lead | Product | Support | Docs | Release Mgr |
|----------|---------|---------|---------|---------|---------|------|-------------|
| Trigger kill switch | R | R | A | I | I | I | I |
| Verify rollback complete | R | R | A | I | I | I | I |
| Root cause analysis | R | R | R | A | C | I | I |
| Communicate rollback | C | I | I | A | R | R | R |
| Fix and reschedule | R | R | A | I | I | I | A |

## Escalation Matrix

### Technical Issues
- **P0 (Critical)**: Release Manager → Engineering Lead → CTO
- **P1 (High)**: Engineering Lead → Release Manager → Product
- **P2 (Medium)**: Engineering Lead → QA Lead
- **P3 (Low)**: Team Lead

### User Issues
- **Volume spike**: Support Lead → Product Manager → Release Manager
- **Critical bug**: Support Lead → Engineering Lead → Release Manager
- **Comms issue**: Support Lead → Product Manager → Docs

### Business Decision
- **Go/No-Go**: Product Manager → Release Manager → CTO
- **Timeline change**: Release Manager → Product Manager → CTO
- **Budget impact**: Product Manager → CTO → CEO

## Contact Information

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Engineering Lead | | | |
| QA Lead | | | |
| Product Manager | | | |
| Support Lead | | | |
| Release Manager | | | |
| Tech Writer | | | |

---

*This RACI should be reviewed and updated as team members change.*