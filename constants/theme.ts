/**
 * Uber-inspired Design System
 * Static theme constants
 */

export const Colors = {
  // Core surfaces
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#EFEFEF',
  elevated: '#F3F3F3',

  // Primary brand
  primary: '#000000',       // Uber Black
  primaryText: '#FFFFFF',   // Text on primary surfaces

  // Interactive states
  chipBg: '#EFEFEF',
  hoverGray: '#E2E2E2',
  hoverLight: '#F3F3F3',

  // Semantic status colors
  green: '#10B981',
  greenDim: 'rgba(16,185,129,0.10)',
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.10)',
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.10)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.10)',

  // Text hierarchy
  textPrimary: '#000000',
  textSecondary: '#4B4B4B',
  textMuted: '#AFAFAF',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#EFEFEF',

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.12)',

  // Legacy aliases
  cyan: '#000000',
  cyanLight: '#333333',
  cyanDim: 'rgba(0, 0, 0, 0.06)',
  cyanBorder: 'rgba(0, 0, 0, 0.12)',
};

export const Fonts = {
  heading: 'System',
  body: 'System',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};
