window.ktpD=window.ktpD||{};
window.ktpReady=Promise.all([
  'ktp-8-algebra-q1.js?v=1','ktp-8-algebra-q2.js?v=1','ktp-8-algebra-q3.js?v=1','ktp-8-algebra-q4.js?v=1',
  'ktp-8-geometry-q1.js?v=1','ktp-8-geometry-q2.js?v=1','ktp-8-geometry-q3.js?v=1','ktp-8-geometry-q4.js?v=1'
].map(src=>new Promise(resolve=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)})));
