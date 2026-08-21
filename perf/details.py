import json,sys,os
def items(r, aid):
    a=r['audits'].get(aid,{})
    d=a.get('details',{}) or {}
    return a, d.get('items',[])
def show(p, ids):
    r=json.load(open(p,encoding='utf-8'))
    print("#"*70); print("##", os.path.basename(p))
    for aid in ids:
        a, its = items(r, aid)
        if a.get('score') in (1, None) and not its: continue
        print("\n--- %s (score=%s) %s" % (aid, a.get('score'), a.get('displayValue','')))
        for it in its[:14]:
            out={}
            for k,v in it.items():
                if isinstance(v,dict):
                    if 'snippet' in v: out[k]=v['snippet'][:150]
                    elif 'selector' in v: out[k]=v['selector'][:100]
                    elif 'url' in v: out[k]=str(v['url']).split('?')[0][-70:]
                    elif 'value' in v: out[k]=v['value']
                    else: out[k]=str(v)[:90]
                elif isinstance(v,list): out[k]='[%d]'%len(v)
                else:
                    s=str(v)
                    out[k]=s.split('?')[0][-80:] if 'http' in s else s[:110]
            print("   *", json.dumps(out, ensure_ascii=False)[:520])
IDS=sys.argv[2].split(',')
show(sys.argv[1], IDS)
