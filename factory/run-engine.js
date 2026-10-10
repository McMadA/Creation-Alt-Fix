import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FACTORY_CONFIG } from './config/factory-config.js';
import { searchGoogleMaps } from './discovery/maps-crawler.js';
import { enrichBusinessProfile } from './enrichment/deep-intelligence.js';
import { generateConceptWebsiteWithAgy } from './generator/agy-generator.js';
import { deployConceptToVimexx, syncLeadsDatabaseToVimexx } from './deployer/vimexx-ftps.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Laad regio's en sectoren
const regionsPath = path.join(__dirname, 'config', 'regions.json');
const sectorsPath = path.join(__dirname, 'config', 'sectors.json');
const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf-8'));
const sectors = JSON.parse(fs.readFileSync(sectorsPath, 'utf-8'));

/**
 * Veilig en atomisch JSON wegschrijven via .tmp bestand met 0600 permissies
 * Voorkomt data-corruptie en 0-byte bestanden bij plotselinge procesonderbrekingen
 */
export function atomicWriteJsonSync(targetPath, data) {
  const content = JSON.stringify(data, null, 2);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = path.join(dir, `.${path.basename(targetPath)}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`);
  fs.writeFileSync(tempPath, content, { encoding: 'utf-8', mode: 0o600 });
  try {
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    try {
      fs.copyFileSync(tempPath, targetPath);
      fs.unlinkSync(tempPath);
    } catch (copyErr) {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
      throw err;
    }
  }
}

/**
 * Hoofdklasse voor de Autonome Lead & Concept Machine
 */
export class LeadFactoryEngine {
  constructor() {
    this.databaseFile = FACTORY_CONFIG.databaseFile;
    this.ensureDatabase();
  }

  ensureDatabase() {
    if (!fs.existsSync(path.dirname(this.databaseFile))) {
      fs.mkdirSync(path.dirname(this.databaseFile), { recursive: true });
    }
    if (!fs.existsSync(this.databaseFile)) {
      const initial = {
        updatedAt: new Date().toISOString(),
        totalScanned: 0,
        totalQualified: 0,
        totalGenerated: 0,
        totalSent: 0,
        leads: []
      };
      atomicWriteJsonSync(this.databaseFile, initial);
    }
  }

  loadDatabase() {
    this.ensureDatabase();
    return JSON.parse(fs.readFileSync(this.databaseFile, 'utf-8'));
  }

  saveDatabase(db) {
    db.updatedAt = new Date().toISOString();
    atomicWriteJsonSync(this.databaseFile, db);
    // Directe synchronisatie met CRM Admin Dashboard
    const crmAdminDbPath = path.resolve(__dirname, '..', 'crm', 'admin', 'data', 'leads.json');
    try {
      if (fs.existsSync(path.dirname(crmAdminDbPath))) {
        atomicWriteJsonSync(crmAdminDbPath, db);
      }
    } catch (e) {
      console.warn('⚠️ Kon leads.json niet direct naar CRM admin data kopiëren:', e.message);
    }
  }

  isLeadProcessed(db, business) {
    const slug = business.slug;
    const phone = business.phone ? business.phone.replace(/\D/g, '') : null;
    const inDb = db.leads.some(l => {
      if (l.slug === slug) return true;
      if (phone && l.phone && l.phone.replace(/\D/g, '') === phone) return true;
      return false;
    });
    if (inDb) return true;

    // Controleer ook de skipped log zodat overgeslagen bedrijven niet onnodig herhaald worden
    const skippedLogPath = path.join(__dirname, 'data', 'skipped.log');
    if (fs.existsSync(skippedLogPath)) {
      try {
        const log = fs.readFileSync(skippedLogPath, 'utf-8');
        if (log.includes(`(${slug})`)) return true;
      } catch (e) {}
    }
    return false;
  }

  /**
   * Draait één scan- en generatiecyclus
   */
  async runCycle(options = {}) {
    const limit = options.limit || 1;
    const customQuery = options.query || null;

    console.log(`\n============================================================`);
    console.log(`🏭 [Lead Factory] Start Autonome Cyclus (${new Date().toLocaleTimeString('nl-NL')})`);
    console.log(`============================================================`);

    const db = this.loadDatabase();

    // Selecteer zoekterm en regio
    let query = customQuery;
    if (!query) {
      // Kies een willekeurige combinatie van sector en regio
      const sector = sectors[Math.floor(Math.random() * sectors.length)];
      const keyword = sector.keywords[Math.floor(Math.random() * sector.keywords.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      query = `${keyword} ${region.name}`;
    }

    console.log(`🎯 [Lead Factory] Doelquery: "${query}"`);

    // 1. Zoek op Google Maps
    const discovered = await searchGoogleMaps(query, { limit: 5, headless: true });
    db.totalScanned += discovered.length;

    let processedInThisCycle = 0;

    for (const rawBusiness of discovered) {
      if (processedInThisCycle >= limit) break;

      // 2. Duplicatencontrole
      if (this.isLeadProcessed(db, rawBusiness)) {
        console.log(`⏭️ [Lead Factory] Bedrijf "${rawBusiness.name}" is al eerder verwerkt. Sla over.`);
        continue;
      }

      // 3. Kwalificatie (ZZP met potentie: géén website OF onbeveiligde/verouderde HTTP site)
      const isHttpOnly = rawBusiness.website && rawBusiness.website.startsWith('http://');
      const isCandidate = !rawBusiness.hasWebsite || isHttpOnly;

      if (!isCandidate && FACTORY_CONFIG.qualification.requireNoWebsiteOrOutdated) {
        console.log(`ℹ️ [Lead Factory] Bedrijf "${rawBusiness.name}" heeft al een moderne HTTPS website (${rawBusiness.website}).`);
        const skippedLogPath = path.join(__dirname, 'data', 'skipped.log');
        const logEntry = `[${new Date().toISOString()}] SKIPPED_HAS_WEBSITE: ${rawBusiness.name} (${rawBusiness.slug}) - ${rawBusiness.website}\n`;
        try {
          fs.appendFileSync(skippedLogPath, logEntry, 'utf-8');
        } catch (e) {
          console.warn('⚠️ Kon skipped.log niet bijwerken:', e.message);
        }
        continue;
      }

      if (isHttpOnly) {
        rawBusiness.httpNotice = "Verouderde/onveilige HTTP-verbinding (geen SSL-certificaat)";
        console.log(`⭐ [Lead Factory] Gekwalificeerde lead met verouderde HTTP site: "${rawBusiness.name}"!`);
      } else {
        console.log(`⭐ [Lead Factory] Gekwalificeerde lead ZONDER website: "${rawBusiness.name}"!`);
      }
      db.totalQualified++;


      // 4. Diepe verrijking
      const enriched = await enrichBusinessProfile(rawBusiness);

      // 5. Genereer Concept Website & Pitch via lokale 'agy' CLI
      const { html, pitch } = await generateConceptWebsiteWithAgy(enriched);
      db.totalGenerated++;

      // 6. Deploy via FTPS naar Vimexx
      const deployResult = await deployConceptToVimexx(enriched.slug, html);

      // 7. Opslaan in lokale Lead Database
      const newLead = {
        id: `lead_${Date.now()}_${enriched.slug}`,
        ...enriched,
        status: 'concept_ready',
        liveUrl: deployResult.liveUrl,
        deployMode: deployResult.mode,
        pitch: pitch,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        sentAt: null
      };

      db.leads.unshift(newLead);
      processedInThisCycle++;
      console.log(`🎉 [Lead Factory] Concept succesvol klaargezet in CRM queue: ${deployResult.liveUrl}`);
    }

    this.saveDatabase(db);
    if (processedInThisCycle > 0) {
      await syncLeadsDatabaseToVimexx().catch(() => {});
    }
    console.log(`📊 [Lead Factory] Cyclus voltooid. Totaal gereed voor review: ${db.leads.filter(l => l.status === 'concept_ready').length}`);
    return {
      processed: processedInThisCycle,
      totalInQueue: db.leads.filter(l => l.status === 'concept_ready').length
    };
  }

  /**
   * Start de 24/7 continue daemon loop
   */
  async startDaemon(intervalMinutes = 30) {
    console.log(`🚀 [Lead Factory] 24/7 Autonome Daemon Gestart!`);
    console.log(`⏰ Interval: elke ${intervalMinutes} minuten.`);
    console.log(`Druk op Ctrl+C om te stoppen.\n`);

    const run = async () => {
      try {
        await this.runCycle({ limit: 1 });
      } catch (err) {
        console.error(`❌ [Lead Factory] Fout in cyclus:`, err);
      }
    };

    // Eerste run direct
    await run();

    // Herhaal elke interval
    setInterval(run, intervalMinutes * 60 * 1000);
  }
}

// CLI Argument Sanitization & Bounds (CWE-20)
export function parseCliArgs(args = []) {
  const isDaemon = args.includes('--daemon');
  const limitArg = args.find(a => typeof a === 'string' && a.startsWith('--limit='));
  const queryArg = args.find(a => typeof a === 'string' && a.startsWith('--query='));
  const intervalArg = args.find(a => typeof a === 'string' && a.startsWith('--interval='));

  const rawLimit = limitArg ? parseInt(limitArg.slice(limitArg.indexOf('=') + 1), 10) : 1;
  const limit = Math.max(1, Math.min(50, isNaN(rawLimit) ? 1 : rawLimit));

  const rawQuery = queryArg ? queryArg.slice(queryArg.indexOf('=') + 1) : null;
  const query = rawQuery ? String(rawQuery).replace(/[\r\n\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : null;

  const rawInterval = intervalArg ? parseInt(intervalArg.slice(intervalArg.indexOf('=') + 1), 10) : 30;
  const interval = Math.max(1, Math.min(1440, isNaN(rawInterval) ? 30 : rawInterval));

  return { isDaemon, limit, query, interval };
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('run-engine.js')) {
  const args = process.argv.slice(2);
  const { isDaemon, limit, query, interval } = parseCliArgs(args);

  const engine = new LeadFactoryEngine();

  if (isDaemon) {
    engine.startDaemon(interval);
  } else {
    engine.runCycle({ limit, query }).then(() => {
      console.log(`🏁 Gereed.`);
      process.exit(0);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  }
}
