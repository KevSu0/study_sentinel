
import React, {memo} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import type {Badge} from '@/lib/types';
import {Lock} from 'lucide-react';
import * as Icons from 'lucide-react';

interface BadgeCardProps {
  badge: Badge;
  isEarned: boolean;
}

export const BadgeCard = memo(function BadgeCard({
  badge,
  isEarned,
}: BadgeCardProps) {
  const Icon = (Icons as any)[badge.icon] || Icons.Award;

  return (
    <Card
      className={cn(
        'transition-all duration-300 flex flex-col items-center text-center p-4',
        isEarned
          ? 'bg-opacity-10 border-solid'
          : 'border-dashed bg-card/50',
        !isEarned && 'grayscale'
      )}
      style={{
        borderColor: isEarned ? badge.color : undefined,
        backgroundColor: isEarned ? `${badge.color}1A` : undefined,
      }}
    >
      <div
        className={cn(
          'relative rounded-full p-4 mb-3 w-20 h-20 flex items-center justify-center',
          isEarned ? 'text-white' : 'bg-muted'
        )}
        style={{
          backgroundColor: isEarned ? badge.color : undefined,
        }}
      >
        <Icon className={cn('h-10 w-10', !isEarned && 'text-muted-foreground')} />
        {!isEarned && (
          <div className="absolute -bottom-1 -right-1 bg-card p-1 rounded-full border">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardHeader className="p-0">
        <CardTitle
          className={cn(
            'text-base font-semibold',
            !isEarned && 'text-muted-foreground'
          )}
        >
          {badge.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 mt-1 flex-grow">
        <p
          className={cn(
            'text-xs',
            isEarned ? 'text-muted-foreground' : 'text-muted-foreground/70'
          )}
        >
          {badge.description}
        </p>
      </CardContent>
    </Card>
  );
});
