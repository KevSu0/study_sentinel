// This is a new file for the badge list item on the management page.
import React, {memo} from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Pencil, Trash2, ShieldCheck, Wrench, CalendarCheck2} from 'lucide-react';
import {Badge} from '@/lib/types';
import * as Icons from 'lucide-react';
import {cn} from '@/lib/utils';
import {format, parseISO} from 'date-fns';

interface BadgeListItemProps {
  badge: Badge;
  onEdit: (badge: Badge) => void;
  onDelete: (badgeId: string) => void;
  onToggle: (badge: Badge) => void;
  isEarned: boolean;
}

export const BadgeListItem = memo(function BadgeListItem({
  badge,
  onEdit,
  onDelete,
  onToggle,
  isEarned,
}: BadgeListItemProps) {
  const Icon = (Icons as any)[badge.icon] || Icons.Award;

  const handleToggle = () => {
    onToggle({...badge, isEnabled: !badge.isEnabled});
  };

  return (
    <Card
      className={cn(
        'flex flex-col transition-opacity',
        !badge.isEnabled && 'opacity-50'
      )}
    >
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-4">
            <Icon
              className="h-10 w-10 shrink-0"
              style={{color: badge.color}}
            />
            <div>
              <CardTitle>{badge.name}</CardTitle>
              <CardDescription className="mt-1">
                {badge.description}
              </CardDescription>
            </div>
          </div>
          {isEarned ? (
            <div className="flex flex-col items-center text-xs text-accent">
                <CalendarCheck2 className="h-5 w-5" />
                <span>Earned</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
                <Switch
                checked={badge.isEnabled}
                onCheckedChange={handleToggle}
                aria-label="Enable or disable badge"
                />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {badge.isCustom ? (
            <Wrench className="h-4 w-4 text-amber-500" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          )}
          <span>{badge.isCustom ? 'Custom Badge' : 'System Badge'}</span>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {badge.isCustom && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(badge.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onEdit(badge)}>
          <Pencil className="mr-2 h-4 w-4" /> {badge.isCustom ? 'Edit' : 'View'}
        </Button>
      </CardFooter>
    </Card>
  );
});
