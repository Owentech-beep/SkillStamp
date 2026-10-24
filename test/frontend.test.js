import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { setTimeout as delay } from 'node:timers/promises';
import { challenges } from '../data/challenges.js';
import { opportunities } from '../data/opportunities.js';
const profile = {id:'student', name:'Owen Demo', email:'owen@example.com', role:'student', type:'Student', skills:['JavaScript'], location:'Pretoria', about:'Test'};
const stamp = {id:'excel',credentialId:'SS-test',title:'Excel Data Analysis',category:'Digital',score:100,date:new Date().toISOString(),answer:'Example answer',checklistResults:[]};
const portfolio = { stamps:[stamp],results:[{id:'attempt',challengeId:'excel',submittedAt:new Date().toISOString(),result:{score:100,pass:true}}],stats:{completedChallenges:1,stampsCollected:1,pointsEarned:100}};
async function page(name, role='student') {
 const dom=new JSDOM(readFileSync(`public/${name}.html`,'utf8'),{url:`http://localhost:3000/${name}.html`,runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));
 const calls=[];
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 dom.window.alert=()=>{};
 dom.window.confirm=()=>true;
 dom.window.fakeApi=async(url,options={})=>{
  calls.push({url,options});
  if(url==='/api/auth/me') return {user:{...profile,role}};
  if(url==='/api/challenges') return {challenges};
  if(url==='/api/opportunities') return {opportunities};
  if(url==='/api/portfolio') return portfolio;
  if(url==='/api/applications') return {applications:[]};
  if(url==='/api/notifications') return {notifications:[]};
  if(url==='/api/profile') return {user:{...profile,...JSON.parse(options.body)}};
  if(url.endsWith('/start')) return {attempt:{id:'attempt'}};
  if(url.endsWith('/submit')) return {result:{score:100,pass:true,feedback:'Passed',checklistResults:[]},credential:stamp};
  if(url.endsWith('/apply')) return {message:'Demo application submitted.',application:{id:'application',opportunityId:'o1'}};
  if(url.endsWith('/verify'))return {valid:true,credential:{credentialId:'SS-test',holderName:'Owen Demo',title:'Excel',score:100,issuedAt:new Date().toISOString(),category:'Digital',issuer:'SkillStamp',assessmentType:'Demo'}};
  throw new Error('Unexpected URL '+url);
 };
 if(name==='verify') {
  let script=readFileSync('public/verify.js','utf8').replace("return (await import('./firebase-client.js')).apiRequest(url);",'return window.fakeApi(url);');
  dom.window.eval(script);
 } else {
  dom.window.eval(readFileSync('public/app.js','utf8'));
  dom.window.eval('apiRequest = window.fakeApi;');
  dom.window.firebaseMock={loginAccount:async()=>{throw new Error('Incorrect email or password.');},registerAccount:async()=>{throw new Error('Choose a stronger password.');},resetPassword:async()=>{}};
  dom.window.eval('firebaseClient = async () => window.firebaseMock;');
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 }
 await delay(30);
 return {dom,calls,w:dom.window,d:dom.window.document};
}
test('Existing pages initialise against the migrated API contract',async t=>{
 for(const name of ['index','login','signup','dashboard','challenges','challenge','portfolio','opportunities','profile']) {
  await t.test(name,async()=>{const {dom,d}=await page(name);try{assert.doesNotMatch(d.body.textContent,/Could not load this page/);if(name==='challenges')assert.equal(d.querySelectorAll('.challenge-card').length,challenges.length);if(name==='portfolio')assert.match(d.body.textContent,/SS-test/);if(name==='dashboard')assert.match(d.body.textContent,/Points earned: 100/);if(name==='profile')assert.equal(d.getElementById('profileEmail').readOnly,true);}finally{dom.window.close();}});
 }
});
test('Login handler displays Firebase failure and re-enables submit',async()=>{
 const {dom,d,w}=await page('login');try {d.getElementById('loginEmail').value='owen@example.com';d.getElementById('loginPassword').value='wrong';d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await delay(20);assert.match(d.body.textContent,/Incorrect email or password/);assert.equal(d.querySelector('[type=submit]').disabled,false);}finally{dom.window.close();}
});
test('Challenge submission renders server score and credential',async()=>{
 const {dom,d,w,calls}=await page('challenge');try{d.getElementById('challengeAnswer').value='Example answer';d.getElementById('answerForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await delay(20);assert.match(d.getElementById('resultPanel').textContent,/SS-test/);assert.equal(calls.filter(c=>c.url.endsWith('/submit')).length,1);}finally{dom.window.close();}
});
test('Application submission disables duplicate apply button',async()=>{
 const {dom,d}=await page('opportunities');try{const btn=d.querySelector('[data-apply]');btn.click();await delay(20);assert.equal(btn.disabled,true);assert.match(btn.textContent,/submitted/);}finally{dom.window.close();}
});
test('Employer verification uses authenticated API helper',async()=>{
 const {dom,d,w}=await page('verify','employer');try{assert.equal(d.getElementById('verifyForm').hidden,false);d.getElementById('credentialId').value='SS-test';d.getElementById('verifyForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await delay(20);assert.match(d.getElementById('verificationResult').textContent,/Credential verified/);}finally{dom.window.close();}
});
