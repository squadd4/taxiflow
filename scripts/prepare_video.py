#!/usr/bin/env python3
"""
Prepare the Taxi Flow cinematic hero assets from the source render.

Pipeline
  0. Optionally raise the frame rate with motion-compensated interpolation
     (--interpolate 60), so scrolling steps through real in-between frames
     instead of repeated ones. Slow, so the result is cached in --work.
  1. Decode the source video frame by frame (ffmpeg -> rgb24 pipe).
  2. Blank the rear licence plate in the closing shots: the registration
     characters are replaced by a lighting-matched white fill, leaving only
     the blue "P" strip (brand requirement: no registration numbers).
  3. Write a near-lossless master, then derive the web assets:
       public/video/taxi-flow-cinematic.mp4       1920x1080 scrub-optimised H.264
       public/video/taxi-flow-cinematic-720.mp4   1280x720 for small screens / data saver
       public/video/frames/NNN.webp               frame-sequence fallback, 24 per second
       public/video/poster-{start,end}[-960].webp posters
       app/opengraph-image.jpg                    social preview
       lib/video.manifest.json                    frame rate and frame counts for the site

Usage
  python scripts/prepare_video.py [--src video.mp4] --ffmpeg PATH [--interpolate 60] [--debug]

Requires Python 3.10+, numpy, Pillow and an ffmpeg build with libx264 + libwebp.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

W, H = 1920, 1080
ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
VIDEO_OUT = PUBLIC / "video"
MANIFEST = ROOT / "lib" / "video.manifest.json"
FALLBACK_FPS = 24
OG_TIME = 160 / 24  # seconds: side profile with the green roof at dusk

# White area of the rear plate (x0, y0, x1, y1), measured by hand on the 24 fps
# source render and keyed by its frame numbers. The blue strip sits just left of
# x0. Other frame rates are mapped onto these keys by time; values in between are
# interpolated and then snapped to the real plate edges per frame.
KEY_FPS = 24
PLATE_KEYS = {
    197: (111, 591, 156, 643),
    200: (152, 601, 213, 642),
    203: (197, 600, 276, 644),
    206: (239, 595, 340, 647),
    209: (291, 593, 402, 648),
    212: (350, 598, 470, 647),
    216: (417, 600, 550, 645),
    221: (483, 594, 624, 638),
    226: (530, 597, 672, 640),
    232: (562, 591, 704, 631),
    239: (580, 583, 720, 622),
}
PLATE_FRAMES = sorted(PLATE_KEYS)


# ----------------------------------------------------------------------------
# Plate blanking
# ----------------------------------------------------------------------------

def luminance(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb.astype(np.float32)
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def plate_rect(key_frame: float):
    """Plate box at a point of the 24 fps key timeline (fractional frames allowed)."""
    first, second, last = PLATE_FRAMES[0], PLATE_FRAMES[1], PLATE_FRAMES[-1]
    if key_frame < first - 1 or key_frame > last + 1:
        return None
    if key_frame < first:
        # The plate is already in shot, motion-blurred, a frame before the first key: extrapolate backwards.
        t = (key_frame - first) / (second - first)
        return tuple(round(pa + (pb - pa) * t) for pa, pb in zip(PLATE_KEYS[first], PLATE_KEYS[second]))
    if key_frame >= last:
        # Higher frame rates end a fraction of a key frame after the last key; the plate is still in shot.
        return PLATE_KEYS[last]
    for a, b in zip(PLATE_FRAMES, PLATE_FRAMES[1:]):
        if a <= key_frame <= b:
            t = (key_frame - a) / (b - a)
            return tuple(round(pa + (pb - pa) * t) for pa, pb in zip(PLATE_KEYS[a], PLATE_KEYS[b]))
    return None


def snap_edge(profile: np.ndarray, nominal: int, outward: int, pad: int) -> int:
    """Walk from just inside the nominal edge outwards while the profile stays paper-bright."""
    lo = profile[max(0, nominal - pad): nominal + pad + 1]
    paper = float(np.percentile(profile, 80))
    thr = (float(lo.min()) + paper) / 2
    i = nominal - outward * 2  # start slightly inside
    for _ in range(pad):  # find paper if we started on a dark glyph
        if profile[i] >= thr:
            break
        i -= outward
    for _ in range(pad * 2):
        nxt = i + outward
        if not (0 <= nxt < len(profile)) or profile[nxt] < thr:
            break
        i = nxt
    return int(np.clip(i, nominal - pad, nominal + pad))


def refine_rect(frame: np.ndarray, rect, pad: int = 6):
    x0, y0, x1, y1 = rect
    X0, Y0 = max(0, x0 - pad), max(0, y0 - pad)
    X1, Y1 = min(W, x1 + pad), min(H, y1 + pad)
    lum = luminance(frame[Y0:Y1, X0:X1])
    h, w = y1 - y0, x1 - x0
    rows = slice(y0 - Y0 + h // 4, y0 - Y0 + 3 * h // 4)
    cols = slice(x0 - X0 + w // 6, x0 - X0 + 5 * w // 6)
    col_profile = np.percentile(lum[rows, :], 75, axis=0)
    row_profile = np.percentile(lum[:, cols], 75, axis=1)
    left = snap_edge(col_profile, x0 - X0, -1, pad) + X0
    right = snap_edge(col_profile, x1 - 1 - X0, 1, pad) + X0 + 1
    top = snap_edge(row_profile, y0 - Y0, -1, pad) + Y0
    bottom = snap_edge(row_profile, y1 - 1 - Y0, 1, pad) + Y0 + 1
    return left, top, right, bottom


def blank_plate(frame: np.ndarray, n: int, fps: float):
    """Replace the plate characters in-place. Returns the plate rect or None."""
    rect = plate_rect(n * KEY_FPS / fps)
    if rect is None:
        return None
    x0, y0, x1, y1 = refine_rect(frame, rect)
    fx0, fy0, fx1, fy1 = x0 + 1, y0 + 1, x1 - 1, y1 - 1
    if fx1 - fx0 < 6 or fy1 - fy0 < 6:
        return None

    region = frame[fy0:fy1, fx0:fx1].astype(np.float32)
    h, w = region.shape[:2]
    lum = luminance(region)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    basis = np.stack([np.ones_like(xx), xx / w, yy / h, (xx / w) * (yy / h)], -1)

    # Fit the plate's lighting on paper pixels only (characters are dark).
    paper = lum >= np.percentile(lum, 55)
    coef, *_ = np.linalg.lstsq(basis[paper], region[paper], rcond=None)
    fill = basis @ coef
    fill += np.random.default_rng(n).normal(0, 1.4, fill.shape)

    # Feather the outer two pixels into the untouched plate margin.
    edge = np.minimum.reduce([xx, w - 1 - xx, yy, h - 1 - yy])
    alpha = np.clip((edge + 1) / 3, 0, 1)[..., None]
    out = region * (1 - alpha) + fill * alpha
    frame[fy0:fy1, fx0:fx1] = np.clip(out, 0, 255).astype(np.uint8)
    return x0, y0, x1, y1


# ----------------------------------------------------------------------------
# ffmpeg plumbing
# ----------------------------------------------------------------------------

def decode(ffmpeg: str, src: Path):
    proc = subprocess.Popen(
        [ffmpeg, "-v", "error", "-i", str(src), "-an", "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    size = W * H * 3
    n = 0
    assert proc.stdout
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield n, np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3).copy()
        n += 1
    proc.wait()


def run(cmd: list[str]):
    print("  $ ffmpeg …", Path(cmd[-1]).name)
    subprocess.run(cmd, check=True)


def probe_fps(ffmpeg: str, src: Path) -> float:
    info = subprocess.run([ffmpeg, "-hide_banner", "-i", str(src)], capture_output=True, text=True, errors="replace").stderr
    match = re.search(r"Video:.*?(\d+(?:\.\d+)?) fps", info)
    if not match:
        sys.exit(f"could not read the frame rate of {src}")
    return float(match.group(1))


def interpolate(ffmpeg: str, src: Path, work: Path, fps: int) -> Path:
    """Motion-compensated in-between frames. About a minute per second of 1080p, so the result is cached."""
    out = work / f"{src.stem}-{fps}fps.mp4"
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        print("using cached", out)
        return out
    run([ffmpeg, "-v", "error", "-y", "-i", str(src), "-an",
         "-vf", f"minterpolate=fps={fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
         "-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuv420p", str(out)])
    return out


def debug_plates(ffmpeg: str, src: Path, work: Path, fps: float):
    tiles = []
    step = max(1, round(3 * fps / KEY_FPS))
    first = int((PLATE_FRAMES[0] - 1) * fps / KEY_FPS)
    for n, frame in decode(ffmpeg, src):
        if n < first or (n - first) % step:
            continue
        before = frame.copy()
        rect = blank_plate(frame, n, fps)
        cx0, cy0, cx1, cy1 = plate_rect(n * KEY_FPS / fps) or PLATE_KEYS[PLATE_FRAMES[0]]
        mx, my = (cx0 + cx1) // 2, (cy0 + cy1) // 2
        box = (max(0, mx - 110), my - 40, max(0, mx - 110) + 220, my + 40)
        zoom = 3
        a = Image.fromarray(before).crop(box).resize((660, 240), Image.NEAREST)
        b = Image.fromarray(frame).crop(box).resize((660, 240), Image.NEAREST)
        if rect:
            ImageDraw.Draw(a).rectangle(
                [(rect[0] - box[0]) * zoom, (rect[1] - box[1]) * zoom, (rect[2] - box[0]) * zoom, (rect[3] - box[1]) * zoom],
                outline=(255, 0, 255),
            )
        ImageDraw.Draw(a).text((6, 6), f"f{n}", fill=(255, 255, 0))
        tile = Image.new("RGB", (1330, 246), (25, 25, 25))
        tile.paste(a, (0, 0))
        tile.paste(b, (670, 0))
        tiles.append(tile)
    half = (len(tiles) + 1) // 2
    for k, group in enumerate((tiles[:half], tiles[half:])):
        if not group:
            continue
        sheet = Image.new("RGB", (1330, 246 * len(group)))
        for i, t in enumerate(group):
            sheet.paste(t, (0, 246 * i))
        path = work / f"debug_plates_{k}.png"
        sheet.save(path)
        print("wrote", path)


def build(ffmpeg: str, src: Path, work: Path, fps: float, crf1080: int, crf720: int, gop: int, webp_q: int):
    master = work / "master.mkv"
    enc = subprocess.Popen(
        [ffmpeg, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", f"{fps:g}",
         "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "6", "-pix_fmt", "yuv444p", str(master)],
        stdin=subprocess.PIPE,
    )
    assert enc.stdin
    cleaned = frames = 0
    for n, frame in decode(ffmpeg, src):
        if blank_plate(frame, n, fps):
            cleaned += 1
        enc.stdin.write(frame.tobytes())
        frames += 1
    enc.stdin.close()
    enc.wait()
    print(f"master: {frames} frames at {fps:g} fps, plate blanked on {cleaned}")

    VIDEO_OUT.mkdir(parents=True, exist_ok=True)
    frames_dir = VIDEO_OUT / "frames"
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True)

    # Scrub-optimised H.264: short closed GOP and no B-frames, so a seek never
    # decodes more than gop-1 frames. faststart moves the index to the front.
    x264 = ["-c:v", "libx264", "-profile:v", "high", "-preset", "veryslow", "-tune", "film",
            "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0", "-bf", "0",
            "-x264-params", "open-gop=0", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-an", "-tag:v", "avc1"]
    base = [ffmpeg, "-v", "error", "-y", "-i", str(master)]
    run([*base, *x264, "-crf", str(crf1080), str(VIDEO_OUT / "taxi-flow-cinematic.mp4")])
    run([*base, "-vf", "scale=1280:720:flags=lanczos", *x264, "-crf", str(crf720),
         str(VIDEO_OUT / "taxi-flow-cinematic-720.mp4")])
    # The fallback keeps 24 images per second whatever the video frame rate, to stay light.
    run([*base, "-vf", f"fps={FALLBACK_FPS},scale=1280:720:flags=lanczos", "-vsync", "0", "-c:v", "libwebp",
         "-quality", str(webp_q), "-compression_level", "6", "-start_number", "0", str(frames_dir / "%03d.webp")])
    fallback = len(list(frames_dir.glob("*.webp")))

    def still(frame_no: int, vf: str, out: Path, codec: list[str]):
        run([*base, "-vf", f"select='eq(n\\,{frame_no})',{vf}", "-vsync", "0", "-frames:v", "1", *codec, str(out)])

    webp = ["-c:v", "libwebp", "-quality", "82"]
    last = frames - 1
    for name, frame_no in (("start", 0), ("end", last)):
        still(frame_no, "scale=1920:-2:flags=lanczos", VIDEO_OUT / f"poster-{name}.webp", webp)
        still(frame_no, "scale=960:-2:flags=lanczos", VIDEO_OUT / f"poster-{name}-960.webp", webp)
    still(min(last, round(OG_TIME * fps)), "crop=1920:1008:0:36,scale=1200:630:flags=lanczos",
          ROOT / "app" / "opengraph-image.jpg", ["-q:v", "3"])

    manifest = {
        "fps": int(fps) if fps.is_integer() else fps,
        "frameCount": frames,
        "fallbackFrameCount": fallback,
        "width": W,
        "height": H,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    for f in sorted([*VIDEO_OUT.glob("*.*"), ROOT / "app" / "opengraph-image.jpg", MANIFEST]):
        print(f"  {f.relative_to(ROOT).as_posix():40s} {f.stat().st_size / 1e6:6.2f} MB")
    total = sum(f.stat().st_size for f in frames_dir.glob("*.webp"))
    print(f"  public/video/frames ({fallback} webp)          {total / 1e6:6.2f} MB")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", type=Path, default=ROOT / "video.mp4")
    ap.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    ap.add_argument("--work", type=Path, default=ROOT / ".video-work")
    ap.add_argument("--interpolate", type=int, metavar="FPS", help="raise the frame rate with motion interpolation first, e.g. 60")
    ap.add_argument("--debug", action="store_true", help="only render the plate debug sheets")
    ap.add_argument("--crf1080", type=int, default=25)
    ap.add_argument("--crf720", type=int, default=24)
    ap.add_argument("--gop", type=int, default=0, help="keyframe interval in frames (default: a third of a second)")
    ap.add_argument("--webp-q", type=int, default=68)
    args = ap.parse_args()

    if not args.src.exists():
        sys.exit(f"source video not found: {args.src}")
    args.work.mkdir(parents=True, exist_ok=True)
    src = interpolate(args.ffmpeg, args.src, args.work, args.interpolate) if args.interpolate else args.src
    fps = probe_fps(args.ffmpeg, src)
    if args.debug:
        debug_plates(args.ffmpeg, src, args.work, fps)
    else:
        gop = args.gop or max(8, round(fps / 3))
        build(args.ffmpeg, src, args.work, fps, args.crf1080, args.crf720, gop, args.webp_q)


if __name__ == "__main__":
    main()
