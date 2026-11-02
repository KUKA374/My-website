/* Load only the KTP files required for grades 9–11.
   Original KTP data remains in the existing repository files. */
(function () {
  const grade = new URLSearchParams(location.search).get('class');
  const files = {
    '9': ['ktp-9-algebra.js?v=4', 'ktp-9-geometry.js?v=4'],
    '10': ['ktp-10.js?v=4'],
    '11': ['ktp-11.js?v=4']
  }[grade] || [];
  if (!files.length) {
    window.ktpUpperReady = Promise.resolve(window.ktpD || {});
    return;
  }

  function load(source) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = source;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('КТП файлы жүктелмеді: ' + source));
      };
      document.head.appendChild(script);
    });
  }

  const earlier = Promise.resolve(window.ktpReady);
  window.ktpUpperReady = (async function () {
    await earlier;
    for (const file of files) await load(file);
    // Grade 9 source files decode JSON asynchronously; grades 10/11
    // decode their own gzipped data asynchronously. Wait for completion.
    await Promise.resolve(window.ktpReady);
    // The original 10th-grade file stores KTP rows in window.ktpPlans.
    // Map those existing lesson objects to the unified quarter keys.
    const plans = window.ktpPlans || {};
    window.ktpD = window.ktpD || {};
    for (const key of Object.keys(plans)) {
      if (!key.startsWith(grade + '_')) continue;
      const rows = Array.isArray(plans[key] && plans[key].lessons) ? plans[key].lessons : [];
      for (let quarter = 1; quarter <= 4; quarter++) {
        const lessons = rows.filter(item => Number(item.quarter) === quarter);
        if (lessons.length) window.ktpD[key + '_q' + quarter] = lessons;
      }
    }
    return window.ktpD;
  })();
  window.ktpUpperReady.catch(function (error) {
    console.error('9–11 сынып КТП деректерін жүктеу қатесі:', error);
  });
})();
