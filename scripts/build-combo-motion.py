"""Build PapuPay's script-free, data-bound multi-kitchen meal composition.

Author the RML with this file, then validate/export with Rive CLI 1.8+:
  python3 scripts/build-combo-motion.py
  rive packages/motion/combo --verify
  rive inspect packages/motion/combo --summary
  rive packages/motion/combo --once

The source uses only Rive transforms, images, gradients, timelines and view-model
conditions. Autoplay and accessible vendor controls belong to the host app.
"""
from pathlib import Path
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'packages/motion/combo'
PROJECT.mkdir(parents=True, exist_ok=True)

# Numbers are artboard units, not device pixels. Food names describe demo
# photography; they do not claim official vendor product photography.
FOODS = [
    ('burger', 'ATOM burger', 100, 900),
    ('fries', 'The Fry fries', 200, 901),
    ('gelato', 'Na końcu tęczy gelato', 300, 902),
]
missing = [name for name, *_ in FOODS if not (PROJECT / f'{name}.png').is_file()]
if missing:
    raise FileNotFoundError(f'Required combo photographs are missing: {missing}')

# x, y, image-width, rotation (radians), opacity
POSES = [
    [(360, 284, 445, 0, 1), (685, 282, 190, .11, 0), (710, 370, 150, .12, 0)],
    [(278, 300, 386, -.015, 1), (497, 321, 294, .025, 1), (720, 370, 150, .12, 0)],
    [(246, 293, 356, -.015, 1), (449, 281, 280, .02, 1), (553, 354, 228, -.025, 1)],
]
# Individual contact shadows settle under the food. They travel along the same
# authored path and share its scale; they never bob independently at rest.
SHADOWS = [
    [(360, 435, 345, .20), (685, 420, 175, 0), (710, 465, 120, 0)],
    [(278, 431, 300, .20), (497, 426, 215, .18), (720, 465, 120, 0)],
    [(246, 414, 275, .20), (449, 381, 205, .18), (553, 435, 170, .22)],
]
parts = []
def emit(s): parts.append(s)
def rectangle(w, h, radius=0):
    return f'<Rectangle width="{w}" height="{h}" cornerRadiusTL="{radius}"/>'
def solid(color): return f'<Fill><SolidColor colorValue="{color}"/></Fill>'
def key(node, prop, value):
    return (f'<KeyedObject objectId="0:{node}"><KeyedProperty property="{prop}">'
            f'<KeyFrameDouble frame="0" value="{value}"/>'
            '</KeyedProperty></KeyedObject>')
def condition(value):
    return ('<TransitionViewModelCondition>'
            '<TransitionPropertyViewModelComparator><BindablePropertyNumber>'
            '<DataBindContext sourcePathIds="0:800-0:802" propertyKey="636"/>'
            '</BindablePropertyNumber></TransitionPropertyViewModelComparator>'
            f'<TransitionValueNumberComparator value="{value}"/>'
            '</TransitionViewModelCondition>')
def pixel_width(path):
    # PNG width, no image processing required. Rive embeds the original photo.
    with path.open('rb') as stream:
        header = stream.read(24)
    if header[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Expected PNG: {path}')
    return struct.unpack('>I', header[16:20])[0]

emit('<Rive version="1" kind="fragment">')
emit('<Artboard id="0:2" name="PapuCombo" width="720" height="560" '
     'styleId="0:3" defaultStateMachineId="0:7" viewModelId="0:800" '
     'viewModelInstanceId="0:801"><LayoutComponentStyle id="0:3"/>'
     '<Fill><SolidColor colorValue="FF123C2D"/></Fill>')
# Rive draw order is front-to-back. Dessert sits foreground, fries then burger.
for index in [2, 1, 0]:
    file, name, node, asset = FOODS[index]
    x, y, width, rotation, opacity = POSES[0][index]
    emit(f'<Node id="0:{node}" name="{name}" x="{x}" y="{y}" '
         f'scaleX="{width/512}" scaleY="{width/512}" rotation="{rotation}" opacity="{opacity}">')
    path = PROJECT / f'{file}.png'
    if path.exists():
        normalization = 512 / pixel_width(path)
        emit(f'<Image id="0:{node+1}" name="{name} photograph" assetId="0:{asset}" '
             f'scaleX="{normalization}" scaleY="{normalization}"/>')
    else:
        emit(f'<Shape id="0:{node+1}" name="{name} layout placeholder">'
             '<Ellipse width="400" height="350"/>' + solid(['FFFF8848', 'FFFFD78E', 'FFF6EADD'][index]) + '</Shape>')
    emit('</Node>')
# Soft shadows made from small radial gradients, no blur filter or heavy shader.
for index, (_, name, node, _) in enumerate(FOODS):
    x, y, width, opacity = SHADOWS[0][index]
    emit(f'<Node id="0:{node+10}" name="{name} contact shadow" x="{x}" y="{y}" '
         f'scaleX="{width/320}" scaleY="{width/320*.24}" opacity="{opacity}">')
    emit('<Shape><Ellipse width="320" height="320"/><Fill><RadialGradient '
         'startX="0" startY="0" endX="160" endY="0">'
         '<GradientStop position="0" colorValue="FF071E17"/>'
         '<GradientStop position="0.32" colorValue="B8071E17"/>'
         '<GradientStop position="1" colorValue="00071E17"/>'
         '</RadialGradient></Fill></Shape></Node>')
# A subtle warm pool grounds the whole meal without a conspicuous illustrated table.
emit('<Node id="0:500" name="Warm presentation light" x="360" y="405" scaleY="0.38">'
     '<Shape><Ellipse width="690" height="690"/><Fill><RadialGradient '
     'startX="0" startY="0" endX="345" endY="0">'
     '<GradientStop position="0" colorValue="1CFFF0D6"/>'
     '<GradientStop position="0.55" colorValue="0EFFF0D6"/>'
     '<GradientStop position="1" colorValue="00FFF0D6"/>'
     '</RadialGradient></Fill></Shape></Node>')

emit('<StateMachine id="0:7" name="PapuCombo"><StateMachineLayer name="Build your meal">'
     '<EntryState x="-240" y="0"><StateTransition stateToId="0:70"/></EntryState>'
     '<AnyState x="-240" y="-180"/><ExitState x="700" y="-180"/>')
for stage in range(3):
    emit(f'<AnimationState id="0:{70+stage}" animationId="0:{1000+stage}" x="{stage*260}" y="0">')
    for target in range(3):
        if target != stage:
            emit(f'<StateTransition stateToId="0:{70+target}" duration="700" '
                 'enableEarlyExit="true" interpolationType="cubic">'
                 '<CubicEaseInterpolator x1="0.22" y1="0.8" x2="0.2" y2="1"/>'
                 + condition(target) + '</StateTransition>')
    emit('</AnimationState>')
emit('</StateMachineLayer></StateMachine>')
for stage, title in enumerate(['A main from ATOM', 'Add fries from The Fry', 'Finish with Na końcu tęczy']):
    emit(f'<LinearAnimation id="0:{1000+stage}" name="{title}" fps="60" duration="1" loopValue="oneShot">')
    for index, (_, _, node, _) in enumerate(FOODS):
        x, y, width, rotation, opacity = POSES[stage][index]
        for prop, value in [('x',x),('y',y),('scaleX',width/512),('scaleY',width/512),('rotation',rotation),('opacity',opacity)]:
            emit(key(node, prop, value))
        sx, sy, sw, so = SHADOWS[stage][index]
        for prop, value in [('x',sx),('y',sy),('scaleX',sw/320),('scaleY',sw/320*.24),('opacity',so)]:
            emit(key(node+10, prop, value))
    emit('</LinearAnimation>')
emit('</Artboard>')
emit('<ViewModel id="0:800" name="PapuComboModel" defaultInstanceId="0:801">'
     '<ViewModelPropertyNumber id="0:802" name="stage"/>'
     '<ViewModelInstance id="0:801" name="Default" exports="true">'
     '<ViewModelInstanceNumber viewModelPropertyId="0:802" propertyValue="0"/>'
     '</ViewModelInstance></ViewModel>')
for file, name, node, asset in FOODS:
    if (PROJECT/f'{file}.png').exists():
        emit(f'<ImageAsset id="0:{asset}" name="{name}" file="{file}.png"/>')
emit('</Rive>')
# Pretty source stays editable in both CLI and Rive's editor import.
root = ET.fromstring('\n'.join(parts))
ET.indent(root, space='  ')
(PROJECT/'scene.rml').write_text(ET.tostring(root, encoding='unicode')+'\n')
(PROJECT/'rive.yaml').write_text('name: combo\nlogs:\n  file: build/rive.log\n  problems: build/problems.log\n')
print('Authored PapuCombo: 720x560, three photographic poses, reversible 700ms transitions')
