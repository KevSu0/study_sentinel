'use client';
import React, {useMemo} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {BadgeCard} from '@/components/badges/badge-card';
import {useBadges} from '@/hooks/useBadges';
import {Skeleton} from '@/components/ui/skeleton';
import type {Badge, BadgeCategory} from '@/lib/types';

const badgeCategories: BadgeCategory[] = [
  'daily',
  'weekly',
  'monthly',
  'overall',
];

export default function BadgesPage() {
  const {allBadges, earnedBadges, isLoaded} = useBadges();

  const categorizedBadges = useMemo(() => {
    const categories: Record<BadgeCategory, Badge[]> = {
      daily: [],
      weekly: [],
      monthly: [],
      overall: [],
    };
    for (const badge of allBadges) {
      categories[badge.category].push(badge);
    }
    return categories;
  }, [allBadges]);

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Your Badges</h1>
        <p className="text-muted-foreground">
          Celebrate your achievements and milestones.
        </p>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
            {badgeCategories.map(category => (
              <TabsTrigger
                key={category}
                value={category}
                className="capitalize"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          {badgeCategories.map(category => (
            <TabsContent key={category} value={category}>
              {!isLoaded ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categorizedBadges[category].map(badge => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      isEarned={earnedBadges.has(badge.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
