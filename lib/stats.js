/**
 * 统计工具库：均值、方差、Pearson 相关、Cronbach's α、显著性 p 值
 * 仅依赖 Node 标准能力，无第三方依赖。
 */

function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** 总体方差（α 公式中分子分母同为方差，n 与 n-1 的差异相互抵消） */
function variance(arr) {
  if (arr.length < 2) return NaN;
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length;
}

function pearson(x, y) {
  const n = x.length;
  if (n !== y.length || n < 2) return NaN;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return NaN;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Cronbach's α
 * @param {number[][]} rows 每行为一名被试在 k 道题上的作答
 */
function cronbachAlpha(rows) {
  const n = rows.length;
  if (n < 2) return NaN;
  const k = rows[0].length;
  if (k < 2) return NaN;

  const itemVars = [];
  for (let j = 0; j < k; j++) itemVars.push(variance(rows.map((r) => r[j])));
  if (itemVars.some((v) => !isFinite(v))) return NaN;

  const totals = rows.map((r) => r.reduce((s, v) => s + v, 0));
  const totalVar = variance(totals);
  if (!isFinite(totalVar) || totalVar === 0) return NaN;

  const sumItemVars = itemVars.reduce((s, v) => s + v, 0);
  return (k / (k - 1)) * (1 - sumItemVars / totalVar);
}

/* ---------- t 分布两尾 p 值（借助正则化不完全 Beta 函数） ---------- */

function lnGamma(x) {
  const g = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += g[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** 连分式逼近（Numerical Recipes betacf） */
function betacf(a, b, x) {
  const MAXIT = 300;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** 正则化不完全 Beta 函数 I_x(a, b) */
function incompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** t 分布双尾 p 值 */
function twoTailedPFromT(t, df) {
  if (!isFinite(t) || df <= 0) return NaN;
  return incompleteBeta(df / 2, 0.5, df / (df + t * t));
}

/** 相关系数 r 的双尾 p 值（t 近似） */
function pValueFromR(r, n) {
  if (!isFinite(r) || !isFinite(n) || n < 3) return NaN;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  return twoTailedPFromT(Math.abs(t), n - 2);
}

module.exports = { mean, variance, pearson, cronbachAlpha, pValueFromR, twoTailedPFromT };
