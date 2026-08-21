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
CELL_W = 190                      # px per cell in the finished sheet


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

    # The beam: warm, light, and never very dark. Two passes — the
    # lit face of it, and the washed-out grey-tan edge that the
    # first pass leaves behind as a ghost line under the feet.
    wood = (r >= g - 2) & (g >= b - 2) & (val > 96) & (sat > 0.055)
    alpha = np.where(wood, 0.0, alpha)
    pale = (val > 120) & (sat < 0.30) & ((r + g + b) / 3.0 > 108)
    alpha = np.where(pale, 0.0, alpha)

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
    #
    # But the bird enters from off-frame, so the raw union of every
    # bbox is the whole plate and the perched bird ends up a speck
    # inside it. Take the box from the SETTLED portion instead —
    # the frames where it is actually standing on the beam — then
    # pad. The fly-in and take-off clip at the edges, which is what
    # they should do: it arrives from outside and leaves outside.
    boxes = [k.getbbox() for k in keyed if k.getbbox()]
    # A perched bird has its wings FOLDED, so it covers the least
    # area of the whole shot. Rank by ink and take the quiet band:
    # 15th-55th percentile is the bird standing there, not the
    # wing-spread landing or take-off.
    order = sorted(range(len(boxes)), key=lambda i: inks[lo + i])
    a, b_ = int(len(order) * 0.15), int(len(order) * 0.55)
    settled = [boxes[i] for i in order[a:b_]]
    if len(settled) < 5:
        settled = boxes
    import statistics as st
    L = int(st.median([b[0] for b in settled])); T = int(st.median([b[1] for b in settled]))
    R = int(st.median([b[2] for b in settled])); B = int(st.median([b[3] for b in settled]))
    # Faint residue from the beam post reaches the bottom of the
    # plate and drags the box down with it. A perched crow is about
    # as tall as it is long, so cap the height rather than trust it.
    print("settled box RAW", (L, T, R, B), "=", R - L, "x", B - T)
    B = min(B, T + int((R - L) * 1.02))
    padx = int((R - L) * 0.30); pady_t = int((B - T) * 0.45); pady_b = int((B - T) * 0.08)
    W0, H0 = keyed[0].width, keyed[0].height
    L = max(0, L - padx); R = min(W0, R + padx)
    T = max(0, T - pady_t); B = min(H0, B + pady_b)
    print("settled box padded", (L, T, R, B), "=", R - L, "x", B - T)

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
