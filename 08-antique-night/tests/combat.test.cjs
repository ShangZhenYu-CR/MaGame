const assert = require('node:assert/strict');
const Combat = require('../combat.js');
const floors = [{x:0,y:446,w:700},{x:770,y:446,w:570},{x:2670,y:446,w:950}];
function setup() { const s={player:{x:150,y:368,w:38,h:78},enemies:[],boss:null,projectiles:[],floors,camera:0,hits:0,hurt(){this.hits++}}; return s; }
function tick(s,n=1){for(let i=0;i<n;i++)Combat.update(s)}
{
 const s=setup(); s.enemies=[{x:250,y:404,dir:-1,type:0,alive:true,stun:0}];tick(s);assert.equal(s.enemies[0].ai.state,'windup');tick(s,35);assert.equal(s.hits,0,'windup cannot deal damage');tick(s,36);assert.equal(s.hits,1,'lunge hits once');
}
{
 const s=setup();s.player.y=250;s.enemies=[{x:250,y:404,dir:-1,type:0,alive:true,stun:0}];tick(s,100);assert.equal(s.hits,0,'airborne player can avoid the lunge');
}
{
 const s=setup();s.player.x=740;s.enemies=[{x:690,y:404,dir:1,type:0,alive:true,stun:0}];tick(s,80);assert(s.enemies[0].x<=676,'enemy remains on its platform');
}
{
 const s=setup();s.player.x=3000;s.camera=2700;s.boss={x:3300,hp:28,max:28,alive:true,stun:0};tick(s,65);assert.equal(s.boss.ai.state,'windup');assert.equal(s.boss.ai.kind,'wave');assert.equal(s.projectiles.length,0);tick(s,40);assert.equal(s.projectiles.length,1,'wave spawns only after warning');tick(s,80);assert.equal(s.hits,1,'wave can hit an unprotected player');
}
{
 const s=setup();s.player.x=3000;s.player.y=250;s.camera=2700;s.boss={x:3300,hp:28,max:28,alive:true,stun:0};tick(s,190);assert.equal(s.hits,0,'jumping over wave avoids damage');
}
{
 const s=setup();s.player.x=3000;s.camera=2700;s.boss={x:3300,hp:10,max:28,alive:true,stun:0,ai:{state:'recover',timer:1,attacks:1}};tick(s);assert.equal(s.boss.ai.kind,'brush');tick(s,51);assert.equal(s.hits,0);s.player.y=250;tick(s,14);assert.equal(s.hits,0,'jumping avoids brush');
}
{
 const s=setup();s.player.x=3000;s.camera=2700;s.boss={x:3300,hp:10,max:28,alive:true,stun:0,ai:{state:'recover',timer:1,attacks:1}};tick(s,55);assert.equal(s.hits,1,'brush punishes staying grounded in warning');
}
console.log('combat tests passed: telegraphs, one-hit lunge, platform bounds, wave, jump, phase-two brush');
{
 const s=setup();s.player.x=110;s.player.y=300;s.fish=[{x:200,base:200,y:320,hp:3,alive:true,stun:0,dir:-1}];tick(s);assert.equal(s.fish[0].ai.state,'windup','fish warns before shooting');tick(s,45);assert.equal(s.projectiles.length,0,'fish does not shoot during warning');tick(s);assert.equal(s.projectiles.length,1,'fish fires after warning');assert.equal(s.projectiles[0].kind,'bubble');tick(s,30);assert.equal(s.hits,1,'fish projectile hits a player in its path');
}
{
 const s=setup();s.player.x=110;s.player.y=300;s.fish=[{x:200,base:200,y:320,hp:3,alive:true,stun:0,dir:-1}];tick(s,20);s.fish[0].stun=10;tick(s,60);assert.equal(s.projectiles.length,0,'stun interrupts fish windup');
}
{
 const s=setup();s.player.x=110;s.player.y=300;s.fish=[{x:200,base:200,y:320,hp:3,alive:true,stun:0,dir:-1}];tick(s,47);s.player.y=200;tick(s,30);assert.equal(s.hits,0,'player can evade the projectile vertically');
}
{
 const s=setup();s.player.x=3400;s.player.y=368;s.camera=2700;s.boss={x:3300,hp:28,max:28,alive:true,stun:0};tick(s,105);assert.equal(s.projectiles.length,1);assert(s.projectiles[0].vx>0,'boss targets a player on its right');tick(s,30);assert.equal(s.hits,1);
}
console.log('fish and boss-direction tests passed');
