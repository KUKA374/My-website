window.ktpD=window.ktpD||{};
window.ktpReady=(async function(){
  const p=new URLSearchParams(location.search),grade=String(p.get('class')||'');
  if(grade==='5')return;
  const load=s=>new Promise((res,rej)=>{const x=document.createElement('script');x.src=s;x.onload=res;x.onerror=rej;document.head.appendChild(x);});
  try{await load(`ktp-${grade}.js?v=11`);if(grade==='7')await load('7-synyp-algebra-1-toqsan-data.js?v=2');}catch(e){console.error('KTP source load error',e);return;}
  const plans={};const seen=new Set();
  const norm=a=>Array.isArray(a)?a.map(x=>{if(!x||typeof x!=='object'||Array.isArray(x))return null;const n=x.number??x.lessonNumber??x.lesson??x.id,t=x.title??x.topic??x.lessonTitle??x.name;if(t==null||n==null)return null;return{number:n,section:x.section??x.unit??x.chapter??'',title:t,objective:x.objective??x.learningObjective??x.learning_objective??x.goal??'',hours:x.hours??x.hour??x.duration??1,quarter:Number(x.quarter??x.term??x.toqsan??x.quarterNumber??0)}}).filter(x=>x&&x.quarter>0):[];
  const visit=(o,path=[],d=0)=>{if(!o||typeof o!=='object'||d>5||seen.has(o))return;seen.add(o);if(Array.isArray(o)){const ls=norm(o);if(ls.length){const s=path.join(' ').toLowerCase();let k=/geometry/.test(s)?grade+'_geometry':/algebra/.test(s)?grade+'_algebra':grade+'_math';if(/қгб|qgb/.test(s))k+='_ҚГБ';else if(/жмб|zhmb/.test(s))k+='_ЖМБ';plans[k]=(plans[k]||[]).concat(ls)}o.forEach((v,i)=>visit(v,path.concat(i),d+1));return}Object.keys(o).forEach(k=>visit(o[k],path.concat(k),d+1));};
  Object.keys(window).forEach(k=>{if(k!=='ktpD'&&k!=='ktpReady')try{visit(window[k],[k])}catch(e){}});
  Object.keys(plans).forEach(k=>{if(plans[k].length){window.ktpD[grade]=window.ktpD[grade]||{};window.ktpD[grade][k]=plans[k]}});
})();