"""Author PapuPay's photographic, directional Rive vendor carousel.

No runtime scripts. The host owns accessible windows, locale, autoplay and swipe.
The exported view model exposes `stage` (0..9) and `direction` (-1 or +1).
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
FOODS = [
    ('atom', 'burger', 'ATOM'),
    ('kago', 'ramen', 'KAGO'),
    ('semolino', 'pizza', 'Semolino'),
    ('curry', 'curry', 'Curry Leaves'),
    ('gringo', 'tacos', 'Gringo Bar'),
    ('tuktuk', 'noodles', 'Tuk Tuk'),
    ('bibimbar', 'bowl', 'BIBIMBAR'),
    ('fry', 'fries', 'The Fry'),
    ('bar', 'lemonade', 'Bar Koszyki'),
    ('tecza', 'gelato', 'Na końcu tęczy'),
]
missing = [file for _, file, _ in FOODS if not (PROJECT / f'{file}.png').is_file()]
if missing:
    raise FileNotFoundError(f'Required carousel photographs are missing: {missing}')


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
layout = []
for index, (vendor, file, name) in enumerate(FOODS):
    source = PROJECT / f'{file}.png'
    w, h, (left, top, right, bottom) = png_bbox(source)
    scale = min(500/(right-left), 440/(bottom-top))
    x = 360 + (w/2 - (left+right)/2)*scale
    y = 570 + (h/2 - bottom)*scale
    layout.append({
        'stage': index, 'vendorId': vendor, 'file': file,
        'sourceWidth': w, 'sourceHeight': h,
        'alphaBounds': [left, top, right, bottom],
        'imageWidth': round(w*scale,4), 'imageHeight': round(h*scale,4),
        'centerX': round(x,4), 'centerY': round(y,4),
        'visibleWidth': round((right-left)*scale,4),
        'visibleHeight': round((bottom-top)*scale,4),
        'sourceScale': scale,
    })
    subprocess.run([encoder, '-quiet', '-q', '86', '-alpha_q', '92', str(source),
                    '-o', str(PROJECT/f'{file}.webp')], check=True)

parts = []
def emit(text): parts.append(text)
def condition(value, prop=802, op='equal'):
    return (f'<TransitionViewModelCondition opValue="{op}">'
            '<TransitionPropertyViewModelComparator><BindablePropertyNumber>'
            f'<DataBindContext sourcePathIds="0:800-0:{prop}" propertyKey="636"/>'
            '</BindablePropertyNumber></TransitionPropertyViewModelComparator>'
            f'<TransitionValueNumberComparator value="{value}"/>'
            '</TransitionViewModelCondition>')
def transition(target, conditions='', duration=0, early=False, curve=(.22,.8,.2,1), gate=False):
    gate_attributes = 'enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"' if gate else ''
    return (f'<StateTransition stateToId="0:{target}" duration="{duration}" '
            f'enableEarlyExit="{str(early).lower()}" interpolationType="cubic" {gate_attributes}>'
            f'<CubicEaseInterpolator x1="{curve[0]}" y1="{curve[1]}" x2="{curve[2]}" y2="{curve[3]}"/>'
            + conditions + '</StateTransition>')
def key(node, prop, value):
    return (f'<KeyedObject objectId="0:{node}"><KeyedProperty property="{prop}">'
            f'<KeyFrameDouble frame="0" value="{value}"/>'
            '</KeyedProperty></KeyedObject>')

emit('<Rive version="1" kind="fragment">')
emit('<Artboard id="0:2" name="PapuCombo" width="720" height="640" clip="true" '
     'styleId="0:3" defaultStateMachineId="0:7" viewModelId="0:800" '
     'viewModelInstanceId="0:801"><LayoutComponentStyle id="0:3"/>')
for index, (_, file, name) in enumerate(FOODS):
    node = 100+index*20
    item = layout[index]
    # Rotation pivots around the food's contact point, not its visual centre.
    emit(f'<Node id="0:{node}" name="{name} selected dish" x="360" y="570" opacity="{int(index==0)}">')
    emit(f'<Image id="0:{node+1}" name="{file} photograph" assetId="0:{5000+index}" '
         f'x="{item["centerX"]-360}" y="{item["centerY"]-570}" '
         f'scaleX="{item["sourceScale"]}" scaleY="{item["sourceScale"]}"/>')
    emit(f'<Node name="{name} contact shadow" y="8" scaleY="0.13">'
         f'<Shape><Ellipse width="{item["visibleWidth"]*.83}" height="{item["visibleWidth"]*.83}"/>'
         f'<Fill><RadialGradient startX="0" startY="0" endX="{item["visibleWidth"]*.415}" endY="0">'
         '<GradientStop position="0" colorValue="55091F17"/>'
         '<GradientStop position="0.32" colorValue="26091F17"/>'
         '<GradientStop position="1" colorValue="00091F17"/>'
         '</RadialGradient></Fill></Shape></Node></Node>')

emit('<StateMachine id="0:7" name="PapuCombo">')
for index, (_, _, name) in enumerate(FOODS):
    base = 1000+index*10
    active, left, right, exit_left, exit_right = base, base+1, base+2, base+3, base+4
    selected = condition(index)
    deselected = condition(index,op='notEqual')
    forward = condition(0,prop=803,op='greaterThanOrEqual')
    backward = condition(0,prop=803,op='lessThan')
    emit(f'<StateMachineLayer name="{name} directional motion">'
         '<EntryState x="-260" y="0">'+transition(active,selected)+transition(left,backward)+transition(right)+
         '</EntryState><AnyState x="-260" y="-220"/><ExitState x="780" y="-220"/>')
    emit(f'<AnimationState id="0:{active}" animationId="0:{2000+index*10}" x="260" y="0">'
         +transition(exit_left,deselected+forward,280,True,(.2,.8,.2,1))
         +transition(exit_right,deselected+backward,280,True,(.2,.8,.2,1))+'</AnimationState>')
    # Direction preparation is invisible. It waits for an outgoing blend to
    # finish, but a reselection is allowed to reverse the blend immediately.
    emit(f'<AnimationState id="0:{left}" animationId="0:{2001+index*10}" x="0" y="180">'
         +transition(right,forward,0,False)
         +transition(active,selected,700,True)+'</AnimationState>')
    emit(f'<AnimationState id="0:{right}" animationId="0:{2002+index*10}" x="520" y="180">'
         +transition(left,backward,0,False)
         +transition(active,selected,700,True)+'</AnimationState>')
    # Dedicated exits retain the 280ms outgoing blend before resetting the
    # invisible preparation pose. A reselected dish can reverse immediately.
    for state, animation, graph_x in [(exit_left,2003+index*10,0),(exit_right,2004+index*10,520)]:
        emit(f'<AnimationState id="0:{state}" animationId="0:{animation}" reset="true" x="{graph_x}" y="-180">'
             +transition(active,selected,700,True)
             +transition(left,backward,gate=True)
             +transition(right,forward,gate=True)+'</AnimationState>')
    emit('</StateMachineLayer>')
emit('</StateMachine>')
for index, (_, _, name) in enumerate(FOODS):
    node = 100+index*20
    for pose, (title,x,y,scale,rotation,opacity) in enumerate([
        ('Centre',360,570,1,0,1),
        ('Left wing',125,590,.86,-.085,0),
        ('Right wing',595,590,.86,.085,0),
        ('Exit left',125,590,.86,-.085,0),
        ('Exit right',595,590,.86,.085,0),
    ]):
        emit(f'<LinearAnimation id="0:{2000+index*10+pose}" name="{name} — {title}" fps="60" duration="{18 if pose >= 3 else 1}" loopValue="oneShot">')
        for prop,value in [('x',x),('y',y),('scaleX',scale),('scaleY',scale),('rotation',rotation),('opacity',opacity)]:
            emit(key(node,prop,value))
        emit('</LinearAnimation>')
emit('</Artboard>')
emit('<ViewModel id="0:800" name="PapuComboModel" defaultInstanceId="0:801">'
     '<ViewModelPropertyNumber id="0:802" name="stage"/>'
     '<ViewModelPropertyNumber id="0:803" name="direction"/>'
     '<ViewModelInstance id="0:801" name="Default" exports="true">'
     '<ViewModelInstanceNumber viewModelPropertyId="0:802" propertyValue="0"/>'
     '<ViewModelInstanceNumber viewModelPropertyId="0:803" propertyValue="1"/>'
     '</ViewModelInstance></ViewModel>')
for index, (_,file,name) in enumerate(FOODS):
    emit(f'<ImageAsset id="0:{5000+index}" name="{name} dish" file="{file}.webp"/>')
emit('</Rive>')
root = ET.fromstring('\n'.join(parts))
ET.indent(root, space='  ')
(PROJECT/'scene.rml').write_text(ET.tostring(root,encoding='unicode')+'\n')
(PROJECT/'rive.yaml').write_text('name: combo\nlogs:\n  file: build/rive.log\n  problems: build/problems.log\n')
(PROJECT/'fallback-layout.json').write_text(json.dumps({
    'width':720,'height':640,'stageCount':10,'background':'transparent',
    'entranceMs':700,'exitMs':280,'foods':layout,
},indent=2)+'\n')
print('Authored 10-kitchen PapuCombo with directional movement and embedded WebP photographs')
