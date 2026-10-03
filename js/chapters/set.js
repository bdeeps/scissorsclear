// Chapter 4: the set. The blades are bowed and twisted so that they touch at one point only, and
// the screw, the ride and that point hold them together. Loosen the screw and the cut fails.
import { THREE, approach, clamp } from '../kit.js';
import { makeScissors, makeSheet, cutState, phiAt, MATS, DIM, S, SIDE, COL, HAND, rows, fitNarrow, dot, board, drawMicro, fmtN, fmtMm, inReel, tall } from '../scissors.js';

const aOf = (pos) => 16 + clamp(pos, 0, 1) * (DIM.LB - 20);
const WORD = { clean: '<span class="ok">Cuts cleanly</span>', ragged: 'Chews: a ragged cut', folds: '<span class="no">Folds: no cut</span>', jams: '<span class="no">Jams: the sheet wedges in</span>' };

export default {
  id: 'set',
  short: 'One touching point',
  title: 'One touching point that travels',
  subtitle: 'The blades are bowed on purpose. Loosen the screw and paper folds instead of cutting.',
  view: { pos: [1.5, 9.9, 5.9], target: [0.6, 3.3, -0.2] },
  learn: `<p>Lay a ruler along the inside of a scissor blade and you will see daylight under the middle. The blade is not flat. It is slightly <b>bowed</b> towards its partner and slightly <b>twisted</b>, so that the two blades touch at <b>one point only</b>: the point where the edges cross. Scissor makers call this shaping the <b>set</b>. Here the bow is drawn many times too big so you can see it.</p>
    <p>As you close the scissors, that touching point runs from the pivot to the tip. Everywhere else there is a sliver of daylight between the blades. At the one point that matters, the edges are pressed firmly together, with no gap for the paper to slip into.</p>
    <p>What presses them together? The halves touch in three places: the <b>screw</b>, the <b>ride</b> just behind it, and the cutting point. The screw pulls the halves together. The ride props them apart behind the screw, so each half rocks on it like a tiny see-saw and its edge is pushed against the other one.</p>
    <p>Now loosen the screw. The see-saw goes slack and the blades can drift apart. The sheet being cut always pushes the blades sideways a little, and with nothing pressing back, a gap opens. The paper <b>folds</b> into it. Tighten the screw too far and the cut is clean, but most of your squeeze goes into <b>friction</b> (see <a href="https://glassbox.how/frictionclear/">FrictionClear</a>).</p>
    <p class="tip"><b>Try it:</b> loosen the pivot until the paper folds. Then try wet tissue, which is thinner still, and thick card, which forgives a small gap.</p>`,
  terms: [
    { t: 'Set', d: 'The slight bow and twist put into each blade so that the two touch only where the edges cross.' },
    { t: 'Ride', d: 'The flat behind the pivot where the halves rub. It props them apart there, which presses the edges together in front.' },
    { t: 'Pivot tension', d: 'How hard the screw or rivet pulls the two halves together.' },
    { t: 'Contact force', d: 'How hard one edge presses on the other at the cutting point. A few newtons is plenty.' },
    { t: 'Play', d: 'Slack in a joint. A loose pivot lets the blades wobble apart.' },
  ],
  defaults: { mat: 'paper', tight: 0.55, pos: 0.4, blunt: 5, bow: 40, auto: true },
  controls: [
    { key: 'tight', type: 'range', label: 'Pivot screw', min: 0, max: 1, step: 0.01, ends: ['loose', 'done up hard'], fmt: (v) => (v < 0.3 ? 'loose' : v < 0.75 ? 'snug' : 'tight') },
    { key: 'mat', type: 'seg', label: 'What you are cutting', options: [{ v: 'tissue', label: 'Wet tissue' }, { v: 'paper', label: 'Paper' }, { v: 'cloth', label: 'Cloth' }, { v: 'card', label: 'Card' }, { v: 'alu', label: 'Aluminium' }], fmt: (v) => MATS[v].t + ' mm thick' },
    { key: 'blunt', type: 'range', label: 'Edge radius (bluntness)', min: 2, max: 150, step: 1, ends: ['sharp', 'blunt'], fmt: (v) => Math.round(v) + ' µm' },
    { key: 'auto', type: 'toggle', label: 'Keep snipping' },
    { key: 'pos', type: 'range', label: 'Where the edges cross', min: 0, max: 1, step: 0.005, ends: ['by the pivot', 'at the tip'], fmt: (v) => Math.round(aOf(v)) + ' mm out', hint: 'Switch off "Keep snipping" to use this.' },
    { key: 'bow', type: 'range', label: 'How much to exaggerate the bow', min: 1, max: 80, step: 1, ends: ['true size', '80 times'], fmt: (v) => '× ' + Math.round(v) },
  ],
  quiz: [
    { q: 'In how many places do the two blades of good scissors touch along their cutting length?', options: ['All along', 'At one point, where the edges cross', 'At the tip only', 'They never touch'], answer: 1, why: 'The bow and twist leave daylight everywhere except the crossing point, which travels as you close them.' },
    { q: 'Loose scissors fold paper instead of cutting it. Why?', options: ['The paper gets stronger', 'A gap opens between the edges and the paper slips into it', 'The blades get hot', 'The handles are too short'], answer: 1, why: 'With the screw slack nothing presses the edges together. Once the gap is as wide as the paper is thick, nothing shears.' },
    { q: 'What does the ride, the flat behind the pivot, do?', options: ['It is decoration', 'It props the halves apart there, so the edges press together in front', 'It sharpens the blades', 'It holds the screw'], answer: 1, why: 'Each half rocks on the ride. The screw pulls in the middle, so the blade end is pushed against its partner.' },
  ],
  reel: [
    { ms: 5800, caption: 'The blades are bowed, so they touch at one point, and that point runs to the tip as you cut.', set: { mat: 'paper', tight: 0.55, blunt: 5, bow: 50, auto: false }, anim: { pos: [0.02, 0.98] }, view: { pos: [1.6, 9.4, 6.6], target: [0.5, 3.3, 0] }, spin: 0 },
    { ms: 5400, caption: 'Loosen the screw and a gap opens, so the paper folds instead of cutting.', set: { mat: 'paper', blunt: 5, bow: 50, auto: false, pos: 0.5 }, anim: { tight: [0.6, 0] }, view: { pos: [1.6, 9.4, 6.6], target: [0.5, 3.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const holder = new THREE.Group(); stage.root.add(holder);
    const k = makeScissors({ color: 0xe8502a }); holder.add(k.g);
    const sheet = makeSheet({ line: false, w: 42, x1: 125 }); holder.add(sheet);
    const touch = dot(COL.good, 2.4); holder.add(touch);
    const lb = {
      touch: stage.label('', [0, 12, 0], touch, 'hot'),
      day: stage.label('Daylight between the blades', [0, 0, 0], holder),
      ride: stage.label('Ride', [-11, 10, 0], holder),
      screw: stage.label('Screw pulls the halves together', [0, 30, -6], holder),
    };
    const cur = { st: null, key: '' };
    const micro = board(stage.root, 3.4, 2.21, 800, 520, (c, w, h) => drawMicro(c, w, h, cur.st, MATS[cur.mat || 'paper']), [-1.4, 1.6, 1.9], 0);
    micro.mesh.rotation.x = -0.9;
    let a = 40, t = 0, gapShown = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const up = inReel() && tall(stage);
        stage.floor.visible = true;
        holder.position.set(up ? 0.8 : 0.9, 3.3, 0); holder.scale.setScalar(S * (up ? 1.05 : 1));
        if (s.auto && !inReel()) { t = (t + dt * 0.3) % 1.3; a = aOf(Math.min(1, t)); }
        else a = approach(a, aOf(s.pos), 12, dt);
        const m = MATS[s.mat], st = cutState({ mat: m, a, tight: s.tight, edgeUm: s.blunt });
        k.setOpen(phiAt(a));
        k.setShape(a, s.bow, Math.min(0.1, s.bow * 0.0025));
        gapShown = approach(gapShown, st.gap, 10, dt);
        const gz = Math.min(gapShown * Math.max(s.bow, 8), 14) / 2;
        k.top.flip.position.z = gz; k.bot.flip.position.z = -gz;
        sheet.set(a, 14, st.result === 'clean' || st.result === 'ragged' ? 5 : 1.2);
        sheet.children.forEach((c) => { if (c.material.color && c.material.roughness) c.material.color.setHex(m.col); });
        touch.position.set(a, 0, 0);
        touch.material.color.setHex(st.gap > 0 ? COL.cut : COL.good);
        const narrow = fitNarrow(stage, [lb.ride, lb.screw, lb.day], -0.1);
        const txt = (l, v) => { if (l.element.textContent !== v) l.element.textContent = v; };
        txt(lb.touch, st.gap > 0 ? `Gap ${fmtMm(st.gap)}` : 'They touch here only');
        lb.day.position.set(a / 2, -4, 10); lb.day.visible = !narrow && s.bow > 12 && a > 45;
        const key = [s.mat, st.result, st.gap.toFixed(3), s.blunt].join();
        if (key !== cur.key) { cur.key = key; cur.st = st; cur.mat = s.mat; micro.redraw(); }
        micro.place(tall(stage) ? [0.3, 5.0, -6.5] : [0.5, 5.2, -5.2], tall(stage) ? 2.1 : 1.5);
        micro.mesh.rotation.x = inReel() ? -0.6 : -0.9;
        micro.mesh.visible = !narrow;
      },
      readout: (s) => {
        const av = s.auto && !inReel() ? a : aOf(s.pos), st = cutState({ mat: MATS[s.mat], a: av, tight: s.tight, edgeUm: s.blunt });
        const cut = st.result === 'clean' || st.result === 'ragged';
        return rows(st.tooHard && cut ? '<span class="no">Too hard to squeeze</span>' : WORD[st.result], [
          ['Edges pressed together', st.N > 0 ? fmtN(st.N) : 'not touching', st.N > 0 ? 'ok' : 'no'],
          ['Gap at the cutting point', fmtMm(st.gap), st.gap > 0 ? 'no' : ''],
          ['Squeeze needed', cut ? fmtN(st.hand) + (st.hand > HAND.max ? ': too much' : st.hand > HAND.easy ? ': hard work' : '') : 'nothing is cut'],
          ['Screw tension', st.T > 0 ? fmtN(st.T) : `slack, ${fmtMm(st.play)} of play`],
          ['Sideways push of the sheet', fmtN(st.shear * SIDE)],
          ['Edges cross', `${Math.round(av)} mm out, at ${(st.phi * 180 / Math.PI).toFixed(1)}°`],
        ], 3);
      },
    };
  },
};
