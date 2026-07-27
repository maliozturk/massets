// Showroom descriptor for the voidcore pack. Pure — mirrors VoidOverlay.tsx.
//
// This is the one pack whose preview is interactive: the showroom wires the
// stage's pointer position into the same `focus` the RN overlay consumes, and
// gives you a slider for `pulse`. Without that you cannot judge a theme whose
// whole point is that it reacts.

import { definePreview } from '../../core/preview';

import { ABYSS, EMBER, FROST, VERDANT, VIOLET } from './palettes';
import { VOIDS, VOID_LABELS, type Void } from './voids';

// Every variant is the same machine in a different colour, so they share one
// description.
const vortex = {
  particle: 'star' as const,
  particleCount: 90,
  celestialPulse: false as const,
  effects: ['void-vortex' as const, 'pointer-strike' as const],
};

export const voidcorePreview = definePreview<Void>({
  id: 'voidcore',
  title: 'Voidcore',
  blurb: 'A turning vortex that reacts to live signal — leans toward what you point at and throws lightning at it.',
  variants: VOIDS,
  palettes: { abyss: ABYSS, frost: FROST, ember: EMBER, verdant: VERDANT, violet: VIOLET },
  darkVariants: ['abyss', 'frost', 'ember', 'verdant', 'violet'],
  labels: VOID_LABELS,
  radius: { sm: 8, md: 10, lg: 14, xl: 18 },
  defaultNote: 'Rotates by day of the year. Hover the stage to make it strike; drag the slider to drive pulse.',
  variantPreview: {
    abyss: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    frost: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    ember: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    verdant: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    violet: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
  },
});
