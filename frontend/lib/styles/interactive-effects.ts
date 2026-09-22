/**
 * Interactive Effects System - 3D Transformations & Ripple Effects
 * Professional micro-interactions for 2025 business interfaces
 */

import { cn } from '@/lib/utils';

// 3D card transformation effects - subtle and professional
export const cardTransforms = {
  // Gentle 3D hover effect for KPI cards
  gentle: 'transform-gpu perspective-1000 hover:rotate-x-1 hover:rotate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out',
  
  // Elevated interaction for important elements
  elevated: 'transform-gpu perspective-1000 hover:rotate-x-2 hover:rotate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/10 transition-all duration-400 ease-out',
  
  // Floating effect for cards and panels
  floating: 'transform-gpu hover:translate-y-[-4px] hover:scale-[1.01] hover:shadow-xl hover:shadow-black/8 transition-all duration-250 ease-out',
  
  // Subtle tilt on hover for interactive elements
  tilt: 'transform-gpu perspective-1000 hover:rotate-3d-1 hover:scale-[1.005] transition-all duration-200 ease-out',
  
  // Professional depth effect
  depth: 'transform-gpu hover:translate-z-2 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 ease-out',
} as const;

// Ripple effect system for button interactions
export const rippleEffects = {
  // Subtle ripple for primary actions
  subtle: 'relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit] before:bg-white/20 before:scale-0 before:opacity-0 hover:before:scale-100 hover:before:opacity-100 before:transition-all before:duration-300 before:ease-out',
  
  // Professional ripple for business actions
  professional: 'relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-600 before:ease-out',
  
  // Elegant glow ripple for premium features
  glow: 'relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-radial before:from-white/15 before:to-transparent before:scale-0 before:opacity-0 hover:before:scale-150 hover:before:opacity-100 before:transition-all before:duration-500 before:ease-out',
  
  // Data-focused ripple for charts and tables
  data: 'relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit] before:bg-blue-500/10 before:scale-0 before:opacity-0 hover:before:scale-100 hover:before:opacity-100 before:transition-all before:duration-400 before:ease-out',
} as const;

// Physics-based animation effects
export const physicsEffects = {
  // Spring bounce for user feedback
  spring: 'transform-gpu active:scale-95 hover:scale-[1.02] transition-transform duration-150 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]',
  
  // Elastic response for interactive elements
  elastic: 'transform-gpu active:scale-98 hover:scale-[1.01] transition-transform duration-200 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]',
  
  // Smooth momentum for scrollable areas
  momentum: 'transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
  
  // Professional click feedback
  click: 'transform-gpu active:scale-[0.98] transition-transform duration-100 ease-out',
} as const;

// Advanced hover states for different element types
export const hoverStates = {
  // KPI card hover with professional enhancement
  kpiCard: cn(
    'group transition-all duration-300 ease-out',
    'hover:shadow-lg hover:shadow-black/5',
    'hover:border-primary/20',
    'hover:bg-gradient-to-br hover:from-white hover:to-gray-50/50',
    'dark:hover:from-gray-900 dark:hover:to-gray-950/50',
    'transform-gpu hover:translate-y-[-2px] hover:scale-[1.005]'
  ),
  
  // Interactive button with ripple and transform
  button: cn(
    'transition-all duration-200 ease-out',
    'hover:shadow-md hover:shadow-black/10',
    'active:scale-[0.98] active:shadow-sm',
    'transform-gpu'
  ),
  
  // Chart container with subtle enhancement
  chart: cn(
    'transition-all duration-300 ease-out',
    'hover:shadow-lg hover:shadow-black/8',
    'hover:border-border/50',
    'transform-gpu hover:translate-y-[-1px]'
  ),
  
  // Navigation item with smooth feedback
  nav: cn(
    'transition-all duration-200 ease-out',
    'hover:bg-muted/50',
    'hover:text-foreground',
    'transform-gpu'
  ),
  
  // Data row with professional highlighting
  dataRow: cn(
    'transition-all duration-150 ease-out',
    'hover:bg-muted/30',
    'hover:shadow-sm hover:shadow-black/5',
    'transform-gpu'
  ),
} as const;

// Sophisticated entrance animations
export const entranceAnimations = {
  // Fade in with subtle slide
  fadeSlide: 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-400 motion-safe:ease-out',
  
  // Professional scale in
  scale: 'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-safe:ease-out',
  
  // Elegant slide from left
  slideLeft: 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:duration-350 motion-safe:ease-out',
  
  // Smooth slide from right
  slideRight: 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-350 motion-safe:ease-out',
  
  // Staggered entrance for lists
  stagger: (index: number) => cn(
    'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300',
    `motion-safe:delay-[${index * 50}ms]`
  ),
} as const;

// Loading state animations
export const loadingAnimations = {
  // Elegant shimmer effect
  shimmer: cn(
    'relative overflow-hidden',
    'before:absolute before:inset-0',
    'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
    'before:translate-x-[-100%] before:animate-[shimmer_2s_ease-in-out_infinite]'
  ),
  
  // Professional pulse
  pulse: 'animate-pulse bg-muted/50 rounded-lg',
  
  // Skeleton loading with smooth waves
  skeleton: cn(
    'bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40',
    'bg-[length:200%_100%] animate-[wave_1.5s_ease-in-out_infinite]'
  ),
  
  // Spinning loader for data updates
  spin: 'animate-spin text-muted-foreground',
} as const;

// Interactive feedback for different interaction types
export const feedbackEffects = {
  // Success feedback with gentle bounce
  success: cn(
    'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200',
    'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    'text-green-800 dark:text-green-200'
  ),
  
  // Error feedback with subtle shake
  error: cn(
    'motion-safe:animate-in motion-safe:shake motion-safe:duration-300',
    'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    'text-red-800 dark:text-red-200'
  ),
  
  // Warning feedback with glow
  warning: cn(
    'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
    'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    'text-amber-800 dark:text-amber-200',
    'shadow-lg shadow-amber-500/10'
  ),
  
  // Info feedback with slide
  info: cn(
    'motion-safe:animate-in motion-safe:slide-in-from-right-2 motion-safe:duration-300',
    'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    'text-blue-800 dark:text-blue-200'
  ),
} as const;

// Utility functions for creating interactive components
export function createInteractiveCard(
  level: 'gentle' | 'elevated' | 'floating' = 'gentle',
  options?: {
    ripple?: keyof typeof rippleEffects;
    physics?: keyof typeof physicsEffects;
    className?: string;
  }
) {
  const transformClass = cardTransforms[level];
  const rippleClass = options?.ripple ? rippleEffects[options.ripple] : '';
  const physicsClass = options?.physics ? physicsEffects[options.physics] : '';
  
  return cn(transformClass, rippleClass, physicsClass, options?.className);
}

export function createInteractiveButton(
  options?: {
    ripple?: keyof typeof rippleEffects;
    physics?: keyof typeof physicsEffects;
    feedback?: keyof typeof feedbackEffects;
    className?: string;
  }
) {
  const hoverClass = hoverStates.button;
  const rippleClass = options?.ripple ? rippleEffects[options.ripple] : rippleEffects.professional;
  const physicsClass = options?.physics ? physicsEffects[options.physics] : physicsEffects.spring;
  const feedbackClass = options?.feedback ? feedbackEffects[options.feedback] : '';
  
  return cn(hoverClass, rippleClass, physicsClass, feedbackClass, options?.className);
}

export function createDataInteraction(
  type: 'chart' | 'table' | 'card' = 'card',
  options?: {
    hover?: boolean;
    entrance?: boolean;
    className?: string;
  }
) {
  const hoverClass = options?.hover !== false ? hoverStates[type === 'table' ? 'dataRow' : type === 'card' ? 'kpiCard' : type] : '';
  const entranceClass = options?.entrance !== false ? entranceAnimations.fadeSlide : '';
  
  return cn(hoverClass, entranceClass, options?.className);
}

// Professional focus states for accessibility
export const accessibilityStates = {
  focus: 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none transition-all duration-200',
  focusWithin: 'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all duration-200',
  reduced: 'motion-reduce:transform-none motion-reduce:hover:transform-none motion-reduce:transition-none',
} as const;

const interactiveEffects = {
  transforms: cardTransforms,
  ripples: rippleEffects,
  physics: physicsEffects,
  hovers: hoverStates,
  entrances: entranceAnimations,
  loading: loadingAnimations,
  feedback: feedbackEffects,
  accessibility: accessibilityStates,
  createCard: createInteractiveCard,
  createButton: createInteractiveButton,
  createData: createDataInteraction,
};

export default interactiveEffects;
