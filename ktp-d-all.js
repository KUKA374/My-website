window.ktpD=window.ktpD||{};
window.ktpReady=(async function(){
  const grade=String(new URLSearchParams(location.search).get('class')||'');
  if(grade==='5') return;
  const load=s=>new Promise((res,rej)=>{const x=document.createElement('script');x.src=s;x.onload=res;x.onerror=rej;document.head.appendChild(x);});
  try{await load(`ktp-${grade}.js?v=11`);}catch(e){console.error('KTP source load error',e);return;}
  const titleOf=v=>typeof v==='string'?v.toLowerCase():'';
  const normalize=(arr,path=[])=>{
    if(!Array.isArray(arr))return [];
    return arr.map((x,i)=>{
      if(!x||typeof x!=='object'||Array.isArray(x))return null;
      const number=x.number??x.lessonNumber??x.lesson??x.id;
      const title=x.title??x.topic??x.lessonTitle??x.name;
      if(title!=null&&number!=null){
        const section=x.section??x.unit??x.chapter??'';
        const objective=x.objective??x.learningObjective??x.learning_objective??x.goal??'';
        const hours=x.hours??x.hour??x.duration??1;
        const quarter=Number(x.quarter??x.term??x.toqsan??x.quarterNumber??0);
        return {number,section,title,objective,hours,quarter};
      }
      return null;
    }).filter(Boolean);
  };
  const plans={};
  const seen=new Set();
  const visit=(obj,path=[],depth=0)=>{
    if(!obj||typeof obj!=='object'||depth>5||seen.has(obj))return;
    seen.add(obj);
    if(Array.isArray(obj)){
      const ls=normalize(obj,path);
      if(ls.length){
        const p=path.join(' ').toLowerCase();
        let key=null;
        if(/algebra/.test(p))key=grade+'_algebra';
        else if(/geometry/.test(p))key=grade+'_geometry';
        else key=grade+'_math';
        if(/қгб|qgb/.test(p))key=grade+'_'+(key.split('_').slice(1).join('_'))+'_ҚГБ';
        else if(/жмб|zhmb/.test(p))key=grade+'_'+(key.split('_').slice(1).join('_'))+'_ЖМБ';
        if(!plans[key])plans[key]=[];
        plans[key].push(...ls);
      }
      obj.forEach((v,i)=>visit(v,path.concat(String(i)),depth+1));
      return;
    }
    Object.keys(obj).forEach(k=>visit(obj[k],path.concat(k),depth+1));
  };
  Object.keys(window).forEach(k=>{if(!['ktpD','ktpReady'].includes(k)){try{visit(window[k],[k],0)}catch(e){}}});
  Object.keys(plans).forEach(k=>{
    const rows=plans[k].filter(r=>r.title).map(r=>({...r,quarter:Number(r.quarter)||0})).filter(r=>r.quarter>0);
    if(rows.length)window.ktpD[grade]=window.ktpD[grade]||{};
    if(rows.length)window.ktpD[grade][k]=rows;
  });
})();