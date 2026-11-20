/* Antique Night combat. This module is intentionally independent of game state ownership.
 * One update() call represents one fixed 60 Hz simulation tick. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AntiqueCombat = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const WINDUP = 36;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function groundBounds(enemy, floors) {
    // Preserve the platform that this enemy spawned on; do not walk into gaps.
    if (!enemy.patrol) {
      const f = floors.find(p => enemy.x >= p.x && enemy.x <= p.x + p.w);
      enemy.patrol = f ? { min: f.x + 24, max: f.x + f.w - 24 } : { min: enemy.x - 75, max: enemy.x + 75 };
    }
    return enemy.patrol;
  }
  function updateEnemy(e, s) {
    if (!e.alive) return;
    const bounds = groundBounds(e, s.floors);
    if (!e.ai) e.ai = { state: 'approach', timer: 0, facing: e.dir || -1 };
    const a = e.ai;
    if (e.stun > 0) {
      e.stun--;
      // A hit interrupts an attack, and gives the player time to reposition.
      a.state = 'recover'; a.timer = Math.max(a.timer, 22);
      e.x = clamp(e.x, bounds.min, bounds.max);
      return;
    }
    const dx = s.player.x - e.x;
    if (a.state === 'recover') {
      if (--a.timer <= 0) a.state = 'approach';
      return;
    }
    if (a.state === 'windup') {
      if (--a.timer <= 0) { a.state = 'lunge'; a.timer = 18; a.hit = false; }
      return;
    }
    if (a.state === 'lunge') {
      e.x = clamp(e.x + a.facing * (e.type ? 4.7 : 4.0), bounds.min, bounds.max);
      const p = s.player;
      if (!a.hit && Math.abs(p.x - e.x) < 41 && p.y < e.y + 40 && p.y + p.h > e.y) {
        s.hurt(1); a.hit = true;
      }
      if (--a.timer <= 0 || e.x === bounds.min || e.x === bounds.max) { a.state = 'recover'; a.timer = 45; }
      return;
    }
    if (Math.abs(dx) > 260) return;
    e.dir = dx < 0 ? -1 : 1;
    if (Math.abs(dx) < 120 && s.player.y + s.player.h > e.y - 24) {
      a.state = 'windup'; a.timer = WINDUP; a.facing = e.dir;
    } else if (Math.abs(dx) > 46) {
      e.x = clamp(e.x + e.dir * (e.type ? 1.2 : 0.85), bounds.min, bounds.max);
    }
  }
  function updateFish(f, s) {
    if (!f.alive) return;
    if (!f.ai) f.ai = {state:'swim', timer:0, t:(f.base || f.x) / 30, baseY:f.y};
    const a=f.ai, base=f.base === undefined ? f.x : f.base;
    if (f.stun > 0) {
      f.stun--;
      // Interrupt a shot even if the fish was already telegraphing it.
      a.state='recover'; a.timer=Math.max(a.timer,35);
      f.x=clamp(f.x,base-90,base+90);
      return;
    }
    a.t++;
    if (a.state === 'recover') {
      if (--a.timer <= 0) a.state='swim';
      return;
    }
    if (a.state === 'windup') {
      if (--a.timer <= 0) {
        s.projectiles.push({x:f.x+a.facing*25,y:f.y+17,vx:a.facing*3.1,radius:9,kind:'bubble'});
        a.state='recover'; a.timer=85;
        if (s.particle) s.particle(f.x+a.facing*25,f.y+17,'#a2e5ed',5);
      }
      return;
    }
    // Slow horizontal hover distinct from the ground beast's pursuit and lunge.
    const before=f.x;
    f.x=base+Math.sin(a.t/65)*58;
    f.y=a.baseY+Math.sin(a.t/24)*13;
    f.dir=f.x < before ? -1 : 1;
    const dx=s.player.x-f.x;
    if (Math.abs(dx) < 260 && Math.abs(dx)>52 && Math.abs((s.player.y+s.player.h/2)-(f.y+17)) < 100) {
      a.facing=dx<0?-1:1; f.dir=a.facing; a.state='windup'; a.timer=46;
    }
  }
  function updateBoss(s) {
    const b = s.boss;
    if (!b || !b.alive || s.player.x < 2800) return;
    if (!b.ai) b.ai = { state: 'recover', timer: 65, attacks: 0 };
    const a = b.ai;
    if (b.stun > 0) { b.stun--; return; }
    if (a.state === 'recover') {
      if (--a.timer <= 0) {
        const phase2 = b.hp <= b.max / 2;
        // Phase 2 alternates the horizontal ink wave with a targeted floor brushstroke.
        a.kind = phase2 && a.attacks % 2 ? 'brush' : 'wave';
        a.state = 'windup'; a.timer = a.kind === 'brush' ? 52 : 40;
        a.target = clamp(s.player.x, 2700, 3560);
        a.facing = s.player.x < b.x ? -1 : 1;
        a.attacks++;
      }
      return;
    }
    if (a.state === 'windup' && --a.timer <= 0) {
      if (a.kind === 'wave') {
        s.projectiles.push({ x: b.x + a.facing * 50, y: 408, vx: a.facing * (b.hp <= b.max / 2 ? 5.0 : 4.2), radius: 14, kind: 'ink' });
        if (b.hp <= b.max / 2) {
          s.projectiles.push({ x: b.x + a.facing * 50, y: 328, vx: a.facing * 4.2, radius: 12, kind: 'ink' });
        }
        a.state = 'recover'; a.timer = b.hp <= b.max / 2 ? 75 : 95;
      } else {
        a.state = 'brush-active'; a.timer = 12; a.hit = false;
        if (s.particle) s.particle(a.target, 438, '#b7e4eb', 16);
      }
      return;
    }
    if (a.state === 'brush-active') {
      const p = s.player;
      // Brush only hits near ground; the marked area can be escaped or jumped over.
      if (!a.hit && Math.abs(p.x - a.target) < 65 && p.y + p.h > 409 && p.y < 458) { s.hurt(1); a.hit = true; }
      if (--a.timer <= 0) { a.state = 'recover'; a.timer = 70; }
    }
  }
  function updateProjectiles(s) {
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const b = s.projectiles[i];
      b.x += b.vx;
      const p = s.player, r = b.radius || 12;
      if (b.x + r >= p.x - p.w / 2 && b.x - r <= p.x + p.w / 2 && b.y + r >= p.y && b.y - r <= p.y + p.h) {
        s.hurt(1); s.projectiles.splice(i, 1); continue;
      }
      if (b.x < (s.camera || 0) - 160 || b.x > 3800) s.projectiles.splice(i, 1);
    }
  }
  function update(s) {
    for (const e of s.enemies) updateEnemy(e, s);
    for (const f of s.fish || []) updateFish(f, s);
    updateBoss(s);
    updateProjectiles(s);
  }
  // Call once under the world camera transform, after enemies/boss and before restoring ctx.
  function draw(ctx, s, time) {
    ctx.save();
    for (const e of s.enemies) {
      if (!e.alive || !e.ai || e.ai.state !== 'windup') continue;
      ctx.fillStyle = time % 12 < 6 ? '#ffdc8c' : '#f28c62';
      ctx.font = 'bold 21px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', e.x, e.y - 26);
      ctx.fillStyle = '#ffbd7060'; ctx.fillRect(e.x, e.y + 32, e.ai.facing * 74, 5);
    }
    for (const f of s.fish || []) {
      if (!f.alive || !f.ai || f.ai.state !== 'windup') continue;
      ctx.fillStyle = time % 12 < 6 ? '#d6f7ff' : '#78cfe5';
      ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', f.x, f.y - 18);
      ctx.strokeStyle = '#b9ecf1aa'; ctx.lineWidth=2; ctx.setLineDash([5,7]); ctx.beginPath();
      ctx.moveTo(f.x+f.ai.facing*25,f.y+17); ctx.lineTo(f.x+f.ai.facing*155,f.y+17); ctx.stroke(); ctx.setLineDash([]);
    }
    // A small halo and shards mark successful interruption without changing sprite art.
    for (const e of [...s.enemies, ...(s.fish || [])]) if (e.alive && e.stun > 0) {
      ctx.globalAlpha=.7; ctx.strokeStyle='#edfcff'; ctx.lineWidth=2; ctx.beginPath();
      ctx.arc(e.x,e.y+18,22,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
    }
    const a = s.boss && s.boss.alive && s.boss.ai;
    if (a && a.state === 'windup') {
      ctx.strokeStyle = time % 12 < 6 ? '#ffe6a3' : '#e19d65'; ctx.lineWidth = 3;
      if (a.kind === 'brush') {
        ctx.fillStyle = '#f5b87255'; ctx.fillRect(a.target - 65, 416, 130, 28);
        ctx.strokeRect(a.target - 65, 416, 130, 28);
      } else {
        ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(s.boss.x + a.facing * 45, 408); ctx.lineTo(s.boss.x + a.facing * 550, 408); if (s.boss.hp <= s.boss.max / 2) { ctx.moveTo(s.boss.x + a.facing * 45, 328); ctx.lineTo(s.boss.x + a.facing * 550, 328); } ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (a && a.state === 'brush-active') {
      ctx.fillStyle = '#b8f4ff99'; ctx.fillRect(a.target - 65, 414, 130, 32);
    }
    for (const b of s.projectiles) {
      const r = b.radius || 12;
      ctx.fillStyle = b.kind === 'bubble' ? '#d7faff' : '#b4e6ef'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = b.kind === 'bubble' ? '#60b6d1' : '#275f87'; ctx.beginPath(); ctx.arc(b.x, b.y, r * .55, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  return { update, draw };
});
