'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  FileText, 
  Database, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  Calendar,
  Activity,
  BarChart3,
  Eye,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

interface BackupMetadata {
  id: string;
  filename: string;
  size: number;
  timestamp: string;
  version: string;
  schemaVersion: string;
  eventCount: number;
  hasChecksum: boolean;
  hasEncryption: boolean;
  compressed: boolean;
}

interface GoldenDataset {
  name: string;
  version: string;
  size: number;
  timestamp: string;
  eventCount: number;
  description: string;
  checksum: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
};

export function BackupImportPanel() {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [goldenDataset, setGoldenDataset] = useState<GoldenDataset | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Load existing backups and golden dataset
  useEffect(() => {
    loadBackups();
    loadGoldenDataset();
  }, []);

  const loadBackups = async () => {
    // Simulate loading backups from localStorage or IndexedDB
    const mockBackups: BackupMetadata[] = [
      {
        id: '1',
        filename: 'study-sentinel-backup-2024-01-15.study-backup',
        size: 2048576,
        timestamp: '2024-01-15T10:30:00Z',
        version: '1.0.0',
        schemaVersion: '1.0',
        eventCount: 1250,
        hasChecksum: true,
        hasEncryption: false,
        compressed: true
      },
      {
        id: '2',
        filename: 'study-sentinel-backup-2024-01-10.study-backup',
        size: 1892356,
        timestamp: '2024-01-10T14:15:00Z',
        version: '1.0.0',
        schemaVersion: '1.0',
        eventCount: 1100,
        hasChecksum: true,
        hasEncryption: false,
        compressed: true
      }
    ];
    setBackups(mockBackups);
  };

  const loadGoldenDataset = async () => {
    // Simulate loading golden dataset reference
    const mockGolden: GoldenDataset = {
      name: 'Study Sentinel Golden Dataset v1.0',
      version: '1.0.0',
      size: 2560000,
      timestamp: '2024-01-01T00:00:00Z',
      eventCount: 1500,
      description: 'Reference dataset with complete study sessions and AI interactions',
      checksum: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890'
    };
    setGoldenDataset(mockGolden);
  };

  const createBackup = async () => {
    setExporting(true);
    try {
      // Simulate backup creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const backup: BackupMetadata = {
        id: Date.now().toString(),
        filename: `study-sentinel-backup-${format(new Date(), 'yyyy-MM-dd')}.study-backup`,
        size: Math.floor(Math.random() * 1000000) + 1000000,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        schemaVersion: '1.0',
        eventCount: Math.floor(Math.random() * 500) + 1000,
        hasChecksum: true,
        hasEncryption: false,
        compressed: true
      };
      
      setBackups(prev => [backup, ...prev]);
      
      // Simulate file download
      const blob = new Blob(['mock backup data'], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const importBackup = async (file: File) => {
    setImporting(true);
    setSelectedBackup(file.name);
    setValidationStatus(null);
    
    try {
      // Simulate validation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock validation results
      const validation = {
        valid: file.name.endsWith('.study-backup'),
        errors: file.name.endsWith('.study-backup') ? [] : ['Invalid file format'],
        warnings: [
          'No encryption detected',
          'Backup format version 1.0 - consider upgrading'
        ]
      };
      
      setValidationStatus(validation);
      
      if (validation.valid) {
        // Simulate successful import
        const newBackup: BackupMetadata = {
          id: Date.now().toString(),
          filename: file.name,
          size: file.size,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          schemaVersion: '1.0',
          eventCount: Math.floor(Math.random() * 500) + 1000,
          hasChecksum: true,
          hasEncryption: false,
          compressed: true
        };
        
        setBackups(prev => [newBackup, ...prev]);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importBackup(file);
    }
  };

  const verifyGoldenDataset = async (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup || !goldenDataset) return;
    
    // Simulate verification process
    const parity = {
      eventCountMatch: Math.abs(backup.eventCount - goldenDataset.eventCount) < 100,
      sizeReasonable: backup.size > goldenDataset.size * 0.5 && backup.size < goldenDataset.size * 2,
      formatValid: backup.schemaVersion === goldenDataset.version,
      checksumValid: backup.hasChecksum
    };
    
    const isValid = Object.values(parity).every(v => v);
    
    alert(`Golden Dataset Verification: ${isValid ? '✅ PASSED' : '❌ FAILED'}
      
Event Count: ${parity.eventCountMatch ? '✅' : '❌'} ${backup.eventCount} vs ${goldenDataset.eventCount}
Size Range: ${parity.sizeReasonable ? '✅' : '❌'} ${formatBytes(backup.size)} vs ${formatBytes(goldenDataset.size)}
Format: ${parity.formatValid ? '✅' : '❌'} ${backup.schemaVersion}
Checksum: ${parity.checksumValid ? '✅' : '❌'} ${backup.hasChecksum ? 'Present' : 'Missing'}`);
  };

  const deleteBackup = async (backupId: string) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      setBackups(prev => prev.filter(b => b.id !== backupId));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Backup & Import</h2>
          <p className="text-muted-foreground">
            Secure backup management and data import/export
          </p>
        </div>
        <Button onClick={createBackup} disabled={exporting}>
          {exporting ? (
            <>
              <Activity className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Create Backup
            </>
          )}
        </Button>
      </div>

      {/* Golden Dataset Reference */}
      {goldenDataset && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Shield className="h-5 w-5" />
              Golden Dataset Reference
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Official reference dataset for backup validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-sm font-medium text-yellow-800">Name</div>
                <div className="text-sm text-yellow-700">{goldenDataset.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-yellow-800">Version</div>
                <div className="text-sm text-yellow-700">{goldenDataset.version}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-yellow-800">Size</div>
                <div className="text-sm text-yellow-700">{formatBytes(goldenDataset.size)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-yellow-800">Events</div>
                <div className="text-sm text-yellow-700">{goldenDataset.eventCount}</div>
              </div>
            </div>
            <div className="text-sm text-yellow-700">
              <strong>Description:</strong> {goldenDataset.description}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Backup
          </CardTitle>
          <CardDescription>
            Restore data from a previous backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".study-backup"
              onChange={handleFileUpload}
              className="hidden"
              id="backup-upload"
              disabled={importing}
            />
            <label
              htmlFor="backup-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileText className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium">
                {importing ? 'Processing...' : 'Drop backup file here or click to browse'}
              </span>
              <span className="text-xs text-muted-foreground">
                .study-backup files only
              </span>
            </label>
          </div>

          {selectedBackup && validationStatus && (
            <div className={`rounded-lg p-4 ${
              validationStatus.valid 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {validationStatus.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  {validationStatus.valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                </span>
              </div>
              
              {validationStatus.errors.length > 0 && (
                <div className="text-red-700 text-sm space-y-1">
                  <div className="font-medium">Errors:</div>
                  {validationStatus.errors.map((error, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <XCircle className="h-3 w-3" />
                      {error}
                    </div>
                  ))}
                </div>
              )}
              
              {validationStatus.warnings.length > 0 && (
                <div className="text-yellow-700 text-sm space-y-1 mt-2">
                  <div className="font-medium">Warnings:</div>
                  {validationStatus.warnings.map((warning, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Available Backups
          </CardTitle>
          <CardDescription>
            Manage your backup files and verify against golden dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm">Create your first backup to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{backup.filename}</span>
                        <Badge variant="outline" className="text-xs">
                          v{backup.version}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatBytes(backup.size)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(backup.timestamp)}
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {backup.eventCount} events
                        </div>
                        <div className="flex items-center gap-1">
                          {backup.compressed ? (
                            <Badge variant="secondary" className="text-xs">
                              Compressed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Uncompressed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {backup.hasChecksum ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className="text-xs">Checksum</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {backup.hasEncryption ? (
                            <Shield className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className="text-xs">Encrypted</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {goldenDataset && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verifyGoldenDataset(backup.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBackup(backup.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Format Information */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Format Information</CardTitle>
          <CardDescription>
            Technical details about the .study-backup file format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">File Structure</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div>• JSON metadata header</div>
                <div>• GZIP compressed payload</div>
                <div>• CRC32 checksum validation</div>
                <div>• Optional AES-256 encryption</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Schema</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div>• Event sourcing records</div>
                <div>• User settings & preferences</div>
                <div>• Performance rollups</div>
                <div>• Achievement badges</div>
                <div>• Session history</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}