'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState, useEffect, type ReactNode} from 'react';
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
  Bot,
} from 'lucide-react';
import {ConfettiProvider} from './providers/confetti-provider';
import {SplashScreen} from '@/components/splash-screen';
import {GlobalTimerBar} from './tasks/global-timer-bar';

function AppLayout({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const {isMobile, setOpenMobile} = useSidebar();

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const menuItems = [
    {href: '/', label: 'Dashboard', icon: LayoutDashboard},
    {href: '/briefing', label: 'Daily Briefing', icon: Sparkles},
    {href: '/tasks', label: 'All Tasks', icon: ListChecks},
    {href: '/coach', label: 'AI Coach', icon: Bot},
    {href: '/stats', label: 'Stats', icon: TrendingUp},
    {href: '/badges', label: 'Badges', icon: Award},
    {href: '/archive', label: 'Archived Tasks', icon: Archive},
    {href: '/logs', label: 'Activity Log', icon: ScrollText},
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
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/profile'}
                tooltip="Profile"
                onClick={handleMenuClick}
              >
                <Link href="/profile">
                  <User />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 border-b flex items-center justify-between md:hidden sticky top-0 bg-background z-30">
          <Logo />
          <SidebarTrigger />
        </div>
        <GlobalTimerBar />
        {children}
      </SidebarInset>
      <Toaster />
    </>
  );
}

export function Providers({children}: {children: ReactNode}) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <ConfettiProvider>
      <SidebarProvider>
        <AppLayout>{children}</AppLayout>
      </SidebarProvider>
    </ConfettiProvider>
  );
}
