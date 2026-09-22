/**
 * Advanced Gradient and Glow Effects System
 * Risk-based color gradients and premium glow effects for business intelligence
 */

import { cn } from '@/lib/utils';

// Risk-based gradient backgrounds
export const riskGradients = {
  // Low risk - calming green gradients
  low: {
    subtle: 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30',
    medium: 'bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-green-950/50 dark:via-emerald-950/40 dark:to-teal-950/50',
    strong: 'bg-gradient-to-br from-green-200 via-emerald-200 to-teal-200 dark:from-green-900/60 dark:via-emerald-900/50 dark:to-teal-900/60',
  },
  
  // Medium risk - attention-getting amber/orange gradients  
  medium: {
    subtle: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30',
    medium: 'bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-yellow-950/50',
    strong: 'bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 dark:from-amber-900/60 dark:via-orange-900/50 dark:to-yellow-900/60',
  },
  
  // High risk - urgent red gradients
  high: {
    subtle: 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-red-950/30 dark:via-rose-950/20 dark:to-pink-950/30',
    medium: 'bg-gradient-to-br from-red-100 via-rose-100 to-pink-100 dark:from-red-950/50 dark:via-rose-950/40 dark:to-pink-950/50',
    strong: 'bg-gradient-to-br from-red-200 via-rose-200 to-pink-200 dark:from-red-900/60 dark:via-rose-900/50 dark:to-pink-900/60',
  },
  
  // Critical risk - intense warning gradients
  critical: {
    subtle: 'bg-gradient-to-br from-red-100 via-red-200 to-red-100 dark:from-red-950/50 dark:via-red-900/60 dark:to-red-950/50',
    medium: 'bg-gradient-to-br from-red-200 via-red-300 to-red-200 dark:from-red-900/70 dark:via-red-800/80 dark:to-red-900/70',
    strong: 'bg-gradient-to-br from-red-300 via-red-400 to-red-300 dark:from-red-800/80 dark:via-red-700/90 dark:to-red-800/80',
  },
  
  // Neutral/info - professional blue gradients
  neutral: {
    subtle: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30',
    medium: 'bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-950/50 dark:via-indigo-950/40 dark:to-purple-950/50',
    strong: 'bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 dark:from-blue-900/60 dark:via-indigo-900/50 dark:to-purple-900/60',
  }
} as const;

// Premium business gradients
export const businessGradients = {
  // Revenue/success gradients
  success: {
    subtle: 'bg-gradient-to-br from-emerald-50 via-green-100 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/40 dark:to-teal-950/30',
    glow: 'bg-gradient-to-br from-emerald-100 via-green-200 to-teal-100 dark:from-emerald-900/60 dark:via-green-900/70 dark:to-teal-900/60',
  },
  
  // Performance/metrics gradients
  performance: {
    subtle: 'bg-gradient-to-br from-violet-50 via-purple-100 to-fuchsia-50 dark:from-violet-950/30 dark:via-purple-950/40 dark:to-fuchsia-950/30',
    glow: 'bg-gradient-to-br from-violet-100 via-purple-200 to-fuchsia-100 dark:from-violet-900/60 dark:via-purple-900/70 dark:to-fuchsia-900/60',
  },
  
  // Analytics/data gradients  
  analytics: {
    subtle: 'bg-gradient-to-br from-cyan-50 via-blue-100 to-indigo-50 dark:from-cyan-950/30 dark:via-blue-950/40 dark:to-indigo-950/30',
    glow: 'bg-gradient-to-br from-cyan-100 via-blue-200 to-indigo-100 dark:from-cyan-900/60 dark:via-blue-900/70 dark:to-indigo-900/60',
  },
  
  // Premium/luxury gradients
  premium: {
    subtle: 'bg-gradient-to-br from-amber-50 via-yellow-100 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/40 dark:to-orange-950/30',
    glow: 'bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-100 dark:from-amber-900/60 dark:via-yellow-900/70 dark:to-orange-900/60',
  }
} as const;

// Glow effect styles
export const glowEffects = {
  // Subtle glows for cards
  subtle: {
    low: 'shadow-lg shadow-green-500/10 dark:shadow-green-400/20',
    medium: 'shadow-lg shadow-amber-500/10 dark:shadow-amber-400/20', 
    high: 'shadow-lg shadow-red-500/10 dark:shadow-red-400/20',
    critical: 'shadow-xl shadow-red-500/20 dark:shadow-red-400/30',
    neutral: 'shadow-lg shadow-blue-500/10 dark:shadow-blue-400/20',
  },
  
  // Strong glows for emphasis
  strong: {
    low: 'shadow-xl shadow-green-500/20 dark:shadow-green-400/30',
    medium: 'shadow-xl shadow-amber-500/20 dark:shadow-amber-400/30',
    high: 'shadow-xl shadow-red-500/20 dark:shadow-red-400/30',
    critical: 'shadow-2xl shadow-red-500/30 dark:shadow-red-400/40',
    neutral: 'shadow-xl shadow-blue-500/20 dark:shadow-blue-400/30',
  },
  
  // Intense glows for critical states
  intense: {
    low: 'shadow-2xl shadow-green-500/30 dark:shadow-green-400/40',
    medium: 'shadow-2xl shadow-amber-500/30 dark:shadow-amber-400/40',
    high: 'shadow-2xl shadow-red-500/30 dark:shadow-red-400/40',
    critical: 'shadow-2xl shadow-red-500/40 dark:shadow-red-400/50 drop-shadow-2xl',
    neutral: 'shadow-2xl shadow-blue-500/30 dark:shadow-blue-400/40',
  },
  
  // Pulsing glows for alerts
  pulse: {
    low: 'shadow-lg shadow-green-500/20 dark:shadow-green-400/30 animate-pulse',
    medium: 'shadow-lg shadow-amber-500/20 dark:shadow-amber-400/30 animate-pulse',
    high: 'shadow-lg shadow-red-500/20 dark:shadow-red-400/30 animate-pulse',
    critical: 'shadow-xl shadow-red-500/30 dark:shadow-red-400/40 animate-pulse',
    neutral: 'shadow-lg shadow-blue-500/20 dark:shadow-blue-400/30 animate-pulse',
  }
} as const;

// Animated gradient effects
export const animatedGradients = {
  // Gentle shimmer effect
  shimmer: 'bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]',
  
  // Flowing gradient
  flow: 'bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 dark:from-blue-600/10 dark:via-purple-600/10 dark:to-pink-600/10 bg-[length:200%_100%] animate-[flow_3s_ease-in-out_infinite]',
  
  // Breathing effect
  breathe: 'bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 animate-[breathe_3s_ease-in-out_infinite]',
} as const;

// Border gradients for premium look
export const borderGradients = {
  // Risk-based borders
  risk: {
    low: 'border-2 border-transparent bg-gradient-to-r from-green-200 via-emerald-300 to-teal-200 dark:from-green-800 dark:via-emerald-700 dark:to-teal-800 bg-clip-border',
    medium: 'border-2 border-transparent bg-gradient-to-r from-amber-200 via-orange-300 to-yellow-200 dark:from-amber-800 dark:via-orange-700 dark:to-yellow-800 bg-clip-border',
    high: 'border-2 border-transparent bg-gradient-to-r from-red-200 via-rose-300 to-pink-200 dark:from-red-800 dark:via-rose-700 dark:to-pink-800 bg-clip-border',
    critical: 'border-2 border-transparent bg-gradient-to-r from-red-300 via-red-400 to-red-300 dark:from-red-700 dark:via-red-600 dark:to-red-700 bg-clip-border',
  },
  
  // Premium borders
  premium: {
    gold: 'border-2 border-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 dark:from-amber-700 dark:via-yellow-600 dark:to-amber-700 bg-clip-border',
    silver: 'border-2 border-transparent bg-gradient-to-r from-gray-300 via-slate-400 to-gray-300 dark:from-gray-600 dark:via-slate-500 dark:to-gray-600 bg-clip-border',
    rainbow: 'border-2 border-transparent bg-gradient-to-r from-violet-300 via-pink-300 via-red-300 via-orange-300 to-yellow-300 dark:from-violet-600 dark:via-pink-600 dark:via-red-600 dark:via-orange-600 dark:to-yellow-600 bg-clip-border',
  }
} as const;

// Utility functions for dynamic gradient generation
export function createRiskGradient(
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'neutral',
  intensity: 'subtle' | 'medium' | 'strong' = 'subtle',
  options?: {
    glow?: 'subtle' | 'strong' | 'intense' | 'pulse';
    animated?: boolean;
    className?: string;
  }
) {
  const gradientClass = riskGradients[riskLevel][intensity];
  const glowClass = options?.glow ? glowEffects[options.glow][riskLevel] : '';
  const animatedClass = options?.animated ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500' : '';
  
  return cn(gradientClass, glowClass, animatedClass, options?.className);
}

export function createBusinessGradient(
  type: 'success' | 'performance' | 'analytics' | 'premium',
  variant: 'subtle' | 'glow' = 'subtle',
  options?: {
    glow?: 'subtle' | 'strong' | 'intense';
    animated?: boolean;
    className?: string;
  }
) {
  const gradientClass = businessGradients[type][variant];
  const glowClass = options?.glow ? glowEffects[options.glow].neutral : '';
  const animatedClass = options?.animated ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500' : '';
  
  return cn(gradientClass, glowClass, animatedClass, options?.className);
}

// Risk-aware KPI card styling
export function createKpiCardStyle(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  value: number,
  threshold?: { warning: number; critical: number }
) {
  // Determine intensity based on risk level and value
  let intensity: 'subtle' | 'medium' | 'strong' = 'subtle';
  let glow: 'subtle' | 'strong' | 'intense' | 'pulse' = 'subtle';
  
  if (riskLevel === 'critical' || (threshold && value >= threshold.critical)) {
    intensity = 'strong';
    glow = 'pulse';
  } else if (riskLevel === 'high' || (threshold && value >= threshold.warning)) {
    intensity = 'medium';
    glow = 'strong';
  }
  
  return createRiskGradient(riskLevel, intensity, { 
    glow, 
    animated: true,
    className: 'transition-all duration-300 hover:scale-[1.02]'
  });
}

const gradientEffects = {
  risk: riskGradients,
  business: businessGradients,
  glow: glowEffects,
  animated: animatedGradients,
  borders: borderGradients,
  createRiskGradient,
  createBusinessGradient,
  createKpiCardStyle,
};

export default gradientEffects;
