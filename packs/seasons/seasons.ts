// The season model: which variants exist, what to call them, and which one to
// show before the user has chosen. Pure — no colours, no react-native imports —
// so it stays testable from Node.

import type { Locale, VariantLabel } from '../../core/pack';

export type Season = 'rain' | 'snow' | 'blossom' | 'meadow';

export const SEASONS: readonly Season[] = ['rain', 'snow', 'blossom', 'meadow'];

export const SEASON_LABELS: Record<Locale, Record<Season, VariantLabel>> = {
  en: {
    rain: { label: 'Rain', blurb: 'Night city, rain on the glass. Dark theme.' },
    snow: { label: 'Snow', blurb: 'Winter morning, slow snowfall. Light theme.' },
    blossom: { label: 'Spring · Blossom', blurb: 'Sunrise hanami, drifting petals. Light theme.' },
    meadow: { label: 'Spring · Meadow', blurb: 'Golden field, floating leaves. Light theme.' },
  },
  tr: {
    rain: { label: 'Yağmur', blurb: 'Gece şehri, cama vuran yağmur. Koyu tema.' },
    snow: { label: 'Kar', blurb: 'Kış sabahı, ağır ağır yağan kar. Açık tema.' },
    blossom: { label: 'İlkbahar · Çiçek', blurb: 'Gün doğumu, savrulan taçyapraklar. Açık tema.' },
    meadow: { label: 'İlkbahar · Çayır', blurb: 'Altın rengi kır, uçuşan yapraklar. Açık tema.' },
  },
};

export function isSeason(value: unknown): value is Season {
  return value === 'rain' || value === 'snow' || value === 'blossom' || value === 'meadow';
}

/** Default season for a JS month index (0 = January). */
export function seasonForMonth(month: number): Season {
  if (month === 11 || month === 0 || month === 1) return 'snow';
  if (month >= 2 && month <= 4) return 'blossom';
  if (month >= 5 && month <= 7) return 'meadow';
  return 'rain';
}
