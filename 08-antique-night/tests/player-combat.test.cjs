const assert=require('node:assert/strict'),P=require('../player-combat.js');
function setup(){let p={x:0,y:368,w:38,h:78,vx:0,inv:0,dash:0,facing:1,attack:0};let e={x:55,y:404,alive:true};let s={targets:[e],hits:[],onHit(e,heavy){this.hits.push({e,heavy})},attacks:[],onAttack(t){this.attacks.push(t)}};return {p,e,s}}
function step(a,inputs={},n=1){for(let i=0;i<n;i++)P.update(a.p,i===0?inputs:{},a.s)}
{
 let a=setup();step(a,{attack:true});step(a,{},3);assert.equal(a.s.hits.length,0,'light startup should not deal damage');step(a);assert.equal(a.s.hits.length,1,'active light attack lands');step(a,{},3);assert.equal(a.s.hits.length,1,'active frames hit each target only once');
}
{
 let a=setup();step(a,{heavy:true});step(a,{},10);assert.equal(a.s.hits.length,0);step(a);assert.equal(a.s.hits.length,1);assert.equal(a.s.hits[0].heavy,true);
}
{
 let a=setup();step(a,{heavy:true});step(a,{},5);step(a,{dash:true});assert(a.p.dash>0,'dodge cancels heavy windup');step(a,{},20);assert.equal(a.s.hits.length,0,'cancelled attack never hits');
}
{
 let a=setup();step(a,{dash:true,attack:true});assert.equal(a.s.attacks.length,0,'dodge wins simultaneous input');step(a,{heavy:true});step(a,{},15);assert.equal(a.s.hits.length,0,'attack is not queued during dodge');
}
{
 let a=setup();step(a,{attack:true});step(a,{},12);step(a,{heavy:true});step(a,{},7);assert.deepEqual(a.s.attacks,['light','heavy'],'buffered heavy starts after recovery');step(a,{},12);assert.equal(a.s.hits.filter(x=>x.heavy).length,1);
}
{
 let a=setup();step(a,{heavy:true});step(a,{},4);P.cancel(a.p);step(a,{},45);assert.equal(a.s.hits.length,0,'damage interruption cancels delayed attack');
}
{
 let a=setup();a.p.facing=-1;step(a,{attack:true});step(a,{},7);assert.equal(a.s.hits.length,0,'cannot hit behind the player');
}
{
 let a=setup();a.p.y=200;step(a,{attack:true});step(a,{},7);assert.equal(a.s.hits.length,0,'cannot hit enemy across vertical separation');
}
console.log('player combat tests passed: startup/active/recovery, damage once, dodge cancellation, input priority and buffering');
{
 let a=setup();let n=0;a.s.onDodge=()=>n++;step(a,{dash:true});assert.equal(a.p.inv,15,'dodge grants explicitly bounded invulnerability');step(a,{},12);step(a,{dash:true});assert.equal(n,1,'cooldown prevents immediate chain dodge');step(a,{},29);step(a,{dash:true});assert.equal(n,2,'dodge becomes available after cooldown');
}
