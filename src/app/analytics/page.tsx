'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimezoneComparisonToggle } from '@/components/analytics/timezone-comparison-toggle';
import { TimezoneFirstVisitModal } from '@/components/analytics/timezone-first-visit-modal';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Award,
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { initializeAnalyticsEngine, getAnalyticsEngine, TimeRange } from '@/lib/analytics';
import { toast } from 'react-hot-toast';

export default function AnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    end: new Date().toISOString()
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const analyticsEngine = initializeAnalyticsEngine();
      
      const [dashboard, detailed] = await Promise.all([
        analyticsEngine.getDashboardAnalytics(selectedTimeRange),
        analyticsEngine.getDetailedAnalytics(selectedTimeRange)
      ]);
      
      setDashboardData(dashboard);
      setDetailedData(detailed);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDuration = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimeRange = (range: TimeRange): string => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return 'Last 7 days';
    if (daysDiff <= 30) return 'Last 30 days';
    if (daysDiff <= 90) return 'Last 90 days';
    return `${daysDiff} days`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced insights into your study patterns and performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <TimezoneComparisonToggle className="w-full sm:w-auto" />
          <Badge variant="outline" className="flex items-center gap-2 whitespace-nowrap">
            <Calendar className="h-3 w-3" />
            {formatTimeRange(selectedTimeRange)}
          </Badge>
          <Button onClick={loadData} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Study Time</p>
                <p className="text-2xl font-bold">{formatDuration(dashboardData.totalStudyTime)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData.sessionCount} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{dashboardData.currentStreak} days</p>
              </div>
              <Award className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Best: {dashboardData.bestStreak} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Session</p>
                <p className="text-2xl font-bold">{formatDuration(dashboardData.averageSessionLength)}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData.sessionCount} total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consistency</p>
                <p className="text-2xl font-bold">{dashboardData.consistencyScore}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon(dashboardData.productivityTrend)}
              <p className="text-xs text-muted-foreground">
                {dashboardData.productivityTrend}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subject Distribution
              </CardTitle>
              <CardDescription>
                Breakdown of study time by subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(dashboardData.subjectDistribution || {}).map(([subject, time]) => {
                  const percentage = (time as number) / dashboardData.totalStudyTime * 100;
                  return (
                    <div key={subject} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{subject}</span>
                        <span>{formatDuration(time as number)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Hourly Study Patterns
                </CardTitle>
                <CardDescription>
                  When you study most during the day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-2">
                  {detailedData?.hourlyHeatmap?.map((hour: any) => {
                    const intensity = Math.min((hour.value / Math.max(...detailedData.hourlyHeatmap.map((h: any) => h.value))) * 100, 100);
                    return (
                      <div key={hour.hour} className="text-center">
                        <div 
                          className="w-full h-12 bg-muted rounded transition-all duration-300 hover:scale-105"
                          style={{ 
                            backgroundColor: `hsl(220, 70%, ${90 - intensity * 0.6}%)`,
                            opacity: intensity > 0 ? 1 : 0.3
                          }}
                        />
                        <div className="text-xs mt-1">{hour.hour}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Session Length Distribution
                </CardTitle>
                <CardDescription>
                  How long your typical study sessions last
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detailedData?.sessionLengthDistribution?.map((item: any) => (
                    <div key={item.range} className="flex items-center justify-between">
                      <span className="text-sm">{item.range}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(item.count / Math.max(...detailedData.sessionLengthDistribution.map((i: any) => i.count))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Subject Trends
                </CardTitle>
                <CardDescription>
                  Changes in your study focus over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detailedData?.subjectDrift ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Trend Status</span>
                      <Badge variant={detailedData.subjectDrift.trend === 'significant' ? 'destructive' : 'secondary'}>
                        {detailedData.subjectDrift.trend}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Subjects showing significant changes in your study patterns
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Insufficient data for trend analysis
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Anomaly Detection
                </CardTitle>
                <CardDescription>
                  Unusual patterns in your study behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detailedData?.anomalies && detailedData.anomalies.length > 0 ? (
                  <div className="space-y-3">
                    {detailedData.anomalies.map((anomaly: any, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">{anomaly.type}</div>
                          <div className="text-muted-foreground">{anomaly.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No anomalies detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Anomaly Score</span>
                    <Badge variant={detailedData?.anomalyScore > 5 ? 'destructive' : 'secondary'}>
                      {detailedData?.anomalyScore || 0}/10
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Data Points</span>
                    <span className="text-sm font-medium">{dashboardData?.sessionCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Subjects</span>
                    <span className="text-sm font-medium">{Object.keys(dashboardData?.subjectDistribution || {}).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Quality</CardTitle>
                <CardDescription>
                  Information about your analytics data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Time Range</span>
                    <span className="text-sm font-medium">{formatTimeRange(selectedTimeRange)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Completeness</span>
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-sm font-medium">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <TimezoneFirstVisitModal onOpenChange={setShowTimezoneModal} />
    </div>
  );
}