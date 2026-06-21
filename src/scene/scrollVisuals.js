import { clamp } from "../utils/easing.js";
import { getProjects } from "../../data/projectsStore.js";

function chapters() {
  const lastProject = getProjects().length;
  return { lastProject, contact: lastProject + 1 };
}

export function isProjectChapter(ch) {
  const { lastProject } = chapters();
  return ch >= 1 && ch <= lastProject;
}

export function isDecorChapter(ch) {
  return ch === 0 || ch === chapters().contact;
}

/**
 * 1 = hero / contact (decor + blur full), 0 = project (decor + blur gone).
 */
export function getHeroBlend(fromChapter, toChapter, scrollT, introDone = true) {
  if (!introDone) return 1;

  const toDecor = isDecorChapter(toChapter);
  const toProject = isProjectChapter(toChapter);
  const fromDecor = isDecorChapter(fromChapter);
  const fromProject = isProjectChapter(fromChapter);

  if (toDecor && scrollT >= 1) return 1;
  if (toProject && scrollT >= 1) return 0;

  if (fromDecor && toProject && scrollT < 1) {
    return clamp(1 - scrollT, 0, 1);
  }
  if (fromProject && toDecor && scrollT < 1) {
    return clamp(scrollT, 0, 1);
  }

  if (toProject) return 0;
  if (toDecor) return 1;
  return clamp(scrollT, 0, 1);
}

/** Decor gone → hand canvas (smiley) above video. ~22% of scroll ≈ 140ms. */
export const CANVAS_FRONT_SCROLL_T = 0.22;

/** Ramp decor / DOF / gray after canvas drops behind video (mirror of hero→project). */
export function getProjectToHeroRampT(scrollT) {
  return clamp(
    (scrollT - CANVAS_FRONT_SCROLL_T) / (1 - CANVAS_FRONT_SCROLL_T),
    0,
    1
  );
}

/** 0 = project stack, 1 = hero stack (DOF, gray, decor) */
export function getHeroStackBlend(fromChapter, toChapter, scrollT, introDone = true) {
  if (isProjectChapter(fromChapter) && isDecorChapter(toChapter) && scrollT < 1) {
    return getProjectToHeroRampT(scrollT);
  }
  if (fromChapter >= 1 && toChapter < 1 && scrollT < 1) {
    return getProjectToHeroRampT(scrollT);
  }
  return getHeroBlend(fromChapter, toChapter, scrollT, introDone);
}

/** Bokeh / bloom strength during scroll transitions */
export function getPostFxBlend(fromChapter, toChapter, scrollT, introDone = true) {
  if (!introDone) return 1;
  if (isDecorChapter(toChapter) && scrollT >= 1) return 1;
  if (isProjectChapter(fromChapter) && isDecorChapter(toChapter) && scrollT < 1) {
    return getProjectToHeroRampT(scrollT);
  }
  if (isDecorChapter(fromChapter) && isProjectChapter(toChapter) && scrollT < 1) {
    return clamp(1 - scrollT / CANVAS_FRONT_SCROLL_T, 0, 1);
  }
  if (fromChapter >= 1 && toChapter < 1 && scrollT < 1) {
    return getProjectToHeroRampT(scrollT);
  }
  if (fromChapter < 1 && isProjectChapter(toChapter) && scrollT < 1) {
    return clamp(1 - scrollT / CANVAS_FRONT_SCROLL_T, 0, 1);
  }
  if (isProjectChapter(toChapter)) return 0;
  return getHeroBlend(fromChapter, toChapter, scrollT, introDone);
}

/**
 * Decor opacity — fades early on hero→project, ramps after canvas drops on project→hero/contact.
 */
export function getDecorBlend(fromChapter, toChapter, scrollT, introDone = true) {
  if (!introDone) return 1;
  if (isDecorChapter(fromChapter) && isProjectChapter(toChapter) && scrollT < 1) {
    return clamp(1 - scrollT / CANVAS_FRONT_SCROLL_T, 0, 1);
  }
  if (isProjectChapter(fromChapter) && isDecorChapter(toChapter) && scrollT < 1) {
    return getProjectToHeroRampT(scrollT);
  }
  if (fromChapter < 1 && isProjectChapter(toChapter) && scrollT < 1) {
    return clamp(1 - scrollT / CANVAS_FRONT_SCROLL_T, 0, 1);
  }
  if (fromChapter >= 1 && toChapter < 1 && scrollT < 1) {
    return getProjectToHeroRampT(scrollT);
  }
  return getHeroBlend(fromChapter, toChapter, scrollT, introDone);
}

/** Smiley above video on projects; behind content on hero / contact. */
export function smileyOverlayMode(fromChapter, toChapter, scrollT) {
  if (isProjectChapter(toChapter) && scrollT >= 1) return true;
  if (isDecorChapter(toChapter) && scrollT >= 1) return false;

  if (scrollT >= 1) return false;

  if (isDecorChapter(fromChapter) && isProjectChapter(toChapter)) {
    return scrollT >= CANVAS_FRONT_SCROLL_T;
  }
  if (isProjectChapter(fromChapter) && isDecorChapter(toChapter)) {
    return scrollT < CANVAS_FRONT_SCROLL_T;
  }
  if (fromChapter < 1 && isProjectChapter(toChapter)) {
    return scrollT >= CANVAS_FRONT_SCROLL_T;
  }
  if (fromChapter >= 1 && toChapter < 1 && scrollT < 1) {
    return scrollT < CANVAS_FRONT_SCROLL_T;
  }
  if (isProjectChapter(fromChapter) || isProjectChapter(toChapter)) return true;
  return false;
}

/** @deprecated use smileyOverlayMode */
export function isOnProject(toChapter, scrollT) {
  return smileyOverlayMode(0, toChapter, scrollT);
}
