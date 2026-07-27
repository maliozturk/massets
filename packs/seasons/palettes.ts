// Four seasonal palettes — Rain (dark night), Snow (pale winter morning),
// and two springs: Blossom (hanami daylight) and Meadow (spring field).
//
// Rain is the pack's dark variant; the other three are light, each grounded in
// reference palettes for its scene (rainy-night slate blues, frosted-window ice
// whites, sakura pinks over cream, fresh meadow greens). The environment tokens
// at the bottom of each palette drive the sky gradient, celestial body, scenery
// silhouette and weather particles in WeatherOverlay.
//
// Pure data, no imports beyond the type — the showroom generator reads this
// file directly from Node.

import type { ThemeColors } from '../../core/tokens';

export const RAIN: ThemeColors = {
  // Rainy night — the dark variant. Deep slate city blues.
  bg: '#10161F',
  bgDeep: '#0B111A',
  surface: '#161E2A',
  surfaceRaised: '#1C2634',
  surfaceSunken: '#131A25',
  surfaceBorder: 'rgba(242,237,227,0.09)',
  surfaceBorderStrong: 'rgba(242,237,227,0.16)',

  textPrimary: '#F2EDE3',
  textSecondary: '#93A0B2',
  textTertiary: '#5A697D',

  accent: '#5EA8DB',
  accentBright: '#8FC6EC',
  accentDim: 'rgba(94,168,219,0.15)',
  accentBorder: 'rgba(94,168,219,0.38)',
  onAccent: '#0A1520',

  patina: '#55BE9A',
  patinaDim: 'rgba(85,190,154,0.15)',
  // A warm coal between untouched (accent) and settled (patina).
  kindling: '#D9A54C',
  kindlingDim: 'rgba(217,165,76,0.15)',
  kindlingBorder: 'rgba(217,165,76,0.42)',
  ember: '#E2604A',
  emberDim: 'rgba(226,96,74,0.14)',

  shadow: 'rgba(0,0,0,0.45)',
  overlay: 'rgba(11,17,26,0.72)',

  skyTop: '#0A101B',
  skyBottom: '#182333',
  scenery: 'rgba(4,8,15,0.6)',
  sceneryAlt: 'rgba(143,198,236,0.28)',

  // A pale moon behind the rain clouds.
  celestial: 'rgba(222,232,246,0.55)',
  celestialGlow: 'rgba(180,200,230,0.1)',

  particle: 'rgba(143,198,236,0.4)',
  particleAlt: 'rgba(143,198,236,0.2)',
};

export const SNOW: ThemeColors = {
  // Winter morning — light. Frosted-window whites, slate-blue accents.
  bg: '#EFF4FA',
  bgDeep: '#E4EBF4',
  surface: '#FFFFFF',
  surfaceRaised: '#F8FBFE',
  surfaceSunken: '#E7EEF6',
  surfaceBorder: 'rgba(28,39,64,0.1)',
  surfaceBorderStrong: 'rgba(28,39,64,0.18)',

  textPrimary: '#1C2740',
  textSecondary: '#52617C',
  textTertiary: '#8593AB',

  accent: '#4585BE',
  accentBright: '#2F6FA8',
  accentDim: 'rgba(69,133,190,0.13)',
  accentBorder: 'rgba(69,133,190,0.4)',
  onAccent: '#FFFFFF',

  patina: '#279273',
  patinaDim: 'rgba(39,146,115,0.13)',
  kindling: '#B07714',
  kindlingDim: 'rgba(176,119,20,0.13)',
  kindlingBorder: 'rgba(176,119,20,0.4)',
  ember: '#C9432D',
  emberDim: 'rgba(201,67,45,0.11)',

  shadow: 'rgba(90,110,140,0.3)',
  overlay: 'rgba(228,235,244,0.8)',

  skyTop: '#D8E6F4',
  skyBottom: '#F4F8FC',
  scenery: '#FFFFFF',
  sceneryAlt: 'rgba(148,173,204,0.45)',

  // Pale winter sun, high and cold.
  celestial: 'rgba(255,252,240,0.9)',
  celestialGlow: 'rgba(255,250,235,0.4)',

  particle: 'rgba(255,255,255,0.95)',
  particleAlt: 'rgba(176,196,222,0.7)',
};

export const BLOSSOM: ThemeColors = {
  // Hanami daylight — light. Sakura pinks over warm cream, cherry-bark ink.
  bg: '#FBF3F0',
  bgDeep: '#F6EAE7',
  surface: '#FFFFFF',
  surfaceRaised: '#FDF9F7',
  surfaceSunken: '#F5EBE9',
  surfaceBorder: 'rgba(60,38,50,0.1)',
  surfaceBorderStrong: 'rgba(60,38,50,0.18)',

  textPrimary: '#3B2A35',
  textSecondary: '#79606E',
  textTertiary: '#A78F9C',

  accent: '#D4718F',
  accentBright: '#B85476',
  accentDim: 'rgba(212,113,143,0.13)',
  accentBorder: 'rgba(212,113,143,0.42)',
  onAccent: '#FFFFFF',

  patina: '#2F9A7A',
  patinaDim: 'rgba(47,154,122,0.13)',
  kindling: '#B5732F',
  kindlingDim: 'rgba(181,115,47,0.13)',
  kindlingBorder: 'rgba(181,115,47,0.4)',
  ember: '#C9432D',
  emberDim: 'rgba(201,67,45,0.11)',

  shadow: 'rgba(150,110,125,0.28)',
  overlay: 'rgba(246,234,231,0.8)',

  skyTop: '#F7E0E3',
  skyBottom: '#FBF3F0',
  scenery: 'rgba(124,77,61,0.6)',
  sceneryAlt: 'rgba(232,142,171,0.75)',

  // Sunrise low over the horizon — hanami mornings.
  celestial: 'rgba(246,166,120,0.9)',
  celestialGlow: 'rgba(246,166,120,0.32)',

  particle: 'rgba(232,142,171,0.85)',
  particleAlt: 'rgba(244,186,203,0.7)',
};

export const MEADOW: ThemeColors = {
  // Spring field — light. Fresh greens, morning air.
  bg: '#F4F8EC',
  bgDeep: '#EAF2DE',
  surface: '#FFFFFF',
  surfaceRaised: '#FAFCF4',
  surfaceSunken: '#ECF2E1',
  surfaceBorder: 'rgba(36,51,31,0.1)',
  surfaceBorderStrong: 'rgba(36,51,31,0.18)',

  textPrimary: '#263420',
  textSecondary: '#5C6E53',
  textTertiary: '#8C9B81',

  accent: '#5E9C4B',
  accentBright: '#487F38',
  accentDim: 'rgba(94,156,75,0.13)',
  accentBorder: 'rgba(94,156,75,0.4)',
  onAccent: '#FFFFFF',

  patina: '#2C9C86',
  patinaDim: 'rgba(44,156,134,0.13)',
  kindling: '#9C7A1E',
  kindlingDim: 'rgba(156,122,30,0.13)',
  kindlingBorder: 'rgba(156,122,30,0.4)',
  ember: '#C9432D',
  emberDim: 'rgba(201,67,45,0.11)',

  shadow: 'rgba(100,130,85,0.28)',
  overlay: 'rgba(234,242,222,0.8)',

  skyTop: '#E4F0D6',
  skyBottom: '#F6F9EF',
  scenery: 'rgba(94,140,70,0.5)',
  sceneryAlt: 'rgba(56,100,42,0.4)',

  // Late-afternoon golden sun over the field.
  celestial: 'rgba(250,213,120,0.92)',
  celestialGlow: 'rgba(250,213,120,0.3)',

  particle: 'rgba(110,158,86,0.65)',
  particleAlt: 'rgba(146,186,120,0.55)',
};
