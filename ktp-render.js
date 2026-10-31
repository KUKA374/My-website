(function(){
  const p=new URLSearchParams(location.search),classId=p.get('class'),subjectId=p.get('subject'),quarterId=Number(p.get('quarter')),root=document.getElementById('classPage');
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  function subject(){const c=window.curriculum&&window.curriculum[classId],s=c&&c.subjects&&c.subjects.find(x=>String(x.id)===String(subjectId));return s||null}
  function key(){const s=subject();return s&&s.planKey?s.planKey:`${classId}_${subjectId}`}
  function lessons(){
    const g=window.ktpD&&window.ktpD[String(classId)],k=key();
    if(!g)return [];
    const source=g[k];
    if(source&&Array.isArray(source.rows)){
      const sections=source.sections||[],titles=source.titles||[],objectives=source.objectives||[];
      return source.rows.filter(r=>Number(r?.[1])===quarterId).map(r=>({number:r[0],section:sections[r[2]]||'',title:titles[r[3]]||'',objective:objectives[r[4]]||'',hours:1})).filter(x=>x.title);
    }
    if(Array.isArray(g.r)){
      const ks=g.d?.[0]||[],sec=g.d?.[1]||[],str=g.d?.[2]||[],i=ks.findIndex(x=>String(x)===String(k));
      if(i<0)return [];
      return g.r.filter(r=>Number(r?.[0])===Number(i)&&Number(r?.[2])===quarterId).map(r=>({number:r[1],section:sec[r[3]]||'',title:str[r[4]]||'',objective:str[r[5]]||'',hours:r[6]||''})).filter(x=>x.title);
    }
    if(Array.isArray(g[k]))return g[k].filter(x=>Number(x.quarter)===quarterId&&x.title);
    return [];
  }
  function render(){
    if(!root||!classId||!subjectId||!quarterId)return false;
    const ls=lessons();if(!ls.length)return false;let last='';const s=subject();
    let h=`<a href="class.html?class=${encodeURIComponent(classId)}" class="back-link">← ${esc(classId)}-сынып</a><div class="quarter-page-header"><span class="quarter-page-badge">${esc(classId)}-сынып • ${esc(s?s.title:subjectId)} • ${quarterId}-тоқсан</span><h1>${esc(s?s.title:subjectId)}</h1><p>${ls.length} сабақ</p></div><div class="ktp-note"><strong>2026–2027 оқу жылы</strong><br>КТП-дағы күндер сайтқа енгізілмейді. Оқу мақсаттары кейін ҚМЖ жасау кезінде пайдаланылады.</div><div class="quarter-lesson-list">`;
    ls.forEach(l=>{if(l.section&&l.section!==last){last=l.section;h+=`<div class="ktp-section-title">${esc(l.section)}</div>`}h+=`<a href="lesson.html?class=${encodeURIComponent(classId)}&subject=${encodeURIComponent(subjectId)}&quarter=${quarterId}&lesson=${encodeURIComponent(l.number)}" class="quarter-lesson-card"><div class="quarter-lesson-number">${String(l.number).padStart(2,'0')}</div><div class="quarter-lesson-info"><h3>${esc(l.title)}</h3><small>${esc(l.hours)} сағат</small></div><div class="quarter-lesson-arrow">→</div></a>`});
    root.innerHTML=h+'</div>';return true;
  }
  function error(){if(root)root.innerHTML=`<div class="admin-box"><h3>КТП жүктелмеді</h3><p>КТП деректері табылмады немесе осы тоқсанға сабақтар табылмады.</p><p><strong>Сынып:</strong> ${esc(classId)} | <strong>Пән:</strong> ${esc(subjectId)} | <strong>Тоқсан:</strong> ${quarterId}</p></div>`}
  const st=document.createElement('style');st.textContent='.ktp-note{margin:16px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;color:#667085;line-height:1.6}.ktp-section-title{margin:24px 0 10px;padding:10px 14px;border-radius:10px;background:#eef2ff;color:#3730a3;font-weight:800}.quarter-lesson-info small{display:block;margin-top:6px;color:#667085}';document.head.appendChild(st);
  async function start(){
    if(!classId||!subjectId||!quarterId)return;
    try{if(window.ktpReady)await window.ktpReady;setTimeout(()=>{if(!render())error()},0)}catch(e){console.error(e);error()}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();