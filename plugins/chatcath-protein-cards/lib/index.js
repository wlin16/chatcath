import { defineTool } from '@deepseek-ai/dsh-tools'
import { readFile } from 'node:fs/promises'

export const name = 'chatcath-protein-cards'
export const inject = ['tools', 'webServer']

const AA = { ALA:'A', ARG:'R', ASN:'N', ASP:'D', CYS:'C', GLN:'Q', GLU:'E', GLY:'G', HIS:'H', ILE:'I', LEU:'L', LYS:'K', MET:'M', PHE:'F', PRO:'P', SER:'S', THR:'T', TRP:'W', TYR:'Y', VAL:'V' }
const calls = new Map()
const entries = new Map()
const texts = new Map()

function parsePdb(text, path) {
  const d = { id: 'pdb:' + path, path, name: path.split('/').pop().replace(/\.pdb$/i, '').toUpperCase(), title: '', organism: '', method: '', resolution: null, chains: [], atoms: [] }
  const chains = new Map(), sources = []
  for (const line of text.split(/\r?\n/)) {
    const rec = line.slice(0, 6).trim()
    if (rec === 'TITLE') d.title += (d.title ? ' ' : '') + line.slice(10).trim()
    else if (rec === 'SOURCE') sources.push(line.slice(10).trim())
    else if (rec === 'EXPDTA') d.method = line.slice(10).split(';')[0].trim()
    else if (rec === 'REMARK') { const m = line.match(/RESOLUTION\.?\s+([\d.]+)\s+ANGSTROM/i); if (m) d.resolution = +m[1] }
    else if (rec === 'ATOM') {
      const chain = line.slice(21,22).trim() || 'A', resSeq = +line.slice(22,26), resName = line.slice(17,20).trim(), atom = line.slice(12,16).trim()
      const x = +line.slice(30,38), y = +line.slice(38,46), z = +line.slice(46,54)
      if (!Number.isFinite(resSeq + x + y + z)) continue
      d.atoms.push({ chain, resSeq, atom, x, y, z })
      if (atom === 'CA' && AA[resName]) {
        if (!chains.has(chain)) chains.set(chain, [])
        if (!chains.get(chain).some(r => r.resSeq === resSeq)) chains.get(chain).push({ resSeq, aa: AA[resName], x, y, z })
      }
    }
  }
  const org = sources.join(' ').match(/ORGANISM_SCIENTIFIC:\s*([^;]+)/i)
  if (org) d.organism = org[1]
  d.chains = [...chains].map(([chainId, residues]) => ({ chainId, n: residues.length, residues }))
  d.total = d.chains.reduce((n, c) => n + c.n, 0)
  return d
}

function interfaceResidues(d, antigen, antibody, cutoff) {
  const a = d.atoms.filter(x => antigen.includes(x.chain) && !x.atom.startsWith('H'))
  const b = d.atoms.filter(x => antibody.includes(x.chain) && !x.atom.startsWith('H'))
  const out = new Set(), limit = cutoff * cutoff
  for (const x of a) for (const y of b) {
    const dx=x.x-y.x, dy=x.y-y.y, dz=x.z-y.z
    if (dx*dx+dy*dy+dz*dz <= limit) { out.add(`${x.chain}:${x.resSeq}`); break }
  }
  return [...out].map(v => { const [chain, n] = v.split(':'); return { chain, resSeq:+n } })
}

async function description(d) {
  try {
    const response = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${d.name}`)
    if (!response.ok) return d.title
    const j = await response.json(), lines = []
    if (j.struct?.title) lines.push(j.struct.title)
    if (j.struct_keywords?.pdbx_keywords) lines.push(`关键词：${j.struct_keywords.pdbx_keywords}`)
    if (j.citation?.[0]?.title) lines.push(`文献：${j.citation[0].title}`)
    return lines.join('\n') || d.title
  } catch { return d.title }
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' })
  res.end(JSON.stringify(value))
}

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'protein_cards',
    description: '渲染 PDB；render 必填。支持 antigenChains、antibodyChains、surface/cartoon、epitopeMode=interface-distance、distance、epitopeColor、epitopeResidues。无样式传空对象。后续修改必须继承上一版 render 并增量合并。',
    parameters: {
      paths: { type:'array', required:true, items:{ type:'string' } },
      render: { type:'json', required:true }
    },
    output: {
      schema: { type:'object', additionalProperties:true },
      render: (_a, v) => [{ type:'text', text:`蛋白卡片：${v.files.join('、')}；渲染位点 ${v.residueCount}` }]
    },
    async execute(args, execution) {
      const ids=[], files=[]; let residueCount=0
      for (const path of args.paths) {
        const text = await readFile(path, 'utf8'), d = parsePdb(text, path), r = args.render || {}
        const antigen = r.antigenChains || [], antibody = r.antibodyChains || []
        const selected = r.epitopeResidues || (r.epitopeMode === 'interface-distance' ? interfaceResidues(d, antigen, antibody, r.distance || 5) : [])
        d.style = { antigenChains:antigen, antibodyChains:antibody, antigenRepresentation:r.antigenRepresentation || 'surface', antibodyRepresentation:r.antibodyRepresentation || 'cartoon', epitopeColor:r.epitopeColor || '#ff0000', epitopeResidues:selected }
        d.description = await description(d); delete d.atoms
        entries.set(d.id, d); texts.set(d.id, text); ids.push(d.id); files.push(d.name); residueCount += selected.length
      }
      calls.set(execution.callId, ids)
      return { files, residueCount }
    }
  }))

  const routes = [
    { kind:'prefix', path:'/api/protein-cards/call/', handler(req,res) { if (req.method !== 'GET') return json(res,405,{error:'method'}); const callId=decodeURIComponent(req.url.slice('/api/protein-cards/call/'.length).split('?')[0]); json(res,200,{entries:(calls.get(callId)||[]).map(id=>entries.get(id)).filter(Boolean)}) } },
    { kind:'prefix', path:'/api/protein-cards/text/', handler(req,res) { if (req.method !== 'GET') return json(res,405,{error:'method'}); const id=decodeURIComponent(req.url.slice('/api/protein-cards/text/'.length).split('?')[0]); const text=texts.get(id); if (text===undefined) return json(res,404,{error:'missing'}); json(res,200,{text}) } }
  ]
  ctx.effect(() => { const dispose = routes.map(r => ctx.webServer.register(r)); return () => dispose.forEach(f => f()) })
}
