// Calm reveal: content fades in and settles upward a few pixels.
// Use sparingly — headline moments only, never list rows, where repeated
// entrance animations read as noise.

import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

import { useMasset } from './provider';

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  // Timing follows the active pack, so a bouncier pack reveals faster.
  const { tokens } = useMasset();
  const duration = tokens.motion.revealDurationMs;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, delay, duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>{children}</Animated.View>;
}
