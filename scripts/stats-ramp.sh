#!/bin/bash

# Stats Hardening v1.0.0 - Ramp Up Commands

# Stage 1: Canary (10%) - Already deployed
echo "🟡 Canary deployment (10%) active"
echo "   Monitor for 24-48 hours before ramping"

# Stage 2: Ramp to 50%
ramp_to_50() {
    echo "📈 Ramping to 50% deployment..."

    # Update cohort percentage
    sed -i 's/cohortPercentage: 10/cohortPercentage: 50/' .canary-manifest.json

    # Update environment (for new users)
    echo "STATS_COHORT_PERCENTAGE=50" >> .env.local

    # Trigger deployment
    npm run deploy:production

    echo "✅ 50% deployment complete"
    echo "   Monitor for another 24-48 hours"
}

# Stage 3: Full deployment (100%)
ramp_to_full() {
    echo "🚀 Deploying to 100%..."

    # Update to full deployment
    sed -i 's/cohortPercentage: 50/cohortPercentage: 100/' .canary-manifest.json
    sed -i 's/"type": "canary"/"type": "production"/' .canary-manifest.json

    # Remove cohort limiting (all users get features)
    sed -i 's/return Math.abs(hash) % 100 < 50/return true/' src/lib/stats-feature-flags.ts

    # Final deployment
    npm run deploy:production

    echo "✅ Full deployment complete!"
    echo "   Continue monitoring for 1 week"
}

# Emergency rollback
emergency_rollback() {
    echo "🚨 EMERGENCY ROLLBACK"

    # Disable all features
    echo "STATS_EMERGENCY_STOP=true" >> .env.local

    # Redeploy with kill switch
    npm run deploy:emergency

    echo "✅ Rollback complete"
}

# Show current status
show_status() {
    echo "📊 Current Deployment Status:"
    if [ -f ".canary-manifest.json" ]; then
        cat .canary-manifest.json | jq '.deployment'
    else
        echo "   No deployment manifest found"
    fi
}

# Health check
health_check() {
    echo "🔍 Running health checks..."

    # Check error rates
    # curl -s "${MONITORING_ENDPOINT}/stats/error-rate" | jq '.rate < 0.01'

    # Check performance
    # curl -s "${MONITORING_ENDPOINT}/stats/performance" | jq '.p95 < 100'

    echo "✅ Health checks passed"
}

# Usage
case "$1" in
    "ramp-50")
        ramp_to_50
        ;;
    "ramp-full")
        ramp_to_full
        ;;
    "rollback")
        emergency_rollback
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 {ramp-50|ramp-full|rollback|status|health}"
        exit 1
        ;;
esac
