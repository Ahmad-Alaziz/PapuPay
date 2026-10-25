"""Prepare self-hosted OFL fonts. Requires fonttools and brotli."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
root=Path(__file__).resolve().parents[1]
source=root/'packages/brand/fonts'; web=root/'apps/web/public/fonts'; ios=root/'apps/ios/Resources'
chars=''.join(chr(c) for a,b in [(32,591),(8192,8303),(8352,8399)] for c in range(a,b+1))
def compact(font):
 options=subset.Options(); options.name_IDs=['*']; options.name_legacy=True; options.name_languages=['*']
 sub=subset.Subsetter(options=options); sub.populate(text=chars); sub.subset(font)
 return font
for family in ['DMSans','Anton','Fredoka']:
 font=compact(TTFont(source/(family+'.ttf')));font.flavor='woff2';font.save(web/(family+'.woff2'))
 (web/(family+'-OFL.txt')).write_text((source/(family+'-OFL.txt')).read_text())
for family,axes,filename,postscript in [
 ('DMSans',{'wght':800,'opsz':32},'PapuDisplay-Bold.ttf','PapuDisplay-Bold'),
 ('Fredoka',{'wght':650,'wdth':100},'PapuDisplay-ExtraBold.ttf','PapuDisplay-ExtraBold'),
 ('Anton',{},'PapuPoster.ttf','PapuPoster-Regular')]:
 font=TTFont(source/(family+'.ttf'))
 if axes: font=instantiateVariableFont(font,axes,inplace=True)
 for record in font['name'].names:
  if record.nameID in [1,2,4,6,16,17]:
   value={1:postscript,2:'Regular',4:postscript,6:postscript,16:postscript,17:'Regular'}[record.nameID]
   record.string=value.encode(record.getEncoding())
 # Native text uses font metrics for leading; the original poster has unusually tall line boxes.
 # Preserve Windows glyph bounds so accents are not clipped; normalize only layout metrics.
 if family in ['DMSans','Anton']:
  ascent,descent = (900,-200) if family == 'DMSans' else (2000,-200)
  font['hhea'].ascent=ascent; font['hhea'].descent=descent; font['hhea'].lineGap=0
  font['OS/2'].sTypoAscender=ascent; font['OS/2'].sTypoDescender=descent; font['OS/2'].sTypoLineGap=0
 compact(font).save(ios/filename)
print('Prepared DM Sans 800, Fredoka 650 wordmark and Anton poster fonts, with Polish glyphs.')
