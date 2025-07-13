
'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState, useEffect, type ReactNode} from 'react';
import dynamic from 'next/dynamic';
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {Toaster} from '@/components/ui/toaster';
import {Logo} from '@/components/logo';
import {
  LayoutDashboard,
  ListChecks,
  TrendingUp,
  Award,
  Archive,
  Sparkles,
  ScrollText,
  User,
  CalendarDays,
} from 'lucide-react';
import {ConfettiProvider} from './providers/confetti-provider';
import {SplashScreen} from '@/components/splash-screen';
import {GlobalTimerBar} from './tasks/global-timer-bar';
import {BottomNav} from './bottom-nav';
import {cn} from '@/lib/utils';
import { TasksProvider, useTasks } from '@/hooks/use-tasks';

const ChatWidget = dynamic(
  () => import('@/components/coach/chat-widget').then(m => m.ChatWidget),
  {ssr: false}
);

function AppLayout({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const {isMobile, setOpenMobile} = useSidebar();
  const { isLoaded } = useTasks();

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const menuItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      showInSidebar: true,
    },
    {
      href: '/briefing',
      label: 'Daily Briefing',
      icon: Sparkles,
      showInSidebar: true,
    },
    {
      href: '/tasks',
      label: 'All Tasks',
      icon: ListChecks,
      showInSidebar: true,
    },
    {
      href: '/timetable',
      label: 'Timetable',
      icon: CalendarDays,
      showInSidebar: true,
    },
    {
      href: '/stats',
      label: 'Stats',
      icon: TrendingUp,
      showInSidebar: true,
    },
    {href: '/badges', label: 'Badges', icon: Award, showInSidebar: true},
    {
      href: '/archive',
      label: 'Archived Tasks',
      icon: Archive,
      showInSidebar: true,
    },
    {
      href: '/logs',
      label: 'Activity Log',
      icon: ScrollText,
      showInSidebar: true,
    },
    {href: '/profile', label: 'Profile', icon: User, showInSidebar: true},
  ];
  
  if (!isLoaded) {
    return <SplashScreen />;
  }

  return (
    <>
      <Sidebar>
        <SidebarRail />
        <SidebarHeader className="p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems
              .filter(item => item.showInSidebar)
              .map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={handleMenuClick}
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          {/* Footer items can be placed here if needed */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 border-b flex items-center justify-between md:hidden sticky top-0 bg-background z-30">
          <Logo />
          <SidebarTrigger />
        </div>
        <GlobalTimerBar />
        <div className="pb-16 md:pb-0">{children}</div>
      </SidebarInset>
      <Toaster />
      <BottomNav />
      <ChatWidget />
    </>
  );
}

export function Providers({children}: {children: ReactNode}) {
  return (
    <ConfettiProvider>
      <TasksProvider>
        <SidebarProvider>
          <AppLayout>{children}</AppLayout>
        </SidebarProvider>
      </TasksProvider>
    </ConfettiProvider>
  );
}
