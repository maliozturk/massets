// What a theme pack is, and what the host app must hand the provider.
//
// Pure types plus one tiny helper — no react-native imports, so Node tooling
// can read this alongside tokens.ts.

import type { ComponentType } from 'react';

import type { ThemeColors } from './tokens';

/** Locales MASSETS ships label sets for. Packs may add their own via `labels`. */
export type Locale = 'en' | 'tr';

/** Display strings for one variant, in one locale. */
export interface VariantLabel {
  /** Name shown in a picker, e.g. "Rain" / "Yağmur". */
  label: string;
  /** One-line description under the name. */
  blurb: string;
}

/**
 * Persistence, injected by the host app. Deliberately the narrowest useful
 * interface: `AsyncStorage` satisfies it as-is, and a SQLite-backed settings
 * table needs a three-line wrapper. MASSETS itself takes no storage
 * dependency.
 */
export interface MassetStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * A theme pack: a named set of variants, their palettes, and — optionally —
 * the living background and ambient audio that go with them.
 *
 * `V` is the variant union, e.g. `'rain' | 'snow' | 'blossom' | 'meadow'`.
 */
export interface ThemePack<V extends string = string> {
  /** Stable id, used as the storage key prefix. Must not change across releases. */
  id: string;
  /** Every variant, in the order a picker should show them. */
  variants: readonly V[];
  /** One palette per variant. */
  palettes: Record<V, ThemeColors>;
  /** Which variants are dark — drives StatusBar style and any light/dark branching. */
  darkVariants: ReadonlySet<V>;
  /** Display strings per locale. */
  labels: Record<Locale, Record<V, VariantLabel>>;
  /**
   * Which variant to show when nothing is stored yet. Called with the current
   * Date so packs can vary by month, hour, or ignore it entirely.
   */
  defaultVariant(now: Date): V;
  /** Runtime guard, used to validate whatever came back out of storage. */
  isVariant(value: unknown): value is V;
  /**
   * Full-bleed animated background for the active variant. Renders behind
   * transparent screens; must set `pointerEvents="none"`. Omit for a pack with
   * no scenery — the app then just gets `colors.bg`.
   */
  Background?: ComponentType;
  /** Ambient audio loop for the active variant. Omit for a silent pack. */
  Ambience?: ComponentType;
}

/**
 * Narrowing helper for pack authors: keeps `palettes` and `labels` keyed to the
 * declared variants without having to restate the union at each call site.
 */
export function definePack<V extends string>(pack: ThemePack<V>): ThemePack<V> {
  return pack;
}
