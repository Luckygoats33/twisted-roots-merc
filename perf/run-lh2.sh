#!/bin/bash
PAGE="$1"; LABEL="$2"; FORM="${3:-mobile}"; PORT="${4:-8898}"
OUT="/c/Users/willw/twisted-roots-merc/perf/lh/${LABEL}-${FORM}"
if [ "$FORM" = "desktop" ]; then PRESET="--preset=desktop"; else PRESET=""; fi
npx --no-install lighthouse "http://127.0.0.1:${PORT}/${PAGE}" \
  $PRESET --output=json --output-path="${OUT}.json" \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --user-data-dir=/c/Users/willw/AppData/Local/Temp/claude/lhp-${LABEL}-${FORM}" \
  --only-categories=performance,accessibility,best-practices,seo --quiet 2>"${OUT}.err"
echo "done $LABEL $FORM"
