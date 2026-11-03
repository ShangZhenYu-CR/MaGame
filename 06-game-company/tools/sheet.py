import sys,glob,os,re
from PIL import Image,ImageDraw
src,dst=sys.argv[1],sys.argv[2];os.makedirs(dst,exist_ok=True)
fs=sorted(glob.glob(src+'/*.png'));groups={}
for f in fs:
    m=re.match(r'(\w+?)_(\w+?)_(\d+)\.png',os.path.basename(f));groups.setdefault(m.group(1),{}).setdefault(m.group(2),[]).append(f)
for w,segs in groups.items():
    rows=list(segs.items());cw,ch=Image.open(rows[0][1][0]).size;k=0.32;cw2,ch2=int(cw*k),int(ch*k)
    cols=min(12,max(len(v) for _,v in rows));S=Image.new('RGB',(90+cols*cw2,len(rows)*ch2),(30,28,40));d=ImageDraw.Draw(S)
    for r,(name,frames) in enumerate(rows):
        d.text((4,r*ch2+ch2//2),name,fill=(255,220,80))
        for c,f in enumerate(frames[:12]):S.paste(Image.open(f).resize((cw2,ch2)),(90+c*cw2,r*ch2))
    S.save(f'{dst}/{w}.png');print(w,S.size,[ (n,len(v)) for n,v in rows])
