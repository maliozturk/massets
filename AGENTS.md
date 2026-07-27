# MASSETS — agent notes

Shared theme store consumed by the sibling apps in `android_apps/` as a git
submodule mounted at `<app>/masset/`. Read `README.md` for the consumer-facing
API; this file is the working agreement.

## Origin

Extracted in July 2026 from `research_vault`, whose four seasonal themes the
user wanted to reuse across apps. research_vault is consumer #1 — it no longer
owns this code.

## Non-negotiable invariants

- **Developed here, never in an app.** A consuming app that edits its `masset/`
  working copy has forked the store. Fixes land in MASSETS and apps pull.
- **SDK 54 *and* 57.** The Turkish apps (`haftalik_plan_takip`,
  `isim_sehir_android_app`, `market_arkadasim`) are pinned to SDK 54 / RN 0.81
  for Expo Go compatibility on the user's phones — their own AGENTS.md forbids
  changing those versions. research_vault is on SDK 57 / RN 0.86. Adopting a
  theme must never force an SDK upgrade, so MASSETS uses only APIs stable
  across both. Its devDependencies are pinned to the **SDK 54** versions
  deliberately: `npm run kontrol` checks against the older SDK, so a 57-only
  API fails here rather than in an app.
- **Expo Go compatible.** No custom native modules, no dev-client. Animations
  use core RN `Animated` — no reanimated, no react-native-gesture-handler.
- **No raw colour outside a pack's palette file.** `core/` and any pack's
  components take colour from `ThemeColors`. Icons take colour via props.
- **Zero storage dependency.** The provider persists through a `MassetStorage`
  the app injects. Don't add AsyncStorage/SQLite to MASSETS — that decision
  belongs to each app.
- **`core/tokens.ts`, `core/pack.ts`, and every pack's `palettes.ts` /
  variant model stay free of runtime imports.** The showroom generator imports
  them from Node. A `react-native` import in those files breaks
  `npm run showroom`.
- **The showroom is generated, never hand-edited.** `showroom/index.html` is
  overwritten by `npm run showroom`. Edit `tools/showroom.ts` instead. Output
  is deterministic (seeded PRNG) so a no-op regeneration diffs empty.
- **Nothing domain-specific in core.** research_vault's `StatusPill`,
  `TopicCard`, `HangerOverlay`, `ProjectManager`, `LoopingChipRail` and
  `BottomTabBar` were deliberately left in that app. If a primitive needs to
  know what an "idea" or a "topic" is, it does not belong here.
- **The token contract is total.** Adding a key to `ThemeColors` means adding
  it to `THEME_COLOR_KEYS` (a type-level assertion in `core/tokens.ts` fails
  the build otherwise) and to every pack's palettes.
- **A pack may override roundness and motion, nothing else.** `radius` and
  `motion` on `ThemePack` are optional and partial; the provider merges them
  over the core defaults and hands the result to `useMassetStyles` as a second
  factory argument. Typography is deliberately NOT overridable — the user
  ruled that out when the cartoon pack was designed. Don't add a `fonts` slot
  without asking.
- **Themes are living, not static.** This is the user's explicit standard. A
  pack's background must have moving parts beyond falling particles — at
  minimum the celestial halo breathes and anything that grows sways. Each
  variant should own at least one motion the others don't have, or the four
  read as one scene recoloured. Build them from `core/animation.ts`
  (`useLoop`, `pivotRotate`) rather than re-deriving Animated boilerplate.
  Everything runs on the native driver, so **only transform and opacity may be
  animated** — animating colour, width, height or borderRadius silently drops
  to the JS thread and stutters on a cheap phone.
- **Live signal stays out of MassetValue.** `pulse` and `focus`
  (`core/signal.tsx`) are transient host-pushed values on their own contexts.
  Folding them into `MassetValue` would re-render every screen calling
  `useMasset()` on every frame of a reaction. Only `voidcore` reads them; a
  pack that ignores them costs nothing.
- **SVG filters are available, but bake noise into geometry where you can.**
  `react-native-svg` ships the full primitive set on both SDK 54 and 57
  (verified), so `feTurbulence` / `feDisplacementMap` / `feGaussianBlur` are
  there if a pack needs them. Voidcore used to displace its bands with a
  filter and now generates already-noised path data instead (`filaments()` in
  `voids.ts`) — same look, none of the per-frame filter cost. Reach for a
  filter when the shape genuinely cannot be precomputed; if you do, keep
  `numOctaves` at 2 and don't filter every layer.
- **Rare effects stay rare.** The shooting star and voidcore's infalling
  streaks use `restAfterMs` so they surprise rather than strobe. Don't turn
  them into metronomes, and don't add a second one to the same variant.
- **Voidcore's rare event is an infall, not lightning.** It used to throw
  forked bolts; the user cut them because lightning is borrowed from weather
  and reads wrong against a starfield. What replaced them comes out of the
  same physics as the rest of the frame — a body falling in on a decaying
  spiral, and hot spots orbiting inside the disc. Keep new effects inside that
  rule: if it could not happen to an accretion disc, it does not go here.
- **No washes over the voidcore disc.** A halo around it and dust clouds
  across it were both tried and both fogged the picture — any large soft
  gradient over the filaments costs contrast, the preview's bloom compounds
  it, and the result reads as out of focus. Space is clear and black. Depth
  comes from the starfield: a steep power-law magnitude distribution so most
  specks are faint, three hues off the palette, and only about a fifth of them
  scintillating.
- **Voidcore is the one pack whose showroom preview is a canvas.** Every other
  effect in `tools/showroom.ts` is CSS or SVG. The vortex is 8000 hairline
  strokes accumulating additively into a buffer that is never cleared, which
  CSS cannot express — so it ships a `<canvas>` and a renderer in the page's
  script block, reading its colours from the panel's CSS variables like
  everything else. The RN overlay reaches the same composition with ~180 SVG
  filaments. Two things it deliberately cannot match: additive blending (so
  its stroke alphas are 0.10–0.30, not the canvas's 0.02–0.12), and
  per-frame density (so all five tiers share one rotation period — running
  them at different rates would wind the spiral arms apart within a minute).
  Keep the two in step on composition, not on mechanism.
- **Every pack ships a pure `preview.ts`.** The showroom generator runs in
  Node and cannot import a pack's `index.ts` (React components). The preview is
  a second, deliberate description of the scenery — see the header of
  `core/preview.ts` for why. Register it in the `PACKS` array in
  `tools/showroom.ts`.

## Known state

The **seasons** palettes carry **22 WCAG AA contrast failures** across their
four variants — visible in the showroom's audit table. These are inherited from
research_vault's original design and were left untouched on purpose: the user
chose those colours deliberately and likes them. Most are the intentionally
quiet ones (11px `textTertiary` eyebrows, small mono state pills) plus
`onAccent` on `accent` in the three light variants. Don't "fix" them
unprompted — raise it and let the user decide.

The **cartoon** palettes pass all 13 checks in all four worlds, and were built
that way against the audit. Keep them clean: run `npm run showroom` after any
edit to them.

The cartoon pack was scoped in a design interview where the user twice pushed
back on questions about typefaces, characters and who the app is for — the
brief is **colour and environment only**. It ships no fonts and no characters.

## Commands

```
npm run kontrol      # tsc --noEmit against SDK 54 types
npm run showroom     # regenerate showroom/index.html from the real palettes
```
