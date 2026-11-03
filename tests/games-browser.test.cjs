/* Run: node tests/games-browser.test.cjs. Requires Playwright and Chromium.
 * Auth is mocked only at the browser network boundary; production auth is unchanged.
 */
const {test}=require('node:test');
const mechanics=require('./helpers/mechanics.cjs');
const logic=require('./helpers/logic.cjs');
const racing=require('./helpers/racing.cjs');
const timed=require('./helpers/timed.cjs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let browser,server,base;
const screenshotDir=process.env.GAMES_SCREENSHOT_DIR;
const errors=[];
async function setup(){
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(err?'Not found':data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
}
async function pageFor(viewport,clocked=true){
 const page=await browser.newPage({viewport,reducedMotion:'reduce',isMobile:viewport.width<600,hasTouch:viewport.width<600});
 await page.route('**/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'window.requireRole=()=>{};'}));
 page.on('pageerror',e=>errors.push(e.message));
 if(clocked)await page.clock.install();
 await page.goto(base+'/games.html');await page.locator('.game-card').last().waitFor();return page;
}
async function layout(page,label){
 const bad=await page.evaluate(()=>[...document.querySelectorAll('#gameStage button,#gameStage input,#gameStage textarea,#gameStage select')].filter(e=>{
  const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left< -1||r.right>innerWidth+1);
 }).map(e=>e.outerHTML.slice(0,130)));
 assert.deepEqual(bad,[],label+' controls fit viewport');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,label+' no horizontal overflow');
}
async function shot(page,name){if(screenshotDir){fs.mkdirSync(screenshotDir,{recursive:true});await page.screenshot({path:path.join(screenshotDir,name+'.png'),fullPage:true});}}
async function start(page,id,grade='6'){
 if(await page.locator('#gameStage').isVisible())await page.locator('#backToGamesButton').click();
 await page.locator(`[data-game-id="${id}"]`).click();
 await page.selectOption('#gradeSelect',grade);await page.selectOption('#quarterSelect','1');
 await page.locator('#startGameButton').click();await page.locator('#gameArea').waitFor({state:'visible'});
}
async function bank(page,id){return page.evaluate(id=>{
 const aliases={'find-error':'findError','quick-answer':'quickAnswer','math-code':'mathCode'};
 const b=gameQuestionBank[getLessonKey()];return b[aliases[id]||id]||b.quickAnswer;
},id);}
async function continueAnswer(page){await page.locator('#gameQuestion .game-answer-feedback button,#gameQuestion .scene-feedback button').click();}
async function play(page,id){
 if(timed.supports(id))return timed.play(page,id);
 if(racing.supports(id))return racing.play(page,id);
 if(logic.supports(id))return logic.play(page,id);
 if(mechanics.supported(id))return mechanics.play(page,id);
 const qs=await bank(page,id);
 if(id==='match'){
  for(let i=0;i<qs.length;i++){
   await page.locator(`[data-match-left="${i}"]`).click();
   const pos=await page.evaluate(i=>matchState.order.indexOf(i),i);
   await page.locator(`[data-match-right="${pos}"]`).click();
  }
  await page.locator('#replayGameButton').waitFor();return;
 }
 for(let i=0;i<qs.length;i++){
  if(id==='wheel'){
   await page.locator('#spinTeamWheel').click();
   assert.equal(await page.locator('#spinTeamWheel').isDisabled(),true,'spin locked');
   await page.locator('[data-timed-answer]').first().waitFor();
  }
  if(id==='cards')await page.locator('#scene-flip').click();
  const q=qs[i];
  const answer=id==='wheel'?await page.evaluate(()=>{
   const prompt=document.querySelector('#wheelTask .race-question').textContent;
   const b=gameQuestionBank[getLessonKey()];return (b.wheel||b.quickAnswer).find(q=>q.question===prompt).answer;
  }):q.answer??q.correction;
  if(['quick-answer','math-code','detective','find-error'].includes(id)){
   const input=page.locator(id==='quick-answer'?'#quickAnswerInput':'#gameTextAnswer');await input.fill(String(answer));
   if(id==='quick-answer'){
    await input.press('Enter');
    assert.equal(await page.evaluate(()=>currentScore),(i+1)*10+i*(i+1),'quick score includes the streak exactly once');
    if(i+1<qs.length)await page.waitForFunction(i=>currentIndex===i+1,i);
   }else{await page.locator('#textAnswerButton').click();assert.equal(await page.locator('.game-answer-feedback.good').count(),1,id+' correct answer accepted');await continueAnswer(page);}
  }else{
   const attribute={'math-race':'data-race-team','wheel':'data-wheel-team','tug-of-war':'data-tug-team'}[id]||'data-scene-answer';
   await page.locator(`[${attribute}=${JSON.stringify(String(answer))}]`).click();
   if(attribute==='data-scene-answer')assert.match(await page.locator('.scene-feedback').textContent(),/✓/);
   else assert.equal(await page.locator('.game-answer-feedback.good').count(),1,id+' correct choice accepted');
   await continueAnswer(page);
  }
 }
 await page.locator('#gameQuestion button').filter({hasText:/Қайта ойнау/}).waitFor();
}

test('all 20 games: complete, replay and return on desktop and mobile, grades 5–7',async t=>{
 await setup();t.after(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
 for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const page=await pageFor(viewport);
  const ids=await page.locator('.game-card').evaluateAll(cards=>cards.map(c=>c.dataset.gameId));assert.equal(ids.length,20);
  await shot(page,name+'-library');
  for(const id of ids){
   await t.test(name+' / '+id,async()=>{
    try{
    await start(page,id);await layout(page,id);await shot(page,name+'-'+id);
    await play(page,id);
    assert.equal(await page.locator('#gameProgress').textContent(),'Нәтиже');
    await layout(page,id+' result');await shot(page,name+'-'+id+'-result');
    await page.locator('#gameQuestion button').filter({hasText:/Қайта ойнау/}).click();
    assert.match(await page.locator('#gameProgress').textContent(),/^[01] \/ /);
    await page.locator('#backToGamesButton').click();
    assert.equal(await page.locator('#gamesLibrary').isVisible(),true);
    }catch(error){console.error(name,id,error.message);throw error;}
   });
   if(await page.locator('#gameStage').isVisible())await page.locator('#backToGamesButton').click();
  }
  // Every game's source also runs to completion with the other supported grades.
  for(const grade of ['5','7'])for(const id of ids){
   await start(page,id,grade);await play(page,id);await page.locator('#backToGamesButton').click();
  }
  console.log(`${name}: 60 complete games across grades 5, 6 and 7`);
  await page.close();
 }
 assert.deepEqual(errors,[],'no uncaught browser errors');
});

test('edge cases: scoring, locks, timeouts, cancellation, keyboard and narrow screens',async t=>{
 await setup();t.after(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
 const page=await pageFor({width:320,height:740},true);
 const originalBank=await page.evaluate(()=>JSON.stringify(gameQuestionBank));
 await t.test('auction: committed stakes and answers cannot reopen a lot; capitals are separate',async()=>{
  await start(page,'auction');
  await page.locator('#timedBid').fill('30');await page.locator('#timedConfirmBid').click();
  assert.equal(await page.locator('#timedBid').count(),0);
  const wrong=await page.evaluate(()=>{const q=GameTimed.snapshot().qs[0];return q.options.findIndex(v=>v!==q.answer);});
  await page.locator(`[data-timed-answer="${wrong}"]`).evaluate(b=>{b.click();b.click();});
  assert.deepEqual(await page.evaluate(()=>GameTimed.snapshot().game.capital),[70,100]);
  assert.equal(await page.locator('#timedContinue').count(),1);
  await page.locator('#timedContinue').click();await timed.play(page,'auction');
  assert.equal(await page.locator('#gameProgress').textContent(),'Нәтиже');
  await page.locator('#backToGamesButton').click();
 });
 await t.test('castle: three wrong answers end the game early; replay restores health',async()=>{
  await start(page,'castle');const qs=await bank(page,'castle');
  for(let i=0;i<3;i++){
   const wrong=await page.locator('[data-scene-answer]').evaluateAll((bs,a)=>bs.find(b=>b.dataset.sceneAnswer!==a).dataset.sceneAnswer,qs[i].answer);
   await page.locator(`[data-scene-answer=${JSON.stringify(wrong)}]`).click();await continueAnswer(page);
  }
  assert.match(await page.locator('.scene-ending').textContent(),/таусылды/);
  assert.equal(await page.locator('#gameProgress').textContent(),'Нәтиже');
  await page.locator('#scene-replay').click();assert.equal(await page.locator('.scene-health').textContent(),'❤️❤️❤️');
  await page.locator('#backToGamesButton').click();
 });
 await t.test('code parts: repeated submit and stale handlers cannot add points or skip questions',async()=>{
  await start(page,'math-code');await page.locator('#codeAnswer').fill('0.75');
  await page.locator('#codeSubmit').evaluate(b=>{window.staleCodeSubmit=b.onclick;b.click();b.click();});
  await page.evaluate(()=>window.staleCodeSubmit());
  assert.equal(await page.evaluate(()=>GameLogic.snapshot().awarded.length),1);
  assert.equal(await page.evaluate(()=>currentScore),1);
  assert.equal(await page.locator('#gameProgress').textContent(),'2 / 4');
  await layout(page,'320px code');await page.locator('#backToGamesButton').click();
 });
 await t.test('wheel: navigating away during a spin does not replace the next game',async()=>{
  await start(page,'wheel');await page.locator('#spinTeamWheel').click();await page.locator('#backToGamesButton').click();
  await start(page,'detective');await page.clock.fastForward(1700);
  assert.equal(await page.locator('.detective-game').count(),1);assert.equal(await page.locator('#wheelTask').count(),0);
  await page.locator('#backToGamesButton').click();
 });
 await t.test('quick answer: empty input, double submission and real deadline',async()=>{
  await start(page,'quick-answer');
  await page.locator('#quickAnswerButton').click();assert.equal(await page.evaluate(()=>currentIndex),0);
  await page.locator('#quickAnswerInput').fill('3/4');await page.locator('#quickAnswerInput').press('Enter');
  assert.equal(await page.evaluate(()=>currentScore),10);
  await page.locator('#quickAnswerButton').click();assert.equal(await page.evaluate(()=>currentScore),10);
  await page.clock.fastForward(31000);
  assert.match(await page.locator('.quick-result-label').textContent(),/Уақыт аяқталды/);
  assert.equal(await page.locator('#gameProgress').textContent(),'Нәтиже');
  await page.locator('#timedReplay').click();assert.equal(await page.locator('#quickTimer').textContent(),'30');
  await page.locator('#backToGamesButton').click();
 });
 await t.test('blitz: timeout shows the solution, continuation starts a fresh timer',async()=>{
  await start(page,'blitz');await page.clock.fastForward(13000);
  assert.match(await page.locator('.timed-feedback').textContent(),/Уақыт аяқталды/);
  assert.equal(await page.locator('[data-timed-answer]:enabled').count(),0);
  await page.locator('#timedContinue').click();assert.equal(await page.locator('#scene-seconds').textContent(),'12');
  await page.locator('#backToGamesButton').click();await page.clock.fastForward(60000);
  assert.equal(await page.locator('#gamesLibrary').isVisible(),true);
 });
 await t.test('320px layout of every game and unavailable quarter',async()=>{
  for(const id of await page.locator('.game-card').evaluateAll(bs=>bs.map(b=>b.dataset.gameId))){
   await start(page,id);await layout(page,id+' 320px');await page.locator('#backToGamesButton').click();
  }
  await page.locator('[data-game-id="match"]').click();await page.selectOption('#quarterSelect','4');
  assert.equal(await page.locator('#startGameButton').isDisabled(),true);
  await page.locator('#backToGamesButton').click();
 });
 assert.equal(await page.evaluate(()=>JSON.stringify(gameQuestionBank)),originalBank,'question bank unchanged throughout play');
 assert.deepEqual(errors,[],'no uncaught browser errors');await page.close();
});
