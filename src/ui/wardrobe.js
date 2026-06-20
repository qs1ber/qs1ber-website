import { WARDROBE_CATEGORIES, WARDROBE_ITEMS } from "../../data/wardrobe.js";

const CATEGORY_ICONS = {
  glasses: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c0-2.2 1.8-4 4-4h2.2c.9 0 1.7.3 2.4.8L12 10l1.4-1.2c.7-.5 1.5-.8 2.4-.8H18c2.2 0 4 1.8 4 4v1H2v-1zm4-2.5c-1.4 0-2.5 1.1-2.5 2.5h3.8c-.3-.7-.8-1.3-1.5-1.7-.5-.4-1.1-.6-1.8-.6zm12 0c-.7 0-1.3.2-1.8.6-.7.4-1.2 1-1.5 1.7H20.5C20.5 10.6 19.4 9.5 18 9.5z"/></svg>`,
  headphones: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h1v-7H6a6 6 0 1 1 12 0h-2v7h1a3 3 0 0 0 3-3v-5a8 8 0 0 0-8-8zm-4 13h2v4H8v-4zm8 0h2v4h-2v-4z"/></svg>`,
  hats: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4c-4.2 0-7.6 2.4-8.5 6.2 2.8.9 5.7 1.3 8.5 1.3s5.7-.4 8.5-1.3C19.6 6.4 16.2 4 12 4zm-9 8.5V14c0 2.2 4 3.5 9 3.5s9-1.3 9-3.5v-1.5c-2.6.9-5.4 1.3-9 1.3s-6.4-.4-9-1.3z"/></svg>`,
};

const ITEM_GLYPHS = {
  "gl-mlg": "😎",
  "ht-cowboy": "🤠",
  "ht-senior": "🎩",
};

function itemGlyph(id) {
  return ITEM_GLYPHS[id] ?? "◇";
}

export function initWardrobe(scene) {
  const toggle = document.getElementById("wardrobeToggle");
  const panel = document.getElementById("wardrobePanel");
  const tabs = panel?.querySelector(".wardrobe__tabs");
  const grid = panel?.querySelector(".wardrobe__grid");
  const equippedEl = panel?.querySelector(".wardrobe__equipped");
  if (!toggle || !panel || !tabs || !grid) {
    console.warn("[qs1ber] wardrobe UI missing in DOM");
    return;
  }

  let open = document.body.classList.contains("is-wardrobe-open");
  let category = WARDROBE_CATEGORIES[0].id;
  const equipped = { glasses: null, hats: null };

  const syncEquippedLabel = () => {
    if (!equippedEl) return;
    const parts = WARDROBE_CATEGORIES.map(({ id, label }) => {
      const itemId = equipped[id];
      if (!itemId) return null;
      const item = WARDROBE_ITEMS.find((i) => i.id === itemId);
      return item ? `${label}: ${item.name}` : null;
    }).filter(Boolean);
    equippedEl.textContent = parts.length ? parts.join(" · ") : "Nothing equipped yet";
  };

  const renderTabs = () => {
    tabs.innerHTML = WARDROBE_CATEGORIES.map(
      (cat) => `
        <button type="button" class="wardrobe__tab${cat.id === category ? " is-active" : ""}"
          data-category="${cat.id}" aria-pressed="${cat.id === category}">
          <span class="wardrobe__tab-icon">${CATEGORY_ICONS[cat.id]}</span>
          <span class="wardrobe__tab-label">${cat.label}</span>
        </button>`
    ).join("");
  };

  const renderGrid = () => {
    const items = WARDROBE_ITEMS.filter((i) => i.category === category);
    grid.innerHTML = `
      <button type="button" class="wardrobe__item wardrobe__item--none${equipped[category] === null ? " is-active" : ""}"
        data-category="${category}" data-item="" aria-label="Remove ${category}">
        <span class="wardrobe__item-glyph">∅</span>
        <span class="wardrobe__item-name">None</span>
        <span class="wardrobe__item-tag">Clear slot</span>
      </button>
      ${items
        .map(
          (item) => `
        <button type="button" class="wardrobe__item${equipped[category] === item.id ? " is-active" : ""}"
          data-category="${category}" data-item="${item.id}" aria-label="${item.name}">
          <span class="wardrobe__item-glyph">${itemGlyph(item.id)}</span>
          <span class="wardrobe__item-name">${item.name}</span>
          <span class="wardrobe__item-tag">${item.tag}</span>
        </button>`
        )
        .join("")}`;
  };

  const render = () => {
    renderTabs();
    renderGrid();
    syncEquippedLabel();
  };

  const setOpen = (next) => {
    open = next;
    window.__setWardrobeOpen?.(open);
    scene?.setWardrobeOpen?.(open);
    if (open) render();
  };

  window.__wardrobeSceneSync = (next) => {
    open = !!next;
    scene?.setWardrobeOpen?.(open);
    if (open) render();
  };

  window.__wardrobeHandlePointer = (hit) => {
    if (hit.action === "tab" && hit.category) {
      category = hit.category;
      render();
      return;
    }
    if (hit.action === "item") {
      const cat = hit.category || category;
      equipped[cat] = hit.itemId;
      scene?.equipAccessory?.(cat, hit.itemId);
      render();
    }
  };

  tabs.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-category]");
    if (!tab) return;
    category = tab.dataset.category;
    render();
  });

  grid.addEventListener("click", (e) => {
    const card = e.target.closest("[data-item]");
    if (!card) return;
    const itemId = card.dataset.item || null;
    equipped[category] = itemId;
    scene?.equipAccessory?.(category, itemId);
    render();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  });

  window.QS1BER.wardrobe = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    isOpen: () => open,
    getEquipped: () => ({ ...equipped }),
  };

  if (open) render();
}
