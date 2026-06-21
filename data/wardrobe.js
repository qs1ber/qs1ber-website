/** Built-in wardrobe slots on cube5.fbx — meshes toggled via visibility */
export const WARDROBE_CATEGORIES = [
  { id: "glasses", label: "Glasses" },
  { id: "hats", label: "Hats" },
];

export const WARDROBE_ITEMS = [
  {
    id: "gl-mlg",
    category: "glasses",
    name: "MLG",
    tag: "Deal With It",
    blocksEyeClick: true,
    meshTest: (name) => /glasses/i.test(name),
  },
  {
    id: "ht-cowboy",
    category: "hats",
    name: "Cowboy",
    tag: "Yeehaw",
    meshTest: (name) => /cowboy/i.test(name),
  },
  {
    id: "ht-headphones",
    category: "hats",
    name: "Beyerdynamic",
    tag: "qs1ber radio",
    enablesRadio: true,
    /** Mesh + UV live in cube5.fbx — sculpt/export from Blender */
    meshTest: (name) => /^headphones$/i.test(name),
  },
];

/** Built-in FBX pieces kept in the model but not shown in the wardrobe UI */
export const WARDROBE_HIDDEN_ITEMS = [
  {
    id: "ht-senior-hidden",
    meshTest: (name) =>
      /hat\s*senior/i.test(name) || /tophat/i.test(name) || /^hat1$/i.test(name),
  },
];

export function wardrobeItemForMesh(name) {
  return WARDROBE_ITEMS.find((item) => item.meshTest(name)) ?? null;
}

/** Match mesh or any ancestor name (FBX often nests hat geometry under empty nodes). */
export function wardrobeItemForNode(object) {
  const names = [];
  let node = object;
  while (node) {
    if (node.name) names.push(node.name);
    node = node.parent;
  }
  for (const item of WARDROBE_ITEMS) {
    if (names.some((name) => item.meshTest(name))) return item;
  }
  return null;
}

export function hiddenWardrobeItemForNode(object) {
  const names = [];
  let node = object;
  while (node) {
    if (node.name) names.push(node.name);
    node = node.parent;
  }
  return WARDROBE_HIDDEN_ITEMS.find((item) => names.some((name) => item.meshTest(name))) ?? null;
}

