import type { WorldState } from './types';

export function sailingRig(w:WorldState){
 let sail=0,steam=0,vanes=0;
 for(const b of w.ark.buildings){
  if(b.hp<=1)continue;
  if(b.defId==='wind_sail')sail++;
  if(b.defId==='steam_thruster')steam++;
  if(b.defId==='wind_vane')vanes++;
 }
 return {sail:Math.min(sail,3),steam:Math.min(steam,3),vanes:Math.min(vanes,2)};
}
export function rigDrive(w:WorldState,dx:number,dy:number){
 const rig=sailingRig(w);
 const projection=Math.max(-1,Math.min(1,dx*w.sky.windX+dy*w.sky.windY));
 const adverse=Math.max(0,-projection),tail=Math.max(0,projection);
 const resistance=Math.min(.83,.23*rig.sail+.43*rig.steam+.13*rig.vanes);
 const drag=adverse*.24*(1-resistance);
 const multiplier=(1-drag)*(1+rig.sail*(.15+.11*tail)+rig.steam*.23+rig.vanes*.06);
 return {...rig,multiplier:Math.min(1.95,multiplier),adverse,resistance};
}
