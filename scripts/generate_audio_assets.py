from __future__ import annotations
import json
import math
import struct
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100

# Eight-bar loops in C/G/A/F-centered pentatonic palettes, arranged for a gentle diner game.
TRACKS = {
    "title": {"bpm": 88, "tonic": 60, "chords": [[0,4,7,11],[9,12,16,19],[5,9,12,16],[7,11,14,17]], "melody": [0,2,4,7,9,7,4,2], "mode":"calm"},
    "shop": {"bpm": 106, "tonic": 62, "chords": [[0,4,7,11],[7,11,14,17],[5,9,12,16],[2,6,9,12]], "melody": [0,2,4,7,9,7,4,2], "mode":"bright"},
    "cooking": {"bpm": 116, "tonic": 57, "chords": [[0,3,7,10],[5,8,12,15],[10,14,17,21],[3,7,10,14]], "melody": [0,3,5,7,10,7,5,3], "mode":"playful"},
    "result": {"bpm": 78, "tonic": 65, "chords": [[0,4,7,11],[7,11,14,17],[9,12,16,19],[2,5,9,12]], "melody": [0,2,4,7,9,7,4,2], "mode":"soft"},
}

def midi_hz(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))

def envelope(t: np.ndarray, duration: float, attack: float, release: float) -> np.ndarray:
    a = np.minimum(1.0, t / max(attack, 1e-4))
    r = np.minimum(1.0, np.maximum(0.0, (duration - t) / max(release, 1e-4)))
    return np.minimum(a, r)

def note_wave(freq: float, duration: float, kind: str, velocity: float, detune: float=0.0) -> np.ndarray:
    count = max(1, int(round(duration * RATE)))
    t = np.arange(count, dtype=np.float64) / RATE
    if kind == "pad":
        env = envelope(t, duration, 0.14, 0.32) * 0.72
        sig = np.sin(2*np.pi*freq*t) + 0.16*np.sin(2*np.pi*freq*2.01*t)
        sig *= (0.92 + 0.08*np.sin(2*np.pi*0.22*t))
    elif kind == "bass":
        env = envelope(t, duration, 0.015, 0.12) * np.exp(-t*0.45)
        sig = np.sin(2*np.pi*freq*t) + 0.12*np.sin(2*np.pi*freq*2*t)
    else:  # warm plucked mallet
        env = np.exp(-t*(3.8 if kind == "pluck" else 5.5)) * envelope(t,duration,0.004,0.05)
        sig = np.sin(2*np.pi*freq*t) + 0.32*np.sin(2*np.pi*freq*2.0*t) + 0.12*np.sin(2*np.pi*freq*3.01*t)
        sig *= (0.98 + 0.02*np.sin(2*np.pi*(2.0+detune)*t))
    return sig * env * velocity

def add_event(stereo: np.ndarray, start: float, freq: float, duration: float, kind: str, velocity: float, pan: float=0.0):
    left = max(0, int(start * RATE)); right=min(len(stereo), left+int(duration*RATE))
    if right <= left: return
    sig=note_wave(freq,(right-left)/RATE,kind,velocity)
    p=max(-1.0,min(1.0,pan)); stereo[left:right,0]+=sig*math.sqrt((1-p)*0.5); stereo[left:right,1]+=sig*math.sqrt((1+p)*0.5)

def normalized(audio: np.ndarray) -> np.ndarray:
    peak=float(np.max(np.abs(audio))) if audio.size else 0
    return audio*(0.88/peak) if peak>0 else audio

def write_wav(path: Path, audio: np.ndarray):
    pcm=np.clip(normalized(audio),-1,1)
    pcm=(pcm*32767).astype('<i2')
    path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())

def make_bgm(name: str, spec: dict) -> np.ndarray:
    beat=60/spec['bpm']; duration=32*beat
    out=np.zeros((int(duration*RATE),2),dtype=np.float64)
    chords=spec['chords']; tonic=spec['tonic']; mode=spec['mode']
    chord_step=4*beat
    # sustained soft chord bed; octave voicing kept low so text and fry sounds remain clear
    pad_gain={"calm":0.022,"bright":0.016,"playful":0.012,"soft":0.024}[mode]
    for bar in range(8):
        c=chords[bar%len(chords)];start=bar*chord_step
        for j,interval in enumerate(c):
            add_event(out,start,midi_hz(tonic+interval-12),chord_step,pad_gain and "pad",pad_gain*(0.95 if j<3 else 0.55),pan=(j-1.5)*0.22)
    # rounded bass root on beats 1 and 3
    for bar in range(8):
        root=tonic+chords[bar%len(chords)][0]-24
        for b in (0,2): add_event(out,bar*chord_step+b*beat,midi_hz(root),1.6*beat,"bass",0.085,pan=-0.12)
    # eight-note motif on a pentatonic scale; vary phrase at the end of each two-bar group
    melody=spec['melody']; interval=beat/2
    for k in range(64):
        bar=k//8; step=k%8; chord=chords[bar%len(chords)]
        degree=melody[(step+(bar%2)*2)%len(melody)]
        # Root-relative pentatonic figure adapted to each bar's chord root.
        note=tonic+chord[0]+degree+12
        if step in (2,6): note-=12
        if name=="cooking" and step in (3,7): continue
        if name=="result" and step in (1,3,5,7): continue
        when=k*interval
        dur=(0.42 if name=="result" else 0.34)*beat
        velocity={"calm":0.040,"bright":0.045,"playful":0.050,"soft":0.031}[mode]
        pan=(-0.22 if k%2==0 else 0.22)
        add_event(out,when,midi_hz(note),min(dur,duration-when),"pluck",velocity,pan)
    # soft woodblock pulse on selected beats; no drums in the quieter result track
    if name in ("shop","cooking"):
        rng=np.random.default_rng(21 if name=="shop" else 37)
        for bar in range(8):
            for b in (1,3):
                start=(bar*4+b)*beat
                n=int(0.045*RATE);t=np.arange(n)/RATE
                noise=rng.normal(0,1,n)*np.exp(-t*65)*0.008
                a=max(0,int(start*RATE));z=min(len(out),a+n)
                if z>a:out[a:z,0]+=noise[:z-a]*0.7;out[a:z,1]+=noise[:z-a]*0.7
    return out

def add_sfx_note(out, start, midi, duration, velocity=0.22, kind="pluck", pan=0):
    add_event(out,start,midi_hz(midi),duration,kind,velocity,pan)

def make_chime(notes, lengths, gaps=None, base=0.0, velocity=0.2):
    if gaps is None:gaps=[0.0]*len(notes)
    total=base+sum(lengths)+sum(gaps)+0.2
    out=np.zeros((int(total*RATE),2),dtype=np.float64);t=base
    for i,(n,d) in enumerate(zip(notes,lengths)):
        add_sfx_note(out,t,n,d,velocity,"pluck",(-0.2 if i%2 else 0.2));t+=d+gaps[i]
    return out

def make_click():
    n=int(0.09*RATE);t=np.arange(n)/RATE;rng=np.random.default_rng(4)
    noise=rng.normal(0,1,n)*np.exp(-t*70);body=np.sin(2*np.pi*(700-220*t)*t)*np.exp(-t*48)
    sig=0.07*noise+0.06*body;return np.column_stack((sig,sig))

def make_fry():
    duration=1.8;n=int(duration*RATE);t=np.arange(n)/RATE;rng=np.random.default_rng(117)
    raw=rng.normal(0,1,n)
    # One-pole smoothing creates an oil sizzle bed rather than a pitched alert tone.
    smooth=np.empty_like(raw);alpha=0.84;smooth[0]=raw[0]
    for i in range(1,n):smooth[i]=alpha*smooth[i-1]+(1-alpha)*raw[i]
    bubble=np.zeros(n)
    for when,amp in [(0.12,.18),(.38,.12),(.71,.2),(1.01,.14),(1.43,.17),(1.67,.1)]:
        a=int(when*RATE);length=int(.06*RATE);tt=np.arange(length)/RATE
        z=min(n,a+length);bubble[a:z]+=amp*np.sin(2*np.pi*(850-400*tt[:z-a])*tt[:z-a])*np.exp(-tt[:z-a]*52)
    sig=(smooth*.025+bubble)*0.42
    # Fade a few milliseconds at the seam for clean looping.
    fade=int(.04*RATE);sig[:fade]*=np.linspace(0,1,fade);sig[-fade:]*=np.linspace(1,0,fade)
    return np.column_stack((sig,sig))

SE={
 'click':make_click,
 'purchase':lambda:make_chime([72,76,79],[.14,.15,.24],[.02,.02,0],velocity=.18),
 'serve':lambda:make_chime([74,79,83],[.2,.2,.34],[.025,.025,0],velocity=.18),
 'rank_sss':lambda:make_chime([76,79,83,88,91],[.16,.16,.16,.18,.5],[.025,.025,.025,.035,0],velocity=.2),
 'rank_s':lambda:make_chime([74,78,81,86],[.16,.17,.22,.35],[.02,.02,.03,0],velocity=.18),
 'rank_a':lambda:make_chime([72,76,79],[.17,.18,.3],[.025,.03,0],velocity=.17),
 'rank_b':lambda:make_chime([69,72,76],[.18,.18,.27],[.03,.03,0],velocity=.15),
 'rank_c':lambda:make_chime([67,71,69],[.19,.19,.3],[.03,.03,0],velocity=.14),
 'rank_f':lambda:make_chime([64,60],[.22,.34],[.05,0],velocity=.13),
 'error':lambda:make_chime([57,53],[.14,.22],[.035,0],velocity=.13),
 'fry':make_fry,
}

def main():
    source=ROOT/'assets/source/audio/v03';runtime=ROOT/'public/assets/game/audio'
    records=[]
    for name,spec in TRACKS.items():
        audio=make_bgm(name,spec)
        duration=len(audio)/RATE
        src=source/'bgm'/f'bgm_{name}_v03.wav';src.parent.mkdir(parents=True,exist_ok=True);write_wav(src,audio)
        out=runtime/'bgm'/f'bgm_{name}_v03.wav';out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(src.read_bytes())
        records.append({'id':f'bgm_{name}_v03','path':out.relative_to(ROOT).as_posix(),'category':'bgm','durationSeconds':round(duration,3),'sampleRate':RATE,'channels':2,'format':'wav-pcm16','loop':True,'status':'concept_review','source':src.relative_to(ROOT).as_posix(),'generationMethod':'Original procedural synthesis from scripts/generate_audio_assets.py; no third-party samples.'})
    for name,fn in SE.items():
        audio=fn();duration=len(audio)/RATE
        src=source/'se'/f'se_{name}_v03.wav';src.parent.mkdir(parents=True,exist_ok=True);write_wav(src,audio)
        out=runtime/'se'/f'se_{name}_v03.wav';out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(src.read_bytes())
        records.append({'id':f'se_{name}_v03','path':out.relative_to(ROOT).as_posix(),'category':'se','durationSeconds':round(duration,3),'sampleRate':RATE,'channels':2,'format':'wav-pcm16','loop':name=='fry','status':'concept_review','source':src.relative_to(ROOT).as_posix(),'generationMethod':'Original procedural synthesis from scripts/generate_audio_assets.py; no third-party samples.'})
    for item in records:
        item.update({'width':0,'height':0,'anchorX':0.5,'anchorY':0.5,'scaleHint':1.0,'tags':['audio',item['category'],item['id'].replace('_v03','')],'sourceWorkflow':f"assets/source/audio/v03/design.json#{item['id']}",'generationSeed':None,'model':None,'loraList':[],'licenseNote':'Original project synthesis; no external samples. Review listening quality before final release.','reviewedAt':None})
    manifest={'schema':'katsumeshi-audio-manifest/v1','version':'v03','generatedAt':'2026-11-22','status':'concept_review','sourceAttribution':'Original synthesized PCM is stored as WAV masters and WAV runtime files; no sampled or external music used.','files':records}
    (runtime/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    tracks={'bgm_title':'Quiet, warm plucked melody and soft sustained chords; 8-bar 88 BPM loop.','bgm_shop':'Light, buoyant melody with soft woodblock pulse; 8-bar 106 BPM loop.','bgm_cooking':'Playful restrained motif with lighter percussion to leave room for frying sound; 8-bar 116 BPM loop.','bgm_result':'Slow, calm resolution loop; 8-bar 78 BPM.'}
    sfx={'se_click':'Short soft wood-like tap.','se_purchase':'Three ascending chime notes.','se_fry':'Soft noise and tiny bubbles, 1.8-second loop.','se_serve':'Short ascending service chime.','se_rank_sss':'Five-note fanfare.','se_rank_s':'Four-note bright chime.','se_rank_a':'Three-note chime.','se_rank_b':'Three-note modest chime.','se_rank_c':'Short descending response.','se_rank_f':'Low two-note response.','se_error':'Quiet low two-note error cue.'}
    design={'schema':'katsumeshi-audio-source/v1','version':'v03','generatedAt':'2026-11-22','generator':'scripts/generate_audio_assets.py','method':'Original procedural synthesis with Python and NumPy; no external recordings, loops, soundfont, or third-party samples. Masters are 44.1 kHz stereo PCM16 WAV.','tracks':tracks,'sfx':sfx,'assets':records}
    (source/'design.json').write_text(json.dumps(design,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    shared=ROOT/'public/assets/game/manifest.json'
    root_manifest=json.loads(shared.read_text(encoding='utf-8'))
    ids={item['id'] for item in records}
    root_manifest['assets']=[item for item in root_manifest['assets'] if item.get('id') not in ids]
    root_manifest['assets'].extend(records)
    shared.write_text(json.dumps(root_manifest,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    print(f'generated {len(records)} audio assets')
if __name__=='__main__':main()
