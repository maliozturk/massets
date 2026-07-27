// The Cartoon pack: four worlds, each with its own living background.
//
// No Ambience — there are no licensed loops for these worlds, and inventing
// audio is not something a theme pack should do. That also means a consuming
// app needs no expo-audio for this pack.

import { definePack } from '../../core/pack';

import { CartoonOverlay } from './CartoonOverlay';
import { CANDY, JUNGLE, OCEAN, SPACE } from './palettes';
import { isWorld, WORLDS, WORLD_LABELS, worldForDate, type World } from './worlds';

export const cartoonPack = definePack<World>({
  id: 'cartoon',
  variants: WORLDS,
  palettes: { jungle: JUNGLE, ocean: OCEAN, space: SPACE, candy: CANDY },
  // Space is the one night world.
  darkVariants: new Set<World>(['space']),
  labels: WORLD_LABELS,
  defaultVariant: worldForDate,
  isVariant: isWorld,
  Background: CartoonOverlay,

  // Cartoon shapes are round. The default 10/14/20/26 reads as a document UI;
  // these push cards and panels toward capsules, which is most of what makes
  // the pack feel like a toy rather than a recoloured tool.
  radius: { sm: 16, md: 22, lg: 30, xl: 38 },
  // And it moves with more snap than the seasons' slow drift.
  motion: { revealDurationMs: 240, entranceDurationMs: 260, shakeDurationMs: 300 },
});

export { CANDY, JUNGLE, OCEAN, SPACE } from './palettes';
export { isWorld, WORLDS, WORLD_LABELS, worldForDate, type World } from './worlds';
export { CartoonOverlay } from './CartoonOverlay';
