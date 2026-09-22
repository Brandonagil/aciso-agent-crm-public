/**
 * Design Token System - TypeScript Definitions
 * Central source of truth for design system values
 */

// Status Colors
export const statusColors = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
} as const;

// CRM Business Colors
export const businessColors = {
  retention: 'var(--color-retention)',
  churn: 'var(--color-churn)',
  highRisk: 'var(--color-high-risk)',
  mediumRisk: 'var(--color-medium-risk)',
  lowRisk: 'var(--color-low-risk)',
} as const;

// Spacing System
export const spacing = {
  xs: 'var(--spacing-xs)',     // 4px
  sm: 'var(--spacing-sm)',     // 8px
  md: 'var(--spacing-md)',     // 16px
  lg: 'var(--spacing-lg)',     // 24px
  xl: 'var(--spacing-xl)',     // 32px
  '2xl': 'var(--spacing-2xl)', // 48px
  '3xl': 'var(--spacing-3xl)', // 64px
} as const;

// Typography Scale
export const typography = {
  size: {
    xs: 'var(--text-xs)',       // 12px
    sm: 'var(--text-sm)',       // 14px
    base: 'var(--text-base)',   // 16px
    lg: 'var(--text-lg)',       // 18px
    xl: 'var(--text-xl)',       // 20px
    '2xl': 'var(--text-2xl)',   // 24px
    '3xl': 'var(--text-3xl)',   // 30px
  },
  leading: {
    tight: 'var(--leading-tight)',
    normal: 'var(--leading-normal)',
    relaxed: 'var(--leading-relaxed)',
  },
} as const;

// Border Radius Scale
export const radius = {
  xs: 'var(--radius-xs)',       // 2px
  sm: 'var(--radius-sm)',       // 4px
  md: 'var(--radius-md)',       // 6px
  lg: 'var(--radius-lg)',       // 8px
  xl: 'var(--radius-xl)',       // 12px
  '2xl': 'var(--radius-2xl)',   // 16px
} as const;

// Shadows
export const shadows = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
} as const;

// Chart Color Palette - CRM Specific
export const chartColors = {
  // Risk levels
  critical: businessColors.highRisk,
  high: businessColors.mediumRisk,
  medium: statusColors.warning,
  low: businessColors.lowRisk,
  
  // Business metrics
  retention: businessColors.retention,
  churn: businessColors.churn,
  revenue: statusColors.info,
  
  // General chart colors (existing)
  chart1: 'var(--chart-1)',
  chart2: 'var(--chart-2)',
  chart3: 'var(--chart-3)',
  chart4: 'var(--chart-4)',
  chart5: 'var(--chart-5)',
} as const;

// Type definitions for better TypeScript support
export type StatusColor = keyof typeof statusColors;
export type BusinessColor = keyof typeof businessColors;
export type SpacingSize = keyof typeof spacing;
export type TypographySize = keyof typeof typography.size;
export type TypographyLeading = keyof typeof typography.leading;
export type RadiusSize = keyof typeof radius;
export type ShadowSize = keyof typeof shadows;
export type ChartColor = keyof typeof chartColors;

// Utility functions for dynamic token access
export const getStatusColor = (status: StatusColor) => statusColors[status];
export const getBusinessColor = (color: BusinessColor) => businessColors[color];
export const getSpacing = (size: SpacingSize) => spacing[size];
export const getTypographySize = (size: TypographySize) => typography.size[size];
export const getRadius = (size: RadiusSize) => radius[size];
export const getShadow = (size: ShadowSize) => shadows[size];
export const getChartColor = (color: ChartColor) => chartColors[color];

// Risk level color mapping utility
export const getRiskColor = (riskLevel: 'KRITISCH' | 'HOCH' | 'ERHÖHT' | 'MODERAT' | 'NIEDRIG') => {
  switch (riskLevel) {
    case 'KRITISCH':
      return businessColors.highRisk;
    case 'HOCH':
      return businessColors.highRisk;
    case 'ERHÖHT':
      return businessColors.mediumRisk;
    case 'MODERAT':
      return statusColors.warning;
    case 'NIEDRIG':
      return businessColors.lowRisk;
    default:
      return statusColors.info;
  }
};

// Status badge variant mapping
export const getStatusVariant = (status: 'success' | 'warning' | 'danger' | 'info') => {
  switch (status) {
    case 'success':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'danger':
      return 'destructive';
    case 'info':
      return 'outline';
    default:
      return 'outline';
  }
};

// Combined design token object for easy access
export const tokens = {
  colors: {
    status: statusColors,
    business: businessColors,
    chart: chartColors,
  },
  spacing,
  typography,
  radius,
  shadows,
} as const;

export default tokens;