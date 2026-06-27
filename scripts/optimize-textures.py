#!/usr/bin/env python3
"""Resize and compress site textures to WebP for faster loads."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

# (relative path, max edge px, webp quality, remove original after)
JOBS: list[tuple[str, int, int, bool]] = [
    ("models/1_normal.png", 1024, 85, True),
    ("models/1_ao.png", 1024, 80, True),
    ("models/1_metallic.png", 1024, 85, True),
    ("models/1_diffuseOriginal.png", 1024, 82, True),
    ("models/side_1_diffuseOriginal.png", 1024, 82, True),
    ("wardrobe/cowboy hat/images/cowboy_1001_BaseColor.jpg", 1024, 82, True),
    ("wardrobe/cowboy hat/images/cowboy_1001_Normal.jpg", 1024, 85, True),
    ("wardrobe/cowboy hat/images/cowboy_1001_Roughness.jpg", 1024, 82, True),
    ("wardrobe/cowboy hat/images/cowboy_1001_Metalness.jpg", 1024, 85, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Glass_BaseColor.png", 512, 82, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Glass_Normal.png", 512, 85, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Glass_Roughness.png", 512, 82, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Glass_Metallic.png", 512, 85, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Clips_BaseColor.png", 512, 82, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Clips_Normal.png", 512, 85, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Clips_Roughness.png", 512, 82, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Clips_Metallic.png", 512, 85, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Mid_BaseColor.png", 512, 82, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Mid_Normal.png", 512, 85, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Mid_Roughness.png", 512, 82, True),
    ("wardrobe/mlg glasses/images/Deal with it sunglasses_Mid_Metallic.png", 512, 85, True),
]


def optimize_one(src: Path, max_edge: int, quality: int) -> tuple[Path, int, int]:
    im = Image.open(src)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
    im.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    out = src.with_suffix(".webp")
    save_kwargs = {"quality": quality, "method": 6}
    if im.mode == "RGBA":
        save_kwargs["lossless"] = False
    im.save(out, "WEBP", **save_kwargs)
    old_size = src.stat().st_size
    new_size = out.stat().st_size
    return out, old_size, new_size


def main() -> None:
    total_old = 0
    total_new = 0
    for rel, max_edge, quality, remove_src in JOBS:
        src = ASSETS / rel.replace("/", os.sep)
        if not src.exists():
            print(f"skip (missing): {rel}")
            continue
        out, old_size, new_size = optimize_one(src, max_edge, quality)
        total_old += old_size
        total_new += new_size
        print(f"{rel}: {old_size // 1024} KB -> {out.name} {new_size // 1024} KB")
        if remove_src and src.exists():
            src.unlink()
    print(f"\nSaved ~{(total_old - total_new) / 1024 / 1024:.1f} MB ({total_old // 1024} -> {total_new // 1024} KB)")


if __name__ == "__main__":
    main()
