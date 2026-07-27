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
  packs/
    seasons/              Rain · Snow · Blossom · Meadow
      palettes.ts           the four palettes
      seasons.ts            variant model, month default, EN/TR labels
      WeatherOverlay.tsx    sky, sun/moon, scenery, particles, rain-on-glass
      AmbientSound.tsx      per-season looping ambience
      assets/sounds/        the four loops
  showroom/index.html   generated preview — see below
  tools/showroom.ts     the generator
```

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

`Background` and `Ambience` are optional — a pack with no scenery just needs
colours, and then it needs no `react-native-svg` / `expo-linear-gradient` /
`expo-audio` either. Point its environment tokens at its own grounds.

Then add it to `tools/showroom.ts` and run `npm run showroom` to review it.

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
