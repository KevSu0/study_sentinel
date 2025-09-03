/**
 * Android Testing Global Setup
 * 
 * This file runs once before all tests in the Android test environment.
 * It sets up global mocks, initializes test databases, and prepares the environment
 * for Android-specific testing.
 */

module.exports = async () => {
  console.log('\n🤖 Setting up Android testing environment...');
  
  // Set environment variables for Android testing
  process.env.TESTING_PLATFORM = 'android';
  process.env.TESTING_OFFLINE = 'true';
  
  // Mock Capacitor plugins globally
  global.__CAPACITOR_PLUGINS_MOCKED = true;
  
  // Initialize test database
  try {
    // Create a clean test database for each test run
    console.log('📱 Initializing test database for Android tests');
    
    // Set up IndexedDB mock storage limits to simulate Android WebView
    const mockStorageQuota = 50 * 1024 * 1024; // 50MB - typical for Android WebView
    global.__MOCK_STORAGE_QUOTA = mockStorageQuota;
    
    // Initialize network condition simulation
    global.__NETWORK_CONDITIONS = {
      offline: false,
      latency: 0,
      downloadThroughput: Infinity,
      uploadThroughput: Infinity,
    };
    
    // Set up performance monitoring for tests
    global.__PERFORMANCE_METRICS = {
      renderTimes: [],
      memoryUsage: [],
      eventHandlingTimes: [],
    };
    
    console.log('✅ Android test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to initialize Android test environment:', error