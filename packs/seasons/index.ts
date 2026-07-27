// The Seasons pack: four weather-grounded variants, each with a living
// background and an ambient loop.

import { definePack } from '../../core/pack';

import { AmbientSound } from './AmbientSound';
import { BLOSSOM, MEADOW, RAIN, SNOW } from './palettes';
import { isSeason, SEASONS, SEASON_LABELS, seasonForMonth, type Season } from './seasons';
import { WeatherOverlay } from './WeatherOverlay';

export const seasonsPack = definePack<Season>({
  id: 'seasons',
  variants: SEASONS,
  palettes: { rain: RAIN, snow: SNOW, blossom: BLOSSOM, meadow: MEADOW },
  // Rain is the one night variant; the other three are daylight.
  darkVariants: new Set<Season>(['rain']),
  labels: SEASON_LABELS,
  defaultVariant: (now) => seasonForMonth(now.getMonth()),
  isVariant: isSeason,
  Background: WeatherOverlay,
  Ambience: AmbientSound,
});

export { BLOSSOM, MEADOW, RAIN, SNOW } from './palettes';
export { isSeason, SEASONS, SEASON_LABELS, seasonForMonth, type Season } from './seasons';
export { WeatherOverlay } from './WeatherOverlay';
export { AmbientSound } from './AmbientSound';
