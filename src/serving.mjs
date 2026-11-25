// Serving floor: an oblique dining room where the shop girl carries finished katsumeshi to tables.
// The domain owns orders, money and ranks (SERVE_TABLE); this module owns seats, the kitchen pass, the tray, walking and ambience.
import { CANVAS, P, unproject, ROOM, TABLE, TABLES, KITCHEN, PASS_SPOTS, PASS, CHEF, START, servePoint, tableTopPolygon } from "./serving-layout.mjs";

const COOK_SECONDS = 4, SPEED = 3.6, CAP = 2, EAT_SECONDS = 7, SEAT_DX = TABLE.chairDx;
const near = (p, q, r = .9) => Math.hypot(p.x - q.x, p.y - q.y) < r;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const pts = a => a.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
const footprint = t => { const h = TABLE.half + .32; return [P(t.x - h, t.y - h), P(t.x + h, t.y - h), P(t.x + h, t.y + h), P(t.x - h, t.y + h)].map(p => ({ x: p.x, y: p.y - TABLE.topPx })); };
const hitArea = t => { const h = TABLE.half + .2; return [P(t.x - h, t.y - h - 1), P(t.x + h, t.y - h - 1), P(t.x + h, t.y + h + .6), P(t.x - h, t.y + h + .6)].map(p => ({ x: p.x, y: p.y - 30 })); };
// which seated sprites can stand in for each domain customer type, and who may come along
const LOOKS = { worker: ["worker", "office"], student: ["student"], regular: ["elder_m", "elder_f"], tourist: ["tourist", "woman"] };
const COMPANIONS = { worker: ["office", "worker"], student: ["student", "woman"], regular: ["elder_f", "elder_m"], tourist: ["woman", "child", "tourist"] };
const AMBIENT = ["office", "worker", "elder_f", "woman", "child", "elder_m", "student", "tourist"];

export function createServingFloor({ art, labels, patienceOf, ingredientsReady }) {
  let root = null, els = null, game = null, api = null, raf = 0, last = 0, day = null, rngSeed = 1;
  const rnd = () => (rngSeed = (rngSeed * 1103515245 + 12345) >>> 0) / 4294967296;
  const F = { me: { ...START, path: null, goal: null, dir: true }, tray: [], pass: [], kitchen: null, seats: new Map(), ambient: new Map(), leaving: [], route: true, say: "", sayUntil: 0, pops: [], speed: 1, clock: 0 };

  function reset() {
    F.me = { ...START, path: null, goal: null, dir: true }; F.tray = []; F.pass = []; F.kitchen = null; F.speed = 1;
    for (const s of F.seats.values()) s.els.forEach(e => e.remove());
    for (const a of F.ambient.values()) a.els.forEach(e => e.remove());
    F.leaving.forEach(l => l.els.forEach(e => e.remove()));
    F.seats.clear(); F.ambient.clear(); F.leaving = [];
  }

  function build() {
    root = document.createElement("div"); root.className = "sv-root";
    const hits = TABLES.map(t => `<g class="sv-table" data-table="${t.id}"><polygon class="sv-glow" points="${pts(footprint(t))}"/><polygon class="sv-hitpoly" points="${pts(hitArea(t))}"/></g>`).join("");
    const passHit = [P(KITCHEN.front - KITCHEN.depth - .2, KITCHEN.y0), P(KITCHEN.front + 1.1, KITCHEN.y0), P(KITCHEN.front + 1.1, KITCHEN.y1), P(KITCHEN.front - KITCHEN.depth - .2, KITCHEN.y1)].map(p => ({ x: p.x, y: p.y - 40 }));
    root.innerHTML = `<div class="sv-world">
        <div class="sv-bg" style="background-image:url(${art.bg})"></div>
        <svg class="sv-under" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">${hits}<polygon class="sv-passhit" points="${pts(passHit)}"/></svg>
        <div class="sv-sort"></div>
        <svg class="sv-route" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}"></svg>
        <div class="sv-over"></div>
      </div>
      <div class="sv-ui">
        <section class="sv-mission"><header><span class="sv-mi-ico">🍴</span><b class="sv-mi-title"></b><span class="sv-mi-goal"></span></header><p class="sv-mi-text"></p><div class="sv-mi-row"><span class="sv-mi-done"></span><span class="sv-mi-bar"><i></i></span></div><div class="sv-mi-quality"></div></section>
        <aside class="sv-panel sv-queue"><h3><span>📋</span>配膳待ち<b class="sv-qn"></b></h3><ul></ul></aside>
        <aside class="sv-panel sv-traybox"><h3><span>🛎️</span>トレー<b class="sv-trayn"></b></h3><div class="sv-tray3d"><div class="sv-slots"></div></div></aside>
        <button type="button" class="sv-btn sv-routebtn on">📍 配膳ルート表示</button>
        <button type="button" class="sv-btn sv-speedbtn primary">≫ 営業を進める</button>
        <div class="sv-guide"><div class="sv-owner"></div><div class="sv-say"><b class="sv-say-tip">ヒント</b><span></span></div></div>
      </div>`;
    const q = s => root.querySelector(s);
    els = {
      world: q(".sv-world"), sort: q(".sv-sort"), over: q(".sv-over"), route: q(".sv-route"),
      queue: q(".sv-queue ul"), qn: q(".sv-qn"), trayN: q(".sv-trayn"), slots: q(".sv-slots"), routeBtn: q(".sv-routebtn"), speedBtn: q(".sv-speedbtn"),
      say: q(".sv-say span"), miTitle: q(".sv-mi-title"), miGoal: q(".sv-mi-goal"), miText: q(".sv-mi-text"), miDone: q(".sv-mi-done"), miBar: q(".sv-mi-bar i"), miQuality: q(".sv-mi-quality"),
      tables: new Map(), bubbles: new Map(), tops: new Map(), plates: new Map()
    };
    q(".sv-owner").style.backgroundImage = `url(${art.owner})`;
    // y-sorted sprites: waitress, chef, pass dishes, table tops (drawn over seated diners), plates, bubbles (in the over layer)
    els.me = mk("sv-me", `<i class="sv-shadow"></i><i class="sv-body"></i><span class="sv-tray"></span>`);
    els.meBody = els.me.querySelector(".sv-body"); els.meTray = els.me.querySelector(".sv-tray");
    els.chef = mk("sv-chef", `<i class="sv-body" style="background-image:url(${art.chef || ""})"></i>`); setPos(els.chef, CHEF.x, CHEF.y);
    if (!art.chef) els.chef.hidden = true;
    els.pass = mk("sv-pass", ""); els.pass.style.zIndex = Math.round(P(KITCHEN.front, KITCHEN.y1).y);
    els.cooking = document.createElement("div"); els.cooking.className = "sv-cooking"; els.over.appendChild(els.cooking);
    { const p = P(KITCHEN.front - KITCHEN.depth, KITCHEN.y0 + .3); els.cooking.style.left = p.x + "px"; els.cooking.style.top = (p.y - 150) + "px"; }
    for (const t of TABLES) {
      const top = document.createElement("div"); top.className = "sv-top";
      top.style.backgroundImage = `url(${art.bg})`; top.style.clipPath = `polygon(${tableTopPolygon(t).map(p => p.x.toFixed(1) + "px " + p.y.toFixed(1) + "px").join(",")})`;
      top.style.zIndex = Math.round(P(t.x, t.y).y); els.sort.appendChild(top); els.tops.set(t.id, top);
      const plate = document.createElement("div"); plate.className = "sv-plates"; const pp = P(t.x, t.y); plate.style.left = pp.x + "px"; plate.style.top = (pp.y - TABLE.topPx + 6) + "px"; plate.style.zIndex = Math.round(pp.y) + 1; els.sort.appendChild(plate); els.plates.set(t.id, plate);
      const b = document.createElement("div"); b.className = "sv-bubble"; b.style.left = pp.x + "px"; b.style.top = Math.max(150, pp.y - 178) + "px"; els.over.appendChild(b); els.bubbles.set(t.id, b);
      els.tables.set(t.id, q(`.sv-table[data-table="${t.id}"]`));
    }
    els.prompt = document.createElement("button"); els.prompt.type = "button"; els.prompt.className = "sv-prompt"; els.prompt.hidden = true; els.over.appendChild(els.prompt);
    root.addEventListener("click", onClick);
    root.addEventListener("pointerover", e => { const g = e.target.closest?.(".sv-table"); for (const x of els.tables.values()) x.classList.toggle("hover", x === g); });
    els.routeBtn.addEventListener("click", e => { e.stopPropagation(); F.route = !F.route; els.routeBtn.classList.toggle("on", F.route); });
    els.speedBtn.addEventListener("click", e => { e.stopPropagation(); F.speed = F.speed === 1 ? 2 : 1; api.setSpeed?.(F.speed); });
    els.prompt.addEventListener("click", e => { e.stopPropagation(); act(); });
    new ResizeObserver(fit).observe(root);
  }
  function mk(cls, html) { const el = document.createElement("div"); el.className = cls; el.innerHTML = html; els.sort.appendChild(el); return el; }
  function setPos(el, x, y, dy = 0) { const p = P(x, y); el.style.left = p.x + "px"; el.style.top = (p.y + dy) + "px"; el.style.zIndex = Math.round(p.y); }

  // world covers the host (no letterbox); the UI layer stays in host pixels
  function fit() {
    if (!root) return;
    const r = root.getBoundingClientRect(), s = Math.max(r.width / CANVAS.w, r.height / CANVAS.h) || 1;
    F.scale = s; els.world.style.transform = `translate(-50%,-50%) scale(${s})`;
    root.style.setProperty("--ui", Math.max(.62, Math.min(1.15, Math.min(r.width / 1600, r.height / 860))).toFixed(3));
  }

  function onClick(e) {
    if (!game || game.overlay) return;
    if (e.target.closest(".sv-ui")) return;
    const tbl = e.target.closest(".sv-table");
    if (tbl) { e.stopPropagation(); goTo({ type: "table", t: TABLES.find(t => t.id === Number(tbl.dataset.table)) }); return; }
    if (e.target.closest(".sv-passhit")) { e.stopPropagation(); goTo({ type: "pass" }); return; }
    const r = els.world.getBoundingClientRect(), s = r.width / CANVAS.w, f = unproject((e.clientX - r.left) / s, (e.clientY - r.top) / s);
    if (f.x >= KITCHEN.front + .3 && f.x <= ROOM.w - .5 && f.y >= .4 && f.y <= 11) goTo({ type: "floor", p: f });
  }
  function goTo(goal) { const d = goal.type === "pass" ? PASS : goal.type === "table" ? servePoint(goal.t) : goal.p; F.me.goal = goal; F.me.path = { x: d.x, y: d.y }; }
  function say(text, seconds = 4) { F.say = text; F.sayUntil = F.clock + seconds * 1000; }
  const seatOf = id => F.seats.get(id);
  const orderOf = id => game.orders.find(o => o.id === id);
  const urgency = id => { const o = orderOf(id); return o ? patienceOf(o) : 9; };

  function pickUp() {
    if (!F.pass.length) { say("まだ料理ができていません。厨房の調理が終わるまで少し待ちましょう。"); return; }
    if (F.tray.length >= CAP) { say("トレーはいっぱいです！ 先に席へ運びましょう。"); return; }
    F.pass.sort((a, b) => urgency(a) - urgency(b));
    while (F.tray.length < CAP && F.pass.length) F.tray.push(F.pass.shift());
    api.sound?.("pickup");
    say(F.tray.length > 1 ? "2皿持ちました！ 急ぎの席から、近い順にまとめて回りましょう！" : "受け取りました！ お客さんの席まで運びましょう！");
  }
  function deliver(t) {
    const entry = [...F.seats.entries()].find(([, s]) => s.table === t.id);
    if (!entry) return;
    const [id] = entry, i = F.tray.indexOf(id);
    if (i < 0) { say(`${t.id}卓の料理は持っていません。` + (F.pass.includes(id) ? "受け渡し口にできています！" : "厨房で調理中です。")); return; }
    if (!api.serve(id)) return;
    F.tray.splice(i, 1);
    const o = orderOf(id);
    if (o?.state === "served") {
      const s = seatOf(id); s.eatUntil = F.clock + EAT_SECONDS * 1000; s.rank = o.rank;
      F.pops.push({ t, text: "+" + o.priceYenSnapshot.toLocaleString() + "円", until: F.clock + 1300, el: null });
      say(["SSS", "S", "A"].includes(o.rank) ? `おいしそうに食べてくれています！ 評価 ${o.rank}！` : "少し好みと違ったみたい…。明日の仕込みでたれを工夫しましょう。");
    }
  }
  function act() { if (near(F.me, PASS)) pickUp(); else { const t = TABLES.find(t => near(F.me, servePoint(t))); if (t) deliver(t); } }
  function onKey(e) { if (!root?.isConnected || !game || game.overlay) return; if (e.key === "e" || e.key === "E") { e.preventDefault(); act(); } }
  function arrive() { const g = F.me.goal; F.me.goal = null; if (!g) return; if (g.type === "pass") pickUp(); else if (g.type === "table") deliver(g.t); }

  function seatPeople(t, kinds, cls) {
    return kinds.slice(0, 2).map((k, i) => {
      const el = document.createElement("div"); el.className = "sv-diner " + cls; el.style.backgroundImage = `url(${art.seated(k)})`;
      const p = P(t.x + SEAT_DX[i], t.y - TABLE.chairDy); el.style.left = p.x + "px"; el.style.top = (p.y + 14) + "px"; el.style.zIndex = Math.round(p.y) + 1;
      if (i === 1) el.classList.add("flip");
      els.sort.appendChild(el); requestAnimationFrame(() => el.classList.add("in")); return el;
    });
  }
  const usedTables = () => new Set([...F.seats.values()].map(s => s.table).concat([...F.ambient.keys()], F.leaving.map(l => l.table)));

  function sync() {
    const now = F.clock;
    for (const o of game.orders) {
      if (o.state !== "queued" || F.seats.has(o.id)) continue;
      let free = TABLES.filter(t => !usedTables().has(t.id));
      if (!free.length && F.ambient.size) { const [tid] = [...F.ambient.keys()].sort(() => rnd() - .5); leaveAmbient(tid); free = TABLES.filter(t => !usedTables().has(t.id)); }
      if (!free.length) continue;
      const t = free[Math.floor(rnd() * free.length)];
      const looks = LOOKS[o.customerId] || [o.customerId], main = looks[Math.floor(rnd() * looks.length)];
      const kinds = [main]; if (rnd() < .55) { const c = COMPANIONS[o.customerId] || AMBIENT; kinds.push(c[Math.floor(rnd() * c.length)]); }
      F.seats.set(o.id, { table: t.id, els: seatPeople(t, kinds, ""), eatUntil: 0, rank: null, n: kinds.length });
    }
    for (const [id, s] of [...F.seats.entries()]) {
      const o = orderOf(id);
      const gone = !o || ["expired", "cancelled"].includes(o.state) || (o.state === "served" && (!s.eatUntil || now > s.eatUntil));
      if (!gone) continue;
      const angry = o?.state === "expired";
      if (angry) say(`${s.table}卓のお客さんが帰ってしまいました…。急ぎの席を優先しましょう。`);
      s.els.forEach(el => { el.classList.add("out"); if (angry) el.classList.add("angry"); });
      F.leaving.push({ table: s.table, els: s.els, until: now + 900 }); F.seats.delete(id);
      F.tray = F.tray.filter(x => x !== id); F.pass = F.pass.filter(x => x !== id); if (F.kitchen?.id === id) F.kitchen = null;
    }
    F.leaving = F.leaving.filter(l => { if (now < l.until) return true; l.els.forEach(e => e.remove()); return false; });
    // ambience: keep a few tables occupied by diners who are already eating, leaving room for real orders
    const open = game.phase === "OPEN" && !game.dayClosed;
    const want = open ? Math.min(3, Math.max(0, TABLES.length - 2 - F.seats.size)) : 0;
    while (F.ambient.size > want) leaveAmbient([...F.ambient.keys()][0]);
    if (F.ambient.size < want && now > (F.nextAmbientAt || 0)) {
      const free = TABLES.filter(t => !usedTables().has(t.id));
      if (free.length) { const t = free[Math.floor(rnd() * free.length)], a = AMBIENT[Math.floor(rnd() * AMBIENT.length)], b = AMBIENT[Math.floor(rnd() * AMBIENT.length)]; F.ambient.set(t.id, { els: seatPeople(t, rnd() < .6 ? [a, b] : [a], "ambient"), until: now + 25000 + rnd() * 30000 }); }
      F.nextAmbientAt = now + 2500 + rnd() * 4000;
    }
    for (const [tid, a] of [...F.ambient.entries()]) if (now > a.until) leaveAmbient(tid);
  }
  function leaveAmbient(tid) { const a = F.ambient.get(tid); if (!a) return; a.els.forEach(el => el.classList.add("out")); F.leaving.push({ table: tid, els: a.els, until: F.clock + 900 }); F.ambient.delete(tid); }

  function step(dt) {
    F.clock += dt * 1000;
    sync();
    if (!F.kitchen) {
      const waiting = [...F.seats.keys()].filter(id => orderOf(id)?.state === "queued" && !F.pass.includes(id) && !F.tray.includes(id));
      if (waiting.length && F.pass.length < PASS_SPOTS.length && ingredientsReady(F.pass.length + F.tray.length + 1)) F.kitchen = { id: waiting.sort((a, b) => urgency(a) - urgency(b))[0], left: COOK_SECONDS };
    }
    if (F.kitchen) { F.kitchen.left -= dt; if (F.kitchen.left <= 0) { F.pass.push(F.kitchen.id); F.kitchen = null; api.sound?.("ready"); } }
    const m = F.me;
    if (m.path) { const dx = m.path.x - m.x, dy = m.path.y - m.y, d = Math.hypot(dx, dy), v = SPEED * dt; if (d <= v) { m.x = m.path.x; m.y = m.path.y; m.path = null; arrive(); } else { m.x += dx / d * v; m.y += dy / d * v; m.dir = (dx - dy) < 0; } }
  }

  const setHtml = (el, h) => { if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } };
  function draw() {
    const now = F.clock, dish = art.dish;
    // waitress
    setPos(els.me, F.me.x, F.me.y); els.me.classList.toggle("walk", !!F.me.path); els.me.classList.toggle("flip", !!F.me.dir); // sprites face right; mirror when walking left
    const body = F.me.path ? art.waitressWalk : art.waitressIdle; if (els.meBody.dataset.src !== body) { els.meBody.style.backgroundImage = `url(${body})`; els.meBody.dataset.src = body; }
    setHtml(els.meTray, F.tray.map(() => `<img src="${dish}" alt="">`).join(""));
    // kitchen pass
    setHtml(els.pass, F.pass.map((id, i) => { const p = P(PASS_SPOTS[i].x, PASS_SPOTS[i].y), s = seatOf(id); return `<div class="sv-passdish" style="left:${p.x}px;top:${p.y - KITCHEN.counterPx + 44}px"><i class="sv-steam"></i><img src="${dish}" alt=""><b>${s ? s.table + "卓" : ""}</b></div>`; }).join(""));
    setHtml(els.cooking, F.kitchen ? `🍳 調理中<i style="width:${Math.round((1 - F.kitchen.left / COOK_SECONDS) * 100)}%"></i>` : F.pass.length ? `✨ できあがり ${F.pass.length}皿` : "");
    els.cooking.hidden = !F.kitchen && !F.pass.length;
    // prompt
    let pr = null;
    if (!F.me.path && near(F.me, PASS) && F.pass.length && F.tray.length < CAP) pr = { p: P(PASS.x, PASS.y), t: "受け取る" };
    const tn = !F.me.path && TABLES.find(t => near(F.me, servePoint(t)) && [...F.seats.entries()].some(([id, s]) => s.table === t.id && F.tray.includes(id)));
    if (tn) pr = { p: P(tn.x, tn.y), t: "運ぶ" };
    if (!pr && F.pass.length && !F.tray.length && !F.me.path) pr = { p: P(KITCHEN.front, 3.0), t: "受け取る" };
    els.prompt.hidden = !pr;
    if (pr) { setHtml(els.prompt, `<kbd>E</kbd>${pr.t}`); els.prompt.style.left = pr.p.x + "px"; els.prompt.style.top = (pr.p.y - 170) + "px"; }
    // tables: glow, bubbles, plates
    for (const t of TABLES) {
      const entry = [...F.seats.entries()].find(([, s]) => s.table === t.id), g = els.tables.get(t.id);
      let h = "", plates = "", hurry = false, width = null;
      if (entry) {
        const [id, s] = entry, o = orderOf(id), ratio = o?.state === "queued" ? patienceOf(o) : 1, col = ratio > .55 ? "g" : ratio > .3 ? "y" : "r";
        hurry = !s.eatUntil && ratio < .3; width = Math.round(ratio * 100) + "%";
        const face = s.eatUntil ? `<div class="sv-dish eat"><b class="sv-rank rank-${s.rank}">${s.rank}</b><small>😋</small></div>` : `<div class="sv-dish"><img src="${dish}" alt=""></div>`;
        h = face + `<div class="sv-tag"><span class="sv-tno">${t.id}卓</span>${s.eatUntil ? `<em>食事中</em>` : `<span class="sv-gauge ${col}"><i></i></span>`}</div>` + (hurry ? `<span class="sv-hurry">⏰ 急ぎ！</span>` : "");
        if (s.eatUntil) plates = Array.from({ length: s.n }, (_, i) => `<img src="${dish}" alt="" style="--i:${i}">`).join("");
      } else if (F.ambient.has(t.id)) plates = F.ambient.get(t.id).els.map((_, i) => `<img src="${dish}" alt="" style="--i:${i}" class="half">`).join("");
      const bub = els.bubbles.get(t.id); setHtml(bub, h); setHtml(els.plates.get(t.id), plates);
      if (width) { const gi = bub.querySelector(".sv-gauge i"); if (gi && gi.style.width !== width) gi.style.width = width; }
      g.classList.toggle("target", F.me.goal?.type === "table" && F.me.goal.t === t);
      g.classList.toggle("hurry", hurry);
      g.classList.toggle("ready", !!entry && F.tray.includes(entry[0]));
    }
    // UI: mission, queue, tray, speed
    const mi = api.mission?.() || {};
    els.miTitle.textContent = mi.title || "営業中"; els.miGoal.innerHTML = mi.goal ? `目標<b>${mi.goal}</b>食` : "";
    els.miText.textContent = mi.text || ""; els.miDone.innerHTML = `提供 <b>${mi.served ?? 0}</b> / ${mi.goal ?? "-"} 食` + (mi.time ? `<span class="sv-mi-time">⏱ ${mi.time}</span>` : "");
    els.miBar.style.width = mi.goal ? Math.min(100, (mi.served / mi.goal) * 100) + "%" : "0";
    setHtml(els.miQuality, api.qualityLabel?.() || "");
    const waiting = [...F.seats.entries()].filter(([id, s]) => !s.eatUntil && orderOf(id)?.state === "queued").sort((a, b) => urgency(a[0]) - urgency(b[0]));
    els.qn.textContent = waiting.length ? waiting.length + "件" : "";
    setHtml(els.queue, waiting.length ? waiting.map(([id, s]) => { const o = orderOf(id), r = patienceOf(o), st = F.tray.includes(id) ? ["トレー", "ready"] : F.pass.includes(id) ? ["受け取り可", "ready"] : F.kitchen?.id === id ? ["調理中", "cook"] : ["待ち", ""];
      const urgent = r < .3; return `<li class="${urgent ? "urgent" : ""}"><span class="sv-tno">${s.table}卓</span><img src="${dish}" alt="" class="sv-qdish"><span class="sv-qname">かつめし ×${s.n}<small>${esc(labels[o.customerId] || "")}</small></span><span class="sv-st ${urgent ? "hurry" : st[1]}">${urgent ? "急ぎ" : st[0]}</span></li>`; }).join("") : `<li class="sv-empty">☕ 注文を待っています</li>`);
    els.trayN.textContent = F.tray.length + " / " + CAP;
    setHtml(els.slots, Array.from({ length: CAP }, (_, i) => F.tray[i] ? `<div class="sv-slot full"><i class="sv-steam"></i><img src="${dish}" alt=""><b class="sv-tno">${seatOf(F.tray[i])?.table ?? ""}卓</b></div>` : `<div class="sv-slot"></div>`).join(""));
    els.speedBtn.classList.toggle("on", F.speed > 1); els.speedBtn.textContent = F.speed > 1 ? "≫ 早送り中（×2）" : "≫ 営業を進める";
    // route: me → tray tables in urgency order (or → pass)
    let rh = "";
    if (F.route) {
      const pl = [P(F.me.x, F.me.y)];
      if (F.tray.length) [...F.tray].sort((a, b) => urgency(a) - urgency(b)).forEach(id => { const s = seatOf(id), t = s && TABLES.find(t => t.id === s.table); if (t) { const q = servePoint(t); pl.push(P(q.x, q.y)); } });
      else if (F.pass.length) pl.push(P(PASS.x, PASS.y));
      if (pl.length > 1) {
        const end = pl[pl.length - 1], prev = pl[pl.length - 2], ang = Math.atan2(end.y - prev.y, end.x - prev.x) * 180 / Math.PI;
        rh = `<polyline points="${pts(pl)}" class="sv-path-glow"/><polyline points="${pts(pl)}" class="sv-path"/><g transform="translate(${end.x},${end.y}) rotate(${ang})"><path d="M-6,-16 L18,0 L-6,16 Z" class="sv-arrow"/></g>` + pl.slice(1, -1).map((q, i) => `<circle cx="${q.x}" cy="${q.y}" r="16" class="sv-step"/><text x="${q.x}" y="${q.y + 6}" class="sv-stepn">${i + 1}</text>`).join("");
      }
    }
    setHtml(els.route, rh);
    F.pops = F.pops.filter(pp => { if (!pp.el) { pp.el = document.createElement("div"); pp.el.className = "sv-pop"; pp.el.textContent = pp.text; const p = P(pp.t.x, pp.t.y); pp.el.style.left = p.x + "px"; pp.el.style.top = (p.y - 170) + "px"; els.over.appendChild(pp.el); } if (now < pp.until) return true; pp.el.remove(); return false; });
    const missing = !ingredientsReady(1) && F.seats.size > F.pass.length + F.tray.length;
    const line = now < F.sayUntil ? F.say : missing ? "食材が足りなくて料理を作れません…。明日の仕入れを増やしましょう。" : F.tray.length ? "トレーの料理を席まで運びましょう！ テーブルをクリックすると歩いていきます。" : F.pass.length ? "できたてが受け渡し口に並んでいます！ カウンターをクリックして受け取りましょう。" : F.seats.size ? "厨房で作っています。待ち時間ゲージが赤い席は急ぎです！" : "お客さんを待っています。";
    if (els.say.textContent !== line) els.say.textContent = line;
  }

  function loop(now) {
    raf = 0;
    if (!root?.isConnected || !game) { stop(); return; }
    const dt = Math.min(.1, (now - last) / 1000) * F.speed; last = now;
    if (!game.overlay && !game.activeStoryEventId && !document.hidden) step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; document.removeEventListener("keydown", onKey); if (F.speed !== 1) { F.speed = 1; api?.setSpeed?.(1); } }

  return {
    mount(host, g, a) {
      game = g; api = a;
      if (day !== g.day) { if (root) reset(); day = g.day; rngSeed = (g.seed ^ (g.day * 2654435761)) >>> 0 || 1; }
      if (!root) build();
      if (root.parentNode !== host) { host.appendChild(root); fit(); }
      if (!raf) { last = performance.now(); document.addEventListener("keydown", onKey); raf = requestAnimationFrame(loop); }
    },
    update(g) { game = g; },
    // review helper: run the floor simulation forward without rendering frames
    simulate(seconds, auto) { for (let t = 0; t < seconds; t += .05) { step(.05); auto?.(F); } draw(); },
    state: () => F,
    goTo: t => goTo(t === "pass" ? { type: "pass" } : { type: "table", t: TABLES.find(x => x.id === t) })
  };
}

// Art for the floor. `base` is the absolute URL of public/assets/game/. The build copies servingRuntimeFiles.
const DINERS = ["worker", "office", "student", "elder_m", "elder_f", "woman", "child", "tourist"];
export const servingRuntimeFiles = ["serving/v01/floor_v02.webp", "serving/v01/waitress_walk.webp", "serving/v01/waitress_idle.webp", "serving/v01/chef.webp", ...DINERS.map(k => `serving/v01/diner_${k}.webp`)];
export function servingArt(base) {
  const S = base + "serving/v01/";
  return {
    bg: S + "floor_v02.webp", dish: base + "food/beef_katsumeshi/whole.webp", owner: base + "characters/owner/v05/emotions/encourage_v01.webp",
    waitressWalk: S + "waitress_walk.webp", waitressIdle: S + "waitress_idle.webp", chef: S + "chef.webp", seated: k => S + "diner_" + (DINERS.includes(k) ? k : "worker") + ".webp"
  };
}
