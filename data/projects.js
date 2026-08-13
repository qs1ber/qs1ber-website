/**
 * Project template — fill media[] when you upload reels & stills.
 */

/** Default grade swatches derived from project hue — replace per project when you have real stills. */
function defaultPalette(hue) {
  return [
    { color: `hsl(${hue}, 38%, 11%)`, label: "Shadow" },
    { color: `hsl(${hue}, 42%, 26%)`, label: "Deep" },
    { color: `hsl(${hue}, 52%, 48%)`, label: "Mid" },
    { color: `hsl(${hue + 14}, 45%, 68%)`, label: "Highlight" },
    { color: `hsl(${hue - 6}, 18%, 90%)`, label: "Light" },
  ];
}

function makeMediaSlots(projectIndex) {
  const n = String(projectIndex).padStart(2, "0");
  return [
    { id: "main", type: "video", src: "", poster: "", label: "Main Reel" },
    { id: "s1", type: "image", src: "", label: "Still 01" },
    { id: "s2", type: "image", src: "", label: "Still 02" },
    { id: "s3", type: "image", src: "", label: "Still 03" },
    { id: "s4", type: "image", src: "", label: "Still 04" },
    { id: "s5", type: "image", src: "", label: "Still 05" },
  ].map((item, i) => ({
    ...item,
    placeholderHue: 330 + projectIndex * 4 + i * 6,
  }));
}

export const projects = Array.from({ length: 10 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  const hue = 330 + i * 4;
  return {
    id: `project-${n}`,
    index: n,
    title: `Project Title ${n}`,
    role: "Director · VFX · Motion Design",
    client: "Client / Brand",
    year: "20XX",
    format: "16:9 · 4K",
    description:
      "What this project is, who it was for, and what you delivered — concept, shoot, VFX, grade, sound. Replace when you upload the reel.",
    tags: ["Motion Design", "VFX", "Cinema 4D"],
    tools: ["After Effects", "Cinema 4D", "DaVinci Resolve"],
    color: `hsl(${hue}, 100%, ${62 + (i % 3) * 4}%)`,
    palette: defaultPalette(hue),
    media: makeMediaSlots(i + 1),
  };
});

projects[0].media[0].src = "https://www.youtube.com/watch?v=escnDFX9dB4";
projects[0].media[0].poster = "https://img.youtube.com/vi/escnDFX9dB4/maxresdefault.jpg";
projects[0].palette = [
  { color: "#1c2a1e", label: "Forest" },
  { color: "#4a6741", label: "Field" },
  { color: "#7a9468", label: "Meadow" },
  { color: "#c4a574", label: "Wheat" },
  { color: "#e8dcc8", label: "Haze" },
  { color: "#2a3544", label: "Sky" },
];
projects[0].media[0].palette = projects[0].palette;

const p1VfxBase = "/media/project-01/breakdown";
projects[0].media = [
  projects[0].media[0],
  ...Array.from({ length: 7 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `vfx-${n}`,
      type: "video",
      src: `${p1VfxBase}/vfx-${n}.mp4`,
      poster: `${p1VfxBase}/vfx-${n}.jpg`,
      label: `VFX Breakdown ${n}`,
      placeholderHue: 336 + i * 6,
    };
  }),
];

Object.assign(projects[0], {
  title: "Gave Up On You",
  role: "Director · DOP · VFX · Color · Edit",
  client: "Angelik",
  year: "2025",
  format: "3840 × 2048 · 4K",
  postTools: "After Effects · Blender · Cinema 4D · Houdini · DaVinci Resolve",
  camera: "Blackmagic Pocket Cinema Camera 6K FF",
  lenses:
    "Sigma ART 24–70 T2.8 L · Sigma 16–28 T2.8 L · Sigma 70–200 T2.8 L · Sigma 35 T1.4 L · Laowa Probe 24mm",
  description:
    "End-to-end for Angelik — one vision from treatment to final export. We built a melancholic dreamcore world that hangs in the air: grass that breathes, greens with real depth, and CG butterflies that feel like memory, not VFX. Directed and shot in the field; every frame of CGI, compositing, edit, and grade stayed in the same hands — so the mood never got lost in hand-offs.",
  tags: ["Dreamcore", "Music Video", "VFX", "CGI", "Color Grade", "Full Pipeline"],
  tools: ["After Effects", "Blender", "Cinema 4D", "Houdini", "DaVinci Resolve"],
});

projects[1].media[0].src = "https://www.youtube.com/watch?v=lhXZLX60COA";
projects[1].media[0].poster = "https://img.youtube.com/vi/lhXZLX60COA/maxresdefault.jpg";
projects[1].palette = [
  { color: "#0a0a0a", label: "Black" },
  { color: "#242424", label: "Charcoal" },
  { color: "#525252", label: "Graphite" },
  { color: "#8a8278", label: "Stone" },
  { color: "#c8beb4", label: "Skin" },
  { color: "#f2f0ec", label: "White" },
];
projects[1].media[0].palette = projects[1].palette;

const p2VfxBase = "/media/project-02/breakdown";
projects[1].media = [
  projects[1].media[0],
  ...Array.from({ length: 7 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `vfx-${n}`,
      type: "video",
      src: `${p2VfxBase}/vfx-${n}.mp4`,
      poster: `${p2VfxBase}/vfx-${n}.jpg`,
      label: `Breakdown ${n}`,
      placeholderHue: 334 + i * 6,
    };
  }),
];

Object.assign(projects[1], {
  title: "Heroin Chic",
  role: "Director · DOP · VFX · 3D · SFX · Edit",
  client: "Short Film",
  year: "2026",
  format: "Cinematic · 4K",
  postTools: "After Effects · Cinema 4D · Houdini · DaVinci Resolve",
  description:
    "A black-and-white fashion short — sharp, stripped back, all attitude. Directed and shot with @sidwncb; VFX, 3D, AI and SFX built in-house so the monochrome world stays cohesive from plate to final frame. Breakdown and highlights from the Instagram carousel.",
  tags: ["Short Film", "Fashion Film", "B&W", "VFX", "3D", "Cinematic"],
  tools: ["After Effects", "Cinema 4D", "Houdini", "DaVinci Resolve"],
});

function setYoutubeReel(project, url) {
  const id = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
  project.media[0].src = url;
  project.media[0].poster = id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : "";
}

function setDriveReel(project, url) {
  project.media[0].src = url;
  project.media[0].poster = "";
}

function setVimeoReel(project, url) {
  project.media[0].src = url;
}

setYoutubeReel(projects[2], "https://www.youtube.com/watch?v=Nd5Ir8tRCJk");
Object.assign(projects[2], {
  title: "Spec Commercial",
  role: "Director · DOP · Post",
  client: "Spec",
  year: "2025",
  format: "16:9 · 4K",
  camera: "Blackmagic Pocket Cinema Camera 6K FF",
  description:
    "Spec piece built as practice for a popular streamer and his network. A simple commercial with taste — shot in one day, three days of production, three days in post. Fast turnaround without cutting corners on quality.",
  tags: ["Commercial", "Spec", "Cinematic"],
});
projects[2].media[0].poster = "/media/project-03/poster.jpg";
projects[2].palette = [
  { color: "#120d0c", label: "Night" },
  { color: "#332318", label: "Cabin" },
  { color: "#5f2811", label: "Amber" },
  { color: "#463c40", label: "Rain" },
  { color: "#745a5d", label: "Hoodie" },
  { color: "#ae8585", label: "Glow" },
];
projects[2].media[0].palette = projects[2].palette;

setVimeoReel(projects[3], "https://vimeo.com/1218084347");
Object.assign(projects[3], {
  title: "UWO",
  role: "Director · DOP · Post",
  client: "UWO",
  year: "2026",
  format: "16:9 · 4K",
  postTools: "After Effects · Cinema 4D · Blender · Houdini · Substance Painter",
  description:
    "They came to me to produce a watch campaign for their Kickstarter launch — a commercial brief with a three-week deadline from start to finish.",
  tags: ["Commercial", "Brand", "Kickstarter"],
  tools: ["After Effects", "Cinema 4D", "Blender", "Houdini", "Substance Painter"],
});
projects[3].media[0].poster = "/media/project-04/poster.jpg";
projects[3].palette = [
  { color: "#272419", label: "Obsidian" },
  { color: "#363123", label: "Case" },
  { color: "#736140", label: "Bronze" },
  { color: "#bc9260", label: "Gold" },
  { color: "#b6ab8b", label: "Sand" },
  { color: "#ddaa72", label: "Specular" },
];
projects[3].media[0].palette = projects[3].palette;

setVimeoReel(projects[4], "https://vimeo.com/1218085211");
Object.assign(projects[4], {
  title: "Yragun",
  role: "Director · DOP · Post",
  client: "Yragun",
  year: "2025",
  format: "16:9 · 4K",
  postTools: "After Effects · Cinema 4D · Blender · Houdini · Substance Painter",
  description:
    "Commercial for Yragun, a major Russian-speaking creator. Packed with motion design beats and transitional gags to keep the rhythm tight and the energy up.",
  tags: ["Commercial", "Motion Design", "Creator"],
  tools: ["After Effects", "Cinema 4D", "Blender", "Houdini", "Substance Painter"],
});
projects[4].media[0].poster = "/media/project-05/poster.jpg";
projects[4].palette = [
  { color: "#99271d", label: "Ember" },
  { color: "#c7683b", label: "Flame" },
  { color: "#d1957b", label: "Heat" },
  { color: "#e49b4e", label: "Streak" },
  { color: "#f0c176", label: "Trail" },
  { color: "#f7ea89", label: "Flash" },
];
projects[4].media[0].palette = projects[4].palette;

setYoutubeReel(projects[5], "https://youtu.be/wOV0206d0kI");
Object.assign(projects[5], {
  title: "Romanov Case Battle",
  role: "Director · DOP · Post",
  client: "Romanov",
  year: "2026",
  format: "16:9 · 4K",
  postTools: "After Effects · Cinema 4D · Blender · Houdini · Substance Painter",
  description: "Case battle spot for Romanov.",
  tags: ["Commercial", "Gaming", "Case Battle"],
  tools: ["After Effects", "Cinema 4D", "Blender", "Houdini", "Substance Painter"],
});
projects[5].media[0].poster = "/media/project-06/poster.jpg";
projects[5].palette = [
  { color: "#93460f", label: "Cocoa" },
  { color: "#b97311", label: "Caramel" },
  { color: "#b18b5a", label: "Bar" },
  { color: "#d99b10", label: "Splash" },
  { color: "#e1c330", label: "Cheese" },
  { color: "#d8ca88", label: "Bloom" },
];
projects[5].media[0].palette = projects[5].palette;

setYoutubeReel(projects[6], "https://www.youtube.com/watch?v=Pav1RBCohzw");
Object.assign(projects[6], {
  title: "Myst Contest",
  role: "Director · DOP · Post",
  client: "Myst",
  year: "2025",
  format: "16:9 · 4K",
  postTools: "After Effects · DaVinci Resolve",
  description: "Contest film for Myst.",
  tags: ["Commercial", "Contest"],
  tools: ["After Effects", "DaVinci Resolve"],
});
projects[6].media[0].poster = "/media/project-07/poster.jpg";
projects[6].palette = [
  { color: "#112727", label: "Abyss" },
  { color: "#336463", label: "Teal" },
  { color: "#5a8e8d", label: "Current" },
  { color: "#81acac", label: "Chrome" },
  { color: "#a5c5c5", label: "Bubble" },
  { color: "#cddfe0", label: "Spark" },
];
projects[6].media[0].palette = projects[6].palette;

setVimeoReel(projects[7], "https://vimeo.com/1218085299");
Object.assign(projects[7], {
  title: "Sovcom Bank",
  role: "Director · DOP · Post",
  client: "Sovcom Bank",
  year: "2025",
  format: "16:9 · 4K",
  postTools: "After Effects · Figma",
  description: "Commercial for Sovcom Bank.",
  tags: ["Commercial", "Finance", "Brand"],
  tools: ["After Effects", "Figma"],
});
projects[7].media[0].poster = "/media/project-08/poster.jpg";
projects[7].palette = [
  { color: "#2e0d41", label: "Violet" },
  { color: "#25205d", label: "Indigo" },
  { color: "#28347a", label: "Orbit" },
  { color: "#324d96", label: "Planet" },
  { color: "#4469af", label: "Aura" },
  { color: "#9cb6db", label: "Mist" },
];
projects[7].media[0].palette = projects[7].palette;

setVimeoReel(projects[8], "https://vimeo.com/1218085610");
Object.assign(projects[8], {
  title: "Bochkari",
  role: "Director · DOP · Post",
  client: "Bochkari",
  year: "2025",
  format: "16:9 · 4K",
  description: "Commercial for Bochkari.",
  tags: ["Commercial", "Brand"],
});
projects[8].media[0].poster = "/media/project-09/poster.jpg";
projects[8].palette = [
  { color: "#65220f", label: "Pit" },
  { color: "#983e1a", label: "Flesh" },
  { color: "#c36623", label: "Peach" },
  { color: "#df892d", label: "Spiral" },
  { color: "#eca948", label: "Amber" },
  { color: "#f6d97e", label: "Dust" },
];
projects[8].media[0].palette = projects[8].palette;

setVimeoReel(projects[9], "https://vimeo.com/1218085820");
Object.assign(projects[9], {
  title: "Majestic",
  role: "Director · DOP · Post",
  client: "Majestic",
  year: "2025",
  format: "16:9 · 4K",
  description: "Commercial for Majestic.",
  tags: ["Commercial", "Brand"],
});
projects[9].media[0].poster = "/media/project-10/poster.jpg";
projects[9].palette = [
  { color: "#192625", label: "Altitude" },
  { color: "#4b2f2a", label: "Earth" },
  { color: "#27514a", label: "Emerald" },
  { color: "#697a7b", label: "Cloud" },
  { color: "#de4d6a", label: "Magenta" },
  { color: "#b59c8d", label: "Metal" },
];
projects[9].media[0].palette = projects[9].palette;