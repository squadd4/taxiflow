#!/usr/bin/env python3
"""
Export the app screenshots shown in the "à medida" section.

Reads the PNG captures in "Nova pasta" (next to package.json), hides personal data, and writes WebP
files to public/images/app. Run again whenever the captures change:

  python scripts/prepare_screens.py [--src "Nova pasta"]

Requires Python 3.10+ and Pillow.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "images" / "app"
SMALL_WIDTH = 960

# (capture, output name, max width)
SCREENS = [
    ("1.png", "hoje", 1600),
    ("2.png", "historico", 1600),
    ("3.png", "mapa", 1440),
    ("4.png", "estatisticas", None),
    ("5.png", "relatorios", None),
]

# Areas painted with the surrounding background, as (x0, y0, x1, y1).
# 5.png shows a real driver's name after "Motorista:".
MASKS = {"5.png": [(860, 303, 982, 322)]}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", type=Path, default=ROOT / "Nova pasta")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    for capture, name, max_width in SCREENS:
        image = Image.open(args.src / capture).convert("RGB")
        draw = ImageDraw.Draw(image)
        for x0, y0, x1, y1 in MASKS.get(capture, []):
            background = image.getpixel((x0 - 4, (y0 + y1) // 2))
            draw.rectangle((x0, y0, x1, y1), fill=background)

        if max_width and image.width > max_width:
            image = image.resize((max_width, round(image.height * max_width / image.width)), Image.LANCZOS)

        outputs = [(image, OUT / f"{name}.webp")]
        if image.width > SMALL_WIDTH:
            small = image.resize((SMALL_WIDTH, round(image.height * SMALL_WIDTH / image.width)), Image.LANCZOS)
            outputs.append((small, OUT / f"{name}-{SMALL_WIDTH}.webp"))

        for img, path in outputs:
            img.save(path, "WEBP", quality=86, method=6)
            print(f"  {path.relative_to(ROOT).as_posix():38s} {img.width}x{img.height}  {path.stat().st_size / 1024:4.0f} KB")


if __name__ == "__main__":
    main()
