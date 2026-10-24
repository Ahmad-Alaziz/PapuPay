"""Build compact app fonts from OFL originals (pip install fonttools brotli)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
root=Path(__file__).resolve().parents[1]
source=root/'packages/brand/fonts'
web=root/'apps/web/public/fonts'
ios=root/'apps/ios/Resources'
for family in ['BricolageGrotesque','Manrope']:
 font=TTFont(source/(family+'.ttf'));font.flavor='woff2';font.save(web/(family+'.woff2'))
for style,weight in [('Bold',700),('ExtraBold',800)]:
 font=instantiateVariableFont(TTFont(source/'BricolageGrotesque.ttf'),{'wght':weight,'opsz':48,'wdth':100},inplace=True)
 for name in font['name'].names:
  if name.nameID in [1,2,4,6,16,17]:
   value={1:'Papu Display',2:style,4:'Papu Display '+style,6:'PapuDisplay-'+style,16:'Papu Display',17:style}[name.nameID]
   name.string=value.encode(name.getEncoding())
 font.save(ios/('PapuDisplay-'+style+'.ttf'))
for name in ['BricolageGrotesque','Manrope']:
 (web/(name+'-OFL.txt')).write_text((source/(name+'-OFL.txt')).read_text())
print('Prepared Bricolage/Manrope WOFF2 and two small native display instances.')
