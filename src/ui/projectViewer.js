/** Shotdeck-style fullscreen viewer + media strip per project */

import { getProjects } from "../../data/projectsStore.js?b=20260621f";
import { getYoutubeId, getGoogleDriveId, googleDrivePreviewUrl, loadYoutubeApi, youtubePosterUrls, youtubeThumbUrl } from "../utils/youtube.js?b=20260621z";

const projects = getProjects();

const ytPlayers = new Map();
let ytMountId = 0;

const panelBooters = new Map();
const panelViewers = new Map();

function bindProjectViewerUi() {
  const root = document.getElementById("scrollRoot");
  if (!root || root.dataset.viewerUiBound === "1") return;
  root.dataset.viewerUiBound = "1";

  root.addEventListener(
    "pointerdown",
    (e) => {
      // Only shield strip/nav from 3D body listeners — not the YouTube stage UI.
      if (e.target.closest(".project-strip__item, .project-viewer__nav")) {
        e.stopPropagation();
      }
    },
    true
  );

  root.addEventListener(
    "click",
    (e) => {
      const thumb = e.target.closest(".project-strip__item");
      if (thumb) {
        const panel = thumb.closest(".project-panel");
        const viewer = panel ? panelViewers.get(Number(panel.dataset.chapter) - 1) : null;
        if (!viewer) return;
        const strip = panel.querySelector(".project-strip");
        const thumbs = Array.from(strip?.querySelectorAll(".project-strip__item") ?? []);
        const index = thumbs.indexOf(thumb);
        if (index >= 0) {
          e.preventDefault();
          e.stopPropagation();
          viewer.render(index);
        }
        return;
      }

      const nav = e.target.closest(".project-viewer__prev, .project-viewer__next");
      if (!nav) return;
      const panel = nav.closest(".project-panel");
      const viewer = panel ? panelViewers.get(Number(panel.dataset.chapter) - 1) : null;
      if (!viewer || viewer.getMediaCount() <= 1) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = nav.classList.contains("project-viewer__prev") ? -1 : 1;
      viewer.render(viewer.getActive() + delta);
    },
    true
  );
}

const UI_IDLE_MS = 900;
const PROGRESS_TICK_MS = 200;

function formatTime(secs) {
  const total = Math.max(0, Math.floor(secs || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function bumpMountGen(stage) {
  const gen = Number(stage.dataset.ytMountGen || 0) + 1;
  stage.dataset.ytMountGen = String(gen);
  return gen;
}

function isMountCurrent(stage, gen) {
  return Number(stage.dataset.ytMountGen || 0) === gen;
}

export function pauseAllProjectMedia() {
  document.querySelectorAll(".project-viewer__media").forEach((el) => {
    if (el.tagName === "VIDEO") el.pause();
  });

  ytPlayers.forEach(({ player }) => {
    try {
      player.pauseVideo?.();
    } catch {
      /* player may be torn down */
    }
  });
}

function destroyYoutubeStage(stage) {
  const entry = ytPlayers.get(stage);
  if (entry) {
    entry.cleanup?.();
    try {
      entry.player?.destroy?.();
    } catch {
      /* ignore */
    }
    ytPlayers.delete(stage);
  }
  bumpMountGen(stage);
  stage.innerHTML = "";
}

function bindYoutubeUi(stage, getPlayer, label, gen) {
  const ui = stage.querySelector(".project-viewer__yt-ui");
  const hitBtn = stage.querySelector(".project-viewer__yt-hit");
  const pauseBtn = stage.querySelector(".project-viewer__yt-pause");
  const seek = stage.querySelector(".project-viewer__yt-seek");
  const fill = stage.querySelector(".project-viewer__yt-fill");
  const timeEl = stage.querySelector(".project-viewer__yt-time");
  if (!ui || !hitBtn || !pauseBtn || !seek || !fill || !timeEl) return null;

  let hideTimer = null;
  let tickTimer = null;
  let seeking = false;
  let pendingPlay = false;

  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const player = () => getPlayer();

  const isPlaying = () => {
    const p = player();
    if (!p?.getPlayerState || !window.YT) return false;
    return p.getPlayerState() === window.YT.PlayerState.PLAYING;
  };

  const scheduleHide = () => {
    clearHideTimer();
    if (!isPlaying()) {
      ui.classList.remove("is-idle");
      return;
    }
    hideTimer = setTimeout(() => {
      if (isMountCurrent(stage, gen)) ui.classList.add("is-idle");
    }, UI_IDLE_MS);
  };

  const showUi = () => {
    ui.classList.remove("is-idle");
    scheduleHide();
  };

  const updateProgress = () => {
    const p = player();
    if (!isMountCurrent(stage, gen) || !p?.getDuration || seeking) return;
    const dur = p.getDuration();
    const cur = p.getCurrentTime();
    if (!dur || !Number.isFinite(dur)) return;
    const ratio = cur / dur;
    seek.value = String(Math.round(ratio * 1000));
    fill.style.width = `${ratio * 100}%`;
    timeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
  };

  const setPlayingUi = (playing) => {
    if (!isMountCurrent(stage, gen)) return;
    ui.classList.toggle("is-playing", playing);
    stage.querySelector(".project-viewer__yt")?.classList.toggle("is-playing", playing);
    const poster = stage.querySelector(".project-viewer__yt-poster");
    if (poster) poster.hidden = playing;
    hitBtn.setAttribute("aria-label", playing ? "Pause" : `Play ${label}`);
    pauseBtn.textContent = playing ? "❚❚" : "▶";
    pauseBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    if (playing) {
      pendingPlay = false;
      scheduleHide();
    } else {
      clearHideTimer();
      ui.classList.remove("is-idle");
    }
  };

  const togglePlay = () => {
    const p = player();
    if (!p?.getPlayerState || !window.YT) {
      pendingPlay = true;
      return;
    }
    pendingPlay = false;
    const { PlayerState } = window.YT;
    const state = p.getPlayerState();
    if (state === PlayerState.PLAYING) p.pauseVideo();
    else p.playVideo();
  };

  const onPlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePlay();
    showUi();
  };

  const onPointerMove = () => showUi();
  const onPointerLeave = () => {
    if (isPlaying()) ui.classList.add("is-idle");
  };

  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerleave", onPointerLeave);

  hitBtn.addEventListener("pointerdown", onPlayClick);
  pauseBtn.addEventListener("pointerdown", onPlayClick);

  seek.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    seeking = true;
    clearHideTimer();
    ui.classList.remove("is-idle");
  });

  seek.addEventListener("input", () => {
    const dur = player()?.getDuration?.() || 0;
    const ratio = Number(seek.value) / 1000;
    fill.style.width = `${ratio * 100}%`;
    timeEl.textContent = `${formatTime(dur * ratio)} / ${formatTime(dur)}`;
  });

  seek.addEventListener("change", () => {
    seeking = false;
    const p = player();
    const dur = p?.getDuration?.() || 0;
    if (dur) p.seekTo(dur * (Number(seek.value) / 1000), true);
    showUi();
  });

  tickTimer = setInterval(updateProgress, PROGRESS_TICK_MS);
  updateProgress();

  return {
    onReady: () => {
      if (pendingPlay) {
        pendingPlay = false;
        player()?.playVideo?.();
      }
      updateProgress();
    },
    onStateChange: (state) => {
      if (!isMountCurrent(stage, gen)) return;
      const playing = state === window.YT.PlayerState.PLAYING;
      setPlayingUi(playing);
      updateProgress();
    },
    cleanup: () => {
      clearHideTimer();
      if (tickTimer) clearInterval(tickTimer);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}

async function mountYoutube(stage, ytId, label, poster = "") {
  destroyYoutubeStage(stage);
  const gen = Number(stage.dataset.ytMountGen);

  await loadYoutubeApi();
  if (!isMountCurrent(stage, gen)) return;

  const mountId = `yt-player-${++ytMountId}`;
  const { src: posterSrc, fallback: posterFallback } = youtubePosterUrls(ytId, poster);
  const posterHtml = `<img class="project-viewer__yt-poster" src="${posterSrc}" data-fallback="${posterFallback}" alt="" draggable="false" decoding="async" />`;

  stage.innerHTML = `
    <div class="project-viewer__yt">
      <div class="project-viewer__yt-mount" id="${mountId}"></div>
      ${posterHtml}
      <div class="project-viewer__yt-ui">
        <button type="button" class="project-viewer__yt-hit" aria-label="Play ${label}">
          <span class="project-viewer__yt-hit-icon" aria-hidden="true">▶</span>
        </button>
        <div class="project-viewer__yt-controls">
          <button type="button" class="project-viewer__yt-pause" aria-label="Pause">❚❚</button>
          <div class="project-viewer__yt-track">
            <div class="project-viewer__yt-fill"></div>
            <input type="range" class="project-viewer__yt-seek" min="0" max="1000" value="0" step="1" aria-label="Seek" />
          </div>
          <span class="project-viewer__yt-time">0:00 / 0:00</span>
        </div>
      </div>
    </div>`;

  if (!isMountCurrent(stage, gen)) return;

  stage.querySelector(".project-viewer__yt-poster")?.addEventListener("error", function () {
    const next = this.dataset.fallback;
    if (next && this.src !== next) this.src = next;
  });

  const { w, h } = stageSize(stage);
  let ytPlayer = null;
  let uiBinding = bindYoutubeUi(stage, () => ytPlayer, label, gen);

  const player = new YT.Player(mountId, {
    width: w,
    height: h,
    videoId: ytId,
    playerVars: {
      controls: 0,
      enablejsapi: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      playsinline: 1,
      disablekb: 1,
      fs: 0,
      origin: window.location.origin,
    },
    events: {
      onReady: (e) => {
        if (!isMountCurrent(stage, gen)) {
          try {
            e.target.destroy();
          } catch {
            /* ignore */
          }
          return;
        }
        ytPlayer = e.target;
        uiBinding?.onReady?.();
        ytPlayers.set(stage, {
          player: e.target,
          ytId,
          gen,
          cleanup: uiBinding?.cleanup,
        });
        resizeYoutubeStage(stage, e.target);
      },
      onStateChange: (e) => {
        uiBinding?.onStateChange(e.data);
      },
    },
  });

  ytPlayers.set(stage, {
    player,
    ytId,
    gen,
    pending: true,
    cleanup: () => uiBinding?.cleanup?.(),
  });

  if (!stage.dataset.ytResizeBound) {
    stage.dataset.ytResizeBound = "1";
    window.addEventListener("resize", () => resizeYoutubeStage(stage));
  }
}

function mountGoogleDrive(stage, driveId, label) {
  destroyYoutubeStage(stage);
  stage.innerHTML = `
    <iframe
      class="project-viewer__media project-viewer__drive"
      src="${googleDrivePreviewUrl(driveId)}"
      title="${label}"
      allow="autoplay; encrypted-media; fullscreen"
      allowfullscreen
      loading="lazy"
    ></iframe>`;
}

function stageSize(stage) {
  const rect = stage.getBoundingClientRect();
  return {
    w: Math.max(320, Math.round(rect.width)),
    h: Math.max(180, Math.round(rect.height)),
  };
}

function resizeYoutubeStage(stage, playerOverride) {
  const entry = ytPlayers.get(stage);
  const player = playerOverride || entry?.player;
  if (!player?.setSize) return;
  const { w, h } = stageSize(stage);
  player.setSize(w, h);
}

export function getProjectMedia(project) {
  return (project?.media || []).filter((m) => Boolean(String(m.src || "").trim()));
}

export function paletteForMedia(projectIndex, media) {
  const project = projects[projectIndex];
  if (!project) return [];
  if (media?.palette?.length) return media.palette;
  return project.palette || [];
}

export function renderProjectPalette(container, palette) {
  if (!container) return;
  if (!palette?.length) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  container.hidden = false;
  container.innerHTML = `
    <span class="project-palette__label">Grade palette</span>
    <ul class="project-palette__list">
      ${palette
        .map(
          ({ color, label }) => `
        <li class="project-palette__item">
          <span
            class="project-palette__swatch"
            style="--swatch:${color}"
            title="${label} · ${color}"
            role="img"
            aria-label="${label}"
          ></span>
          <span class="project-palette__name">${label}</span>
        </li>`
        )
        .join("")}
    </ul>`;
}

export function ensureProjectViewer(projectIndex) {
  const fn = panelBooters.get(projectIndex);
  if (fn) fn();
}

export function initProjectViewers() {
  bindProjectViewerUi();

  document.querySelectorAll(".project-panel").forEach((panel, panelIndex) => {
    const stage = panel.querySelector(".project-viewer__stage");
    const strip = panel.querySelector(".project-strip");
    const thumbs = Array.from(strip?.querySelectorAll(".project-strip__item") ?? []);
    const project = projects[panelIndex];
    const mediaList = getProjectMedia(project);
    if (!stage || !mediaList.length) return;

    let active = 0;

    const render = (index) => {
      active = (index + mediaList.length) % mediaList.length;
      const m = mediaList[active];
      const type = m.type;
      const src = m.src;
      const ytId = type === "video" ? getYoutubeId(src) : null;
      const poster = m.poster || (ytId ? youtubeThumbUrl(ytId, "sd") : "") || "";
      const label = m.label || "Media";

      thumbs.forEach((t, i) => t.classList.toggle("is-active", i === active));
      renderProjectPalette(panel.querySelector("[data-palette-root]"), paletteForMedia(panelIndex, m));
      destroyYoutubeStage(stage);

      if (type === "video") {
        const driveId = getGoogleDriveId(src);
        if (ytId) {
          mountYoutube(stage, ytId, label, poster);
        } else if (driveId) {
          mountGoogleDrive(stage, driveId, label);
        } else {
          stage.innerHTML = `<video class="project-viewer__media" src="${src}" poster="${poster}" controls playsinline preload="metadata"></video>`;
        }
      } else {
        stage.innerHTML = `<img class="project-viewer__media" src="${src}" alt="${label}" />`;
      }

      if (strip && thumbs[active]) {
        strip.scrollTo({ left: thumbs[active].offsetLeft - 24, behavior: "smooth" });
      }
    };

    panelViewers.set(panelIndex, {
      render,
      getActive: () => active,
      getMediaCount: () => mediaList.length,
    });

    panelBooters.set(panelIndex, () => {
      if (panel.dataset.viewerBooted === "1") return;
      panel.dataset.viewerBooted = "1";
      render(0);
    });
  });
}
