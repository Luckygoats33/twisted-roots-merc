"""
Build the one-shot "crow lands on the sign" sprite.

    python build_perch.py assets/video/_crow-perch.mp4 [frames]

The source clip is a green-screen plate of a crow flying in,
landing on a wooden beam, looking left, looking right and taking
off again. Two things have to come out: the green, and the beam
itself — the site already has a beam under the carved sign, and
two of them would look ridiculous. The bird's feet are almost
black, so they survive the beam removal and end up standing on
the real one.

Output: assets/img/crow-perch.png (a horizontal sprite sheet, one
row) and crow-perch.txt with "<frames> <cellW> <cellH>".
"""

import os, sys, glob, shutil, subprocess
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "assets", "img")
TMP = os.path.join(ROOT, "_perchframes")
CELL_W = 170                      # px per cell in the finished sheet


def ffmpeg():
    c = shutil.which("ffmpeg")
    if c:
        return c
    p = os.path.expandvars(
        r"%LOCALAPPDATA%\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe")
    if os.path.exists(p):
        return p
    raise SystemExit("ffmpeg not found")


def extract(src):
    if os.path.isdir(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    subprocess.run([ffmpeg(), "-v", "error", "-i", src,
                    os.path.join(TMP, "f%04d.png")], check=True)
    return sorted(glob.glob(os.path.join(TMP, "f*.png")))


def key(path):
    """Drop the green screen AND the wooden beam. Keep the bird."""
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    val = mx
    sat = np.where(mx > 1, (mx - mn) / np.maximum(mx, 1), 0)

    # green plate
    green = (g - np.maximum(r, b))
    alpha = np.clip((52.0 - green) / 44.0, 0, 1)

    # the beam: warm, light, and not very dark — r > g > b, bright
    wood = (r > g + 6) & (g > b + 4) & (val > 105) & (sat > 0.12)
    alpha = np.where(wood, 0.0, alpha)

    # anything genuinely dark is the bird, whatever else it looks like
    dark = (r + g + b) / 3.0 < 78
    alpha = np.where(dark, 1.0, alpha)

    # despill
    g2 = np.minimum(g, (r + b) / 2.0 + 6)
    out = np.dstack([r, g2, b, alpha * 255.0])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def ink(im):
    return int((np.asarray(im)[..., 3] > 120).sum())


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "assets", "video", "_crow-perch.mp4")
    want = int(sys.argv[2]) if len(sys.argv) > 2 else 36

    files = extract(src)
    print("extracted", len(files))

    keyed = [key(f) for f in files]
    inks = [ink(k) for k in keyed]
    peak = max(inks)

    # Keep the performance: from the first frame the bird is really
    # present to the last. Drop the lead-in and the black tail.
    lo = next(i for i, v in enumerate(inks) if v > peak * 0.06)
    hi = len(inks) - 1 - next(i for i, v in enumerate(reversed(inks)) if v > peak * 0.06)
    keyed = keyed[lo:hi + 1]
    print("performance frames", lo, "->", hi, "=", len(keyed))

    # The camera is locked, so one shared crop keeps the bird in the
    # right place across the whole shot — no per-frame alignment.
    boxes = [k.getbbox() for k in keyed if k.getbbox()]
    L = min(b[0] for b in boxes); T = min(b[1] for b in boxes)
    R = max(b[2] for b in boxes); B = max(b[3] for b in boxes)
    print("union box", (L, T, R, B), "=", R - L, "x", B - T)

    idx = [round(i * (len(keyed) - 1) / (want - 1)) for i in range(want)]
    cells = [keyed[i].crop((L, T, R, B)) for i in idx]

    CW, CH = R - L, B - T
    scale = CELL_W / CW
    cw, ch = CELL_W, max(1, round(CH * scale))

    sheet = Image.new("RGBA", (cw * want, ch), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.paste(c.resize((cw, ch), Image.LANCZOS), (i * cw, 0))
    sheet.save(os.path.join(IMG, "crow-perch.png"), "PNG", optimize=True)

    with open(os.path.join(IMG, "crow-perch.txt"), "w") as fh:
        fh.write("%d %d %d\n" % (want, cw, ch))

    shutil.rmtree(TMP, ignore_errors=True)
    print("perch sheet %dx%d, %d frames, cell %dx%d, %dKB"
          % (sheet.width, sheet.height, want, cw, ch,
             os.path.getsize(os.path.join(IMG, "crow-perch.png")) // 1024))


if __name__ == "__main__":
    main()
