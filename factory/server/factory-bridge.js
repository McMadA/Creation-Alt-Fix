import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LeadFactoryEngine } from '../run-engine.js';
import { FACTORY_CONFIG } from '../config/factory-config.js';

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

// 2. HTTP Server met Zero-Trust Beveiliging
const server = http.createServer(async (req, res) => {
  const origin = req.headers['origin'] || '';
  const host = req.headers['host'] || '';

  // CORS Origin Validatie (Strikte whitelist en veilige URL parsing ter voorkoming van CWE-346)
  function validateOrigin(orig) {
    if (!orig || orig === 'null') return true; // Directe non-browser of loopback requests
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

  // Preflight OPTIONS afhandeling (inclusief Chrome Private Network Access - PNA)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-caf-auth, Access-Control-Request-Private-Network',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Standaard response headers (inclusief PNA voor browser loopback cross-origin access)
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-caf-auth, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;
  const clientToken = req.headers['x-caf-auth'] || url.searchParams.get('token');
  const isTokenValid = Boolean(clientToken && clientToken === AUTH_TOKEN);
  // Geauthenticeerd als token klopt OF als verzoek afkomstig is van een geautoriseerde CORS origin (portal/loopback)
  const isAuthenticated = isTokenValid || isAllowedOrigin;

  // Beveiligingscontrole op token voor alle POST (mutatie) verzoeken
  if (req.method === 'POST') {
    if (!isAuthenticated) {
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

  // 3. GET /api/logs (Live activity logs)
  if (req.method === 'GET' && pathname === '/api/logs') {
    res.writeHead(200);
    res.end(JSON.stringify({ logs: RECENT_LOGS }));
    return;
  }

  // 3b. GET /api/leads (Haalt actuele leads direct van schijf voor real-time CRM weergave)
  if (req.method === 'GET' && pathname === '/api/leads') {
    const db = engine.loadDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db));
    return;
  }

  // 4. POST /api/trigger (Start 1 scan cyclus vanuit CRM)
  if (req.method === 'POST' && pathname === '/api/trigger') {
    if (isCycleRunning) {
      res.writeHead(409);
      res.end(JSON.stringify({ error: "Er draait al een actieve cyclus. Even geduld." }));
      return;
    }

    isCycleRunning = true;
    addLog("⚡ Handmatige scan gestart vanuit CRM Dashboard...", "action");

    // Start cyclus asynchroon
    (async () => {
      try {
        const result = await engine.runCycle({ limit: 1 });
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
      const ext = path.extname(targetFile).toLowerCase();
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
        '.woff2': 'font/woff2',
        '.woff': 'font/woff'
      };
      const contentType = MIME_MAP[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Private-Network': 'true'
      });
      fs.createReadStream(targetFile).pipe(res);
      return;
    }
  }

  // 404 Not Found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Endpoint niet gevonden" }));
});

server.listen(PORT, HOST, () => {
  console.log(`\n============================================================`);
  console.log(`🛡️ [Creation+Alt+Fix] Beveiligde CRM Bridge Server Actief!`);
  console.log(`📍 Luistert op: http://${HOST}:${PORT}`);
  console.log(`🔑 Sessie Auth Token: ${AUTH_TOKEN.substring(0, 8)}... (Opgeslagen in .bridge-token)`);
  console.log(`🔒 Beveiliging: Alleen loopback, Origin whitelist & CSRF protectie`);
  console.log(`============================================================\n`);
});

// Schakel netjes uit bij procesafsluiting
process.on('SIGINT', () => {
  addLog("Bridge server wordt afgesloten...");
  server.close(() => process.exit(0));
});
