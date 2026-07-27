// The Stormy pack: one storm at four escalating intensities.
//
// Where the seasons pack's `rain` is a calm rainy night, this is the weather
// itself as the subject. Shapes stay on the core defaults — a storm theme has
// no reason to round its corners off, and it should sit naturally beside
// seasons.
//
// No Ambience yet: there is no licensed storm loop in the repo, and inventing
// audio is not a theme pack's job. The user has a storm-wind recording in
// research_vault/sounds/ that could be built into one with `npm run sounds`
// if they want it. That also means this pack needs no expo-audio.

import { definePack } from '../../core/pack';

import { DOWNPOUR, DRIZZLE, TEMPEST, THUNDER } from './palettes';
import { isStorm, STORMS, STORM_LABELS, stormForHour, type Storm } from './storms';
import { StormOverlay } from './StormOverlay';

export const stormyPack = definePack<Storm>({
  id: 'stormy',
  variants: STORMS,
  palettes: { drizzle: DRIZZLE, downpour: DOWNPOUR, thunder: THUNDER, tempest: TEMPEST },
  // Only the overcast afternoon is light; the storm darkens from there.
  darkVariants: new Set<Storm>(['downpour', 'thunder', 'tempest']),
  labels: STORM_LABELS,
  defaultVariant: stormForHour,
  isVariant: isStorm,
  Background: StormOverlay,
  // Motion is a touch quicker than the seasons' drift — weather with weight.
  motion: { revealDurationMs: 260, entranceDurationMs: 280 },
});

export { DOWNPOUR, DRIZZLE, TEMPEST, THUNDER } from './palettes';
export { intensity, isStorm, STORMS, STORM_LABELS, stormForHour, type Storm } from './storms';
export { StormOverlay } from './StormOverlay';
