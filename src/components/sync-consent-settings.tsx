'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  User, 
  FileText, 
  Trash2, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Database,
  Cloud,
  Eye,
  EyeOff,
  Settings,
  Info,
  Lock,
  Unlock,
  Activity,
  Calendar
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ConsentState {
  syncUplink: boolean;
  syncDownlink: boolean;
  analytics: boolean;
  marketing: boolean;
  dataRetention: '30days' | '90days' | '1year' | 'forever';
  lastUpdated: string;
  version: string;
}

interface DataDeletionRequest {
  id: string;
  type: 'full' | 'partial' | 'sync_only';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  reason: string;
  affectedData: string[];
}

interface PrivacyPolicy {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export function SyncConsentSettings() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<DataDeletionRequest[]>([]);
  const [privacyPolicy, setPrivacyPolicy] = useState<PrivacyPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showFullPolicy, setShowFullPolicy] = useState(false);

  // Load consent state
  useEffect(() => {
    loadConsentState();
    loadDeletionRequests();
    loadPrivacyPolicy();
  }, []);

  const loadConsentState = async () => {
    // Simulate loading consent from localStorage
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const savedConsent = localStorage.getItem('sync_consent');
    if (savedConsent) {
      setConsent(JSON.parse(savedConsent));
    } else {
      // Default consent state
      setConsent({
        syncUplink: false,
        syncDownlink: false,
        analytics: false,
        marketing: false,
        dataRetention: '90days',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      });
    }
  };

  const loadDeletionRequests = async () => {
    // Simulate loading deletion requests
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockRequests: DataDeletionRequest[] = [
      {
        id: '1',
        type: 'partial',
        status: 'completed',
        requestedAt: '2024-01-10T14:30:00Z',
        completedAt: '2024-01-10T14:35:00Z',
        reason: 'User requested data cleanup',
        affectedData: ['analytics', 'marketing_data']
      }
    ];
    
    setDeletionRequests(mockRequests);
  };

  const loadPrivacyPolicy = async () => {
    // Simulate loading privacy policy
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setPrivacyPolicy({
      version: '1.0',
      effectiveDate: '2024-01-01',
      lastUpdated: '2024-01-15',
      sections: [
        {
          title: 'Data Collection',
          content: 'We collect study session data, AI interactions, and usage patterns to improve your learning experience.'
        },
        {
          title: 'Data Usage',
          content: 'Your data is used to provide personalized insights, track progress, and optimize study recommendations.'
        },
        {
          title: 'Data Sharing',
          content: 'We do not sell your personal data. Data is only shared with third parties for essential service functionality.'
        },
        {
          title: 'Data Retention',
          content: 'Your data is retained according to your chosen retention policy. You can request deletion at any time.'
        },
        {
          title: 'Your Rights',
          content: 'You have the right to access, modify, or delete your data. You can also export your data at any time.'
        }
      ]
    });
  };

  const updateConsent = async (updates: Partial<ConsentState>) => {
    setUpdating('consent');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newConsent = {
        ...consent!,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      
      setConsent(newConsent);
      localStorage.setItem('sync_consent', JSON.stringify(newConsent));
      
      // Show confirmation
      alert('Consent preferences updated successfully!');
      
    } finally {
      setUpdating(null);
    }
  };

  const requestDeletion = async (type: 'full' | 'partial' | 'sync_only') => {
    const confirm = window.confirm(`Are you sure you want to request ${type} data deletion? This action cannot be undone.`);
    if (!confirm) return;
    
    const reason = prompt('Please provide a reason for this deletion request:');
    if (!reason) return;
    
    setUpdating('deletion');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newRequest: DataDeletionRequest = {
        id: Date.now().toString(),
        type,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        reason,
        affectedData: type === 'sync_only' ? ['sync_data'] : 
                     type === 'partial' ? ['analytics', 'marketing_data'] : 
                     ['all_data']
      };
      
      setDeletionRequests(prev => [newRequest, ...prev]);
      
      alert('Deletion request submitted successfully. You will receive a confirmation when processing is complete.');
      
    } finally {
      setUpdating(null);
    }
  };

  const exportData = async () => {
    setUpdating('export');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate data export
      const exportData = {
        consent,
        deletionRequests,
        exportDate: new Date().toISOString(),
        userData: {
          studySessions: [],
          preferences: {},
          analytics: {}
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-sentinel-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
    } finally {
      setUpdating(null);
    }
  };

  const acceptAllConsent = async () => {
    await updateConsent({
      syncUplink: true,
      syncDownlink: true,
      analytics: true,
      marketing: true
    });
  };

  const rejectAllConsent = async () => {
    await updateConsent({
      syncUplink: false,
      syncDownlink: false,
      analytics: false,
      marketing: false
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-600">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading || !consent) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Consent & Privacy</h2>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Consent & Privacy</h2>
          <p className="text-muted-foreground">
            Manage your data sharing preferences and privacy settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={acceptAllConsent} disabled={updating !== null} variant="outline">
            <CheckCircle className="mr-2 h-4 w-4" />
            Accept All
          </Button>
          <Button onClick={rejectAllConsent} disabled={updating !== null} variant="outline">
            <XCircle className="mr-2 h-4 w-4" />
            Reject All
          </Button>
        </div>
      </div>

      {/* Consent Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Consent Status
          </CardTitle>
          <CardDescription>
            Your current data sharing preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  <span>Sync Uplink</span>
                </div>
                <Switch
                  checked={consent.syncUplink}
                  onCheckedChange={(checked) => updateConsent({ syncUplink: checked })}
                  disabled={updating !== null}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Sync Downlink</span>
                </div>
                <Switch
                  checked={consent.syncDownlink}
                  onCheckedChange={(checked) => updateConsent({ syncDownlink: checked })}
                  disabled={updating !== null}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>Analytics</span>
                </div>
                <Switch
                  checked={consent.analytics}
                  onCheckedChange={(checked) => updateConsent({ analytics: checked })}
                  disabled={updating !== null}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Marketing</span>
                </div>
                <Switch
                  checked={consent.marketing}
                  onCheckedChange={(checked) => updateConsent({ marketing: checked })}
                  disabled={updating !== null}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Data Retention</label>
                <select
                  value={consent.dataRetention}
                  onChange={(e) => updateConsent({ dataRetention: e.target.value as any })}
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                  disabled={updating !== null}
                >
                  <option value="30days">30 days</option>
                  <option value="90days">90 days</option>
                  <option value="1year">1 year</option>
                  <option value="forever">Forever</option>
                </select>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last updated: {formatDate(consent.lastUpdated)}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Version: {consent.version}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Control your data and exercise your privacy rights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={exportData}
              disabled={updating !== null}
              variant="outline"
              className="h-auto p-4 flex-col"
            >
              <Download className="h-8 w-8 mb-2" />
              <span>Export Data</span>
              <span className="text-xs text-muted-foreground">
                Download all your data
              </span>
            </Button>
            
            <Button
              onClick={() => requestDeletion('sync_only')}
              disabled={updating !== null}
              variant="outline"
              className="h-auto p-4 flex-col"
            >
              <Trash2 className="h-8 w-8 mb-2" />
              <span>Delete Sync Data</span>
              <span className="text-xs text-muted-foreground">
                Remove cloud-synced data
              </span>
            </Button>
            
            <Button
              onClick={() => requestDeletion('partial')}
              disabled={updating !== null}
              variant="outline"
              className="h-auto p-4 flex-col"
            >
              <Trash2 className="h-8 w-8 mb-2" />
              <span>Delete Analytics</span>
              <span className="text-xs text-muted-foreground">
                Remove usage analytics
              </span>
            </Button>
            
            <Button
              onClick={() => requestDeletion('full')}
              disabled={updating !== null}
              variant="destructive"
              className="h-auto p-4 flex-col"
            >
              <Trash2 className="h-8 w-8 mb-2" />
              <span>Delete All Data</span>
              <span className="text-xs text-muted-foreground">
                Complete data removal
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deletion Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Deletion Requests
          </CardTitle>
          <CardDescription>
            Track your data deletion requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deletionRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deletion requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletionRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{request.type}</Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(request.requestedAt)}
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div><strong>Reason:</strong> {request.reason}</div>
                    <div><strong>Affected Data:</strong> {request.affectedData.join(', ')}</div>
                    {request.completedAt && (
                      <div><strong>Completed:</strong> {formatDate(request.completedAt)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Privacy Policy
              </CardTitle>
              <CardDescription>
                How we handle and protect your data
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowFullPolicy(!showFullPolicy)}
              variant="outline"
              size="sm"
            >
              {showFullPolicy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showFullPolicy ? 'Hide' : 'Show'} Full Policy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {privacyPolicy && (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div>
                  <div className="font-medium">Version</div>
                  <div>{privacyPolicy.version}</div>
                </div>
                <div>
                  <div className="font-medium">Effective Date</div>
                  <div>{formatDate(privacyPolicy.effectiveDate)}</div>
                </div>
                <div>
                  <div className="font-medium">Last Updated</div>
                  <div>{formatDate(privacyPolicy.lastUpdated)}</div>
                </div>
              </div>
              
              {showFullPolicy && (
                <div className="mt-4 space-y-4">
                  {privacyPolicy.sections.map((section, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-medium mb-2">{section.title}</h4>
                      <p className="text-sm text-muted-foreground">{section.content}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {!showFullPolicy && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Privacy Summary</AlertTitle>
                  <AlertDescription>
                    We collect study data to improve your learning experience. 
                    You have full control over your data with rights to access, modify, 
                    export, or delete your information at any time.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opt-in Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            What You're Opting Into
          </CardTitle>
          <CardDescription>
            Detailed explanations of each consent option
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Sync Uplink</h4>
              <p className="text-sm text-muted-foreground">
                Allow your study data to be uploaded to cloud servers for backup and 
                synchronization across devices. This enables you to access your data 
                from multiple devices and protects against data loss.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Sync Downlink</h4>
              <p className="text-sm text-muted-foreground">
                Allow data to be downloaded from cloud servers to keep your local 
                data synchronized across all your devices.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Allow collection of anonymous usage data to help us improve the app. 
                This includes session duration, feature usage, and performance metrics. 
                No personal information is shared.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Marketing</h4>
              <p className="text-sm text-muted-foreground">
                Allow us to send you updates about new features, tips, and educational 
                content. We respect your inbox and will never spam you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}