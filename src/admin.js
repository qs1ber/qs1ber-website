import {
  cloneProjectTemplate,
  clearProjectsOverride,
  downloadProjectsJson,
  getProjects,
  hasProjectsOverride,
  saveProjects,
} from "../data/projectsStore.js";

const listEl = document.getElementById("adminList");
const formEl = document.getElementById("adminForm");
const statusEl = document.getElementById("adminStatus");
const overrideEl = document.getElementById("adminOverride");

let projects = [];
let activeIndex = 0;

function setStatus(text, ok = true) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.dataset.state = ok ? "ok" : "err";
}

function syncOverrideBadge() {
  if (!overrideEl) return;
  overrideEl.hidden = !hasProjectsOverride();
}

function mediaFields(media, mi) {
  return `
    <fieldset class="admin-media" data-media-index="${mi}">
      <legend>Clip ${mi + 1}</legend>
      <label>Type
        <select data-field="type">
          <option value="video"${media.type === "video" ? " selected" : ""}>Video</option>
          <option value="image"${media.type === "image" ? " selected" : ""}>Image</option>
        </select>
      </label>
      <label>Label <input data-field="label" value="${esc(media.label || "")}" /></label>
      <label>Source URL
        <div class="admin-url-row">
          <input data-field="src" value="${esc(media.src || "")}" placeholder="YouTube / Drive / mp4" />
          <button type="button" class="admin-btn admin-btn--ghost" data-action="open-url" data-field="src">Open</button>
        </div>
      </label>
      <label>Poster URL
        <div class="admin-url-row">
          <input data-field="poster" value="${esc(media.poster || "")}" placeholder="Optional thumbnail" />
          <button type="button" class="admin-btn admin-btn--ghost" data-action="open-url" data-field="poster">Open</button>
        </div>
      </label>
      <button type="button" class="admin-btn admin-btn--ghost" data-action="remove-media">Remove clip</button>
    </fieldset>`;
}

function paletteFields(palette) {
  return (palette || [])
    .map(
      (swatch, i) => `
      <div class="admin-palette-row" data-palette-index="${i}">
        <input type="color" data-field="color" value="${toColorInput(swatch.color)}" />
        <input data-field="label" value="${esc(swatch.label || "")}" placeholder="Label" />
        <button type="button" class="admin-btn admin-btn--ghost" data-action="remove-swatch">×</button>
      </div>`
    )
    .join("");
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function toColorInput(color) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const m = color?.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/i);
  if (!m) return "#888888";
  const h = Number(m[1]) / 360;
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function renderList() {
  listEl.innerHTML = projects
    .map(
      (p, i) => `
      <button type="button" class="admin-list__item${i === activeIndex ? " is-active" : ""}" data-index="${i}">
        <span class="admin-list__index">${p.index || i + 1}</span>
        <span class="admin-list__title">${esc(p.title || "Untitled")}</span>
      </button>`
    )
    .join("");
}

function renderForm() {
  const p = projects[activeIndex];
  if (!p) {
    formEl.innerHTML = `<p class="admin-empty">No projects yet.</p>`;
    return;
  }

  formEl.innerHTML = `
    <div class="admin-form__grid">
      <label>Title <input data-project="title" value="${esc(p.title || "")}" /></label>
      <label>Client <input data-project="client" value="${esc(p.client || "")}" /></label>
      <label>Year <input data-project="year" value="${esc(p.year || "")}" /></label>
      <label>Format <input data-project="format" value="${esc(p.format || "")}" /></label>
      <label>Role <input data-project="role" value="${esc(p.role || "")}" /></label>
      <label>Accent color <input data-project="color" value="${esc(p.color || "")}" placeholder="hsl(330, 100%, 62%)" /></label>
    </div>
    <label>Description<textarea data-project="description" rows="4">${esc(p.description || "")}</textarea></label>
    <label>Post prod <input data-project="postTools" value="${esc(p.postTools || p.tools?.join(" · ") || "")}" /></label>
    <label>Tags <input data-project="tags" value="${esc((p.tags || []).join(", "))}" placeholder="Commercial, VFX" /></label>
    <label>Camera <input data-project="camera" value="${esc(p.camera || "")}" /></label>
    <label>Lenses <input data-project="lenses" value="${esc(p.lenses || "")}" /></label>

    <section class="admin-section">
      <div class="admin-section__head">
        <h2>Clips / media</h2>
        <button type="button" class="admin-btn" data-action="add-media">+ Add clip</button>
      </div>
      <div id="adminMedia">${(p.media || []).map(mediaFields).join("")}</div>
    </section>

    <section class="admin-section">
      <div class="admin-section__head">
        <h2>Grade palette</h2>
        <button type="button" class="admin-btn" data-action="add-swatch">+ Add swatch</button>
      </div>
      <div id="adminPalette">${paletteFields(p.palette)}</div>
    </section>
  `;
}

function readForm() {
  const p = projects[activeIndex];
  if (!p || !formEl) return;

  formEl.querySelectorAll("[data-project]").forEach((el) => {
    const key = el.dataset.project;
    if (key === "tags") {
      p.tags = el.value.split(",").map((t) => t.trim()).filter(Boolean);
      return;
    }
    p[key] = el.value.trim();
  });

  p.media = Array.from(formEl.querySelectorAll("[data-media-index]")).map((block, i) => ({
    id: p.media?.[i]?.id || `media-${i + 1}`,
    type: block.querySelector('[data-field="type"]')?.value || "video",
    label: block.querySelector('[data-field="label"]')?.value.trim() || `Clip ${i + 1}`,
    src: block.querySelector('[data-field="src"]')?.value.trim() || "",
    poster: block.querySelector('[data-field="poster"]')?.value.trim() || "",
    placeholderHue: p.media?.[i]?.placeholderHue || 330 + activeIndex * 4 + i * 6,
    palette: p.media?.[i]?.palette,
  }));

  p.palette = Array.from(formEl.querySelectorAll("[data-palette-index]")).map((row) => ({
    color: row.querySelector('[data-field="color"]')?.value || "#888888",
    label: row.querySelector('[data-field="label"]')?.value.trim() || "Swatch",
  }));

  p.tools = p.postTools
    ? p.postTools.split("·").map((t) => t.trim()).filter(Boolean)
    : p.tools || [];
}

function render() {
  renderList();
  renderForm();
}

function initAdmin() {
listEl?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-index]");
  if (!btn) return;
  readForm();
  activeIndex = Number(btn.dataset.index);
  render();
});

formEl?.addEventListener("click", (e) => {
  const openBtn = e.target.closest("[data-action='open-url']");
  if (openBtn) {
    e.preventDefault();
    const field = openBtn.dataset.field;
    const input = openBtn.closest(".admin-url-row")?.querySelector(`[data-field="${field}"]`);
    const url = input?.value.trim();
    if (!url) {
      setStatus("Paste a URL first.", false);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action || action === "open-url") return;
  readForm();
  const p = projects[activeIndex];
  if (action === "add-media") {
    p.media = p.media || [];
    p.media.push({
      id: `media-${p.media.length + 1}`,
      type: "video",
      src: "",
      poster: "",
      label: "New clip",
      placeholderHue: 330 + activeIndex * 4,
    });
  } else if (action === "remove-media") {
    const block = e.target.closest("[data-media-index]");
    const idx = Number(block?.dataset.mediaIndex);
    if (!Number.isNaN(idx)) p.media.splice(idx, 1);
  } else if (action === "add-swatch") {
    p.palette = p.palette || [];
    p.palette.push({ color: "#888888", label: "Swatch" });
  } else if (action === "remove-swatch") {
    const row = e.target.closest("[data-palette-index]");
    const idx = Number(row?.dataset.paletteIndex);
    if (!Number.isNaN(idx)) p.palette.splice(idx, 1);
  }
  renderForm();
});

document.getElementById("adminSave")?.addEventListener("click", () => {
  readForm();
  saveProjects(projects);
  syncOverrideBadge();
  setStatus("Saved — reload the main site to preview changes.");
});

document.getElementById("adminExport")?.addEventListener("click", () => {
  readForm();
  downloadProjectsJson(projects);
  setStatus("Exported projects-export.json");
});

document.getElementById("adminReset")?.addEventListener("click", () => {
  clearProjectsOverride();
  projects = structuredClone(getProjects());
  activeIndex = 0;
  syncOverrideBadge();
  render();
  setStatus("Cleared local override — using data/projects.js again.");
});

document.getElementById("adminAddProject")?.addEventListener("click", () => {
  readForm();
  projects.push(cloneProjectTemplate(projects.length));
  activeIndex = projects.length - 1;
  render();
});

document.getElementById("adminRemoveProject")?.addEventListener("click", () => {
  if (projects.length <= 1) return;
  projects.splice(activeIndex, 1);
  activeIndex = Math.max(0, activeIndex - 1);
  render();
});

render();
syncOverrideBadge();
setStatus("Edits stay in this browser until you Save. Export JSON to commit to git.");
}

projects = structuredClone(getProjects());
initAdmin();
