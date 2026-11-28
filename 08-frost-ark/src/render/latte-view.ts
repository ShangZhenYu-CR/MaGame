import type { Vec2 } from '../sim/types';

/** Read-only warm gold signal. Keep debris under the hull by calling in its own scene pass. */
export function treasureCue(c:CanvasRenderingContext2D,p:Vec2,tile:number,tick:number):void{
 const peak=.59+.27*Math.sin(tick*.088);
 c.save();c.strokeStyle='rgba(247,201,131,.9)';c.lineWidth=1.7;c.globalAlpha=peak;
 c.setLineDash([tile*.15,tile*.09]);c.lineDashOffset=-(tick%150)*.44;
 c.beginPath();c.ellipse(p.x,p.y,tile*.62,tile*.26,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
 c.fillStyle='#f5d8a0';c.beginPath();c.moveTo(p.x,p.y-tile*.85);
 c.lineTo(p.x+tile*.065,p.y-tile*.73);c.lineTo(p.x,p.y-tile*.61);c.lineTo(p.x-tile*.065,p.y-tile*.73);c.closePath();c.fill();
 c.restore();
}
