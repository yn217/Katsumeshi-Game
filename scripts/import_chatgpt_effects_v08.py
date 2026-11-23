"""Normalize ChatGPT-generated transparent effects into 512px runtime assets."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/source/imagegen/chatgpt/v08/effects"
RUNTIME_DIR = ROOT / "public/assets/game/effects/v04"
PROMPT_FILE = SOURCE_DIR / "prompts.json"
PROMPTS = json.loads(PROMPT_FILE.read_text(encoding="utf-8"))
OUTPUT_SIZE = 512
MAX_CONTENT = 416
ALPHA_CROP_THRESHOLD = 4
ALPHA_NOISE_CUTOFF = 2
LICENSE_NOTE = (
    "ChatGPT image output. Under OpenAI Terms of Use, the user owns output to the extent "
    "permitted by applicable law and is responsible for input rights. Human review of "
    "third-party rights and appropriateness remains pending; this asset is not approved for release."
)
REVIEW_NOTES = {
    "steam_wisps": "Contact-sheet review: delicate upward steam strands remain visually separate from the transparent background.",
    "frying_sizzle": "Contact-sheet review: compact bubbles and droplets are readable as a gentle frying effect.",
    "golden_sparkle": "Contact-sheet review: the golden glints form a clear arc and leave the center open for the SSS badge.",
}

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
assets = []
for item in PROMPTS["assets"]:
    source = SOURCE_DIR / item["sourceFile"]
    runtime = RUNTIME_DIR / item["runtimeFile"]
    with Image.open(source) as opened:
        image = opened.convert("RGBA")
    alpha = image.getchannel("A")
    alpha = alpha.point(lambda value: 0 if value <= ALPHA_NOISE_CUTOFF else value)
    image.putalpha(alpha)
    bbox_mask = alpha.point(lambda value: 255 if value > ALPHA_CROP_THRESHOLD else 0)
    bbox = bbox_mask.getbbox()
    if not bbox:
        raise ValueError(f"No visible pixels found in {source}")
    cropped = image.crop(bbox)
    scale = min(MAX_CONTENT / cropped.width, MAX_CONTENT / cropped.height)
    size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    content = cropped.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    xy = ((OUTPUT_SIZE - size[0]) // 2, (OUTPUT_SIZE - size[1]) // 2)
    canvas.alpha_composite(content, xy)
    alpha_bounds = canvas.getchannel("A").getbbox()
    transparent_margin = [
        alpha_bounds[0], alpha_bounds[1],
        OUTPUT_SIZE - alpha_bounds[2], OUTPUT_SIZE - alpha_bounds[3],
    ]
    canvas.save(runtime, "WEBP", lossless=True, method=6)

    assets.append({
        "id": item["id"],
        "path": runtime.relative_to(ROOT).as_posix(),
        "sourceImage": source.relative_to(ROOT).as_posix(),
        "type": "effect",
        "width": OUTPUT_SIZE,
        "height": OUTPUT_SIZE,
        "sourceWidth": image.width,
        "sourceHeight": image.height,
        "contentBBoxSource": list(bbox),
        "transparentMarginPx": transparent_margin,
        "anchorX": 0.5,
        "anchorY": 0.5,
        "scaleHint": 1.0,
        "tags": ["effect", item["name"], "anime", "transparent"],
        "sourceWorkflow": "ChatGPT built-in image generation; prompt in assets/source/imagegen/chatgpt/v08/effects/prompts.json",
        "generationSeed": None,
        "model": "ChatGPT Image Generation",
        "loraList": [],
        "status": "concept_review",
        "licenseNote": LICENSE_NOTE,
        "reviewedAt": "2026-11-23",
        "reviewNote": "Transparent 512x512 runtime sprite, generated at 1254x1254 and fitted inside a 416px box with Lanczos resampling; small alpha noise removed. " + REVIEW_NOTES[item["name"]] + " In-game size/composition, animation, and rights approval remain pending.",
        "licenseReference": "https://openai.com/policies/terms-of-use/",
    })

manifest = {
    "schema": "katsumeshi-chatgpt-effects-manifest/v1",
    "version": "v04-chatgpt",
    "generatedAt": "2026-11-23",
    "status": "concept_review",
    "sourceAttribution": "ChatGPT built-in image generation; no ComfyUI generation for non-character assets.",
    "charactersIncluded": False,
    "normalization": {
        "outputSize": OUTPUT_SIZE,
        "maxContentSize": MAX_CONTENT,
        "sourceAlphaNoiseCutoff": ALPHA_NOISE_CUTOFF,
        "cropAlphaThreshold": ALPHA_CROP_THRESHOLD,
        "resampling": "Lanczos",
        "webp": "lossless",
    },
    "files": assets,
    "licenseReference": "https://openai.com/policies/terms-of-use/",
}
(RUNTIME_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Imported {len(assets)} effects into {RUNTIME_DIR.relative_to(ROOT)}")
