// Build a public-only manifest from entries/*.md. No third-party dependencies.
const fs = require('node:fs');
const path = require('node:path');
const folder = path.join(__dirname, '..', 'entries');
const output = path.join(__dirname, '..', 'data', 'content.json');
function scalar(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}
function parse(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!match) throw new Error('Missing YAML frontmatter');
  const metadata = {};
  let list = null;
  match[1].split(/\r?\n/).forEach(line => {
    const property = line.match(/^([a-z_]+):\s*(.*?)\s*$/i);
    if (property) {
      const key = property[1], value = property[2];
      if (value === '[]') { metadata[key] = []; list = key; }
      else if (value === '') { metadata[key] = []; list = key; }
      else { metadata[key] = scalar(value); list = null; }
    } else {
      const bullet = line.match(/^\s+-\s+(.+?)\s*$/);
      if (bullet && list) metadata[list].push(scalar(bullet[1]));
      else if (line.trim() && !line.trim().startsWith('#')) throw new Error('Unsupported frontmatter: ' + line);
    }
  });
  return { metadata, body: source.slice(match[0].length).trim() };
}
const entries = [];
if (fs.existsSync(folder)) {
  for (const file of fs.readdirSync(folder).filter(f => f.endsWith('.md')).sort()) {
    const { metadata: m, body } = parse(fs.readFileSync(path.join(folder, file), 'utf8'));
    // Fail closed: only explicitly published public entries can enter the site.
    if (m.status !== 'published' || m.visibility !== 'public') continue;
    if (!/^[a-zA-Z0-9_-]+$/.test(String(m.id || ''))) throw new Error(file + ': invalid id');
    if (typeof m.title !== 'string' || !m.title) throw new Error(file + ': missing title');
    if (!Array.isArray(m.topics) || !m.topics.length) throw new Error(file + ': topics must be a list');
    if (!Array.isArray(m.links || [])) throw new Error(file + ': links must be a list');
    entries.push({
      id: String(m.id), title: m.title, date: String(m.date || ''),
      summary: String(m.summary || ''), topics: [...new Set(m.topics.map(String))],
      links: [...new Set((m.links || []).map(String))], body
    });
  }
}
const ids = new Set();
for (const item of entries) {
  if (ids.has(item.id)) throw new Error('Duplicate id: ' + item.id);
  ids.add(item.id);
}
for (const entry of entries) entry.links = entry.links.filter(id => ids.has(id) && id !== entry.id);
entries.sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output, JSON.stringify({version:1, entries}, null, 2) + '\n');
console.log('Published', entries.length, 'public entries');


// Separate public project cases. Projects are never counted as ordinary posts.
const projectFolder=path.join(__dirname,'..','projects');
const projectOutput=path.join(__dirname,'..','data','projects.json');
const projects=[];
if(fs.existsSync(projectFolder)){
 for(const filename of fs.readdirSync(projectFolder).filter(f=>f.endsWith('.md')).sort()){
  const {metadata:m,body}=parse(fs.readFileSync(path.join(projectFolder,filename),'utf8'));
  if(m.status!=='published'||m.visibility!=='public')continue;
  if(!/^[a-zA-Z0-9_-]+$/.test(String(m.id||'')))throw new Error(filename+': invalid project id');
  if(typeof m.title!=='string'||!m.title)throw new Error(filename+': missing project title');
  if(!Array.isArray(m.topics)||!m.topics.length)throw new Error(filename+': missing topics');
  projects.push({id:String(m.id),title:m.title,date:String(m.date||''),summary:String(m.summary||''),stage:String(m.stage||''),role:String(m.role||''),topics:[...new Set(m.topics.map(String))],links:[...new Set((m.links||[]).map(String))].filter(id=>ids.has(id)),body});
 }
}
if(new Set(projects.map(p=>p.id)).size!==projects.length)throw new Error('Duplicate public project IDs');
projects.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
fs.writeFileSync(projectOutput,JSON.stringify({version:1,projects},null,2)+'\n');
console.log('Published',projects.length,'public projects');
