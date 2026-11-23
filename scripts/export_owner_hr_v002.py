"""Export ComfyUI full-body character upscale candidates for side-by-side review."""
import json
from pathlib import Path

from PIL import Image, ImageDraw

root = Path.cwd()
comfy_output = Path(r"F:\Stable Diffusion\ComfyUI-Windows\ComfyUI_windows_portable\ComfyUI\output\town_game_assets")
source_dir = root / "assets/source/comfyui/candidates/owner_fullbody_hr_v002"
preview_dir = source_dir / "webp_preview"
preview_dir.mkdir(parents=True, exist_ok=True)
jobs = json.loads((root / "assets/source/comfyui/jobs.json").read_text(encoding="utf-8"))["owner_fullbody_hr_v002"]
assets = []
tiles = []

for job in jobs:
    outfit = "shop" if "shop" in job["id"] else "casual"
    output = comfy_output / f"{job['id']}_00001_.png"
    mask_path = comfy_output / f"{job['id']}_mask_00001_.png"
    if not output.is_file() or not mask_path.is_file():
        raise FileNotFoundError(f"Missing generated PNG/mask pair for {job['id']}")

    image = Image.open(output).convert("RGBA")
    mask = Image.open(mask_path).convert("L")
    if image.size != mask.size:
        raise ValueError(f"mask size mismatch for {job['id']}: {image.size} != {mask.size}")
    image.putalpha(mask)

    source = source_dir / f"owner_{outfit}_full_v002_hr.png"
    preview = preview_dir / f"owner_{outfit}_full_v002_hr.webp"
    image.save(source, optimize=True)
    image.save(preview, format="WEBP", quality=96, method=6)

    workflow = json.loads(Image.open(output).info.get("prompt", "{}"))
    sampler = next((node["inputs"] for node in workflow.values() if node.get("class_type") == "KSampler"), {})
    loras = [
        {"name": node["inputs"]["lora_name"], "strength": node["inputs"]["strength_model"]}
        for node in workflow.values() if node.get("class_type") == "LoraLoaderModelOnly"
    ]
    asset = {
        "id": job["id"],
        "outfit": outfit,
        "path": preview.relative_to(root).as_posix(),
        "sourceImage": source.relative_to(root).as_posix(),
        "sourceMask": f"ComfyUI output/town_game_assets/{job['id']}_mask_00001_.png",
        "initImage": f"ComfyUI input/{job['init_image']}",
        "width": image.width,
        "height": image.height,
        "seed": sampler.get("seed"),
        "denoise": sampler.get("denoise"),
        "model": next((node["inputs"].get("unet_name") for node in workflow.values() if node.get("class_type") == "UNETLoader"), None),
        "loraList": loras,
        "prompt": job["prompt"],
        "negativePromptExtra": job.get("negative_extra", ""),
        "status": "concept_review",
        "licenseNote": "Koharu/Anima-style LoRA training-data rights remain pending; do not publish.",
        "reviewNote": "High-resolution img2img candidate based on current owner full-body sprite. Compare face, hairpin, costume, full-body coverage, hand/feet anatomy, transparent margins, and runtime scale before selection.",
    }
    assets.append(asset)

    current = Image.open(root / f"public/assets/game/characters/owner/v05/{outfit}_full_v01.webp").convert("RGBA")
    for panel, label in ((current, f"Current {outfit} 832x1216"), (image, f"ComfyUI + LoRA candidate {outfit} {image.width}x{image.height}")):
        cell = Image.new("RGB", (768, 1100), "#f6f1e7")
        panel.thumbnail((740, 1020), Image.Resampling.LANCZOS)
        cell.paste(panel, ((768 - panel.width) // 2, 12), panel)
        ImageDraw.Draw(cell).text((14, 1065), label, fill="#2b2118")
        tiles.append(cell)

manifest = {
    "schema": "katsumeshi-comfy-character-candidate-manifest/v1",
    "generatedAt": "2026-11-23",
    "status": "concept_review",
    "sourceWorkflow": "assets/source/comfyui/jobs.json#owner_fullbody_hr_v002",
    "workflowNote": "Character-only ComfyUI img2img; Anima-Base + Koharu and anima-style LoRAs at 0.8 each, 1536x2048, denoise 0.28, cutout mask retained.",
    "assets": assets,
}
(source_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
sheet = Image.new("RGB", (1536, 2200), "#ddd7ce")
for index, tile in enumerate(tiles):
    sheet.paste(tile, ((index % 2) * 768, (index // 2) * 1100))
sheet.save(root / "artifacts/owner_fullbody_hr_review_v002.jpg", quality=94)
print("exported:", [(asset["outfit"], asset["width"], asset["height"], asset["seed"], asset["denoise"]) for asset in assets])
