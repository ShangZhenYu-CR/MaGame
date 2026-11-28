import type { WorldState } from '../sim/types';

export const benchmarkMode=location.hash==='#benchmark'&&!!document.getElementById('bench-world');
type Sample={frame?:{mean:number;p95:number};logic?:{p99:number;max:number};wave?:number;deck?:number;buildings?:number;beasts?:number};
type Hooks={start(raw:string):WorldState;active(state:boolean):void;wave():number};
export function setupShipBenchmark(canvas:HTMLCanvasElement,hooks:Hooks){
 const source=document.getElementById('bench-world')!.textContent!;
 const box=document.createElement('aside');box.className='ship-benchmark';box.setAttribute('aria-label','巨舰性能测试');
 const title=document.createElement('strong');title.textContent='巨舰寒潮 · 性能测试';
 const info=document.createElement('p');info.textContent='24×24 甲板 · 50 座建筑 · 12 只云兽 · 不读取或改写正式存档';
 const status=document.createElement('output');status.textContent='建议最大化窗口并保持前台。开始后共测 120 秒。';
 const controls=document.createElement('div');
 const begin=document.createElement('button');begin.textContent='开始压测';
 const back=document.createElement('a');back.textContent='回到正常游戏';back.href='index.html?play=1';
 const receipt=document.createElement('button');receipt.textContent='下载结果';receipt.hidden=true;
 controls.append(begin,back,receipt);box.append(title,info,status,controls);document.getElementById('app')!.append(box);
 let running=false,start=0,last=0,frames=0,timer=0,watch=0,result='';
 const stop=()=>{running=false;clearTimeout(timer);cancelAnimationFrame(watch);hooks.active(false);begin.disabled=false;};
 const monitor=(now:number)=>{
  if(!running)return;
  frames++;
  if(now-last>=1000){
   const fps=frames*1000/(now-last);frames=0;last=now;
   status.textContent=`第 ${Math.min(120,Math.floor((now-start)/1000))}/120 秒 · 寒潮第 ${hooks.wave()}/3 波 · 当前 ${fps.toFixed(1)} FPS`;
  }
  watch=requestAnimationFrame(monitor);
 };
 begin.onclick=()=>{
  if(running)return;
  hooks.start(source);
  running=true;begin.disabled=true;receipt.hidden=true;
  status.textContent='压测开始，正在统计帧率…';
  dispatchEvent(new Event('frost-perf-reset'));
  frames=0;start=last=performance.now();watch=requestAnimationFrame(monitor);
  timer=window.setTimeout(()=>{
   dispatchEvent(new Event('frost-perf-end'));
   const sample=JSON.parse(canvas.dataset.performance??'{}') as Sample;
   stop();
   if(!sample.frame?.mean||!sample.logic){status.textContent='没有收到完整数据，请在前台重试。';return;}
   const fps=1000/sample.frame.mean;
   status.textContent=`均值 ${fps.toFixed(1)} FPS · 慢帧 P95 ${sample.frame.p95.toFixed(1)} ms · 逻辑峰值 ${sample.logic.max.toFixed(2)} ms · ${sample.wave??0}/3 波`;
   result=JSON.stringify({width:innerWidth,height:innerHeight,devicePixelRatio,averageFPS:fps,userAgent:navigator.userAgent,...sample},null,2);
   receipt.hidden=false;
  },120000);
 };
 document.addEventListener('visibilitychange',()=>{
  if(running&&document.hidden){stop();status.textContent='测试期间窗口离开了前台；这次不计，请重测。';}
 });
 receipt.onclick=()=>{
  const url=URL.createObjectURL(new Blob([result],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='frost-ark-benchmark.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
}
