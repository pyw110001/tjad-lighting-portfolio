"""Original metre-scale reference scenes, authored through official Blender MCP.

Set SCENE_KIND in globals to 'fluid' or 'field', then execute this script via MCP.
All geometry, texture atlases, people and planting are generated here. No external
asset service, model generator, or unlicensed upstream geometry is used.
"""
import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "blender/night-scenes"
PUBLIC = ROOT / "public/assets/light-lab/night/models"
SOURCE.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
KIND = globals().get("SCENE_KIND", "fluid")
rng = random.Random(912 if KIND == "fluid" else 283)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for data in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
    for block in list(data):
        if block.users == 0:
            data.remove(block)
scene = bpy.context.scene
scene.name = "Fluid Pixels" if KIND == "fluid" else "Lumen Field"
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 6
scene.cycles.transparent_max_bounces = 6
try:
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'
    cp.get_devices()
    for device in cp.devices:
        device.use = device.type == 'OPTIX'
    scene.cycles.device = 'GPU'
except Exception:
    pass
scene.render.resolution_x = 1672
scene.render.resolution_y = 940
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.0
world = bpy.data.worlds.new("Navy blue hour")
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.027, .045, .085, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .32
scene.world = world


def mat(name, color, rough=.6, metal=0, emit=0, alpha=1, transmission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, alpha)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Alpha'].default_value = alpha
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['IOR'].default_value = 1.46
    if emit:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        m.surface_render_method = 'DITHERED'
    return m


M = {
    'metal': mat('PBR | graphite anodised metal', (.035,.044,.064), .32,.8),
    'silver': mat('PBR | brushed titanium', (.29,.33,.4),.28,.85),
    'stone': mat('PBR | charcoal granite',(.095,.104,.12),.57,.06),
    'earth': mat('PBR | moist soil',(.012,.016,.012),.94),
    'bark': mat('PBR | warm ash bark',(.12,.088,.055),.87),
    'leaf': mat('PBR | evergreen leaves',(.10,.13,.045),.65),
    'leaf2': mat('PBR | olive leaves',(.18,.19,.07),.7),
    'glass': mat('PBR | clear architectural glass',(.32,.45,.55),.1,.08,alpha=.13),
    'columnGlass': mat('PBR | optical acrylic',(.37,.52,.63),.16,.12,alpha=.10),
    'warm': mat('EMITTER | 2800 K linear light', (1,.57,.22),.36,0,4.5),
    'cold': mat('EMITTER | ice blue',(.46,.74,1),.3,0,3),
    'violet': mat('EMITTER | amethyst',(.69,.16,1),.25,0,3.2),
    'cyan': mat('EMITTER | mint',(.21,1,.81),.25,0,3),
    'lobby': mat('PBR | limestone lobby',(.48,.43,.34),.6),
    'ceiling': mat('PBR | warm bronze soffit',(.22,.17,.11),.38,.32),
    'dark': mat('PBR | dark clothing',(.015,.018,.026),.9),
    'coat': mat('PBR | taupe clothing',(.17,.12,.10),.88),
    'skin': mat('PBR | skin',(.31,.19,.12),.85),
}


class Mesh:
    def __init__(self, name, material):
        self.name, self.mat = name, material
        self.v, self.f, self.uv = [], [], []

    def face(self, points, uv=None):
        n = len(self.v)
        self.v.extend(points)
        self.f.append(tuple(range(n, n+len(points))))
        self.uv.append(uv or [(0,0),(1,0),(1,1),(0,1)][:len(points)])

    def box(self, center, size, angle=0):
        x,y,z = center
        a,b,c = (s/2 for s in size)
        cs,sn = math.cos(angle), math.sin(angle)
        vs = [(x+dx*cs-dy*sn,y+dx*sn+dy*cs,z+dz) for dx,dy,dz in
              [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]]
        for ids in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:
            self.face([vs[i] for i in ids])

    def tube(self, start, end, radius, radius2=None, sides=8):
        start,end = Vector(start),Vector(end)
        axis=(end-start).normalized()
        u=axis.cross(Vector((0,0,1)) if abs(axis.z)<.95 else Vector((0,1,0))).normalized()
        v=axis.cross(u)
        radius2 = radius if radius2 is None else radius2
        lower=[start+(u*math.cos(i*math.tau/sides)+v*math.sin(i*math.tau/sides))*radius for i in range(sides)]
        upper=[end+(u*math.cos(i*math.tau/sides)+v*math.sin(i*math.tau/sides))*radius2 for i in range(sides)]
        for i in range(sides):
            j=(i+1)%sides
            self.face([lower[i],lower[j],upper[j],upper[i]])
        self.face(list(reversed(lower)),[(0,0)]*sides)
        self.face(upper,[(0,0)]*sides)

    def ellipsoid(self, center, scale, rings=7, sides=10):
        x,y,z=center
        for j in range(rings):
            for i in range(sides):
                points=[]
                for jj,ii in [(j,i),(j,i+1),(j+1,i+1),(j+1,i)]:
                    a=ii/sides*math.tau; b=jj/rings*math.pi
                    points.append((x+scale[0]*math.sin(b)*math.cos(a),y+scale[1]*math.sin(b)*math.sin(a),z+scale[2]*math.cos(b)))
                self.face(points)

    def finish(self, smooth=False, extras=None):
        if not self.v:
            return None
        me=bpy.data.meshes.new(self.name)
        me.from_pydata(self.v,[],self.f)
        me.materials.append(self.mat)
        layer=me.uv_layers.new(name='UVMap')
        for polygon,uvs in zip(me.polygons,self.uv):
            for index,uv in zip(polygon.loop_indices,uvs):
                layer.data[index].uv=uv
            polygon.use_smooth=smooth
        ob=bpy.data.objects.new(self.name,me)
        scene.collection.objects.link(ob)
        for k,v in (extras or {}).items():
            ob[k]=v
        return ob


meshes={key:Mesh('STATIC | '+key,value) for key,value in M.items()}
def box(key,center,size,angle=0):
    meshes[key].box(center,size,angle)
def tube(key,a,b,r,r2=None,sides=8):
    meshes[key].tube(a,b,r,r2,sides)


def image(name, pixels, noncolor=False):
    height,width,_=pixels.shape
    im=bpy.data.images.new(name,width=width,height=height,alpha=True)
    im.colorspace_settings.name='Non-Color' if noncolor else 'sRGB'
    im.pixels.foreach_set(pixels.astype(np.float32).ravel())
    im.filepath_raw=str(SOURCE/(name+'.png'))
    im.file_format='PNG'
    im.save()
    im.pack()
    return im


np_rng=np.random.default_rng(1978)
size=1024
noise=np_rng.random((size,size))
rough=np.empty((size,size,4)); rough[:,:,:3]=(.09+noise*.18)[:,:,None];rough[:,:,3]=1
normal=np.ones((size,size,4));normal[:,:,0]=.5+(noise-.5)*.18;normal[:,:,1]=.5+(np.roll(noise,1,axis=0)-.5)*.18;normal[:,:,2]=1
floor=mat('PBR | rain-darkened granite',(.12,.15,.2),.32,.12)
p=floor.node_tree.nodes.get('Principled BSDF')
tex=floor.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image('wet-stone-roughness',rough,True)
floor.node_tree.links.new(tex.outputs['Color'],p.inputs['Roughness'])
ntex=floor.node_tree.nodes.new('ShaderNodeTexImage');ntex.image=image('wet-stone-normal',normal,True)
nnode=floor.node_tree.nodes.new('ShaderNodeNormalMap');nnode.inputs['Strength'].default_value=.32
floor.node_tree.links.new(ntex.outputs['Color'],nnode.inputs['Color']);floor.node_tree.links.new(nnode.outputs['Normal'],p.inputs['Normal'])
ground=Mesh('GROUND_WET',floor)
ground.face([(-95,-75,-.025),(95,-75,-.025),(95,95,-.025),(-95,95,-.025)],[(0,0),(32,0),(32,32),(0,32)])
ground.finish(extras={'role':'wet-ground'})
# A self-authored equirectangular sky exports with the scene, including clouds.
yy,xx=np.mgrid[0:512,0:1024];horizon=np.clip(1-np.abs(yy/512-.5)*2,0,1)
cloud=np.zeros_like(horizon)
for freq,amp in [(1,.5),(3,.22),(8,.12),(19,.05)]:
    cloud+=amp*np.sin(xx/1024*math.tau*freq+np.cos(yy/512*freq*5)+freq)*np.cos(yy/512*freq*9+.8)
sky=np.ones((512,1024,4))
for c,(lo,hi) in enumerate([(.028,.12),(.045,.17),(.085,.26)]):
    sky[:,:,c]=np.clip(lo+(hi-lo)*horizon+cloud*.035*horizon,0,1)
skyimage=image('blue-hour-cloud-sky',sky)
skymat=mat('SKY | baked blue hour',(.05,.08,.14),1,0,1)
sp=skymat.node_tree.nodes.get('Principled BSDF');sp.inputs['Base Color'].default_value=(0,0,0,1)
st=skymat.node_tree.nodes.new('ShaderNodeTexImage');st.image=skyimage
skymat.node_tree.links.new(st.outputs['Color'],sp.inputs['Emission Color'])
skymat.use_backface_culling=False
skygeom=Mesh('SKY_DOME',skymat)
for j in range(24):
    for i in range(64):
        pts=[];uv=[]
        for ii,jj in [(i+1,j),(i,j),(i,j+1),(i+1,j+1)]:
            a=ii/64*math.tau;b=jj/24*math.pi
            pts.append((190*math.sin(b)*math.cos(a),190*math.sin(b)*math.sin(a),190*math.cos(b)))
            uv.append((ii/64,1-jj/24))
        skygeom.face(pts,uv)
skygeom.finish(extras={'role':'sky'})
worldtex=world.node_tree.nodes.new('ShaderNodeTexEnvironment');worldtex.image=skyimage
world.node_tree.links.new(worldtex.outputs['Color'],world.node_tree.nodes['Background'].inputs['Color'])
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
for x in range(-60,63,3): box('metal',(x,0,.001),(.012,110,.008))
for y in range(-54,69,3): box('metal',(0,y,.001),(126,.012,.008))


def area(name,loc,target,color,power,size):
    data=bpy.data.lights.new(name,'AREA');data.color=color;data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    obj['webLight']=True
    return obj


def person(x,y,seed=0,scale=1):
    r=random.Random(seed)
    angle=r.uniform(-.7,.7)
    s=scale
    def pos(a,b,h):
        return (x+s*(a*math.cos(angle)-b*math.sin(angle)),y+s*(a*math.sin(angle)+b*math.cos(angle)),s*h)
    clothes=meshes['coat' if seed%4==0 else 'dark']
    clothes.ellipsoid(pos(0,0,1.15),(.20*s,.12*s,.34*s))
    meshes['skin'].ellipsoid(pos(0,0,1.62),(.105*s,.10*s,.14*s))
    meshes['dark'].ellipsoid(pos(0,.025,1.69),(.11*s,.095*s,.085*s))
    stride=.15 if seed%3==0 else .025
    for sign in [-1,1]:
        hip=pos(sign*.09,0,.9);knee=pos(sign*.11,sign*stride,.47);foot=pos(sign*.12,sign*stride*.9,.075)
        clothes.tube(hip,knee,.09*s,.065*s);clothes.tube(knee,foot,.065*s,.048*s)
        meshes['dark'].ellipsoid(pos(sign*.12,sign*stride*.9-.04,.065),(.072*s,.15*s,.065*s),4,8)
        shoulder=pos(sign*.21,0,1.4);elbow=pos(sign*.28,-sign*stride*.6,1.05);hand=pos(sign*.29,-sign*stride,.84)
        clothes.tube(shoulder,elbow,.07*s,.055*s);clothes.tube(elbow,hand,.055*s,.04*s)
        meshes['skin'].ellipsoid(hand,(.04*s,.04*s,.065*s),4,6)


def tree(x,y,h,seed):
    r=random.Random(seed)
    tube('bark',(x,y,.15),(x+.08,y,h*.58),.17,.085,10)
    for branch in range(14):
        a=branch*2.4+r.random();rad=h*r.uniform(.24,.41)
        start=(x,y,h*r.uniform(.3,.58));end=(x+math.cos(a)*rad,y+math.sin(a)*rad,h*r.uniform(.62,.91))
        tube('bark',start,end,.058,.016,6)
        mid=Vector(end)
        for i in range(150):
            phi=r.random()*math.tau; rr=math.sqrt(r.random())*h*.21
            cx=mid.x+math.cos(phi)*rr;cy=mid.y+math.sin(phi)*rr;cz=mid.z+r.uniform(-.6,.65)
            a=r.random()*math.tau;length=r.uniform(.11,.22);w=length*.47
            u=Vector((math.cos(a)*length,math.sin(a)*length,r.uniform(-.03,.05)))
            u.z=r.uniform(-.7,.7)*length
            v=u.cross(Vector((r.uniform(-1,1),r.uniform(-1,1),r.uniform(-1,1)))).normalized()*w
            c=Vector((cx,cy,cz))
            meshes['leaf' if i%3 else 'leaf2'].face([c-u,c-v,c+u,c+v])
    area('Landscape uplight',(x-.65,y-.65,.18),(x,y,h*.7),(1,.66,.31),300,1.3)


def planter(x,y,w,d,seed):
    box('stone',(x,y,.19),(w,d,.38))
    box('earth',(x,y,.395),(w-.25,d-.25,.025))
    for sign in [-1,1]:
        box('warm',(x,y+sign*(d/2+.006),.24),(w,.025,.025))
    r=random.Random(seed)
    for i in range(int(w*d*8)):
        xx=x+r.uniform(-w/2+.16,w/2-.16);yy=y+r.uniform(-d/2+.16,d/2-.16)
        meshes['leaf'].ellipsoid((xx,yy,.51),(.20,.18,r.uniform(.12,.25)),3,5)


# Original emissive window atlases; far towers share four materials.
citym=[]
for k in range(4):
    data=np.zeros((512,256,4));data[:,:,:3]=(.008,.015,.03);data[:,:,3]=1
    for yy in range(8,504,13):
        for xx in range(5,251,13):
            if rng.random()<.65: continue
            c=np.array([1,.82,.62]) if rng.random()<.87 else np.array([.28,.47,.7])
            data[yy:yy+7,xx:xx+5,:3]=c*rng.uniform(.3,.85)
    m=mat('CITY | windows '+str(k),(.025,.04,.07),.5,.25)
    t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image('city-windows-'+str(k),data)
    pp=m.node_tree.nodes.get('Principled BSDF')
    m.node_tree.links.new(t.outputs['Color'],pp.inputs['Base Color']);m.node_tree.links.new(t.outputs['Color'],pp.inputs['Emission Color']);pp.inputs['Emission Strength'].default_value=.6
    citym.append(Mesh('CITY | tower atlas '+str(k),m))
for i in range(23):
    x=-95+i*8.8+rng.uniform(-1,1);y=65+rng.uniform(0,25)
    h=rng.uniform(16,56);w=rng.uniform(4.0,7);d=rng.uniform(4.5,8)
    if KIND=='fluid':
        y+=15
        if abs(x*.906+y*.423)<29:h=rng.uniform(10,18)
    else:
        h*=.36+.52*i/22
    citym[i%4].box((x,y,h/2),(w,d,h))
    box('metal',(x,y,h+.22),(w+.25,d+.25,.45))
    if i%3==0:
        box('warm',(x,y-d/2-.015,h-1.4),(w,.025,.06))
        box('warm',(x-w/2-.01,y,h-1.4),(.025,d,.06))
        box('warm',(x+w/2+.01,y,h-1.4),(.025,d,.06))
for m in citym:m.finish()


if KIND=='fluid':
    rx,ry=22,9
    def top(a):return 13.1+2.3*math.cos(a)+1.6*math.sin(2*a+.5)
    def bottom(a):return 5.3-math.cos(2*a)+.35*math.cos(a)
    def envelope(name, material, low, high, rrx=rx,rry=ry,segments=240,rows=24,role=None):
        m=Mesh(name,material)
        for j in range(rows):
            for i in range(segments):
                points=[];uv=[]
                # Front half runs from left to right: a=pi to 2pi.
                for ii,jj in [(i,j),(i+1,j),(i+1,j+1),(i,j+1)]:
                    a=ii/segments*math.tau;v=jj/rows
                    points.append((rrx*math.cos(a),rry*math.sin(a),low(a)+(high(a)-low(a))*v))
                    uv.append((ii/segments,v))
                m.face(points,uv)
        return m.finish(True,{'role':role} if role else None)
    base=mat('PBR | black ceramic LED carrier',(.009,.014,.023),.3,.34)
    envelope('FACADE_CARRIER',base,bottom,top)
    display=mat('EMITTER | blue-white media preview',(.38,.66,1),.28,0,2)
    host=envelope('MEDIA_FACADE',display,bottom,top,rx+.025,ry+.025,240,28,'display-facade')
    host['mediaAspect']=8.0;host['gridColumns']=165;host['gridRows']=30
    # Physical lenses and recessed housings, one merged mesh for each material.
    housing=Mesh('LED | recessed graphite housings',M['metal'])
    lensm=[Mesh('LED_PREVIEW | wave '+str(k),mat('EMITTER | facade wave '+str(k),(.42,.68,1),.25,.05,k*.45)) for k in range(5)]
    for i in range(330):
        a=i/330*math.tau
        for j in range(30):
            v=(j+.5)/30;z=bottom(a)+(top(a)-bottom(a))*v
            normal=Vector((math.cos(a)/rx,math.sin(a)/ry,0)).normalized()
            center=Vector((rx*math.cos(a),ry*math.sin(a),z))
            tangent=Vector((-normal.y,normal.x,0));up=Vector((0,0,1))
            r=.113
            for k in range(8):
                p=[]
                for kk,rr in [(k,r),(k+1,r),(k+1,r*.71),(k,r*.71)]:
                    theta=kk/8*math.tau;p.append(center+normal*.03+tangent*math.cos(theta)*rr+up*math.sin(theta)*rr)
                housing.face(p)
            wave=math.sin(i*.064+j*.26)+.5*math.cos(i*.13-j*.27)
            idx=max(0,min(4,round((wave+.8)*2)))
            points=[center+normal*.045]+[center+normal*.047+(tangent*math.cos(k/10*math.tau)+up*math.sin(k/10*math.tau))*.074 for k in range(10)]
            lensm[idx].face(points,[(0,0)]*11)
    housing.finish()
    for l in lensm:l.finish()
    # Preview lenses are hidden by the runtime in favour of the continuous UV display.
    host.hide_render=True
    for i in range(240):
        a=i/240*math.tau;b=(i+1)/240*math.tau
        for fn in [top,bottom]:
            tube('silver',(rx*math.cos(a),ry*math.sin(a),fn(a)),(rx*math.cos(b),ry*math.sin(b),fn(b)),.065,sides=6)
        outer=(rx*math.cos(a),ry*math.sin(a),bottom(a)-.04)
        outerb=(rx*math.cos(b),ry*math.sin(b),bottom(b)-.04)
        inner=((rx-1.9)*math.cos(a),(ry-1.9)*math.sin(a),bottom(a)-.22)
        innerb=((rx-1.9)*math.cos(b),(ry-1.9)*math.sin(b),bottom(b)-.22)
        meshes['ceiling'].face([inner,innerb,outerb,outer])
    roof=Mesh('ROOF | folded standing seam',M['metal'])
    for i in range(240):
        a=i/240*math.tau;b=(i+1)/240*math.tau
        roof.face([(0,0,12),(rx*math.cos(a),ry*math.sin(a),top(a)),(rx*math.cos(b),ry*math.sin(b),top(b))],[(.5,.5),(0,0),(1,0)])
    roof.finish()
    envelope('GLASS | lobby enclosure',M['glass'],lambda a:.15,lambda a:bottom(a)-.18,rx-1.4,ry-1.4,120,1)
    for i in range(100):
        a=i/100*math.tau;x=(rx-1.4)*math.cos(a);y=(ry-1.4)*math.sin(a);h=bottom(a)-.15
        box('metal',(x,y,h/2),(.055,.065,h),a)
        if i%10==0:box('lobby',(x*.74,y*.7,2.65),(.25,.25,5.3))
    box('lobby',(0,0,.07),(38,12,.12))
    box('lobby',(0,4.2,2.3),(34,.18,4.5))
    box('ceiling',(0,0,5),(35,10,.12))
    box('ceiling',(0,1.7,2.85),(35,5.0,.12))
    for x in range(-16,18,4):
        box('warm',(x,-1.4,4.9),(2.6,.07,.04))
        box('warm',(x,3.9,2.2),(.035,.04,4.2))
        box('coat',(x,1,.45),(2.5,.8,.5))
        box('silver',(x,-.8,3.3),(.025,.025,.9))
        box('glass',(x,-.8,3.3),(3.9,.02,.85))
        area('Lobby warm wash',(x,-1,4.75),(x,-1,0),(1,.72,.43),420,3)
    for i in range(16):person(rng.uniform(-17,17),rng.uniform(-5,2),100+i,.96)
    for i in range(21):person(rng.uniform(-23,25),rng.uniform(-19,-10),300+i,rng.uniform(.94,1.08))
    person(-20,-26,404,1.06)
    for i in range(10):
        x=-19+i*3.4;y=-15-(i%3)*2.8
        for j in range(84):
            a=j/84*math.tau;b=(j+1)/84*math.tau
            tube('cold',(x+math.cos(a)*.94,y+math.sin(a)*.94,.018),(x+math.cos(b)*.94,y+math.sin(b)*.94,.018),.016,sides=5)
    plants=[(-28,-7,6,3),(27,-8,11,4),(-28,12,7,3),(29,10,6,4),(31,-23,12,3),(-27,-28,11,4)]
    for i,(x,y,w,d) in enumerate(plants):planter(x,y,w,d,610+i);tree(x,y,7.5 if i<4 else 5.3,710+i)
    for i in range(8):tree(-48+i*14,20,8.5,810+i)
    tree(-12,-27,13.5,1729);tree(37,-8,9,1730)
    camera_loc=(28,-61,3.2);camera_target=(0,-1,7.0);lens=42
else:
    columns=[]
    colors=['violet','cyan','warm','violet','cyan']
    column_materials={}
    for key,c in [('violet',(.7,.22,1)),('cyan',(.22,1,.8)),('warm',(1,.64,.3))]:
        ramp=np.ones((128,4,4));ramp[:,:,:3]=c
        ramp[82:,:,:3]=(.002,.003,.006);ramp[82:,:,3]=.025
        im=image('column-preview-'+key,ramp)
        cm=mat('COLUMN_PREVIEW | '+key,c,.2,0,3,alpha=.99)
        pp=cm.node_tree.nodes.get('Principled BSDF');t=cm.node_tree.nodes.new('ShaderNodeTexImage');t.image=im
        cm.node_tree.links.new(t.outputs['Color'],pp.inputs['Base Color']);cm.node_tree.links.new(t.outputs['Color'],pp.inputs['Emission Color']);cm.node_tree.links.new(t.outputs['Alpha'],pp.inputs['Alpha'])
        column_materials[key]=cm
    shell=Mesh('COLUMN_SHELLS',M['columnGlass'])
    frames=meshes['silver']
    for row in range(7):
        for col in range(8):
            x=-20+col*3.5+rng.uniform(-.3,.3);y=-7+row*3.1+rng.uniform(-.3,.3)
            h=rng.uniform(2.3,7.0)
            if col in (3,4) and row in (1,2,3):h+=3.1
            if row==0:h*=.65
            if col==3 and row==2:h=14.2
            elif col==4 and row==3:h=12.4
            else:h*=1.12
            key=colors[(row*3+col)%len(colors)]
            box('stone',(x,y,.07),(.52,.52,.14))
            shell.box((x,y,h/2+.14),(.27,.27,h))
            for sx in [-1,1]:
                for sy in [-1,1]:tube('silver',(x+sx*.137,y+sy*.137,.15),(x+sx*.137,y+sy*.137,h+.14),.008,sides=4)
            box('silver',(x,y,h+.145),(.29,.29,.025))
            emitter=Mesh('COLUMN_EMITTER_'+str(len(columns)).zfill(3),column_materials[key])
            emitter.box((0,0,h/2),(.175,.175,h))
            ob=emitter.finish(extras={'role':'column-emitter','height':h,'phase':rng.random()*math.tau,'palette':(row*3+col)%5})
            ob.location=(x,y,.16)
            columns.append([x,y,h])
            if (row+col)%9==0:area('Column pool',(x,y,1.2),(x+.2,y,0),{'violet':(.69,.21,1),'cyan':(.25,1,.8),'warm':(1,.62,.3)}[key],28,2.3)
    shell.finish()
    for row in range(7):
        for i in range(102):box('warm',(-24+i*.45,-9+row*3.8,.012),(.045,.045,.018))
    for col in range(8):
        for i in range(86):box('warm',(-22+col*4.2,-12+i*.4,.012),(.045,.045,.018))
    # Glass pavilion to the right, with a suspended interactive display.
    px,py=17,8;w,d=10,7
    box('stone',(px,py,.12),(w,d,.24));box('metal',(px,py,4.7),(w+.65,d+.65,.3))
    kiosk_bake=Mesh('KIOSK_BAKE',mat('PBR | kiosk interior lining',(.08,.065,.055),.7))
    kiosk_bake.box((px,py,.255),(w-.2,d-.2,.035))
    kiosk_bake.box((px,py+3.15,2.25),(8.1,.08,4.15))
    kiosk_bake.finish(extras={'role':'baked-static'})
    for x in [px-w/2,px+w/2]:
        for y in [py-d/2,py+d/2]:box('metal',(x,y,2.4),(.065,.065,4.6))
        box('glass',(x,py,2.4),(.025,d,4.6))
        box('warm',(x,py,4.5),(.025,d,.028));box('warm',(x,py,.26),(.028,d,.025))
    for y in [py-d/2,py+d/2]:
        box('glass',(px,y,2.4),(w,.025,4.6))
        box('warm',(px,y,4.5),(w,.025,.028));box('warm',(px,y,.26),(w,.025,.028))
    screen=np.zeros((512,768,4));screen[:,:,:3]=(.009,.012,.035);screen[:,:,3]=1
    rr=np.random.default_rng(88)
    for i in range(3800):
        a=rr.random()*math.tau;r=rr.random()**.5
        xx=int(440+math.cos(a)*r*190);yy=int(250+math.sin(a)*r*210)
        if 0<xx<768 and 0<yy<512:screen[yy:yy+2,xx:xx+2,:3]=(.3,.6,1)
    for yy in range(75,420):
        x=int(180+18*math.sin(yy*.04));screen[yy,x:x+2,:3]=(.6,.4,1)
    disp=mat('EMITTER | interactive pavilion display',(.5,.5,1),.3,0,1.5)
    pp=disp.node_tree.nodes.get('Principled BSDF');t=disp.node_tree.nodes.new('ShaderNodeTexImage');t.image=image('interactive-display',screen)
    disp.node_tree.links.new(t.outputs['Color'],pp.inputs['Base Color']);disp.node_tree.links.new(t.outputs['Color'],pp.inputs['Emission Color'])
    screenmesh=Mesh('KIOSK_DISPLAY',disp)
    screenmesh.face([(px-3.8,py+2.9,.5),(px+3.8,py+2.9,.5),(px+3.8,py+2.9,4.1),(px-3.8,py+2.9,4.1)])
    screenmesh.finish()
    box('metal',(px-1,py-1,.6),(1.4,.9,1.2));box('cyan',(px-1,py-1,1.22),(1.25,.75,.03))
    area('Kiosk warm',(px,py,4.3),(px,py,0),(1,.55,.24),240,4)
    area('Kiosk screen',(px,py+2.7,2),(px,py-2,1),(.4,.32,1),60,3)
    person(15,3,110);person(21,3.7,111);person(26,-5,112,1.05)
    person(-10,-13,132,1.04);person(2,-15,136,1.03)
    for i in range(19):person(rng.uniform(-24,8),rng.uniform(-5,23),450+i,rng.uniform(.88,1.05))
    plants=[(-25,-16,10,3),(31,-10,10,3),(-30,8,6,3),(29,15,7,4),(-29,24,6,3),(13,22,13,3)]
    for i,(x,y,w,d) in enumerate(plants):planter(x,y,w,d,600+i);tree(x,y,8.5,700+i)
    for i in range(11):tree(-50+i*9,30,8.5,810+i)
    planter(-8,-26,10,3,1718);tree(-12,-25,13.5,1729)
    moon=Mesh('SKY_MOON',mat('EMITTER | distant moon',(1,.86,.6),.8,0,1.8))
    moon.ellipsoid((-46,91,49),(.58,.58,.58),8,12);moon.finish(True)
    camera_loc=(21,-43,2.5);camera_target=(1,4,5.0);lens=38

# Shared static groups already batch by material; retain role meshes separately.
for key,m in meshes.items():m.finish(smooth=key in ['bark','leaf','leaf2','skin','dark','coat'])
area('Blue hour softbox',(-30,-10,45),(0,0,0),(.28,.45,1),5000,65)
area('Warm city fill',(15,-25,18),(0,4,0),(1,.68,.4),2000,35)
camera_data=bpy.data.cameras.new('CAM_REFERENCE')
camera=bpy.data.objects.new('CAM_REFERENCE',camera_data);scene.collection.objects.link(camera)
camera.location=camera_loc;camera.rotation_euler=(Vector(camera_target)-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.lens=lens;camera_data.clip_end=400;camera_data.clip_start=.1
camera['target']=list(camera_target);camera['role']='reference-camera';scene.camera=camera
scene['sceneId']=KIND;scene['referenceScale']='Human height approximately 1.7 m; inferred proportions'
scene['assetProvenance']='Original procedural geometry and textures; scripts/build-night-scenes.py'
scene['webCameraTarget']=list(camera_target)
scene['webCameraAzimuthLimit']=.10;scene['webCameraPolarLimit']=.045
scene.render.filepath=str(SOURCE/(KIND+'-blender.png'))
# Viewport starts at the authored camera, with material colours and studio light.
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(KIND+'.blend')))
result={'scene':KIND,'objects':len(scene.objects),'blend':str(SOURCE/(KIND+'.blend')),
        'triangles':sum(len(p.vertices)-2 for ob in scene.objects if ob.type=='MESH' for p in ob.data.polygons)}
print(json.dumps(result))
