import json
from pathlib import Path
from PIL import Image, ImageDraw
root=Path.cwd(); out=Path(r'F:\Stable Diffusion\ComfyUI-Windows\ComfyUI_windows_portable\ComfyUI\output\town_game_assets')
srcdir=root/'assets/source/comfyui/candidates/regular_tone_v102'; candidate_dir=srcdir/'webp_preview'
jobs=json.loads((root/'assets/source/comfyui/jobs.json').read_text(encoding='utf-8'))['customer_tone_review_v102']
assets=[]; tiles=[]
for job in jobs:
 jid=job['id']; rank=jid.split('_')[-2]
 image_path=out/f'{jid}_00001_.png'; mask_path=out/f'{jid}_mask_00001_.png'
 im=Image.open(image_path).convert('RGBA'); mask=Image.open(mask_path).convert('L')
 if im.size!=mask.size: raise ValueError(f'mask size mismatch: {jid}')
 im.putalpha(mask); source=srcdir/f'{jid}.png'; im.save(source,optimize=True)
 webp=candidate_dir/f'reaction_{rank}_v102.webp'; candidate_dir.mkdir(parents=True,exist_ok=True); im.save(webp,format='WEBP',quality=94,method=6)
 workflow=json.loads(Image.open(image_path).info.get('prompt','{}'))
 sampler=next((n['inputs'] for n in workflow.values() if n.get('class_type')=='KSampler'),{})
 loras=[{'name':n['inputs']['lora_name'],'strength':n['inputs']['strength_model']} for n in workflow.values() if n.get('class_type')=='LoraLoaderModelOnly']
 assets.append({'id':jid,'rank':rank.upper(),'path':webp.relative_to(root).as_posix(),'sourceImage':source.relative_to(root).as_posix(),'sourceMask':f'ComfyUI output/town_game_assets/{jid}_mask_00001_.png','width':im.width,'height':im.height,'seed':sampler.get('seed'),'model':next((n['inputs'].get('unet_name') for n in workflow.values() if n.get('class_type')=='UNETLoader'),None),'loraList':loras,'prompt':job['prompt'],'negativePromptExtra':job.get('negative_extra',''),'status':'concept_review','reviewNote':'Alternative low-rank expression candidate. Not connected to runtime. Compare identity, low-rank tone, transparency, and framing before selection.','licenseNote':'Model and LoRA training-data rights remain pending; do not publish.'})
 current=Image.open(root/f'public/assets/game/characters/regular/v05/{rank}.webp').convert('RGBA')
 for img,label in [(current,f'Current regular {rank.upper()}'),(im,f'ComfyUI + LoRA candidate {rank.upper()} v102')]:
  cell=Image.new('RGB',(512,560),'white'); img.thumbnail((490,490),Image.Resampling.LANCZOS); cell.paste(img,((512-img.width)//2,10),img); ImageDraw.Draw(cell).text((12,525),label,fill='black'); tiles.append(cell)
manifest={'schema':'katsumeshi-comfy-character-candidate-manifest/v1','generatedAt':'2026-11-23','status':'concept_review','sourceWorkflow':'assets/source/comfyui/jobs.json#customer_tone_review_v102','assets':assets}
candidate_dir.mkdir(parents=True,exist_ok=True); (candidate_dir/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sheet=Image.new('RGB',(2048,560),(235,235,235))
for i,t in enumerate(tiles): sheet.paste(t,((i%4)*512,(i//4)*560))
sheet.save(root/'artifacts/regular_low_rank_review_v102.jpg',quality=92)
print('exported:',[(a['rank'],a['path'],a['width'],a['height'],a['loraList']) for a in assets])
