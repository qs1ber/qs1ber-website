/** Section scroll — quick start, soft landing (no Flow plateaus) */
export function scrollEase(t) {
  t = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - t, 3);
}

/** Flow-style easing: slow start → snap → long settle (ref: AE Flow curve) */
export function flowEase(t) {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.12) return t * t * 4.2;
  if (t < 0.38) {
    const u = (t - 0.12) / 0.26;
    return 0.06 + u * u * u * 0.78;
  }
  const u = (t - 0.38) / 0.62;
  return 0.84 + (1 - Math.pow(1 - u, 4)) * 0.16;
}

/** Smooth deceleration — default for most motion */
export function smoothEase(t) {
  t = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - t, 4);
}

/** GSAP Elastic.easeOut — mood spin on chrismckenzie.com */
export function elasticEaseOut(t, period = 0.3) {
  if (t === 0 || t === 1) return t;
  const s = period / 4;
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (Math.PI * 2) / period) + 1;
}

/** Sharp whip spin — ~90% rotation in first half, quick soft land. */
export function cartoonSpinEase(t) {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.5) {
    const u = t / 0.5;
    return Math.pow(u, 0.28) * 0.93;
  }
  const u = (t - 0.5) / 0.5;
  return 0.93 + (1 - Math.pow(1 - u, 4)) * 0.07;
}

/** Fast corner snap with punch. */
export function cartoonSnapEase(t) {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.72) {
    const u = t / 0.72;
    return Math.pow(u, 0.42) * 0.96;
  }
  const u = (t - 0.72) / 0.28;
  return 0.96 + (1 - Math.pow(1 - u, 3)) * 0.04;
}

/** Fast snap + overshoot; last ~25% settles smoothly (not stone-dead). */
export function snapBounce(t) {
  t = Math.max(0, Math.min(1, t));
  const attackEnd = 0.72;
  const s = 2.85;
  if (t <= attackEnd) {
    const u = Math.pow(t / attackEnd, 0.48);
    const back = 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
    return back * (0.9 + u * 0.16);
  }
  const u = (t - attackEnd) / (1 - attackEnd);
  const peak = 1.06;
  return peak + (1 - peak) * smoothEase(u);
}

/** @deprecated alias — use snapBounce */
export function softBounce(t) {
  return snapBounce(t);
}

/** @deprecated use softBounce or smoothEase */
export function bounceOut(t) {
  return softBounce(t);
}

export function elasticOut(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
