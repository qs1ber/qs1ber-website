import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { damp, flowEase, snapBounce, elasticEaseOut, lerp, clamp, seededRandom, scrollEase } from "../utils/easing.js";
import { getDecorBlend, getHeroBlend, smileyOverlayMode } from "./scrollVisuals.js";
import { WARDROBE_ITEMS, wardrobeItemForNode } from "../../data/wardrobe.js";
import { projects } from "../../data/projects.js";

const LAST_PROJECT_CHAPTER = projects.length;

const PINK = 0xff3d9a;
const MODEL_BASE = "assets/models";
const SMILEY_FBX = "assets/cube5.fbx";
const WARDROBE_TEX = "assets/wardrobe";

/** 100mm full-frame equivalent (24mm sensor height) */
const FOCAL_LENGTH_MM = 100;
const SENSOR_HEIGHT_MM = 24;
const CAMERA_FOV_Y = THREE.MathUtils.radToDeg(
  2 * Math.atan(SENSOR_HEIGHT_MM / (2 * FOCAL_LENGTH_MM))
);

/** Unified world scale */
const SHAPE_RADIUS = 0.58;
const SHAPE_WORLD_SCALE = 0.72;
const TYPE_SIZE = { ring: 1.32, torus: 1.0, cylinder: 0.86, sphere: 0.94, box: 0.9 };
const SMILEY_SCALE_MULT = 0.72;
const MODEL_SCALE = 0.0062;
const SMILEY_PATH_T = 0.56;
/** Fine-tune hero framing — small left/down nudge on top of path slot */
const SMILEY_FRAME_OFFSET = new THREE.Vector3(-0.45, -0.25, 0.28);
/** Companion mode — anchored to .project-smiley-slot beside project copy */
const FOLLOW_NDC_X = 0.86;
const FOLLOW_NDC_Y = -0.62;
const FOLLOW_SCALE = 0.72;
const COMPANION_SLOT_REF_PX = 360;
const COMPANION_SCALE_MIN = 0.44;
const COMPANION_SCALE_MAX = 0.78;
const NDC_SAFE = 0.72;
const COMPANION_NDC_SAFE = 0.97;
const COMPANION_EDGE_BIAS = 0.36;
const COMPANION_CORNER_Y = 0.68;
const SMILEY_GLASS_TRANSMISSION = 0.35;
const SMILEY_GLASS_TRANSMISSION_HERO = SMILEY_GLASS_TRANSMISSION;
const SMILEY_GLASS_TRANSMISSION_COMPANION = 0;

/** Shapes near smiley pathT must stay behind the hero, never between camera and face */
const SMILEY_CLEAR_T_MIN = 0.4;
const SMILEY_CLEAR_T_MAX = 0.72;

const PATH_LAYOUT = [
  { t: 0.03, type: "ring", scale: 0.72, depth: -3.2 },
  { t: 0.09, type: "torus", scale: 0.86, depth: -1.4 },
  { t: 0.15, type: "ring", scale: 0.78, depth: -2.4 },
  { t: 0.21, type: "torus", scale: 0.9, depth: -2.0 },
  { t: 0.27, type: "ring", scale: 0.84, depth: -1.2 },
  { t: 0.33, type: "torus", scale: 0.8, depth: -2.2 },
  { t: 0.39, type: "ring", scale: 0.68, depth: -3.0 },
  { t: 0.65, type: "torus", scale: 0.78, depth: -2.8 },
  { t: 0.66, type: "ring", scale: 0.74, depth: -2.4 },
  { t: 0.72, type: "torus", scale: 0.82, depth: -3.0 },
  { t: 0.78, type: "ring", scale: 0.6, depth: -3.6 },
  { t: 0.84, type: "torus", scale: 0.76, depth: -2.4 },
  { t: 0.89, type: "ring", scale: 0.7, depth: -2.0 },
  { t: 0.94, type: "ring", scale: 0.66, depth: -3.4 },
  { t: 0.98, type: "torus", scale: 0.64, depth: -2.8 },
];

/** Ambient shapes live in the wings / background — not in the smiley foreground cone */
const AMBIENT_LAYOUT = [
  { pos: [-5.4, 0.5, -1.2], type: "torus", scale: 0.95, depth: -1.2 },
  { pos: [-6.4, -0.4, -3.6], type: "ring", scale: 0.62, depth: -1.8 },
  { pos: [-3.6, 0.85, -2.8], type: "ring", scale: 0.82, depth: -2.4 },
  { pos: [-5.6, -0.55, -2.0], type: "torus", scale: 0.68, depth: -2.2 },
  { pos: [4.6, 0.1, -5.8], type: "torus", scale: 0.72, depth: -2.6 },
  { pos: [6.4, -0.4, -4.2], type: "ring", scale: 0.68, depth: -2.8 },
  { pos: [-6.8, 0.05, -2.6], type: "torus", scale: 0.56, depth: -2.4 },
  { pos: [3.4, 0.7, -5.2], type: "ring", scale: 0.78, depth: -3.0 },
  { pos: [5.8, 0.45, -3.0], type: "torus", scale: 0.72, depth: -2.0 },
  { pos: [-2.6, -0.5, -5.6], type: "ring", scale: 0.6, depth: -3.2 },
  { pos: [6.8, 0.15, -1.8], type: "ring", scale: 0.64, depth: -2.6 },
  { pos: [-4.8, -0.1, -4.6], type: "torus", scale: 0.58, depth: -3.4 },
  { pos: [2.2, 0.3, -6.2], type: "ring", scale: 0.56, depth: -2.8 },
  { pos: [-1.4, 0.2, -6.0], type: "torus", scale: 0.52, depth: -3.6 },
];

/** Baked world anchor — hero torus (path:0.21:torus), bottom-left below text */
const SHAPE_PINS = {
  "path:0.21:torus": [-2.7, -1.4, -4.8],
};

const BOKEH_APERTURE = 0.00085;
const BOKEH_MAXBLUR = 0.034;
const DOUBLE_CLICK_MS = 320;
const TRACK_AMP = 0.7;
const CHR_EASE_VAL = 5;
const SPIN_DURATION = 1.0;
/** Eye stretch: elastic in → brief hold → elastic out (same easing family as mood spin) */
const EYE_STRETCH_IN = 0.32;
const EYE_STRETCH_HOLD = 0.5;
const EYE_STRETCH_OUT = 0.36;
const EYE_ELASTIC_PERIOD = 0.28;
/** LMB eye stretch — first click peaks at 13, each click adds step. */
const EYE_STRETCH_FIRST = 13;
const EYE_STRETCH_STEP = 1;
/** After this idle gap, rapid-click streak resets to first peak again. */
const EYE_STRETCH_IDLE_MS = 200;
/** Full mood spin — use Math.PI for 180° */
const SPIN_DELTA = Math.PI * 2;
const LOOK_INTERVAL = 0.3;
const LOOK_ODDS_START = 5;
const LOOK_ODDS_MIN = 1;
const LOOK_ODDS_MAX = 10;
const LOOK_ODDS_INC = 0.8;
const LOOK_ODDS_DEC = 0.5;
const SPIN_FACE_HIDE_ANGLE = Math.PI * 0.42;

const MOUTH_HAPPY = {
  position: new THREE.Vector3(0.059347, -1, -0.2708),
  rotation: new THREE.Euler(0, 0, 0, "XYZ"),
};
const MOUTH_SAD = {
  position: new THREE.Vector3(-0.086081, -1, -0.37321),
  rotation: new THREE.Euler(0, Math.PI, 0, "XYZ"),
};

/** No extra flip — smileyFaceBase lookAt handles camera; PI was showing the back */
const FACE_AXIS_FIX = new THREE.Euler(0, 0, 0);
const SCROLL_MS = 620;

/** Wardrobe fitting-room camera — closer, slight three-quarter angle on the head */
const WARDROBE_CAMERA_POS = new THREE.Vector3(0.82, 0.22, 10.05);
const WARDROBE_CAMERA_LOOK = new THREE.Vector3(0.38, 0.05, 0.16);
const WARDROBE_BLEND_SPEED = 4.5;

export class SmileyScene {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.state = state;
    this.clock = new THREE.Clock();
    this.pointer = { x: 0, y: 0, nx: 0, ny: 0, active: false };
    this.introProgress = 0;
    this.introDone = false;
    this.shapes = [];
    this.eyeMeshes = [];
    this.eyeState = { scaleY: 1, restScale: 1, anim: null };
    this._eyeStretchClicks = 0;
    this._eyeStretchLastClickAt = null;
    this.mood = "happy";
    this.isHappy = true;
    this.mouthAnim = null;
    this._spinFaceVisible = true;
    this.spinTween = null;
    this.cubeRotX = 0;
    this.cubeRotY = 0;
    this.cubeRotXDest = 0;
    this.cubeRotYDest = 0;
    this.lookOdds = LOOK_ODDS_START;
    this.lookTimer = 0;
    this.searchBasePos = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpV3 = new THREE.Vector3();
    this._smileyNdc = { x: 0, y: 0 };
    this._anchorNdc = { x: 0, y: 0 };
    this._heroBlend = 1;
    this._overlayMode = false;
    this._smileyOpaqueMode = false;
    this._scrollFrom = 0;
    this._scrollTo = 0;
    this._lookMat = new THREE.Matrix4();
    this._pathQuat = new THREE.Quaternion();
    this._tumbleQuat = new THREE.Quaternion();
    this._rollQuat = new THREE.Quaternion();
    this._eulerScratch = new THREE.Euler();
    this._spawnPoint = new THREE.Vector3();
    this._spawnNdc = new THREE.Vector3();
    this._shapesSpawned = false;
    this.selectedEntry = null;
    this._gizmoDragging = false;
    this._pointerDownAt = null;
    this._lastSelectAt = 0;
    this._lastSelectEntry = null;
    this._rapidClickCount = 1;
    this._spawnSeed = 9000;
    this._fromChapter = 0;
    this._toChapter = 0;
    this._wardrobeOpen = false;
    this._wardrobeBlend = 0;
    this._wardrobeMeshes = {};
    this._accessorySlots = { glasses: null, hats: null };
    this._eyeClickBlocked = false;
    this._wardrobeTex = {};
    this._transitionFrom = { x: 0, y: 0 };
    this._transitionTo = { x: 0, y: 0 };
    this._hasTransitionNdc = false;
    this.smileyEntry = null;
    this._lastBlendKey = -1;
    this._scrollPerfActive = false;

    this._initRenderer();
    this._initScene();
    this._initLights();
    this._initPath();
    this._initPostFX();
    this._initTransformControls();
    this._bindEvents();
    this._loadSmiley();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.transmissionResolutionScale = 1;
    this.renderer.domElement.style.background = "transparent";
  }

  _initPostFX() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.renderPass.clear = true;
    this.renderPass.clearAlpha = 0;
    this.composer.addPass(this.renderPass);
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 11.8,
      aperture: BOKEH_APERTURE,
      maxblur: BOKEH_MAXBLUR,
      width: w,
      height: h,
    });
    this.composer.addPass(this.bokehPass);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.07, 0.38, 0.9);
    this.composer.addPass(this.bloomPass);
    this._bloomStrength = 0.07;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this._heroBg = new THREE.Color(0xf2f0ef);

    this.decorRoot = new THREE.Group();
    this.decorRoot.name = "decorRoot";
    this.smileyLayer = new THREE.Group();
    this.smileyLayer.name = "smileyLayer";
    this.scene.add(this.decorRoot);
    this.scene.add(this.smileyLayer);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV_Y,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );
    this.camera.position.set(0.35, 0.05, 12.2);
    this._cameraLook = new THREE.Vector3(0.45, -0.08, 0.2);
    this.camera.lookAt(this._cameraLook);
  }

  _initLights() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.055).texture;
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xfff8fc, 1.08));
    const key = new THREE.DirectionalLight(0xffffff, 0.72);
    key.position.set(2.5, 7.5, 6.5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.22);
    fill.position.set(-4, 2.5, 5);
    this.scene.add(fill);

    this._initMaterials();
    this.glassMaterial.envMap = this.scene.environment;
  }

  _initMaterials() {
    /** Same pink glass recipe as smiley body — side map applied after FBX load */
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: PINK,
      metalness: 0.04,
      roughness: 0.12,
      transmission: SMILEY_GLASS_TRANSMISSION_HERO,
      thickness: 0.4,
      ior: 1.48,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.35,
      transparent: true,
      attenuationColor: new THREE.Color(0xff8ec4),
      attenuationDistance: 2.5,
    });
  }

  _applySmileyPinkMaterial(maps) {
    this.glassMaterial.map = maps.side;
    this.glassMaterial.color.setHex(0xffffff);
    this.glassMaterial.opacity = 1;
    this.glassMaterial.needsUpdate = true;
    this.decorMaterial = this.glassMaterial.clone();
    this.decorMaterial.opacity = 1;
    this.decorMaterial.transparent = true;
    this.decorMaterial.depthWrite = true;
  }

  /** Smiley body — full opacity on project/video pages (no glass see-through). */
  _applySmileyCompanionMaterial(onOverlay) {
    if (!this.glassMaterial || onOverlay === this._smileyOpaqueMode) return;
    this._smileyOpaqueMode = onOverlay;

    if (onOverlay) {
      this.glassMaterial.transmission = SMILEY_GLASS_TRANSMISSION_COMPANION;
      this.glassMaterial.opacity = 1;
      this.glassMaterial.transparent = false;
      this.glassMaterial.depthWrite = true;
    } else {
      this.glassMaterial.transmission = SMILEY_GLASS_TRANSMISSION_HERO;
      this.glassMaterial.opacity = 1;
      this.glassMaterial.transparent = true;
      this.glassMaterial.depthWrite = true;
    }
    this.glassMaterial.needsUpdate = true;
  }

  _spawnShapesOnce() {
    if (this._shapesSpawned) return;
    this._shapesSpawned = true;
    this._spawnClonerShapes();
    this._spawnAmbientShapes();
    this._applyShapePins();
  }

  _initTransformControls() {
    // Body — canvas is often pointer-events:none on project pages; gizmo needs global hits.
    this.transformControls = new TransformControls(this.camera, document.body);
    this.transformControls.setSize(1.05);
    this.transformControls.setSpace("world");
    this.transformControls.setMode("translate");

    const helper = this.transformControls.getHelper();
    helper.traverse((child) => {
      child.renderOrder = 999;
    });
    this.scene.add(helper);

    this.transformControls.addEventListener("dragging-changed", (e) => {
      this._gizmoDragging = e.value;
      if (!e.value && this.selectedEntry && !this.selectedEntry.isSmiley) {
        this.selectedEntry.anchor.copy(this.selectedEntry.mesh.position);
      }
    });

    this.transformControls.addEventListener("objectChange", () => {
      if (!this.selectedEntry) return;
      if (this.selectedEntry.isSmiley) {
        this.searchBasePos.copy(this.smileyPivot.position);
        if (this.transformControls.mode === "scale") {
          this._syncUniformScale(this.smileyPivot);
        }
        return;
      }
      this.selectedEntry.userPlaced = true;
      this.selectedEntry.isAmbient = true;
      this.selectedEntry.anchor.copy(this.selectedEntry.mesh.position);
      if (this.transformControls.mode === "scale") {
        this._syncEntryScale(this.selectedEntry);
      }
    });
  }

  _syncUniformScale(object3d) {
    const u = (object3d.scale.x + object3d.scale.y + object3d.scale.z) / 3;
    object3d.scale.setScalar(u);
  }

  _syncEntryScale(entry) {
    this._syncUniformScale(entry.mesh);
    entry.baseScale = entry.mesh.scale.x;
  }

  _gizmoModeFromClick(rapid) {
    const modes = ["translate", "rotate", "scale"];
    if (!rapid) {
      this._rapidClickCount = 1;
    } else {
      this._rapidClickCount = Math.min(this._rapidClickCount + 1, 3);
    }
    return modes[this._rapidClickCount - 1];
  }

  _initPath() {
    this.pathCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-6.5, -0.4, -6.5),
        new THREE.Vector3(-4.5, 0.5, -3.2),
        new THREE.Vector3(-2.6, 1.1, 0.4),
        new THREE.Vector3(-0.1, 0.45, 4.2),
        new THREE.Vector3(2.2, -0.2, 1.8),
        new THREE.Vector3(4.0, 0.35, -2.2),
        new THREE.Vector3(5.8, 0.75, -5.0),
        new THREE.Vector3(7.2, 0.1, -2.5),
      ],
      false,
      "catmullrom",
      0.44
    );
  }

  /** Smiley rest position on the path (camera stays fixed at world origin view) */
  _getFollowAmount(chapter, scrollT) {
    if (scrollT >= 1) {
      return chapter >= 1 ? 1 : 0;
    }

    const from = this._fromChapter ?? chapter;
    const fromCompanion = from >= 1;
    const toCompanion = chapter >= 1;

    if (fromCompanion === toCompanion) {
      return fromCompanion ? 1 : 0;
    }

    if (!fromCompanion && toCompanion) {
      return scrollT;
    }

    return 1 - scrollT;
  }

  _cacheTransitionNdc(fromCh, toCh) {
    const hero = this._heroNdc(this._anchorNdc);
    const from = this._ndcForChapter(fromCh, hero.x, hero.y);
    const to = this._ndcForChapter(toCh, hero.x, hero.y);
    this._transitionFrom.x = from.x;
    this._transitionFrom.y = from.y;
    this._transitionTo.x = to.x;
    this._transitionTo.y = to.y;
    this._hasTransitionNdc = true;
  }

  _companionPanel(chapter) {
    if (chapter < 1) return null;
    return document.querySelector(`[data-chapter="${chapter}"]`);
  }

  _companionSlot(chapter) {
    return this._companionPanel(chapter)?.querySelector(".project-smiley-slot") ?? null;
  }

  _ndcFromRect(rect, out, edge = "center") {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h || rect.width < 4 || rect.height < 4) return false;
    const cy =
      edge === "center" ? rect.top + rect.height * 0.48 : rect.top + rect.height * COMPANION_CORNER_Y;
    let cx = rect.left + rect.width * 0.5;
    if (edge === "left") {
      cx = rect.left + rect.width * COMPANION_EDGE_BIAS;
    } else if (edge === "right") {
      cx = rect.left + rect.width * (1 - COMPANION_EDGE_BIAS);
    }
    out.x = (cx / w) * 2 - 1;
    out.y = 1 - (cy / h) * 2;
    return true;
  }

  _companionEdge(chapter) {
    const panel = this._companionPanel(chapter);
    const meta = panel?.querySelector(".project-meta");
    if (meta?.classList.contains("project-meta--smiley-left")) return "left";
    if (meta?.classList.contains("project-meta--smiley-right")) return "right";
    return chapter % 2 === 1 ? "left" : "right";
  }

  _ndcForChapter(chapter, heroX, heroY) {
    if (chapter < 1) {
      return { x: heroX, y: heroY };
    }

    if (chapter > LAST_PROJECT_CHAPTER) {
      return this._ndcForChapter(LAST_PROJECT_CHAPTER, heroX, heroY);
    }

    const slot = this._companionSlot(chapter);
    const edge = this._companionEdge(chapter);
    if (slot && this._ndcFromRect(slot.getBoundingClientRect(), this._tmpV3, edge)) {
      this._clampSmileyNdc(this._tmpV3, true);
      return { x: this._tmpV3.x, y: this._tmpV3.y };
    }

    return {
      x: chapter % 2 === 1 ? -FOLLOW_NDC_X : FOLLOW_NDC_X,
      y: FOLLOW_NDC_Y,
    };
  }

  _companionScaleForChapter(chapter) {
    if (chapter > LAST_PROJECT_CHAPTER) {
      return this._companionScaleForChapter(LAST_PROJECT_CHAPTER);
    }
    const slot = this._companionSlot(chapter);
    if (!slot) return FOLLOW_SCALE;
    const rect = slot.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    if (size < 8) return FOLLOW_SCALE;
    return clamp(size / COMPANION_SLOT_REF_PX, COMPANION_SCALE_MIN, COMPANION_SCALE_MAX);
  }

  _heroNdc(out = this._anchorNdc) {
    this._heroPathPos(this._tmpV2);
    this._tmpV2.project(this.camera);
    out.x = this._tmpV2.x;
    out.y = this._tmpV2.y;
    return out;
  }

  _clampSmileyNdc(out, companion = false) {
    const safe = companion ? COMPANION_NDC_SAFE : NDC_SAFE;
    out.x = clamp(out.x, -safe, safe);
    out.y = clamp(out.y, -safe, safe);
    return out;
  }

  /** Interpolate smiley anchor in screen space — tracks live DOM slots while scrolling */
  _getSmileyAnchorNdc(chapter, scrollT, out) {
    const companion = chapter >= 1 || this._fromChapter >= 1 || this._toChapter >= 1;

    if (scrollT >= 1) {
      this._hasTransitionNdc = false;
      const hero = this._heroNdc(this._tmpV3);
      const target = this._ndcForChapter(chapter, hero.x, hero.y);
      out.x = target.x;
      out.y = target.y;
      return this._clampSmileyNdc(out, companion);
    }

    const hero = this._heroNdc(this._tmpV3);
    const fromCh = this._fromChapter ?? chapter;
    const toCh = this._toChapter ?? chapter;
    const from = this._ndcForChapter(fromCh, hero.x, hero.y);
    const to = this._ndcForChapter(toCh, hero.x, hero.y);
    out.x = lerp(from.x, to.x, scrollT);
    out.y = lerp(from.y, to.y, scrollT);
    return this._clampSmileyNdc(out, companion);
  }

  _getSmileyFollowDepth() {
    this._heroPathPos(this._tmpV2);
    return this.camera.position.distanceTo(this._tmpV2);
  }

  _worldPosFromNdcAtDepth(ndcX, ndcY, depth, out) {
    this._spawnNdc.set(ndcX, ndcY, 0.5).unproject(this.camera);
    this._spawnNdc.sub(this.camera.position).normalize();
    return out.copy(this.camera.position).addScaledVector(this._spawnNdc, depth);
  }

  _onIntroComplete() {
    this.state.chapterT = 1;
    this._scrollFrom = 0;
    this._scrollTo = 0;
    this._applyScrollVisuals(0, 0, 1);
    this._runBootWarmup()
      .then(() => window.dispatchEvent(new CustomEvent("qs1ber:boot-ready")))
      .catch(() => window.dispatchEvent(new CustomEvent("qs1ber:boot-ready")));
  }

  /** Compile scroll/overlay shaders behind the preloader — no post-reveal hitch. */
  _runBootWarmup() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return Promise.resolve();

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        this._warmOverlayRender();
        requestAnimationFrame(() => {
          this._warmFirstScroll();
          requestAnimationFrame(() => {
            this._applyScrollVisuals(0, 0, 1);
            resolve();
          });
        });
      });
    });
  }

  _warmFirstScroll() {
    const prevFrom = this._fromChapter;
    const prevTo = this._toChapter;
    const prevOverlay = this._overlayMode;

    this._fromChapter = 0;
    this._toChapter = 1;
    this._lastBlendKey = -1;
    this._applyScrollVisuals(0, 1, 0.5);
    this.composer?.render();

    this._enterScrollPerf();
    this.scene.background = null;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.render(this.scene, this.camera);
    this._exitScrollPerf();

    this._fromChapter = prevFrom;
    this._toChapter = prevTo;
    this._overlayMode = prevOverlay;
    this._lastBlendKey = -1;
    this._applyScrollVisuals(prevFrom, prevTo, 1);
  }

  _warmOverlayRender() {
    const prevOverlay = this._overlayMode;
    this._overlayMode = true;
    if (this.decorRoot) this.decorRoot.visible = false;
    this.scene.background = null;
    this.renderer.setClearColor(0x000000, 0);
    this.composer?.render();
    this.renderer.render(this.scene, this.camera);
    this._overlayMode = prevOverlay;
    if (this.decorRoot) this.decorRoot.visible = true;
    this._prepareDecorBackground();
  }

  _applyScrollVisuals(fromChapter, toChapter, scrollT) {
    if (!this.introDone) return;

    const heroBlend = getHeroBlend(fromChapter, toChapter, scrollT, true);
    const decorBlend = getDecorBlend(fromChapter, toChapter, scrollT, true);
    const onOverlay = smileyOverlayMode(fromChapter, toChapter, scrollT);
    const blendKey = Math.round(decorBlend * 40);
    if (
      blendKey === this._lastBlendKey &&
      onOverlay === this._overlayMode &&
      onOverlay === this._smileyOpaqueMode &&
      !this.state.snapLock
    ) {
      return;
    }
    this._lastBlendKey = blendKey;

    this._heroBlend = heroBlend;
    this._decorBlend = decorBlend;
    this._overlayMode = onOverlay;
    this._scrollFrom = fromChapter;
    this._scrollTo = toChapter;

    if (this.decorMaterial) {
      this.decorMaterial.opacity = decorBlend;
      this.decorMaterial.depthWrite = decorBlend > 0.85;
    }

    if (this.decorRoot) {
      this.decorRoot.visible = decorBlend > 0.002;
    }

    this._applySmileyCompanionMaterial(onOverlay);

    const fxBlend =
      fromChapter < 1 && toChapter >= 1 && scrollT < 1 ? decorBlend : heroBlend;
    const useFx = fxBlend > 0.001 && !onOverlay;
    if (this.bokehPass) {
      this.bokehPass.enabled = useFx;
      if (this.bokehPass.uniforms?.aperture) {
        this.bokehPass.uniforms.aperture.value = BOKEH_APERTURE * fxBlend;
      }
      if (this.bokehPass.uniforms?.maxblur) {
        this.bokehPass.uniforms.maxblur.value = BOKEH_MAXBLUR * fxBlend;
      }
    }
    if (this.bloomPass) {
      this.bloomPass.enabled = useFx;
      this.bloomPass.strength = this._bloomStrength * fxBlend;
    }
  }

  _enterScrollPerf() {
    if (this._scrollPerfActive) return;
    this._scrollPerfActive = true;
    this._savedDpr = this.renderer.getPixelRatio();
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
  }

  _exitScrollPerf() {
    if (!this._scrollPerfActive) return;
    this._scrollPerfActive = false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = this._savedDpr ?? Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
    this._lastBlendKey = -1;
  }

  _tickScrollAnimation() {
    /* scroll position driven from main.js */
  }

  _getSmileyTargetPos(out, chapter, scrollT) {
    if (!this.introDone && this.smileyPivot) {
      return out.copy(this.smileyPivot.position);
    }

    this._getSmileyAnchorNdc(chapter, scrollT, this._anchorNdc);
    const depth = this._getSmileyFollowDepth();
    return this._worldPosFromNdcAtDepth(
      this._anchorNdc.x,
      this._anchorNdc.y,
      depth,
      out
    );
  }

  _shapeMaterial() {
    return this.decorMaterial || this.glassMaterial;
  }

  _glassMaterial() {
    return this.glassMaterial;
  }

  _normalizeMesh(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(this._tmpV);
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = (SHAPE_RADIUS * 2) / maxDim;
    mesh.scale.setScalar(s * SHAPE_WORLD_SCALE);
    return s * SHAPE_WORLD_SCALE;
  }

  _makePrimitive(type, seed, scaleMult = 1) {
    let geo;
    switch (type) {
      case "sphere":
        geo = new THREE.SphereGeometry(1, 28, 28);
        break;
      case "torus":
        geo = new THREE.TorusGeometry(0.72, 0.28, 20, 40);
        break;
      case "cylinder":
        geo = new THREE.CylinderGeometry(0.42, 0.42, 1.05, 20);
        break;
      case "ring":
        geo = new THREE.TorusGeometry(0.62, 0.1, 16, 40);
        break;
      default:
        geo = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
    }
    const mesh = new THREE.Mesh(geo, this._shapeMaterial());
    const uniformScale = this._normalizeMesh(mesh);
    const typeMul = TYPE_SIZE[type] ?? 1;
    const rand = seededRandom(seed);
    return {
      mesh,
      seed,
      rand,
      phase: rand() * Math.PI * 2,
      roll: rand() * Math.PI * 2,
      amp: 0.005 + rand() * 0.01,
      drift: 0.018 + rand() * 0.028,
      floatFreqX: 0.11 + rand() * 0.08,
      floatFreqY: 0.09 + rand() * 0.07,
      floatFreqZ: 0.07 + rand() * 0.06,
      rotSpeed: 0.12 + rand() * 0.18,
      spinVelX: (rand() - 0.5) * 0.26,
      spinVelY: (rand() - 0.5) * 0.32,
      spinVelZ: (rand() - 0.5) * 0.22,
      tumbleX: rand() * Math.PI * 2,
      tumbleY: rand() * Math.PI * 2,
      tumbleZ: rand() * Math.PI * 2,
      pathT: 0,
      depthOffset: 0,
      introDelay: 0,
      anchor: new THREE.Vector3(),
      baseScale: uniformScale * scaleMult * typeMul,
      isSmiley: false,
      isAmbient: false,
      userPlaced: false,
    };
  }

  /** Push shape toward/away from camera for depth layering */
  _offsetTowardCamera(from, amount, out) {
    if (!amount) {
      out.copy(from);
      return out;
    }
    this.camera.getWorldPosition(this._tmpV);
    out.copy(this._tmpV).sub(from);
    if (out.lengthSq() < 1e-6) {
      out.copy(from);
      return out;
    }
    out.normalize().multiplyScalar(amount).add(from);
    return out;
  }

  /** Never let a shape sit between camera and the smiley in the hero zone */
  _enforceSmileyClearance(pos, out) {
    if (!this.smileyPivot) {
      out.copy(pos);
      return out;
    }
    this.smileyPivot.getWorldPosition(this._tmpV);
    const horiz = Math.hypot(pos.x - this._tmpV.x, pos.y - this._tmpV.y);
    if (horiz > 3.6) {
      out.copy(pos);
      return out;
    }
    this.camera.getWorldPosition(this._tmpV3);
    const smileyDist = this._tmpV3.distanceTo(this._tmpV);
    const shapeDist = this._tmpV3.distanceTo(pos);
    if (shapeDist >= smileyDist - 0.25) {
      out.copy(pos);
      return out;
    }
    return this._offsetTowardCamera(pos, -(smileyDist - shapeDist + 1.1), out);
  }

  _finalizeShapeSlot(entry, slot) {
    if (entry.isSmiley || entry.isAmbient) return;
    if (slot.t >= SMILEY_CLEAR_T_MIN && slot.t <= SMILEY_CLEAR_T_MAX && (slot.depth ?? 0) > -1) {
      entry.depthOffset = Math.min(slot.depth ?? 0, -2.2);
    }
  }

  _spawnClonerShapes() {
    PATH_LAYOUT.forEach((slot, i) => {
      const entry = this._makePrimitive(slot.type, 1000 + i * 23, slot.scale);
      entry.slotId = `path:${slot.t}:${slot.type}`;
      entry.pathT = slot.t;
      entry.depthOffset = slot.depth ?? 0;
      entry.yOffset = slot.yOffset ?? 0;
      this._finalizeShapeSlot(entry, slot);
      entry.introDelay = i * 0.035;
      entry.mesh.visible = false;
      this.decorRoot.add(entry.mesh);
      this.shapes.push(entry);
    });
  }

  _spawnAmbientShapes() {
    AMBIENT_LAYOUT.forEach((slot, i) => {
      const entry = this._makePrimitive(slot.type, 2000 + i * 31, slot.scale);
      entry.slotId = `ambient:${i}:${slot.type}`;
      entry.isAmbient = true;
      entry.pathT = -1;
      entry.depthOffset = slot.depth ?? 0;
      entry.anchor.set(slot.pos[0], slot.pos[1], slot.pos[2]);
      entry.introDelay = 0.12 + i * 0.028;
      entry.drift *= 1.35;
      entry.spinVelX *= 0.85;
      entry.spinVelY *= 0.85;
      entry.spinVelZ *= 0.85;
      entry.mesh.visible = false;
      this.decorRoot.add(entry.mesh);
      this.shapes.push(entry);
    });
  }

  _applyShapePins() {
    for (const entry of this.shapes) {
      if (!entry.slotId || entry.isSmiley) continue;
      const pin = SHAPE_PINS[entry.slotId];
      if (!pin) continue;
      entry.isPinned = true;
      entry.userPlaced = true;
      entry.isAmbient = true;
      entry.anchor.set(pin[0], pin[1], pin[2]);
      entry.mesh.position.copy(entry.anchor);
    }
  }

  /** Dev helper — list decorative meshes */
  listShapes() {
    return this.shapes
      .filter((s) => !s.isSmiley)
      .map((s) => ({
        slotId: s.slotId,
        pinned: !!s.isPinned,
        position: {
          x: +s.mesh.position.x.toFixed(4),
          y: +s.mesh.position.y.toFixed(4),
          z: +s.mesh.position.z.toFixed(4),
        },
      }));
  }

  _registerEyeMesh(mesh, featureMat) {
    mesh.material = featureMat;
    if (mesh.userData.baseEyeScale == null) {
      mesh.userData.stretchAxis = "y";
      mesh.userData.baseEyeScale = mesh.scale.clone();
    }
    if (!this.eyeMeshes.includes(mesh)) {
      this.eyeMeshes.push(mesh);
      this.eyes = mesh;
    }
  }

  _isEyeMeshName(name, parentName = "") {
    const n = (name || "").toLowerCase();
    const p = (parentName || "").toLowerCase();
    return (
      n.includes("eye") ||
      p.includes("eye") ||
      n === "cube.004" ||
      n === "cube.005"
    );
  }

  _createSmileyPivot() {
    this.smileyPivot = new THREE.Group();
    this.smileyFaceBase = new THREE.Group();
    this.smileyHolder = new THREE.Group();
    this.smileyPitch = new THREE.Group();
    this.smileySpin = new THREE.Group();
    this.smileyLook = new THREE.Group();
    this.smileyPivot.frustumCulled = false;
    this.smileyFaceBase.frustumCulled = false;
    this.smileyHolder.frustumCulled = false;
    this.smileyPitch.frustumCulled = false;
    this.smileySpin.frustumCulled = false;
    this.smileyLook.frustumCulled = false;
    this.smileyPivot.add(this.smileyFaceBase);
    this.smileyFaceBase.add(this.smileyHolder);
    this.smileyHolder.add(this.smileyPitch);
    this.smileyPitch.add(this.smileySpin);
    this.smileySpin.add(this.smileyLook);
    this.smileyLayer.add(this.smileyPivot);
    return this.smileyPivot;
  }

  _heroPathPos(out = this._tmpV2) {
    return out.copy(this.pathCurve.getPointAt(SMILEY_PATH_T)).add(SMILEY_FRAME_OFFSET);
  }

  /** Smiley center in normalized screen space — cursor tracking is relative to this, not viewport center */
  _getSmileyLookAnchorNDC(out = this._smileyNdc) {
    if (!this.smileyPivot) {
      out.x = 0;
      out.y = 0;
      return out;
    }
    this.smileyPivot.updateWorldMatrix(true, true);
    this.smileyPivot.getWorldPosition(this._tmpV);
    this._tmpV.project(this.camera);
    out.x = this._tmpV.x;
    out.y = this._tmpV.y;
    return out;
  }

  _ensureSmileyVisible() {
    if (!this.smileyPivot || !this.introDone) return;
    this.smileyPivot.visible = true;
  }

  _lockSearchPosition() {
    this.searchBasePos.copy(this.smileyPivot.position);
    if (this.searchBasePos.lengthSq() < 0.05) {
      this._heroPathPos(this.searchBasePos);
    }
  }

  async _loadSmiley() {
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const maps = {
      face: texLoader.load(`${MODEL_BASE}/1_diffuseOriginal.png`),
      side: texLoader.load(`${MODEL_BASE}/side_1_diffuseOriginal.png`),
      normal: texLoader.load(`${MODEL_BASE}/1_normal.png`),
      roughness: texLoader.load(`${MODEL_BASE}/1_metallic.png`),
      ao: texLoader.load(`${MODEL_BASE}/1_ao.png`),
    };
    Object.values(maps).forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
    maps.normal.colorSpace = THREE.NoColorSpace;
    this._applySmileyPinkMaterial(maps);

    const sideMat = this.glassMaterial;

    const faceMat = new THREE.MeshPhysicalMaterial({
      map: maps.face,
      normalMap: maps.normal,
      roughnessMap: maps.roughness,
      aoMap: maps.ao,
      aoMapIntensity: 1,
      metalness: 0.05,
      roughness: 0.14,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.2,
      envMap: this.scene.environment,
    });
    this.smileyFaceMat = faceMat;

    const featureMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.05,
    });

    this._createSmileyPivot();
    this._wardrobeMeshes = Object.fromEntries(WARDROBE_ITEMS.map((item) => [item.id, []]));
    await this._loadWardrobeTextures(texLoader);

    const modelScale = MODEL_SCALE * SMILEY_SCALE_MULT;

    try {
      const fbx = await loader.loadAsync(SMILEY_FBX);

      fbx.traverse((child) => {
        if (!child.isMesh) return;
        const rawName = child.name || "";
        const n = rawName.toLowerCase();
        const parentName = child.parent?.name || "";
        const wardrobeItem = wardrobeItemForNode(child);

        if (wardrobeItem) {
          this._applyWardrobeMaterial(child, wardrobeItem.id, rawName);
          child.visible = false;
          child.frustumCulled = false;
          this._wardrobeMeshes[wardrobeItem.id].push(child);
          return;
        }

        if (this._isEyeMeshName(n, parentName)) {
          this._registerEyeMesh(child, featureMat);
        } else if (n.includes("mouth")) {
          child.material = featureMat;
          this.mouth = child;
          this.mouth.position.copy(MOUTH_HAPPY.position);
          this.mouth.rotation.copy(MOUTH_HAPPY.rotation);
        } else if (n.includes("007")) {
          child.material = faceMat;
          this.facePlate = child;
        } else if (n.includes("cube")) {
          child.material = sideMat;
          this.body = child;
        } else {
          child.material = sideMat;
        }
      });

      fbx.scale.setScalar(modelScale);
      fbx.rotation.set(FACE_AXIS_FIX.x, FACE_AXIS_FIX.y, FACE_AXIS_FIX.z);
      fbx.frustumCulled = false;
      this.smileyRoot = fbx;
      this.smileyLook.add(fbx);
      this._syncEyeClickBlock();

      if (this.introDone) {
        this.smileyPivot.visible = true;
        this._heroPathPos(this.smileyPivot.position);
        this._resetSmileyFace();
      } else {
        this.smileyPivot.visible = false;
        this._resetSmileyFace();
      }

      this.smileyEntry = {
        mesh: this.smileyPivot,
        seed: 42,
        rand: seededRandom(42),
        phase: 0,
        amp: 0.01,
        rotSpeed: 0.2,
        pathT: SMILEY_PATH_T,
        baseScale: modelScale,
        isSmiley: true,
      };

      this._spawnShapesOnce();
      this.state.sceneReady = true;
      window.dispatchEvent(new CustomEvent("qs1ber:scene-ready"));
    } catch (err) {
      console.error("[SmileyScene] FBX load failed", err);
      this._buildFallbackSmiley(modelScale);
      this._spawnShapesOnce();
      this.state.sceneReady = true;
      window.dispatchEvent(new CustomEvent("qs1ber:scene-ready"));
    }
  }

  _texUrl(path) {
    return encodeURI(path).replace(/#/g, "%23");
  }

  _loadTex(texLoader, url, colorSpace = THREE.SRGBColorSpace) {
    return new Promise((resolve) => {
      texLoader.load(
        this._texUrl(url),
        (tex) => {
          tex.colorSpace = colorSpace;
          tex.anisotropy = 8;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  async _loadWardrobeTextures(texLoader) {
    const env = this.scene.environment;
    const loadPBR = async (base, prefix, ext = "png") => {
      const map = await this._loadTex(texLoader, `${base}/${prefix}_BaseColor.${ext}`);
      const normalMap = await this._loadTex(texLoader, `${base}/${prefix}_Normal.${ext}`, THREE.NoColorSpace);
      const roughnessMap = await this._loadTex(texLoader, `${base}/${prefix}_Roughness.${ext}`, THREE.NoColorSpace);
      const metalnessMap = await this._loadTex(texLoader, `${base}/${prefix}_Metallic.${ext}`, THREE.NoColorSpace);
      return { map, normalMap, roughnessMap, metalnessMap, envMap: env };
    };

    const mlgBase = `${WARDROBE_TEX}/mlg glasses/images`;
    for (const part of ["Glass", "Clips", "Mid"]) {
      const prefix = `Deal with it sunglasses_${part}`;
      this._wardrobeTex[`gl-mlg-${part}`] = await loadPBR(mlgBase, prefix);
    }

    this._wardrobeTex["ht-cowboy"] = {
      map: await this._loadTex(texLoader, `${WARDROBE_TEX}/cowboy hat/images/cowboy_1001_BaseColor.jpg`),
      normalMap: await this._loadTex(texLoader, `${WARDROBE_TEX}/cowboy hat/images/cowboy_1001_Normal.jpg`, THREE.NoColorSpace),
      roughnessMap: await this._loadTex(texLoader, `${WARDROBE_TEX}/cowboy hat/images/cowboy_1001_Roughness.jpg`, THREE.NoColorSpace),
      metalnessMap: await this._loadTex(texLoader, `${WARDROBE_TEX}/cowboy hat/images/cowboy_1001_Metalness.jpg`, THREE.NoColorSpace),
      envMap: env,
    };

    const seniorBase = `${WARDROBE_TEX}/hat senior/textures`;
    const seniorColor = await this._loadTex(texLoader, `${seniorBase}/hat1_Base_color.png`);
    const seniorNormal = await this._loadTex(texLoader, `${seniorBase}/hat1_Normal_OpenGL.png`, THREE.NoColorSpace);
    const seniorRough = await this._loadTex(texLoader, `${seniorBase}/hat1_Roughness3.png`, THREE.NoColorSpace);
    const seniorMetal = await this._loadTex(texLoader, `${seniorBase}/hat1_Metallic.png`, THREE.NoColorSpace);
    const seniorAo = await this._loadTex(texLoader, `${seniorBase}/hat1_Mixed_AO.png`, THREE.NoColorSpace);
    this._wardrobeTex["ht-senior"] = {
      map: seniorColor,
      normalMap: seniorNormal,
      roughnessMap: seniorRough,
      metalnessMap: seniorMetal,
      aoMap: seniorAo,
      aoMapIntensity: 1,
      envMap: env,
    };
  }

  _makeWardrobeMaterial(maps, { transparent = false, transmission = 0 } = {}) {
    return new THREE.MeshPhysicalMaterial({
      map: maps.map ?? null,
      normalMap: maps.normalMap ?? null,
      roughnessMap: maps.roughnessMap ?? null,
      metalnessMap: maps.metalnessMap ?? null,
      aoMap: maps.aoMap ?? null,
      aoMapIntensity: maps.aoMapIntensity ?? 1,
      envMap: maps.envMap ?? null,
      color: 0xffffff,
      metalness: 0.08,
      roughness: 0.45,
      envMapIntensity: 1.1,
      transparent,
      transmission,
    });
  }

  _applyWardrobeMaterial(mesh, itemId, rawName) {
    let maps = this._wardrobeTex[itemId];
    if (itemId === "gl-mlg") {
      const part = rawName.match(/Glasses_(\w+)_/i)?.[1] || "Glass";
      maps = this._wardrobeTex[`gl-mlg-${part}`] || this._wardrobeTex["gl-mlg-Glass"];
    }
    if (!maps) return;
    const isGlassLens = itemId === "gl-mlg" && /glass/i.test(rawName);
    mesh.material = this._makeWardrobeMaterial(maps, {
      transparent: isGlassLens,
      transmission: isGlassLens ? 0.35 : 0,
    });
  }

  _setWardrobeItemVisible(itemId, visible) {
    const meshes = this._wardrobeMeshes[itemId];
    if (!meshes) return;
    for (const mesh of meshes) mesh.visible = visible;
  }

  _syncEyeClickBlock() {
    const glassesId = this._accessorySlots.glasses;
    const item = WARDROBE_ITEMS.find((i) => i.id === glassesId);
    this._eyeClickBlocked = !!item?.blocksEyeClick;
  }

  equipAccessory(category, itemId) {
    this._accessorySlots[category] = itemId;
    for (const item of WARDROBE_ITEMS.filter((i) => i.category === category)) {
      this._setWardrobeItemVisible(item.id, itemId === item.id);
    }
    this._syncEyeClickBlock();
  }

  _buildFallbackSmiley(modelScale) {
    if (!this.smileyPivot) this._createSmileyPivot();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 4, 4, 4), this._glassMaterial());
    body.scale.setScalar(modelScale);
    this.smileyRoot = body;
    this.smileyLook.add(body);
    this.smileyPivot.visible = false;
    this._resetSmileyFace();
    this.smileyEntry = {
      mesh: this.smileyPivot,
      seed: 42,
      rand: seededRandom(42),
      phase: 0,
      amp: 0.01,
      rotSpeed: 0.2,
      pathT: SMILEY_PATH_T,
      baseScale: modelScale,
      isSmiley: true,
    };
  }

  _pointerWorldTarget(out) {
    this.raycaster.setFromCamera({ x: this.pointer.nx, y: this.pointer.ny }, this.camera);
    const plane = new THREE.Plane();
    this.camera.getWorldDirection(this._tmpV3);
    plane.setFromNormalAndCoplanarPoint(this._tmpV3, this.smileyPivot.position);
    return this.raycaster.ray.intersectPlane(plane, out);
  }

  _resetSmileyFace() {
    this.cubeRotX = 0;
    this.cubeRotY = 0;
    this.cubeRotXDest = 0;
    this.cubeRotYDest = 0;
    this.spinTween = null;
    this.lookOdds = LOOK_ODDS_START;
    this.lookTimer = 0;
    this.isHappy = true;
    if (this.smileyFaceBase) this.smileyFaceBase.rotation.set(0, 0, 0);
    if (this.smileyHolder) this.smileyHolder.rotation.set(0, 0, 0);
    if (this.smileyPitch) this.smileyPitch.rotation.set(0, 0, 0);
    if (this.smileySpin) this.smileySpin.rotation.set(0, 0, 0);
    if (this.smileyPivot) {
      this.smileyPivot.quaternion.identity();
      this.smileyPivot.rotation.set(0, 0, 0);
    }
    if (this.smileyLook) this.smileyLook.quaternion.identity();
    this._setMouthPose("happy");
  }

  _orientFaceToCamera() {
    if (!this.smileyFaceBase || !this.smileyPivot) return;
    this.camera.getWorldPosition(this._tmpV2);
    this.smileyFaceBase.lookAt(this._tmpV2);
  }

  _applyRefRotation(dt) {
    const step = Math.min(dt * 60, 2.5) / CHR_EASE_VAL;
    this.cubeRotX += (this.cubeRotXDest - this.cubeRotX) * step;
    this.cubeRotY += (this.cubeRotYDest - this.cubeRotY) * step;
    if (this.smileyHolder) this.smileyHolder.rotation.y = this.cubeRotY;
    if (this.smileyPitch) this.smileyPitch.rotation.x = this.cubeRotX;
  }

  _updatePointerDest() {
    if (!this.pointer.active || !this.isHappy) return;
    const anchor = this._getSmileyLookAnchorNDC();
    const relX = this.pointer.nx - anchor.x;
    const relY = this.pointer.ny - anchor.y;
    this.cubeRotYDest = relX * TRACK_AMP;
    this.cubeRotXDest = -relY * TRACK_AMP;
  }

  _lookAround() {
    if (Math.floor(Math.random() * this.lookOdds) === 0) {
      this.lookOdds = Math.min(LOOK_ODDS_MAX, this.lookOdds + LOOK_ODDS_INC);
      this.cubeRotXDest = (1 - Math.random() * 2) * TRACK_AMP;
      this.cubeRotYDest = (1 - Math.random() * 2) * TRACK_AMP;
    } else {
      this.lookOdds = Math.max(LOOK_ODDS_MIN, this.lookOdds - LOOK_ODDS_DEC);
    }
  }

  _isSpinFaceVisible() {
    const twoPi = Math.PI * 2;
    const y = this.smileySpin ? this.smileySpin.rotation.y : 0;
    const a = ((y % twoPi) + twoPi) % twoPi;
    const dist = Math.min(a, twoPi - a);
    return dist < SPIN_FACE_HIDE_ANGLE;
  }

  _updateSpinMouthCut() {
    const visible = this._isSpinFaceVisible();
    if (visible === this._spinFaceVisible) return;
    this._spinFaceVisible = visible;
    this._setMouthPose(this.isHappy ? "happy" : "sad");
  }

  _triggerMoodSpin() {
    if (this.spinTween && this.smileySpin) {
      this.smileySpin.rotation.y = 0;
      this.spinTween = null;
    }
    this.spinTween = {
      from: 0,
      to: SPIN_DELTA,
      t: 0,
      dur: SPIN_DURATION,
    };
    this._spinFaceVisible = true;
  }

  _updateMoodSpin(dt) {
    if (!this.spinTween || !this.smileySpin) return;
    this.spinTween.t += dt;
    const u = clamp(this.spinTween.t / this.spinTween.dur, 0, 1);
    const e = elasticEaseOut(u);
    this.smileySpin.rotation.y = lerp(this.spinTween.from, this.spinTween.to, e);
    this._updateSpinMouthCut();
    if (u >= 1) {
      this.smileySpin.rotation.y = 0;
      this.spinTween = null;
      this._setMouthPose(this.isHappy ? "happy" : "sad");
    }
  }

  _bindEvents() {
    window.addEventListener("resize", () => this._onResize());
    window.addEventListener("pointermove", (e) => this._onPointerMove(e));
    window.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    window.addEventListener("pointerup", (e) => this._onPointerUp(e));
    document.documentElement.addEventListener("pointerleave", () => this._onPointerLost());
    window.addEventListener("blur", () => this._onPointerLost());
    document.addEventListener("keydown", (e) => this._onKeyDown(e), true);
  }

  _isTypingTarget(target) {
    if (!target || target === this.canvas) return false;
    const el = target.nodeType === 1 ? target : null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  _isUiClickTarget(target, clientX, clientY) {
    if (!target || target === this.canvas) return false;
    if (
      target.closest(
        "a, button, input, textarea, select, label, .chapter-rail, .project-strip, .project-strip__item, .project-viewer, .project-viewer__stage, .project-viewer__nav, .project-viewer__yt-ui, .contact__links, .wardrobe, .wardrobe-toggle, #wardrobeToggle, #wardrobePanel"
      )
    ) {
      return true;
    }
    if (typeof window.__wardrobePointerHit === "function" && clientX != null && clientY != null) {
      return !!window.__wardrobePointerHit(clientX, clientY);
    }
    return false;
  }

  _showEditHint(show) {
    const el = document.getElementById("editHint");
    if (el) el.hidden = !show;
  }

  /** World point under cursor on the focal plane (same depth slice as the hero) */
  _pickWorldPoint(clientX, clientY, out) {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    const nx = ((clientX - rect.left) / w) * 2 - 1;
    const ny = -((clientY - rect.top) / h) * 2 + 1;
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);

    this.camera.getWorldDirection(this._tmpV3);
    if (this.smileyPivot) {
      this.smileyPivot.getWorldPosition(this._tmpV2);
    } else {
      this._tmpV2.copy(this._cameraLook);
    }

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(this._tmpV3, this._tmpV2);
    if (this.raycaster.ray.intersectPlane(plane, out)) {
      return true;
    }

    const depth = this.camera.position.distanceTo(this._tmpV2);
    const ndc = this._spawnNdc.set(nx, ny, 0.5).unproject(this.camera);
    ndc.sub(this.camera.position).normalize();
    out.copy(this.camera.position).addScaledVector(ndc, depth);
    return true;
  }

  _spawnShapeAt(worldPos) {
    const pos = this._spawnPoint.copy(worldPos);
    const type = SPAWN_TYPES[this._spawnSeed % SPAWN_TYPES.length];
    this._spawnSeed += 17;
    const scale = 0.72 + (this._spawnSeed % 100) * 0.004;
    const entry = this._makePrimitive(type, this._spawnSeed, scale);
    entry.isAmbient = true;
    entry.userPlaced = true;
    entry.pathT = -1;
    entry.depthOffset = 0;
    entry.anchor.copy(pos);
    entry.mesh.position.copy(pos);
    entry.mesh.quaternion.identity();
    entry.mesh.scale.setScalar(0);
    entry.mesh.visible = true;
    entry.spawnAnim = { t: 0, dur: 0.62 };
    this.decorRoot.add(entry.mesh);
    this.shapes.push(entry);
    this._selectEntry(entry, "translate");
    return entry;
  }

  _updateSpawnAnim(s, dt) {
    if (!s.spawnAnim) return;
    s.spawnAnim.t += dt;
    const u = clamp(s.spawnAnim.t / s.spawnAnim.dur, 0, 1);
    s.mesh.scale.setScalar(s.baseScale * snapBounce(u));
    if (u >= 1) {
      s.spawnAnim = null;
      s.mesh.scale.setScalar(s.baseScale);
    }
  }

  _clientToNdc(clientX, clientY, out = { x: 0, y: 0 }) {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    out.x = ((clientX - rect.left) / w) * 2 - 1;
    out.y = -((clientY - rect.top) / h) * 2 + 1;
    return out;
  }

  _applyEyeScale(factor) {
    for (const eye of this.eyeMeshes) {
      const axis = eye.userData.stretchAxis ?? "y";
      const base = eye.userData.baseEyeScale;
      if (base) {
        eye.scale.copy(base);
        if (axis === "x") eye.scale.x = base.x * factor;
        else if (axis === "y") eye.scale.y = base.y * factor;
        else eye.scale.z = base.z * factor;
      } else {
        const baseY = eye.userData.baseEyeScaleY ?? 1;
        eye.scale.y = baseY * factor;
      }
    }
    if (this.eyes && !this.eyeMeshes.includes(this.eyes)) {
      const baseY = this.eyes.userData.baseEyeScaleY ?? 1;
      this.eyes.scale.y = baseY * factor;
    }
  }

  _pickEntryAt(clientX, clientY) {
    const ndc = this._clientToNdc(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.camera);

    const targets = [];
    if (this.smileyRoot) {
      this.smileyRoot.traverse((child) => {
        if (child.isMesh) targets.push(child);
      });
    }
    for (const s of this.shapes) {
      if (s.mesh.visible) targets.push(s.mesh);
    }

    const hits = this.raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;
    return this._findEntryFromHit(hits[0].object);
  }

  _findEntryFromHit(object) {
    let node = object;
    while (node) {
      if (this.smileyPivot && (node === this.smileyPivot || node === this.smileyRoot)) {
        return this.smileyEntry;
      }
      for (const s of this.shapes) {
        if (!s.isSmiley && node === s.mesh) return s;
      }
      node = node.parent;
    }
    return null;
  }

  _selectEntry(entry, mode = "translate") {
    this.selectedEntry = entry;
    const target = entry.isSmiley ? this.smileyPivot : entry.mesh;
    this.transformControls.setMode(mode);
    this.transformControls.attach(target);
    this._showEditHint(true);
    if (entry.isSmiley) {
      this.searchBasePos.copy(this.smileyPivot.position);
    } else if (!entry.userPlaced) {
      entry.userPlaced = true;
      entry.isAmbient = true;
      entry.anchor.copy(entry.mesh.position);
    }
  }

  _deselectEntry() {
    this.transformControls.detach();
    this.selectedEntry = null;
    this._showEditHint(false);
  }

  _onKeyDown(e) {
    if (!this.introDone || !this.selectedEntry) return;
    if (this._isTypingTarget(document.activeElement)) return;

    switch (e.code) {
      case "KeyE":
        this.transformControls.setMode("translate");
        e.preventDefault();
        break;
      case "KeyR":
        this.transformControls.setMode("rotate");
        e.preventDefault();
        break;
      case "KeyT":
        this.transformControls.setMode("scale");
        e.preventDefault();
        break;
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight": {
        if (this.selectedEntry.isSmiley) break;
        const step = e.shiftKey ? 0.2 : 0.06;
        const pos = this.selectedEntry.anchor;
        if (e.code === "ArrowUp") pos.y += step;
        if (e.code === "ArrowDown") pos.y -= step;
        if (e.code === "ArrowLeft") pos.x -= step;
        if (e.code === "ArrowRight") pos.x += step;
        this.selectedEntry.mesh.position.copy(pos);
        e.preventDefault();
        break;
      }
      case "Escape":
        this._deselectEntry();
        e.preventDefault();
        break;
      default:
        break;
    }
  }

  _updateBokehFocus() {
    if (!this.bokehPass?.enabled || !this.smileyPivot) return;
    const focusObj = this.smileyLook || this.smileyPivot;
    focusObj.getWorldPosition(this._tmpV);
    this.bokehPass.uniforms.focus.value = this.camera.position.distanceTo(this._tmpV);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
    if (this.bokehPass?.uniforms?.aspect) {
      this.bokehPass.uniforms.aspect.value = w / h;
    }
  }

  _onPointerMove(e) {
    if (this._gizmoDragging) return;
    this.pointer.active = true;
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;

    if (!this.isHappy) {
      this._onPointerFound();
    }
  }

  _onPointerFound() {
    if (this.isHappy) return;
    this._setMood("happy");
    this._updatePointerDest();
    this._triggerMoodSpin();
  }

  _onPointerLost() {
    if (!this.introDone || !this.isHappy || this.selectedEntry) return;
    this.pointer.active = false;
    this._lockSearchPosition();
    this._setMood("searching");
    this.lookOdds = LOOK_ODDS_START;
    this.lookTimer = 0;
    this.cubeRotXDest = 0;
    this.cubeRotYDest = 0;
    this._triggerMoodSpin();
  }

  _onPointerDown(e) {
    if (e.button !== 0 || this._isUiClickTarget(e.target, e.clientX, e.clientY)) {
      this._pointerDownAt = null;
      this._pointerDownUi = true;
      return;
    }
    this._pointerDownUi = false;
    this._pointerDownAt = { x: e.clientX, y: e.clientY };
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;

    if (
      this.smileyPivot?.visible &&
      (this.introDone || this.introProgress >= 0.98) &&
      !this._eyeClickBlocked
    ) {
      this._stretchEyesToClick();
    }
  }

  _onPointerUp(e) {
    if (!this.introDone || !this._pointerDownAt || this._pointerDownUi || this._isUiClickTarget(e.target, e.clientX, e.clientY)) {
      this._pointerDownAt = null;
      this._pointerDownUi = false;
      return;
    }
    if (this._gizmoDragging) {
      this._pointerDownAt = null;
      return;
    }

    const drag = Math.hypot(
      e.clientX - this._pointerDownAt.x,
      e.clientY - this._pointerDownAt.y
    );
    if (drag > 8) {
      this._pointerDownAt = null;
      return;
    }

    const entry = this._pickEntryAt(e.clientX, e.clientY);

    if (entry) {
      const now = performance.now();
      const rapid =
        entry === this._lastSelectEntry && now - this._lastSelectAt < DOUBLE_CLICK_MS;
      const mode = this._gizmoModeFromClick(rapid);
      this._lastSelectAt = now;
      this._lastSelectEntry = entry;
      this._selectEntry(entry, mode);
      this._pointerDownAt = null;
      return;
    }

    if (!this.transformControls.axis) {
      const cx = this._pointerDownAt.x;
      const cy = this._pointerDownAt.y;
      if (this._pickWorldPoint(cx, cy, this._spawnPoint)) {
        this._spawnShapeAt(this._spawnPoint);
      } else {
        this._deselectEntry();
      }
    }
    this._pointerDownAt = null;
  }

  _stretchEyesToClick() {
    if (!this.eyes && this.eyeMeshes.length === 0) return;
    this.mood = "shocked";

    const now = performance.now();
    if (
      this._eyeStretchLastClickAt != null &&
      now - this._eyeStretchLastClickAt > EYE_STRETCH_IDLE_MS
    ) {
      this._eyeStretchClicks = 0;
    }
    this._eyeStretchLastClickAt = now;

    this._eyeStretchClicks += 1;
    const peak = EYE_STRETCH_FIRST + (this._eyeStretchClicks - 1) * EYE_STRETCH_STEP;

    this.eyeState.anim = {
      phase: "stretch",
      t: 0,
      peak,
      from: this.eyeState.scaleY,
      releaseTo: this.eyeState.restScale,
    };
  }

  _updateEyeAnim(dt) {
    if (!this.eyeMeshes.length && !this.eyes) return;

    const anim = this.eyeState.anim;
    const rest = this.eyeState.restScale ?? 1;
    if (!anim) {
      if (Math.abs(this.eyeState.scaleY - rest) > 0.001) {
        this.eyeState.scaleY = damp(this.eyeState.scaleY, rest, 8, dt);
      } else {
        this.eyeState.scaleY = rest;
      }
      this._applyEyeScale(this.eyeState.scaleY);
      return;
    }

    anim.t += dt;

    if (anim.phase === "stretch") {
      const u = clamp(anim.t / EYE_STRETCH_IN, 0, 1);
      const e = elasticEaseOut(u, EYE_ELASTIC_PERIOD);
      this.eyeState.scaleY = anim.from + (anim.peak - anim.from) * e;
      if (u >= 1) {
        anim.phase = "hold";
        anim.t = 0;
        this.eyeState.scaleY = anim.peak;
      }
    } else if (anim.phase === "hold") {
      this.eyeState.scaleY = anim.peak;
      if (anim.t >= EYE_STRETCH_HOLD) {
        anim.phase = "release";
        anim.t = 0;
        anim.from = anim.peak;
      }
    } else if (anim.phase === "release") {
      const releaseTo = anim.releaseTo ?? rest;
      const u = clamp(anim.t / EYE_STRETCH_OUT, 0, 1);
      const e = elasticEaseOut(u, EYE_ELASTIC_PERIOD);
      this.eyeState.scaleY = anim.from + (releaseTo - anim.from) * e;
      if (u >= 1) {
        this.eyeState.anim = null;
        this.eyeState.scaleY = releaseTo;
        this._setMood("happy");
      }
    }

    this._applyEyeScale(this.eyeState.scaleY);
  }

  _setMouthPose(target) {
    if (!this.mouth) return;
    this.mouthAnim = null;
    const pose = target === "sad" ? MOUTH_SAD : MOUTH_HAPPY;
    this.mouth.position.copy(pose.position);
    this.mouth.rotation.copy(pose.rotation);
  }

  _setMood(m) {
    this.mood = m;
    if (m === "happy") {
      this.isHappy = true;
    } else if (m === "searching" || m === "sad") {
      this.isHappy = false;
    }
  }

  _shapeFloatOffset(s, time, out) {
    out.x = Math.sin(time * s.floatFreqX + s.phase) * s.drift;
    out.y = Math.cos(time * s.floatFreqY + s.phase * 1.3) * s.drift * 0.72;
    out.z = Math.sin(time * s.floatFreqZ + s.phase * 0.7) * s.drift * 0.58;
    out.x += Math.sin(time * s.rotSpeed + s.phase * 2) * s.amp;
    out.y += Math.cos(time * s.rotSpeed * 1.17 + s.phase) * s.amp * 0.65;
    return out;
  }

  _applyShapeTumble(s, dt) {
    s.tumbleX += s.spinVelX * dt;
    s.tumbleY += s.spinVelY * dt;
    s.tumbleZ += s.spinVelZ * dt;
    this._eulerScratch.set(s.tumbleX, s.tumbleY, s.tumbleZ, "XYZ");
    this._tumbleQuat.setFromEuler(this._eulerScratch);
  }

  _animateShapeAmbient(s, dt, time) {
    this._applyShapeTumble(s, dt);
    this._offsetTowardCamera(s.anchor, s.depthOffset, this._tmpV2);
    this._enforceSmileyClearance(this._tmpV2, this._tmpV2);
    this._shapeFloatOffset(s, time, this._tmpV3);
    s.mesh.position.set(
      this._tmpV2.x + this._tmpV3.x,
      this._tmpV2.y + this._tmpV3.y,
      this._tmpV2.z + this._tmpV3.z
    );
    s.mesh.quaternion.copy(this._tumbleQuat);
  }

  _animateShapeOnPath(s, pathT, dt, time) {
    const pathPos = this.pathCurve.getPointAt(pathT);
    if (s.yOffset) pathPos.y += s.yOffset;
    this._offsetTowardCamera(pathPos, s.depthOffset, this._tmpV2);
    this._enforceSmileyClearance(this._tmpV2, this._tmpV2);
    const pos = this._tmpV2;
    const tangent = this.pathCurve.getTangentAt(pathT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const stableUp = new THREE.Vector3().crossVectors(tangent, side).normalize();
    this._lookMat.lookAt(pos, pos.clone().add(tangent), stableUp);
    this._pathQuat.setFromRotationMatrix(this._lookMat);
    if (s.roll) {
      this._rollQuat.setFromAxisAngle(stableUp, s.roll);
      this._pathQuat.multiply(this._rollQuat);
    }

    this._applyShapeTumble(s, dt);
    this._shapeFloatOffset(s, time, this._tmpV3);
    s.mesh.position.set(
      pos.x + this._tmpV3.x,
      pos.y + this._tmpV3.y,
      pos.z + this._tmpV3.z
    );
    s.mesh.quaternion.copy(this._pathQuat).multiply(this._tumbleQuat);
  }

  _shouldPauseIdleMotion(entry) {
    const mode = this.transformControls.mode;
    return (
      entry === this.selectedEntry &&
      (this._gizmoDragging || mode === "rotate" || mode === "scale")
    );
  }

  _shouldLockShapeScale(entry) {
    return (
      entry === this.selectedEntry &&
      this._gizmoDragging &&
      this.transformControls.mode === "scale"
    );
  }

  _animateShapeIdle(s, dt, time) {
    if (s.spawnAnim) return;
    if (s.anchor.lengthSq() < 1e-6) {
      s.anchor.copy(s.mesh.position);
    }
    this._applyShapeTumble(s, dt);
    this._shapeFloatOffset(s, time, this._tmpV3);
    s.mesh.position.set(
      s.anchor.x + this._tmpV3.x,
      s.anchor.y + this._tmpV3.y,
      s.anchor.z + this._tmpV3.z
    );
    s.mesh.quaternion.copy(this._tumbleQuat);
  }

  _updateIntroSmiley(eased) {
    if (!this.smileyPivot) return;
    const startT = Math.max(0, SMILEY_PATH_T - 0.55);
    const local = clamp((eased - startT) / (1 - startT + 0.001), 0, 1);
    if (local <= 0) {
      this.smileyPivot.visible = false;
      return;
    }
    this.smileyPivot.visible = true;
    const travelT = flowEase(local);
    if (travelT >= 0.985) {
      this._heroPathPos(this.smileyPivot.position);
    } else {
      this.smileyPivot.position.copy(this.pathCurve.getPointAt(SMILEY_PATH_T * travelT));
    }
    this.smileyPivot.quaternion.identity();
    this.smileyPivot.rotation.set(0, 0, 0);
  }

  _updateIntro(dt) {
    if (this.introDone) return;
    this.introProgress = Math.min(1, this.introProgress + dt * 0.52);
    const eased = flowEase(this.introProgress);
    const t = this.clock.elapsedTime;

    this._updateIntroSmiley(eased);

    for (const s of this.shapes) {
      const startT = s.isAmbient
        ? s.introDelay
        : Math.max(0, s.pathT - 0.55);
      const local = clamp((eased - startT) / (1 - startT + 0.001), 0, 1);
      if (local <= 0) {
        s.mesh.visible = false;
        continue;
      }
      s.mesh.visible = true;
      const travelT = flowEase(local);
      const pop = snapBounce(local);

      if (s.isAmbient) {
        this._animateShapeAmbient(s, dt, t);
      } else {
        this._animateShapeOnPath(s, s.pathT * travelT, dt, t);
      }
      s.mesh.scale.setScalar(s.baseScale * pop);
    }

    if (this.introProgress >= 1) {
      this.introDone = true;
      this._applyShapePins();
      if (this.smileyPivot) {
        this.smileyPivot.visible = true;
        this._heroPathPos(this.smileyPivot.position);
      }
      this._resetSmileyFace();
      this._onIntroComplete();
      window.dispatchEvent(new CustomEvent("qs1ber:intro-done"));
    }
  }

  _updateSmileyLook(dt) {
    if (!this.smileyPivot) return;
    this._ensureSmileyVisible();

    const chapter = this.state.chapterIndex;
    const scrollT = this.state.chapterT;
    const followAmount = this._getFollowAmount(chapter, scrollT);
    const fromCh = this._fromChapter ?? chapter;
    const toCh = this._toChapter ?? chapter;
    let companionScale = FOLLOW_SCALE;
    if (followAmount > 0) {
      if (fromCh >= 1 && toCh >= 1 && scrollT < 1) {
        companionScale = lerp(
          this._companionScaleForChapter(fromCh),
          this._companionScaleForChapter(toCh),
          scrollT
        );
      } else {
        companionScale = this._companionScaleForChapter(scrollT >= 1 ? chapter : toCh);
      }
    }
    const scaleMult = lerp(1, companionScale, followAmount);
    const smileyEdit =
      this.selectedEntry?.isSmiley &&
      (this._gizmoDragging ||
        this.transformControls.mode === "rotate" ||
        this.transformControls.mode === "scale");

    this._getSmileyTargetPos(this._tmpV, chapter, scrollT);

    const trackCursor = this.pointer.active && this.isHappy && !smileyEdit;
    const searching = !this.isHappy && !smileyEdit;
    const snapping = this.state.snapLock || scrollT < 1;
    const moveSpeed = snapping ? 16 : 4.5;

    if (this.introDone && !smileyEdit) {
      if (searching) {
        this.smileyPivot.position.copy(this.searchBasePos);
      } else if (snapping) {
        this.smileyPivot.position.copy(this._tmpV);
      } else {
        this.smileyPivot.position.lerp(this._tmpV, 1 - Math.exp(-moveSpeed * dt));
      }
    }

    if (trackCursor) {
      this._updatePointerDest();
    }

    if (searching && !this.spinTween) {
      this.lookTimer += dt;
      if (this.lookTimer >= LOOK_INTERVAL) {
        this.lookTimer = 0;
        this._lookAround();
      }
    }

    if (!smileyEdit) {
      this._orientFaceToCamera();

      if (trackCursor || searching) {
        this._applyRefRotation(dt);
      }

      this._updateMoodSpin(dt);

      if (!this.spinTween && this.smileySpin) {
        this.smileySpin.rotation.y = 0;
      }
    }

    if (this.smileyRoot) {
      const base = MODEL_SCALE * SMILEY_SCALE_MULT * scaleMult;
      const s = Number.isFinite(base) && base > 0 ? base : MODEL_SCALE * SMILEY_SCALE_MULT;
      this.smileyRoot.scale.setScalar(s);
    }

    this._updateEyeAnim(dt);
  }

  _updateCamera(dt) {
    const wardrobeTarget = this._wardrobeOpen ? 1 : 0;
    this._wardrobeBlend = damp(this._wardrobeBlend, wardrobeTarget, WARDROBE_BLEND_SPEED, dt);
    const wb = this._wardrobeBlend;

    if (this.state.snapLock && wb < 0.001) return;

    const basePos = new THREE.Vector3(0.35, 0.05, 12.2);
    const baseLook = new THREE.Vector3(0.45, -0.08, 0.2);
    const targetPos = basePos.clone().lerp(WARDROBE_CAMERA_POS, wb);
    const targetLook = baseLook.clone().lerp(WARDROBE_CAMERA_LOOK, wb);

    const parallaxScale = 1 - wb * 0.88;
    const parallaxX = this.pointer.active ? this.pointer.nx * 0.04 * parallaxScale : 0;
    const parallaxY = this.pointer.active ? this.pointer.ny * 0.028 * parallaxScale : 0;

    this.camera.position.x = damp(this.camera.position.x, targetPos.x + parallaxX, 3.5, dt);
    this.camera.position.y = damp(this.camera.position.y, targetPos.y + parallaxY, 3.5, dt);
    this.camera.position.z = damp(this.camera.position.z, targetPos.z, 3.5, dt);
    this._tmpV2.set(
      targetLook.x + parallaxX * 0.1,
      targetLook.y + parallaxY * 0.07,
      targetLook.z
    );
    this.camera.lookAt(this._tmpV2);

    if (this.decorMaterial && wb > 0.001) {
      const decorBase = this._decorBlend ?? 1;
      this.decorMaterial.opacity = decorBase * (1 - wb * 0.82);
    } else if (this.decorMaterial && this._decorBlend != null) {
      this.decorMaterial.opacity = this._decorBlend;
    }

    if (this.bokehPass?.uniforms?.aperture && wb > 0.001) {
      const fx = (this._heroBlend ?? 1) * (1 - wb * 0.72);
      this.bokehPass.uniforms.aperture.value = BOKEH_APERTURE * fx;
    }
  }

  setWardrobeOpen(open) {
    this._wardrobeOpen = !!open;
    if (!open && this.decorMaterial && this._decorBlend != null) {
      this.decorMaterial.opacity = this._decorBlend;
    }
  }

  _prepareDecorBackground() {
    this.scene.background = this._heroBg;
    this.renderer.setClearColor(this._heroBg, 1);
  }

  _renderFrame() {
    if (!this.introDone) {
      this._prepareDecorBackground();
      this.composer?.render();
      return;
    }

    const useLite =
      this.state.snapLock && this._overlayMode && this.state.chapterT >= 0.35;

    if (this._overlayMode) {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
    } else if (this._heroBlend > 0.001) {
      this._prepareDecorBackground();
    } else {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
    }

    if (useLite) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer?.render();
    }

    if (this.selectedEntry) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.transformControls.getHelper(), this.camera);
      this.renderer.autoClear = true;
    }
  }

  _animate() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    if (!this.introDone) {
      this._updateIntro(dt);
    } else if (this._heroBlend > 0.02 && !this.state.snapLock) {
      for (const s of this.shapes) {
        if (!s.mesh.visible) continue;

        if (s.spawnAnim) {
          this._updateSpawnAnim(s, dt);
          continue;
        }

        const pauseMotion = this._shouldPauseIdleMotion(s);

        if (s.userPlaced || s === this.selectedEntry) {
          if (!pauseMotion) {
            this._animateShapeIdle(s, dt, t);
          }
          if (!this._shouldLockShapeScale(s)) {
            s.mesh.scale.setScalar(s.baseScale);
          }
          continue;
        }

        if (s.isAmbient) {
          this._animateShapeAmbient(s, dt, t);
        } else {
          this._animateShapeOnPath(s, s.pathT, dt, t);
        }
        s.mesh.scale.setScalar(s.baseScale);
      }
    }

    this._tickScrollAnimation();
    this._updateCamera(dt);
    this._updateSmileyLook(dt);
    this._updateBokehFocus();

    this._renderFrame();
    requestAnimationFrame(this._animate);
  }

  beginTransition(fromIndex, toIndex) {
    this._fromChapter = fromIndex;
    this._toChapter = toIndex;
    if (fromIndex !== toIndex) {
      this._cacheTransitionNdc(fromIndex, toIndex);
    }
  }

  setChapter(toIndex, scrollT) {
    this.state.chapterIndex = toIndex;
    this.state.chapterT = scrollT;
    if (scrollT >= 1) {
      this._fromChapter = toIndex;
      this._toChapter = toIndex;
      this._hasTransitionNdc = false;
    }
    this._applyScrollVisuals(this._fromChapter, this._toChapter, scrollT);
    this.state.syncPageMode?.(this._fromChapter, toIndex, scrollT);

    if (this.state.snapLock) {
      if (this._overlayMode && scrollT >= 0.35) {
        this._enterScrollPerf();
      } else {
        this._exitScrollPerf();
      }
    } else {
      this._exitScrollPerf();
    }
  }
}
