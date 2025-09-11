
'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {
  Calendar,
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  MessageCircle,
} from 'lucide-react';

const menuItems = [
  {href: '/', label: 'Dashboard', icon: LayoutDashboard},
  {href: '/plans', label: 'Plans', icon: ClipboardList},
  {href: '/calendar', label: 'Calendar', icon: Calendar},
  {href: '/chat', label: 'AI Coach', icon: MessageCircle},
  {href: '/stats', label: 'Stats', icon: TrendingUp},
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/timer') {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-background border-t z-40">
      <div className="flex justify-around items-center h-full">
        {menuItems.map(item => {
          const isActive = pathname === item.href;
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
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
