/** Estimate the drop / peak moment from a SoundCloud waveform PNG */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("waveform load failed"));
    img.src = url;
  });
}

function smooth(samples, radius) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(samples.length - 1, i + radius); j++) {
      sum += samples[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

function sampleWaveform(img) {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const samples = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    let peak = 0;
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3] / 255;
      peak = Math.max(peak, Math.max(r, g, b) * a);
    }
    samples[x] = peak / 255;
  }
  return samples;
}

/**
 * @param {string} waveformUrl SoundCloud waveform PNG
 * @param {number} durationMs track length in ms
 * @returns {Promise<number>} seek position in ms
 */
export async function findDropFromWaveform(waveformUrl, durationMs) {
  if (!waveformUrl || !durationMs) return 0;

  try {
    const img = await loadImage(waveformUrl);
    const raw = sampleWaveform(img);
    const env = smooth(raw, 6);
    const width = env.length;

    const intro = Math.floor(width * 0.12);
    const outro = Math.floor(width * 0.88);

    let bestIdx = intro;
    let bestScore = -Infinity;

    for (let i = intro; i < outro; i++) {
      const energy = env[i];
      const prev = env[Math.max(intro, i - 10)];
      const rise = energy - prev;
      const score = energy * 0.55 + Math.max(0, rise) * 0.45;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const leadMs = 600;
    const dropMs = (bestIdx / width) * durationMs;
    return Math.max(0, Math.min(durationMs - 500, dropMs - leadMs));
  } catch {
    return Math.floor(durationMs * 0.35);
  }
}
