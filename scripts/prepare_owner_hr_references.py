"""Prepare white-background owner references at the 1536x2048 character-master canvas."""
from pathlib import Path

from PIL import Image, ImageOps

comfy_root = Path(r"F:\Stable Diffusion\ComfyUI-Windows\ComfyUI_windows_portable\ComfyUI")
output_dir = comfy_root / "output/town_game_assets"
input_dir = comfy_root / "input"
jobs = {
    "shop": "char_owner_shop_full_front_v001_00001_.png",
    "casual": "char_owner_casual_full_front_v001_00001_.png",
}
target = (1536, 2048)

for outfit, filename in jobs.items():
    source_path = output_dir / filename
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    source = Image.open(source_path).convert("RGB")
    contained = ImageOps.contain(source, target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", target, "white")
    canvas.paste(contained, ((target[0] - contained.width) // 2, (target[1] - contained.height) // 2))
    destination = input_dir / f"katsumeshi_owner_{outfit}_full_v001_reference_1536x2048.png"
    canvas.save(destination, optimize=True)
    print(f"{outfit}: {source.width}x{source.height} -> {canvas.width}x{canvas.height}; content={contained.width}x{contained.height}; {destination}")
