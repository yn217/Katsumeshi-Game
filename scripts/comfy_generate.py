"""Queue character-only Katsumeshi generations on the local ComfyUI (127.0.0.1:8189).

Recipe taken from output/town_game (koharu_rikka) PNG metadata:
  Anima-Base-v1.0 + qwen_3_06b_base (qwen_image) + qwen_image_vae
  LoRA chain: Koharu-Koharu-epoch100 @0.8 -> anima-style-epoch35-lr5e5 @0.8
  euler / simple, 24 steps, CFG 4.5, birefnet background removal for sprites.
The original denim-overalls outfit is intentionally NOT reused.

usage: python scripts/comfy_generate.py <character_job_set> [--only id1,id2]
"""
import json, sys, time, urllib.request

HOST = "http://127.0.0.1:8189"
PRESETS = json.load(open(__file__.replace("comfy_generate.py", "../assets/source/comfyui/presets.json"), encoding="utf-8"))


def workflow(job):
    preset = PRESETS["presets"][job["preset"]]
    loras = preset.get("loras", [])
    wf = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": preset.get("unet", PRESETS["base"]["unet"]), "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": PRESETS["base"]["clip"], "type": "qwen_image"}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": preset["prefix"] + job["prompt"]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": preset["negative"] + job.get("negative_extra", "")}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": job["w"], "height": job["h"], "batch_size": 1}},
        "9": {"class_type": "VAELoader", "inputs": {"vae_name": PRESETS["base"]["vae"]}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["9", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": f"town_game_assets/{job['id']}"}},
    }
    model = ["1", 0]
    for i, (name, strength) in enumerate(loras):
        nid = str(30 + i)
        wf[nid] = {"class_type": "LoraLoaderModelOnly", "inputs": {"model": model, "lora_name": name, "strength_model": strength}}
        model = [nid, 0]
    s = PRESETS["base"]["sampler"]
    wf["8"] = {"class_type": "KSampler", "inputs": {"model": model, "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0],
                                                  "seed": job["seed"], "steps": s["steps"], "cfg": s["cfg"], "sampler_name": s["sampler"],
                                                  "scheduler": s["scheduler"], "denoise": 1.0}}
    if job.get("cutout"):
        wf["12"] = {"class_type": "LoadBackgroundRemovalModel", "inputs": {"bg_removal_name": "birefnet.safetensors"}}
        wf["13"] = {"class_type": "RemoveBackground", "inputs": {"bg_removal_model": ["12", 0], "image": ["10", 0]}}
        wf["14"] = {"class_type": "MaskToImage", "inputs": {"mask": ["13", 0]}}
        wf["15"] = {"class_type": "SaveImage", "inputs": {"images": ["14", 0], "filename_prefix": f"town_game_assets/{job['id']}_mask"}}
    return wf


def post(wf):
    req = urllib.request.Request(HOST + "/prompt", data=json.dumps({"prompt": wf}).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))["prompt_id"]


def wait(ids):
    pending = set(ids)
    while pending:
        time.sleep(3)
        for pid in list(pending):
            h = json.load(urllib.request.urlopen(f"{HOST}/history/{pid}"))
            if pid in h:
                st = h[pid]["status"]["status_str"]
                print(pid[:8], st, flush=True)
                pending.discard(pid)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: python scripts/comfy_generate.py <character_job_set> [--only id1,id2]")
    job_set = sys.argv[1]
    allowed_job_sets = {"test", "owner", "customers", "owner_reference", "owner_reference_back"}
    if job_set not in allowed_job_sets:
        raise SystemExit(f"ComfyUI generation is restricted to character assets; disabled set: {job_set}")
    all_jobs = json.load(open(__file__.replace("comfy_generate.py", "../assets/source/comfyui/jobs.json"), encoding="utf-8"))
    jobs = all_jobs[job_set]
    if not jobs or any(not (job["id"].startswith("char_") or job["id"].startswith("test_owner_")) for job in jobs):
        raise SystemExit(f"Refusing non-character generation jobs in set: {job_set}")
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    ids = []
    for job in jobs:
        if only and job["id"] not in only:
            continue
        ids.append(post(workflow(job)))
        print("queued", job["id"], flush=True)
    wait(ids)
