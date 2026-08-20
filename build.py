import os, re, json, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(ROOT, "merc.html"), encoding="utf-8").read()

HEAD_RE = re.compile(r"(<title>).*?(</head>)", re.S)
MAIN_RE = re.compile(r"<main>.*?</main>", re.S)

def build(fname, title, desc, active, main_html, extra_head=""):
    s = shell
    head = f"""<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="assets/img/logo-trans-sm.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800;900&family=Public+Sans:wght@300;400;500;600;800&family=Rye&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css">
{extra_head}</head>"""
    s = HEAD_RE.sub(lambda m: head, s, count=1)
    s = MAIN_RE.sub(lambda m: "<main>\n" + main_html + "\n</main>", s, count=1)
    # active nav
    s = s.replace(' aria-current="page"', '')
    if active:
        s = re.sub(r'(<a href="%s")' % re.escape(active), r'\1 aria-current="page"', s, count=1)
    open(os.path.join(ROOT, fname), "w", encoding="utf-8").write(s)
    print("built", fname, len(s), "bytes")

pages = json.load(open(os.path.join(ROOT, "_parts", "pages.json"), encoding="utf-8"))
for p in pages:
    body = open(os.path.join(ROOT, "_parts", p["part"]), encoding="utf-8").read()
    build(p["file"], p["title"], p["desc"], p.get("active"), body, p.get("head", ""))
