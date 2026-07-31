import * as A from "./an.mjs";
const f=A.frame(64);
// histogram of pixel colours inside the mem window, darkest 60
function hist(x0,x1,y0,y1,label){
  const m=new Map();
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const p=A.px(f,x,y);const k=p.join(",");
    const L=0.299*p[0]+0.587*p[1]+0.114*p[2]; if(L<200) m.set(k,(m.get(k)||0)+1);}
  const top=[...m].sort((a,b)=>b[1]-a[1]).slice(0,6);
  console.log(label, top.map(([k,n])=>`${k} x${n}`).join("   |   "));
}
hist(222,297,168,190,"mem   ");
hist(183,218,166,190,"Re    ");
hist(302,391,166,190,"bering");
hist(401,465,166,190,"is so ");
