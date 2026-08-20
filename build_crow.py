"""
Turn a green-screen crow flight clip into a smooth sprite sheet.

    python build_crow.py assets/video/_crow-raw.mp4 [frames]

Steps:
  1. Pull every frame out of the clip.
  2. Key the green: build alpha from how far each pixel is from
     green in chroma, not from a flat RGB distance, so wingtips
     and the fine feather edge survive.
  3. Despill: green bleeds onto black feathers at the edge, so
     clamp the green channel back to the red/blue level.
  4. Find one complete wingbeat by autocorrelating the bird's
     silhouette height, then resample that cycle to N frames.
  5. Align every frame on the body so the bird does not swim
     around inside its own box.
  6. Write a horizontal sprite sheet plus a single glide frame.
"""

import os, sys, glob, shutil, subprocess
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "assets", "img")
TMP = os.path.join(ROOT, "_crowframes")


def ffmpeg():
    for c in ("ffmpeg", os.path.expandvars(
            r"%LOCALAPPDATA%\Microsoft\WinGet\Packages"
            r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
            r"\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe")):
        if shutil.which(c) or os.path.exists(c):
            return c
    raise SystemExit("ffmpeg not found")


def extract(src):
    if os.path.isdir(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    subprocess.run([ffmpeg(), "-v", "error", "-i", src,
                    os.path.join(TMP, "f%04d.png")], check=True)
    return sorted(glob.glob(os.path.join(TMP, "f*.png")))


def key(path):
    """Green screen -> RGBA. Alpha from chroma distance, then despill."""
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # How much greener than the strongest of red/blue is this pixel?
    excess = g - np.maximum(r, b)
    # Fully green at +55, fully subject at +8. Soft edge between.
    alpha = np.clip((55.0 - excess) / 47.0, 0, 1)
    # Anything genuinely dark is the bird, whatever the chroma says.
    dark = (r + g + b) / 3.0 < 70
    alpha = np.where(dark, 1.0, alpha)

    # Despill: pull the green channel down to the red/blue level so
    # the feather edge stops glowing.
    g2 = np.minimum(g, (r + b) / 2.0 + 6)
    out = np.dstack([r, g2, b, alpha * 255.0])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")



def solidify(im):
    """The key cuts through thin backlit primaries and leaves them
    see-through. Anything the background cannot reach from the
    border is inside the bird, so force it opaque and keep the soft
    alpha only at the true outline."""
    from collections import deque
    a = np.asarray(im).astype(np.float32).copy()
    al = a[..., 3] / 255.0
    h, w = al.shape

    outside = np.zeros((h, w), bool)
    loose = al < 0.55                      # could be background
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if loose[y, x] and not outside[y, x]:
                outside[y, x] = True; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if loose[y, x] and not outside[y, x]:
                outside[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and loose[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True; dq.append((ny, nx))

    inside = ~outside
    # opaque everywhere inside except a 1px feathered rim
    rim = inside & (
        np.roll(outside, 1, 0) | np.roll(outside, -1, 0) |
        np.roll(outside, 1, 1) | np.roll(outside, -1, 1))
    newal = np.where(inside, 1.0, al)
    newal = np.where(rim, np.maximum(al, 0.72), newal)
    a[..., 3] = np.clip(newal, 0, 1) * 255.0

    # a translucent primary also lost its colour to the green plate;
    # pull those pixels back toward the bird's own tone
    thin = inside & (al < 0.85)
    if thin.any():
        body = a[..., :3][inside & (al > 0.95)]
        tone = body.mean(axis=0) if len(body) else np.array([40., 40., 44.])
        for c in range(3):
            ch = a[..., c]
            ch[thin] = ch[thin] * 0.45 + tone[c] * 0.55
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def silhouette(im):
    """(ink pixels, top, bottom, body row, body centre x)"""
    al = np.asarray(im)[..., 3]
    m = al > 110
    if not m.any():
        return 0, 0, 0, 0, 0
    rows = m.sum(axis=1)
    ys = np.where(rows > 0)[0]
    body = int(rows.argmax())
    cols = np.where(m[body])[0]
    cx = float(cols.mean()) if len(cols) else im.width / 2
    return int(m.sum()), int(ys[0]), int(ys[-1]), body, cx


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(IMG, "..", "video", "_crow-raw.mp4")
    want = int(sys.argv[2]) if len(sys.argv) > 2 else 18

    files = extract(src)
    print("extracted", len(files), "frames")

    keyed, stats = [], []
    for f in files:
        im = key(f)
        bb = im.getbbox()
        if not bb:
            continue
        im = im.crop(bb)
        s = silhouette(im)
        if s[0] < 400:                       # nothing meaningful keyed
            continue
        keyed.append(im)
        stats.append(s)
    print("usable", len(keyed))
    if len(keyed) < 8:
        raise SystemExit("not enough usable frames — check the key")

    # --- find one wingbeat: the silhouette is tallest at the top of
    #     the stroke and shortest at the bottom, so height oscillates.
    h = np.array([s[2] - s[1] for s in stats], dtype=np.float32)
    h = (h - h.mean()) / (h.std() + 1e-6)
    best, bestscore = None, -9
    for lag in range(6, min(len(h) - 4, 48)):
        c = float(np.corrcoef(h[:-lag], h[lag:])[0, 1])
        if c > bestscore:
            bestscore, best = c, lag
    print("wingbeat period ~", best, "frames (corr %.2f)" % bestscore)

    start = int(np.argmax(h[:max(1, best)]))     # begin at top of stroke
    cycle = [keyed[(start + round(i * best / want)) % len(keyed)] for i in range(want)]
    print("solidifying", len(cycle), "frames")
    cycle = [solidify(c) for c in cycle]

    # --- normalise scale on body width, align on the body row
    anch = [silhouette(c) for c in cycle]
    target = float(np.median([a[0] ** 0.5 for a in anch]))
    norm = []
    for im, a in zip(cycle, anch):
        s = target / max(1e-3, a[0] ** 0.5)
        s = min(max(s, 0.75), 1.35)                # never distort much
        im2 = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        norm.append((im2, a[4] * s, a[3] * s))

    L = max(x for _, x, _ in norm); R = max(i.width - x for i, x, _ in norm)
    T = max(y for _, _, y in norm); B = max(i.height - y for i, _, y in norm)
    CW, CH = int(L + R) + 6, int(T + B) + 6
    print("cell", CW, "x", CH)

    cells = []
    for im, ax, ay in norm:
        c = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        c.paste(im, (int(L - ax) + 3, int(T - ay) + 3), im)
        cells.append(c)

    # A crow beats, then glides. Repeat the flattest frame on the end
    # so the loop holds a glide instead of hammering continuously.
    spread = [abs(silhouette(c)[2] - silhouette(c)[1]) for c in cells]
    glide_i = int(np.argmin(np.abs(np.array(spread) - np.median(spread))))
    GLIDE = 7
    order = list(range(want)) + [glide_i] * GLIDE
    total = len(order)

    sheet = Image.new("RGBA", (CW * total, CH), (0, 0, 0, 0))
    for i, fi in enumerate(order):
        sheet.paste(cells[fi], (i * CW, 0), cells[fi])
    want = total

    # 260px per frame is plenty for a bird that renders at 88px
    scale = 260.0 / CW
    sheet = sheet.resize((round(sheet.width * scale), round(sheet.height * scale)), Image.LANCZOS)
    sheet.save(os.path.join(IMG, "crow-sprite.png"), "PNG", optimize=True)
    fw = sheet.width // want
    print("sprite %dx%d, %d frames, frame %dpx, %dKB"
          % (sheet.width, sheet.height, want, fw,
             os.path.getsize(os.path.join(IMG, "crow-sprite.png")) // 1024))

    g = cells[glide_i].resize((round(CW * scale), round(CH * scale)), Image.LANCZOS)
    g.save(os.path.join(IMG, "crow-glide.png"), "PNG", optimize=True)

    with open(os.path.join(IMG, "crow-sprite.txt"), "w") as fh:
        fh.write("%d %d %d\n" % (want, fw, sheet.height))
    shutil.rmtree(TMP, ignore_errors=True)
    print("frames:", want, "| aspect", round(fw / sheet.height, 3))


if __name__ == "__main__":
    main()
