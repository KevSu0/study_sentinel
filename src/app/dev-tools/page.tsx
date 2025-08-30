'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { populateSampleData, clearSampleData } from '@/utils/populate-sample-data';
import { toast } from 'sonner';
import { Loader2, Database, Trash2 } from 'lucide-react';

export default function DevToolsPage() {
  const [isPopulating, setIsPopulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handlePopulateSampleData = async () => {
    console.log('📊 Starting to populate sample data...');
    setIsPopulating(true);
    try {
      await populateSampleData();
      console.log('✅ Sample data populated successfully!');
      toast.success('Sample data populated successfully! Check the dashboard to see the data.');
    } catch (error) {
      console.error('❌ Error populating sample data:', error);
      toast.error('Failed to populate sample data. Check the console for details.');
    } finally {
      setIsPopulating(false);
    }
  };

  const handleClearSampleData = async () => {
    console.log('🗑️ Starting to clear sample data...');
    setIsClearing(true);
    try {
      await clearSampleData();
      console.log('✅ Sample data cleared successfully!');
      toast.success('Sample data cleared successfully!');
    } catch (error) {
      console.error('❌ Error clearing sample data:', error);
      toast.error('Failed to clear sample data. Check the console for details.');
    } finally {
      setIsClearing(false);
    }
  };

  // Expose functions to window for console access
  useEffect(() => {
    (window as any).clearData = handleClearSampleData;
    (window as any).populateData = handlePopulateSampleData;
    console.log('Dev tools functions exposed to window');
    
    // Auto-clear and repopulate data to fix old payload structure
    const autoFixData = async () => {
      console.log('Auto-fixing database with corrected sample data...');
      await handleClearSampleData();
      await handlePopulateSampleData();
      console.log('Database auto-fix completed');
    };
    
    // Run auto-fix after a short delay
    setTimeout(autoFixData, 1000);
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Developer Tools</h1>
        <p className="text-muted-foreground mb-8">
          Tools for testing and development. Use these to populate sample data for testing the dashboard and stats pages.
        </p>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Sample Data Management
              </CardTitle>
              <CardDescription>
                Populate the database with sample tasks, routines, and completed sessions to test the dashboard functionality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">What will be added:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• 3 completed tasks with different priorities and subjects</li>
                  <li>• 2 active routines (Morning Code Review, Algorithm Practice)</li>
                  <li>• Multiple completed timer sessions over the last few days</li>
                  <li>• Session logs with realistic pause times and durations</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handlePopulateSampleData}
                  disabled={isPopulating || isClearing}
                  className="flex-1"
                >
                  {isPopulating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Populating...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Populate Sample Data
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="destructive"
                  onClick={handleClearSampleData}
                  disabled={isPopulating || isClearing}
                  className="flex-1"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
              <CardDescription>
                Follow these steps to test the dashboard functionality:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="text-sm space-y-2 ml-4">
                <li>1. Click "Populate Sample Data" to add test data to the database</li>
                <li>2. Navigate to the Dashboard page to see the populated widgets</li>
                <li>3. Check the Stats page to verify data is displaying correctly</li>
                <li>4. Use "Clear All Data" to reset the database when done testing</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <a href="/dashboard">Go to Dashboard</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/stats">Go to Stats</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/plans">Go to Plans</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}