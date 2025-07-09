'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
import type {ReactNode} from 'react';
import {ConfettiProvider} from './providers/confetti-provider';

export function Providers({children}: {children: ReactNode}) {
  const pathname = usePathname();

  return (
    <ConfettiProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="p-4">
            <Link href="/" aria-label="Back to Home">
              <Logo />
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/'}
                  tooltip="Dashboard"
                >
                  <Link href="/" className="flex items-center gap-2">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/tasks'}
                  tooltip="All Tasks"
                >
                  <Link href="/tasks" className="flex items-center gap-2">
                    <ListChecks />
                    <span>All Tasks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/archive'}
                  tooltip="Archived Tasks"
                >
                  <Link href="/archive" className="flex items-center gap-2">
                    <Archive />
                    <span>Archived Tasks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/badges'}
                  tooltip="Badges"
                >
                  <Link href="/badges" className="flex items-center gap-2">
                    <Award />
                    <span>Badges</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/stats'}
                  tooltip="Stats"
                >
                  <Link href="/stats" className="flex items-center gap-2">
                    <TrendingUp />
                    <span>Stats</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>{children}</SidebarInset>
        <Toaster />
      </SidebarProvider>
    </ConfettiProvider>
  );
}
