import { BUILD } from "./version.js?b=20260620k";
import { projects } from "../../data/projects.js?b=20260620k";
import { SmileyScene } from "./scene/SmileyScene.js?b=20260620k";
import { initProjectViewers, ensureProjectViewer, pauseAllProjectMedia, renderProjectPalette } from "./ui/projectViewer.js?b=20260620k";
import { initWardrobe } from "./ui/wardrobe.js?b=20260620k";
import { flowEase, scrollEase } from "./utils/easing.js?b=20260620k";
import { getYoutubeId, youtubeThumbUrl, loadYoutubeApi } from "./utils/youtube.js?b=20260620k";
import { smileyOverlayMode } from "./scene/scrollVisuals.js?b=20260620k";

console.info(`[qs1ber] build ${BUILD}`);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CONTACT_CHAPTER = projects.length + 1;
const SCROLL_DURATION = 620;

function syncPageMode(fromIndex, toIndex, scrollT) {
  const canvasFront = smileyOverlayMode(fromIndex, toIndex, scrollT);
  const inProjectScroll = scrollT < 1 && (fromIndex >= 1 || toIndex >= 1);
  const heroActive = toIndex < 1 && scrollT >= 1;
  document.body.classList.toggle("is-canvas-front", canvasFront);
  document.body.classList.toggle("is-project-scroll", inProjectScroll);
  document.body.classList.toggle("is-hero-active", heroActive);
}

function buildChapterRail() {
  const rail = document.getElementById("chapterRail");
  if (!rail) return;

  const items = [{ i: 0, title: "About" }];
  projects.forEach((p, idx) => items.push({ i: idx + 1, title: p.title }));
  items.push({ i: CONTACT_CHAPTER, title: "Contact" });

  rail.innerHTML = items
    .map(
      (item) =>
        `<li class="chapter-rail__item${item.i === 0 ? " is-active" : ""}" data-i="${item.i}" title="${item.title}"></li>`
    )
    .join("");
}

function buildProjectPanels() {
  const track = document.getElementById("projectTrack");
  if (!track) return;

  projects.forEach((p, i) => {
    const article = document.createElement("article");
    article.className = "section project-panel";
    article.id = `project-${p.id}`;
    article.dataset.chapter = String(i + 1);
    article.style.setProperty("--project-accent", p.color);

    const detailRows = [
      { label: "Client", value: p.client },
      { label: "Year", value: p.year },
      { label: "Format", value: p.format },
      p.postTools
        ? { label: "Post-prod", value: p.postTools }
        : { label: "Tools", value: p.tools.join(" · ") },
      ...(p.camera ? [{ label: "Camera", value: p.camera }] : []),
      ...(p.lenses ? [{ label: "Lenses", value: p.lenses }] : []),
    ];

    const detailsHtml = detailRows
      .map(({ label, value }) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join("");

    const stripItems = p.media
      .map((m, mi) => {
        const ytId = m.type === "video" ? getYoutubeId(m.src) : null;
        const thumbPoster = m.poster || (ytId ? youtubeThumbUrl(ytId, "sd") : "");
        return `
        <button type="button" class="project-strip__item${mi === 0 ? " is-active" : ""}"
          data-type="${m.type}"
          data-src="${m.src || ""}"
          data-poster="${thumbPoster}"
          data-label="${m.label}"
          data-hue="${m.placeholderHue}"
          aria-label="${m.label}">
          ${
            m.src
              ? m.type === "video"
                ? ytId
                  ? `<img src="${thumbPoster}" alt="${m.label}" loading="lazy" />`
                  : thumbPoster
                    ? `<img src="${thumbPoster}" alt="${m.label}" loading="lazy" />`
                    : `<video muted playsinline preload="metadata" src="${m.src}"></video>`
                : `<img src="${m.src}" alt="${m.label}" loading="lazy" />`
              : `<span class="project-strip__ph" style="background:linear-gradient(135deg,hsl(${m.placeholderHue},60%,82%),hsl(${m.placeholderHue + 20},65%,72%))">${m.type === "video" ? "▶" : ""}</span>`
          }
          <span class="project-strip__caption">${m.label}</span>
        </button>`;
      })
      .join("");

    article.innerHTML = `
      <div class="project-panel__layout">
        <div class="project-viewer">
          <button type="button" class="project-viewer__nav project-viewer__prev" aria-label="Previous">‹</button>
          <div class="project-viewer__stage"></div>
          <button type="button" class="project-viewer__nav project-viewer__next" aria-label="Next">›</button>
        </div>

        <div class="project-strip project-strip--dock" role="tablist" aria-label="Project media">${stripItems}</div>

        <div class="project-meta glass project-meta--${(i + 1) % 2 === 1 ? "smiley-left" : "smiley-right"}">
          <div class="project-meta__companion" aria-hidden="true">
            <div class="project-smiley-slot"></div>
          </div>
          <div class="project-meta__content">
            <div class="project-meta__grid">
              <div class="project-meta__col">
                <span class="project-meta__index">${p.index}</span>
                <h2 class="project-meta__title">${p.title}</h2>
                <p class="project-meta__role">${p.role}</p>
                <p class="project-meta__desc">${p.description}</p>
              </div>
              <div class="project-meta__col project-meta__col--details">
                <dl class="project-meta__dl">
                  ${detailsHtml}
                </dl>
                <ul class="project-meta__tags">
                  ${p.tags.map((tag) => `<li>${tag}</li>`).join("")}
                </ul>
              </div>
            </div>
            <div class="project-palette" data-palette-root aria-label="Grade palette"></div>
          </div>
        </div>
      </div>
    `;
    track.appendChild(article);
    renderProjectPalette(article.querySelector("[data-palette-root]"), p.palette);
  });

  const contact = document.getElementById("contact");
  if (contact) contact.dataset.chapter = String(CONTACT_CHAPTER);

  const contactLink = document.querySelector('[data-goto="contact"]');
  if (contactLink) contactLink.dataset.goto = String(CONTACT_CHAPTER);

  initProjectViewers();
}

function initPreloader() {
  const el = document.getElementById("preloader");
  const fill = el?.querySelector(".preloader__fill");
  const pct = el?.querySelector(".preloader__pct");
  if (!el) return;

  let pageReady = false;
  let sceneReady = false;
  let bootReady = false;
  let dismissed = false;

  const tryDismiss = () => {
    if (dismissed || !pageReady || !sceneReady || !bootReady) return;
    dismissed = true;
    if (fill) fill.style.width = "100%";
    if (pct) pct.textContent = "100%";
    el.classList.add("is-leaving");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-revealing");
    setTimeout(() => {
      el.classList.add("is-done");
      el.setAttribute("aria-hidden", "true");
    }, reduceMotion ? 400 : 900);
    window.dispatchEvent(new CustomEvent("qs1ber:preloader-done"));
  };

  if (fill) {
    let p = 0;
    const tick = () => {
      if (dismissed) return;
      const cap = bootReady ? 100 : 92;
      p = Math.min(cap, p + (reduceMotion ? 18 : 2.5 + Math.random() * 3.5));
      fill.style.width = `${p}%`;
      if (pct) pct.textContent = `${Math.round(p)}%`;
      if (p < cap || !bootReady) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.addEventListener("load", () => { pageReady = true; tryDismiss(); }, { once: true });
  if (document.readyState === "complete") pageReady = true;

  window.addEventListener("qs1ber:scene-ready", () => { sceneReady = true; tryDismiss(); }, { once: true });
  window.addEventListener("qs1ber:boot-ready", () => { bootReady = true; tryDismiss(); }, { once: true });

  setTimeout(() => { sceneReady = true; tryDismiss(); }, reduceMotion ? 600 : 6000);
  setTimeout(() => { bootReady = true; tryDismiss(); }, reduceMotion ? 800 : 9000);
}

function prefetchYoutubeApi() {
  loadYoutubeApi().catch(() => {});
}

function initScroll(state, scene) {
  const root = document.getElementById("scrollRoot");
  const sections = () => Array.from(document.querySelectorAll("[data-chapter]"));
  state.syncPageMode = syncPageMode;
  let current = 0;
  let animating = false;
  let scrollRaf = 0;
  let lockedTop = 0;

  const chapterTop = (index) => sections()[index]?.offsetTop ?? 0;

  const clampToChapter = (index) => {
    lockedTop = chapterTop(index);
    root.scrollTop = lockedTop;
  };

  const lockScrollPosition = () => {
    if (animating) return;
    if (root.scrollTop !== lockedTop) root.scrollTop = lockedTop;
  };

  const finishScroll = (toIndex) => {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
    animating = false;
    state.snapLock = false;
    state.activeScroll = null;
    current = toIndex;
    clampToChapter(toIndex);
    document.body.classList.remove("is-transitioning");
    updateRail(toIndex);
    syncPageMode(toIndex, toIndex, 1);
    if (toIndex >= 1 && toIndex <= projects.length) {
      ensureProjectViewer(toIndex - 1);
      // YouTube mount shifts section offsets — re-clamp after layout settles.
      requestAnimationFrame(() => {
        clampToChapter(toIndex);
        requestAnimationFrame(() => clampToChapter(toIndex));
      });
    }
  };

  /** Animate scrollTop + 3D in sync; lockedTop tracks each frame so native scroll can't drift. */
  const runScrollAnimation = (fromIndex, toIndex, startY, top) => {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);

    animating = true;
    state.snapLock = true;
    document.body.classList.add("is-transitioning");
    scene?.setChapter(toIndex, 0);

    const dist = top - startY;
    const t0 = performance.now();
    const deadline = t0 + SCROLL_DURATION + 150;

    const tick = (now) => {
      try {
        const u = Math.min(1, (now - t0) / SCROLL_DURATION);
        const eased = scrollEase(u);
        const y = startY + dist * eased;
        lockedTop = y;
        root.scrollTop = y;
        scene?.setChapter(toIndex, eased);

        if (u < 1 && now < deadline) {
          scrollRaf = requestAnimationFrame(tick);
          return;
        }

        lockedTop = top;
        root.scrollTop = top;
        scene?.setChapter(toIndex, 1);
        finishScroll(toIndex);
      } catch (err) {
        console.error("[qs1ber] scroll animation failed:", err);
        finishScroll(toIndex);
      }
    };

    scrollRaf = requestAnimationFrame(tick);
  };

  const updateRail = (index) => {
    document.querySelectorAll(".chapter-rail__item").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.i) === index);
    });
  };

  const applyScroll = (fromIndex, toIndex, scrollT) => {
    state.chapterIndex = toIndex;
    state.chapterT = scrollT;
    scene?.setChapter(toIndex, scrollT);
  };

  const goTo = (index, immediate = false) => {
    const list = sections();
    index = Math.max(0, Math.min(list.length - 1, index));
    if (animating && !immediate) return;

    const fromIndex = current;
    if (index === fromIndex && !immediate) return;

    if (fromIndex >= 1 && fromIndex <= projects.length) {
      pauseAllProjectMedia();
    }

    const target = list[index];
    const top = target.offsetTop;

    scene?.beginTransition(fromIndex, index);

    if (immediate || reduceMotion) {
      current = index;
      state.snapLock = false;
      clampToChapter(index);
      applyScroll(fromIndex, index, 1);
      updateRail(index);
      syncPageMode(index, index, 1);
      pauseAllProjectMedia();
      if (index >= 1 && index <= projects.length) {
        ensureProjectViewer(index - 1);
      }
      return;
    }

    runScrollAnimation(fromIndex, index, root.scrollTop, top);
  };

  const wheelDirection = (e) => {
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 40;
    else if (e.deltaMode === 2) dy *= root.clientHeight;
    if (dy > 0) return 1;
    if (dy < 0) return -1;
    return 0;
  };

  const onChapterWheel = (e) => {
    if (document.body.classList.contains("is-wardrobe-open")) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const strip = e.target.closest(".project-strip");
    if (strip && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    const metaBody = e.target.closest(".project-meta__content");
    if (metaBody) {
      const overflow = metaBody.scrollHeight - metaBody.clientHeight;
      if (overflow > 4) {
        const top = metaBody.scrollTop;
        if ((e.deltaY > 0 && top < overflow - 1) || (e.deltaY < 0 && top > 0)) {
          return;
        }
      }
    }

    e.preventDefault();
    e.stopPropagation();

    if (animating) return;

    const dir = wheelDirection(e);
    if (!dir) return;

    goTo(current + dir);
  };

  document.addEventListener("wheel", onChapterWheel, { passive: false, capture: true });
  root.addEventListener("scroll", lockScrollPosition, { passive: true });

  let touchY = 0;
  root.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  root.addEventListener(
    "touchend",
    (e) => {
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 16) return;
      if (animating) return;
      goTo(current + (dy > 0 ? 1 : -1));
    },
    { passive: true }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); goTo(current + 1); }
    if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goTo(current - 1); }
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      goTo(Number(btn.dataset.goto));
    });
  });

  document.getElementById("chapterRail")?.addEventListener("click", (e) => {
    const item = e.target.closest(".chapter-rail__item");
    if (item) goTo(Number(item.dataset.i));
  });

  window.QS1BER.goToChapter = goTo;
  lockedTop = 0;
  root.scrollTop = 0;
  syncPageMode(0, 0, 1);
  updateRail(0);
}

function initScene() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return null;
  try {
    return new SmileyScene(canvas, window.QS1BER);
  } catch (err) {
    console.error("[qs1ber] 3D scene failed:", err);
    window.QS1BER.sceneReady = true;
    window.dispatchEvent(new CustomEvent("qs1ber:scene-ready"));
    return null;
  }
}

function init() {
  buildChapterRail();
  buildProjectPanels();
  initPreloader();

  const scene = initScene();
  if (scene) {
    window.QS1BER.listShapes = () => scene.listShapes();
  } else {
    window.dispatchEvent(new CustomEvent("qs1ber:boot-ready"));
  }

  window.addEventListener("qs1ber:preloader-done", () => {
    document.body.classList.add("is-intro-ready");
  });

  window.addEventListener("qs1ber:scene-ready", () => prefetchYoutubeApi(), { once: true });

  initScroll(window.QS1BER, scene);
  initWardrobe(scene);
}

init();
