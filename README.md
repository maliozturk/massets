# MASSETS

Shared theme store for the `android_apps` family. Palettes, tokens, themed
primitives, hand-drawn icons, living animated backgrounds and ambient audio —
developed here, consumed by apps as a git submodule.

Themes are **improved in MASSETS**, never in a consuming app. An app that edits
its `masset/` copy has forked the store.

```
MASSETS/
  core/                 pack-agnostic — works with any theme pack
    tokens.ts             ThemeColors contract, spacing, radius, motion, fontFamily
    typography.ts         text styles, rebuilt per palette
    pack.ts               what a theme pack is; the storage interface
    provider.tsx          MassetProvider, useMasset, useMassetStyles
    primitives.tsx        Card, Button, Chip, Eyebrow, EmptyState, IconButton, Spinner
    icons.tsx             19 hand-drawn 24px stroke icons
    FadeIn.tsx            the calm reveal
    fonts.ts              fontsToLoad for expo-font
    animation.ts          useLoop / pivotRotate — the shared motion vocabulary
    preview.ts            what a pack tells the showroom (pure, Node-readable)
  packs/
    seasons/              Rain · Snow · Blossom · Meadow
      palettes.ts           the four palettes
      seasons.ts            variant model, month default, EN/TR labels
      WeatherOverlay.tsx    sky, sun/moon, scenery, particles, rain-on-glass
      AmbientSound.tsx      per-season looping ambience
      assets/sounds/        the four loops
      preview.ts            showroom descriptor
    cartoon/              Jungle · Ocean · Space · Candy
      palettes.ts           four bright worlds, Space is the dark one
      worlds.ts             variant model, day-rotating default, EN/TR labels
      CartoonOverlay.tsx    per-world sky, scenery and particles
      preview.ts            showroom descriptor
  showroom/index.html   generated preview — see below
  tools/showroom.ts     the generator
```

### The packs

| Pack | Variants | Dark | Ambience | Notes |
|---|---|---|---|---|
| `seasons` | rain · snow · blossom · meadow | rain | yes | Opens on the season matching the real month |
| `stormy` | drizzle · downpour · thunder · tempest | all but drizzle | no | One storm at four intensities; builds through the day |
| `cartoon` | jungle · ocean · space · candy | space | no | Rounder shapes, snappier motion; rotates by day of month |

Only `seasons` ships ambience, so `expo-audio` is optional for the other two.
`stormy` is the escalation of `seasons`' calm `rain`: `intensity()` grades the
rain denser, faster and more slanted at each stage, and every stage owns a
motion the others lack — drifting mist and puddle rings, water running down
the glass, forked lightning, then spray driven flat by the wind.

## Using it in an app

**1. Add the submodule inside the app root.** It must live inside — Metro
cannot resolve imports above the project root.

```bash
cd <app>
git submodule add git@github.com:maliozturk/massets.git masset
git commit -m "Add MASSETS theme store"
```

**2. Install the peer dependencies** with `expo install`, so each app gets
versions matching its own SDK. Never copy MASSETS' own pins.

```bash
npx expo install expo-linear-gradient expo-audio expo-font react-native-svg \
  @expo-google-fonts/space-grotesk @expo-google-fonts/manrope @expo-google-fonts/jetbrains-mono
```

`expo install` also adds `expo-audio` and `expo-font` to `plugins` in the app's
`app.json`. Keep them — they are config plugins the native build needs. (If you
skip the pack's `Ambience`, `expo-audio` is optional.)

**3. Provide storage and mount the provider.** MASSETS has no storage
dependency; you inject one. Anything with `getItem` / `setItem` works —
AsyncStorage satisfies it as-is.

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { MassetProvider, MassetBackground, MassetAmbience, fontsToLoad } from './masset/core';
import { seasonsPack } from './masset/packs/seasons';

export default function App() {
  const [fontsReady] = useFonts(fontsToLoad);
  if (!fontsReady) return null;

  return (
    <MassetProvider pack={seasonsPack} storage={AsyncStorage} locale="tr">
      <MassetBackground />
      <MassetAmbience />
      <YourApp />
    </MassetProvider>
  );
}
```

For a SQLite-backed settings table, wrap it:

```ts
const storage = {
  getItem: (key: string) => getSetting(key),
  setItem: async (key: string, value: string) => { await setSetting(key, value); },
};
```

**4. Read the theme.** Style factories go at module scope so the memo key stays
stable.

```tsx
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});

function Screen() {
  const { colors, typography, variant, setVariant, labels } = useMasset<Season>();
  const styles = useMassetStyles(makeStyles);
  return <View style={styles.screen}><Text style={typography.title}>…</Text></View>;
}
```

### Keeping an existing app's saved theme

If the app already persists a theme under its own key names, pass them so
existing installs don't reset to the month default:

```tsx
<MassetProvider … storageKeys={{ variant: 'season', sound: 'ambient_sound' }} />
```

### Updating to a newer MASSETS

```bash
cd <app>/masset && git pull origin master
cd .. && git add masset && git commit -m "Bump MASSETS"
```

## The showroom

```bash
npm run showroom     # regenerate, then open showroom/index.html
```

Every variant rendered from the **real palette source** — it compiles and
imports `packs/*/palettes.ts` rather than restating colours, so it cannot drift.
It gives you, per variant:

- the living background as a CSS approximation, so you can judge sky/scenery/
  particle tokens without launching an app,
- a UI mock (buttons, chips, pills, card, type specimen) at the primitives'
  real sizes and radii,
- every token as a swatch with its name and value,
- **a WCAG contrast audit** of the pairs that actually occur in the primitives —
  tint flattened over panel, text on top. This is the fastest way to catch a
  new pack that will be unreadable on a phone in daylight.

Output is deterministic (seeded particle field), so regenerating without a
palette change produces an empty diff.

## Writing a new pack

Copy `packs/seasons/` as a starting point. A pack must export a `ThemePack`:

```ts
export const duskPack = definePack<Dusk>({
  id: 'dusk',                        // stable — it is the storage key prefix
  variants: ['ember', 'indigo'],
  palettes: { ember: EMBER, indigo: INDIGO },
  darkVariants: new Set(['indigo']),
  labels: { en: {…}, tr: {…} },
  defaultVariant: (now) => (now.getHours() < 18 ? 'ember' : 'indigo'),
  isVariant: (v): v is Dusk => v === 'ember' || v === 'indigo',
  Background: DuskOverlay,           // optional
  Ambience: DuskSound,               // optional
});
```

**Make it live.** A background that only drops particles reads as wallpaper.
Build motion from `core/animation.ts`:

```ts
const breath = useLoop({ duration: 4200 });                       // 0→1→0, a sway or pulse
const trip   = useLoop({ duration: 1100, reverse: false,          // 0→1, snap back
                         restAfterMs: 8200 });                    // ...and then wait
<Animated.View style={{ transform: pivotRotate(rotate, h, 'top') }} />  // hinge on an edge
```

Native driver everywhere, so **transform and opacity only** — animating colour,
width or borderRadius drops to the JS thread and stutters. Give each variant a
motion the others lack; the four cartoon worlds have swinging vines, sweeping
light shafts, a rare shooting star and bouncing gumdrops respectively.

`Background` and `Ambience` are optional — a pack with no scenery just needs
colours, and then it needs no `expo-linear-gradient` or `expo-audio` either.
Point its environment tokens at its own grounds. (`react-native-svg` is still
required regardless: the icon set is SVG.)

**Shape and motion are optional too.** A pack that wants its own feel rather
than just its own colours can override roundness and timings; anything omitted
keeps the core value, so the seasons pack is unaffected:

```ts
  radius: { sm: 16, md: 22, lg: 30, xl: 38 },   // cartoon: near-capsule
  motion: { revealDurationMs: 240 },            // and snappier
```

Primitives read these through `useMassetStyles((colors, { radius }) => …)`. A
factory declared as `(colors) => …` is still valid and simply ignores the
second argument.

### Showing it in the showroom

The generator runs in **Node**, so it can never import your pack's `index.ts` —
that pulls in React components. Each pack therefore ships a pure `preview.ts`
describing the same worlds as plain data and string-returning functions:

```ts
export const duskPreview = definePreview<Dusk>({
  id: 'dusk', title: 'Dusk', blurb: '…',
  variants: DUSKS, palettes: {…}, darkVariants: ['indigo'], labels: DUSK_LABELS,
  radius: { lg: 30 },
  variantPreview: {
    ember: { scenery: [{ svg: (c) => `<path … fill="${c.scenery}"/>`, height: 120, anchor: 'bottom' }],
             particle: 'leaf', particleCount: 16, celestial: { x: 0.7, y: 0.12 } },
    …
  },
});
```

Add it to the `PACKS` array at the top of `tools/showroom.ts` — one line — then
`npm run showroom`.

## Compatibility

MASSETS targets **Expo SDK 54 and 57**, because the apps that consume it are
split across both and their SDKs are pinned for Expo Go compatibility. Adopting
a theme must never force an SDK upgrade.

Its own devDependencies are pinned to the **SDK 54** versions on purpose:
`npm run kontrol` type-checks against the older of the two, so anything that
exists only on 57 fails here.

Expo Go compatible by design — no custom native modules, no dev-client, core
RN `Animated` only (no reanimated, no gesture-handler).

## Sound assets

`packs/seasons/assets/sounds/*.wav` are built from Pixabay-sourced recordings
the user selected, trimmed to seamless loops, each carrying a quiet alpha/
low-beta binaural undertone for focus. Don't add audio from sources without a
licence the user has accepted.
