// The living background for the active storm stage, layered back-to-front:
// sky → weak light source → scenery → stage effect → rain → glass.
//
// Everything escalates with `intensity()`: the rain gets denser, faster and
// more slanted, the scenery sways harder. On top of that each stage owns one
// motion the others don't have —
//
//   drizzle   drifting mist and rings spreading in puddles
//   downpour  water running down the glass in sheets
//   thunder   forked lightning, striking in bursts
//   tempest   wind gusts that shear the whole scene, and spray flying flat
//
// Core-RN Animated on the native driver, so transform and opacity only.
// pointerEvents none.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { pivotRotate, useLoop } from '../../core/animation';
import { useMasset } from '../../core/provider';
import type { ThemeColors } from '../../core/tokens';
import { intensity, type Storm } from './storms';

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;

// --- Rain ------------------------------------------------------------------

// Denser, faster and more slanted as the storm builds.
const RAIN_COUNT: Record<Storm, number> = { drizzle: 30, downpour: 68, thunder: 60, tempest: 84 };
const RAIN_ANGLE: Record<Storm, number> = { drizzle: 4, downpour: 13, thunder: 11, tempest: 34 };
const RAIN_SPEED: Record<Storm, number> = { drizzle: 1900, downpour: 780, thunder: 900, tempest: 560 };

interface DropSpec {
  x: number;
  len: number;
  thickness: number;
  duration: number;
  delay: number;
  depth: number;
  alt: boolean;
}

function makeRain(storm: Storm): DropSpec[] {
  const speed = RAIN_SPEED[storm];
  return Array.from({ length: RAIN_COUNT[storm] }, () => {
    const depth = 0.55 + Math.random() * 0.45;
    const r = Math.random();
    return {
      x: Math.random(),
      // Drizzle is short specks; a tempest draws long streaks.
      len: (storm === 'drizzle' ? 5 + r * 6 : 14 + r * (storm === 'tempest' ? 26 : 14)) * depth,
      thickness: (storm === 'drizzle' ? 1 : 1.2) + depth * (storm === 'tempest' ? 1.1 : 0.8),
      duration: (speed + r * speed * 0.5) / depth,
      delay: Math.random() * 1600,
      depth,
      alt: Math.random() < 0.45,
    };
  });
}

function Drop({ spec, storm, colors }: { spec: DropSpec; storm: Storm; colors: ThemeColors }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(spec.delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, { toValue: 1, duration: spec.duration, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [progress, spec.delay, spec.duration]);

  const angle = RAIN_ANGLE[storm];
  // Slant means horizontal travel too, or the streaks read as falling straight
  // down with a tilted sprite.
  const sideways = Math.tan((angle * Math.PI) / 180) * (SCREEN_H + 100);
  const peak = 0.3 + spec.depth * 0.7;

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: spec.x * SCREEN_W,
          width: spec.thickness,
          height: spec.len,
          backgroundColor: spec.alt ? colors.particleAlt : colors.particle,
          opacity: progress.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, peak, peak, 0] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-60, SCREEN_H + 60] }) },
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -sideways] }) },
            { rotate: `${angle}deg` },
          ],
        },
      ]}
    />
  );
}

// --- Drizzle: mist and puddles --------------------------------------------

function MistBand({ colors, y, h, dur, delay }: { colors: ThemeColors; y: number; h: number; dur: number; delay: number }) {
  const progress = useLoop({ duration: dur, delay });
  return (
    <Animated.View
      style={[
        styles.mist,
        {
          top: y * SCREEN_H,
          height: h,
          backgroundColor: colors.celestialGlow,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.6] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_W * 0.16, SCREEN_W * 0.16] }) },
            { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) },
          ],
        },
      ]}
    />
  );
}

/** A ring spreading where a drop landed, then fading. */
function Ripple({ colors, x, size, dur, delay }: { colors: ThemeColors; x: number; size: number; dur: number; delay: number }) {
  const progress = useLoop({ duration: dur, delay, reverse: false, easing: Easing.out(Easing.quad) });
  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          left: x * SCREEN_W,
          width: size,
          height: size * 0.34,
          borderRadius: size,
          borderColor: colors.particle,
          opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6] }) }],
        },
      ]}
    />
  );
}

function DrizzleExtras({ colors }: { colors: ThemeColors }) {
  const bands = useMemo(
    () => [
      { y: 0.32, h: 58, dur: 8200, delay: 0 },
      { y: 0.5, h: 84, dur: 10400, delay: 1600 },
      { y: 0.68, h: 66, dur: 9100, delay: 3200 },
    ],
    []
  );
  const ripples = useMemo(
    () => [
      { x: 0.16, size: 54, dur: 2600, delay: 0 },
      { x: 0.42, size: 74, dur: 3100, delay: 900 },
      { x: 0.63, size: 46, dur: 2400, delay: 1800 },
      { x: 0.85, size: 66, dur: 2900, delay: 600 },
    ],
    []
  );
  return (
    <>
      {bands.map((b, i) => (
        <MistBand key={i} colors={colors} {...b} />
      ))}
      {ripples.map((r, i) => (
        <Ripple key={i} colors={colors} {...r} />
      ))}
    </>
  );
}

// --- Downpour: water running down the glass -------------------------------

function Sheet({ colors, x, w, dur, delay }: { colors: ThemeColors; x: number; w: number; dur: number; delay: number }) {
  const progress = useLoop({ duration: dur, delay, reverse: false, easing: Easing.in(Easing.quad) });
  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          left: x * SCREEN_W,
          width: w,
          backgroundColor: colors.particleAlt,
          opacity: progress.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 0.5, 0.35, 0] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_H * 0.5, SCREEN_H] }) },
            { scaleY: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1, 1.25] }) },
          ],
        },
      ]}
    />
  );
}

function DownpourExtras({ colors }: { colors: ThemeColors }) {
  const sheets = useMemo(
    () => [
      { x: 0.08, w: 3, dur: 2100, delay: 0 },
      { x: 0.23, w: 5, dur: 2600, delay: 700 },
      { x: 0.41, w: 3.5, dur: 1900, delay: 1500 },
      { x: 0.58, w: 6, dur: 2900, delay: 400 },
      { x: 0.74, w: 3, dur: 2300, delay: 1900 },
      { x: 0.9, w: 4.5, dur: 2500, delay: 1100 },
    ],
    []
  );
  return (
    <>
      {sheets.map((s, i) => (
        <Sheet key={i} colors={colors} {...s} />
      ))}
    </>
  );
}

// --- Thunder: forked lightning --------------------------------------------

/**
 * A bolt and a whole-sky flash on one driver. Strikes in a burst, then rests
 * — a storm you watch, not a strobe.
 */
function Strike({ colors, delay, rest, x }: { colors: ThemeColors; delay: number; rest: number; x: number }) {
  const progress = useLoop({ duration: 780, reverse: false, delay, restAfterMs: rest, easing: Easing.linear });
  // Two flickers, hard on and hard off, then dark.
  const flicker = progress.interpolate({
    inputRange: [0, 0.06, 0.13, 0.2, 0.3, 0.42, 1],
    outputRange: [0, 1, 0.15, 0.9, 0.1, 0, 0],
  });
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.sceneryAlt,
            opacity: progress.interpolate({
              inputRange: [0, 0.06, 0.13, 0.2, 0.3, 0.42, 1],
              outputRange: [0, 0.26, 0.03, 0.22, 0.04, 0, 0],
            }),
          },
        ]}
      />
      <Animated.View style={[styles.bolt, { left: x * SCREEN_W, opacity: flicker }]}>
        <Svg width={110} height={SCREEN_H * 0.46} viewBox="0 0 110 300">
          <Path
            d="M 66 0 L 30 128 L 60 122 L 22 300 L 78 132 L 48 138 L 88 0 Z"
            fill={colors.particle}
            stroke={colors.celestial}
            strokeWidth={2}
          />
        </Svg>
      </Animated.View>
    </>
  );
}

function ThunderExtras({ colors }: { colors: ThemeColors }) {
  // Two strikes on different clocks, so the pattern never feels metered.
  return (
    <>
      <Strike colors={colors} delay={2600} rest={9400} x={0.52} />
      <Strike colors={colors} delay={7200} rest={15600} x={0.14} />
    </>
  );
}

// --- Tempest: gusts and spray ---------------------------------------------

function SprayStreak({ colors, y, len, dur, delay }: { colors: ThemeColors; y: number; len: number; dur: number; delay: number }) {
  const progress = useLoop({ duration: dur, delay, reverse: false, easing: Easing.linear });
  return (
    <Animated.View
      style={[
        styles.spray,
        {
          top: y * SCREEN_H,
          width: len,
          backgroundColor: colors.particleAlt,
          opacity: progress.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 0.6, 0.45, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_W + 60, -160] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }) },
            { rotate: '9deg' },
          ],
        },
      ]}
    />
  );
}

function TempestExtras({ colors }: { colors: ThemeColors }) {
  const streaks = useMemo(
    () => [
      { y: 0.18, len: 130, dur: 1300, delay: 0 },
      { y: 0.31, len: 90, dur: 1000, delay: 500 },
      { y: 0.47, len: 170, dur: 1600, delay: 200 },
      { y: 0.59, len: 110, dur: 1150, delay: 900 },
      { y: 0.72, len: 150, dur: 1450, delay: 1300 },
    ],
    []
  );
  return (
    <>
      {streaks.map((s, i) => (
        <SprayStreak key={i} colors={colors} {...s} />
      ))}
    </>
  );
}

// --- Weak light source -----------------------------------------------------

const LIGHT: Record<Storm, { x: number; y: number; r: number }> = {
  drizzle: { x: 0.7, y: 0.13, r: 34 },
  downpour: { x: 0.66, y: 0.11, r: 44 },
  thunder: { x: 0.3, y: 0.1, r: 40 },
  tempest: { x: 0.76, y: 0.09, r: 38 },
};

function glowRing(cx: number, cy: number, radius: number, backgroundColor: string): ViewStyle {
  return { left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor };
}

/** Whatever light is left, breathing as the cloud moves across it. */
function StormLight({ storm, colors }: { storm: Storm; colors: ThemeColors }) {
  const { x, y, r } = LIGHT[storm];
  const cx = x * SCREEN_W;
  const cy = y * SCREEN_H;
  // The heavier the storm, the slower and weaker the light shifts.
  const breath = useLoop({ duration: 5200 + intensity(storm) * 1400 });
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const opacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <>
      {[3.6, 2.6, 1.8].map((k, i) => (
        <Animated.View
          key={i}
          style={[styles.light, glowRing(cx, cy, r * k, colors.celestialGlow), { opacity, transform: [{ scale }] }]}
        />
      ))}
      <Animated.View style={[styles.light, glowRing(cx, cy, r, colors.celestial), { opacity }]} />
    </>
  );
}

// --- Scenery ---------------------------------------------------------------

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

function StormScenery({ storm, colors }: { storm: Storm; colors: ThemeColors }) {
  const w = 400;

  if (storm === 'drizzle') {
    return (
      <View style={styles.sceneryBottom}>
        <Swaying height={104} pivot="bottom" degrees={0.5} duration={6400}>
          <Svg width="100%" height={104} viewBox={`0 0 ${w} 104`} preserveAspectRatio="none">
            <Path d="M 0 104 L 0 62 Q 90 34 180 60 Q 280 30 400 58 L 400 104 Z" fill={colors.scenery} />
            {/* A fence going off into the mist. */}
            {[36, 78, 120, 162, 204].map((x, i) => (
              <Rect key={i} x={x} y={66 - i * 2} width={3} height={22 + i} rx={1} fill={colors.sceneryAlt} />
            ))}
            {/* Standing water. */}
            <Path d="M 236 96 Q 290 90 344 96 Q 290 102 236 96 Z" fill={colors.sceneryAlt} opacity={0.55} />
          </Svg>
        </Swaying>
      </View>
    );
  }

  if (storm === 'downpour') {
    return (
      <View style={styles.sceneryBottom}>
        <Svg width="100%" height={126} viewBox={`0 0 ${w} 126`} preserveAspectRatio="none">
          <Path
            d="M 0 126 L 0 74 L 44 74 L 44 40 L 92 40 L 92 84 L 140 84 L 140 26 L 196 26 L 196 68 L 244 68 L 244 48 L 300 48 L 300 90 L 348 90 L 348 58 L 400 58 L 400 126 Z"
            fill={colors.scenery}
          />
          {[[58, 54], [70, 66], [152, 40], [166, 58], [208, 82], [260, 62], [312, 100], [360, 74]].map(([x, y], i) => (
            <Rect key={i} x={x} y={y} width={6} height={8} rx={1} fill={colors.sceneryAlt} />
          ))}
        </Svg>
      </View>
    );
  }

  if (storm === 'thunder') {
    return (
      <>
        {/* A heavy cloud bank the strike lights up from behind. */}
        <View style={styles.sceneryTop}>
          <Swaying height={120} pivot="top" degrees={0.5} duration={7600}>
            <Svg width="100%" height={120} viewBox={`0 0 ${w} 120`} preserveAspectRatio="none">
              <Path
                d="M 0 0 L 400 0 L 400 52 Q 366 92 320 66 Q 280 100 236 70 Q 196 104 154 72 Q 112 100 72 68 Q 34 92 0 58 Z"
                fill={colors.scenery}
              />
            </Svg>
          </Swaying>
        </View>
        <View style={styles.sceneryBottom}>
          <Svg width="100%" height={132} viewBox={`0 0 ${w} 132`} preserveAspectRatio="none">
            <Path
              d="M 0 132 L 0 84 L 38 84 L 38 46 L 74 46 L 74 96 L 118 96 L 118 20 L 158 20 L 158 72 L 200 72 L 200 54 L 248 54 L 248 92 L 292 92 L 292 34 L 336 34 L 336 78 L 400 78 L 400 132 Z"
              fill={colors.scenery}
            />
            {[[128, 34], [140, 52], [306, 48], [318, 66], [50, 60], [212, 68]].map(([x, y], i) => (
              <Rect key={i} x={x} y={y} width={5} height={7} rx={1} fill={colors.sceneryAlt} />
            ))}
          </Svg>
        </View>
      </>
    );
  }

  // Tempest: trees bent hard by the wind, sea churning behind them.
  return (
    <View style={styles.sceneryBottom}>
      <Swaying height={140} pivot="bottom" degrees={2.6} duration={2400}>
        <Svg width="100%" height={140} viewBox={`0 0 ${w} 140`} preserveAspectRatio="none">
          <Path d="M 0 140 L 0 104 Q 60 84 120 102 Q 190 78 260 100 Q 330 80 400 100 L 400 140 Z" fill={colors.scenery} />
          {/* Two trees leaning away from the gust. */}
          <Path d="M 84 140 Q 76 96 44 74" stroke={colors.scenery} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d="M 60 88 Q 34 78 20 62 M 66 100 Q 40 96 24 86" stroke={colors.sceneryAlt} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M 322 140 Q 316 104 292 88" stroke={colors.scenery} strokeWidth={6} strokeLinecap="round" fill="none" />
          <Path d="M 304 98 Q 282 90 270 78" stroke={colors.sceneryAlt} strokeWidth={4} strokeLinecap="round" fill="none" />
          {[[168, 116, 5], [214, 122, 4], [258, 118, 5.5]].map(([cx, cy, r], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill={colors.sceneryAlt} opacity={0.6} />
          ))}
        </Svg>
      </Swaying>
    </View>
  );
}

function StormExtras({ storm, colors }: { storm: Storm; colors: ThemeColors }) {
  switch (storm) {
    case 'drizzle':
      return <DrizzleExtras colors={colors} />;
    case 'downpour':
      return <DownpourExtras colors={colors} />;
    case 'thunder':
      return <ThunderExtras colors={colors} />;
    case 'tempest':
      return <TempestExtras colors={colors} />;
  }
}

// --- Overlay ---------------------------------------------------------------

export function StormOverlay() {
  const { variant: storm, colors } = useMasset<Storm>();
  const drops = useMemo(() => makeRain(storm), [storm]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[colors.skyTop, colors.skyBottom]} style={StyleSheet.absoluteFill} />
      <StormLight key={`light-${storm}`} storm={storm} colors={colors} />
      <StormScenery key={`sce-${storm}`} storm={storm} colors={colors} />
      <StormExtras key={`ext-${storm}`} storm={storm} colors={colors} />
      {drops.map((spec, i) => (
        <Drop key={`${storm}-${i}`} spec={spec} storm={storm} colors={colors} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', top: 0, borderRadius: 2 },
  light: { position: 'absolute' },
  sceneryTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  sceneryBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  mist: { position: 'absolute', left: -SCREEN_W * 0.2, width: SCREEN_W * 1.4, borderRadius: 999 },
  ripple: { position: 'absolute', bottom: 26, borderWidth: 1.5 },
  sheet: { position: 'absolute', top: 0, height: SCREEN_H * 0.5, borderRadius: 6 },
  bolt: { position: 'absolute', top: 0 },
  spray: { position: 'absolute', left: 0, height: 2, borderRadius: 2 },
});
