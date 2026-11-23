import {
  cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig, validateStoryEvents, validateCustomerDialogue } from "../src/save-validation.mjs";
import { runtimeFoodAssets } from "../src/game-assets.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME_ASSETS = path.join(ROOT, "public/assets/game");
const mode = process.argv.slice(2).includes("--audit-release") ? "audit"
  : process.argv.slice(2).includes("--preview") ? "preview" : "release";
const DIST = path.join(ROOT, mode === "preview" ? "dist-preview" : "dist");
const config = JSON.parse(readFileSync(path.join(ROOT, "spec/mvp_config.json"), "utf8"));
const configSchema = JSON.parse(readFileSync(path.join(ROOT, "spec/mvp_config.schema.json"), "utf8"));
const configErrors = validateConfig(config, configSchema);
if (configErrors.length) throw Error(`Invalid MVP config: ${configErrors.slice(0, 8).join(" / ")}`);
const storyDocument = JSON.parse(readFileSync(path.join(ROOT, "spec/story_events_ja.json"), "utf8"));
const storyErrors = validateStoryEvents(storyDocument, config);
if (storyErrors.length) throw Error(`Invalid story events: ${storyErrors.slice(0, 8).join(" / ")}`);
const dialogueDocument = JSON.parse(readFileSync(path.join(ROOT, "spec/customer_dialogue_ja.json"), "utf8"));
const dialogueErrors = validateCustomerDialogue(dialogueDocument, config);
if (dialogueErrors.length) throw Error(`Invalid customer dialogue: ${dialogueErrors.slice(0, 8).join(" / ")}`);

const ranks = ["sss", "s", "a", "b", "c", "f"];
const runtimeAssets = [
  "backgrounds/v08/title_riverside_anime_chatgpt_v03.webp",
  "backgrounds/v08/result_evening_anime_chatgpt_v01.webp",
  "backgrounds/v08/tasting_interior_anime_chatgpt_v01.webp",
  "backgrounds/v11/shop_diner_layout_chatgpt_v01.webp",
  "backgrounds/v08/morning_prep_anime_chatgpt_v01.webp",
  "backgrounds/v08/kitchen_frying_anime_chatgpt_v01.webp",
  "backgrounds/v08/day7_evening_anime_chatgpt_v01.webp",
  ...["normal", "encourage", "happy", "sad", "surprised", "thinking"]
    .map(name => `characters/owner/v05/emotions/${name}_v01.webp`),
  "characters/owner/v05/shop_full_v01.webp",
  "characters/owner/v05/casual_full_v01.webp",
  ...["regular", "student", "worker", "tourist"].flatMap(type => ranks.map(rank => `characters/${type}/v05/${rank}.webp`)),
  "characters/regular/v06/reaction_c_v103.webp",
  "characters/regular/v06/reaction_f_v103.webp",
  "food/beef_katsumeshi/whole.webp",
  "cooking/v09/fry_stage_cutlet_anime_chatgpt_v01.png",
  ...runtimeFoodAssets,
  ...["meat_mallet", "breading_tray", "sauce_ladle", "cabbage_pot", "rice_paddle"]
    .map(name => `cooking/v07/tools/${name}_chatgpt_v07.webp`),
  "equipment/v07/fryer_chatgpt_v07.webp",
  "equipment/v07/chair_chatgpt_v07.webp",
  ...["steam_wisps", "frying_sizzle", "golden_sparkle"].map(name => `effects/v04/${name}_chatgpt_v08.webp`),
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
        const license = asset.licenseNote || asset.license || manifest.licenseNote || "";
        const list = records.get(key) || [];
        const sourceWorkflow = [asset.sourceWorkflow, manifest.sourceWorkflow].find(value => typeof value === "string" && value.trim()) || "";
        list.push({ status, license, sourceWorkflow, manifest: path.relative(ROOT, manifestFile) });
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
        const sourceWorkflow = [asset.sourceWorkflow, manifest.sourceWorkflow]
          .find(value => typeof value === "string" && value.trim()) || "";
        if (!/comfyui/i.test(sourceWorkflow)) continue;
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
    const uncleared = entries.filter(entry => !entry.license || /\b(pending|review|verify|unconfirmed|unverified|unapproved|unresolved|not confirmed|not cleared|confirm|confirmation)\b|未確認|要確認|確認待ち|保留/i.test(entry.license));
    if (uncleared.length) {
      const sources = [...new Set(uncleared.map(entry => entry.manifest))].join(", ");
      failures.push(`${relativePath}: license clearance missing (${sources})`);
    }
    const untraceable = entries.filter(entry => !entry.sourceWorkflow.trim());
    if (untraceable.length) {
      const sources = [...new Set(untraceable.map(entry => entry.manifest))].join(", ");
      failures.push(`${relativePath}: sourceWorkflow missing (${sources})`);
    }
  }
  if (failures.length) {
    const categories = new Map();
    const categoryAssets = new Map();
    const assets = new Set();
    for (const failure of failures) {
      const separator = failure.indexOf(":");
      const assetPath = failure.slice(0, separator);
      assets.add(assetPath);
      const detail = failure.slice(separator + 1).trim();
      const category = detail.startsWith("status=") ? "approval status"
        : detail.includes("license clearance missing") ? "license clearance"
        : detail.includes("sourceWorkflow missing") ? "sourceWorkflow"
        : detail.includes("review manifest missing") ? "review manifest"
        : detail.includes("file missing") ? "file presence" : "other";
      categories.set(category, (categories.get(category) || 0) + 1);
      if (!categoryAssets.has(category)) categoryAssets.set(category, new Set());
      categoryAssets.get(category).add(assetPath);
    }
    const summary = [...categories].map(([category, count]) => {
      const paths = categoryAssets.get(category);
      const examples = category === "sourceWorkflow" ? ` (${[...paths].join(", ")})` : "";
      return `${category}: ${count}${examples}`;
    }).join(", ");
    throw Error(`Release blocked: ${failures.length} issue(s) across ${assets.size} runtime assets (${summary}). Examples:\n${failures.slice(0, 12).join("\n")}`);
  }
}

if (mode === "audit") {
  try {
    checkReleaseAssets();
    console.log(`Release asset audit passed (${runtimeAssets.length} approved runtime assets)`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
  process.exit();
}

function copyShell() {
  copyFileSync(path.join(ROOT, "index.html"), path.join(DIST, "index.html"));
  cpSync(path.join(ROOT, "src"), path.join(DIST, "src"), { recursive: true });
  mkdirSync(path.join(DIST, "spec"), { recursive: true });
  for (const filename of ["mvp_config.json", "mvp_config.schema.json", "mvp_save.schema.json", "customer_dialogue_ja.json", "story_events_ja.json", "ui_text_ja.json"]) {
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
  const forbiddenRuntimeAssets = runtimeAssets.filter(relativePath => excludedComfyCandidates.has(relativePath));
  if (forbiddenRuntimeAssets.length) {
    throw Error(`Preview blocked: non-character ComfyUI asset(s) in runtime list:\n${forbiddenRuntimeAssets.join("\n")}`);
  }
  for (const relativePath of runtimeAssets) {
    const source = path.join(GAME_ASSETS, relativePath);
    const destination = path.join(DIST, "public/assets/game", relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  console.log(`Preview build ready: dist-preview/ (${runtimeAssets.length} runtime assets, concept-review included; non-character ComfyUI generation excluded; do not publish)`);
} else {
  for (const relativePath of runtimeAssets) {
    const source = path.join(GAME_ASSETS, relativePath);
    const destination = path.join(DIST, "public/assets/game", relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  console.log(`Release build ready: dist/ (${runtimeAssets.length} approved runtime assets)`);
}
