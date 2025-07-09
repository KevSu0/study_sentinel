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
import {LayoutDashboard} from 'lucide-react';
import type {ReactNode} from 'react';

export function Providers({children}: {children: ReactNode}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="bg-background">
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
                  <Link href="/">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>{children}</SidebarInset>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
