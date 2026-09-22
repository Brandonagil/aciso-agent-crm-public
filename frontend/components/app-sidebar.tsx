'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bot, User, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { getNavigationRoutes, isPathActive, type RouteConfig } from '@/lib/config/routes';

interface NavigationItemProps {
  route: RouteConfig;
  open: boolean;
  pathname: string;
  level?: number;
}

function NavigationItem({ route, open, pathname, level = 0 }: NavigationItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(
    route.children ? isPathActive(route.path, pathname) : false
  );
  const Icon = route.icon;
  const hasChildren = route.children && route.children.length > 0;
  const isActive = isPathActive(route.path, pathname);
  
  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const paddingLeft = level * 12 + (open ? 12 : 0);

  return (
    <>
      <div
        className={cn(
          "flex items-center rounded-md text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          !open && "justify-center px-2",
          hasChildren && "cursor-pointer"
        )}
        style={{ paddingLeft: open ? `${paddingLeft}px` : undefined }}
        onClick={hasChildren && !open ? toggleExpanded : undefined}
      >
        {hasChildren && !open ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-2 hover:bg-transparent"
            onClick={toggleExpanded}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
          </Button>
        ) : (
          <Link
            href={route.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 flex-1",
              !open && "justify-center px-2"
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {open && <span className="truncate">{route.title}</span>}
            {hasChildren && open && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-auto hover:bg-transparent"
                onClick={(e) => {
                  e.preventDefault();
                  toggleExpanded();
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </Link>
        )}
      </div>
      
      {/* Child routes */}
      {hasChildren && isExpanded && open && (
        <div className="ml-4 space-y-1">
          {route.children?.map((child) => (
            <NavigationItem
              key={child.path}
              route={child}
              open={open}
              pathname={pathname}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function AppSidebar({ open, className, ...props }: { open: boolean } & React.ComponentProps<"div">) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const navigationRoutes = getNavigationRoutes();

  return (
    <div 
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground border-r transition-all duration-300 ease-in-out",
        open ? "w-64" : "w-16",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="size-4" />
        </div>
        {open && (
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">CRM Intelligence</span>
            <span className="truncate text-xs">Dashboard</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 p-2">
        {open && (
          <div className="mb-2">
            <h3 className="px-2 py-1 text-xs font-medium text-sidebar-foreground/70">Navigation</h3>
          </div>
        )}
        <nav className="space-y-1">
          {navigationRoutes.map((route) => (
            <NavigationItem
              key={route.path}
              route={route}
              open={open}
              pathname={pathname}
            />
          ))}
        </nav>
      </div>

      {/* Footer / User */}
      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-3 py-2 h-auto",
                !open && "justify-center px-2"
              )}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {open && (
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.email || 'User'}</span>
                  <span className="truncate text-xs text-muted-foreground">AI Agent User</span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.email || 'User'}</span>
                  <span className="truncate text-xs text-muted-foreground">AI Agent User</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}