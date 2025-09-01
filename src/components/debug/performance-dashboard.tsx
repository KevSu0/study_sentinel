// Performance monitoring dashboard for development

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PerformanceMonitor, { usePerformanceMonitor } from '@/utils/performance-monitor';
import MemoryManager, { useMemoryManager } from '@/utils/memory-manager';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Clock, HardDrive, Zap, RefreshCw, Trash2 } from 'lucide-react';

interface PerformanceMetric {
  timestamp: number;
  renderTime: number;
  memoryUsage: number;
  componentName: string;
}

interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [refreshInterval, setRefreshInterval] = useState<number>(1000);

  const performanceMonitor = PerformanceMonitor.getInstance();
  const memoryManager = MemoryManager.getInstance();

  // Update metrics periodically
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      const summary = performanceMonitor.getPerformanceSummary();
      const memory = (performance as any).memory;
      
      if (memory) {
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        });
      }

      // Create a single metric entry from the summary
      const newMetric: PerformanceMetric = {
        timestamp: Date.now(),
        renderTime: summary.averageRenderTime,
        memoryUsage: memory?.usedJSHeapSize || 0,
        componentName: summary.slowestComponent
      };

      setMetrics(prev => {
        const combined = [...prev, newMetric];
        // Keep only last 100 metrics
        return combined.slice(-100);
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isRecording, refreshInterval, performanceMonitor]);

  // Filter metrics by selected component
  const filteredMetrics = useMemo(() => {
    if (selectedComponent === 'all') return metrics;
    return metrics.filter(metric => metric.componentName === selectedComponent);
  }, [metrics, selectedComponent]);

  // Get unique component names
  const componentNames = useMemo(() => {
    const names = new Set(metrics.map(m => m.componentName));
    return Array.from(names);
  }, [metrics]);

  // Calculate performance statistics
  const performanceStats = useMemo(() => {
    if (filteredMetrics.length === 0) {
      return {
        avgRenderTime: 0,
        maxRenderTime: 0,
        minRenderTime: 0,
        totalRenders: 0
      };
    }

    const renderTimes = filteredMetrics.map(m => m.renderTime);
    return {
      avgRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      totalRenders: renderTimes.length
    };
  }, [filteredMetrics]);

  // Memory chart data
  const memoryChartData = useMemo(() => {
    return filteredMetrics.slice(-20).map((metric, index) => ({
      time: index,
      memory: metric.memoryUsage / (1024 * 1024), // Convert to MB
      renderTime: metric.renderTime
    }));
  }, [filteredMetrics]);

  // Component performance data
  const componentPerformanceData = useMemo(() => {
    const componentStats = componentNames.map(name => {
      const componentMetrics = metrics.filter(m => m.componentName === name);
      const renderTimes = componentMetrics.map(m => m.renderTime);
      
      return {
        name,
        avgRenderTime: renderTimes.length > 0 
          ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
          : 0,
        totalRenders: renderTimes.length
      };
    });

    return componentStats.sort((a, b) => b.avgRenderTime - a.avgRenderTime);
  }, [componentNames, metrics]);

  // Handle recording toggle
  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
    if (!isRecording) {
      performanceMonitor.cleanup();
      setMetrics([]);
    }
  }, [isRecording, performanceMonitor]);

  // Clear all data
  const clearData = useCallback(() => {
    performanceMonitor.cleanup();
    setMetrics([]);
    setMemoryInfo(null);
  }, [performanceMonitor]);

  // Force garbage collection (if available)
  const forceGC = useCallback(() => {
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc();
    } else {
      console.warn('Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
    }
  }, []);

  // Clean up memory manager
  const cleanupMemory = useCallback(() => {
    memoryManager.cleanup();
  }, [memoryManager]);

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">Monitor runtime performance and memory usage</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isRecording ? "destructive" : "default"}
            onClick={toggleRecording}
            className="flex items-center gap-2"
          >
            {isRecording ? (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Stop Recording
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Start Recording
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={clearData}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Data
          </Button>
          
          <Button variant="outline" onClick={forceGC}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Force GC
          </Button>
          
          <Button variant="outline" onClick={cleanupMemory}>
          <HardDrive className="w-4 h-4 mr-2" />
          Clean Memory
        </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Render Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceStats.avgRenderTime.toFixed(2)}ms
            </div>
            <Badge variant={performanceStats.avgRenderTime > 16 ? "destructive" : "default"}>
              {performanceStats.avgRenderTime > 16 ? "Slow" : "Good"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memoryInfo ? (memoryInfo.used / (1024 * 1024)).toFixed(1) : '0'}MB
            </div>
            <Badge variant={memoryInfo && memoryInfo.percentage > 80 ? "destructive" : "default"}>
              {memoryInfo ? `${memoryInfo.percentage.toFixed(1)}%` : '0%'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Renders</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceStats.totalRenders}</div>
            <p className="text-xs text-muted-foreground">Components rendered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recording Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isRecording ? (
                <Badge variant="destructive">Recording</Badge>
              ) : (
                <Badge variant="secondary">Stopped</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.length} metrics collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Component Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Filter by component:</label>
        <select
          value={selectedComponent}
          onChange={(e) => setSelectedComponent(e.target.value)}
          className="px-3 py-1 border rounded-md bg-background"
        >
          <option value="all">All Components</option>
          {componentNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        
        <label className="text-sm font-medium ml-4">Refresh interval:</label>
        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
          className="px-3 py-1 border rounded-md bg-background"
        >
          <option value={500}>500ms</option>
          <option value={1000}>1s</option>
          <option value={2000}>2s</option>
          <option value={5000}>5s</option>
        </select>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Render Time Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={memoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${Number(value).toFixed(2)}${name === 'renderTime' ? 'ms' : 'MB'}`,
                        name === 'renderTime' ? 'Render Time' : 'Memory'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="renderTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Component Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={componentPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${Number(value).toFixed(2)}${name === 'avgRenderTime' ? 'ms' : ''}`,
                        name === 'avgRenderTime' ? 'Avg Render Time' : 'Total Renders'
                      ]}
                    />
                    <Bar dataKey="avgRenderTime" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={memoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${Number(value).toFixed(2)}MB`, 'Memory Usage']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;