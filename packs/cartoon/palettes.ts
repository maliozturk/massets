// Four cartoon worlds — Jungle (leaf green), Ocean (aqua), Space (the dark
// one, deep violet) and Candy (pink). Saturated, high-contrast, flat: cartoon
// colour is about clean separation between figure and ground, not about
// gradients or subtle tints.
//
// Unlike the seasons palettes — which were designed by eye and inherited some
// WCAG failures — these were built against `npm run showroom`'s contrast audit
// and pass every check. Keep it that way: run the showroom after any edit.
//
// Pure data, no imports beyond the type.

import type { ThemeColors } from '../../core/tokens';

export const JUNGLE: ThemeColors = {
  // Deep leaf canopy over a warm, sunlit clearing.
  bg: '#F2FAEA',
  bgDeep: '#E4F2D6',
  surface: '#FFFFFF',
  surfaceRaised: '#F9FDF4',
  surfaceSunken: '#EAF4DD',
  surfaceBorder: 'rgba(23,51,26,0.12)',
  surfaceBorderStrong: 'rgba(23,51,26,0.22)',

  textPrimary: '#17331A',
  textSecondary: '#3B5A3C',
  textTertiary: '#5A7357',

  accent: '#1E7A3C',
  accentBright: '#14602D',
  accentDim: 'rgba(30,122,60,0.14)',
  accentBorder: 'rgba(30,122,60,0.45)',
  onAccent: '#FFFFFF',

  patina: '#0F6E52',
  patinaDim: 'rgba(15,110,82,0.14)',
  kindling: '#8A5200',
  kindlingDim: 'rgba(138,82,0,0.14)',
  kindlingBorder: 'rgba(138,82,0,0.45)',
  ember: '#B3261E',
  emberDim: 'rgba(179,38,30,0.12)',

  shadow: 'rgba(40,70,30,0.28)',
  overlay: 'rgba(228,242,214,0.85)',

  // Bright sky seen through a gap in the canopy.
  skyTop: '#B7E4F0',
  skyBottom: '#F2FAEA',
  scenery: 'rgba(22,80,40,0.85)',
  sceneryAlt: 'rgba(90,180,90,0.9)',

  celestial: 'rgba(255,214,102,0.95)',
  celestialGlow: 'rgba(255,214,102,0.35)',

  // Leaves spinning down through the light.
  particle: 'rgba(74,150,64,0.8)',
  particleAlt: 'rgba(140,200,110,0.65)',
};

export const OCEAN: ThemeColors = {
  // Under the surface: aqua water, sunlight coming down in shafts.
  bg: '#EAF7FB',
  bgDeep: '#D8EEF6',
  surface: '#FFFFFF',
  surfaceRaised: '#F6FCFE',
  surfaceSunken: '#E1F1F8',
  surfaceBorder: 'rgba(12,47,63,0.12)',
  surfaceBorderStrong: 'rgba(12,47,63,0.22)',

  textPrimary: '#0C2F3F',
  textSecondary: '#31556A',
  textTertiary: '#4E7285',

  accent: '#0B6E96',
  accentBright: '#075673',
  accentDim: 'rgba(11,110,150,0.14)',
  accentBorder: 'rgba(11,110,150,0.45)',
  onAccent: '#FFFFFF',

  patina: '#0A7059',
  patinaDim: 'rgba(10,112,89,0.14)',
  kindling: '#8A5200',
  kindlingDim: 'rgba(138,82,0,0.14)',
  kindlingBorder: 'rgba(138,82,0,0.45)',
  ember: '#B3261E',
  emberDim: 'rgba(179,38,30,0.12)',

  shadow: 'rgba(20,70,95,0.28)',
  overlay: 'rgba(216,238,246,0.85)',

  skyTop: '#BDEAF7',
  skyBottom: '#EAF7FB',
  // Coral and seabed rocks.
  scenery: 'rgba(12,80,110,0.75)',
  sceneryAlt: 'rgba(90,200,220,0.8)',

  // Sun diffused through water.
  celestial: 'rgba(255,244,196,0.9)',
  celestialGlow: 'rgba(180,240,255,0.35)',

  // Bubbles rising.
  particle: 'rgba(255,255,255,0.85)',
  particleAlt: 'rgba(150,220,240,0.7)',
};

export const SPACE: ThemeColors = {
  // The pack's dark variant. Deep violet, stars, a friendly moon.
  bg: '#141033',
  bgDeep: '#0D0A24',
  surface: '#1E1947',
  surfaceRaised: '#272057',
  surfaceSunken: '#171238',
  surfaceBorder: 'rgba(230,225,255,0.13)',
  surfaceBorderStrong: 'rgba(230,225,255,0.24)',

  textPrimary: '#F2EFFF',
  textSecondary: '#B7AFE0',
  textTertiary: '#9089C0',

  // On a dark ground the accent has to be the *light* colour, and onAccent the
  // dark one — the inverse of the three daylight worlds.
  accent: '#7FB3FF',
  accentBright: '#A9CCFF',
  accentDim: 'rgba(127,179,255,0.18)',
  accentBorder: 'rgba(127,179,255,0.45)',
  onAccent: '#0D0A24',

  patina: '#4FD6A8',
  patinaDim: 'rgba(79,214,168,0.18)',
  kindling: '#FFC24D',
  kindlingDim: 'rgba(255,194,77,0.18)',
  kindlingBorder: 'rgba(255,194,77,0.5)',
  ember: '#FF8A7A',
  emberDim: 'rgba(255,138,122,0.16)',

  shadow: 'rgba(0,0,0,0.55)',
  overlay: 'rgba(13,10,36,0.8)',

  skyTop: '#0A0820',
  skyBottom: '#241C55',
  // Planet arc on the horizon, with craters.
  scenery: 'rgba(60,45,120,0.9)',
  sceneryAlt: 'rgba(160,140,255,0.55)',

  celestial: 'rgba(255,250,230,0.95)',
  celestialGlow: 'rgba(200,190,255,0.18)',

  // Stars, near and far.
  particle: 'rgba(255,255,255,0.9)',
  particleAlt: 'rgba(190,180,255,0.7)',
};

export const CANDY: ThemeColors = {
  // Sweet-shop pink, cream and sprinkles.
  bg: '#FFF2F7',
  bgDeep: '#FDE4EE',
  surface: '#FFFFFF',
  surfaceRaised: '#FFF9FC',
  surfaceSunken: '#FCE9F1',
  surfaceBorder: 'rgba(62,20,48,0.12)',
  surfaceBorderStrong: 'rgba(62,20,48,0.22)',

  textPrimary: '#3E1430',
  textSecondary: '#67314F',
  textTertiary: '#8E5A78',

  accent: '#C2185B',
  accentBright: '#9C1149',
  accentDim: 'rgba(194,24,91,0.12)',
  accentBorder: 'rgba(194,24,91,0.45)',
  onAccent: '#FFFFFF',

  patina: '#0F6E52',
  patinaDim: 'rgba(15,110,82,0.14)',
  kindling: '#8A5200',
  kindlingDim: 'rgba(138,82,0,0.14)',
  kindlingBorder: 'rgba(138,82,0,0.45)',
  ember: '#B3261E',
  emberDim: 'rgba(179,38,30,0.12)',

  shadow: 'rgba(140,60,100,0.28)',
  overlay: 'rgba(253,228,238,0.85)',

  skyTop: '#FFD9EA',
  skyBottom: '#FFF2F7',
  // Rolling candy hills with a gumdrop skyline.
  scenery: 'rgba(120,40,90,0.55)',
  sceneryAlt: 'rgba(255,150,200,0.85)',

  celestial: 'rgba(255,206,128,0.95)',
  celestialGlow: 'rgba(255,200,150,0.35)',

  // Sprinkles tumbling down.
  particle: 'rgba(230,90,150,0.85)',
  particleAlt: 'rgba(170,130,245,0.7)',
};
