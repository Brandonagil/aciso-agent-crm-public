'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, PanelLeft } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';
import { ResponsiveBreadcrumb } from '@/components/ui/breadcrumb';

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - direct flex child, no fixed positioning */}
      <AppSidebar open={isSidebarOpen} />
      
      {/* Main content area with its own scrolling */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm px-4 supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-950/80">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleSidebar}
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          
          {/* Breadcrumbs */}
          <div className="flex-1">
            <ResponsiveBreadcrumb />
          </div>
        </header>
        {/* Single source of padding - no double padding */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not loading and no user is authenticated
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Display loading indicator while checking auth state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render children only if user is authenticated
  if (user) {
    return (
      <BreadcrumbProvider>
        <AuthLayoutContent>{children}</AuthLayoutContent>
      </BreadcrumbProvider>
    );
  }

  // Return null or redirect component if needed, though useEffect should handle redirection
  return null; 
} 