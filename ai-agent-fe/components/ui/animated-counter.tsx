'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  format?: 'number' | 'currency' | 'percentage';
  prefix?: string;
  suffix?: string;
  className?: string;
  triggerOnView?: boolean;
  easingFunction?: 'linear' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
}

// Easing functions for sophisticated animations
const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  elastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
};

export function AnimatedCounter({
  value,
  duration = 2000,
  decimals = 0,
  format = 'number',
  prefix = '',
  suffix = '',
  className,
  triggerOnView = true,
  easingFunction = 'easeOut',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | null>(null);

  // Intersection Observer for triggering animation on view
  useEffect(() => {
    if (!triggerOnView) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [triggerOnView]);

  // Animate counter when visible or value changes
  useEffect(() => {
    if (!isVisible) return;

    const startValue = currentValueRef.current;
    const endValue = value;
    const startTime = Date.now();

    const animateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply easing function
      const easedProgress = easingFunctions[easingFunction](progress);
      
      // Calculate current value
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      currentValueRef.current = currentValue;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateCounter);
      }
    };

    animationRef.current = requestAnimationFrame(animateCounter);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, easingFunction, isVisible]);

  // Format the display value
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val);
      
      case 'percentage':
        return new Intl.NumberFormat('de-DE', {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val / 100);
      
      default:
        return new Intl.NumberFormat('de-DE', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val);
    }
  };

  return (
    <span
      ref={counterRef}
      className={cn(
        'inline-block font-mono font-bold tabular-nums',
        'transition-all duration-300 ease-out',
        className
      )}
    >
      {prefix}
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
}

// Specialized counter components for different use cases
export function KpiCounter({
  value,
  label,
  trend,
  className,
  ...props
}: AnimatedCounterProps & {
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-foreground',
  };

  return (
    <div className={cn('space-y-1', className)}>
      <AnimatedCounter
        value={value}
        className={cn(
          'text-2xl lg:text-3xl font-bold',
          trend ? trendColors[trend] : 'text-foreground'
        )}
        {...props}
      />
      {label && (
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      )}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  className,
  ...props
}: AnimatedCounterProps & {
  title: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={cn(
      'p-6 rounded-xl border bg-card text-card-foreground',
      'hover:shadow-lg hover:shadow-black/5 transition-all duration-300',
      'transform-gpu hover:translate-y-[-2px]',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      </div>
      
      <div className="space-y-2">
        <AnimatedCounter
          value={value}
          className="text-2xl font-bold text-foreground"
          {...props}
        />
        
        {change !== undefined && (
          <div className="flex items-center gap-2">
            <AnimatedCounter
              value={change}
              format="percentage"
              decimals={1}
              className={cn(
                'text-sm font-medium',
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}
              easingFunction="easeInOut"
              duration={1500}
            />
            {changeLabel && (
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Progress counter with animated bar
export function ProgressCounter({
  value,
  max = 100,
  label,
  showPercentage = true,
  barClassName,
  className,
  ...props
}: AnimatedCounterProps & {
  max?: number;
  label?: string;
  showPercentage?: boolean;
  barClassName?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {showPercentage && (
            <AnimatedCounter
              value={percentage}
              format="percentage"
              decimals={1}
              className="text-sm font-medium text-muted-foreground"
              {...props}
            />
          )}
        </div>
      )}
      
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-full bg-primary rounded-full transition-all duration-1000 ease-out',
            barClassName
          )}
          style={{
            width: `${percentage}%`,
            transitionDelay: '200ms',
          }}
        />
      </div>
      
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <AnimatedCounter
          value={value}
          className="font-medium"
          {...props}
        />
        <span>{max.toLocaleString('de-DE')}</span>
      </div>
    </div>
  );
}

export default AnimatedCounter;