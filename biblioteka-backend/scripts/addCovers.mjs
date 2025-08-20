#!/usr/bin/env node
import 'dotenv/config';

/**
 * set-covers-no-keys.mjs
 *
 * ✅ Bez API ključeva – koristi javne izvore:
 *   - Open Library (search + covers)
 *   - Gutendex (Project Gutenberg)
 *   - Internet Archive (advancedsearch + services/img)
 *   - Wikipedia (en + sr, MediaWiki API, pageimages)
 * 🖼  Ako ništa pouzdano ne nađe → generiše SVG omot (data URI) ili placehold.co URL.
 *
 * Login na tvoj backend:
 *   - API_BASE (env ili CLI arg 1)
 *   - ADMIN_EMAIL (env ili CLI arg 2)
 *   - ADMIN_PASSWORD (env ili CLI arg 3)
 *
 * Upotreba:
 *   node set-covers-no-keys.mjs [API_BASE] [ADMIN_EMAIL] [ADMIN_PASSWORD]
 *     [--max=200] [--delay-ms=250] [--min-score=0.86]
 *     [--sources=openlib,gutendex,archive,wikipedia]
 *     [--fallback=svg|placehold] [--update-all] [--dry-run]
 *
 * Primer:
 *   node set-covers-no-keys.mjs http://localhost:4000/api admin@example.com Secret123 \
 *     --sources=openlib,gutendex,archive,wikipedia --min-score=0.88 --delay-ms=300
 */

// -------------------- CLI + ENV --------------------
const argv = process.argv.slice(2);
const CLI_API_BASE = argv[0] && !argv[0].startsWith('-') ? argv.shift() : null;
const CLI_EMAIL    = argv[0] && !argv[0].startsWith('-') ? argv.shift() : null;
const CLI_PASSWORD = argv[0] && !argv[0].startsWith('-') ? argv.shift() : null;

const API_BASE  = CLI_API_BASE  || process.env.API_BASE  || 'http://localhost:4000/api';
const EMAIL     = CLI_EMAIL     || process.env.ADMIN_EMAIL;
const PASSWORD  = CLI_PASSWORD  || process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("❌ Nedostaju admin kredencijali. Prosledi [ADMIN_EMAIL] [ADMIN_PASSWORD] ili ih stavi u .env (ADMIN_EMAIL/ADMIN_PASSWORD).");
  process.exit(1);
}

const opts = {
  max: Infinity,
  delayMs: 250,
  minScore: 0.86,
  sources: ['openlib', 'gutendex', 'archive', 'wikipedia'], // redosled pokušaja
  fallback: 'svg', // svg | placehold
  dryRun: false,
  updateAll: false,
};
for (const a of argv) {
  if (a.startsWith('--max=')) opts.max = Number(a.slice(6)) || Infinity;
  else if (a.startsWith('--delay-ms=')) opts.delayMs = Number(a.slice(11)) || 250;
  else if (a.startsWith('--min-score=')) opts.minScore = Math.max(0, Math.min(1, Number(a.slice(12)) || 0.86));
  else if (a.startsWith('--sources=')) opts.sources = a.slice(10).split(',').map(s => s.trim()).filter(Boolean);
  else if (a.startsWith('--fallback=')) { const f=a.slice(11); if (['svg','placehold'].includes(f)) opts.fallback = f; }
  else if (a === '--dry-run') opts.dryRun = true;
  else if (a === '--update-all') opts.updateAll = true;
}

// -------------------- Helpers --------------------
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url, init={}) {
  const res = await fetch(url, init);
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(`[${res.status}] ${data?.error || res.statusText}`);
  return data;
}
async function headOk(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; }
  catch { return false; }
}
function deaccent(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function normalize(s){ return deaccent(String(s||'').toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function tokens(s){ return Array.from(new Set(normalize(s).split(' ').filter(Boolean))); }
function lastName(author){ const t = tokens(author); return t.length ? t[t.length - 1] : ''; }
function jaccard(aTokens,bTokens){ const a=new Set(aTokens), b=new Set(bTokens); let i=0; for (const x of a) if (b.has(x)) i++; const u=a.size+b.size-i; return u===0?0:i/u; }
function extractYear(s){ const m=String(s||'').match(/\b(18|19|20|21)\d{2}\b/); return m?Number(m[0]):null; }
function isPlaceholder(url){
  if (!url) return true;
  try { const h = new URL(url).host.toLowerCase(); return h.includes('placehold.co') || h.includes('via.placeholder.com'); }
  catch { return true; }
}
function scoreMatch({ qTitle, qAuthor, qYear, cTitle, cAuthors, cYear }) {
  const tScore = jaccard(tokens(qTitle), tokens(cTitle));
  const qLast = lastName(qAuthor);
  const cLast = cAuthors && cAuthors.length ? lastName(cAuthors[0]) : '';
  let aScore = 0;
  if (qLast && cLast && qLast === cLast) aScore = 1;
  else aScore = jaccard(tokens(qAuthor), tokens((cAuthors || []).join(' ')));
  let score = 0.7 * tScore + 0.3 * aScore;
  if (qYear && cYear && Math.abs(qYear - cYear) > 2) score -= 0.2;
  return Math.max(0, Math.min(1, score));
}

// -------------------- Sources (no keys) --------------------
// 1) Open Library
async function srcOpenLib(title, author){
  const qs = new URLSearchParams({ title, author, limit: '5' });
  const url = `https://openlibrary.org/search.json?${qs.toString()}`;
  const data = await fetchJson(url);
  const docs = data?.docs || [];
  const out = [];
  for (const d of docs) {
    const cYear = d.first_publish_year || null;
    let img = null;
    const isbn = (d.isbn && d.isbn[0]) || null;
    if (isbn) img = `https://covers.openlibrary.org/b/ISBN/${encodeURIComponent(isbn)}-L.jpg`;
    else if (d.cover_i) img = `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`;
    if (img) out.push({ source: 'openlib', title: d.title || '', authors: d.author_name || [], year: cYear, image: img });
  }
  return out;
}

// 2) Gutendex (Project Gutenberg)
async function srcGutendex(title, author){
  const url = `https://gutendex.com/books?search=${encodeURIComponent(`${title} ${author}`)}`;
  const data = await fetchJson(url);
  const items = data?.results || [];
  const out = [];
  for (const it of items) {
    const img = it?.formats?.['image/jpeg'] || null;
    if (!img) continue;
    const a = it?.authors?.map(a => a.name) || [];
    const y = extractYear(it?.download_count ? null : it?.copyright ? null : it?.release_date) || null;
    out.push({ source: 'gutendex', title: it.title || '', authors: a, year: y, image: img });
  }
  return out;
}

// 3) Internet Archive
async function srcArchive(title, author){
  const q = `title:("${title}") AND creator:("${author}")`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&rows=5&output=json`;
  const data = await fetchJson(url);
  const docs = data?.response?.docs || [];
  const out = [];
  for (const d of docs) {
    const id = d.identifier;
    if (!id) continue;
    const img = `https://archive.org/services/img/${encodeURIComponent(id)}`;
    out.push({ source: 'archive', title: d.title || '', authors: Array.isArray(d.creator) ? d.creator : [d.creator].filter(Boolean), year: null, image: img });
  }
  return out;
}

// 4) Wikipedia (en + sr)
async function wikiSearchOnce(lang, title, author) {
  const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
  const s = `${title} ${author} (book)`;
  const qs = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: s,
    srlimit: '3',
    format: 'json',
    origin: '*'
  });
  const search = await fetchJson(`${endpoint}?${qs.toString()}`);
  const hits = search?.query?.search || [];
  if (hits.length === 0) return [];
  const pageids = hits.map(h => h.pageid).filter(Boolean);
  const qs2 = new URLSearchParams({
    action: 'query',
    prop: 'pageimages',
    pageids: pageids.join('|'),
    piprop: 'original',
    format: 'json',
    origin: '*'
  });
  const pages = await fetchJson(`${endpoint}?${qs2.toString()}`);
  const out = [];
  for (const pid of pageids) {
    const p = pages?.query?.pages?.[pid];
    const img = p?.original?.source || null;
    if (img) {
      out.push({ source: `wikipedia-${lang}`, title: p?.title || '', authors: [], year: null, image: img });
    }
  }
  return out;
}
async function srcWikipedia(title, author) {
  const langs = ['en', 'sr'];
  let out = [];
  for (const L of langs) {
    try { const part = await wikiSearchOnce(L, title, author); out = out.concat(part); }
    catch {}
  }
  return out;
}

// -------------------- Backend API --------------------
async function login() {
  const data = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const token = data?.data?.token ?? data?.token ?? data?.data?.user?.token;
  if (!token) throw new Error("Nisam uspeo da izvučem token iz /auth/login odgovora.");
  return token;
}
async function getAllBooks(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const limit = 100;
  let page = 1, out = [];
  while (true) {
    const data = await fetchJson(`${API_BASE}/books?page=${page}&limit=${limit}`, { headers });
    const payload = data?.data ?? data;
    const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(data) ? data : []);
    const normalized = items.map(b => ({ ...b, id: b.id ?? b._id }));
    out = out.concat(normalized);
    const total = Number(payload?.total ?? normalized.length);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page >= totalPages) break;
    page++;
    await sleep(80);
  }
  return out;
}
async function patchBookImage(token, id, image) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const res = await fetch(`${API_BASE}/books/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ image })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`PATCH /books/${id} failed: [${res.status}] ${t}`);
  }
}

// -------------------- Fallback (SVG / placehold) --------------------
function escapeXml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }
function wrapText(str, max){ const w=String(str).split(/\s+/); const lines=[]; let line=''; for(const t of w){ if((line+' '+t).trim().length<=max){ line=(line?line+' ':'')+t; } else { if(line) lines.push(line); line=t; } } if(line) lines.push(line); return lines; }
function svgCover({ title, author, year }){
  const W=600,H=900;
  const titleLines=wrapText(title||'Untitled', 18).slice(0,5);
  const authorLines=wrapText(author||'', 28).slice(0,2);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="30" y="30" width="${W-60}" height="${H-60}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4" rx="24"/>
  <text x="${W/2}" y="180" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Georgia, 'Times New Roman', serif" font-size="28" letter-spacing="3">BIBLIOTEKA</text>
  ${titleLines.map((ln,i)=>`<text x="${W/2}" y="${300+i*52}" text-anchor="middle" fill="#fff" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="40">${escapeXml(ln)}</text>`).join('\n')}
  ${authorLines.map((ln,i)=>`<text x="${W/2}" y="${300+titleLines.length*52+40+i*30}" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-family="Inter,Arial,sans-serif" font-size="22">${escapeXml(ln)}</text>`).join('\n')}
  ${year?`<text x="${W-40}" y="${H-40}" text-anchor="end" fill="rgba(255,255,255,0.85)" font-family="Inter,Arial,sans-serif" font-size="20">${escapeXml(String(year))}</text>`:''}
</svg>`;
  const encoded = encodeURIComponent(svg).replace(/'/g,'%27').replace(/"/g,'%22');
  return `data:image/svg+xml;utf8,${encoded}`;
}
function placeholdUrl({ title, author, year }){
  const text=[title||'Untitled', author||'', year?`(${year})`:''].filter(Boolean).join('\n');
  return `https://placehold.co/600x900/111827/ffffff?text=${encodeURIComponent(text)}&font=source-sans-pro&bold=true`;
}

// -------------------- Main --------------------
(async function main(){
  console.log("➡️  Prijava kao admin…");
  const token = await login();
  console.log("✅ Uspešan login.");

  console.log("⬇️  Učitavam knjige…");
  const books = await getAllBooks(token);
  console.log(`Pronađeno ${books.length} knjiga.`);

  let updated=0, skipped=0, fromWeb=0, fromFallback=0, failures=0, noConf=0;

  for (let i=0; i<books.length && i<opts.max; i++) {
    const b = books[i];
    const id = b.id;
    const qTitle = (b.title || '').trim();
    const qAuthor = (b.author || '').trim();
    const qYear = b.year ? Number(b.year) : null;
    const current = b.image;

    if (!qTitle) { console.warn(`(${i+1}) Nema naslova, preskačem id=${id}`); skipped++; continue; }
    if (!opts.updateAll && current && !isPlaceholder(current)) { skipped++; continue; }

    let candidates = [];
    try {
      for (const src of opts.sources) {
        if (src === 'openlib')  candidates = candidates.concat(await srcOpenLib(qTitle, qAuthor));
        if (src === 'gutendex') candidates = candidates.concat(await srcGutendex(qTitle, qAuthor));
        if (src === 'archive')  candidates = candidates.concat(await srcArchive(qTitle, qAuthor));
        if (src === 'wikipedia') candidates = candidates.concat(await srcWikipedia(qTitle, qAuthor));
        await sleep(120);
      }
    } catch (e) {
      console.error(`(${i+1}) Greška pretrage za "${qTitle}":`, e.message);
    }

    // ocenjuj i izaberi najboljeg
    let best = null, bestScore = -1;
    for (const c of candidates) {
      if (!c.image) continue;
      const s = scoreMatch({
        qTitle, qAuthor, qYear,
        cTitle: c.title || '',
        cAuthors: c.authors || [],
        cYear: c.year || null
      });
      if (s > bestScore) { best = c; bestScore = s; }
    }

    let finalUrl = null;
    if (best && bestScore >= opts.minScore) {
      const ok = await headOk(best.image);
      if (ok) {
        finalUrl = best.image;
        fromWeb++;
        console.log(`(${i+1}) 🌐 ${best.source} score=${bestScore.toFixed(2)} → ${finalUrl} | "${qTitle}"`);
      } else {
        console.log(`(${i+1}) URL kandidata nedostupan, idem na fallback.`);
      }
    } else {
      noConf++;
      console.log(`(${i+1}) ⚠️ Nema dovoljno pouzdan kandidat (score=${(bestScore<0?0:bestScore).toFixed(2)}).`);
    }

    if (!finalUrl) {
      finalUrl = opts.fallback === 'placehold'
        ? placeholdUrl({ title: qTitle, author: qAuthor, year: qYear })
        : svgCover({ title: qTitle, author: qAuthor, year: qYear });
      fromFallback++;
      console.log(`(${i+1}) 🎨 Fallback → ${opts.fallback.toUpperCase()} | "${qTitle}"`);
    }

    try {
      if (opts.dryRun) {
        console.log(`DRY-RUN: PATCH ${id} ← ${finalUrl.slice(0,90)}…`);
      } else {
        await patchBookImage(token, id, finalUrl);
        updated++;
      }
    } catch (e) {
      failures++;
      console.error(`(${i+1}) ❌ Neuspešno ažuriranje id=${id}:`, e.message);
    }

    await sleep(opts.delayMs);
  }

  console.log(`\n📊 Rezime → Ažurirano=${updated}  Sa weba=${fromWeb}  Fallback=${fromFallback}  Preskočeno=${skipped}  Bez sigurnog poklapanja=${noConf}  Grešaka=${failures}`);
})().catch(e => { console.error("Fatal:", e); process.exit(1); });
