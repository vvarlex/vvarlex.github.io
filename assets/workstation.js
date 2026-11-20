(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const root = document.documentElement;
  const hero = $('#hero'), stage = $('.workstation'), photo = $('#desk-photo');
  const face = $('.monitor-face'), screenLink = $('.monitor-link');
  const grid = $('#rl-grid'), menu = $('#menu'), links = $('#nl');
  const labs = [...window.OXWARLEX_RESEARCH_DATA.articles].sort((a,b)=>b.order-a.order);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(max-aspect-ratio: 4/5)');
  const shapes = {
    wide: {size:[1672,941], screen:[[.381,.246],[.821,.235],[.819,.577],[.381,.565]], mark:[.604,.596], terminal:[.302,.466], analysis:[.921,.422], hardware:[.925,.706]},
    tall: {size:[872,1550], screen:[[.324,.316],[.782,.315],[.782,.434],[.324,.432]], mark:[.556,.441], terminal:[.233,.395], analysis:[.897,.378], hardware:[.904,.483]}
  };
  let corners, active, visible = true, camera = null, plate = null, userTilt = false;
  root.classList.add('desk-js');

  function setMenu(open) {
    links.classList.toggle('open',open);
    menu.setAttribute('aria-expanded', String(open));
  }
  menu.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  document.addEventListener('click', e => {
    if (!e.target.closest('.site-head,#thp') || e.target.closest('#nl a,#music-open')) setMenu(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#soundtrack[open]') && links.classList.contains('open') && !$('#thp.open')) {
      setMenu(false); menu.focus();
    }
  });

  function choose(id, remember = true) {
    const record = labs.find(a => a.id === id);
    if (!record) return;
    active = id;
    grid.querySelectorAll('.lab-row').forEach(row => row.classList.toggle('selected', row.dataset.open === id));
    $('#preview-title').textContent = record.title;
    $('#preview-category').textContent = record.cat;
    $('#preview-summary').textContent = record.sum;
    $('#preview-image').src = 'assets/' + id + '.svg';
    $('#preview-image').alt = 'Technical illustration for ' + record.title;
    $('#preview-number').textContent = String(labs.indexOf(record)+1).padStart(2,'0')+' / 09';
    $('#preview-read').href = '#research/' + id;
    $('.monitor-body img').src = 'assets/' + id + '.svg';
    if (remember && !location.hash.startsWith('#research/')) {
      const state = history.state || {};
      if (state.lab !== id) history.replaceState({...state,lab:id},'');
    }
  }
  function selectFrom(event) {
    const row = event.target.closest('.lab-row');
    if (row && row.dataset.open !== active) choose(row.dataset.open);
  }
  grid.addEventListener('focusin', selectFrom);
  grid.addEventListener('pointerover', event => { if(event.pointerType !== 'touch') selectFrom(event); });
  grid.addEventListener('click', selectFrom);
  function selectVisible() {
    const rows = Array.from(grid.querySelectorAll('.lab-row:not([hidden])'));
    $('.lab-preview').hidden = !rows.length;
    if (rows.length) choose((rows.find(r => r.dataset.open===active) || rows[0]).dataset.open,false);
  }
  new MutationObserver(selectVisible).observe(grid,{childList:true,attributes:true,attributeFilter:['hidden'],subtree:true});
  choose(history.state?.lab || labs[0].id,false);

  function showLocation(initial = false) {
    const fragment = location.hash.slice(1);
    const node = document.getElementById(fragment || 'hero');
    const section = node?.closest('main > section');
    const detail = section && !['hero','research-lab'].includes(section.id);
    if (!initial && !reduce.matches && !camera && !fragment.startsWith('research/')) {
      section?.animate([{opacity:.45},{opacity:1}], {duration:340,easing:'ease-out'});
    }
    root.classList.toggle('section-open',Boolean(detail));
    document.querySelectorAll('main > section.current-section').forEach(s => s.classList.remove('current-section'));
    if (detail) section.classList.add('current-section');
    if (fragment.startsWith('research/')) {
      choose(fragment.slice(9),false);
      return;
    }
    if (fragment==='research-lab') {
      choose(history.state?.lab || active,false);
      if (!initial) (grid.querySelector('.selected') || $('#index-title')).focus({preventScroll:true});
    } else if (detail && !initial) {
      const head = section.querySelector('h2');
      if (head) { head.tabIndex=-1;head.focus({preventScroll:true}); }
    }
    if (node && (fragment || !initial)) requestAnimationFrame(() => node.scrollIntoView({block:'start',behavior:'instant'}));
  }
  window.addEventListener('hashchange',() => showLocation());
  showLocation(true);

  // Map an image-plane rectangle to the four measured corners of the monitor.
  function project(width,height,quad) {
    const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=quad;
    const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
    const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
    const det=dx1*dy2-dx2*dy1;
    const g=(dx3*dy2-dx2*dy3)/det, h=(dx1*dy3-dx3*dy1)/det;
    return new DOMMatrix([(x1-x0+g*x1)/width,(y1-y0+g*y1)/width,0,g/width,
      (x3-x0+h*x3)/height,(y3-y0+h*y3)/height,0,h/height,0,0,1,0,x0,y0,0,1]);
  }
  function stageLayout(){
    const w=stage.clientWidth,h=stage.clientHeight;
    if(!w || !h)return;
    const shape=portrait.matches?shapes.tall:shapes.wide;
    const [iw,ih]=shape.size, cover=Math.max(w/iw,h/ih);
    const point=([x,y])=>[(w-iw*cover)/2+x*iw*cover,(h-ih*cover)/2+y*ih*cover];
    corners=shape.screen.map(point);
    const mw=640,mh=245;
    const matrix=project(mw,mh,corners).toString();
    for(const element of [face,screenLink]) {
      Object.assign(element.style,{top:'0',left:'0',width:mw+'px',height:mh+'px',transformOrigin:'0 0',transform:matrix});
    }
    for(const [key, selector] of [['mark','.bezel-mark'],['terminal','.point-terminal'],['analysis','.point-analysis'],['hardware','.point-hardware']]) {
      const el=$(selector),[x,y]=point(shape[key]);
      el.style.left=x+'px';el.style.top=y+'px';
      if(key==='mark') el.style.width=Math.max(14,(corners[1][0]-corners[0][0])*.105)+'px';
      else {
        el.style.left=Math.min(w-23,Math.max(23,x))+'px';
        el.style.top=Math.min(h-23,Math.max(23,y))+'px';
      }
    }
    hero.dispatchEvent(new CustomEvent('desk-layout',{detail:{corners,w,h}}));
  }
  new ResizeObserver(stageLayout).observe(stage);
  portrait.addEventListener('change',stageLayout);
  photo.addEventListener('load',stageLayout);
  stageLayout();

  function cleanup(){
    const old=camera;camera=null;
    if(old) old.cancel();
    plate?.remove();plate=null;
    hero.classList.remove('entering');
    face.classList.remove('transition-face');
    stage.style.transformOrigin='';
    stageLayout();
  }
  function travel(event) {
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    if(reduce.matches || !corners || !stage.animate)return;
    event.preventDefault();
    if(camera)return;
    hero.scrollIntoView({behavior:'instant',block:'start'});
    hero.classList.add('entering');
    const w=stage.clientWidth,h=stage.clientHeight;
    // Project the real directory at viewport dimensions onto the monitor, then undo
    // that projection. At the final frame its pixels coincide with the HTML page.
    const source=project(w,h,corners);
    const target=source.inverse();
    plate=document.createElement('div');plate.className='directory-plate';plate.inert=true;plate.setAttribute('aria-hidden','true');
    const copy=$('#research-lab').cloneNode(true);
    copy.className='index-projection';copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(el=>{el.classList.add('copy-'+el.id);el.removeAttribute('id')});
    plate.append(copy);stage.append(plate);
    Object.assign(plate.style,{width:w+'px',height:h+'px',transform:source.toString()});
    face.classList.add('transition-face');
    stage.style.transformOrigin='0 0';
    const start=getComputedStyle(stage).transform;
    camera=stage.animate([{transform:start==='none'?'matrix(1,0,0,1,0,0)':start},{transform:target.toString()}],{duration:730,easing:'cubic-bezier(.55,.04,.2,1)',fill:'forwards'});
    camera.onfinish=()=>{
      location.hash='research-lab';showLocation();
      cleanup();
    };
  }
  hero.querySelectorAll('a[href="#research-lab"]').forEach(a=>a.addEventListener('click',travel));
  window.addEventListener('pagehide',cleanup);
  window.addEventListener('hashchange',()=>{if(camera && location.hash!=='#research-lab')cleanup()});
  function finishInterruptedTravel(){
    if(!camera)return;
    cleanup();
    location.hash='research-lab';
    showLocation();
  }
  addEventListener('resize',finishInterruptedTravel);
  reduce.addEventListener('change',()=>{finishInterruptedTravel();stage.style.removeProperty('--shift-x');stage.style.removeProperty('--shift-y')});
  function shift(x,y){
    if(!visible || document.hidden || reduce.matches || camera)return;
    stage.style.setProperty('--shift-x',x.toFixed(2)+'px');stage.style.setProperty('--shift-y',y.toFixed(2)+'px');
  }
  hero.addEventListener('pointermove', e=>{
    if(e.pointerType!=='mouse')return;
    const rect=hero.getBoundingClientRect();shift((e.clientX/rect.width-.5)*6,((e.clientY-rect.top)/rect.height-.5)*4);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>shift(0,0));
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;}).observe(hero);
  const tilt=$('.tilt');
  if('DeviceOrientationEvent' in window && matchMedia('(pointer:coarse)').matches) {
    tilt.hidden=reduce.matches;
    reduce.addEventListener('change',()=>{tilt.hidden=reduce.matches});
    const clamp=v=>Math.min(4,Math.max(-4,v||0));
    let base=null;
    const orient=e=>{if(e.beta===null || e.gamma===null)return;if(!base)base=[e.gamma,e.beta];shift(clamp((e.gamma-base[0])*.16),clamp((e.beta-base[1])*.16))};
    tilt.addEventListener('click',async()=>{
      if(userTilt){window.removeEventListener('deviceorientation',orient);userTilt=false;base=null;shift(0,0);tilt.textContent='Enable tilt';return}
      try{
        if(typeof DeviceOrientationEvent.requestPermission==='function' && await DeviceOrientationEvent.requestPermission()!=='granted'){tilt.textContent='Tilt unavailable';return}
        base=null;window.addEventListener('deviceorientation',orient,{passive:true});userTilt=true;tilt.textContent='Disable tilt';
      }catch{tilt.textContent='Tilt unavailable'}
    });
  }
  // The picture and all hit targets work before WebGL is requested.
  if(!reduce.matches && !navigator.connection?.saveData && 'WebGLRenderingContext' in window){
    const load = new IntersectionObserver(entries=>{
      if(!entries.some(e=>e.isIntersecting))return;
      load.disconnect();
      const start=()=>import('./monitor-light.js').then(m=>m.light(stage, hero, reduce, ()=>({corners,w:stage.clientWidth,h:stage.clientHeight}))).catch(()=>{});
      if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:2000});else setTimeout(start,250);
    });
    load.observe(hero);
  }
})();
