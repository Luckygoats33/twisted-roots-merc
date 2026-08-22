#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""build_css.py - concatenate the render-blocking stylesheets into one bundle.

    python build_css.py            # write assets/css/bundle.css
    python build_css.py --check    # verify the bundle is up to date, write nothing
    python build_css.py --raw      # concatenate without minifying

WHY
    Every page used to load six blocking <link>s in <head>.  PERF-AUDIT.md 3.8
    measured that at 1,190-2,070 ms of render-blocking time on mobile; bundling
    plus async fonts took journal mobile 68 -> 96 and shop mobile 68 -> 98.

ORDER IS LOAD-BEARING
    site -> motion -> roots -> mobile -> polish -> perf.  That is the exact order
    the <link>s were in.  perf.css MUST stay last: it is the accessibility and
    layout-shift correction layer and several of its rules win only by being
    later in the cascade.  print.css is NOT bundled - it is media="print" and
    therefore already non-blocking.  shop.css is NOT bundled - one page links it.

    Concatenation only.  No reordering, no de-duplication, no rule rewriting.
    Every url() in the six sources is "../img/..." and the bundle is written
    into the same assets/css/ directory, so they resolve to the same files.

MINIFICATION
    The minifier is a small real CSS parser, not a pile of regexes: it knows
    about strings, url(), parentheses and nesting, so it never touches a "+"
    inside calc() or a comma inside content:"".  After minifying, the output is
    re-parsed and its structure compared against the structure of the raw
    concatenation.  If one rule, prelude or declaration differs the script
    fails and writes nothing.  Pass --raw to rule the minifier out.

    Regenerate with `python build_css.py`, then `python rehash.py` to re-stamp
    the ?v= cache-bust token.  Never hand-edit assets/css/bundle.css.
"""
import hashlib
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CSS_DIR = os.path.join(ROOT, "assets", "css")
OUT = os.path.join(CSS_DIR, "bundle.css")

# The six blocking sheets, in <link> order.  Do not reorder.
SOURCES = [
    "site.css",
    "motion.css",
    "roots.css",
    "mobile.css",
    "polish.css",
    "perf.css",
]

# Sheets that are deliberately outside the bundle. Anything in assets/css/ that
# is neither a SOURCE nor listed here gets a warning, because the usual reason a
# new stylesheet appears is that someone is about to add a seventh blocking
# <link> to 383 pages - it belongs in SOURCES instead.
NOT_BUNDLED = {
    "print.css": 'media="print", already non-blocking',
    "shop.css": "linked by shop.html only",
    "bundle.css": "this file",
}

# At-rules whose body holds nested rules rather than declarations.
GROUP_AT = ("media", "supports", "container", "layer", "scope", "document", "keyframes")


# ---------------------------------------------------------------------------
# a small, string-aware CSS parser
# ---------------------------------------------------------------------------

def _skip_comment(s, i):
    end = s.find("*/", i + 2)
    return len(s) if end < 0 else end + 2


def _skip_string(s, i):
    q = s[i]
    j = i + 1
    n = len(s)
    while j < n:
        if s[j] == "\\":
            j += 2
            continue
        if s[j] == q:
            return j + 1
        j += 1
    return n


def _scan(s, i, stop):
    """Advance from i until one of the chars in `stop` is hit at paren depth 0,
    honouring strings and comments.  Returns (text_before, index_of_stop)."""
    out = []
    depth = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == "/" and i + 1 < n and s[i + 1] == "*":
            i = _skip_comment(s, i)
            out.append(" ")
            continue
        if c in "\"'":
            j = _skip_string(s, i)
            out.append(s[i:j])
            i = j
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        if depth == 0 and c in stop:
            return "".join(out), i
        out.append(c)
        i += 1
    return "".join(out), n


def _block(s, i):
    """Return (body, index_after_closing_brace) for a block whose '{' was at i-1."""
    depth = 1
    out = []
    n = len(s)
    while i < n:
        c = s[i]
        if c == "/" and i + 1 < n and s[i + 1] == "*":
            j = _skip_comment(s, i)
            out.append(s[i:j])
            i = j
            continue
        if c in "\"'":
            j = _skip_string(s, i)
            out.append(s[i:j])
            i = j
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return "".join(out), i + 1
        out.append(c)
        i += 1
    return "".join(out), n


def _decls(body):
    """Split a declaration block into [(prop, value), ...]."""
    out = []
    i = 0
    n = len(body)
    while i < n:
        chunk, j = _scan(body, i, ";")
        chunk = chunk.strip()
        if chunk:
            name, k = _scan(chunk, 0, ":")
            if k >= len(chunk):
                out.append((None, chunk))          # a stray token; keep verbatim
            else:
                out.append((name.strip(), chunk[k + 1:].strip()))
        i = j + 1
    return out


def parse(s):
    """Parse a stylesheet into a list of (kind, prelude, body) nodes."""
    nodes = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c == "/" and i + 1 < n and s[i + 1] == "*":
            i = _skip_comment(s, i)
            continue
        if c == "}":                                # stray close brace
            i += 1
            continue
        prelude, j = _scan(s, i, "{;")
        prelude = " ".join(prelude.split())
        if j >= n:
            if prelude:
                nodes.append(("at", prelude, None))
            break
        if s[j] == ";":
            if prelude:
                nodes.append(("at", prelude, None))
            i = j + 1
            continue
        body, end = _block(s, j + 1)
        low = prelude.lower()
        is_group = (low.startswith("@")
                    and low.lstrip("@").split()[0].split("(")[0] in GROUP_AT)
        if is_group:
            nodes.append(("group", prelude, parse(body)))
        else:
            nodes.append(("rule", prelude, _decls(body)))
        i = end
    return nodes


# ---------------------------------------------------------------------------
# normalising + serialising
# ---------------------------------------------------------------------------

def _split_top(s, sep):
    """Split on `sep` at paren depth 0, string aware."""
    parts = []
    i = 0
    while True:
        chunk, j = _scan(s, i, sep)
        parts.append(chunk)
        if j >= len(s):
            return parts
        i = j + 1


def tighten_prelude(p):
    """Collapse whitespace in a selector / at-rule prelude.  Combinators are only
    tightened at paren depth 0, so ':nth-child(2n + 1)' survives untouched."""
    p = " ".join(p.split())
    parts = []
    for sel in _split_top(p, ","):
        sel = sel.strip()
        out = []
        i = 0
        n = len(sel)
        depth = 0
        while i < n:
            c = sel[i]
            if c in "\"'":
                j = _skip_string(sel, i)
                out.append(sel[i:j])
                i = j
                continue
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            if depth == 0 and c in ">+~":
                while out and out[-1] == " ":
                    out.pop()
                out.append(c)
                i += 1
                while i < n and sel[i] == " ":
                    i += 1
                continue
            out.append(c)
            i += 1
        parts.append("".join(out))
    return ",".join(parts)


def tighten_value(v):
    """Collapse whitespace in a declaration value and drop the space after a
    top-level comma.  Everything else is left exactly as authored, so calc()
    keeps the spaces it needs around + and -."""
    v = " ".join(v.split())
    return ",".join(x.strip() for x in _split_top(v, ","))


def normalise(nodes):
    """Canonical structural form, used for the before/after equality check."""
    out = []
    for kind, prelude, body in nodes:
        if kind == "group":
            out.append(("group", tighten_prelude(prelude), normalise(body)))
        elif kind == "rule":
            out.append(("rule", tighten_prelude(prelude),
                        tuple((p, tighten_value(v)) for p, v in body)))
        else:
            out.append(("at", tighten_prelude(prelude), None))
    return tuple(out)


def emit(nodes, buf):
    for kind, prelude, body in nodes:
        if kind == "at":
            buf.append(tighten_prelude(prelude) + ";")
        elif kind == "group":
            buf.append(tighten_prelude(prelude) + "{")
            emit(body, buf)
            buf.append("}")
        else:
            decls = [tighten_value(v) if p is None else p + ":" + tighten_value(v)
                     for p, v in body]
            if not decls:
                continue                       # an empty rule renders nothing
            buf.append(tighten_prelude(prelude) + "{" + ";".join(decls) + "}")
    return buf


def count(nodes):
    rules = groups = decls = ats = 0
    for kind, _prelude, body in nodes:
        if kind == "group":
            groups += 1
            r, g, d, a = count(body)
            rules += r
            groups += g
            decls += d
            ats += a
        elif kind == "rule":
            rules += 1
            decls += len(body)
        else:
            ats += 1
    return rules, groups, decls, ats


def _report_mismatch(a, b):
    def flat(nodes, path=""):
        for kind, prelude, body in nodes:
            if kind == "group":
                for x in flat(body, path + prelude + " "):
                    yield x
            else:
                yield (path + prelude, body)
    fa, fb = list(flat(a)), list(flat(b))
    print("  source rules: %d   minified rules: %d" % (len(fa), len(fb)))
    for i in range(min(len(fa), len(fb))):
        if fa[i] != fb[i]:
            print("  first difference at rule %d:" % i)
            print("    source:   %r" % (fa[i],))
            print("    minified: %r" % (fb[i],))
            break


# ---------------------------------------------------------------------------

def build(minify=True):
    missing = [f for f in SOURCES if not os.path.exists(os.path.join(CSS_DIR, f))]
    if missing:
        sys.exit("build_css.py: missing source stylesheet(s): " + ", ".join(missing))

    chunks, sizes = [], []
    for f in SOURCES:
        text = open(os.path.join(CSS_DIR, f), encoding="utf-8").read()
        if text.lstrip().startswith("@charset"):
            sys.exit("build_css.py: %s starts with @charset; refusing to bundle" % f)
        sizes.append((f, len(text.encode("utf-8"))))
        chunks.append("/* ---- %s ---- */\n%s" % (f, text))
    raw = "\n".join(chunks)

    src_tree = parse(raw)
    src_norm = normalise(src_tree)

    if minify:
        body = "\n".join(emit(src_tree, []))
        if normalise(parse(body)) != src_norm:
            _report_mismatch(src_norm, normalise(parse(body)))
            sys.exit("build_css.py: minified output does not match the source "
                     "structure; nothing written.  Re-run with --raw.")
    else:
        body = raw

    r, g, d, a = count(src_tree)
    header = (
        "/* bundle.css - GENERATED FILE, DO NOT EDIT.\n"
        "   Built by build_css.py from, in this exact cascade order:\n"
        "     %s\n"
        "   print.css is deliberately NOT bundled (media=\"print\", already\n"
        "   non-blocking).  shop.css is NOT bundled (one page links it).\n"
        "   perf.css must stay last.  Edit the sources, then run:\n"
        "     python build_css.py && python rehash.py\n"
        "   %d rules, %d at-rule blocks, %d declarations. */\n"
    ) % (" -> ".join(SOURCES), r, g, d)

    return header + body + "\n", sizes, (r, g, d, a)


def stray_sheets():
    known = set(SOURCES) | set(NOT_BUNDLED)
    return sorted(f for f in os.listdir(CSS_DIR)
                  if f.endswith(".css") and f not in known)


def main():
    minify = "--raw" not in sys.argv
    check = "--check" in sys.argv
    out, sizes, (r, g, d, a) = build(minify)

    for f in stray_sheets():
        print("  !! assets/css/%s is neither bundled nor listed in NOT_BUNDLED." % f)
        print("     If pages are meant to load it, add it to SOURCES (before perf.css)")
        print("     and rebuild - do not add a second blocking <link> to 383 pages.")

    raw_total = sum(s for _f, s in sizes)
    new = out.encode("utf-8")
    old = open(OUT, "rb").read() if os.path.exists(OUT) else None

    if check:
        if old == new:
            print("bundle.css is up to date (%d bytes)" % len(new))
            return 0
        print("bundle.css is STALE - run: python build_css.py")
        return 1

    if old == new:
        print("bundle.css unchanged (%d bytes) - already up to date" % len(new))
    else:
        open(OUT, "wb").write(new)

    for f, s in sizes:
        print("  %-12s %8d B" % (f, s))
    print("  %-12s %8d B  (6 files concatenated)" % ("sources", raw_total))
    print("  %-12s %8d B  %s" % ("bundle.css", len(new), "minified" if minify else "raw"))
    print("  saved %d B (%.1f%%); %d rules / %d at-rule blocks / %d declarations preserved"
          % (raw_total - len(new), 100.0 * (raw_total - len(new)) / raw_total, r, g, d))
    print("  md5[:8] = %s   (run rehash.py to stamp it into the pages)"
          % hashlib.md5(new).hexdigest()[:8])
    return 0


if __name__ == "__main__":
    sys.exit(main())
