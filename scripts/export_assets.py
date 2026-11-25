"""Export selected ComfyUI outputs into public/assets/game and write the manifest.

Sprites: the birefnet mask saved next to each image becomes the PNG alpha channel.
Generation metadata (prompt/workflow text chunks) is stripped from exported files.

usage: COMFY_OUTPUT_DIR=<ComfyUI>/output python -I scripts/export_assets.py
"""
import json, os, datetime
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
COMFY_OUT = os.environ.get("COMFY_OUTPUT_DIR") or os.sys.exit("set COMFY_OUTPUT_DIR to your ComfyUI output folder")
SEL = json.load(open(os.path.join(ROOT, "assets/source/comfyui/selection.json"), encoding="utf-8"))
non_character_assets = [asset.get("id", "<unknown>") for asset in SEL.get("assets", []) if asset.get("type") != "character"]
if non_character_assets:
    raise SystemExit(
        "ComfyUI export blocked: selection.json contains non-character assets ("
        + ", ".join(non_character_assets[:8])
        + "). Non-character assets must use ChatGPT image generation."
    )
PRESETS = json.load(open(os.path.join(ROOT, "assets/source/comfyui/presets.json"), encoding="utf-8"))
JOBS = {j["id"]: j for js in json.load(open(os.path.join(ROOT, "assets/source/comfyui/jobs.json"), encoding="utf-8")).values() for j in js}

entries = []
for a in SEL["assets"]:
    src = os.path.join(COMFY_OUT, a["source"])
    if not os.path.exists(src):
        print("MISSING", a["id"], a["source"]); continue
    im = Image.open(src)
    meta = json.loads(im.info.get("prompt", "{}"))
    seed = next((n["inputs"].get("seed") for n in meta.values() if n["class_type"] == "KSampler"), None)
    loras = [[n["inputs"]["lora_name"], n["inputs"]["strength_model"]] for n in meta.values() if n["class_type"] == "LoraLoaderModelOnly"]
    im = im.convert("RGB")
    if a.get("letterbox"):
        # model sometimes paints cinema bars: drop near-black rows, then cover-crop back to 16:9
        g = im.convert("L"); w, h = im.size
        rows = [sum(g.crop((0, y, w, y + 1)).getdata()) / w for y in range(h)]
        top = next(y for y in range(h) if rows[y] > 18); bot = next(y for y in range(h - 1, -1, -1) if rows[y] > 18) + 1
        im = im.crop((0, top + 2, w, bot - 2))
        cw = round(im.height * 16 / 9); x0 = (im.width - cw) // 2
        im = im.crop((x0, 0, x0 + cw, im.height)).resize((w, h), Image.LANCZOS)
    if a.get("cutout"):
        mask_path = src.replace("_0000", "_mask_0000")
        mask = Image.open(mask_path).convert("L")
        im.putalpha(mask)
    dest = os.path.join(ROOT, "public/assets/game", a["path"])
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.save(dest, quality=88 if a["type"] == "background" else 92, method=6)  # webp, no prompt/workflow metadata
    entries.append({
        "id": a["id"], "path": "public/assets/game/" + a["path"], "type": a["type"],
        "width": im.width, "height": im.height,
        "anchorX": a.get("anchorX", 0.5), "anchorY": a.get("anchorY", 1.0 if a.get("cutout") else 0.5),
        "scaleHint": a.get("scaleHint", 1.0), "tags": a.get("tags", []), "status": "draft",
        "sourceWorkflow": "assets/source/comfyui/jobs.json#" + os.path.basename(a["source"]).rsplit("_0000", 1)[0],
        "generationSeed": seed, "model": PRESETS["base"]["unet"], "loraList": loras,
        "licenseNote": "Generated locally with Anima-Base + user-owned LoRAs. Model/LoRA license review pending; do not publish until approved.",
        "reviewedAt": None,
    })
    print("exported", a["id"], im.size)

manifest = {"schema": "katsumeshi-asset-manifest/v1", "generatedAt": datetime.datetime.now().isoformat(timespec="seconds"), "assets": entries}
json.dump(manifest, open(os.path.join(ROOT, "public/assets/game/manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(entries), "assets -> public/assets/game/manifest.json")
