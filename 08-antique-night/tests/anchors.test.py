from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets'
for n,w,frames,anchor in [('beast-walk.png',288,4,196),('beast-attack.png',288,4,196),('hero-idle.png',129,4,202),('hero-run.png',129,6,202),('hero-jump.png',129,4,202),('hero-attack.png',129,4,202),('hero-hurt.png',129,4,202),('hero-dodge.png',193,4,202)]:
    im=Image.open(root/n).convert('RGBA')
    assert im.width==w*frames, (n,im.size)
    for i in range(frames):
        cell=im.crop((i*w,0,(i+1)*w,im.height)).getchannel('A').point(lambda a:255 if a>=128 else 0)
        bb=cell.getbbox(); assert bb is not None, (n,i)
        assert abs((bb[3]-1)-anchor)<=1, (n,i,bb,anchor)
    print('PASS',n,'frame baselines')
