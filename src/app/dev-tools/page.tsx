'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { populateSampleData, clearSampleData } from '@/utils/populate-sample-data';
import { toast } from 'sonner';
import { Loader2, Database, Trash2, FolderOpen, Save, Upload } from 'lucide-react';
import { chooseBackupDirectory, exportBackupDownload, saveBackupToDirectory, importBackupFromFile, rotateBackupsNow, getUserBackupDirHandleOrNull, validateBackupFile, getLocalTableCounts, estimateMergeImpact, sampleMergeDiff } from '@/lib/backup';
import { writeBackup } from '@/lib/backup';

// Human-readable byte formatter for storage estimates
function fmt(bytes: number): string {
  try {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n = n / 1024;
      i++;
    }
    return `${n.toFixed(1)} ${units[i]}`;
  } catch {
    return `${bytes} B`;
  }
}

export default function DevToolsPage() {
  const [isPopulating, setIsPopulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [estimate, setEstimate] = useState('');
  const [folderInfo, setFolderInfo] = useState('—');
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [incomingCounts, setIncomingCounts] = useState<Record<string, number>>({});
  const [mergeImpacts, setMergeImpacts] = useState<any[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [encrypt, setEncrypt] = useState(false);
  const [encPwd, setEncPwd] = useState('');
  const [importPwd, setImportPwd] = useState('');

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

    // Backup health info
    (async () => {
      try {
        // @ts-ignore
        const p = await navigator.storage.persisted?.();
        setPersisted(!!p);
        // @ts-ignore
        const est = await navigator.storage.estimate?.();
        if (est?.usage && est?.quota) {
          const pct = Math.round((est.usage / est.quota) * 100);
          setEstimate(`${fmt(est.usage)} / ${fmt(est.quota)} (${pct}%)`);
        }
      } catch {}
      try {
        const dir = await getUserBackupDirHandleOrNull();
        if (dir && (dir as any).queryPermission) {
          // @ts-ignore
          const perm = await (dir as any).queryPermission({ mode: 'readwrite' });
          setFolderInfo(`Folder set (permission: ${perm})`);
        } else {
          setFolderInfo('No folder chosen');
        }
      } catch {
        setFolderInfo('No folder chosen');
      }
    })();
    (async () => {
      try { setLocalCounts(await getLocalTableCounts()); } catch {}
    })();
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
              <CardTitle>Backup Health & Import</CardTitle>
              <CardDescription>Validate, restore, and rotate local backups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-sm font-medium">Persistent Storage</div>
                  <div className="text-sm">{persisted === null ? '—' : persisted ? 'Granted' : 'Not granted'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Estimate: {estimate || '—'}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-sm font-medium">Chosen Backup Folder</div>
                  <div className="text-sm">{folderInfo}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={encrypt} onChange={e=>setEncrypt(e.target.checked)} />
                  Encrypt manual backup (AES-GCM)
                </label>
                <input type="password" placeholder="Encryption password" className="border rounded px-2 py-1 text-sm" value={encPwd} onChange={e=>setEncPwd(e.target.value)} disabled={!encrypt} />
                <Button variant="outline" onClick={async ()=>{
                  try {
                    setStatus(encrypt ? 'Saving encrypted backup…' : 'Saving backup…');
                    if (encrypt) {
                      await writeBackup({ encrypt: { mode: 'password', password: encPwd } });
                    } else {
                      await writeBackup();
                    }
                    setStatus('✅ Backup saved.');
                  } catch(e:any){ setStatus(`❌ ${e?.message ?? e}`);} 
                }}>Save Backup Now {encrypt ? '(encrypted)' : ''}</Button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-medium">Validate backup</label>
                  <input type="file" accept=".json,.gz,.json.gz,.json.gz.enc" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setSelectedFile(f);
                    try {
                      setStatus('Validating...');
                      const res = await validateBackupFile(f, importPwd || undefined);
                      setIncomingCounts(res.incomingCounts);
                      setMergeImpacts(null);
                      setStatus('✅ Backup valid.');
                    } catch (err: any) {
                      setIncomingCounts({});
                      setStatus(`❌ Validation failed: ${err?.message ?? err}`);
                    }
                  }} />
                </div>
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-medium">Import password</label>
                  <input type="password" className="border rounded px-2 py-1 text-sm" value={importPwd} onChange={e=>setImportPwd(e.target.value)} placeholder="If encrypted" />
                </div>
                {Object.keys(incomingCounts).length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="p-2 text-left">Table</th>
                          <th className="p-2 text-right">Local</th>
                          <th className="p-2 text-right">Incoming</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(incomingCounts).sort().map(t => (
                          <tr key={t} className="border-t">
                            <td className="p-2">{t}</td>
                            <td className="p-2 text-right">{localCounts[t] ?? 0}</td>
                            <td className="p-2 text-right">{incomingCounts[t] ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <input id="mode-replace" type="radio" name="imode" checked={importMode==='replace'} onChange={()=>setImportMode('replace')} />
                    <label htmlFor="mode-replace" className="text-sm">Replace (wipe then restore)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="mode-merge" type="radio" name="imode" checked={importMode==='merge'} onChange={()=>setImportMode('merge')} />
                    <label htmlFor="mode-merge" className="text-sm">Merge (newer updatedAt wins)</label>
                  </div>
                </div>

                {importMode === 'merge' && (
                  <div className="space-y-2">
                    <Button variant="outline" onClick={async ()=>{
                      if (!selectedFile) { setStatus('Choose a backup first.'); return; }
                      setStatus('Estimating merge impact...');
                      try { setMergeImpacts(await estimateMergeImpact(selectedFile, importPwd || undefined)); setStatus('✅ Estimated.'); } catch(e:any){ setStatus(`❌ Estimate failed: ${e?.message ?? e}`);} 
                    }}>Preview merge impact</Button>
                    <Button variant="outline" onClick={async ()=>{
                      if (!selectedFile) { setStatus('Choose a backup first.'); return; }
                      setStatus('Sampling diffs...');
                      try { const s = await sampleMergeDiff(selectedFile, 10, importPwd || undefined); (window as any).lastDiffSample = s; setStatus('✅ Diff sample ready (see table).'); } catch(e:any){ setStatus(`❌ Diff failed: ${e?.message ?? e}`);} 
                    }}>Show diff sample</Button>
                    {mergeImpacts && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border">
                          <thead className="bg-neutral-50">
                            <tr>
                              <th className="p-2 text-left">Table</th>
                              <th className="p-2 text-right">Adds</th>
                              <th className="p-2 text-right">Updates</th>
                              <th className="p-2 text-right">Unchanged</th>
                              <th className="p-2 text-right">Conflicts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mergeImpacts.map((row:any) => (
                              <tr key={row.table} className="border-t">
                                <td className="p-2">{row.table}</td>
                                <td className="p-2 text-right">{row.adds}</td>
                                <td className="p-2 text-right">{row.updates}</td>
                                <td className="p-2 text-right">{row.unchanged}</td>
                                <td className="p-2 text-right">{row.conflicts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button onClick={async ()=>{
                    if (!selectedFile) { setStatus('Choose a backup first.'); return; }
                    setStatus(`Importing (${importMode})...`);
                    try {
                      await importBackupFromFile(selectedFile, { mode: importMode, password: importPwd || undefined });
                      setStatus('✅ Import complete. Reload to reflect all data.');
                      setLocalCounts(await getLocalTableCounts());
                    } catch(e:any){ setStatus(`❌ Import failed: ${e?.message ?? e}`); }
                  }}>Import now ({importMode})</Button>
                  <Button variant="outline" onClick={async () => {
                    try { setStatus('Rotating backups...'); await rotateBackupsNow(); setStatus('✅ Rotation complete.'); } catch (e:any) { setStatus(`❌ Rotation failed: ${e?.message ?? e}`);} 
                  }}>Rotate backups now</Button>
                </div>
                <div>
                  <Button variant="outline" onClick={async () => {
                    try {
                      setStatus('Rotating backups...');
                      await rotateBackupsNow();
                      setStatus('✅ Rotation complete.');
                    } catch (e: any) {
                      setStatus(`❌ Rotation failed: ${e?.message ?? e}`);
                    }
                  }}>Rotate backups now</Button>
                </div>
              </div>
              <div className="text-sm">{status}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Local Backups
              </CardTitle>
              <CardDescription>
                Configure on-device backups and run manual exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  const h = await chooseBackupDirectory();
                  if (h) toast.success('Backup folder set. Daily backups will copy there.');
                  else toast.error('Folder selection was cancelled or not supported.');
                }}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Choose Backup Folder
              </Button>
              <Button
                onClick={async () => {
                  const res = await saveBackupToDirectory();
                  if (res?.ok) toast.success('Backup saved to chosen folder.');
                  else toast.error('Backup failed. Set a folder first.');
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Backup Now
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  await exportBackupDownload();
                  toast.success('Backup downloaded.');
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Download Backup JSON
              </Button>
            </CardContent>
          </Card>
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
