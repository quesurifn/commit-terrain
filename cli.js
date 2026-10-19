#!/usr/bin/env node
// npx github:quesurifn/commit-terrain <github-login> [--across | --ridges | --atlas] > terrain.svg
// Needs GITHUB_TOKEN (any token: the contribution calendar is public).
import { terrain, ridges, toSvg, ridgesToSvg, atlasToSvg, transpose, fetchContributions } from './index.js';

const args = process.argv.slice(2);
const login = args.find((a) => !a.startsWith('--'));
if (!login) {
  console.error('usage: commit-terrain <github-login> [--across | --ridges | --atlas]   (set GITHUB_TOKEN)');
  process.exit(1);
}
const across = args.includes('--across');
const asRidges = args.includes('--ridges');
const asAtlas = args.includes('--atlas');
const { weeks, total } = await fetchContributions(login);
if (asAtlas) {
  const t = terrain(transpose(weeks), { width: 1600, height: 400, resolution: 160, radius: [1, 2], spread: [0.9, 1.6], levels: 18 });
  process.stdout.write(atlasToSvg(t) + '\n');
  console.error(`commit-terrain: ${login}, ${total} contributions, an atlas of ${t.paths.length} levels`);
  process.exit(0);
}
const t = asRidges ? null : across
  ? terrain(transpose(weeks), { width: 1600, height: 400, resolution: 160, radius: [1, 2], spread: [0.9, 1.6] })
  : terrain(weeks);
if (asRidges) {
  process.stdout.write(ridgesToSvg(ridges(weeks), { stroke: '#1E1A12', background: '#EFE8D6' }) + '\n');
  console.error(`commit-terrain: ${login}, ${total} contributions, 7 ridges`);
  process.exit(0);
}
process.stdout.write(toSvg(t, { stroke: '#1E1A12', background: '#EFE8D6' }) + '\n');
console.error(`commit-terrain: ${login}, ${total} contributions, ${t.paths.length} contour levels`);
