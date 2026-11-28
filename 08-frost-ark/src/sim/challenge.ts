import type { WorldState } from './types';
export const difficultyIds=['relaxed','standard','hardcore'] as const;
export type Difficulty=typeof difficultyIds[number];
export const difficultyNames:Record<Difficulty,string>={relaxed:'休闲拾荒',standard:'标准生存',hardcore:'极寒硬核'};
const presets={relaxed:{ambient:4,hunger:.72,physical:.82},standard:{ambient:0,hunger:1,physical:1},hardcore:{ambient:-6,hunger:1.26,physical:1.19}} as const;
export const daySpeeds=[.75,1,1.5,2] as const;
export type DaySpeed=typeof daySpeeds[number];
type Archive=WorldState&{voyageOptionsP2?:{difficulty:Difficulty;pace:DaySpeed}};
const get=(w:WorldState)=>(w as Archive).voyageOptionsP2;
export const difficultyOf=(w:WorldState)=>get(w)?.difficulty??'standard';
export const challenge=(w:WorldState)=>presets[difficultyOf(w)];
export const daySpeed=(w:WorldState)=>get(w)?.pace??1;
export function configureVoyage(w:WorldState,difficulty:Difficulty,pace:DaySpeed=1):void{
 if(!difficultyIds.includes(difficulty)||!daySpeeds.includes(pace))return;
 (w as Archive).voyageOptionsP2={difficulty,pace};
}
export function validChallenge(w:WorldState):boolean{
 const v=get(w);return v===undefined||!!v&&typeof v==='object'&&!Array.isArray(v)&&difficultyIds.includes(v.difficulty)&&daySpeeds.includes(v.pace);
}
