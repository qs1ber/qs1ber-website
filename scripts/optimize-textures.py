#!/usr/bin/env python3
"""Keep only small BaseColor WebP textures (~512px). Normals/PBR maps removed from site."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

# Only albedo maps the runtime loads
BASE_COLOR_JOBS: list[tuple[str, int, int]] = [
    ("models/1_diffuseOriginal.webp", 512, 78),
    ("models/side_1_diffuseOriginal.webp", 512, 78),
    ("wardrobe/cowboy hat/images/cowboy_1001_BaseColor.webp", 512, 78),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Glass_BaseColor.webp", 512, 78),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Clips_BaseColor.webp", 512, 78),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Mid_BaseColor.webp", 512, 78),
]

# Delete — not loaded anymore
REMOVE_GLOBS = [
    "models/1_normal.webp",
    "models/1_ao.webp",
    "models/1_metallic.webp",
    "wardrobe/cowboy hat/images/cowboy_*_Normal.webp",
    "wardrobe/cowboy hat/images/cowboy_*_Roughness.webp",
    "wardrobe/cowboy hat/images/cowboy_*_Metalness.webp",
    "wardrobe/mlg glasses/images/*_Normal.webp",
    "wardrobe/mlg glasses/images/*_Roughness.webp",
    "wardrobe/mlg glasses/images/*_Metallic.webp",
]


def recompress(src: Path, max_edge: int, quality: int) -> int:
    im = Image.open(src)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
    im.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    im.save(src, "WEBP", quality=quality, method=6)
    return src.stat().st_size


def optimize_preloader() -> None:
    gif = ASSETS / "preloader" / "gidforme1.gif"
    if not gif.exists():
        return
    im = Image.open(gif)
    frames = []
    durations = []
    i = 0
    try:
        while True:
            if i % 2 == 0:
                frame = im.copy().convert("RGBA")
                frame = frame.resize((64, 64), Image.Resampling.NEAREST)
                frame = frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=16)
                frames.append(frame)
                durations.append(max(50, im.info.get("duration", 80) * 2))
            i += 1
            im.seek(im.tell() + 1)
    except EOFError:
        pass
    if not frames:
        return
    old = gif.stat().st_size
    frames[0].save(
        gif,
        save_all=True,
        append_images=frames[1:],
        optimize=True,
        duration=durations,
        loop=0,
        disposal=2,
    )
    new = gif.stat().st_size
    print(f"preloader: {old // 1024} KB -> {new // 1024} KB ({len(frames)} frames)")


def main() -> None:
    for rel in REMOVE_GLOBS:
        if "*" in rel:
            parent = ASSETS / Path(rel).parent
            pat = Path(rel).name
            for p in parent.glob(pat):
                p.unlink(missing_ok=True)
                print(f"removed {p.relative_to(ASSETS)}")
        else:
            p = ASSETS / rel.replace("/", os.sep)
            if p.exists():
                p.unlink()
                print(f"removed {rel}")

    total = 0
    for rel, max_edge, quality in BASE_COLOR_JOBS:
        src = ASSETS / rel.replace("/", os.sep)
        if not src.exists():
            print(f"skip missing: {rel}")
            continue
        size = recompress(src, max_edge, quality)
        total += size
        print(f"{rel}: {size // 1024} KB")

    optimize_preloader()
    print(f"\nBaseColor total: {total / 1024:.1f} KB")


if __name__ == "__main__":
    main()
