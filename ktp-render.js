(function(){
  const params=new URLSearchParams(location.search);
  const classId=params.get('class');
  const subjectId=params.get('subject');
  const quarterId=Number(params.get('quarter'));
  const root=document.getElementById('classPage');
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  function subjectTitle(){const c=window.curriculum&&window.curriculum[classId];const s=c&&c.subjects&&c.subjects.find(x=>String(x.id)===String(subjectId));return s?s.title:subjectId;}
  function planKey(){const c=window.curriculum&&window.curriculum[classId];const s=c&&c.subjects&&c.subjects.find(x=>String(x.id)===String(subjectId));return s&&s.planKey?s.planKey:`${classId}_${subjectId}`;}
  function getLessons(){
    try{
      const packed=window.ktpD&&window.ktpD[String(classId)];
      if(!packed||!Array.isArray(packed.d)||!Array.isArray(packed.r))return [];
      const keys=packed.d[0]||[];
      const sections=packed.d[1]||[];
      const strings=packed.d[2]||[];
      const keyIndex=keys.indexOf(planKey());
      if(keyIndex<0)return [];
      return packed.r.filter(r=>r[0]===keyIndex&&Number(r[2])===quarterId).map(r=>({number:r[1],section:sections[r[3]]||'',title:strings[r[4]]||'',objective:strings[r[5]]||'',hours:r[6]||''})).filter(x=>x.title);
    }catch(e){console.error('KTP read error:',e);return [];}
  }
  function render(){
    if(!root||!quarterId)return false;
    const lessons=getLessons();
    if(!lessons.length)return false;
    let last='';
    let h=`<a href="class.html?class=${encodeURIComponent(classId)}" class="back-link">← ${esc(classId)}-сынып</a><div class="quarter-page-header"><span class="quarter-page-badge">${esc(classId)}-сынып • ${esc(subjectTitle())} • ${quarterId}-тоқсан</span><h1>${esc(subjectTitle())}</h1><p>${lessons.length} сабақ</p></div><div class="ktp-note"><strong>2026–2027 оқу жылы</strong><br>КТП-дағы күндер сайтқа енгізілмейді. Оқу мақсаттары кейін ҚМЖ жасау кезінде пайдаланылады.</div><div class="quarter-lesson-list">`;
    lessons.forEach(l=>{
      if(l.section&&l.section!==last){last=l.section;h+=`<div class="ktp-section-title">${esc(l.section)}</div>`;}
      h+=`<a href="lesson.html?class=${encodeURIComponent(classId)}&subject=${encodeURIComponent(subjectId)}&quarter=${quarterId}&lesson=${encodeURIComponent(l.number)}" class="quarter-lesson-card"><div class="quarter-lesson-number">${String(l.number).padStart(2,'0')}</div><div class="quarter-lesson-info"><h3>${esc(l.title)}</h3>${l.objective?`<p>${esc(l.objective)}</p>`:''}<small>${esc(l.hours)} сағат</small></div><div class="quarter-lesson-arrow">→</div></a>`;
    });
    root.innerHTML=h+'</div>';return true;
  }
  function showLoading(){if(root)root.innerHTML=`<div class="admin-box"><h3>КТП жүктелуде...</h3><p>${esc(classId)}-сынып • ${esc(subjectId)} • ${quarterId}-тоқсан</p><p id="ktpStatus">КТП мәліметтері дайындалуда...</p></div>`;}
  function showError(msg){if(root)root.innerHTML=`<div class="admin-box"><h3>КТП жүктелмеді</h3><p>${esc(msg)}</p><p><strong>Сынып:</strong> ${esc(classId)} | <strong>Пән:</strong> ${esc(subjectId)} | <strong>Тоқсан:</strong> ${quarterId}</p></div>`;}
  function load(){
    if(!classId||!subjectId||!quarterId)return;
    showLoading();
    if(render())return;
    const src=String(classId)==='5'?'ktp-d-5.js?v=4':`ktp-${classId}.js?v=10`;
    const status=()=>document.getElementById('ktpStatus');
    const script=document.createElement('script');script.src=src;script.async=false;
    script.onload=()=>{if(status())status().textContent='КТП мәліметтері жүктелді, сабақтар көрсетілуде...';setTimeout(()=>{if(!render())showError('КТП деректері жүктелді, бірақ осы тоқсанға сабақтар табылмады.');},0);};
    script.onerror=()=>showError(`КТП файлын жүктеу мүмкін болмады: ${src}`);
    document.head.appendChild(script);
  }
  const st=document.createElement('style');st.textContent='.ktp-note{margin:16px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;color:#667085;line-height:1.6}.ktp-section-title{margin:24px 0 10px;padding:10px 14px;border-radius:10px;background:#eef2ff;color:#3730a3;font-weight:800}.quarter-lesson-info p{margin:6px 0;color:#7a8495;font-size:12px;line-height:1.45}.quarter-lesson-info small{display:block;margin-top:6px;color:#667085}';document.head.appendChild(st);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else setTimeout(load,0);
})();
