"""Normalize the ChatGPT P2 breading icon and record its review provenance."""
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/imagegen/chatgpt/v07/food/p2_breaded_beef_chatgpt_v01_source.png"
OUTPUT_DIR = ROOT / "public/assets/game/food/v07"
OUTPUT = OUTPUT_DIR / "breaded_beef_chatgpt_v01.webp"
PROMPT = (
    "Edit the existing isolated game inventory icon. Preserve its single thin flattened oval beef cutlet "
    "silhouette, three-quarter overhead view, centered placement, warm dark-brown outline, and 2D anime game-art style. "
    "Make the cutlet clearly raw meat fully coated in Japanese panko: dense distinct pale-golden coarse crumbs cover every "
    "visible surface, with no pink/red meat and no wet batter patches. It remains uncooked and pale, not fried or orange/brown. "
    "Keep a clean transparent background with no bowl, tray, plate, oil, shadow, text, checkerboard, or extra objects. "
    "Square icon composition for 256px inventory display."
)


def main():
    if not SOURCE.is_file():
        raise SystemExit(f"Missing generated ChatGPT source: {SOURCE}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as opened:
        image = opened.convert("RGBA")
    alpha = image.getchannel("A")
    clean_alpha = alpha.point(lambda value: 255 if value > 1 else 0)
    bbox = clean_alpha.getbbox()
    if not bbox:
        raise SystemExit("Generated icon has no visible pixels")
    image.putalpha(clean_alpha)
    cropped = image.crop(bbox)
    runtime = ImageOps.pad(cropped, (256, 256), method=Image.Resampling.LANCZOS, color=(0, 0, 0, 0))
    runtime.save(OUTPUT, "WEBP", lossless=True, method=6)
    manifest = {
        "schema": "katsumeshi-asset-manifest/v1",
        "version": "v07",
        "generatedAt": "2026-11-23",
        "status": "concept_review",
        "charactersIncluded": False,
        "assets": [{
            "id": "food_p2_breaded_beef_chatgpt_v01",
            "path": "public/assets/game/food/v07/breaded_beef_chatgpt_v01.webp",
            "sourceImage": "assets/source/imagegen/chatgpt/v07/food/p2_breaded_beef_chatgpt_v01_source.png",
            "type": "food_stage_icon",
            "width": runtime.width,
            "height": runtime.height,
            "sourceWidth": image.width,
            "sourceHeight": image.height,
            "sourceAlphaBbox": list(bbox),
            "alphaCleanupThreshold": 1,
            "anchorX": 0.5,
            "anchorY": 0.5,
            "sourceWorkflow": "ChatGPT built-in image generation editing the v06 breaded-beef icon; full prompt in this manifest.",
            "prompt": PROMPT,
            "model": "ChatGPT image generation",
            "loraList": [],
            "status": "concept_review",
            "licenseNote": "ChatGPT image output. Human review of applicable distribution terms and input rights is pending; do not publish.",
            "licenseReference": "https://openai.com/policies/terms-of-use/",
            "reviewedAt": "2026-11-23",
            "reviewNote": "256px comparison: the v07 candidate reads as a fully panko-coated uncooked cutlet and removes the visible pink/wet patches in v06. Silhouette remains clear. Runtime screen fit and rights/adoption approval remain pending; concept_review only.",
        }],
    }
    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} ({runtime.width}x{runtime.height}, concept_review)")


if __name__ == "__main__":
    main()
