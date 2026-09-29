import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FACTORY_CONFIG } from './config/factory-config.js';
import { searchGoogleMaps } from './discovery/maps-crawler.js';
import { enrichBusinessProfile } from './enrichment/deep-intelligence.js';
import { generateConceptWebsiteWithAgy } from './generator/agy-generator.js';
import { deployConceptToVimexx } from './deployer/vimexx-ftps.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Laad regio's en sectoren
const regionsPath = path.join(__dirname, 'config', 'regions.json');
const sectorsPath = path.join(__dirname, 'config', 'sectors.json');
const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf-8'));
const sectors = JSON.parse(fs.readFileSync(sectorsPath, 'utf-8'));

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
      fs.writeFileSync(this.databaseFile, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  loadDatabase() {
    this.ensureDatabase();
    return JSON.parse(fs.readFileSync(this.databaseFile, 'utf-8'));
  }

  saveDatabase(db) {
    db.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.databaseFile, JSON.stringify(db, null, 2), 'utf-8');
  }

  isLeadProcessed(db, business) {
    const slug = business.slug;
    const phone = business.phone ? business.phone.replace(/\D/g, '') : null;
    return db.leads.some(l => {
      if (l.slug === slug) return true;
      if (phone && l.phone && l.phone.replace(/\D/g, '') === phone) return true;
      return false;
    });
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
        db.leads.push({
          ...rawBusiness,
          status: 'skipped_has_website',
          processedAt: new Date().toISOString()
        });
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

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('run-engine.js')) {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const queryArg = args.find(a => a.startsWith('--query='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1;
  const query = queryArg ? queryArg.split('=')[1] : null;

  const engine = new LeadFactoryEngine();

  if (isDaemon) {
    const intervalArg = args.find(a => a.startsWith('--interval='));
    const interval = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : 30;
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
