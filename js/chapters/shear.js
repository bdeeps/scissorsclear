// Chapter 3: the cut itself. A slice across the two blades, looking along them. The edges do not
// meet: they pass each other, and the sheet between them is pushed down on one side and up on the
// other until it fails in shear. Everything is drawn in units of the sheet's own thickness.
import { THREE, M, approach, clamp } from '../kit.js';
import { MATS, DIM, D2R, COL, cutForce, phiAt, shearLen, rows, fitNarrow, force, board, panelBg, fmtN, fmtMm, inReel, tall } from '../scissors.js';

// Edge angles: US patent 6,997,795 (Edgecraft, 2006) says scissor facets are most commonly honed at
// about 70° to the mating face, and knife edges at 25° to 50° in total. Sharpening guides for scissors
// use 60° to 65° (for example Work Sharp's scissor guide).
const A0 = 50;                      // mm from the pivot: the slice is taken at mid-blade
const U = 0.5;                      // scene units per sheet thickness
const DEPTH = 7, WIDE = 9;          // the slice, in thicknesses: depth along the blade, half width
const sm = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const dOf = (travel) => -0.25 + 1.75 * clamp(travel, 0, 1);      // how far the edges have closed, in thicknesses

// The state of the cut for the chosen sheet, gap and edge (the rules are in scissors.js, cutState).
export function shearState(s) {
  const m = MATS[s.mat], gEff = s.gap + 0.5 * s.blunt / 1000, ratio = gEff / m.t;
  const result = ratio >= 1 ? (m.stiff ? 'jams' : 'folds') : ratio >= 0.15 ? 'ragged' : 'clean';
  const phi = phiAt(A0), len = shearLen(m.t, phi), F = cutForce(m, A0, s.blunt) * (result === 'ragged' ? 1.5 : 1);
  // Pressure right under the edge: the force spread over a strip as long as the shearing length and
  // about two edge radii wide. Pressure = force ÷ area (see PressureClear).
  const press = F / (len * 2 * s.blunt / 1000);
  return { m, gEff, ratio, result, phi, len, area: m.t * len / 2, F, press, back: 0.1 * Math.tan(s.beta * D2R) };
}

// The outline of a blade's corner: apex at (g/2, y), flat inner face going up, bevel at beta to it.
function corner(g, y, beta, r) {
  const b = beta * D2R, top = y + 7, dir = [Math.sin(b), Math.cos(b)], A = [g / 2, y];
  const tU = (WIDE - g / 2) / dir[0], tV = dir[1] > 1e-3 ? 5.5 / dir[1] : 1e9, t = Math.min(tU, tV);
  const pts = [];
  // round the apex with a radius r: a circle tangent to both faces
  const tl = r / Math.tan(b / 2), C = [A[0] + Math.sin(b / 2) * r / Math.sin(b / 2), A[1] + Math.cos(b / 2) * r / Math.sin(b / 2)];
  const a0 = Math.PI, a1 = -Math.PI / 2 + (Math.PI / 2 - b) + 2 * Math.PI;      // from the inner face round to the bevel
  pts.push([A[0], top]);
  pts.push([A[0], A[1] + tl]);
  for (let i = 1; i < 8; i++) { const a = a0 + (a1 - a0) * i / 8; pts.push([C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)]); }
  pts.push([A[0] + dir[0] * tl, A[1] + dir[1] * tl]);
  pts.push([A[0] + dir[0] * t, A[1] + dir[1] * t]);
  if (tU < tV) pts.push([WIDE, top]);
  return pts;
}

// A strip of sheet seen end on: n columns between u0 and u1, with a top and a bottom line.
function ribbon(n, mat) {
  const geo = new THREE.BufferGeometry(), per = 4 * 6, pos = new Float32Array((n * per + 12) * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
  mesh.set = (u0, u1, top, bot) => {
    let i = 0;
    const put = (u, v, z) => { pos[i++] = u; pos[i++] = v; pos[i++] = z; };
    const quad = (a, b, c, d) => { put(...a); put(...b); put(...c); put(...a); put(...c); put(...d); };
    const zf = DEPTH / 2, zb = -DEPTH / 2;
    for (let k = 0; k < n; k++) {
      const ua = u0 + (u1 - u0) * k / n, ub = u0 + (u1 - u0) * (k + 1) / n, ta = top(ua), tb = top(ub), ba = bot(ua), bb = bot(ub);
      quad([ba[0], ba[1], zf], [bb[0], bb[1], zf], [tb[0], tb[1], zf], [ta[0], ta[1], zf]);     // front
      quad([ta[0], ta[1], zf], [tb[0], tb[1], zf], [tb[0], tb[1], zb], [ta[0], ta[1], zb]);                                        // top
      quad([ba[0], ba[1], zb], [bb[0], bb[1], zb], [bb[0], bb[1], zf], [ba[0], ba[1], zf]);                                        // bottom
      quad([bb[0], bb[1], zb], [ba[0], ba[1], zb], [ta[0], ta[1], zb], [tb[0], tb[1], zb]);                                        // back
    }
    for (const u of [u0, u1]) { const t = top(u), b = bot(u); quad([b[0], b[1], zf], [b[0], b[1], zb], [t[0], t[1], zb], [t[0], t[1], zf]); }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  };
  return mesh;
}

export default {
  id: 'shear',
  short: 'The cut',
  title: 'The cut is a shear, not a slice',
  subtitle: 'The two edges never meet. They pass each other, and the sheet between them gives way.',
  view: { pos: [0.4, 4.6, 12.5], target: [0.4, 4.0, 0] },
  learn: `<p>A knife cuts by pressing one edge down on to a board. Scissors do something different. You are looking at a slice across both blades, hugely magnified, so that a sheet of paper looks as thick as a book.</p>
    <p>The top blade comes down on one side of the line. The bottom blade comes up on the other side. The two edges <b>pass each other</b> like trains on neighbouring tracks, with almost no gap. The sheet is pushed down on the right and up on the left, so the thin band between the edges is slid apart. That sliding is called <b>shear</b> (<a href="https://glassbox.how/forceclear/">ForceClear</a> has more on pushes and pulls).</p>
    <p>The sheet gives way when the <b>shear stress</b> reaches its strength: <b>stress = force ÷ area</b>, and the area is the sheet's thickness times the short length being cut at that instant. Because the edges cross at an angle, that length is tiny, so a small force makes a big stress. It is the same idea as <a href="https://glassbox.how/pressureclear/">PressureClear</a>: the same push on a smaller area presses harder. A <b>blunt</b> edge spreads the push over more area, so you must squeeze harder.</p>
    <p>Now open the <b>gap</b>. Once the gap is as wide as the sheet is thick, nothing is sheared. The sheet just bends down between the blades and <b>folds</b>. That is why loose scissors chew wet tissue and fold paper instead of cutting it.</p>
    <p>A scissor edge is also much <b>blunter in angle</b> than a knife: usually about 60° to 75° between the flat face and the bevel, against a total of roughly 25° to 50° for knives. It has to be. Each edge rubs along the other blade on every cut, and a thin knife edge would chip.</p>
    <p class="tip"><b>Try it:</b> open the gap slowly until the paper stops cutting and folds. Then switch to card, which is thicker, and see that the same gap still cuts.</p>`,
  terms: [
    { t: 'Shear', d: 'Sliding one part of a material past the part next to it, like pushing the top of a pack of cards sideways.' },
    { t: 'Shear stress', d: 'The shearing force divided by the area it acts on. Measured in megapascals (MPa).' },
    { t: 'Shear strength', d: 'The shear stress at which a material gives way. Soft aluminium is about 76 MPa, mild steel about 300 MPa.' },
    { t: 'Clearance (gap)', d: 'The sideways gap between the two edges as they pass. For a clean cut it must be a small fraction of the thickness.' },
    { t: 'Edge angle', d: 'The angle of the metal wedge that forms the edge. Bigger angles are stronger but need more force.' },
    { t: 'Edge radius', d: 'How rounded the very tip of the edge is. A sharp edge is a few thousandths of a millimetre, a blunt one is ten times that.' },
  ],
  defaults: { mat: 'paper', gap: 0, blunt: 5, beta: 65, travel: 0.6, auto: true },
  controls: [
    { key: 'mat', type: 'seg', label: 'What you are cutting', options: [{ v: 'paper', label: 'Paper' }, { v: 'cloth', label: 'Cloth' }, { v: 'card', label: 'Card' }, { v: 'alu', label: 'Aluminium' }], fmt: (v) => MATS[v].t + ' mm thick' },
    { key: 'gap', type: 'range', label: 'Gap between the blades', min: 0, max: 0.4, step: 0.005, ends: ['touching', 'loose'], fmt: (v) => fmtMm(v) },
    { key: 'blunt', type: 'range', label: 'Edge radius (bluntness)', min: 2, max: 150, step: 1, ends: ['sharp', 'blunt'], fmt: (v) => Math.round(v) + ' µm' },
    { key: 'beta', type: 'range', label: 'Edge angle', min: 20, max: 85, step: 1, ends: ['like a knife', 'like scissors'], fmt: (v) => Math.round(v) + '°' },
    { key: 'auto', type: 'toggle', label: 'Keep cutting' },
    { key: 'travel', type: 'range', label: 'Close the blades by hand', min: 0, max: 1, step: 0.005, ends: ['open', 'passed'], fmt: (v) => Math.round(v * 100) + '%', hint: 'Switch off "Keep cutting" to use this.' },
  ],
  quiz: [
    { q: 'How do the two edges of a pair of scissors move during a cut?', options: ['They press together like a knife on a board', 'They pass each other, side by side', 'Only one of them moves', 'They spin'], answer: 1, why: 'Each edge slides past the other blade\'s flat face. The sheet between them is pushed opposite ways and shears.' },
    { q: 'Paper is 0.1 mm thick. The gap between the blades opens to 0.2 mm. What happens?', options: ['A cleaner cut', 'The paper bends into the gap and folds', 'The blades get sharper', 'Nothing changes'], answer: 1, why: 'With a gap wider than the sheet, nothing shears. The sheet just slips down between the blades.' },
    { q: 'Why does a blunt edge need a harder squeeze?', options: ['It is heavier', 'It spreads the force over more area, so the stress is lower', 'It is colder', 'It makes the paper thicker'], answer: 1, why: 'Stress is force ÷ area. A rounded edge touches more of the sheet, so you need more force to reach the same stress.' },
  ],
  reel: [
    { ms: 5600, caption: 'The two edges never meet: they slide past each other and shear the paper between them.', set: { mat: 'paper', gap: 0, blunt: 5, beta: 65, auto: false }, anim: { travel: [0.05, 0.85] }, view: { pos: [1.7, 4.9, 10.5], target: [1.7, 4.3, 0] }, spin: 0 },
    { ms: 5600, caption: 'Open a gap wider than the paper and it just folds instead of shearing.', set: { mat: 'paper', gap: 0.2, blunt: 5, beta: 65, auto: false }, anim: { travel: [0.05, 0.9] }, view: { pos: [1.7, 4.9, 10.5], target: [1.7, 4.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); g.scale.setScalar(U); g.position.set(1.7, 4.9, 0); stage.root.add(g);
    const steel = M.metal(COL.steel, { roughness: 0.35 });
    const blades = [new THREE.Mesh(new THREE.BufferGeometry(), steel), new THREE.Mesh(new THREE.BufferGeometry(), steel)];
    blades.forEach((b) => { b.castShadow = true; g.add(b); });
    const sheetMat = new THREE.MeshStandardMaterial({ color: COL.paper, roughness: 0.9, side: THREE.DoubleSide });
    const left = ribbon(40, sheetMat), right = ribbon(40, sheetMat); g.add(left, right);
    const fT = force(COL.cut, 0.14, 0.8), fB = force(COL.cut, 0.14, 0.8); g.add(fT, fB);
    const lb = {
      top: stage.label('Top blade, coming down', [5.4, 4.4, DEPTH / 2], g),
      bot: stage.label('Bottom blade, coming up', [-5.4, -4.4, DEPTH / 2], g),
      inner: stage.label('Flat inner faces', [2.6, -2.6, DEPTH / 2], g),
      bev: stage.label('Bevel', [4.5, 2.2, DEPTH / 2], g),
      sheet: stage.label('', [6.6, -2.2, DEPTH / 2], g, 'hot'),
      state: stage.label('', [0, -3.2, DEPTH / 2], g, 'hot'),
    };
    const cur = { st: null, key: '' };
    const gauge = board(stage.root, 6.2, 1.9, 880, 270, (c, w, h) => {
      panelBg(c, w, h);
      const st = cur.st; if (!st) return;
      c.fillStyle = '#e8eef8'; c.font = 'bold 32px sans-serif'; c.fillText('Gap between the edges ÷ thickness of the sheet', 28, 46);
      const x0 = 40, cw = w - 80, y = 100, bh = 70, X = (r) => x0 + cw * Math.min(r, 1.5) / 1.5;
      const zone = (a, b, col, t) => { c.fillStyle = col; c.fillRect(X(a), y, X(b) - X(a), bh); c.fillStyle = '#07080c'; c.font = 'bold 30px sans-serif'; c.fillText(t, X(a) + 12, y + 46); };
      zone(0, 0.15, '#5ce1a9', ''); zone(0.15, 1, '#ffb547', 'ragged'); zone(1, 1.5, '#ff5a8a', st.m.stiff ? 'jams' : 'folds, no cut');
      c.fillStyle = '#5ce1a9'; c.font = 'bold 30px sans-serif'; c.fillText('clean', X(0), y + bh + 36);
      c.fillStyle = 'rgba(255,255,255,.65)'; c.font = '28px sans-serif'; c.fillText('15%', X(0.15) + 4, y + bh + 36); c.fillText('100%', X(1) - 34, y + bh + 36);
      c.fillStyle = '#8ef0ff'; c.beginPath(); c.moveTo(X(st.ratio), y - 4); c.lineTo(X(st.ratio) - 15, y - 28); c.lineTo(X(st.ratio) + 15, y - 28); c.fill();
      c.fillRect(X(st.ratio) - 2.5, y - 6, 5, bh + 12);
      c.font = 'bold 32px sans-serif'; c.fillText(Math.round(st.ratio * 100) + '%', Math.min(X(st.ratio) + 22, w - 110), y - 8);
    }, [1.7, 0.95, 2.6], 0);
    gauge.mesh.rotation.x = -0.5;
    let d = 0, t = 0, shapeKey = '';
    const setBlade = (mesh, pts) => {
      mesh.geometry.dispose();
      const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
      mesh.geometry = new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: false, curveSegments: 4 }); mesh.geometry.translate(0, 0, -DEPTH / 2);
    };
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        stage.floor.visible = true;
        const st = shearState(s), m = st.m;
        const gT = s.gap / m.t, rT = Math.max(0.01, s.blunt / 1000 / m.t), w = Math.max(st.gEff / m.t, 0.1);
        // The blades are rebuilt, in thicknesses, when the gap, angle, edge or sheet changes.
        const sk = [gT.toFixed(3), s.beta, rT.toFixed(3)].join();
        if (sk !== shapeKey) {
          shapeKey = sk;
          const top = corner(gT, 0, s.beta, rT);
          setBlade(blades[0], top); setBlade(blades[1], top.map(([u, v]) => [-u, -v]).reverse());
        }
        // how far the edges have closed
        if (s.auto && !inReel()) { t = (t + dt * 0.22) % 1.35; d = dOf(Math.min(1, t)); }
        else d = approach(d, dOf(s.travel), 14, dt);
        const pen = Math.max(0, d);
        blades[0].position.y = 0.5 - d / 2; blades[1].position.y = -0.5 + d / 2;
        // the sheet
        sheetMat.color.setHex(m.col);
        const pf = st.result === 'clean' ? 0.45 : 0.85;                         // how far in before it breaks
        const cutNow = st.result !== 'folds' && st.result !== 'jams' && pen >= pf;
        const step = (u, amt) => (amt / 2) * (1 - 2 * sm((u + w / 2) / w));     // +amt/2 on the left, −amt/2 on the right
        const bend = st.result === 'folds' || st.result === 'jams';
        const centre = (u, sideR) => {
          if (!cutNow) return step(u, pen);
          const burr = (step(u, pf) - (sideR ? -pf / 2 : pf / 2)) * (st.result === 'ragged' ? 1 : 0.35);
          return (sideR ? -pen / 2 : pen / 2) + burr;
        };
        const line = (sideR, sign) => (u) => {
          const c = centre(u, sideR);
          if (!bend) return [u, c + sign * 0.5];
          const e = 0.02, sl = (centre(u + e, sideR) - centre(u - e, sideR)) / (2 * e), n = Math.hypot(1, sl);
          return [u - sign * 0.5 * sl / n, c + sign * 0.5 / n];
        };
        left.set(-WIDE, 0, line(false, 1), line(false, -1));
        right.set(0, WIDE, line(true, 1), line(true, -1));
        const push = pen > 0 && !cutNow && !bend ? 2.2 : pen > 0 && bend ? 1.1 : 0;
        fT.aim([3.6, 0.5 - d / 2 + 5.7 + push, DEPTH / 2], [0, -1, 0], push);
        fB.aim([-3.6, -0.5 + d / 2 - 5.7 - push, DEPTH / 2], [0, 1, 0], push);
        const narrow = fitNarrow(stage, [lb.inner, lb.bev, lb.bot], -0.08);
        lb.top.position.y = 4.4 + 0.5 - d / 2; lb.bot.position.y = -4.4 - 0.5 + d / 2; lb.bev.position.y = 2.6 - d / 2;
        const txt = (l, v) => { if (l.element.textContent !== v) l.element.textContent = v; };
        txt(lb.sheet, `${m.name}, ${m.t} mm thick`);
        txt(lb.state, cutNow ? (st.result === 'clean' ? 'Sheared clean through' : 'Torn through: a ragged edge') : bend && pen > 0.3 ? (m.stiff ? 'Wedged between the blades' : 'Folded into the gap: no cut') : pen > 0.02 ? 'Shearing' : '');
        lb.state.visible = !!lb.state.element.textContent;
        const key = [s.mat, st.ratio.toFixed(3)].join();
        if (key !== cur.key) { cur.key = key; cur.st = st; gauge.redraw(); }
        gauge.place(tall(stage) ? [1.7, 11.6, 0] : [1.7, 5.0, -4], tall(stage) ? 1.6 : 1.4);
        gauge.mesh.rotation.x = inReel() ? 0 : -0.5;
        gauge.mesh.visible = !narrow;
        g.scale.setScalar(inReel() && tall(stage) ? U * 1.1 : narrow ? U * 0.8 : U);
      },
      readout: (s) => {
        const st = shearState(s), cut = st.result === 'clean' || st.result === 'ragged';
        const head = st.result === 'clean' ? '<span class="ok">Clean cut</span>' : st.result === 'ragged' ? 'Ragged cut' : `<span class="no">${st.result === 'jams' ? 'Jams: no cut' : 'Folds: no cut'}</span>`;
        return rows(head, [
          ['Gap, with edge rounding', `${fmtMm(st.gEff)}, ${Math.round(st.ratio * 100)}% of sheet`, st.ratio < 0.15 ? 'ok' : st.ratio >= 1 ? 'no' : ''],
          ['Force at the cut', cut ? fmtN(st.F) : 'nothing shears'],
          ['Area being sheared', `${st.area < 0.01 ? st.area.toFixed(4) : st.area.toFixed(3)} mm²`],
          ['Shear strength of the sheet', `${st.m.tau} MPa`],
          ['Pressure under the edge', cut ? `${Math.round(st.press)} MPa` : 'low'],
          ['Metal 0.1 mm behind the edge', `${fmtMm(st.back)} thick${s.beta < 40 ? ': it would chip' : ''}`, s.beta < 40 ? 'no' : ''],
        ], 2);
      },
    };
  },
};
