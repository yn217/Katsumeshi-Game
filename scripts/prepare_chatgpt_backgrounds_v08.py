"""Create exact 2560x1440 runtime derivatives from active ChatGPT v07 backgrounds."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_MANIFEST = ROOT / "public/assets/game/backgrounds/v07/manifest.json"
DEST_MANIFEST = ROOT / "public/assets/game/backgrounds/v08/manifest.json"
DEST_DIR = ROOT / "public/assets/game/backgrounds/v08"
TARGET_SIZE = (2560, 1440)
TARGET_IDS = {
    "morning_prep_anime_chatgpt_v01",
    "kitchen_frying_anime_chatgpt_v01",
    "tasting_interior_anime_chatgpt_v01",
    "result_evening_anime_chatgpt_v01",
}
# The former eye-level shop background is intentionally excluded; the active shop
# screen uses the separate diagonal-overview candidate from v08.

source_manifest = json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
dest_manifest = json.loads(DEST_MANIFEST.read_text(encoding="utf-8"))
dest_manifest["version"] = "v08"
dest_manifest["sourceAttribution"] = "ChatGPT built-in image generation; v07 source images resized for 2560x1440 runtime."
assets_by_id = {asset["id"]: asset for asset in dest_manifest.get("assets", [])}

for original in source_manifest["assets"]:
    if original["id"] not in TARGET_IDS:
        continue
    source_path = ROOT / original["sourceImage"]
    filename = Path(original["path"]).name
    output_path = DEST_DIR / filename
    with Image.open(source_path) as opened:
        source_width, source_height = opened.size
        if abs(source_width / source_height - 16 / 9) > 0.002:
            raise ValueError(f"Expected a 16:9 source image, got {source_width}x{source_height}: {source_path}")
        opened.convert("RGB").resize(TARGET_SIZE, Image.Resampling.LANCZOS).save(
            output_path, "WEBP", quality=92, method=6
        )

    asset = dict(original)
    asset.update({
        "id": f"{original['id']}_runtime_v08",
        "path": output_path.relative_to(ROOT).as_posix(),
        "sourceImage": source_path.relative_to(ROOT).as_posix(),
        "width": TARGET_SIZE[0],
        "height": TARGET_SIZE[1],
        "sourceWidth": source_width,
        "sourceHeight": source_height,
        "resampling": "Lanczos upscale; exact runtime dimensions do not restore source detail",
        "derivedFrom": original["id"],
        "status": "concept_review",
        "reviewNote": "Runtime output resized to 2560x1440 from the 1672x941 source; native detail remains below specification. Preserve source prompt and image; review screen composition and distribution rights before approval.",
        "reviewedAt": None,
    })
    assets_by_id[asset["id"]] = asset

if TARGET_IDS - {asset["id"] for asset in source_manifest["assets"]}:
    raise ValueError("One or more expected v07 background assets are missing")

dest_manifest["assets"] = list(assets_by_id.values())
DEST_MANIFEST.write_text(json.dumps(dest_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Prepared {len(TARGET_IDS)} 2560x1440 background derivatives in {DEST_DIR.relative_to(ROOT)}")
