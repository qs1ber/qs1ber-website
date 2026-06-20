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

setDriveReel(
  projects[3],
  "https://drive.google.com/file/d/1DpEmFgbWAuormhE8Pac6hhgnlvM_nHKp/view?usp=sharing"
);
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

setDriveReel(
  projects[4],
  "https://drive.google.com/file/d/17Bj8YHod1d97Mm3Pe6JVnfQN7iqA-xGd/view?usp=sharing"
);
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

setDriveReel(
  projects[7],
  "https://drive.google.com/file/d/1cuSQdt_L1mwhkvBxs4-z4mvjAA6bxFp0/view?usp=sharing"
);
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

setDriveReel(
  projects[8],
  "https://drive.google.com/file/d/1BViRssM1Dz0MS5TK_YOWL4zYU2Huzxbo/view?usp=sharing"
);
Object.assign(projects[8], {
  title: "Bochkari",
  role: "Director · DOP · Post",
  client: "Bochkari",
  year: "2025",
  format: "16:9 · 4K",
  description: "Commercial for Bochkari.",
  tags: ["Commercial", "Brand"],
});

setDriveReel(
  projects[9],
  "https://drive.google.com/file/d/1FjbtgbWIuzYzI4DRThyNGC_U4boPJVqt/view?usp=sharing"
);
Object.assign(projects[9], {
  title: "Majestic",
  role: "Director · DOP · Post",
  client: "Majestic",
  year: "2025",
  format: "16:9 · 4K",
  description: "Commercial for Majestic.",
  tags: ["Commercial", "Brand"],
});
