/**
 * ATLAS Design System — Dual Theme
 * DarkColors: dark navy theme (default)
 * LightColors: clean light blue-gray theme
 */

// ─── Dark Theme ──────────────────────────────────────────────────────────────
export const DarkColors = {
  // Core surfaces (layered dark)
  bg: '#0D0F14',
  surface: '#161920',
  card: '#1E2230',
  cardBorder: '#2A2F42',
  elevated: '#252B3B',

  // Primary brand — vivid blue CTA
  primary: '#2563EB',
  primaryText: '#FFFFFF',

  // Interactive states
  chipBg: '#252B3B',
  hoverGray: '#2A2F42',
  hoverLight: '#1E2230',

  // Semantic status colors
  green: '#22C55E',
  greenDim: 'rgba(34,197,94,0.15)',
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.15)',
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.15)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.15)',

  // Text hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A8C0',
  textMuted: '#5A6380',

  // Tab bar
  tabBar: '#161920',
  tabBarBorder: '#2A2F42',

  // Shadows
  shadowColor: 'rgba(0,0,0,0.40)',

  // Legacy aliases
  cyan: '#2563EB',
  cyanLight: '#3B7FFF',
  cyanDim: 'rgba(37,99,235,0.12)',
  cyanBorder: 'rgba(37,99,235,0.25)',
};

// ─── Light Theme ─────────────────────────────────────────────────────────────
export const LightColors = {
  // Core surfaces
  bg: '#F0F4FF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  elevated: '#F8FAFC',

  // Primary brand — same vivid blue
  primary: '#2563EB',
  primaryText: '#FFFFFF',

  // Interactive states
  chipBg: '#EEF2FF',
  hoverGray: '#E2E8F0',
  hoverLight: '#F8FAFC',

  // Semantic status colors
  green: '#16A34A',
  greenDim: 'rgba(22,163,74,0.10)',
  amber: '#D97706',
  amberDim: 'rgba(217,119,6,0.10)',
  red: '#DC2626',
  redDim: 'rgba(220,38,38,0.10)',
  purple: '#7C3AED',
  purpleDim: 'rgba(124,58,237,0.10)',

  // Text hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',

  // Shadows
  shadowColor: 'rgba(0,0,0,0.08)',

  // Legacy aliases
  cyan: '#2563EB',
  cyanLight: '#3B7FFF',
  cyanDim: 'rgba(37,99,235,0.08)',
  cyanBorder: 'rgba(37,99,235,0.20)',
};

// Default static export for files that haven't migrated to useTheme() yet
export const Colors = DarkColors;

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

export type AppColors = typeof DarkColors;
