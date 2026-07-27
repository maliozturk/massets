// The provider every consuming app mounts once, near the root.
//
//   <MassetProvider pack={seasonsPack} storage={storage} locale="tr">
//     <App />
//   </MassetProvider>
//
// It owns exactly two pieces of state — the active variant and whether ambient
// sound is on — and persists both through the storage adapter the app injects.
// MASSETS itself has no storage dependency.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import type { Locale, MassetStorage, ThemePack, VariantLabel } from './pack';
import type { ThemeColors } from './tokens';
import { makeTypography, type Typography } from './typography';

export interface MassetValue<V extends string = string> {
  /** The pack currently mounted. */
  pack: ThemePack<V>;
  /** Active variant, e.g. 'rain'. */
  variant: V;
  /** Switch variant and persist the choice. */
  setVariant: (variant: V) => void;
  /** Palette for the active variant. */
  colors: ThemeColors;
  /** Text styles built from `colors`. */
  typography: Typography;
  /** True when the active variant is a dark one — drives StatusBar style. */
  isDark: boolean;
  /** Display strings for every variant, in the active locale. */
  labels: Record<V, VariantLabel>;
  locale: Locale;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const MassetContext = createContext<MassetValue<string> | null>(null);

export interface StorageKeys {
  variant: string;
  sound: string;
}

export interface MassetProviderProps<V extends string> {
  pack: ThemePack<V>;
  /** Where the chosen variant and sound flag are persisted. */
  storage: MassetStorage;
  children: ReactNode;
  /** Which built-in label set to use. Default 'en'. */
  locale?: Locale;
  /**
   * Replace or extend the pack's labels for the active locale. Merged over the
   * pack's own set, so you can override a single variant's wording.
   */
  labelOverrides?: Partial<Record<V, Partial<VariantLabel>>>;
  /**
   * Storage keys. Defaults to `masset:<pack.id>:variant` / `:sound`. Override
   * when adopting MASSETS in an app that already persists these under its own
   * key names, so existing installs keep their choice.
   */
  storageKeys?: Partial<StorageKeys>;
  /** Rendered while the stored variant is being read. Default: nothing. */
  fallback?: ReactNode;
  /** Start with sound on when nothing is stored. Default true. */
  defaultSoundEnabled?: boolean;
}

export function MassetProvider<V extends string>({
  pack,
  storage,
  children,
  locale = 'en',
  labelOverrides,
  storageKeys,
  fallback = null,
  defaultSoundEnabled = true,
}: MassetProviderProps<V>) {
  const [variant, setVariantState] = useState<V | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(defaultSoundEnabled);

  const keys: StorageKeys = useMemo(
    () => ({
      variant: storageKeys?.variant ?? `masset:${pack.id}:variant`,
      sound: storageKeys?.sound ?? `masset:${pack.id}:sound`,
    }),
    [pack.id, storageKeys?.variant, storageKeys?.sound]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let storedVariant: string | null = null;
      let storedSound: string | null = null;
      try {
        [storedVariant, storedSound] = await Promise.all([
          storage.getItem(keys.variant),
          storage.getItem(keys.sound),
        ]);
      } catch {
        // A failed read must not wedge the app on a blank screen — fall through
        // to the pack's default and carry on unpersisted.
      }
      if (cancelled) return;
      setSoundEnabledState(storedSound === null ? defaultSoundEnabled : storedSound !== '0');
      setVariantState(pack.isVariant(storedVariant) ? storedVariant : pack.defaultVariant(new Date()));
    })();
    return () => {
      cancelled = true;
    };
  }, [pack, storage, keys.variant, keys.sound, defaultSoundEnabled]);

  const value = useMemo<MassetValue<V> | null>(() => {
    if (variant === null) return null;
    const colors = pack.palettes[variant];
    const base = pack.labels[locale] ?? pack.labels.en;
    const labels = labelOverrides
      ? (Object.fromEntries(
          pack.variants.map((v) => [v, { ...base[v], ...labelOverrides[v] }])
        ) as Record<V, VariantLabel>)
      : base;

    return {
      pack,
      variant,
      setVariant: (next: V) => {
        setVariantState(next);
        void storage.setItem(keys.variant, next).catch(() => {});
      },
      colors,
      typography: makeTypography(colors),
      isDark: pack.darkVariants.has(variant),
      labels,
      locale,
      soundEnabled,
      setSoundEnabled: (enabled: boolean) => {
        setSoundEnabledState(enabled);
        void storage.setItem(keys.sound, enabled ? '1' : '0').catch(() => {});
      },
    };
  }, [pack, variant, locale, labelOverrides, soundEnabled, storage, keys.variant, keys.sound]);

  if (!value) return <>{fallback}</>;
  // The variant union is erased crossing the context boundary — React context
  // cannot be generic — and restored by the type argument on useMasset<V>().
  // Provider and consumer are the same pack, so the round trip is sound; it is
  // simply not something the compiler can follow.
  return <MassetContext.Provider value={value as unknown as MassetValue<string>}>{children}</MassetContext.Provider>;
}

/**
 * Read the active theme. Pass the pack's variant union to get a precisely typed
 * `variant` / `setVariant` — e.g. `useMasset<Season>()`. Without it you get
 * `string`, which is fine for anything that only touches `colors`.
 */
export function useMasset<V extends string = string>(): MassetValue<V> {
  const value = useContext(MassetContext);
  if (!value) throw new Error('useMasset must be used inside a MassetProvider');
  return value as unknown as MassetValue<V>;
}

/**
 * Memoized StyleSheet built from the active palette. Keep the factory at module
 * scope so its identity is stable — an inline arrow rebuilds the sheet every
 * render.
 */
export function useMassetStyles<T extends StyleSheet.NamedStyles<T>>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useMasset();
  return useMemo(() => factory(colors), [factory, colors]);
}

/**
 * Mounts the active pack's background and ambient audio, if it has them.
 * Render behind your transparent screens.
 */
export function MassetBackground() {
  const { pack } = useMasset();
  const Background = pack.Background;
  return Background ? <Background /> : null;
}

export function MassetAmbience() {
  const { pack, soundEnabled } = useMasset();
  const Ambience = pack.Ambience;
  if (!soundEnabled || !Ambience) return null;
  return <Ambience />;
}
