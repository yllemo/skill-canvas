// ════════════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════════════
let panX=0,panY=0,scale=1;
let isPanning=false,panSX=0,panSY=0;
const skillDefaults=()=>(window.SC_DEFAULTS?.skill)||{name:'my-skill',description:'Describe when an AI agent should activate this skill. Agentic systems compare the user\'s request to this text to decide if the skill is relevant—list concrete situations, topics, or example questions (e.g. "Use when the user asks about our onboarding process or needs a visual overview of X"). The canvas holds the knowledge; description is the trigger.',author:'',version:'1.0',tags:''};
let skillMeta={...skillDefaults()};

function skillRequiredDefaults(){
  const d=skillDefaults();
  return{
    name:d.name||'my-skill',
    description:d.description||skillDefaults().description,
  };
}
let nodes=[];           // [{id,type,x,y,width,height,title,content,file,src,alt,caption,...}]
let files={};           // {path: Uint8Array|string}  — in-memory zip contents
let dirty=false;
let selectedId=null;
let ctxTargetId=null;
let dragNode=null,dragOX=0,dragOY=0;
let resizeNode=null,resizeSX=0,resizeSY=0,resizeOW=0,resizeOH=0;
let mermaidCounter=0;

const canvas   = document.getElementById('canvas');
const cw       = document.getElementById('cw');
const dz       = document.getElementById('dz');
const addPanel = document.getElementById('add-panel');
const zlevel   = document.getElementById('zlevel');
const toast    = document.getElementById('toast');
const loading  = document.getElementById('loading');
const ctxmenu  = document.getElementById('ctxmenu');
const hdrTitle = document.getElementById('hdr-title');
const exportWrap = document.getElementById('export-wrap');
const openWrap = document.getElementById('open-wrap');
const fileInput = document.getElementById('file-input');

// ════════════════════════════════════════════════════════════
//  MERMAID + MARKED
// ════════════════════════════════════════════════════════════
mermaid.initialize({startOnLoad:false,theme:'default',securityLevel:'loose',fontFamily:'Arial,Helvetica,sans-serif',fontSize:13});

marked.setOptions({breaks:true,gfm:true});

function reinitMermaid(){
  const t=document.documentElement.getAttribute('data-theme');
  mermaid.initialize({startOnLoad:false,theme:t==='dark'?'dark':'default',securityLevel:'loose',fontFamily:'Arial,Helvetica,sans-serif',fontSize:13});
}

// ════════════════════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════════════════════
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  localStorage.setItem('theme',t);
  reinitMermaid();
  nodes.forEach(n=>{if(n.type==='mermaid') rerenderMermaid(n)});
  window.dispatchEvent(new CustomEvent('sc-theme-change',{detail:t}));
}
(()=>{applyTheme(localStorage.getItem('theme')||'light')})();
document.getElementById('btn-theme').onclick=()=>{
  applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
};

// ════════════════════════════════════════════════════════════
//  TRANSFORM
// ════════════════════════════════════════════════════════════
function applyTf(){
  canvas.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;
  zlevel.textContent=Math.round(scale*100)+'%';
}
function clampS(s){const c=window.SC_DEFAULTS?.canvas||{};return Math.min(Math.max(s,c.minScale??.08),c.maxScale??5)}
function zoomAt(cx,cy,d){
  const o=scale; scale=clampS(scale*d);
  panX=cx-(cx-panX)*(scale/o); panY=cy-(cy-panY)*(scale/o);
  applyTf();
}

cw.addEventListener('wheel',e=>{
  e.preventDefault();
  const r=cw.getBoundingClientRect();
  zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.1:.909);
},{passive:false});

// Pan (middle mouse or space+drag or background drag)
let spaceDown=false;
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.matches('input,textarea,select')){e.preventDefault();spaceDown=true;cw.style.cursor='grab'}});
window.addEventListener('keyup',e=>{if(e.code==='Space'){spaceDown=false;cw.style.cursor='default'}});

cw.addEventListener('mousedown',e=>{
  if(e.button===1||(e.button===0&&spaceDown)){
    e.preventDefault(); isPanning=true;
    panSX=e.clientX-panX; panSY=e.clientY-panY;
    cw.style.cursor='grabbing';
  } else if(e.button===0&&e.target===cw||e.target===canvas){
    // click on empty space — deselect
    selectNode(null);
    closeCtx();
  }
});
window.addEventListener('mousemove',e=>{
  if(isPanning){panX=e.clientX-panSX;panY=e.clientY-panSY;applyTf();return}
  if(dragNode){
    const dx=(e.clientX-dragNode._mx)/scale, dy=(e.clientY-dragNode._my)/scale;
    dragNode.x=Math.round(dragNode._ox+dx);
    dragNode.y=Math.round(dragNode._oy+dy);
    dragNode._el.style.left=dragNode.x+'px';
    dragNode._el.style.top=dragNode.y+'px';
    markDirty();
  }
  if(resizeNode){
    const dx=(e.clientX-resizeSX)/scale, dy=(e.clientY-resizeSY)/scale;
    if(resizeNode.type==='note'||resizeNode.type==='annotation'){
      const defs=window.SC_DEFAULTS?.nodes?.[resizeNode.type]||{};
      const minW=defs.minWidth||140, maxW=defs.maxWidth||480;
      const minH=defs.minHeight||120, maxH=defs.maxHeight||480;
      const nw=Math.max(minW,Math.min(maxW,Math.round(resizeOW+dx)));
      const nh=Math.max(minH,Math.min(maxH,Math.round(resizeOH+dy)));
      resizeNode.width=nw;
      resizeNode.height=nh;
      resizeNode._el.style.width=nw+'px';
      resizeNode._el.style.height=nh+'px';
    }else{
      const nw=Math.max(160,Math.round(resizeOW+dx));
      resizeNode.width=nw;
      resizeNode._el.style.width=nw+'px';
    }
    markDirty();
  }
});
window.addEventListener('mouseup',e=>{
  isPanning=false; cw.style.cursor='default';
  if(dragNode){
    if(dragNode._el)dragNode._el.classList.remove('dragging');
    dragNode=null;
  }
  if(resizeNode){resizeNode=null}
});

document.getElementById('zi').onclick=()=>{const r=cw.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1.2)};
document.getElementById('zo').onclick=()=>{const r=cw.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1/1.2)};
document.getElementById('btn-fit').onclick=fitView;

function fitView(){
  if(!nodes.length){panX=0;panY=0;scale=1;applyTf();return}
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  nodes.forEach(n=>{
    const w=n.width||380,h=n._el?n._el.offsetHeight:300;
    x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);
    x1=Math.max(x1,n.x+w);y1=Math.max(y1,n.y+h);
  });
  const pad=(window.SC_DEFAULTS?.canvas?.fitPadding)??80,bw=x1-x0+pad*2,bh=y1-y0+pad*2;
  const ww=cw.clientWidth,wh=cw.clientHeight;
  scale=clampS(Math.min(ww/bw,wh/bh,.95));
  panX=(ww-bw*scale)/2-(x0-pad)*scale;
  panY=(wh-bh*scale)/2-(y0-pad)*scale;
  applyTf();
}

function focusNode(nodeOrId){
  const node=typeof nodeOrId==='string'?nodes.find(n=>n.id===nodeOrId):nodeOrId;
  if(!node||!node._el||node.type==='note')return;
  selectNode(node.id);
  const w=node.width||node._el.offsetWidth;
  const h=node.height||node._el.offsetHeight;
  const x0=node.x,y0=node.y,x1=node.x+w,y1=node.y+h;
  const pad=(window.SC_DEFAULTS?.canvas?.nodeFocusPadding)??12;
  const bw=x1-x0+pad*2,bh=y1-y0+pad*2;
  const ww=cw.clientWidth,wh=cw.clientHeight;
  scale=clampS(Math.min(ww/bw,wh/bh));
  panX=(ww-bw*scale)/2-(x0-pad)*scale;
  panY=(wh-bh*scale)/2-(y0-pad)*scale;
  applyTf();
}

// ════════════════════════════════════════════════════════════
//  CANVAS OPEN / NEW
// ════════════════════════════════════════════════════════════
function openZipPicker(){fileInput.click()}

function newCanvas(){
  files={};nodes=[];skillMeta={...skillDefaults()};
  canvas.innerHTML='';dirty=false;
  panX=0;panY=0;scale=1;applyTf();
  selectNode(null);
  showCanvas();
  openMetaModal();
}

document.getElementById('btn-open').onclick=openZipPicker;
document.getElementById('btn-open-toggle').onclick=e=>{
  e.stopPropagation();
  openWrap.classList.toggle('open');
};
document.querySelectorAll('[data-open]').forEach(btn=>{
  btn.onclick=()=>{
    openWrap.classList.remove('open');
    if(btn.dataset.open==='zip')openZipPicker();
    else newCanvas();
  };
});
document.getElementById('btn-open-dz').onclick=openZipPicker;
fileInput.onchange=e=>{if(e.target.files[0])loadZip(e.target.files[0]);e.target.value=''};

// Drag-drop anywhere
document.body.addEventListener('dragover',e=>{e.preventDefault();document.getElementById('dz-inner').classList.add('hover')});
document.body.addEventListener('dragleave',()=>document.getElementById('dz-inner').classList.remove('hover'));
document.body.addEventListener('drop',e=>{
  e.preventDefault();document.getElementById('dz-inner').classList.remove('hover');
  const f=e.dataTransfer.files[0];
  if(f&&f.name.endsWith('.zip'))loadZip(f);else showToast('Välj en .zip-fil');
});

document.getElementById('btn-new').onclick=newCanvas;

function applySkillHeader(){
  hdrTitle.textContent=skillMeta.name||'Skill Canvas';
  hdrTitle.classList.add('is-canvas');
  document.getElementById('hdr-skill').textContent=skillMeta.description||'';
}

function showCanvas(){
  dz.classList.add('hidden');
  addPanel.classList.remove('hidden');
  document.getElementById('zc').classList.remove('hidden');
  exportWrap.classList.remove('hidden');
  document.getElementById('btn-fit').classList.remove('hidden');
  document.getElementById('btn-meta').classList.remove('hidden');
  applySkillHeader();
}

// ════════════════════════════════════════════════════════════
//  LOAD ZIP
// ════════════════════════════════════════════════════════════
async function loadZip(file){
  loading.classList.add('on');
  try{
    const zip=await JSZip.loadAsync(file);
    const sf=zip.file('SKILL.md');
    if(!sf)throw new Error('SKILL.md saknas i zip-filen.');
    const raw=await sf.async('string');

    // load all other files into memory
    files={};
    const promises=[];
    zip.forEach((path,entry)=>{
      if(path==='SKILL.md'||entry.dir)return;
      promises.push(entry.async('uint8array').then(d=>{files[path]=d}));
    });
    await Promise.all(promises);

    await parseSkill(raw);
    showCanvas();
    setTimeout(fitView,250);
    showToast('Öppnad: '+file.name);
  }catch(err){
    console.error(err);showToast('Fel: '+err.message,4000);
  }finally{loading.classList.remove('on')}
}

// ════════════════════════════════════════════════════════════
//  PARSE SKILL.md
// ════════════════════════════════════════════════════════════
async function parseSkill(raw){
  const fm=raw.match(/^---\n([\s\S]*?)\n---/);
  if(!fm)throw new Error('YAML frontmatter saknas');
  let meta;
  try{meta=jsyaml.load(fm[1])}catch(e){throw new Error('YAML-fel: '+e.message)}
  skillMeta={
    name:meta.name||meta.title||'canvas',
    description:meta.description||'',
    author:meta.author||'',
    version:String(meta.version||'1.0'),
    tags:Array.isArray(meta.tags)?meta.tags.join(', '):(meta.tags||''),
  };
  nodes=(meta.nodes||[]).map((n,i)=>({...n,id:n.id||genId()}));
  canvas.innerHTML='';
  for(const n of nodes)await buildNodeEl(n);
  applyTf();
}

// ════════════════════════════════════════════════════════════
//  BUILD NODE ELEMENT
// ════════════════════════════════════════════════════════════
async function buildNodeEl(node){
  const el=document.createElement('div');
  el.className='node '+(node.type||'markdown');
  el.dataset.id=node.id;
  el.style.left=(node.x||0)+'px';
  el.style.top=(node.y||0)+'px';
  if(node.width)el.style.width=node.width+'px';
  if(node.height)el.style.height=node.height+'px';
  node._el=el;

  // color bar
  const bar=document.createElement('div');bar.className='node-bar';el.appendChild(bar);

  // drag handle
  const handle=document.createElement('div');
  handle.className='node-handle';
  if(node.type==='note'&&typeof NotesModule!=='undefined'){
    handle.innerHTML=NotesModule.buildHandleHTML(node);
  }else{
    handle.innerHTML=`<span class="node-type-label">${typeLabel(node.type)}</span>
    <span>${node.title||''}</span>
    <span class="node-handle-actions">
      <button title="Redigera" data-action="edit">${iconEdit()}</button>
      <button title="Fokusera" data-action="focus">${iconFocus()}</button>
      <button title="Ta bort" data-action="del">${iconDel()}</button>
    </span>`;
  }
  el.appendChild(handle);

  // body
  const body=document.createElement('div');body.className='node-body';
  el.appendChild(body);

  // resize
  const rz=document.createElement('div');rz.className='node-resize';el.appendChild(rz);

  canvas.appendChild(el);
  await renderNodeContent(node,body);
  if(node.type==='note'&&typeof NotesModule!=='undefined')NotesModule.attachEvents(node,el,handle,rz);
  else attachNodeEvents(node,el,handle,rz);
  return el;
}

function revokeMarkdownImgUrls(node){
  if(!node._imgUrls)return;
  node._imgUrls.forEach(u=>URL.revokeObjectURL(u));
  node._imgUrls=[];
}

function revokeDrawioPreview(node){
  if(node._previewUrl){
    URL.revokeObjectURL(node._previewUrl);
    node._previewUrl=null;
  }
}

function resolveMarkdownImages(container,node){
  revokeMarkdownImgUrls(node);
  container.querySelectorAll('img').forEach(img=>{
    const raw=img.getAttribute('src')||'';
    if(!raw||raw.startsWith('data:')||raw.startsWith('blob:')||/^https?:\/\//i.test(raw))return;
    const candidates=[
      decodeURIComponent(raw).replace(/^\.\//,''),
      decodeURIComponent(raw).split('/').pop(),
    ];
    let path=null;
    for(const c of candidates){
      if(c&&files[c]){path=c;break}
    }
    if(!path)return;
    const url=URL.createObjectURL(new Blob([files[path]],{type:mimeFromPath(path)}));
    if(!node._imgUrls)node._imgUrls=[];
    node._imgUrls.push(url);
    img.src=url;
    img.alt=img.alt||path.split('/').pop()||'';
  });
}

async function renderNodeContent(node,body){
  body.innerHTML='';
  const type=node.type||'markdown';

  if(type==='note'&&typeof NotesModule!=='undefined'){
    NotesModule.renderContent(node,body);
    return;
  }

  if(type==='annotation'&&typeof AnnotationModule!=='undefined'){
    AnnotationModule.renderContent(node,body);
    return;
  }

  if(type==='markdown'){
    let md=node.content||'';
    if(!md&&node.file){md=await readTextFile(node.file)}
    const div=document.createElement('div');div.className='md';
    div.innerHTML=marked.parse(md);
    resolveMarkdownImages(div,node);
    div.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener'});
    body.appendChild(div);

  }else if(type==='mermaid'){
    let code=node.content||'';
    if(!code&&node.file){code=await readTextFile(node.file)}
    const wrap=document.createElement('div');wrap.className='mermaid-wrap';
    const id='mm'+Date.now()+(mermaidCounter++);
    try{
      const {svg}=await mermaid.render(id,code);
      wrap.innerHTML=svg;
    }catch(e){
      wrap.innerHTML=`<pre style="color:#d24723;font-size:12px;padding:8px;background:var(--bg-nav);border-radius:4px;">Mermaid-fel:\n${e.message}</pre>`;
    }
    body.appendChild(wrap);

  }else if(type==='image'){
    let src='';
    if(node.src){src=node.src}
    else if(node.file&&files[node.file]){
      const blob=new Blob([files[node.file]],{type:mimeFromPath(node.file)});
      src=URL.createObjectURL(blob);
    }
    const img=document.createElement('img');
    img.src=src;img.alt=node.alt||node.title||'';
    if(node.width)img.style.width='100%';
    body.style.padding='0';
    body.appendChild(img);
    if(node.caption){
      const cap=document.createElement('div');cap.className='img-caption';cap.textContent=node.caption;
      body.appendChild(cap);
    }
  }else if(type==='label'){
    const t=document.createElement('div');t.className='label-text';
    t.style.fontSize=(node.fontSize||24)+'px';
    if(node.color)t.style.color=node.color;
    t.textContent=node.content||node.title||'';
    body.appendChild(t);

  }else if(type==='drawio'){
    revokeDrawioPreview(node);
    const wrap=document.createElement('div');wrap.className='drawio-preview';
    let src='';
    if(node.previewFile&&files[node.previewFile]){
      const blob=new Blob([files[node.previewFile]],{type:mimeFromPath(node.previewFile)});
      src=URL.createObjectURL(blob);
      node._previewUrl=src;
    }
    if(src){
      const img=document.createElement('img');
      img.src=src;img.alt=node.title||'Draw.io-diagram';
      img.style.width='100%';
      wrap.appendChild(img);
    }else{
      const ph=document.createElement('div');ph.className='drawio-placeholder';
      ph.textContent='Ingen förhandsbild — klicka Redigera för att rita';
      wrap.appendChild(ph);
    }
    body.style.padding='0';
    body.appendChild(wrap);
  }
}

async function rerenderMermaid(node){
  if(node.type!=='mermaid'||!node._el)return;
  const body=node._el.querySelector('.node-body');
  if(body)await renderNodeContent(node,body);
}

async function readTextFile(path){
  if(!files[path])return `_Fil saknas: ${path}_`;
  const dec=new TextDecoder('utf-8');
  return dec.decode(files[path]);
}

// ════════════════════════════════════════════════════════════
//  NODE EVENTS (drag, resize, select, context)
// ════════════════════════════════════════════════════════════
function attachNodeContextMenu(node,el){
  el.addEventListener('contextmenu',e=>{
    e.preventDefault();e.stopPropagation();
    ctxTargetId=node.id;
    showCtx(e.clientX,e.clientY);
  });
}

function attachNodeResize(node,el,rz){
  rz.addEventListener('mousedown',e=>{
    e.stopPropagation();e.preventDefault();
    selectNode(node.id);
    resizeNode=node;
    resizeSX=e.clientX;resizeSY=e.clientY;
    resizeOW=node.width||el.offsetWidth;
    resizeOH=node.height||el.offsetHeight;
  });
}
window.attachNodeContextMenu=attachNodeContextMenu;
window.attachNodeResize=attachNodeResize;

function attachNodeEvents(node,el,handle,rz){
  const isLabel=node.type==='label';

  function beginDrag(e){
    if(e.target.closest('[data-action]'))return;
    if(e.button!==0)return;
    e.stopPropagation();
    e.preventDefault();
    dragNode=node;
    dragNode._mx=e.clientX;
    dragNode._my=e.clientY;
    dragNode._ox=node.x;
    dragNode._oy=node.y;
    if(isLabel)el.classList.add('dragging');
  }

  // select on click; label-noder flyttas direkt från text/yta
  el.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    if(e.target.closest('[data-action]'))return;
    selectNode(node.id);
    closeCtx();
    if(isLabel)beginDrag(e);
  });

  // drag via handle (övriga nodtyper)
  handle.addEventListener('mousedown',e=>{
    if(isLabel)return;
    beginDrag(e);
  });

  handle.addEventListener('dblclick',e=>{
    if(e.target.closest('[data-action]'))return;
    e.stopPropagation();
    e.preventDefault();
    if(dragNode){
      if(dragNode._el)dragNode._el.classList.remove('dragging');
      dragNode=null;
    }
    focusNode(node);
  });

  // handle actions
  handle.querySelector('[data-action="edit"]').onclick=e=>{e.stopPropagation();openEditModal(node)};
  handle.querySelector('[data-action="focus"]').onclick=e=>{e.stopPropagation();focusNode(node)};
  handle.querySelector('[data-action="del"]').onclick=e=>{e.stopPropagation();deleteNode(node.id)};

  attachNodeContextMenu(node,el);
  attachNodeResize(node,el,rz);
}

function selectNode(id){
  document.querySelectorAll('.node.selected').forEach(n=>n.classList.remove('selected'));
  selectedId=id;
  if(id){
    const n=nodes.find(n=>n.id===id);
    if(n&&n._el)n._el.classList.add('selected');
  }
}

// ════════════════════════════════════════════════════════════
//  CONTEXT MENU
// ════════════════════════════════════════════════════════════
function showCtx(x,y){
  const n=nodes.find(n=>n.id===ctxTargetId);
  const editItem=document.getElementById('ctx-edit');
  if(editItem)editItem.style.display=(n&&n.type==='note')?'none':'';
  ctxmenu.style.left=x+'px';ctxmenu.style.top=y+'px';
  ctxmenu.classList.add('open');
}
function closeCtx(){ctxmenu.classList.remove('open')}
document.addEventListener('mousedown',e=>{if(!e.target.closest('#ctxmenu'))closeCtx()});
document.getElementById('ctx-edit').onclick=()=>{closeCtx();const n=nodes.find(n=>n.id===ctxTargetId);if(n)openEditModal(n)};
document.getElementById('ctx-dup').onclick=()=>{closeCtx();duplicateNode(ctxTargetId)};
document.getElementById('ctx-del').onclick=()=>{closeCtx();deleteNode(ctxTargetId)};

// ════════════════════════════════════════════════════════════
//  ADD NODES
// ════════════════════════════════════════════════════════════
function centerPos(){
  // place new node near center of current viewport
  const ww=cw.clientWidth,wh=cw.clientHeight;
  const cx=(-panX+ww/2)/scale, cy=(-panY+wh/2)/scale;
  return {x:Math.round(cx-190),y:Math.round(cy-100)};
}

// ADD-knappar kopplas i js/modules/*.js

// ════════════════════════════════════════════════════════════
//  DELETE / DUPLICATE
// ════════════════════════════════════════════════════════════
function deleteNode(id){
  const idx=nodes.findIndex(n=>n.id===id);
  if(idx===-1)return;
  const n=nodes[idx];
  revokeMarkdownImgUrls(n);
  revokeDrawioPreview(n);
  if(n._el)n._el.remove();
  if(n.file&&n._ownFile)delete files[n.file];
  if(n.previewFile&&n._ownPreview)delete files[n.previewFile];
  nodes.splice(idx,1);
  markDirty();
  showToast('Nod borttagen');
}

function duplicateNode(id){
  const src=nodes.find(n=>n.id===id);if(!src)return;
  const clone=JSON.parse(JSON.stringify(src));
  clone.id=genId();clone.x=src.x+30;clone.y=src.y+30;clone._el=null;
  if(src.file&&src._ownFile){
    const newPath=uniqueFilePath(src.file);
    files[newPath]=files[src.file];
    clone.file=newPath;clone._ownFile=true;
  }
  if(src.previewFile&&src._ownPreview&&files[src.previewFile]){
    const newPrev=uniqueFilePath(src.previewFile);
    files[newPrev]=files[src.previewFile];
    clone.previewFile=newPrev;clone._ownPreview=true;
  }
  clone._previewUrl=null;
  nodes.push(clone);
  buildNodeEl(clone);
  markDirty();
}

// ════════════════════════════════════════════════════════════
//  MODALS (canvas-metadata — nodmoduler i js/modules/)
// ════════════════════════════════════════════════════════════

// ── META modal ──
function openMetaModal(){
  const req=skillRequiredDefaults();
  const nameVal=skillMeta.name||req.name;
  const descVal=skillMeta.description||req.description;
  Modal.open('Skill-metadata',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="mfield" style="grid-column:1/-1"><label>name <span style="color:#d24723">*</span></label>
        <input id="m-name" value="${esc(nameVal)}" placeholder="${esc(req.name)}" autocomplete="off" spellcheck="false"></div>
      <div class="mfield" style="grid-column:1/-1"><label>description <span style="color:#d24723">*</span></label>
        <textarea id="m-desc" rows="4" placeholder="${esc(req.description)}">${esc(descVal)}</textarea></div>
      <div class="mfield"><label>author</label>
        <input id="m-author" value="${esc(skillMeta.author)}" placeholder="Intraservice"></div>
      <div class="mfield"><label>version</label>
        <input id="m-ver" value="${esc(skillMeta.version)}" placeholder="1.0"></div>
      <div class="mfield" style="grid-column:1/-1"><label>tags <span style="color:var(--text-sec);font-weight:400;text-transform:none;font-size:11px">(kommaseparerade)</span></label>
        <input id="m-tags" value="${esc(skillMeta.tags)}" placeholder="klos, bas, isdb"></div>
    </div>
    <p style="font-size:11px;color:var(--text-sec);margin-top:4px"><code>name</code> och <code>description</code> krävs för Claude Skills. <code>name</code> visas som titel i verktygsraden.</p>
  `,()=>{
    const req=skillRequiredDefaults();
    const name=document.getElementById('m-name').value.trim()||req.name;
    const description=document.getElementById('m-desc').value.trim()||req.description;
    skillMeta.name=name;
    skillMeta.description=description;
    skillMeta.author=document.getElementById('m-author').value.trim();
    skillMeta.version=document.getElementById('m-ver').value.trim()||'1.0';
    skillMeta.tags=document.getElementById('m-tags').value.trim();
    applySkillHeader();
    markDirty();Modal.close();
  },'Spara');
}
document.getElementById('btn-meta').onclick=openMetaModal;
hdrTitle.onclick=()=>{if(!exportWrap.classList.contains('hidden'))openMetaModal()};

// ════════════════════════════════════════════════════════════
//  EXPORT (.zip / .png)
// ════════════════════════════════════════════════════════════
function exportBaseName(){
  const slug=(skillMeta.name||'skill-canvas').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'skill-canvas';
  const now=new Date();
  const p=n=>String(n).padStart(2,'0');
  return `${slug}_${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}_${p(now.getHours())}.${p(now.getMinutes())}.${p(now.getSeconds())}`;
}

function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getNodesBounds(pad=48){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const n of nodes){
    const el=n._el;
    if(!el)continue;
    const w=n.width||el.offsetWidth;
    const h=n.height||el.offsetHeight;
    x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);
    x1=Math.max(x1,n.x+w);y1=Math.max(y1,n.y+h);
  }
  if(!isFinite(x0))return null;
  return {x0:x0-pad,y0:y0-pad,w:x1-x0+pad*2,h:y1-y0+pad*2};
}

async function waitForImages(root){
  await Promise.all([...root.querySelectorAll('img')].map(img=>{
    if(img.complete)return Promise.resolve();
    return new Promise(res=>{img.onload=img.onerror=res});
  }));
}

async function exportPng(){
  if(typeof html2canvas!=='function'){showToast('PNG-export otillgänglig');return}
  const bounds=getNodesBounds();
  if(!bounds){showToast('Inga objekt att exportera');return}
  loading.classList.add('on');
  let host=null;
  try{
    host=document.createElement('div');
    host.style.cssText=`position:fixed;left:-99999px;top:0;width:${bounds.w}px;height:${bounds.h}px;background:${getComputedStyle(cw).backgroundColor};overflow:hidden;`;
    const layer=document.createElement('div');
    layer.style.cssText=`position:relative;width:${bounds.w}px;height:${bounds.h}px;`;
    host.appendChild(layer);
    for(const n of nodes){
      if(!n._el)continue;
      const clone=n._el.cloneNode(true);
      clone.classList.remove('selected','dragging');
      clone.style.left=(n.x-bounds.x0)+'px';
      clone.style.top=(n.y-bounds.y0)+'px';
      clone.querySelectorAll('.node-resize,.node-handle').forEach(el=>{el.style.display='none'});
      layer.appendChild(clone);
    }
    document.body.appendChild(host);
    await waitForImages(host);
    const shot=await html2canvas(host,{backgroundColor:null,scale:2,useCORS:true,logging:false,allowTaint:true});
    document.body.removeChild(host);
    host=null;
    const filename=exportBaseName()+'.png';
    await new Promise((res,rej)=>{
      shot.toBlob(blob=>{
        if(!blob){rej(new Error('Kunde inte skapa PNG'));return}
        downloadBlob(blob,filename);
        res();
      },'image/png');
    });
    showToast('Exporterad: '+filename);
  }catch(err){
    console.error(err);
    showToast('PNG-fel: '+err.message,4000);
  }finally{
    if(host&&host.parentNode)host.parentNode.removeChild(host);
    loading.classList.remove('on');
  }
}

document.getElementById('btn-export').onclick=e=>{
  e.stopPropagation();
  exportWrap.classList.toggle('open');
};
document.querySelectorAll('[data-export]').forEach(btn=>{
  btn.onclick=()=>{
    exportWrap.classList.remove('open');
    if(btn.dataset.export==='zip')saveZip();
    else exportPng();
  };
});
document.addEventListener('mousedown',e=>{
  if(!e.target.closest('#export-wrap'))exportWrap.classList.remove('open');
  if(!e.target.closest('#open-wrap'))openWrap.classList.remove('open');
});

// ── EDIT modal — delegeras till ModuleRegistry ──
async function openEditModal(node){
  if(node.type==='note')return;
  await ModuleRegistry.openEdit(node);
}

async function saveZip(){
  loading.classList.add('on');
  try{
    const zip=new JSZip();

    // Build SKILL.md
    const exportNodes=nodes.map(n=>{
      const {_el,_ownFile,...rest}=n;
      // update x,y from current position
      if(_el){
        rest.x=parseInt(_el.style.left)||n.x||0;
        rest.y=parseInt(_el.style.top)||n.y||0;
        rest.width=_el.offsetWidth||n.width;
        if(n.type==='note'||n.type==='annotation'){
          rest.height=_el.offsetHeight||n.height;
        }
      }
      return rest;
    });

    const tagsVal=skillMeta.tags
      ?skillMeta.tags.split(',').map(t=>t.trim()).filter(Boolean)
      :undefined;

    const yamlObj={
      name:skillMeta.name,
      description:skillMeta.description,
      author:skillMeta.author||'',
      version:skillMeta.version||'1.0',
      ...(tagsVal&&tagsVal.length?{tags:tagsVal}:{}),
      nodes:exportNodes
    };
    const skillContent='---\n'+jsyaml.dump(yamlObj,{lineWidth:120,noRefs:true})+'---\n';
    zip.file('SKILL.md',skillContent);

    // Add all files
    for(const [path,data] of Object.entries(files)){
      if(data instanceof Uint8Array)zip.file(path,data);
      else zip.file(path,data);
    }

    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    const filename=exportBaseName()+'.zip';
    downloadBlob(blob,filename);
    dirty=false;
    document.getElementById('btn-export').classList.remove('hb-save');
    showToast('Sparad: '+filename);
  }catch(err){
    console.error(err);showToast('Sparafel: '+err.message,4000);
  }finally{loading.classList.remove('on')}
}

// ════════════════════════════════════════════════════════════
//  DIRTY / UTILS
// ════════════════════════════════════════════════════════════
function markDirty(){
  dirty=true;
  document.getElementById('btn-export').classList.add('hb-save');
}
function genId(){return 'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function uniqueFilePath(orig){
  let p=orig,i=1;
  while(files[p]){const d=orig.lastIndexOf('.');p=d>-1?orig.slice(0,d)+'-'+i+orig.slice(d):orig+'-'+i;i++}
  return p;
}
function mimeFromPath(p){
  const e=p.split('.').pop().toLowerCase();
  return{png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml'}[e]||'application/octet-stream';
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function typeLabel(t){return{markdown:'MD',mermaid:'MM',image:'IMG',label:'LBL',note:'Note',annotation:'ANN',drawio:'DIO'}[t]||'?'}
function iconEdit(){return`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 3.5l2 2-10 10H4.5v-2L14.5 3.5z"/></svg>`}
function iconFocus(){return`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3H3v3M14 3h3v3M17 14v3h-3M6 17H3v-3"/><rect x="7" y="7" width="6" height="6" rx="1"/></svg>`}
function iconDel(){return`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h12M9 7V4h2v3M6 7l1 9h6l1-9"/></svg>`}

function showToast(msg,dur=2800){
  toast.textContent=msg;toast.classList.add('show');
  clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),dur);
}

// ── keyboard shortcuts ──
window.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||e.target.isContentEditable)return;
  if(e.key==='Delete'||e.key==='Backspace'){
    if(selectedId){deleteNode(selectedId);selectedId=null}
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveZip()}
  if((e.ctrlKey||e.metaKey)&&e.key==='d'){
    e.preventDefault();if(selectedId)duplicateNode(selectedId)
  }
});

applyTf();