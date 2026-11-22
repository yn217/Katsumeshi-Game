import {
  cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME_ASSETS = path.join(ROOT, "public/assets/game");
const mode = process.argv.slice(2).includes("--preview") ? "preview" : "release";
const DIST = path.join(ROOT, mode === "preview" ? "dist-preview" : "dist");
const config = JSON.parse(readFileSync(path.join(ROOT, "spec/mvp_config.json"), "utf8"));
if (config.schema !== "katsumeshi-mvp-config/v0.5") throw Error("Unexpected config version");

const ranks = ["sss", "s", "a", "b", "c", "f"];
const runtimeAssets = [
  "backgrounds/v06/title_riverside_chatgpt_v02.webp",
  "backgrounds/v06/result_evening_chatgpt_v02.webp",
  "backgrounds/v03/day7_evening_v03.webp",
  ...["morning_chatgpt_v01", "shop_chatgpt_v01", "kitchen_frying_chatgpt_v01"]
    .map(name => `backgrounds/${name}.webp`),
  ...["normal", "encourage", "happy", "sad", "surprised", "thinking"]
    .map(name => `characters/owner/v05/emotions/${name}_v01.webp`),
  "characters/owner/v05/shop_full_v01.webp",
  "characters/owner/v05/casual_full_v01.webp",
  ...["regular", "student", "worker", "tourist"].flatMap(type => ranks.map(rank => `characters/${type}/v05/${rank}.webp`)),
  "food/beef_katsumeshi/whole.webp",
  "cooking/fry.webp",
  ...["raw_beef_flattened", "breaded_beef", "panko_crumbs", "fried_cutlet", "demi_glace_sauce", "boiled_cabbage", "steamed_rice"]
    .map(name => `food/v06/${name}_chatgpt_v06.webp`),
  ...["meat_mallet", "sauce_ladle", "cabbage_pot", "rice_paddle"]
    .map(name => `cooking/v03/tools/${name}_v03.webp`),
  "cooking/v04/chatgpt/breading_tray_chatgpt_v01.webp",
  "equipment/v03/fryer_v03.webp",
  "equipment/v03/chair_v03.webp",
  ...["steam_wisps", "frying_sizzle", "golden_sparkle"].map(name => `effects/v03/${name}_v03.webp`),
  ...ranks.map(rank => `ui/ranks/v03/rank_${rank}_badge_v03.webp`),
  "ui/panels/v03/cream_panel_frame_v03.svg",
  ...["title", "shop", "cooking", "result"].map(name => `audio/bgm/bgm_${name}_v03.wav`),
  ...["click", "purchase", "fry", "serve", "error", "rank_sss", "rank_s", "rank_a", "rank_b", "rank_c", "rank_f"]
    .map(name => `audio/se/se_${name}_v03.wav`),
];

function findManifests(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findManifests(file));
    else if (entry.isFile() && entry.name === "manifest.json") results.push(file);
  }
  return results;
}

function normalizeAssetPath(manifestFile, assetPath) {
  if (typeof assetPath !== "string" || !assetPath) return null;
  const rootRelative = assetPath.replaceAll("\\", "/");
  if (rootRelative.startsWith("public/assets/game/")) return rootRelative.slice("public/assets/game/".length);
  if (rootRelative.startsWith("assets/source/")) return null;
  const absolute = path.resolve(path.dirname(manifestFile), assetPath);
  const relative = path.relative(GAME_ASSETS, absolute);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
    ? null
    : relative.replaceAll("\\", "/");
}

function assetReviewRecords() {
  const records = new Map();
  for (const manifestFile of findManifests(GAME_ASSETS)) {
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    for (const collection of [manifest.assets, manifest.files]) {
      if (!Array.isArray(collection)) continue;
      for (const asset of collection) {
        const key = normalizeAssetPath(manifestFile, asset.path);
        if (!key) continue;
        const status = asset.status || asset.approval || asset.reviewStatus || manifest.status || manifest.reviewStatus || "missing";
        const license = asset.licenseNote || asset.license || manifest.licenseNote || manifest.sourceAttribution || "";
        const list = records.get(key) || [];
        list.push({ status, license, manifest: path.relative(ROOT, manifestFile) });
        records.set(key, list);
      }
    }
  }
  return records;
}

function nonCharacterComfyCandidates() {
  const candidates = new Set();
  for (const manifestFile of findManifests(GAME_ASSETS)) {
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    for (const collection of [manifest.assets, manifest.files]) {
      if (!Array.isArray(collection)) continue;
      for (const asset of collection) {
        if (!/comfyui/i.test(String(asset.sourceWorkflow || ""))) continue;
        const key = normalizeAssetPath(manifestFile, asset.path);
        if (!key || /(^|\/)characters(\/|$)/i.test(key)) continue;
        candidates.add(key);
      }
    }
  }
  return candidates;
}

function checkReleaseAssets() {
  const records = assetReviewRecords();
  const failures = [];
  for (const relativePath of runtimeAssets) {
    const absolutePath = path.join(GAME_ASSETS, relativePath);
    const entries = records.get(relativePath) || [];
    const manifests = [...new Set(entries.map(entry => entry.manifest))].join(", ");
    if (!existsSync(absolutePath)) failures.push(`${relativePath}: file missing`);
    if (!entries.length) failures.push(`${relativePath}: review manifest missing`);
    const statuses = [...new Set(entries.map(entry => entry.status))];
    if (statuses.some(status => status !== "approved")) {
      failures.push(`${relativePath}: status=${statuses.join("/")} (${manifests})`);
    }
    const uncleared = entries.filter(entry => !entry.license || /\b(pending|review|verify|unconfirmed|unverified|unapproved|unresolved|not confirmed|not cleared)\b|未確認|要確認|確認待ち|保留/i.test(entry.license));
    if (uncleared.length) {
      const sources = [...new Set(uncleared.map(entry => entry.manifest))].join(", ");
      failures.push(`${relativePath}: license clearance missing (${sources})`);
    }
  }
  if (failures.length) {
    throw Error(`Release blocked: ${failures.length} runtime asset review issue(s). First items:\n${failures.slice(0, 12).join("\n")}`);
  }
}

function copyShell() {
  copyFileSync(path.join(ROOT, "index.html"), path.join(DIST, "index.html"));
  cpSync(path.join(ROOT, "src"), path.join(DIST, "src"), { recursive: true });
  mkdirSync(path.join(DIST, "spec"), { recursive: true });
  for (const filename of ["mvp_config.json", "mvp_save.schema.json", "customer_dialogue_ja.json", "story_events_ja.json"]) {
    copyFileSync(path.join(ROOT, "spec", filename), path.join(DIST, "spec", filename));
  }
}

if (mode === "release") {
  try {
    checkReleaseAssets();
  } catch (error) {
    // Do not leave an older release build available after approval is revoked.
    rmSync(DIST, { recursive: true, force: true });
    throw error;
  }
}
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
copyShell();

if (mode === "preview") {
  const excludedComfyCandidates = nonCharacterComfyCandidates();
  cpSync(GAME_ASSETS, path.join(DIST, "public/assets/game"), {
    recursive: true,
    filter(source) {
      const relative = path.relative(GAME_ASSETS, source).replaceAll("\\", "/");
      return !excludedComfyCandidates.has(relative);
    },
  });
  console.log(`Preview build ready: dist-preview/ (concept-review assets included; ${excludedComfyCandidates.size} non-character ComfyUI candidates excluded; do not publish)`);
} else {
  for (const relativePath of runtimeAssets) {
    const source = path.join(GAME_ASSETS, relativePath);
    const destination = path.join(DIST, "public/assets/game", relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  console.log(`Release build ready: dist/ (${runtimeAssets.length} approved runtime assets)`);
}
