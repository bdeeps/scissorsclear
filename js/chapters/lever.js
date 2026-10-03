// Chapter 2: two levers. Each half turns about the pivot, so force × distance balances:
// squeeze × hand arm = force at the cut × cut arm.
import { THREE, M, box, approach, clamp } from '../kit.js';
import { makeScissors, phiHolding, cutForce, MATS, DIM, S, COL, rows, fitNarrow, pose, force, arrowLen, board, panelBg, cylZ, fmtN, inReel, tall } from '../scissors.js';

const ROD = 5;                     // mm: the cord held between the blades
// Torque balance about the pivot for one half: F_hand × LH = F_cut × a.
export const leverGain = (LH, a) => LH / a;
const aOf = (s) => DIM.HEEL + 2 + clamp(s.pos, 0, 1) * (s.LB - DIM.HEEL - 6);
// What the force at the cut can shear, at this spot, with sharp blades (scissors.js, cutForce).
const CAN = ['paper', 'card', 'alu', 'steel'];

export default {
  id: 'lever',
  short: 'Two levers',
  title: 'Two levers that share a pivot',
  subtitle: 'Cut near the pivot and your squeeze is multiplied. Cut at the tip and it shrinks.',
  view: { pos: [0.1, 4.6, 11.6], target: [0.1, 4.7, 0] },
  learn: `<p>Each half of a pair of scissors is a <b>lever</b>: a stiff bar that turns about a fixed point, the <b>fulcrum</b>. Here the fulcrum is the pivot screw. Your hand pushes on one side of it and the blade pushes on the thing you are cutting on the other side. A lever with the fulcrum in the middle is called a <b>first-class lever</b>, like a see-saw.</p>
    <p>A lever balances <b>turning effects</b>, not forces. A turning effect is a force times its distance from the fulcrum (<a href="https://glassbox.how/torqueclear/">TorqueClear</a> is all about this). So:</p>
    <p><b>force at the cut = squeeze × (hand distance ÷ cut distance)</b></p>
    <p>Your hand sits about 70 mm from the pivot. Cut 14 mm from the pivot and the blades push five times harder than you squeeze. Cut 90 mm out, near the tip, and they push <i>less</i> hard than you do. That is why you slide tough things like thick card or a plant stem deep into the jaws.</p>
    <p>There is no free lunch. Near the pivot the blades move only a little for a big swing of the handles. You trade distance for force. Tool makers use the same sum: <b>tin snips</b> have long handles and short blades to cut sheet metal, and <b>hair scissors</b> have long blades for a long, light, quick cut.</p>
    <p class="tip"><b>Try it:</b> slide the cord from the tip to the pivot and watch the force at the cut climb. Then press "Tin snips" and see what long handles do.</p>`,
  terms: [
    { t: 'Lever', d: 'A stiff bar that turns about a fixed point. It can trade a small force over a long distance for a big force over a short one.' },
    { t: 'Fulcrum', d: 'The point a lever turns about. In scissors it is the pivot screw.' },
    { t: 'First-class lever', d: 'A lever with the fulcrum between the effort and the load, like a see-saw or a pair of pliers.' },
    { t: 'Mechanical advantage', d: 'How many times a machine multiplies your force. For scissors it is hand distance ÷ cut distance.' },
    { t: 'Newton (N)', d: 'The unit of force. A 100 gram apple weighs about 1 N.' },
  ],
  defaults: { pos: 0.45, squeeze: 20, LH: 70, LB: 95 },
  controls: [
    { key: 'pos', type: 'range', label: 'Where you cut', min: 0, max: 1, step: 0.005, ends: ['by the pivot', 'at the tip'], fmt: (v, s) => Math.round(aOf(s)) + ' mm out' },
    { key: 'squeeze', type: 'range', label: 'How hard you squeeze', min: 2, max: 100, step: 1, ends: ['gently', 'with all your grip'], fmt: (v) => Math.round(v) + ' N' },
    { key: 'LH', type: 'range', label: 'Handle length (pivot to hand)', min: 50, max: 220, step: 1, ends: ['short', 'long'], fmt: (v) => Math.round(v) + ' mm' },
    { key: 'LB', type: 'range', label: 'Blade length (pivot to tip)', min: 45, max: 150, step: 1, ends: ['short', 'long'], fmt: (v) => Math.round(v) + ' mm' },
    { key: 'preset', type: 'buttons', label: 'Try a real tool', items: [
      { label: 'Household', act: (s) => { s.LH = 70; s.LB = 95; } },
      { label: 'Tin snips', act: (s) => { s.LH = 190; s.LB = 55; } },
      { label: 'Hair scissors', act: (s) => { s.LH = 62; s.LB = 110; } },
      { label: 'Paper shears', act: (s) => { s.LH = 80; s.LB = 150; } },
    ] },
  ],
  quiz: [
    { q: 'Your hand is 70 mm from the pivot and you cut 14 mm from the pivot. You squeeze with 20 N. What is the force at the cut?', options: ['4 N', '20 N', '100 N', '980 N'], answer: 2, why: '20 N × (70 ÷ 14) = 20 N × 5 = 100 N. The short side of the lever gets the big force.' },
    { q: 'Why do tin snips have long handles and short blades?', options: ['To look strong', 'To make the hand distance large and the cut distance small', 'To cut faster', 'So they fit in a pocket'], answer: 1, why: 'Force at the cut = squeeze × hand distance ÷ cut distance. Long handles and short blades make that ratio large.' },
    { q: 'What do you give up when you cut close to the pivot?', options: ['Nothing', 'Sharpness', 'Distance: the blades move only a little for each squeeze', 'The edge gets hot'], answer: 2, why: 'A lever trades distance for force. Near the pivot you get a strong but short cut.' },
  ],
  reel: [
    { ms: 5600, caption: 'Each half is a lever, and the pivot screw is its fulcrum.', set: { squeeze: 20, LH: 70, LB: 95 }, anim: { pos: [0.95, 0.05] }, view: { pos: [0.4, 4.6, 11], target: [0.4, 4.4, 0] }, spin: 0 },
    { ms: 5800, caption: 'Squeeze with 20 newtons and the blades push with 100 near the pivot, but only 16 at the tip.', set: { squeeze: 20, LH: 70, LB: 95 }, anim: { pos: [0, 0.97] }, view: { pos: [0.4, 4.6, 11], target: [0.4, 4.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const holder = new THREE.Group(); stage.root.add(holder);
    let k = null, built = '';
    const rod = cylZ(ROD / 2, -16, 16, M.matte(COL.wood)); holder.add(rod);
    const hand = [force(COL.push, 1.5, 8), force(COL.push, 1.5, 8)], cut = [force(COL.cut, 1.5, 8), force(COL.cut, 1.5, 8)];
    holder.add(...hand, ...cut);
    const dimMat = [M.glow(COL.push), M.glow(COL.cut)];
    const dims = [0, 1].map((i) => { const b = box(1, 1.2, 1.2, dimMat[i]); b.castShadow = false; holder.add(b); return b; });
    const ticks = [0, 1, 2].map((i) => { const b = box(1.2, 9, 1.2, M.glow(i === 0 ? 0xffffff : i === 1 ? COL.push : COL.cut)); b.castShadow = false; holder.add(b); return b; });
    const lb = {
      hand: stage.label('', [0, 0, 0], holder, 'hot'), cut: stage.label('', [0, 0, 0], holder, 'hot'),
      fh: stage.label('', [0, 0, 0], holder), fc: stage.label('', [0, 0, 0], holder),
      piv: stage.label('Pivot: the fulcrum', [0, 14, 4], holder),
    };
    const cur = { s: null };
    const chart = board(stage.root, 6.2, 3.37, 920, 500, (g, w, h) => {
      panelBg(g, w, h);
      const s = cur.s; if (!s) return;
      const a = aOf(s), F = s.squeeze * leverGain(s.LH, a);
      g.fillStyle = '#e8eef8'; g.font = 'bold 34px sans-serif'; g.fillText('Force at the cut = squeeze × hand arm ÷ cut arm', 28, 50);
      const x0 = 96, y0 = h - 70, cw = w - 140, ch = h - 170, FM = Math.max(100, Math.ceil(s.squeeze * leverGain(s.LH, 14) / 100) * 100);
      const X = (mm) => x0 + cw * mm / s.LB, Y = (f) => y0 - ch * Math.min(f, FM) / FM;
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '26px sans-serif';
      for (let i = 0; i <= 4; i++) { const f = FM * i / 4; g.beginPath(); g.moveTo(x0, Y(f)); g.lineTo(x0 + cw, Y(f)); g.stroke(); g.fillText(Math.round(f) + ' N', x0 - 84, Y(f) + 9); }
      for (let mm = 0; mm <= s.LB; mm += s.LB > 110 ? 30 : 20) g.fillText(mm + '', X(mm) - 10, y0 + 30);
      g.fillText('mm from the pivot', x0 + cw - 215, y0 + 60);
      // your own squeeze, for comparison
      g.setLineDash([10, 8]); g.strokeStyle = '#ffb547'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, Y(s.squeeze)); g.lineTo(x0 + cw, Y(s.squeeze)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffb547'; g.fillText('your squeeze', x0 + cw - 130, Y(s.squeeze) - 10);
      g.strokeStyle = '#ff5a8a'; g.lineWidth = 6; g.beginPath();
      for (let mm = 12, first = true; mm <= s.LB; mm += 1) { const f = s.squeeze * leverGain(s.LH, mm); first ? g.moveTo(X(mm), Y(f)) : g.lineTo(X(mm), Y(f)); first = false; }
      g.stroke();
      g.fillStyle = '#8ef0ff'; g.beginPath(); g.arc(X(a), Y(F), 13, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
      g.font = 'bold 34px sans-serif'; g.fillText(fmtN(F), Math.min(X(a) + 20, w - 130), Math.max(Y(F) - 16, y0 - ch + 26));
    }, [3.7, 7.6, -0.6], 0);
    let a = 40, key = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const LH = Math.round(s.LH), LB = Math.round(s.LB), sig = LH + ':' + LB;
        if (sig !== built) {
          if (k) { holder.remove(k.g); k.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
          k = makeScissors({ LH, LB, handles: LH > 130 ? 'steel' : 'plastic', root: LH > 130 ? 10 : 8, t: LH > 130 ? 3.4 : DIM.T, color: 0xe8502a });
          holder.add(k.g); built = sig;
        }
        const f = pose(stage, holder, 3.6, 0), up = f > 1;
        // keep the whole tool in the picture, whatever its size
        const span = LH + 40 + LB, sc = S * f * clamp(215 / span, 0.5, 1.05);
        holder.scale.setScalar(sc);
        const mid = (LB - LH - 36) / 2 * sc;
        if (up) holder.position.y = 4.4 - mid; else holder.position.x = 0.4 - mid;
        a = approach(a, aOf(s), 12, dt);
        k.setOpen(phiHolding(a, ROD));
        rod.position.set(a, 0, 0);
        const F = s.squeeze * leverGain(LH, a);
        const gT = k.grip(true), gB = k.grip(false), lh = arrowLen(s.squeeze, 8, 16), lc = arrowLen(F, 8, 16);
        hand[0].aim([gB[0], gB[1] + 21 + lh, 2], [0, -1, 0], lh);
        hand[1].aim([gT[0], gT[1] - 21 - lh, 2], [0, 1, 0], lh);
        cut[0].aim([a, ROD / 2 + 6 + lc, 3], [0, -1, 0], lc);
        cut[1].aim([a, -ROD / 2 - 6 - lc, 3], [0, 1, 0], lc);
        // distance rulers under the tool
        const yd = Math.min(gT[1] - 30, -62);
        dims[0].scale.x = LH; dims[0].position.set(-LH / 2, yd, 0);
        dims[1].scale.x = a; dims[1].position.set(a / 2, yd, 0);
        ticks[0].position.set(0, yd, 0); ticks[1].position.set(-LH, yd, 0); ticks[2].position.set(a, yd, 0);
        const narrow = fitNarrow(stage, [lb.piv, lb.fh], -0.1);
        lb.hand.position.set(-LH / 2, yd - 9, 0); lb.cut.position.set(a / 2 + 4, yd - 9, 0);
        lb.fh.position.set(gT[0] - 34, gT[1] - 26 - lh / 2, 2); lb.fc.position.set(a, ROD / 2 + 15 + lc, 3);
        const txt = (l, t) => { if (l.element.textContent !== t) l.element.textContent = t; };
        txt(lb.hand, narrow ? `${LH} mm` : `Hand arm ${LH} mm`); txt(lb.cut, narrow ? `${Math.round(a)} mm` : `Cut arm ${Math.round(a)} mm`);
        txt(lb.fh, `Squeeze ${fmtN(s.squeeze)}`); txt(lb.fc, `${fmtN(F)} at the cut`);
        const sk = [LH, LB, Math.round(a), s.squeeze].join();
        if (sk !== key) { key = sk; cur.s = s; chart.redraw(); }
        chart.place(tall(stage) ? [0, 13.4, 0] : [3.4, 7.0, 0], tall(stage) ? 1.45 : 0.9);
        chart.mesh.visible = !narrow;
      },
      readout: (s) => {
        const av = aOf(s), gain = leverGain(s.LH, av), F = s.squeeze * gain;
        const can = CAN.filter((m) => cutForce(MATS[m], av) <= F).map((m) => MATS[m].name.toLowerCase().replace(' sheet', ''));
        return rows(`${fmtN(F)} at the cut`, [
          ['Lever ratio', `${Math.round(s.LH)} ÷ ${Math.round(av)} = × ${gain.toFixed(gain < 10 ? 2 : 1)}`, gain >= 1 ? 'ok' : 'no'],
          ['Your squeeze', fmtN(s.squeeze)],
          ['Like a weight of', `${(F / 9.81).toFixed(F < 98 ? 1 : 0)} kg on the blade`],
          ['Enough here to cut', can.length ? can.join(', ') : 'not even paper'],
          ['Blade moves', `${(1 / gain).toFixed(2)} mm per mm of hand`],
        ], 2);
      },
    };
  },
};
