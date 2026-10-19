export interface TerrainOptions {
  /** Output width in SVG units. Default 1600. */
  width?: number;
  /** Output height in SVG units. Default 4800. */
  height?: number;
  /** Sample columns across the width; rows follow from the aspect ratio. Default 96. */
  resolution?: number;
  /** Number of contour lines between zero and the peak. Default 22. */
  levels?: number;
  /** How raw values map to height. Default 'log' (log1p), so busy stretches read as ridges. */
  scale?: 'log' | 'linear' | ((value: number) => number);
  /** Kernel radius in grid cells, [rows, columns]. Default [2, 1]. */
  radius?: [number, number];
  /** Kernel spread, [rows, columns]; larger is softer. Default [1.6, 0.9]. */
  spread?: [number, number];
  /** Decimal places in path coordinates. Default 0. */
  precision?: number;
}

export interface Terrain {
  width: number;
  height: number;
  /** One SVG path `d` per contour level, lowest first. */
  paths: string[];
}

export interface SvgOptions {
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  /** Fill behind the lines. Omitted by default (transparent). */
  background?: string;
}

export interface Contributions {
  total: number;
  /** ISO date of the first day in the calendar. */
  start: string;
  /** Weeks, oldest first; each week is up to 7 daily counts, Sunday first. */
  weeks: number[][];
}

export interface RidgeOptions {
  /** Default 1040. */
  width?: number;
  /** Vertical distance between ridges. Default 30. */
  gap?: number;
  /** Height of the tallest peak. Default 92. */
  amplitude?: number;
  /** Baseline of the first ridge. Default 110. */
  top?: number;
  left?: number;
  right?: number;
  /** How far each ridge's area extends below its baseline. Default 40. */
  depth?: number;
  scale?: 'log' | 'linear' | ((value: number) => number);
  /** Default 1. */
  precision?: number;
}

export interface Ridges {
  width: number;
  height: number;
  /** x position of row i, for axis marks. */
  x: (row: number) => number;
  /** One ridge per column; draw `area` filled with your background under `d`, back to front. */
  lines: { index: number; y: number; d: string; area: string }[];
}

export function ridges(grid: number[][], options?: RidgeOptions): Ridges;
export function terrain(grid: number[][], options?: TerrainOptions): Terrain;
export function ridgesToSvg(ridges: Ridges, options?: { stroke?: string; strokeWidth?: number; background?: string }): string;
export function atlasToSvg(terrain: Terrain, options?: { seaLevel?: number; water?: string[]; land?: string[]; coast?: string; stroke?: string }): string;
export function toSvg(terrain: Terrain, options?: SvgOptions): string;
export function transpose(grid: number[][]): number[][];
export function fetchContributions(login: string, options?: { token?: string; fetch?: typeof fetch }): Promise<Contributions>;
