'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface BreadcrumbContextType {
  /**
   * Current dynamic breadcrumb text (e.g., "Max Mustermann" for member pages)
   */
  dynamicBreadcrumb: string | null;
  
  /**
   * Set the dynamic breadcrumb text
   * @param name - The dynamic breadcrumb text or null to clear
   */
  setDynamicBreadcrumb: (name: string | null) => void;
  
  /**
   * Clear the dynamic breadcrumb
   */
  clearDynamicBreadcrumb: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export interface BreadcrumbProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for breadcrumb context
 * Should be placed high in the component tree, typically in the layout
 */
export function BreadcrumbProvider({ children }: BreadcrumbProviderProps) {
  const [dynamicBreadcrumb, setDynamicBreadcrumbState] = useState<string | null>(null);

  const setDynamicBreadcrumb = useCallback((name: string | null) => {
    setDynamicBreadcrumbState(name);
  }, []);

  const clearDynamicBreadcrumb = useCallback(() => {
    setDynamicBreadcrumbState(null);
  }, []);

  const value = React.useMemo(
    () => ({
      dynamicBreadcrumb,
      setDynamicBreadcrumb,
      clearDynamicBreadcrumb,
    }),
    [dynamicBreadcrumb, setDynamicBreadcrumb, clearDynamicBreadcrumb]
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * Hook to use breadcrumb context
 * Must be used within a BreadcrumbProvider
 */
export function useBreadcrumb(): BreadcrumbContextType {
  const context = useContext(BreadcrumbContext);
  
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  
  return context;
}

/**
 * Hook for setting dynamic breadcrumb in page components
 * Automatically clears the breadcrumb on component unmount
 * 
 * @param breadcrumbText - The dynamic breadcrumb text
 * @param dependencies - Dependencies array to re-set the breadcrumb when they change
 */
export function useDynamicBreadcrumb(
  breadcrumbText: string | null,
  dependencies: React.DependencyList = []
) {
  const { setDynamicBreadcrumb, clearDynamicBreadcrumb } = useBreadcrumb();

  React.useEffect(() => {
    if (breadcrumbText) {
      setDynamicBreadcrumb(breadcrumbText);
    }

    // Cleanup on unmount or when breadcrumbText becomes null
    return () => {
      clearDynamicBreadcrumb();
    };
  }, [breadcrumbText, setDynamicBreadcrumb, clearDynamicBreadcrumb, ...dependencies]);
}

/**
 * Higher-order component to provide breadcrumb context
 */
export function withBreadcrumbProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  return function BreadcrumbWrappedComponent(props: P) {
    return (
      <BreadcrumbProvider>
        <Component {...props} />
      </BreadcrumbProvider>
    );
  };
}

export default BreadcrumbContext;