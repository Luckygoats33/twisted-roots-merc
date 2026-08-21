def srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = rgb
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def px(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(rgb):
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def unblend(blend, bg, a):
    """recover the pre-opacity ink colour"""
    return tuple((blend[i] - bg[i] * (1 - a)) / a for i in range(3))


def blend(ink, bg, a):
    return tuple(ink[i] * a + bg[i] * (1 - a) for i in range(3))


CASES = [
    ('.prodcard__mt  (shop.css:146)', '#8e887f', '#fbf7ef', 0.55),
    ('.req .ct       (site.css:321)', '#8a8378', '#f4ede1', 0.50),
    ('.stat .k       (site.css:381)', '#837c74', '#fbf7ef', 0.55),
    ('.drive-cell b  (site.css:185)', '#735320', '#d99a34', 0.55),
]
for label, fg, bg, a in CASES:
    B, G = px(fg), px(bg)
    ink = unblend(B, G, a)
    print("%s" % label)
    print("   observed %s on %s  ratio=%.2f  (opacity %.2f)" % (fg, bg, ratio(B, G), a))
    print("   recovered ink = %s   ratio at opacity 1 = %.2f" % (hx(ink), ratio(ink, G)))
    found = None
    for i in range(int(a * 100), 101):
        na = i / 100.0
        r = ratio(blend(ink, G, na), G)
        if r >= 4.55:
            found = (na, r, hx(blend(ink, G, na)))
            break
    if found:
        print("   -> opacity %.2f gives ratio %.2f (renders as %s)" % found)
    else:
        print("   -> opacity 1.0 max ratio %.2f  -- NOT ENOUGH, need explicit colour" % ratio(ink, G))
    print()
