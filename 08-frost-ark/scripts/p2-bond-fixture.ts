import { nurseryFixture } from './p2-breed-fixture';
export function bondFixture(){
 const {w,a,b}=nurseryFixture(202611);
 // Two real partners already prepared to isolate the local care regression.
 // The full natural-save playthrough does not use this fixture.
 const near={x:21.74,y:25.91};
 Object.assign(w.player,near);
 Object.assign(a,{x:near.x+.22,y:near.y+.65,warmth:79,hunger:29,role:'rest'});
 Object.assign(b,{x:near.x+.28,y:near.y-1.16,warmth:75,hunger:9,role:'rest'});
 return {w,a,b};
}
