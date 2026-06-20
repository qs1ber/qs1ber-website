import { clamp } from "../utils/easing.js";

/**
 * 1 = hero (decor + blur full), 0 = project (decor + blur gone).
 */
export function getHeroBlend(fromChapter, toChapter, scrollT, introDone = true) {
  if (!introDone) return 1;
  if (toChapter < 1 && scrollT >= 1) return 1;

  if (fromChapter < 1 && toChapter >= 1) {
    return clamp(1 - scrollT, 0, 1);
  }
  if (fromChapter >= 1 && toChapter < 1) {
    return clamp(scrollT, 0, 1);
  }
  if (toChapter >= 1) return 0;
  return clamp(scrollT, 0, 1);
}

/** Decor gone → hand canvas (smiley) above video. ~22% of scroll ≈ 140ms. */
export const CANVAS_FRONT_SCROLL_T = 0.22;

/**
 * Decor opacity — fades early on hero→project, late on project→hero
 * so shapes stay behind content while canvas layer hands off.
 */
export function getDecorBlend(fromChapter, toChapter, scrollT, introDone = true) {
  if (!introDone) return 1;
  if (fromChapter < 1 && toChapter >= 1 && scrollT < 1) {
    return clamp(1 - scrollT / CANVAS_FRONT_SCROLL_T, 0, 1);
  }
  if (fromChapter >= 1 && toChapter < 1 && scrollT < 1) {
    return clamp(scrollT / CANVAS_FRONT_SCROLL_T, 0, 1);
  }
  return getHeroBlend(fromChapter, toChapter, scrollT, introDone);
}

/** Smiley above video once decor is gone, or when settled on a project. */
export function smileyOverlayMode(fromChapter, toChapter, scrollT) {
  if (toChapter >= 1 && scrollT >= 1) return true;
  if (scrollT >= 1) return false;

  if (fromChapter < 1 && toChapter >= 1) {
    return scrollT >= CANVAS_FRONT_SCROLL_T;
  }
  if (fromChapter >= 1 && toChapter < 1) {
    return scrollT < CANVAS_FRONT_SCROLL_T;
  }
  if (fromChapter >= 1 || toChapter >= 1) return true;
  return false;
}

/** @deprecated use smileyOverlayMode */
export function isOnProject(toChapter, scrollT) {
  return smileyOverlayMode(0, toChapter, scrollT);
}
