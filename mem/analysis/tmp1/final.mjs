import * as A from "./an.mjs";
const { W, BH, BY0 } = A;
function rowPeak(f,x0,x1){const a=new Float64Array(BH);for(let y=BY0;y<BY0+BH;y++){let m=0;for(let x=x0;x<=x1;x++){const v=A.alphaAt(f,x,y);if(v>m)m=v;}a[y-BY0]=m;}return a;}
function cross(arr){let p=0;for(const v of arr)p=Math.max(p,v);const h=p*0.5;let t=null,b=null;
 for(let i=0;i<arr.length;i++)if(arr[i]>=h){t=i;break;} for(let i=arr.length-1;i>=0;i--)if(arr[i]>=h){b=i;break;}
 if(t===null)return null; let ts=t>0?t-(arr[t]-h)/(arr[t]-arr[t-1]):t; let bs=b<arr.length-1?b+(arr[b]-h)/(arr[b]-arr[b+1]):b;
 return [ts+BY0,bs+BY0];}
console.log("f\tt(s)\tcapH\tscale\tinkL\tinkR\tcapTop\tbase\tlayoutL(centred@323)");
for(let i=4;i<=85;i++){
 const f=A.frame(i); const cp=A.colPeak(f,145,220);
 let L=-1,R=-1; for(let x=15;x<625;x++) if(cp[x]>0.05){if(L<0)L=x;R=x;}
 if(L<0){console.log(`${i}\t${A.T(i).toFixed(3)}\t-`);continue;}
 let lp=0; for(let x=L;x<Math.min(W,L+90);x++) lp=Math.max(lp,cp[x]);
 const thr=lp*0.5; let s=-1,e=-1;
 for(let x=L;x<Math.min(W,L+130);x++){ if(cp[x]>=thr){if(s<0)s=x;e=x;} else if(s>=0){let g=0,xx=x;while(xx<W&&cp[xx]<lp*0.2&&g<6){g++;xx++;} if(g>=2)break;} }
 if(s<0){console.log(`${i}\t${A.T(i).toFixed(3)}\t-`);continue;}
 const sx=s-(cp[s]-thr)/Math.max(1e-9,cp[s]-cp[s-1]);
 const ex=e+(cp[e]-thr)/Math.max(1e-9,cp[e]-cp[e+1]);
 const c=cross(rowPeak(f,s,e));
 const capH=c?c[1]-c[0]:NaN;
 console.log([i,A.T(i).toFixed(3),capH.toFixed(2),((ex-sx)/36.78).toFixed(4),L,R,c?c[0].toFixed(1):"-",c?c[1].toFixed(1):"-",sx.toFixed(2)].join("\t"));
}
