// Setting(T) = 1 + A0 / ln(T). A dial, not a theory.

export const DEFAULT_A0 = 314;
export const X_MIN = 2;
export const X_MAX = 1e12;
export const X_TICKS = [Math.log10(2), 1, 3, 6, 9, 12];
export const Y_TICKS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

export function setting(t, a0 = DEFAULT_A0) {
  const T = Number(t);
  const A = Number(a0);
  if (!Number.isFinite(T) || T <= 0) return null;
  const lnT = Math.log(T);
  if (lnT === 0) return null;
  return 1 + A / lnT;
}

export function sampleCurve(a0 = DEFAULT_A0, count = 140) {
  const points = [];
  const lo = Math.log10(X_MIN);
  const hi = Math.log10(X_MAX);
  for (let i = 0; i <= count; i++) {
    const x = lo + ((hi - lo) * i) / count;
    const y = setting(10 ** x, a0);
    if (y !== null && Number.isFinite(y)) points.push({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
  }
  return points;
}

export function formatT(t) {
  if (t >= 1e12) return '1T';
  if (t >= 1e9) return `${Math.round(t / 1e9)}B`;
  if (t >= 1e6) return `${Math.round(t / 1e6)}M`;
  if (t >= 1e3) return `${Math.round(t / 1e3)}k`;
  return String(Math.round(t * 100) / 100);
}

export function formatSetting(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'undefined';
  return String(Math.round(value * 1000) / 1000);
}

export const SAMPLE_TS = [2, 10, 100, 1000, 1000000, 1000000000000];