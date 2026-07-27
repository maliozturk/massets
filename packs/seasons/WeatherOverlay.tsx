// The living environment for the active season, layered back-to-front:
// sky gradient → sun/moon → scenery silhouette → weather → glass drops.
//
// Rain: two-depth streaks plus droplets beading on the "glass" (some slide
// down, like watching rain through a window). Snow: real six-armed flakes
// up close, soft motes far away, all swaying. Springs: petals/leaves that
// wander and spin, and flowers that grow up from the ground, sway, and
// fade. Core-RN Animated (native driver), pointerEvents none.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useMasset } from '../../core/provider';
import type { ThemeColors } from '../../core/tokens';
import type { Season } from './seasons';

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;

// --- Falling particles -----------------------------------------------------

interface ParticleSpec {
  x: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  sway: number;
  spinDir: 1 | -1;
  depth: number;
  alt: boolean;
}

const COUNTS: Record<Season, number> = { rain: 44, snow: 30, blossom: 18, meadow: 14 };

function makeSpecs(season: Season): ParticleSpec[] {
  return Array.from({ length: COUNTS[season] }, () => {
    const r = Math.random();
    const depth = 0.55 + Math.random() * 0.45;
    const base = {
      x: Math.random(),
      depth,
      spinDir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
      alt: Math.random() < 0.45,
    };
    switch (season) {
      case 'rain':
        return { ...base, size: (12 + r * 10) * depth, duration: (700 + r * 500) / depth, delay: Math.random() * 1500, drift: (30 + r * 22) * depth, sway: 0 };
      case 'snow':
        return { ...base, size: (4 + r * 8) * depth, duration: (8000 + r * 6000) / depth, delay: Math.random() * 8000, drift: (Math.random() - 0.5) * 90, sway: 18 + Math.random() * 30 };
      case 'blossom':
        return { ...base, size: (8 + r * 5) * depth, duration: (6500 + r * 4500) / depth, delay: Math.random() * 7000, drift: 40 + Math.random() * 130, sway: 24 + Math.random() * 36 };
      case 'meadow':
        return { ...base, size: (9 + r * 6) * depth, duration: (8000 + r * 5000) / depth, delay: Math.random() * 8000, drift: (Math.random() - 0.5) * 170, sway: 30 + Math.random() * 40 };
    }
  });
}

/** A real six-armed snowflake — near flakes only; far snow reads as motes. */
function SnowflakeShape({ size, color }: { size: number; color: string }) {
  const c = 12;
  const arm = (deg: number) => (
    <Svg key={deg} width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
      <Line x1={c} y1={c} x2={c} y2={2.5} stroke={color} strokeWidth={1.7} strokeLinecap="round" transform={`rotate(${deg} ${c} ${c})`} />
      <Line x1={c} y1={6.5} x2={c - 3} y2={4} stroke={color} strokeWidth={1.3} strokeLinecap="round" transform={`rotate(${deg} ${c} ${c})`} />
      <Line x1={c} y1={6.5} x2={c + 3} y2={4} stroke={color} strokeWidth={1.3} strokeLinecap="round" transform={`rotate(${deg} ${c} ${c})`} />
    </Svg>
  );
  return <View style={{ width: size, height: size }}>{[0, 60, 120, 180, 240, 300].map(arm)}</View>;
}

function particleShape(season: Season, spec: ParticleSpec, colors: ThemeColors): ViewStyle {
  const color = spec.alt ? colors.particleAlt : colors.particle;
  switch (season) {
    case 'rain':
      return { width: 1.2 + spec.depth, height: spec.size, borderRadius: 1, backgroundColor: color };
    case 'snow':
      return { width: spec.size, height: spec.size, borderRadius: spec.size / 2, backgroundColor: color };
    case 'blossom':
      return {
        width: spec.size,
        height: spec.size * 0.72,
        backgroundColor: color,
        borderTopLeftRadius: spec.size,
        borderBottomRightRadius: spec.size,
        borderTopRightRadius: 2,
        borderBottomLeftRadius: 2,
      };
    case 'meadow':
      return {
        width: spec.size,
        height: spec.size * 0.5,
        backgroundColor: color,
        borderTopLeftRadius: spec.size,
        borderBottomRightRadius: spec.size,
        borderTopRightRadius: 1,
        borderBottomLeftRadius: 1,
      };
  }
}

function Particle({ season, spec, colors }: { season: Season; spec: ParticleSpec; colors: ThemeColors }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(spec.delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: spec.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [progress, spec.delay, spec.duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-50, SCREEN_H + 50] });

  const s = spec.sway * spec.spinDir;
  const translateX = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, spec.drift * 0.25 + s, spec.drift * 0.5 - s * 0.6, spec.drift * 0.75 + s * 0.8, spec.drift],
  });

  const spinning = season === 'blossom' || season === 'meadow' || (season === 'snow' && spec.size > 8);
  const rotate = spinning
    ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spec.spinDir * (season === 'snow' ? 140 : 300)}deg`] })
    : season === 'rain'
      ? '10deg'
      : '0deg';

  const peak = 0.35 + spec.depth * 0.65;
  const opacity = progress.interpolate({ inputRange: [0, 0.06, 0.88, 1], outputRange: [0, peak, peak, 0] });

  const isFlake = season === 'snow' && spec.size > 8;

  return (
    <Animated.View
      style={[
        styles.particle,
        !isFlake && particleShape(season, spec, colors),
        { left: spec.x * SCREEN_W, opacity, transform: [{ translateY }, { translateX }, { rotate }] },
      ]}
    >
      {isFlake ? <SnowflakeShape size={spec.size * 1.6} color={spec.alt ? colors.particleAlt : colors.particle} /> : null}
    </Animated.View>
  );
}

// --- Rain on the glass -----------------------------------------------------
// After the reference photo: beads of water sitting on the pane, each with a
// bright rim; now and then one gathers weight and runs down the screen.

interface DropSpec {
  x: number;
  y: number;
  size: number;
  delay: number;
  holdMs: number;
  runner: boolean;
  runDistance: number;
}

function makeDrops(): DropSpec[] {
  return Array.from({ length: 16 }, (_, i) => ({
    x: Math.random() * 0.94 + 0.03,
    y: Math.random() * 0.72 + 0.04,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 9000,
    holdMs: 4000 + Math.random() * 7000,
    runner: i % 4 === 0, // every fourth drop eventually runs down the glass
    runDistance: 140 + Math.random() * (SCREEN_H * 0.5),
  }));
}

function GlassDrop({ spec, colors }: { spec: DropSpec; colors: ThemeColors }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const appearMs = 900;
    const fadeMs = 1400;
    const runMs = 3800;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(progress, { toValue: 0.25, duration: appearMs, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(spec.holdMs),
        Animated.timing(progress, { toValue: 1, duration: spec.runner ? runMs : fadeMs, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [progress, spec.delay, spec.holdMs, spec.runner]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.25, 0.8, 1],
    outputRange: spec.runner ? [0, 0.85, 0.95, 0.9, 0] : [0, 0.85, 0.95, 0.7, 0],
  });
  const translateY = spec.runner
    ? progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0, spec.runDistance] })
    : 0;
  const scale = progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.4, 1, spec.runner ? 1.15 : 1] });

  const w = spec.size;
  const h = spec.size * 1.25;
  return (
    <Animated.View
      style={[
        styles.glassDrop,
        {
          left: spec.x * SCREEN_W,
          top: spec.y * SCREEN_H,
          width: w,
          height: h,
          borderRadius: w,
          backgroundColor: colors.particleAlt,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          left: w * 0.18,
          top: h * 0.16,
          width: w * 0.32,
          height: w * 0.32,
          borderRadius: w,
          backgroundColor: colors.particle,
        }}
      />
    </Animated.View>
  );
}

function RainOnGlass({ colors }: { colors: ThemeColors }) {
  const drops = useMemo(makeDrops, []);
  return (
    <>
      {drops.map((spec, i) => (
        <GlassDrop key={i} spec={spec} colors={colors} />
      ))}
    </>
  );
}

// --- Growing flowers (springs) --------------------------------------------

interface FlowerSpec {
  x: number; // 0..1
  height: number;
  headSize: number;
  delay: number;
  lifeMs: number;
  swayDir: 1 | -1;
}

function makeFlowers(count: number): FlowerSpec[] {
  return Array.from({ length: count }, () => ({
    x: 0.06 + Math.random() * 0.88,
    height: 44 + Math.random() * 30,
    headSize: 11 + Math.random() * 6,
    delay: Math.random() * 12000,
    lifeMs: 12000 + Math.random() * 8000,
    swayDir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
  }));
}

function Flower({ spec, season, colors }: { spec: FlowerSpec; season: Season; colors: ThemeColors }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(progress, { toValue: 1, duration: spec.lifeMs, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [progress, spec.delay, spec.lifeMs]);

  const H = spec.height + spec.headSize;
  // Grow from the soil (scale anchored at the bottom), sway, then fade.
  const scaleVals = [0, 1, 1, 1, 1];
  const inputRange = [0, 0.2, 0.5, 0.9, 1];
  const scale = progress.interpolate({ inputRange, outputRange: scaleVals });
  const anchorY = progress.interpolate({ inputRange, outputRange: scaleVals.map((v) => ((1 - v) * H) / 2) });
  const opacity = progress.interpolate({ inputRange: [0, 0.06, 0.2, 0.88, 1], outputRange: [0, 0.6, 1, 1, 0] });
  const sway = progress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: ['0deg', '0deg', `${4 * spec.swayDir}deg`, `${-3 * spec.swayDir}deg`, `${4 * spec.swayDir}deg`, '0deg'],
  });

  const petal = season === 'blossom' ? colors.particle : colors.scenery;
  const petalAlt = season === 'blossom' ? colors.particleAlt : colors.particle;
  const core = colors.celestial;
  const stem = season === 'blossom' ? colors.scenery : colors.sceneryAlt;
  const hs = spec.headSize;

  return (
    <Animated.View
      style={[
        styles.flower,
        { left: spec.x * SCREEN_W, height: H, opacity, transform: [{ translateY: anchorY }, { scale }, { rotate: sway }] },
      ]}
    >
      <Svg width={hs * 2.4} height={H} viewBox={`0 0 ${hs * 2.4} ${H}`}>
        <Path
          d={`M ${hs * 1.2} ${H} Q ${hs * 1.2 + 4 * spec.swayDir} ${H - spec.height * 0.55} ${hs * 1.2} ${hs * 1.1}`}
          stroke={stem}
          strokeWidth={2.2}
          fill="none"
        />
        <Path
          d={`M ${hs * 1.2} ${H - spec.height * 0.45} q ${7 * spec.swayDir} -2 ${9 * spec.swayDir} -8`}
          stroke={stem}
          strokeWidth={1.8}
          fill="none"
        />
        {[0, 72, 144, 216, 288].map((deg) => (
          <Circle
            key={deg}
            cx={hs * 1.2}
            cy={hs * 0.62}
            r={hs * 0.34}
            fill={deg % 144 === 0 ? petal : petalAlt}
            transform={`rotate(${deg} ${hs * 1.2} ${hs * 1.1})`}
          />
        ))}
        <Circle cx={hs * 1.2} cy={hs * 1.1} r={hs * 0.26} fill={core} />
      </Svg>
    </Animated.View>
  );
}

function GrowingFlora({ season, colors }: { season: Season; colors: ThemeColors }) {
  const flowers = useMemo(() => makeFlowers(season === 'meadow' ? 7 : 5), [season]);
  return (
    <>
      {flowers.map((spec, i) => (
        <Flower key={i} spec={spec} season={season} colors={colors} />
      ))}
    </>
  );
}

// --- Sun / moon ------------------------------------------------------------

const CELESTIAL: Record<Season, { x: number; y: number; r: number }> = {
  rain: { x: 0.78, y: 0.1, r: 24 },
  snow: { x: 0.74, y: 0.12, r: 26 },
  blossom: { x: 0.24, y: 0.2, r: 34 },
  meadow: { x: 0.72, y: 0.16, r: 30 },
};

function CelestialBody({ season, colors }: { season: Season; colors: ThemeColors }) {
  const { x, y, r } = CELESTIAL[season];
  const cx = x * SCREEN_W;
  const cy = y * SCREEN_H;

  if (season === 'rain') {
    // Crescent moon with a faint halo.
    return (
      <>
        <View style={[styles.celestial, glowRing(cx, cy, r * 2.6, colors.celestialGlow)]} />
        <Svg style={[styles.celestial, { left: cx - r, top: cy - r }]} width={r * 2} height={r * 2} viewBox="0 0 48 48">
          <Path d="M 33 4 A 20 20 0 1 0 44 27 A 16 16 0 0 1 33 4 Z" fill={colors.celestial} />
        </Svg>
      </>
    );
  }

  // Suns: a smooth five-ring glow falloff around a soft core — no hard edges.
  return (
    <>
      {[4.6, 3.4, 2.4, 1.7, 1.25].map((k, i) => (
        <View key={i} style={[styles.celestial, glowRing(cx, cy, r * k, colors.celestialGlow)]} />
      ))}
      <View style={[styles.celestial, glowRing(cx, cy, r, colors.celestial)]} />
      <View style={[styles.celestial, glowRing(cx, cy, r * 0.62, colors.surface)]} />
    </>
  );
}

function glowRing(cx: number, cy: number, radius: number, backgroundColor: string): ViewStyle {
  return { left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor };
}

// --- Scenery silhouettes ---------------------------------------------------

function SeasonScenery({ season, colors }: { season: Season; colors: ThemeColors }) {
  const w = 400;

  if (season === 'blossom') {
    return (
      <View style={styles.sceneryTop}>
        <Svg width="100%" height={150} viewBox={`0 0 ${w} 150`} preserveAspectRatio="none">
          <Path
            d="M 400 6 C 330 14 280 30 236 62 M 400 6 C 344 34 318 52 296 88 M 316 40 C 300 58 292 74 288 96 M 260 48 C 250 62 246 74 244 88"
            stroke={colors.scenery}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
          {[
            [236, 62, 11], [252, 52, 8], [270, 44, 10], [296, 88, 10], [306, 74, 8],
            [288, 96, 8], [318, 56, 9], [244, 88, 8], [252, 76, 6], [340, 36, 9],
            [356, 26, 7], [280, 58, 7],
          ].map(([cx, cy, r], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill={colors.sceneryAlt} />
          ))}
        </Svg>
      </View>
    );
  }

  if (season === 'meadow') {
    const blades = Array.from({ length: 26 }, (_, i) => {
      const bx = 4 + i * 15.5;
      const h = 26 + ((i * 37) % 30);
      const lean = ((i * 53) % 17) - 8;
      return `M ${bx} 90 Q ${bx + lean * 0.4} ${90 - h * 0.6} ${bx + lean} ${90 - h}`;
    }).join(' ');
    return (
      <View style={styles.sceneryBottom}>
        <Svg width="100%" height={90} viewBox={`0 0 ${w} 90`} preserveAspectRatio="none">
          <Path d={blades} stroke={colors.scenery} strokeWidth={3} strokeLinecap="round" fill="none" />
          {[
            [38, 42], [102, 34], [178, 46], [251, 36], [322, 44], [376, 38],
          ].map(([cx, cy], i) => (
            <Circle key={i} cx={cx} cy={cy} r={4.5} fill={i % 2 === 0 ? colors.sceneryAlt : colors.particle} />
          ))}
        </Svg>
      </View>
    );
  }

  if (season === 'snow') {
    return (
      <View style={styles.sceneryBottom}>
        <Svg width="100%" height={110} viewBox={`0 0 ${w} 110`} preserveAspectRatio="none">
          <Path d="M 60 62 L 76 26 L 92 62 Z M 68 46 L 76 30 L 84 46 Z" fill={colors.sceneryAlt} />
          <Path d="M 322 58 L 336 30 L 350 58 Z" fill={colors.sceneryAlt} />
          <Path d="M 0 84 Q 100 44 200 74 T 400 64 L 400 110 L 0 110 Z" fill={colors.sceneryAlt} />
          <Path d="M 0 92 Q 120 62 240 88 T 400 82 L 400 110 L 0 110 Z" fill={colors.scenery} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={styles.sceneryBottom}>
      <Svg width="100%" height={120} viewBox={`0 0 ${w} 120`} preserveAspectRatio="none">
        <Path
          d="M 0 120 L 0 70 L 34 70 L 34 44 L 62 44 L 62 78 L 96 78 L 96 30 L 130 30 L 130 66 L 158 66 L 158 52 L 196 52 L 196 82 L 232 82 L 232 24 L 262 24 L 262 60 L 300 60 L 300 44 L 330 44 L 330 74 L 368 74 L 368 56 L 400 56 L 400 120 Z"
          fill={colors.scenery}
        />
        {[
          [104, 40], [116, 54], [240, 34], [252, 48], [270, 68], [40, 54], [308, 52], [338, 82], [170, 60],
        ].map(([x, y], i) => (
          <Rect key={i} x={x} y={y} width={5} height={7} rx={1} fill={colors.sceneryAlt} />
        ))}
      </Svg>
    </View>
  );
}

// --- Overlay ---------------------------------------------------------------

export function WeatherOverlay() {
  const { variant: season, colors } = useMasset<Season>();
  const specs = useMemo(() => makeSpecs(season), [season]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[colors.skyTop, colors.skyBottom]} style={StyleSheet.absoluteFill} />
      <CelestialBody season={season} colors={colors} />
      <SeasonScenery season={season} colors={colors} />
      {(season === 'blossom' || season === 'meadow') && <GrowingFlora season={season} colors={colors} />}
      {specs.map((spec, i) => (
        <Particle key={`${season}-${i}`} season={season} spec={spec} colors={colors} />
      ))}
      {season === 'rain' && <RainOnGlass colors={colors} />}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
  },
  celestial: {
    position: 'absolute',
  },
  glassDrop: {
    position: 'absolute',
  },
  flower: {
    position: 'absolute',
    bottom: 6,
  },
  sceneryTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  sceneryBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
