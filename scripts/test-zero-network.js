#!/usr/bin/env node

/**
 * Zero-Network Compliance Tester
 * Validates that the app enforces zero-network guarantees
 */

const { networkEnforcement } = require('../src/lib/network-enforcement');

async function runZeroNetworkTests() {
  console.log('🔍 Running Zero-Network Compliance Tests...\n');

  const results = {
    passed: 0,
    failed: 0,
    violations: [] as any[]
  };

  // Test 1: AI endpoints blocked when offline
  console.log('📋 Test 1: AI Endpoints Offline Blocking');
  const aiEndpoints = [
    '/api/ai/generate',
    '/api/ai/chat',
    '/api/ai/summary'
  ];

  for (const endpoint of aiEndpoints) {
    const check = await networkEnforcement.checkRequestAllowed(endpoint);
    if (!check.allowed) {
      results.passed++;
      console.log(`  ✅ ${endpoint} - Blocked when offline`);
    } else {
      results.failed++;
      results.violations.push({
        test: 'AI Endpoints Offline Blocking',
        endpoint,
        reason: check.reason
      });
      console.log(`  ❌ ${endpoint} - Should be blocked when offline`);
    }
  }

  // Test 2: Sync endpoints blocked without feature flag
  console.log('\n📋 Test 2: Sync Endpoints Feature Flag Enforcement');
  const syncEndpoints = [
    '/api/sync/upload',
    '/api/sync/download',
    '/api/sync/status'
  ];

  for (const endpoint of syncEndpoints) {
    const check = await networkEnforcement.checkRequestAllowed(endpoint);
    if (!check.allowed && check.reason?.includes('sync_uplink')) {
      results.passed++;
      console.log(`  ✅ ${endpoint} - Blocked without sync_uplink flag`);
    } else {
      results.failed++;
      results.violations.push({
        test: 'Sync Endpoints Feature Flag Enforcement',
        endpoint,
        reason: check.reason
      });
      console.log(`  ❌ ${endpoint} - Should be blocked without sync_uplink flag`);
    }
  }

  // Test 3: Local assets allowed offline
  console.log('\n📋 Test 3: Local Assets Offline Access');
  const localAssets = [
    '/fonts/inter.css',
    '/icons/icon-192x192.png',
    '/offline.html'
  ];

  for (const asset of localAssets) {
    const check = await networkEnforcement.checkRequestAllowed(asset);
    if (check.allowed && check.offlineAllowed) {
      results.passed++;
      console.log(`  ✅ ${asset} - Allowed offline`);
    } else {
      results.failed++;
      results.violations.push({
        test: 'Local Assets Offline Access',
        endpoint: asset,
        reason: check.reason
      });
      console.log(`  ❌ ${asset} - Should be allowed offline`);
    }
  }

  // Test 4: Removed endpoints completely blocked
  console.log('\n📋 Test 4: Removed Endpoint Blocking');
  const removedEndpoints = [
    '/api/legacy',
    '/api/deprecated',
    '/api/beta'
  ];

  for (const endpoint of removedEndpoints) {
    const check = await networkEnforcement.checkRequestAllowed(endpoint);
    if (!check.allowed && check.category === 'REMOVE') {
      results.passed++;
      console.log(`  ✅ ${endpoint} - Completely blocked`);
    } else {
      results.failed++;
      results.violations.push({
        test: 'Removed Endpoint Blocking',
        endpoint,
        reason: check.reason
      });
      console.log(`  ❌ ${endpoint} - Should be completely blocked`);
    }
  }

  // Test 5: Essential endpoints always allowed
  console.log('\n📋 Test 5: Essential Endpoint Access');
  const essentialEndpoints = [
    '/manifest.json',
    '/sw.js'
  ];

  for (const endpoint of essentialEndpoints) {
    const check = await networkEnforcement.checkRequestAllowed(endpoint);
    if (check.allowed && check.category === 'KEEP') {
      results.passed++;
      console.log(`  ✅ ${endpoint} - Always allowed`);
    } else {
      results.failed++;
      results.violations.push({
        test: 'Essential Endpoint Access',
        endpoint,
        reason: check.reason
      });
      console.log(`  ❌ ${endpoint} - Should always be allowed`);
    }
  }

  // Summary
  console.log('\n📊 Zero-Network Compliance Summary');
  console.log('=' .repeat(50));
  console.log(`Tests Passed: ${results.passed}`);
  console.log(`Tests Failed: ${results.failed}`);
  console.log(`Total Tests: ${results.passed + results.failed}`);

  if (results.failed > 0) {
    console.log('\n🚨 VIOLATIONS DETECTED:');
    results.violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.test}`);
      console.log(`   Endpoint: ${violation.endpoint}`);
      console.log(`   Reason: ${violation.reason}`);
    });
    
    console.log('\n❌ Zero-Network Compliance Test FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ Zero-Network Compliance Test PASSED');
    console.log('All network requests properly enforce offline guarantees.');
    process.exit(0);
  }
}

// Run tests if called directly
if (require.main === module) {
  runZeroNetworkTests().catch(error => {
    console.error('Error running zero-network tests:', error);
    process.exit(1);
  });
}

module.exports = { runZeroNetworkTests };