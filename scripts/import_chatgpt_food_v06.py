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
GENERATION_PROMPTS = [
    "Create one precise game-art asset contact sheet for a Japanese restaurant management game. Seven separate objects in an exact clean 4-column by 2-row grid with equal cell sizes and large empty gutters. Each object centered fully inside its own cell and not touching the gutters. Top row left to right: (1) one thin flattened raw beef cutlet, (2) same thin beef cutlet evenly coated in pale flour and egg, (3) coarse golden Japanese panko crumbs in a small neat pile, (4) one thin breaded beef cutlet frying in oil shown as a single isolated cutlet with a few tiny bubbles only. Bottom row left to right: (5) glossy dark demi-glace sauce in a small ceramic bowl, no food; (6) softly boiled pale-green shredded cabbage in a small neat serving, no plate; (7) a small fluffy mound of steamed white rice, no bowl. Leave bottom-right cell empty and transparent. All seven objects must be separate, no plate with assembled meal, no katsumeshi, no rice under cutlet, no finished dish. Consistent polished hand-painted 2D anime game illustration, warm soft cel shading, detailed but readable as small 256px inventory icons. No text, labels, borders, panels, numbers, people, hands, logos or watermark. Transparent background.",
    "Edit the supplied transparent food asset sheet. Preserve its exact transparent background, 4 by 2 grid, object positions, spacing, and object identities. Redraw every food object as polished illustrated 2D anime game art that matches a warm Japanese restaurant game: hand-drawn dark-brown contour lines, simplified painterly forms, clear soft cel shading, matte surfaces, low contrast tiny details, warm cream and muted amber/green/brown palette. It must look drawn, not photographed or rendered in 3D. Specifically remove realistic photographic meat grain and excessive glossy specular reflections. Keep raw flattened beef clearly raw, panko flakes discernible, thin breaded cutlet clearly golden, boiled cabbage softly cooked pale green, dark sauce in its bowl, rice fluffy white. Maintain one separate icon per cell and the empty lower-right cell. Do not add any plate, meal composition, text, border, shadow halo, white background, checkerboard, labels, people, logos. Keep edge pixels clean with true transparency around every icon.",
    "Keep every illustrated food item exactly as it is and keep its current position and 4x2 grid. Remove the gray checkerboard completely and replace it with genuine transparent pixels (alpha 0). Do not draw any checkerboard, white backdrop, floor shadow, halo, panels, outlines around the sheet, or any new elements. Preserve the dark brown outlines and colors of each food item. Keep the lower-right cell empty and transparent. Output as a transparent PNG.",
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
        "generationPrompts": GENERATION_PROMPTS,
        "charactersIncluded": False,
        "reviewNotes": "Seven independent cells visually checked. No plated katsumeshi or completed dish is included. Confirm visual fit and scale in game before approval.",
        "files": assets,
    }
    (RUNTIME_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
