// Manual test data injection script
// Run this in the browser console at http://localhost:3000

async function addTestProductivityData() {
  console.log('🚀 Adding test productivity data to IndexedDB...');
  
  try {
    // Check if database is available
    if (!window.db) {
      console.error('❌ Database not available. Make sure the app is fully loaded.');
      return false;
    }
    
    // Create test log entry
    const testLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'TIMER_SESSION_COMPLETE',
      payload: {
        taskId: 'test-task-' + Date.now(),
        title: 'Test Productivity Session',
        subject: 'Mathematics',
        duration: 1800, // 30 minutes in seconds
        pausedDuration: 0,
        pauseCount: 0,
        points: 60,
        priority: 'medium'
      }
    };
    
    console.log('📝 Adding log entry:', testLog);
    
    // Add to IndexedDB
    await window.db.logs.add(testLog);
    
    // Verify addition
    const allLogs = await window.db.logs.toArray();
    console.log('✅ Test data added successfully!');
    console.log('📊 Total logs in database:', allLogs.length);
    console.log('🆕 Latest log:', allLogs[allLogs.length - 1]);
    
    // Trigger a page refresh to reload data
    console.log('🔄 Refreshing page to reload data...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
    return false;
  }
}

// Instructions for manual execution
console.log('📋 To add test productivity data:');
console.log('1. Make sure you are on http://localhost:3000');
console.log('2. Run: addTestProductivityData()');
console.log('3. The page will refresh automatically after adding data');

// Make function available globally
window.addTestProductivityData = addTestProductivityData;