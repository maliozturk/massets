// Showroom descriptor for the stormy pack. Pure — mirrors StormOverlay.tsx.

import { definePreview } from '../../core/preview';
import type { ThemeColors } from '../../core/tokens';

import { DOWNPOUR, DRIZZLE, TEMPEST, THUNDER } from './palettes';
import { STORMS, STORM_LABELS, type Storm } from './storms';

const wetFields = (c: ThemeColors) =>
  `<path d="M 0 104 L 0 62 Q 90 34 180 60 Q 280 30 400 58 L 400 104 Z" fill="${c.scenery}"/>` +
  [36, 78, 120, 162, 204]
    .map((x, i) => `<rect x="${x}" y="${66 - i * 2}" width="3" height="${22 + i}" rx="1" fill="${c.sceneryAlt}"/>`)
    .join('') +
  `<path d="M 236 96 Q 290 90 344 96 Q 290 102 236 96 Z" fill="${c.sceneryAlt}" opacity="0.55"/>`;

const wetStreet = (c: ThemeColors) =>
  `<path d="M 0 126 L 0 74 L 44 74 L 44 40 L 92 40 L 92 84 L 140 84 L 140 26 L 196 26 L 196 68 L 244 68 L 244 48 L 300 48 L 300 90 L 348 90 L 348 58 L 400 58 L 400 126 Z" fill="${c.scenery}"/>` +
  [[58, 54], [70, 66], [152, 40], [166, 58], [208, 82], [260, 62], [312, 100], [360, 74]]
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="6" height="8" rx="1" fill="${c.sceneryAlt}"/>`)
    .join('');

const cloudBank = (c: ThemeColors) =>
  `<path d="M 0 0 L 400 0 L 400 52 Q 366 92 320 66 Q 280 100 236 70 Q 196 104 154 72 Q 112 100 72 68 Q 34 92 0 58 Z" fill="${c.scenery}"/>`;

const stormCity = (c: ThemeColors) =>
  `<path d="M 0 132 L 0 84 L 38 84 L 38 46 L 74 46 L 74 96 L 118 96 L 118 20 L 158 20 L 158 72 L 200 72 L 200 54 L 248 54 L 248 92 L 292 92 L 292 34 L 336 34 L 336 78 L 400 78 L 400 132 Z" fill="${c.scenery}"/>` +
  [[128, 34], [140, 52], [306, 48], [318, 66], [50, 60], [212, 68]]
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="7" rx="1" fill="${c.sceneryAlt}"/>`)
    .join('');

const bentTrees = (c: ThemeColors) =>
  `<path d="M 0 140 L 0 104 Q 60 84 120 102 Q 190 78 260 100 Q 330 80 400 100 L 400 140 Z" fill="${c.scenery}"/>` +
  `<path d="M 84 140 Q 76 96 44 74" stroke="${c.scenery}" stroke-width="7" stroke-linecap="round" fill="none"/>` +
  `<path d="M 60 88 Q 34 78 20 62 M 66 100 Q 40 96 24 86" stroke="${c.sceneryAlt}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
  `<path d="M 322 140 Q 316 104 292 88" stroke="${c.scenery}" stroke-width="6" stroke-linecap="round" fill="none"/>` +
  `<path d="M 304 98 Q 282 90 270 78" stroke="${c.sceneryAlt}" stroke-width="4" stroke-linecap="round" fill="none"/>` +
  [[168, 116, 5], [214, 122, 4], [258, 118, 5.5]]
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.sceneryAlt}" opacity="0.6"/>`)
    .join('');

export const stormyPreview = definePreview<Storm>({
  id: 'stormy',
  title: 'Stormy',
  blurb: 'One storm at four intensities. Drizzle is the only light variant; it darkens from there.',
  variants: STORMS,
  palettes: { drizzle: DRIZZLE, downpour: DOWNPOUR, thunder: THUNDER, tempest: TEMPEST },
  darkVariants: ['downpour', 'thunder', 'tempest'],
  labels: STORM_LABELS,
  defaultNote: 'The storm builds through the day and peaks after dark.',
  variantPreview: {
    drizzle: {
      scenery: [{ svg: wetFields, height: 104, anchor: 'bottom', sway: 0.5, swaySeconds: 6.4 }],
      particle: 'rain',
      particleCount: 30,
      particleAngle: 4,
      particleSpeed: 2.4,
      celestial: { x: 0.7, y: 0.13 },
      effects: ['mist', 'puddle-ripples'],
    },
    downpour: {
      scenery: [{ svg: wetStreet, height: 126, anchor: 'bottom' }],
      particle: 'rain',
      particleCount: 68,
      particleAngle: 13,
      particleSpeed: 0.85,
      celestial: { x: 0.66, y: 0.11 },
      effects: ['water-sheets'],
    },
    thunder: {
      scenery: [
        { svg: cloudBank, height: 120, anchor: 'top', sway: 0.5, swaySeconds: 7.6 },
        { svg: stormCity, height: 132, anchor: 'bottom' },
      ],
      particle: 'rain',
      particleCount: 60,
      particleAngle: 11,
      particleSpeed: 1,
      celestial: { x: 0.3, y: 0.1 },
      effects: ['forked-lightning'],
    },
    tempest: {
      scenery: [{ svg: bentTrees, height: 140, anchor: 'bottom', sway: 2.6, swaySeconds: 2.4 }],
      particle: 'rain',
      particleCount: 84,
      particleAngle: 34,
      particleSpeed: 0.62,
      celestial: { x: 0.76, y: 0.09 },
      effects: ['spray'],
    },
  },
});
