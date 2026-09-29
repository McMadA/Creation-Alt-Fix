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
function addLog(msg, type = 'info') {
  const entry = {
    time: new Date().toLocaleTimeString('nl-NL'),
    text: msg,
    type
  };
  RECENT_LOGS.push(entry);
  if (RECENT_LOGS.length > 50) RECENT_LOGS.shift();
  console.log(`[Bridge ${entry.time}] ${msg}`);
}

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
  const isAuthenticated = clientToken === AUTH_TOKEN;

  // Beveiligingscontrole op token voor alle POST (mutatie) verzoeken
  if (req.method === 'POST') {
    if (!isAuthenticated) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Niet geautoriseerd: Ongeldig of ontbrekend x-caf-auth token" }));
      return;
    }
  }

  // --- ROUTING ---

  // 1. GET /api/status (Openbare heartbeat, gevoelige logs & wachtrij alleen voor geauthenticeerde beheerders)
  if (req.method === 'GET' && pathname === '/api/status') {
    const db = engine.loadDatabase();
    const baseResponse = {
      online: true,
      port: PORT,
      isDaemonActive,
      isCycleRunning
    };

    if (isAuthenticated) {
      Object.assign(baseResponse, {
        authenticated: true,
        totalLeadsInQueue: db.leads.filter(l => l.status === 'concept_ready').length,
        totalScanned: db.totalScanned || 0,
        totalQualified: db.totalQualified || 0,
        recentLogs: RECENT_LOGS.slice(-15)
      });
    }

    res.writeHead(200);
    res.end(JSON.stringify(baseResponse));
    return;
  }

  // 2. GET /api/logs (Vereist authenticatietoken)
  if (req.method === 'GET' && pathname === '/api/logs') {
    if (!isAuthenticated) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Niet geautoriseerd: x-caf-auth token vereist voor log inspectie" }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ logs: RECENT_LOGS }));
    return;
  }

  // 3. POST /api/trigger (Start 1 scan cyclus vanuit CRM)
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
        addLog(`✅ Cyclus succesvol afgerond! Gereed in wachtrij: ${result.totalInQueue}`, "success");
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

  // 4. POST /api/daemon/start
  if (req.method === 'POST' && pathname === '/api/daemon/start') {
    if (isDaemonActive) {
      res.writeHead(200);
      res.end(JSON.stringify({ message: "24/7 Daemon was al actief", isDaemonActive: true }));
      return;
    }

    isDaemonActive = true;
    addLog("▶️ 24/7 Autonome Daemon geactiveerd vanuit CRM!", "action");

    daemonIntervalId = setInterval(async () => {
      if (!isCycleRunning) {
        isCycleRunning = true;
        try {
          await engine.runCycle({ limit: 1 });
        } catch (e) {
          addLog(`Fout in 24/7 cyclus: ${e.message}`, "error");
        } finally {
          isCycleRunning = false;
        }
      }
    }, 30 * 60 * 1000); // Elke 30 min

    res.writeHead(200);
    res.end(JSON.stringify({ message: "24/7 Daemon succesvol gestart", isDaemonActive: true }));
    return;
  }

  // 5. POST /api/daemon/stop
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

  // 6. Statische bestanden serveren voor lokaal CRM Dashboard (http://127.0.0.1:3847/admin/)
  if (req.method === 'GET' && !pathname.startsWith('/api/')) {
    const CRM_DIR = path.join(ROOT_DIR, 'crm');
    
    // Redirect / of /admin naar /admin/
    if (pathname === '/' || pathname === '/admin') {
      res.writeHead(302, { 'Location': '/admin/' });
      res.end();
      return;
    }

    let relPath = pathname;
    if (relPath.startsWith('/crm/')) relPath = relPath.substring(5);
    if (relPath.endsWith('/')) relPath += 'index.html';

    const safePath = path.normalize(path.join(CRM_DIR, relPath));

    // Strikte path-traversal guard
    if (safePath.startsWith(CRM_DIR) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
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
      fs.createReadStream(safePath).pipe(res);
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
