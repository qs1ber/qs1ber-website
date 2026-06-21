import {
  RADIO_PLAYLIST_URL,
  RADIO_HAT_ID,
  RADIO_VOLUME_KEY,
  RADIO_VOLUME_DEFAULT,
} from "../../data/radio.js";
import { findDropFromWaveform } from "../utils/waveformDrop.js";

const SC_API = "https://w.soundcloud.com/player/api.js";
const WIDGET_COLOR = "ff3d9a";

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Widget getters sometimes return seconds for short tracks */
function normalizeMs(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value < 1000 ? Math.round(value * 1000) : Math.round(value);
}

function loadSoundCloudApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SC_API}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.SC));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = SC_API;
    script.async = true;
    script.onload = () => resolve(window.SC);
    script.onerror = () => reject(new Error("SoundCloud widget API failed"));
    document.head.appendChild(script);
  });
}

function widgetSrc() {
  const params = new URLSearchParams({
    url: RADIO_PLAYLIST_URL,
    color: WIDGET_COLOR,
    auto_play: "false",
    buying: "false",
    sharing: "false",
    download: "false",
    show_artwork: "false",
    show_playcount: "false",
    show_user: "false",
    show_teaser: "false",
    visual: "false",
    hide_related: "true",
    single_active: "false",
  });
  return `https://w.soundcloud.com/player/?${params}`;
}

export function initQs1berRadio() {
  const root = document.getElementById("qs1berRadio");
  const iframe = document.getElementById("scRadioWidget");
  if (!root || !iframe) return;

  const playBtn = root.querySelector("[data-radio-play]");
  const shuffleBtn = root.querySelector("[data-radio-shuffle]");
  const controls = root.querySelector("[data-radio-controls]");
  const seek = root.querySelector("[data-radio-seek]");
  const titleEl = root.querySelector("[data-radio-title]");
  const currentEl = root.querySelector("[data-radio-current]");
  const durationEl = root.querySelector("[data-radio-duration]");
  const volumeEl = root.querySelector("[data-radio-volume]");
  const volumeLabel = root.querySelector("[data-radio-volume-label]");

  let widget = null;
  let ready = false;
  let sounds = [];
  let currentIndex = -1;
  let durationMs = 0;
  let firstTuneIn = true;
  let dropSeekPending = false;
  let seeking = false;
  let visible = false;
  let hasStarted = false;
  let playing = false;
  let progressTimer = null;
  let apiPromise = null;
  let volume = RADIO_VOLUME_DEFAULT;

  const readStoredVolume = () => {
    try {
      const raw = localStorage.getItem(RADIO_VOLUME_KEY);
      const n = raw == null ? RADIO_VOLUME_DEFAULT : Number(raw);
      if (!Number.isFinite(n)) return RADIO_VOLUME_DEFAULT;
      return Math.round(Math.min(100, Math.max(0, n)));
    } catch {
      return RADIO_VOLUME_DEFAULT;
    }
  };

  const applyVolume = (next, persist = true) => {
    volume = Math.round(Math.min(100, Math.max(0, next)));
    if (volumeEl) volumeEl.value = String(volume);
    if (volumeLabel) volumeLabel.textContent = `${volume}%`;
    widget?.setVolume(volume);
    if (persist) {
      try {
        localStorage.setItem(RADIO_VOLUME_KEY, String(volume));
      } catch {
        /* ignore */
      }
    }
  };

  volume = readStoredVolume();
  if (volumeEl) volumeEl.value = String(volume);
  if (volumeLabel) volumeLabel.textContent = `${volume}%`;

  iframe.src = widgetSrc();

  const refreshDuration = () =>
    new Promise((resolve) => {
      if (!widget) return resolve(0);
      widget.getDuration((dur) => {
        const next = normalizeMs(dur);
        if (next > 0) durationMs = next;
        if (durationEl && durationMs > 0) durationEl.textContent = formatTime(durationMs);
        resolve(durationMs);
      });
    });

  const updateSeekUi = (positionMs, totalMs = durationMs) => {
    const total = totalMs > 0 ? totalMs : durationMs;
    const pos = Math.max(0, positionMs);
    if (seek && total > 0 && !seeking) {
      seek.value = String(Math.round((pos / total) * 1000));
    }
    if (currentEl) currentEl.textContent = formatTime(pos);
  };

  const syncProgress = () => {
    if (!widget || seeking) return;
    widget.getPosition((pos) => {
      widget.getDuration((dur) => {
        const total = normalizeMs(dur);
        const position = normalizeMs(pos);
        if (total > 0) durationMs = total;
        if (durationEl && durationMs > 0) durationEl.textContent = formatTime(durationMs);
        updateSeekUi(position, durationMs);
      });
    });
  };

  const startProgressLoop = () => {
    playing = true;
    if (progressTimer) return;
    progressTimer = window.setInterval(syncProgress, 200);
    syncProgress();
  };

  const stopProgressLoop = () => {
    playing = false;
    if (progressTimer) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  const ensureWidget = () => {
    if (widget) return Promise.resolve(widget);
    apiPromise ??= loadSoundCloudApi().then((SC) => {
      widget = SC.Widget(iframe);
      return new Promise((resolve) => {
        widget.bind(SC.Widget.Events.READY, () => {
          ready = true;
          applyVolume(volume, false);
          widget.getSounds((list) => {
            sounds = list || [];
          });
          resolve(widget);
        });
      });
    });
    return apiPromise;
  };

  const updateTitle = async () => {
    if (!widget || !titleEl) return;
    widget.getCurrentSound((sound) => {
      titleEl.textContent = sound?.title || "qs1ber radio";
      const fromSound = normalizeMs(sound?.duration);
      if (fromSound > 0) durationMs = fromSound;
    });
    await refreshDuration();
  };

  const playRandom = () =>
    new Promise((resolve) => {
      widget.getSounds((list) => {
        sounds = list || [];
        if (!sounds.length) {
          widget.play();
          resolve();
          return;
        }
        let idx = Math.floor(Math.random() * sounds.length);
        if (sounds.length > 1 && idx === currentIndex) {
          idx = (idx + 1) % sounds.length;
        }
        currentIndex = idx;
        const cached = normalizeMs(sounds[idx]?.duration);
        if (cached > 0) durationMs = cached;
        widget.skip(idx);
        widget.play();
        resolve();
      });
    });

  const maybeSeekDrop = async () => {
    if (!dropSeekPending || !firstTuneIn) return;
    dropSeekPending = false;
    firstTuneIn = false;

    await refreshDuration();
    await new Promise((r) => requestAnimationFrame(r));

    widget.getCurrentSound(async (sound) => {
      const waveformUrl = sound?.waveform_url || sound?.waveformUrl;
      const dur = normalizeMs(sound?.duration) || durationMs;
      if (dur > 0) durationMs = dur;
      if (!waveformUrl || !dur) return;
      const dropMs = await findDropFromWaveform(waveformUrl, dur);
      widget.seekTo(dropMs);
      updateSeekUi(dropMs, dur);
    });
  };

  const bindWidgetEvents = (SC) => {
    widget.bind(SC.Widget.Events.PLAY, () => {
      root.classList.add("is-playing");
      if (playBtn) playBtn.textContent = "❚❚ Pause";
      if (controls) controls.hidden = false;
      updateTitle();
      startProgressLoop();
      maybeSeekDrop();
    });

    widget.bind(SC.Widget.Events.PAUSE, () => {
      root.classList.remove("is-playing");
      if (playBtn) playBtn.textContent = "▶ Tune in";
      stopProgressLoop();
      syncProgress();
    });

    widget.bind(SC.Widget.Events.FINISH, () => {
      stopProgressLoop();
    });

    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data) => {
      if (seeking || !seek) return;
      const rel = data?.relativePosition;
      const current = normalizeMs(data?.currentPosition);
      if (typeof rel === "number" && rel >= 0 && rel <= 1) {
        seek.value = String(Math.round(rel * 1000));
        if (currentEl) currentEl.textContent = formatTime(current);
        return;
      }
      updateSeekUi(current);
    });

    widget.bind(SC.Widget.Events.SEEK, (data) => {
      updateSeekUi(normalizeMs(data?.currentPosition));
    });
  };

  const tuneIn = async () => {
    await ensureWidget();
    if (!ready) return;

    widget.isPaused((paused) => {
      if (!paused) {
        widget.pause();
        return;
      }

      if (!hasStarted) {
        hasStarted = true;
        dropSeekPending = firstTuneIn;
        playRandom().then(updateTitle);
        return;
      }

      widget.play();
    });
  };

  const shuffleTrack = async () => {
    await ensureWidget();
    if (!ready) return;
    dropSeekPending = false;
    await playRandom();
    await updateTitle();
    startProgressLoop();
  };

  const pause = () => {
    stopProgressLoop();
    widget?.pause();
  };

  const setVisible = (show) => {
    visible = !!show;
    root.hidden = !visible;
    root.classList.toggle("is-visible", visible);
    if (!visible) pause();
  };

  const syncEquipped = (equipped) => {
    const on = equipped?.hats === RADIO_HAT_ID;
    setVisible(on);
  };

  const commitSeek = () => {
    if (!widget) {
      seeking = false;
      return;
    }
    const ratio = Number(seek?.value ?? 0) / 1000;
    widget.getDuration((dur) => {
      const total = normalizeMs(dur) || durationMs;
      if (!total) {
        seeking = false;
        return;
      }
      durationMs = total;
      const target = Math.round(Math.max(0, Math.min(1, ratio)) * total);
      widget.seekTo(target);
      updateSeekUi(target, total);
      seeking = false;
    });
  };

  playBtn?.addEventListener("click", () => tuneIn());
  shuffleBtn?.addEventListener("click", () => shuffleTrack());

  seek?.addEventListener("pointerdown", () => {
    seeking = true;
  });

  seek?.addEventListener("input", () => {
    seeking = true;
    const total = durationMs;
    const preview = total > 0 ? total * (Number(seek.value) / 1000) : 0;
    if (currentEl) currentEl.textContent = formatTime(preview);
  });

  seek?.addEventListener("change", commitSeek);
  seek?.addEventListener("pointerup", commitSeek);

  volumeEl?.addEventListener("input", () => {
    applyVolume(Number(volumeEl.value), true);
  });

  ensureWidget()
    .then((SC) => bindWidgetEvents(SC))
    .catch((err) => console.warn("[qs1ber radio]", err));

  window.QS1BER.radio = {
    syncEquipped,
    tuneIn,
    shuffle: shuffleTrack,
    pause,
    isVisible: () => visible,
  };
}
