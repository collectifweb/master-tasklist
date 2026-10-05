import fs from 'fs';
const T = JSON.parse(fs.readFileSync(new URL('./taches-006.json', import.meta.url)));
const pe = x => Math.round((6*Math.sqrt(x.L)+(x.D>=7?2:0))*(0.8+0.04*x.P));
const pool = T.slice(0,16).concat([T[20],T[22]]);
const plan = [3,2,4,3,2,4,3, 3,0,0,0,0,2,4, 3,2,4,3,2,3,4];
const secOf=d=>({Maison:'Atelier',Jardin:'Champs',Ferme:'Champs',Terrain:'Champs',Administratif:'Archives',Professionnel:'Archives',Véhicule:'Relais'})[d]||'Place';
let s={e:10,m:15,conf:0,L:{Champs:12,Atelier:0,Archives:0,Relais:0,Place:0},libre:0,courges:0,plots:[0,0,0],st:[0,0,0],prep:0};
let k=0,rows=[],w=null,lastActive=0,sc=false,wa=0,built=[];
const reset=()=>w={q:0,PE:0,gE:0,gM:0,bonus:0,dE:0,dM:0};reset();
const B=[['Tour météo',20,6,2],['Tunnel de culture',15,0,4],['Établi',25,6,6],['Scierie',35,0,8],['3 érables',15,0,13],['Lot du Bastion',20,0,15],['Remise niv.2',40,0,17],['Salle des registres',45,10,19]];
for(let d=1;d<=21;d++){const n=plan[d-1];let dayPE=0,bonus=0,log=[];
 if(sc)s.m+=2;
 if(n>0){ if(lastActive&&d-lastActive>=4){s.e+=10;log.push('retour +10⚡ (hors plafond)')}
  bonus=1+(d%2?2:0)+1;
  s.plots.forEach((p,i)=>{if(p)s.st[i]++}); // la lisière arrose : 1 stade par jour actif
  for(let i=0;i<n;i++){const t=pool[(k++)%pool.length];const p=pe(t);const b=dayPE;dayPE+=p;
   const eff=Math.max(0,Math.min(dayPE,45)-Math.min(b,45))+0.5*Math.max(0,Math.min(dayPE,90)-Math.max(b,45))+0.2*Math.max(0,dayPE-Math.max(b,90));
   const ge=Math.round(0.3*eff),gm=Math.round(0.5*eff);s.e+=ge;s.m+=gm;w.gE+=ge;w.gM+=gm;
   const lib=Math.round(0.25*p); s.libre+=lib; s.L[secOf(t.dom)]+=p-lib; w.PE+=p;w.q++;
   if(d>=7&&d<=14) s.prep+=1+(secOf(t.dom)==='Champs'?2:0); }
  if(d%2&&n>=2)bonus+=2; bonus=Math.min(5,bonus); s.e+=bonus; w.bonus+=bonus; s.conf++;wa++;lastActive=d;
  s.plots.forEach((p,i)=>{if(p&&s.st[i]>=2){s.courges+=3;s.plots[i]=0;s.st[i]=0}});
  s.plots.forEach((p,i)=>{if(!p&&s.e>=3){s.e-=3;w.dE+=3;s.plots[i]=1}});
  for(const b of B){if(!built.includes(b[0])&&d>=b[3]&&s.m>=b[1]&&s.e>=b[2]){s.m-=b[1];s.e-=b[2];w.dM+=b[1];w.dE+=b[2];built.push(b[0]);log.push(b[0]);if(b[0]==='Scierie')sc=true;break}}
  if(d>=7&&d<=13&&s.e>=8&&s.prep<40){s.e-=8;w.dE+=8;s.prep+=5;log.push('brasero +5')} else if(s.e>=30){s.e-=8;w.dE+=8;s.libre+=5;log.push('souffler')} if(s.m>=70&&built.length>=4){s.m-=15;w.dM+=15;log.push('décor 15')}
 }
 if(s.e>40){s.L.Place+=Math.floor((s.e-40)/2);s.e=40};s.m=Math.min(150,s.m);
 if(d===14){const res=Math.min(6,s.courges); const garde=8+4/*tour*/+6/*tunnel*/; const total=garde+Math.min(8,s.prep)+res; log.push(`AVIS Premier gel: préparation ${total} vs Force 24`);}
 if(d%7===0){if(wa>=4)s.conf++;rows.push({sem:d/7,quetes:w.q,PE:w.PE,'⚡ tâches':w.gE,'▣ tâches':w.gM,'⚡ bonus':w.bonus,'⚡ dépensé':w.dE,'▣ dépensé':w.dM,'⚡ fin':s.e,'▣ fin':s.m,Confiance:s.conf});reset();wa=0}
 console.log(`J${d} q${n} PE${dayPE} ⚡${s.e} ▣${s.m} C${s.conf} courges${s.courges} ${log.join(' · ')}`)}
console.table(rows);console.log(s.L,'libre',s.libre,built);
