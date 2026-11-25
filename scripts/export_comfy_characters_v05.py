"""Export the reviewed ComfyUI character set to a versioned runtime folder.

Reads only owner/customer jobs and their BirefNet masks. Existing asset files
and the global asset manifest are left untouched.
"""
import datetime
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
COMFY_OUT = Path(r"F:\Stable Diffusion\ComfyUI-Windows\ComfyUI_windows_portable\ComfyUI\output")
OUT_DIR = ROOT / "public/assets/game/characters"
JOBS = json.loads((ROOT / "assets/source/comfyui/jobs.json").read_text(encoding="utf-8"))

owner_emotions = {
    "normal": "char_owner_shop_normal_v001",
    "encourage": "char_owner_shop_encourage_v001",
    "happy": "char_owner_shop_happy_v001",
    "sad": "char_owner_shop_sad_v001",
    "surprised": "char_owner_shop_surprised_v001",
    "thinking": "char_owner_shop_thinking_v001",
}
owner_full = {
    "shop_full_v01": "char_owner_shop_full_front_v001",
    "casual_full_v01": "char_owner_casual_full_front_v001",
}
job_by_id = {job["id"]: job for group in ("owner", "customers") for job in JOBS[group]}


def find_image(job_id, mask=False):
    suffix = "_mask_00001_.png" if mask else "_00001_.png"
    path = COMFY_OUT / "town_game_assets" / f"{job_id}{suffix}"
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def export(job_id, relative_path):
    src = find_image(job_id)
    image = Image.open(src).convert("RGB")
    mask = Image.open(find_image(job_id, mask=True)).convert("L")
    if image.size != mask.size:
        raise ValueError(f"Image/mask dimensions differ for {job_id}: {image.size} vs {mask.size}")
    image.putalpha(mask)
    dest = OUT_DIR / relative_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "WEBP", quality=94, method=6)

    workflow = json.loads(Image.open(src).info.get("prompt", "{}"))
    sampler = next((node["inputs"] for node in workflow.values() if node["class_type"] == "KSampler"), {})
    loras = [
        {"name": node["inputs"]["lora_name"], "strength": node["inputs"]["strength_model"]}
        for node in workflow.values() if node["class_type"] == "LoraLoaderModelOnly"
    ]
    return {
        "id": job_id,
        "path": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "width": image.width,
        "height": image.height,
        "seed": sampler.get("seed"),
        "model": next((n["inputs"].get("unet_name") for n in workflow.values() if n["class_type"] == "UNETLoader"), None),
        "loras": loras,
        "source": f"town_game_assets/{src.name}",
        "licenseNote": "Distribution terms for the base model and LoRAs are pending review; do not publish until cleared.",
        "reviewStatus": "concept_review",
    }


entries = []
for emotion, job_id in owner_emotions.items():
    entries.append(export(job_id, f"owner/v05/emotions/{emotion}_v01.webp"))
for filename, job_id in owner_full.items():
    entries.append(export(job_id, f"owner/v05/{filename}.webp"))
for job in JOBS["customers"]:
    _, character, _, rank, _ = job["id"].split("_")
    entries.append(export(job["id"], f"{character}/v05/{rank.lower()}.webp"))

manifest = {
    "schema": "katsumeshi-comfy-character-manifest/v1",
    "generatedAt": datetime.datetime.now().isoformat(timespec="seconds"),
    "sourcePreset": "assets/source/comfyui/presets.json",
    "reviewStatus": "concept_review",
    "assets": entries,
}
manifest_path = OUT_DIR / "v05/manifest.json"
manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Exported {len(entries)} ComfyUI character assets to {OUT_DIR / 'v05'}")
