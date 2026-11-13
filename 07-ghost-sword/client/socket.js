export const isBrowser=false,storageKey='ghostsword',coverageURL='/coverage';
let ws;
export function connect(receive){
 ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
 ws.onopen=()=>receive({type:'connection',state:'ready'});
 ws.onclose=e=>receive({type:'connection',state:'closed',code:e.code});
 ws.onmessage=e=>receive(JSON.parse(e.data));
}
export function send(data){ws.send(JSON.stringify(data));}
