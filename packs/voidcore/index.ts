// The Voidcore pack: a turning vortex that reacts to live signal.
//
// The only pack that reads `useMassetSignal()`. The host pushes `pulse` when
// its core is listening or answering, and `focus` from pointer or touch
// position; the vortex leans toward that point and the flow brightens and
// bends around it. Both are optional — with nothing pushed it simply turns.
//
// No Ambience: there is no licensed audio in the repo for this, so no
// expo-audio needed.

import { definePack } from '../../core/pack';

import { ABYSS, EMBER, FROST, VERDANT, VIOLET } from './palettes';
import { isVoid, VOIDS, VOID_LABELS, voidForDate, type Void } from './voids';
import { VoidOverlay } from './VoidOverlay';

export const voidcorePack = definePack<Void>({
  id: 'voidcore',
  variants: VOIDS,
  palettes: { abyss: ABYSS, frost: FROST, ember: EMBER, verdant: VERDANT, violet: VIOLET },
  // A void has no daylight variant.
  darkVariants: new Set<Void>(['abyss', 'frost', 'ember', 'verdant', 'violet']),
  labels: VOID_LABELS,
  defaultVariant: voidForDate,
  isVariant: isVoid,
  Background: VoidOverlay,

  // Harder edges than the weather packs — panels read as instrument housings
  // rather than paper.
  radius: { sm: 8, md: 10, lg: 14, xl: 18 },
  // And it answers fast.
  motion: { revealDurationMs: 200, entranceDurationMs: 220, shakeDurationMs: 260 },
});

export { ABYSS, EMBER, FROST, VERDANT, VIOLET } from './palettes';
export {
  filaments,
  isVoid,
  spiralPath,
  VOIDS,
  VOID_LABELS,
  voidForDate,
  type Filament,
  type FilamentOptions,
  type Void,
} from './voids';
export { VoidOverlay } from './VoidOverlay';
