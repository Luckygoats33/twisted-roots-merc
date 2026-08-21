import os, glob
from PIL import Image

os.makedirs('perf/img', exist_ok=True)

print("=== existing variants for key assets ===")
for stem in ['w-river', 'logo-foot', 'crow-sprite', 'crow-perch', 'logo-head', 'bakery-case', 'maker-pottery', 'river']:
    v = sorted(os.path.basename(p) for p in glob.glob('assets/img/%s*' % stem))
    print("  %-14s %s" % (stem, v))

JOBS = [
    # (src, out, resize_to, quality, note)
    ('assets/img/crow-sprite.png', 'perf/img/crow-sprite.webp', None, 82, 'CSS bg, alpha'),
    ('assets/img/crow-perch.png', 'perf/img/crow-perch.webp', None, 82, 'CSS bg, alpha'),
    ('assets/img/logo-foot.png', 'perf/img/logo-foot.webp', (440, 379), 85, 'footer logo'),
    ('assets/img/logo-foot.png', 'perf/img/logo-foot-300.webp', (300, 258), 85, 'footer logo @2x of 150px'),
    ('assets/img/logo-head.png', 'perf/img/logo-head.webp', None, 85, 'header logo'),
]
print("\n=== generated ===")
for src, out, size, q, note in JOBS:
    if not os.path.exists(src):
        print("  MISSING", src)
        continue
    im = Image.open(src)
    orig_dim = im.size
    if size:
        im = im.resize(size, Image.LANCZOS)
    im.save(out, 'WEBP', quality=q, method=6)
    a, b = os.path.getsize(src), os.path.getsize(out)
    print("  %-28s %7.0f KB %-12s -> %-30s %7.0f KB  (-%.0f%%)  %s" % (
        os.path.basename(src), a / 1024, '%dx%d' % orig_dim, os.path.basename(out), b / 1024,
        100 * (1 - b / a), note))
