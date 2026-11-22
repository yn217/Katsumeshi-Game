// Fixed design-resolution stage (1920x1080) for landscape screens, scaled to fit with letterboxing.
// The mockups are fixed 16:9 compositions; a fluid layout drifts away from them at every window size.
// Portrait / narrow screens keep the responsive layout (no html.staged class).
const W = 1920, H = 1080;
const root = document.documentElement;
function fit() {
  const w = innerWidth, h = innerHeight;
  const staged = w >= 900 && w / h >= 1.2;
  root.classList.toggle("staged", staged);
  root.style.setProperty("--s", staged ? String(Math.min(w / W, h / H)) : "1");
}
addEventListener("resize", fit);
fit();
