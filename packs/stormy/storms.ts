// The stormy pack's variant model. One storm at four intensities, in order —
// the ordering is meaningful here in a way the seasons' was not, so keep it.
//
// Pure — no colours, no react-native — so Node tooling and tests can read it.

import type { Locale, VariantLabel } from '../../core/pack';

export type Storm = 'drizzle' | 'downpour' | 'thunder' | 'tempest';

/** Weakest to strongest. `STORMS.indexOf()` is a usable intensity index. */
export const STORMS: readonly Storm[] = ['drizzle', 'downpour', 'thunder', 'tempest'];

export const STORM_LABELS: Record<Locale, Record<Storm, VariantLabel>> = {
  en: {
    drizzle: { label: 'Drizzle', blurb: 'Overcast afternoon, fine rain, mist over the fields. Light theme.' },
    downpour: { label: 'Downpour', blurb: 'The sky opens. Water running down the glass in sheets.' },
    thunder: { label: 'Thunder', blurb: 'Forked lightning over the city, the dark lit from inside.' },
    tempest: { label: 'Tempest', blurb: 'Wind driving the rain sideways. Trees bending, spray off the sea.' },
  },
  tr: {
    drizzle: { label: 'Çisenti', blurb: 'Kapalı öğleden sonra, ince yağmur, tarlalarda sis. Açık tema.' },
    downpour: { label: 'Sağanak', blurb: 'Gökyüzü açılıyor. Cam boyunca akan sular.' },
    thunder: { label: 'Gök Gürültüsü', blurb: 'Şehrin üstünde çatallı şimşek, içeriden aydınlanan karanlık.' },
    tempest: { label: 'Fırtına', blurb: 'Rüzgâr yağmuru yan savuruyor. Eğilen ağaçlar, denizden serpinti.' },
  },
};

export function isStorm(value: unknown): value is Storm {
  return value === 'drizzle' || value === 'downpour' || value === 'thunder' || value === 'tempest';
}

/**
 * The storm builds through the day and peaks after dark — so opening the app
 * at different hours meets it at a different stage, rather than always the
 * same one.
 */
export function stormForHour(date: Date): Storm {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'drizzle';
  if (h >= 11 && h < 17) return 'downpour';
  if (h >= 17 && h < 22) return 'tempest';
  return 'thunder';
}

/** 0 for drizzle through 3 for tempest. Drives particle counts and angles. */
export function intensity(storm: Storm): number {
  return STORMS.indexOf(storm);
}
