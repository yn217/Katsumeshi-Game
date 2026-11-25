// Use the fixed 1920x1080 composition only when the viewport can show it at native size.
// Smaller landscape screens use the fluid CSS layout so text and controls are not scaled down.
const W = 1920, H = 1080;
const root = document.documentElement;
function fit() {
  const w = innerWidth, h = innerHeight;
  const staged = w >= W && h >= H && w / h >= 1.2;
  root.classList.toggle("staged", staged);
  root.classList.toggle("fluid-landscape", !staged && w >= 1280 && w / h >= 1.2);
  root.style.setProperty("--s", staged ? String(Math.min(w / W, h / H)) : "1");
}
addEventListener("resize", fit);
fit();
