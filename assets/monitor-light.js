import {WebGLRenderer, Scene, OrthographicCamera, BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, Vector2} from './vendor/three.module.min.js';

export function light(stage,hero,reduce,layout) {
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,powerPreference:'low-power'});
  if(!gl || reduce.matches)return;
  const renderer=new WebGLRenderer({canvas,context:gl,alpha:true,antialias:false});
  renderer.setClearColor(0,0);
  renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.25:1.5));
  canvas.setAttribute('aria-hidden','true');stage.append(canvas);
  const model=new Scene(),camera=new OrthographicCamera(-1,1,1,-1,.1,10);
  camera.position.z=2;
  const geometry=new BufferGeometry(),values=[];
  for(let i=0;i<28;i++)values.push(Math.random(),Math.random(),Math.random());
  geometry.setAttribute('position',new Float32BufferAttribute(values,3));
  const uniforms={clock:{value:0},center:{value:new Vector2()},spread:{value:new Vector2()}};
  const material=new ShaderMaterial({transparent:true,depthWrite:false,uniforms,
    vertexShader:`
      uniform float clock;uniform vec2 center;uniform vec2 spread;varying float alpha;
      void main(){float phase=position.z*6.283;vec2 drift=vec2(sin(clock*0.12+phase),cos(clock*0.09+phase))*0.05;
      vec2 xy=center+(position.xy-0.5+drift)*spread;alpha=0.08+0.20*position.z;
      gl_Position=vec4(xy,0.0,1.0);gl_PointSize=1.3+1.7*position.z;}`,
    fragmentShader:`varying float alpha;void main(){float d=distance(gl_PointCoord,vec2(0.5));gl_FragColor=vec4(0.63,0.84,1.0,alpha*(1.0-smoothstep(0.0,0.5,d)));}`
  });
  const dust=new Points(geometry,material);dust.frustumCulled=false;model.add(dust);
  function resize(){
    const {corners,w,h}=layout();if(!corners || !w || !h)return;
    const [[x,y],[r],[,b]]=corners;
    renderer.setSize(w,h,false);
    uniforms.center.value.set((x+r)/w-1,1-(y+b)/h);
    uniforms.spread.value.set((r-x)/w*2.3,(b-y)/h*2.4);
  }
  let frame=0,inView=false,previous=0,elapsed=0;
  function tick(now){
    if(now-previous>=48){elapsed+=Math.min(80,now-previous);previous=now;uniforms.clock.value=elapsed/1000;renderer.render(model,camera)}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;
    canvas.hidden=reduce.matches;
    if(inView && !document.hidden && !reduce.matches){previous=performance.now();frame=requestAnimationFrame(tick)}
  }
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;sync()}).observe(hero);
  hero.addEventListener('desk-layout',resize);document.addEventListener('visibilitychange',sync);
  reduce.addEventListener('change',sync);canvas.addEventListener('webglcontextlost',()=>{cancelAnimationFrame(frame);canvas.remove()},{once:true});
  resize();
}
