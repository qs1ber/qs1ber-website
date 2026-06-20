const YT_RE =
  /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i;

export function getYoutubeId(url) {
  if (!url) return null;
  const m = String(url).match(YT_RE);
  return m?.[1] ?? null;
}

export function isYoutubeUrl(url) {
  return Boolean(getYoutubeId(url));
}

const DRIVE_RE = /drive\.google\.com\/file\/d\/([^/?#]+)/i;

export function getGoogleDriveId(url) {
  if (!url) return null;
  const m = String(url).match(DRIVE_RE);
  return m?.[1] ?? null;
}

export function googleDrivePreviewUrl(id) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function isGoogleDriveUrl(url) {
  return Boolean(getGoogleDriveId(url));
}

export function youtubeEmbedUrl(id, params = {}) {
  const q = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    controls: "0",
    iv_load_policy: "3",
    playsinline: "1",
    disablekb: "1",
    fs: "0",
    ...params,
  });
  return `https://www.youtube.com/embed/${id}?${q}`;
}

let ytApiReady;

/** Load YouTube IFrame API once — used for chromeless embeds. */
export function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiReady) return ytApiReady;

  ytApiReady = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });

  return ytApiReady;
}

export function youtubeThumbUrl(id, size = "hq") {
  const base = `https://img.youtube.com/vi/${id}`;
  switch (size) {
    case "max":
      return `${base}/maxresdefault.jpg`;
    case "sd":
      return `${base}/sddefault.jpg`;
    case "mq":
      return `${base}/mqdefault.jpg`;
    default:
      return `${base}/hqdefault.jpg`;
  }
}

/** Full-size stage poster — maxres with sd fallback when maxres missing. */
export function youtubePosterUrls(id, override = "") {
  const base = `https://img.youtube.com/vi/${id}`;
  const lowRes = /\/(hq|mq|sd)default\.jpg/i.test(override);
  const src = override && !lowRes ? override : `${base}/maxresdefault.jpg`;
  return { src, fallback: `${base}/sddefault.jpg` };
}
