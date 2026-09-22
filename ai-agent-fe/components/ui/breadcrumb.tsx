'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconChevronRight, IconHome } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { generateBreadcrumbs } from '@/lib/config/routes';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';

export interface BreadcrumbProps {
  className?: string;
  homeIcon?: boolean;
  maxItems?: number;
  separator?: React.ReactNode;
}

export interface BreadcrumbItemProps {
  href?: string;
  children: React.ReactNode;
  isLast?: boolean;
  className?: string;
}

/**
 * Individual breadcrumb item component
 */
export function BreadcrumbItem({ 
  href, 
  children, 
  isLast = false, 
  className 
}: BreadcrumbItemProps) {
  const baseStyles = "text-sm transition-colors";
  const linkStyles = "hover:text-foreground text-muted-foreground";
  const currentStyles = "text-foreground font-medium";
  
  if (isLast || !href) {
    return (
      <span className={cn(baseStyles, currentStyles, className)}>
        {children}
      </span>
    );
  }

  return (
    <Link 
      href={href} 
      className={cn(baseStyles, linkStyles, className)}
    >
      {children}
    </Link>
  );
}

/**
 * Breadcrumb separator component
 */
export function BreadcrumbSeparator({ 
  children, 
  className 
}: { 
  children?: React.ReactNode; 
  className?: string; 
}) {
  return (
    <span className={cn("text-muted-foreground", className)}>
      {children || <IconChevronRight className="h-4 w-4" />}
    </span>
  );
}

/**
 * Main Breadcrumb component with auto-generation from pathname
 */
export function Breadcrumb({ 
  className, 
  homeIcon = true, 
  maxItems = 5,
  separator
}: BreadcrumbProps) {
  const pathname = usePathname();
  const { dynamicBreadcrumb } = useBreadcrumb();
  
  // Generate breadcrumbs from pathname
  const breadcrumbItems = React.useMemo(() => {
    const items = generateBreadcrumbs(pathname);
    
    // Replace dynamic segments with actual names if available
    return items.map((item, index) => {
      if (item.dynamic && dynamicBreadcrumb && index === items.length - 1) {
        return {
          ...item,
          title: dynamicBreadcrumb,
        };
      }
      return item;
    });
  }, [pathname, dynamicBreadcrumb]);

  // Limit items if maxItems is specified
  const displayItems = React.useMemo(() => {
    if (breadcrumbItems.length <= maxItems) {
      return breadcrumbItems;
    }

    // Show first item, ellipsis, and last items
    const firstItem = breadcrumbItems[0];
    const lastItems = breadcrumbItems.slice(-(maxItems - 2));
    
    return [
      firstItem,
      { title: '...', path: '', dynamic: false },
      ...lastItems,
    ];
  }, [breadcrumbItems, maxItems]);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center space-x-2", className)}
    >
      <ol className="flex items-center space-x-2">
        {/* Home icon/link */}
        {homeIcon && (
          <>
            <li>
              <Link 
                href="/dashboard" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dashboard"
              >
                <IconHome className="h-4 w-4" />
              </Link>
            </li>
            {displayItems.length > 0 && (
              <li>
                <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
              </li>
            )}
          </>
        )}
        
        {/* Breadcrumb items */}
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.title === '...';
          
          return (
            <React.Fragment key={`${item.path}-${index}`}>
              <li>
                {isEllipsis ? (
                  <span className="text-muted-foreground text-sm">...</span>
                ) : (
                  <BreadcrumbItem 
                    href={isLast ? undefined : item.path}
                    isLast={isLast}
                  >
                    {item.title}
                  </BreadcrumbItem>
                )}
              </li>
              {!isLast && (
                <li>
                  <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Simple breadcrumb component for manual configuration
 */
export function BreadcrumbList({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center space-x-2", className)}
    >
      <ol className="flex items-center space-x-2">
        {children}
      </ol>
    </nav>
  );
}

/**
 * Responsive breadcrumb that adapts to screen size
 */
export function ResponsiveBreadcrumb({ 
  className, 
  ...props 
}: BreadcrumbProps) {
  return (
    <>
      {/* Desktop breadcrumb */}
      <div className="hidden md:block">
        <Breadcrumb 
          {...props} 
          maxItems={6}
          className={className}
        />
      </div>
      
      {/* Mobile breadcrumb - condensed */}
      <div className="md:hidden">
        <Breadcrumb 
          {...props} 
          maxItems={3}
          homeIcon={false}
          className={className}
        />
      </div>
    </>
  );
}

export default Breadcrumb;