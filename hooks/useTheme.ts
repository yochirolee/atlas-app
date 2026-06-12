import { useAppStore } from '../stores/app-store';
import { DarkColors, LightColors, Spacing, Radius, Shadows, Fonts, AppColors } from '../constants/theme';

/**
 * useTheme — returns the active color palette based on the persisted isDarkMode setting.
 *
 * Usage (replaces static import):
 *   const { Colors } = useTheme();
 *
 * Non-color tokens (Spacing, Radius, Shadows) are theme-agnostic and re-exported here
 * for convenience so callers only need one import.
 */
export function useTheme() {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const Colors: AppColors = isDarkMode ? DarkColors : LightColors;
  return { Colors, Spacing, Radius, Shadows, Fonts, isDarkMode };
}

export type { AppColors };
