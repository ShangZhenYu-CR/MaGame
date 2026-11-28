// Browser-only adaptive score. A common tuning stays coherent during a fade.
export const scoreScenes=['day','blizzard','battle'] as const;
export type ScoreScene=typeof scoreScenes[number];
const traits={
 day:{pulse:.41,notes:[50,57,60,64,55,60,67,64,48,55,60,62,53,60,65,62],voice:'pluck'},
 blizzard:{pulse:.86,notes:[38,45,41,43,36,43,38,41],voice:'bow'},
 battle:{pulse:.235,notes:[36,43,36,48,36,43,41,48,38,45,38,50,38,45,43,50],voice:'pulse'},
} as const;
export const scoreStep=(scene:ScoreScene,step:number)=>{
 const row=traits[scene],i=step%row.notes.length;
 return {freq:440*2**((row.notes[i]-69)/12),...row,accent:i%4===0};
};
type Lane={gain:GainNode;next:number;beat:number;until:number};
export class AdaptiveScore{
 private readonly lanes:Record<ScoreScene,Lane>;
 private active:ScoreScene|null=null;
 readonly tally:Record<ScoreScene,number>={day:0,blizzard:0,battle:0};
 constructor(private ctx:AudioContext, out:GainNode){
  const lane=():Lane=>{
   const gain=ctx.createGain();gain.gain.value=0;gain.connect(out);
   return {gain,next:0,beat:0,until:0};
  };
  this.lanes={day:lane(),blizzard:lane(),battle:lane()};
 }
 private shape(lane:Lane,score:ReturnType<typeof scoreStep>,when:number){
  const ctx=this.ctx,amp=ctx.createGain(),voice=ctx.createOscillator(),filter=ctx.createBiquadFilter();
  voice.type=score.voice==='pluck'?'triangle':score.voice==='bow'?'triangle':'sine';
  voice.frequency.setValueAtTime(score.freq,when);
  filter.type='lowpass';filter.frequency.value=score.voice==='bow'?405:score.voice==='pluck'?1550:960;
  voice.connect(filter).connect(amp).connect(lane.gain);
  const span=score.voice==='bow'?2.05:score.voice==='pluck'?.69:.24,attack=score.voice==='bow'?.42:.028;
  amp.gain.setValueAtTime(.0001,when);
  amp.gain.exponentialRampToValueAtTime(score.voice==='bow'?.13:score.accent?.14:.095,when+attack);
  amp.gain.exponentialRampToValueAtTime(.0001,when+span);
  if(score.voice==='pulse')voice.frequency.exponentialRampToValueAtTime(score.freq*.66,when+.15);
  voice.onended=()=>{voice.disconnect();filter.disconnect();amp.disconnect();};
  voice.start(when);voice.stop(when+span+.025);
  if(score.voice==='pulse'&&score.accent){
   const drum=ctx.createOscillator(),a=ctx.createGain();drum.type='sine';drum.frequency.setValueAtTime(118,when);
   drum.frequency.exponentialRampToValueAtTime(44,when+.155);
   a.gain.setValueAtTime(.001,when);a.gain.exponentialRampToValueAtTime(.16,when+.023);
   a.gain.exponentialRampToValueAtTime(.001,when+.25);
   drum.connect(a).connect(lane.gain);drum.start(when);drum.stop(when+.255);
   drum.onended=()=>{drum.disconnect();a.disconnect();};
  }
 }
 update(scene:ScoreScene){
  const now=this.ctx.currentTime;
  if(this.active!==scene){
   for(const name of scoreScenes){
    const lane=this.lanes[name],active=scene===name;
    lane.gain.gain.setTargetAtTime(active?1:0,now,.31);
    if(active){lane.next=now+.034;lane.until=Infinity;}
    else lane.until=lane.beat?now+.37:0;
   }
   this.active=scene;
  }
  for(const name of scoreScenes){
   const lane=this.lanes[name];if(!lane.until||lane.until<now)continue;
   if(lane.next<now-.08)lane.next=now+.024;
   while(lane.next<Math.min(now+.43,lane.until)){
    const note=scoreStep(name,lane.beat++);
    this.shape(lane,note,Math.max(lane.next,now+.012));
    lane.next+=note.pulse;this.tally[name]++;
   }
  }
 }
}
