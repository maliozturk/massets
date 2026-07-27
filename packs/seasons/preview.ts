// Showroom descriptor for the seasons pack. Pure — read from Node by
// tools/showroom.ts. Mirrors WeatherOverlay.tsx; see core/preview.ts on why
// the scenery is described twice.

import { definePreview } from '../../core/preview';
import type { ThemeColors } from '../../core/tokens';

import { BLOSSOM, MEADOW, RAIN, SNOW } from './palettes';
import { SEASONS, SEASON_LABELS, type Season } from './seasons';

const skyline = (c: ThemeColors) =>
  `<path d="M 0 120 L 0 70 L 34 70 L 34 44 L 62 44 L 62 78 L 96 78 L 96 30 L 130 30 L 130 66 L 158 66 L 158 52 L 196 52 L 196 82 L 232 82 L 232 24 L 262 24 L 262 60 L 300 60 L 300 44 L 330 44 L 330 74 L 368 74 L 368 56 L 400 56 L 400 120 Z" fill="${c.scenery}"/>` +
  [[104, 40], [116, 54], [240, 34], [252, 48], [270, 68], [40, 54], [308, 52], [338, 82], [170, 60]]
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="7" rx="1" fill="${c.sceneryAlt}"/>`)
    .join('');

const snowdrifts = (c: ThemeColors) =>
  `<path d="M 60 62 L 76 26 L 92 62 Z M 68 46 L 76 30 L 84 46 Z" fill="${c.sceneryAlt}"/>` +
  `<path d="M 322 58 L 336 30 L 350 58 Z" fill="${c.sceneryAlt}"/>` +
  `<path d="M 0 84 Q 100 44 200 74 T 400 64 L 400 110 L 0 110 Z" fill="${c.sceneryAlt}"/>` +
  `<path d="M 0 92 Q 120 62 240 88 T 400 82 L 400 110 L 0 110 Z" fill="${c.scenery}"/>`;

const cherryBranch = (c: ThemeColors) =>
  `<path d="M 400 6 C 330 14 280 30 236 62 M 400 6 C 344 34 318 52 296 88 M 316 40 C 300 58 292 74 288 96 M 260 48 C 250 62 246 74 244 88" stroke="${c.scenery}" stroke-width="7" stroke-linecap="round" fill="none"/>` +
  [[236, 62, 11], [252, 52, 8], [270, 44, 10], [296, 88, 10], [306, 74, 8], [288, 96, 8], [318, 56, 9], [244, 88, 8], [252, 76, 6], [340, 36, 9], [356, 26, 7], [280, 58, 7]]
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.sceneryAlt}"/>`)
    .join('');

const grassField = (c: ThemeColors) => {
  const blades = Array.from({ length: 26 }, (_, i) => {
    const bx = 4 + i * 15.5;
    const h = 26 + ((i * 37) % 30);
    const lean = ((i * 53) % 17) - 8;
    return `M ${bx} 90 Q ${bx + lean * 0.4} ${90 - h * 0.6} ${bx + lean} ${90 - h}`;
  }).join(' ');
  return (
    `<path d="${blades}" stroke="${c.scenery}" stroke-width="3" stroke-linecap="round" fill="none"/>` +
    [[38, 42], [102, 34], [178, 46], [251, 36], [322, 44], [376, 38]]
      .map(([cx, cy], i) => `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${i % 2 === 0 ? c.sceneryAlt : c.particle}"/>`)
      .join('')
  );
};

export const seasonsPreview = definePreview<Season>({
  id: 'seasons',
  title: 'Seasons',
  blurb: 'Four weather-grounded worlds. Rain is the dark one; the rest are daylight.',
  variants: SEASONS,
  palettes: { rain: RAIN, snow: SNOW, blossom: BLOSSOM, meadow: MEADOW },
  darkVariants: ['rain'],
  labels: SEASON_LABELS,
  defaultNote: 'Opens on the season matching the real month.',
  variantPreview: {
    rain: {
      scenery: [{ svg: skyline, height: 120, anchor: 'bottom' }],
      particle: 'rain',
      particleCount: 40,
      celestial: { x: 0.78, y: 0.1 },
      glass: true,
    },
    snow: {
      scenery: [{ svg: snowdrifts, height: 110, anchor: 'bottom' }],
      particle: 'snow',
      particleCount: 26,
      celestial: { x: 0.74, y: 0.12 },
    },
    blossom: {
      scenery: [{ svg: cherryBranch, height: 150, anchor: 'top' }],
      particle: 'leaf',
      particleCount: 16,
      celestial: { x: 0.24, y: 0.2 },
    },
    meadow: {
      scenery: [{ svg: grassField, height: 90, anchor: 'bottom' }],
      particle: 'leaf',
      particleCount: 14,
      celestial: { x: 0.72, y: 0.16 },
    },
  },
});
