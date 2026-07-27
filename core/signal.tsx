// Live input a background can react to, as opposed to the persisted look the
// user picked.
//
// A variant is a choice someone makes and keeps. This is the opposite: a
// moment-to-moment value the host pushes in, with nothing written to storage.
// The voidcore pack uses it to spin harder when something is speaking to it,
// and to throw lightning at whatever is being pointed at.
//
// Two separate contexts on purpose:
//
//   - the VALUE context changes constantly. Only backgrounds read it.
//   - the CONTROLS context never changes identity, so a component that only
//     pushes signal never re-renders when the signal moves.
//
// Both are deliberately outside MassetValue. Folding `pulse` into it would
// re-render every screen calling useMasset() on every frame of a reaction,
// which is exactly the kind of cost a theme should never impose on an app.

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export interface MassetSignal {
  /**
   * How strongly the theme should be reacting, 0 (idle) to 1 (full).
   * A background is free to ignore it; most packs do.
   */
  pulse: number;
  /**
   * A point the theme should attend to, in normalized 0–1 stage coordinates
   * with the origin top-left. Null when nothing is being pointed at.
   * Mouse position on web, touch on a phone — the theme doesn't care which.
   */
  focus: { x: number; y: number } | null;
}

export interface MassetSignalControls {
  setPulse: (pulse: number) => void;
  setFocus: (focus: { x: number; y: number } | null) => void;
}

const IDLE: MassetSignal = { pulse: 0, focus: null };

const SignalContext = createContext<MassetSignal>(IDLE);
const ControlsContext = createContext<MassetSignalControls | null>(null);

export function MassetSignalProvider({ children }: { children: ReactNode }) {
  const [signal, setSignal] = useState<MassetSignal>(IDLE);

  // Stable identity — this object is created once and never replaced, so
  // consumers of the controls never re-render.
  const controls = useRef<MassetSignalControls>({
    setPulse: (pulse) => setSignal((s) => (s.pulse === pulse ? s : { ...s, pulse: clamp01(pulse) })),
    setFocus: (focus) =>
      setSignal((s) => (sameFocus(s.focus, focus) ? s : { ...s, focus: focus && { x: clamp01(focus.x), y: clamp01(focus.y) } })),
  }).current;

  const value = useMemo(() => signal, [signal]);

  return (
    <ControlsContext.Provider value={controls}>
      <SignalContext.Provider value={value}>{children}</SignalContext.Provider>
    </ControlsContext.Provider>
  );
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function sameFocus(a: MassetSignal['focus'], b: MassetSignal['focus']): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y;
}

/**
 * Read the live signal. For backgrounds. Returns the idle signal when no
 * provider is mounted, so a pack that reads it still works standalone.
 */
export function useMassetSignal(): MassetSignal {
  return useContext(SignalContext);
}

/**
 * Push the live signal. For the host app — call `setPulse` when your core is
 * listening or answering, and `setFocus` from touch or pointer position.
 * The returned object is referentially stable.
 */
export function useMassetSignalControls(): MassetSignalControls {
  const controls = useContext(ControlsContext);
  if (!controls) throw new Error('useMassetSignalControls must be used inside a MassetProvider');
  return controls;
}
