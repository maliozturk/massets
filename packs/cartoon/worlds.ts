// The cartoon pack's variant model: four worlds, their names, and which one
// to open with. Pure — no colours, no react-native — so Node tooling and tests
// can read it.

import type { Locale, VariantLabel } from '../../core/pack';

export type World = 'jungle' | 'ocean' | 'space' | 'candy';

export const WORLDS: readonly World[] = ['jungle', 'ocean', 'space', 'candy'];

export const WORLD_LABELS: Record<Locale, Record<World, VariantLabel>> = {
  en: {
    jungle: { label: 'Jungle', blurb: 'Green canopy, spinning leaves, warm sun.' },
    ocean: { label: 'Ocean', blurb: 'Under the water with coral and rising bubbles.' },
    space: { label: 'Space', blurb: 'Stars, a planet and a friendly moon. Dark theme.' },
    candy: { label: 'Candy', blurb: 'Pink hills, gumdrops and falling sprinkles.' },
  },
  tr: {
    jungle: { label: 'Orman', blurb: 'Yeşil çatı, dönen yapraklar, ılık güneş.' },
    ocean: { label: 'Okyanus', blurb: 'Su altında mercanlar ve yükselen kabarcıklar.' },
    space: { label: 'Uzay', blurb: 'Yıldızlar, bir gezegen ve güler yüzlü ay. Koyu tema.' },
    candy: { label: 'Şeker', blurb: 'Pembe tepeler, sakızlar ve yağan şekerler.' },
  },
};

export function isWorld(value: unknown): value is World {
  return value === 'jungle' || value === 'ocean' || value === 'space' || value === 'candy';
}

/**
 * Which world to open with before anything is stored. Unlike the seasons pack,
 * there is no calendar to follow — so this rotates by day of the month, which
 * means a child meets a different world through the week rather than always
 * landing in the same one.
 */
export function worldForDate(date: Date): World {
  return WORLDS[date.getDate() % WORLDS.length];
}
