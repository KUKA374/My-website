window.ktpD=window.ktpD||{};
const q2=window.ktpD["5_math_q2"]||[];
if(q2.length){
  const q1=Array.isArray(window.ktpD["5_math"])?window.ktpD["5_math"].filter(x=>Number(x.quarter)!==2):[];
  window.ktpD["5_math"]=q1.concat(q2);
}
window.ktpReady=Promise.resolve(window.ktpD);
console.log('5-сынып KTP: 2-тоқсан қосылды:',q2.length);