"""Split a reviewed ChatGPT food contact sheet into individual game assets."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets/source/imagegen/chatgpt/v06/food"
RUNTIME_DIR = ROOT / "public/assets/game/food/v06"
SOURCE = SOURCE_DIR / "food_contact_sheet_chatgpt_v06.png"
NAMES = [
    "raw_beef_flattened",
    "breaded_beef",
    "panko_crumbs",
    "fried_cutlet",
    "demi_glace_sauce",
    "boiled_cabbage",
    "steamed_rice",
]


def main() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as sheet:
        sheet = sheet.convert("RGBA")
        if sheet.size != (1774, 887):
            raise ValueError(f"Unexpected generated sheet dimensions: {sheet.size}")
        assets = []
        for index, name in enumerate(NAMES):
            row, col = divmod(index, 4)
            x0, x1 = round(col * sheet.width / 4), round((col + 1) * sheet.width / 4)
            y0, y1 = round(row * sheet.height / 2), round((row + 1) * sheet.height / 2)
            crop = sheet.crop((x0, y0, x1, y1))
            if crop.getchannel("A").getbbox() is None:
                raise ValueError(f"Empty transparent cell for {name}")
            source_name = f"{name}_chatgpt_v06.png"
            runtime_name = f"{name}_chatgpt_v06.webp"
            crop.save(SOURCE_DIR / source_name, optimize=True)
            runtime_icon = ImageOps.pad(crop, (256, 256), method=Image.Resampling.LANCZOS, color=(0, 0, 0, 0))
            runtime_icon.save(RUNTIME_DIR / runtime_name, "WEBP", quality=94, method=6)
            assets.append({
                "id": f"food_{name}_chatgpt_v06",
                "path": f"public/assets/game/food/v06/{runtime_name}",
                "sourceImage": f"assets/source/imagegen/chatgpt/v06/food/{source_name}",
                "type": "food_ingredient_or_stage",
                "width": runtime_icon.width,
                "height": runtime_icon.height,
                "sourceWidth": crop.width,
                "sourceHeight": crop.height,
                "anchorX": 0.5,
                "anchorY": 0.5,
                "scaleHint": 1.0,
                "status": "concept_review",
                "sourceWorkflow": "ChatGPT built-in image generation; source contact sheet split into equal cells.",
                "licenseNote": "Review applicable distribution terms before release.",
                "reviewedAt": "2026-11-23",
            })

    manifest = {
        "schema": "katsumeshi-asset-manifest/v1",
        "version": "v06",
        "generatedAt": "2026-11-23",
        "status": "concept_review",
        "sourceAttribution": "ChatGPT built-in image generation; illustrated transparent food asset sheet.",
        "generationProcess": [
            "Create a 4x2 transparent contact sheet with seven isolated food and cooking-stage icons in order: flattened raw beef, flour-and-egg-coated beef, panko crumbs, frying breaded cutlet, demi-glace sauce bowl, boiled cabbage, steamed rice; leave the last cell empty; no assembled dish.",
            "Redraw the same objects as hand-drawn 2D anime game art with dark-brown outlines, simplified painterly forms, soft cel shading, matte surfaces, and warm muted colors; preserve the transparent background and grid.",
            "Remove the checkerboard completely to true transparency; preserve the illustrated items and leave the lower-right cell empty.",
        ],
        "charactersIncluded": False,
        "reviewNotes": "Seven independent cells visually checked. No plated katsumeshi or completed dish is included. Confirm visual fit and scale in game before approval.",
        "files": assets,
    }
    (RUNTIME_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
