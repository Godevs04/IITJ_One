/**
 * IITJ One design tokens — sourced from Stitch / Designplan_Final.md
 * Never hardcode hex in screens; use useThemeColors() or getThemeColors().
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
  indigoNight: '#0F1B2B',
  surfaceNight: '#182A3D',
  surfaceNightRaised: '#213851',
  textPrimaryDark: '#F2EEE4',
  textMutedDark: '#9BA8B5',
  sandstoneDark: '#D9A05F',
  duskDark: '#F0895A',
  sageDark: '#8CB093',
  stitchPrimary: '#002947',
  stitchSecondary: '#885210',
  stitchBackground: '#FAF9FC',
  stitchOnSurface: '#1A1C1E',
  errorContainer: '#FFDAD6',
  errorContainerDark: '#442726',
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
  xl: 20,
  full: 999,
} as const;

export const AppTypography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600' as const,
    fontFamily: 'IBMPlexSans_600SemiBold',
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    fontFamily: 'IBMPlexSans_600SemiBold',
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500' as const,
    fontFamily: 'IBMPlexSans_500Medium',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
    fontFamily: 'IBMPlexSans_400Regular',
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    fontFamily: 'IBMPlexSans_400Regular',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    fontFamily: 'IBMPlexSans_400Regular',
  },
  button: {
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    fontFamily: 'IBMPlexSans_500Medium',
  },
  dataMono: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
    fontFamily: 'IBMPlexSans_500Medium',
  },
  dataLargeMono: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '500' as const,
    fontFamily: 'IBMPlexSans_500Medium',
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    fontFamily: 'IBMPlexSans_500Medium',
  },
} as const;

export const CategoryColors = {
  mess: AppColors.mehrangarhSandstone,
  transport: AppColors.jodhpurIndigo,
  institute: AppColors.indigoLight,
  orientation: AppColors.sageWell,
  general: AppColors.mutedText,
} as const;

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  accent: string;
  primaryTint: string;
  secondary: string;
  secondaryTint: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  headerBackground: string;
  headerTint: string;
  inputBackground: string;
  chipBackground: string;
  chipActiveBackground: string;
  chipActiveText: string;
  chipText: string;
  iconMuted: string;
  quickAccessProminentBg: string;
  quickAccessProminentIcon: string;
  quickAccessBg: string;
  quickAccessBorder: string;
  quickAccessIcon: string;
  importantCardBg: string;
  importantCardBorder: string;
  noteCardBg: string;
  error: string;
  errorTint: string;
  veg: string;
  vegTint: string;
  nonVeg: string;
  countdown: string;
  countdownUrgent: string;
}

export function getThemeColors(scheme: ColorScheme): ThemeColors {
  if (scheme === 'dark') {
    return {
      background: AppColors.indigoNight,
      surface: AppColors.surfaceNight,
      surfaceRaised: AppColors.surfaceNightRaised,
      surfaceMuted: AppColors.surfaceNight,
      text: AppColors.textPrimaryDark,
      textMuted: AppColors.textMutedDark,
      border: AppColors.surfaceNightRaised,
      primary: AppColors.jodhpurIndigo,
      onPrimary: AppColors.desertSand,
      accent: AppColors.duskDark,
      primaryTint: AppColors.surfaceNightRaised,
      secondary: AppColors.sandstoneDark,
      secondaryTint: '#3D2A14',
      tabBar: AppColors.surfaceNight,
      tabActive: AppColors.textPrimaryDark,
      tabInactive: AppColors.textMutedDark,
      headerBackground: AppColors.surfaceNight,
      headerTint: AppColors.textPrimaryDark,
      inputBackground: AppColors.surfaceNightRaised,
      chipBackground: AppColors.surfaceNightRaised,
      chipActiveBackground: AppColors.jodhpurIndigo,
      chipActiveText: AppColors.desertSand,
      chipText: AppColors.textMutedDark,
      iconMuted: AppColors.textMutedDark,
      quickAccessProminentBg: AppColors.jodhpurIndigo,
      quickAccessProminentIcon: AppColors.desertSand,
      quickAccessBg: AppColors.surfaceNightRaised,
      quickAccessBorder: AppColors.surfaceNightRaised,
      quickAccessIcon: AppColors.sandstoneDark,
      importantCardBg: '#2A1F18',
      importantCardBorder: AppColors.duskDark,
      noteCardBg: AppColors.surfaceNightRaised,
      error: AppColors.nonVegRed,
      errorTint: AppColors.errorContainerDark,
      veg: AppColors.sageDark,
      vegTint: '#1E2A22',
      nonVeg: '#E07A75',
      countdown: AppColors.textPrimaryDark,
      countdownUrgent: AppColors.duskDark,
    };
  }

  return {
    background: AppColors.desertSand,
    surface: AppColors.white,
    surfaceRaised: AppColors.white,
    surfaceMuted: AppColors.stitchBackground,
    text: AppColors.inkSlate,
    textMuted: AppColors.mutedText,
    border: AppColors.borderNeutral,
    primary: AppColors.stitchPrimary,
    onPrimary: AppColors.white,
    accent: AppColors.tharDusk,
    primaryTint: AppColors.indigoTint,
    secondary: AppColors.stitchSecondary,
    secondaryTint: AppColors.sandstoneTint,
    tabBar: AppColors.white,
    tabActive: AppColors.stitchPrimary,
    tabInactive: AppColors.mutedText,
    headerBackground: AppColors.stitchPrimary,
    headerTint: AppColors.white,
    inputBackground: AppColors.white,
    chipBackground: AppColors.white,
    chipActiveBackground: AppColors.indigoTint,
    chipActiveText: AppColors.stitchPrimary,
    chipText: AppColors.mutedText,
    iconMuted: AppColors.mutedText,
    quickAccessProminentBg: AppColors.stitchPrimary,
    quickAccessProminentIcon: AppColors.white,
    quickAccessBg: AppColors.white,
    quickAccessBorder: AppColors.borderNeutral,
    quickAccessIcon: AppColors.stitchPrimary,
    importantCardBg: AppColors.duskTint,
    importantCardBorder: AppColors.tharDusk,
    noteCardBg: AppColors.desertSand,
    error: AppColors.nonVegRed,
    errorTint: AppColors.errorContainer,
    veg: AppColors.sageWell,
    vegTint: AppColors.sageTint,
    nonVeg: AppColors.nonVegRed,
    countdown: AppColors.inkSlate,
    countdownUrgent: AppColors.tharDusk,
  };
}
