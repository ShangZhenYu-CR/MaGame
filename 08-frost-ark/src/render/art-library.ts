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

  /** Position using the authored ground anchor. Overrides are in tile units. */
  paint(c:CanvasRenderingContext2D, id:string, x:number, y:number, tile:number,
        {width, height, rotation=0, scale=1, flip=false}: {
          width?:number; height?:number; rotation?:number; scale?:number; flip?:boolean;
        }={}):void {
    const entry=this.images.get(id);
    if(!entry) throw new Error(`美术资产未载入：${id}`);
    const {image, asset}=entry;
    const w=(width??asset.tileW)*tile*scale, h=(height??asset.tileH)*tile*scale;
    c.save();
    c.translate(x,y);
    if(rotation) c.rotate(rotation);
    if(flip) c.scale(-1,1);
    c.drawImage(image,-asset.anchorX/asset.width*w,-asset.anchorY/asset.height*h,w,h);
    c.restore();
  }
}
