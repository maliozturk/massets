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
// Shared by the RN overlay and anything else that needs the same shapes.
// `rand` is injected everywhere so a caller can drive these from a seeded PRNG
// and get identical output.

/** One filament: a slice of a logarithmic spiral, already pulled off true. */
export interface Filament {
  /** SVG path data, in a `size` × `size` viewBox centred on its middle. */
  d: string;
  /** 0 at the band's outer edge, 1 at its inner. Drives tone and width. */
  t: number;
  /** Radius of the filament's midpoint, as a fraction of half the viewBox. */
  rn: number;
  /** Arm density at the filament's midpoint, 0–1. 1 when no arms were asked for. */
  arm: number;
}

export interface FilamentOptions {
  count: number;
  /** The band this layer occupies, as fractions of half the viewBox. */
  rInner: number;
  rOuter: number;
  /** How far around each filament runs, in radians. */
  span: number;
  /** Log-spiral tightness in r = a·e^(b·θ). 0.15–0.25 keeps the sweep readable. */
  b: number;
  /** Points per filament. More is smoother and costs render time. */
  steps: number;
  /** Slow wobble that bends the whole filament, as a fraction of its radius. */
  meso: number;
  /** Per-point jitter, in viewBox units. */
  micro: number;
  size: number;
  /**
   * Spiral-arm density wave, `0.5 + 0.5·sin(m·θ − k·ln r)`. Seen face-on the
   * winding is the subject, and without this the band is a uniform smear.
   * `m` is the arm count; `k` sets how far they wind — `m/k` is the arms' own
   * spiral tightness, so k ≈ 3m gives an open, legible sweep.
   */
  arms?: { m: number; k: number };
  rand: () => number;
}

/**
 * A band of filaments on logarithmic spirals.
 *
 * Every filament gets its own `a` in r = a·e^(b·θ), fixed by where it happens
 * to sit, so the band is a thousand different spirals rather than one curve
 * drawn a hundred times. Two scales of displacement sit on top — a slow bend
 * across the whole filament and per-point jitter under it — because a clean
 * arc reads as geometry, not as matter.
 */
export function filaments(o: FilamentOptions): Filament[] {
  const c = o.size / 2;
  const half = o.size / 2;
  const out: Filament[] = [];

  for (let i = 0; i < o.count; i++) {
    // Square-rooted so the band fills by area instead of crowding its inner edge.
    const u = Math.sqrt(o.rand());
    const rFrac = o.rInner + (o.rOuter - o.rInner) * u;
    const rMid = rFrac * half;
    const th0 = o.rand() * Math.PI * 2;
    const a = rMid / Math.exp(o.b * th0);
    const arm = o.arms ? 0.5 + 0.5 * Math.sin(o.arms.m * th0 - o.arms.k * Math.log(rFrac)) : 1;

    const w1 = 0.7 + o.rand() * 1.6;
    const w2 = 2.3 + o.rand() * 3.1;
    const p1 = o.rand() * Math.PI * 2;
    const p2 = o.rand() * Math.PI * 2;
    const amp = o.meso * (0.6 + o.rand() * 0.8);

    const pts: string[] = [];
    for (let s = 0; s <= o.steps; s++) {
      const th = th0 + (s / o.steps - 0.5) * o.span;
      const wobble = 1 + amp * (Math.sin(th * w1 + p1) + 0.55 * Math.sin(th * w2 + p2)) * 0.7;
      const r = a * Math.exp(o.b * th) * wobble;
      const jx = (o.rand() - 0.5) * 2 * o.micro;
      const jy = (o.rand() - 0.5) * 2 * o.micro;
      pts.push(`${(c + Math.cos(th) * r + jx).toFixed(1)},${(c + Math.sin(th) * r + jy).toFixed(1)}`);
    }
    out.push({ d: `M${pts.join('L')}`, t: 1 - u, rn: rFrac, arm });
  }

  return out;
}

/**
 * Points along a logarithmic spiral falling inward, as [x, y] offsets from the
 * centre. Used for dust motes: interpolating a transform through these reads
 * as matter being pulled down the throat.
 */
export function spiralPath(
  startRadius: number,
  turns: number,
  steps: number,
  startAngle: number,
  /** Where the fall stops. Give it the core radius so dust does not cross the hole. */
  endRadius = 0
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + t * turns * Math.PI * 2;
    // Ease the radius so it lingers out wide and then accelerates in.
    const r = endRadius + (startRadius - endRadius) * Math.pow(1 - t, 1.7);
    out.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return out;
}
