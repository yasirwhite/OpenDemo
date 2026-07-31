import * as A from "./an.mjs";
const { W } = A;
const LET = { Re:[182,219], m1:[221,249], e1:[251,268], m2:[270,298], b:[301,318], e2:[320,337], ri:[339,353], n:[356,372], g:[374,392], i:[400,406], s1:[407,422], s2:[431,446], o:[448,466] };
const keys = Object.keys(LET);
function leftEdge(i){const f=A.frame(i);const cp=A.colPeak(f,150,215);for(let x=20;x<620;x++) if(cp[x]>0.10) return x;return null;}
const base = {};
console.log(["f","t","dx"].concat(keys).join("\t"));
for (let i=60;i<=88;i++){
  const L=leftEdge(i); if(L===null){console.log(`${i}\t${A.T(i).toFixed(3)}\t-`);continue;}
  const d=L-182, f=A.frame(i); const row=[i,A.T(i).toFixed(3),d];
  for(const k of keys){const [a,b]=LET[k];let s=0;
    for(let y=150;y<=212;y++) for(let x=a+d-9;x<=b+d+9;x++) if(x>=0&&x<W) s+=A.alphaAt(f,x,y);
    if(i===64) base[k]=s;
    row.push(base[k]?(s/base[k]).toFixed(2):s.toFixed(0));}
  console.log(row.join("\t"));
}
