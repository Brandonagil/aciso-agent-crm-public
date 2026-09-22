'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { premiumGlass } from '@/lib/styles/premium-effects';
import { createInteractiveCard } from '@/lib/styles/interactive-effects';

interface FloatingPanelProps {
  children: React.ReactNode;
  title: string;
  className?: string;
  defaultOpen?: boolean;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
}

export function FloatingPanel({
  children,
  title,
  className,
  defaultOpen = false,
  position = 'bottom-right',
  size = 'md',
}: FloatingPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4',
  };

  const sizeClasses = {
    sm: 'w-80 max-h-96',
    md: 'w-96 max-h-[28rem]',
    lg: 'w-[32rem] max-h-[36rem]',
  };

  if (!isOpen) {
    return (
      <div className={cn(
        'fixed z-50 transition-all duration-300',
        positionClasses[position],
        className
      )}>
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            'shadow-lg transform-gpu hover:scale-105 transition-all duration-200',
            premiumGlass.floating
          )}
        >
          {title}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed z-50 flex flex-col transition-all duration-300 motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:fade-in',
      positionClasses[position],
      sizeClasses[size],
      premiumGlass.floating,
      createInteractiveCard('floating', { ripple: 'subtle' }),
      'rounded-xl shadow-xl border',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default FloatingPanel;