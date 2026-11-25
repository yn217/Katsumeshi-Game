"""Create a local review page for assets included in the current preview build."""
from html import escape
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREVIEW_ASSETS = ROOT / "dist-preview" / "public" / "assets" / "game"
GAME_ASSETS = ROOT / "public" / "assets" / "game"
MANIFEST = GAME_ASSETS / "manifest.json"
OUTPUT = ROOT / "artifacts" / "runtime_asset_review.html"


def load_records():
    records = {}
    manifests = [MANIFEST, *GAME_ASSETS.rglob("manifest.json")]
    for manifest_path in sorted(set(manifests), key=lambda path: len(path.parts)):
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for collection in (manifest.get("assets"), manifest.get("files")):
            if not isinstance(collection, list):
                continue
            for item in collection:
                if not isinstance(item, dict) or not isinstance(item.get("path"), str):
                    continue
                asset_path = item["path"].replace("\\", "/")
                if asset_path.startswith("public/assets/game/"):
                    relative = asset_path.removeprefix("public/assets/game/")
                elif asset_path.startswith("assets/source/"):
                    continue
                else:
                    try:
                        relative = (manifest_path.parent / asset_path).resolve().relative_to(GAME_ASSETS.resolve()).as_posix()
                    except ValueError:
                        continue
                status = item.get("status") or item.get("approval") or item.get("reviewStatus") or manifest.get("status") or manifest.get("reviewStatus")
                records[relative] = {
                    **manifest,
                    **item,
                    "status": status or "manifest未登録",
                    "sourceWorkflow": item.get("sourceWorkflow") or manifest.get("sourceWorkflow") or manifest.get("sourceAttribution"),
                    "licenseNote": item.get("licenseNote") or item.get("license") or manifest.get("licenseNote") or manifest.get("sourceAttribution"),
                }
    return records


def main():
    if not PREVIEW_ASSETS.is_dir():
        raise SystemExit("Run npm run build:preview before creating the review gallery.")

    records = load_records()
    files = sorted(path for path in PREVIEW_ASSETS.rglob("*") if path.is_file())
    cards = []
    for file in files:
        relative = file.relative_to(PREVIEW_ASSETS).as_posix()
        record = records.get(relative, {})
        url = "../dist-preview/public/assets/game/" + escape(relative, quote=True)
        kind = file.suffix.lower()
        label = escape(record.get("id", file.stem))
        status = escape(record.get("status", record.get("reviewStatus", record.get("approval", "manifest未登録"))))
        dims = "{}×{}".format(record.get("width", "?"), record.get("height", "?"))
        source = escape(str(record.get("sourceWorkflow", "出典記録なし")))
        license_note = escape(str(record.get("licenseNote", record.get("license", "ライセンス記録なし"))))
        if kind in {".png", ".webp", ".jpg", ".jpeg", ".svg"}:
            preview = f'<img loading="lazy" src="{url}" alt="{label}">'
            media_type = "画像"
        elif kind == ".wav":
            preview = f'<audio controls preload="none" src="{url}"></audio>'
            media_type = "音源"
            dims = "WAV"
        else:
            preview = f'<a href="{url}">ファイルを開く</a>'
            media_type = "その他"
        cards.append(
            f'<article class="asset" data-status="{status}" data-kind="{media_type}">'
            f'<div class="preview">{preview}</div><div class="meta">'
            f'<strong>{label}</strong><span class="pill">{status}</span>'
            f'<small>{media_type} · {dims}</small><code>{escape(relative)}</code>'
            f'<details><summary>出典・利用条件</summary><p>{source}</p><p>{license_note}</p></details>'
            f'</div></article>'
        )

    html = f'''<!doctype html>
<html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>プレビュー実行アセット確認</title>
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#f4eee3;color:#382318;font:16px/1.5 system-ui,sans-serif}}
header{{position:sticky;top:0;z-index:2;padding:16px 24px;background:#fffaf1;border-bottom:1px solid #d9c8b1;box-shadow:0 2px 8px #38231818}}
h1{{margin:0 0 4px;font-size:22px}}header p{{margin:0 0 12px;color:#705947}}.filters{{display:flex;gap:8px;flex-wrap:wrap}}
button{{padding:6px 12px;border:1px solid #b49b7d;border-radius:18px;background:#fff;color:#382318;cursor:pointer}}
button[aria-pressed=true]{{background:#70291f;color:#fff;border-color:#70291f}}main{{padding:18px 24px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}}
.asset{{overflow:hidden;border:1px solid #d9c8b1;border-radius:12px;background:#fffaf5;box-shadow:0 3px 12px #38231812}}
.preview{{height:190px;display:grid;place-items:center;padding:10px;background:linear-gradient(45deg,#eee6da 25%,transparent 25%,transparent 75%,#eee6da 75%),linear-gradient(45deg,#eee6da 25%,transparent 25%,transparent 75%,#eee6da 75%);background-color:#f7f1e7;background-position:0 0,8px 8px;background-size:16px 16px}}
.preview img{{max-width:100%;max-height:100%;object-fit:contain}}audio{{width:95%}}.meta{{display:grid;grid-template-columns:1fr auto;gap:5px 8px;padding:10px 12px}}
.meta small,.meta code,.meta details{{grid-column:1/-1}}.meta code{{overflow-wrap:anywhere;font-size:11px;color:#705947}}
.pill{{align-self:start;border-radius:12px;padding:1px 7px;background:#efe1c7;font-size:12px}}details{{font-size:13px}}details p{{margin:5px 0;overflow-wrap:anywhere;color:#705947}}
.asset[hidden]{{display:none}}.notice{{margin:12px 0 0;font-size:13px}}
</style><header><h1>プレビュー実行アセット確認</h1>
<p>{len(files)}点。これはローカル確認用です。表示された候補は承認済み素材ではなく、公開には使えません。</p>
<div class="filters"><button data-filter="all" aria-pressed="true">すべて</button><button data-filter="画像">画像</button><button data-filter="音源">音源</button><button data-filter="concept_review">concept_review</button><button data-filter="draft">draft</button></div>
<p class="notice">manifestに記録のない素材は状態「manifest未登録」と表示します。利用条件が未確認の素材は出荷対象外です。</p></header>
<main><div class="grid">{''.join(cards)}</div></main>
<script>const cards=[...document.querySelectorAll('.asset')];document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));const f=button.dataset.filter;cards.forEach(card=>card.hidden=f!=='all'&&card.dataset.kind!==f&&card.dataset.status!==f);}}));</script></html>'''
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT} ({len(files)} preview assets)")


if __name__ == "__main__":
    main()
