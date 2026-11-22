import { createGame, dispatch, profit, cashDelta, I, P, K } from "./domain.mjs";
const $=sel=>document.querySelector(sel);
const app=$("#app"), yen=n=>Number(n||0).toLocaleString("ja-JP")+"円";
const icons={beef:"🥩",rice:"🍚",coating:"🍞",sauce:"🥣",cabbage:"🥬"};
const labels={beef:"牛肉",rice:"ご飯",coating:"衣",sauce:"たれ",cabbage:"キャベツ",regular:"近所の常連",student:"学生",worker:"会社員",tourist:"観光客"};
const stageNames=["肉を平たく","衣を付ける","カツを揚げる","たれを選ぶ","キャベツを茹でる","盛り付け"];
const ranks={SSS:"最高の一皿！",S:"とびきりおいしい！",A:"おいしい！",B:"まずまず",C:"もうひと工夫",F:"また挑戦しよう"};
let config=null,game=null,screen="TITLE",toast="",settings={bgm:40,se:60,reduceMotion:false},draftId="custom1",draft={sweetness:50,richness:60,acidity:40};
let saveDirty=false,savedGameExists=false,saveChain=Promise.resolve(),lastUiTick=0,accumulated=0,lastSaveAt=0,counter=0,dirtyVersion=0,revisionCounter=0;
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function btn(label,act,props="",data=""){return '<button '+props+' data-act="'+act+'" '+data+'>'+label+'</button>';}
function meta(){return game?'<header class="statusbar"><div class="brand-small">🍽️ かつめし繁盛記</div><span>Day '+game.day+'</span><span>💰 '+yen(game.cashYen)+'</span><span>⭐ 評判 '+game.reputation+'</span><span>🕒 '+(game.day===1?'練習営業':Math.ceil(game.openingRemainingSeconds??600)+'秒')+'</span>'+btn("☰ メニュー","pause",'class="subtle"')+'</header>':"";}
function shell(title,content,hint=""){return '<div class="game">'+meta()+'<main class="content"><h1>'+title+'</h1>'+content+'</main><footer class="bottomline"><span>'+hint+'</span><span>試作版 v0.1 — 仮アセットで操作確認中</span></footer></div>';}
function notify(msg){toast=msg;render();}
function resetDraft(){draftId="custom1";draft={sweetness:50,richness:60,acidity:40};}
function titlePage(){return '<main class="title-screen"><section class="title-art"><div class="badge-title">兵庫・加古川に着想を得た創作ゲーム</div><div class="avatar-large">🍽️</div><div class="food-art">🍚 <span>🥩</span> 🥬</div><p class="note">店主キャラクター・料理の正式ゲーム素材は制作中</p></section><section class="title-menu"><p class="kicker">料理×お店づくり シミュレーション</p><h1>かつめし繁盛記</h1><h2>～加古川の一皿～</h2><p>カツを揚げて、秘伝のたれを工夫して、お客さんを笑顔に。</p><div class="menu-buttons">'+btn("はじめから","new",'class="primary"')+btn("つづきから","continue",savedGameExists?'':'disabled')+btn("遊び方","help",'class="secondary"')+'</div><p class="note">新しい服装の銀髪店主は、正式な立ち絵素材を反映する予定です。</p></section></main>';}
function morning(){
const inv=I.map(k=>'<div class="inventory-row"><span>'+icons[k]+' '+labels[k]+'</span><strong>'+game.inventory[k]+' 食分</strong><span>'+[1,5,10].map(q=>btn('+'+q,"buy",game.cashYen<config.ingredientCostsYen[k]*q||game.inventory[k]+q>99?'disabled class="tiny"':'class="tiny"', 'data-ingredient="'+k+'" data-qty="'+q+'"')).join('')+'</span></div>').join("");
const sauces=game.sauces.map(s=>'<div class="preset">'+escapeHTML(s.id)+' <small>甘'+s.taste.sweetness+' / コク'+s.taste.richness+' / 酸'+s.taste.acidity+'</small></div>').join("");
const sliders=["sweetness","richness","acidity"].map((k,i)=>'<label class="range-label">'+["甘さ","コク","酸味"][i]+' <output id="o-'+k+'">'+draft[k]+'</output><input type="range" min="0" max="100" step="10" data-range="'+k+'" value="'+draft[k]+'"></label>').join("");
const missing=I.filter(k=>game.inventory[k]===0);
const need=missing.reduce((v,k)=>v+config.ingredientCostsYen[k],0);
return shell("🌅 朝の仕込み",'<div class="twocol"><section class="panel"><h2>食材の仕入れ</h2><p>一皿につき5種類を各1食分使用します。</p>'+inv+'<div class="hint">作れる数: <strong>'+Math.min(...I.map(k=>game.inventory[k]))+' 食</strong>　仕入れは朝だけ。</div>'+(missing.length&&game.cashYen<need&&game.aidGrantedDay!==game.day?btn("🍀 立て直し支援（不足品を4食分まで）","aid",'class="secondary"'):"")+'</section><section class="panel"><h2>🍯 たれの研究</h2><p>基本たれは固定。カスタム2枠を保存できます。</p>'+sauces+'<label>保存先 <select id="sauce-slot"><option value="custom1" '+(draftId==="custom1"?"selected":"")+'>カスタム1</option><option value="custom2" '+(draftId==="custom2"?"selected":"")+'>カスタム2</option></select></label>'+sliders+btn("配合を保存","save-sauce",'class="secondary"')+'<div class="separator"></div><h3>本日の来客予想</h3><p class="big-number">'+(game.day===1?'8人':Math.min(14,10+Math.floor(game.reputation/25))+'人')+'</p><p>初日はチュートリアル。通常日は来客列の上限3件です。</p>'+btn("開店する！","open",'class="primary wide"')+'</section></div>',"今日もおいしい一皿を届けよう！");
}
function shop(){
const q=game.orders.filter(o=>o.state==="queued");
return shell("🏠 お店の営業",'<div class="twocol"><section class="panel scene"><div class="scene-top">木のぬくもりのある小さな食堂</div><div class="scene-icons"><span>🪟</span><span>🪑</span><span>🍚</span><span>🪑</span></div><div class="scene-person">👩🏻‍🍳 <span>店主（仮立ち絵）</span></div><div class="hint">提供済み '+game.dailyLedger.providedCount+'食　/　待機中 '+q.length+'人　/　見込み客の逸失 '+game.dailyLedger.skippedCandidates+'人</div></section><section class="panel"><h2>📋 注文待ち（最大3人）</h2>'+(q.length?q.map(o=>'<div class="order-card"><strong>'+labels[o.customerId]+'</strong><span>ビーフかつめし　'+yen(o.priceYenSnapshot)+'</span><div>好み：'+cTaste(o.customerId)+'</div><div class="patience">'+(game.day===1?'ゆっくりお待ちします':"残り "+Math.ceil(o.queuedWaitRemainingSeconds)+"秒")+'</div>'+btn("調理を始める","accept",I.some(k=>game.inventory[k]<1)?'disabled class="primary"':'class="primary"','data-order="'+o.id+'"')+'</div>').join(''):'<div class="empty">☕ ただいま来客を待っています</div>')+'<div class="hint">'+(game.openingRemainingSeconds===0?'新規来店終了。残りの注文を対応中です。':'お客様の好みを見ながら注文を選ぼう。')+'</div></section></div>',"調理中は他の待機客の時間も進みます。");
}
function cTaste(id){const t=config.customer[id].taste;return '甘'+t[0]+'・コク'+t[1]+'・酸'+t[2];}
function cooking(){
const ses=game.cookingSession,n=ses.stageIndex,i=ses.stageInput,done=ses.completedScores[K[n]]!==undefined,where=game.orders.find(o=>o.id===ses.orderId);
let body="";
if(done&&n===5)body='<div class="success">🎉 かつめしが完成！</div>'+btn("できあがりを提供！","serve",'class="primary wide"');
else if(n===0)body='<p>お肉の上を左→中央→右の順に3回クリック。目標位置に近いほど高得点。</p><div class="meat-zone" data-act="strike" role="button" tabindex="0" aria-label="肉をクリック"><span>🥩</span><div class="meat-guide">┃　┃　┃</div></div><p>現在 '+i.taps+'/3回。厚みの誤差 '+Math.round(i.thicknessError01*100)+'%</p>';
else if(n===1)body='<p>3区画に衣を付けます。各区画をクリックして塗る（10回で満点）。「まとめ塗り」も使用可能。</p><div class="zones">'+[0,1,2].map(z=>'<div class="zone"><div>🍞 区画'+(z+1)+'</div><div class="meter"><span style="width:'+(i.coatCoverage01[z]*100)+'%"></span></div>'+btn("1セル塗る","coat",'class="tiny"','data-zone="'+z+'"')+btn("まとめ塗り","coat-full",'class="tiny"','data-zone="'+z+'"')+'</div>').join('')+'</div>';
else if(n===2||n===4){const target=n===2?10:4;body='<p>目標は'+target+'秒。開始ボタンを押して、タイミングを見て止めましょう。</p><div class="timer-display">'+i.elapsedSeconds.toFixed(1)+' <small>秒</small></div><div class="timer-hint">🎯 '+target+'秒が最高点</div>'+(i.timerStarted?btn(n===2?"引き上げる！":"取り出す！","stop-timer",'class="primary"'):!i.timerStopped?btn(n===2?"揚げ始める":"茹で始める","start-timer",'class="primary"'):'<p class="success">停止しました。次へ進めます。</p>');}
else if(n===3)body='<p>お客さんの好みに合う、仕込み済みのたれを選びます。</p><div class="sauce-options">'+game.sauces.map(x=>btn((ses.selectedSauceId===x.id?'✓ ':'')+x.id+'　甘'+x.taste.sweetness+'/コク'+x.taste.richness+'/酸'+x.taste.acidity,"choose-sauce",ses.selectedSauceId===x.id?'class="selected"':'class="secondary"','data-id="'+x.id+'"')).join('')+'</div>';
else if(n===5)body='<p>現在の部品：<strong>'+["🍚 ご飯","🥩 カツ","🥣 たれ","🥬 キャベツ"][i.placedComponentIds.length]+'</strong>。正しい置き場を選ぼう。</p><div class="slots">'+P.map((part,idx)=>btn(['🍚 ご飯','🥩 カツ','🥣 たれ','🥬 キャベツ'][idx]+(i.placedSlotIds.includes(part)?' ✓':''),"place",i.placedSlotIds.includes(part)?'disabled class="slot"':'class="slot"','data-slot="'+part+'"')).join('')+'</div>';
return shell("🍳 調理中："+stageNames[n],'<div class="cook-frame"><section class="panel"><div class="steps">'+K.map((k,x)=>'<span class="'+(x===n?'now':ses.completedScores[k]!==undefined?'complete':'')+'">'+(x+1)+'. '+stageNames[x]+'</span>').join('')+'</div><div class="cooking-main"><div class="dish-placeholder">🍚🥩🥬</div><div class="working">'+body+'</div></div><div class="action-row">'+(done&&n===5?'':btn("次の工程へ","complete",'class="primary"'))+btn("この工程をやり直す","retry",'class="secondary"')+btn("調理を破棄","cancel",'class="danger"')+'</div></section><aside class="panel"><h2>注文メモ</h2><p>'+labels[where.customerId]+'</p><p>好み：'+cTaste(where.customerId)+'</p><p>やり直し：'+(ses.unlimitedRetry?'無制限':ses.retriesRemaining+'回')+'</p><h3>工程得点</h3>'+K.map(k=>'<div class="scoreline"><span>'+k+'</span><strong>'+(ses.completedScores[k]===undefined?'—':ses.completedScores[k].toFixed(1))+'</strong></div>').join('')+'</aside></div>',"時計は調理中も進行します（初日は時間無制限）。");
}
function reaction(){
const o=game.orders.find(x=>x.id===game.lastServedOrderId);
const rank=o?.rank||"B";
return shell("✨ おいしさの評価",'<section class="panel reaction"><div class="reaction-person"><div class="reaction-emoji">'+(rank==="SSS"?"🤩":rank==="S"?"😍":rank==="A"?"😋":rank==="B"?"🙂":rank==="C"?"😕":"😔")+'</div><h2>'+labels[o.customerId]+'</h2><p>「'+ranks[rank]+'」</p></div><div class="reaction-food"><div class="dish-big">🍚🥩🥬</div><div class="rank rank-'+rank+'">'+rank+'</div><div class="big-number">'+o.cookingScore+' 点</div><p>売上 '+yen(o.priceYenSnapshot)+'　/　評判 '+(config.reputationDelta[rank]>0?'+':'')+config.reputationDelta[rank]+'</p>'+btn("次のお客さんへ","dismiss",'class="primary"')+'</div></section>',"お客様の評価は提供時に確定済みです。");
}
function result(){
const l=game.dailyLedger,lines=[["提供数",l.providedCount+"食"],["売上",yen(l.salesYen)],["材料原価（廃棄含む）","−"+yen(l.ingredientConsumedYen)],["うち廃棄（再控除なし）",yen(l.wasteYen)],["固定費","−"+yen(l.overheadYen)],["営業利益",yen(profit(l))],["仕入れ支払",yen(l.purchasesYen)],["現金増減（設備投資前後）",yen(cashDelta(l))],["現在現金",yen(game.cashYen)],["注文の期限切れ",l.expiredCount+"件"],["満員で入れなかった客",l.skippedCandidates+"人"]];
return shell("🌙 Day "+game.day+" 営業結果",'<section class="panel result"><div class="result-summary"><strong>🍽️ お疲れさまでした！</strong><span>今日の営業利益</span><div class="big-number">'+yen(profit(l))+'</div></div><div class="results">'+lines.map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div>'+(game.day===7?'<div class="milestone">🎊 7日間の営業お疲れさま！　累計提供数 '+(game.careerLedger.providedCount+l.providedCount)+'食</div>':'')+btn("設備を確認する","upgrades",'class="primary wide"')+'</section>',"営業利益と現金増減は異なります。");
}
function upgrades(){
return shell("🛠️ お店の設備",'<section class="panel"><p>買った設備は翌営業日から効果を発揮します。</p><div class="upgrade-grid">'+config.upgrades.map(u=>{const owned=game.unlockedUpgradeIds.includes(u.id),available=game.day+1>=u.unlockDay;return '<article class="upgrade"><div class="upgrade-emoji">'+(u.id==="fryer"?"🍳":"🪑")+'</div><h2>'+(u.id==="fryer"?"新しいフライヤー":"快適な椅子")+'</h2><p>'+(u.id==="fryer"?"揚げ時間の許容幅が+1秒":"待ち時間の許容が10%増える")+'</p><p>効果開始：Day '+u.unlockDay+'</p><strong>'+yen(u.costYen)+'</strong>'+btn(owned?"購入済み":!available?"未解放":"購入する","buy-upgrade",owned||!available||game.cashYen<u.costYen?'disabled':'class="primary"','data-id="'+u.id+'"')+'</article>';}).join('')+'</div>'+btn("翌日の仕込みへ","next-day",'class="primary wide"')+'</section>',"Day "+(game.day+1)+" に向けて準備しましょう。");
}
function help(){return '<main class="help-page panel"><h1>遊び方</h1><p>朝に食材とたれを準備し、注文を受けたら6つの工程でかつめしを完成させましょう。</p><ol><li>肉をたたく</li><li>衣を付ける</li><li>揚げ時間を止める</li><li>たれを選ぶ</li><li>茹で時間を止める</li><li>ご飯・カツ・たれ・キャベツを盛る</li></ol><p>完成すると客の好みでランクSSS〜Fが決まり、売上と評判が増減します。日末の設備購入も楽しんでください。</p>'+btn("タイトルへ戻る","back-title",'class="primary"')+'</main>';}
function pauseDialog(){return '<div class="overlay"><section class="modal"><h2>⏸ 一時停止</h2><p>ゲーム内の時計と工程のタイマーは停止しています。</p>'+btn("再開","resume",'class="primary"')+btn("保存してタイトルへ","save-quit",'class="secondary"')+'</section></div>';}
function render(){
let html=screen==="TITLE"?titlePage():screen==="HELP"?help():game?(game.phase==="MORNING"?morning():game.phase==="OPEN"?shop():game.phase==="COOK"?cooking():game.phase==="REACTION"?reaction():game.phase==="RESULT"?result():upgrades()):titlePage();
if(game?.overlay&&screen==="GAME")html+=pauseDialog();
if(toast)html+='<div class="toast" role="status">'+escapeHTML(toast)+'</div>';
app.innerHTML=html;
}
function dbOpen(){return new Promise((resolve,reject)=>{const r=indexedDB.open("katsumeshi_game_v1",1);r.onupgradeneeded=()=>r.result.createObjectStore("saves");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function dbRead(){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction("saves","readonly"),store=tx.objectStore("saves"),main=store.get("main"),backup=store.get("backup");tx.oncomplete=()=>{const valid=x=>x&&x.schemaVersion===1&&x.phase&&x.dailyLedger&&x.careerLedger;resolve(valid(main.result)?main.result:valid(backup.result)?backup.result:null);};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("load aborted"));});}
async function dbWrite(snapshot){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction("saves","readwrite"),s=tx.objectStore("saves"),req=s.get("main");req.onsuccess=()=>{if(req.result)s.put(req.result,"backup");s.put(snapshot,"main");};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error("save aborted"));tx.onerror=()=>reject(tx.error||new Error("save failed"));});}
async function save(){if(!game)return;const version=dirtyVersion,snapshot=JSON.parse(JSON.stringify(game));snapshot.revision=++revisionCounter;snapshot.savedAtIso=new Date().toISOString();const pending=saveChain.catch(()=>{}).then(()=>dbWrite(snapshot));saveChain=pending;try{await pending;if(game&&game.day===snapshot.day&&game.revision<snapshot.revision)game.revision=snapshot.revision;if(dirtyVersion===version)saveDirty=false;savedGameExists=true;lastSaveAt=Date.now();}catch(e){saveDirty=true;toast="⚠️ セーブに失敗しました。ブラウザの保存設定をご確認ください。";render();throw e;}}
function run(type,payload={}){if(!game)return false;const r=dispatch(game,{type,payload,targetDay:game.day,id:"cmd-"+Date.now()+"-"+(++counter)},config);if(!r.ok){notify(r.error);return false;}game=r.state;toast="";render();saveDirty=true;dirtyVersion++;if(!["PAUSE","RESUME","STRIKE","COAT","PLACE","START_TIMER","STOP_TIMER","SELECT_SAUCE","TICK"].includes(type))save().catch(()=>{});return true;}
function loadDraft(){const s=game?.sauces.find(s=>s.id===draftId);draft=s?{...s.taste}:{sweetness:50,richness:60,acidity:40};}
app.addEventListener("input",e=>{const name=e.target.dataset.range;if(name){draft[name]=Number(e.target.value);const output=$("#o-"+name);if(output)output.textContent=draft[name];}});
app.addEventListener("change",e=>{if(e.target.id==="sauce-slot"){draftId=e.target.value;loadDraft();render();}});
app.addEventListener("click",async e=>{
const el=e.target.closest("[data-act]");if(!el)return;const act=el.dataset.act;
if(act==="strike"){const r=el.getBoundingClientRect();run("STRIKE",{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))});return;}
if(act==="new"){if(savedGameExists&&!confirm("保存済みのゲームを上書きします。よろしいですか？"))return;game=createGame(config);revisionCounter=0;dirtyVersion++;screen="GAME";resetDraft();render();await save().catch(()=>{});return;}
if(act==="continue"){try{game=await dbRead();if(!game)throw Error("セーブがありません");if(game.schemaVersion!==1||!game.phase||!game.dailyLedger)throw Error("保存形式を読み取れません");game.overlay={kind:"PAUSE"};revisionCounter=game.revision||0;dirtyVersion++;screen="GAME";render();}catch(e){notify("ロード失敗："+e.message);}return;}
if(act==="help"){screen="HELP";render();return;}
if(act==="back-title"){screen="TITLE";render();return;}
if(act==="pause"){run("PAUSE");return;}
if(act==="resume"){run("RESUME");return;}
if(act==="save-quit"){try{await save();screen="TITLE";game=null;render();}catch{}return;}
if(act==="buy"){run("BUY_INGREDIENT",{ingredient:el.dataset.ingredient,qty:Number(el.dataset.qty)});return;}
if(act==="aid"){run("AID");return;}
if(act==="save-sauce"){run("SAVE_SAUCE",{id:draftId,taste:{...draft}});return;}
if(act==="open"){run("OPEN_SHOP");return;}
if(act==="accept"){run("ACCEPT_ORDER",{orderId:el.dataset.order});return;}
if(act==="coat"||act==="coat-full"){run("COAT",{zone:Number(el.dataset.zone),full:act==="coat-full"});return;}
if(act==="start-timer"){run("START_TIMER");return;}
if(act==="stop-timer"){run("STOP_TIMER");return;}
if(act==="choose-sauce"){run("SELECT_SAUCE",{id:el.dataset.id});return;}
if(act==="place"){run("PLACE",{slot:el.dataset.slot});return;}
if(act==="complete"){run("COMPLETE_STAGE");return;}
if(act==="retry"){run("RETRY");return;}
if(act==="cancel"){if(confirm("調理を破棄しますか？ 食材は戻りません。"))run("CANCEL_ORDER");return;}
if(act==="serve"){run("SERVE");return;}
if(act==="dismiss"){run("DISMISS_REACTION");return;}
if(act==="upgrades"){run("GO_UPGRADE");return;}
if(act==="buy-upgrade"){run("BUY_UPGRADE",{id:el.dataset.id});return;}
if(act==="next-day"){if(run("NEXT_DAY")){resetDraft();}return;}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&screen==="GAME"&&game){e.preventDefault();run(game.overlay?"RESUME":"PAUSE");}if(e.key==="r"&&game?.phase==="COOK"&&!game.overlay)run("RETRY");if((e.key==="Enter"||e.key===" ")&&document.activeElement?.classList.contains("meat-zone")){e.preventDefault();const t=config.cooking.p1TargetsX[game.cookingSession.stageInput.taps];if(t!==undefined)run("STRIKE",{x:t});}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&screen==="GAME"&&game&&!game.overlay){run("PAUSE");save().catch(()=>{});}});
setInterval(()=>{const now=Date.now();if(!lastUiTick){lastUiTick=now;return;}let delta=(now-lastUiTick)/1000;lastUiTick=now;if(screen!=="GAME"||!game||game.overlay)return;if(delta>0.3){run("PAUSE");notify("画面復帰後は再開ボタンを押してください");return;}accumulated+=delta;while(accumulated>=0.1){const r=dispatch(game,{type:"TICK",payload:{seconds:0.1}},config);if(r.ok&&r.changed){game=r.state;saveDirty=true;dirtyVersion++;}accumulated-=0.1;}if(!document.hidden)render();if(saveDirty&&now-lastSaveAt>2000&&game)save().catch(()=>{});},100);
async function boot(){try{const r=await fetch("./spec/mvp_config.json");if(!r.ok)throw Error("設定を読み込めません");config=await r.json();try{const stored=await dbRead();savedGameExists=!!stored;}catch{savedGameExists=false;toast="セーブ機能が使えない可能性があります";}render();}catch(e){app.innerHTML='<main class="help-page"><h1>読み込みエラー</h1><p>'+escapeHTML(e.message)+'</p><p>ローカルHTTPサーバーで実行してください（npm run dev）。</p></main>';}}
boot();
