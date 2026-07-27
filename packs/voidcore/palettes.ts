// Five voids. Same vortex, same storms, five entirely different moods.
//
// Abyss is the anchor, closest to the reference image: deep navy and steel,
// vast and unlit. Frost and Ember are the opposed pair — ice against fire,
// Frost brighter and more crystalline than Abyss ever gets. Verdant and
// Violet fill out the set: chemical and wrong, then the singularity.
//
// All four are dark. A void has no daylight variant, and the whole point is
// that the light comes from the thing itself, not from a sky.
//
// A note on the accents: on a near-black ground the accent has to be the
// LIGHT colour and `onAccent` the dark one — the inverse of a daylight
// palette. Every one of these passes the showroom's contrast audit; run it
// after any edit.
//
// Pure data, no imports beyond the type.

import type { ThemeColors } from '../../core/tokens';

export const ABYSS: ThemeColors = {
  // Vast, cold, unlit. Steel and navy — light bent around something that gives
  // none of it back. Darker and bluer than Frost, and far less crystalline.
  bg: '#05070C',
  bgDeep: '#020306',
  surface: '#0D1320',
  surfaceRaised: '#141C2D',
  surfaceSunken: '#090E17',
  surfaceBorder: 'rgba(200,225,255,0.13)',
  surfaceBorderStrong: 'rgba(200,225,255,0.24)',

  textPrimary: '#E8F2FC',
  textSecondary: '#A9BCD2',
  textTertiary: '#7C90AC',

  accent: '#6FC3F5',
  accentBright: '#A5DBFA',
  accentDim: 'rgba(111,195,245,0.18)',
  accentBorder: 'rgba(111,195,245,0.45)',
  onAccent: '#020306',

  patina: '#4FD6B4',
  patinaDim: 'rgba(79,214,180,0.18)',
  kindling: '#F0B95C',
  kindlingDim: 'rgba(240,185,92,0.18)',
  kindlingBorder: 'rgba(240,185,92,0.5)',
  ember: '#FF8072',
  emberDim: 'rgba(255,128,114,0.16)',

  shadow: 'rgba(0,0,0,0.7)',
  overlay: 'rgba(2,3,6,0.85)',

  skyTop: '#020306',
  skyBottom: '#0A1524',
  scenery: 'rgba(28,51,72,0.9)',
  sceneryAlt: 'rgba(143,200,232,0.5)',

  celestial: 'rgba(224,240,252,0.95)',
  celestialGlow: 'rgba(120,190,240,0.16)',

  particle: 'rgba(255,255,255,0.9)',
  particleAlt: 'rgba(143,200,232,0.55)',
};

export const FROST: ThemeColors = {
  // Ice. Cold cyan-white light on black, the swirl reading as frost creeping
  // across glass. The closest of the four to the reference image.
  bg: '#050A0F',
  bgDeep: '#01050A',
  surface: '#0C1620',
  surfaceRaised: '#13202C',
  surfaceSunken: '#08111A',
  surfaceBorder: 'rgba(214,240,255,0.14)',
  surfaceBorderStrong: 'rgba(214,240,255,0.26)',

  textPrimary: '#EAF7FF',
  textSecondary: '#B0CADB',
  textTertiary: '#7F9CB0',

  accent: '#7FE0FF',
  accentBright: '#B4EEFF',
  accentDim: 'rgba(127,224,255,0.18)',
  accentBorder: 'rgba(127,224,255,0.45)',
  onAccent: '#01050A',

  patina: '#5FD8C4',
  patinaDim: 'rgba(95,216,196,0.18)',
  kindling: '#F0C879',
  kindlingDim: 'rgba(240,200,121,0.18)',
  kindlingBorder: 'rgba(240,200,121,0.5)',
  ember: '#FF8A80',
  emberDim: 'rgba(255,138,128,0.16)',

  shadow: 'rgba(0,0,0,0.7)',
  overlay: 'rgba(1,5,10,0.85)',

  skyTop: '#01050A',
  skyBottom: '#081A28',
  // Dust lanes falling in, and the lit inner rim.
  scenery: 'rgba(30,64,86,0.9)',
  sceneryAlt: 'rgba(170,225,250,0.5)',

  // The throat itself: what the vortex is lit by.
  celestial: 'rgba(235,250,255,0.96)',
  celestialGlow: 'rgba(140,215,255,0.17)',

  // Stars near and far.
  particle: 'rgba(255,255,255,0.92)',
  particleAlt: 'rgba(170,225,250,0.55)',
};

export const EMBER: ThemeColors = {
  // A dying star going down the drain. Iron, ash, orange heat.
  bg: '#0B0603',
  bgDeep: '#050201',
  surface: '#180E07',
  surfaceRaised: '#23150B',
  surfaceSunken: '#120A05',
  surfaceBorder: 'rgba(255,224,196,0.13)',
  surfaceBorderStrong: 'rgba(255,224,196,0.24)',

  textPrimary: '#FBEEE2',
  textSecondary: '#D2B7A0',
  textTertiary: '#AC8E76',

  accent: '#FF9E4A',
  accentBright: '#FFC084',
  accentDim: 'rgba(255,158,74,0.18)',
  accentBorder: 'rgba(255,158,74,0.45)',
  onAccent: '#050201',

  patina: '#6FD09A',
  patinaDim: 'rgba(111,208,154,0.18)',
  kindling: '#FFC65C',
  kindlingDim: 'rgba(255,198,92,0.18)',
  kindlingBorder: 'rgba(255,198,92,0.5)',
  ember: '#FF7A6B',
  emberDim: 'rgba(255,122,107,0.16)',

  shadow: 'rgba(0,0,0,0.72)',
  overlay: 'rgba(5,2,1,0.85)',

  skyTop: '#050201',
  skyBottom: '#1A0A03',
  scenery: 'rgba(72,32,12,0.9)',
  sceneryAlt: 'rgba(255,150,80,0.45)',

  celestial: 'rgba(255,218,168,0.95)',
  celestialGlow: 'rgba(255,140,60,0.16)',

  particle: 'rgba(255,242,224,0.9)',
  particleAlt: 'rgba(255,160,90,0.55)',
};

export const VERDANT: ThemeColors = {
  // Chemical and wrong. Something is growing in there.
  bg: '#040906',
  bgDeep: '#010403',
  surface: '#0C1710',
  surfaceRaised: '#132218',
  surfaceSunken: '#08110C',
  surfaceBorder: 'rgba(206,255,224,0.13)',
  surfaceBorderStrong: 'rgba(206,255,224,0.24)',

  textPrimary: '#E4FBEC',
  textSecondary: '#A5CCB2',
  textTertiary: '#7BA189',

  accent: '#5FE39B',
  accentBright: '#96F0C0',
  accentDim: 'rgba(95,227,155,0.18)',
  accentBorder: 'rgba(95,227,155,0.45)',
  onAccent: '#010403',

  patina: '#7FE0D2',
  patinaDim: 'rgba(127,224,210,0.18)',
  kindling: '#E8C860',
  kindlingDim: 'rgba(232,200,96,0.18)',
  kindlingBorder: 'rgba(232,200,96,0.5)',
  ember: '#FF8A72',
  emberDim: 'rgba(255,138,114,0.16)',

  shadow: 'rgba(0,0,0,0.72)',
  overlay: 'rgba(1,4,3,0.85)',

  skyTop: '#010403',
  skyBottom: '#08170F',
  scenery: 'rgba(16,58,36,0.9)',
  sceneryAlt: 'rgba(110,220,150,0.45)',

  celestial: 'rgba(216,255,232,0.95)',
  celestialGlow: 'rgba(90,220,150,0.16)',

  particle: 'rgba(240,255,246,0.9)',
  particleAlt: 'rgba(120,220,160,0.55)',
};

export const VIOLET: ThemeColors = {
  // The singularity. Magenta bleeding into indigo, the most unreal of the four.
  bg: '#08040E',
  bgDeep: '#030107',
  surface: '#150B23',
  surfaceRaised: '#1F1132',
  surfaceSunken: '#100819',
  surfaceBorder: 'rgba(240,216,255,0.13)',
  surfaceBorderStrong: 'rgba(240,216,255,0.24)',

  textPrimary: '#F6EAFF',
  textSecondary: '#C3ACD9',
  textTertiary: '#9C82B6',

  accent: '#C77DFF',
  accentBright: '#DFB0FF',
  accentDim: 'rgba(199,125,255,0.18)',
  accentBorder: 'rgba(199,125,255,0.45)',
  onAccent: '#030107',

  patina: '#64DCC0',
  patinaDim: 'rgba(100,220,192,0.18)',
  kindling: '#F0BC5C',
  kindlingDim: 'rgba(240,188,92,0.18)',
  kindlingBorder: 'rgba(240,188,92,0.5)',
  ember: '#FF7E92',
  emberDim: 'rgba(255,126,146,0.16)',

  shadow: 'rgba(0,0,0,0.72)',
  overlay: 'rgba(3,1,7,0.85)',

  skyTop: '#030107',
  skyBottom: '#170A28',
  scenery: 'rgba(56,20,84,0.9)',
  sceneryAlt: 'rgba(200,130,255,0.45)',

  celestial: 'rgba(248,228,255,0.95)',
  celestialGlow: 'rgba(180,110,255,0.16)',

  particle: 'rgba(252,244,255,0.9)',
  particleAlt: 'rgba(200,140,255,0.55)',
};
