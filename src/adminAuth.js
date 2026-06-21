const SESSION_KEY = "qs1ber:admin:session:v1";
const AUTH_TOKEN = "unlocked";
const PASS_HASH = "e0fcc1ae1aa6719cd07e3399d0ae3f71494bf94081d332077bf6f7d280d9d3b3";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;

  if (globalThis.crypto?.subtle) {
    try {
      return (await sha256(trimmed)) === PASS_HASH;
    } catch {
      /* fall through — file://, LAN http, etc. */
    }
  }

  return trimmed === atob("c2NobmFsbDMyMw==");
}

function isAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === AUTH_TOKEN;
}

function setAuthed() {
  sessionStorage.setItem(SESSION_KEY, AUTH_TOKEN);
}

export function requireAdminAuth(onReady) {
  const gate = document.getElementById("adminGate");
  const app = document.getElementById("adminApp");
  const form = document.getElementById("adminLoginForm");
  const input = document.getElementById("adminPassword");
  const err = document.getElementById("adminLoginError");
  const submitBtn = form?.querySelector('button[type="submit"]');

  const unlock = () => {
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    onReady();
  };

  if (isAuthed()) {
    unlock();
    return;
  }

  const attemptUnlock = async () => {
    if (err) err.hidden = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Checking…";
    }

    try {
      const ok = await verifyPassword(input?.value ?? "");
      if (ok) {
        setAuthed();
        unlock();
        return;
      }
      if (err) {
        err.textContent = "Wrong password";
        err.hidden = false;
      }
      input?.focus();
      input?.select();
    } catch (cause) {
      if (err) {
        err.textContent = "Unlock failed — use http://localhost:8080/admin.html";
        err.hidden = false;
      }
      console.error("[qs1ber admin] unlock failed:", cause);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Unlock";
      }
    }
  };

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    void attemptUnlock();
  });

  document.querySelectorAll("[data-admin-nav='site']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.assign("./");
    });
  });
}
