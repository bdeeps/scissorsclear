// Chapter 5: why right-handed scissors fail in a left hand. Two things go wrong, and both come from
// which blade is on which side: the hand's sideways push, and the line of sight.
import { THREE, approach, clamp } from '../kit.js';
import { makeScissors, makeSheet, cutState, phiAt, MATS, DIM, S, COL, rows, fitNarrow, dot, force, board, drawMicro, fmtN, fmtMm, inReel, tall } from '../scissors.js';

const A = 46;                       // mm: where the edges cross in this scene
const SHOW = 30;                    // gaps and the bow are drawn this many times too big
// A closing hand does not squeeze straight. The thumb pushes away from the palm and the fingers
// curl in towards it, so the two handles are pushed opposite ways along the pivot's axis.
// A right hand pushes the thumb handle to the left and pulls the finger handle to the right.
// That rocks the two halves about the pivot. With right-handed scissors it presses the edges
// together. Swap hands and the same push levers them apart. `side` is that push in newtons.
export const matched = (s) => s.hand === s.scis;
const state = (s) => cutState({ mat: MATS.paper, a: A, tight: s.tight, edgeUm: 5, side: (matched(s) ? 1 : -1) * s.side });
const EYE = { right: [-7.2, 9.6, -4.6], left: [-7.2, 9.6, 4.6] };      // over the shoulder of each hand, relative to the target

export default {
  id: 'hands',
  short: 'Left and right',
  title: 'Why scissors are handed',
  subtitle: 'In the wrong hand, your squeeze pushes the blades apart and the top blade hides the line.',
  view: { pos: [4.4, 8.6, 9.2], target: [0.5, 3.9, 0] },
  learn: `<p>Scissors look symmetrical, but they are not. One blade is always in front of the other. Flip a pair over and the same blade is still on the same side: you cannot turn right-handed scissors into left-handed ones by turning them round. Roughly one person in ten is left-handed, and this matters to every one of them.</p>
    <p><b>Problem one: the push.</b> Your hand does not squeeze straight. As it closes, the <b>thumb pushes away from the palm</b> and the <b>fingers curl in towards it</b>. So the two handles get pushed sideways in opposite directions. The handles are levers sideways too, so this rocks the blades.</p>
    <p>In right-handed scissors held in the right hand, that rocking presses the two edges <b>together</b>, which is exactly what a clean cut needs. Put the same scissors in the left hand and the sideways pushes swap over. Now every squeeze levers the edges <b>apart</b>. If the pivot is at all loose, a gap opens and the paper folds.</p>
    <p><b>Problem two: the view.</b> A right-hander looks down from the left of the scissors and sees the line just beside the top blade. A left-hander looks from the right, and the top blade is in the way.</p>
    <p><b>True left-handed scissors</b> are a mirror image, blades and all. Scissors with only the handles reshaped do not fix either problem.</p>
    <p class="tip"><b>Try it:</b> switch to the left hand and loosen the pivot a little. Then turn on "Look through the user's eyes" and try to see the pink line.</p>`,
  terms: [
    { t: 'Handedness (of scissors)', d: 'Which blade is on top and on which side. It cannot be changed by turning the scissors over.' },
    { t: 'True left-handed scissors', d: 'A full mirror image of right-handed scissors, with the blades swapped as well as the handles.' },
    { t: 'Sideways push', d: 'The part of your squeeze that acts along the pivot, not across it. Thumb and fingers push opposite ways.' },
    { t: 'Line of sight', d: 'The straight line from your eye to the thing you are looking at. Anything on that line hides it.' },
  ],
  defaults: { hand: 'right', scis: 'right', tight: 0.4, side: 3, eye: false },
  controls: [
    { key: 'hand', type: 'seg', label: 'Which hand holds them', options: [{ v: 'right', label: 'Right hand' }, { v: 'left', label: 'Left hand' }] },
    { key: 'scis', type: 'seg', label: 'Which scissors', options: [{ v: 'right', label: 'Right-handed' }, { v: 'left', label: 'True left-handed' }] },
    { key: 'tight', type: 'range', label: 'Pivot screw', min: 0, max: 1, step: 0.01, ends: ['loose', 'done up hard'], fmt: (v) => (v < 0.3 ? 'loose' : v < 0.75 ? 'snug' : 'tight') },
    { key: 'side', type: 'range', label: 'Sideways push of the hand', min: 0, max: 6, step: 0.1, ends: ['none', 'strong'], fmt: (v) => v.toFixed(1) + ' N' },
    { key: 'eye', type: 'toggle', label: 'Look through the user\'s eyes' },
  ],
  quiz: [
    { q: 'Can you make right-handed scissors left-handed by turning them upside down?', options: ['Yes', 'No: the same blade stays on the same side', 'Only if they are plastic', 'Only small ones'], answer: 1, why: 'Flipping scissors over swaps top and bottom and left and right together, so the blade layout is unchanged.' },
    { q: 'In the wrong hand, what does the sideways push of thumb and fingers do to the blades?', options: ['Presses the edges together', 'Levers the edges apart', 'Sharpens them', 'Nothing'], answer: 1, why: 'Thumb and fingers push opposite ways. In the matching hand that closes the edges. In the other hand it opens a gap.' },
    { q: 'Why can a left-hander not see the cutting line with right-handed scissors?', options: ['The paper is too thin', 'The top blade is between the eye and the line', 'The handles are too big', 'Left-handers need more light'], answer: 1, why: 'The top blade sits on the right. Seen from the right, it covers the place where the cut is happening.' },
  ],
  reel: [
    { ms: 6000, caption: 'In a left hand, the same squeeze levers right-handed blades apart, and the top blade hides the line.', set: { scis: 'right', hand: 'left', tight: 0.2, eye: false }, anim: { side: [0, 5] }, view: { pos: [4.2, 7.6, 8.0], target: [0.9, 3.4, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const holder = new THREE.Group(); holder.scale.setScalar(S); holder.position.set(0.4, 3.0, 0); stage.root.add(holder);
    const k = makeScissors({ color: 0xe8502a }); holder.add(k.g);
    const sheet = makeSheet({ w: 55, x1: 140 }); holder.add(sheet);
    const touch = dot(COL.good, 2.4); holder.add(touch);
    const thumb = force(COL.push, 1.5, 8), fingers = force(COL.push, 1.5, 8), bladeA = force(COL.cyan, 1.2, 6), bladeB = force(COL.cyan, 1.2, 6);
    holder.add(thumb, fingers, bladeA, bladeB);
    const lb = {
      thumb: stage.label('Thumb pushes out', [0, 0, 0], holder, 'hot'),
      fingers: stage.label('Fingers pull in', [0, 0, 0], holder, 'hot'),
      touch: stage.label('', [0, 12, 0], touch, 'hot'),
      line: stage.label('The line you are cutting along', [118, 3, 0], holder),
      top: stage.label('Top blade', [80, 14, 0], holder),
    };
    const cur = { st: null, key: '' };
    const micro = board(stage.root, 3.2, 2.08, 800, 520, (c, w, h) => drawMicro(c, w, h, cur.st, MATS.paper), [4.0, 6.7, -3.6], 0);
    let gapShown = 0, viewKey = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        stage.floor.visible = true;
        const st = state(s), right = s.scis === 'right', rh = s.hand === 'right';
        k.g.scale.z = right ? 1 : -1;                    // true left-handed scissors are the mirror image
        const zs = right ? 1 : -1;
        k.setOpen(phiAt(A));
        k.setShape(A, SHOW * 0.6, 0.06);
        gapShown = approach(gapShown, st.gap, 8, dt);
        const gz = Math.min(gapShown * SHOW, 12) / 2;
        k.top.flip.position.z = gz; k.bot.flip.position.z = -gz;
        sheet.scale.z = zs; sheet.set(A, 14, st.result === 'clean' ? 5 : 1.2);
        touch.position.set(A, 0, 0); touch.material.color.setHex(st.gap > 0 ? COL.cut : COL.good);
        // the hand's sideways pushes: a right hand pushes the thumb handle towards −z and pulls the
        // finger handle towards +z; a left hand does the opposite
        const gT = k.grip(false), gF = k.grip(true), len = s.side > 0.05 ? 10 + s.side * 6 : 0, hz = rh ? -1 : 1;
        thumb.aim([gT[0], gT[1], -hz * 6], [0, 0, hz], len);
        fingers.aim([gF[0], gF[1], hz * 6], [0, 0, -hz], len);
        // what that does at the blades: each blade swings the opposite way to its own handle
        const bl = s.side > 0.05 ? 16 : 0, e0 = k.edge(false, 74), e1 = k.edge(true, 74);
        bladeA.aim([e0[0], e0[1] - 4, hz * 3], [0, 0, -hz], bl);        // the thumb's blade (the lower one)
        bladeB.aim([e1[0], e1[1] + 4, -hz * 3], [0, 0, hz], bl);         // the fingers' blade (the top one)
        const narrow = fitNarrow(stage, [lb.line, lb.top, lb.fingers], -0.1);
        lb.thumb.position.set(gT[0], gT[1] + 24, hz * 14); lb.fingers.position.set(gF[0], gF[1] - 24, -hz * 14);
        lb.thumb.visible = len > 0; lb.fingers.visible = len > 0 && !narrow;
        lb.top.position.z = zs * 2;
        const txt = (l, v) => { if (l.element.textContent !== v) l.element.textContent = v; };
        txt(lb.touch, st.gap > 0 ? `Levered apart: gap ${fmtMm(st.gap)}` : 'Pressed together');
        const key = [st.result, st.gap.toFixed(3)].join();
        if (key !== cur.key) { cur.key = key; cur.st = st; micro.redraw(); }
        micro.place(tall(stage) ? [0.5, 7.4, -5] : [4.0, 6.7, -3.6], tall(stage) ? 2.4 : 1.3);
        micro.mesh.visible = !narrow && !s.eye;
        // the camera: a neutral view, or over the shoulder of whichever hand is holding them
        const vk = (s.eye ? s.hand : 'free');
        if (vk !== viewKey && !inReel()) {
          if (viewKey !== '') { const t = [1.6, 3.4, 0]; s.eye ? stage.setView(EYE[s.hand].map((v, i) => v + t[i]), t, 0.9) : stage.setView([4.4, 8.6, 9.2], [0.5, 3.9, 0], 0.9); }
          viewKey = vk;
        }
      },
      readout: (s) => {
        const st = state(s), ok = matched(s);
        const head = st.result === 'clean' ? '<span class="ok">Cuts cleanly</span>' : st.result === 'ragged' ? 'Chews the paper' : '<span class="no">Paper folds: no cut</span>';
        return rows(head, [
          ['Your squeeze pushes the edges', s.side < 0.05 ? 'neither way' : ok ? 'together' : 'apart', ok ? 'ok' : 'no'],
          ['Can you see the line?', ok ? 'yes' : 'no: the top blade hides it', ok ? 'ok' : 'no'],
          ['Edges pressed together', st.N > 0 ? fmtN(st.N) : 'not touching', st.N > 0 ? 'ok' : 'no'],
          ['From the screw and ride', fmtN(st.set)],
          ['From the hand, at the cut', (st.fromHand >= 0 ? '+ ' : '− ') + fmtN(Math.abs(st.fromHand))],
          ['Gap at the cutting point', fmtMm(st.gap), st.gap > 0 ? 'no' : ''],
        ], 3);
      },
    };
  },
};
