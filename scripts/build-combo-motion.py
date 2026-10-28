"""Author the illustrative PapuPay meal-building scene (no vendor selector).

The host advances stage 0 -> 1 -> 2. Every earlier dish remains on the same
artboard as the next kitchen contributes its part of the meal. No runtime scripts.
"""
from pathlib import Path
import json
import shutil
import struct
import subprocess
import xml.etree.ElementTree as ET
import zlib

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'packages/motion/combo'
PROJECT.mkdir(parents=True, exist_ok=True)
FOODS = [('atom','burger','ATOM'),('fry','fries','The Fry'),('tecza','gelato','Na końcu tęczy')]
missing = [file for _,file,_ in FOODS if not (PROJECT/f'{file}.png').is_file()]
if missing:
    raise FileNotFoundError(f'Required meal photographs are missing: {missing}')
# (ground x, ground y, visible width, rotation, opacity). The burger never fades.
POSES = [
    [(360,570,500,0,1), (680,590,220,.075,0), (720,615,120,.08,0)],
    [(255,565,420,0,1), (515,515,300,0,1), (720,615,120,.08,0)],
    [(230,560,380,0,1), (505,485,300,0,1), (565,595,180,0,1)],
]
# Back-to-front for host fallback drawing; Rive uses the reverse order.
DRAW_ORDER = [1,0,2]


def png_bbox(path):
    """Read RGBA PNG alpha bounds without a third-party imaging dependency.

    Bounds use alpha > 48 to exclude faint photographic contact shadows. Source
    photos remain untouched; the bounds only normalize their placement in Rive.
    """
    raw = path.read_bytes()
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Expected PNG: {path}')
    cursor, compressed = 8, bytearray()
    while cursor < len(raw):
        length = struct.unpack('>I', raw[cursor:cursor+4])[0]
        kind = raw[cursor+4:cursor+8]
        body = raw[cursor+8:cursor+8+length]
        if kind == b'IHDR':
            width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            compressed.extend(body)
        cursor += length + 12
    if (depth, color, interlace) != (8, 6, 0):
        raise ValueError(f'Expected non-interlaced 8-bit RGBA PNG: {path}')
    data = zlib.decompress(compressed)
    stride, cursor, previous = width * 4, 0, bytearray(width * 4)
    left, top, right, bottom = width, height, 0, 0
    for y in range(height):
        mode = data[cursor]
        row = bytearray(data[cursor+1:cursor+stride+1])
        cursor += stride + 1
        for i in range(stride):
            a = row[i-4] if i >= 4 else 0
            b = previous[i]
            c = previous[i-4] if i >= 4 else 0
            if mode == 1: predictor = a
            elif mode == 2: predictor = b
            elif mode == 3: predictor = (a+b)//2
            elif mode == 4:
                p = a+b-c
                pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                predictor = a if pa <= pb and pa <= pc else b if pb <= pc else c
            elif mode == 0: predictor = 0
            else: raise ValueError(f'Unsupported PNG filter {mode}')
            row[i] = (row[i]+predictor)&255
        for x in range(width):
            if row[x*4+3] > 48:
                left, top = min(left,x), min(top,y)
                right, bottom = max(right,x+1), max(bottom,y+1)
        previous = row
    return width, height, (left, top, right, bottom)


encoder = shutil.which('cwebp') or '/opt/homebrew/bin/cwebp'
sources = []
for index,(vendor,file,name) in enumerate(FOODS):
    path = PROJECT/f'{file}.png'
    width,height,bounds = png_bbox(path)
    sources.append((width,height,bounds))
    subprocess.run([encoder,'-quiet','-q','86','-alpha_q','92',str(path),'-o',str(PROJECT/f'{file}.webp')],check=True)

parts=[]
def emit(text): parts.append(text)
def condition(value):
    return ('<TransitionViewModelCondition><TransitionPropertyViewModelComparator><BindablePropertyNumber>'
            '<DataBindContext sourcePathIds="0:800-0:802" propertyKey="636"/>'
            '</BindablePropertyNumber></TransitionPropertyViewModelComparator>'
            f'<TransitionValueNumberComparator value="{value}"/></TransitionViewModelCondition>')
def transition(target,stage,duration=750):
    return (f'<StateTransition stateToId="0:{target}" duration="{duration}" enableEarlyExit="true" interpolationType="cubic">'
            '<CubicEaseInterpolator x1="0.22" y1="0.8" x2="0.2" y2="1"/>'
            +condition(stage)+'</StateTransition>')
def key(node,prop,value):
    return (f'<KeyedObject objectId="0:{node}"><KeyedProperty property="{prop}">'
            f'<KeyFrameDouble frame="0" value="{value}"/></KeyedProperty></KeyedObject>')

emit('<Rive version="1" kind="fragment"><Artboard id="0:2" name="PapuCombo" width="720" height="640" clip="true" '
     'styleId="0:3" defaultStateMachineId="0:7" viewModelId="0:800" viewModelInstanceId="0:801">'
     '<LayoutComponentStyle id="0:3"/>')
for index in reversed(DRAW_ORDER):
    vendor,file,name = FOODS[index]
    node = 100+index*100
    width,height,(left,top,right,bottom) = sources[index]
    # Normalize each asset to 1 unit of visible width. Parent scale then equals
    # its authored visible width; the pivot stays at the food's contact point.
    normal = 1/(right-left)
    child_x = (width/2-(left+right)/2)*normal
    child_y = (height/2-bottom)*normal
    x,y,size,rotation,opacity = POSES[0][index]
    emit(f'<Node id="0:{node}" name="{name} contribution" x="{x}" y="{y}" scaleX="{size}" scaleY="{size}" rotation="{rotation}" opacity="{opacity}">')
    emit(f'<Image id="0:{node+1}" name="{file} photograph" assetId="0:{5000+index}" x="{child_x}" y="{child_y}" scaleX="{normal}" scaleY="{normal}"/>')
    emit('<Node name="Contact shadow" y="0.018" scaleY="0.13"><Shape><Ellipse width="0.83" height="0.83"/>'
         '<Fill><RadialGradient startX="0" startY="0" endX="0.415" endY="0">'
         '<GradientStop position="0" colorValue="55091F17"/><GradientStop position="0.32" colorValue="26091F17"/>'
         '<GradientStop position="1" colorValue="00091F17"/></RadialGradient></Fill></Shape></Node></Node>')

emit('<StateMachine id="0:7" name="PapuCombo"><StateMachineLayer name="Three kitchens build one meal">'
     '<EntryState x="-260" y="0">'+''.join(transition(1000+i,i,0) for i in range(3))+
     '</EntryState><AnyState x="-260" y="-180"/><ExitState x="780" y="-180"/>')
for stage in range(3):
    emit(f'<AnimationState id="0:{1000+stage}" animationId="0:{2000+stage}" x="{stage*260}" y="0">')
    for target in range(3):
        if target!=stage: emit(transition(1000+target,target))
    emit('</AnimationState>')
emit('</StateMachineLayer></StateMachine>')
for stage,title in enumerate(['ATOM starts the meal','The Fry adds a side','Na końcu tęczy adds dessert']):
    emit(f'<LinearAnimation id="0:{2000+stage}" name="{title}" fps="60" duration="1" loopValue="oneShot">')
    for index,(x,y,size,rotation,opacity) in enumerate(POSES[stage]):
        for prop,value in [('x',x),('y',y),('scaleX',size),('scaleY',size),('rotation',rotation),('opacity',opacity)]:
            emit(key(100+index*100,prop,value))
    emit('</LinearAnimation>')
emit('</Artboard><ViewModel id="0:800" name="PapuComboModel" defaultInstanceId="0:801">'
     '<ViewModelPropertyNumber id="0:802" name="stage"/><ViewModelInstance id="0:801" name="Default" exports="true">'
     '<ViewModelInstanceNumber viewModelPropertyId="0:802" propertyValue="0"/></ViewModelInstance></ViewModel>')
for index,(_,file,name) in enumerate(FOODS):
    emit(f'<ImageAsset id="0:{5000+index}" name="{name} dish" file="{file}.webp"/>')
emit('</Rive>')
root=ET.fromstring('\n'.join(parts))
ET.indent(root,space='  ')
(PROJECT/'scene.rml').write_text(ET.tostring(root,encoding='unicode')+'\n')
(PROJECT/'rive.yaml').write_text('name: combo\nlogs:\n  file: build/rive.log\n  problems: build/problems.log\n')

stages=[]
for stage,poses in enumerate(POSES):
    foods=[]
    for index in DRAW_ORDER:
        x,y,size,rotation,opacity=poses[index]
        if not opacity: continue
        vendor,file,name=FOODS[index]
        width,height,(left,top,right,bottom)=sources[index]
        scale=size/(right-left)
        foods.append({
            'vendorId':vendor,'file':file,
            'imageWidth':round(width*scale,4),'imageHeight':round(height*scale,4),
            'centerX':round(x+(width/2-(left+right)/2)*scale,4),
            'centerY':round(y+(height/2-bottom)*scale,4),
            'visibleWidth':size,'visibleHeight':round((bottom-top)*scale,4),
        })
    stages.append({'stage':stage,'foods':foods})
(PROJECT/'fallback-layout.json').write_text(json.dumps({
    'width':720,'height':640,'stageCount':3,'background':'transparent','transitionMs':750,
    'stages':stages,
},indent=2)+'\n')
print('Authored cumulative PapuCombo: burger, then fries, then dessert; 3 stages; 750ms reversible reflow')
