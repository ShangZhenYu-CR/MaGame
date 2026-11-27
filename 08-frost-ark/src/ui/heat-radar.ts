import type { WorldState } from '../sim/types';

export function setupHeatRadar(){
 const opener=document.getElementById('heat-radar-toggle') as HTMLButtonElement;
 const panel=document.getElementById('heat-radar')!;
 const chart=document.getElementById('heat-radar-map') as HTMLCanvasElement;
 const metrics=document.getElementById('heat-radar-metrics')!;
 const c=chart.getContext('2d')!;
 let on=false,last=-999,previous:WorldState|null=null;
 try{on=localStorage.getItem('frost-radar-visible')==='1';}catch{}
 const toggle=()=>{
  on=!on;last=-999;
  try{localStorage.setItem('frost-radar-visible',on?'1':'0');}catch{}
 };
 opener.onclick=toggle;
 function update(w:WorldState,allowed:boolean){
  const show=on&&allowed;if(panel.hidden===show)panel.hidden=!show;
  if(opener.getAttribute('aria-expanded')!==String(show))opener.setAttribute('aria-expanded',String(show));
  if(!show)return;
  if(previous===w&&w.tick>=last&&w.tick-last<8)return;
  previous=w;last=w.tick;
  const {size,decks,heatGrid,buildings}=w.ark,tiles:number[]=[];
  let minX=size,minY=size,maxX=0,maxY=0;
  for(let i=0;i<decks.length;i++){
   if(!decks[i])continue;
   const x=i%size,y=Math.floor(i/size);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);tiles.push(i);
  }
  if(!tiles.length)return;
  const width=maxX-minX+1,height=maxY-minY+1,pad=6;
  const scale=Math.max(1,Math.floor(Math.min((chart.width-pad*2)/width,(chart.height-pad*2)/height)));
  const ax=Math.round((chart.width-width*scale)*.5),ay=Math.round((chart.height-height*scale)*.5);
  const project=(x:number,y:number)=>({x:ax+(x-minX)*scale,y:ay+(y-minY)*scale});
  c.fillStyle='#132532';c.fillRect(0,0,chart.width,chart.height);
  let warm=0,cold=0;
  for(const i of tiles){
   const q=project(i%size,Math.floor(i/size)),temp=heatGrid[i]??w.ambientTemp;
   if(temp>=15){c.fillStyle='#dc8e4b';warm++;}
   else if(temp>=3)c.fillStyle='#a67a55';
   else if(temp>=-16)c.fillStyle='#4f7992';
   else {c.fillStyle='#577eaf';cold++;}
   c.fillRect(q.x,q.y,Math.max(1,scale-.6),Math.max(1,scale-.6));
  }
  c.lineCap='round';c.lineWidth=1;
  for(const b of buildings){
   if(['heat_pipe','insulated_floor','wall_lamp'].includes(b.defId))continue;
   const q=project(b.gx+.5,b.gy+.5);
   c.fillStyle=b.defId==='hearth_core'?'#ffe4a4':'#c9d3cf';
   c.beginPath();c.arc(q.x,q.y,Math.max(1.1,scale*.23),0,Math.PI*2);c.fill();
  }
  const enemies=w.wildEntities.filter(e=>e.kind==='raider'&&e.hp>0&&e.x>=minX&&e.y>=minY&&e.x<maxX+1&&e.y<maxY+1);
  c.fillStyle='#fb7569';c.strokeStyle='#563036';
  for(const e of enemies){
   const q=project(e.x,e.y);
   c.beginPath();c.arc(q.x,q.y,Math.max(1.7,scale*.31),0,Math.PI*2);c.fill();c.stroke();
  }
  c.fillStyle='#d9f7f3';c.strokeStyle='#28717a';c.lineWidth=1.4;
  const p=project(w.player.x,w.player.y);
  c.beginPath();c.arc(p.x,p.y,Math.max(2,scale*.29),0,Math.PI*2);c.fill();c.stroke();
  const stat=`${width}×${height}　${tiles.length} 格　入侵 ${enemies.length}`;
  if(metrics.textContent!==stat)metrics.textContent=stat;
  Object.assign(chart.dataset,{tiles:String(tiles.length),warm:String(warm),cold:String(cold),enemies:String(enemies.length)});
 }
 return {update,toggle};
}
