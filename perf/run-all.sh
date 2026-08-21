#!/bin/bash
cd /c/Users/willw/twisted-roots-merc
run(){ bash perf/run-lh.sh "$1" "$2" "$3"; }
run index.html index mobile
run shop.html shop desktop
run shop.html shop mobile
run journal.html journal desktop
run journal.html journal mobile
run blog/fix-caulk-a-bathtub.html blogpost desktop
run blog/fix-caulk-a-bathtub.html blogpost mobile
run merc.html merc desktop
run kitchen.html kitchen desktop
run recipes/bread-first-sourdough.html recipe desktop
run visit.html visit desktop
run board.html board desktop
echo "ALL DONE"
