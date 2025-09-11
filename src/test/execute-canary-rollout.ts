// Canary Rollout Execution Test
// Executes the canary rollout for Slice 1: Storage & Analytics

import { CanaryRolloutExecutor, DEFAULT_CANARY_PLAN } from '../lib/canary-rollout-executor';

async function executeCanaryRollout() {
  console.log('🚀 Starting canary rollout execution for Slice 1...');
  
  const executor = new CanaryRolloutExecutor(DEFAULT_CANARY_PLAN);
  
  try {
    // Initialize the executor
    await executor.initialize();
    
    // Execute the rollout
    const result = await executor.executeCanaryRollout();
    
    console.log('\n📊 Canary Rollout Results:');
    console.log('='.repeat(50));
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    if (result.results && result.results.devices) {
      console.log(`Devices: ${result.results.devices.length}`);
      console.log(`Device IDs: ${result.results.devices.join(', ')}`);
    }
    
    if (result.results && result.results.startTime) {
      const duration = Date.now() - result.results.startTime;
      console.log(`Duration: ${duration}ms`);
    }
    
    if (result.results && result.results.executionLog) {
      console.log(`Execution Log Entries: ${result.results.executionLog.length}`);
    }
    
    console.log('\n🎯 Next Steps:');
    if (result.success) {
      console.log('  ✅ Canary rollout successful - proceed to monitoring phase');
      console.log('  ⏳ Monitor for 4 hours, then check full gate');
      
      // Generate and display report
      const report = executor.generateReport();
      console.log('\n' + report);
    } else {
      console.log('  ❌ Rollout failed - investigate issues');
      console.log(`  Error: ${result.message}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Canary rollout execution failed:', error);
    throw error;
  }
}

// Execute the rollout
executeCanaryRollout()
  .then(result => {
    console.log('\n🏁 Canary rollout execution completed');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error during canary rollout:', error);
    process.exit(1);
  });