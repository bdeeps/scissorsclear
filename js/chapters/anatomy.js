// Chapter 1: take a pair of scissors apart.
import { exploder, approach, clamp } from '../kit.js';
import { makeScissors, crossAt, DIM, D2R, S, rows, fitNarrow, pose, dot } from '../scissors.js';

export default {
  id: 'anatomy',
  short: 'Inside scissors',
  title: 'Inside a pair of scissors',
  subtitle: 'Two blades, two handles and one screw. Nothing else.',
  view: { pos: [3.8, 6.4, 9.2], target: [0.2, 3.6, 0] },
  learn: `<p>A pair of scissors is only three parts: two <b>halves</b> and a <b>pivot screw</b> (or a rivet) that joins them. Each half is one piece of steel. The front of it is a <b>blade</b>, and the back is a <b>shank</b> that ends in a ring for your fingers, called a <b>bow</b>.</p>
    <p>Look at how the halves cross. The blade that is on top at the tip belongs to the handle that is at the bottom. That crossing is what turns a squeeze of your hand into a closing of the blades.</p>
    <p>Each blade has a flat <b>inner face</b> that slides against the other blade, and a slanted <b>bevel</b> ground on the outside. Where they meet is the <b>edge</b>. Just behind the screw is a small flat called the <b>ride</b>, where the two halves rub. Hold on to that word: the ride turns out to matter a lot.</p>
    <p>Now open the scissors slowly. The two edges do not meet all along their length. They <b>cross at one point</b>, and that point runs from the pivot to the tip as you close them. All the cutting happens at that one moving point.</p>
    <p class="tip"><b>Try it:</b> pull the scissors apart to see both flat inner faces. Then put them back and open and close them, watching the glowing crossing point travel.</p>`,
  terms: [
    { t: 'Pivot', d: 'The screw or rivet the two halves turn about. It is the fulcrum of both levers.' },
    { t: 'Blade', d: 'The front part of each half, with one sharpened edge.' },
    { t: 'Bow', d: 'The ring of a handle. The small one is for the thumb, the long one for the fingers.' },
    { t: 'Inner face', d: 'The flat side of a blade that faces the other blade.' },
    { t: 'Bevel', d: 'The slanted strip ground on the outside of a blade to make the edge.' },
    { t: 'Ride', d: 'The small flat just behind the pivot where the two halves rub together.' },
  ],
  defaults: { explode: 0, open: 16, see: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'open', type: 'range', label: 'Open the blades', min: 0, max: 60, step: 0.5, ends: ['shut', 'wide open'], fmt: (v) => v.toFixed(0) + '°' },
    { key: 'see', type: 'toggle', label: 'See-through handles' },
  ],
  quiz: [
    { q: 'How many separate parts does a plain pair of scissors have?', options: ['Two', 'Three: two halves and a pivot', 'Seven', 'Twelve'], answer: 1, why: 'Each half is a blade and a handle in one piece. The screw or rivet is the third part.' },
    { q: 'The blade that is on top at the tip is joined to which handle?', options: ['The top handle', 'The bottom handle', 'Both handles', 'Neither: it is loose'], answer: 1, why: 'The halves cross at the pivot, so the top blade runs back to the bottom handle.' },
    { q: 'As you close the scissors, where do the two edges touch?', options: ['All along at once', 'Only at the tip', 'At one point that travels from the pivot to the tip', 'Nowhere'], answer: 2, why: 'The edges cross at a single point. Closing the blades moves that point outwards, and the cut follows it.' },
  ],
  reel: [
    { ms: 5600, caption: 'A pair of scissors is just three parts: two steel halves and one screw.', set: { open: 24, see: false }, anim: { explode: [0.85, 0] }, view: { pos: [3.2, 4.6, 8.6], target: [0, 3.9, 0] }, spin: 0.5 },
  ],

  build({ stage }) {
    const k = makeScissors({ color: 0xe8502a });
    k.g.scale.setScalar(S); stage.root.add(k.g);
    const setExplode = exploder([
      { obj: k.top.swing, off: [0, 16, 26] },
      { obj: k.bot.swing, off: [0, -16, -26] },
      { obj: k.screw, off: [0, 44, 62] },
      { obj: k.nut, off: [0, -44, -58] },
    ]);
    const cross = dot(0x8ef0ff, 2); k.g.add(cross);
    const L = (text, obj, pos, cls) => stage.label(text, pos, obj, cls);
    const main = [
      L('Blade', k.top.flip, [62, 9, 2], 'hot'),
      L('Pivot screw', k.screw, [0, 11, 5], 'hot'),
      L('Finger bow', k.top.flip, [-DIM.LH - 6, -50, 2]),
      L('Thumb bow', k.bot.flip, [-DIM.LH + 4, -49, 2]),
    ];
    const minor = [
      L('Edge', k.bot.flip, [70, -6.5, 0]),
      L('Point', k.top.flip, [DIM.LB + 5, 2, 0]),
      L('Shank', k.top.flip, [-30, -17, 2]),
    ];
    const inner = [
      L('Flat inner face', k.top.flip, [60, 8, 0]),
      L('Ride: the halves rub here', k.bot.flip, [-14, 22, 0]),
      L('Bevel', k.bot.flip, [84, 4, 2.4]),
      L('Nut', k.nut, [0, -9, -3]),
    ];
    const crossL = L('Edges cross here', cross, [0, 9, 0], 'hot');
    let ph = 16 * D2R, ex = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        k.g.scale.setScalar(S * pose(stage, k.g, 3.4, 0.5));
        ex = approach(ex, s.explode, 12, dt);
        setExplode(ex);
        ph = approach(ph, clamp(s.open, 0, 60) * D2R, 10, dt);
        k.setOpen(ph);
        k.mats.handle.see(!!s.see, 0.25);
        const a = crossAt(ph), on = a >= 6 && a <= DIM.LB && ex < 0.06;
        cross.visible = on; cross.position.set(Math.min(a, DIM.LB), 0, 0);
        const narrow = fitNarrow(stage, minor, -0.1);
        const open = ex > 0.3;
        inner.forEach((l) => { l.visible = open && !narrow; });
        crossL.visible = on && !open;
        minor[0].visible = !narrow && !open; minor[2].visible = !narrow && !open; main[0].visible = !open;
        main[2].visible = main[3].visible = !narrow; main[1].visible = !narrow || open;
      },
      readout: (s) => {
        const p = clamp(s.open, 0, 60) * D2R, a = crossAt(p);
        const head = s.explode > 0.3 ? 'Three parts in all' : a > DIM.LB ? 'Blades shut' : a < DIM.HEEL ? 'Wide open' : `Edges cross ${Math.round(a)} mm out`;
        return rows(head, [
          ['Blades opened', `${s.open.toFixed(0)}°`],
          ['Crossing point', a > DIM.LB ? 'past the tip' : a < DIM.HEEL ? 'at the heel' : `${Math.round(a)} mm from the pivot`],
          ['Pivot to tip', `${DIM.LB} mm`],
          ['Pivot to the hand', `${DIM.LH} mm`],
          ['Blade thickness', `${DIM.T} mm`],
        ], 2);
      },
    };
  },
};
