from pathlib import Path
import math
ROOT=Path(__file__).resolve().parents[3]
PROJECT=ROOT/'packages/motion/table'
parts=[]
def emit(text): parts.append(text)
def fill(c):return f'<Fill><SolidColor colorValue="{c}"/></Fill>'
def ellipse(w,h):return f'<Ellipse width="{w}" height="{h}"/>'
def rect(w,h,r=0):return f'<Rectangle width="{w}" height="{h}" cornerRadiusTL="{r}"/>'
def shape(i,name,x,y,g,c,opacity=1):return f'<Shape id="0:{i}" name="{name}" x="{x}" y="{y}" opacity="{opacity}">{g}{fill(c)}</Shape>'
def radial(i,name,x,y,w,h,c):
 return f'<Shape id="0:{i}" name="{name}" x="{x}" y="{y}">{ellipse(w,h)}<Fill><RadialGradient startX="0" startY="0" endX="{w/2}" endY="0"><GradientStop position="0" colorValue="{c}"/><GradientStop position="1" colorValue="00000000"/></RadialGradient></Fill></Shape>'
def line(i,name,points,color='FF123C2D',width=4,opacity=1):
 return f'<Shape id="0:{i}" name="{name}" opacity="{opacity}"><PointsPath>'+''.join(f'<StraightVertex x="{x}" y="{y}"/>' for x,y in points)+f'</PointsPath><Stroke thickness="{width}" cap="round" join="round"><SolidColor colorValue="{color}"/></Stroke></Shape>'
def key(i,prop,frames,curve=(.2,.75,.2,1)):
 return f'<KeyedObject objectId="0:{i}"><KeyedProperty property="{prop}">'+''.join(f'<KeyFrameDouble frame="{f}" value="{v}" interpolationType="cubic"><CubicEaseInterpolator x1="{curve[0]}" y1="{curve[1]}" x2="{curve[2]}" y2="{curve[3]}"/></KeyFrameDouble>' for f,v in frames)+'</KeyedProperty></KeyedObject>'
def anim(i,name,duration,content,loop='oneShot'):
 return f'<LinearAnimation id="0:{i}" name="{name}" fps="60" duration="{duration}" loopValue="{loop}">{content}</LinearAnimation>'
def condition(value):
 return f'<TransitionViewModelCondition><TransitionPropertyViewModelComparator><BindablePropertyNumber><DataBindContext sourcePathIds="0:800-0:802" propertyKey="636"/></BindablePropertyNumber></TransitionPropertyViewModelComparator><TransitionValueNumberComparator value="{value}"/></TransitionViewModelCondition>'
ink='FF123C2D';orange='FFFF7837';cream='FFFFF3D8';green='FF317A53'
emit('<Rive version="1" kind="fragment"><Artboard id="0:2" name="PapuTable" width="800" height="620" styleId="0:3" defaultStateMachineId="0:7" viewModelId="0:800" viewModelInstanceId="0:801"><LayoutComponentStyle id="0:3"/>')
emit('<Node id="0:4" name="Shared table scene" y="-20">')
# Front-to-back: guests' dishes, utensils, table surface, rim, shadow.
for i,(name,x,y,width,asset) in enumerate([('Burger',230,340,335,900),('Ramen',548,262,320,901),('Pizza',478,462,355,902)]):
 outer=100+i*100;inner=outer+1
 emit(f'<Node id="0:{outer}" name="{name} arrival" x="{x}" y="{y}"><Node id="0:{inner}" name="{name} focus">')
 emit(shape(inner+4,name+' tap area',0,0,ellipse(275,245),'01123C2D'))
 emit(f'<Image id="0:{inner+1}" name="{name} photo" assetId="0:{asset}" scaleX="{width/640}" scaleY="{width/640}"/>')
 emit(radial(inner+2,name+' contact shadow',4,68,285,105,'70123C2D'))
 emit(shape(inner+3,name+' quiet glow',0,48,ellipse(287,118),'00FFF3D8'))
 emit('</Node></Node>')
# Steam only accompanies the entrance; the scene settles and can pause.
emit('<Node id="0:405" name="Steam arrival" x="548" y="188">')
for i in range(3):
 emit(f'<Node id="0:{410+i}" name="Ramen steam {i+1}" x="{-30+i*30}" y="0" opacity="0">')
 emit(line(420+i,'Steam curl',[(-3,0),(-10,-13),(2,-26),(-4,-39)],cream,3.5))
 emit('</Node>')
emit('</Node>')
# Cutlery makes the shared table visually understandable without extra text.
emit('<Node id="0:500" name="Cutlery arrival" x="400" y="350">')
for i,x in enumerate([-318,318]):
 emit(f'<Node id="0:{510+i}" name="Cutlery {i}" x="{x}" y="20" rotation="{-.15 if i==0 else .13}">')
 emit(line(530+i,'Utensil handle',[(0,-35),(0,70)],ink,9,.8))
 if i==0:
  for j in range(3):emit(line(540+j,'Fork tine',[(-11+j*11,-74),(-11+j*11,-36)],ink,6,.8))
  emit(line(544,'Fork shoulders',[(-11,-40),(0,-30),(11,-40)],ink,7,.8))
 else:emit(shape(545,'Spoon bowl',0,-57,ellipse(35,56),ink,.8))
 emit('</Node>')
emit('</Node>')
# A dimensional but restrained communal tabletop.
emit('<Node id="0:600" name="Table arrival" x="400" y="365">')
emit(f'<Shape id="0:602" name="Table edge light">{ellipse(668,388)}<Stroke thickness="3"><SolidColor colorValue="FFFFE6B8"/></Stroke></Shape>')
emit(f'<Shape id="0:601" name="Tabletop">{ellipse(670,390)}<Fill><LinearGradient startX="-250" startY="-170" endX="250" endY="190"><GradientStop position="0" colorValue="FFFFDCA0"/><GradientStop position="0.50" colorValue="FFFFAD63"/><GradientStop position="1" colorValue="FFFF8848"/></LinearGradient></Fill></Shape>')
emit(f'<Shape id="0:603" name="Table thickness" y="22">{ellipse(670,390)}<Fill><LinearGradient startX="-200" startY="-160" endX="200" endY="200"><GradientStop position="0" colorValue="FFFF9954"/><GradientStop position="1" colorValue="FFCD4A1C"/></LinearGradient></Fill></Shape>')
emit('</Node>')
emit(radial(610,'Table ground shadow',404,465,714,220,'70123C2D'))
# Two tiny papaya-colour sparks are earned at the table's edge.
emit('<Node id="0:700" name="Welcome details" opacity="0">')
emit(shape(701,'Papu spark',102,157,'<Star width="22" height="22" points="4" innerRadius="0.24"/>',orange))
emit(shape(702,'Papu spark small',693,168,'<Star width="12" height="12" points="4" innerRadius="0.24"/>',green))
emit('</Node>')
# Separate arrival and focus layers key separate objects, preventing animation fights.
emit('</Node>')
emit('<StateMachine id="0:7" name="PapuTable"><StateMachineLayer name="Arrive at your table"><EntryState x="-220" y="0"><StateTransition stateToId="0:71"/></EntryState><AnyState x="-220" y="-160"/><ExitState x="400" y="-160"/><AnimationState id="0:71" animationId="0:1000" x="80" y="0"/></StateMachineLayer>')
emit('<StateMachineLayer name="Explore every kitchen"><EntryState x="-220" y="0"><StateTransition stateToId="0:80"/></EntryState><AnyState x="-220" y="-160"/><ExitState x="1150" y="-160"/>')
for state in range(4):
 emit(f'<AnimationState id="0:{80+state}" animationId="0:{1100+state}" x="{state*260}" y="0">')
 for other in range(4):
  if state!=other:emit(f'<StateTransition stateToId="0:{80+other}" duration="320" enableEarlyExit="true">'+condition(other)+'</StateTransition>')
 emit('</AnimationState>')
emit('</StateMachineLayer><StateMachineLayer name="Kitchen warmth"><EntryState x="-200" y="0"><StateTransition stateToId="0:90"/></EntryState><AnyState x="-200" y="-160"/><ExitState x="400" y="-160"/><AnimationState id="0:90" animationId="0:1200" x="70" y="0"/></StateMachineLayer>')
for i in range(3):
 emit(f'<StateMachineListenerSingle targetId="0:{105+i*100}" name="Explore {i+1}" listenerTypeValue="click"><ListenerViewModelChange><BindablePropertyNumber propertyValue="{i+1}"><DataBindContext sourcePathIds="0:800-0:802" propertyKey="636" direction="true"/></BindablePropertyNumber></ListenerViewModelChange></StateMachineListenerSingle>')
emit('</StateMachine>')
intro=''
for i,(x,y,dx,dy,rot) in enumerate([(230,340,-18,22,-.035),(548,262,18,14,.035),(478,462,12,22,-.025)]):
 start=8+i*9;n=100+i*100
 intro+=key(n,'x',[(0,x+dx),(start,x+dx),(start+32,x-5),(start+42,x)])
 intro+=key(n,'y',[(0,y+dy),(start,y+dy),(start+32,y-5),(start+42,y)])
 intro+=key(n,'rotation',[(0,rot),(start,rot),(start+35,-rot*.1),(start+44,0)])
 intro+=key(n,'opacity',[(0,.94),(start,.94),(start+14,1)])
 intro+=key(n,'scaleX',[(0,.94),(start,.94),(start+34,1.02),(start+44,1)])+key(n,'scaleY',[(0,.94),(start,.94),(start+34,1.02),(start+44,1)])
intro+=key(600,'scaleX',[(0,1),(36,1)])+key(600,'scaleY',[(0,1),(36,1)])+key(600,'opacity',[(0,1),(20,1)])
intro+=key(500,'opacity',[(0,.85),(48,.85)])+key(405,'opacity',[(0,0),(50,0),(70,1)])+key(700,'opacity',[(0,0),(48,0),(72,1)])
emit(anim(1000,'The whole hall comes together',78,intro))
for state in range(4):
 content=''
 for i in range(3):
  active=state==i+1;other=state!=0 and not active;n=101+i*100
  scale=1.13 if active else .88 if other else 1
  content+=key(n,'scaleX',[(0,scale)])+key(n,'scaleY',[(0,scale)])
  content+=key(n,'opacity',[(0,1)])
  content+=key(n,'x',[(0,[-12,14,18][i] if other else 0)])
  content+=key(n,'y',[(0,-18 if active else [-2,-8,10][i] if other else 0)])
 emit(anim(1100+state,['Everyone at one table','Explore ATOM','Explore KAGO','Explore Semolino'][state],1,content))
steam=''
for i in range(3):
 steam+=key(410+i,'y',[(0,3),(84,-13)])+key(410+i,'opacity',[(0,0),(18+i*5,.62),(56+i*3,.62),(84,0)])
emit(anim(1200,'Fresh from the kitchen',84,steam))
emit('</Artboard><ViewModel id="0:800" name="PapuTableModel" defaultInstanceId="0:801"><ViewModelPropertyNumber id="0:802" name="selected"/><ViewModelInstance id="0:801" name="Default" exports="true"><ViewModelInstanceNumber viewModelPropertyId="0:802" propertyValue="0"/></ViewModelInstance></ViewModel>')
for asset,file in [(900,'burger'),(901,'ramen'),(902,'pizza')]:
 source=f'{file}.png' if (PROJECT/f'{file}.png').exists() else f'../../../apps/web/public/assets/{file}.jpg'
 emit(f'<ImageAsset id="0:{asset}" name="{file}" file="{source}"/>')
emit('</Rive>')
(PROJECT/'scene.rml').write_text('\n'.join(parts))
print('Authored PapuTable: one-shot arrival, four data-bound poses, three tappable dishes, independent steam')
