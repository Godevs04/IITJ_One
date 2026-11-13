import { Platform } from 'react-native';

/**
 * IITJ One design tokens — Blue Matcha design system (docs/design-system/BLUE_MATCHA_DESIGN_SYSTEM.md).
 * Never hardcode hex in screens; use useThemeColors() or getThemeColors().
 *
 * Seven foundation colours carry the whole UI. Everything else in this file is either an opacity mix of
 * two of them (tints, borders, muted text) or a status colour kept only for accessibility
 * (errors, veg / non-veg marks).
 */
export const BlueMatcha = {
  deepOcean: '#31465A',
  matchaGreen: '#C7DFA3',
  vanillaMilk: '#FFFDF7',
  airyBlue: '#89B9E6',
  frozenAqua: '#D9F0FF',
  black: '#000000',
  white: '#FFFFFF',
} as const;

/**
 * Derived palette. Each value is a foundation colour or a mix of two (noted per line), checked for contrast:
 * Deep Ocean reads at 9.7:1 on white and 4.7:1 on Airy Blue; white on Airy Blue is only 2.1:1, so text on
 * Airy Blue or Matcha Green is always Deep Ocean.
 */
export const RedesignColors = {
  background: BlueMatcha.white,
  layer: BlueMatcha.vanillaMilk,
  text: BlueMatcha.deepOcean,
  primary: BlueMatcha.deepOcean,
  secondary: BlueMatcha.airyBlue,
  primaryText: BlueMatcha.deepOcean,
  /** Deep Ocean 78% on white — 5.2:1 on white. */
  textMuted: '#5E6F7E',
  /** Deep Ocean 16% on white. */
  border: '#DEE1E5',
  primaryTint: BlueMatcha.frozenAqua,
  /** Frozen Aqua 45% on white — insets inside cards. */
  layerMuted: '#EEF8FF',
  secondaryText: BlueMatcha.deepOcean,
  /** Matcha Green 35% on white. */
  secondaryTint: '#EBF4DF',
  darkBackground: BlueMatcha.black,
  darkLayer: BlueMatcha.deepOcean,
  /** White 10% on Deep Ocean. */
  darkLayerRaised: '#46586A',
  /** Deep Ocean 55% on black — insets inside Deep Ocean cards. */
  darkLayerMuted: '#1B2632',
  darkText: BlueMatcha.white,
  darkTextMuted: BlueMatcha.frozenAqua,
  /** White 18% on Deep Ocean. */
  darkBorder: '#566778',
  darkPrimaryText: BlueMatcha.airyBlue,
  /** Airy Blue 16% on black. */
  darkPrimaryTint: '#161E25',
  /** Matcha Green 16% on black. */
  darkSecondaryTint: '#20241A',
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

/**
 * Layout spacing (design system §2): 16 screen margin, 8 gutter, larger gaps in multiples of 8.
 * Use this for new and redesigned components.
 */
export const spacing = {
  unit: 8,
  screenMargin: 16,
  gutter: 8,

  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

/**
 * Legacy scale still used by screens that predate the Blue Matcha system. Its names sit one step off
 * `spacing` (lg = 16 here, md = 16 there), so the two are kept apart rather than renumbered under
 * existing layouts. `AppSpacing.lg` is the 16 screen margin.
 */
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

/** Type scale (design system §1). Sizes are dp on mobile. */
export const typography = {
  fontFamily: {
    primary: 'Helvetica Neue',
    fallback: 'System',
  },
  fontSize: {
    bigHeading: 24,
    sectionHeading: 20,
    bodyHeader: 16,
    body: 16,
    secondaryBody: 12,
    smallBody: 10,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    bigHeading: 32,
    sectionHeading: 28,
    bodyHeader: 24,
    body: 24,
    secondaryBody: 18,
    smallBody: 14,
  },
} as const;

const { fontSize: size, lineHeight: leading, fontWeight: weight } = typography;

/** Ready-made text styles built from `typography`. */
export const AppTypography = {
  /** Big heading */
  display: {
    fontSize: size.bigHeading,
    lineHeight: leading.bigHeading,
    fontWeight: weight.bold,
    fontFamily: AppFontFamily,
  },
  /** Big heading (screen titles) */
  h1: {
    fontSize: size.bigHeading,
    lineHeight: leading.bigHeading,
    fontWeight: weight.bold,
    fontFamily: AppFontFamily,
  },
  /** Section heading */
  h2: {
    fontSize: size.sectionHeading,
    lineHeight: leading.sectionHeading,
    fontWeight: weight.semibold,
    fontFamily: AppFontFamily,
  },
  /** Body text header */
  bodyHeader: {
    fontSize: size.bodyHeader,
    lineHeight: leading.bodyHeader,
    fontWeight: weight.semibold,
    fontFamily: AppFontFamily,
  },
  body: {
    fontSize: size.body,
    lineHeight: leading.body,
    fontWeight: weight.regular,
    fontFamily: AppFontFamily,
  },
  /** Secondary body text */
  bodySmall: {
    fontSize: size.secondaryBody,
    lineHeight: leading.secondaryBody,
    fontWeight: weight.regular,
    fontFamily: AppFontFamily,
  },
  caption: {
    fontSize: size.secondaryBody,
    lineHeight: leading.secondaryBody,
    fontWeight: weight.regular,
    fontFamily: AppFontFamily,
  },
  /** Small body text */
  small: {
    fontSize: size.smallBody,
    lineHeight: leading.smallBody,
    fontWeight: weight.regular,
    fontFamily: AppFontFamily,
  },
  button: {
    fontSize: size.body,
    fontWeight: weight.semibold,
    letterSpacing: 0.2,
    fontFamily: AppFontFamily,
  },
  dataMono: {
    fontSize: size.body,
    lineHeight: leading.body,
    fontWeight: weight.semibold,
    fontFamily: AppFontFamily,
  },
  dataLargeMono: {
    fontSize: size.bigHeading,
    lineHeight: leading.bigHeading,
    fontWeight: weight.semibold,
    fontFamily: AppFontFamily,
  },
  sectionLabel: {
    fontSize: size.secondaryBody,
    lineHeight: leading.secondaryBody,
    fontWeight: weight.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    fontFamily: AppFontFamily,
  },
} as const;

/** Notice category accents (light). Use getCategoryColors(scheme) so they stay readable in dark mode. */
export const CategoryColors = {
  mess: RedesignColors.secondaryText,
  transport: RedesignColors.primaryText,
  institute: RedesignColors.text,
  orientation: AppColors.sageWell,
  general: RedesignColors.textMuted,
} as const;

export type NoticeCategory = keyof typeof CategoryColors;

export function getCategoryColors(scheme: 'light' | 'dark'): Record<NoticeCategory, string> {
  if (scheme === 'light') return CategoryColors;
  return {
    mess: BlueMatcha.matchaGreen,
    transport: RedesignColors.darkPrimaryText,
    institute: RedesignColors.darkText,
    orientation: AppColors.sageDark,
    general: RedesignColors.darkTextMuted,
  };
}

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
  /** Floating bottom navigation: pill fill, its outer border, and icon colours. */
  tabBar: string;
  tabBarBorder: string;
  /** Icon colour on the active capsule. */
  tabActive: string;
  /** Capsule behind the focused tab icon. */
  tabActiveBackground: string;
  tabInactive: string;
  /** Capsule tint while a tab is pressed. */
  tabPressed: string;
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
  /** Matcha Green fill that marks "now" or "selected": the current meal, the next bus. */
  highlight: string;
  /** Text/icon colour on a `highlight` fill. */
  onHighlight: string;
}

export function getThemeColors(scheme: ColorScheme): ThemeColors {
  const R = RedesignColors;
  const B = BlueMatcha;
  if (scheme === 'dark') {
    return {
      background: R.darkBackground,
      surface: R.darkLayer,
      surfaceRaised: R.darkLayerRaised,
      // Insets inside cards (meal tabs, "no more buses") need to separate from the Deep Ocean card.
      surfaceMuted: R.darkLayerMuted,
      text: R.darkText,
      textMuted: R.darkTextMuted,
      border: R.darkBorder,
      // Deep Ocean is the card colour in dark mode, so filled buttons switch to Airy Blue.
      primary: B.airyBlue,
      onPrimary: B.deepOcean,
      linkText: R.darkPrimaryText,
      accent: R.darkPrimaryText,
      primaryTint: R.darkPrimaryTint,
      secondary: B.matchaGreen,
      secondaryTint: R.darkSecondaryTint,
      tabBar: B.deepOcean,
      tabBarBorder: B.white,
      tabActive: B.deepOcean,
      tabActiveBackground: B.airyBlue,
      tabInactive: B.white,
      tabPressed: B.matchaGreen,
      headerBackground: R.darkBackground,
      headerTint: R.darkText,
      inputBackground: R.darkLayerMuted,
      chipBackground: R.darkLayerMuted,
      chipActiveBackground: B.matchaGreen,
      chipActiveText: B.deepOcean,
      chipText: R.darkTextMuted,
      iconMuted: R.darkTextMuted,
      quickAccessProminentBg: B.airyBlue,
      quickAccessProminentIcon: B.deepOcean,
      quickAccessBg: R.darkLayer,
      quickAccessBorder: R.darkBorder,
      quickAccessIcon: B.airyBlue,
      importantCardBg: R.darkSecondaryTint,
      importantCardBorder: B.matchaGreen,
      noteCardBg: R.darkLayerRaised,
      // Status colours — accessibility exceptions to the palette.
      error: '#FFB4AB',
      errorTint: AppColors.errorContainerDark,
      veg: B.matchaGreen,
      vegTint: R.darkSecondaryTint,
      nonVeg: '#FFB4AB',
      onDiet: B.black,
      countdown: R.darkText,
      countdownUrgent: '#FFB4AB',
      highlight: B.matchaGreen,
      onHighlight: B.deepOcean,
    };
  }

  return {
    background: R.background,
    surface: R.layer,
    surfaceRaised: B.white,
    surfaceMuted: R.layerMuted,
    text: R.text,
    textMuted: R.textMuted,
    border: R.border,
    primary: B.deepOcean,
    onPrimary: B.white,
    linkText: R.primaryText,
    accent: R.primaryText,
    primaryTint: R.primaryTint,
    // Airy Blue is too light to read on white (2.1:1), so as a text/icon colour the secondary is Deep Ocean.
    secondary: R.secondaryText,
    secondaryTint: R.secondaryTint,
    tabBar: B.deepOcean,
    tabBarBorder: B.white,
    tabActive: B.deepOcean,
    tabActiveBackground: B.airyBlue,
    tabInactive: B.white,
    tabPressed: B.matchaGreen,
    headerBackground: R.background,
    headerTint: R.text,
    inputBackground: R.layer,
    chipBackground: R.layer,
    chipActiveBackground: B.matchaGreen,
    chipActiveText: B.deepOcean,
    chipText: R.textMuted,
    iconMuted: R.textMuted,
    quickAccessProminentBg: B.deepOcean,
    quickAccessProminentIcon: B.white,
    quickAccessBg: R.primaryTint,
    quickAccessBorder: R.border,
    quickAccessIcon: B.deepOcean,
    importantCardBg: R.secondaryTint,
    importantCardBorder: B.matchaGreen,
    noteCardBg: R.layer,
    // Status colours — accessibility exceptions to the palette.
    error: AppColors.nonVegRed,
    errorTint: AppColors.errorContainer,
    veg: '#3F7D4E',
    vegTint: R.secondaryTint,
    nonVeg: AppColors.nonVegRed,
    onDiet: B.white,
    countdown: R.text,
    countdownUrgent: '#C2410C',
    highlight: B.matchaGreen,
    onHighlight: B.deepOcean,
  };
}
