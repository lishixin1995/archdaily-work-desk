import { atNoon, DAY_MS } from './dates.js';

// Mean synodic month and a known new moon (2000-01-06 18:14 UTC).
const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
const HALF_DAY = 0.5 / SYNODIC;

// 0 = new moon, 0.5 = full moon, measured at local noon of the given day.
export function moonPhase(date) {
  const phase = (((atNoon(date).getTime() - NEW_MOON_REF) / DAY_MS) % SYNODIC) / SYNODIC;
  return phase < 0 ? phase + 1 : phase;
}

export function moonLit(phase) {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

// Named quarter phases only land on the one day closest to the exact moment.
export function moonName(phase) {
  if (phase < HALF_DAY || phase > 1 - HALF_DAY) return 'New moon';
  if (phase < 0.25 - HALF_DAY) return 'Waxing crescent';
  if (phase < 0.25 + HALF_DAY) return 'First quarter';
  if (phase < 0.5 - HALF_DAY) return 'Waxing gibbous';
  if (phase < 0.5 + HALF_DAY) return 'Full moon';
  if (phase < 0.75 - HALF_DAY) return 'Waning gibbous';
  if (phase < 0.75 + HALF_DAY) return 'Last quarter';
  return 'Waning crescent';
}

// SVG path for the lit part of a moon of radius r centred at (c, c), or null
// when the moon is new. Returns { full: true } near full moon.
export function moonShape(phase, size) {
  const c = size / 2;
  const r = c - 0.75;
  const lit = moonLit(phase);
  if (lit > 0.985) return { c, r, full: true };
  if (lit <= 0.015) return { c, r, path: null };
  const rx = (r * Math.abs(Math.cos(2 * Math.PI * phase))).toFixed(2);
  const waxing = phase < 0.5;
  const outer = waxing ? 1 : 0;
  const terminator = waxing ? (phase < 0.25 ? 0 : 1) : (phase < 0.75 ? 0 : 1);
  return {
    c,
    r,
    path: `M${c} ${c - r} A${r} ${r} 0 0 ${outer} ${c} ${c + r} A${rx} ${r} 0 0 ${terminator} ${c} ${c - r}Z`
  };
}
