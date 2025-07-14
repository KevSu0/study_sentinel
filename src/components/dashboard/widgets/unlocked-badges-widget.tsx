
'use client';
import React from 'react';
import {BadgeCard} from '@/components/badges/badge-card';

export const UnlockedBadgesWidget = ({todaysBadges}: any) => {
  if (!todaysBadges || todaysBadges.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">
        Badges Unlocked Today
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {todaysBadges.map((badge: any) => (
          <BadgeCard key={badge.id} badge={badge} isEarned={true} />
        ))}
      </div>
    </section>
  );
};
