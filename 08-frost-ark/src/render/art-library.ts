/// <reference types="vite/client" />

export interface ArtAsset {
  file: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  tileW: number;
  tileH: number;
  contentBox: [number, number, number, number];
}

interface ArtManifest { version: number; assets: Record<string, ArtAsset> }
const manifests = import.meta.glob<ArtManifest>('../assets/art/manifest.json', {eager:true, import:'default'});
const urls = import.meta.glob<string>('../assets/art/*.{png,webp}', {eager:true, query:'?inline', import:'default'});
const manifest = Object.values(manifests)[0];

export class ArtLibrary {
  private tones=new Map<string,HTMLCanvasElement>();
  private images = new Map<string, {image:HTMLImageElement; asset:ArtAsset}>();
  readonly ready: Promise<void>;

  constructor(required: readonly string[]) {
    this.ready = Promise.resolve().then(async () => {
      if(!manifest || manifest.version !== 1) throw new Error('未找到美术清单或其版本不受支持。');
      await Promise.all(required.map(async (id) => {
        const asset=manifest.assets[id];
        const url=asset && urls[`../assets/art/${asset.file}`];
        if(!asset || !url) throw new Error(`缺少美术资产：${id}`);
        const image=new Image();
        image.src=url;
        await image.decode();
        if(image.naturalWidth!==asset.width || image.naturalHeight!==asset.height)
          throw new Error(`美术资产尺寸与清单不一致：${id}`);
        this.images.set(id,{image,asset});
      }));
    });
  }

  image(id:string): HTMLImageElement {
    const entry=this.images.get(id);
    if(!entry) throw new Error(`美术资产未载入：${id}`);
    return entry.image;
  }

  /** Convert a named fractional position in the cropped sprite to a local sprite point. */
  offset(id:string,u:number,v:number,width:number,height:number):{x:number;y:number} {
    const entry=this.images.get(id);
    if(!entry) throw new Error(`美术资产未载入：${id}`);
    const {asset}=entry,[left,top,right,bottom]=asset.contentBox;
    return {x:width*(left+(right-left)*u-asset.anchorX)/asset.width,
      y:height*(top+(bottom-top)*v-asset.anchorY)/asset.height};
  }

  /** Tile recipes use opaque, edge-to-edge logical textures. Crop only their authored source region. */
  paintTile(c:CanvasRenderingContext2D,id:string,x:number,y:number,w:number,h:number):void {
    const entry=this.images.get(id);
    if(!entry) throw new Error(`木板美术资产未载入：${id}`);
    const {image,asset}=entry;
    const [left,top,right,bottom]=asset.contentBox;
    c.drawImage(image,left,top,right-left,bottom-top,x,y,w,h);
  }

  private recolor(id:string,image:HTMLImageElement,theme:'aurora'|'ember'):HTMLCanvasElement {
    const key=id+':'+theme,prior=this.tones.get(key);if(prior)return prior;
    const layer=document.createElement('canvas');layer.width=image.width;layer.height=image.height;
    const c=layer.getContext('2d')!;c.drawImage(image,0,0);
    c.globalCompositeOperation='source-atop';
    const g=c.createLinearGradient(0,0,layer.width*.5,layer.height);
    if(theme==='aurora'){g.addColorStop(0,'#a6e7d1');g.addColorStop(.54,'#468f98');g.addColorStop(1,'#244959');}
    else {g.addColorStop(0,'#eec08b');g.addColorStop(.55,'#ae683e');g.addColorStop(1,'#513e3b');}
    c.globalAlpha=.48;c.fillStyle=g;c.fillRect(0,0,layer.width,layer.height);
    if(this.tones.size>=32)this.tones.delete(this.tones.keys().next().value!);
    this.tones.set(key,layer);return layer;
  }
  private readonly sizes=new Map<string,HTMLCanvasElement>();
  private scaled(id:string,source:CanvasImageSource,w:number,h:number,flash=false){
    const ww=Math.max(1,Math.round(w)),hh=Math.max(1,Math.round(h));
    if(!flash&&(ww<12||hh<12||ww>244||hh>244))return source;
    const key=id+':'+ww+':'+hh+(flash?':flash':'');
    const prior=this.sizes.get(key);if(prior)return prior;
    const raster=document.createElement('canvas');raster.width=ww;raster.height=hh;
    const ctx=raster.getContext('2d')!;ctx.imageSmoothingQuality='medium';
    if(flash)ctx.filter='brightness(2.55) saturate(.15)';
    ctx.drawImage(source,0,0,ww,hh);
    if(this.sizes.size>=144)this.sizes.delete(this.sizes.keys().next().value!);
    this.sizes.set(key,raster);return raster;
  }
  /** Position using the authored ground anchor. Overrides are in tile units. */
  paint(c:CanvasRenderingContext2D, id:string, x:number, y:number, tile:number,
        {width, height, rotation=0, scale=1, flip=false,tint,flash=false}: {
          width?:number; height?:number; rotation?:number; scale?:number; flip?:boolean;tint?:'aurora'|'ember';flash?:boolean;
        }={}):void {
    const entry=this.images.get(id);
    if(!entry) throw new Error(`美术资产未载入：${id}`);
    const {image, asset}=entry;
    const w=(width??asset.tileW)*tile*scale, h=(height??asset.tileH)*tile*scale;
    const ax=asset.anchorX/asset.width*w,ay=asset.anchorY/asset.height*h;
    const imageSource=tint?this.recolor(id,image,tint):image;
    const raster=this.scaled(id+(tint??''),imageSource,w,h,flash);
    if(!rotation&&!flip){c.drawImage(raster,x-ax,y-ay,w,h);return;}
    c.save();c.translate(x,y);
    if(rotation)c.rotate(rotation);
    if(flip)c.scale(-1,1);
    c.drawImage(raster,-ax,-ay,w,h);c.restore();
  }
}
