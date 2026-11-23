import json
from pathlib import Path

from PIL import Image, ImageDraw

root = Path.cwd()
comfy_output = Path(r"F:\Stable Diffusion\ComfyUI-Windows\ComfyUI_windows_portable\ComfyUI\output\town_game_assets")
source_dir = root / "assets/source/comfyui/candidates/regular_tone_v103"
preview_dir = source_dir / "webp_preview"
preview_dir.mkdir(parents=True, exist_ok=True)
jobs = json.loads((root / "assets/source/comfyui/jobs.json").read_text(encoding="utf-8"))["customer_tone_review_v103"]
previous = json.loads((root / "assets/source/comfyui/candidates/regular_tone_v102/webp_preview/manifest.json").read_text(encoding="utf-8"))
previous_by_rank = {asset["rank"].upper(): asset for asset in previous["assets"]}
assets = []
tiles = []

for job in jobs:
    rank = job["id"].split("_")[-2].upper()
    image_path = comfy_output / f"{job['id']}_00001_.png"
    mask_path = comfy_output / f"{job['id']}_mask_00001_.png"
    if not image_path.exists() or not mask_path.exists():
        raise FileNotFoundError(f"ComfyUI image/mask pair is incomplete for {job['id']}")

    image = Image.open(image_path).convert("RGBA")
    mask = Image.open(mask_path).convert("L")
    if image.size != mask.size:
        raise ValueError(f"mask size mismatch: {job['id']}: {image.size} != {mask.size}")
    image.putalpha(mask)

    source = source_dir / f"reaction_{rank.lower()}_v103.png"
    webp = preview_dir / f"reaction_{rank.lower()}_v103.webp"
    image.save(source, optimize=True)
    image.save(webp, format="WEBP", quality=94, method=6)

    workflow = json.loads(Image.open(image_path).info.get("prompt", "{}"))
    sampler = next((node["inputs"] for node in workflow.values() if node.get("class_type") == "KSampler"), {})
    loras = [
        {"name": node["inputs"]["lora_name"], "strength": node["inputs"]["strength_model"]}
        for node in workflow.values() if node.get("class_type") == "LoraLoaderModelOnly"
    ]
    asset = {
        "id": job["id"],
        "rank": rank,
        "path": webp.relative_to(root).as_posix(),
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
        "reviewNote": "Low-denoise ComfyUI img2img candidate based on the corresponding current v05 regular-customer reaction. Compare identity, expression tone, face position, transparent crop, and consistency against all six ranks before selecting. Not approved for release.",
        "licenseNote": "Model and LoRA training-data rights remain pending; do not publish.",
    }
    assets.append(asset)

    current = Image.open(root / f"public/assets/game/characters/regular/v05/{rank.lower()}.webp").convert("RGBA")
    prior_path = root / previous_by_rank[rank]["path"]
    prior = Image.open(prior_path).convert("RGBA")
    for panel, label in ((current, f"Current v05 {rank}"), (prior, f"ComfyUI + LoRA v102 {rank}"), (image, f"ComfyUI img2img v103 {rank}")):
        cell = Image.new("RGB", (512, 560), "white")
        panel.thumbnail((490, 490), Image.Resampling.LANCZOS)
        cell.paste(panel, ((512 - panel.width) // 2, 10), panel)
        ImageDraw.Draw(cell).text((12, 525), label, fill="black")
        tiles.append(cell)

manifest = {
    "schema": "katsumeshi-comfy-character-candidate-manifest/v1",
    "generatedAt": "2026-11-23",
    "status": "concept_review",
    "sourceWorkflow": "assets/source/comfyui/jobs.json#customer_tone_review_v103",
    "workflowNote": "Img2img uses the exact current v05 character PNG, VAEEncode, denoise 0.30/0.36, and the existing anima-style LoRA. This job set contains character assets only.",
    "assets": assets,
}
(source_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

sheet = Image.new("RGB", (1536, 1120), (235, 235, 235))
for index, tile in enumerate(tiles):
    sheet.paste(tile, ((index % 3) * 512, (index // 3) * 560))
sheet.save(root / "artifacts/regular_low_rank_review_v103.jpg", quality=92)
print("exported:", [(asset["rank"], asset["width"], asset["height"], asset["denoise"], asset["loraList"]) for asset in assets])
