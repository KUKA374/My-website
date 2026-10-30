(function(){
  const params=new URLSearchParams(location.search);
  const classId=params.get('class');
  const subjectId=params.get('subject');
  const quarterId=Number(params.get('quarter'));
  const root=document.getElementById('classPage');
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  function subjectTitle(){const c=window.curriculum&&window.curriculum[classId];const s=c&&c.subjects&&c.subjects.find(x=>String(x.id)===String(subjectId));return s?s.title:subjectId;}
  function getPlan(){const p=window.ktpPlans||{};const c=window.curriculum&&window.curriculum[classId];const key=(c&&c.subjects&&c.subjects.find(x=>String(x.id)===String(subjectId))||{}).planKey||`${classId}_${subjectId}`;return p[key]||p[`${classId}_${subjectId}`]||null;}
  function render(){if(!root||!quarterId)return false;const plan=getPlan();if(!plan||!Array.isArray(plan.lessons)||!plan.lessons.length)return false;const lessons=plan.lessons.filter(x=>Number(x.quarter)===quarterId);let last='';let h=`<a href="class.html?class=${encodeURIComponent(classId)}" class="back-link">← ${esc(classId)}-сынып</a><div class="quarter-page-header"><span class="quarter-page-badge">${esc(classId)}-сынып • ${esc(subjectTitle())} • ${quarterId}-тоқсан</span><h1>${esc(subjectTitle())}</h1><p>${lessons.length} сабақ</p></div><div class="ktp-note"><strong>2026–2027 оқу жылы</strong><br>КТП-дағы күндер сайтқа енгізілмейді. Оқу мақсаттары кейін ҚМЖ жасау кезінде пайдаланылады.</div><div class="quarter-lesson-list">`;
    lessons.forEach(l=>{if(l.section&&l.section!==last){last=l.section;h+=`<div class="ktp-section-title">${esc(last)}</div>`;}h+=`<a href="lesson.html?class=${encodeURIComponent(classId)}&subject=${encodeURIComponent(subjectId)}&quarter=${quarterId}&lesson=${encodeURIComponent(l.number)}" class="quarter-lesson-card"><div class="quarter-lesson-number">${String(l.number).padStart(2,'0')}</div><div class="quarter-lesson-info"><h3>${esc(l.title)}</h3>${l.objective?`<p>${esc(l.objective)}</p>`:''}<small>${esc(l.hours)} сағат</small></div><div class="quarter-lesson-arrow">→</div></a>`;});
    root.innerHTML=h+'</div>';return true;}
  function showLoading(){if(root)root.innerHTML=`<div class="admin-box"><h3>КТП жүктелуде...</h3><p>${esc(classId)}-сынып • ${esc(subjectId)} • ${quarterId}-тоқсан</p><p id="ktpStatus">КТП файлы іске қосылуда...</p></div>`;}
  function showError(msg){if(root)root.innerHTML=`<div class="admin-box"><h3>КТП жүктелмеді</h3><p>${esc(msg)}</p><p><strong>Сынып:</strong> ${esc(classId)} | <strong>Пән:</strong> ${esc(subjectId)} | <strong>Тоқсан:</strong> ${quarterId}</p></div>`;}
  async function load(){
    if(!classId||!subjectId||!quarterId)return;
    showLoading();
    const src=`ktp-${classId}.js?v=6`;
    const status=()=>document.getElementById('ktpStatus');
    try{
      const response=await fetch(src,{cache:'no-store'});
      if(!response.ok)throw new Error(`${src}: HTTP ${response.status}`);
      const source=await response.text();
      const match=source.match(/const b=\"([^\"]+)\"/);
      if(!match)throw new Error('КТП файлының қысылған деректері табылмады.');
      const binary=atob(match[1]);
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      if(typeof DecompressionStream==='undefined')throw new Error('Браузер gzip деректерін ашуды қолдамайды.');
      if(status())status().textContent='КТП мәліметтері ашылуда...';
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const code=await new Response(stream).text();
      if(!code.trim())throw new Error('КТП деректері бос болып шықты.');
      const blobUrl=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
      try{
        if(status())status().textContent='КТП мәліметтері сайтқа тіркелуде...';
        await import(blobUrl);
      }finally{
        URL.revokeObjectURL(blobUrl);
      }
      if(status())status().textContent='КТП мәліметтері дайын.';
    }catch(e){
      console.error('KTP loader error:',e);
      showError(`КТП файлын ашу кезінде қате шықты: ${e.message||e}`);
      return;
    }
    let tries=0;
    const timer=setInterval(()=>{tries++;if(render()){clearInterval(timer);return;}if(tries>=80){clearInterval(timer);showError('КТП файлы ашылды, бірақ оның ішіндегі мәліметтер сайтқа тіркелмеді.');}},250);
  }
  const st=document.createElement('style');st.textContent='.ktp-note{margin:16px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;color:#667085;line-height:1.6}.ktp-section-title{margin:24px 0 10px;padding:10px 14px;border-radius:10px;background:#eef2ff;color:#3730a3;font-weight:800}.quarter-lesson-info p{margin:6px 0;color:#7a8495;font-size:12px;line-height:1.45}.quarter-lesson-info small{display:block;margin-top:6px;color:#667085}';document.head.appendChild(st);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
