// Generates showroom/index.html from the REAL palette sources.
//
// Same discipline as research_vault's `dogrula`: this compiles and imports each
// pack's `preview.ts` rather than restating colours, so the showroom cannot
// drift. Add a token to core/tokens.ts and it appears here on the next
// `npm run showroom`; add a pack to PACKS below and it gets a full section.
//
// Deterministic output — the particle fields use a seeded PRNG, so
// regenerating without a palette change produces a byte-identical file.

import { writeFileSync } from 'fs';
import { join } from 'path';

import type { PackPreview, PreviewParticle, VariantPreview } from '../core/preview';
import { THEME_COLOR_KEYS, radius as defaultRadius, spacing, type ThemeColors } from '../core/tokens';
import { cartoonPreview } from '../packs/cartoon/preview';
import { seasonsPreview } from '../packs/seasons/preview';
import { stormyPreview } from '../packs/stormy/preview';
import { voidcorePreview } from '../packs/voidcore/preview';

// Every pack the showroom renders. One line per pack.
const PACKS: PackPreview<string>[] = [seasonsPreview, stormyPreview, cartoonPreview, voidcorePreview];

// --- Colour maths ----------------------------------------------------------

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value: string): Rgba {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => parseFloat(p.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  throw new Error(`showroom: cannot parse colour "${value}"`);
}

/** Flatten a translucent colour onto an opaque one — what the eye actually sees. */
function composite(fg: Rgba, bg: Rgba): Rgba {
  return {
    r: fg.a * fg.r + (1 - fg.a) * bg.r,
    g: fg.a * fg.g + (1 - fg.a) * bg.g,
    b: fg.a * fg.b + (1 - fg.a) * bg.b,
    a: 1,
  };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio, both colours flattened onto `base` first. */
function contrast(fg: string, bg: string, base: string): number {
  const baseRgb = parseColor(base);
  const bgFlat = composite(parseColor(bg), baseRgb);
  const fgFlat = composite(parseColor(fg), bgFlat);
  const l1 = luminance(fgFlat);
  const l2 = luminance(bgFlat);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The single seam where a palette value enters CSS. Today RN and CSS agree on
 * `#rrggbb` and `rgba()`, so this is identity — but if a pack ever adopts a
 * format CSS doesn't share, it gets translated here rather than in thirty
 * template literals.
 */
function css(value: string): string {
  return value;
}

// --- Deterministic randomness ---------------------------------------------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// --- Contrast audit --------------------------------------------------------

interface Check {
  label: string;
  fg: keyof ThemeColors;
  on: keyof ThemeColors;
  base: keyof ThemeColors;
  /** WCAG minimum for this text size. 4.5 = normal text, 3.0 = large/bold. */
  min: number;
  note?: string;
}

// Mirrors how the primitives actually stack: a tinted fill over an opaque
// panel, text on top. Sizes come from core/typography.ts.
const CHECKS: Check[] = [
  { label: 'Body text on page', fg: 'textPrimary', on: 'bg', base: 'bg', min: 4.5, note: 'typography.body, 15px' },
  { label: 'Body text on card', fg: 'textPrimary', on: 'surface', base: 'bg', min: 4.5, note: 'typography.body on Card' },
  { label: 'Caption on card', fg: 'textSecondary', on: 'surface', base: 'bg', min: 4.5, note: 'typography.caption, 12.5px' },
  { label: 'Eyebrow on card', fg: 'textTertiary', on: 'surface', base: 'bg', min: 4.5, note: 'typography.eyebrow, 11px — the quietest legible ink' },
  { label: 'Title on page', fg: 'textPrimary', on: 'bg', base: 'bg', min: 3, note: 'typography.title, 22px bold' },
  { label: 'Primary button label', fg: 'onAccent', on: 'accent', base: 'bg', min: 4.5, note: 'Button variant="primary", 15px bold' },
  { label: 'Accent eyebrow on card', fg: 'accent', on: 'surface', base: 'bg', min: 4.5, note: 'typography.eyebrowAccent, 11px' },
  { label: 'Active chip label', fg: 'accentBright', on: 'accentDim', base: 'surface', min: 4.5, note: 'Chip active, 13px' },
  { label: 'Danger button label', fg: 'ember', on: 'emberDim', base: 'surface', min: 4.5, note: 'Button variant="danger", 15px bold' },
  { label: 'Settled state label', fg: 'patina', on: 'patinaDim', base: 'surface', min: 4.5, note: 'semantic pill, small mono' },
  { label: 'In-between state label', fg: 'kindling', on: 'kindlingDim', base: 'surface', min: 4.5, note: 'semantic pill, small mono' },
  { label: 'Secondary button label', fg: 'textPrimary', on: 'surfaceRaised', base: 'bg', min: 4.5, note: 'Button variant="secondary"' },
  { label: 'Ghost button label', fg: 'textSecondary', on: 'bg', base: 'bg', min: 4.5, note: 'Button variant="ghost"' },
];

// --- Token grouping --------------------------------------------------------

const GROUPS: { title: string; blurb: string; keys: (keyof ThemeColors)[] }[] = [
  {
    title: 'Grounds & panels',
    blurb: 'The stack a screen is built on, from page to hairline.',
    keys: ['bg', 'bgDeep', 'surface', 'surfaceRaised', 'surfaceSunken', 'surfaceBorder', 'surfaceBorderStrong'],
  },
  { title: 'Ink', blurb: 'Three weights of text, loudest first.', keys: ['textPrimary', 'textSecondary', 'textTertiary'] },
  {
    title: 'Accent',
    blurb: "The pack's voice. onAccent must stay legible on accent.",
    keys: ['accent', 'accentBright', 'accentDim', 'accentBorder', 'onAccent'],
  },
  {
    title: 'Semantic states',
    blurb: 'Fixed meanings across every pack: settled, in-between, danger.',
    keys: ['patina', 'patinaDim', 'kindling', 'kindlingDim', 'kindlingBorder', 'ember', 'emberDim'],
  },
  { title: 'Depth', blurb: 'Shadow and modal scrim.', keys: ['shadow', 'overlay'] },
  {
    title: 'Environment',
    blurb: 'Drives the living background: sky, celestial body, scenery, particles.',
    keys: ['skyTop', 'skyBottom', 'scenery', 'sceneryAlt', 'celestial', 'celestialGlow', 'particle', 'particleAlt'],
  },
];

// --- HTML helpers ----------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** A stable DOM key for one variant of one pack. */
function slug(packId: string, variant: string): string {
  return `${packId}-${variant}`;
}

function variantVars(colors: ThemeColors): string {
  return THEME_COLOR_KEYS.map((k) => `      --${kebab(k)}: ${css(colors[k])};`).join('\n');
}

// --- Particle field --------------------------------------------------------

/** Which CSS keyframe each particle kind rides. */
const PARTICLE_ANIM: Record<PreviewParticle, string> = {
  rain: 'fall',
  snow: 'fall',
  leaf: 'fall-spin',
  sprinkle: 'fall-spin',
  bubble: 'rise',
  star: 'twinkle',
  none: 'none',
};

function particleField(packId: string, variant: string, preview: VariantPreview, colors: ThemeColors): string {
  const kind: PreviewParticle = preview.particle ?? 'none';
  if (kind === 'none') return '';
  const count = preview.particleCount ?? 20;
  const rand = mulberry32(seedFrom(slug(packId, variant)));
  const cells: string[] = [];

  for (let i = 0; i < count; i++) {
    const left = (rand() * 100).toFixed(2);
    const top = (rand() * 82).toFixed(2);
    const delay = (rand() * 8).toFixed(2);
    const depth = 0.55 + rand() * 0.45;
    const alt = rand() < 0.45;
    const color = alt ? colors.particleAlt : colors.particle;
    const peak = (0.4 + depth * 0.6).toFixed(2);

    let dur: number;
    let drift = 0;
    let shape: string;

    switch (kind) {
      case 'rain': {
        dur = ((0.7 + rand() * 0.5) / depth) * (preview.particleSpeed ?? 1);
        // A slanted drop travels sideways too, or it reads as falling straight
        // down wearing a tilted sprite.
        const angle = preview.particleAngle ?? 4;
        drift = -Math.tan((angle * Math.PI) / 180) * 520;
        const h = (12 + rand() * 10) * depth * (angle > 20 ? 1.7 : 1);
        shape = `width:${(1.2 + depth).toFixed(1)}px;height:${h.toFixed(
          1
        )}px;border-radius:1px;background:${color};rotate:${angle}deg;`;
        break;
      }
      case 'snow': {
        dur = (8 + rand() * 6) / depth;
        drift = (rand() - 0.5) * 80;
        const d = (4 + rand() * 8) * depth;
        shape = `width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;border-radius:50%;background:${color};`;
        break;
      }
      case 'leaf': {
        dur = (7 + rand() * 4.5) / depth;
        drift = (rand() - 0.5) * 150;
        const w = (10 + rand() * 7) * depth;
        shape = `width:${w.toFixed(1)}px;height:${(w * 0.62).toFixed(1)}px;background:${color};border-radius:${w.toFixed(1)}px 2px ${w.toFixed(1)}px 2px;`;
        break;
      }
      case 'sprinkle': {
        dur = (5.2 + rand() * 3.8) / depth;
        drift = (rand() - 0.5) * 110;
        const w = (7 + rand() * 5) * depth;
        shape = `width:${w.toFixed(1)}px;height:${(w * 0.42).toFixed(1)}px;border-radius:${w.toFixed(1)}px;background:${color};`;
        break;
      }
      case 'bubble': {
        dur = (5 + rand() * 4) / depth;
        drift = (rand() - 0.5) * 60;
        const d = (5 + rand() * 9) * depth;
        shape = `width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;border-radius:50%;border:${Math.max(1, d * 0.16).toFixed(1)}px solid ${color};`;
        break;
      }
      case 'star': {
        dur = (1.6 + rand() * 2.6) / depth;
        const d = (2 + rand() * 3.4) * depth;
        shape = `width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;border-radius:50%;background:${color};`;
        break;
      }
      default:
        continue;
    }

    // Twinkling stars hold a position; everything else enters off-stage.
    const pos = kind === 'star' ? `left:${left}%;top:${top}%;` : `left:${left}%;`;
    cells.push(
      `<i style="${pos}${shape}animation-name:${PARTICLE_ANIM[kind]};animation-duration:${dur.toFixed(
        2
      )}s;animation-delay:-${delay}s;--drift:${drift.toFixed(1)}px;--peak:${peak}"></i>`
    );
  }
  return cells.join('');
}

function glassDrops(seedText: string): string {
  const rand = mulberry32(seedFrom(seedText));
  return Array.from({ length: 14 }, () => {
    const size = 4 + rand() * 6;
    return `<b style="left:${(rand() * 92 + 3).toFixed(1)}%;top:${(rand() * 70 + 4).toFixed(1)}%;width:${size.toFixed(
      1
    )}px;height:${(size * 1.25).toFixed(1)}px;animation-delay:-${(rand() * 9).toFixed(1)}s"></b>`;
  }).join('');
}

function sceneryHtml(preview: VariantPreview, colors: ThemeColors): string {
  if (!preview.scenery?.length) return '';
  return preview.scenery
    .map((layer) => {
      const inner = `<svg viewBox="0 0 ${layer.width ?? 400} ${layer.height}" preserveAspectRatio="none" style="height:${layer.height}px">${layer.svg(
        colors
      )}</svg>`;
      if (!layer.sway) return `<div class="scenery scenery-${layer.anchor}">${inner}</div>`;
      // Hinged on the anchored edge, matching pivotRotate() in the RN overlay.
      return `<div class="scenery scenery-${layer.anchor}"><div class="sway" style="--sway:${layer.sway}deg;--sway-origin:${
        layer.anchor === 'top' ? 'top center' : 'bottom center'
      };animation-duration:${layer.swaySeconds ?? 5}s;animation-delay:-${layer.swayDelay ?? 0}s">${inner}</div></div>`;
    })
    .join('');
}

// --- Voidcore vortex -------------------------------------------------------
// One canvas per variant. Everything — filaments, throat, stars, bloom — is
// drawn at runtime by the renderer at the foot of the document, which reads
// its colours from the panel's CSS variables. So one line of markup themes
// itself for all five voids.
//
// Why not SVG like every other effect here: the vortex is 8000 hairline
// strokes accumulating additively into a buffer that is never cleared. Neither
// SVG nor CSS can add light, and neither can keep last frame's ink.

function vortexHtml(key: string): string {
  return `<div class="vortex"><canvas class="vx-canvas" data-vortex="${key}" aria-hidden="true"></canvas></div>`;
}

/** The named moving parts a world can ask for, beyond scenery and particles. */
function effectsHtml(preview: VariantPreview, key: string): string {
  const wanted = preview.effects ?? [];
  const out: string[] = [];

  if (wanted.includes('rain-on-glass')) out.push(`<div class="glass">${glassDrops(key)}</div>`);
  if (wanted.includes('lightning')) out.push('<div class="lightning"></div>');

  if (wanted.includes('vines')) {
    const vines = [
      { x: 13, len: 150, dur: 3.6, delay: 0, deg: 3.4 },
      { x: 44, len: 208, dur: 4.7, delay: 0.7, deg: 2.6 },
      { x: 71, len: 128, dur: 4.1, delay: 1.5, deg: 3.9 },
      { x: 90, len: 178, dur: 5.3, delay: 0.4, deg: 2.2 },
    ]
      .map(
        (v) =>
          `<div class="vine" style="left:${v.x}%;--sway:${v.deg}deg;animation-duration:${v.dur}s;animation-delay:-${v.delay}s"><i style="height:${v.len}px"></i><b></b></div>`
      )
      .join('');
    out.push(`<div class="vines">${vines}</div>`);
  }

  if (wanted.includes('light-shafts')) {
    const shafts = [
      { x: 18, w: 54, dur: 5.2, delay: 0 },
      { x: 46, w: 82, dur: 6.8, delay: 1.2 },
      { x: 78, w: 46, dur: 5.9, delay: 2.4 },
    ]
      .map((s) => `<i style="left:${s.x}%;width:${s.w}px;animation-duration:${s.dur}s;animation-delay:-${s.delay}s"></i>`)
      .join('');
    out.push(`<div class="shafts">${shafts}</div>`);
  }

  if (wanted.includes('shooting-star')) out.push('<div class="shooting-star"><i></i></div>');

  if (wanted.includes('mist')) {
    const bands = [
      { y: 32, h: 58, dur: 8.2, delay: 0 },
      { y: 50, h: 84, dur: 10.4, delay: 1.6 },
      { y: 68, h: 66, dur: 9.1, delay: 3.2 },
    ]
      .map((b) => `<i style="top:${b.y}%;height:${b.h}px;animation-duration:${b.dur}s;animation-delay:-${b.delay}s"></i>`)
      .join('');
    out.push(`<div class="mist">${bands}</div>`);
  }

  if (wanted.includes('puddle-ripples')) {
    const rings = [
      { x: 16, size: 54, dur: 2.6, delay: 0 },
      { x: 42, size: 74, dur: 3.1, delay: 0.9 },
      { x: 63, size: 46, dur: 2.4, delay: 1.8 },
      { x: 85, size: 66, dur: 2.9, delay: 0.6 },
    ]
      .map(
        (r) =>
          `<i style="left:${r.x}%;width:${r.size}px;height:${(r.size * 0.34).toFixed(
            1
          )}px;animation-duration:${r.dur}s;animation-delay:-${r.delay}s"></i>`
      )
      .join('');
    out.push(`<div class="ripples">${rings}</div>`);
  }

  if (wanted.includes('water-sheets')) {
    const sheets = [
      { x: 8, w: 3, dur: 2.1, delay: 0 },
      { x: 23, w: 5, dur: 2.6, delay: 0.7 },
      { x: 41, w: 3.5, dur: 1.9, delay: 1.5 },
      { x: 58, w: 6, dur: 2.9, delay: 0.4 },
      { x: 74, w: 3, dur: 2.3, delay: 1.9 },
      { x: 90, w: 4.5, dur: 2.5, delay: 1.1 },
    ]
      .map((s) => `<i style="left:${s.x}%;width:${s.w}px;animation-duration:${s.dur}s;animation-delay:-${s.delay}s"></i>`)
      .join('');
    out.push(`<div class="sheets-down">${sheets}</div>`);
  }

  if (wanted.includes('forked-lightning')) {
    // Two bolts on different clocks, so the pattern never feels metered.
    const bolt = (x: number, dur: number, delay: number) =>
      `<i style="left:${x}%;animation-duration:${dur}s;animation-delay:-${delay}s">` +
      `<svg viewBox="0 0 110 300" preserveAspectRatio="none"><path d="M 66 0 L 30 128 L 60 122 L 22 300 L 78 132 L 48 138 L 88 0 Z" fill="var(--particle)" stroke="var(--celestial)" stroke-width="2"/></svg></i>`;
    out.push(`<div class="bolts">${bolt(52, 10.2, 0)}${bolt(14, 16.4, 6.1)}<b></b></div>`);
  }

  if (wanted.includes('void-vortex')) out.push(vortexHtml(key));

  if (wanted.includes('spray')) {
    const streaks = [
      { y: 18, len: 130, dur: 1.3, delay: 0 },
      { y: 31, len: 90, dur: 1.0, delay: 0.5 },
      { y: 47, len: 170, dur: 1.6, delay: 0.2 },
      { y: 59, len: 110, dur: 1.15, delay: 0.9 },
      { y: 72, len: 150, dur: 1.45, delay: 1.3 },
    ]
      .map((s) => `<i style="top:${s.y}%;width:${s.len}px;animation-duration:${s.dur}s;animation-delay:-${s.delay}s"></i>`)
      .join('');
    out.push(`<div class="spray">${streaks}</div>`);
  }

  if (wanted.includes('gumdrops')) {
    const drops = [
      { x: 13, size: 26, dur: 1.5, delay: 0 },
      { x: 37, size: 22, dur: 1.8, delay: 0.38 },
      { x: 62, size: 28, dur: 1.65, delay: 0.76 },
      { x: 85, size: 20, dur: 2.0, delay: 0.22 },
    ]
      .map(
        (g) =>
          `<i style="left:${g.x}%;width:${g.size}px;height:${g.size * 0.9}px;border-radius:${g.size}px ${g.size}px 5px 5px;animation-duration:${g.dur}s;animation-delay:-${g.delay}s"></i>`
      )
      .join('');
    out.push(`<div class="gumdrops">${drops}</div>`);
  }

  return out.join('');
}

// --- Audit -----------------------------------------------------------------

function auditRows(colors: ThemeColors): { html: string; fails: number } {
  let fails = 0;
  const rows = CHECKS.map((check) => {
    const ratio = contrast(colors[check.fg], colors[check.on], colors[check.base]);
    const pass = ratio >= check.min;
    if (!pass) fails++;
    return `<tr class="${pass ? 'pass' : 'fail'}">
        <td class="audit-label">${esc(check.label)}<span class="audit-note">${esc(check.note ?? '')}</span></td>
        <td class="audit-swatch"><span style="background:${css(colors[check.base])}"><span style="background:${css(
          colors[check.on]
        )}"><b style="color:${css(colors[check.fg])}">Ag</b></span></span></td>
        <td class="audit-ratio">${ratio.toFixed(2)}<small>:1</small></td>
        <td class="audit-min">needs ${check.min}</td>
        <td class="audit-verdict">${pass ? 'PASS' : 'FAIL'}</td>
      </tr>`;
  }).join('\n');
  return { html: rows, fails };
}

// --- Rendering -------------------------------------------------------------

function variantPanel(pack: PackPreview<string>, variant: string): string {
  const colors = pack.palettes[variant];
  const preview = pack.variantPreview[variant] ?? {};
  const en = pack.labels.en[variant];
  const tr = pack.labels.tr?.[variant];
  const audit = auditRows(colors);
  const isDark = pack.darkVariants.includes(variant);
  const key = slug(pack.id, variant);
  const cel = preview.celestial ?? { x: 0.75, y: 0.12 };
  const interactive = (preview.effects ?? []).includes('pointer-strike');

  const tokenGroups = GROUPS.map(
    (group) => `<section class="group">
          <h3>${esc(group.title)}</h3>
          <p class="group-blurb">${esc(group.blurb)}</p>
          <div class="swatches">
            ${group.keys
              .map(
                (k) => `<div class="swatch">
              <span class="chipcolor" style="background:${css(colors[k])}"></span>
              <span class="swatch-meta"><code>${k}</code><small>${esc(colors[k])}</small></span>
            </div>`
              )
              .join('\n            ')}
          </div>
        </section>`
  ).join('\n        ');

  return `<article class="panel" data-panel="${key}" data-variant="${key}" hidden>
      <header class="panel-head">
        <div>
          <p class="eyebrow">${isDark ? 'DARK VARIANT' : 'LIGHT VARIANT'}</p>
          <h2>${esc(en.label)}</h2>
          <p class="blurb">${esc(en.blurb)}</p>
          ${tr ? `<p class="blurb blurb-tr">TR — ${esc(tr.label)} · ${esc(tr.blurb)}</p>` : ''}
        </div>
        <div class="audit-badge ${audit.fails ? 'has-fails' : ''}">
          <strong>${audit.fails === 0 ? 'All clear' : `${audit.fails} contrast ${audit.fails === 1 ? 'issue' : 'issues'}`}</strong>
          <small>${CHECKS.length} WCAG checks</small>
        </div>
      </header>

      <div class="split">
        <div class="stage${interactive ? ' interactive' : ''}" data-stage="${key}" style="--cel-x:${(cel.x * 100).toFixed(
          1
        )}%;--cel-y:${(cel.y * 100).toFixed(1)}%">
          <div class="sky"></div>
          <div class="celestial${preview.celestialPulse === false ? '' : ' pulsing'}"></div>
          ${sceneryHtml(preview, colors)}
          <div class="particles">${particleField(pack.id, variant, preview, colors)}</div>
          ${effectsHtml(preview, key)}
          <div class="stage-caption">${
            interactive
              ? 'Move the pointer over this — the flow bends and brightens where you stir it'
              : 'Living background — CSS approximation'
          }</div>
        </div>
        ${
          interactive
            ? `<div class="signal-bar">
          <label>pulse <input type="range" class="pulse" data-for="${key}" min="0" max="100" value="0"></label>
          <output class="pulse-out" data-for="${key}">0.00</output>
          <button class="pulse-demo" data-for="${key}">simulate a reply</button>
        </div>`
            : ''
        }

        <div class="mock">
          <div class="mock-card">
            <p class="m-eyebrow">SPECIMEN · 004</p>
            <h4 class="m-title">A card on this palette</h4>
            <p class="m-body">Body text at 15px with a 23px line height, the way <code>typography.body</code> renders it on a Card.</p>
            <p class="m-caption">Caption text — 12.5px, textSecondary.</p>
            <div class="m-row">
              <button class="btn primary">Primary</button>
              <button class="btn secondary">Secondary</button>
            </div>
            <div class="m-row">
              <button class="btn ghost">Ghost</button>
              <button class="btn danger">Danger</button>
            </div>
            <div class="m-row">
              <span class="m-chip active">Active chip</span>
              <span class="m-chip">Idle chip</span>
            </div>
            <div class="m-row">
              <span class="m-pill accent">OPEN</span>
              <span class="m-pill kindling">IN PROGRESS</span>
              <span class="m-pill patina">DONE</span>
            </div>
          </div>

          <div class="mock-card type-card">
            <p class="m-eyebrow">TYPE SPECIMEN</p>
            <p class="t-hero">Hero 30</p>
            <p class="t-title">Title 22</p>
            <p class="t-subtitle">Subtitle 16</p>
            <p class="t-body">Body 15 — the workhorse.</p>
            <p class="t-caption">Caption 12.5 — supporting detail.</p>
            <p class="t-mono">mono 12 — stamps and serials</p>
          </div>
        </div>
      </div>

      <section class="group">
        <h3>Contrast audit</h3>
        <p class="group-blurb">Every pair flattened the way it actually stacks — tint over panel, text on top. A pack that fails here will be unreadable on a phone in daylight.</p>
        <table class="audit">
          <thead><tr><th>Pair</th><th></th><th>Ratio</th><th>Threshold</th><th></th></tr></thead>
          <tbody>
${audit.html}
          </tbody>
        </table>
      </section>

      <div class="groups">
        ${tokenGroups}
      </div>
    </article>`;
}

function packSection(pack: PackPreview<string>): string {
  const totalFails = pack.variants.reduce((n, v) => n + auditRows(pack.palettes[v]).fails, 0);
  const r = { ...defaultRadius, ...pack.radius };

  const strip = pack.variants
    .map(
      (v) => `<div class="strip-card" data-variant="${slug(pack.id, v)}">
          <div class="strip-sky"></div>
          <div class="strip-body">
            <p class="strip-name">${esc(pack.labels.en[v].label)}</p>
            <div class="strip-dots">
              ${(['accent', 'patina', 'kindling', 'ember', 'textPrimary'] as (keyof ThemeColors)[])
                .map((k) => `<span title="${k}" style="background:${css(pack.palettes[v][k])}"></span>`)
                .join('')}
            </div>
          </div>
        </div>`
    )
    .join('\n        ');

  const tabs = pack.variants
    .map(
      (v) =>
        `<button class="tab" data-tab="${slug(pack.id, v)}" data-variant="${slug(pack.id, v)}"><span class="tab-dot"></span>${esc(
          pack.labels.en[v].label
        )}</button>`
    )
    .join('\n        ');

  return `<section class="pack" data-pack="${pack.id}" hidden style="--r-sm:${r.sm}px;--r-md:${r.md}px;--r-lg:${r.lg}px;--r-xl:${r.xl}px">
      <div class="pack-head">
        <div>
          <h2 class="pack-title">${esc(pack.title)}</h2>
          <p class="pack-blurb">${esc(pack.blurb)}</p>
          ${pack.defaultNote ? `<p class="pack-note">${esc(pack.defaultNote)}</p>` : ''}
        </div>
        <div class="pack-stats">
          <span><b>${pack.variants.length}</b> variants</span>
          <span class="${totalFails ? 'bad' : 'good'}"><b>${totalFails}</b> contrast ${totalFails === 1 ? 'failure' : 'failures'}</span>
          <span><b>${r.lg}px</b> card radius</span>
        </div>
      </div>

      <div class="strip">
        ${strip}
      </div>

      <nav class="tabs" role="tablist">
        ${tabs}
      </nav>

      ${pack.variants.map((v) => variantPanel(pack, v)).join('\n\n    ')}
    </section>`;
}

function build(): string {
  const themeBlocks = PACKS.flatMap((pack) =>
    pack.variants.map((v) => `    [data-variant='${slug(pack.id, v)}'] {\n${variantVars(pack.palettes[v])}\n    }`)
  ).join('\n');

  const packTabs = PACKS.map(
    (p) => `<button class="pack-tab" data-packtab="${p.id}">${esc(p.title)}<small>${p.variants.length}</small></button>`
  ).join('\n        ');

  const totalVariants = PACKS.reduce((n, p) => n + p.variants.length, 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MASSETS · Showroom</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Manrope:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  /* Generated by tools/showroom.ts — do not edit by hand. */
  :root {
    --display: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
    --body: 'Manrope', 'Segoe UI', system-ui, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace;
    --r-sm: ${defaultRadius.sm}px; --r-md: ${defaultRadius.md}px; --r-lg: ${defaultRadius.lg}px; --r-xl: ${defaultRadius.xl}px;
    --r-pill: 999px;
    --s-sm: ${spacing.sm}px; --s-md: ${spacing.md}px; --s-lg: ${spacing.lg}px; --s-xl: ${spacing.xl}px;
  }

${themeBlocks}

  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--body); background: #0d0f14; color: #e8e6e1; -webkit-font-smoothing: antialiased; }
  .shell { max-width: 1180px; margin: 0 auto; padding: 32px 20px 96px; }

  .masthead { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; }
  .masthead h1 { font-family: var(--display); font-size: 30px; letter-spacing: -0.5px; margin: 0; }
  .masthead p { margin: 6px 0 0; color: #8b93a1; font-size: 13.5px; max-width: 62ch; line-height: 1.55; }
  .regen { font-family: var(--mono); font-size: 11.5px; color: #6f7787; background: #161a22; border: 1px solid #232936; padding: 8px 12px; border-radius: 10px; white-space: nowrap; }

  /* Pack selector — the outer level of navigation. */
  .pack-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 26px 0 22px; border-bottom: 1px solid #1c212b; padding-bottom: 18px; }
  .pack-tab { font-family: var(--display); font-weight: 700; font-size: 15px; padding: 11px 20px; border-radius: 12px; cursor: pointer; background: #141821; color: #98a0ae; border: 1px solid #262c39; display: inline-flex; align-items: baseline; gap: 8px; }
  .pack-tab small { font-family: var(--mono); font-size: 10.5px; color: #5d6472; }
  .pack-tab:hover { color: #d7dbe2; }
  .pack-tab[aria-selected='true'] { background: #e8e6e1; color: #11141a; border-color: #e8e6e1; }
  .pack-tab[aria-selected='true'] small { color: #4b515e; }

  .pack[hidden] { display: none; }
  .pack-head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-start; }
  .pack-title { font-family: var(--display); font-size: 22px; margin: 0; }
  .pack-blurb { margin: 6px 0 0; color: #8b93a1; font-size: 13.5px; max-width: 62ch; }
  .pack-note { margin: 4px 0 0; color: #6f7787; font-size: 12.5px; font-style: italic; }
  .pack-stats { display: flex; gap: 16px; font-size: 12px; color: #6f7787; font-family: var(--mono); }
  .pack-stats b { color: #c9cedb; font-size: 14px; }
  .pack-stats .good b { color: #55be9a; }
  .pack-stats .bad b { color: #e2604a; }

  .strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 22px 0 8px; }
  .strip-card { border-radius: var(--r-md); overflow: hidden; border: 1px solid #232936; background: var(--surface); }
  .strip-sky { height: 54px; background: linear-gradient(to bottom, var(--sky-top), var(--sky-bottom)); }
  .strip-body { padding: 10px 12px 12px; }
  .strip-name { font-family: var(--display); font-weight: 700; font-size: 14px; margin: 0 0 8px; color: var(--text-primary); }
  .strip-dots { display: flex; gap: 6px; }
  .strip-dots span { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--surface-border); }

  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 20px; position: sticky; top: 0; z-index: 5; background: #0d0f14; padding: 12px 0; border-bottom: 1px solid #1c212b; }
  .tab { display: inline-flex; align-items: center; gap: 8px; font-family: var(--body); font-weight: 700; font-size: 13.5px; padding: 9px 16px; border-radius: var(--r-pill); cursor: pointer; background: #161a22; color: #98a0ae; border: 1px solid #262c39; }
  .tab:hover { color: #d7dbe2; }
  .tab-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); }
  .tab[aria-selected='true'] { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent-bright); }

  .panel[hidden] { display: none; }
  .panel { background: var(--bg); border: 1px solid var(--surface-border-strong); border-radius: var(--r-lg); padding: var(--s-xl); color: var(--text-primary); }
  .panel-head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .panel-head h2 { font-family: var(--display); font-size: 26px; margin: 6px 0 4px; letter-spacing: -0.3px; }
  .eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); margin: 0; }
  .blurb { margin: 0; color: var(--text-secondary); font-size: 14px; }
  .blurb-tr { margin-top: 4px; font-size: 12.5px; color: var(--text-tertiary); }
  .audit-badge { text-align: right; padding: 10px 14px; border-radius: var(--r-md); background: var(--patina-dim); border: 1px solid var(--patina); }
  .audit-badge strong { display: block; font-size: 14px; color: var(--patina); }
  .audit-badge small { color: var(--text-tertiary); font-size: 11.5px; }
  .audit-badge.has-fails { background: var(--ember-dim); border-color: var(--ember); }
  .audit-badge.has-fails strong { color: var(--ember); }

  .split { display: grid; grid-template-columns: minmax(260px, 0.85fr) minmax(300px, 1.15fr); gap: 20px; margin-bottom: 28px; }
  @media (max-width: 860px) { .split { grid-template-columns: 1fr; } }

  /* --- Living background preview --- */
  .stage { position: relative; overflow: hidden; border-radius: var(--r-lg); min-height: 420px; border: 1px solid var(--surface-border); }
  .sky, .celestial, .particles, .glass { position: absolute; inset: 0; }
  .sky { background: linear-gradient(to bottom, var(--sky-top), var(--sky-bottom)); }
  .celestial::after {
    content: ''; position: absolute; left: var(--cel-x); top: var(--cel-y);
    width: 170px; height: 170px; margin: -85px 0 0 -85px; border-radius: 50%;
    background: radial-gradient(circle, var(--celestial) 0 18%, var(--celestial-glow) 32%, transparent 68%);
  }
  /* The halo breathes; the disc never does. */
  .celestial.pulsing::after { animation: breathe 4.6s ease-in-out infinite alternate; }
  @keyframes breathe {
    from { transform: scale(1); opacity: 0.74; }
    to   { transform: scale(1.13); opacity: 1; }
  }

  .scenery { position: absolute; left: 0; right: 0; }
  .scenery-top { top: 0; }
  .scenery-bottom { bottom: 0; }
  .scenery svg { display: block; width: 100%; }
  .sway { transform-origin: var(--sway-origin); animation-name: sway; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
  @keyframes sway {
    from { transform: rotate(calc(var(--sway) * -1)); }
    to   { transform: rotate(var(--sway)); }
  }

  /* --- Named world effects --- */
  .vines, .shafts, .gumdrops, .shooting-star, .lightning { position: absolute; inset: 0; overflow: hidden; }
  .vine { position: absolute; top: 0; display: flex; flex-direction: column; align-items: center; transform-origin: top center; animation-name: sway; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
  .vine i { display: block; width: 4px; border-radius: 4px; background: var(--scenery); }
  .vine b { display: block; width: 13px; height: 9px; border-radius: 9px; background: var(--scenery-alt); }

  .shafts i { position: absolute; top: -40px; height: 72%; display: block; background: var(--celestial-glow); border-radius: 0 0 40px 40px; transform: skewX(9deg); animation-name: shaft; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
  @keyframes shaft {
    from { opacity: 0.18; transform: translateX(-14px) skewX(9deg) scaleY(0.94); }
    to   { opacity: 0.55; transform: translateX(14px) skewX(9deg) scaleY(1.06); }
  }

  .shooting-star i { position: absolute; top: 10%; left: 0; width: 90px; height: 3px; border-radius: 3px; background: var(--particle); opacity: 0; animation: shoot 9.3s linear infinite; }
  @keyframes shoot {
    0%    { transform: translate(-70px, 0) rotate(21deg) scaleX(0.3); opacity: 0; }
    1.5%  { opacity: 0.95; }
    10%   { transform: translate(86%, 34%) rotate(21deg) scaleX(0.85); opacity: 0; }
    100%  { transform: translate(86%, 34%) rotate(21deg) scaleX(0.85); opacity: 0; }
  }

  .gumdrops i { position: absolute; bottom: 44px; display: block; background: var(--scenery-alt); transform-origin: bottom center; animation-name: hop; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
  @keyframes hop {
    from { transform: translateY(0) scale(1.08, 0.88); }
    to   { transform: translateY(-9px) scale(0.96, 1.06); }
  }

  /* Drizzle: mist drifting, rings spreading where drops land. */
  .mist, .ripples, .sheets-down, .bolts, .spray { position: absolute; inset: 0; overflow: hidden; }
  .mist i { position: absolute; left: -20%; width: 140%; display: block; border-radius: 999px; background: var(--celestial-glow); animation-name: drift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
  @keyframes drift {
    from { opacity: 0.22; transform: translateX(-16%) scaleY(0.9); }
    to   { opacity: 0.6; transform: translateX(16%) scaleY(1.15); }
  }
  .ripples i { position: absolute; bottom: 26px; display: block; border: 1.5px solid var(--particle); border-radius: 999px; opacity: 0; animation-name: spread; animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1); animation-iteration-count: infinite; }
  @keyframes spread {
    0%   { transform: scale(0.2); opacity: 0; }
    15%  { opacity: 0.55; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  /* Downpour: water running down the pane in streams. */
  .sheets-down i { position: absolute; top: 0; height: 50%; display: block; border-radius: 6px; background: var(--particle-alt); opacity: 0; animation-name: run; animation-timing-function: cubic-bezier(0.4, 0, 0.9, 0.6); animation-iteration-count: infinite; }
  @keyframes run {
    0%   { transform: translateY(-50%) scaleY(0.5); opacity: 0; }
    10%  { opacity: 0.5; }
    75%  { opacity: 0.35; }
    100% { transform: translateY(460px) scaleY(1.25); opacity: 0; }
  }

  /* Thunder: forked bolts, plus the sky lighting up with them. */
  .bolts i { position: absolute; top: 0; width: 110px; height: 46%; display: block; opacity: 0; animation-name: strike; animation-timing-function: linear; animation-iteration-count: infinite; }
  .bolts i svg { width: 100%; height: 100%; }
  .bolts b { position: absolute; inset: 0; background: var(--scenery-alt); opacity: 0; animation: skyflash 10.2s linear infinite; }
  @keyframes strike {
    0%, 100% { opacity: 0; }
    0.6%  { opacity: 1; }
    1.3%  { opacity: 0.15; }
    2%    { opacity: 0.9; }
    3%    { opacity: 0.1; }
    4.2%  { opacity: 0; }
  }
  @keyframes skyflash {
    0%, 100% { opacity: 0; }
    0.6%  { opacity: 0.26; }
    1.3%  { opacity: 0.03; }
    2%    { opacity: 0.22; }
    3%    { opacity: 0.04; }
    4.2%  { opacity: 0; }
  }

  /* Tempest: spray blown flat across the view. */
  .spray i { position: absolute; left: 0; height: 2px; display: block; border-radius: 2px; background: var(--particle-alt); opacity: 0; animation-name: blow; animation-timing-function: linear; animation-iteration-count: infinite; }
  @keyframes blow {
    0%   { transform: translate(110vw, 0) rotate(9deg); opacity: 0; }
    12%  { opacity: 0.6; }
    80%  { opacity: 0.45; }
    100% { transform: translate(-180px, 44px) rotate(9deg); opacity: 0; }
  }

  /* --- Voidcore vortex ---
     A canvas and nothing else; the renderer at the foot of the document does
     the drawing. --pulse and --fx/--fy are the seam: the slider and the
     pointer write them here, the renderer reads them back as the same
     pulse / focus signal the RN overlay consumes. */
  /* Square, because the disc is face-on and concentric — a portrait panel
     would leave a third of the frame dead below it. */
  .stage.interactive { cursor: crosshair; --pulse: 0; --fx: 50%; --fy: 50%; aspect-ratio: 1; min-height: 380px; }
  .vortex { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .vx-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

  .signal-bar { display: flex; align-items: center; gap: 12px; margin-top: 10px; font-family: var(--mono); font-size: 11.5px; color: var(--text-tertiary); flex-wrap: wrap; }
  .signal-bar label { display: flex; align-items: center; gap: 8px; letter-spacing: 1.2px; text-transform: uppercase; }
  .signal-bar input[type=range] { width: 190px; accent-color: var(--accent); }
  .signal-bar output { color: var(--accent-bright); min-width: 4ch; }
  .signal-bar button { font-family: var(--mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 12px; border-radius: var(--r-sm); background: var(--accent-dim); color: var(--accent-bright); border: 1px solid var(--accent-border); cursor: pointer; }
  .signal-bar button:hover { background: var(--accent-border); }

  .lightning { background: var(--scenery-alt); opacity: 0; animation: flash 16.9s linear infinite; }
  @keyframes flash {
    0%, 100% { opacity: 0; }
    0.4%  { opacity: 0.17; }
    0.8%  { opacity: 0.02; }
    1.3%  { opacity: 0.21; }
    1.9%  { opacity: 0.03; }
    2.6%  { opacity: 0; }
  }

  .particles i { position: absolute; top: -60px; display: block; animation-timing-function: linear; animation-iteration-count: infinite; opacity: 0; }
  .particles i[style*='twinkle'] { top: auto; }
  @keyframes fall {
    0% { transform: translate3d(0, -60px, 0); opacity: 0; }
    6% { opacity: var(--peak); }
    88% { opacity: var(--peak); }
    100% { transform: translate3d(var(--drift), 480px, 0); opacity: 0; }
  }
  @keyframes fall-spin {
    0% { transform: translate3d(0, -60px, 0) rotate(0deg); opacity: 0; }
    6% { opacity: var(--peak); }
    88% { opacity: var(--peak); }
    100% { transform: translate3d(var(--drift), 480px, 0) rotate(320deg); opacity: 0; }
  }
  @keyframes rise {
    0% { transform: translate3d(0, 460px, 0); opacity: 0; }
    8% { opacity: var(--peak); }
    86% { opacity: var(--peak); }
    100% { transform: translate3d(var(--drift), -60px, 0); opacity: 0; }
  }
  @keyframes twinkle {
    0%, 100% { opacity: calc(var(--peak) * 0.25); transform: scale(0.7); }
    50% { opacity: var(--peak); transform: scale(1.15); }
  }
  .particles i { animation-timing-function: linear; }
  .particles i[style*='twinkle'] { animation-timing-function: ease-in-out; animation-direction: alternate; }

  .glass b { position: absolute; display: block; border-radius: 50%; background: var(--particle-alt); animation: bead 9s linear infinite; opacity: 0; }
  .glass b::after { content: ''; position: absolute; left: 18%; top: 14%; width: 34%; height: 34%; border-radius: 50%; background: var(--particle); }
  @keyframes bead {
    0% { transform: translateY(0) scale(0.4); opacity: 0; }
    10% { transform: translateY(0) scale(1); opacity: 0.95; }
    70% { transform: translateY(0) scale(1); opacity: 0.9; }
    100% { transform: translateY(160px) scale(1.1); opacity: 0; }
  }

  .stage-caption { position: absolute; left: 12px; bottom: 10px; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.6px; color: var(--text-tertiary); background: var(--overlay); padding: 5px 9px; border-radius: var(--r-sm); }

  /* --- UI mock --- */
  .mock { display: flex; flex-direction: column; gap: 14px; }
  .mock-card { background: var(--surface); border: 1px solid var(--surface-border); border-radius: var(--r-lg); padding: var(--s-lg); }
  .m-eyebrow { font-family: var(--mono); font-weight: 500; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); margin: 0 0 10px; }
  .m-title { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.3px; margin: 0 0 8px; color: var(--text-primary); }
  .m-body { font-size: 15px; line-height: 23px; color: var(--text-primary); margin: 0 0 6px; }
  .m-body code { font-family: var(--mono); font-size: 13px; color: var(--accent-bright); }
  .m-caption { font-size: 12.5px; line-height: 18px; color: var(--text-secondary); margin: 0 0 14px; }
  .m-row { display: flex; flex-wrap: wrap; gap: var(--s-sm); margin-top: 10px; align-items: center; }

  .btn { font-family: var(--body); font-weight: 700; font-size: 15px; padding: 13px var(--s-xl); border-radius: var(--r-pill); border: 1px solid transparent; cursor: default; }
  .btn.primary { background: var(--accent); color: var(--on-accent); }
  .btn.secondary { background: var(--surface-raised); color: var(--text-primary); border-color: var(--surface-border-strong); }
  .btn.ghost { background: transparent; color: var(--text-secondary); }
  .btn.danger { background: var(--ember-dim); color: var(--ember); border-color: var(--ember); }

  .m-chip { font-family: var(--body); font-weight: 500; font-size: 13px; padding: 7px var(--s-lg); border-radius: var(--r-pill); border: 1px solid var(--surface-border-strong); background: var(--surface); color: var(--text-secondary); }
  .m-chip.active { border-color: var(--accent-border); background: var(--accent-dim); color: var(--accent-bright); }

  .m-pill { font-family: var(--mono); font-weight: 500; font-size: 10px; letter-spacing: 1.2px; padding: 3px 10px; border-radius: var(--r-pill); border: 1px solid; }
  .m-pill.accent { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
  .m-pill.kindling { background: var(--kindling-dim); border-color: var(--kindling-border); color: var(--kindling); }
  .m-pill.patina { background: var(--patina-dim); border-color: var(--patina); color: var(--patina); }

  .type-card p { margin: 0 0 10px; color: var(--text-primary); }
  .t-hero { font-family: var(--display); font-weight: 700; font-size: 30px; letter-spacing: -0.5px; }
  .t-title { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.3px; }
  .t-subtitle { font-family: var(--display); font-weight: 500; font-size: 16px; }
  .t-body { font-size: 15px; line-height: 23px; }
  .t-caption { font-size: 12.5px; color: var(--text-secondary); }
  .t-mono { font-family: var(--mono); font-size: 12px; color: var(--text-tertiary); }

  /* --- Tokens --- */
  .groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
  .group { background: var(--surface); border: 1px solid var(--surface-border); border-radius: var(--r-lg); padding: var(--s-lg); margin-top: 18px; }
  .groups .group { margin-top: 0; }
  .group h3 { font-family: var(--display); font-size: 16px; margin: 0 0 4px; color: var(--text-primary); }
  .group-blurb { font-size: 12.5px; line-height: 18px; color: var(--text-secondary); margin: 0 0 14px; }
  .swatches { display: flex; flex-direction: column; gap: 8px; }
  .swatch { display: flex; align-items: center; gap: 10px; }
  .chipcolor { width: 34px; height: 34px; border-radius: var(--r-sm); border: 1px solid var(--surface-border-strong); flex: none; background-image: linear-gradient(45deg, #8883 25%, transparent 25%, transparent 75%, #8883 75%), linear-gradient(45deg, #8883 25%, transparent 25%, transparent 75%, #8883 75%); background-size: 10px 10px; background-position: 0 0, 5px 5px; }
  .swatch-meta { display: flex; flex-direction: column; min-width: 0; }
  .swatch-meta code { font-family: var(--mono); font-size: 12.5px; color: var(--text-primary); }
  .swatch-meta small { font-family: var(--mono); font-size: 11px; color: var(--text-tertiary); }

  /* --- Audit table --- */
  table.audit { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.audit th { text-align: left; font-family: var(--mono); font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-tertiary); padding: 0 8px 8px; font-weight: 500; }
  table.audit td { padding: 9px 8px; border-top: 1px solid var(--surface-border); vertical-align: middle; }
  .audit-label { color: var(--text-primary); }
  .audit-label .audit-note { display: block; font-size: 11.5px; color: var(--text-tertiary); margin-top: 2px; }
  .audit-swatch > span { display: inline-flex; padding: 4px; border-radius: var(--r-sm); }
  .audit-swatch > span > span { display: inline-flex; padding: 4px 8px; border-radius: 6px; }
  .audit-swatch b { font-family: var(--body); font-weight: 700; font-size: 14px; }
  .audit-ratio { font-family: var(--mono); font-size: 14px; color: var(--text-primary); white-space: nowrap; }
  .audit-ratio small { color: var(--text-tertiary); }
  .audit-min { font-family: var(--mono); font-size: 11.5px; color: var(--text-tertiary); white-space: nowrap; }
  .audit-verdict { font-family: var(--mono); font-size: 11px; letter-spacing: 1.2px; text-align: right; white-space: nowrap; }
  tr.pass .audit-verdict { color: var(--patina); }
  tr.fail .audit-verdict { color: var(--ember); }
  tr.fail { background: var(--ember-dim); }

  .footnote { margin-top: 28px; color: #6f7787; font-size: 12.5px; line-height: 1.6; }
  .footnote code { font-family: var(--mono); color: #98a0ae; }

  @media (prefers-reduced-motion: reduce) {
    .particles i, .glass b { animation: none; opacity: var(--peak, 0.6); }
    .celestial.pulsing::after, .sway, .vine, .shafts i, .gumdrops i, .mist i { animation: none; }
    .shooting-star i, .lightning, .bolts i, .bolts b { animation: none; opacity: 0; }
    .ripples i, .sheets-down i, .spray i { animation: none; opacity: 0.3; }
  }
</style>
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <div>
        <h1>MASSETS · Showroom</h1>
        <p>${PACKS.length} packs, ${totalVariants} variants, rendered from the real palette sources. Use it to design a new pack: check the contrast audit before shipping, and watch the living background react to the environment tokens.</p>
      </div>
      <div class="regen">npm run showroom</div>
    </header>

    <nav class="pack-tabs" role="tablist">
        ${packTabs}
    </nav>

    ${PACKS.map(packSection).join('\n\n    ')}

    <p class="footnote">
      Generated from each pack's <code>preview.ts</code> and <code>core/tokens.ts</code> by <code>tools/showroom.ts</code> — never edit <code>showroom/index.html</code> by hand, it is overwritten.
      Backgrounds here are CSS approximations of each pack's overlay component: right for colour and composition, not a pixel match for the RN Animated original.
      Typefaces load from Google Fonts; offline the page falls back to system faces and the metrics shift slightly.
    </p>
  </div>

<script>
  (function () {
    var packTabs = Array.prototype.slice.call(document.querySelectorAll('.pack-tab'));
    var packs = Array.prototype.slice.call(document.querySelectorAll('.pack'));

    function selectVariant(packEl, key) {
      var tabs = Array.prototype.slice.call(packEl.querySelectorAll('.tab'));
      var panels = Array.prototype.slice.call(packEl.querySelectorAll('.panel'));
      tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.tab === key)); });
      panels.forEach(function (p) { p.hidden = p.dataset.panel !== key; });
      try { localStorage.setItem('masset-showroom-variant-' + packEl.dataset.pack, key); } catch (e) {}
      if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
    }

    function selectPack(id) {
      packTabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.packtab === id)); });
      packs.forEach(function (p) { p.hidden = p.dataset.pack !== id; });
      try { localStorage.setItem('masset-showroom-pack', id); } catch (e) {}
      var el = packs.filter(function (p) { return p.dataset.pack === id; })[0];
      if (!el) return;
      var stored = null;
      try { stored = localStorage.getItem('masset-showroom-variant-' + id); } catch (e) {}
      var first = el.querySelector('.tab');
      var wanted = stored && el.querySelector('.tab[data-tab="' + stored + '"]') ? stored : (first ? first.dataset.tab : null);
      if (wanted) selectVariant(el, wanted);
    }

    packs.forEach(function (packEl) {
      packEl.querySelectorAll('.tab').forEach(function (t) {
        t.addEventListener('click', function () { selectVariant(packEl, t.dataset.tab); });
      });
      packEl.querySelectorAll('.strip-card').forEach(function (c) {
        c.addEventListener('click', function () { selectVariant(packEl, c.dataset.variant); });
      });
    });
    packTabs.forEach(function (t) { t.addEventListener('click', function () { selectPack(t.dataset.packtab); }); });

    // --- Voidcore: feed the stage's pointer into the same focus value the RN
    // overlay consumes, and give pulse a slider. This is the only way to judge
    // a theme whose whole point is that it reacts.
    Array.prototype.slice.call(document.querySelectorAll('.stage.interactive')).forEach(function (stage) {
      function aim(ev) {
        var r = stage.getBoundingClientRect();
        stage.style.setProperty('--fx', (((ev.clientX - r.left) / r.width) * 100).toFixed(2) + '%');
        stage.style.setProperty('--fy', (((ev.clientY - r.top) / r.height) * 100).toFixed(2) + '%');
        stage.classList.add('pointing');
      }
      stage.addEventListener('mousemove', aim);
      stage.addEventListener('touchmove', function (ev) { if (ev.touches[0]) aim(ev.touches[0]); }, { passive: true });
      stage.addEventListener('mouseleave', function () { stage.classList.remove('pointing'); });
      stage.addEventListener('touchend', function () { stage.classList.remove('pointing'); });
    });

    function stageFor(key) { return document.querySelector('.stage[data-stage="' + key + '"]'); }

    Array.prototype.slice.call(document.querySelectorAll('input.pulse')).forEach(function (slider) {
      var key = slider.dataset.for;
      var out = document.querySelector('.pulse-out[data-for="' + key + '"]');
      function apply(v) {
        var st = stageFor(key);
        if (st) st.style.setProperty('--pulse', String(v));
        if (out) out.textContent = v.toFixed(2);
      }
      slider.addEventListener('input', function () { apply(Number(slider.value) / 100); });
      apply(0);
    });

    // What answering actually sounds like: a hard attack, a couple of swells
    // as the thought lands, then a long tail. A single ramp up and down reads
    // as a slider being dragged, which is the one thing this button exists
    // NOT to look like.
    Array.prototype.slice.call(document.querySelectorAll('button.pulse-demo')).forEach(function (btn) {
      var key = btn.dataset.for;
      var timer = null;
      btn.addEventListener('click', function () {
        var slider = document.querySelector('input.pulse[data-for="' + key + '"]');
        var out = document.querySelector('.pulse-out[data-for="' + key + '"]');
        var st = stageFor(key);
        if (timer) clearInterval(timer);
        var t = 0;
        timer = setInterval(function () {
          t += 0.04;
          var v;
          if (t < 0.22) v = t / 0.22;
          else {
            var d = t - 0.22;
            v = Math.exp(-d * 0.62) * (0.7 + 0.3 * Math.cos(d * 5.1)) * (0.86 + 0.14 * Math.cos(d * 13.7));
          }
          if (v < 0) v = 0; else if (v > 1) v = 1;
          if (st) st.style.setProperty('--pulse', String(v));
          if (slider) slider.value = String(Math.round(v * 100));
          if (out) out.textContent = v.toFixed(2);
          if (t > 6) {
            clearInterval(timer); timer = null;
            if (st) st.style.setProperty('--pulse', '0');
            if (slider) slider.value = '0';
            if (out) out.textContent = '0.00';
          }
        }, 40);
      });
    });

    // --- Voidcore: the filament vortex -----------------------------------
    // A face-on disc built from 8000 hairline strokes on a log-spiral flow
    // field. Nothing here is drawn as a shape: the lit arc, the core boundary
    // and the outer rim are all stroke density. There is no outline anywhere,
    // and no stroke is wider than 1.2 device px.
    //
    // Four things do the work, in order of how much they matter:
    //   1. Differential rotation. omega falls off as 1/r^0.7, so the inner
    //      disc laps the outer one and the shear sweeps the filaments out.
    //      Rotate uniformly and it reads as a spinning wheel instead.
    //   2. Arm structure. Seen face-on the winding IS the subject, so density
    //      is modulated by sin(m*theta - k*ln r) into three arms. Without it
    //      the disc is a uniform smear.
    //   3. The trail buffer is never cleared, only faded. Last frame's ink is
    //      most of the texture.
    //   4. Additive blending at 0.02-0.12 per stroke. Brightness is overlap,
    //      not bright lines. If one stroke is visibly bright, it is wrong.
    (function () {
      var canvases = Array.prototype.slice.call(document.querySelectorAll('canvas[data-vortex]'));
      if (!canvases.length || typeof Path2D === 'undefined') return;

      var TAU = Math.PI * 2;
      var COUNT = 8000;              // density IS the effect - never trade it for fps
      var SPIRAL_B = 0.19;           // r = a * e^(b * theta)
      var SHEAR = 0.7;               // omega proportional to 1 / r^SHEAR
      var R_CORE = 0.32;             // the hole, as a fraction of the outer radius
      var R_OUT = 1.0;
      var EDGE = 0.08;               // both boundaries ramp out over this much of R
      var OMEGA = 0.075;             // rad/s at r = 1: the rim turns once in ~85s
      var INFALL = 0.011;            // slow accretion inward
      var MESO = 0.04;               // curl wobble, 4% of radius
      var MICRO = 0.5;               // per-point jitter, device px
      var ARM_M = 3;                 // three arms
      var ARM_K = 3.2;               // ...winding about half a turn across the disc
      var LIGHT = 215 * Math.PI / 180;
      var POINTER_R = 180;           // css px
      var POINTER_EASE = 0.18;       // seconds; ~600ms to settle back

      // Two events, both things an accretion disc actually does. Lightning
      // would be borrowed from weather; these come out of the same physics as
      // the rest of the picture.
      //
      //   infall  a body falling in on a fast decaying spiral, drawn as a
      //           moving point - the trail buffer makes the streak for free
      //   flare   a hot spot orbiting inside the disc, brightening the
      //           filaments around it exactly the way the pointer does
      //
      // Rare at rest, frequent under pulse.
      var IN_MAX = 8;
      var HS_MAX = 3;
      var HS_R = 0.3;                // flare radius, fraction of the disc

      // Depth tiers: alpha up, width down, wobble down. Their speeds sit in a
      // narrow band on purpose - face-on, two tiers at the same radius running
      // at visibly different rates tear against each other. All of the
      // differential rotation has to come from r.
      var LAYERS = 5;
      var L_ALPHA = [0.030, 0.048, 0.070, 0.095, 0.120];
      var L_WIDTH = [1.20, 0.95, 0.75, 0.55, 0.40];
      var L_SPEED = [0.90, 0.95, 1.00, 1.05, 1.10];
      var L_NOISE = [1.00, 0.78, 0.56, 0.36, 0.20];
      var L_SPAN =  [0.46, 0.38, 0.30, 0.23, 0.17];   // arc length, radians
      var ARC_PTS = 4;

      // Strokes are batched by (layer, width, intensity) so 8000 of them cost
      // ~120 stroke calls. The intensity buckets are spaced by the SQUARE of
      // the index: the lit arc times the arm crest is a small fraction of the
      // disc, so most strokes are dim and that is where the resolution has to
      // go.
      var W_BUCKETS = 3, T_BUCKETS = 8, T_LAST = 7;
      var W_SCALE = [0.68, 0.86, 1.00];               // thinner toward the centre
      var INT_MAX = 1.6;                              // headroom for the pointer boost
      var BIN_N = LAYERS * W_BUCKETS * T_BUCKETS;

      // r^-SHEAR and ln r, sampled on the one range that exists. 8000 pow and
      // log calls a frame is real time; this is accurate to well under a
      // percent.
      var RL_N = 640, RL_LO = 0.28, RL_HI = 1.06;
      var POW_LUT = new Float32Array(RL_N), LOG_LUT = new Float32Array(RL_N);
      var RL_SCALE = (RL_N - 1) / (RL_HI - RL_LO);
      for (var pq = 0; pq < RL_N; pq++) {
        var rq = RL_LO + (RL_HI - RL_LO) * pq / (RL_N - 1);
        POW_LUT[pq] = Math.pow(rq, -SHEAR);
        LOG_LUT[pq] = Math.log(rq);
      }

      // Angle offsets along each layer's arc, and the matching e^(b*dtheta).
      // With these precomputed the exponential and all but two of the trig
      // calls drop out of the inner loop entirely.
      var ARC_CD = new Float32Array(LAYERS * ARC_PTS);
      var ARC_SD = new Float32Array(LAYERS * ARC_PTS);
      var ARC_F = new Float32Array(LAYERS * ARC_PTS);
      for (var al = 0; al < LAYERS; al++) {
        for (var ap = 0; ap < ARC_PTS; ap++) {
          var d = L_SPAN[al] * (ap / (ARC_PTS - 1) - 0.5);
          ARC_CD[al * ARC_PTS + ap] = Math.cos(d);
          ARC_SD[al * ARC_PTS + ap] = Math.sin(d);
          ARC_F[al * ARC_PTS + ap] = Math.exp(SPIRAL_B * d);
        }
      }

      function mulberry32(a) {
        return function () {
          a |= 0; a = (a + 0x6d2b79f5) | 0;
          var t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      function seedFrom(text) {
        var h = 2166136261;
        for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
      }

      // Uncorrelated sub-pixel jitter, so no path reads as a clean arc.
      var JIT = new Float32Array(1024);
      var jr = mulberry32(0x5eed);
      for (var jq = 0; jq < 1024; jq++) JIT[jq] = (jr() - 0.5) * 2;

      // --- Curl noise ------------------------------------------------------
      // A scalar potential's curl is divergence-free, so the field swirls
      // rather than pumping filaments in and out of the disc. Baked once into
      // a grid and sampled bilinearly - evaluating it per particle per frame
      // costs more than everything else combined.
      var NF = 96;
      var NFX = new Float32Array(NF * NF), NFY = new Float32Array(NF * NF);
      (function () {
        function hash(ix, iy, s) {
          var h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1274126177);
          h = Math.imul(h ^ (h >>> 13), 1274126177);
          return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        }
        function vn(x, y, s) {
          var ix = Math.floor(x), iy = Math.floor(y);
          var fx = x - ix, fy = y - iy;
          var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
          var a = hash(ix, iy, s), b = hash(ix + 1, iy, s);
          var c = hash(ix, iy + 1, s), e = hash(ix + 1, iy + 1, s);
          return a + (b - a) * ux + (c - a) * uy + (a - b - c + e) * ux * uy;
        }
        function psi(x, y) { return vn(x * 3.1, y * 3.1, 17) + 0.5 * vn(x * 7.3, y * 7.3, 91); }
        var h = 0.01, mx = 0;
        for (var j = 0; j < NF; j++) {
          for (var i = 0; i < NF; i++) {
            var x = (i / (NF - 1)) * 2.8 - 1.4, y = (j / (NF - 1)) * 2.8 - 1.4;
            var gx = (psi(x, y + h) - psi(x, y - h)) / (2 * h);
            var gy = -(psi(x + h, y) - psi(x - h, y)) / (2 * h);
            NFX[j * NF + i] = gx; NFY[j * NF + i] = gy;
            if (Math.abs(gx) > mx) mx = Math.abs(gx);
            if (Math.abs(gy) > mx) mx = Math.abs(gy);
          }
        }
        if (mx > 0) for (var k = 0; k < NFX.length; k++) { NFX[k] /= mx; NFY[k] /= mx; }
      })();

      var FV = [0, 0];
      function sampleField(x, y) {
        var u = (x + 1.4) / 2.8 * (NF - 1);
        var v = (y + 1.4) / 2.8 * (NF - 1);
        if (u < 0) u = 0; else if (u > NF - 1.002) u = NF - 1.002;
        if (v < 0) v = 0; else if (v > NF - 1.002) v = NF - 1.002;
        var i0 = u | 0, j0 = v | 0, fu = u - i0, fv2 = v - j0;
        var a = j0 * NF, b = a + NF, i1 = i0 + 1;
        FV[0] = (NFX[a + i0] * (1 - fu) + NFX[a + i1] * fu) * (1 - fv2) + (NFX[b + i0] * (1 - fu) + NFX[b + i1] * fu) * fv2;
        FV[1] = (NFY[a + i0] * (1 - fu) + NFY[a + i1] * fu) * (1 - fv2) + (NFY[b + i0] * (1 - fu) + NFY[b + i1] * fu) * fv2;
      }

      // --- Colour ----------------------------------------------------------
      function rgb(value) {
        var v = (value || '').trim();
        if (v.charAt(0) === '#') {
          var n = parseInt(v.slice(1, 7), 16);
          return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        var o = v.indexOf('(');
        if (o < 0) return [255, 255, 255];
        var p = v.slice(o + 1, v.indexOf(')')).split(',');
        return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0, parseFloat(p[2]) || 0];
      }
      function mix(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      }
      function css(c, a) {
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
      }

      var instances = [];

      function build(canvas) {
        var stage = canvas.closest('.stage');
        var panel = canvas.closest('.panel');
        var pack = canvas.closest('.pack');
        if (!stage) return null;

        var view = canvas.getContext('2d', { alpha: false });
        var trailEl = document.createElement('canvas');
        var trail = trailEl.getContext('2d', { alpha: false });
        var bAEl = document.createElement('canvas'), bBEl = document.createElement('canvas');
        var bA = bAEl.getContext('2d', { alpha: false }), bB = bBEl.getContext('2d', { alpha: false });
        if (!view || !trail || !bA || !bB) return null;
        var canBloom = ('filter' in bA);

        // Every colour comes from the palette via the panel's CSS variables -
        // nothing is hardcoded, so all five voids theme themselves. Hue rides
        // intensity: navy in shadow, steel blue through the body, cyan-white
        // in the cores. One flat blue reads dead.
        var cs = getComputedStyle(canvas);
        var bgDeep = rgb(cs.getPropertyValue('--bg-deep'));
        var shadow = rgb(cs.getPropertyValue('--sky-bottom'));
        var midtone = mix(rgb(cs.getPropertyValue('--scenery')), rgb(cs.getPropertyValue('--scenery-alt')), 0.6);
        var core = rgb(cs.getPropertyValue('--celestial'));
        var glow = rgb(cs.getPropertyValue('--celestial-glow'));
        var dust = rgb(cs.getPropertyValue('--scenery'));
        var hotCol = css(core, 1);
        var bgFlat = css(bgDeep, 1);

        var BIN_COL = new Array(BIN_N), BIN_A = new Float64Array(BIN_N), BIN_W = new Float64Array(BIN_N);
        for (var L = 0; L < LAYERS; L++) {
          for (var W = 0; W < W_BUCKETS; W++) {
            for (var T = 0; T < T_BUCKETS; T++) {
              // Squared, to undo the square root the bucket index is taken by.
              var q = T / T_LAST;
              var tf = q * q * INT_MAX;
              var ti = tf > 1 ? 1 : tf;
              var col = ti < 0.5 ? mix(shadow, midtone, ti * 2) : mix(midtone, core, (ti - 0.5) * 2);
              // The floor has to be near nothing, not a comfortable minimum:
              // the unlit arc is supposed to go out, and a 0.3 floor here is
              // what stops it.
              var a = L_ALPHA[L] * (0.08 + 1.04 * tf);
              if (a > 0.12) a = 0.12;
              var wpx = L_WIDTH[L] * W_SCALE[W];
              if (wpx < 0.4) wpx = 0.4; else if (wpx > 1.2) wpx = 1.2;
              var idx = (L * W_BUCKETS + W) * T_BUCKETS + T;
              BIN_COL[idx] = css(col, 1);
              BIN_A[idx] = a;
              BIN_W[idx] = wpx;
            }
          }
        }

        var rnd = mulberry32(seedFrom(canvas.getAttribute('data-vortex') || 'void'));
        var pr = new Float32Array(COUNT), pth = new Float32Array(COUNT);
        var pl = new Uint8Array(COUNT), pv = new Float32Array(COUNT);
        for (var i = 0; i < COUNT; i++) {
          // sqrt spreads them by area, so the per-particle a in
          // r = a*e^(b*theta) covers the whole radial range rather than
          // crowding the core.
          pr[i] = R_CORE + (R_OUT - R_CORE) * Math.sqrt(rnd());
          pth[i] = rnd() * TAU;
          pl[i] = (rnd() * LAYERS) | 0;
          pv[i] = 0.55 + rnd() * 0.9;
        }
        if (pl[0] >= LAYERS) pl[0] = LAYERS - 1;

        // The field. A real sky is mostly faint: brightness runs as a steep
        // power law, so a handful carry the eye and the rest are dust. They
        // are kept off the disc - anything landing on the outer haze competes
        // with the filaments instead of sitting behind them - and held in
        // panel fractions so they survive a resize.
        var starN = 150;
        var starX = new Float32Array(starN), starY = new Float32Array(starN);
        var starA = new Float32Array(starN), starS = new Float32Array(starN);
        var starC = new Array(starN), starTw = new Float32Array(starN), starPh = new Float32Array(starN);
        var hotStar = css(rgb(cs.getPropertyValue('--particle')), 1);
        var coolStar = css(rgb(cs.getPropertyValue('--particle-alt')), 1);
        var warmStar = css(rgb(cs.getPropertyValue('--ember')), 1);
        for (var s = 0; s < starN; s++) {
          var sx = 0.5, sy = 0.5;
          for (var tries = 0; tries < 60; tries++) {
            sx = rnd(); sy = rnd();
            var ddx = sx - 0.5, ddy = sy - 0.5;
            if (ddx * ddx + ddy * ddy > 0.245) break;
          }
          var mag = rnd();
          starX[s] = sx; starY[s] = sy;
          starA[s] = 0.12 + 0.82 * mag * mag * mag;      // steep: most are faint
          starS[s] = mag > 0.93 ? 2 : 1;                 // only the brightest widen
          var hue = rnd();
          starC[s] = hue < 0.07 ? warmStar : hue < 0.42 ? coolStar : hotStar;
          // A quarter of them scintillate. The rest are dead still, because a
          // sky where everything twinkles reads as a screensaver.
          starTw[s] = rnd() < 0.25 ? 0.18 + rnd() * 0.3 : 0;
          starPh[s] = rnd() * TAU;
        }

        var paths = new Array(BIN_N);
        var w = 0, h = 0, bw = 0, bh = 0, dpr = 1, ccx = 0, ccy = 0, R = 1;
        var decayFill = css(bgDeep, 0.075), vignette = null, frameNo = 0;
        var ptrS = 0, ptrX = 0, ptrY = 0, ptrSeeded = false;
        var onScreen = true;

        // Deep field: a halo bleeding off the disc and a couple of dust
        // clouds. Baked once, composited additively on the way out - drawn
        // into the trail buffer instead they would compound frame on frame.
        var spaceEl = document.createElement('canvas');
        var space = spaceEl.getContext('2d');

        // Live events. Preallocated: they arrive in bursts under pulse, and
        // allocating mid-burst is the one place this could stutter.
        var inR = new Float32Array(IN_MAX), inTh = new Float32Array(IN_MAX);
        var inR0 = new Float32Array(IN_MAX), inSpin = new Float32Array(IN_MAX);
        var inLeft = new Float32Array(IN_MAX), inLife = new Float32Array(IN_MAX);
        var inPx = new Float32Array(IN_MAX), inPy = new Float32Array(IN_MAX);
        var inWait = 1.5 + rnd() * 5;

        var hsR = new Float32Array(HS_MAX), hsTh = new Float32Array(HS_MAX);
        var hsSpin = new Float32Array(HS_MAX);
        var hsLeft = new Float32Array(HS_MAX), hsLife = new Float32Array(HS_MAX);
        // Flattened for the inner loop: screen x, screen y, strength.
        var hsLive = new Float32Array(HS_MAX * 3);
        var hsN = 0;
        var hsWait = 2 + rnd() * 5;

        if (window.IntersectionObserver) {
          new window.IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }, { rootMargin: '160px' }).observe(canvas);
        }

        function resize() {
          var r = canvas.getBoundingClientRect();
          if (!r.width || !r.height) return false;
          var d = Math.min(2, window.devicePixelRatio || 1);
          var nw = Math.max(2, Math.round(r.width * d)), nh = Math.max(2, Math.round(r.height * d));
          if (nw === w && nh === h && d === dpr) return true;
          w = nw; h = nh; dpr = d;
          canvas.width = w; canvas.height = h;
          trailEl.width = w; trailEl.height = h;
          bw = Math.max(1, w >> 2); bh = Math.max(1, h >> 2);
          bAEl.width = bw; bAEl.height = bh; bBEl.width = bw; bBEl.height = bh;
          // Face-on and concentric with the panel.
          ccx = w * 0.5; ccy = h * 0.5;
          R = Math.min(w, h) * 0.42;
          spaceEl.width = w; spaceEl.height = h;
          paintSpace();

          // The decay fill is FLAT, not a gradient. A gradient here dithers,
          // and because the same dither lands in the same pixels every frame
          // the trail buffer accumulates it into a visible grid that competes
          // with the filaments. The vignette is a separate pass on the way
          // out, where it is drawn once and never fed back.
          var far = Math.sqrt(ccx * ccx + ccy * ccy);
          vignette = view.createRadialGradient(ccx, ccy, R * 1.15, ccx, ccy, far);
          vignette.addColorStop(0, css(bgDeep, 0));
          vignette.addColorStop(0.6, css(bgDeep, 0.3));
          vignette.addColorStop(1, css(bgDeep, 0.86));

          trail.globalCompositeOperation = 'source-over';
          trail.globalAlpha = 1;
          trail.fillStyle = bgFlat;
          trail.fillRect(0, 0, w, h);
          return true;
        }

        /**
         * The deep field, baked once per resize. Deliberately almost nothing.
         *
         * A halo around the disc and real dust clouds were both tried here and
         * both fogged the picture: any wash over the filaments costs contrast,
         * the bloom compounds it, and the result reads as out of focus. Space
         * is clear and black — the realism has to come from the starfield.
         * What is left is two corner clouds at a barely-there alpha, kept well
         * off the disc, only so the corners are not perfectly flat.
         */
        function paintSpace() {
          if (!space) return;
          space.globalCompositeOperation = 'source-over';
          space.clearRect(0, 0, w, h);
          var cloud = [
            { x: 0.12, y: 0.14, r: 0.34, c: dust, a: 0.05 },
            { x: 0.9, y: 0.88, r: 0.3, c: glow, a: 0.035 },
          ];
          for (var q = 0; q < cloud.length; q++) {
            var cd = cloud[q];
            var m = Math.min(w, h) * cd.r;
            var g = space.createRadialGradient(cd.x * w, cd.y * h, 0, cd.x * w, cd.y * h, m);
            g.addColorStop(0, css(cd.c, cd.a));
            g.addColorStop(0.5, css(cd.c, cd.a * 0.3));
            g.addColorStop(1, css(cd.c, 0));
            space.fillStyle = g;
            space.fillRect(0, 0, w, h);
          }
        }

        /** Something falling in from outside the rim, on a decaying spiral. */
        function spawnInfall() {
          var slot = -1;
          for (var q = 0; q < IN_MAX; q++) if (inLeft[q] <= 0) { slot = q; break; }
          if (slot < 0) return;
          inR0[slot] = 1.02 + rnd() * 0.2;
          inR[slot] = inR0[slot];
          inTh[slot] = rnd() * TAU;
          inSpin[slot] = 1.5 + rnd() * 1.8;
          inLife[slot] = 1.3 + rnd() * 1.7;
          inLeft[slot] = inLife[slot];
          inPx[slot] = ccx + Math.cos(inTh[slot]) * inR[slot] * R;
          inPy[slot] = ccy + Math.sin(inTh[slot]) * inR[slot] * R;
        }

        /**
         * Drawn as a moving point, not a streak: the trail buffer is already
         * holding forty frames of it, so the streak draws itself and stays in
         * the same visual language as the filaments.
         */
        function drawInfall(dt) {
          trail.globalCompositeOperation = 'lighter';
          trail.lineCap = 'round';
          trail.strokeStyle = hotCol;
          for (var q = 0; q < IN_MAX; q++) {
            if (inLeft[q] <= 0) continue;
            inLeft[q] -= dt;
            if (inLeft[q] <= 0) { inLeft[q] = 0; continue; }
            var f = 1 - inLeft[q] / inLife[q];
            var stop = R_CORE * 0.94;
            // Accelerating in, the way anything falling actually does.
            inR[q] = stop + (inR0[q] - stop) * Math.pow(1 - f, 1.9);
            // Same shear law as the disc, so it rides the flow rather than
            // cutting across it.
            var rc2 = inR[q] < RL_LO ? RL_LO : inR[q];
            var pi2 = ((rc2 - RL_LO) * RL_SCALE) | 0;
            if (pi2 < 0) pi2 = 0; else if (pi2 >= RL_N) pi2 = RL_N - 1;
            inTh[q] += inSpin[q] * POW_LUT[pi2] * dt;
            var nx = ccx + Math.cos(inTh[q]) * inR[q] * R;
            var ny = ccy + Math.sin(inTh[q]) * inR[q] * R;
            // Brightens as it falls, then burns out at the core.
            var a = (0.25 + 0.75 * f) * Math.min(1, (1 - f) * 6);
            trail.globalAlpha = a * 0.5;
            trail.lineWidth = 0.8 + f * 0.4;
            trail.beginPath();
            trail.moveTo(inPx[q], inPy[q]);
            trail.lineTo(nx, ny);
            trail.stroke();
            inPx[q] = nx; inPy[q] = ny;
          }
          trail.globalAlpha = 1;
        }

        /** A hot spot orbiting inside the disc. */
        function spawnFlare() {
          var slot = -1;
          for (var q = 0; q < HS_MAX; q++) if (hsLeft[q] <= 0) { slot = q; break; }
          if (slot < 0) return;
          hsR[slot] = R_CORE + 0.1 + rnd() * 0.5;
          hsTh[slot] = rnd() * TAU;
          hsSpin[slot] = 0.25 + rnd() * 0.4;
          hsLife[slot] = 2.4 + rnd() * 3.4;
          hsLeft[slot] = hsLife[slot];
        }

        /**
         * Advance the flares and flatten them for the particle loop. They
         * brighten filaments locally through the same term the pointer uses,
         * so a flare and a fingertip do the same thing to the flow.
         */
        function stepFlares(dt) {
          hsN = 0;
          for (var q = 0; q < HS_MAX; q++) {
            if (hsLeft[q] <= 0) continue;
            hsLeft[q] -= dt;
            if (hsLeft[q] <= 0) { hsLeft[q] = 0; continue; }
            var f = 1 - hsLeft[q] / hsLife[q];
            var rc2 = hsR[q] < RL_LO ? RL_LO : hsR[q];
            var pi2 = ((rc2 - RL_LO) * RL_SCALE) | 0;
            if (pi2 < 0) pi2 = 0; else if (pi2 >= RL_N) pi2 = RL_N - 1;
            hsTh[q] += hsSpin[q] * POW_LUT[pi2] * dt;
            hsLive[hsN * 3] = ccx + Math.cos(hsTh[q]) * hsR[q] * R;
            hsLive[hsN * 3 + 1] = ccy + Math.sin(hsTh[q]) * hsR[q] * R;
            hsLive[hsN * 3 + 2] = Math.sin(f * Math.PI);   // in and out, no snap
            hsN++;
          }
        }

        // The core is a hole, not a disc drawn over the top: density ramps to
        // nothing at R_CORE, so nothing is ever painted inside it and the
        // trail decay takes it to bg-deep on its own. Same at the rim. An
        // edge you can point at is an edge that was drawn.
        function strokeAll() {
          for (var k = 0; k < BIN_N; k++) {
            var p = paths[k];
            if (!p) continue;
            trail.strokeStyle = BIN_COL[k];
            trail.globalAlpha = BIN_A[k];
            trail.lineWidth = BIN_W[k];
            trail.stroke(p);
          }
        }

        function frame(dt, now) {
          frameNo++;

          // The signal in. Same two values the RN overlay reads.
          var pulse = parseFloat(stage.style.getPropertyValue('--pulse'));
          if (!isFinite(pulse)) pulse = 0;
          var fx = parseFloat(stage.style.getPropertyValue('--fx'));
          var fy = parseFloat(stage.style.getPropertyValue('--fy'));
          if (!isFinite(fx)) fx = 50;
          if (!isFinite(fy)) fy = 50;
          var tx = fx / 100 * w, ty = fy / 100 * h;
          if (!ptrSeeded) { ptrX = tx; ptrY = ty; ptrSeeded = true; }
          // Eased in and out, not switched. A reaction, not a blink.
          var ease = 1 - Math.exp(-dt / POINTER_EASE);
          ptrS += ((stage.classList.contains('pointing') ? 1 : 0) - ptrS) * ease;
          ptrX += (tx - ptrX) * ease;
          ptrY += (ty - ptrY) * ease;

          trail.globalCompositeOperation = 'source-over';
          trail.globalAlpha = 1;
          trail.fillStyle = decayFill;
          trail.fillRect(0, 0, w, h);

          // Stars: source-over at their own alpha, so the trail buffer cannot
          // accumulate them up to white. Static - they are not the motion.
          var sp = Math.max(1, Math.round(dpr));
          for (var s = 0; s < starN; s++) {
            var sa = starA[s];
            if (starTw[s] > 0) sa *= 1 - starTw[s] * (0.5 + 0.5 * Math.sin(now * 1.7 + starPh[s]));
            trail.globalAlpha = sa;
            trail.fillStyle = starC[s];
            trail.fillRect((starX[s] * w) | 0, (starY[s] * h) | 0, sp * starS[s], sp * starS[s]);
          }
          trail.globalAlpha = 1;

          for (var b = 0; b < BIN_N; b++) paths[b] = null;

          var nAng = now * 0.011;
          var cnA = Math.cos(nAng), snA = Math.sin(nAng);
          var jb = (frameNo * 7) & 1023;
          var ptrOn = ptrS > 0.004;
          var pRad = POINTER_R * dpr, pRad2 = pRad * pRad;

          // The disc does not turn at a constant rate. Two incommensurate
          // periods, so it wanders between about half speed and half again
          // and never repeats - a metronome is the thing that makes a loop
          // read as a loop.
          var wander = 1 + 0.36 * Math.sin(now * 0.107) + 0.15 * Math.sin(now * 0.263 + 1.3);
          var spinMul = wander * (1 + pulse * 1.4);
          // And the light drifts, so the hot arc breathes rather than sitting.
          var lightAng = LIGHT + 0.22 * Math.sin(now * 0.061) + 0.09 * Math.sin(now * 0.147);
          var breath = 1 + 0.09 * Math.sin(now * 0.37) + 0.05 * Math.sin(now * 0.83 + 2.1);

          inWait -= dt;
          if (inWait <= 0) {
            spawnInfall();
            if (pulse > 0.5 && rnd() < pulse * 0.7) spawnInfall();
            inWait = (0.5 + rnd() * 2.2) / (0.2 + pulse * 2.4);
          }
          hsWait -= dt;
          if (hsWait <= 0) {
            spawnFlare();
            hsWait = (1.6 + rnd() * 4.5) / (0.3 + pulse * 2.2);
          }
          stepFlares(dt);

          var hsRad = HS_R * R, hsRad2 = hsRad * hsRad;
          var i, j;

          for (i = 0; i < COUNT; i++) {
            var layer = pl[i];
            var r = pr[i], th = pth[i];
            var c0 = Math.cos(th), s0 = Math.sin(th);
            var dx = c0 * r, dy = s0 * r;

            // Meso wobble, sampled in a frame that turns with the disc so the
            // pattern travels with the flow instead of sitting in screen space.
            sampleField(dx * cnA - dy * snA, dx * snA + dy * cnA);
            var na = MESO * L_NOISE[layer];
            var mx = FV[0] * na, my = FV[1] * na;

            var px = ccx + (dx + mx) * R;
            var py = ccy + (dy + my) * R;

            // The pointer perturbs the flow field: a local swirl and lift, and
            // brighter where it is stirring. It is not a target for a bolt.
            var boost = 0;
            if (ptrOn) {
              var ddx = px - ptrX, ddy = py - ptrY;
              var d2 = ddx * ddx + ddy * ddy;
              if (d2 < pRad2) {
                var f = 1 - Math.sqrt(d2) / pRad;
                boost = f * f * ptrS;
              }
            }
            for (var hq = 0; hq < hsN; hq++) {
              var hdx = px - hsLive[hq * 3], hdy = py - hsLive[hq * 3 + 1];
              var hd2 = hdx * hdx + hdy * hdy;
              if (hd2 < hsRad2) {
                var hf = 1 - Math.sqrt(hd2) / hsRad;
                var hb = hf * hf * hsLive[hq * 3 + 2] * 0.8;
                if (hb > boost) boost = hb;
              }
            }

            var pi = ((r - RL_LO) * RL_SCALE) | 0;
            if (pi < 0) pi = 0; else if (pi >= RL_N) pi = RL_N - 1;
            var dth = OMEGA * L_SPEED[layer] * spinMul * POW_LUT[pi] * (1 + boost * 1.1) * dt;

            th += dth;
            r -= (INFALL * pv[i] - boost * 0.11) * dt;

            var c1, s1;
            if (r <= R_CORE - 0.02 || r > R_OUT + 0.06) {
              // Respawn at the rim, inside the density ramp, so a particle
              // fades in rather than appearing.
              r = R_OUT - rnd() * 0.02;
              th = rnd() * TAU;
              c1 = Math.cos(th); s1 = Math.sin(th);
            } else {
              // dth is a small fraction of a radian per frame, so the
              // small-angle rotation is exact to ~1e-5 here and saves 8000
              // sin/cos pairs. th itself stays exact - it is not derived back.
              var hc = 1 - dth * dth * 0.5;
              c1 = c0 * hc - s0 * dth;
              s1 = s0 * hc + c0 * dth;
            }
            if (th > TAU) th -= TAU; else if (th < 0) th += TAU;
            pr[i] = r; pth[i] = th;

            var rr = (r - R_CORE) / (R_OUT - R_CORE);
            if (rr < 0) rr = 0; else if (rr > 1) rr = 1;
            var tR = (1 - rr) * (1 - rr);      // energy piles up toward the hole

            // Both boundaries ramp out over EDGE of the radius. Not a hard
            // cutoff, but tight enough that each still reads as an edge -
            // and it is the only thing making them, nothing is stroked there.
            var eIn = (r - R_CORE) / EDGE; if (eIn > 1) eIn = 1; else if (eIn < 0) eIn = 0;
            var eOut = (R_OUT - r) / EDGE; if (eOut > 1) eOut = 1; else if (eOut < 0) eOut = 0;
            var edge = eIn * eIn * (3 - 2 * eIn) * eOut * eOut * (3 - 2 * eOut);

            // Fixed directional light. Face-on there is no near rim to sit
            // behind, so the asymmetry has to be lit rather than perspectival:
            // one arc hot, the opposite one all but out, smooth the whole way
            // round with no seam at the antipode.
            var ad = th - lightAng;
            while (ad > Math.PI) ad -= TAU;
            while (ad < -Math.PI) ad += TAU;
            var hc2 = Math.cos(ad * 0.5);
            var lit = 0.15 + 0.85 * hc2 * hc2 * hc2;

            // Three arms. Seen face-on the winding is the whole subject, so
            // the density has to be structured or it reads as one smear. The
            // smoothstep sharpens crest and trough without putting an edge
            // anywhere - the trail decay smears a raw sine back into mush.
            // The floor matters as much as the crest: taken all the way to
            // zero the arms detach into three separate commas and the disc
            // stops being a disc.
            var raw = 0.5 + 0.5 * Math.sin(ARM_M * th - ARM_K * LOG_LUT[pi]);
            var arm = 0.18 + 0.82 * raw * raw * (3 - 2 * raw);

            // Strokes span a fixed ANGLE, so a filament out at the rim lays
            // down three times the ink of one near the core. This pays for
            // that - without it the rim accumulates into a bright ring that
            // reads as a drawn circle - but not so steeply that the outer
            // boundary loses the ink it needs to read as an edge at all.
            var dens = 0.22 + 0.78 * tR;
            // 2.25 is the ceiling before the arm crests clip to flat white and
            // take the filament texture with them - and a blown-out crest plus
            // bloom is exactly what reads as "out of focus".
            var t = dens * arm * lit * edge * breath * 2.25 + (pulse * 0.3 + boost * 0.75) * edge;
            if (t < 0) t = 0; else if (t > INT_MAX) t = INT_MAX;

            // sqrt-spaced buckets: most of the disc is dim, so that is where
            // the eight steps need to land.
            var tb = (Math.sqrt(t / INT_MAX) * T_LAST + 0.5) | 0;
            if (tb > T_LAST) tb = T_LAST; else if (tb < 0) tb = 0;
            var wb = rr < 0.34 ? 0 : (rr < 0.67 ? 1 : 2);
            var bin = (layer * W_BUCKETS + wb) * T_BUCKETS + tb;
            var p = paths[bin];
            if (!p) { p = new Path2D(); paths[bin] = p; }

            var base = layer * ARC_PTS;
            for (j = 0; j < ARC_PTS; j++) {
              var k = base + j;
              var cd = ARC_CD[k], sd = ARC_SD[k];
              var cj = c1 * cd - s1 * sd, sj = s1 * cd + c1 * sd;
              var rj = r * ARC_F[k];
              // Hashed, not indexed in sequence: stepping the jitter table by
              // one per particle correlates neighbours and prints a faint
              // lattice into the trail buffer.
              var jh = (Math.imul(i + 1, 2654435761) ^ Math.imul(j + jb + 1, 40503)) >>> 0;
              var ux = ccx + (cj * rj + mx) * R + JIT[jh & 1023] * MICRO;
              var uy = ccy + (sj * rj + my) * R + JIT[(jh >>> 10) & 1023] * MICRO;
              if (j === 0) p.moveTo(ux, uy); else p.lineTo(ux, uy);
            }
          }

          trail.lineCap = 'round';
          trail.lineJoin = 'round';
          trail.globalCompositeOperation = 'lighter';
          strokeAll();
          drawInfall(dt);
          trail.globalCompositeOperation = 'source-over';
          trail.globalAlpha = 1;

          // Present. The trail buffer stays clean - bloom is applied on the way
          // out, never fed back into it, or it would run away over a few
          // hundred frames.
          view.globalCompositeOperation = 'copy';
          view.globalAlpha = 1;
          view.drawImage(trailEl, 0, 0);

          if (canBloom) {
            // Quarter size, squared so dim regions stay dim and only the hot
            // cores blow out, two gaussian passes, then added back at 0.5.
            // shadowBlur at this stroke count is not on the table.
            bB.globalCompositeOperation = 'copy'; bB.filter = 'none';
            bB.drawImage(trailEl, 0, 0, bw, bh);
            bA.globalCompositeOperation = 'copy'; bA.filter = 'none';
            bA.drawImage(bBEl, 0, 0);
            bA.globalCompositeOperation = 'multiply';
            bA.drawImage(bBEl, 0, 0);
            bB.globalCompositeOperation = 'copy'; bB.filter = 'blur(3px)';
            bB.drawImage(bAEl, 0, 0);
            bA.globalCompositeOperation = 'copy'; bA.filter = 'blur(3px)';
            bA.drawImage(bBEl, 0, 0);
            bA.filter = 'none'; bB.filter = 'none';

            view.globalCompositeOperation = 'lighter';
            view.globalAlpha = 0.45;
            view.drawImage(bAEl, 0, 0, w, h);
            view.globalAlpha = 1;
            view.globalCompositeOperation = 'source-over';
          }

          // Halo and dust, then the vignette, and only here. Drawn into the
          // trail buffer either would compound every frame and dither itself
          // into a grid; on the way out they just sit where they belong.
          view.globalCompositeOperation = 'lighter';
          view.drawImage(spaceEl, 0, 0);
          view.globalCompositeOperation = 'source-over';
          view.fillStyle = vignette;
          view.fillRect(0, 0, w, h);
        }

        return {
          step: function (dt, now) {
            if (document.hidden || !onScreen) return;
            if (panel && panel.hidden) return;
            if (pack && pack.hidden) return;
            if (!resize()) return;
            frame(dt, now);
          }
        };
      }

      for (var ci = 0; ci < canvases.length; ci++) {
        var inst = build(canvases[ci]);
        if (inst) instances.push(inst);
      }
      if (!instances.length) return;

      var last = 0;
      function tick(now) {
        var dt = last ? (now - last) / 1000 : 1 / 60;
        last = now;
        if (dt > 0.05) dt = 0.05;
        for (var i = 0; i < instances.length; i++) instances[i].step(dt, now / 1000);
        window.requestAnimationFrame(tick);
      }
      window.requestAnimationFrame(tick);
    })();

    // A #pack-variant hash deep-links straight to one variant.
    var hash = location.hash.slice(1);
    var target = hash ? document.querySelector('.panel[data-panel="' + hash + '"]') : null;
    if (target) {
      var owner = target.closest('.pack');
      selectPack(owner.dataset.pack);
      selectVariant(owner, hash);
    } else {
      var storedPack = null;
      try { storedPack = localStorage.getItem('masset-showroom-pack'); } catch (e) {}
      var valid = packTabs.some(function (t) { return t.dataset.packtab === storedPack; });
      selectPack(valid ? storedPack : packTabs[0].dataset.packtab);
    }
  })();
</script>
</body>
</html>
`;
}

const out = join(__dirname, '..', '..', 'showroom', 'index.html');
writeFileSync(out, build(), 'utf8');
const variants = PACKS.reduce((n, p) => n + p.variants.length, 0);
const fails = PACKS.reduce((n, p) => n + p.variants.reduce((m, v) => m + auditRows(p.palettes[v]).fails, 0), 0);
console.log(`showroom → ${out}`);
console.log(`  ${PACKS.length} packs · ${variants} variants · ${THEME_COLOR_KEYS.length} tokens · ${CHECKS.length} checks each`);
console.log(`  ${fails} contrast failure${fails === 1 ? '' : 's'} across all packs`);
