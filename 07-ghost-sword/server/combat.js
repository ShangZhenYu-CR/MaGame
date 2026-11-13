export * from '../shared/combat.js';
import {finish as settle} from '../shared/combat.js';
import {db} from './store.js';
export function finish(g,a){if(g.settled)return a;db.prepare('INSERT INTO run_results VALUES(?,?,?)').run(g.id,a.id,JSON.stringify({terminal:g.terminal||'exited',paid:g.paid,xpRooms:g.xpRooms,time:Date.now()}));return settle(g,a);}
