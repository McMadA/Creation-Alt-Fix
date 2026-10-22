import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LeadFactoryEngine } from '../run-engine.js';
import { FACTORY_CONFIG } from '../config/factory-config.js';
import { renderLeadVideoPreview, sanitizeVideoSlug } from '../video/build-motion-video.js';
import { calculateSectorConversionMetrics, generateProvincialBatchQueries, exportProvincialReport } from '../batch/batch-engine.js';
import { calculateOutreachCampaignMetrics, buildOutreachQueue } from '../../crm/admin/js/modules/regional-outreach-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const PORT = 3847;
const HOST = '127.0.0.1'; // Strikte loopback binding

// 1. Zorg voor een persistent cryptografisch authenticatietoken
const TOKEN_FILE = path.join(ROOT_DIR, 'factory', 'config', '.bridge-token');
let AUTH_TOKEN = '';
if (fs.existsSync(TOKEN_FILE)) {
  AUTH_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
} else {
  AUTH_TOKEN = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(TOKEN_FILE, AUTH_TOKEN, 'utf-8');
}

// Schrijf ook naar crm/admin/data/bridge-token.json zodat het CRM dashboard de token kan inladen
const CRM_TOKEN_FILE = path.join(ROOT_DIR, 'crm', 'admin', 'data', 'bridge-token.json');
try {
  fs.mkdirSync(path.dirname(CRM_TOKEN_FILE), { recursive: true });
  fs.writeFileSync(CRM_TOKEN_FILE, JSON.stringify({ token: AUTH_TOKEN, port: PORT }), 'utf-8');
} catch (e) {
  // Silent fallback
}

// In-memory log buffer voor live streaming naar CRM
const RECENT_LOGS = [];
const origConsoleLog = console.log;

function addLog(msg, type = 'info') {
  const entry = {
    time: new Date().toLocaleTimeString('nl-NL'),
    text: typeof msg === 'object' ? JSON.stringify(msg) : String(msg),
    type
  };
  RECENT_LOGS.push(entry);
  if (RECENT_LOGS.length > 80) RECENT_LOGS.shift();
  origConsoleLog(`[Bridge ${entry.time}] ${entry.text}`);
}

// Onderschep algemene console.log van engine/scrapers zodat deze direct in de CRM activity console verschijnen
console.log = (...args) => {
  const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  if (text.startsWith('[Bridge ')) {
    origConsoleLog(text);
    return;
  }
  let type = 'info';
  if (text.includes('❌') || text.toLowerCase().includes('error') || text.toLowerCase().includes('fout')) type = 'error';
  else if (text.includes('✅') || text.includes('🎯') || text.includes('🎉')) type = 'success';
  else if (text.includes('⚡') || text.includes('▶️') || text.includes('🏭')) type = 'action';
  
  const entry = {
    time: new Date().toLocaleTimeString('nl-NL'),
    text,
    type
  };
  RECENT_LOGS.push(entry);
  if (RECENT_LOGS.length > 80) RECENT_LOGS.shift();
  origConsoleLog(text);
};

// Initialiseer Lead Factory Engine
const engine = new LeadFactoryEngine();
let isDaemonActive = false;
let daemonIntervalId = null;
let isCycleRunning = false;

addLog("Factory Bridge geïnitialiseerd. Veiligheidscontroles actief.");

// DNS Rebinding Defense (RFC 7230 / CWE-918): Valideer Host header tegen loopback spoofing
export function validateBridgeHost(h) {
  if (!h || typeof h !== 'string') return false;
  const hostname = h.split(':')[0].toLowerCase();
  return ['127.0.0.1', 'localhost', 'creationaltfix.nl', 'portal.creationaltfix.nl'].includes(hostname) || hostname.endsWith('.creationaltfix.nl');
}

// 2. HTTP Server met Zero-Trust Beveiliging
const server = http.createServer(async (req, res) => {
  const origin = req.headers['origin'] || '';
  const host = req.headers['host'] || '';

  // CWE-400: Begrens inkomende HTTP payloads tot 1MB tegen DoS en geheugenuitputting
  let receivedBytes = 0;
  const bodyChunks = [];
  req.on('data', chunk => {
    receivedBytes += chunk.length;
    if (receivedBytes > 1024 * 1024) {
      if (!res.headersSent) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Payload Too Large: Maximaal 1MB toegestaan" }));
      }
      req.destroy();
      return;
    }
    bodyChunks.push(chunk);
  });

  const readJsonBody = () => new Promise((resolve) => {
    if (req.readableEnded) {
      try {
        const raw = Buffer.concat(bodyChunks).toString('utf-8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
      return;
    }
    req.on('end', () => {
      try {
        const raw = Buffer.concat(bodyChunks).toString('utf-8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });

  // Valideer Host header tegen DNS rebinding
  if (!validateBridgeHost(host)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Ongeldige Host header (DNS rebinding geblokkeerd)" }));
    return;
  }

  // CORS Origin Validatie (Strikte whitelist en veilige URL parsing ter voorkoming van CWE-346)
  function validateOrigin(orig) {
    if (!orig) return true; // Directe non-browser/CLI tools of same-origin zonder Origin header
    if (orig === 'null') return false; // CWE-346: Blokkeer zandbak-iframes en data: URIs
    try {
      const u = new URL(orig);
      // HTTPS en HTTP voor creationaltfix.nl en officiële subdomeinen
      if ((u.protocol === 'https:' || u.protocol === 'http:') && (u.hostname === 'creationaltfix.nl' || u.hostname.endsWith('.creationaltfix.nl'))) {
        return true;
      }
      // Lokale ontwikkeldomeinen (strikte loopback hostname match, geen startsWith lekken)
      if ((u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  const isAllowedOrigin = validateOrigin(origin);

  if (!isAllowedOrigin) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Verboden: CORS Origin niet toegestaan" }));
    return;
  }

  const safeCorsOrigin = (origin && isAllowedOrigin && origin !== 'null') ? origin : 'http://127.0.0.1:3847';

  // Preflight OPTIONS afhandeling (inclusief Chrome Private Network Access - PNA)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': safeCorsOrigin,
        'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-caf-auth, Access-Control-Request-Private-Network',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Standaard response headers (inclusief PNA voor browser loopback cross-origin access)
  res.setHeader('Access-Control-Allow-Origin', safeCorsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-caf-auth, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;
  const clientToken = req.headers['x-caf-auth'] || url.searchParams.get('token');
  const isTokenValid = Boolean(clientToken && clientToken === AUTH_TOKEN);

  const isPublicPingEndpoint = pathname === '/api/leads/ping' || (pathname === '/api/leads' && url.searchParams.get('action') === 'ping');
  const isPublicEndpoint = pathname === '/api/session-token' || isPublicPingEndpoint;

  // Beveiligingscontrole op token voor alle POST (mutatie) verzoeken: strikt token verplicht (Zero-Trust), tenzij publiek ping endpoint
  if (req.method === 'POST' && !isPublicEndpoint) {
    if (!isTokenValid) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Niet geautoriseerd: Ongeldig of ontbrekend x-caf-auth token" }));
      return;
    }
  }

  // --- ROUTING ---

  // 1. GET /api/session-token (Directe veilige token-handshake voor het CRM Dashboard)
  if (req.method === 'GET' && pathname === '/api/session-token') {
    res.writeHead(200);
    res.end(JSON.stringify({
      token: AUTH_TOKEN,
      port: PORT,
      authenticated: true
    }));
    return;
  }

  // 2. GET /api/status (Heartbeat, sessietoken, logs & wachtrij voor dashboard)
  if (req.method === 'GET' && pathname === '/api/status') {
    const db = engine.loadDatabase();
    const baseResponse = {
      online: true,
      port: PORT,
      token: AUTH_TOKEN,
      sessionToken: AUTH_TOKEN,
      isDaemonActive,
      isCycleRunning,
      authenticated: true,
      totalLeadsInQueue: (db.leads || []).filter(l => l.status === 'concept_ready').length,
      totalScanned: db.totalScanned || 0,
      totalQualified: db.totalQualified || 0,
      recentLogs: RECENT_LOGS.slice(-20)
    };

    res.writeHead(200);
    res.end(JSON.stringify(baseResponse));
    return;
  }

  // 3. GET /api/logs (Live activity logs - token beveiligd)
  if (req.method === 'GET' && pathname === '/api/logs') {
    if (!isTokenValid) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Niet geautoriseerd: Ongeldig of ontbrekend x-caf-auth token" }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ logs: RECENT_LOGS }));
    return;
  }

  // 3b. GET /api/leads (Haalt actuele leads direct van schijf voor real-time CRM weergave - token beveiligd)
  if (req.method === 'GET' && pathname === '/api/leads') {
    if (!isTokenValid) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Niet geautoriseerd: Ongeldig of ontbrekend x-caf-auth token" }));
      return;
    }
    const db = engine.loadDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db));
    return;
  }

  // 3bb. GET /api/leads/analytics & /api/leads/batch2/status (Provinciale Batch 2 & Sector Conversie analyse - TASK-908)
  if (req.method === 'GET' && (pathname === '/api/leads/analytics' || pathname === '/api/leads/batch2/status')) {
    if (!isTokenValid) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Niet geautoriseerd: Ongeldig of ontbrekend x-caf-auth token" }));
      return;
    }
    const db = engine.loadDatabase();
    const metrics = calculateSectorConversionMetrics(db.leads || []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      metrics,
      report: exportProvincialReport(db.leads || [])
    }));
    return;
  }

  // 3bc. POST /api/leads/batch2/queue (Genereert 20 gerichte provinciale zoekopdrachten voor Batch 2 - TASK-908)
  if (req.method === 'POST' && pathname === '/api/leads/batch2/queue') {
    const body = await readJsonBody();
    const count = body.count ? Math.max(1, Math.min(50, Number(body.count))) : 20;
    const queries = generateProvincialBatchQueries({ count, regions: body.regions, keywords: body.keywords });
    addLog(`📋 Provinciale Batch 2 wachtrij gegenereerd (${queries.length} gerichte queries)`, 'action');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      queries,
      totalQueries: queries.length
    }));
    return;
  }

  // 3bd. GET /api/leads/outreach (Regionale MKB Outreach Campagne telemetrie & cohort - TASK-906)
  if (req.method === 'GET' && pathname === '/api/leads/outreach') {
    if (!isTokenValid) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Niet geautoriseerd: Ongeldig of ontbrekend x-caf-auth token" }));
      return;
    }
    const db = engine.loadDatabase();
    const leads = db.leads || [];
    const queueData = buildOutreachQueue(leads);
    const metrics = calculateOutreachCampaignMetrics(leads);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      campaign: queueData,
      metrics
    }));
    return;
  }

  // 3c. POST /api/leads/update (Synchroniseert CRM status-, e-mail- en archief-wijzigingen direct naar leads.json)
  if (req.method === 'POST' && pathname === '/api/leads/update') {
    const body = await readJsonBody();
    const targetSlug = String(body.slug || body.id || '').trim();
    if (!targetSlug) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Verplicht veld 'slug' ontbreekt" }));
      return;
    }

    const db = engine.loadDatabase();
    const idx = (db.leads || []).findIndex(l => l.slug === targetSlug || l.id === targetSlug || l.name === targetSlug);
    if (idx === -1) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: `Lead '${targetSlug}' niet gevonden in database` }));
      return;
    }

    const lead = db.leads[idx];
    const allowedStatuses = ['concept_ready', 'sent', 'sent_email', 'email_sent', 'sent_whatsapp', 'whatsapp_sent', 'skipped', 'converted', 'archived', 'rejected'];
    if (body.status && allowedStatuses.includes(body.status)) {
      lead.status = body.status;
    }
    if (body.email !== undefined) {
      const cleanEmail = body.email ? String(body.email).trim() : null;
      if (!cleanEmail || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) && !cleanEmail.toLowerCase().includes('creationaltfix'))) {
        lead.email = cleanEmail;
      }
    }
    if (body.sentAt !== undefined) lead.sentAt = body.sentAt ? String(body.sentAt) : null;
    if (body.lastSentAt) lead.lastSentAt = String(body.lastSentAt);
    if (body.followUpAt) lead.followUpAt = String(body.followUpAt);
    if (body.archivedAt) lead.archivedAt = String(body.archivedAt);
    if (body.convertedProjectId) lead.convertedProjectId = String(body.convertedProjectId);
    lead.updatedAt = new Date().toISOString();

    db.totalSent = (db.leads || []).filter(l => ['sent', 'sent_email', 'email_sent', 'sent_whatsapp', 'whatsapp_sent', 'converted'].includes(l.status)).length;
    engine.saveDatabase(db);
    addLog(`💾 Lead '${lead.name}' bijgewerkt naar status: ${lead.status}`, 'info');

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, lead }));
    return;
  }

  // 3d. POST /api/leads/ping of GET /api/leads/ping (Zero-cookie concept view tracking - 100% AVG proof)
  if ((req.method === 'POST' || req.method === 'GET') && isPublicPingEndpoint) {
    const body = (req.method === 'POST') ? await readJsonBody() : {};
    const targetSlug = String(body.slug || url.searchParams.get('slug') || '').trim();
    const isAdmin = Boolean(body.admin || url.searchParams.get('admin') === '1' || url.searchParams.get('preview') === 'admin' || req.headers['x-caf-admin']);

    if (!targetSlug) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Verplicht veld 'slug' ontbreekt" }));
      return;
    }

    if (isAdmin) {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, slug: targetSlug, skipped: 'admin_preview' }));
      return;
    }

    const db = engine.loadDatabase();
    const idx = (db.leads || []).findIndex(l => l.slug === targetSlug || l.id === targetSlug || l.name === targetSlug);
    if (idx === -1) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: `Lead '${targetSlug}' niet gevonden in database` }));
      return;
    }

    const lead = db.leads[idx];
    const now = new Date().toISOString();
    let shouldIncrement = true;
    if (lead.lastViewedAt) {
      const diffSec = (Date.now() - new Date(lead.lastViewedAt).getTime()) / 1000;
      if (diffSec < 10) {
        shouldIncrement = false;
      }
    }

    if (shouldIncrement) {
      lead.viewsCount = (parseInt(lead.viewsCount, 10) || 0) + 1;
      if (!lead.firstViewedAt) lead.firstViewedAt = now;
      addLog(`👀 Lead '${lead.name}' bekeken door bezoeker! (Totaal: ${lead.viewsCount}x)`, 'action');
    }
    lead.lastViewedAt = now;
    lead.updatedAt = now;

    engine.saveDatabase(db);

    res.writeHead(200);
    res.end(JSON.stringify({
      ok: true,
      slug: lead.slug,
      viewsCount: lead.viewsCount || 1,
      lastViewedAt: lead.lastViewedAt,
      debounced: !shouldIncrement
    }));
    return;
  }

  // 3e. POST /api/leads/video (Automatische 15s WhatsApp Reel video generator per lead)
  if (req.method === 'POST' && pathname === '/api/leads/video') {
    const body = await readJsonBody();
    const rawSlug = String(body.slug || url.searchParams.get('slug') || '').trim();
    if (!rawSlug) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Verplicht veld 'slug' ontbreekt" }));
      return;
    }

    let cleanSlug;
    try {
      cleanSlug = sanitizeVideoSlug(rawSlug);
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: err.message }));
      return;
    }

    const db = engine.loadDatabase();
    const idx = (db.leads || []).findIndex(l => l.slug === cleanSlug || l.id === cleanSlug || l.name === cleanSlug);
    if (idx === -1) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: `Lead '${cleanSlug}' niet gevonden in database` }));
      return;
    }

    const lead = db.leads[idx];
    addLog(`🎬 Genereren 15s WhatsApp Reel voor lead '${lead.name}'...`, 'action');

    try {
      const durationMs = body.durationMs ? Math.max(500, Math.min(30000, Number(body.durationMs))) : 15000;
      const result = await renderLeadVideoPreview({
        slug: cleanSlug,
        lead,
        durationMs,
        dryRun: Boolean(body.dryRun)
      });

      lead.videoPreview = result.lead?.videoPreview || {
        generated: true,
        generatedAt: new Date().toISOString(),
        fileName: 'video-preview.mp4',
        relativeUrl: result.videoUrl,
        absoluteUrl: result.absoluteUrl,
        durationSeconds: result.durationSeconds || 15,
        sizeBytes: result.sizeBytes
      };
      lead.updatedAt = new Date().toISOString();
      engine.saveDatabase(db);

      addLog(`✅ 15s WhatsApp Reel gereed voor '${lead.name}'! (${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB)`, 'success');

      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true,
        slug: cleanSlug,
        videoUrl: result.videoUrl,
        absoluteUrl: result.absoluteUrl,
        durationSeconds: result.durationSeconds || 15,
        sizeBytes: result.sizeBytes,
        lead,
        message: "15s WhatsApp Reel succesvol gegenereerd!"
      }));
    } catch (err) {
      addLog(`❌ Fout bij renderen video voor '${lead.name}': ${err.message}`, 'error');
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Fout bij genereren video-preview: " + err.message }));
    }
    return;
  }

  // 4. POST /api/trigger (Start 1 scan cyclus vanuit CRM, met optionele zoekopdracht/regio)
  if (req.method === 'POST' && pathname === '/api/trigger') {
    if (isCycleRunning) {
      res.writeHead(409);
      res.end(JSON.stringify({ error: "Er draait al een actieve cyclus. Even geduld." }));
      return;
    }

    const body = await readJsonBody();
    const customQuery = body.query && typeof body.query === 'string' ? body.query.trim().slice(0, 120) : undefined;
    const customLimit = body.limit ? Math.min(Math.max(Number(body.limit) || 1, 1), 5) : 1;

    isCycleRunning = true;
    addLog(`⚡ Handmatige scan gestart vanuit CRM Dashboard${customQuery ? ` (Zoekopdracht: "${customQuery}")` : ''}...`, "action");

    // Start cyclus asynchroon
    (async () => {
      try {
        const result = await engine.runCycle({ query: customQuery, limit: customLimit });
        addLog(`✅ Cyclus succesvol afgerond! Gereed in wachtrij: ${result ? result.totalInQueue : 0}`, "success");
      } catch (err) {
        addLog(`❌ Fout tijdens scan cyclus: ${err.message}`, "error");
      } finally {
        isCycleRunning = false;
      }
    })();

    res.writeHead(202);
    res.end(JSON.stringify({
      message: "Scan cyclus succesvol gestart",
      query: customQuery || null,
      isCycleRunning: true
    }));
    return;
  }

  // 5. POST /api/daemon/start
  if (req.method === 'POST' && pathname === '/api/daemon/start') {
    if (isDaemonActive) {
      res.writeHead(200);
      res.end(JSON.stringify({ message: "24/7 Daemon was al actief", isDaemonActive: true }));
      return;
    }

    isDaemonActive = true;
    addLog("▶️ 24/7 Autonome Daemon geactiveerd vanuit CRM!", "action");

    // Start direct eerste cyclus asynchroon als er niets draait
    if (!isCycleRunning) {
      isCycleRunning = true;
      (async () => {
        try {
          addLog("▶️ Eerste 24/7 achtergrondcyclus gestart...", "action");
          const result = await engine.runCycle({ limit: 1 });
          addLog(`✅ Eerste 24/7 cyclus voltooid! Gereed in wachtrij: ${result ? result.totalInQueue : 0}`, "success");
        } catch (e) {
          addLog(`❌ Fout in 24/7 cyclus: ${e.message}`, "error");
        } finally {
          isCycleRunning = false;
        }
      })();
    }

    daemonIntervalId = setInterval(async () => {
      if (!isCycleRunning) {
        isCycleRunning = true;
        try {
          addLog("🔄 Start periodieke 24/7 scan cyclus...", "action");
          const result = await engine.runCycle({ limit: 1 });
          addLog(`✅ Periodieke 24/7 cyclus voltooid! Gereed: ${result ? result.totalInQueue : 0}`, "success");
        } catch (e) {
          addLog(`❌ Fout in 24/7 cyclus: ${e.message}`, "error");
        } finally {
          isCycleRunning = false;
        }
      }
    }, 30 * 60 * 1000); // Elke 30 min

    res.writeHead(200);
    res.end(JSON.stringify({ message: "24/7 Daemon succesvol gestart", isDaemonActive: true }));
    return;
  }

  // 6. POST /api/daemon/stop
  if (req.method === 'POST' && pathname === '/api/daemon/stop') {
    if (daemonIntervalId) {
      clearInterval(daemonIntervalId);
      daemonIntervalId = null;
    }
    isDaemonActive = false;
    addLog("⏹️ 24/7 Autonome Daemon gepauzeerd vanuit CRM.", "info");

    res.writeHead(200);
    res.end(JSON.stringify({ message: "24/7 Daemon gepauzeerd", isDaemonActive: false }));
    return;
  }

  // 6. Statische bestanden serveren voor lokaal CRM Dashboard (http://127.0.0.1:3847/admin/) en Concept Websites (/concept/[slug]/)
  if (req.method === 'GET' && !pathname.startsWith('/api/')) {
    const CRM_DIR = path.join(ROOT_DIR, 'crm');
    const WEBSITE_DIR = path.join(ROOT_DIR, 'website');
    
    // Redirect / of /admin naar /admin/
    if (pathname === '/' || pathname === '/admin') {
      res.writeHead(302, { 'Location': '/admin/' });
      res.end();
      return;
    }

    let targetFile = null;

    if (pathname.startsWith('/concept/')) {
      let rel = pathname;
      if (rel.endsWith('/')) rel += 'index.html';
      const candidate = path.normalize(path.join(WEBSITE_DIR, rel));
      if (candidate.startsWith(WEBSITE_DIR) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        targetFile = candidate;
      }
    } else {
      let relPath = pathname;
      if (relPath.startsWith('/crm/')) relPath = relPath.substring(5);
      if (relPath.endsWith('/')) relPath += 'index.html';
      const safePath = path.normalize(path.join(CRM_DIR, relPath));
      if (safePath.startsWith(CRM_DIR) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
        targetFile = safePath;
      }
    }

    if (targetFile) {
      const baseName = path.basename(targetFile);
      const ext = path.extname(targetFile).toLowerCase();

      // CWE-552 / CWE-200: Hermetische blokkade op data-, configuratie- en backend mappen
      const normalizedSegments = targetFile.split(path.sep).map(p => p.toLowerCase());
      if (normalizedSegments.includes('data') || normalizedSegments.includes('config') || normalizedSegments.includes('node_modules') || normalizedSegments.includes('.git')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Toegang geweigerd: Vertrouwelijke map is niet publiek toegankelijk" }));
        return;
      }

      // CWE-552: Blokkeer dotfiles (.env, .git, .htaccess etc.) en gevoelige systeembestanden
      if (baseName.startsWith('.') || targetFile.split(path.sep).some(p => p.startsWith('.') && p !== '.' && p !== '..')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Toegang geweigerd: Verborgen bestanden zijn niet toegankelijk" }));
        return;
      }

      // Blokkeer server-side scripts en gevoelige bestandsextensies
      const BLOCKED_EXTENSIONS = ['.env', '.db', '.sqlite', '.sqlite3', '.sql', '.log', '.sh', '.ps1', '.bat', '.cmd', '.bak', '.config', '.token', '.key', '.php', '.ini', '.swp', '.backup', '.conf'];
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Toegang geweigerd: Bestandstype niet toegestaan" }));
        return;
      }

      const MIME_MAP = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff'
      };
      const contentType = MIME_MAP[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': safeCorsOrigin,
        'Access-Control-Allow-Private-Network': 'true'
      });
      const fileStream = fs.createReadStream(targetFile);
      fileStream.on('error', (err) => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Fout bij inlezen bestand" }));
        } else {
          res.destroy();
        }
      });
      fileStream.pipe(res);
      return;
    }
  }

  // 404 Not Found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Endpoint niet gevonden" }));
});

// CWE-400: Socket en header timeouts tegen Slowloris en resource-uitputting
server.timeout = 30000;
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;

const isMain = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

if (isMain) {
  server.listen(PORT, HOST, () => {
    console.log(`\n============================================================`);
    console.log(`🛡️ [Creation+Alt+Fix] Beveiligde CRM Bridge Server Actief!`);
    console.log(`📍 Luistert op: http://${HOST}:${PORT}`);
    console.log(`🔑 Sessie Auth Token: ${AUTH_TOKEN.substring(0, 8)}... (Opgeslagen in .bridge-token)`);
    console.log(`🔒 Beveiliging: Alleen loopback, Origin whitelist & CSRF protectie`);
    console.log(`============================================================\n`);
  });

  // Schakel netjes uit bij procesafsluiting en ruim timers op
  const gracefulShutdown = () => {
    if (daemonIntervalId) {
      clearInterval(daemonIntervalId);
      daemonIntervalId = null;
    }
    addLog("Bridge server wordt afgesloten...");
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

export { server, AUTH_TOKEN, PORT, HOST };
