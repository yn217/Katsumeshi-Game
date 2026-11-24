// Shared geometry for the serving floor. Both src/serving.mjs and the background control-image script read this file,
// so the painted background, click targets and table occlusion stay aligned. Units are floor tiles; the canvas is 1600x900.
export const CANVAS = { w: 1600, h: 900 };
export const PROJ = { ox: 720, oy: 40, kx: 74, ky: 42 };
export const ROOM = { w: 16, h: 16, wallPx: 700 };
export const P = (x, y) => ({ x: PROJ.ox + (x - y) * PROJ.kx, y: PROJ.oy + (x + y) * PROJ.ky });
export const unproject = (sx, sy) => { const a = (sx - PROJ.ox) / PROJ.kx, b = (sy - PROJ.oy) / PROJ.ky; return { x: (a + b) / 2, y: (b - a) / 2 }; };

// table: centre, half-size, top height in px. Chairs sit on the far (y-) and near (y+) sides.
export const TABLE = { half: .7, topPx: 40, chairDy: 1.0, chairDx: [-.38, .38] };
export const TABLES = [
  { id: 1, x: 4.6, y: 1.5 }, { id: 2, x: 7.8, y: 1.6 }, { id: 3, x: 3.9, y: 4.6 },
  { id: 4, x: 7.0, y: 4.8 }, { id: 5, x: 10.0, y: 4.4 }, { id: 6, x: 5.2, y: 7.8 }, { id: 7, x: 8.6, y: 8.2 }];

// kitchen along the left wall; the pass counter's front edge faces the dining room at x = front
export const KITCHEN = { front: 2.6, depth: .75, y0: .4, y1: 5.6, counterPx: 62, stoveX: .8 };
export const PASS_SPOTS = [1.4, 2.2, 3.0, 3.8, 4.6].map(y => ({ x: KITCHEN.front - KITCHEN.depth / 2, y }));
export const PASS = { x: 3.3, y: 3.0 };
export const CHEF = { x: 1.25, y: 2.6 };
export const START = { x: 3.4, y: 3.6 };
export const servePoint = t => ({ x: t.x - 1.25, y: t.y + .1 });
export const WINDOWS = [[3.2, 5.0], [6.0, 7.8], [8.8, 10.6], [11.4, 12.8]]; // on the back-right wall (y = 0)
export const NOREN = [.5, 1.9];                                             // kitchen doorway on the back-right wall
export const BOARD = [6.4, 8.2];                                            // chalkboard on the left wall (x = 0)
export const PLANTS = [{ x: 12.3, y: .7 }, { x: 2.9, y: 6.4 }, { x: 12.2, y: 9.4 }, { x: .6, y: 9.6 }];

// screen polygon of a table's top face plus its front apron, used to draw the table over seated customers
export function tableTopPolygon(t) {
  const h = TABLE.half, lift = TABLE.topPx, apron = 12;
  const c = [P(t.x - h, t.y - h), P(t.x + h, t.y - h), P(t.x + h, t.y + h), P(t.x - h, t.y + h)].map(p => ({ x: p.x, y: p.y - lift }));
  return [c[0], c[1], { x: c[1].x, y: c[1].y + apron }, { x: c[2].x, y: c[2].y + apron }, { x: c[3].x, y: c[3].y + apron }, c[3]];
}
