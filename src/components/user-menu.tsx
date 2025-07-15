'use client';

import React from 'react';
import {useTheme} from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {Button} from '@/components/ui/button';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {useGlobalState} from '@/hooks/use-global-state';
import {Sun, Moon, Monitor, User as UserIcon} from 'lucide-react';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {useSidebar} from '@/components/ui/sidebar';

const getInitials = (name?: string) => {
  if (!name) return <UserIcon className="h-5 w-5" />;
  const initials = name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return initials.toUpperCase();
};

const ThemeSubMenu = () => {
  const {setTheme} = useTheme();
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span>Toggle theme</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};

export function UserMenu() {
  const {state: globalState} = useGlobalState();
  const {profile} = globalState;
  const {state: sidebarState, isMobile} = useSidebar();

  const menuContent = (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem asChild>
        <Link href="/profile">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </Link>
      </DropdownMenuItem>
      <ThemeSubMenu />
    </DropdownMenuContent>
  );

  if (sidebarState === 'collapsed' && !isMobile) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-center p-2 h-auto"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {profile?.name || 'User Menu'}
          </TooltipContent>
        </Tooltip>
        {menuContent}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start h-auto p-2">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start truncate">
            <span className="font-semibold text-sm">
              {profile?.name || 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              View Options
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      {menuContent}
    </DropdownMenu>
  );
}
