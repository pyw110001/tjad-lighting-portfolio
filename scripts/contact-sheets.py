from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[2]
out=Path(__file__).resolve().parents[1]/'docs'/'audit'
out.mkdir(parents=True,exist_ok=True)
files=sorted((root/'图片').rglob('*'))
files=[p for p in files if p.is_file() and not p.name.startswith('00_')]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',14)
for page in range((len(files)+29)//30):
    sheet=Image.new('RGB',(1500,1080),'#eeeeee'); draw=ImageDraw.Draw(sheet)
    for i,p in enumerate(files[page*30:page*30+30]):
        im=Image.open(p); im.thumbnail((288,148))
        x=(i%5)*300; y=(i//5)*180
        sheet.paste(im,(x+(288-im.width)//2,y))
        draw.text((x+3,y+150),p.parent.name[:16]+'/'+p.stem[:4],font=font,fill='#000000')
    sheet.save(out/f'sheet-{page+1}.jpg')
print(len(files),'individual images')
