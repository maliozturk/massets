// Showroom descriptor for the voidcore pack. Pure — mirrors VoidOverlay.tsx.
//
// This is the one pack whose preview is interactive: the showroom wires the
// stage's pointer position into the same `focus` the RN overlay consumes, and
// gives you a slider for `pulse`. Without that you cannot judge a theme whose
// whole point is that it reacts.
//
// It is also the one pack the showroom draws on a canvas rather than in CSS —
// the disc is thousands of hairline strokes accumulating additively into a
// buffer that is never cleared, which CSS cannot express at all. The RN
// overlay reaches the same composition with a few hundred SVG filaments; the
// preview is the fuller version of the same picture. The stage is square
// because the disc is face-on and concentric, and a portrait panel would leave
// a third of the frame dead below it.

import { definePreview } from '../../core/preview';

import { ABYSS, EMBER, FROST, VERDANT, VIOLET } from './palettes';
import { VOIDS, VOID_LABELS, type Void } from './voids';

// Every variant is the same machine in a different colour, so they share one
// description. No CSS particle field: the canvas draws its own star specks,
// and two starfields on one stage read as noise.
const vortex = {
  particle: 'none' as const,
  celestialPulse: false as const,
  effects: ['void-vortex' as const, 'pointer-strike' as const],
};

export const voidcorePreview = definePreview<Void>({
  id: 'voidcore',
  title: 'Voidcore',
  blurb:
    'A face-on disc of filaments on three spiral arms, lit from one side, reacting to live signal — it leans toward what you point at and the flow brightens where you stir it.',
  variants: VOIDS,
  palettes: { abyss: ABYSS, frost: FROST, ember: EMBER, verdant: VERDANT, violet: VIOLET },
  darkVariants: ['abyss', 'frost', 'ember', 'verdant', 'violet'],
  labels: VOID_LABELS,
  radius: { sm: 8, md: 10, lg: 14, xl: 18 },
  defaultNote: 'Rotates by day of the year. Move the pointer over the stage to stir it; drag the slider to drive pulse.',
  variantPreview: {
    abyss: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    frost: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    ember: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    verdant: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
    violet: { ...vortex, celestial: { x: 0.5, y: 0.42 } },
  },
});
