import * as A from "./an.mjs";
let best=[], bestD=[];
for(let i=58;i<=75;i++){const f=A.frame(i);
  const cp=A.colPeak(f,150,215); let L=-1; for(let x=20;x<620;x++) if(cp[x]>0.1){L=x;break;} const d=L-182;
  for(let y=166;y<=192;y++) for(let x=222+d;x<=297+d;x++){const p=A.px(f,x,y); best.push([p[1],p]);}
  for(let y=166;y<=192;y++) for(let x=302+d;x<=391+d;x++){const p=A.px(f,x,y); bestD.push([0.299*p[0]+0.587*p[1]+0.114*p[2],p]);}
}
best.sort((a,b)=>a[0]-b[0]); bestD.sort((a,b)=>a[0]-b[0]);
const avg=(arr,n)=>{let r=0,g=0,b=0;for(let k=0;k<n;k++){r+=arr[k][1][0];g+=arr[k][1][1];b+=arr[k][1][2];}return [r/n,g/n,b/n].map(v=>Math.round(v));};
console.log("salmon lowest-G 200 px avg:", avg(best,200), " lowest-40:", avg(best,40));
console.log("dark  lowest-L 200 px avg:", avg(bestD,200), " lowest-40:", avg(bestD,40));
