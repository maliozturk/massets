// Four stages of one storm, escalating: Drizzle → Downpour → Thunder →
// Tempest. Where the seasons pack's `rain` is a calm rainy night to think in,
// this pack is weather with weight behind it.
//
// Drizzle is the only light variant — an overcast afternoon. The other three
// darken and cool as the storm builds, and each one's accent is the light
// that still cuts through it.
//
// Built against `npm run showroom`'s contrast audit. Run it after any edit.
//
// Pure data, no imports beyond the type.

import type { ThemeColors } from '../../core/tokens';

export const DRIZZLE: ThemeColors = {
  // Overcast afternoon. Wet slate, washed-out green-grey, no sun to speak of.
  bg: '#EEF1F0',
  bgDeep: '#DFE5E3',
  surface: '#FFFFFF',
  surfaceRaised: '#F7F9F8',
  surfaceSunken: '#E7ECEA',
  surfaceBorder: 'rgba(24,38,42,0.12)',
  surfaceBorderStrong: 'rgba(24,38,42,0.22)',

  textPrimary: '#18262A',
  textSecondary: '#3C5054',
  textTertiary: '#5D7176',

  accent: '#2A6E7A',
  accentBright: '#1D555F',
  accentDim: 'rgba(42,110,122,0.13)',
  accentBorder: 'rgba(42,110,122,0.45)',
  onAccent: '#FFFFFF',

  patina: '#0F6E52',
  patinaDim: 'rgba(15,110,82,0.14)',
  kindling: '#8A5200',
  kindlingDim: 'rgba(138,82,0,0.14)',
  kindlingBorder: 'rgba(138,82,0,0.45)',
  ember: '#B3261E',
  emberDim: 'rgba(179,38,30,0.12)',

  shadow: 'rgba(40,60,65,0.28)',
  overlay: 'rgba(223,229,227,0.85)',

  skyTop: '#C6D2D2',
  skyBottom: '#EEF1F0',
  scenery: 'rgba(40,62,66,0.55)',
  sceneryAlt: 'rgba(120,150,152,0.6)',

  // The sun is up there somewhere — a pale disc with no heat in it.
  celestial: 'rgba(236,241,239,0.85)',
  celestialGlow: 'rgba(210,222,220,0.35)',

  particle: 'rgba(105,140,148,0.55)',
  particleAlt: 'rgba(145,172,178,0.4)',
};

export const DOWNPOUR: ThemeColors = {
  // The sky opens. Cold slate blue, headlights on in the afternoon.
  bg: '#131A22',
  bgDeep: '#0C1218',
  surface: '#1B242E',
  surfaceRaised: '#23303B',
  surfaceSunken: '#161E27',
  surfaceBorder: 'rgba(226,235,242,0.13)',
  surfaceBorderStrong: 'rgba(226,235,242,0.24)',

  textPrimary: '#E8EFF5',
  textSecondary: '#A3B3C2',
  textTertiary: '#7D8E9E',

  accent: '#63A8D4',
  accentBright: '#96C8E8',
  accentDim: 'rgba(99,168,212,0.18)',
  accentBorder: 'rgba(99,168,212,0.45)',
  onAccent: '#0C1218',

  patina: '#4CC79E',
  patinaDim: 'rgba(76,199,158,0.18)',
  kindling: '#E0AC53',
  kindlingDim: 'rgba(224,172,83,0.18)',
  kindlingBorder: 'rgba(224,172,83,0.5)',
  ember: '#FF8272',
  emberDim: 'rgba(255,130,114,0.16)',

  shadow: 'rgba(0,0,0,0.5)',
  overlay: 'rgba(12,18,24,0.8)',

  skyTop: '#0A1017',
  skyBottom: '#1E2A36',
  scenery: 'rgba(6,11,16,0.78)',
  sceneryAlt: 'rgba(120,170,205,0.3)',

  // No disc left — just a bright patch where the sun should be.
  celestial: 'rgba(190,210,230,0.32)',
  celestialGlow: 'rgba(150,180,210,0.1)',

  particle: 'rgba(150,195,225,0.5)',
  particleAlt: 'rgba(150,195,225,0.25)',
};

export const THUNDER: ThemeColors = {
  // The centrepiece. Deep indigo-black, lit from inside by the strike.
  bg: '#12132A',
  bgDeep: '#0A0B1D',
  surface: '#1B1D3A',
  surfaceRaised: '#242747',
  surfaceSunken: '#16172F',
  surfaceBorder: 'rgba(230,232,255,0.13)',
  surfaceBorderStrong: 'rgba(230,232,255,0.24)',

  textPrimary: '#ECEDFF',
  textSecondary: '#AFB1DA',
  textTertiary: '#8A8DBB',

  accent: '#8E9BFF',
  accentBright: '#B4BDFF',
  accentDim: 'rgba(142,155,255,0.18)',
  accentBorder: 'rgba(142,155,255,0.45)',
  onAccent: '#0A0B1D',

  patina: '#4FD0B0',
  patinaDim: 'rgba(79,208,176,0.18)',
  kindling: '#FFC65C',
  kindlingDim: 'rgba(255,198,92,0.18)',
  kindlingBorder: 'rgba(255,198,92,0.5)',
  ember: '#FF8A85',
  emberDim: 'rgba(255,138,133,0.16)',

  shadow: 'rgba(0,0,0,0.6)',
  overlay: 'rgba(10,11,29,0.82)',

  skyTop: '#08091A',
  skyBottom: '#1E2048',
  scenery: 'rgba(4,5,14,0.82)',
  sceneryAlt: 'rgba(150,160,255,0.28)',

  celestial: 'rgba(215,220,255,0.26)',
  celestialGlow: 'rgba(160,170,255,0.1)',

  particle: 'rgba(175,190,255,0.55)',
  particleAlt: 'rgba(175,190,255,0.28)',
};

export const TEMPEST: ThemeColors = {
  // The far end. Near-black storm-sea green, wind driving the rain sideways.
  bg: '#0E1A1B',
  bgDeep: '#071011',
  surface: '#152526',
  surfaceRaised: '#1D3132',
  surfaceSunken: '#101E1F',
  surfaceBorder: 'rgba(224,240,238,0.13)',
  surfaceBorderStrong: 'rgba(224,240,238,0.24)',

  textPrimary: '#E4F1EF',
  textSecondary: '#9FB6B4',
  textTertiary: '#77908E',

  accent: '#4FBFAE',
  accentBright: '#86DACD',
  accentDim: 'rgba(79,191,174,0.18)',
  accentBorder: 'rgba(79,191,174,0.45)',
  onAccent: '#071011',

  patina: '#56C98E',
  patinaDim: 'rgba(86,201,142,0.18)',
  kindling: '#E5B052',
  kindlingDim: 'rgba(229,176,82,0.18)',
  kindlingBorder: 'rgba(229,176,82,0.5)',
  ember: '#FF8A72',
  emberDim: 'rgba(255,138,114,0.16)',

  shadow: 'rgba(0,0,0,0.6)',
  overlay: 'rgba(7,16,17,0.82)',

  skyTop: '#060F10',
  skyBottom: '#16292A',
  scenery: 'rgba(3,8,9,0.82)',
  sceneryAlt: 'rgba(110,190,180,0.28)',

  celestial: 'rgba(200,225,220,0.2)',
  celestialGlow: 'rgba(140,200,190,0.09)',

  particle: 'rgba(150,215,205,0.5)',
  particleAlt: 'rgba(150,215,205,0.25)',
};
