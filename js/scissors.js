// ScissorsClear's shared parts: the sizes of a pair of household scissors, the physics of the lever,
// the shearing cut and the three-point "set", and 3D builders for scissors, shears and snips.
// Models are built in millimetres inside a group scaled by S, so every size below is a real size.
//   The pivot is the origin. Blades point along +x, handles along −x, and the blades swing in the
//   XY plane. z is the pivot's axis: the "top" blade (the one whose tip is on top when the scissors
//   are open) lies on the +z side in right-handed scissors. Seen by a user who holds the scissors
//   pointing away, +z is to the right.
import { THREE, M, arrow, clamp } from './kit.js';

export const S = 0.04;                  // scene units per millimetre (1 unit = 25 mm)
export const D2R = Math.PI / 180;

// ---------------------------------------------------------------- sizes (mm)
// A common 8 inch (about 205 mm) pair of household scissors, measured: blades about 95 mm from the
// pivot to the tip, the middle of the hand about 70 mm behind the pivot, blades about 2.4 mm thick.
export const DIM = {
  LB: 95,           // pivot to tip
  LH: 70,           // pivot to the middle of the finger bow, where the squeeze acts
  T: 2.4,           // blade thickness at the pivot
  H: 3,             // how far each edge sits past the centre line, so closed blades overlap by 2·H
  RIDE: 12,         // pivot to the ride (the rubbing flat behind the pivot)
  HEEL: 12,         // where the sharpened edge starts
  BETA: 65,         // edge angle, between the flat inner face and the bevel
};

// ---------------------------------------------------------------- where the edges cross
// Each edge is a straight line that misses the pivot's centre by H. Open the blades by φ and the two
// edges cross at a = H / sin(φ/2) from the pivot. Closing the scissors makes φ smaller, so the
// crossing point runs from the heel to the tip. The edges cross there at the angle φ itself.
export const crossAt = (phi, H = DIM.H) => H / Math.sin(Math.max(phi, 1e-4) / 2);
export const phiAt = (a, H = DIM.H) => 2 * Math.asin(clamp(H / Math.max(a, 1e-3), 0, 1));
// Opening needed to hold a round thing of diameter d at distance a: a·sin u − (d/2)·cos u = H, u = φ/2.
export const phiHolding = (a, d, H = DIM.H) => { const R = Math.hypot(a, d / 2); return 2 * (Math.atan2(d / 2, a) + Math.asin(clamp(H / R, 0, 1))); };

// ---------------------------------------------------------------- materials
// t: thickness in mm. tau: shear strength in MPa (N/mm²).
// Metals are handbook values: aluminium 1100-H14 about 76 MPa (11 ksi) in shear, low-carbon steel
// sheet about 300 MPa (roughly 0.75 of its tensile strength). Paper, card, cloth and wet tissue have
// no single handbook figure: the values here are rounded estimates of the right size (dry office
// paper pulls apart at roughly 30 to 50 MPa), so treat their forces as "about", not exact.
export const MATS = {
  tissue: { name: 'Wet tissue', t: 0.05, tau: 1, col: 0xdfe9f2 },
  paper: { name: 'Paper', t: 0.1, tau: 25, col: 0xf4f1e8 },
  cloth: { name: 'Cotton cloth', t: 0.3, tau: 20, col: 0x7aa2ff },
  card: { name: 'Card', t: 0.6, tau: 20, col: 0xc9a36b },
  alu: { name: 'Aluminium sheet', t: 0.5, tau: 76, col: 0xc3c8d1, stiff: true },
  steel: { name: 'Steel sheet', t: 0.5, tau: 300, col: 0x8b93a1, stiff: true },
};

// ---------------------------------------------------------------- the shearing cut
// Two edges that cross at the angle φ shear only a small triangle of the sheet at any moment: its
// height is the thickness t and its length is t / tan φ, so its area is t² / (2·tan φ).
// Force at the cut = shear strength × that area. This is the workshop formula for a shear with an
// inclined (raked) blade, and it matches the fracture view in A. G. Atkins, "The Science and
// Engineering of Cutting" (2009), where the force also goes as 1 / tan φ.
// A blunt edge has to squash the sheet before it bites: the (1 + 2·r/t) factor is an illustrative
// allowance for an edge of radius r, not a measured law.
export const shearLen = (t, phi) => t / Math.tan(Math.max(phi, 0.01));
export function cutForce(mat, a, edgeUm = 5, H = DIM.H) {
  const phi = phiAt(a, H);
  return mat.tau * mat.t * shearLen(mat.t, phi) / 2 * (1 + 2 * (edgeUm / 1000) / mat.t);
}

// ---------------------------------------------------------------- the set: three touching points
// The two halves touch in three places: the pivot screw, the ride just behind it, and one point on
// the edges (US patent 5,440,813 describes exactly this). The screw pulls the halves together with a
// tension T. The ride, RIDE mm behind the screw, props them apart there, so the halves rock on it
// and the edges are pressed together with N = T × RIDE / (a + RIDE). Moments about the ride.
export const setForce = (T, a) => T * DIM.RIDE / (a + DIM.RIDE);
// How stiff the blades are sideways: each is a cantilever, k = 3·E·I / a³, and the two act in series.
// E = 200,000 MPa for steel, I = w·t³/12 for a strip w = 10 mm wide and t = 2.4 mm thick.
export const bladeK = (a) => (3 * 200000 * (10 * DIM.T ** 3 / 12) / Math.max(a, 8) ** 3) / 2;   // N per mm
export const SIDE = 0.2;      // sideways thrust of the sheet as a share of the cutting force: metal
                              // shearing practice puts it at very roughly a fifth (illustrative)
export const MU = 0.3;        // steel rubbing on steel with a trace of oil (rounded)
export const HAND = { easy: 25, max: 100 };   // N: a comfortable squeeze and a hard one for one hand.
                              // Round ergonomic figures: a maker's test measured about 5 lbf (22 N)
                              // for ordinary scissors work (Bettcher AirShirz white paper).

// The pivot slider: 0 is a loose screw with play in it, 0.3 is just snug, 1 is done up hard.
export const pivotOf = (tight) => ({ T: tight > 0.3 ? (tight - 0.3) / 0.7 * 40 : 0, play: tight < 0.3 ? (0.3 - tight) / 0.3 * 0.1 : 0 });

// One cut, worked out. side: sideways push of the hand at the handles in N (+ presses the blades
// together, − pushes them apart). Returns forces in N, gaps in mm.
export function cutState({ mat, a, tight = 0.5, edgeUm = 5, side = 0, LH = DIM.LH }) {
  const { T, play } = pivotOf(tight);
  const phi = phiAt(a);
  const shear = cutForce(mat, a, edgeUm);
  const set = setForce(T, a);
  const fromHand = side * LH / a;                      // the handles are a lever sideways too
  const N = set + fromHand - SIDE * shear;             // what is left pressing edge on edge
  const k = bladeK(a);
  const gap = N > 0 ? 0 : -N / k + play * (a + DIM.RIDE) / DIM.RIDE;
  const gEff = gap + 0.5 * edgeUm / 1000;              // rounded corners never quite meet
  // Sheet-metal practice: a clean shear needs a clearance of about 5 to 10% of the thickness.
  // Once the gap is as wide as the sheet is thick, the sheet can simply slip down between the blades.
  const result = gEff >= mat.t ? (mat.stiff ? 'jams' : 'folds') : gEff >= 0.15 * mat.t ? 'ragged' : 'clean';
  const rub = MU * (Math.max(N, 0) * a + T * a / (a + DIM.RIDE) * DIM.RIDE);       // N·mm of friction
  const hand = (shear * (result === 'ragged' ? 1.5 : 1) * a + rub) / LH;
  return { phi, shear, set, fromHand, N, k, gap, gEff, result, hand, T, play, tooHard: hand > HAND.max };
}

// ---------------------------------------------------------------- small helpers
export const fmtN = (F) => (!isFinite(F) ? 'no limit' : F >= 100 ? Math.round(F) + ' N' : F >= 10 ? F.toFixed(0) + ' N' : F >= 1 ? F.toFixed(1) + ' N' : F.toFixed(2) + ' N');
export const fmtMm = (v) => (v < 0.0005 ? '0' : v < 0.1 ? Math.round(v * 1000) + ' µm' : v.toFixed(2) + ' mm');
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
export const tall = (stage) => stage.camera.aspect < 0.8;
// A readout: a headline and rows of [label, value, class]. A phone keeps only the first few rows.
export function rows(head, list, keep = 3) {
  return `<div class="big">${head}</div>` + (narrowScreen() ? list.slice(0, keep) : list).map(([a, b, cls]) => `<div class="row"><span>${a}</span><b${cls ? ` class="${cls}"` : ''}>${b}</b></div>`).join('');
}
// On a phone-width stage, hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y = -0.13, wideX = 0) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = narrow ? y : 0, sx = narrow || inReel() ? 0 : wideX;
  if (!stage.shift || stage.shift[1] !== sy || stage.shift[0] !== sx) stage.setShift(sx, sy);
  return narrow;
}
// In the tall video frame a long tool stands on end and is drawn larger, so it fills the picture.
// The floor is hidden there, because the tool then reaches below it. Returns the scale factor to use.
export function pose(stage, g, y = 3.4, x = 0.25, upScale = 1.75) {
  const up = inReel() && tall(stage);
  stage.floor.visible = !up;
  g.rotation.z = up ? Math.PI / 2 : 0;
  g.position.set(up ? 0 : x, y, 0);
  return up ? upScale : 1;
}

export const COL = { steel: 0xc3c8d1, edge: 0xf4f7fb, dark: 0x4d525e, handle: 0xff7a59, handle2: 0x3a3f4b, brass: 0xd9b25f, push: 0xffb547, cut: 0xff5a8a, good: 0x5ce1a9, blue: 0x7aa2ff, cyan: 0x8ef0ff, paper: 0xf4f1e8, wood: 0x9c6b3e, green: 0x4f9d5d };

const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
function shapeOf(points, holes = []) {
  const sh = new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b)));
  holes.forEach((h) => { const p = new THREE.Path(); p.setFromPoints(h.map(([a, b]) => new THREE.Vector2(a, b))); sh.holes.push(p); });
  return sh;
}
export const ellipse = (cx, cy, rx, ry, n = 40) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos(i / n * 2 * Math.PI), cy + ry * Math.sin(i / n * 2 * Math.PI)]);
// A flat plate: an outline in the XY plane, from z0 to z1. round softens its edges.
export function plateXY(points, z0, z1, mat, holes = [], round = 0) {
  const g = new THREE.ExtrudeGeometry(shapeOf(points, holes), round ? { depth: z1 - z0 - 2 * round, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 3, curveSegments: 24 } : { depth: z1 - z0, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, z0 + round);
  return shadowed(new THREE.Mesh(g, mat));
}
export function cylZ(r, z0, z1, mat, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg); g.rotateX(Math.PI / 2);
  const m = shadowed(new THREE.Mesh(g, mat)); m.position.z = (z0 + z1) / 2; return m;
}
// A material whose see-through state can be switched.
export function seeMat(mat, opacity = 0.2) {
  mat.transparent = true;
  mat.see = (on, o = opacity) => { mat.opacity = on ? o : 1; mat.depthWrite = !on; };
  return mat;
}
// A straight arrow that can point any way: aim(from, dir, len), all in the parent's units.
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function force(color, r = 1.2, head = 7) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    a.visible = len > head * 0.4;
  };
  return a;
}
// Arrow length for a force: grows with the logarithm, so 1 N and 500 N both fit on screen.
export const arrowLen = (F, base = 10, per = 14) => (F <= 0.05 ? 0 : base + per * Math.log10(1 + F));
// A glowing dot (the touching point).
export function dot(color, r = 2.2) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color, toneMapped: false, depthTest: false, transparent: true }));
  m.renderOrder = 11; return m;
}
// A chart or caption board: a canvas on a flat panel.
export function board(root, w, h, pxW, pxH, draw, pos, rotY = 0) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...pos); mesh.rotation.y = rotY; root.add(mesh);
  const b = { mesh, redraw, home: { p: new THREE.Vector3(...pos), r: rotY } };
  // In the tall video frame the board moves to reelPos (and faces the camera).
  b.place = (reelPos, reelScale = 1, reelRot = 0) => {
    if (inReel()) { mesh.position.set(...reelPos); mesh.rotation.y = reelRot; mesh.scale.setScalar(reelScale); }
    else { mesh.position.copy(b.home.p); mesh.rotation.y = b.home.r; mesh.scale.setScalar(1); }
  };
  return b;
}
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,.9)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); }

// ---------------------------------------------------------------- one blade
// A blade is swept from cross-sections. In its own coordinates the edge faces −y and the flat inner
// face is the plane z = 0, with the metal on the +z side. The other blade is the same part turned
// half a turn about x. o: LB, t, beta, root (half width at the pivot), tip, zig (pinking teeth).
const sm = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
function bladeGeometry(o) {
  const xs = [-16, -12, -8, -4, 0, 4, 6, 8, 10, 12];
  const step = o.zig ? o.zig.pitch / 2 : Math.max(2.5, (o.LB - 12) / 30);
  for (let x = (o.zig ? Math.ceil(12.01 / step) * step : 12 + step); x < o.LB - 0.6; x += step) xs.push(x);
  xs.push(o.LB - 0.5, o.LB);
  const n = xs.length, quads = n - 1;
  const pos = new Float32Array((quads * 4 * 6 + 2 * 6) * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.addGroup(0, quads * 6, 1);                       // the bevel: brighter metal
  geo.addGroup(quads * 6, quads * 18 + 12, 0);
  const tri = (x) => { const u = (x / o.zig.pitch) % 1; return 1 - Math.abs(2 * u - 1) * 2; };
  const ring = (x, a, E, tw) => {
    const R = o.root, back = x < 0 ? 0.5 * x : 0;
    let ye = -R + (R - o.H) * sm((x - 4) / 8) + back;
    if (o.zig && x > 14) ye += o.zig.sign * o.zig.amp * tri(x) * sm((x - 14) / 4);
    let ys = (x <= 10 ? R : R - (R + o.H - o.tip) * Math.pow((x - 10) / (o.LB - 10), 1.5)) + back;
    if (x >= o.LB) ys = -o.H + 0.3;
    const t = o.t * (1 - 0.4 * clamp(x / o.LB, 0, 1));
    const b = Math.min(t / Math.tan(o.beta * D2R), 0.7 * (ys - ye)) * sm((x - 6) / 5);
    // The set: a free blade bows towards its partner by C·(x/LB)². Assembled, it leans back so that
    // it touches only at the pivot and at a: its inner face then sits at C·x·(a − x)/LB², drawn E
    // times too big. tw twists the back of the blade away, so only the edge can touch.
    const zb = x > 0 ? E * o.bow * x * (a - x) / (o.LB * o.LB) : 0;
    const z = (y) => zb + tw * (y - ye);
    return [[x, ye, z(ye)], [x, ye + b, t + z(ye + b)], [x, ys, t + z(ys)], [x, ys, z(ys)]];
  };
  geo.shape = (a = o.LB, E = 0, tw = 0) => {
    const R = xs.map((x) => ring(x, a, E, x > 6 ? tw : 0));
    let i = 0;
    const put = (p) => { pos[i++] = p[0]; pos[i++] = p[1]; pos[i++] = p[2]; };
    const quad = (a0, b0, b1, a1) => { put(a0); put(b0); put(b1); put(a0); put(b1); put(a1); };
    for (let k = 0; k < quads; k++) quad(R[k][0], R[k][1], R[k + 1][1], R[k + 1][0]);
    for (let s = 1; s < 4; s++) for (let k = 0; k < quads; k++) quad(R[k][s], R[k][(s + 1) % 4], R[k + 1][(s + 1) % 4], R[k + 1][s]);
    quad(R[0][0], R[0][3], R[0][2], R[0][1]);
    quad(R[n - 1][0], R[n - 1][1], R[n - 1][2], R[n - 1][3]);
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals(); geo.computeBoundingSphere();
  };
  geo.shape();
  return geo;
}

// ---------------------------------------------------------------- a pair of scissors
// handles: 'plastic' (moulded bows), 'steel' (bent steel loops, as on tailor's shears and snips).
// crank lifts both bows so the lower blade can lie flat on a table (tailor's shears).
export function makeScissors(opts = {}) {
  const o = { LB: DIM.LB, LH: DIM.LH, t: DIM.T, H: DIM.H, beta: DIM.BETA, root: 8, tip: 1.6, bow: 0.5, handles: 'plastic', color: COL.handle, crank: 0, zig: null, bowR: 1, ...opts };
  const g = new THREE.Group();
  const steel = seeMat(M.metal(COL.steel, { roughness: 0.32, side: THREE.DoubleSide }));
  const bevel = seeMat(M.metal(COL.edge, { roughness: 0.16, side: THREE.DoubleSide }));
  const hMat = o.handles === 'plastic' ? seeMat(M.plastic(o.color, { roughness: 0.5 })) : seeMat(M.metal(o.handles === 'brass' ? COL.brass : COL.dark, { roughness: 0.45 }));
  const half = (top) => {
    const swing = new THREE.Group(), flip = new THREE.Group();
    if (!top) flip.rotation.x = Math.PI;
    swing.add(flip); g.add(swing);
    const geo = bladeGeometry({ ...o, zig: o.zig ? { ...o.zig, sign: top ? 1 : -1 } : null });
    const blade = shadowed(new THREE.Mesh(geo, [steel, bevel])); flip.add(blade);
    // The bow, in the half's own coordinates (y is flipped for the lower blade's half).
    const cr = top ? o.crank : -o.crank;
    const c = top ? [-o.LH, -24 * o.bowR + cr] : [-o.LH + 4, -23 * o.bowR + cr];
    const [rx, ry] = top ? [34 * o.bowR, 19 * o.bowR] : [19 * o.bowR, 19 * o.bowR];
    const wall = o.handles === 'plastic' ? 6.5 : 4;
    const handle = new THREE.Group(); flip.add(handle);
    const z0 = o.handles === 'plastic' ? -2.6 : 0, z1 = o.handles === 'plastic' ? 5.4 : o.t * 1.6;
    handle.add(plateXY(ellipse(c[0], c[1], rx, ry), z0, z1, hMat, [ellipse(c[0], c[1], rx - wall, ry - wall).reverse()], o.handles === 'plastic' ? 1.6 : 0.6));
    const nx = c[0] + rx * 0.72;
    handle.add(plateXY([[-13, -1.5], [nx, Math.min(c[1] + ry * 0.69, -1.5)], [nx, c[1] - ry * 0.69], [-13, -14.5]], z0, z1, hMat, [], o.handles === 'plastic' ? 1.6 : 0.6));
    return { swing, flip, blade, geo, handle, grip: [c[0], top ? c[1] : -c[1]] };
  };
  const top = half(true), bot = half(false);
  const brass = M.metal(COL.brass, { roughness: 0.3 });
  const screw = new THREE.Group(), nut = new THREE.Group(); g.add(screw, nut);
  screw.add(cylZ(4.6, o.t, o.t + 1.7, brass), cylZ(2.2, -o.t - 0.2, o.t, brass));
  const slot = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.1, 0.5), M.matte(0x3a2f18)); slot.position.z = o.t + 1.75; screw.add(slot);
  nut.add(cylZ(4.2, -o.t - 1.9, -o.t, brass, 6));
  let phi = 0;
  return {
    g, o, top, bot, screw, nut, mats: { steel, bevel, handle: hMat },
    get phi() { return phi; },
    // Open the blades by phi (radians): each half turns half of it about the pivot.
    setOpen(p) { phi = p; top.swing.rotation.z = p / 2; bot.swing.rotation.z = -p / 2; },
    // Show the set: touching at distance a, drawn E times too big, with the backs twisted away.
    setShape(a, E = 0, tw = 0) { top.geo.shape(a, E, tw); bot.geo.shape(a, E, tw); },
    // Where the hand acts on each half, in the scissors' own frame, for the current opening.
    grip(isTop) { const [x, y] = (isTop ? top : bot).grip, r = (isTop ? 1 : -1) * phi / 2; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; },
    // A point on an edge, x mm along the blade.
    edge(isTop, x) { const r = (isTop ? 1 : -1) * phi / 2, y = isTop ? -o.H : o.H; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; },
    see(on, op = 0.2) { steel.see(on, op); bevel.see(on, op); hMat.see(on, op); },
  };
}

// ---------------------------------------------------------------- a sheet being cut
// A sheet lying across the blades (in the XZ plane), already cut up to x = a. The part on the top
// blade's side is pushed down and the other part is lifted, as the two blades do.
export function makeSheet({ x1 = 150, w = 62, color = COL.paper, line = true, zSide = 1 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
  const mk = () => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3)); const m = shadowed(new THREE.Mesh(geo, mat)); g.add(m); return m; };
  const ahead = mk(), flapA = mk(), flapB = mk();
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1, 0.25, 1.4), new THREE.MeshBasicMaterial({ color: COL.cut, toneMapped: false })); g.add(stripe); stripe.visible = line;
  const set = (m, p) => { m.geometry.attributes.position.array.set([...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]]); m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere(); };
  g.set = (a, x0 = 14, droop = 5) => {
    a = Math.min(a, x1 - 2);
    set(ahead, [[a, 0, -w], [x1, 0, -w], [x1, 0, w], [a, 0, w]]);
    // behind the cut, the flap under the top blade dips and the flap over the lower blade lifts
    set(flapA, [[x0, -droop, zSide * 0.2], [a, 0, zSide * 0.2], [a, 0, zSide * w], [x0, -droop * 1.6, zSide * w]]);
    set(flapB, [[x0, droop * 0.6, -zSide * 0.2], [a, 0, -zSide * 0.2], [a, 0, -zSide * w], [x0, droop, -zSide * w]]);
    stripe.scale.x = x1 - a; stripe.position.set((a + x1) / 2, 0.3, 0);
  };
  g.set(40);
  return g;
}

// ---------------------------------------------------------------- the cut, under a microscope
// A flat drawing of the slice across the blades at the touching point, to scale: the two blade
// corners, the gap between them, and the sheet either sheared or folded. st comes from cutState.
export function drawMicro(c, w, h, st, mat, title = 'At the cutting point, magnified') {
  panelBg(c, w, h);
  if (!st) return;
  c.fillStyle = '#e8eef8'; c.font = 'bold 30px sans-serif'; c.fillText(title, 26, 44);
  const cx = w / 2, cy = h / 2 + 30, px = Math.min(150 / Math.max(mat.t, 0.05), 130 / Math.max(st.gEff, 0.01), 2400);
  const g = Math.max(st.gap * px, 1.5), t = Math.max(mat.t * px, 3), cut = st.result === 'clean' || st.result === 'ragged';
  const off = cut ? t * 0.9 : Math.min(t * 0.5 + g * 0.35, 120);
  const blade = (sx) => {
    c.fillStyle = '#aeb4c0'; c.beginPath();
    const x = sx * g / 2, y = -sx * (off / 2 - t / 2) * 1;                  // the apex rests on the sheet
    c.moveTo(cx + x, cy + y); c.lineTo(cx + x, cy + y - sx * 400); c.lineTo(cx + x + sx * 500, cy + y - sx * 400); c.lineTo(cx + x + sx * 500, cy + y - sx * 500 / Math.tan(DIM.BETA * D2R)); c.closePath(); c.fill();
  };
  c.save(); c.beginPath(); c.roundRect(14, 60, w - 28, h - 74, 14); c.clip();
  blade(1); blade(-1);
  const col = '#' + mat.col.toString(16).padStart(6, '0');
  c.strokeStyle = col; c.lineWidth = t; c.lineCap = 'butt'; c.lineJoin = 'round';
  if (cut) {
    c.beginPath(); c.moveTo(0, cy - off / 2); c.lineTo(cx - g / 2 - 1, cy - off / 2); c.stroke();
    c.beginPath(); c.moveTo(w, cy + off / 2); c.lineTo(cx + g / 2 + 1, cy + off / 2); c.stroke();
    if (st.result === 'ragged') { c.lineWidth = Math.max(2, t * 0.3); c.beginPath(); c.moveTo(cx - g / 2, cy - off / 2 + t * 0.2); c.lineTo(cx + g * 0.1, cy - off / 2 + t * 0.9); c.moveTo(cx + g / 2, cy + off / 2 - t * 0.2); c.lineTo(cx - g * 0.1, cy + off / 2 - t * 0.9); c.stroke(); }
  } else {
    c.beginPath(); c.moveTo(0, cy - off / 2); c.lineTo(cx - g / 2 - t * 0.6, cy - off / 2);
    c.bezierCurveTo(cx - g / 2 + t * 0.3, cy - off / 2, cx + g / 2 - t * 0.3, cy + off / 2, cx + g / 2 + t * 0.6, cy + off / 2); c.lineTo(w, cy + off / 2); c.stroke();
  }
  c.restore();
  const word = { clean: ['Sheared clean', '#5ce1a9'], ragged: ['Ragged: it chews', '#ffb547'], folds: ['Folds into the gap', '#ff5a8a'], jams: ['Wedges in the gap', '#ff5a8a'] }[st.result];
  c.fillStyle = 'rgba(8,10,16,.82)'; c.fillRect(22, h - 64, w - 44, 46);
  c.fillStyle = word[1]; c.font = 'bold 30px sans-serif'; c.fillText(word[0], 34, h - 30);
  c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '24px sans-serif'; c.textAlign = 'right';
  c.fillText(`gap ${fmtMm(st.gap)} · sheet ${mat.t} mm`, w - 34, h - 30); c.textAlign = 'left';
}

// ---------------------------------------------------------------- other kinds of shears
// Each builder returns the same small interface, so one chapter can drive them all:
//   g, setOpen(u) with u the half opening in radians, uMax, uAt(a) the half opening at which the
//   edges cross a mm from the fulcrum, range [a0, a1] of cutting distances, gain(a) the force at the
//   cut per newton of squeeze, hands(u) the two points the hand presses, and cut(a) the cut point.
export function asKind(k, extra = {}) {
  return {
    g: k.g, uMax: 16 * D2R, range: [DIM.HEEL + 2, k.o.LB - 4], handArm: k.o.LH, left: -k.o.LH - 38 * k.o.bowR,
    setOpen: (u) => k.setOpen(2 * u), uAt: (a) => phiAt(a, k.o.H) / 2,
    gain: (a) => k.o.LH / a,
    hands: () => [k.grip(false), k.grip(true)], cut: (a) => [a, 0], ...extra,
  };
}

// Spring shears: one strip of steel bent double. The bow at the back is both the hinge and the
// spring that opens the blades again. The hand squeezes between the bow and the blades, so this is
// a third-class lever: the cut gets less force than the hand gives, but moves further.
export function makeSpringShears() {
  const g = new THREE.Group(), steel = M.metal(0x9aa0ab, { roughness: 0.5, side: THREE.DoubleSide });
  const BX = -100, BY = 13, HO = 3, GRIP = -25;
  const outline = [[BX, BY + 2], [-34, 9], [0, 15], [60, 11], [108, -1.6], [110, -HO], [0, -HO], [-34, 4], [BX, BY - 2]];
  const arm = (top) => {
    const swing = new THREE.Group(); swing.position.set(BX, top ? BY : -BY, 0); g.add(swing);
    const flip = new THREE.Group(); if (!top) flip.rotation.x = Math.PI; flip.position.set(-BX, top ? -BY : BY, 0); swing.add(flip);
    flip.add(plateXY(outline, 0, 2, steel));
    return swing;
  };
  const top = arm(true), bot = arm(false);
  // the bow: a half ring joining the two arms
  const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + Math.PI * i / 24; pts.push(new THREE.Vector3(BX + 15 * Math.cos(a) * 1.5, BY * Math.sin(a), 0)); }
  const bow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 2, 8), steel); bow.scale.z = 1.6; bow.castShadow = true; g.add(bow);
  // where the two edges cross, for a half opening u (the arms turn about the ends of the bow)
  const crossX = (u) => { const L = (16 * Math.cos(u) - BY) / Math.sin(Math.max(u, 1e-4)); return BX + L * Math.cos(u) + 16 * Math.sin(u); };
  const uAt = (a) => { let lo = 0.002, hi = 0.2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (crossX(m) - BX > a) lo = m; else hi = m; } return (lo + hi) / 2; };
  const rot = (p, top, u) => { const s = top ? 1 : -1, x = p[0] - BX, y = p[1] - s * BY, c = Math.cos(s * u), n = Math.sin(s * u); return [BX + x * c - y * n, s * BY + x * n + y * c]; };
  return {
    g, uMax: 6.5 * D2R, range: [112, 205], handArm: GRIP - BX, origin: [BX, 0], left: BX - 26,
    setOpen(u) { top.rotation.z = u; bot.rotation.z = -u; },
    uAt, gain: (a) => (GRIP - BX) / a,
    hands: (u) => [rot([GRIP, 10], true, u), rot([GRIP, -10], false, u)], cut: (a) => [BX + a, 0],
  };
}

// Compound (aviation) snips: two levers in a row. Each handle is a lever that turns about the
// handle bolt and pushes a pin on the tail of a jaw. Each jaw is a second lever about the jaw bolt.
// The linkage is solved exactly, and the gain comes from it by the principle of virtual work:
// force at the cut × its movement = squeeze × the hand's movement.
export function makeCompound() {
  const g = new THREE.Group(), steel = M.metal(COL.steel, { roughness: 0.4, side: THREE.DoubleSide }), dark = M.metal(COL.dark, { roughness: 0.5, side: THREE.DoubleSide }), grip = M.plastic(0xe9b53a, { roughness: 0.6 });
  const P0 = [-36, -7], E = 16, HO = 2, G0 = [-185, 13];
  const H0x = P0[0] - Math.sqrt(E * E - P0[1] * P0[1]);
  const solve = (u) => {                                  // top jaw turned up by u: where everything is
    const c = Math.cos(u), s = Math.sin(u), P = [P0[0] * c - P0[1] * s, P0[0] * s + P0[1] * c];
    const Hx = P[0] - Math.sqrt(Math.max(0, E * E - P[1] * P[1]));
    const psi = Math.atan2(-P[1], Hx - P[0]) - Math.atan2(-P0[1], H0x - P0[0]);
    const dx = G0[0] - H0x, dy = G0[1];
    return { P, Hx, psi, G: [Hx + dx * Math.cos(psi) - dy * Math.sin(psi), dx * Math.sin(psi) + dy * Math.cos(psi)] };
  };
  const jawPts = [[-5, 9], [18, 8], [42, 1], [42, -HO], [5, -HO], [-30, -13], [-42, -11], [-41, -2], [-12, 2]];
  const hPts = [[P0[0] - H0x + 5, P0[1] - 4], [P0[0] - H0x + 5, P0[1] + 4], [4, 5], [-30, 12], [G0[0] - H0x - 40, G0[1] + 5], [G0[0] - H0x - 40, G0[1] - 3], [-30, 3], [-4, -5]];
  const jaws = [], handles = [];
  for (const top of [true, false]) {
    const swing = new THREE.Group(), flip = new THREE.Group(); if (!top) flip.rotation.x = Math.PI; swing.add(flip); g.add(swing);
    flip.add(plateXY(jawPts, 0, 3.2, steel)); flip.add(cylZ(2.6, 3.2, 7.4, dark).translateX(P0[0]).translateY(P0[1]));
    jaws.push(swing);
    const hs = new THREE.Group(), hf = new THREE.Group(); if (!top) hf.rotation.x = Math.PI; hs.add(hf); g.add(hs);
    hf.add(plateXY(hPts, 3.6, 6.6, dark));
    hf.add(plateXY([[G0[0] - H0x - 45, G0[1] + 9], [G0[0] - H0x + 50, G0[1] + 1], [G0[0] - H0x + 50, G0[1] - 9], [G0[0] - H0x - 45, G0[1] - 7]], 0.6, 9.6, grip, [], 2));
    handles.push(hs);
  }
  g.add(cylZ(3.4, -4.6, 4.6, dark));
  const hPin = cylZ(3, -8, 8, dark); g.add(hPin);
  const gainAt = (a, u) => { const e = 1e-4; return (solve(u + e).G[1] - solve(u - e).G[1]) / (2 * e) / a; };
  let cur = 0;
  return {
    g, uMax: 12 * D2R, range: [8, 38], handArm: Math.round(H0x - G0[0]), solve, left: G0[0] - 48,
    setOpen(u) { cur = u; const k = solve(u); jaws[0].rotation.z = u; jaws[1].rotation.z = -u; handles.forEach((h, i) => { h.position.x = k.Hx; h.rotation.z = (i ? -1 : 1) * k.psi; }); hPin.position.x = k.Hx; },
    uAt: (a) => Math.asin(clamp(HO / a, 0, 1)),
    gain: (a) => gainAt(a, Math.asin(clamp(HO / a, 0, 1))),
    hands: (u) => { const G = solve(u).G; return [[G[0], G[1] + 8], [G[0], -G[1] - 8]]; }, cut: (a) => [a, 0],
  };
}

// Bypass secateurs: a sharp curved blade sweeps past a thick blunt hook, like scissors with one
// blade. A coil spring between the handles opens them again.
export function makeSecateurs() {
  const g = new THREE.Group(), steel = M.metal(COL.steel, { roughness: 0.35, side: THREE.DoubleSide }), dark = M.metal(0x6b7280, { roughness: 0.5, side: THREE.DoubleSide }), grip = M.plastic(0xd8422f, { roughness: 0.6 });
  const LH = 125;
  const blade = [[-10, 9], [8, 12], [30, 9], [50, -1], [44, -6], [26, -10], [10, -8], [0, -9], [-22, -9], [-40, -14], [-40, -6], [-22, 0]];
  const hook = [[-10, -9], [6, -13], [30, -15], [50, -6], [52, 1], [44, -1], [26, -5], [12, -3], [0, 9], [-22, 9], [-40, 14], [-40, 6], [-22, -1]];
  const mk = (pts, z0, z1, mat, sign) => {
    const swing = new THREE.Group(); g.add(swing);
    swing.add(plateXY(pts, z0, z1, mat));
    swing.add(plateXY([[-36, sign * 15], [-150, sign * 26], [-152, sign * 14], [-36, sign * 5]], -4, 4, grip, [], 2.5));
    return swing;
  };
  const top = mk(blade, 0, 2.6, steel, -1), bot = mk(hook, -4, 0, dark, 1);
  g.add(cylZ(4.2, -5, 3.8, M.metal(COL.brass, { roughness: 0.3 })));
  // the return spring, redrawn as the handles move
  const coil = new THREE.Mesh(new THREE.BufferGeometry(), M.metal(COL.steel, { roughness: 0.3 })); g.add(coil);
  const setSpring = (u) => {
    const y = 8 + 62 * Math.sin(u), pts = [];
    for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * 9 * Math.PI * 2; pts.push(new THREE.Vector3(-62 + 5 * Math.cos(a), -y + 2 * y * t, 5 * Math.sin(a))); }
    coil.geometry.dispose(); coil.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.8, 6);
  };
  let last = -1;
  return {
    g, uMax: 19 * D2R, range: [10, 40], handArm: LH, left: -156,
    setOpen(u) { top.rotation.z = u; bot.rotation.z = -u; if (Math.abs(u - last) > 0.004) { last = u; setSpring(u); } },
    uAt: (a) => Math.asin(clamp(6 / a, 0, 1)) * 0.9,
    gain: (a) => LH / a,
    hands: (u) => { const c = Math.cos(u), s = Math.sin(u); return [[-LH * c + 20 * s, LH * s + 20 * c + 8], [-LH * c + 20 * s, -LH * s - 20 * c - 8]]; }, cut: (a) => [a, 0],
  };
}
