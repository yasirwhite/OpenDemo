import * as A from "./an.mjs";
// 10->90% rise distance on the left edge of the R stem, per frame (entry), and on 'o' right edge (exit)
function edgeRise(i, searchFrom, searchTo, yBand){
  const f=A.frame(i); const cp=A.colPeak(f, yBand[0], yBand[1]);
  let pk=0; for(let x=searchFrom;x<=searchTo;x++) pk=Math.max(pk,cp[x]);
  if(pk<0.03) return null;
  // first x reaching 90% of pk
  let x90=-1; for(let x=searchFrom;x<=searchTo;x++) if(cp[x]>=0.9*pk){x90=x;break;}
  let x10=-1; for(let x=x90;x>=searchFrom;x--) if(cp[x]<=0.1*pk){x10=x;break;}
  if(x90<0||x10<0) return null;
  return {pk:+pk.toFixed(3), rise:x90-x10};
}
console.log("ENTRY  (R left edge)  f  t  peak  10-90 rise px");
for(let i=4;i<=22;i++){const L=(()=>{const f=A.frame(i);const cp=A.colPeak(f,145,215);for(let x=15;x<620;x++) if(cp[x]>0.02) return x; return null;})();
 if(L===null)continue; const r=edgeRise(i, Math.max(0,L-12), L+14,[150,215]);
 console.log(i, A.T(i).toFixed(3), r?`${r.pk}\t${r.rise}`:"-");}
console.log("EXIT   ('o' of 'so' right edge)  f  t  peak  90-10 fall px");
for(let i=64;i<=84;i++){
 const f=A.frame(i);const cp=A.colPeak(f,145,215);let L=-1;for(let x=15;x<620;x++) if(cp[x]>0.10){L=x;break;}
 if(L<0)continue; const d=L-182;
 // right edge of 'o' ~466+d
 let pk=0;for(let x=448+d;x<=466+d;x++) pk=Math.max(pk,cp[x]||0);
 if(pk<0.03){console.log(i,A.T(i).toFixed(3),"gone");continue;}
 let x90=-1;for(let x=466+d+14;x>=440+d;x--) if(cp[x]>=0.9*pk){x90=x;break;}
 let x10=-1;for(let x=x90;x<=466+d+18;x++) if(cp[x]<=0.1*pk){x10=x;break;}
 console.log(i,A.T(i).toFixed(3),pk.toFixed(3),(x10>=0&&x90>=0)?x10-x90:"-");}
