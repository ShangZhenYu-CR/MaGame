/* Player attacks and dodge, in fixed 60 Hz ticks. No DOM or game-global dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PlayerCombat = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const SPECS = {
    light: {startup: 4, active: 4, recovery: 11, range: 72},
    heavy: {startup: 11, active: 5, recovery: 20, range: 98}
  };
  const DASH_DURATION = 12, DASH_COOLDOWN = 42, BUFFER = 6;
  function state(p) {
    if (!p.combat) p.combat = {action:null, dashCooldown:0, buffer:null, bufferTicks:0};
    return p.combat;
  }
  // Called on confirmed player damage. Also clears a buffered action so it cannot fire after knockback.
  function cancel(p) {
    const c = state(p);
    c.action = null; c.buffer = null; c.bufferTicks = 0;
    p.attack = 0; p.dash = 0;
  }
  function startAttack(p, c, type, s) {
    const spec = SPECS[type];
    c.action = {type, frame:0, facing:p.facing, hit:new Set()};
    c.buffer = null; c.bufferTicks = 0;
    p.heavy = type === 'heavy';
    p.attack = spec.startup + spec.active + spec.recovery;
    if (s.onAttack) s.onAttack(type);
  }
  function targetsOverlap(p, e, direction, range) {
    const dx = e.x - p.x;
    if (dx * direction < 0 || Math.abs(dx) > range) return false;
    // Enemies use y=404 and height 40; the painter uses y=355 and height 91.
    const top = e.y, bottom = e.y + (e.combatHeight || (e.max ? 91 : 40));
    return p.y < bottom + 5 && p.y + p.h > top - 5;
  }
  function update(p, input, s) {
    const c = state(p);
    if (c.dashCooldown > 0) c.dashCooldown--;
    if (c.bufferTicks > 0 && --c.bufferTicks === 0) c.buffer = null;
    const requested = input.heavy ? 'heavy' : input.attack ? 'light' : null;
    // Dodge takes priority over attack, can cancel startup or recovery, and never fires a queued attack.
    if (input.dash && c.dashCooldown === 0 && !p.dash) {
      cancel(p); c.dashCooldown = DASH_COOLDOWN;
      p.dash = DASH_DURATION; p.inv = Math.max(p.inv || 0, DASH_DURATION + 3);
      if (s.onDodge) s.onDodge();
    } else if (requested && !p.dash) {
      if (!c.action) startAttack(p,c,requested,s);
      else {
        const a=c.action, spec=SPECS[a.type], remaining=spec.startup+spec.active+spec.recovery-a.frame;
        if (remaining <= BUFFER) { c.buffer=requested; c.bufferTicks=BUFFER + 1; }
      }
    }
    if (p.dash > 0) {
      p.vx = p.facing * 9;
      if (s.onDashTick) s.onDashTick(p.dash);
      p.dash--;
      p.attack = 0;
      return;
    }
    if (!c.action && c.buffer) startAttack(p,c,c.buffer,s);
    const a = c.action;
    if (!a) { p.attack=0; return; }
    const spec = SPECS[a.type];
    p.facing = a.facing;
    p.vx *= a.type === 'heavy' ? .55 : .75;
    const active = a.frame >= spec.startup && a.frame < spec.startup + spec.active;
    if (active) {
      for (const target of s.targets) {
        if (!target || !target.alive || a.hit.has(target) || !targetsOverlap(p,target,a.facing,spec.range)) continue;
        a.hit.add(target);
        if (s.onHit) s.onHit(target,a.type === 'heavy');
      }
    }
    a.frame++;
    p.attack = Math.max(0,spec.startup + spec.active + spec.recovery - a.frame);
    if (a.frame >= spec.startup + spec.active + spec.recovery) c.action=null;
  }
  return { update, cancel, SPECS, DASH_DURATION, DASH_COOLDOWN };
});
