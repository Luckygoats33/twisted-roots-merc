# throwaway: builds board.html only, from _parts/board-pages.json
import os, re, json
ROOT = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(ROOT, "merc.html"), encoding="utf-8").read()
HEAD_RE = re.compile(r"(<title>).*?(</head>)", re.S)
MAIN_RE = re.compile(r"<main>.*?</main>", re.S)
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800;900'
         '&family=Public+Sans:wght@300;400;500;600;800&family=Rye&display=swap" rel="stylesheet">')

for p in json.load(open(os.path.join(ROOT, "_parts", "board-pages.json"), encoding="utf-8")):
    body = open(os.path.join(ROOT, "_parts", p["part"]), encoding="utf-8").read()
    head = (f'<title>{p["title"]}</title>\n'
            f'<meta name="description" content="{p["desc"]}">\n'
            f'{FONTS}\n\n{p.get("head","")}\n</head>')
    s = HEAD_RE.sub(lambda m: head, shell, count=1)
    s = MAIN_RE.sub(lambda m: "<main>\n" + body + "\n</main>", s, count=1)
    s = s.replace(' aria-current="page"', '')
    # every page except index/merc points the header button at the merc search
    s = s.replace('href="#check">Check Stock', 'href="merc.html#check">Check Stock')
    if p.get("active"):
        s = re.sub(r'(<a href="%s")' % re.escape(p["active"]), r'\1 aria-current="page"', s, count=1)
    open(os.path.join(ROOT, p["file"]), "w", encoding="utf-8").write(s)
    print("built", p["file"], len(s), "bytes")
