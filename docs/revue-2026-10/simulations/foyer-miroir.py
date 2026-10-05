import random, math, statistics as st
def reward(L,D,P): return round((2+4*math.sqrt(L)+0.6*D)*(0.9+0.02*P))
def capped(before,x):
    out=0;e=before
    for _ in range(x):
        out+= 1 if e<70 else (0.5 if e<140 else 0.2); e+=1
    return out
def task(r):
    L=min(10,max(1,int(r.gauss(4,2.2)))); P=min(10,max(1,int(r.gauss(6.3,1.4)))); D=min(10,max(1,int(r.gauss(4.3,1.8))))
    return L,D,P
PERS={"leger":(0.5,1.5,0.2,1),"regulier":(0.8,3,0.5,2),"intense":(0.95,5.5,0.8,3),"absent3sem":(0.8,3,0.5,2)}
CH=[4,12,22]
for name,(pa,tpd,pp,adds) in PERS.items():
    E=[];C=[];days={c:[] for c in CH};taskshare=[]
    for seed in range(400):
        r=random.Random(seed);earned=30;tearn=0;c=0;active_week=False;reached={}
        for d in range(63):  # 5 oct -> 6 dec = 9 semaines
            absent= name=="absent3sem" and 20<=d<41
            if not absent and r.random()<pa:
                n=max(1,int(r.gauss(tpd,1)));day=0
                for _ in range(n):
                    L,D,P=task(r);x=reward(L,D,P)
                    if r.random()<0.15:x=round(x*1.25)
                    g=capped(day,x);day+=x;earned+=g;tearn+=g
                planned = r.random()<pp
                earned+=2+min(adds,3)+(3 if planned else 0)+(2*min(2,n) if planned else 0)
                if absent is False and d>0 and False: pass
                c+=1;active_week=True
            if d%7==6:
                if active_week: earned+=6;c+=1
                active_week=False
            for th in CH:
                if c>=th and th not in reached: reached[th]=d
        E.append(earned);C.append(c);taskshare.append(tearn/earned)
        for th in CH: days[th].append(reached.get(th,99))
    print(f"{name:10s} bûches 9 sem: med {st.median(E):.0f} [p10 {sorted(E)[40]:.0f} – p90 {sorted(E)[360]:.0f}] part tâches {st.median(taskshare):.0%} | Chaleur {st.median(C):.0f} | jour atteinte Chaleur 4/12/22: "+"/".join(str(st.median(days[t])) for t in CH))
