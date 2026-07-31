import * as A from "./an.mjs";
// modal colour among the darkest pixels of a window
function modal(i, x0, x1, y0=155, y1=205, frac=0.12){
  const f=A.frame(i); const px=[];
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){const p=A.px(f,x,y); px.push([0.299*p[0]+0.587*p[1]+0.114*p[2],p]);}
  px.sort((a,b)=>a[0]-b[0]);
  const n=Math.max(4,Math.round(px.length*frac*0.06));
  let r=0,g=0,b=0; for(let k=0;k<n;k++){r+=px[k][1][0];g+=px[k][1][1];b+=px[k][1][2];}
  const c=[r/n,g/n,b/n].map(v=>Math.round(v));
  return c.join(",")+"  #"+c.map(v=>v.toString(16).padStart(2,"0")).join("")+`  (n=${n})`;
}
const F=64;
console.log("Re       ", modal(F,183,218));
console.log("mem      ", modal(F,222,297));
console.log("  m1     ", modal(F,222,248));
console.log("  e1     ", modal(F,252,267));
console.log("  m2     ", modal(F,271,297));
console.log("bering   ", modal(F,302,391));
console.log("is       ", modal(F,401,422));
console.log("so       ", modal(F,432,465));
console.log("bg mid   ", modal(F,300,340,120,140,1));
console.log("bg corner", modal(F,5,40,105,130,1));
console.log("-- mem at pale peaks --");
console.log("m1 @f44  ", modal(44,222+31,248+31));
console.log("e1 @f48  ", modal(48,252+21,267+21));
console.log("m2 @f53  ", modal(53,271+10,297+10));
