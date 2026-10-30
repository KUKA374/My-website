window.ktpD=window.ktpD||{};
window.ktpReady=(async function(){
  const p=new URLSearchParams(location.search),grade=String(p.get('class')||'');
  if(grade==='5')return;
  const before=new Set(Object.keys(window));
  const load=s=>new Promise((res,rej)=>{const x=document.createElement('script');x.src=s;x.onload=res;x.onerror=rej;document.head.appendChild(x);});
  try{await load(`ktp-${grade}.js?v=11`);if(grade==='7')await load('7-synyp-algebra-1-toqsan-data.js?v=2');}catch(e){console.error('KTP source load error',e);return;}
  await new Promise(res=>{const started=performance.now();const tick=()=>{const added=Object.keys(window).filter(k=>!before.has(k)&&k!=='ktpD'&&k!=='ktpReady'&&k!=='ktpCanonicalReady');if(added.length||performance.now()-started>12000)res();else setTimeout(tick,150)};tick()});
  const plans={},seen=new Set();
  const qFromPath=s=>{let m=s.match(/(?:quarter|q|toqsan)[ _-]*([1-4])/i);return m?Number(m[1]):(/grade7AlgebraQ1/i.test(s)?1:0)};
  const norm=(a,dq)=>Array.isArray(a)?a.map(x=>{if(!x||typeof x!=='object'||Array.isArray(x))return null;const n=x.number??x.lessonNumber??x.lesson??x.id,t=x.title??x.topic??x.lessonTitle??x.name;if(t==null||n==null)return null;const q=Number(x.quarter??x.term??x.toqsan??x.quarterNumber??dq??0);return{number:n,section:x.section??x.unit??x.chapter??'',title:t,objective:x.objective??x.learningObjective??x.learning_objective??x.goal??'',hours:x.hours??x.hour??x.duration??1,quarter:q}}).filter(x=>x&&x.quarter>0):[];
  const add=(key,ls)=>{if(!ls.length)return;const arr=plans[key]||[],seenRows=new Set(arr.map(x=>`${x.number}|${x.quarter}|${x.title}`));ls.forEach(x=>{const id=`${x.number}|${x.quarter}|${x.title}`;if(!seenRows.has(id)){seenRows.add(id);arr.push(x)}});plans[key]=arr};
  const visit=(o,path=[],d=0)=>{if(!o||typeof o!=='object'||d>15||seen.has(o))return;seen.add(o);const ps=path.join(' ').toLowerCase(),dq=qFromPath(ps);if(Array.isArray(o)){const ls=norm(o,dq);if(ls.length){let k=/geometry/.test(ps)?grade+'_geometry':/algebra/.test(ps)?grade+'_algebra':grade+'_math';if(/қгб|qgb/.test(ps))k+='_ҚГБ';else if(/жмб|zhmb/.test(ps))k+='_ЖМБ';add(k,ls)}o.forEach((v,i)=>visit(v,path.concat(i),d+1));return}Object.keys(o).forEach(k=>visit(o[k],path.concat(k),d+1))};
  Object.keys(window).forEach(k=>{if(!before.has(k))try{visit(window[k],[k])}catch(e){}});
  Object.keys(plans).forEach(k=>{if(plans[k].length){plans[k].sort((a,b)=>Number(a.quarter)-Number(b.quarter)||Number(a.number)-Number(b.number));window.ktpD[grade]=window.ktpD[grade]||{};window.ktpD[grade][k]=plans[k]}});
  window.ktpD[grade]=window.ktpD[grade]||{};
  console.log('KTP compatibility data ready',grade,Object.keys(window.ktpD[grade]));
})();