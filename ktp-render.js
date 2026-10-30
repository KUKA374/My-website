(function () {
  const params = new URLSearchParams(location.search);
  const classId = params.get('class');
  const subjectId = params.get('subject');
  const quarterId = Number(params.get('quarter'));

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function subjectTitle() {
    const c = window.curriculum && window.curriculum[classId];
    const s = c && c.subjects && c.subjects.find(x => String(x.id) === String(subjectId));
    return s ? s.title : subjectId;
  }

  function showClassPage() {
    const c = document.getElementById('classPage');
    if (!c || !classId || quarterId) return;
    const data = window.curriculum && window.curriculum[classId];
    if (!data) return;
    c.innerHTML = `<a href="index.html#classes" class="back-link">← Сыныптарға қайту</a><div class="page-heading"><span class="badge">${esc(data.title)}</span><h1>${esc(data.title)}</h1><p>Пәнді таңдаңыз.</p></div><div class="subjects-container" id="subjectsContainer"></div>`;
    const box = document.getElementById('subjectsContainer');
    data.subjects.forEach(subject => {
      const block = document.createElement('div');
      block.className = 'subject-block';
      block.innerHTML = `<div class="subject-header"><div class="subject-icon">${subject.id.includes('geometry') ? '📏' : subject.id.includes('algebra') ? '📐' : '🔢'}</div><div><h2>${esc(subject.title)}</h2><p>4 тоқсан</p></div></div><div class="quarters-grid">${[1,2,3,4].map(q => `<a href="class.html?class=${encodeURIComponent(classId)}&subject=${encodeURIComponent(subject.id)}&quarter=${q}" class="quarter-card available"><div class="quarter-number">${q}</div><div><h3>${q}-тоқсан</h3><p class="available-label">КТП тақырыптары →</p></div></a>`).join('')}</div>`;
      box.appendChild(block);
    });
  }

  function getPlan() {
    const plans = window.ktpPlans || {};
    return plans[`${classId}_${subjectId}`] || null;
  }

  function renderQuarter() {
    const c = document.getElementById('classPage');
    if (!c || !classId || !subjectId || !quarterId) return false;
    const plan = getPlan();
    if (!plan || !Array.isArray(plan.lessons)) return false;
    const lessons = plan.lessons.filter(x => Number(x.quarter) === quarterId);
    const title = subjectTitle();
    let lastSection = '';
    let html = `<a href="class.html?class=${encodeURIComponent(classId)}" class="back-link">← ${esc(classId)}-сынып</a><div class="quarter-page-header"><span class="quarter-page-badge">${esc(classId)}-сынып • ${esc(title)} • ${quarterId}-тоқсан</span><h1>${esc(title)}</h1><p>${lessons.length} сабақ</p></div><div class="ktp-note"><strong>2026–2027 оқу жылы</strong><br>КТП-дағы күндер сайтқа енгізілмейді. Оқу мақсаттары кейін ҚМЖ жасау кезінде пайдаланылады.</div><div class="quarter-lesson-list">`;
    lessons.forEach(l => {
      if (l.section && l.section !== lastSection) {
        lastSection = l.section;
        html += `<div class="ktp-section-title">${esc(lastSection)}</div>`;
      }
      html += `<a href="lesson.html?class=${encodeURIComponent(classId)}&subject=${encodeURIComponent(subjectId)}&quarter=${quarterId}&lesson=${encodeURIComponent(l.number)}" class="quarter-lesson-card"><div class="quarter-lesson-number">${String(l.number).padStart(2,'0')}</div><div class="quarter-lesson-info"><h3>${esc(l.title)}</h3><p>${esc(l.objective || '')}</p></div><div class="quarter-lesson-arrow">→</div></a>`;
    });
    html += `</div>`;
    c.innerHTML = html;
    return true;
  }

  function showLoading() {
    const c = document.getElementById('classPage');
    if (c && classId && subjectId && quarterId) c.innerHTML = `<div class="admin-box"><h3>КТП жүктелуде...</h3><p>${esc(classId)}-сынып • ${esc(subjectId)} • ${quarterId}-тоқсан</p></div>`;
  }

  function loadClassKtp() {
    const src = `ktp-${classId}.js?v=4`;
    if (document.querySelector(`script[data-ktp-class="${classId}"]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.dataset.ktpClass = classId;
    s.onload = () => setTimeout(renderQuarter, 50);
    s.onerror = () => {
      const c = document.getElementById('classPage');
      if (c) c.innerHTML = `<div class="admin-box"><h3>КТП файлы жүктелмеді</h3><p>${esc(src)} файлын тексеру керек.</p></div>`;
    };
    document.head.appendChild(s);
  }

  function start() {
    if (!document.getElementById('classPage')) return;
    if (!quarterId) { showClassPage(); return; }
    showLoading();
    if (renderQuarter()) return;
    loadClassKtp();
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (renderQuarter() || tries >= 40) clearInterval(timer);
    }, 250);
  }

  const style = document.createElement('style');
  style.textContent = '.ktp-note{margin:16px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;color:#667085;line-height:1.6}.ktp-section-title{margin:24px 0 10px;padding:10px 14px;border-radius:10px;background:#eef2ff;color:#3730a3;font-weight:800}.quarter-lesson-info p{margin:6px 0 0;color:#7a8495;font-size:12px;line-height:1.45}';
  document.head.appendChild(style);
  document.addEventListener('DOMContentLoaded', start);
})();
