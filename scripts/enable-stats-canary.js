/**
 * Canary Deployment Script for Stats Hardening v1.0.0
 *
 * This script enables the 10% canary rollout for hardened stats features
 */

const fs = require('fs');
const path = require('path');

// Canary configuration
const CANARY_CONFIG = {
  // Enable for 10% of users
  cohortPercentage: 10,

  // Feature flags to enable for canary cohort
  features: {
    'stats.worker.v1': true,
    'badges.incremental.v1': true,
    'stats.rollup.v2': true,
    'stats.accessibility.v1': true,
    'stats.observability.v1': true
  },

  // Environment variables for build
  envVars: {
    'STATS_WORKER_V1': 'true',
    'BADGES_INCREMENTAL_V1': 'true',
    'STATS_ROLLUP_V2': 'true',
    'STATS_ACCESSIBILITY_V1': 'true',
    'STATS_OBSERVABILITY_V1': 'true'
  },

  // Monitoring endpoints
  monitoring: {
    metricsEndpoint: '/api/stats/metrics',
    healthEndpoint: '/api/stats/health',
    errorTracking: '/api/stats/errors'
  }
};

console.log('🚀 Enabling Stats Hardening v1.0.0 Canary Deployment');
console.log('================================================');

// 1. Update environment file for build
console.log('\n📝 Updating environment variables...');
const envPath = path.join(__dirname, '../.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Add or update canary variables
Object.entries(CANARY_CONFIG.envVars).forEach(([key, value]) => {
  const regex = new RegExp(`^${key}=.*`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
});

fs.writeFileSync(envPath, envContent);
console.log('✅ Environment variables updated');

// 2. Create canary deployment manifest
console.log('\n📋 Creating canary manifest...');
const manifest = {
  version: '1.0.0',
  deployment: {
    type: 'canary',
    cohortPercentage: CANARY_CONFIG.cohortPercentage,
    enabledAt: new Date().toISOString(),
    features: CANARY_CONFIG.features
  },
  monitoring: CANARY_CONFIG.monitoring,
  rollback: {
    command: 'npm run rollback-stats-canary',
    emergencyKillSwitch: 'STATS_EMERGENCY_STOP=true'
  }
};

fs.writeFileSync(
  path.join(__dirname, '../.canary-manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('✅ Canary manifest created');

// 3. Create monitoring dashboard configuration
console.log('\n📊 Creating monitoring configuration...');
const monitoringConfig = {
  dashboard: {
    title: 'Stats Hardening v1.0.0 - Canary Deployment',
    description: 'Monitor the 10% canary rollout of hardened stats features',
    panels: [
      {
        title: 'Cohort Size',
        metrics: ['stats_canary_users_total', 'stats_canary_users_percentage'],
        targets: ['< 10%', '10%', '> 10%']
      },
      {
        title: 'Feature Usage',
        metrics: [
          'stats_worker_usage',
          'badges_incremental_evaluations',
          'stats_rollup_reads',
          'stats_accessibility_features_used'
        ]
      },
      {
        title: 'Performance Metrics',
        metrics: [
          'worker_initialization_time_p95',
          'stats_computation_time_p95',
          'badge_evaluation_time_p95',
          'rollup_read_latency_p95'
        ],
        thresholds: {
          worker_init: '< 100ms',
          compute_time: '< 50ms',
          badge_eval: '< 25ms',
          rollup_read: '< 20ms'
        }
      },
      {
        title: 'Error Rates',
        metrics: [
          'worker_initialization_failures',
          'stats_computation_errors',
          'badge_evaluation_errors',
          'rollup_read_failures'
        ],
        thresholds: {
          error_rate: '< 1%'
        }
      },
      {
        title: 'User Impact',
        metrics: [
          'stats_page_load_time',
          'ui_blocking_events',
          'user_satisfaction_score'
        ]
      }
    ]
  },
  alerts: [
    {
      name: 'High Error Rate',
      condition: 'error_rate > 5%',
      severity: 'critical'
    },
    {
      name: 'Performance Degradation',
      condition: 'compute_time_p95 > 100ms',
      severity: 'warning'
    },
    {
      name: 'Worker Init Failures',
      condition: 'worker_init_failures > 10%',
      severity: 'critical'
    }
  ]
};

fs.writeFileSync(
  path.join(__dirname, '../.canary-monitoring.json'),
  JSON.stringify(monitoringConfig, null, 2)
);
console.log('✅ Monitoring configuration created');

// 4. Generate deployment commands
console.log('\n🔧 Generating deployment commands...');
const commands = `
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
`;

fs.writeFileSync(
  path.join(__dirname, '../.canary-commands.sh'),
  commands
);
console.log('✅ Deployment commands generated');

console.log('\n📊 Canary Deployment Summary');
console.log('==========================');
console.log('✅ 10% cohort configuration ready');
console.log('✅ All feature flags enabled for canary');
console.log('✅ Monitoring configuration created');
console.log('✅ Rollback procedures documented');
console.log('\nNext steps:');
console.log('1. Review .canary-manifest.json');
console.log('2. Build and deploy to staging');
console.log('3. Monitor metrics for 24-48 hours');
console.log('4. If stable, ramp to 50% then 100%');
console.log('\nMonitoring dashboard: http://localhost:3000/admin/stats-canary');