// Chapter 6: the same two ideas, lever and shear, in six other tools.
import { THREE, M, approach, clamp } from '../kit.js';
import { makeScissors, makeSpringShears, makeCompound, makeSecateurs, asKind, cutForce, MATS, S, COL, D2R, rows, fitNarrow, pose, force, arrowLen, cylZ, fmtN } from '../scissors.js';

// Sizes are typical of real tools: 10 inch (250 mm) tailor's shears, 10 inch straight tin snips,
// 10 inch compound snips, 8 inch bypass secateurs, 9 inch pinking shears, hand-forged spring shears.
const KINDS = {
  tailor: { name: 'Tailor\'s shears', cls: 'First-class lever, twice', what: 'Long blades for long straight cuts in cloth. The bent handle lets the lower blade slide flat along the table.', pos: 0.5, y: 0,
    make: () => asKind(makeScissors({ LB: 140, LH: 82, handles: 'steel', crank: 17, root: 10, t: 3, bowR: 1.1, tip: 2 })) },
  pinking: { name: 'Pinking shears', cls: 'First-class lever, twice', what: 'Zigzag teeth cut cloth into little slanted edges, so no long thread can pull out and the fraying stays small.', pos: 0.5, y: 0,
    make: () => asKind(makeScissors({ LB: 115, LH: 78, root: 10, t: 3.2, tip: 4, color: 0x2f3440, zig: { amp: 1.7, pitch: 5 } })) },
  snips: { name: 'Tin snips', cls: 'First-class lever, twice', what: 'Long handles and short, thick blades. The lever ratio is high enough to shear thin steel sheet.', pos: 0.4, y: 0,
    make: () => asKind(makeScissors({ LB: 62, LH: 185, handles: 'steel', root: 12, t: 4.5, beta: 80, tip: 4, bowR: 0.9 })) },
  compound: { name: 'Compound snips', cls: 'Two levers in a row', what: 'Each handle is a lever that drives a second lever, the jaw. The two ratios multiply, so short handles cut like long ones.', pos: 0.5, y: 0, make: makeCompound },
  secateurs: { name: 'Secateurs', cls: 'First-class lever, twice', what: 'A sharp curved blade sweeps past a blunt hook that holds the stem. A spring opens them again.', pos: 0.35, y: 0, rod: 9, make: makeSecateurs },
  spring: { name: 'Spring shears', cls: 'Third-class lever', what: 'The oldest kind: one strip of metal bent double. The hand squeezes between the bow and the blades, so the cut gets less force but more travel.', pos: 0.4, y: 0, make: makeSpringShears },
};
const aOf = (m, pos) => m.range[0] + clamp(pos, 0, 1) * (m.range[1] - m.range[0]);

export default {
  id: 'kinds',
  short: 'Kinds of shears',
  title: 'One idea, many scissors',
  subtitle: 'Change the handles, the blades or the pivot and you get a tool for cloth, tin, roses or wool.',
  view: { pos: [0.3, 5.0, 12.6], target: [0.3, 5.0, 0] },
  learn: `<p>Every tool here is the same two ideas: a <b>lever</b> to set the force, and two edges that <b>pass each other</b> to shear. What changes is the shape.</p>
    <p><b>Tailor's shears</b> have long blades for long cuts and a bent handle, so the lower blade lies flat on the table and the cloth is not lifted. <b>Pinking shears</b> have zigzag teeth. Woven cloth frays when a thread pulls out along a straight cut edge. A zigzag edge runs across the threads at a slant, so each loose thread is short and the fraying cannot run far.</p>
    <p><b>Tin snips</b> have long handles and short blades for a big lever ratio. <b>Compound snips</b>, often called aviation snips, go further: each handle is a lever that pushes on a second lever, the jaw. The two ratios multiply.</p>
    <p><b>Secateurs</b> for the garden come in two kinds. The <b>bypass</b> kind shown here works like scissors with one sharp blade passing a hook. The <b>anvil</b> kind presses a blade down on to a flat block, like a knife on a board, which crushes soft green stems.</p>
    <p><b>Spring shears</b> are the oldest scissors of all: one strip of metal bent into a U, used for thousands of years and still used to shear sheep. Your hand squeezes in the middle, so they are a <b>third-class lever</b>. The blades get less force than you give, but they move further and faster, and the bow springs them open again.</p>
    <p>Barbers' scissors, surgeons' scissors, kitchen shears and nail scissors are all variations on the same pair of levers. Children's scissors have rounded tips so that a slip cannot stab.</p>
    <p class="tip"><b>Try it:</b> give every tool the same squeeze and compare the force at the cut. Which one multiplies your squeeze the most, and which one makes it smaller?</p>`,
  terms: [
    { t: 'Tailor\'s shears', d: 'Large scissors with a bent handle, so the lower blade can rest on the table while cutting cloth.' },
    { t: 'Pinking shears', d: 'Scissors with zigzag teeth. The zigzag edge keeps woven cloth from fraying far.' },
    { t: 'Compound leverage', d: 'Two levers in a row, so their ratios multiply.' },
    { t: 'Bypass and anvil', d: 'Bypass blades pass each other like scissors. An anvil blade closes down on to a flat block.' },
    { t: 'Third-class lever', d: 'A lever with the effort between the fulcrum and the load, like tweezers. It trades force for movement.' },
  ],
  defaults: { kind: 'tailor', pos: 0.5, squeeze: 30, auto: true },
  onChange(s, key) { if (key === 'kind') s.pos = KINDS[s.kind].pos; },
  controls: [
    { key: 'kind', type: 'seg', label: 'Which tool', options: Object.entries(KINDS).map(([v, k]) => ({ v, label: k.name })) },
    { key: 'pos', type: 'range', label: 'Where you cut', min: 0, max: 1, step: 0.005, ends: ['deep in the jaws', 'at the tip'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'squeeze', type: 'range', label: 'How hard you squeeze', min: 2, max: 100, step: 1, ends: ['gently', 'with all your grip'], fmt: (v) => Math.round(v) + ' N' },
    { key: 'auto', type: 'toggle', label: 'Keep snipping' },
  ],
  quiz: [
    { q: 'Why do pinking shears cut a zigzag?', options: ['It looks pretty', 'A zigzag edge keeps woven cloth from fraying far', 'It is faster', 'To save cloth'], answer: 1, why: 'On a zigzag edge every loose thread is short, so the fraying cannot run along the edge.' },
    { q: 'Spring shears are squeezed in the middle, between the bow and the blades. What does that do to the force at the cut?', options: ['Makes it bigger than the squeeze', 'Makes it smaller than the squeeze', 'Leaves it the same', 'Reverses it'], answer: 1, why: 'They are a third-class lever. The blades are further from the fulcrum than your hand, so they get less force but more movement.' },
    { q: 'How do compound snips get so much force from short handles?', options: ['A motor', 'A hidden spring', 'Two levers in a row, whose ratios multiply', 'Sharper steel'], answer: 2, why: 'The handle is one lever, multiplying by about 8. The jaw is a second lever. Together they multiply a squeeze more than ten times.' },
  ],
  reel: [
    { ms: 6200, caption: 'Long handles and short blades cut tin, zigzag teeth keep cloth from fraying far, and it is all the same lever.', set: { pos: 0.4, squeeze: 30, auto: true }, anim: { kind: ['snips', 'pinking'] }, view: { pos: [0.3, 4.8, 11], target: [0.3, 4.2, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const holder = new THREE.Group(); stage.root.add(holder);
    const models = {};
    const rod = cylZ(1, -16, 16, M.matte(COL.green)); holder.add(rod);
    const hand = [force(COL.push, 1.5, 8), force(COL.push, 1.5, 8)], cut = [force(COL.cut, 1.5, 8), force(COL.cut, 1.5, 8)];
    holder.add(...hand, ...cut);
    const lb = { name: stage.label('', [0, 0, 0], holder, 'hot'), fc: stage.label('', [0, 0, 0], holder), fulc: stage.label('Fulcrum', [0, 0, 0], holder) };
    let shown = '', u = 0.1, t = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const K = KINDS[s.kind];
        if (!models[s.kind]) { models[s.kind] = K.make(); holder.add(models[s.kind].g); }
        if (shown !== s.kind) { Object.entries(models).forEach(([id, m]) => { m.g.visible = id === s.kind; }); shown = s.kind; }
        const m = models[s.kind], a = aOf(m, s.pos), o = m.origin || [0, 0];
        // centre the tool, whatever its size
        const xs = [m.left, o[0] + m.range[1] + 6], span = xs[1] - xs[0];
        const f = pose(stage, holder, 3.7, 0.3, 1.7), sc = S * f * clamp(225 / span, 0.5, 1.15);
        holder.scale.setScalar(sc);
        const mid = (xs[0] + xs[1]) / 2 * sc;
        if (f > 1) holder.position.y = 4.4 - mid; else holder.position.x = 0.3 - mid;
        // snip: open wide, then close until the edges cross at the chosen spot
        const uc = m.uAt(a);
        t += dt;
        const k = s.auto ? 0.5 + 0.5 * Math.cos(t * 2.2) : 0;
        u = approach(u, uc + (m.uMax - uc) * k * 0.9, 14, dt);
        m.setOpen(u);
        const c = m.cut(a), F = s.squeeze * m.gain(a), H = m.hands(u);
        rod.visible = !!K.rod; if (K.rod) { rod.scale.set(K.rod / 2, K.rod / 2, 1); rod.position.set(c[0], c[1], 0); }
        const lh = arrowLen(s.squeeze, 8, 16), lc = arrowLen(F, 8, 16);
        hand[0].aim([H[0][0], H[0][1] + 16 + lh, 3], [0, -1, 0], lh);
        hand[1].aim([H[1][0], H[1][1] - 16 - lh, 3], [0, 1, 0], lh);
        cut[0].aim([c[0], c[1] + 12 + lc, 4], [0, -1, 0], lc);
        cut[1].aim([c[0], c[1] - 12 - lc, 4], [0, 1, 0], lc);
        const narrow = fitNarrow(stage, [lb.fulc], -0.1, 0.04);
        const txt = (l, v) => { if (l.element.textContent !== v) l.element.textContent = v; };
        txt(lb.name, K.name); lb.name.position.set(o[0] + m.range[1] * 0.55, -70, 0);
        txt(lb.fc, `${fmtN(F)} at the cut`); lb.fc.position.set(c[0], c[1] + 22 + lc, 4);
        lb.fulc.position.set(o[0], o[1] - 20, 6);
      },
      readout: (s) => {
        const K = KINDS[s.kind], m = models[s.kind]; if (!m) return '';
        const a = aOf(m, s.pos), gain = m.gain(a), F = s.squeeze * gain;
        const can = ['paper', 'cloth', 'card', 'alu', 'steel'].filter((x) => cutForce(MATS[x], Math.max(a, 14)) <= F).map((x) => MATS[x].name.toLowerCase().replace(' sheet', '').replace('cotton ', ''));
        return rows(`${K.name}: × ${gain.toFixed(gain < 10 ? 2 : 1)}`, [
          ['Force at the cut', `${fmtN(F)} from a ${fmtN(s.squeeze)} squeeze`, gain >= 1 ? 'ok' : 'no'],
          ['Kind of lever', K.cls],
          ['Hand to fulcrum', s.kind === 'compound' ? `${m.handArm} mm, then a second lever` : `${Math.round(m.handArm)} mm`],
          ['Cut to fulcrum', `${Math.round(a)} mm`],
          ['Strong enough here for', can.length ? can.slice(-3).join(', ') : 'not even paper'],
        ], 2);
      },
    };
  },
};
