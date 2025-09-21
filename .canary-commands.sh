
# Stats Hardening v1.0.0 - Canary Deployment Commands

# 1. Build with canary flags
npm run build:canary

# 2. Deploy to staging
npm run deploy:staging

# 3. Monitor canary metrics
npm run stats:monitor

# 4. Emergency rollback
npm run stats:rollback

# 5. Ramp to 50% (after canary validation)
npm run stats:ramp-50

# 6. Ramp to 100% (after full validation)
npm run stats:ramp-100
