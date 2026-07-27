// The void core: a face-on disc of filaments that reacts to the live signal.
//
// Layered back-to-front:
//   deep field → star specks → five filament bands → directional light
//   → infalling dust → vignette
//
// The whole picture is made of hairline strokes at low alpha. There is not a
// single outline in it: the core boundary, the outer rim and the lit arc are
// all stroke density. Anything you can point at and call a shape would break
// it.
//
// Four things carry the effect, in order of how much they matter:
//
//   1. Arm structure. Seen face-on the winding IS the subject, so filament
//      density is modulated by 0.5 + 0.5·sin(3θ − k·ln r) into three arms.
//      Without it the disc is a uniform smear.
//   2. The directional light. A face-on circle has no near rim to sit behind,
//      so the asymmetry has to be lit: one arc hot, the opposite nearly out,
//      smooth the whole way round.
//   3. The core is a hole, not a disc drawn over the top — density ramps to
//      nothing at 0.28 of the outer radius, and again over the last 8% at the
//      rim, so both boundaries read as edges without either being stroked.
//   4. Density. Nothing is drawn brightly; ~180 filaments overlap into the
//      value structure.
//
// The two live inputs (core/signal.tsx):
//
//   pulse  0→1   the inner bands fade up (which is what reads as "spinning
//                harder" — see the note on speed below), the light gathers,
//                and the disc takes a rotational kick.
//   focus  x,y   the disc leans toward the point and the flow brightens
//                around it, easing back over ~600ms. A reaction, not a blink.
//
// On speed: an Animated.loop cannot change duration without being restarted,
// and restarting snaps the rotation back to zero — visibly. So "faster" is
// built from the inner bands fading up plus an eased rotational kick. The eye
// reads acceleration; nothing ever jumps.
//
// On differential rotation: the showroom's canvas recomputes arm density from
// each particle's current (r, θ) every frame, so its arms are a density wave
// and survive the inner disc lapping the outer one. Here the geometry is
// static and only the band rotates, so bands running at different rates would
// wind the arms apart within a minute. All five therefore share one period,
// and the shear is carried by the log-spiral shape of the filaments instead.
// That is the one structural thing the phone cannot do that the preview can.
//
// Native driver throughout: transform and opacity only.

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, PixelRatio, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop, Circle } from 'react-native-svg';

import { useLoop } from '../../core/animation';
import { useMasset } from '../../core/provider';
import { useMassetSignal } from '../../core/signal';
import type { ThemeColors } from '../../core/tokens';
import { filaments, spiralPath, type Void } from './voids';

const SCREEN_H = Dimensions.get('window').height;
const SCREEN_W = Dimensions.get('window').width;

// Concentric with the frame.
const CX = SCREEN_W * 0.5;
const CY = SCREEN_H * 0.5;
const R = Math.min(SCREEN_W, SCREEN_H) * 0.42;

/** The hole, as a fraction of the outer radius. */
const R_CORE = 0.32;
/** Both boundaries ramp out over this much of the radius. */
const EDGE = 0.08;

/** Three arms; k ≈ 3m winds them about half a turn across the disc. */
const ARMS = { m: 3, k: 3.2 };

/** Where the light sits. Everything else follows from this being fixed. */
const LIGHT_DEG = 215;

/** One turn in two minutes, one direction, never restarted. */
const PERIOD = 120000;

/**
 * The turn is not steady. Ten legs cover the same 360°, their durations set so
 * angular speed follows a sine between 0.55× and 1.45× — adjacent legs differ
 * by at most a quarter, which reads as the disc gathering pace and easing off
 * rather than as ten gear changes. A metronome is what makes a loop read as a
 * loop.
 *
 * It has to be one shared driver, not one per band: five bands wandering
 * independently would pull the spiral arms apart within a minute.
 */
function useWanderingSpin(): Animated.Value {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const legs = 10;
    const speed = Array.from({ length: legs }, (_, i) => 1 + 0.45 * Math.sin((i / legs) * Math.PI * 2));
    const total = speed.reduce((sum, s) => sum + 1 / s, 0);
    const steps = speed.map((s, i) =>
      Animated.timing(spin, {
        toValue: (i + 1) / legs,
        duration: (PERIOD * (1 / s)) / total,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    // 1 → 0 is 360° → 0°, so the reset is invisible.
    steps.push(Animated.timing(spin, { toValue: 0, duration: 0, useNativeDriver: true }));
    const anim = Animated.loop(Animated.sequence(steps));
    anim.start();
    return () => anim.stop();
  }, [spin]);

  return spin;
}

// Stroke widths are specified in device pixels and converted, because 0.4dp on
// a 3× phone is a different line from 0.4dp on a 2× one. Below about 0.22dp
// react-native-svg stops drawing reliably, so the front bands clamp there on
// dense displays — that is the floor of what SVG will render, not a choice.
const DPX = 1 / PixelRatio.get();
const stroke = (devicePx: number) => Math.max(0.22, devicePx * DPX);

/**
 * The five bands, back to front: alpha up, width down, wobble down. They are
 * depth tiers, not radii — each spans most of the disc, so they overlay rather
 * than nesting, and the arms line up across all five.
 *
 * `tone` indexes the palette ramp: shadows deep, midtones steel, cores near
 * white. One flat colour across all five reads dead.
 */
const BANDS = [
  { rInner: R_CORE, rOuter: 1.0, count: 34, span: 0.9, width: 1.2, alpha: 0.18, meso: 0.075, tone: 0 },
  { rInner: R_CORE, rOuter: 0.94, count: 40, span: 0.78, width: 0.95, alpha: 0.22, meso: 0.058, tone: 0 },
  { rInner: R_CORE, rOuter: 0.88, count: 44, span: 0.66, width: 0.75, alpha: 0.26, meso: 0.042, tone: 1 },
  { rInner: R_CORE, rOuter: 0.8, count: 44, span: 0.55, width: 0.55, alpha: 0.3, meso: 0.027, tone: 1 },
  { rInner: R_CORE, rOuter: 0.72, count: 38, span: 0.45, width: 0.4, alpha: 0.34, meso: 0.016, tone: 2 },
] as const;

/** The box every band is drawn in. */
const BOX = R * 2;

function toneColor(colors: ThemeColors, tone: number): string {
  return tone === 0 ? colors.scenery : tone === 1 ? colors.sceneryAlt : colors.celestial;
}

/** Cubic smoothstep, used for both boundary ramps. */
function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// --- Starfield -------------------------------------------------------------

interface StarSpec {
  x: number;
  y: number;
  size: number;
  depth: number;
  alpha: number;
  /** Scintillation depth. 0 for the majority, which are dead still. */
  twinkle: number;
  dur: number;
  delay: number;
  /** 0 hot white, 1 cool blue, 2 warm. */
  hue: 0 | 1 | 2;
}

function starColor(colors: ThemeColors, hue: number): string {
  return hue === 2 ? colors.ember : hue === 1 ? colors.particleAlt : colors.particle;
}

/**
 * The field. A real sky is mostly faint — brightness runs as a steep power
 * law, so a handful carry the eye and the rest are dust — and it is not all
 * one colour. Specks are kept off the disc: anything landing on the outer
 * haze competes with the filaments instead of sitting behind them.
 */
function makeStars(count: number): StarSpec[] {
  const clear = (R * 1.16) ** 2;
  return Array.from({ length: count }, () => {
    let x = 0;
    let y = 0;
    for (let i = 0; i < 60; i++) {
      x = Math.random();
      y = Math.random();
      const dx = x * SCREEN_W - CX;
      const dy = y * SCREEN_H - CY;
      if (dx * dx + dy * dy > clear) break;
    }
    const mag = Math.random();
    const h = Math.random();
    return {
      x,
      y,
      size: mag > 0.93 ? 2 : 1,
      depth: 0.3 + Math.random() * 0.7,
      alpha: 0.12 + 0.82 * mag * mag * mag,
      // A sky where everything twinkles reads as a screensaver, and 150
      // Animated.Values would cost more than the disc does.
      twinkle: Math.random() < 0.22 ? 0.2 + Math.random() * 0.3 : 0,
      dur: 2600 + Math.random() * 4200,
      delay: Math.random() * 5000,
      hue: h < 0.07 ? 2 : h < 0.42 ? 1 : 0,
    };
  });
}

function starStyle(spec: StarSpec, colors: ThemeColors, lean: Animated.Value) {
  return {
    position: 'absolute' as const,
    left: spec.x * SCREEN_W,
    top: spec.y * SCREEN_H,
    width: spec.size,
    height: spec.size,
    borderRadius: spec.size,
    backgroundColor: starColor(colors, spec.hue),
    // Nearer specks shift further as the disc leans — parallax depth.
    transform: [{ translateX: Animated.multiply(lean, spec.depth * -22) }],
  };
}

function StillStar({ spec, colors, lean }: { spec: StarSpec; colors: ThemeColors; lean: Animated.Value }) {
  return <Animated.View style={[starStyle(spec, colors, lean), { opacity: spec.alpha }]} />;
}

function TwinklingStar({ spec, colors, lean }: { spec: StarSpec; colors: ThemeColors; lean: Animated.Value }) {
  const t = useLoop({ duration: spec.dur, delay: spec.delay });
  return (
    <Animated.View
      style={[
        starStyle(spec, colors, lean),
        { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [spec.alpha * (1 - spec.twinkle), spec.alpha] }) },
      ]}
    />
  );
}

/**
 * The deep field. Deliberately almost nothing.
 *
 * A halo around the disc and real dust clouds were both tried here and both
 * fogged the picture: any wash over the filaments costs contrast and the
 * result reads as out of focus. Space is clear and black — the realism comes
 * from the starfield. What is left is two corner clouds at a barely-there
 * alpha, kept well off the disc, only so the corners are not perfectly flat.
 */
function DeepField({ colors }: { colors: ThemeColors }) {
  const clouds = [
    { x: 0.12, y: 0.14, r: 0.34, c: colors.scenery, a: 0.05 },
    { x: 0.9, y: 0.88, r: 0.3, c: colors.celestialGlow, a: 0.035 },
  ];
  const m = Math.min(SCREEN_W, SCREEN_H);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={SCREEN_W} height={SCREEN_H} viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}>
        <Defs>
          {clouds.map((c, i) => (
            <RadialGradient key={i} id={`void-cloud-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={c.c} stopOpacity={c.a} />
              <Stop offset="50%" stopColor={c.c} stopOpacity={c.a * 0.3} />
              <Stop offset="100%" stopColor={c.c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {clouds.map((c, i) => (
          <Circle key={i} cx={c.x * SCREEN_W} cy={c.y * SCREEN_H} r={m * c.r} fill={`url(#void-cloud-${i})`} />
        ))}
      </Svg>
    </View>
  );
}

// --- Filament bands --------------------------------------------------------

/**
 * One tier of the disc. The filaments are static geometry carrying their own
 * arm density and boundary ramps; the tier turns as a whole.
 */
function Band({
  colors,
  band,
  seed,
  opacity,
  kick,
  spin,
}: {
  colors: ThemeColors;
  band: (typeof BANDS)[number];
  seed: number;
  opacity: Animated.AnimatedInterpolation<number> | number;
  kick: Animated.AnimatedInterpolation<string>;
  /** Shared across all five, or the arms drift apart. */
  spin: Animated.Value;
}) {
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const strands = useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    return filaments({
      count: band.count,
      rInner: band.rInner,
      rOuter: band.rOuter,
      span: band.span,
      b: 0.19,
      steps: 13,
      meso: band.meso,
      micro: 0.5,
      size: BOX,
      arms: ARMS,
      rand,
    });
  }, [band, seed]);

  const color = toneColor(colors, band.tone);
  const width = stroke(band.width);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.centred,
        { width: BOX, height: BOX, left: CX - BOX / 2, top: CY - BOX / 2, opacity },
        { transform: [{ rotate }, { rotate: kick }] },
      ]}
    >
      <Svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`}>
        {strands.map((f, i) => {
          // Both boundaries ramp out here, and this is the only thing making
          // them — nothing is stroked at either edge.
          const edge = smooth(R_CORE, R_CORE + EDGE, f.rn) * (1 - smooth(1 - EDGE, 1, f.rn));
          const o = band.alpha * (0.2 + f.t * 0.9) * f.arm * edge;
          if (o < 0.004) return null;
          return (
            <Path
              key={i}
              d={f.d}
              fill="none"
              stroke={color}
              strokeWidth={width}
              strokeLinecap="round"
              opacity={o}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

// --- Directional light -----------------------------------------------------

/**
 * The light, as an attenuation rather than a glow: the filaments are drawn at
 * full strength and this puts out the far arc. A linear ramp along the light
 * axis, so it is smooth right across the circle with no boundary anywhere.
 *
 * The canvas preview does this per stroke as `0.15 + 0.85·cos((θ−θ_light)/2)³`.
 * A gradient cannot be a function of angle alone, so this ramps along the axis
 * instead — the same read, one dimension short.
 */
function Light({ colors, brightness }: { colors: ThemeColors; brightness: Animated.AnimatedInterpolation<number> }) {
  const size = BOX * 1.25;
  const rad = (LIGHT_DEG * Math.PI) / 180;
  // From the lit edge to the far one, in the unit square the gradient uses.
  const x1 = 0.5 + Math.cos(rad) * 0.5;
  const y1 = 0.5 + Math.sin(rad) * 0.5;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.centred,
        { width: size, height: size, left: CX - size / 2, top: CY - size / 2, opacity: brightness },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="void-light" x1={`${x1 * 100}%`} y1={`${y1 * 100}%`} x2={`${(1 - x1) * 100}%`} y2={`${(1 - y1) * 100}%`}>
            <Stop offset="0%" stopColor={colors.bgDeep} stopOpacity={0} />
            <Stop offset="42%" stopColor={colors.bgDeep} stopOpacity={0.34} />
            <Stop offset="100%" stopColor={colors.bgDeep} stopOpacity={0.86} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill="url(#void-light)" />
      </Svg>
    </Animated.View>
  );
}

/** Frame edges down to near-black, so the disc is the only lit thing. */
function Vignette({ colors }: { colors: ThemeColors }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={SCREEN_W} height={SCREEN_H} viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}>
        <Defs>
          <RadialGradient id="void-vignette" cx="50%" cy="50%" r="72%">
            <Stop offset="0%" stopColor={colors.bgDeep} stopOpacity={0} />
            <Stop offset="55%" stopColor={colors.bgDeep} stopOpacity={0} />
            <Stop offset="80%" stopColor={colors.bgDeep} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={colors.bgDeep} stopOpacity={0.9} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="url(#void-vignette)" />
      </Svg>
    </View>
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
    // Stops at the core boundary — dust crossing the hole would put something
    // inside it, and the hole has to stay empty.
    path: spiralPath(R * (0.72 + Math.random() * 0.26), 0.8 + Math.random() * 0.9, 10, Math.random() * Math.PI * 2, R * R_CORE),
    size: 1 + Math.random() * 1.2,
    dur: 4200 + Math.random() * 5200,
    delay: Math.random() * 6000,
    alt: Math.random() < 0.5,
  }));
}

/**
 * Something falling in from outside the rim on a decaying spiral, brightening
 * as it accelerates and burning out at the core.
 *
 * This is the pack's rare event, in place of the lightning the vortex used to
 * throw. Lightning is borrowed from weather; an infall comes out of the same
 * physics as everything else in the frame. `restAfterMs` keeps it a surprise,
 * and it shortens as `pulse` rises.
 */
function Infall({ colors, spec }: { colors: ThemeColors; spec: InfallSpec }) {
  const progress = useLoop({
    duration: spec.dur,
    delay: spec.delay,
    reverse: false,
    restAfterMs: spec.rest,
    easing: Easing.in(Easing.cubic),
  });
  const range = spec.path.map((_, i) => i / (spec.path.length - 1));

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: CX,
        top: CY,
        width: 2.2,
        height: 2.2,
        borderRadius: 2.2,
        backgroundColor: colors.celestial,
        opacity: progress.interpolate({ inputRange: [0, 0.06, 0.72, 0.94, 1], outputRange: [0, 0.5, 0.85, 0.9, 0] }),
        transform: [
          { translateX: progress.interpolate({ inputRange: range, outputRange: spec.path.map((p) => p[0]) }) },
          { translateY: progress.interpolate({ inputRange: range, outputRange: spec.path.map((p) => p[1]) }) },
          // Drawn out into a streak as it falls — there is no trail buffer
          // here to leave one behind it.
          { rotate: `${spec.tilt}deg` },
          { scaleX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [2, 9, 22] }) },
        ],
      }}
    />
  );
}

interface InfallSpec {
  path: [number, number][];
  tilt: number;
  dur: number;
  delay: number;
  rest: number;
}

function makeInfalls(count: number): InfallSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const start = Math.random() * Math.PI * 2;
    return {
      path: spiralPath(R * (1.02 + Math.random() * 0.2), 0.5 + Math.random() * 0.5, 10, start, R * R_CORE * 0.94),
      tilt: (start * 180) / Math.PI + 90,
      dur: 1500 + Math.random() * 1400,
      delay: i * 2600 + Math.random() * 3000,
      rest: 7000 + Math.random() * 11000,
    };
  });
}

/**
 * A hot spot orbiting inside the disc — the filaments behind it brighten and
 * it fades away again. Slow, soft, and never in the same place twice in a row.
 */
function Flare({ colors, spec }: { colors: ThemeColors; spec: FlareSpec }) {
  const orbit = useLoop({ duration: spec.dur, delay: spec.delay, reverse: false, easing: Easing.linear });
  const breathe = useLoop({ duration: spec.dur / 2, delay: spec.delay });
  const size = R * 0.62;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.centred,
        {
          width: size,
          height: size,
          left: CX - size / 2,
          top: CY - size / 2,
          opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
          transform: [
            { rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: [`${spec.from}deg`, `${spec.from + 360}deg`] }) },
            { translateX: spec.radius },
          ],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`void-flare-${spec.id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.celestial} stopOpacity={0.26} />
            <Stop offset="46%" stopColor={colors.celestialGlow} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={colors.celestialGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#void-flare-${spec.id})`} />
      </Svg>
    </Animated.View>
  );
}

interface FlareSpec {
  id: number;
  radius: number;
  from: number;
  dur: number;
  delay: number;
}

function makeFlares(count: number): FlareSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    radius: R * (R_CORE + 0.14 + Math.random() * 0.42),
    from: Math.random() * 360,
    dur: 26000 + Math.random() * 22000,
    delay: Math.random() * 12000,
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
        opacity: progress.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 0.4, 0.26, 0] }),
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

// --- Overlay ---------------------------------------------------------------

/** How far the pointer's perturbation reaches. */
const STIR = 180;

export function VoidOverlay() {
  const { colors } = useMasset<Void>();
  const { pulse, focus } = useMassetSignal();

  const stars = useMemo(() => makeStars(150), []);
  const motes = useMemo(() => makeMotes(26), []);
  const infalls = useMemo(() => makeInfalls(3), []);
  const flares = useMemo(() => makeFlares(2), []);
  const spin = useWanderingSpin();

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
      // ~600ms either way: the flow reacts and settles, it does not blink.
      Animated.timing(focusOn, {
        toValue: focus ? 1 : 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [focus, leanX, leanY, focusOn]);

  // Where the pointer is stirring the flow, in screen coordinates.
  const stir = useMemo(() => {
    if (!focus) return null;
    return { x: focus.x * SCREEN_W, y: focus.y * SCREEN_H };
  }, [focus]);

  const kick = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '34deg'] });
  // The light lifts off the far arc as the core reacts — never all the way,
  // or the disc goes flat.
  const lightOpacity = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] });

  // The two innermost tiers carry the reaction: fading them up is what the eye
  // reads as the disc winding harder.
  const innerOpacity = p.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const fastOpacity = p.interpolate({ inputRange: [0, 1], outputRange: [0.34, 1] });
  const bandOpacity = [1, 1, 1, innerOpacity, fastOpacity] as const;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgDeep }]}>
      <DeepField colors={colors} />

      {stars.map((spec, i) =>
        spec.twinkle > 0 ? (
          <TwinklingStar key={i} spec={spec} colors={colors} lean={leanX} />
        ) : (
          <StillStar key={i} spec={spec} colors={colors} lean={leanX} />
        )
      )}

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
        {BANDS.map((band, i) => (
          <Band key={i} colors={colors} band={band} seed={17 + i * 9781} opacity={bandOpacity[i]} kick={kick} spin={spin} />
        ))}

        {flares.map((spec) => (
          <Flare key={spec.id} spec={spec} colors={colors} />
        ))}

        <Light colors={colors} brightness={lightOpacity} />

        {motes.map((spec, i) => (
          <Mote key={i} spec={spec} colors={colors} />
        ))}

        {infalls.map((spec, i) => (
          <Infall key={i} spec={spec} colors={colors} />
        ))}

        {/* Where the pointer stirs it: the flow brightens locally rather than
            the core throwing something at the point. */}
        {stir ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.centred,
              { width: STIR * 2, height: STIR * 2, left: stir.x - STIR, top: stir.y - STIR, opacity: focusOn },
            ]}
          >
            <Svg width={STIR * 2} height={STIR * 2} viewBox={`0 0 ${STIR * 2} ${STIR * 2}`}>
              <Defs>
                <RadialGradient id="void-stir" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={colors.celestial} stopOpacity={0.22} />
                  <Stop offset="52%" stopColor={colors.celestialGlow} stopOpacity={0.12} />
                  <Stop offset="100%" stopColor={colors.celestialGlow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={STIR} cy={STIR} r={STIR} fill="url(#void-stir)" />
            </Svg>
          </Animated.View>
        ) : null}
      </Animated.View>

      <Vignette colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { position: 'absolute' },
});
