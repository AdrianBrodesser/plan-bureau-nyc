# Simplify geo/community_districts.geojson into geo/cd_simpl.json (projected, Douglas-Peucker). Usage: python scripts/simplify_geo.py [tolerance]
import json, math, sys
tol=float(sys.argv[1]) if len(sys.argv)>1 else 0.25
d=json.load(open('geo/community_districts.geojson'))
LAT0=40.7; CX=math.cos(LAT0*math.pi/180)
P=lambda p:((p[0]+74.3)*CX*1000,(40.95-p[1])*1000)
def dp(pts,eps):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]; dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy) or 1e-12
    dm,im=0,0
    for i in range(1,len(pts)-1):
        p=pts[i]; dd=abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L if L>1e-12 else math.hypot(p[0]-a[0],p[1]-a[1])
        if dd>dm: dm,im=dd,i
    if dm>eps: return dp(pts[:im+1],eps)[:-1]+dp(pts[im:],eps)
    return [a,b]
def area(r): return 0.5*sum(r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1] for i in range(len(r)-1))
out=[]; npts=0
for f in d['features']:
    cd=f['properties']['boro_cd']; g=f['geometry']
    polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    rings=[]; best=None
    for poly in polys:
        for ri,r in enumerate(poly):
            pr=[P(p) for p in r]
            a=abs(area(pr))
            if a<0.03: continue
            s=dp(pr,tol)
            if len(s)<4: continue
            rings.append(s)
            if ri==0 and (best is None or a>best[0]): best=(a,pr)
    # centroid of largest outer ring
    pr=best[1]; A=area(pr); cx=sum((pr[i][0]+pr[i+1][0])*(pr[i][0]*pr[i+1][1]-pr[i+1][0]*pr[i][1]) for i in range(len(pr)-1))/(6*A); cy=sum((pr[i][1]+pr[i+1][1])*(pr[i][0]*pr[i+1][1]-pr[i+1][0]*pr[i][1]) for i in range(len(pr)-1))/(6*A)
    npts+=sum(len(r) for r in rings)
    out.append({'id':cd,'sqmi':round(float(f['properties']['shape_area'])/27878400,2),'c':[round(cx,1),round(cy,1)],'r':[[v for p in r[:-1] for v in (round(p[0]*10),round(p[1]*10))] for r in rings]})
s=json.dumps(out,separators=(',',':'))
open('geo/cd_simpl.json','w').write(s)
print('features',len(out),'points',npts,'bytes',len(s))
xs=[v for o in out for r in o['r'] for v in r[0::2]]; ys=[v for o in out for r in o['r'] for v in r[1::2]]
print('bbox',min(xs)/10,max(xs)/10,min(ys)/10,max(ys)/10)
