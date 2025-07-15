
'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  User,
  ClipboardList
} from 'lucide-react';

const menuItems = [
  {href: '/', label: 'Dashboard', icon: LayoutDashboard},
  {href: '/plans', label: 'Plans', icon: ClipboardList},
  {href: '/stats', label: 'Stats', icon: TrendingUp},
  {href: '/profile', label: 'Profile', icon: User},
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-40">
      <div className="flex justify-around items-center h-full">
        {menuItems.map(item => {
          const isActive = pathname === item.href || (pathname === '/lets-start' && item.href === '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs w-full h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
