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

// Every pack the showroom renders. One line per pack.
const PACKS: PackPreview<string>[] = [seasonsPreview, cartoonPreview];

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
        dur = (0.7 + rand() * 0.5) / depth;
        drift = 3;
        const h = (12 + rand() * 10) * depth;
        shape = `width:${(1.2 + depth).toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:1px;background:${color};`;
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
        <div class="stage" style="--cel-x:${(cel.x * 100).toFixed(1)}%;--cel-y:${(cel.y * 100).toFixed(1)}%">
          <div class="sky"></div>
          <div class="celestial${preview.celestialPulse === false ? '' : ' pulsing'}"></div>
          ${sceneryHtml(preview, colors)}
          ${effectsHtml(preview, key)}
          <div class="particles">${particleField(pack.id, variant, preview, colors)}</div>
          <div class="stage-caption">Living background — CSS approximation</div>
        </div>

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
    .celestial.pulsing::after, .sway, .vine, .shafts i, .gumdrops i { animation: none; }
    .shooting-star i, .lightning { animation: none; opacity: 0; }
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
