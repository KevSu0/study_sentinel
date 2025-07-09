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
} from '@/components/ui/sidebar';
import {Toaster} from '@/components/ui/toaster';
import {Logo} from '@/components/logo';
import {
  LayoutDashboard,
  ListChecks,
  TrendingUp,
  Award,
  Archive,
} from 'lucide-react';
import {ConfettiProvider} from './providers/confetti-provider';
import {SplashScreen} from '@/components/splash-screen';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';

export function Providers({children}: {children: ReactNode}) {
  const pathname = usePathname();
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

  const menuItems = [
    {href: '/', label: 'Dashboard', icon: LayoutDashboard},
    {href: '/tasks', label: 'All Tasks', icon: ListChecks},
    {href: '/archive', label: 'Archived Tasks', icon: Archive},
    {href: '/badges', label: 'Badges', icon: Award},
    {href: '/stats', label: 'Stats', icon: TrendingUp},
  ];

  return (
    <ConfettiProvider>
      <SidebarProvider>
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
                <SidebarMenuButton tooltip="Account">
                  <Avatar className="size-7">
                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="user profile"/>
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <span>Account</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <div className="p-4 border-b flex items-center justify-between md:hidden sticky top-0 bg-background z-10">
            <Logo />
            <SidebarTrigger />
          </div>
          {children}
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </ConfettiProvider>
  );
}
