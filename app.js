const $=q=>document.querySelector(q),ns="http://www.w3.org/2000/svg",make=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
let entries=[],areas=[],scale=1,dx=0,dy=0,activeTopic=null;
// Gentle node movement: keep every SVG edge connected to its moving circles.
const motionNodes=new Map(),motionEdges=[],reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
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
 motionEdges.forEach(({line,from,to})=>{
  const a=position.get(from),b=position.get(to);
  if(a&&b){line.setAttribute("x1",a.x);line.setAttribute("y1",a.y);line.setAttribute("x2",b.x);line.setAttribute("y2",b.y)}
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
function fitNodeLabels(group,a){
 // Line wrapping is based on available circle diameter; exact SVG lengths are measured after insertion.
 const maxWidth=a.r*1.55,words=a.name.trim().split(/\s+/),lines=[];
 let line="";
 for(const word of words){
  const test=line?line+" "+word:word;
  if(line&&test.length>Math.max(7,Math.floor(maxWidth/7))){lines.push(line);line=word;}else line=test;
 }
 if(line)lines.push(line);
 const fontSize=Math.max(9,Math.min(13,a.r*.27));
 const lineHeight=fontSize*1.22;
 lines.forEach((str,i)=>{const t=make("text",{x:a.x,y:a.y+(i-(lines.length-1)/2)*lineHeight+fontSize*.34,"font-size":fontSize});t.textContent=str;group.append(t);
  t.style.fontSize=fontSize+"px";const estimated=str.length*fontSize*.60;if(estimated>maxWidth){t.setAttribute("textLength",maxWidth);t.setAttribute("lengthAdjust","spacingAndGlyphs");}
 });
}

const gloss=make("radialGradient",{id:"node-gloss",cx:"33%",cy:"12%",r:"88%"});const bright=make("stop",{offset:"0%","stop-color":"white","stop-opacity":".52"});const fade=make("stop",{offset:"56%","stop-color":"white","stop-opacity":".09"});const end=make("stop",{offset:"100%","stop-color":"white","stop-opacity":"0"});gloss.append(bright,fade,end);$("#graph defs").append(gloss);
function show(section){if(section!=="map"&&document.body.classList.contains("map-fullscreen"))fullState(false);document.querySelectorAll(".page").forEach(e=>e.classList.toggle("hidden",e.id!==section+"-page"));document.querySelectorAll(".nav").forEach(e=>e.classList.toggle("active",e.dataset.view===section));$("#section-name").textContent={map:"Карта знаний",posts:"Публикации",about:"О проекте"}[section];closeMenu()}
document.querySelectorAll(".nav").forEach(e=>e.onclick=()=>{const reader=$("#post-reader");if(reader)reader.remove();$("#publication-list").classList.remove("hidden");show(e.dataset.view)});
function article(n){show("posts");let container=$("#post-reader");if(!container){container=document.createElement("article");container.id="post-reader";container.className="tile article-reader";$("#publication-list").before(container)}container.replaceChildren();const back=document.createElement("button");back.textContent="← К публикациям";back.className="article-back";back.onclick=()=>{container.remove();$("#publication-list").classList.remove("hidden")};const title=document.createElement("h2");title.textContent=n.title;const meta=document.createElement("p");meta.className="article-date";meta.textContent=n.date;
 const tagRow=document.createElement("div");tagRow.className="article-topics";n.topics.forEach(t=>tagRow.append(topicButton(t)));
 const body=document.createElement("div");body.className="article-body";n.body.split(/\r?\n/).forEach(s=>{if(!s.trim())return;const heading=s.match(/^(#{1,4})\s+(.*)/);const line=document.createElement(heading?"h"+Math.min(4,heading[1].length+1):"p");line.textContent=heading?heading[2]:s;body.append(line)});container.append(back,title,meta,tagRow,body);$("#publication-list").classList.add("hidden");container.scrollIntoView({behavior:"smooth",block:"start"})}
function select(name){const a=areas.find(t=>t.name===name);if(!a)return;$("#area-title").textContent=name;const desc=$("#area-description");desc.replaceChildren();desc.append(document.createTextNode(a.count+" публикаций: "));entries.filter(n=>n.topics.includes(name)).forEach((n,i)=>{if(i)desc.append(document.createTextNode(" · "));const b=document.createElement("button");b.className="inline-link";b.textContent=n.title;b.onclick=()=>article(n);desc.append(b)});$("#area-chip").textContent="Опубликованная область";document.querySelectorAll(".node,.area-menu-item").forEach(e=>e.classList.toggle("active",e.dataset.id===name))}
function draw(){const count=new Map(),rels=new Map();motionNodes.clear();motionEdges.length=0;entries.forEach(n=>{const topics=[...new Set(n.topics)].sort();topics.forEach(t=>count.set(t,(count.get(t)||0)+1));topics.forEach((a,i)=>topics.slice(i+1).forEach(b=>{const key=JSON.stringify([a,b]);rels.set(key,(rels.get(key)||0)+1)}))});const sorted=[...count].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"ru")),colors=["#7770e7","#29a69f","#5d90dc","#e99c70","#9075c7","#65ad87","#b675a9"];areas=sorted.map(([name,n],i)=>{const theta=-Math.PI/2+2*Math.PI*i/Math.max(1,sorted.length),ring=sorted.length===1?0:sorted.length<5?170:sorted.length<9?198:216;return{name,id:name,count:n,x:450+Math.cos(theta)*ring,y:270+Math.sin(theta)*ring*.87,r:Math.min(76,30+14*Math.sqrt(n)),color:colors[i%colors.length]}});const lookup=new Map(areas.map(a=>[a.name,a])),roots=["#nodes","#edges","#areas-menu"].map($);roots.forEach(r=>r.replaceChildren());$("#graph-empty").hidden=areas.length>0;$("#graph").style.visibility=areas.length?"visible":"hidden";$(".map-label").textContent="● Публичная карта · "+entries.length+" записей · "+areas.length+" областей";rels.forEach((n,key)=>{const pair=JSON.parse(key),a=lookup.get(pair[0]),b=lookup.get(pair[1]);if(a&&b){const line=make("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,"stroke-width":Math.min(5,2+n)});roots[1].append(line);motionEdges.push({line,from:a.id,to:b.id})}});areas.forEach(a=>{const g=make("g",{class:"node",tabindex:"0",role:"button","aria-label":a.name});g.dataset.id=a.id;g.append(make("circle",{cx:a.x,cy:a.y,r:a.r+8,fill:a.color,opacity:".13"}),make("circle",{class:"primary",cx:a.x,cy:a.y,r:a.r,fill:a.color}),make("ellipse",{class:"glass-highlight",cx:a.x-a.r*.12,cy:a.y-a.r*.28,rx:a.r*.77,ry:a.r*.64}),make("circle",{class:"glass-rim",cx:a.x,cy:a.y,r:a.r-2}));fitNodeLabels(g,a);g.onclick=()=>select(a.name);g.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(a.name)}};g.addEventListener("pointerenter",()=>hoveredNode=a.id);g.addEventListener("pointerleave",()=>{if(hoveredNode===a.id)hoveredNode=null});roots[0].append(g);motionNodes.set(a.id,g);const b=document.createElement("button"),swatch=document.createElement("span");b.className="area-menu-item";b.dataset.id=a.id;swatch.className="swatch";swatch.style.background=a.color;b.append(swatch,document.createTextNode(a.name+" ("+a.count+")"));b.onclick=()=>{show("map");select(a.name)};roots[2].append(b)});startMotion()}
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
 fab.querySelector(".fab-icon").textContent=collapsed?"❯":"❮";
 fab.querySelector(".fab-text").textContent=collapsed?"Показать панель":"Скрыть панель";
}
const originalSidebarState=sidebarState;
sidebarState=function(collapsed){originalSidebarState(collapsed);updateFab()};
fab.onclick=()=>sidebarState(!document.body.classList.contains("sidebar-collapsed"));
updateFab();

const fullscreenButton=$("#fullscreen");
function fullState(on){
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
(async()=>{try{const response=await fetch("./data/content.json",{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);const data=await response.json();entries=(data.entries||[]).filter(n=>n&&typeof n.id==="string"&&Array.isArray(n.topics)&&typeof n.body==="string");draw();renderPosts()}catch(error){$("#graph-empty").hidden=false;$("#graph").style.visibility="hidden";$("#graph-empty").querySelector("h2").textContent="Ошибка загрузки карты";$("#graph-empty").querySelector("p").textContent="Проверь файл data/content.json.";console.error(error)}})();