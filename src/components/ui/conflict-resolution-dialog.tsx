'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Clock, Database, Wifi } from 'lucide-react';
import { SyncConflict } from '@/lib/db';
import { syncEngine } from '@/lib/sync';
import { toast } from 'sonner';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: SyncConflict[];
  onConflictsResolved: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  onConflictsResolved
}: ConflictResolutionDialogProps) {
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (conflicts.length > 0 && !selectedConflict) {
      setSelectedConflict(conflicts[0]);
    }
  }, [conflicts, selectedConflict]);

  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'remote') => {
    try {
      setResolving(conflictId);
      await syncEngine.resolveConflict(conflictId, resolution);
      
      // Remove resolved conflict from the list
      const remainingConflicts = conflicts.filter(c => c.id !== conflictId);
      
      if (remainingConflicts.length === 0) {
        onConflictsResolved();
        onOpenChange(false);
      } else {
        // Select next conflict
        setSelectedConflict(remainingConflicts[0]);
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      toast.error('Failed to resolve conflict');
    } finally {
      setResolving(null);
    }
  };

  const formatData = (data: any): string => {
    if (!data) return 'No data';
    return JSON.stringify(data, null, 2);
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'data_conflict':
        return <Database className="h-4 w-4" />;
      case 'push_failed':
        return <Wifi className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'data_conflict':
        return 'Data Conflict';
      case 'push_failed':
        return 'Push Failed';
      default:
        return 'Unknown Conflict';
    }
  };

  if (!selectedConflict) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Sync Conflicts ({conflicts.length})
          </DialogTitle>
          <DialogDescription>
            Resolve conflicts to continue syncing your data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Conflict List */}
          <div className="w-1/3">
            <h3 className="font-semibold mb-2">Conflicts</h3>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <Card
                    key={conflict.id}
                    className={`cursor-pointer transition-colors ${
                      selectedConflict?.id === conflict.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedConflict(conflict)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getConflictTypeIcon('data_conflict')}
                          {getConflictTypeLabel('data_conflict')}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(conflict.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <CardTitle className="text-sm">
                        {conflict.tableName} #{conflict.recordId}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        Conflict in {conflict.tableName} record
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator orientation="vertical" />

          {/* Conflict Details */}
          <div className="flex-1">
            <div className="space-y-4 h-full">
              <div>
                <h3 className="font-semibold mb-2">Conflict Details</h3>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getConflictTypeIcon('data_conflict')}
                      {getConflictTypeLabel('data_conflict')}
                    </CardTitle>
                    <CardDescription>
                      Conflict in {selectedConflict.tableName} record
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Entity:</strong> {selectedConflict.tableName} #{selectedConflict.recordId}</p>
                      <p><strong>Time:</strong> {new Date(selectedConflict.createdAt).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Comparison */}
              {selectedConflict.resolutionStrategy === 'manual' && (
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Local Version</CardTitle>
                      <CardDescription>Your local changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40">
                        <pre className="text-xs whitespace-pre-wrap">
                          {formatData(selectedConflict.localData)}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Remote Version</CardTitle>
                      <CardDescription>Server changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40">
                        <pre className="text-xs whitespace-pre-wrap">
                          {formatData(selectedConflict.remoteData)}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Push Failed Details */}
              {false && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Failed Data</CardTitle>
                    <CardDescription>Data that failed to sync</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40">
                      <pre className="text-xs whitespace-pre-wrap">
                        {formatData(selectedConflict.localData)}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
          
          <div className="flex gap-2">
            {selectedConflict.resolutionStrategy === 'manual' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleResolveConflict(selectedConflict.id!, 'remote')}
                  disabled={resolving === selectedConflict.id}
                >
                  {resolving === selectedConflict.id ? 'Resolving...' : 'Use Remote'}
                </Button>
                <Button
                  onClick={() => handleResolveConflict(selectedConflict.id!, 'local')}
                  disabled={resolving === selectedConflict.id}
                >
                  {resolving === selectedConflict.id ? 'Resolving...' : 'Use Local'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}