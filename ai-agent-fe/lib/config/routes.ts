/**
 * Central Route Configuration
 * Single source of truth for navigation, breadcrumbs, and routing
 */

import { 
  BarChart3, 
  User,
  Target
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface RouteConfig {
  /** URL path */
  path: string;
  /** Display title for navigation and page headers */
  title: string;
  /** Breadcrumb label (can be different from title for space) */
  breadcrumb: string;
  /** Icon component for navigation */
  icon?: LucideIcon;
  /** Child routes for nested navigation */
  children?: RouteConfig[];
  /** Hide from main navigation (e.g., detail pages) */
  hideInNav?: boolean;
  /** Contains dynamic segments like [id] */
  dynamic?: boolean;
  /** Description for tooltips or sub-navigation */
  description?: string;
  /** Permissions required to access this route */
  roles?: string[];
}

/**
 * Application route configuration
 * Used for navigation menus, breadcrumbs, and route management
 */
export const appRoutes: RouteConfig[] = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    breadcrumb: 'Dashboard',
    icon: BarChart3,
    description: 'CRM Intelligence Dashboard mit Live-Metriken',
  },
  {
    path: '/dashboard/retention-plans',
    title: 'Retention-Pläne',
    breadcrumb: 'Retention-Pläne',
    icon: Target,
    description: 'Kundenbindungs-Strategien und Maßnahmen',
  },
  // Dynamic routes for existing functionality
  {
    path: '/dashboard/reports/member/[memberId]',
    title: 'Mitglied Details',
    breadcrumb: 'Mitglied',
    icon: User,
    hideInNav: true,
    dynamic: true,
    description: 'Detaillierte Mitglieder-Analyse',
  },
  // Test page - might be removed in production
  {
    path: '/dashboard/test',
    title: 'Test',
    breadcrumb: 'Test',
    hideInNav: true,
    description: 'Test-Seite für Entwicklung',
  },
];

/**
 * Utility functions for route management
 */

/**
 * Find route configuration by path
 */
export const findRouteByPath = (path: string): RouteConfig | null => {
  const findInRoutes = (routes: RouteConfig[], targetPath: string): RouteConfig | null => {
    for (const route of routes) {
      // Exact match
      if (route.path === targetPath) {
        return route;
      }
      
      // Dynamic route match (e.g., /dashboard/reports/member/[memberId])
      if (route.dynamic && route.path.includes('[') && route.path.includes(']')) {
        const routePattern = route.path.replace(/\[.*?\]/g, '[^/]+');
        const regex = new RegExp(`^${routePattern}$`);
        if (regex.test(targetPath)) {
          return route;
        }
      }
      
      // Search in children
      if (route.children) {
        const found = findInRoutes(route.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findInRoutes(appRoutes, path);
};

/**
 * Get navigation routes (excluding hidden ones)
 */
export const getNavigationRoutes = (): RouteConfig[] => {
  const filterVisible = (routes: RouteConfig[]): RouteConfig[] => {
    return routes
      .filter(route => !route.hideInNav)
      .map(route => ({
        ...route,
        children: route.children ? filterVisible(route.children) : undefined,
      }));
  };
  
  return filterVisible(appRoutes);
};

/**
 * Generate breadcrumb path for a given URL
 */
export const generateBreadcrumbs = (pathname: string): Array<{ title: string; path: string; dynamic?: boolean }> => {
  const breadcrumbs: Array<{ title: string; path: string; dynamic?: boolean }> = [];
  const pathSegments = pathname.split('/').filter(Boolean);
  
  let currentPath = '';
  
  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    const route = findRouteByPath(currentPath);
    
    if (route) {
      breadcrumbs.push({
        title: route.breadcrumb,
        path: currentPath,
        dynamic: route.dynamic,
      });
    } else {
      // Handle dynamic segments or unknown routes
      breadcrumbs.push({
        title: segment,
        path: currentPath,
        dynamic: true,
      });
    }
  }
  
  return breadcrumbs;
};

/**
 * Check if user has access to route based on roles
 */
export const hasAccessToRoute = (route: RouteConfig, userRoles: string[] = []): boolean => {
  if (!route.roles || route.roles.length === 0) {
    return true; // No role restrictions
  }
  
  return route.roles.some(role => userRoles.includes(role));
};

/**
 * Get filtered routes based on user permissions
 */
export const getAuthorizedRoutes = (userRoles: string[] = []): RouteConfig[] => {
  const filterByPermissions = (routes: RouteConfig[]): RouteConfig[] => {
    return routes
      .filter(route => hasAccessToRoute(route, userRoles))
      .map(route => ({
        ...route,
        children: route.children ? filterByPermissions(route.children) : undefined,
      }));
  };
  
  return filterByPermissions(getNavigationRoutes());
};

/**
 * Get page title from pathname
 */
export const getPageTitle = (pathname: string): string => {
  const route = findRouteByPath(pathname);
  return route?.title || 'Dashboard';
};

/**
 * Check if path is active (including children)
 */
export const isPathActive = (routePath: string, currentPath: string): boolean => {
  if (routePath === currentPath) return true;
  
  // Check if current path starts with route path (for parent routes)
  if (currentPath.startsWith(routePath) && routePath !== '/') {
    return true;
  }
  
  return false;
};

export default appRoutes;