/**
 * Glass-morphism Design System
 * Advanced backdrop filter effects for premium visual hierarchy
 */

import { cn } from '@/lib/utils';

// Theme-aware glass-morphism base styles using CSS variables
export const glassVariants = {
  // Subtle glass for cards and containers - uses theme card color
  subtle: 'bg-card/80 backdrop-blur-sm border border-border/20 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // Medium glass for interactive elements - uses theme muted color
  medium: 'bg-muted/70 backdrop-blur-md border border-border/30 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // Strong glass for overlays and modals - uses theme background
  strong: 'bg-background/60 backdrop-blur-lg border border-border/40 shadow-xl shadow-black/10 dark:shadow-black/30',
  
  // Ultra glass for premium components - enhanced background opacity
  ultra: 'bg-background/50 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/15 dark:shadow-black/40',
  
  // Navigation glass for headers and sidebars
  nav: 'bg-card/90 backdrop-blur-md border-b border-border/20 shadow-sm shadow-black/5 dark:shadow-black/20',
  
  // Card glass with enhanced shadow - primary card style
  card: 'bg-card/85 backdrop-blur-sm border border-border/20 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // Interactive glass with hover effects
  interactive: 'bg-card/80 backdrop-blur-sm border border-border/20 hover:bg-card/90 hover:backdrop-blur-md transition-all duration-300 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // Floating glass for panels and overlays
  floating: 'bg-card/75 backdrop-blur-md border border-border/30 shadow-xl shadow-black/10 dark:shadow-black/30',
} as const;

// Risk-based glass effects for business context - theme aware
export const riskGlassVariants = {
  // Low risk - calm green tint with proper glassmorphism
  low: 'bg-green-50/80 dark:bg-green-950/20 backdrop-blur-sm border border-green-200/30 dark:border-green-800/30 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // Medium risk - warm amber tint with proper glassmorphism
  medium: 'bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-sm border border-amber-200/30 dark:border-amber-800/30 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // High risk - alert red tint with proper glassmorphism
  high: 'bg-red-50/80 dark:bg-red-950/20 backdrop-blur-sm border border-red-200/30 dark:border-red-800/30 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // Critical risk - intense red with enhanced glow
  critical: 'bg-red-50/90 dark:bg-red-950/30 backdrop-blur-md border border-red-300/40 dark:border-red-700/40 shadow-lg shadow-red-500/10 dark:shadow-red-500/20',
} as const;

// Premium glass utilities - theme aware
export const premiumGlass = {
  // Frosted glass with texture - uses theme background
  frosted: 'bg-background/60 backdrop-blur-xl backdrop-saturate-150 border border-border/40 shadow-xl shadow-black/10 dark:shadow-black/30',
  
  // Crystal clear with minimal tint - uses theme card
  crystal: 'bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg shadow-black/5 dark:shadow-black/20',
  
  // Smoky glass with deeper opacity - uses theme muted
  smoky: 'bg-muted/70 backdrop-blur-lg border border-border/30 shadow-xl shadow-black/10 dark:shadow-black/30',
  
  // Iridescent glass with subtle theme-aware gradient
  iridescent: 'bg-gradient-to-br from-card/80 via-muted/60 to-accent/60 backdrop-blur-md border border-border/30 shadow-xl shadow-black/10 dark:shadow-black/30',
} as const;

// Animation-enhanced glass
export const animatedGlass = {
  // Pulsing glass effect
  pulse: 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border border-white/20 dark:border-gray-800/30 animate-pulse',
  
  // Breathing glass effect
  breathe: 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border border-white/20 dark:border-gray-800/30 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000',
  
  // Floating glass with subtle movement
  float: 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border border-white/20 dark:border-gray-800/30 motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-700',
} as const;

// Glass component builder function
export function createGlassEffect(
  variant: keyof typeof glassVariants,
  options?: {
    animated?: boolean;
    risk?: keyof typeof riskGlassVariants;
    premium?: keyof typeof premiumGlass;
    hover?: boolean;
    className?: string;
  }
) {
  const baseClass = glassVariants[variant];
  const riskClass = options?.risk ? riskGlassVariants[options.risk] : '';
  const premiumClass = options?.premium ? premiumGlass[options.premium] : '';
  const hoverClass = options?.hover ? 'hover:backdrop-blur-lg hover:bg-white/90 dark:hover:bg-gray-950/90 transition-all duration-300' : '';
  const animatedClass = options?.animated ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500' : '';
  
  return cn(
    baseClass,
    riskClass,
    premiumClass,
    hoverClass,
    animatedClass,
    options?.className
  );
}

// Glass utility functions for creating styled components
export function createGlassCard(
  variant: keyof typeof glassVariants = 'card',
  options?: {
    hover?: boolean;
    animated?: boolean;
    className?: string;
  }
) {
  return createGlassEffect(variant, { hover: true, animated: true, ...options });
}

export function createGlassPanel(
  risk?: keyof typeof riskGlassVariants,
  options?: {
    hover?: boolean;
    animated?: boolean;
    className?: string;
  }
) {
  return createGlassEffect('floating', { risk, hover: true, animated: true, ...options });
}

export function createGlassOverlay(
  options?: {
    animated?: boolean;
    className?: string;
  }
) {
  return createGlassEffect('strong', { animated: true, ...options });
}

// Glass morphism utility types
export type GlassVariant = keyof typeof glassVariants;
export type RiskGlassVariant = keyof typeof riskGlassVariants;
export type PremiumGlassVariant = keyof typeof premiumGlass;

const glassMorphism = {
  variants: glassVariants,
  riskVariants: riskGlassVariants,
  premiumVariants: premiumGlass,
  animated: animatedGlass,
  createEffect: createGlassEffect,
  utilities: {
    createGlassCard,
    createGlassPanel,
    createGlassOverlay,
  },
};

export default glassMorphism;
