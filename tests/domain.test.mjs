import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGame, dispatch, grade, profit, cashDelta, I, P } from "../src/domain.mjs";
const cfg=JSON.parse(readFileSync(new URL("../spec/mvp_config.json",import.meta.url),"utf-8"));
let seq=0;
const move=(s,type,payload={})=>{
 const r=dispatch(s,{type,payload,targetDay:s.day,id:"test-"+(++seq)},cfg);
 assert.equal(r.ok,true,type+": "+r.error);
 return r.state;
};
const rejected=(s,type,payload={})=>{
 const r=dispatch(s,{type,payload,targetDay:s.day,id:"test-"+(++seq)},cfg);
 assert.equal(r.ok,false,type+" must be rejected");
 assert.deepEqual(r.state,s,"invalid action mutated state");
};
const clock=(s,time)=>{for(let i=0;i<Math.round(time*10);i++)s=dispatch(s,{type:"TICK",payload:{seconds:0.1}},cfg).state;return s;};
function makeDish(s){
 s=move(s,"ACCEPT_ORDER",{orderId:s.orders.find(o=>o.state==="queued").id});
 for(const x of cfg.cooking.p1TargetsX)s=move(s,"STRIKE",{x});
 s=move(s,"COMPLETE_STAGE");
 for(let z=0;z<3;z++)s=move(s,"COAT",{zone:z,full:true});
 s=move(s,"COMPLETE_STAGE");
 s=move(s,"START_TIMER");s=clock(s,10);s=move(s,"STOP_TIMER");
 s=move(s,"COMPLETE_STAGE");s=move(s,"COMPLETE_STAGE");
 s=move(s,"START_TIMER");s=clock(s,4);s=move(s,"STOP_TIMER");
 s=move(s,"COMPLETE_STAGE");
 for(const slot of P)s=move(s,"PLACE",{slot});
 s=move(s,"COMPLETE_STAGE");s=move(s,"SERVE");
 return s;
}
test("Day1: first cancellation is guarded",()=>{
 let s=move(createGame(cfg),"OPEN_SHOP");s=move(s,"ACCEPT_ORDER",{orderId:s.orders[0].id});rejected(s,"CANCEL_ORDER");
});
test("Day1: all eight dishes, accounting, and automatic close",()=>{
 let s=move(createGame(cfg),"OPEN_SHOP");
 for(let i=0;i<8;i++){s=makeDish(s);assert.equal(s.phase,"REACTION");s=move(s,"DISMISS_REACTION");}
 assert.equal(s.phase,"RESULT");assert.equal(s.dailyLedger.providedCount,8);
 assert.equal(s.dailyLedger.salesYen,7840);assert.equal(s.dailyLedger.ingredientConsumedYen,3440);
 assert.equal(s.dailyLedger.overheadYen,2200);assert.equal(profit(s.dailyLedger),2200);
 assert.equal(s.cashYen,35640);for(const x of I)assert.equal(s.inventory[x],2);
});
test("score correction and thresholds",()=>{
 assert.deepEqual([grade(80,{sweetness:50,richness:60,acidity:40},"regular",cfg).score,grade(84.5,{sweetness:0,richness:10,acidity:90},"regular",cfg).rank],[95,"S"]);
 assert.equal(grade(20,{sweetness:100,richness:100,acidity:100},"regular",cfg).score>=0,true);
});
test("replayed command ID does not double-charge",()=>{
 let s=move(createGame(cfg),"OPEN_SHOP"),command={type:"ACCEPT_ORDER",payload:{orderId:s.orders[0].id},targetDay:1,id:"once"};
 let a=dispatch(s,command,cfg);assert.equal(a.ok,true);
 let again=dispatch(a.state,command,cfg);assert.equal(again.ok,false);
 assert.equal(a.state.dailyLedger.ingredientConsumedYen,430);assert.deepEqual(again.state,a.state);
});
test("Day1 next-day fryer unlock and career rollover",()=>{
 let s=move(createGame(cfg),"OPEN_SHOP");
 for(let i=0;i<8;i++){s=makeDish(s);s=move(s,"DISMISS_REACTION");}
 s=move(s,"GO_UPGRADE");
 rejected(s,"BUY_UPGRADE",{id:"chairs"});
 s=move(s,"BUY_UPGRADE",{id:"fryer"});assert.equal(s.cashYen,27640);
 assert.equal(cashDelta(s.dailyLedger),s.cashYen-30000);
 s=move(s,"NEXT_DAY");
 assert.equal(s.day,2);assert.equal(s.careerLedger.salesYen,7840);
 assert.equal(s.careerLedger.upgradePurchasesYen,8000);
 assert.equal(s.dailyLedger.salesYen,0);assert.equal(s.orders.length,0);
 assert.equal(s.phase,"MORNING");assert.ok(s.unlockedUpgradeIds.includes("fryer"));
});
test("aid fills only deficient ingredient and only once",()=>{
 let s=createGame(cfg);s.day=2;s.inventory.beef=0;s.cashYen=0;
 s=move(s,"AID");assert.equal(s.inventory.beef,4);assert.equal(s.inventory.rice,10);
 rejected(s,"AID");
});
test("normal-day arrival schedule and pause clock",()=>{
 let s=createGame(cfg);s.day=2;s.openingRemainingSeconds=600;
 s=move(s,"OPEN_SHOP");assert.equal(s.arrivalSeconds.length,11);
 s=clock(s,21);assert.equal(s.orders.length,1);
 s=move(s,"PAUSE");const prev=s.businessElapsedSeconds;
 s=clock(s,10);assert.equal(s.businessElapsedSeconds,prev);
 s=move(s,"RESUME");s=clock(s,10);assert.ok(s.businessElapsedSeconds>prev);
});
test("reject stale-day commands",()=>{
 let s=createGame(cfg),r=dispatch(s,{type:"BUY_INGREDIENT",payload:{ingredient:"beef",qty:1},id:"old",targetDay:0},cfg);
 assert.equal(r.ok,false);assert.deepEqual(r.state,s);
});
