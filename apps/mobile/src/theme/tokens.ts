/**
 * IITJ1 design tokens — sourced from docs/FinalDoc/Designplan_Final.md
 * Never hardcode hex in screens; import from here.
 */

export const AppColors = {
  jodhpurIndigo: '#1D3F5E',
  mehrangarhSandstone: '#C68642',
  tharDusk: '#E2703A',
  desertSand: '#F6F0E4',
  inkSlate: '#22292F',
  sageWell: '#6E8B74',
  indigoLight: '#3E6488',
  indigoTint: '#E8EDF2',
  sandstoneTint: '#F7EDE0',
  duskTint: '#FCE9E0',
  sageTint: '#EAF1EC',
  borderNeutral: '#DCD4C4',
  mutedText: '#5C6570',
  nonVegRed: '#B23A34',
  white: '#FFFFFF',
  // Dark mode
  indigoNight: '#0F1B2B',
  surfaceNight: '#182A3D',
  surfaceNightRaised: '#213851',
  textPrimaryDark: '#F2EEE4',
  textMutedDark: '#9BA8B5',
  sandstoneDark: '#D9A05F',
  duskDark: '#F0895A',
  sageDark: '#8CB093',
} as const;

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const AppRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const AppTypography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '600' as const },
  h1: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '500' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  button: { fontSize: 15, fontWeight: '500' as const, letterSpacing: 0.2 },
  dataMono: { fontSize: 16, lineHeight: 22, fontWeight: '500' as const },
  dataLargeMono: { fontSize: 24, lineHeight: 30, fontWeight: '500' as const },
} as const;

export const CategoryColors = {
  mess: AppColors.mehrangarhSandstone,
  transport: AppColors.jodhpurIndigo,
  institute: AppColors.indigoLight,
  orientation: AppColors.sageWell,
  general: AppColors.mutedText,
} as const;

export type ColorScheme = 'light' | 'dark';

export function getThemeColors(scheme: ColorScheme) {
  if (scheme === 'dark') {
    return {
      background: AppColors.indigoNight,
      surface: AppColors.surfaceNight,
      surfaceRaised: AppColors.surfaceNightRaised,
      text: AppColors.textPrimaryDark,
      textMuted: AppColors.textMutedDark,
      border: AppColors.surfaceNightRaised,
      primary: AppColors.jodhpurIndigo,
      accent: AppColors.duskDark,
      tabBar: AppColors.surfaceNight,
      tabActive: AppColors.textPrimaryDark,
      tabInactive: AppColors.textMutedDark,
    };
  }

  return {
    background: AppColors.desertSand,
    surface: AppColors.white,
    surfaceRaised: AppColors.white,
    text: AppColors.inkSlate,
    textMuted: AppColors.mutedText,
    border: AppColors.borderNeutral,
    primary: AppColors.jodhpurIndigo,
    accent: AppColors.tharDusk,
    tabBar: AppColors.white,
    tabActive: AppColors.jodhpurIndigo,
    tabInactive: AppColors.mutedText,
  };
}
