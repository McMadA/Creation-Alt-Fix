import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

// Laad .env indien aanwezig (Zero-dependency via native Node 20+ process.loadEnvFile + parser fallback)
function loadEnvSafely(envPath) {
  try {
    if (!fs.existsSync(envPath)) return;
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath);
      return;
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  } catch (_) {}
}

loadEnvSafely(path.join(ROOT_DIR, '.env'));
loadEnvSafely(path.join(__dirname, '.env'));

export const FACTORY_CONFIG = {
  // Brand & Identiteit
  agencyName: "Creation+Alt+Fix",
  agencyOwner: "Allard Veldman",
  agencyEmail: "info@creationaltfix.nl",
  agencyPhone: "+31 6 19135453",
  agencyWebsite: "https://creationaltfix.nl",

  // Hosting & Staging
  conceptBaseUrl: "https://creationaltfix.nl/concept",
  localConceptDir: path.join(ROOT_DIR, "website", "concept"),
  dataDir: path.join(ROOT_DIR, "factory", "data"),
  databaseFile: path.join(ROOT_DIR, "factory", "data", "leads.json"),

  // FTP / Vimexx Server
  ftp: {
    host: process.env.FTP_SERVER || "web0156.zxcs.nl",
    port: parseInt(process.env.FTP_PORT || "21", 10),
    user: process.env.FTP_USERNAME || process.env.VIMEXX_FTP_USER || "",
    password: process.env.FTP_PASSWORD || process.env.VIMEXX_FTP_PASSWORD || "",
    secure: "loose", // ftps
    remoteRoot: "domains/creationaltfix.nl/public_html/concept"
  },

  // E-mail / Vimexx SMTP
  smtp: {
    host: process.env.SMTP_HOST || "mail.zxcs.nl",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || "info@creationaltfix.nl",
      pass: process.env.SMTP_PASSWORD || ""
    },
    from: '"Allard van Creation+Alt+Fix" <info@creationaltfix.nl>'
  },

  // CLI AI Instellingen
  agy: {
    executable: "agy",
    model: "gemini-3.8-flash",
    effort: "low",
    timeoutMs: 90000
  },

  // Scraping Limieten & Delays (menselijk gedrag)
  scraper: {
    minDelayMs: 2500,
    maxDelayMs: 6000,
    maxResultsPerQuery: 15,
    userAgents: [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ]
  },

  // Kwalificatie Regels
  qualification: {
    requireNoWebsiteOrOutdated: true,
    minReviews: 0,
    maxReviews: 200 // Grotere bedrijven hebben vaak al een marketingteam
  }
};
