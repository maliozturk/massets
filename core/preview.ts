// What a pack tells the showroom about itself.
//
// The showroom generator runs in Node, so it can never import a pack's
// `index.ts` — that pulls in React components and react-native. Instead each
// pack ships a `preview.ts` alongside it: pure data and pure string-returning
// functions, describing the same worlds the Background component draws.
//
// This is a deliberate second description of the scenery, not an accident. The
// alternative is running React Native in Node to screenshot it, which is far
// more machinery than a design preview is worth. Keep the two roughly in step;
// the preview is for judging colour and composition, not pixel fidelity.

import type { Locale, VariantLabel } from './pack';
import type { RadiusScale, ThemeColors } from './tokens';

/** How the CSS preview animates this variant's particles. */
export type PreviewParticle = 'rain' | 'snow' | 'leaf' | 'bubble' | 'star' | 'sprinkle' | 'none';

export interface SceneryLayer {
  /** Inner SVG markup, given the palette. No <svg> wrapper — the showroom adds it. */
  svg(colors: ThemeColors): string;
  /** Height of the viewBox the markup was drawn against. */
  height: number;
  /** Width of the viewBox. Defaults to 400. */
  width?: number;
  anchor: 'top' | 'bottom';
}

export interface VariantPreview {
  scenery?: SceneryLayer[];
  particle?: PreviewParticle;
  particleCount?: number;
  /** Centre of the sun/moon, as a fraction of the stage. */
  celestial?: { x: number; y: number };
  /** Draw beads of water on the glass over everything (rain). */
  glass?: boolean;
}

/** Everything the showroom needs to render one pack, with no runtime imports. */
export interface PackPreview<V extends string = string> {
  /** Must match the pack's `id`. */
  id: string;
  title: string;
  /** One line on what the pack is for. */
  blurb: string;
  variants: readonly V[];
  palettes: Record<V, ThemeColors>;
  darkVariants: readonly V[];
  labels: Record<Locale, Record<V, VariantLabel>>;
  /** The pack's roundness overrides, so the UI mock shows its real shapes. */
  radius?: Partial<RadiusScale>;
  /** How the default variant is chosen, in words. Shown as a note. */
  defaultNote?: string;
  variantPreview: Record<V, VariantPreview>;
}

export function definePreview<V extends string>(preview: PackPreview<V>): PackPreview<V> {
  return preview;
}
