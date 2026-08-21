import json,sys,os
p,ids=sys.argv[1],sys.argv[2].split(',')
r=json.load(open(p,encoding='utf-8'))
print("##", os.path.basename(p))
for aid in ids:
    a=r['audits'].get(aid,{}); d=a.get('details',{}) or {}
    print("\n=== %s score=%s %s" % (aid,a.get('score'),a.get('displayValue','')))
    print(json.dumps(d.get('items',[])[:10], ensure_ascii=False, indent=1)[:4000])
