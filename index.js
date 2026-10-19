// commit-terrain: turn a grid of numbers (a GitHub contribution calendar, by default) into topographic contour lines.
// A thin, opinionated layer over d3-contour: soft Gaussian sampling so single cells blend into ground,
// log scaling so busy stretches read as ridges, and evenly spaced levels between zero and the peak.
import { contours } from 'd3-contour';

/**
 * Contour a grid into SVG path data.
 * @param {number[][]} grid rows of values; rows run down (y), columns across (x). A GitHub calendar is weeks × 7 days.
 * @param {import('./index.js').TerrainOptions} [options]
 */
export function terrain(grid, options = {}) {
  const {
    width = 1600,
    height = 4800,
    resolution = 96,
    levels = 22,
    scale = 'log',
    radius = [2, 1],
    spread = [1.6, 0.9],
    precision = 0,
  } = options;
  if (!Array.isArray(grid) || grid.length === 0) throw new TypeError('terrain: grid must be a non-empty array of rows');
  const rows = grid.length, cols = Math.max(...grid.map((r) => r.length));
  if (cols === 0) throw new TypeError('terrain: grid rows are empty');
  const f = scale === 'log' ? Math.log1p : scale === 'linear' ? (x) => x : scale;
  const at = (r, c) => f(grid[Math.max(0, Math.min(rows - 1, r))]?.[Math.max(0, Math.min(cols - 1, c))] ?? 0);

  const n = resolution, m = Math.round((n * height) / width);
  const v = new Float64Array(n * m);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    // Sample with a soft kernel, so one busy day becomes a hill instead of a spike.
    const rf = (j / m) * rows, cf = (i / n) * cols;
    let z = 0, wsum = 0;
    for (let dr = -radius[0]; dr <= radius[0]; dr++) for (let dc = -radius[1]; dc <= radius[1]; dc++) {
      const r = Math.floor(rf) + dr, c = Math.floor(cf) + dc;
      const k = Math.exp(-((r + 0.5 - rf) ** 2 / spread[0] + (c + 0.5 - cf) ** 2 / spread[1]));
      z += k * at(r, c); wsum += k;
    }
    v[j * n + i] = z / wsum;
  }

  const s = width / n;
  const xy = ([x, y]) => `${(x * s).toFixed(precision)} ${(y * s).toFixed(precision)}`;
  const toPath = (polys) => polys.map((poly) => poly.map((ring) => 'M' + ring.map(xy).join('L') + 'Z').join('')).join('');
  let zmax = 0;
  for (const z of v) if (z > zmax) zmax = z;
  const thresholds = Array.from({ length: levels }, (_, k) => (k + 1) * (zmax / (levels + 1)));
  const paths = zmax === 0 ? [] : contours().size([n, m]).thresholds(thresholds)(v).map((c) => toPath(c.coordinates));
  return { width, height, paths };
}

/**
 * Ridge lines, like an EKG of your year: one smooth line per column (weekday), rising with each row's (week's) value.
 * @param {number[][]} grid rows of values; a GitHub calendar is weeks × 7 days, giving seven ridges
 * @param {import('./index.js').RidgeOptions} [options]
 */
export function ridges(grid, options = {}) {
  const { width = 1040, gap = 30, amplitude = 92, top = 110, left = 60, right = 20, depth = 40, scale = 'log', precision = 1 } = options;
  if (!Array.isArray(grid) || grid.length < 2) throw new TypeError('ridges: grid needs at least two rows');
  const f = scale === 'log' ? Math.log1p : scale === 'linear' ? (x) => x : scale;
  const cols = Math.max(...grid.map((r) => r.length));
  const max = f(Math.max(...grid.flat())) || 1;
  const n = (v) => v.toFixed(precision);
  const x = (i) => left + (i * (width - left - right)) / (grid.length - 1);
  // Catmull-Rom through the points, so each line reads as a smooth ridge, not a chart.
  const smooth = (pts) => pts.reduce((d, p, i, a) => {
    if (!i) return `M${n(p[0])} ${n(p[1])}`;
    const p0 = a[i - 2] ?? a[i - 1], p1 = a[i - 1], p2 = p, p3 = a[i + 1] ?? p;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return `${d} C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }, '');
  const lines = Array.from({ length: cols }, (_, c) => {
    const y = top + c * gap;
    const d = smooth(grid.map((row, i) => [x(i), y - (f(row[c] ?? 0) / max) * amplitude]));
    // area closes the ridge down to a floor, so filling it with the background hides the ridges behind
    return { index: c, y, d, area: `${d} L${width - right} ${y + depth} L${left} ${y + depth} Z` };
  });
  return { width, height: top + cols * gap + 44, x, lines };
}

/** Serialize a terrain to a standalone SVG string. */
export function toSvg({ width, height, paths }, { stroke = 'currentColor', strokeWidth = 1, strokeOpacity = 0.4, background } = {}) {
  const bg = background ? `<rect width="100%" height="100%" fill="${background}"/>` : '';
  const lines = paths.map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${bg}<g fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}" vector-effect="non-scaling-stroke">${lines}</g></svg>`;
}

/** Serialize ridges to a standalone SVG string, drawn back to front so nearer ridges hide farther ones. */
export function ridgesToSvg({ width, height, lines }, { stroke = 'currentColor', strokeWidth = 1.4, background = '#fff' } = {}) {
  const body = lines.map((l) => `<path d="${l.area}" fill="${background}"/><path d="${l.d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${background}"/>${body}</svg>`;
}

// Abstract ramps in earth tones, not a literal map: deep moss for water (deepest first),
// then bone rising through sand and ochre to ink at the peaks.
const WATER = ['#1F2918', '#2F3A24', '#46553A'];
const LAND = ['#EFE8D6', '#E2D3AE', '#D2B377', '#B88A3E', '#7A5214', '#1E1A12'];
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rampAt = (stops, t) => {
  if (stops.length === 1) return stops[0];
  const p = Math.min(1, Math.max(0, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(p)), f = p - i;
  const a = hexRgb(stops[i]), b = hexRgb(stops[i + 1]);
  return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * f)).join(' ')})`;
};

/**
 * The geography of your commits, abstract: the same contours filled like a relief map. The lowest `seaLevel` of the
 * levels is water, shaded deeper the lower it goes; above the coastline, land rises from green to snow.
 */
export function atlasToSvg({ width, height, paths }, { seaLevel = 0.3, water = WATER, land = LAND, coast = '#1E1A12', stroke = 'rgb(30 26 18 / 0.18)' } = {}) {
  const sea = Math.round(paths.length * seaLevel);
  const fill = (i) => (i < sea ? rampAt(water, (i + 1) / Math.max(1, sea)) : rampAt(land, paths.length - sea > 1 ? (i - sea) / (paths.length - sea - 1) : 0));
  const bands = paths.map((d, i) => `<path d="${d}" fill="${fill(i)}" stroke="${i === sea ? coast : stroke}" stroke-width="${i === sea ? 1.8 : 0.8}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${water[0]}"/><g stroke-linejoin="round">${bands}</g></svg>`;
}

/** Swap rows and columns: a weeks × days calendar becomes days × weeks, so weeks run across like on GitHub. */
export const transpose = (grid) => Array.from({ length: Math.max(...grid.map((r) => r.length)) }, (_, c) => grid.map((r) => r[c] ?? 0));

/**
 * Fetch a user's last year of contributions from GitHub's GraphQL API. Needs a token; any token works,
 * because the calendar is public (private contributions appear as counts if the user has turned that on).
 */
export async function fetchContributions(login, { token = globalThis.process?.env?.GITHUB_TOKEN, fetch: f = globalThis.fetch } = {}) {
  if (!token) throw new Error('fetchContributions: pass { token } or set GITHUB_TOKEN');
  const query = 'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';
  const res = await f('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { login } }),
  });
  const body = await res.json();
  const cal = body?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!res.ok || !cal) throw new Error(`fetchContributions: ${body?.errors?.[0]?.message ?? res.status}`);
  return {
    total: cal.totalContributions,
    start: cal.weeks[0]?.contributionDays[0]?.date,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => d.contributionCount)),
  };
}
