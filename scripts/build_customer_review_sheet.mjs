import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public/assets/game/characters');
const output = path.join(root, 'artifacts/characters_current_runtime_review.html');
const types = [
  ['regular', '近所の常連'],
  ['student', '学生'],
  ['worker', '会社員'],
  ['tourist', '観光客'],
];
const ranks = [['sss','SSS'],['s','S'],['a','A'],['b','B'],['c','C'],['f','F']];
const v05 = JSON.parse(readFileSync(path.join(publicRoot, 'v05/manifest.json'), 'utf8'));
const v06 = JSON.parse(readFileSync(path.join(publicRoot, 'regular/v06/manifest.json'), 'utf8'));
const ownerCandidates = v05.assets.filter(asset => /characters\/(regular|student|worker|tourist)\/v05\//.test(asset.path));
const overrides = new Map(v06.assets.filter(asset => ['char_regular_reaction_c_v103','char_regular_reaction_f_v103'].includes(asset.id)).map(asset => [asset.rank.toLowerCase(), asset]));
const relative = file => path.relative(path.dirname(output), path.join(root, file)).replaceAll('\\','/');
const cells = [];
for (const [type, label] of types) {
  const row = [];
  for (const [rank, rankLabel] of ranks) {
    const candidate = type === 'regular' && overrides.has(rank)
      ? overrides.get(rank)
      : ownerCandidates.find(asset => asset.id === `char_${type}_reaction_${rank}_v101`);
    if (!candidate) throw new Error(`Missing current runtime candidate: ${type}/${rank}`);
    const src = relative(candidate.path);
    if (!existsSync(path.resolve(path.dirname(output), src))) throw new Error(`Missing image: ${src}`);
    row.push(`<td><figure><div class="sprite"><img src="${src}" alt="${label} ${rankLabel}ランク" loading="lazy"></div><figcaption><b>${rankLabel}</b><span>${candidate.id}</span><small>${candidate.width}×${candidate.height} · ${candidate.reviewStatus ?? candidate.status ?? 'concept_review'}</small></figcaption></figure></td>`);
  }
  cells.push(`<tr><th scope="row">${label}<small>${type}</small></th>${row.join('')}</tr>`);
}
const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>顧客表情・現行ランタイム候補レビュー</title>
<style>
:root{color-scheme:light;--ink:#43291f;--red:#8d281e;--gold:#c89439;--cream:#fff8e9;--line:#dfcfad}*{box-sizing:border-box}body{margin:0;background:#f2eadb;color:var(--ink);font-family:"Yu Gothic UI","Meiryo",sans-serif}header{padding:22px 28px;background:linear-gradient(110deg,#8b211c,#5d201b);color:#fff8e9;border-bottom:4px solid var(--gold)}h1{margin:0 0 6px;font-size:25px}header p{margin:0;font-size:14px;opacity:.9}.notice{margin:18px 24px;padding:12px 16px;border-left:5px solid var(--gold);background:#fffaf0;line-height:1.6}.grid-wrap{overflow:auto;padding:0 20px 24px}table{width:100%;min-width:1180px;table-layout:fixed;border-collapse:separate;border-spacing:8px}thead th{padding:9px;background:var(--red);color:#fff;border-radius:8px;font-size:15px}thead th:first-child{width:130px;background:transparent}tbody th{background:#6b3025;color:#fff8e9;border-radius:10px;font-size:17px}tbody th small{display:block;font-size:12px;font-weight:400;opacity:.8}td{padding:0;vertical-align:top}figure{margin:0;border:1px solid var(--line);border-radius:10px;background:var(--cream);overflow:hidden;box-shadow:0 3px 8px #4027181a}.sprite{height:230px;display:grid;place-items:center;background-color:#fff;background-image:linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0}.sprite img{width:100%;height:100%;object-fit:contain}figcaption{min-height:82px;padding:8px 9px;display:flex;flex-direction:column;gap:4px}figcaption b{font-size:15px;color:var(--red)}figcaption span{font-size:10px;overflow-wrap:anywhere;color:#5d5145}figcaption small{font-size:10px;color:#756b5e}.footer{margin:0 24px 24px;padding:12px 16px;border:1px solid var(--line);border-radius:10px;background:#fffaf0;font-size:13px;line-height:1.7}.footer strong{color:var(--red)}
</style></head><body>
<header><h1>顧客リアクション 現行ランタイム候補</h1><p>仕様06: 4タイプ × 6ランク · 実行参照と同じ画像を表示</p></header>
<div class="notice"><strong>レビュー対象:</strong> SSS/Sは喜びの強い反応、A/Bは中間、C/Fは控えめな低評価として連続性と人物同一性を比較してください。常連客C/Fはv103、残りはv05参照です。</div>
<div class="notice"><strong>縮小一覧の所見:</strong> SSS/Sは4タイプとも喜びが明瞭です。常連客のC/F v103は低評価として読み取れます。学生C/Fと観光客C/Fは一覧サイズで差が小さく、会社員CはBより笑顔が強く見えるため、ランクの連続性が弱い箇所があります。会社員Fは明確に落ち込んでいます。人物同一性は概ね保たれていますが、表情品質は未承認です。</div>
<div class="grid-wrap"><table><thead><tr><th>客タイプ</th>${ranks.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${cells.join('')}</tbody></table></div>
<div class="footer"><strong>状態: concept_review / 未承認</strong><br>この一覧は確認用です。全24枚の表情差・画風・同一性が仕様を満たすという採用判定ではありません。制作履歴の古いv001コンタクトシートは現行確認には使いません。<br>画像参照元: <code>public/assets/game/characters/v05/manifest.json</code> と <code>public/assets/game/characters/regular/v06/manifest.json</code></div>
</body></html>`;
mkdirSync(path.dirname(output), {recursive:true});
writeFileSync(output, html, 'utf8');
console.log(`wrote ${path.relative(root, output)} (${types.length* ranks.length} images)`);
