import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source/imagegen/chatgpt/v07'
PUBLIC=ROOT/'public/assets/game'
STYLE_REF='assets/source/imagegen/chatgpt/v07/backgrounds/shop_diner_anime_chatgpt_v01.png'
PROMPTS=json.loads((SOURCE/'prompts.json').read_text(encoding='utf-8'))['assets']
LICENSE=('ChatGPT image output. Under OpenAI Terms of Use, the user owns output to the extent permitted by applicable law and is responsible for input rights. '
         'Human review of third-party rights and appropriateness remains pending; this asset is not approved for release.')
ASSETS=[
 ('tool_meat_mallet_chatgpt_v07','tools','cooking/v07/tools/meat_mallet_chatgpt_v07.webp','Small wooden meat-tenderizing mallet with short handle and square textured striking head; whole object diagonally in three-quarter view, centered with transparent margin.'),
 ('tool_breading_tray_chatgpt_v07','tools','cooking/v07/tools/breading_tray_chatgpt_v07.webp','Shallow rectangular stainless-steel breading tray viewed from a gentle three-quarter overhead angle, filled with coarse golden panko flakes; whole tray centered with transparent margin.'),
 ('tool_sauce_ladle_chatgpt_v07','tools','cooking/v07/tools/sauce_ladle_chatgpt_v07.webp','Small stainless-steel sauce ladle with round bowl holding a little glossy dark-brown demi-glace-style sauce, handle fully visible, placed diagonally and centered with transparent margin.'),
 ('tool_cabbage_pot_chatgpt_v07','tools','cooking/v07/tools/cabbage_pot_chatgpt_v07.webp','Small stainless-steel pot with two side handles containing clear hot water and a few soft pale-green boiled cabbage leaves, visibly wilted and cooked, not raw lettuce; whole pot in gentle three-quarter overhead view with transparent margin.'),
 ('tool_rice_paddle_chatgpt_v07','tools','cooking/v07/tools/rice_paddle_chatgpt_v07.webp','Simple light-brown wooden rice paddle, broad flat rounded paddle head and short handle, entire object visible from a gentle three-quarter overhead angle, placed diagonally with transparent margin.'),
 ('equipment_fryer_chatgpt_v07','equipment','equipment/v07/fryer_chatgpt_v07.webp','Compact countertop stainless-steel deep fryer with one rectangular oil vat and one wire basket with short handle, clear front three-quarter angle, complete object centered with transparent margin.'),
 ('equipment_chair_chatgpt_v07','equipment','equipment/v07/chair_chatgpt_v07.webp','Single sturdy wooden dining chair for a small Japanese diner, warm medium-brown frame and muted deep-red upholstered seat, complete chair visible from front three-quarter angle with transparent margin.'),
]
REVIEW_NOTES={
 'tool_meat_mallet_chatgpt_v07':"Contact-sheet visual review found the mallet silhouette and striking head recognizable at the sheet's display scale; in-game size and composition are still pending.",
 'tool_breading_tray_chatgpt_v07':"Contact-sheet visual review found the tray and panko readable at the sheet's display scale; in-game size and composition are still pending.",
 'tool_sauce_ladle_chatgpt_v07':"Contact-sheet visual review found the ladle and sauce readable at the sheet's display scale; in-game size and composition are still pending.",
 'tool_cabbage_pot_chatgpt_v07':"Contact-sheet visual review found the pot and cooked cabbage readable at the sheet's display scale; in-game size and composition are still pending.",
 'tool_rice_paddle_chatgpt_v07':"Contact-sheet visual review found the rice paddle silhouette readable at the sheet's display scale; in-game size and composition are still pending.",
 'equipment_fryer_chatgpt_v07':"Contact-sheet visual review found the fryer and basket recognizable at the sheet's display scale; in-game size and composition are still pending.",
 'equipment_chair_chatgpt_v07':"Contact-sheet visual review found the chair silhouette and seat readable at the sheet's display scale; in-game size and composition are still pending.",
}

records=[]
for asset_id,kind,relative,description in ASSETS:
 filename=relative.rsplit('/',1)[-1]
 source=SOURCE/kind/(filename.replace('.webp','.png'))
 with Image.open(source) as original:
  source_width,source_height=original.size
  image=original.convert('RGBA')
 if image.getchannel('A').getextrema()[0]!=0:
  raise ValueError(f'{source} has no fully transparent pixels')
 image.thumbnail((920,920),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(1024,1024),(0,0,0,0))
 canvas.alpha_composite(image,((1024-image.width)//2,(1024-image.height)//2))
 alpha_bounds=canvas.getchannel('A').getbbox()
 transparent_margin=[alpha_bounds[0],alpha_bounds[1],1024-alpha_bounds[2],1024-alpha_bounds[3]]
 out=PUBLIC/relative
 out.parent.mkdir(parents=True,exist_ok=True)
 canvas.save(out,'WEBP',quality=94,method=6)
 prompt=PROMPTS[asset_id]
 records.append({'id':asset_id,'path':('public/assets/game/'+relative),'sourceImage':source.relative_to(ROOT).as_posix(),'sourceWidth':source_width,'sourceHeight':source_height,'sourceWorkflow':'ChatGPT built-in image generation; style reference and prompt recorded in this manifest.','styleReference':STYLE_REF,'prompt':prompt,'type':'equipment' if kind=='equipment' else 'cooking_tool','width':1024,'height':1024,'transparentMarginPx':transparent_margin,'anchorX':0.5,'anchorY':0.9 if kind=='equipment' else 0.5,'scaleHint':1.0,'tags':['chatgpt','anime','transparent',kind],'status':'concept_review','generationSeed':None,'model':'ChatGPT built-in image generation','loraList':[],'licenseNote':LICENSE,'licenseReference':'https://openai.com/policies/terms-of-use/','reviewNote':'Recreated in hand-painted 2D style to match v07 backgrounds. '+REVIEW_NOTES[asset_id],'reviewedAt':'2026-11-23'})
for kind in ('tools','equipment'):
 subset=[a for a in records if ('cooking_tool' if kind=='tools' else 'equipment')==a['type']]
 manifest={'schema':'katsumeshi-chatgpt-'+('cooking-tools' if kind=='tools' else 'equipment')+'-manifest/v1','version':'v07','generatedAt':'2026-11-23','status':'concept_review','sourceAttribution':'ChatGPT built-in image generation; no ComfyUI generation for non-character assets.','assets':subset,'licenseReference':'https://openai.com/policies/terms-of-use/'}
 path=PUBLIC/('cooking/v07/tools' if kind=='tools' else 'equipment/v07')/'manifest.json'
 path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
root_manifest=PUBLIC/'manifest.json'; data=json.loads(root_manifest.read_text(encoding='utf-8'))
ids={a['id'] for a in records}
data['assets']=[a for a in data['assets'] if a.get('id') not in ids]+records
root_manifest.write_text(json.dumps(data,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
print('imported',len(records),'ChatGPT v07 icons')
