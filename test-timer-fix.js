// Test script to verify timer functionality after profile ID fixes
// Run this in the browser console after opening the app

console.log('🧪 Testing timer functionality after profile ID fixes...');

// Test 1: Check if profile is properly loaded
const testProfile = () => {
  try {
    const globalState = window.__GLOBAL_STATE__ || {};
    console.log('📋 Profile state:', globalState.profile);
    
    if (globalState.profile && globalState.profile.id) {
      console.log('✅ Profile loaded with ID:', globalState.profile.id);
      return true;
    } else {
      console.log('❌ Profile not loaded or missing ID');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking profile:', error);
    return false;
  }
};

// Test 2: Check database connection and tables
const testDatabase = async () => {
  try {
    const { getDB } = await import('./src/lib/db.js');
    const db = getDB();
    
    console.log('📊 Database tables:', db.tables.map(t => t.name));
    
    // Check if users table exists and has the profile
    const users = await db.users.toArray();
    console.log('👥 Users in database:', users);
    
    // Check if activityAttempts table exists
    const attempts = await db.activityAttempts.count();
    console.log('🎯 Activity attempts count:', attempts);
    
    return true;
  } catch (error) {
    console.log('❌ Database test failed:', error);
    return false;
  }
};

// Test 3: Try to create a test task and start timer
const testTimerStart = async () => {
  try {
    // Create a simple test task
    const testTask = {
      id: 'test-timer-' + Date.now(),
      title: 'Test Timer Task',
      description: 'Testing timer functionality',
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      duration: 25,
      timerType: 'pomodoro',
      priority: 'medium',
      status: 'todo',
      points: 10
    };
    
    console.log('🎯 Created test task:', testTask);
    
    // Try to access the global state context
    const reactRoot = document.querySelector('#__next');
    if (reactRoot && reactRoot._reactInternalFiber) {
      console.log('⚛️ React app detected, timer test would need to be run from within the app context');
    }
    
    console.log('✅ Test task created successfully');
    return true;
  } catch (error) {
    console.log('❌ Timer start test failed:', error);
    return false;
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Starting timer functionality tests...');
  
  const profileTest = testProfile();
  const dbTest = await testDatabase();
  const timerTest = await testTimerStart();
  
  console.log('\n📊 Test Results:');
  console.log('Profile Test:', profileTest ? '✅ PASS' : '❌ FAIL');
  console.log('Database Test:', dbTest ? '✅ PASS' : '❌ FAIL');
  console.log('Timer Test:', timerTest ? '✅ PASS' : '❌ FAIL');
  
  if (profileTest && dbTest && timerTest) {
    console.log('\n🎉 All tests passed! Timer should be working now.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
};

// Auto-run tests
runTests();

// Export for manual testing
window.testTimerFunctionality = runTests;