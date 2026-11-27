import {
 craftTool,repairTool,upgradeTool,materialSummary,toolCraftCost,toolUpgradeCost,toolRepairCost,toolStatus,type ToolKind,
} from '../sim/tools';
import type { WorldState,ItemStack } from '../sim/types';
import { countItem } from '../sim/ark';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const write=(el:HTMLElement,v:string)=>{if(el.textContent!==v)el.textContent=v;};
const configs=[
 {kind:'wood_axe',stem:'axe',name:'手斧',icon:'hand-axe'},
 {kind:'mining_pick',stem:'pickaxe',name:'矿镐',icon:'mining-pick'},
] as const;
interface ToolHooks{
 state:()=>WorldState;
 icon:(id:string)=>string|undefined;
 message:(issue:string|null,success:string,event?:'craft')=>void;
}
export function expeditionToolsUi(hooks:ToolHooks){
 const inventory=el('inventory'),host=el('toolcraft-actions'),bar=el('expedition-tools');
 let cache='';
 const makeImage=(src:string)=>{const img=document.createElement('img');img.src=src;img.alt='';return img;};
 function iconKey(tool:ToolKind,tier:number){return configs.find(c=>c.kind===tool)!.icon+(tier>1?'-upgraded':'');}
 function actions(force=false){
  if(inventory.hidden)return;
  const w=hooks.state(),key=JSON.stringify(w.player.inventory);
  if(!force&&key===cache)return;cache=key;
  host.replaceChildren(...configs.map(({kind,name})=>{
   const status=toolStatus(w,kind);
   const section=document.createElement('section');section.className='toolcraft-item';
   const label=document.createElement('strong');label.className='item-name';label.textContent=status?.name??name;
   const src=hooks.icon(iconKey(kind,status?.tier??1));if(src)label.prepend(makeImage(src));
   const info=document.createElement('small');
   info.textContent=status?`耐久 ${status.durability} / ${status.maxDurability}`:'尚未制作 · '+materialSummary(toolCraftCost(kind));
   const row=document.createElement('div');row.className='toolcraft-actions';
   const act=(action:'craft'|'repair'|'upgrade',name:string,cost:ItemStack[],blocked=false)=>{
    const b=document.createElement('button');b.type='button';b.dataset.toolAction=action;b.dataset.toolKind=kind;b.textContent=name;
    b.dataset.tip=materialSummary(cost)||name;
    if(blocked||cost.some(c=>countItem(w,c.itemId)<c.count))b.setAttribute('aria-disabled','true');
    b.onclick=()=>{
     const result=(action==='craft'?craftTool:action==='repair'?repairTool:upgradeTool)(hooks.state(),kind);
     hooks.message(result.ok?null:result.message,result.message,'craft');actions();
    };
    return b;
   };
   if(!status)row.append(act('craft','制作'+name,toolCraftCost(kind)));
   else {
    row.append(act('repair','修理'+name,toolRepairCost(kind,status.tier),status.durability>=status.maxDurability));
    if(status.tier===1)row.append(act('upgrade','升级'+name,toolUpgradeCost(kind)));
   }
   section.append(label,info,row);return section;
  }));
 }
 return {
  iconFor(id:string){
   const kind:ToolKind|undefined=id==='wood_axe'||id==='frost_axe'?'wood_axe':id==='mining_pick'||id==='frost_pick'?'mining_pick':undefined;
   return kind?hooks.icon(iconKey(kind,id.startsWith('frost_')?2:1)):undefined;
  },
  actions,
  update(area:string){
   const w=hooks.state();bar.hidden=area!=='island'&&area!=='gangway';
   if(!bar.hidden)for(const {kind,stem} of configs){
    const current=toolStatus(w,kind),meter=el<HTMLMeterElement>(stem+'-durability');
    const art=el<HTMLImageElement>(stem+'-art'),src=hooks.icon(iconKey(kind,current?.tier??1));
    if(src&&art.getAttribute('src')!==src)art.src=src;
    art.hidden=!src;meter.max=current?.maxDurability??1;meter.value=current?.durability??0;
    meter.dataset.toolId=current?.id??'';write(el(stem+'-condition'),current?String(current.durability):'无');
   }
   actions();
  },
 };
}
