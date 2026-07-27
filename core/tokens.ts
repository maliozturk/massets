// The token contract every theme pack must satisfy.
//
// This file is deliberately pure data — no react-native imports, no runtime
// dependencies — so Node tooling (the showroom generator, any future checker)
// can import it directly.
//
// House rule inherited from research_vault: apps never write raw hex/rgba.
// Every colour an app draws comes from a pack's ThemeColors.

/**
 * The colour surface a pack exposes. Grouped by role, not by hue — a pack
 * supplies whatever hexes it likes, but the *meanings* below are fixed, so a
 * screen written against one pack renders sensibly under any other.
 */
export interface ThemeColors {
  // --- Grounds and panels --------------------------------------------------
  /** Page background. */
  bg: string;
  /** A deeper ground, for recessed areas and scrims. */
  bgDeep: string;
  /** Default panel/card fill. */
  surface: string;
  /** Panel lifted above `surface` — secondary buttons, icon buttons. */
  surfaceRaised: string;
  /** Panel pressed below `surface` — inputs, wells. */
  surfaceSunken: string;
  /** Hairline border. Usually a low-alpha ink. */
  surfaceBorder: string;
  /** Border for elements that need to assert an edge. */
  surfaceBorderStrong: string;

  // --- Ink -----------------------------------------------------------------
  /** Body and heading text. */
  textPrimary: string;
  /** Supporting text, captions. */
  textSecondary: string;
  /** Eyebrows, timestamps, the quietest legible ink. */
  textTertiary: string;

  // --- Accent (the pack's voice) -------------------------------------------
  /** Primary accent — buttons, active states. */
  accent: string;
  /** A higher-contrast accent for text on tinted fills. */
  accentBright: string;
  /** Low-alpha accent fill. */
  accentDim: string;
  /** Accent-tinted border. */
  accentBorder: string;
  /** Ink that stays legible *on top of* `accent`. */
  onAccent: string;

  // --- Semantic states -----------------------------------------------------
  /** Success / settled / complete. */
  patina: string;
  patinaDim: string;
  /** In-between state — warmer than accent, calmer than ember. */
  kindling: string;
  kindlingDim: string;
  kindlingBorder: string;
  /** Danger / destructive. */
  ember: string;
  emberDim: string;

  // --- Depth ---------------------------------------------------------------
  shadow: string;
  /** Scrim behind modals. */
  overlay: string;

  // --- Environment ---------------------------------------------------------
  // A pack with no scenery may point these at its grounds; they must still be
  // present so `ThemeColors` stays a single, total contract.
  /** Sky gradient, top stop. */
  skyTop: string;
  /** Sky gradient, bottom stop. */
  skyBottom: string;
  /** Scenery silhouette fill. */
  scenery: string;
  /** Scenery secondary fill — highlights, foliage, windows. */
  sceneryAlt: string;
  /** Sun/moon body. */
  celestial: string;
  /** Halo around the celestial body. */
  celestialGlow: string;
  /** Weather particle, near depth. */
  particle: string;
  /** Weather particle, far depth. */
  particleAlt: string;
}

/** Every key of ThemeColors, for tooling that needs to iterate the contract. */
export const THEME_COLOR_KEYS = [
  'bg', 'bgDeep', 'surface', 'surfaceRaised', 'surfaceSunken', 'surfaceBorder', 'surfaceBorderStrong',
  'textPrimary', 'textSecondary', 'textTertiary',
  'accent', 'accentBright', 'accentDim', 'accentBorder', 'onAccent',
  'patina', 'patinaDim', 'kindling', 'kindlingDim', 'kindlingBorder', 'ember', 'emberDim',
  'shadow', 'overlay',
  'skyTop', 'skyBottom', 'scenery', 'sceneryAlt', 'celestial', 'celestialGlow', 'particle', 'particleAlt',
] as const satisfies readonly (keyof ThemeColors)[];

// Fails to compile if a token is added to ThemeColors but not to the list
// above — the showroom iterates the list, so a missed key would silently go
// unrendered instead of loudly breaking.
type MissingKeys = Exclude<keyof ThemeColors, (typeof THEME_COLOR_KEYS)[number]>;
const _allKeysListed: MissingKeys extends never ? true : MissingKeys = true;
void _allKeysListed;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

export const motion = {
  revealDurationMs: 300,
  entranceDurationMs: 320,
  shakeDurationMs: 360,
} as const;

// Mutable-number views of the scales above. A pack may override roundness and
// timing — the two things that carry a pack's *feel* rather than its colour —
// without restating the whole scale. Spacing is exposed for completeness but
// nothing overrides it today.
export type SpacingScale = { [K in keyof typeof spacing]: number };
export type RadiusScale = { [K in keyof typeof radius]: number };
export type MotionScale = { [K in keyof typeof motion]: number };

/** The resolved scales for the active pack: its overrides merged over the defaults. */
export interface PackTokens {
  spacing: SpacingScale;
  radius: RadiusScale;
  motion: MotionScale;
}

/** The defaults, used by any pack that overrides nothing. */
export const defaultPackTokens: PackTokens = { spacing, radius, motion };

/**
 * Font family names as registered by `expo-font`. The app must load them via
 * `useFonts(fontsToLoad)` from `core/fonts` before rendering.
 */
export const fontFamily = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodyBold: 'Manrope_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;
