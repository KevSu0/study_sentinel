import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Skeleton} from '@/components/ui/skeleton';
import {BadgeCard} from '@/components/badges/badge-card';
import type {Badge, BadgeCategory} from '@/lib/types';

const badgeCategories: BadgeCategory[] = ['daily', 'weekly', 'monthly', 'overall'];

interface BadgeCollectionProps {
  badgeStats: {earnedCount: number; totalCount: number};
  categorizedBadges: Record<BadgeCategory, Badge[]>;
  earnedBadges: Map<string, string>;
  isLoaded: boolean;
}

export function BadgeCollection({
  badgeStats,
  categorizedBadges,
  earnedBadges,
  isLoaded,
}: BadgeCollectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge Collection</CardTitle>
        <CardDescription>
          You've earned {badgeStats.earnedCount} out of {badgeStats.totalCount}{' '}
          possible badges. Keep it up!
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  {[...Array(5)].map((_, i) => (
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
      </CardContent>
    </Card>
  );
}
