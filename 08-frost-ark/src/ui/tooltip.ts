/** Delegated events keep dynamic catalogue controls and keyboard focus consistent. */
export function bindTooltips(host:HTMLElement, tooltip:HTMLElement):()=>void {
  let target:HTMLElement|null=null, timer=0, warmedUntil=0;
  const owner=(node:EventTarget|null)=>node instanceof Element?node.closest<HTMLElement>('[data-tip]'):null;
  function clear(remember=true):void {
    window.clearTimeout(timer);
    if(remember&&!tooltip.hidden)warmedUntil=performance.now()+620;
    target?.removeAttribute('aria-describedby');tooltip.hidden=true;target=null;
  }
  function start(el:HTMLElement):void {
    if(target===el)return;
    clear();target=el;
    timer=window.setTimeout(()=>{
      if(!target||!el.isConnected||!el.getClientRects().length)return;
      tooltip.textContent=el.dataset.tip??'';if(!tooltip.textContent)return;
      tooltip.hidden=false;el.setAttribute('aria-describedby',tooltip.id);
      const at=el.getBoundingClientRect(),w=tooltip.offsetWidth,h=tooltip.offsetHeight;
      tooltip.style.left=`${Math.max(8,Math.min(window.innerWidth-w-8,at.left+at.width/2-w/2))}px`;
      tooltip.style.top=`${at.top-h-8>4?at.top-h-8:Math.min(window.innerHeight-h-8,at.bottom+8)}px`;
    },performance.now()<warmedUntil?90:450);
  }
  for(const key of ['pointerover','focusin'])host.addEventListener(key,e=>{const el=owner(e.target);if(el)start(el);});
  for(const key of ['pointerout','focusout'])host.addEventListener(key,e=>{
    if(owner(e.target)===target&&owner((e as MouseEvent|FocusEvent).relatedTarget)!==target)clear();
  });
  host.addEventListener('pointerdown',()=>clear());host.addEventListener('scroll',()=>clear(),true);
  return ()=>clear(false);
}
