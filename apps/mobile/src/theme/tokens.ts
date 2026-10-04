import { Platform } from 'react-native';

/**
 * IITJ One design tokens.
 * Never hardcode hex in screens; use useThemeColors() or getThemeColors().
 *
 * IITJ One redesign palette (light):
 *   background #F5F7FB · layer/card #FFFFFF · text #01050D · primary #3DA9D8 · secondary #F1FF0A
 * Dark mode uses the same two accents on a matching dark base. Additional colours are limited to
 * accessibility (readable variants of the accents), status (veg/non-veg, warnings, errors) and disabled states.
 */

export const RedesignColors = {
  background: '#F5F7FB',
  layer: '#FFFFFF',
  text: '#01050D',
  primary: '#3DA9D8',
  secondary: '#F1FF0A',
  /** #3DA9D8 is too light for text on white (2.6:1); this darker shade of it reaches ~4.6:1. */
  primaryText: '#1A78A3',
  textMuted: '#566173',
  border: '#E1E6EF',
  primaryTint: '#E2F2FA',
  /** Readable text/icon variant of the yellow secondary on light surfaces. */
  secondaryText: '#6B6A00',
  secondaryTint: '#FBFFD6',
  darkBackground: '#0A0F18',
  darkLayer: '#141B26',
  darkLayerRaised: '#1C2533',
  darkText: '#F5F7FB',
  darkTextMuted: '#9DA7B6',
  darkBorder: '#263142',
  darkPrimaryText: '#6CC3EA',
  darkPrimaryTint: '#11303F',
  darkSecondaryTint: '#2A2D06',
} as const;

/**
 * Helvetica Neue where the platform ships it (iOS). Android has no Helvetica Neue, so it uses the
 * platform sans-serif (Roboto) rather than bundling another font family.
 */
export const AppFontFamily: string | undefined = Platform.select({
  ios: 'Helvetica Neue',
  default: undefined,
});

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
  indigoGlow: '#7BA7D9',
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

/**
 * Type scale (redesign spec): Big heading 24 · Section heading 20 · Body header 16 · Body 16 ·
 * Secondary body 12 · Small body 10.
 */
export const AppTypography = {
  /** Big heading */
  display: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    fontFamily: AppFontFamily,
  },
  /** Big heading (screen titles) */
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    fontFamily: AppFontFamily,
  },
  /** Section heading */
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    fontFamily: AppFontFamily,
  },
  /** Body text header */
  bodyHeader: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    fontFamily: AppFontFamily,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
    fontFamily: AppFontFamily,
  },
  /** Secondary body text */
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    fontFamily: AppFontFamily,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    fontFamily: AppFontFamily,
  },
  /** Small body text */
  small: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400' as const,
    fontFamily: AppFontFamily,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
    fontFamily: AppFontFamily,
  },
  dataMono: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    fontFamily: AppFontFamily,
  },
  dataLargeMono: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600' as const,
    fontFamily: AppFontFamily,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    fontFamily: AppFontFamily,
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
  /**
   * Same brand accent as `primary`, but guaranteed readable as bare text/icon color
   * directly on the screen background — `primary` itself is also used as a *button*
   * background (paired with `onPrimary` text), so in dark mode it's a dark navy that
   * looks fine filled but is nearly invisible (WCAG contrast ~1.1–1.6) as foreground
   * text against the same dark surfaces. Use this for any Text/Icon `color:` that
   * isn't paired with its own `primary`-colored background.
   */
  linkText: string;
  accent: string;
  primaryTint: string;
  secondary: string;
  secondaryTint: string;
  tabBar: string;
  tabActive: string;
  /** Pill behind the focused tab icon. */
  tabActiveBackground: string;
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
  /** Text/icon colour on a solid `veg` or `nonVeg` fill. */
  onDiet: string;
  countdown: string;
  countdownUrgent: string;
  /** Secondary-accent fill (#F1FF0A) that marks "now": the current meal, the next bus. */
  highlight: string;
  /** Text/icon colour on a `highlight` fill. */
  onHighlight: string;
}

export function getThemeColors(scheme: ColorScheme): ThemeColors {
  const R = RedesignColors;
  if (scheme === 'dark') {
    return {
      background: R.darkBackground,
      surface: R.darkLayer,
      surfaceRaised: R.darkLayerRaised,
      // Insets inside cards (meal tabs, "no more buses") need to separate from the card layer.
      surfaceMuted: R.darkLayerRaised,
      text: R.darkText,
      textMuted: R.darkTextMuted,
      border: R.darkBorder,
      // #3DA9D8 is light enough to stay a fill in dark mode, with near-black text on it.
      primary: R.primary,
      onPrimary: R.text,
      linkText: R.darkPrimaryText,
      accent: R.darkPrimaryText,
      primaryTint: R.darkPrimaryTint,
      // On dark surfaces the yellow secondary is readable as text/icons directly.
      secondary: R.secondary,
      secondaryTint: R.darkSecondaryTint,
      tabBar: R.darkLayer,
      tabActive: R.darkPrimaryText,
      tabActiveBackground: R.darkPrimaryTint,
      tabInactive: R.darkTextMuted,
      headerBackground: R.darkBackground,
      headerTint: R.darkText,
      inputBackground: R.darkLayerRaised,
      chipBackground: R.darkLayerRaised,
      chipActiveBackground: R.primary,
      chipActiveText: R.text,
      chipText: R.darkTextMuted,
      iconMuted: R.darkTextMuted,
      quickAccessProminentBg: R.primary,
      quickAccessProminentIcon: R.text,
      quickAccessBg: R.darkLayerRaised,
      quickAccessBorder: R.darkBorder,
      quickAccessIcon: R.darkPrimaryText,
      importantCardBg: '#2A1F18',
      importantCardBorder: AppColors.duskDark,
      noteCardBg: R.darkLayerRaised,
      error: AppColors.nonVegRed,
      errorTint: AppColors.errorContainerDark,
      veg: AppColors.sageDark,
      vegTint: '#1E2A22',
      nonVeg: '#E07A75',
      onDiet: R.darkBackground,
      countdown: R.darkText,
      countdownUrgent: AppColors.duskDark,
      highlight: R.secondary,
      onHighlight: R.text,
    };
  }

  return {
    background: R.background,
    surface: R.layer,
    surfaceRaised: R.layer,
    surfaceMuted: R.background,
    text: R.text,
    textMuted: R.textMuted,
    border: R.border,
    primary: R.primary,
    // Near-black on #3DA9D8 reads at ~8:1; white on it would be ~2.6:1.
    onPrimary: R.text,
    linkText: R.primaryText,
    accent: R.primaryText,
    primaryTint: R.primaryTint,
    secondary: R.secondaryText,
    secondaryTint: R.secondaryTint,
    tabBar: R.layer,
    tabActive: R.primaryText,
    tabActiveBackground: R.primaryTint,
    tabInactive: R.textMuted,
    headerBackground: R.background,
    headerTint: R.text,
    inputBackground: R.layer,
    chipBackground: R.layer,
    chipActiveBackground: R.primary,
    chipActiveText: R.text,
    chipText: R.textMuted,
    iconMuted: R.textMuted,
    quickAccessProminentBg: R.primary,
    quickAccessProminentIcon: R.text,
    quickAccessBg: R.layer,
    quickAccessBorder: R.border,
    quickAccessIcon: R.primaryText,
    importantCardBg: AppColors.duskTint,
    importantCardBorder: AppColors.tharDusk,
    noteCardBg: R.background,
    error: AppColors.nonVegRed,
    errorTint: AppColors.errorContainer,
    veg: AppColors.sageWell,
    vegTint: AppColors.sageTint,
    nonVeg: AppColors.nonVegRed,
    onDiet: AppColors.white,
    countdown: R.text,
    countdownUrgent: '#C2410C',
    highlight: R.secondary,
    onHighlight: R.text,
  };
}
