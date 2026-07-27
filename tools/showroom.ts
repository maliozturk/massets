// Generates showroom/index.html from the REAL palette source.
//
// Same discipline as research_vault's `dogrula`: this compiles and imports
// packs/*/palettes.ts rather than restating the colours, so the showroom can
// never drift from what the apps actually render. Add a token to
// core/tokens.ts and it appears here on the next `npm run showroom`.
//
// Deterministic output — the particle field uses a seeded PRNG so regenerating
// without a palette change produces a byte-identical file and an empty diff.

import { writeFileSync } from 'fs';
import { join } from 'path';

import { THEME_COLOR_KEYS, radius, spacing, type ThemeColors } from '../core/tokens';
import { BLOSSOM, MEADOW, RAIN, SNOW } from '../packs/seasons/palettes';
import { SEASONS, SEASON_LABELS, seasonForMonth, type Season } from '../packs/seasons/seasons';

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

// --- Contrast audit --------------------------------------------------------

interface Check {
  label: string;
  fg: keyof ThemeColors;
  /** Tint layer between text and ground, if any. */
  on: keyof ThemeColors;
  /** Opaque ground the tint sits on. */
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

// --- HTML ------------------------------------------------------------------

const PALETTES: Record<Season, ThemeColors> = { rain: RAIN, snow: SNOW, blossom: BLOSSOM, meadow: MEADOW };
const DARK: Season[] = ['rain'];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function variantVars(colors: ThemeColors): string {
  return THEME_COLOR_KEYS.map((k) => `      --${kebab(k)}: ${css(colors[k])};`).join('\n');
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function particleField(season: Season, colors: ThemeColors): string {
  const rand = mulberry32(season.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const count = season === 'rain' ? 40 : season === 'snow' ? 26 : 16;
  const cells: string[] = [];
  for (let i = 0; i < count; i++) {
    const left = (rand() * 100).toFixed(2);
    const delay = (rand() * 8).toFixed(2);
    const depth = 0.55 + rand() * 0.45;
    const alt = rand() < 0.45;
    const color = alt ? colors.particleAlt : colors.particle;
    const dur =
      season === 'rain' ? (0.7 + rand() * 0.5) / depth : season === 'snow' ? (8 + rand() * 6) / depth : (7 + rand() * 5) / depth;
    const drift = season === 'rain' ? 3 : (rand() - 0.5) * 80;

    let shape: string;
    if (season === 'rain') {
      const h = (12 + rand() * 10) * depth;
      shape = `width:${(1.2 + depth).toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:1px;`;
    } else if (season === 'snow') {
      const d = (4 + rand() * 8) * depth;
      shape = `width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;border-radius:50%;`;
    } else {
      const w = (8 + rand() * 6) * depth;
      shape = `width:${w.toFixed(1)}px;height:${(w * 0.66).toFixed(1)}px;border-radius:${w.toFixed(
        1
      )}px 2px ${w.toFixed(1)}px 2px;`;
    }

    cells.push(
      `<i style="left:${left}%;${shape}background:${color};animation-duration:${dur.toFixed(
        2
      )}s;animation-delay:-${delay}s;--drift:${drift.toFixed(1)}px;--peak:${(0.35 + depth * 0.65).toFixed(2)}"></i>`
    );
  }
  return cells.join('');
}

function scenerySvg(season: Season, colors: ThemeColors): string {
  if (season === 'rain') {
    return `<svg viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M 0 120 L 0 70 L 34 70 L 34 44 L 62 44 L 62 78 L 96 78 L 96 30 L 130 30 L 130 66 L 158 66 L 158 52 L 196 52 L 196 82 L 232 82 L 232 24 L 262 24 L 262 60 L 300 60 L 300 44 L 330 44 L 330 74 L 368 74 L 368 56 L 400 56 L 400 120 Z" fill="${colors.scenery}"/>${[
      [104, 40], [116, 54], [240, 34], [252, 48], [270, 68], [40, 54], [308, 52], [338, 82], [170, 60],
    ]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="7" rx="1" fill="${colors.sceneryAlt}"/>`)
      .join('')}</svg>`;
  }
  if (season === 'snow') {
    return `<svg viewBox="0 0 400 110" preserveAspectRatio="none"><path d="M 60 62 L 76 26 L 92 62 Z M 68 46 L 76 30 L 84 46 Z" fill="${colors.sceneryAlt}"/><path d="M 322 58 L 336 30 L 350 58 Z" fill="${colors.sceneryAlt}"/><path d="M 0 84 Q 100 44 200 74 T 400 64 L 400 110 L 0 110 Z" fill="${colors.sceneryAlt}"/><path d="M 0 92 Q 120 62 240 88 T 400 82 L 400 110 L 0 110 Z" fill="${colors.scenery}"/></svg>`;
  }
  if (season === 'blossom') {
    return `<svg viewBox="0 0 400 150" preserveAspectRatio="none" class="scenery-top"><path d="M 400 6 C 330 14 280 30 236 62 M 400 6 C 344 34 318 52 296 88 M 316 40 C 300 58 292 74 288 96 M 260 48 C 250 62 246 74 244 88" stroke="${colors.scenery}" stroke-width="7" stroke-linecap="round" fill="none"/>${[
      [236, 62, 11], [252, 52, 8], [270, 44, 10], [296, 88, 10], [306, 74, 8], [288, 96, 8],
      [318, 56, 9], [244, 88, 8], [252, 76, 6], [340, 36, 9], [356, 26, 7], [280, 58, 7],
    ]
      .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors.sceneryAlt}"/>`)
      .join('')}</svg>`;
  }
  const blades = Array.from({ length: 26 }, (_, i) => {
    const bx = 4 + i * 15.5;
    const h = 26 + ((i * 37) % 30);
    const lean = ((i * 53) % 17) - 8;
    return `M ${bx} 90 Q ${bx + lean * 0.4} ${90 - h * 0.6} ${bx + lean} ${90 - h}`;
  }).join(' ');
  return `<svg viewBox="0 0 400 90" preserveAspectRatio="none"><path d="${blades}" stroke="${colors.scenery}" stroke-width="3" stroke-linecap="round" fill="none"/>${[
    [38, 42], [102, 34], [178, 46], [251, 36], [322, 44], [376, 38],
  ]
    .map(([cx, cy], i) => `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${i % 2 === 0 ? colors.sceneryAlt : colors.particle}"/>`)
    .join('')}</svg>`;
}

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

function build(): string {
  const now = new Date();
  const defaultSeason = seasonForMonth(now.getMonth());

  const themeBlocks = SEASONS.map(
    (s) => `    [data-variant='${s}'] {\n${variantVars(PALETTES[s])}\n    }`
  ).join('\n');

  const panels = SEASONS.map((season) => {
    const colors = PALETTES[season];
    const en = SEASON_LABELS.en[season];
    const tr = SEASON_LABELS.tr[season];
    const audit = auditRows(colors);
    const isDark = DARK.includes(season);

    const tokenGroups = GROUPS.map(
      (group) => `<section class="group">
          <h3>${esc(group.title)}</h3>
          <p class="group-blurb">${esc(group.blurb)}</p>
          <div class="swatches">
            ${group.keys
              .map(
                (key) => `<div class="swatch">
              <span class="chipcolor" style="background:${css(colors[key])}"></span>
              <span class="swatch-meta"><code>${key}</code><small>${esc(colors[key])}</small></span>
            </div>`
              )
              .join('\n            ')}
          </div>
        </section>`
    ).join('\n        ');

    return `<article class="panel" data-panel="${season}" data-variant="${season}" hidden>
      <header class="panel-head">
        <div>
          <p class="eyebrow">${isDark ? 'DARK VARIANT' : 'LIGHT VARIANT'}${
            season === defaultSeason ? ' · DEFAULT THIS MONTH' : ''
          }</p>
          <h2>${esc(en.label)}</h2>
          <p class="blurb">${esc(en.blurb)}</p>
          <p class="blurb blurb-tr">TR — ${esc(tr.label)} · ${esc(tr.blurb)}</p>
        </div>
        <div class="audit-badge ${audit.fails ? 'has-fails' : ''}">
          <strong>${audit.fails === 0 ? 'All clear' : `${audit.fails} contrast ${audit.fails === 1 ? 'issue' : 'issues'}`}</strong>
          <small>${CHECKS.length} WCAG checks</small>
        </div>
      </header>

      <div class="split">
        <div class="stage" data-season="${season}">
          <div class="sky"></div>
          <div class="celestial"></div>
          <div class="scenery">${scenerySvg(season, colors)}</div>
          <div class="particles" data-kind="${season === 'rain' ? 'rain' : season === 'snow' ? 'snow' : 'leaf'}">${particleField(
            season,
            colors
          )}</div>
          ${season === 'rain' ? '<div class="glass">' + glassDrops(colors) + '</div>' : ''}
          <div class="stage-caption">Living background — CSS approximation of WeatherOverlay.tsx</div>
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
            <p class="t-body">Body 15 — Manrope regular, the workhorse.</p>
            <p class="t-caption">Caption 12.5 — supporting detail.</p>
            <p class="t-mono">mono 12 — JetBrains, stamps and serials</p>
          </div>
        </div>
      </div>

      <section class="group">
        <h3>Contrast audit</h3>
        <p class="group-blurb">Every pair flattened the way it actually stacks — tint over panel, text on top. A new pack that fails here will be unreadable on a phone in daylight.</p>
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
  }).join('\n\n    ');

  const tabs = SEASONS.map(
    (s) =>
      `<button class="tab" data-tab="${s}" data-variant="${s}"><span class="tab-dot"></span>${esc(
        SEASON_LABELS.en[s].label
      )}</button>`
  ).join('\n        ');

  const strip = SEASONS.map((s) => {
    const c = PALETTES[s];
    return `<div class="strip-card" data-variant="${s}">
          <div class="strip-sky"></div>
          <div class="strip-body">
            <p class="strip-name">${esc(SEASON_LABELS.en[s].label)}</p>
            <div class="strip-dots">
              ${(['accent', 'patina', 'kindling', 'ember', 'textPrimary'] as (keyof ThemeColors)[])
                .map((k) => `<span title="${k}" style="background:${css(c[k])}"></span>`)
                .join('')}
            </div>
          </div>
        </div>`;
  }).join('\n        ');

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
    --r-sm: ${radius.sm}px; --r-md: ${radius.md}px; --r-lg: ${radius.lg}px; --r-pill: 999px;
    --s-sm: ${spacing.sm}px; --s-md: ${spacing.md}px; --s-lg: ${spacing.lg}px; --s-xl: ${spacing.xl}px;
  }

${themeBlocks}

  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: var(--body);
    background: #0d0f14;
    color: #e8e6e1;
    -webkit-font-smoothing: antialiased;
  }

  .shell { max-width: 1180px; margin: 0 auto; padding: 32px 20px 96px; }

  .masthead { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 8px; }
  .masthead h1 { font-family: var(--display); font-size: 30px; letter-spacing: -0.5px; margin: 0; }
  .masthead p { margin: 6px 0 0; color: #8b93a1; font-size: 13.5px; max-width: 60ch; line-height: 1.55; }
  .regen { font-family: var(--mono); font-size: 11.5px; color: #6f7787; background: #161a22; border: 1px solid #232936; padding: 8px 12px; border-radius: var(--r-sm); white-space: nowrap; }

  .strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 28px 0 8px; }
  .strip-card { border-radius: var(--r-md); overflow: hidden; border: 1px solid #232936; background: var(--surface); }
  .strip-sky { height: 54px; background: linear-gradient(to bottom, var(--sky-top), var(--sky-bottom)); }
  .strip-body { padding: 10px 12px 12px; }
  .strip-name { font-family: var(--display); font-weight: 700; font-size: 14px; margin: 0 0 8px; color: var(--text-primary); }
  .strip-dots { display: flex; gap: 6px; }
  .strip-dots span { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--surface-border); }

  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 28px 0 20px; position: sticky; top: 0; z-index: 5; background: #0d0f14; padding: 12px 0; border-bottom: 1px solid #1c212b; }
  .tab {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: var(--body); font-weight: 700; font-size: 13.5px;
    padding: 9px 16px; border-radius: var(--r-pill); cursor: pointer;
    background: #161a22; color: #98a0ae; border: 1px solid #262c39;
  }
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
  .sky, .celestial, .scenery, .particles, .glass { position: absolute; inset: 0; }
  .sky { background: linear-gradient(to bottom, var(--sky-top), var(--sky-bottom)); }
  .celestial::after {
    content: ''; position: absolute; width: 150px; height: 150px; border-radius: 50%;
    background: radial-gradient(circle, var(--celestial) 0 18%, var(--celestial-glow) 30%, transparent 68%);
  }
  .stage[data-season='rain'] .celestial::after { right: 12%; top: 8%; }
  .stage[data-season='snow'] .celestial::after { right: 16%; top: 8%; }
  .stage[data-season='blossom'] .celestial::after { left: 10%; top: 14%; }
  .stage[data-season='meadow'] .celestial::after { right: 14%; top: 10%; }
  .scenery { display: flex; align-items: flex-end; }
  .scenery svg { width: 100%; height: 120px; }
  .scenery svg.scenery-top { align-self: flex-start; height: 150px; }
  .stage[data-season='blossom'] .scenery { align-items: flex-start; }

  .particles i { position: absolute; top: -60px; display: block; animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; opacity: 0; }
  .particles[data-kind='leaf'] i { animation-name: fall-spin; }
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
    100% { transform: translate3d(var(--drift), 480px, 0) rotate(300deg); opacity: 0; }
  }

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
  }
</style>
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <div>
        <h1>MASSETS · Showroom</h1>
        <p>Every variant of the <strong>seasons</strong> pack, rendered from the real palette source. Use it to design a new pack: check the contrast audit before shipping, and watch the living background react to the environment tokens.</p>
      </div>
      <div class="regen">npm run showroom</div>
    </header>

    <div class="strip">
        ${strip}
    </div>

    <nav class="tabs" role="tablist">
        ${tabs}
    </nav>

    ${panels}

    <p class="footnote">
      Generated from <code>packs/seasons/palettes.ts</code>, <code>packs/seasons/seasons.ts</code> and <code>core/tokens.ts</code> by <code>tools/showroom.ts</code> — never edit <code>showroom/index.html</code> by hand, it is overwritten.
      The background here is a CSS approximation of <code>WeatherOverlay.tsx</code>: right for colour and feel, not a pixel match for the RN Animated original.
      Typefaces load from Google Fonts; offline, the page falls back to system faces and the metrics shift slightly.
    </p>
  </div>

<script>
  (function () {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
    function select(name) {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.tab === name)); });
      panels.forEach(function (p) { p.hidden = p.dataset.panel !== name; });
      try { localStorage.setItem('masset-showroom-variant', name); } catch (e) {}
      if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { select(t.dataset.tab); }); });
    var stored = null;
    try { stored = localStorage.getItem('masset-showroom-variant'); } catch (e) {}
    var initial = location.hash.slice(1) || stored || ${JSON.stringify(defaultSeason)};
    if (!tabs.some(function (t) { return t.dataset.tab === initial; })) initial = ${JSON.stringify(SEASONS[0])};
    select(initial);
  })();
</script>
</body>
</html>
`;
}

function glassDrops(colors: ThemeColors): string {
  const rand = mulberry32(99);
  void colors;
  return Array.from({ length: 14 }, () => {
    const size = 4 + rand() * 6;
    return `<b style="left:${(rand() * 92 + 3).toFixed(1)}%;top:${(rand() * 70 + 4).toFixed(1)}%;width:${size.toFixed(
      1
    )}px;height:${(size * 1.25).toFixed(1)}px;animation-delay:-${(rand() * 9).toFixed(1)}s"></b>`;
  }).join('');
}

const out = join(__dirname, '..', '..', 'showroom', 'index.html');
writeFileSync(out, build(), 'utf8');
// eslint-disable-next-line no-console
console.log(`showroom → ${out}`);
console.log(`  ${SEASONS.length} variants · ${THEME_COLOR_KEYS.length} tokens · ${CHECKS.length} contrast checks each`);
