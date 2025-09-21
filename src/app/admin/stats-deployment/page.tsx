"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Zap,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface DeploymentMetrics {
  cohortPercentage: number;
  activeUsers: number;
  errorRate: number;
  computeTimeP95: number;
  workerInitRate: number;
  featureUsage: Record<string, number>;
  timestamp: number;
}

interface DeploymentStage {
  name: string;
  percentage: number;
  status: 'pending' | 'active' | 'completed';
  duration: string;
  metrics: {
    maxErrorRate: string;
    maxComputeTime: string;
    minSuccessRate: string;
  };
}

export default function StatsDeploymentPage() {
  const [metrics, setMetrics] = useState<DeploymentMetrics | null>(null);
  const [stages, setStages] = useState<DeploymentStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading metrics
    const loadMetrics = () => {
      // Mock data - in real implementation, this would fetch from API
      const mockMetrics: DeploymentMetrics = {
        cohortPercentage: 10,
        activeUsers: 1247,
        errorRate: 0.3,
        computeTimeP95: 45,
        workerInitRate: 98.5,
        featureUsage: {
          'stats.worker.v1': 95,
          'badges.incremental.v1': 87,
          'stats.rollup.v2': 92,
          'stats.accessibility.v1': 78,
          'stats.observability.v1': 89
        },
        timestamp: Date.now()
      };

      const mockStages: DeploymentStage[] = [
        {
          name: 'Canary',
          percentage: 10,
          status: 'active',
          duration: '24-48 hours',
          metrics: {
            maxErrorRate: '1%',
            maxComputeTime: '100ms',
            minSuccessRate: '99%'
          }
        },
        {
          name: 'Ramp to 50%',
          percentage: 50,
          status: 'pending',
          duration: '24-48 hours',
          metrics: {
            maxErrorRate: '0.5%',
            maxComputeTime: '75ms',
            minSuccessRate: '99.5%'
          }
        },
        {
          name: 'Full Deployment',
          percentage: 100,
          status: 'pending',
          duration: 'Continuous',
          metrics: {
            maxErrorRate: '0.1%',
            maxComputeTime: '50ms',
            minSuccessRate: '99.9%'
          }
        }
      ];

      setMetrics(mockMetrics);
      setStages(mockStages);
      setIsLoading(false);
    };

    loadMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: DeploymentStage['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getMetricStatus = (value: number, threshold: number, isLowerBetter = true) => {
    const isGood = isLowerBetter ? value <= threshold : value >= threshold;
    return {
      status: isGood ? 'good' : 'warning',
      icon: isGood ? CheckCircle : AlertTriangle,
      color: isGood ? 'text-green-600' : 'text-yellow-600'
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stats Hardening v1.0.0 Deployment</h1>
          <p className="text-gray-600">Monitor the rollout of hardened statistics features</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Activity className="w-3 h-3 mr-1 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Alert Banner */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Canary Deployment Active</AlertTitle>
        <AlertDescription>
          Currently rolling out to 10% of users. Monitor metrics for 24-48 hours before ramping up.
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.cohortPercentage}% of total user base
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            {(() => {
              const status = getMetricStatus(metrics?.errorRate || 0, 1);
              const Icon = status.icon;
              return <Icon className={`h-4 w-4 ${status.color}`} />;
            })()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 1%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compute Time (P95)</CardTitle>
            {(() => {
              const status = getMetricStatus(metrics?.computeTimeP95 || 0, 100);
              const Icon = status.icon;
              return <Icon className={`h-4 w-4 ${status.color}`} />;
            })()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.computeTimeP95}ms</div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 100ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worker Success Rate</CardTitle>
            {(() => {
              const status = getMetricStatus(metrics?.workerInitRate || 0, 95, false);
              const Icon = status.icon;
              return <Icon className={`h-4 w-4 ${status.color}`} />;
            })()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.workerInitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Target: &gt; 95%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deployment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deployment">Deployment Progress</TabsTrigger>
          <TabsTrigger value="features">Feature Usage</TabsTrigger>
          <TabsTrigger value="logs">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="deployment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rollout Stages</CardTitle>
              <CardDescription>
                Current deployment status and upcoming stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stages.map((stage, index) => (
                  <div key={stage.name} className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(stage.status)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{stage.name}</h3>
                        <Badge variant={stage.status === 'active' ? 'default' : 'secondary'}>
                          {stage.percentage}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{stage.duration}</p>
                      <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                        <span>Max errors: {stage.metrics.maxErrorRate}</span>
                        <span>Max compute: {stage.metrics.maxComputeTime}</span>
                        <span>Min success: {stage.metrics.minSuccessRate}</span>
                      </div>
                    </div>
                    {stage.status === 'pending' && index === stages.findIndex(s => s.status === 'pending') && (
                      <Button size="sm" disabled>
                        Waiting for canary validation
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Adoption</CardTitle>
              <CardDescription>
                Usage percentage of each hardened feature
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics?.featureUsage || {}).map(([feature, usage]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{feature}</span>
                        <span className="text-sm text-gray-600">{usage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${usage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Deployment events and system changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm">Canary deployment initiated</p>
                    <p className="text-xs text-gray-500">10% cohort enabled - 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm">Feature flags updated</p>
                    <p className="text-xs text-gray-500">All hardened features enabled for canary - 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm">Metrics within thresholds</p>
                    <p className="text-xs text-gray-500">All systems performing normally - 5 minutes ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}