
'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ReactNode, Suspense, lazy, useEffect} from 'react';
import dynamic from 'next/dynamic';
import {ThemeProvider} from 'next-themes';
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
import {Toaster as HotToaster} from 'react-hot-toast';
import {Logo} from '@/components/logo';
import {
  LayoutDashboard,
  TrendingUp,
  Award,
  Sparkles,
  User,
  ClipboardList,
  MessageCircle,
  Settings,
  Calendar,
} from 'lucide-react';
import {ConfettiProvider} from './providers/confetti-provider';
import {SplashScreen} from '@/components/splash-screen';
import {GlobalTimerBar} from './tasks/global-timer-bar';
import { AppStateProvider } from '@/hooks/state/AppStateProvider';
import { useGlobalState } from '@/hooks/use-global-state';
import {ViewModeProvider} from '@/hooks/use-view-mode';
import {DashboardLayoutProvider} from '@/hooks/use-dashboard-layout';
import {Skeleton} from './ui/skeleton';
import { RoutineLogDialog } from './routines/routine-log-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { QuickStartSheet } from './dashboard/quick-start-sheet';
import { db } from '@/lib/db';

const UserMenu = dynamic(() => import('./user-menu').then(m => m.UserMenu), {
  ssr: false,
  loading: () => <Skeleton className="h-14 w-full" />,
});

const BottomNav = dynamic(
  () => import('./bottom-nav').then(m => m.BottomNav),
  {ssr: false}
);

function AppContent({children}: {children: ReactNode}) {
  const {state} = useGlobalState();
  const {isLoaded} = state;
  const pathname = usePathname();

  if (!isLoaded) {
    return <SplashScreen />;
  }
  
  if (pathname === '/timer') {
    return children;
  }

  return (
    <SidebarProvider>
      <AppLayout>{children}</AppLayout>
    </SidebarProvider>
  );
}

function AppLayout({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const {isMobile, setOpenMobile} = useSidebar();

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/plans', label: 'Plans', icon: ClipboardList },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/chat', label: 'AI Coach', icon: MessageCircle },
    { href: '/stats', label: 'Stats', icon: TrendingUp },
    { href: '/badges', label: 'Badges', icon: Award },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <Sidebar>
        <SidebarRail />
        <SidebarHeader className="p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(item => (
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
          <UserMenu />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-svh">
          <div className="p-4 border-b flex items-center justify-between md:hidden sticky top-0 bg-background z-30 shrink-0">
            <Logo />
            <SidebarTrigger />
          </div>
          <GlobalTimerBar />
          <div className="flex-1 pb-20 md:pb-0 overflow-y-auto">{children}</div>
        </div>
      </SidebarInset>
      <HotToaster position="top-center" toastOptions={{duration: 3000}} />
      <BottomNav />
      <RoutineLogDialog />
      <QuickStartSheet />
    </>
  );
}

export function Providers({children}: {children: ReactNode}) {
  // Dev helper: expose IndexedDB instance for manual seeding (add-test-data.js)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        (window as any).db = db;
      } catch {}
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
        <ConfettiProvider>
            <AppStateProvider>
                <ViewModeProvider>
                    <DashboardLayoutProvider>
                        <AppContent>{children}</AppContent>
                    </DashboardLayoutProvider>
                </ViewModeProvider>
            </AppStateProvider>
        </ConfettiProvider>
    </ThemeProvider>
  );
}
