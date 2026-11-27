import assert from 'node:assert/strict';
import { build,buildIssue,inventoryChange } from '../src/sim/ark';
import { feedBond } from '../src/sim/beast-bond';
import { setBeastRole } from '../src/sim/beasts';
import { breedBeasts,inheritedMorph,INCUBATION,startIncubating } from '../src/sim/breeding';
import { heatAt } from '../src/sim/heatField';
import { traitsFixture } from './p2-traits-fixture';
import { stepWorld } from '../src/sim/world';

export function nurseryFixture(seed=202608,place=false){
 const {w,rapid:a,normal:b}=traitsFixture(seed);
 w.unlockedTech.push('tier2_automation','tier3_fortress');
 assert.ok(inventoryChange(w,[],[{itemId:'driftwood',count:14},{itemId:'frost_iron_ingot',count:8},{itemId:'warm_fur',count:6},{itemId:'beast_feed',count:8}]));
 for(const animal of [a,b])assert.equal(setBeastRole(w,animal.id,'rest'),null);
 const options=[];
 for(let y=21;y<=27;y++)for(let x=21;x<=27;x++){
  const t=heatAt(w,x+.5,y+.5),distance=Math.hypot(w.player.x-x-.5,w.player.y-y-.5);
  if(t>=23&&t<=41&&distance<2.37&&!buildIssue(w,'incubator',x,y))options.push({x,y,t});
 }
 const cell=options.sort((x,y)=>Math.abs(x.t-32)-Math.abs(y.t-32))[0];
 assert.ok(cell,'actual hearth produces 20–45 C band near the warm den');
 if(place)assert.ok(build(w,'incubator',cell.x,cell.y));
 return {w,a,b,cell};
}

export function breedNaturally(seed:number){
 const v=nurseryFixture(seed,true),{w,a,b}=v,incubator=w.ark.buildings.find(x=>x.defId==='incubator')!;
 for(let i=0;i<2;i++){
   for(const beast of [a,b])assert.equal(feedBond(w,beast.id),null);
   if(i===0)stepWorld(w,40);
 }
 assert.equal(breedBeasts(w,a.denBuildingId!,a.id,b.id),null);
 assert.equal(startIncubating(w,incubator.id),null);
 stepWorld(w,INCUBATION+70);
 const child=w.beasts.find(b=>b.id.startsWith('born_'));
 assert.ok(child,'incubate using the real solved room temperature');
 return {...v,child,morph:inheritedMorph(w,child.id)};
}

export function rareNurserySeed(){
 for(let seed=202608;seed<202680;seed++){
   const out=breedNaturally(seed);if(out.morph.variant)return seed;
 }
 throw Error('No transform in deterministic seed sweep.');
}
