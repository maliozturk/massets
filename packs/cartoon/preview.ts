// Showroom descriptor for the cartoon pack. Pure — mirrors CartoonOverlay.tsx.

import { definePreview } from '../../core/preview';
import type { ThemeColors } from '../../core/tokens';

import { CANDY, JUNGLE, OCEAN, SPACE } from './palettes';
import { WORLDS, WORLD_LABELS, type World } from './worlds';

const canopy = (c: ThemeColors) =>
  `<path d="M 0 0 L 400 0 L 400 44 Q 372 78 344 46 Q 316 86 286 50 Q 258 92 228 52 Q 198 84 170 48 Q 140 88 112 50 Q 84 80 56 46 Q 28 76 0 42 Z" fill="${c.scenery}"/>` +
  [[42, 60], [128, 66], [214, 64], [300, 62], [368, 56]]
    .map(([cx, cy]) => `<ellipse cx="${cx}" cy="${cy}" rx="17" ry="10" fill="${c.sceneryAlt}" opacity="0.8"/>`)
    .join('');

const undergrowth = (c: ThemeColors) =>
  `<path d="M 0 92 L 0 58 Q 40 22 80 58 Q 120 20 160 58 Q 200 24 240 58 Q 280 18 320 58 Q 360 26 400 58 L 400 92 Z" fill="${c.scenery}"/>` +
  [[62, 50], [186, 48], [306, 52]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7" fill="${c.sceneryAlt}"/>`).join('');

const seabed = (c: ThemeColors) =>
  `<path d="M 70 110 L 70 74 M 70 86 L 54 68 M 70 86 L 86 68 M 70 74 L 60 58 M 70 74 L 82 58" stroke="${c.sceneryAlt}" stroke-width="6" stroke-linecap="round" fill="none"/>` +
  `<path d="M 318 110 L 318 80 M 318 92 L 302 74 M 318 92 L 334 74" stroke="${c.sceneryAlt}" stroke-width="6" stroke-linecap="round" fill="none"/>` +
  `<path d="M 0 124 L 0 96 Q 70 74 140 98 Q 210 72 280 96 Q 340 78 400 98 L 400 124 Z" fill="${c.scenery}"/>` +
  [[168, 108, 6], [232, 112, 4.5], [96, 112, 5]]
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.sceneryAlt}" opacity="0.75"/>`)
    .join('');

const planet = (c: ThemeColors) =>
  `<path d="M -40 130 Q 200 24 440 130 Z" fill="${c.scenery}"/>` +
  [[120, 86, 11], [214, 70, 8], [292, 92, 13], [64, 112, 7]]
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.sceneryAlt}" opacity="0.5"/>`)
    .join('');

const candyHills = (c: ThemeColors) =>
  `<path d="M 0 116 L 0 78 Q 66 40 132 78 Q 200 38 268 78 Q 334 42 400 76 L 400 116 Z" fill="${c.scenery}"/>` +
  [[54, 70], [150, 68], [246, 70], [340, 66]]
    .map(
      ([cx, cy]) =>
        `<path d="M ${cx - 13} ${cy + 13} Q ${cx - 13} ${cy - 11} ${cx} ${cy - 11} Q ${cx + 13} ${cy - 11} ${cx + 13} ${cy + 13} Z" fill="${c.sceneryAlt}"/>`
    )
    .join('') +
  `<rect x="0" y="104" width="400" height="12" fill="${c.sceneryAlt}" opacity="0.5"/>`;

export const cartoonPreview = definePreview<World>({
  id: 'cartoon',
  title: 'Cartoon',
  blurb: 'Four bright worlds for children. Saturated, flat, high contrast — Space is the dark one.',
  variants: WORLDS,
  palettes: { jungle: JUNGLE, ocean: OCEAN, space: SPACE, candy: CANDY },
  darkVariants: ['space'],
  labels: WORLD_LABELS,
  radius: { sm: 16, md: 22, lg: 30, xl: 38 },
  defaultNote: 'Rotates by day of the month, so the same world is not always waiting.',
  variantPreview: {
    jungle: {
      scenery: [
        { svg: canopy, height: 130, anchor: 'top' },
        { svg: undergrowth, height: 92, anchor: 'bottom' },
      ],
      particle: 'leaf',
      particleCount: 16,
      celestial: { x: 0.76, y: 0.11 },
    },
    ocean: {
      scenery: [{ svg: seabed, height: 124, anchor: 'bottom' }],
      particle: 'bubble',
      particleCount: 22,
      celestial: { x: 0.5, y: 0.06 },
    },
    space: {
      scenery: [{ svg: planet, height: 130, anchor: 'bottom' }],
      particle: 'star',
      particleCount: 46,
      celestial: { x: 0.24, y: 0.13 },
    },
    candy: {
      scenery: [{ svg: candyHills, height: 116, anchor: 'bottom' }],
      particle: 'sprinkle',
      particleCount: 20,
      celestial: { x: 0.74, y: 0.13 },
    },
  },
});
