// The voidcore pack's variant model, plus the geometry helpers the overlay
// and the showroom both need. Pure — no colours, no react-native — so Node
// tooling and tests can read it.

import type { Locale, VariantLabel } from '../../core/pack';

export type Void = 'abyss' | 'frost' | 'ember' | 'verdant' | 'violet';

/** Abyss anchors it; Frost and Ember are the opposed pair; two more fill it out. */
export const VOIDS: readonly Void[] = ['abyss', 'frost', 'ember', 'verdant', 'violet'];

export const VOID_LABELS: Record<Locale, Record<Void, VariantLabel>> = {
  en: {
    abyss: { label: 'Abyss', blurb: 'Vast and unlit. Steel and navy, light bent around what gives none back.' },
    frost: { label: 'Frost', blurb: 'Ice. Cold cyan-white light creeping across black glass.' },
    ember: { label: 'Ember', blurb: 'Fire. A dying star going down the drain — iron, ash and heat.' },
    verdant: { label: 'Verdant', blurb: 'Chemical and wrong. Something is growing in there.' },
    violet: { label: 'Violet', blurb: 'The singularity. Magenta bleeding into indigo.' },
  },
  tr: {
    abyss: { label: 'Uçurum', blurb: 'Uçsuz bucaksız ve ışıksız. Çelik ve lacivert.' },
    frost: { label: 'Buz', blurb: 'Buz. Siyah camda ilerleyen soğuk camgöbeği-beyaz ışık.' },
    ember: { label: 'Kor', blurb: 'Ateş. Girdaba düşen ölmekte olan bir yıldız — demir, kül ve ısı.' },
    verdant: { label: 'Yeşil', blurb: 'Kimyasal ve yanlış. İçeride bir şey büyüyor.' },
    violet: { label: 'Mor', blurb: 'Tekillik. İndigoya karışan macenta.' },
  },
};

export function isVoid(value: unknown): value is Void {
  return (
    value === 'abyss' || value === 'frost' || value === 'ember' || value === 'verdant' || value === 'violet'
  );
}

/** Rotates by day of the year — no calendar or clock story fits a void. */
export function voidForDate(date: Date): Void {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return VOIDS[dayOfYear % VOIDS.length];
}

// --- Geometry --------------------------------------------------------------
// Shared by the RN overlay and the showroom generator so the two stay honest
// about the same shapes.

/**
 * A jagged lightning path as SVG polyline points, from (0,0) to (length,0)
 * along the +x axis — the caller rotates it into place.
 *
 * `rand` is injected so the showroom can generate the identical bolt from a
 * seeded PRNG and keep its output deterministic.
 */
export function boltPoints(length: number, segments: number, spread: number, rand: () => number): string {
  const pts: string[] = ['0,0'];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // Deviation is widest in the middle and pinches to nothing at both ends,
    // so the bolt actually connects to its source and its target.
    const taper = Math.sin(t * Math.PI);
    const x = t * length;
    const y = (rand() - 0.5) * 2 * spread * taper;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  pts.push(`${length.toFixed(1)},0`);
  return pts.join(' ');
}

/** A shorter fork branching off the main bolt partway along it. */
export function forkPoints(length: number, startAt: number, angleDeg: number, rand: () => number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const x0 = length * startAt;
  const len = length * (0.18 + rand() * 0.22);
  const pts: string[] = [`${x0.toFixed(1)},0`];
  const steps = 3;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jitter = (rand() - 0.5) * 10 * (1 - t);
    pts.push(`${(x0 + Math.cos(rad) * len * t + jitter).toFixed(1)},${(Math.sin(rad) * len * t + jitter).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * Points along a logarithmic spiral falling inward, as [x, y] offsets from the
 * centre. Used for dust motes: interpolating a transform through these reads
 * as matter being pulled down the throat.
 */
export function spiralPath(startRadius: number, turns: number, steps: number, startAngle: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + t * turns * Math.PI * 2;
    // Ease the radius so it lingers out wide and then accelerates in.
    const r = startRadius * Math.pow(1 - t, 1.7);
    out.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return out;
}
