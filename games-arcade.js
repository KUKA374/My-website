/* Arcade presentation layer. Keeps game mechanics in existing files. */
(function(){
"use strict";
const art={
"match":["🧩","🔗","✓"],"find-error":["🔍","❌","✓"],"quick-answer":["⚡","⏱️","🏆"],
"math-code":["🔒","🔢","🔓"],detective:["🕵️","🔎","📁"],"tug-of-war":["🔵","🪢","🔴"],
"math-race":["🏃","🏁","🏆"],wheel:["🎡","🎲","⭐"],auction:["💰","🔨","🏆"],
blitz:["⚡","⏱️","🎯"],cards:["🃏","❓","⭐"],quest:["🗺️","📍","🏆"],
"secret-number":["🔒","🔢","🔑"],puzzle:["🧩","✨","🏞️"],rocket:["🌍","🚀","🌕"],
castle:["🏰","🛡️","⭐"],"car-race":["🏎️","💨","🏁"],target:["🎯","🏹","⭐"],
bridge:["🌉","🚶","🏁"],"math-king":["👑","🏰","🏆"]
};
const notes={
"match":"Жұптарды дұрыс сәйкестендір","find-error":"Қателерді тауып, шешімді түзет",
"quick-answer":"Уақытпен жарысып, ұпай жина","math-code":"Құпия құлыпты аш",
detective:"Математикалық дәлелдерді зертте","tug-of-war":"Екі команданың сайысы",
"math-race":"Мәреге бірінші жет","wheel":"Дөңгелекті айналдырып, тапсырманы орында",
auction:"Сұрақтарға жауап беріп, ұпай жина",blitz:"Тапсырмаларды жылдам орында",
cards:"Карточкалардағы есептерді аш",quest:"Картадағы бекеттерден өт",
"secret-number":"Жасырын санды тап",puzzle:"Бөліктерді біртіндеп аш",
rocket:"Зымыранды мәреге жеткіз",castle:"Қамалды есептермен қорға",
"car-race":"Көлікті мәре сызығына жеткіз",target:"Дұрыс жауаппен нысанаға тигіз",
bridge:"Көпірдің бөліктерін жина","math-king":"Барлық кезеңнен өтіп, жеңіске жет"
};
function emoji(id){return art[id]||["🎮","⭐","🏆"];}
function decorateCards(){
 document.querySelectorAll(".game-card[data-game-id]").forEach(card=>{
  if(card.querySelector(".game-preview"))return;
  const id=card.dataset.gameId;
  const preview=document.createElement("div");preview.className="game-preview";preview.setAttribute("aria-hidden","true");
  emoji(id).forEach(e=>{const span=document.createElement("span");span.className="preview-emoji";span.textContent=e;preview.appendChild(span);});
  const icon=card.querySelector(".game-icon");if(icon)icon.after(preview);else card.prepend(preview);
  const enter=document.createElement("div");enter.className="game-enter";
  enter.innerHTML="<span>ОЙНАУҒА ӨТУ</span><span aria-hidden='true'>→</span>";card.appendChild(enter);
 });
}
function decorateSetup(){
 const setup=document.getElementById("gameSetup");if(!setup||setup.style.display==="none")return;
 const id=document.body.dataset.game;if(!id)return;
 let intro=setup.querySelector(".arcade-intro");
 if(!intro){intro=document.createElement("div");intro.className="arcade-intro";const grid=setup.querySelector(".setup-grid");if(grid)grid.before(intro);}
 if(intro.dataset.gameId===id)return;
 intro.dataset.gameId=id;
 intro.replaceChildren();
 const icon=document.createElement("div");icon.className="intro-art";icon.textContent=emoji(id)[0];
 const content=document.createElement("div");const strong=document.createElement("strong");strong.textContent="Ойынға дайындал!";
 const small=document.createElement("small");small.textContent=notes[id]||"Тапсырмаларды орында";
 content.append(strong,small);intro.append(icon,content);
}
function decorateStage(){
 const area=document.getElementById("gameArea");if(!area||area.style.display==="none")return;
 const id=document.body.dataset.game;if(!id)return;
 let banner=area.querySelector(".arcade-scene-banner");
 if(!banner){banner=document.createElement("div");banner.className="arcade-scene-banner";const top=area.querySelector(".game-top");if(top)top.after(banner);else area.prepend(banner);}
 const game=typeof mathGames!=="undefined"?mathGames.find(x=>x.id===id):null;
 if(banner.dataset.gameId!==id){
 banner.dataset.gameId=id;
 banner.replaceChildren();
 const icon=document.createElement("span");icon.className="banner-icon";icon.textContent=emoji(id)[0];
 const content=document.createElement("div");const title=document.createElement("strong");title.textContent=game?game.title:"Математикалық ойын";
 const desc=document.createElement("small");desc.textContent=notes[id]||"Есептерді шеш";
 content.append(title,desc);banner.append(icon,content);
 }
 let progress=area.querySelector(".arcade-progress");
 if(!progress){progress=document.createElement("div");progress.className="arcade-progress";progress.innerHTML="<span></span>";banner.after(progress);}
 const label=area.querySelector("#gameProgress")?.textContent||"";
 const m=label.match(/(\d+)\s*\/\s*(\d+)/);
 const pct=m?Math.max(0,Math.min(100,(Number(m[1])-1)/Number(m[2])*100)):label.includes("Нәтиже")?100:0;
 if(progress.firstElementChild.style.width!==pct+"%")progress.firstElementChild.style.width=pct+"%";
}
let pending=false;
function refresh(){pending=false;decorateCards();decorateSetup();decorateStage();}
function queue(){if(pending)return;pending=true;requestAnimationFrame(refresh);}
document.addEventListener("DOMContentLoaded",()=>{
 const root=document.querySelector(".games-shell")||document.body;
 const observer=new MutationObserver(queue);
 observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:["style","data-game"]});
 queue();
});
})();
