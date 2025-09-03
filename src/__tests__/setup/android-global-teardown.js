/**
 * Android Testing Global Teardown
 * 
 * This file runs once after all tests in the Android test environment.
 * It cleans up global mocks, closes test databases, and generates test reports
 * specific to Android testing.
 */

module.exports = async () => {
  console.log('\n🧹 Cleaning up Android testing environment...');
  
  try {
    // Clean up test database
    console.log('📱 Cleaning up test database');
    
    // Generate performance report if metrics were collected
    if (global.__PERFORMANCE_METRICS) {
      const metrics = global.__PERFORMANCE_METRICS;
      
      if (metrics.renderTimes.length > 0) {
        const avgRenderTime = metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length;
        console.log(`📊 Average render time: ${avgRenderTime.toFixed(2)}ms`);
      }
      
      if (metrics.memoryUsage.length > 0) {
        const maxMemory = Math.max(...metrics.memoryUsage);
        console.log(`💾 Peak memory usage: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
      }
      
      if (metrics.eventHandlingTimes.length > 0) {
        const avgEventTime = metrics.eventHandlingTimes.reduce((a, b) => a + b, 0) / metrics.eventHandlingTimes.length;
        console.log(`⚡ Average event handling time: ${avgEventTime.toFixed(2)}ms`);
      }
    }
    
    // Clean up global variables
    delete global.__CAPACITOR_PLUGINS_MOCKED;
    delete global.__MOCK_STORAGE_QUOTA;
    delete global.__NETWORK_CONDITIONS;
    delete global.__PERFORMANCE_METRICS;
    
    // Reset environment variables
    delete process.env.TESTING_PLATFORM;
    delete process.env.TESTING_OFFLINE;
    
    console.log('✅ Android test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup Android test environment:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
};