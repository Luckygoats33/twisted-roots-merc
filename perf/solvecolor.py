def srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexs):
    h = hexs.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hex_of(r, g, b):
    return '#%02x%02x%02x' % (max(0, min(255, int(round(r)))),
                              max(0, min(255, int(round(g)))),
                              max(0, min(255, int(round(b)))))


def darken_to(fg, bg, target):
    """Scale fg toward black keeping hue until ratio >= target."""
    h = fg.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    for i in range(1000, -1, -1):
        k = i / 1000.0
        cand = hex_of(r * k, g * k, b * k)
        if ratio(cand, bg) >= target:
            return cand
    return '#000000'


CASES = [
    ('.prodcard__mt', '#8e887f', '#fbf7ef', 11.2, 'bold', 4.5),
    ('.reqs .req .top .ct', '#8a8378', '#f4ede1', 12.8, 'bold', 4.5),
    ('.stat-row .stat .k', '#837c74', '#fbf7ef', 10.56, 'bold', 4.5),
    ('.drive-cell b', '#735320', '#d99a34', 11.2, 'bold', 4.5),
]
print("%-22s %-9s %-9s %6s -> %-9s %6s" % ('selector', 'fg', 'bg', 'ratio', 'new fg', 'new'))
for sel, fg, bg, px, wt, need in CASES:
    cur = ratio(fg, bg)
    new = darken_to(fg, bg, need + 0.08)
    print("%-22s %-9s %-9s %6.2f -> %-9s %6.2f" % (sel, fg, bg, cur, new, ratio(new, bg)))

print("\n--- .drive-cell b alternatives (dark text on amber #d99a34) ---")
for c in ['#4a3410', '#3d2b0d', '#2b1e09', '#40300f']:
    print("  %s on #d99a34 = %.2f" % (c, ratio(c, '#d99a34')))

print("\n--- verify brand palette pairs ---")
for fg, bg, lbl in [('#8e887f', '#fbf7ef', 'prodcard meta'),
                    ('#6f6a62', '#fbf7ef', 'candidate A'),
                    ('#6b655c', '#f4ede1', 'candidate B')]:
    print("  %-13s %s on %s = %.2f" % (lbl, fg, bg, ratio(fg, bg)))
