import json,sys,glob,os
def load(p):
    return json.load(open(p, encoding='utf-8'))
def summarize(p, verbose=False):
    r=load(p)
    name=os.path.basename(p).replace('.json','')
    cats={k:(v['score'] if v['score'] is not None else -1) for k,v in r['categories'].items()}
    a=r['audits']
    def num(k):
        x=a.get(k,{})
        return x.get('numericValue')
    m={'FCP':num('first-contentful-paint'),'LCP':num('largest-contentful-paint'),
       'TBT':num('total-blocking-time'),'CLS':num('cumulative-layout-shift'),
       'SI':num('speed-index'),'TTFB':num('server-response-time')}
    print("="*80)
    print(name, " | ", r.get('configSettings',{}).get('formFactor'), r.get('configSettings',{}).get('throttlingMethod'))
    print("  SCORES: perf=%.0f a11y=%.0f bp=%.0f seo=%.0f" % (cats.get('performance',-1)*100, cats.get('accessibility',-1)*100, cats.get('best-practices',-1)*100, cats.get('seo',-1)*100))
    print("  FCP=%.0fms LCP=%.0fms TBT=%.0fms CLS=%.3f SI=%.0fms TTFB=%.0fms" % (m['FCP'] or 0, m['LCP'] or 0, m['TBT'] or 0, m['CLS'] or 0, m['SI'] or 0, m['TTFB'] or 0))
    tb=a.get('total-byte-weight',{})
    print("  total bytes: %.0f KB" % ((tb.get('numericValue') or 0)/1024))
    for cat in ['performance','accessibility','best-practices','seo']:
        fails=[]
        for ref in r['categories'][cat]['auditRefs']:
            au=a.get(ref['id'],{})
            s=au.get('score')
            if s is None: continue
            if s < 0.9:
                w = ref.get('weight',0)
                fails.append((w, ref['id'], s, au.get('title',''), au.get('displayValue','')))
        fails.sort(key=lambda x:(-x[0], x[2]))
        shown=[f for f in fails if f[0]>0 or cat!='performance']
        if fails:
            print("  --%s FAILURES--" % cat.upper())
            for w,i,s,t,d in fails:
                print("    w=%2d score=%.2f  %-42s %s" % (w,s,i,d[:44]))
    return r
for p in sys.argv[1:]:
    summarize(p)
