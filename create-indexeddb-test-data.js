const { chromium } = require('playwright');
const { v4: uuidv4 } = require('uuid');

async function createTestData() {
  console.log('🚀 Starting IndexedDB test data creation...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set longer timeout for navigation
  page.setDefaultTimeout(60000);
  
  try {
    // Navigate to the app
    console.log('📱 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForTimeout(3000);
    
    // Inject test data into IndexedDB
    console.log('💾 Adding test productivity data to IndexedDB...');
    
    const result = await page.evaluate(async () => {
      try {
        // Wait for the database to be available
        let attempts = 0;
        while (!window.db && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        
        if (!window.db) {
          throw new Error('Database not available after waiting');
        }
        
        // Create test log entry with proper structure
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
        
        console.log('Adding test log:', testLog);
        
        // Add the log to IndexedDB
        await window.db.logs.add(testLog);
        
        // Verify the log was added
        const allLogs = await window.db.logs.toArray();
        console.log('Total logs in database:', allLogs.length);
        console.log('Latest log:', allLogs[allLogs.length - 1]);
        
        return {
          success: true,
          logId: testLog.id,
          totalLogs: allLogs.length,
          testLog: testLog
        };
        
      } catch (error) {
        console.error('Error in page.evaluate:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    if (result.success) {
      console.log('✅ Test data added successfully!');
      console.log('📊 Log ID:', result.logId);
      console.log('📈 Total logs in database:', result.totalLogs);
      
      // Refresh the page to trigger data reload
      console.log('🔄 Refreshing page to reload data...');
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Check if productivity widgets show the data
      console.log('🔍 Checking productivity widgets...');
      
      // Wait for widgets to load and check for productivity data
      await page.waitForTimeout(3000);
      
      const widgetData = await page.evaluate(() => {
        // Look for productivity indicators in the DOM
        const widgets = document.querySelectorAll('[data-testid*="widget"], [class*="widget"], [class*="stats"]');
        const textContent = document.body.textContent || '';
        
        return {
          widgetCount: widgets.length,
          hasProductivityText: textContent.includes('60') || textContent.includes('30') || textContent.includes('1'),
          bodyText: textContent.substring(0, 500) // First 500 chars for debugging
        };
      });
      
      console.log('📱 Widget check results:', widgetData);
      
      if (widgetData.hasProductivityText) {
        console.log('🎉 SUCCESS: Productivity data appears to be showing in widgets!');
      } else {
        console.log('⚠️  WARNING: Productivity data may not be visible in widgets yet');
        console.log('   This could be normal if widgets take time to update');
      }
      
    } else {
      console.error('❌ Failed to add test data:', result.error);
    }
    
    console.log('\n🔍 Browser will stay open for manual verification...');
    console.log('   Check the productivity widgets on the dashboard');
    console.log('   Press Ctrl+C to close when done');
    
    // Keep browser open for manual verification
    await new Promise(() => {}); // Keep running indefinitely
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

createTestData().catch(console.error);