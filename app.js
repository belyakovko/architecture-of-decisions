const $=q=>document.querySelector(q),ns="http://www.w3.org/2000/svg",make=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
let entries=[],areas=[],scale=1,dx=0,dy=0,activeTopic=null;
// Gentle node movement: keep every SVG edge connected to its moving circles.
const motionNodes=new Map(),motionEdges=[],reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
function neuronCurve(a,b,index){
 const vx=b.x-a.x,vy=b.y-a.y,len=Math.hypot(vx,vy)||1;
 const bend=(index%2===0?1:-1)*Math.min(29,len*.11);
 const cx=(a.x+b.x)/2-vy/len*bend,cy=(a.y+b.y)/2+vx/len*bend;
 return {d:"M "+a.x.toFixed(2)+" "+a.y.toFixed(2)+" Q "+cx.toFixed(2)+" "+cy.toFixed(2)+" "+b.x.toFixed(2)+" "+b.y.toFixed(2),cx,cy};
}
function updateNeuronEdge(edge,a,b,seconds,animated){
 const curve=neuronCurve(a,b,edge.index);
 edge.core.setAttribute("d",curve.d);
 edge.glow.setAttribute("d",curve.d);
 edge.synapse.setAttribute("cx",curve.cx);
 edge.synapse.setAttribute("cy",curve.cy);
 if(!animated){edge.pulse.style.opacity="0";return;}
 const t=(seconds*.083+edge.index*.217)%1;
 const u=1-t;
 const px=u*u*a.x+2*u*t*curve.cx+t*t*b.x;
 const py=u*u*a.y+2*u*t*curve.cy+t*t*b.y;
 edge.pulse.setAttribute("cx",px);
 edge.pulse.setAttribute("cy",py);
 edge.pulse.style.opacity=String(Math.max(0,Math.min(1,(t-.02)*9,(.99-t)*9))*.70);
}
function highlightNeuronNetwork(id){
 const active=id||null;
 document.querySelectorAll(".node").forEach(node=>node.classList.toggle("neuron-dim",!!active&&node.dataset.id!==active&&!motionEdges.some(e=>(e.from===active&&e.to===node.dataset.id)||(e.to===active&&e.from===node.dataset.id))));
 motionEdges.forEach(e=>{const hot=!!active&&(e.from===active||e.to===active);e.group.classList.toggle("neuron-active",hot);e.group.classList.toggle("neuron-muted",!!active&&!hot)});
}

let motionStarted=false,hoveredNode=null;
function animateNodes(now){
 requestAnimationFrame(animateNodes);
 if(!areas.length||reducedMotion.matches||document.hidden||!document.querySelector("#map-page:not(.hidden)"))return;
 const elapsed=now/1000,position=new Map();
 areas.forEach((a,i)=>{
  const hovered=hoveredNode===a.id,amp=hovered?0:Math.min(6,3.1+a.r*.025);
  const x=amp*Math.sin(elapsed*.52+i*1.71),y=amp*.8*Math.cos(elapsed*.45+i*2.07);
  position.set(a.id,{x:a.x+x,y:a.y+y});
  const node=motionNodes.get(a.id);
  if(node)node.setAttribute("transform","translate("+x.toFixed(2)+" "+y.toFixed(2)+")");
 });
 motionEdges.forEach(edge=>{
  const a=position.get(edge.from),b=position.get(edge.to);
  if(a&&b)updateNeuronEdge(edge,a,b,elapsed,true);
 });
}
function startMotion(){if(!motionStarted){motionStarted=true;requestAnimationFrame(animateNodes)}}

function topicButton(topic,active=false){
 const b=document.createElement("button");b.type="button";b.className="topic-chip"+(active?" active":"");b.textContent=topic;b.setAttribute("aria-pressed",String(active));
 b.onclick=()=>filterByTopic(topic);return b;
}
function filterByTopic(topic){
 activeTopic=topic;const reader=$("#post-reader");if(reader)reader.remove();
 $("#publication-list").classList.remove("hidden");show("posts");renderPosts();
}
function renderFilters(){
 const host=$("#topic-filters");host.replaceChildren();
 const all=document.createElement("button");all.type="button";all.className="topic-chip"+(!activeTopic?" active":"");
 all.textContent="Все направления";all.setAttribute("aria-pressed",String(!activeTopic));all.onclick=()=>filterByTopic(null);host.append(all);
 [...new Set(entries.flatMap(n=>n.topics))].sort((a,b)=>a.localeCompare(b,"ru")).forEach(t=>host.append(topicButton(t,t===activeTopic)));
}
// Stable organic shapes: one topic is a single uneven field of knowledge, not a sphere.
function clusterSeed(text){
 let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return ()=>{hash+=0x6D2B79F5;let t=Math.imul(hash^(hash>>>15),1|hash);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296};
}
function organicOutline(a,rng){
 const count=12,points=[];
 for(let i=0;i<count;i++){
  const angle=i*Math.PI*2/count;
  const radius=a.r*(.79+rng()*.35);
  points.push({x:a.x+Math.cos(angle)*radius,y:a.y+Math.sin(angle)*radius});
 }
 // Quadratic midpoint spline guarantees rounded joins without a polygonal outline.
 const mid=(p,q)=>({x:(p.x+q.x)/2,y:(p.y+q.y)/2});
 let first=mid(points[count-1],points[0]),path="M "+first.x.toFixed(2)+" "+first.y.toFixed(2);
 for(let i=0;i<count;i++){
  const next=mid(points[i],points[(i+1)%count]);
  path+=" Q "+points[i].x.toFixed(2)+" "+points[i].y.toFixed(2)+" "+next.x.toFixed(2)+" "+next.y.toFixed(2);
 }
 return path+" Z";
}
function drawKnowledgeCluster(group,a){
 const rng=clusterSeed(a.id),shape=organicOutline(a,rng);
 group.style.setProperty("--cluster-color",a.color);
 const haze=make("path",{d:shape,class:"cluster-haze",fill:a.color});
 const shell=make("path",{d:shape,class:"cluster-shell",fill:a.color});
 const sheen=make("path",{d:shape,class:"cluster-sheen",fill:"url(#node-gloss)"});
 group.append(haze,shell,sheen);
 const particles=[];
 const count=Math.min(21,6+Math.round(Math.sqrt(a.count)*5));
 for(let i=0;i<count;i++){
  const angle=rng()*Math.PI*2;
  const distance=Math.sqrt(rng())*a.r*.65;
  const x=a.x+Math.cos(angle)*distance,y=a.y+Math.sin(angle)*distance;
  particles.push({x,y});
 }
 // Fine threads inside each cluster, with a visible luminous center.
 const threads=make("g",{class:"cluster-threads"});
 for(let i=0;i<particles.length;i++){
  const p=particles[i],q=particles[(i+3)%particles.length];
  threads.append(make("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y}));
  if(i%2===0)threads.append(make("line",{x1:a.x,y1:a.y,x2:p.x,y2:p.y}));
 }
 group.append(threads);
 particles.forEach((p,i)=>{
  group.append(make("circle",{cx:p.x,cy:p.y,r:i%4===0?2.7:1.5,class:"cluster-spark"}));
 });
 group.append(make("circle",{cx:a.x,cy:a.y,r:4.1,class:"cluster-heart"}));
 const words=a.name.split(/\s+/),lines=[],maxChars=15;
 let line="";
 for(const word of words){const candidate=line?line+" "+word:word;if(line&&candidate.length>maxChars){lines.push(line);line=word}else line=candidate}
 if(line)lines.push(line);
 const font=11.5,leading=14,lineCount=lines.length,labelY=a.y+a.r*.84;
 const width=Math.max(70,Math.min(182,Math.max(...lines.map(s=>s.length))*font*.59+24));
 const height=lineCount*leading+15;
 const backing=make("rect",{x:a.x-width/2,y:labelY-height/2,width,height,rx:height/2,class:"cluster-label-bg"});
 group.append(backing);
 lines.forEach((word,i)=>{
  const t=make("text",{x:a.x,y:labelY+(i-(lineCount-1)/2)*leading+4,class:"cluster-label-text"});
  t.textContent=word;group.append(t);
 });
}
const gloss=make("radialGradient",{id:"node-gloss",cx:"33%",cy:"12%",r:"88%"});const bright=make("stop",{offset:"0%","stop-color":"white","stop-opacity":".52"});const fade=make("stop",{offset:"56%","stop-color":"white","stop-opacity":".09"});const end=make("stop",{offset:"100%","stop-color":"white","stop-opacity":"0"});gloss.append(bright,fade,end);$("#graph defs").append(gloss);
function show(section){if(section!=="map"&&document.body.classList.contains("map-fullscreen"))fullState(false);document.querySelectorAll(".page").forEach(e=>e.classList.toggle("hidden",e.id!==section+"-page"));document.querySelectorAll(".nav").forEach(e=>e.classList.toggle("active",e.dataset.view===section));$("#section-name").textContent={map:"Карта знаний",posts:"Публикации",about:"О проекте"}[section];closeMenu()}
document.querySelectorAll(".nav").forEach(e=>e.onclick=()=>{const reader=$("#post-reader");if(reader)reader.remove();$("#publication-list").classList.remove("hidden");show(e.dataset.view)});

function renderMarkdown(source){
 const root=document.createElement("div"),lines=String(source||"").replace(/\r\n?/g,"\n").split("\n");
 function inline(src,parent){
  const pattern=/(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|\*([^*\n]+)\*|_([^_\n]+)_)/g;
  let last=0,match;
  while((match=pattern.exec(src))){
   if(match.index>last)parent.append(document.createTextNode(src.slice(last,match.index)));
   let el;
   if(match[2]){el=document.createElement("a");el.href=match[3];el.rel="noopener noreferrer";el.target="_blank";el.textContent=match[2];}
   else if(match[4]||match[5]){el=document.createElement("strong");el.textContent=match[4]||match[5];}
   else if(match[6]){el=document.createElement("del");el.textContent=match[6];}
   else{el=document.createElement("em");el.textContent=match[7]||match[8];}
   parent.append(el);last=pattern.lastIndex;
  }
  if(last<src.length)parent.append(document.createTextNode(src.slice(last)));
 }
 let i=0;
 while(i<lines.length){
  const line=lines[i];
  if(!line.trim()){i++;continue;}
  const heading=line.match(/^(#{1,6})\s+(.+)$/);
  if(heading){const h=document.createElement("h"+heading[1].length);inline(heading[2],h);root.append(h);i++;continue;}
  if(/^[-*_]\s*[-*_]\s*[-*_]\s*$/.test(line)){root.append(document.createElement("hr"));i++;continue;}
  if(line.trim().startsWith("~~~")){
   const code=[];i++;while(i<lines.length&&!lines[i].trim().startsWith("~~~"))code.push(lines[i++]);
   if(i<lines.length)i++;const pre=document.createElement("pre"),c=document.createElement("code");c.textContent=code.join("\n");pre.append(c);root.append(pre);continue;
  }
  if(/^\s*>\s?/.test(line)){
   const quote=document.createElement("blockquote"),parts=[];
   while(i<lines.length&&/^\s*>\s?/.test(lines[i]))parts.push(lines[i++].replace(/^\s*>\s?/,""));
   const p=document.createElement("p");inline(parts.join(" "),p);quote.append(p);root.append(quote);continue;
  }
  const bullet=line.match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
  if(bullet){
   const ordered=/^\d/.test(bullet[1]),list=document.createElement(ordered?"ol":"ul");
   while(i<lines.length){
    const item=lines[i].match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
    if(!item||/^\d/.test(item[1])!==ordered)break;
    const li=document.createElement("li");inline(item[2],li);list.append(li);i++;
   }
   root.append(list);continue;
  }
  const parts=[];
  while(i<lines.length&&lines[i].trim()&&!/^(#{1,6}\s+|\s*>\s?|\s*([-+*]|\d+\.)\s+)/.test(lines[i]))parts.push(lines[i++].trim());
  if(!parts.length){i++;continue;}
  const p=document.createElement("p");inline(parts.join(" "),p);root.append(p);
 }
 return root;
}

function article(n){show("posts");let container=$("#post-reader");if(!container){container=document.createElement("article");container.id="post-reader";container.className="tile article-reader";$("#publication-list").before(container)}container.replaceChildren();const back=document.createElement("button");back.textContent="← К публикациям";back.className="article-back";back.onclick=()=>{container.remove();$("#publication-list").classList.remove("hidden")};const title=document.createElement("h2");title.textContent=n.title;const meta=document.createElement("p");meta.className="article-date";meta.textContent=n.date;
 const tagRow=document.createElement("div");tagRow.className="article-topics";n.topics.forEach(t=>tagRow.append(topicButton(t)));
 const body=document.createElement("div");body.className="article-body";body.append(renderMarkdown(n.body));container.append(back,title,meta,tagRow,body);$("#publication-list").classList.add("hidden");container.scrollIntoView({behavior:"smooth",block:"start"})}

// Fullscreen preview keeps readers within the graph instead of opening the publication page.
let previewTopic=null,previewEntry=null,previewDismissed=false;
const preview=$("#map-preview"),previewContent=$("#map-preview-content");
function previewClear(){
 previewTopic=null;previewEntry=null;previewDismissed=true;
 preview.classList.add("is-dismissed");
}
$("#map-preview-close").addEventListener("click",previewClear);
function previewShow(topic){
 previewTopic=topic;previewEntry=null;previewDismissed=false;
 preview.classList.remove("is-dismissed");renderPreview();
}
function previewRead(entry){
 previewEntry=entry;previewDismissed=false;
 preview.classList.remove("is-dismissed");renderPreview();
}
function previewText(tag,text,className){
 const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e;
}
function renderPreview(){
 previewContent.replaceChildren();
 if(!previewTopic && !previewEntry){
  previewContent.append(previewText("h2","Выберите область"),previewText("p","Нажмите на сферу, чтобы увидеть публикации по выбранному направлению."));
  return;
 }
 if(previewEntry){
  const back=document.createElement("button");back.type="button";back.className="preview-back";back.textContent="← Публикации по теме";
  back.addEventListener("click",()=>{previewEntry=null;renderPreview()});
  previewContent.append(back,previewText("h2",previewEntry.title),previewText("p",previewEntry.date,"preview-date"));
  const tags=document.createElement("div");tags.className="article-topics";
  previewEntry.topics.forEach(topic=>{
   const b=document.createElement("button");b.className="topic-chip";b.type="button";b.textContent=topic;
   b.addEventListener("click",()=>previewShow(topic));tags.append(b);
  });
  previewContent.append(tags);
  const body=document.createElement("div");body.className="preview-body";
  body.append(renderMarkdown(previewEntry.body));
  previewContent.append(body);
  return;
 }
 const matching=entries.filter(entry=>entry.topics.includes(previewTopic));
 previewContent.append(previewText("h2",previewTopic),previewText("p",matching.length+" публикаций по направлению","preview-count"));
 matching.forEach(entry=>{
  const card=document.createElement("article");card.className="preview-entry";
  card.append(previewText("small",entry.date));
  const button=document.createElement("button");button.type="button";button.className="preview-entry-title";button.textContent=entry.title;
  button.addEventListener("click",()=>previewRead(entry));
  card.append(button,previewText("p",entry.summary||"Открыть публикацию"));
  previewContent.append(card);
 });
}

function select(name){const a=areas.find(t=>t.name===name);if(!a)return;if(document.body.classList.contains("map-fullscreen"))previewShow(name);$("#area-title").textContent=name;const desc=$("#area-description");desc.replaceChildren();desc.append(document.createTextNode(a.count+" публикаций: "));entries.filter(n=>n.topics.includes(name)).forEach((n,i)=>{if(i)desc.append(document.createTextNode(" · "));const b=document.createElement("button");b.className="inline-link";b.textContent=n.title;b.onclick=()=>article(n);desc.append(b)});$("#area-chip").textContent="Опубликованная область";document.querySelectorAll(".node,.area-menu-item").forEach(e=>e.classList.toggle("active",e.dataset.id===name))}
// Cross-topic bridges are derived from explicit publication links, not guessed topical similarity.
function semanticTopicBridges(items,direct){
 const index=new Map(items.map(item=>[String(item.id),item]));
 const handled=new Set(),bridges=new Map();
 const words=text=>new Set(text.toLocaleLowerCase("ru").split(/[^а-яёa-z0-9]+/i).filter(w=>w.length>=4));
 const topicPair=(a,b)=>JSON.stringify([a,b].sort());
 for(const item of items){
  for(const linkedId of item.links||[]){
   const target=index.get(String(linkedId));
   if(!target||target===item)continue;
   const records=[String(item.id),String(target.id)].sort(),recordKey=JSON.stringify(records);
   if(handled.has(recordKey))continue;
   handled.add(recordKey);
   // The pair has one documented relation even when both publications link to one another.
   const pairs=[];
   for(const a of new Set(item.topics)){
    for(const b of new Set(target.topics)){
     if(a===b)continue;
     const key=topicPair(a,b);
     if(direct.has(key))continue; // Direct co-occurrence is the stronger existing connection.
     const common=[...words(a)].filter(word=>words(b).has(word)).length;
     pairs.push({a,b,key,common});
    }
   }
   if(!pairs.length)continue;
   // Prefer a meaningful shared term (e.g. Мышление → Системное мышление).
   // Fall back to one explicitly linked cross-topic bridge rather than flooding the network.
   pairs.sort((a,b)=>b.common-a.common||a.key.localeCompare(b.key,"ru"));
   const chosen=pairs[0];
   const previous=bridges.get(chosen.key)||{count:0,sources:[]};
   previous.count++;
   previous.sources.push([item.title,target.title]);
   bridges.set(chosen.key,previous);
  }
 }
 return bridges;
}

function draw(){const count=new Map(),rels=new Map();motionNodes.clear();motionEdges.length=0;hoveredNode=null;entries.forEach(n=>{const topics=[...new Set(n.topics)].sort();topics.forEach(t=>count.set(t,(count.get(t)||0)+1));topics.forEach((a,i)=>topics.slice(i+1).forEach(b=>{const key=JSON.stringify([a,b]);rels.set(key,(rels.get(key)||0)+1)}))});const semanticRels=semanticTopicBridges(entries,rels);const sorted=[...count].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"ru")),colors=["#7770e7","#29a69f","#5d90dc","#e99c70","#9075c7","#65ad87","#b675a9"];areas=sorted.map(([name,n],i)=>{const theta=-Math.PI/2+2*Math.PI*i/Math.max(1,sorted.length),ring=sorted.length===1?0:sorted.length<5?170:sorted.length<9?198:216;return{name,id:name,count:n,x:450+Math.cos(theta)*ring,y:270+Math.sin(theta)*ring*.87,r:Math.min(76,30+14*Math.sqrt(n)),color:colors[i%colors.length]}});const lookup=new Map(areas.map(a=>[a.name,a])),roots=["#nodes","#edges","#areas-menu"].map($);roots.forEach(r=>r.replaceChildren());$("#graph-empty").hidden=areas.length>0;$("#graph").style.visibility=areas.length?"visible":"hidden";$(".map-label").textContent="● Публичная карта · "+entries.length+" записей · "+areas.length+" областей";rels.forEach((n,key)=>{const pair=JSON.parse(key),a=lookup.get(pair[0]),b=lookup.get(pair[1]);if(a&&b){
 const index=motionEdges.length,group=make("g",{class:"neuron-edge"});
 const glow=make("path",{class:"neuron-edge-glow","stroke-width":Math.min(12,7+n*1.4)});
 const core=make("path",{class:"neuron-edge-core","stroke-width":Math.min(3.5,1.25+n*.55)});
 const synapse=make("circle",{class:"neuron-synapse",r:Math.min(3.6,2+n*.4)});
 const pulse=make("circle",{class:"neuron-pulse",r:2.8});
 group.append(glow,core,synapse,pulse);roots[1].append(group);
 const edge={group,glow,core,synapse,pulse,from:a.id,to:b.id,index};
 motionEdges.push(edge);updateNeuronEdge(edge,a,b,0,false);
}});
 semanticRels.forEach((info,key)=>{
  const pair=JSON.parse(key),a=lookup.get(pair[0]),b=lookup.get(pair[1]);
  if(!a||!b)return;
  const index=motionEdges.length,group=make("g",{class:"neuron-edge neuron-semantic"});
  const glow=make("path",{class:"neuron-edge-glow","stroke-width":6});
  const core=make("path",{class:"neuron-edge-core","stroke-width":1.75});
  const synapse=make("circle",{class:"neuron-synapse",r:2.5});
  const pulse=make("circle",{class:"neuron-pulse",r:2.4});
  const title=make("title");title.textContent="Связь через публикации: "+info.sources.map(pair=>pair.join(" ↔ ")).join("; ");
  group.append(title,glow,core,synapse,pulse);roots[1].append(group);
  const edge={group,glow,core,synapse,pulse,from:a.id,to:b.id,index};
  motionEdges.push(edge);updateNeuronEdge(edge,a,b,0,false);
 });
 areas.forEach(a=>{const g=make("g",{class:"node",tabindex:"0",role:"button","aria-label":a.name});g.dataset.id=a.id;drawKnowledgeCluster(g,a);g.onclick=()=>select(a.name);g.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(a.name)}};g.addEventListener("pointerenter",()=>{hoveredNode=a.id;highlightNeuronNetwork(a.id)});g.addEventListener("pointerleave",()=>{if(hoveredNode===a.id)hoveredNode=null;highlightNeuronNetwork(null)});g.addEventListener("focus",()=>highlightNeuronNetwork(a.id));g.addEventListener("blur",()=>highlightNeuronNetwork(null));roots[0].append(g);motionNodes.set(a.id,g);const b=document.createElement("button"),swatch=document.createElement("span");b.className="area-menu-item";b.dataset.id=a.id;swatch.className="swatch";swatch.style.background=a.color;b.append(swatch,document.createTextNode(a.name+" ("+a.count+")"));b.onclick=()=>{show("map");select(a.name)};roots[2].append(b)});startMotion()}
function renderPosts(){const list=$("#publication-list");list.replaceChildren();renderFilters();document.querySelector(".nav[data-view=posts] small").textContent=entries.length;
 const matches=activeTopic?entries.filter(n=>n.topics.includes(activeTopic)):entries;
 if(!matches.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=activeTopic?"По выбранному направлению публикаций пока нет.":"Публичных записей пока нет.";list.append(empty)}
 matches.forEach(n=>{const p=document.createElement("article");p.className="publication-item";const date=document.createElement("small");date.textContent=n.date;
 const button=document.createElement("button");button.textContent=n.title;button.className="publication-link";button.onclick=()=>article(n);
 const description=document.createElement("p");description.textContent=n.summary||"";
 const tags=document.createElement("div");tags.className="publication-topics";n.topics.forEach(t=>tags.append(topicButton(t,t===activeTopic)));
 p.append(date,button,description,tags);list.append(p)});
}
function transform(){$("#world").setAttribute("transform","translate("+dx+" "+dy+") scale("+scale+")")}
function zoom(f){scale=Math.max(.55,Math.min(2.5,scale*f));transform()}function reset(){scale=1;dx=dy=0;transform()}
$("#plus").onclick=()=>zoom(1.2);$("#minus").onclick=()=>zoom(1/1.2);$("#center").onclick=reset;$("#reset").onclick=()=>{reset();$("#search").value="";document.querySelectorAll(".node").forEach(n=>n.classList.remove("dim"))};$("#search").oninput=e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll(".node").forEach(n=>n.classList.toggle("dim",!!q&&!n.dataset.id.toLowerCase().includes(q)))};
const svg=$("#graph");svg.addEventListener("wheel",e=>{e.preventDefault();zoom(e.deltaY<0?1.08:1/1.08)},{passive:false});let drag=null;svg.onpointerdown=e=>{if(e.target.closest(".node"))return;drag={x:e.clientX,y:e.clientY};svg.setPointerCapture(e.pointerId)};svg.onpointermove=e=>{if(!drag)return;const rect=svg.getBoundingClientRect();dx+=(e.clientX-drag.x)*900/rect.width;dy+=(e.clientY-drag.y)*540/rect.height;drag={x:e.clientX,y:e.clientY};transform()};svg.onpointerup=svg.onpointercancel=()=>drag=null;
const side=$("#sidebar"),scrim=$("#scrim");
const desktopToggle=$("#sidebar-toggle");
function sidebarState(collapsed){
 document.body.classList.toggle("sidebar-collapsed",collapsed);
 desktopToggle.setAttribute("aria-expanded",String(!collapsed));
 desktopToggle.setAttribute("aria-label",collapsed?"Показать боковую панель":"Скрыть боковую панель");
 desktopToggle.title=collapsed?"Показать панель":"Скрыть панель";
 desktopToggle.querySelector(".toggle-label").textContent=collapsed?"Показать панель":"Скрыть панель";
 desktopToggle.querySelector(".toggle-icon").textContent=collapsed?"◨":"◧";
 try{localStorage.setItem("aod-sidebar-collapsed",String(collapsed))}catch(e){}
}
let collapsePref=false;try{collapsePref=localStorage.getItem("aod-sidebar-collapsed")==="true"}catch(e){}
sidebarState(collapsePref);
desktopToggle.onclick=()=>sidebarState(!document.body.classList.contains("sidebar-collapsed"));
const fab=$("#panel-fab");
function updateFab(){
 const collapsed=document.body.classList.contains("sidebar-collapsed");
 fab.setAttribute("aria-expanded",String(!collapsed));
 fab.setAttribute("aria-label",collapsed?"Показать панель":"Скрыть панель");
 fab.title=collapsed?"Показать панель":"Скрыть панель";
 fab.querySelector(".fab-icon").textContent=collapsed?"›":"‹";
}
const originalSidebarState=sidebarState;
sidebarState=function(collapsed){originalSidebarState(collapsed);updateFab()};
fab.onclick=()=>sidebarState(!document.body.classList.contains("sidebar-collapsed"));
updateFab();

const fullscreenButton=$("#fullscreen");
function fullState(on){
 if(on){previewDismissed=false;preview.classList.remove("is-dismissed");renderPreview();}
 document.body.classList.toggle("map-fullscreen",on);
 fullscreenButton.setAttribute("aria-pressed",String(on));
 fullscreenButton.setAttribute("aria-label",on?"Свернуть карту":"Развернуть карту на весь экран");
 fullscreenButton.title=on?"Вернуться к странице":"Развернуть карту на весь экран";
 fullscreenButton.textContent=on?"✕":"⛶";
}
fullscreenButton.onclick=()=>fullState(!document.body.classList.contains("map-fullscreen"));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("map-fullscreen"))fullState(false)});
function closeMenu(){side.classList.remove("open");scrim.classList.remove("show")}$("#menu").onclick=()=>{side.classList.add("open");scrim.classList.add("show")};scrim.onclick=closeMenu;
function theme(v){document.documentElement.dataset.theme=v;$("#theme").textContent=v==="dark"?"☀":"☾";try{localStorage.setItem("architecture-theme",v)}catch(e){}}let mode="light";try{mode=localStorage.getItem("architecture-theme")||"light"}catch(e){}theme(mode);$("#theme").onclick=()=>theme(document.documentElement.dataset.theme==="dark"?"light":"dark");$("#year").textContent=new Date().getFullYear();
(async()=>{try{const response=await fetch("./data/content.json",{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);const data=await response.json();entries=(data.entries||[]).filter(n=>n&&typeof n.id==="string"&&Array.isArray(n.topics)&&typeof n.body==="string");draw();renderPosts();renderPreview()}catch(error){$("#graph-empty").hidden=false;$("#graph").style.visibility="hidden";$("#graph-empty").querySelector("h2").textContent="Ошибка загрузки карты";$("#graph-empty").querySelector("p").textContent="Проверь файл data/content.json.";console.error(error)}})();