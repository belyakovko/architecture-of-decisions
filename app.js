// Иллюстративная карта: опубликованных записей пока нет.
const areas=[
{id:"thinking",label:"Системное мышление",x:390,y:245,r:83,color:"#416f88",description:"Как формируются принципы, причинно-следственные связи и способы принятия решений."},
{id:"analytics",label:"Аналитика",x:172,y:150,r:67,color:"#3d8c87",description:"От данных и наблюдений — к выводам, гипотезам и действиям."},
{id:"technology",label:"Технологии",x:614,y:145,r:66,color:"#806da9",description:"Выбор инструментов и архитектуры под реальные задачи."},
{id:"management",label:"Управление",x:207,y:383,r:58,color:"#af8059",description:"Решения, команды, ответственность и результаты."},
{id:"economics",label:"Экономика",x:586,y:399,r:57,color:"#568cac",description:"Ценность, эффективность, ограничения и экономический результат."},
{id:"learning",label:"Развитие",x:400,y:465,r:42,color:"#6e956d",description:"Книги, опыт, ошибки и пересмотр взглядов."}
];
const relations=[["thinking","analytics"],["thinking","technology"],["thinking","management"],["thinking","economics"],["thinking","learning"],["analytics","economics"],["technology","management"],["management","economics"],["learning","analytics"]];
const ns="http://www.w3.org/2000/svg",byId=new Map(areas.map(x=>[x.id,x])),create=(tag,attrs)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
const edgeRoot=document.getElementById("edges"),nodeRoot=document.getElementById("nodes"),detail=document.getElementById("detail");
relations.forEach(([a,b])=>{const p=byId.get(a),q=byId.get(b);edgeRoot.appendChild(create("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y}));});
areas.forEach(area=>{const g=create("g",{class:"node",tabindex:"0",role:"button","aria-label":area.label});g.appendChild(create("circle",{cx:area.x,cy:area.y,r:area.r,fill:area.color}));area.label.split(" ").forEach((word,i,words)=>{const t=create("text",{x:area.x,y:area.y+(i-(words.length-1)/2)*17+4});t.textContent=word;g.appendChild(t);});const show=()=>{document.querySelectorAll(".node").forEach(n=>n.classList.remove("active"));g.classList.add("active");detail.replaceChildren();const tag=document.createElement("span");tag.className="eyebrow";tag.textContent="ОБЛАСТЬ ЗНАНИЙ";const title=document.createElement("h2");title.textContent=area.label;const p=document.createElement("p");p.textContent=area.description+" Публичные материалы появятся после отдельного утверждения.";detail.append(tag,title,p);};g.addEventListener("click",show);g.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();show();}});nodeRoot.appendChild(g);});
document.getElementById("year").textContent=new Date().getFullYear();