// The living background for the active cartoon world, layered back-to-front:
// sky → sun/moon → scenery → world extras → particles.
//
// Nothing here is static except the sky gradient. The sun breathes, the canopy
// and seabed sway, vines swing, light shafts sweep through the water, gumdrops
// bounce and a shooting star crosses now and then — on top of the particle
// behaviour that already differs per world (leaves fall, bubbles rise, stars
// twinkle in place, sprinkles tumble).
//
// Core-RN Animated on the native driver throughout, which means transform and
// opacity only. pointerEvents none.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { pivotRotate, useLoop } from '../../core/animation';
import { useMasset } from '../../core/provider';
import type { ThemeColors } from '../../core/tokens';
import type { World } from './worlds';

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;

// --- Particles -------------------------------------------------------------

type ParticleMotion = 'fall' | 'rise' | 'twinkle';

const MOTION: Record<World, ParticleMotion> = {
  jungle: 'fall',
  ocean: 'rise',
  space: 'twinkle',
  candy: 'fall',
};

const COUNTS: Record<World, number> = { jungle: 16, ocean: 22, space: 46, candy: 20 };

interface ParticleSpec {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  sway: number;
  spinDir: 1 | -1;
  depth: number;
  alt: boolean;
}

function makeSpecs(world: World): ParticleSpec[] {
  return Array.from({ length: COUNTS[world] }, () => {
    const r = Math.random();
    const depth = 0.55 + Math.random() * 0.45;
    const base = {
      x: Math.random(),
      y: Math.random(),
      depth,
      spinDir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
      alt: Math.random() < 0.45,
    };
    switch (world) {
      case 'jungle':
        return { ...base, size: (11 + r * 8) * depth, duration: (7000 + r * 4500) / depth, delay: Math.random() * 7000, drift: (Math.random() - 0.5) * 150, sway: 26 + Math.random() * 34 };
      case 'ocean':
        return { ...base, size: (5 + r * 9) * depth, duration: (5000 + r * 4000) / depth, delay: Math.random() * 6000, drift: (Math.random() - 0.5) * 60, sway: 14 + Math.random() * 22 };
      case 'space':
        return { ...base, size: (2 + r * 3.4) * depth, duration: (1600 + r * 2600) / depth, delay: Math.random() * 4000, drift: 0, sway: 0 };
      case 'candy':
        return { ...base, size: (7 + r * 5) * depth, duration: (5200 + r * 3800) / depth, delay: Math.random() * 6500, drift: (Math.random() - 0.5) * 110, sway: 18 + Math.random() * 30 };
    }
  });
}

function particleShape(world: World, spec: ParticleSpec, colors: ThemeColors): ViewStyle {
  const color = spec.alt ? colors.particleAlt : colors.particle;
  switch (world) {
    case 'jungle':
      return {
        width: spec.size,
        height: spec.size * 0.62,
        backgroundColor: color,
        borderTopLeftRadius: spec.size,
        borderBottomRightRadius: spec.size,
        borderTopRightRadius: 2,
        borderBottomLeftRadius: 2,
      };
    case 'ocean':
      // A ring, not a disc — reads as a hollow bubble.
      return {
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size / 2,
        borderWidth: Math.max(1, spec.size * 0.16),
        borderColor: color,
        backgroundColor: 'transparent',
      };
    case 'space':
      return { width: spec.size, height: spec.size, borderRadius: spec.size / 2, backgroundColor: color };
    case 'candy':
      return { width: spec.size, height: spec.size * 0.42, borderRadius: spec.size, backgroundColor: color };
  }
}

function Particle({ world, spec, colors }: { world: World; spec: ParticleSpec; colors: ThemeColors }) {
  const progress = useRef(new Animated.Value(0)).current;
  const motion = MOTION[world];

  useEffect(() => {
    const loop =
      motion === 'twinkle'
        ? Animated.loop(
            Animated.sequence([
              Animated.timing(progress, { toValue: 1, duration: spec.duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(progress, { toValue: 0, duration: spec.duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
          )
        : Animated.loop(
            Animated.sequence([
              Animated.timing(progress, { toValue: 1, duration: spec.duration, easing: Easing.linear, useNativeDriver: true }),
              Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
          );
    const anim = Animated.sequence([Animated.delay(spec.delay), loop]);
    anim.start();
    return () => anim.stop();
  }, [progress, spec.delay, spec.duration, motion]);

  const peak = 0.4 + spec.depth * 0.6;

  if (motion === 'twinkle') {
    return (
      <Animated.View
        style={[
          styles.particle,
          particleShape(world, spec, colors),
          {
            left: spec.x * SCREEN_W,
            top: spec.y * SCREEN_H * 0.82,
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [peak * 0.25, peak] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }],
          },
        ]}
      />
    );
  }

  const rising = motion === 'rise';
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: rising ? [SCREEN_H + 40, -60] : [-60, SCREEN_H + 40],
  });

  const s = spec.sway * spec.spinDir;
  const translateX = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, spec.drift * 0.25 + s, spec.drift * 0.5 - s * 0.6, spec.drift * 0.75 + s * 0.8, spec.drift],
  });

  const rotate = rising
    ? '0deg'
    : progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spec.spinDir * 320}deg`] });

  const opacity = progress.interpolate({ inputRange: [0, 0.07, 0.88, 1], outputRange: [0, peak, peak, 0] });

  return (
    <Animated.View
      style={[
        styles.particle,
        particleShape(world, spec, colors),
        { left: spec.x * SCREEN_W, opacity, transform: [{ translateY }, { translateX }, { rotate }] },
      ]}
    />
  );
}

// --- Sun / moon ------------------------------------------------------------

const CELESTIAL: Record<World, { x: number; y: number; r: number }> = {
  jungle: { x: 0.76, y: 0.11, r: 32 },
  ocean: { x: 0.5, y: 0.06, r: 40 },
  space: { x: 0.24, y: 0.13, r: 30 },
  candy: { x: 0.74, y: 0.13, r: 34 },
};

function glowRing(cx: number, cy: number, radius: number, backgroundColor: string): ViewStyle {
  return { left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor };
}

/** The sun and moon breathe — a slow swell in the halo, never in the disc. */
function CelestialBody({ world, colors }: { world: World; colors: ThemeColors }) {
  const { x, y, r } = CELESTIAL[world];
  const cx = x * SCREEN_W;
  const cy = y * SCREEN_H;
  const breath = useLoop({ duration: 4200 });
  const haloScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const haloOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  if (world === 'space') {
    return (
      <>
        <Animated.View
          style={[styles.celestial, glowRing(cx, cy, r * 2.4, colors.celestialGlow), { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}
        />
        <Svg style={[styles.celestial, { left: cx - r, top: cy - r }]} width={r * 2} height={r * 2} viewBox="0 0 48 48">
          <Circle cx={24} cy={24} r={22} fill={colors.celestial} />
          <Circle cx={17} cy={19} r={4.2} fill={colors.sceneryAlt} opacity={0.45} />
          <Circle cx={30} cy={28} r={5.4} fill={colors.sceneryAlt} opacity={0.35} />
          <Circle cx={31} cy={15} r={2.6} fill={colors.sceneryAlt} opacity={0.4} />
        </Svg>
      </>
    );
  }

  return (
    <>
      {[4.4, 3.2, 2.3, 1.6, 1.22].map((k, i) => (
        <Animated.View
          key={i}
          style={[
            styles.celestial,
            glowRing(cx, cy, r * k, colors.celestialGlow),
            { opacity: haloOpacity, transform: [{ scale: haloScale }] },
          ]}
        />
      ))}
      <View style={[styles.celestial, glowRing(cx, cy, r, colors.celestial)]} />
    </>
  );
}

// --- Scenery ---------------------------------------------------------------

/** Wraps a scenery layer in a slow sway rooted at the edge it grows from. */
function Swaying({
  children,
  height,
  pivot,
  degrees,
  duration,
  delay = 0,
}: {
  children: React.ReactNode;
  height: number;
  pivot: 'top' | 'bottom';
  degrees: number;
  duration: number;
  delay?: number;
}) {
  const progress = useLoop({ duration, delay });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: [`${-degrees}deg`, `${degrees}deg`] });
  return <Animated.View style={{ transform: pivotRotate(rotate, height, pivot) }}>{children}</Animated.View>;
}

function WorldScenery({ world, colors }: { world: World; colors: ThemeColors }) {
  const w = 400;

  if (world === 'jungle') {
    return (
      <>
        <View style={styles.sceneryTop}>
          <Swaying height={130} pivot="top" degrees={0.9} duration={4600}>
            <Svg width="100%" height={130} viewBox={`0 0 ${w} 130`} preserveAspectRatio="none">
              <Path
                d="M 0 0 L 400 0 L 400 44 Q 372 78 344 46 Q 316 86 286 50 Q 258 92 228 52 Q 198 84 170 48 Q 140 88 112 50 Q 84 80 56 46 Q 28 76 0 42 Z"
                fill={colors.scenery}
              />
              {[[42, 60], [128, 66], [214, 64], [300, 62], [368, 56]].map(([cx, cy], i) => (
                <Ellipse key={i} cx={cx} cy={cy} rx={17} ry={10} fill={colors.sceneryAlt} opacity={0.8} />
              ))}
            </Svg>
          </Swaying>
        </View>
        <View style={styles.sceneryBottom}>
          {/* Counter-phase, so the floor and the canopy never move as one slab. */}
          <Swaying height={92} pivot="bottom" degrees={0.7} duration={5800} delay={900}>
            <Svg width="100%" height={92} viewBox={`0 0 ${w} 92`} preserveAspectRatio="none">
              <Path d="M 0 92 L 0 58 Q 40 22 80 58 Q 120 20 160 58 Q 200 24 240 58 Q 280 18 320 58 Q 360 26 400 58 L 400 92 Z" fill={colors.scenery} />
              {[[62, 50], [186, 48], [306, 52]].map(([cx, cy], i) => (
                <Circle key={i} cx={cx} cy={cy} r={7} fill={colors.sceneryAlt} />
              ))}
            </Svg>
          </Swaying>
        </View>
      </>
    );
  }

  if (world === 'ocean') {
    return (
      <View style={styles.sceneryBottom}>
        <Swaying height={124} pivot="bottom" degrees={0.6} duration={5200}>
          <Svg width="100%" height={124} viewBox={`0 0 ${w} 124`} preserveAspectRatio="none">
            <Path
              d="M 70 110 L 70 74 M 70 86 L 54 68 M 70 86 L 86 68 M 70 74 L 60 58 M 70 74 L 82 58"
              stroke={colors.sceneryAlt}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
            <Path d="M 318 110 L 318 80 M 318 92 L 302 74 M 318 92 L 334 74" stroke={colors.sceneryAlt} strokeWidth={6} strokeLinecap="round" fill="none" />
            <Path d="M 0 124 L 0 96 Q 70 74 140 98 Q 210 72 280 96 Q 340 78 400 98 L 400 124 Z" fill={colors.scenery} />
            {[[168, 108, 6], [232, 112, 4.5], [96, 112, 5]].map(([cx, cy, r], i) => (
              <Circle key={i} cx={cx} cy={cy} r={r} fill={colors.sceneryAlt} opacity={0.75} />
            ))}
          </Svg>
        </Swaying>
      </View>
    );
  }

  if (world === 'space') {
    return (
      <View style={styles.sceneryBottom}>
        <Svg width="100%" height={130} viewBox={`0 0 ${w} 130`} preserveAspectRatio="none">
          <Path d="M -40 130 Q 200 24 440 130 Z" fill={colors.scenery} />
          {[[120, 86, 11], [214, 70, 8], [292, 92, 13], [64, 112, 7]].map(([cx, cy, r], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill={colors.sceneryAlt} opacity={0.5} />
          ))}
        </Svg>
      </View>
    );
  }

  return (
    <View style={styles.sceneryBottom}>
      <Svg width="100%" height={116} viewBox={`0 0 ${w} 116`} preserveAspectRatio="none">
        <Path d="M 0 116 L 0 78 Q 66 40 132 78 Q 200 38 268 78 Q 334 42 400 76 L 400 116 Z" fill={colors.scenery} />
        <Rect x={0} y={104} width={400} height={12} fill={colors.sceneryAlt} opacity={0.5} />
      </Svg>
    </View>
  );
}

// --- Per-world extras ------------------------------------------------------

/** Jungle: vines hanging from the canopy, each swinging on its own clock. */
function Vines({ colors }: { colors: ThemeColors }) {
  const specs = useMemo(
    () => [
      { x: 0.13, len: 150, dur: 3600, delay: 0, deg: 3.4 },
      { x: 0.44, len: 208, dur: 4700, delay: 700, deg: 2.6 },
      { x: 0.71, len: 128, dur: 4100, delay: 1500, deg: 3.9 },
      { x: 0.9, len: 178, dur: 5300, delay: 400, deg: 2.2 },
    ],
    []
  );
  return (
    <>
      {specs.map((v, i) => (
        <View key={i} style={[styles.vineAnchor, { left: v.x * SCREEN_W }]}>
          <Swaying height={v.len} pivot="top" degrees={v.deg} duration={v.dur} delay={v.delay}>
            <View style={{ width: 4, height: v.len, borderRadius: 4, backgroundColor: colors.scenery }} />
            <View style={{ width: 13, height: 9, borderRadius: 9, marginLeft: -4.5, backgroundColor: colors.sceneryAlt }} />
          </Swaying>
        </View>
      ))}
    </>
  );
}

/** Ocean: sunlight coming down through the surface in slow shafts. */
function LightShafts({ colors }: { colors: ThemeColors }) {
  const specs = useMemo(
    () => [
      { x: 0.18, w: 54, dur: 5200, delay: 0 },
      { x: 0.46, w: 82, dur: 6800, delay: 1200 },
      { x: 0.78, w: 46, dur: 5900, delay: 2400 },
    ],
    []
  );
  return (
    <>
      {specs.map((s, i) => (
        <Shaft key={i} colors={colors} {...s} />
      ))}
    </>
  );
}

function Shaft({ colors, x, w, dur, delay }: { colors: ThemeColors; x: number; w: number; dur: number; delay: number }) {
  const progress = useLoop({ duration: dur, delay });
  return (
    <Animated.View
      style={[
        styles.shaft,
        {
          left: x * SCREEN_W,
          width: w,
          backgroundColor: colors.celestialGlow,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.55] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] }) },
            { skewX: '9deg' },
            { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) },
          ],
        },
      ]}
    />
  );
}

/** Space: one shooting star, crossing rarely rather than constantly. */
function ShootingStar({ colors }: { colors: ThemeColors }) {
  // 1.1s of travel, then eight seconds of nothing — a surprise, not a metronome.
  const progress = useLoop({ duration: 1100, reverse: false, delay: 2600, restAfterMs: 8200, easing: Easing.in(Easing.quad) });
  return (
    <Animated.View
      style={[
        styles.shootingStar,
        {
          backgroundColor: colors.particle,
          opacity: progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.95, 0.8, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-70, SCREEN_W * 0.86] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_H * 0.34] }) },
            { rotate: '21deg' },
            { scaleX: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1, 0.85] }) },
          ],
        },
      ]}
    />
  );
}

/** Candy: gumdrops squashing on the ridge, out of step with each other. */
function Gumdrops({ colors }: { colors: ThemeColors }) {
  const specs = useMemo(
    () => [
      { x: 0.13, size: 26, dur: 1500, delay: 0 },
      { x: 0.37, size: 22, dur: 1800, delay: 380 },
      { x: 0.62, size: 28, dur: 1650, delay: 760 },
      { x: 0.85, size: 20, dur: 2000, delay: 220 },
    ],
    []
  );
  return (
    <>
      {specs.map((g, i) => (
        <Gumdrop key={i} colors={colors} {...g} />
      ))}
    </>
  );
}

function Gumdrop({ colors, x, size, dur, delay }: { colors: ThemeColors; x: number; size: number; dur: number; delay: number }) {
  const progress = useLoop({ duration: dur, delay });
  return (
    <Animated.View
      style={[
        styles.gumdrop,
        {
          left: x * SCREEN_W,
          width: size,
          height: size * 0.9,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          backgroundColor: colors.sceneryAlt,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) },
            // Squash on the way down, stretch at the top of the hop.
            { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.06] }) },
            { scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.96] }) },
          ],
        },
      ]}
    />
  );
}

function WorldExtras({ world, colors }: { world: World; colors: ThemeColors }) {
  switch (world) {
    case 'jungle':
      return <Vines colors={colors} />;
    case 'ocean':
      return <LightShafts colors={colors} />;
    case 'space':
      return <ShootingStar colors={colors} />;
    case 'candy':
      return <Gumdrops colors={colors} />;
  }
}

// --- Overlay ---------------------------------------------------------------

export function CartoonOverlay() {
  const { variant: world, colors } = useMasset<World>();
  const specs = useMemo(() => makeSpecs(world), [world]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[colors.skyTop, colors.skyBottom]} style={StyleSheet.absoluteFill} />
      <CelestialBody key={`cel-${world}`} world={world} colors={colors} />
      <WorldScenery key={`sce-${world}`} world={world} colors={colors} />
      <WorldExtras key={`ext-${world}`} world={world} colors={colors} />
      {specs.map((spec, i) => (
        <Particle key={`${world}-${i}`} world={world} spec={spec} colors={colors} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', top: 0 },
  celestial: { position: 'absolute' },
  sceneryTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  sceneryBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  vineAnchor: { position: 'absolute', top: 0, alignItems: 'center' },
  shaft: { position: 'absolute', top: -40, height: SCREEN_H * 0.72, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  shootingStar: { position: 'absolute', top: SCREEN_H * 0.1, left: 0, width: 90, height: 3, borderRadius: 3 },
  gumdrop: { position: 'absolute', bottom: 44, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
});
