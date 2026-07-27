// Text styles, rebuilt per palette so colour is baked in at the style level
// rather than reapplied at every call site.

import type { TextStyle } from 'react-native';

import { fontFamily, type ThemeColors } from './tokens';

export function makeTypography(colors: ThemeColors) {
  return {
    hero: { fontFamily: fontFamily.display, fontSize: 30, color: colors.textPrimary, letterSpacing: -0.5 } satisfies TextStyle,
    title: { fontFamily: fontFamily.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.3 } satisfies TextStyle,
    subtitle: { fontFamily: fontFamily.displayMedium, fontSize: 16, color: colors.textPrimary } satisfies TextStyle,
    body: { fontFamily: fontFamily.body, fontSize: 15, color: colors.textPrimary, lineHeight: 23 } satisfies TextStyle,
    bodyMedium: { fontFamily: fontFamily.bodyMedium, fontSize: 15, color: colors.textPrimary } satisfies TextStyle,
    caption: { fontFamily: fontFamily.body, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 } satisfies TextStyle,
    /** Mono eyebrow — small, wide-tracked, uppercase. States a fact, never decorates. */
    eyebrow: {
      fontFamily: fontFamily.monoMedium,
      fontSize: 11,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 1.4,
    } satisfies TextStyle,
    eyebrowAccent: {
      fontFamily: fontFamily.monoMedium,
      fontSize: 11,
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 1.4,
    } satisfies TextStyle,
    mono: { fontFamily: fontFamily.mono, fontSize: 12, color: colors.textTertiary } satisfies TextStyle,
  } as const;
}

export type Typography = ReturnType<typeof makeTypography>;
