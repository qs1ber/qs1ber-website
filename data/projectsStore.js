import { projects as defaultProjects } from "./projects.js";

const STORAGE_KEY = "qs1ber:projects:v1";

export function getProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProjects;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultProjects;
  } catch {
    return defaultProjects;
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function clearProjectsOverride() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasProjectsOverride() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export function cloneProjectTemplate(index = defaultProjects.length) {
  const hue = 330 + index * 4;
  return {
    id: `project-${String(index + 1).padStart(2, "0")}`,
    index: String(index + 1).padStart(2, "0"),
    title: "New Project",
    role: "Director · DOP · Post",
    client: "Client",
    year: "2026",
    format: "16:9 · 4K",
    postTools: "After Effects · DaVinci Resolve",
    description: "Project description",
    tags: ["Commercial"],
    tools: ["After Effects", "DaVinci Resolve"],
    color: `hsl(${hue}, 100%, 62%)`,
    palette: [
      { color: `hsl(${hue}, 38%, 11%)`, label: "Shadow" },
      { color: `hsl(${hue}, 42%, 26%)`, label: "Deep" },
      { color: `hsl(${hue}, 52%, 48%)`, label: "Mid" },
      { color: `hsl(${hue + 14}, 45%, 68%)`, label: "Highlight" },
      { color: `hsl(${hue - 6}, 18%, 90%)`, label: "Light" },
    ],
    media: [
      {
        id: "main",
        type: "video",
        src: "",
        poster: "",
        label: "Main Reel",
        placeholderHue: hue + 6,
      },
    ],
  };
}

export function downloadProjectsJson(projects, filename = "projects-export.json") {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
