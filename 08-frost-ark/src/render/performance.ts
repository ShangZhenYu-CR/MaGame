const enabled=new URLSearchParams(location.search).has('perf')||location.hash==='#benchmark';
const frames=new Float64Array(18000),draws=new Float64Array(18000),steps=new Float64Array(18000);
const stats=(a:Float64Array,n:number)=>{
 const v=Array.from(a.subarray(0,Math.min(a.length,n))).sort((x,y)=>x-y);
 if(!v.length)return {samples:0,p50:0,p95:0,p99:0,max:0,mean:0};
 const p=(f:number)=>v[Math.floor((v.length-1)*f)];
 return {samples:v.length,p50:p(.5),p95:p(.95),p99:p(.99),max:v.at(-1)!,mean:v.reduce((n,k)=>n+k,0)/v.length};
};
let i=0,j=0,k=0,last=-1,started=0,next=0,measuring=true;
let target:HTMLCanvasElement|undefined;
let details:Record<string,number>={},capture:(()=>Record<string,number>)|undefined;
const push=(a:Float64Array,n:number,v:number)=>{a[n%a.length]=v;};
export function perfStep<T>(run:()=>T):T{
 if(!enabled)return run();
 const start=performance.now(),result=run();
 if(measuring&&performance.now()>started)push(steps,k++,performance.now()-start);
 return result;
}
export function perfDraw(canvas:HTMLCanvasElement,run:()=>void,counters:()=>Record<string,number>){
 if(!enabled){run();return;}
 const t=performance.now();
 run();
 const end=performance.now();
 if(measuring&&last>=0&&end>started){push(frames,i++,t-last);push(draws,j++,end-t);}
 last=t;
 if(t<next)return;
 next=t+900;
 target=canvas;capture=counters;details=counters();
 if(measuring)canvas.dataset.performance=JSON.stringify(details);
}
export function resetPerf(){
 if(!enabled)return;
 i=0;j=0;k=0;last=-1;started=performance.now()+1500;measuring=true;
}
if(enabled){
 addEventListener('frost-perf-reset',()=>{resetPerf();started=performance.now();});
 addEventListener('frost-perf-end',()=>{
  if(!target)return;measuring=false;
  target.dataset.performance=JSON.stringify({frame:stats(frames,i),draw:stats(draws,j),logic:stats(steps,k),...(capture?.()??details)});
 });
}
