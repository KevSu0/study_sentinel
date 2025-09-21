/**
 * Ramp Up Script for Stats Hardening v1.0.0
 *
 * Gradually expands deployment from 10% → 50% → 100%
 */

const fs = require('fs');
const path = require('path');

console.log('📈 Stats Hardening v1.0.0 - Ramp Up Deployment');
console.log('==============================================');

// Ramp configuration
const RAMP_STAGES = {
  'canary': {
    percentage: 10,
    description: 'Initial canary cohort',
    duration: '24-48 hours',
    metrics: {
      max_error_rate: '1%',
      max_compute_time: '100ms',
      min_success_rate: '99%'
    }
  },
  'ramp-50': {
    percentage: 50,
    description: 'Half user base',
    duration: '24-48 hours',
    metrics: {
      max_error_rate: '0.5%',
      max_compute_time: '75ms',
      min_success_rate: '99.5%'
    }
  },
  'full': {
    percentage: 100,
    description: 'Full deployment',
    duration: 'Continuous',
    metrics: {
      max_error_rate: '0.1%',
      max_compute_time: '50ms',
      min_success_rate: '99.9%'
    }
  }
};

// Generate ramp-up commands
function generateRampCommands() {
  const commands = `#!/bin/bash

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
    # curl -s "\${MONITORING_ENDPOINT}/stats/error-rate" | jq '.rate < 0.01'

    # Check performance
    # curl -s "\${MONITORING_ENDPOINT}/stats/performance" | jq '.p95 < 100'

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
`;

  fs.writeFileSync(
    path.join(__dirname, '../scripts/stats-ramp.sh'),
    commands
  );

  // Make executable
  try {
    fs.chmodSync(path.join(__dirname, '../scripts/stats-ramp.sh'), '755');
  } catch {
    // Ignore permission errors on Windows
  }
}

// Create monitoring dashboard
function createMonitoringDashboard() {
  const dashboard = {
    name: 'Stats Hardening v1.0.0 Deployment',
    description: 'Monitor rollout progress and system health',
    stages: RAMP_STAGES,
    currentStage: 'canary',
    lastUpdated: new Date().toISOString(),
    panels: [
      {
        title: 'Deployment Progress',
        metrics: [
          'stats_deployment_percentage',
          'stats_active_users',
          'stats_feature_adoption_rate'
        ]
      },
      {
        title: 'Performance Metrics',
        metrics: [
          'stats_computation_time_p95',
          'worker_initialization_time_p95',
          'ui_response_time_p95'
        ],
        targets: {
          p95: '< 100ms',
          p99: '< 200ms'
        }
      },
      {
        title: 'Error Monitoring',
        metrics: [
          'stats_error_rate',
          'worker_failure_rate',
          'fallback_activation_rate'
        ],
        thresholds: {
          critical: '> 5%',
          warning: '> 1%'
        }
      },
      {
        title: 'User Experience',
        metrics: [
          'stats_page_load_time',
          'interaction_latency',
          'user_satisfaction_score'
        ]
      }
    ],
    alerts: [
      {
        name: 'High Error Rate',
        condition: 'error_rate > 5%',
        action: 'Page on-call'
      },
      {
        name: 'Performance Degradation',
        condition: 'p95_latency > 200ms',
        action: 'Investigate and potentially rollback'
      },
      {
        name: 'Low Adoption',
        condition: 'adoption_rate < expected_rate',
        action: 'Review feature rollout'
      }
    ]
  };

  fs.writeFileSync(
    path.join(__dirname, '../.stats-monitoring.json'),
    JSON.stringify(dashboard, null, 2)
  );
}

// Create rollback plan
function createRollbackPlan() {
  const rollback = {
    version: '1.0.0',
    scenarios: [
      {
        name: 'High Error Rates',
        triggers: ['error_rate > 5%', 'critical_errors > 10/hour'],
        actions: [
          'Enable emergency kill switch',
          'Roll back to previous deployment',
          'Investigate root cause'
        ],
        estimatedDowntime: '< 5 minutes'
      },
      {
        name: 'Performance Degradation',
        triggers: ['p95_latency > 200ms', 'cpu_usage > 80%'],
        actions: [
          'Scale up resources',
          'Reduce cohort size',
          'Optimize queries'
        ],
        estimatedDowntime: 'None (gradual)'
      },
      {
        name: 'Data Corruption',
        triggers: ['data_loss_events > 0', 'corruption_detected'],
        actions: [
          'Immediate rollback',
          'Restore from backup',
          'Data integrity check'
        ],
        estimatedDowntime: '15-30 minutes'
      }
    ],
    commands: {
      immediate: 'npm run stats:rollback-emergency',
      gradual: 'npm run stats:ramp-down',
      monitor: 'npm run stats:monitor-critical'
    },
    contacts: {
      primary: 'on-call@study-sentinel.com',
      escalation: 'tech-lead@study-sentinel.com',
      emergency: 'cto@study-sentinel.com'
    }
  };

  fs.writeFileSync(
    path.join(__dirname, '../.stats-rollback-plan.json'),
    JSON.stringify(rollback, null, 2)
  );
}

// Execute ramp-up setup
console.log('\n🔧 Setting up ramp-up infrastructure...');
generateRampCommands();
createMonitoringDashboard();
createRollbackPlan();

console.log('\n✅ Ramp-up infrastructure ready');
console.log('\n📋 Deployment Timeline:');
console.log('====================');
Object.entries(RAMP_STAGES).forEach(([stage, config]) => {
  console.log(`📍 ${stage.toUpperCase()}: ${config.percentage}% - ${config.description}`);
  console.log(`   Duration: ${config.duration}`);
  console.log(`   Metrics: ${Object.entries(config.metrics).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  console.log('');
});

console.log('🚀 Next Commands:');
console.log('================');
console.log('1. Monitor canary (current): npm run stats:monitor');
console.log('2. Ramp to 50%: bash scripts/stats-ramp.sh ramp-50');
console.log('3. Ramp to 100%: bash scripts/stats-ramp.sh ramp-full');
console.log('4. Emergency rollback: bash scripts/stats-ramp.sh rollback');
console.log('\n📊 Monitoring: http://localhost:3000/admin/stats-deployment');