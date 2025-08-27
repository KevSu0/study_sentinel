
'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  PlayCircle,
  MessageCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { useGlobalState } from '@/hooks/use-global-state';

const menuItems = [
  {href: '/', label: 'Dashboard', icon: LayoutDashboard},
  {href: '/plans', label: 'Plans', icon: ClipboardList},
  {href: '/chat', label: 'AI Coach', icon: MessageCircle},
  {href: '/stats', label: 'Stats', icon: TrendingUp},
];

export function BottomNav() {
  const pathname = usePathname();
  const { openQuickStart } = useGlobalState();

  if (pathname === '/timer') {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-24 bg-background border-t z-40 px-2">
      <div className="relative flex justify-around items-center h-full">
        {menuItems.slice(0, 2).map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs w-1/5 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="w-1/5 flex justify-center">
          <Button
            variant="default"
            size="icon"
            className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 -translate-y-4"
            onClick={openQuickStart}
            aria-label="Quick Start"
          >
            <PlayCircle className="h-8 w-8 text-primary-foreground" />
          </Button>
        </div>

        {menuItems.slice(2).map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs w-1/5 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
