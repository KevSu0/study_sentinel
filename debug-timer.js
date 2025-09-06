// Debug script to test timer functionality
// Run this in the browser console at http://localhost:3000

async function debugTimerIssue() {
  console.log('🔍 Starting timer debug session...');
  
  try {
    // Check if database is available
    if (!window.db) {
      console.error('❌ Database not available. Make sure the app is fully loaded.');
      return false;
    }
    
    console.log('✅ Database is available');
    
    // Test database connection
    const tables = await window.db.tables.map(t => t.name);
    console.log('📊 Available tables:', tables);
    
    // Check if required tables exist
    const requiredTables = ['plans', 'activityAttempts', 'activityEvents'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    if (missingTables.length > 0) {
      console.error('❌ Missing required tables:', missingTables);
      return false;
    }
    
    console.log('✅ All required tables exist');
    
    // Check if there are any plans (tasks) in the database
    const plans = await window.db.plans.toArray();
    console.log('📋 Plans in database:', plans.length);
    
    if (plans.length === 0) {
      console.warn('⚠️ No plans found in database. Creating a test plan...');
      
      const testPlan = {
        id: 'debug-test-' + Date.now(),
        title: 'Debug Test Task',
        description: 'Test task for debugging timer',
        priority: 'medium',
        status: 'todo',
        timerType: 'pomodoro',
        duration: 25,
        createdAt: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      
      await window.db.plans.add(testPlan);
      console.log('✅ Test plan created:', testPlan);
    }
    
    // Get the first plan to test with
    const testPlan = await window.db.plans.toArray().then(plans => plans[0]);
    console.log('🎯 Using plan for test:', testPlan);
    
    // Test activityRepository methods
    console.log('🧪 Testing activityRepository.createAttempt...');
    
    try {
      // Import the activityRepository
      const { activityRepository } = await import('./src/lib/repositories/activity-repository.js');
      
      const newAttempt = await activityRepository.createAttempt({
        entityId: testPlan.id,
        userId: 'debug-user-' + Date.now()
      });
      
      console.log('✅ createAttempt successful:', newAttempt);
      
      // Test startAttempt
      console.log('🧪 Testing activityRepository.startAttempt...');
      await activityRepository.startAttempt({ attemptId: newAttempt.id });
      console.log('✅ startAttempt successful');
      
      // Check the attempt in database
      const savedAttempt = await window.db.activityAttempts.get(newAttempt.id);
      console.log('💾 Saved attempt:', savedAttempt);
      
      // Check events
      const events = await window.db.activityEvents.where('attemptId').equals(newAttempt.id).toArray();
      console.log('📝 Events for attempt:', events);
      
      console.log('🎉 Timer functionality test completed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Error testing activityRepository:', error);
      console.error('Stack trace:', error.stack);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Auto-run the debug function
debugTimerIssue().then(success => {
  if (success) {
    console.log('✅ Debug completed successfully');
  } else {
    console.log('❌ Debug failed - check errors above');
  }
});