import { createGame, dispatch, profit, cashDelta, I, P, K } from "./domain.mjs";
const $=sel=>document.querySelector(sel);
const app=$("#app"), yen=n=>Number(n||0).toLocaleString("ja-JP")+"円";
const icons={beef:"🥩",rice:"🍚",coating:"🍞",sauce:"🥣",cabbage:"🥬"};
const labels={beef:"牛肉",rice:"ご飯",coating:"衣",sauce:"たれ",cabbage:"キャベツ",regular:"近所の常連",student:"学生",worker:"会社員",tourist:"観光客"};
const stageNames=["肉を平たく","衣を付ける","カツを揚げる","たれを選ぶ","キャベツを茹でる","盛り付け"];
const ART=new URL("./public/assets/game/",location.href).href; // absolute: url() in CSS vars resolves against styles.css otherwise
const art={bg:k=>ART+"backgrounds/"+k+".webp",owner:e=>ART+"characters/owner/shop/"+e+".webp",ownerFull:o=>ART+"characters/owner/"+o+"/full.webp",customer:(c,r)=>ART+"characters/"+c+"/"+String(r).toLowerCase()+".webp"};
const pic=(src,cls,alt="")=>'<img class="'+cls+'" src="'+src+'" alt="'+alt+'" draggable="false" decoding="sync">';
const face=(src,cls,alt="")=>'<span class="face '+cls+'" role="img" aria-label="'+alt+'" style="background-image:url('+src+')"></span>';
const ownerFor=r=>({SSS:"happy",S:"happy",A:"happy",B:"normal",C:"thinking",F:"sad"})[r]||"normal";
function preloadArt(){const list=[...["title","morning","shop","kitchen","result"].map(art.bg),...["normal","encourage","happy","sad","surprised","thinking"].map(art.owner),art.ownerFull("shop"),art.ownerFull("casual")];for(const c of ["regular","student","worker","tourist"])for(const r of ["SSS","S","A","B","C","F"])list.push(art.customer(c,r));return Promise.all(list.map(src=>{const im=new Image();im.src=src;return im.decode().catch(()=>{});}));}
const ranks={SSS:"最高の一皿！",S:"とびきりおいしい！",A:"おいしい！",B:"まずまず",C:"もうひと工夫",F:"また挑戦しよう"};
let config=null,game=null,screen="TITLE",toast="",settings={bgm:40,se:60,reduceMotion:false},draftId="custom1",draft={sweetness:50,richness:60,acidity:40};
let saveDirty=false,savedGameExists=false,saveChain=Promise.resolve(),lastUiTick=0,accumulated=0,lastSaveAt=0,counter=0,dirtyVersion=0,revisionCounter=0;
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function btn(label,act,props="",data=""){return '<button '+props+' data-act="'+act+'" '+data+'>'+label+'</button>';}
const stars=rep=>{const n=Math.max(0,Math.min(5,Math.round(rep/20)));return '<span class="stars" aria-label="評判 '+rep+'">'+'★'.repeat(n)+'<span class="off">'+'★'.repeat(5-n)+'</span></span>';};
const screenIcons={MORNING:"☀️",OPEN:"🏮",COOK:"🍳",REACTION:"✨",RESULT:"🌙",UPGRADE:"🛠️"};
const voice={SSS:"衣はサクサク、たれも絶妙！ これは看板メニューですね！",S:"とってもおいしい！ 大満足です。",A:"おいしかったです。ごちそうさま！",B:"うん、ふつうにおいしいね。",C:"うーん、もうひと工夫ほしいかも。",F:"今日はちょっと残念…。また来るね。"};
const ownerLines=["お肉は薄く平たく。左・中央・右の順にたたこう！","衣はムラなく、全体にしっかり付けよう！","ここが勝負！ きれいなきつね色に仕上げよう！","お客さんの好みに合うたれを選んでね。","キャベツはさっと茹でて、シャキッと！","ご飯→カツ→たれ→キャベツの順に盛り付けよう！"];
const partLabels={rice:"🍚 ご飯",cutlet:"🥩 カツ",sauce:"🥣 たれ",cabbage:"🥬 キャベツ"};
function plate(parts=["rice","cutlet","sauce","cabbage"],cls=""){return '<div class="plate '+cls+'" aria-hidden="true">'+["rice","cutlet","sauce","cabbage"].map(p=>'<span class="pl-'+p+(parts.includes(p)?' on':'')+'">'+partLabels[p].split(" ")[0]+'</span>').join('')+'</div>';}
function tasteBars(t,pref){return '<div class="taste">'+["甘さ","コク","酸味"].map((n,k)=>'<div class="taste-row"><span>'+n+'</span><div class="taste-bar"><i style="width:'+t[k]+'%"></i>'+(pref?'<b style="left:'+pref[k]+'%" title="お客さんの好み"></b>':'')+'</div><em>'+t[k]+'</em></div>').join('')+'</div>';}
function hud(){const g=game;return '<header class="hud"><div class="logo-badge"><strong>かつめし繁盛記</strong><small>〜加古川の一皿〜</small></div><div class="plaque">'+screenIcons[g.phase]+' '+({MORNING:"朝の準備",OPEN:"店舗営業",COOK:"調理",REACTION:"試食・評価",RESULT:"本日の営業結果",UPGRADE:"お店の設備"})[g.phase]+'</div><div class="hud-chips"><span class="chip">📅 Day '+g.day+'</span>'+(g.phase==="OPEN"||g.phase==="COOK"?'<span class="chip">🕒 '+(g.day===1?'練習営業':(()=>{const t=Math.ceil(g.openingRemainingSeconds??600);return 'のこり '+Math.floor(t/60)+':'+String(t%60).padStart(2,"0");})())+'</span>':'')+'<span class="chip">💰 資金 <strong>'+yen(g.cashYen)+'</strong></span><span class="chip">評判 '+stars(g.reputation)+' <small>'+g.reputation+'</small></span>'+btn("☰ メニュー","pause",'class="chip-btn"')+'</div></header>';}
function shell(content,{bg="shop",owner=null,ownerLine="",hint="",cls=""}={}){return '<div class="game" style="--bg:url('+art.bg(bg)+')">'+hud()+'<main class="stage '+cls+(owner?' with-owner':'')+'">'+(owner?pic(art.owner(owner),"owner-stand","店主")+(ownerLine?'<div class="owner-bubble">'+ownerLine+'</div>':''):'')+content+'</main>'+(hint?'<footer class="hintbar">'+hint+'</footer>':'')+'</div>';}
function card(title,body,cls=""){return '<section class="card '+cls+'">'+(title?'<h2 class="card-title">'+title+'</h2>':'')+'<div class="card-body">'+body+'</div></section>';}
function titlePage(){return '<main class="title-screen" style="--bg:url('+art.bg("title")+')">'+pic(art.ownerFull("casual"),"title-owner","店主")+'<section class="title-menu"><div class="title-logo"><span class="kicker">料理 × お店づくり シミュレーション</span><h1>かつめし繁盛記</h1><div class="ribbon">〜加古川の一皿〜</div></div><div class="menu-buttons">'+btn("▶ はじめから","new",'class="primary"')+btn("📂 つづきから","continue",savedGameExists?'class="secondary"':'class="secondary" disabled')+btn("📖 遊び方","help",'class="secondary"')+'</div><p class="title-note">兵庫・加古川に着想を得た創作ゲーム</p></section></main>';}
function morning(){
const inv=I.map(k=>'<div class="inv-row"><span class="inv-icon">'+icons[k]+'</span><span class="inv-name">'+labels[k]+'</span><strong>'+game.inventory[k]+'<small> 食分</small></strong><span class="inv-buy">'+[1,5,10].map(q=>btn('+'+q,"buy",game.cashYen<config.ingredientCostsYen[k]*q||game.inventory[k]+q>99?'disabled class="tiny"':'class="tiny"','data-ingredient="'+k+'" data-qty="'+q+'"')).join('')+'</span></div>').join("");
const missing=I.filter(k=>game.inventory[k]===0),need=missing.reduce((v,k)=>v+config.ingredientCostsYen[k],0);
const presets='<div class="preset-chips">'+game.sauces.map(s=>'<span class="preset-chip'+(s.id===draftId?' active':'')+'">'+escapeHTML(s.id==="basic"?"基本":s.id==="custom1"?"カスタム1":s.id==="custom2"?"カスタム2":s.id)+'<small>甘'+s.taste.sweetness+'・コク'+s.taste.richness+'・酸'+s.taste.acidity+'</small></span>').join('')+'</div>';
const sliders=["sweetness","richness","acidity"].map((k,i)=>'<label class="slider-row"><span>'+["甘さ","コク","酸味"][i]+'</span><input type="range" min="0" max="100" step="10" data-range="'+k+'" value="'+draft[k]+'"><output id="o-'+k+'">'+draft[k]+'</output></label>').join("");
const w=config.normalDay.arrivalWeights,tot=Object.values(w).reduce((a,b)=>a+b,0);
const mix=Object.keys(w).map(c=>'<div class="mix-row">'+face(art.customer(c,"B"),"mix-face",labels[c])+'<span>'+labels[c]+'</span><em>'+(game.day===1?'2人':Math.round(w[c]/tot*100)+'%')+'</em></div>').join('');
const body='<div class="cols-3">'+card("📦 在庫（仕入れ）",'<p class="sub">一皿につき5種類を各1食分使います。仕入れは朝だけ。</p>'+inv+'<div class="inv-foot">作れる数 <strong>'+Math.min(...I.map(k=>game.inventory[k]))+' 食</strong></div>'+(missing.length&&game.cashYen<need&&game.aidGrantedDay!==game.day?btn("🍀 立て直し支援（不足品を4食分まで）","aid",'class="secondary wide"'):""))
+card("🥣 たれ研究（デミグラス）",sliders+'<label class="slot-row">保存先 <select id="sauce-slot"><option value="custom1" '+(draftId==="custom1"?"selected":"")+'>カスタム1</option><option value="custom2" '+(draftId==="custom2"?"selected":"")+'>カスタム2</option></select>'+btn("配合を保存","save-sauce",'class="secondary"')+'</label><h3 class="mini-title">プリセット</h3>'+presets)
+card("👥 本日の来客予想",'<div class="forecast"><span>想定来客数</span><strong>'+(game.day===1?'8人':Math.min(14,10+Math.floor(game.reputation/25))+'人')+'</strong></div><h3 class="mini-title">客層の傾向</h3>'+mix+'<p class="sub">'+(game.day===1?'初日は練習営業。時間制限はありません。':'注文は同時に3件まで受けられます。')+'</p>')+'</div><div class="cta-row">'+btn("🏮 開店する","open",'class="primary big-cta"')+'</div>';
return shell(body,{bg:"morning",owner:game.day===1?"encourage":"normal",ownerLine:game.day===1?"いよいよ開店初日！ 食材とたれを確認しよう。":"今日もおいしい一皿、届けよう！",hint:"今日もおいしい一皿を届けよう！"});
}
function shop(){
const q=game.orders.filter(o=>o.state==="queued");
const scene='<section class="shop-scene">'+pic(art.owner(q.length?"happy":"normal"),"shop-owner","店主")+'<div class="shop-guests">'+q.map(o=>pic(art.customer(o.customerId,"B"),"shop-guest",labels[o.customerId])).join('')+'</div><div class="shop-stats"><span>🍽️ 提供済み <strong>'+game.dailyLedger.providedCount+'</strong>食</span><span>⏳ 待機中 <strong>'+q.length+'</strong>人</span><span>🚪 満員で帰った客 <strong>'+game.dailyLedger.skippedCandidates+'</strong>人</span></div></section>';
const orders=q.length?q.map((o,n)=>'<article class="order"><span class="order-no">'+(n+1)+'</span>'+face(art.customer(o.customerId,"B"),"order-face",labels[o.customerId])+'<div class="order-main"><strong>'+labels[o.customerId]+'</strong><span>ビーフかつめし ×1　'+yen(o.priceYenSnapshot)+'</span>'+tasteBars(config.customer[o.customerId].taste)+'</div><div class="order-side"><span class="wait">🕒 '+(game.day===1?'ゆっくり':'のこり '+Math.ceil(o.queuedWaitRemainingSeconds)+'秒')+'</span>'+btn("調理へ","accept",I.some(k=>game.inventory[k]<1)?'disabled class="primary"':'class="primary"','data-order="'+o.id+'"')+'</div></article>').join(''):'<div class="empty">☕ ただいま来客を待っています</div>';
const body='<div class="shop-layout">'+scene+card("🧾 注文（最大3件）",orders+'<p class="sub">'+(game.openingRemainingSeconds===0?'新規来店は終了。残りの注文に対応しよう。':'お客さんの好み（甘さ・コク・酸味）を見て注文を選ぼう。')+'</p>',"orders")+'</div>';
return shell(body,{bg:"shop",hint:"調理中も他のお客さんの待ち時間は進みます。"});
}
function cooking(){
const ses=game.cookingSession,n=ses.stageIndex,i=ses.stageInput,done=ses.completedScores[K[n]]!==undefined,where=game.orders.find(o=>o.id===ses.orderId);
const steps='<nav class="steps">'+K.map((k,x)=>'<span class="step '+(x===n?'now':ses.completedScores[k]!==undefined?'done':'')+'"><b>P'+(x+1)+'</b>'+stageNames[x]+'</span>').join('')+'</nav>';
let work="",side="";
if(n===0){work='<div class="board"><div class="meat-zone" data-act="strike" role="button" tabindex="0" aria-label="肉をたたく位置をクリック"><div class="meat" style="--flat:'+(1-i.taps*0.15)+'"></div>'+[25,50,75].map((x,k)=>'<i class="guide'+(k<i.taps?' hit':'')+'" style="left:'+x+'%"></i>').join('')+'</div></div><p class="work-note">左 → 中央 → 右 の順に3回クリック（'+i.taps+'/3）　厚みの誤差 '+Math.round(i.thicknessError01*100)+'%</p>';}
else if(n===1){work='<div class="board"><div class="coat-cutlet">'+[0,1,2].map(z=>'<div class="coat-zone" data-act="coat" data-zone="'+z+'" role="button" tabindex="0" aria-label="区画'+(z+1)+'に衣を付ける" style="--cov:'+i.coatCoverage01[z]+'"><span>'+Math.round(i.coatCoverage01[z]*100)+'%</span></div>').join('')+'</div></div><div class="zone-buttons">'+[0,1,2].map(z=>btn("区画"+(z+1)+" まとめ塗り","coat-full",'class="tiny"','data-zone="'+z+'"')).join('')+'</div><p class="work-note">区画をクリックすると1セルずつ衣が付きます（10回で満点）。</p>';}
else if(n===2||n===4){const target=n===2?config.cooking.p3TargetSeconds:config.cooking.p5TargetSeconds,p=i.elapsedSeconds/target,span=target*1.8;
 const hue=n===2?Math.max(18,48-Math.max(0,p-0.2)*26):110,light=n===2?Math.max(22,78-p*40):Math.max(35,70-p*18);
 work='<div class="pot '+(n===2?'fryer':'boiler')+(i.timerStarted?' active':'')+'"><div class="pot-food" style="background:hsl('+hue+' 70% '+light+'%)"></div><div class="pot-timer">'+i.elapsedSeconds.toFixed(1)+'<small>秒</small></div></div>';
 side='<div class="gauge-card"><h3>'+(n===2?'揚げ':'茹で')+'のタイミング</h3><div class="gauge"><i class="sweet" style="left:'+((target-1)/span*100)+'%;width:'+(2/span*100)+'%"></i><b class="needle" style="left:'+Math.min(100,i.elapsedSeconds/span*100)+'%"></b></div><div class="gauge-meta"><span>🎯 目安</span><strong>'+target+' 秒</strong></div>'+(i.timerStarted?btn(n===2?"引き上げる！":"取り出す！","stop-timer",'class="primary big-cta"'):!i.timerStopped?btn(n===2?"揚げ始める":"茹で始める","start-timer",'class="primary big-cta"'):'<p class="ok">✔ 停止しました</p>')+'</div>';}
else if(n===3){const pref=config.customer[where.customerId].taste;work='<div class="sauce-cards">'+game.sauces.map(x=>'<button data-act="choose-sauce" data-id="'+escapeHTML(x.id)+'" class="sauce-card'+(ses.selectedSauceId===x.id?' selected':'')+'"><strong>'+(ses.selectedSauceId===x.id?'✔ ':'')+escapeHTML(x.id==="basic"?"基本":x.id==="custom1"?"カスタム1":x.id==="custom2"?"カスタム2":x.id)+'</strong>'+tasteBars([x.taste.sweetness,x.taste.richness,x.taste.acidity],pref)+'</button>').join('')+'</div><p class="work-note">▼の印がお客さんの好み。近いたれほど高評価です。</p>';}
else if(n===5){const placed=i.placedComponentIds||[];work=plate(i.placedSlotIds||[],"plate-big")+(done?'':'<p class="work-note">次の部品：<strong>'+(partLabels[config.cooking.p6Parts[placed.length]]||"盛り付け完了")+'</strong>　置き場を選ぼう</p><div class="slots">'+P.map(part=>btn(partLabels[part]+((i.placedSlotIds||[]).includes(part)?' ✓':''),"place",(i.placedSlotIds||[]).includes(part)?'disabled class="slot"':'class="slot"','data-slot="'+part+'"')).join('')+'</div>');}
if(done&&n===5)work+='<div class="finish">🎉 かつめしが完成！'+btn("できあがりを提供！","serve",'class="primary big-cta"')+'</div>';
const order=card("📝 注文情報",'<div class="memo-head">'+face(art.customer(where.customerId,"B"),"memo-face",labels[where.customerId])+'<div><strong>'+labels[where.customerId]+'</strong><span>ビーフかつめし ×1</span></div></div><h3 class="mini-title">好み</h3>'+tasteBars(config.customer[where.customerId].taste)+'<div class="retry">やり直し：'+(ses.unlimitedRetry?'無制限':ses.retriesRemaining+'回')+'</div>',"memo");
const scores=card("📊 工程得点",K.map((k,x)=>'<div class="scoreline"><span>P'+(x+1)+' '+stageNames[x]+'</span><strong>'+(ses.completedScores[k]===undefined?'—':ses.completedScores[k].toFixed(1))+'</strong></div>').join('')+'<div class="action-col">'+(done&&n===5?'':btn("次の工程へ ▶","complete",'class="primary"'))+btn("この工程をやり直す","retry",'class="secondary"')+btn("調理を破棄","cancel",'class="danger"')+'</div>',"scores");
return shell(steps+'<div class="cook-layout">'+order+'<section class="work card"><div class="card-body">'+work+'</div></section><div class="cook-side">'+side+scores+'</div></div>',{bg:"kitchen",owner:"encourage",ownerLine:ownerLines[n],hint:"時計は調理中も進みます（初日は時間無制限）。　R キーでやり直し"});
}
function reaction(){
const o=game.orders.find(x=>x.id===game.lastServedOrderId),rank=o?.rank||"B",d=config.reputationDelta[rank];
const body='<div class="tasting rank-'+rank+'"><div class="taster">'+pic(art.customer(o.customerId,rank),"taster-img",labels[o.customerId]+" "+rank)+'<div class="taster-name">'+labels[o.customerId]+'</div></div><div class="verdict"><div class="emblem"><span class="emblem-ribbon">料理の評価</span>'+(rank==="SSS"?'<span class="crown">👑</span>':'')+'<span class="emblem-rank">'+rank+'</span></div><div class="speech"><strong>「'+ranks[rank]+'」</strong><p>'+voice[rank]+'</p></div><div class="verdict-stats"><span>得点 <strong>'+o.cookingScore+'</strong> 点</span><span>売上 <strong>'+yen(o.priceYenSnapshot)+'</strong></span><span>評判 <strong class="'+(d>0?'up':d<0?'down':'')+'">'+(d>0?'+':'')+d+'</strong></span></div>'+btn("次のお客さんへ ▶","dismiss",'class="primary big-cta"')+'</div>'+pic(art.owner(ownerFor(rank)),"tasting-owner","店主")+'</div>';
return shell(body,{bg:"shop",cls:"tasting-stage",hint:"評価は提供時に確定済みです。"});
}
function result(){
const l=game.dailyLedger,p=profit(l),served=game.orders.filter(o=>o.state==="served");
const repDelta=served.reduce((v,o)=>v+config.reputationDelta[o.rank],0)+l.expiredCount*config.reputationDelta.expired;
const rows=[["🍴","提供数",l.providedCount+"皿"],["🪙","売上",yen(l.salesYen)],["🧺","材料原価（廃棄含む）","−"+yen(l.ingredientConsumedYen)],["🏠","固定費","−"+yen(l.overheadYen)]];
const sub=[["うち廃棄（再控除なし）",yen(l.wasteYen)],["仕入れ支払",yen(l.purchasesYen)],["現金増減（設備投資前後）",yen(cashDelta(l))],["注文の期限切れ",l.expiredCount+"件"],["満員で帰った客",l.skippedCandidates+"人"]];
const ledgerCard=card("",rows.map(([ic,k,v])=>'<div class="ledger-row"><span>'+ic+' '+k+'</span><strong>'+v+'</strong></div>').join('')+'<div class="ledger-row profit"><span>📈 営業利益</span><strong>'+yen(p)+'</strong></div><details class="ledger-more"><summary>詳細を見る</summary>'+sub.map(([k,v])=>'<div class="ledger-row small"><span>'+k+'</span><strong>'+v+'</strong></div>').join('')+'</details>',"ledger");
const voices=served.slice(-3).reverse().map(o=>'<li>'+face(art.customer(o.customerId,o.rank),"voice-face",labels[o.customerId])+'<span><b>'+o.rank+'</b> '+labels[o.customerId]+'「'+ranks[o.rank]+'」</span></li>').join('')||'<li>今日はまだお客さんの声がありません。</li>';
const rep=card("",'<div class="rep-head"><span>評判</span>'+stars(game.reputation)+'</div><div class="rep-points"><span>評判ポイント</span><strong class="'+(repDelta>0?'up':repDelta<0?'down':'')+'">'+(repDelta>0?'+':'')+repDelta+'</strong></div><h3 class="mini-title">💬 お客さんの声</h3><ul class="voices">'+voices+'</ul>',"rep");
const body='<div class="result-layout">'+ledgerCard+rep+'</div>'+(game.day===7?'<div class="milestone">🎊 7日間の営業お疲れさま！　累計提供数 '+(game.careerLedger.providedCount+l.providedCount)+'食</div>':'')+'<div class="cta-row">'+btn("🛠️ アップグレードへ ▶","upgrades",'class="primary big-cta"')+'</div>';
return shell(body,{bg:"result",owner:p>0?"happy":"sad",ownerLine:p>0?"お疲れさま！ 今日もいい一日だったね！":"今日はちょっと厳しかったね…。明日はがんばろう！",hint:"営業利益と現金増減は異なります。"});
}
function upgrades(){
const items=config.upgrades.map(u=>{const owned=game.unlockedUpgradeIds.includes(u.id),available=game.day+1>=u.unlockDay;return card((u.id==="fryer"?"🍳 新しいフライヤー":"🪑 快適な椅子"),'<p>'+(u.id==="fryer"?"揚げ時間の許容幅が+1秒":"待ち時間の許容が10%増える")+'</p><p class="sub">効果開始：Day '+u.unlockDay+'</p><div class="price">'+yen(u.costYen)+'</div>'+btn(owned?"購入済み":!available?"未解放":"購入する","buy-upgrade",owned||!available||game.cashYen<u.costYen?'disabled class="secondary"':'class="primary"','data-id="'+u.id+'"'),"upgrade");}).join('');
return shell('<p class="lead">買った設備は翌営業日から効果を発揮します。</p><div class="upgrade-grid">'+items+'</div><div class="cta-row">'+btn("▶ 次の日へ","next-day",'class="primary big-cta"')+'</div>',{bg:"result",owner:"thinking",ownerLine:"どの設備を買おうかな？",hint:"Day "+(game.day+1)+" に向けて準備しましょう。"});
}
function help(){return '<main class="title-screen help" style="--bg:url('+art.bg("title")+')"><section class="card help-card"><h2 class="card-title">📖 遊び方</h2><div class="card-body"><p>朝に食材とたれを準備し、注文を受けたら6つの工程でかつめしを完成させましょう。</p><ol><li>肉をたたいて平たく</li><li>衣を付ける</li><li>揚げ時間を見極める</li><li>お客さんに合うたれを選ぶ</li><li>キャベツを茹でる</li><li>ご飯・カツ・たれ・キャベツを盛る</li></ol><p>完成するとお客さんの好みでランクSSS〜Fが決まり、売上と評判が増減します。閉店後は設備を買ってお店を育てましょう。</p>'+btn("タイトルへ戻る","back-title",'class="primary"')+'</div></section></main>';}
function pauseDialog(){return '<div class="overlay"><section class="modal card"><h2 class="card-title">⏸ 一時停止</h2><div class="card-body"><p>ゲーム内の時計と工程のタイマーは停止しています。</p>'+btn("▶ 再開","resume",'class="primary"')+btn("保存してタイトルへ","save-quit",'class="secondary"')+'</div></section></div>';}
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
async function boot(){try{const r=await fetch("./spec/mvp_config.json");if(!r.ok)throw Error("設定を読み込めません");config=await r.json();preloadArt();try{const stored=await dbRead();savedGameExists=!!stored;}catch{savedGameExists=false;toast="セーブ機能が使えない可能性があります";}render();}catch(e){app.innerHTML='<main class="help-page"><h1>読み込みエラー</h1><p>'+escapeHTML(e.message)+'</p><p>ローカルHTTPサーバーで実行してください（npm run dev）。</p></main>';}}
boot();
