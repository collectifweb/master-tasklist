import random, math, statistics as st
# --- Calendrier saison 1 (jour 0 = 5 oct 2026) ---
import sys
FS=[int(x) for x in sys.argv[1].split(',')] if len(sys.argv)>1 else [20,40,50,60,70,90,110,130,60,150,110]
DEFSHARE=float(sys.argv[2]) if len(sys.argv)>2 else 0.6
THREATS = [ # (nom, jour, force, tags, domaine cible, lead)
 ("Premier gel",        9, FS[0], {"FROID"}, "Terrain", 5),
 ("Grands vents",      29, FS[1], {"VENT"}, "Maison", 5),
 ("Pluie verglacante", 43, FS[2], {"GLACE"}, "Vehicule", 5),
 ("Premiere bordee",   58, FS[3], {"NEIGE"}, "Vehicule", 6),
 ("Froid sec",         71, FS[4], {"FROID"}, "Maison", 6),
 ("Poudrerie",         99, FS[5], {"NEIGE","VENT"}, "Vehicule", 7),
 ("Grand froid",      113, FS[6], {"FROID"}, "Enfants", 7),
 ("Tempete de verglas",130,FS[7], {"GLACE","VENT"}, "Maison", 8),
 ("Redoux trompeur",  143, FS[8], {"EAU"}, "Administratif", 6),
 ("Tempete des corneilles",158,FS[9],{"NEIGE","VENT","FROID"},"Vehicule",8),
 ("Crue printaniere", 185, FS[10],{"EAU"}, "Terrain", 8),
]
# structures: nom -> (niveaux [(mat, elan, {tag:prep})])
S = {
 "Foyer":   [(0,0,{"FROID":8}), (40,20,{"FROID":16}), (90,40,{"FROID":24}), (160,60,{"FROID":32})],
 "Tour":    [(15,10,{"ALL":3}), (50,15,{"ALL":6}), (100,30,{"ALL":9})],
 "Haie":    [(20,5,{"VENT":8,"NEIGE":4}), (40,10,{"VENT":16,"NEIGE":8}), (70,15,{"VENT":24,"NEIGE":12})],
 "Tunnels": [(10,0,{"FROID":4}), (20,0,{"FROID":8}), (30,0,{"FROID":12})],
 "Calfeutrage":[(12,0,{"FROID":4,"VENT":2}),(24,0,{"FROID":8,"VENT":4}),(36,0,{"FROID":12,"VENT":6})],
 "Souffleuse":[(30,10,{"NEIGE":10}),(60,20,{"NEIGE":20}),(100,30,{"NEIGE":30})],
 "Abrasifs":[(25,5,{"GLACE":10}),(50,10,{"GLACE":20}),(90,20,{"GLACE":30})],
 "Fil":     [(60,20,{"GLACE":15})],
 "Digue":   [(40,10,{"EAU":12}),(80,20,{"EAU":24}),(120,30,{"EAU":36}),(160,40,{"EAU":48})],
}
NEED = {"FROID":["Foyer","Tunnels","Calfeutrage"],"VENT":["Haie","Calfeutrage"],"NEIGE":["Souffleuse","Haie"],"GLACE":["Abrasifs","Fil"],"EAU":["Digue"]}
DOMS=["Maison","Terrain","Enfants","Vehicule","Administratif"]; DW=[.32,.2,.18,.12,.18]
def task(rng):
    L=min(10,max(1,int(rng.gauss(4,2.2)))); P=min(10,max(1,int(rng.gauss(6.3,1.4)))); D=min(10,max(1,int(rng.gauss(4.3,1.8))))
    return L,P,D,rng.choices(DOMS,DW)[0]
def reward(L,P,D):
    return (6*math.sqrt(L)+(2 if D>=7 else 0))*(0.8+0.04*P)
def capday(earned_before, e):
    out=0; x=earned_before
    for _ in range(int(round(e))):
        out += 1 if x<60 else (0.5 if x<120 else 0.25); x+=1
    return out
def prep_struct(lv,tags):
    tot=0
    for name,l in lv.items():
        if l<0: continue
        best=0
        for lvl in range(l+1): pass
        d=S[name][l][2]
        best=max([d.get(t,0) for t in tags]+[d.get("ALL",0)])
        tot+=best
    return tot
def sim(persona, seed, absence=None, policy="smart"):
    rng=random.Random(seed)
    act,tpd,opn,plan=persona
    el,mat,buches=10,20,0; lv={"Foyer":0}; moral=60; conf=0
    results=[]; window_tasks={}; total_el=0; total_mat=0; maxel=0
    ti=0
    for day in range(0,200):
        absent = absence and absence[0]<=day<absence[1]
        opened = (not absent) and rng.random()<opn
        active = opened and rng.random()<act/opn
        earned=0
        if opened: el+=2
        if opened and rng.random()<plan: el+=3; 
        if active:
            n=max(1,int(rng.gauss(tpd,1.0)))
            conf+=1
            for _ in range(n):
                L,P,D,dom=task(rng); e=reward(L,P,D)
                g=capday(earned,e); earned+=e; el+=round(g); mat+=round(0.6*g*DEFSHARE); total_el+=round(g); total_mat+=round(.6*g)
                # fenetre d'avis
                for i,(nm,td,F,tags,tdom,lead) in enumerate(THREATS):
                    if td-lead<=day<td:
                        w=window_tasks.setdefault(i,[0,0])
                        w[0]=min(8,w[0]+1)
                        if dom==tdom: w[1]=min(5,w[1]+1)
        # Elan cap 100 -> surplus vers buches (5 elan = 1 buche)
        if el>100: buches+= (el-100)//6; el=100
        buches=min(buches,60)
        if day%7==0: pass
        # depense (seulement si ouvert)
        nxt=[t for t in THREATS if t[1]>day]
        if opened and nxt:
            nm,td,F,tags,tdom,lead=nxt[0]
            order=[]
            for t in tags: order+=NEED[t]
            order+= ["Tour","Foyer"]
            if policy=="smart" and nxt[1:]:
                for t in nxt[1][3]: order+=NEED[t]
            bought=True
            while bought:
                bought=False
                for name in order:
                    cur=lv.get(name,-1)
                    if cur+1<len(S[name]):
                        m,e,_=S[name][cur+1]
                        if mat>=m and el>=e+8:
                            mat-=m; el-=e; lv[name]=cur+1; bought=True; break
        # resolution
        for i,(nm,td,F,tags,tdom,lead) in enumerate(THREATS):
            if td==day:
                pr=10+prep_struct(lv,tags)
                w=window_tasks.get(i,[0,0]); pr+=w[0]*1+w[1]*3
                if "FROID" in tags:
                    eng=min(buches, int(0.3*F)//2); buches-=eng; pr+=2*eng
                # braseros la veille si ouvert
                if (not absent):
                    k=0
                    while k<4 and el>=8 and pr<F*1.05: el-=8; pr+=5; k+=1
                if moral>=75: pr*=1.1
                R=pr/F
                res="TENU" if R>=1 else ("JUSTESSE" if R>=.6 else "PLIE")
                if res=="TENU": moral=min(100,moral+10); conf+=1; mat+=15
                elif res=="JUSTESSE": moral+=3; mat-=min(mat,6)
                else: moral=max(30,moral-8); mat-=min(mat,20)
                results.append((nm,F,round(pr),res))
        moral += (60-moral)*0.08
        maxel=max(maxel,el)
    return results, dict(el=el,mat=mat,buches=buches,lv=lv,conf=conf,total_el=total_el,total_mat=total_mat)
P={"leger":(3/7,1.5,4/7,0.0),"normal":(5/7,2.5,6/7,3/7),"intense":(6/7,4,1.0,5/7)}
for name,p in P.items():
    agg={}
    finals=[]
    for s in range(200):
        r,f=sim(p,s); finals.append(f)
        for nm,F,pr,res in r: agg.setdefault(nm,[]).append((pr,res))
    print("==",name, "elan tot moy",round(st.mean(f['total_el'] for f in finals)),"mat tot",round(st.mean(f['total_mat'] for f in finals)),"mat restant",round(st.mean(f['mat'] for f in finals)), "conf", round(st.mean(f['conf'] for f in finals)))
    for nm,_d,F,*_ in THREATS:
        v=agg[nm]; c={k:sum(1 for x in v if x[1]==k) for k in ("TENU","JUSTESSE","PLIE")}
        print(f"  {nm:24s} F{F:4d} prep moy {st.mean(x[0] for x in v):5.0f}  T{c['TENU']/2:5.1f}% J{c['JUSTESSE']/2:5.1f}% P{c['PLIE']/2:5.1f}%")
# absence 14 jours en janvier
agg={}
for s in range(200):
    r,f=sim(P["normal"],s,absence=(92,106))
    for nm,F,pr,res in r: agg.setdefault(nm,[]).append((pr,res))
print("== normal + absence 14 j (6-20 janv)")
for nm,_d,F,*_ in THREATS[4:8]:
    v=agg[nm]; c={k:sum(1 for x in v if x[1]==k) for k in ("TENU","JUSTESSE","PLIE")}
    print(f"  {nm:24s} F{F:4d} prep moy {st.mean(x[0] for x in v):5.0f}  T{c['TENU']/2:5.1f}% J{c['JUSTESSE']/2:5.1f}% P{c['PLIE']/2:5.1f}%")
print("== resume global tenu/justesse/plie")
for name,p in P.items():
    c={"TENU":0,"JUSTESSE":0,"PLIE":0}; n=0
    for s in range(200):
        r,f=sim(p,s)
        for x in r: c[x[3]]+=1; n+=1
    print(name, {k:round(100*v/n) for k,v in c.items()})
