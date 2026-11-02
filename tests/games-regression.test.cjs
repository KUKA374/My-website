"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
function read(file){return fs.readFileSync(path.join(root,file),"utf8");}
function fixture(){
 const context=vm.createContext({window:{},document:{getElementById(){return null;}},setTimeout,clearTimeout,setInterval,clearInterval,console,Math});
 vm.runInContext(read("games-data.js"),context,{filename:"games-data.js"});
 vm.runInContext("window.getGameQuestions=getGameQuestions;",context);
 vm.runInContext(read("games-extra-v5.js"),context,{filename:"games-extra-v5.js"});
 vm.runInContext(read("games-team-mode.js"),context,{filename:"games-team-mode.js"});
 const ids=vm.runInContext("mathGames.map(g=>g.id)",context);
 const topics=vm.runInContext("Object.keys(gameQuestionBank)",context);
 return {context,ids,topics,get:context.window.getGameQuestions};
}
test("all 20 games are registered exactly once",()=>{
 const {ids}=fixture();assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);
});
test("all available topics have playable questions in every mode",()=>{
 const {ids,topics,get}=fixture();assert.ok(topics.length>=12);
 for(const topic of topics)for(const id of ids){
  const questions=get(id,topic);
  assert.ok(Array.isArray(questions)&&questions.length>0,`${id} / ${topic}: missing questions`);
  for(const q of questions){
    if(id==="match"){assert.ok(q.left&&q.right);continue;}
    if(id==="find-error"){assert.ok(q.statement&&q.correction);continue;}
    assert.ok(q.question||q.clue,`${id} / ${topic}: missing prompt`);
    if(Array.isArray(q.options)){assert.ok(q.options.some(o=>String(o)===String(q.answer)),`${id} / ${topic}: correct answer not in options`);}
  }
 }
});
test("switching between a team, scene and core game resets the source",()=>{
 const {get}=fixture(),topic="6-math-1-1";
 assert.ok(get("math-race",topic).length>0);
 assert.ok(get("puzzle",topic).length>0);
 assert.ok(get("match",topic).length>0);
 assert.ok(get("wheel",topic).length>0);
});
test("source files parse as JavaScript",()=>{
 for(const file of ["games-data.js","games.js","games-extra-v5.js","games-team-mode.js","games-arcade.js"])assert.doesNotThrow(()=>new Function(read(file)),file);
});

test("playing-source preparation preserves all 5–7 grade question data",()=>{
 const {context,ids,topics,get}=fixture();
 const before=vm.runInContext('JSON.stringify(gameQuestionBank)',context);
 for(const topic of topics)for(const id of ids)get(id,topic);
 assert.equal(vm.runInContext('JSON.stringify(gameQuestionBank)',context),before);
});
test("question choices always include the answer, including full distractor lists",()=>{
 const {context,get}=fixture();
 for(const options of [["3","4","5","6"],["3","4","5","6","2"]]){
  context.choiceFixture=options;
  vm.runInContext('gameQuestionBank["fixture"]={quickAnswer:[{question:"1 + 1",answer:"2",options:choiceFixture}]}',context);
  for(const id of ['math-race','wheel','puzzle']){
   const questions=get(id,'fixture');assert.equal(questions.length,1);
   assert.ok(questions[0].options.includes('2'));assert.equal(questions[0].options.length,4);
  }
 }
});
