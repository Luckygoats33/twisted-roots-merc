#!/bin/bash
# usage: run-lh.sh <pagepath> <label> [mobile|desktop]
PAGE="$1"; LABEL="$2"; FORM="${3:-mobile}"
OUT="/c/Users/willw/twisted-roots-merc/perf/lh/${LABEL}-${FORM}"
if [ "$FORM" = "desktop" ]; then PRESET="--preset=desktop"; else PRESET=""; fi
npx --no-install lighthouse "http://localhost:8899/${PAGE}" \
  $PRESET \
  --output=json --output-path="${OUT}.json" \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --user-data-dir=/c/Users/willw/AppData/Local/Temp/claude/lh-profile-${LABEL}-${FORM}" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet 2>"${OUT}.err"
echo "exit=$? $LABEL $FORM"
