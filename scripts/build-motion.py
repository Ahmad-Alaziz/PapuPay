"""Author editable Rive timelines. Build with Rive CLI 1.8+. No scripts in runtime."""
from pathlib import Path
import math
ROOT=Path(__file__).resolve().parents[1]
parts=[]
def emit(s):parts.append(s)
def fill(color):return f'<Fill><SolidColor colorValue="{color}"/></Fill>'
def shape(id,name,x,y,geom,color,opacity=1):return f'<Shape id="0:{id}" name="{name}" x="{x}" y="{y}" opacity="{opacity}">{geom}{fill(color)}</Shape>'
def key(id,prop,frames,curve=(.4,0,.2,1)):
 return f'<KeyedObject objectId="0:{id}"><KeyedProperty property="{prop}">'+''.join(f'<KeyFrameDouble frame="{f}" value="{v}" interpolationType="cubic"><CubicEaseInterpolator x1="{curve[0]}" y1="{curve[1]}" x2="{curve[2]}" y2="{curve[3]}"/></KeyFrameDouble>' for f,v in frames)+'</KeyedProperty></KeyedObject>'
def anim(id,name,duration,content,loop='oneShot'):
 return f'<LinearAnimation id="0:{id}" name="{name}" fps="60" duration="{duration}" loopValue="{loop}">{content}</LinearAnimation>'

# Five authored scenes share one data-bound state machine. No runtime scripts.
emit('<Rive version="1" kind="fragment"><Artboard id="0:2" name="Papu" width="500" height="500" styleId="0:3" defaultStateMachineId="0:7" viewModelId="0:800" viewModelInstanceId="0:801"><LayoutComponentStyle id="0:3"/>')
def rect(w,h,r=0):return f'<Rectangle width="{w}" height="{h}" cornerRadiusTL="{r}" cornerRadiusTR="{r}" cornerRadiusBL="{r}" cornerRadiusBR="{r}"/>'
def line(points,color='FF123C2D',width=5):
 return '<Shape><PointsPath>'+''.join(f'<StraightVertex x="{x}" y="{y}"/>' for x,y in points)+f'</PointsPath><Stroke thickness="{width}" cap="round" join="round"><SolidColor colorValue="{color}"/></Stroke></Shape>'
def node(id,name,x=250,y=250,opacity=1):emit(f'<Node id="0:{id}" name="{name}" x="{x}" y="{y}" opacity="{opacity}">')
def end():emit('</Node>')
ink='FF123C2D';cream='FFFFF6E6';orange='FFFF7837';green='FF317A53'
# Press feedback is driven by a second state-machine layer, independent of the journey scene.
emit(shape(25,'Tap surface',250,250,rect(440,460,80),'01173C2B'))
for i in range(12):
 emit(shape(100+i,f'Confetti {i}',250,250,'<Star width="16" height="16" points="4" innerRadius="0.23"/>' if i%3==0 else rect(7,15,3),[orange,green,'FFFFC96B'][i%3],0))
# Ready pickup ticket with perforation, bold check and tiny receipt rows.
node(400,'Pickup ticket',250,250,0)
node(410,'Ready stamp',65,-72)
emit(line([(-16,0),(-4,12),(21,-15)],cream,7))
emit(shape(411,'Seal',0,0,'<Ellipse width="78" height="78"/>',green));end()
for i in range(9):emit(shape(420+i,'Perforation',-96+i*24,25,'<Ellipse width="5" height="5"/>','FFB9C6B0'))
emit(shape(430,'Receipt line',-20,65,rect(125,10,5),'FFD9E1CF'))
emit(shape(431,'Receipt line',-35,88,rect(95,8,4),'FFD9E1CF'))
emit(shape(432,'Paid bar',0,127,rect(180,28,14),ink))
emit('<Node name="Ticket papaya" x="-60" y="-65"><Image assetId="0:900" scaleX="0.20" scaleY="0.20"/></Node>')
emit(shape(433,'Paper',0,0,rect(266,340,22),cream))
emit(shape(434,'Paper edge',5,8,rect(266,340,22),'FFE1CCAA'));end()
# Cooking cloche. Steam is independently timed, with a lifting lid.
node(300,'Kitchen',250,270,0)
for i in range(3):
 node(310+i,'Steam',-46+i*46,-95)
 emit(line([(0,0),(-7,-15),(5,-32),(0,-48)],green,6));end()
node(320,'Cloche lid',0,0)
emit(shape(321,'Knob',0,-70,'<Ellipse width="25" height="25"/>',ink))
emit(shape(322,'Handle glint',-4,-74,'<Ellipse width="7" height="7"/>',cream))
emit('<Shape name="Dome"><PointsPath isClosed="true"><CubicDetachedVertex x="-125" y="45" outRotation="-1.570796" outDistance="180"/><CubicDetachedVertex x="125" y="45" inRotation="-1.570796" inDistance="180"/></PointsPath>'+fill(orange)+'</Shape>')
emit(shape(323,'Cloche rim',0,46,rect(280,17,8),ink));end()
emit(shape(324,'Platter',0,70,rect(302,16,8),cream))
emit(shape(325,'Platter shadow',0,82,rect(260,8,4),'FFCAD5C0'))
emit(shape(326,'Progress',0,125,rect(175,8,4),green))
end()
# A paper takeaway bag: food coins fall in, the bag gives a soft catch.
node(200,'Basket',250,260,0)
node(210,'Bag body',0,35)
emit(line([(-48,-92),(-48,-120),(48,-120),(48,-92)],ink,9))
emit('<Node name="Bag mark" x="0" y="0"><Image assetId="0:900" scaleX="0.25" scaleY="0.25"/></Node>')
emit(shape(212,'Bag fold',0,104,rect(218,17,3),'FFE7B876'))
emit(shape(213,'Bag front',0,0,rect(225,230,16),'FFFAD7A2'))
emit(shape(214,'Bag side',9,5,rect(225,230,16),'FFD49F60'));end()
for i,(x,color) in enumerate([(-82,orange),(0,green),(82,'FFE6B633')]):
 node(220+i,'Food coin',x,-125)
 if i==0:
  emit(shape(230,'Burger filling',0,2,rect(45,7,3),green));emit(shape(231,'Burger bun',0,-9,rect(45,15,7),orange));emit(shape(232,'Burger base',0,13,rect(45,8,4),orange))
 elif i==1:
  emit(line([(-20,-13),(20,-13)],green,6));emit(shape(233,'Noodle bowl',0,5,rect(41,24,11),orange));emit(line([(-6,-22),(5,-34)],green,3))
 else:
  emit(shape(234,'Drink',0,2,rect(25,40,5),orange));emit(line([(2,-18),(8,-33),(19,-33)],ink,3))
 emit(shape(235+i,'Food circle',0,0,'<Ellipse width="77" height="77"/>',cream));end()
end()
# Dimensional brand and scanning frame.
node(20,'Brand',250,236)
emit('<Image name="Papaya sculpture" assetId="0:900" scaleX="0.60" scaleY="0.60"/>');end()
node(50,'Scanner',0,0,0)
for x,y,sx,sy in [(88,85,1,1),(412,85,-1,1),(88,407,1,-1),(412,407,-1,-1)]:
 emit(f'<Node x="{x}" y="{y}" scaleX="{sx}" scaleY="{sy}">'+line([(0,31),(0,0),(31,0)],green,5)+'</Node>')
emit(shape(51,'Scan beam',250,110,rect(310,3,1.5),green));end()
for id,x,y,s,c in [(30,80,185,22,orange),(31,420,295,18,green),(32,355,68,17,'FFFFC96B')]:
 emit(shape(id,'Spark',x,y,f'<Star width="{s}" height="{s}" points="4" innerRadius="0.2"/>',c))
emit(shape(22,'Ground shadow',250,450,'<Ellipse width="230" height="18"/>','1C123C2D'))
emit(shape(23,'Backdrop',250,250,'<Ellipse width="420" height="420"/>','FFF1E8D4'))
def condition(value):
 return f'<TransitionViewModelCondition><TransitionPropertyViewModelComparator><BindablePropertyNumber><DataBindContext sourcePathIds="0:800-0:802" propertyKey="636"/></BindablePropertyNumber></TransitionPropertyViewModelComparator><TransitionValueNumberComparator value="{value}"/></TransitionViewModelCondition>'
emit('<StateMachine id="0:7" name="Papu"><StateMachineLayer name="Order journey"><EntryState x="-250" y="0"><StateTransition stateToId="0:70"/></EntryState><AnyState x="-250" y="-200"/><ExitState x="1000" y="-200"/>')
for scene in range(5):
 emit(f'<AnimationState id="0:{70+scene}" animationId="0:{600+scene}" x="{scene*250}" y="0">')
 for other in range(5):
  if scene!=other:emit(f'<StateTransition stateToId="0:{70+other}" duration="220">'+condition(other)+'</StateTransition>')
 emit('</AnimationState>')
emit('</StateMachineLayer>')
for event,value in [('down','true'),('up','false'),('exit','false')]:
 emit(f'<StateMachineListenerSingle targetId="0:25" listenerTypeValue="{event}"><ListenerViewModelChange><BindablePropertyBoolean propertyValue="{value}"><DataBindContext sourcePathIds="0:800-0:803" propertyKey="634" direction="true"/></BindablePropertyBoolean></ListenerViewModelChange></StateMachineListenerSingle>')
def presscondition(value):
 return f'<TransitionViewModelCondition><TransitionPropertyViewModelComparator><BindablePropertyBoolean><DataBindContext sourcePathIds="0:800-0:803" propertyKey="634"/></BindablePropertyBoolean></TransitionPropertyViewModelComparator><TransitionValueBooleanComparator value="{value}"/></TransitionViewModelCondition>'
emit('<StateMachineLayer name="Tactile press"><EntryState x="-200" y="0"><StateTransition stateToId="0:85"/></EntryState><AnyState x="-200" y="-200"/><ExitState x="400" y="-200"/><AnimationState id="0:85" x="0" y="0" animationId="0:610"><StateTransition stateToId="0:86" duration="100">'+presscondition('true')+'</StateTransition></AnimationState><AnimationState id="0:86" x="250" y="0" animationId="0:611"><StateTransition stateToId="0:85" duration="200">'+presscondition('false')+'</StateTransition></AnimationState></StateMachineLayer></StateMachine>')
for id,scale in [(610,1),(611,.94)]:
 emit(anim(id,'Release' if id==610 else 'Press',1,''.join(key(node,'scaleX',[(0,scale)])+key(node,'scaleY',[(0,scale)]) for node in (20,200,300,400))))
def base(scene):
 s=''
 for id,visible in [(20,scene<2),(50,scene==1),(200,scene==2),(300,scene==3),(400,scene==4)]:s+=key(id,'opacity',[(0,int(visible))])
 for i in range(12):s+=key(100+i,'opacity',[(0,0)])
 for id in (30,31,32):s+=key(id,'scaleX',[(0,.75),(90,1.05),(180,.75)])+key(id,'scaleY',[(0,.75),(90,1.05),(180,.75)])
 return s
for scene in range(5):
 s=base(scene);duration=180
 if scene<2:
  s+=key(20,'y',[(0,236),(90,225),(180,236)])+key(20,'rotation',[(0,-.04),(90,.04),(180,-.04)])
  s+=key(51,'y',[(0,110),(135,390),(180,110)])+key(51,'opacity',[(0,0),(15,.9),(130,.9),(145,0),(180,0)])
 if scene==2:
  s+=key(210,'scaleX',[(0,1),(40,1),(50,1.06),(65,1),(100,1),(110,1.06),(125,1),(160,1),(170,1.06),(180,1)])
  for i in range(3):
   start=i*50
   s+=key(220+i,'y',[(0,-160),(start,-160),(start+35,-75),(start+45,0),(start+48,0),(180,0)])+key(220+i,'opacity',[(0,0),(start,0),(start+8,1),(start+34,1),(start+44,0),(180,0)])+key(220+i,'rotation',[(0,-.3),(start+40,.2)])
 if scene==3:
  s+=key(320,'y',[(0,0),(80,-9),(110,-5),(180,0)])+key(320,'rotation',[(0,-.015),(90,.015),(180,-.015)])
  for i in range(3):s+=key(310+i,'y',[(0,-85),(180,-125)])+key(310+i,'opacity',[(0,0),(25+i*15,.65),(100+i*15,.65),(180,0)])
  s+=key(326,'scaleX',[(0,.12),(180,1)])
 if scene==4:
  duration=240
  s+=key(400,'rotation',[(0,-.04),(120,.04),(240,-.04)])+key(400,'y',[(0,250),(120,242),(240,250)])
  s+=key(410,'scaleX',[(0,.2),(22,1.15),(35,1),(240,1)])+key(410,'scaleY',[(0,.2),(22,1.15),(35,1),(240,1)])
  for i in range(12):
   angle=math.pi*2*i/12;x=250+math.cos(angle)*220;y=250+math.sin(angle)*215
   s=s.replace(key(100+i,'opacity',[(0,0)]),'')
   s+=key(100+i,'opacity',[(0,0),(10,1),(45,1),(85,0),(240,0)])+key(100+i,'x',[(0,250),(45,x),(85,x)])+key(100+i,'y',[(0,250),(45,y),(85,y+30)])+key(100+i,'rotation',[(0,0),(85,2+i*.3)])
 emit(anim(600+scene,['Welcome','Scan your table','Mix your cravings','Kitchen rhythm','Pickup moment'][scene],duration,s,'loop'))
emit('</Artboard><ViewModel id="0:800" name="PapuJourney" defaultInstanceId="0:801"><ViewModelPropertyNumber id="0:802" name="scene"/><ViewModelPropertyBoolean id="0:803" name="pressed"/><ViewModelInstance id="0:801" name="Default" exports="true"><ViewModelInstanceNumber viewModelPropertyId="0:802" propertyValue="0"/><ViewModelInstanceBoolean viewModelPropertyId="0:803" propertyValue="false"/></ViewModelInstance></ViewModel><ImageAsset id="0:900" name="Papaya sculpture" file="papaya.png"/></Rive>')
(ROOT/'packages/motion/papupay/scene.rml').write_text('\n'.join(parts))
print('Authored five data-bound journey scenes: scan, basket, cooking and pickup with brand welcome.')
