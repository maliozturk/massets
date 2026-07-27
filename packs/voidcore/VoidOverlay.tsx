// The void core: a turning vortex that reacts to the live signal.
//
// Layered back-to-front:
//   deep field → parallax starfield → outer swirl → mid swirl → fast swirl
//   → throat gradient → lit rim + hotspot → infalling dust → rim lightning
//   → the strike it throws at whatever is pointed at
//
// It is never still. At rest the swirls turn at three different rates, dust
// spirals down the throat and lightning crawls around the rim now and then.
//
// The two live inputs (core/signal.tsx):
//
//   pulse  0→1   the fast inner swirl fades up (which is what reads as
//                "spinning harder" — see the note on speed below), the rim
//                brightens, the throat opens, more lightning emitters arm,
//                and the whole disc takes a rotational kick.
//   focus  x,y   the disc leans toward the point, and the core throws a
//                forked bolt at it, over and over while it is held.
//
// On speed: an Animated.loop cannot change duration without being restarted,
// and restarting snaps the rotation back to zero — visibly. So "faster" is
// built instead from a third swirl layer that runs fast permanently and fades
// in with pulse, plus an eased rotational kick. The eye reads acceleration;
// nothing ever jumps.
//
// Native driver throughout: transform and opacity only.

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  FeTurbulence,
  FeDisplacementMap,
  Filter,
  G,
  Polyline,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useLoop } from '../../core/animation';
import { useMasset } from '../../core/provider';
import { useMassetSignal } from '../../core/signal';
import type { ThemeColors } from '../../core/tokens';
import { boltPoints, forkPoints, spiralPath, type Void } from './voids';

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;

// The disc sits above centre, the way the reference frames it.
const CX = SCREEN_W * 0.5;
const CY = SCREEN_H * 0.42;
const R = Math.min(SCREEN_W, SCREEN_H) * 0.46;

// --- Starfield -------------------------------------------------------------

interface StarSpec {
  x: number;
  y: number;
  size: number;
  depth: number;
  dur: number;
  delay: number;
  warm: boolean;
}

function makeStars(count: number): StarSpec[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: 0.8 + Math.random() * 2.2,
    depth: 0.3 + Math.random() * 0.7,
    dur: 1400 + Math.random() * 3200,
    delay: Math.random() * 4000,
    // A handful of warm specks, as in the reference — they stop the field
    // reading as a uniform blue dust.
    warm: Math.random() < 0.06,
  }));
}

function Star({ spec, colors, lean }: { spec: StarSpec; colors: ThemeColors; lean: Animated.Value }) {
  const twinkle = useLoop({ duration: spec.dur, delay: spec.delay });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: spec.x * SCREEN_W,
        top: spec.y * SCREEN_H,
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size,
        backgroundColor: spec.warm ? colors.ember : spec.depth > 0.75 ? colors.particle : colors.particleAlt,
        opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.25 * spec.depth, spec.depth] }),
        // Nearer stars shift further as the disc leans — parallax depth.
        transform: [{ translateX: Animated.multiply(lean, spec.depth * -22) }],
      }}
    />
  );
}

// --- Swirl layers ----------------------------------------------------------

/**
 * One rotating band of the accretion swirl. Broken concentric strokes plus a
 * dash offset per ring is what produces the striated, drawn-out look rather
 * than a set of clean circles.
 */
function Swirl({
  colors,
  radius,
  rings,
  duration,
  reverse,
  opacity,
  kick,
  uid,
  wisp,
}: {
  colors: ThemeColors;
  radius: number;
  rings: number;
  duration: number;
  reverse?: boolean;
  opacity: Animated.AnimatedInterpolation<number> | number;
  kick: Animated.AnimatedInterpolation<string>;
  /** Unique per instance — SVG filter ids are global within a document. */
  uid: string;
  /** How hard the turbulence pulls the bands out of true. 0 disables the filter. */
  wisp: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [spin, duration]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });

  const size = radius * 2;
  const bands = useMemo(
    () =>
      Array.from({ length: rings }, (_, i) => {
        const t = (i + 1) / rings;
        const r = radius * (0.28 + t * 0.72);
        // Longer gaps further out; tighter, brighter striations near the throat.
        const dashOn = 6 + (1 - t) * 46 + i * 3;
        const dashOff = 10 + t * 90;
        return { r, dashOn, dashOff, width: 1 + (1 - t) * 3.2, alpha: 0.14 + (1 - t) * 0.5, offset: i * 37 };
      }),
    [radius, rings]
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.centred,
        { width: size, height: size, left: CX - radius, top: CY - radius, opacity },
        { transform: [{ rotate }, { rotate: kick }] },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Turbulence pulls the concentric strokes off true and a blur pass
              sits under them. This is the difference between reading as dust
              lanes and reading as a set of dashed circles — the single biggest
              quality lever in the whole overlay. */}
          <Filter id={`wisp-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
            <FeTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves={2} seed={uid.length * 7} result="noise" />
            <FeDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={wisp}
              xChannelSelector="R"
              yChannelSelector="G"
              result="disp"
            />
            <FeGaussianBlur in="disp" stdDeviation={2.2} result="soft" />
            <FeMerge>
              <FeMergeNode in="soft" />
              <FeMergeNode in="disp" />
            </FeMerge>
          </Filter>
        </Defs>
        <G filter={wisp > 0 ? `url(#wisp-${uid})` : undefined}>
          {bands.map((b, i) => (
            <Circle
              key={i}
              cx={radius}
              cy={radius}
              r={b.r}
              stroke={i % 3 === 0 ? colors.sceneryAlt : colors.scenery}
              strokeWidth={b.width}
              strokeDasharray={`${b.dashOn} ${b.dashOff}`}
              strokeDashoffset={b.offset}
              strokeLinecap="round"
              fill="none"
              opacity={b.alpha}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

// --- Throat and rim --------------------------------------------------------

/** The mouth: black at the centre, light gathering at the edge. */
function Throat({ colors, scale }: { colors: ThemeColors; scale: Animated.AnimatedInterpolation<number> }) {
  const size = R * 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.centred, { width: size, height: size, left: CX - R, top: CY - R, transform: [{ scale }] }]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="throat" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.bgDeep} stopOpacity={1} />
            <Stop offset="42%" stopColor={colors.bgDeep} stopOpacity={0.96} />
            <Stop offset="62%" stopColor={colors.scenery} stopOpacity={0.6} />
            <Stop offset="78%" stopColor={colors.celestialGlow} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={colors.celestialGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={R} cy={R} r={R} fill="url(#throat)" />
      </Svg>
    </Animated.View>
  );
}

/** The lit inner edge, with one arc brighter than the rest, turning slowly. */
function Rim({ colors, brightness }: { colors: ThemeColors; brightness: Animated.AnimatedInterpolation<number> }) {
  const spin = useLoop({ duration: 16000, reverse: false, easing: Easing.linear });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rr = R * 0.62;
  const size = rr * 2 + 24;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.centred, { width: size, height: size, left: CX - size / 2, top: CY - size / 2, opacity: brightness }]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={rr} stroke={colors.sceneryAlt} strokeWidth={2.4} fill="none" opacity={0.55} />
          <Circle cx={size / 2} cy={size / 2} r={rr - 5} stroke={colors.celestial} strokeWidth={1.1} fill="none" opacity={0.35} />
        </Svg>
      </Animated.View>

      {/* The hotspot: a bright arc sweeping the rim. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.centred,
          { width: size, height: size, left: CX - size / 2, top: CY - size / 2, opacity: brightness, transform: [{ rotate }] },
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={rr}
            stroke={colors.celestial}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${rr * 1.1} ${rr * 10}`}
            fill="none"
            opacity={0.85}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={rr}
            stroke={colors.celestial}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${rr * 0.7} ${rr * 10}`}
            fill="none"
            opacity={0.18}
          />
        </Svg>
      </Animated.View>
    </>
  );
}

// --- Infalling dust --------------------------------------------------------

interface MoteSpec {
  path: [number, number][];
  size: number;
  dur: number;
  delay: number;
  alt: boolean;
}

function makeMotes(count: number): MoteSpec[] {
  return Array.from({ length: count }, () => ({
    path: spiralPath(R * (0.9 + Math.random() * 0.5), 0.8 + Math.random() * 0.9, 10, Math.random() * Math.PI * 2),
    size: 1.4 + Math.random() * 2.6,
    dur: 4200 + Math.random() * 5200,
    delay: Math.random() * 6000,
    alt: Math.random() < 0.5,
  }));
}

function Mote({ spec, colors }: { spec: MoteSpec; colors: ThemeColors }) {
  const progress = useLoop({ duration: spec.dur, delay: spec.delay, reverse: false, easing: Easing.in(Easing.quad) });
  const range = spec.path.map((_, i) => i / (spec.path.length - 1));

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: CX,
        top: CY,
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size,
        backgroundColor: spec.alt ? colors.particleAlt : colors.celestial,
        opacity: progress.interpolate({ inputRange: [0, 0.1, 0.72, 1], outputRange: [0, 0.75, 0.5, 0] }),
        transform: [
          { translateX: progress.interpolate({ inputRange: range, outputRange: spec.path.map((p) => p[0]) }) },
          { translateY: progress.interpolate({ inputRange: range, outputRange: spec.path.map((p) => p[1]) }) },
          // Stretched as it accelerates in — matter being drawn out.
          { scaleX: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 2.4, 4] }) },
        ],
      }}
    />
  );
}

// --- Lightning -------------------------------------------------------------

/**
 * A forked bolt. Two strokes per path — a wide soft glow under a narrow bright
 * core — which is what stops it reading as a bent wire.
 */
function Bolt({
  colors,
  length,
  seed,
  strokeScale = 1,
}: {
  colors: ThemeColors;
  length: number;
  seed: number;
  strokeScale?: number;
}) {
  const geom = useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    const main = boltPoints(length, 9, length * 0.09, rand);
    const forks = [
      forkPoints(length, 0.32, -38 - rand() * 24, rand),
      forkPoints(length, 0.58, 34 + rand() * 26, rand),
      forkPoints(length, 0.76, -26 - rand() * 20, rand),
    ];
    return { main, forks };
  }, [length, seed]);

  const h = Math.max(56, length * 0.5);
  const fid = `bolt-${seed}`;
  return (
    <Svg width={length} height={h} viewBox={`0 ${-h / 2} ${length} ${h}`}>
      <Defs>
        {/* Real bloom: blur the whole bolt and merge it under itself twice, so
            the halo builds up the way an additive blend would. A fat stroke
            alone reads as a bent wire. */}
        <Filter id={fid} x="-40%" y="-140%" width="180%" height="380%">
          <FeGaussianBlur in="SourceGraphic" stdDeviation={5.5 * strokeScale} result="wide" />
          <FeGaussianBlur in="SourceGraphic" stdDeviation={1.8 * strokeScale} result="tight" />
          <FeMerge>
            <FeMergeNode in="wide" />
            <FeMergeNode in="wide" />
            <FeMergeNode in="tight" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>
      <G filter={`url(#${fid})`}>
        <Polyline
          points={geom.main}
          fill="none"
          stroke={colors.sceneryAlt}
          strokeWidth={4.2 * strokeScale}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        {geom.forks.map((f, i) => (
          <Polyline
            key={i}
            points={f}
            fill="none"
            stroke={colors.sceneryAlt}
            strokeWidth={1.8 * strokeScale}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}
        {/* Bright core, drawn last so it sits on top of its own glow. */}
        <Polyline
          points={geom.main}
          fill="none"
          stroke={colors.celestial}
          strokeWidth={1.7 * strokeScale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

/**
 * A bolt crawling around the rim, firing on its own clock. Several of these
 * are armed at different pulse thresholds, so the storm thickens as the core
 * reacts without any loop being restarted.
 */
function RimStrike({
  colors,
  angleDeg,
  length,
  seed,
  delay,
  rest,
  armed,
}: {
  colors: ThemeColors;
  angleDeg: number;
  length: number;
  seed: number;
  delay: number;
  rest: number;
  armed: Animated.AnimatedInterpolation<number> | number;
}) {
  const progress = useLoop({ duration: 620, reverse: false, delay, restAfterMs: rest, easing: Easing.linear });
  const flicker = progress.interpolate({
    inputRange: [0, 0.08, 0.16, 0.26, 0.38, 0.52, 1],
    outputRange: [0, 1, 0.2, 0.85, 0.15, 0, 0],
  });
  const rad = (angleDeg * Math.PI) / 180;
  const startR = R * 0.6;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: CX + Math.cos(rad) * startR,
        top: CY + Math.sin(rad) * startR,
        opacity: typeof armed === 'number' ? Animated.multiply(flicker, armed) : Animated.multiply(flicker, armed),
        transform: [{ rotate: `${angleDeg + 90}deg` }],
      }}
    >
      <Bolt colors={colors} length={length} seed={seed} strokeScale={0.75} />
    </Animated.View>
  );
}

// --- Overlay ---------------------------------------------------------------

export function VoidOverlay() {
  const { colors } = useMasset<Void>();
  const { pulse, focus } = useMassetSignal();

  const stars = useMemo(() => makeStars(120), []);
  const motes = useMemo(() => makeMotes(34), []);

  // Everything reactive eases toward its target rather than snapping.
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, { toValue: pulse, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [p, pulse]);

  // Lean: -1 (focus hard left) through +1 (hard right), 0 when nothing is held.
  const leanX = useRef(new Animated.Value(0)).current;
  const leanY = useRef(new Animated.Value(0)).current;
  const focusOn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tx = focus ? (focus.x - 0.5) * 2 : 0;
    const ty = focus ? (focus.y - 0.5) * 2 : 0;
    Animated.parallel([
      Animated.timing(leanX, { toValue: tx, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(leanY, { toValue: ty, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(focusOn, { toValue: focus ? 1 : 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [focus, leanX, leanY, focusOn]);

  // The strike at whatever is being pointed at: geometry from the current
  // focus, fired repeatedly by its own loop.
  const strike = useLoop({ duration: 520, reverse: false, restAfterMs: 260, easing: Easing.linear });
  const strikeGeom = useMemo(() => {
    if (!focus) return null;
    const fx = focus.x * SCREEN_W;
    const fy = focus.y * SCREEN_H;
    const dx = fx - CX;
    const dy = fy - CY;
    const dist = Math.hypot(dx, dy);
    return { angle: (Math.atan2(dy, dx) * 180) / Math.PI, length: Math.max(60, dist) };
  }, [focus]);

  const kick = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '34deg'] });
  const throatScale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] });
  const rimBrightness = p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const fastSwirlOpacity = p.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.92] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgDeep }]}>
      {stars.map((spec, i) => (
        <Star key={i} spec={spec} colors={colors} lean={leanX} />
      ))}

      {/* The disc leans toward whatever is held, and drifts back when released. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateX: Animated.multiply(leanX, 26) },
              { translateY: Animated.multiply(leanY, 16) },
              { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
            ],
          },
        ]}
      >
        {/* Outer haze is displaced hardest — it is furthest from the throat and
            least held together by it. The fast inner layer stays cleaner so it
            still reads as motion when it fades up. */}
        <Swirl colors={colors} radius={R * 1.24} rings={9} duration={92000} opacity={0.5} kick={kick} uid="outer" wisp={22} />
        <Swirl colors={colors} radius={R} rings={11} duration={54000} reverse opacity={0.85} kick={kick} uid="mid" wisp={14} />
        <Swirl
          colors={colors}
          radius={R * 0.78}
          rings={8}
          duration={19000}
          opacity={fastSwirlOpacity}
          kick={kick}
          uid="inner"
          wisp={7}
        />

        <Throat colors={colors} scale={throatScale} />
        <Rim colors={colors} brightness={rimBrightness} />

        {motes.map((spec, i) => (
          <Mote key={i} spec={spec} colors={colors} />
        ))}

        {/* Rim lightning. The first is always armed; the rest arm as pulse rises,
            so the storm thickens with the reaction. */}
        <RimStrike colors={colors} angleDeg={-64} length={R * 0.82} seed={11} delay={1800} rest={7600} armed={1} />
        <RimStrike colors={colors} angleDeg={128} length={R * 0.66} seed={29} delay={4600} rest={9200} armed={p.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' })} />
        <RimStrike colors={colors} angleDeg={26} length={R * 0.74} seed={47} delay={2600} rest={5200} armed={p.interpolate({ inputRange: [0.2, 0.55], outputRange: [0, 1], extrapolate: 'clamp' })} />
        <RimStrike colors={colors} angleDeg={-142} length={R * 0.58} seed={83} delay={900} rest={4200} armed={p.interpolate({ inputRange: [0.45, 0.8], outputRange: [0, 1], extrapolate: 'clamp' })} />
        <RimStrike colors={colors} angleDeg={82} length={R * 0.9} seed={101} delay={3200} rest={3400} armed={p.interpolate({ inputRange: [0.7, 1], outputRange: [0, 1], extrapolate: 'clamp' })} />
      </Animated.View>

      {/* What it throws at the point being held. */}
      {strikeGeom ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: CX,
            top: CY,
            opacity: Animated.multiply(
              focusOn,
              strike.interpolate({
                inputRange: [0, 0.07, 0.15, 0.24, 0.36, 0.5, 1],
                outputRange: [0, 1, 0.25, 0.9, 0.2, 0, 0],
              })
            ),
            transform: [{ rotate: `${strikeGeom.angle}deg` }],
          }}
        >
          <Bolt colors={colors} length={strikeGeom.length} seed={Math.round(strikeGeom.angle) + 7} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { position: 'absolute' },
});
