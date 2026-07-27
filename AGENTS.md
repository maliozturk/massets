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

## Known state

The seasons palettes carry **22 WCAG AA contrast failures** across the four
variants — visible in the showroom's audit table. These are inherited from
research_vault's original design and were left untouched on purpose: the user
chose those colours deliberately and likes them. Most are the intentionally
quiet ones (11px `textTertiary` eyebrows, small mono state pills) plus
`onAccent` on `accent` in the three light variants. Don't "fix" them
unprompted — raise it and let the user decide.

## Commands

```
npm run kontrol      # tsc --noEmit against SDK 54 types
npm run showroom     # regenerate showroom/index.html from the real palettes
```
