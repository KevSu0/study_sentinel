'use client';
import React, {useState, useMemo} from 'react';
import dynamic from 'next/dynamic';
import {Button} from '@/components/ui/button';
import {PlusCircle, Settings} from 'lucide-react';
import {useGlobalState} from '@/hooks/use-global-state';
import {Skeleton} from '@/components/ui/skeleton';
import type {Badge} from '@/lib/types';
import {BadgeListItem} from '@/components/badges/badge-list-item';
import Link from 'next/link';

const BadgeDialog = dynamic(
  () => import('@/components/badges/badge-dialog').then(m => m.BadgeDialog),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default function ManageBadgesPage() {
  const {state, updateBadge, addBadge, deleteBadge} = useGlobalState();
  const {allBadges, earnedBadges, isLoaded} = state;

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);

  const openAddDialog = () => {
    setEditingBadge(null);
    setDialogOpen(true);
  };

  const openEditDialog = (badge: Badge) => {
    setEditingBadge(badge);
    setDialogOpen(true);
  };

  const sortedBadges = useMemo(() => {
    return [...allBadges].sort((a, b) => {
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allBadges]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b gap-2">
        <div>
          <h1 className="text-3xl font-bold text-primary">Manage Badges</h1>
          <p className="text-muted-foreground">
            Create custom badges or edit existing ones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/badges">View Earned Badges</Link>
          </Button>
          <Button onClick={openAddDialog} className="w-full sm:w-auto">
            <PlusCircle className="mr-2" />
            Create Custom Badge
          </Button>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-4">
        {!isLoaded ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : sortedBadges.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedBadges.map(badge => (
              <BadgeListItem
                key={badge.id}
                badge={badge}
                onEdit={openEditDialog}
                onDelete={deleteBadge}
                onToggle={(badgeId, updates) => {
                  const badge = allBadges.find(b => b.id === badgeId);
                  if (badge) {
                    updateBadge({...badge, ...updates});
                  }
                }}
                isEarned={earnedBadges.has(badge.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Settings className="h-16 w-16 text-primary/80 mb-4" />
            <h2 className="text-xl font-bold">No Badges Found</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Create your first custom badge to start a new challenge!
            </p>
            <Button onClick={openAddDialog} className="mt-6">
              Create Badge
            </Button>
          </div>
        )}
      </main>

      {isDialogOpen && (
        <BadgeDialog
          isOpen={isDialogOpen}
          onOpenChange={setDialogOpen}
          onAddBadge={addBadge}
          onUpdateBadge={(id, updates) => {
            const badge = allBadges.find(b => b.id === id);
            if (badge) {
              updateBadge({...badge, ...updates});
            }
          }}
          badgeToEdit={editingBadge}
        />
      )}
    </div>
  );
}
