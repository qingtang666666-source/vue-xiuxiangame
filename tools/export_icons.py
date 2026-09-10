#!/usr/bin/env python3
"""Export the generated master icon to the game's PWA/favicon/desktop icons.

Run from the project root after `python tools/gen_icon.py`:
    python tools/export_icons.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
MASTER_GLOB = "tools/icon-master-*.png"


def latest_master() -> Path:
    candidates = sorted(ROOT.glob(MASTER_GLOB), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        raise SystemExit(f"未找到主图，请先运行 gen_icon.py（匹配 {MASTER_GLOB}）")
    return candidates[0]


def resize(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.LANCZOS)


def export(master: Path) -> None:
    img = Image.open(master).convert("RGBA")
    print(f"master: {master.name} size={img.size} mode={img.mode}")

    sizes_map = {
        "public/icons/icon-512x512.png": 512,
        "public/icons/icon-192x192.png": 192,
        "public/icons/apple-touch-icon.png": 180,
    }
    for rel, size in sizes_map.items():
        target = ROOT / rel
        resize(img, size).save(target, format="PNG", optimize=True)
        print(f"wrote {rel} ({size}x{size})")

    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (192, 192), (256, 256)]
    for rel in ("public/favicon.ico", "game-icon.ico"):
        target = ROOT / rel
        img.save(target, format="ICO", sizes=ico_sizes)
        print(f"wrote {rel} (sizes {[f'{w}x{h}' for w, h in ico_sizes]})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", default=None)
    args = parser.parse_args()
    export(Path(args.master) if args.master else latest_master())


if __name__ == "__main__":
    main()
