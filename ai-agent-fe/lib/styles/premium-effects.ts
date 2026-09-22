/**
 * Premium Effects System - 2025 Design Trends
 * Sophisticated, business-grade visual enhancements that inspire trust
 */

import { cn } from '@/lib/utils';

// Professional gradient system - subtle and sophisticated
export const premiumGradients = {
  // Trust-building blue gradients
  professional: {
    subtle: 'bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950',
    medium: 'bg-gradient-to-br from-blue-50 via-indigo-50/80 to-blue-50 dark:from-blue-950/40 dark:via-indigo-950/60 dark:to-blue-950/40',
    elevated: 'bg-gradient-to-br from-blue-100/60 via-indigo-100/40 to-blue-100/60 dark:from-blue-900/30 dark:via-indigo-900/40 dark:to-blue-900/30',
  },
  
  // Success metrics - sophisticated green
  success: {
    subtle: 'bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-green-950/15 dark:to-emerald-950/20',
    medium: 'bg-gradient-to-br from-emerald-50 via-green-50/80 to-emerald-50 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-emerald-950/40',
    elevated: 'bg-gradient-to-br from-emerald-100/40 via-green-100/60 to-emerald-100/40 dark:from-emerald-900/25 dark:via-green-900/35 dark:to-emerald-900/25',
  },
  
  // Warning states - refined orange
  warning: {
    subtle: 'bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-amber-950/20',
    medium: 'bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40',
    elevated: 'bg-gradient-to-br from-amber-100/40 via-orange-100/60 to-amber-100/40 dark:from-amber-900/25 dark:via-orange-900/35 dark:to-amber-900/25',
  },
  
  // Critical alerts - controlled red
  critical: {
    subtle: 'bg-gradient-to-br from-red-50/50 via-rose-50/30 to-red-50/50 dark:from-red-950/20 dark:via-rose-950/15 dark:to-red-950/20',
    medium: 'bg-gradient-to-br from-red-50 via-rose-50/80 to-red-50 dark:from-red-950/40 dark:via-rose-950/30 dark:to-red-950/40',
    elevated: 'bg-gradient-to-br from-red-100/40 via-rose-100/60 to-red-100/40 dark:from-red-900/25 dark:via-rose-900/35 dark:to-red-900/25',
  },
  
  // Premium features - sophisticated purple
  premium: {
    subtle: 'bg-gradient-to-br from-violet-50/50 via-purple-50/30 to-violet-50/50 dark:from-violet-950/20 dark:via-purple-950/15 dark:to-violet-950/20',
    medium: 'bg-gradient-to-br from-violet-50 via-purple-50/80 to-violet-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-violet-950/40',
    elevated: 'bg-gradient-to-br from-violet-100/40 via-purple-100/60 to-violet-100/40 dark:from-violet-900/25 dark:via-purple-900/35 dark:to-violet-900/25',
  }
} as const;

// Sophisticated glow effects - subtle and professional
export const premiumGlows = {
  // Minimal shadows for depth without distraction
  minimal: {
    professional: 'shadow-sm shadow-blue-500/5 dark:shadow-blue-400/10',
    success: 'shadow-sm shadow-emerald-500/5 dark:shadow-emerald-400/10',
    warning: 'shadow-sm shadow-amber-500/5 dark:shadow-amber-400/10',
    critical: 'shadow-sm shadow-red-500/5 dark:shadow-red-400/10',
    premium: 'shadow-sm shadow-violet-500/5 dark:shadow-violet-400/10',
  },
  
  // Elegant elevation for important elements
  elegant: {
    professional: 'shadow-md shadow-blue-500/8 dark:shadow-blue-400/15',
    success: 'shadow-md shadow-emerald-500/8 dark:shadow-emerald-400/15',
    warning: 'shadow-md shadow-amber-500/8 dark:shadow-amber-400/15',
    critical: 'shadow-md shadow-red-500/8 dark:shadow-red-400/15',
    premium: 'shadow-md shadow-violet-500/8 dark:shadow-violet-400/15',
  },
  
  // Refined emphasis for critical KPIs
  refined: {
    professional: 'shadow-lg shadow-blue-500/10 dark:shadow-blue-400/20',
    success: 'shadow-lg shadow-emerald-500/10 dark:shadow-emerald-400/20',
    warning: 'shadow-lg shadow-amber-500/10 dark:shadow-amber-400/20',
    critical: 'shadow-lg shadow-red-500/10 dark:shadow-red-400/20',
    premium: 'shadow-lg shadow-violet-500/10 dark:shadow-violet-400/20',
  }
} as const;

// Modern glass-morphism - sophisticated transparency
export const premiumGlass = {
  // Card containers with professional depth
  card: 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border border-white/20 dark:border-slate-800/30 supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-slate-950/75',
  
  // Interactive elements with subtle feedback
  interactive: 'bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border border-white/25 dark:border-slate-800/35 hover:bg-white/80 dark:hover:bg-slate-950/80 hover:backdrop-blur-lg transition-all duration-300',
  
  // Overlay panels for modals and tooltips
  overlay: 'bg-white/60 dark:bg-slate-950/60 backdrop-blur-lg border border-white/30 dark:border-slate-800/40 supports-[backdrop-filter]:bg-white/55 dark:supports-[backdrop-filter]:bg-slate-950/55',
  
  // Navigation elements with enhanced clarity
  navigation: 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-white/20 dark:border-slate-800/30 supports-[backdrop-filter]:bg-white/85 dark:supports-[backdrop-filter]:bg-slate-950/85',
  
  // Floating elements with premium depth
  floating: 'bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl border border-white/35 dark:border-slate-800/45 shadow-xl shadow-black/5 dark:shadow-black/20',
} as const;

// Professional animation timings - 2025 standards
export const premiumAnimations = {
  // Micro-interactions - immediate feedback
  micro: 'transition-all duration-200 ease-out',
  
  // Standard interactions - smooth and natural
  standard: 'transition-all duration-300 ease-out',
  
  // Page transitions - deliberate but not slow
  page: 'transition-all duration-400 ease-in-out',
  
  // Data updates - visible but not jarring
  data: 'transition-all duration-500 ease-in-out',
  
  // Gentle hover states
  hover: 'hover:scale-[1.01] hover:shadow-lg transition-all duration-200 ease-out',
  
  // Sophisticated entrance animations
  entrance: 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-400',
  
  // Professional stagger effect
  stagger: (index: number) => ({
    style: { animationDelay: `${index * 50}ms` },
    className: 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300'
  })
} as const;

// Business context color mapping
export const businessContexts = {
  churn: {
    low: { gradient: 'success', glow: 'success', priority: 'minimal' },
    medium: { gradient: 'warning', glow: 'warning', priority: 'elegant' },
    high: { gradient: 'critical', glow: 'critical', priority: 'refined' },
    critical: { gradient: 'critical', glow: 'critical', priority: 'refined' },
  },
  
  performance: {
    excellent: { gradient: 'success', glow: 'success', priority: 'elegant' },
    good: { gradient: 'professional', glow: 'professional', priority: 'minimal' },
    average: { gradient: 'warning', glow: 'warning', priority: 'minimal' },
    poor: { gradient: 'critical', glow: 'critical', priority: 'elegant' },
  },
  
  revenue: {
    growth: { gradient: 'success', glow: 'success', priority: 'elegant' },
    stable: { gradient: 'professional', glow: 'professional', priority: 'minimal' },
    decline: { gradient: 'warning', glow: 'warning', priority: 'elegant' },
    loss: { gradient: 'critical', glow: 'critical', priority: 'refined' },
  }
} as const;

// Utility functions for sophisticated styling
export function createPremiumCard(
  context: 'churn' | 'performance' | 'revenue',
  level: string,
  intensity: 'subtle' | 'medium' | 'elevated' = 'subtle',
  options?: {
    glass?: boolean;
    animated?: boolean;
    className?: string;
  }
) {
  const businessContext: Partial<Record<string, {
    gradient: keyof typeof premiumGradients;
    glow: keyof typeof premiumGlows.minimal;
    priority: keyof typeof premiumGlows;
  }>> = businessContexts[context];
  const levelConfig = businessContext[level];
  
  if (!levelConfig) {
    // Fallback to professional styling
    const gradientClass = premiumGradients.professional[intensity];
    const glowClass = premiumGlows.minimal.professional;
    const glassClass = options?.glass ? premiumGlass.card : '';
    const animationClass = options?.animated ? premiumAnimations.entrance : '';
    
    return cn(gradientClass, glowClass, glassClass, animationClass, options?.className);
  }
  
  const gradientClass = premiumGradients[levelConfig.gradient][intensity];
  const glowClass = premiumGlows[levelConfig.priority][levelConfig.glow];
  const glassClass = options?.glass ? premiumGlass.card : '';
  const animationClass = options?.animated ? premiumAnimations.entrance : '';
  
  return cn(gradientClass, glowClass, glassClass, animationClass, options?.className);
}

export function createPremiumInteraction(
  element: 'card' | 'button' | 'panel' = 'card',
  options?: {
    hover?: boolean;
    focus?: boolean;
    className?: string;
  }
) {
  // All supported elements currently share the same interaction effects.
  void element;
  const baseAnimation = premiumAnimations.standard;
  const hoverEffect = options?.hover ? premiumAnimations.hover : '';
  const focusEffect = options?.focus ? 'focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2' : '';
  
  return cn(baseAnimation, hoverEffect, focusEffect, options?.className);
}

// Professional data visualization enhancements
export const dataVisualization = {
  // Chart container with sophisticated depth
  chartContainer: cn(
    premiumGlass.card,
    premiumGlows.elegant.professional,
    premiumAnimations.standard,
    'rounded-xl p-6'
  ),
  
  // KPI cards with business context awareness
  kpiCard: (value: number, threshold: { good: number; warning: number }) => {
    let context: 'success' | 'warning' | 'critical' = 'success';
    
    if (value <= threshold.warning) {
      context = 'critical';
    } else if (value <= threshold.good) {
      context = 'warning';
    }
    
    return cn(
      premiumGradients[context].subtle,
      premiumGlows.elegant[context],
      premiumGlass.card,
      premiumAnimations.entrance,
      'rounded-xl transition-all duration-300 hover:scale-[1.01]'
    );
  },
  
  // Data table with professional styling
  dataTable: cn(
    premiumGlass.card,
    premiumGlows.minimal.professional,
    'rounded-lg overflow-hidden'
  )
} as const;

const premiumEffects = {
  gradients: premiumGradients,
  glows: premiumGlows,
  glass: premiumGlass,
  animations: premiumAnimations,
  contexts: businessContexts,
  createCard: createPremiumCard,
  createInteraction: createPremiumInteraction,
  dataViz: dataVisualization,
};

export default premiumEffects;
