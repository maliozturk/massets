// Looping animation helpers shared by every pack's background.
//
// A theme here is meant to be *alive* — the sun breathes, foliage sways, light
// moves. Rather than each pack re-deriving the same Animated boilerplate, they
// all pull from these two shapes:
//
//   useLoop({ reverse: true })   a breath — 0 → 1 → 0, for sways and pulses
//   useLoop({ reverse: false })  a traveller — 0 → 1, snap back, for anything
//                                that crosses the screen and starts again
//
// Everything drives `useNativeDriver: true`, which restricts what may be
// animated to **transform and opacity**. Colour, width, height and border
// radius cannot be driven natively — animate a wrapper's transform instead of
// reaching for them, or the animation silently falls back to the JS thread and
// stutters on a cheap phone.

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export interface LoopOptions {
  /** Milliseconds for one leg. A `reverse` loop takes twice this per cycle. */
  duration: number;
  /** Wait before the first leg. Stagger siblings with this so they don't move as one. */
  delay?: number;
  /**
   * true  — 0 → 1 → 0. A breath: sway, pulse, bob.
   * false — 0 → 1, then snap back to 0. A traveller: a falling leaf, a
   *         shooting star, anything whose end and start are the same place.
   */
  reverse?: boolean;
  easing?: (value: number) => number;
  /** Dead time at the end of each cycle. Use it to make an effect rare rather than constant. */
  restAfterMs?: number;
}

/**
 * A 0→1 driver looping forever. Interpolate it into transforms and opacity.
 * Stops itself on unmount.
 */
export function useLoop({ duration, delay = 0, reverse = true, easing, restAfterMs = 0 }: LoopOptions): Animated.Value {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = easing ?? (reverse ? Easing.inOut(Easing.quad) : Easing.linear);
    const forward = Animated.timing(progress, { toValue: 1, duration, easing: ease, useNativeDriver: true });
    const back = reverse
      ? Animated.timing(progress, { toValue: 0, duration, easing: ease, useNativeDriver: true })
      : // A traveller resets instantly — it re-enters from where it began.
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true });

    const cycle = restAfterMs > 0 ? Animated.sequence([forward, back, Animated.delay(restAfterMs)]) : Animated.sequence([forward, back]);
    const anim = Animated.sequence([Animated.delay(delay), Animated.loop(cycle)]);
    anim.start();
    return () => anim.stop();
  }, [progress, duration, delay, reverse, easing, restAfterMs]);

  return progress;
}

/**
 * Rotation about an edge rather than the centre — what foliage hanging from
 * the top of the screen, or grass rooted at the bottom, actually does.
 *
 * Composed from translate/rotate/translate rather than `transformOrigin` so it
 * behaves identically on both SDKs MASSETS targets.
 */
export function pivotRotate(rotate: Animated.AnimatedInterpolation<string>, height: number, pivot: 'top' | 'bottom') {
  const shift = pivot === 'top' ? -height / 2 : height / 2;
  return [{ translateY: -shift }, { rotate }, { translateY: shift }];
}
