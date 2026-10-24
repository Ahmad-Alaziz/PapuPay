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
# First child paints on top. All illustrations are asset-local and transparent.
emit('<Rive version="1" kind="fragment"><Artboard id="0:2" name="Papu" width="500" height="500" styleId="0:3" defaultStateMachineId="0:7"><LayoutComponentStyle id="0:3"/>')
emit(shape(25,'Interaction surface',250,250,'<Rectangle width="420" height="440" cornerRadiusTL="100"/>','01173C2B'))
# Celebration confetti, with a restrained papaya/leaf palette.
for i in range(14):
 geom='<Star width="16" height="16" points="4" innerRadius="0.22"/>' if i%3==0 else '<Rectangle width="7" height="15" cornerRadiusTL="3"/>'
 emit(shape(100+i,f'Petal {i+1}',250,250,geom,['FFFF8848','FF2B744B','FFFFC66B'][i%3],0))
# A tactile ready seal, its tick draws via a reveal scale.
emit('<Node id="0:40" name="Ready seal" x="377" y="350" scaleX="0" scaleY="0">')
emit('<Shape name="Tick"><PointsPath><StraightVertex x="-13" y="0"/><StraightVertex x="-3" y="10"/><StraightVertex x="16" y="-12"/></PointsPath><Stroke thickness="5" cap="round"><SolidColor colorValue="FFFFF2D6"/></Stroke></Shape>')
emit(shape(41,'Seal',0,0,'<Ellipse width="65" height="65"/>','FF2B744B'))
emit('</Node>')
# Scanner frame and beam are distinct, timed parts of the scan interaction.
emit('<Node id="0:50" name="Scan frame" opacity="0">')
for i,(x,y,sx,sy) in enumerate([(88,85,1,1),(412,85,-1,1),(88,407,1,-1),(412,407,-1,-1)]):
 emit(f'<Shape name="Corner {i}" x="{x}" y="{y}" scaleX="{sx}" scaleY="{sy}"><PointsPath><StraightVertex x="0" y="31"/><StraightVertex x="0" y="0" radius="12"/><StraightVertex x="31" y="0"/></PointsPath><Stroke thickness="4" cap="round"><SolidColor colorValue="FF2B744B"/></Stroke></Shape>')
emit('</Node>')
emit('<Shape id="0:51" name="Scan beam" x="250" y="110" opacity="0"><Rectangle width="300" height="3" cornerRadiusTL="1.5"/><Fill><LinearGradient startX="-150" endX="150"><GradientStop colorValue="002B744B" position="0"/><GradientStop colorValue="FF2B744B" position="0.5"/><GradientStop colorValue="002B744B" position="1"/></LinearGradient></Fill></Shape>')
# The brand's dimensional image, not a generic flat mascot.
emit('<Node id="0:20" name="Papaya motion" x="250" y="237"><Image id="0:21" name="Sculpted papaya" assetId="0:900" scaleX="0.67" scaleY="0.67"/></Node>')
for id,x,y,s,color in [(30,88,175,22,'FFFF8848'),(31,400,290,16,'FF2B744B'),(32,346,78,14,'FFFFC66B')]:
 emit(shape(id,'Twinkle',x,y,f'<Star width="{s}" height="{s}" points="4" innerRadius="0.18"/>',color,.7))
emit('<Shape id="0:22" name="Soft landing shadow" x="250" y="432" scaleY="0.14" opacity="0.25"><Ellipse width="230" height="230"/><Fill><RadialGradient startX="0" startY="0" endX="115" endY="0"><GradientStop colorValue="50173C2B" position="0"/><GradientStop colorValue="00173C2B" position="1"/></RadialGradient></Fill></Shape>')
emit('<Shape id="0:23" name="Quiet orbit" x="250" y="244"><Ellipse width="365" height="365"/><Stroke thickness="1.1"><SolidColor colorValue="44B1C29A"/></Stroke></Shape>')
# Inputs retained intentionally for the pinned stable iOS runtime and React API.
emit('''<StateMachine id="0:7" name="Papu">
<StateMachineTrigger id="0:60" name="Celebrate"/><StateMachineTrigger id="0:61" name="Scan"/><StateMachineBool id="0:62" name="Hover"/>
<StateMachineListenerSingle targetId="0:25" listenerTypeValue="click" name="Tap for delight"><ListenerTriggerChange inputId="0:60"/></StateMachineListenerSingle>
<StateMachineListenerSingle targetId="0:25" listenerTypeValue="enter" name="Notice pointer"><ListenerBoolChange inputId="0:62" value="true"/></StateMachineListenerSingle>
<StateMachineListenerSingle targetId="0:25" listenerTypeValue="exit" name="Rest"><ListenerBoolChange inputId="0:62" value="false"/></StateMachineListenerSingle>
<StateMachineLayer name="Papaya choreography">
<EntryState x="0" y="0"><StateTransition stateToId="0:71"/></EntryState>
<AnyState x="0" y="-220"><StateTransition stateToId="0:73" duration="80"><TransitionTriggerCondition inputId="0:60"/></StateTransition><StateTransition stateToId="0:74" duration="80"><TransitionTriggerCondition inputId="0:61"/></StateTransition></AnyState>
<ExitState x="700" y="-220"/>
<AnimationState id="0:71" x="220" y="0" animationId="0:200"><StateTransition stateToId="0:72" duration="180"><TransitionBoolCondition inputId="0:62" opValue="equal"/></StateTransition></AnimationState>
<AnimationState id="0:72" x="220" y="210" animationId="0:201"><StateTransition stateToId="0:71" duration="250"><TransitionBoolCondition inputId="0:62" opValue="notEqual"/></StateTransition></AnimationState>
<AnimationState id="0:73" x="470" y="-110" animationId="0:202" reset="true"><StateTransition stateToId="0:71" duration="250" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/></AnimationState>
<AnimationState id="0:74" x="470" y="210" animationId="0:203" reset="true"><StateTransition stateToId="0:73" duration="120" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/></AnimationState>
</StateMachineLayer></StateMachine>''')
def rest(duration):
 s=key(40,'scaleX',[(0,0),(duration,0)])+key(40,'scaleY',[(0,0),(duration,0)])+key(50,'opacity',[(0,0)])+key(51,'opacity',[(0,0)])
 for i in range(14):s+=key(100+i,'opacity',[(0,0)])
 return s
idle=key(20,'y',[(0,237),(120,230),(240,237)],(.42,0,.58,1))+key(20,'rotation',[(0,-.025),(120,.025),(240,-.025)],(.42,0,.58,1))+key(20,'scaleX',[(0,1)])+key(20,'scaleY',[(0,1)])+key(22,'scaleX',[(0,1),(120,.86),(240,1)])+rest(240)
for id,offset in [(30,0),(31,35),(32,75)]:
 idle+=key(id,'scaleX',[(0,.7),(60+offset,1.1),(160+offset,.7),(240,.7)])+key(id,'scaleY',[(0,.7),(60+offset,1.1),(160+offset,.7),(240,.7)])
emit(anim(200,'Breathe',240,idle,'loop'))
hover=key(20,'y',[(0,228),(90,223),(180,228)])+key(20,'rotation',[(0,-.055),(90,-.025),(180,-.055)])+key(20,'scaleX',[(0,1.055)])+key(20,'scaleY',[(0,1.055)])+rest(180)
emit(anim(201,'Lean in',180,hover,'loop'))
celebrate=key(20,'y',[(0,237),(8,248),(20,201),(34,240),(46,225),(65,237),(100,237)])+key(20,'rotation',[(0,0),(8,.06),(20,-.14),(34,.07),(48,-.035),(65,0)])+key(20,'scaleX',[(0,1),(8,1.10),(20,.95),(34,1.045),(65,1)])+key(20,'scaleY',[(0,1),(8,.90),(20,1.075),(34,.96),(65,1)])+key(40,'scaleX',[(0,0),(25,0),(39,1.15),(50,1),(85,1),(100,0)])+key(40,'scaleY',[(0,0),(25,0),(39,1.15),(50,1),(85,1),(100,0)])+key(50,'opacity',[(0,0)])+key(51,'opacity',[(0,0)])
for i in range(14):
 angle=2*math.pi*i/14;dist=190+(i%3)*18;x=250+math.cos(angle)*dist;y=240+math.sin(angle)*dist
 celebrate+=key(100+i,'x',[(0,250),(13,250),(43,x),(85,x+math.cos(angle)*15)])+key(100+i,'y',[(0,240),(13,240),(43,y),(85,y+28)])+key(100+i,'opacity',[(0,0),(12,0),(15,1),(50,1),(82,0)])+key(100+i,'rotation',[(0,0),(85,2.5+i*.2)])+key(100+i,'scaleX',[(0,.3),(23,1),(85,.4)])+key(100+i,'scaleY',[(0,.3),(23,1),(85,.4)])
emit(anim(202,'Made your day',100,celebrate))
scan=rest(110).replace(key(50,'opacity',[(0,0)]),'').replace(key(51,'opacity',[(0,0)]),'')
scan+=key(20,'rotation',[(0,0),(110,0)])+key(20,'y',[(0,237)])+key(20,'scaleX',[(0,1),(20,.96),(95,.96),(110,1)])+key(20,'scaleY',[(0,1),(20,.96),(95,.96),(110,1)])+key(50,'opacity',[(0,0),(12,1),(90,1),(110,0)])+key(51,'opacity',[(0,0),(12,1),(85,1),(100,0)])+key(51,'y',[(0,105),(12,105),(85,395),(110,395)],(.3,0,.7,1))
emit(anim(203,'Little scan big yum',110,scan))
emit('</Artboard><ImageAsset id="0:900" name="Papaya sculpture" file="papaya.png"/></Rive>')
(ROOT/'packages/motion/papupay/scene.rml').write_text('\n'.join(parts))
print('Authored Papu: 4 timelines, 3 inputs, pointer listeners, 14 celebration particles.')
