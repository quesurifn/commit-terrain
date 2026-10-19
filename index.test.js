import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terrain, ridges, toSvg, atlasToSvg, transpose, fetchContributions } from './index.js';

const hill = Array.from({ length: 20 }, (_, r) => Array.from({ length: 7 }, (_, c) => Math.max(0, 10 - Math.hypot(r - 10, (c - 3) * 2))));

test('a hill produces one path per level, in order', () => {
  const t = terrain(hill, { width: 400, height: 800, resolution: 40, levels: 5 });
  assert.equal(t.paths.length, 5);
  assert.ok(t.paths.every((d) => d.startsWith('M')));
  assert.ok(t.paths[0].length >= t.paths[4].length, 'the lowest ring is the widest');
});

test('flat ground has no contours', () => {
  assert.deepEqual(terrain([[0, 0], [0, 0]]).paths, []);
});

test('rejects an empty grid', () => {
  assert.throws(() => terrain([]), TypeError);
});

test('scale can be linear or a function', () => {
  const a = terrain(hill, { resolution: 30, scale: 'linear' }).paths;
  const b = terrain(hill, { resolution: 30, scale: (x) => x }).paths;
  assert.deepEqual(a, b);
});

test('toSvg wraps paths in a standalone svg', () => {
  const svg = toSvg({ width: 10, height: 20, paths: ['M0 0L1 1Z'] }, { background: '#fff' });
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 10 20">/);
  assert.match(svg, /<path d="M0 0L1 1Z"\/>/);
  assert.match(svg, /fill="#fff"/);
});

test('transpose swaps rows and columns, padding short rows', () => {
  assert.deepEqual(transpose([[1, 2, 3], [4]]), [[1, 4], [2, 0], [3, 0]]);
});

test('fetchContributions shapes the calendar and needs a token', async () => {
  await assert.rejects(fetchContributions('x', { token: '' }), /token/);
  const fake = async () => ({ ok: true, json: async () => ({ data: { user: { contributionsCollection: { contributionCalendar: {
    totalContributions: 3, weeks: [{ contributionDays: [{ date: '2025-10-19', contributionCount: 1 }, { date: '2025-10-20', contributionCount: 2 }] }],
  } } } } }) });
  assert.deepEqual(await fetchContributions('x', { token: 't', fetch: fake }), { total: 3, start: '2025-10-19', weeks: [[1, 2]] });
});

test('ridges: one smooth line per column, peaks rise above the baseline', () => {
  const r = ridges([[0, 5], [10, 0], [0, 5]], { scale: 'linear' });
  assert.equal(r.lines.length, 2);
  assert.match(r.lines[0].d, /^M60\.0 110\.0 C/);
  assert.ok(r.lines[0].d.includes(' 18.0'), 'the peak reaches top - amplitude');
  assert.ok(r.lines[0].area.endsWith('Z'));
  assert.equal(r.x(2), 1020);
});

test('atlas: water below sea level, a coastline, land above', () => {
  const t = terrain(hill, { width: 400, height: 800, resolution: 40, levels: 10 });
  const svg = atlasToSvg(t, { seaLevel: 0.3 });
  assert.equal((svg.match(/<path /g) ?? []).length, 10);
  assert.match(svg, /<rect width="100%" height="100%" fill="#1F2918"\/>/, 'the deepest water fills the ground');
  assert.equal((svg.match(/stroke-width="1.8"/g) ?? []).length, 1, 'exactly one coastline');
});
