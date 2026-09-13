#!/usr/bin/env python3
"""
Export the app screenshots shown in the "Aplicação" section.

Reads the PNG captures (default: ../Nova pasta), paints over personal data and
writes three sizes per screen to public/images/app:

  <id>-720.webp  phones and narrow columns (downscaled, lightly sharpened)
  <id>.webp      the capture at its own size (lossless when that stays small)
  <id>-2x.webp   the zoom view: captures narrower than 1800 px are enlarged x2
                 with Lanczos and sharpened so text stays crisp on high-density
                 screens. This cannot add detail that is not in the capture.

It also writes lib/screens.manifest.json with the screens that exist and their
sizes. Missing captures are skipped, so adding e.g. taxibot.png and running the
script again is enough to show it. Captions live in lib/screens.ts.

  python scripts/prepare_screens.py [--src "../Nova pasta"]

Requires Python 3.10+ and Pillow.
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "images" / "app"
MANIFEST = ROOT / "lib" / "screens.manifest.json"
URL = "/images/app"

SMALL_WIDTH = 720
BASE_MAX = 1600
LARGE_MIN = 1800
LARGE_MAX = 2560

Crop = tuple[int | None, int | None, int | None, int | None]

# (capture, id, crop as (left, top, right, bottom) with None for the image edge), in page order.
SCREENS: list[tuple[str, str, Crop | None]] = [
    ("n1.png", "painel", None),
    ("n3.png", "mapa", None),
    ("n2.png", "historico", None),
    ("n5.png", "estatisticas", (None, 30, None, None)),  # the top edge cuts through a row of cards
    ("n4.png", "saldos", None),
    ("n6.png", "relatorios", None),
    ("n8.png", "frota", None),
    ("n7.png", "objetivos", None),
    ("modo claro.png", "modo-claro", None),
    ("taxibot.png", "taxibot", None),
]

# Areas painted with the surrounding background, as (x0, y0, x1, y1) in capture pixels.
MASKS: dict[str, list[tuple[int, int, int, int]]] = {}


def resize(image: Image.Image, width: int) -> Image.Image:
    return image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)


def encode(image: Image.Image, allow_lossless: bool) -> tuple[bytes, str]:
    lossy = io.BytesIO()
    image.save(lossy, "WEBP", quality=90, method=6)
    if not allow_lossless:
        return lossy.getvalue(), "q90"
    lossless = io.BytesIO()
    image.save(lossless, "WEBP", lossless=True, quality=100, method=6)
    # Interface captures are mostly flat colour: lossless keeps text edges exact when it stays close in size.
    if lossless.tell() <= lossy.tell() * 1.35:
        return lossless.getvalue(), "lossless"
    return lossy.getvalue(), "q90"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", type=Path, default=ROOT.parent / "Nova pasta")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    manifest = []
    written: set[Path] = set()
    for capture, screen_id, crop in SCREENS:
        source = args.src / capture
        if not source.exists():
            print(f"  skip {capture}: not found in {args.src}")
            continue

        image = Image.open(source).convert("RGB")
        draw = ImageDraw.Draw(image)
        for x0, y0, x1, y1 in MASKS.get(capture, []):
            draw.rectangle((x0, y0, x1, y1), fill=image.getpixel((max(0, x0 - 4), (y0 + y1) // 2)))
        if crop:
            left, top, right, bottom = crop
            image = image.crop((left or 0, top or 0, right or image.width, bottom or image.height))

        base = resize(image, BASE_MAX) if image.width > BASE_MAX else image
        small = (
            resize(image, SMALL_WIDTH).filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
            if image.width > SMALL_WIDTH
            else image
        )
        if image.width < LARGE_MIN:
            large = resize(image, image.width * 2).filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=3))
        else:
            large = resize(image, LARGE_MAX) if image.width > LARGE_MAX else image

        entry: dict[str, object] = {"id": screen_id, "capture": capture}
        for key, img, name, lossless_ok in (
            ("small", small, f"{screen_id}-{SMALL_WIDTH}.webp", False),
            ("base", base, f"{screen_id}.webp", True),
            ("large", large, f"{screen_id}-2x.webp", False),
        ):
            data, mode = encode(img, lossless_ok)
            path = OUT / name
            path.write_bytes(data)
            written.add(path)
            entry[key] = {"src": f"{URL}/{name}", "width": img.width, "height": img.height}
            print(f"  {path.relative_to(ROOT).as_posix():40s} {img.width}x{img.height}  {len(data) / 1024:5.0f} KB  {mode}")
        manifest.append(entry)

    if not manifest:
        sys.exit(f"No captures found in {args.src}; nothing written.")

    for stale in sorted(OUT.glob("*.webp")):
        if stale not in written:
            stale.unlink()
            print(f"  removed {stale.relative_to(ROOT).as_posix()}")

    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  {MANIFEST.relative_to(ROOT).as_posix()}: {len(manifest)} screens")


if __name__ == "__main__":
    main()
