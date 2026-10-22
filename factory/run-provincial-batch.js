/**
 * Creation+Alt+Fix - Week 11: Provinciale Batch 2 Runner (TASK-908)
 * 
 * Schalen van Regio naar Provincie:
 * - Groningen-Stad, Assen, Drachten en Emmen
 * - Batchgrootte: 20 gerichte zoekopdrachten per cyclus
 * - Live sector conversie-evaluatie
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LeadFactoryEngine } from './run-engine.js';
import { generateProvincialBatchQueries, calculateSectorConversionMetrics, exportProvincialReport } from './batch/batch-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runProvincialBatch2(options = {}) {
  const count = typeof options.count === 'number' ? Math.max(1, Math.min(50, options.count)) : 20;
  const isDryRun = Boolean(options.dryRun);
  const isAnalyticsOnly = Boolean(options.analyticsOnly);

  const engine = options.engineInstance || new LeadFactoryEngine();
  const db = engine.loadDatabase();

  console.log(`\n============================================================`);
  console.log(`🏭 [Lead Factory] Start Week 11: Provinciale Batch 2`);
  console.log(`🎯 Doel: Schalen naar Groningen, Assen, Drachten & Emmen`);
  console.log(`🔢 Aantal gerichte queries: ${count}`);
  console.log(`============================================================\n`);

  if (isAnalyticsOnly) {
    const report = exportProvincialReport(db.leads || []);
    console.log(report);
    return {
      mode: 'analytics_only',
      metrics: calculateSectorConversionMetrics(db.leads || [])
    };
  }

  const queries = generateProvincialBatchQueries({ count, regions: options.regions, keywords: options.keywords });
  console.log(`📋 Gegenereerde provinciale queue (${queries.length} queries):`);
  queries.forEach((q, idx) => console.log(`   ${String(idx + 1).padStart(2)}. "${q}"`));
  console.log('');

  if (isDryRun) {
    console.log(`ℹ️ [Batch 2] Droogtest modus actief. Geen live netwerkverzoeken verstuurd.`);
    return {
      mode: 'dry_run',
      queries,
      totalQueries: queries.length,
      currentLeadsCount: (db.leads || []).length
    };
  }

  let totalProcessed = 0;
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`🔍 [${i + 1}/${queries.length}] Scannen van provinciale query: "${q}"...`);
    console.log(`------------------------------------------------------------`);

    try {
      const res = await engine.runCycle({ query: q, limit: 1 });
      totalProcessed += (res.processed || 0);
    } catch (err) {
      console.warn(`⚠️ [Batch 2] Waarschuwing bij query "${q}":`, err.message);
    }

    // Menselijke scraping cadence interval
    await new Promise(r => setTimeout(r, 2000));
  }

  const updatedDb = engine.loadDatabase();
  const metrics = calculateSectorConversionMetrics(updatedDb.leads || []);

  console.log(`\n============================================================`);
  console.log(`🎉 [Batch 2] Provinciale scan voltooid!`);
  console.log(`📊 Nieuw verwerkt in deze batch : ${totalProcessed}`);
  console.log(`📈 Totaal leads in provinciaal dossier: ${updatedDb.leads.length}`);
  console.log(`🏆 Best convertirerende branche : ${metrics.topConvertingSector ? metrics.topConvertingSector.label : 'N/A'}`);
  console.log(`🌐 Provinciale dekkingsscore     : ${metrics.summary.provincialCoverageScore}%`);
  console.log(`============================================================\n`);

  return {
    mode: 'live',
    queries,
    totalProcessed,
    metrics
  };
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('run-provincial-batch.js')) {
  const args = process.argv.slice(2);
  const countArg = args.find(a => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 20;
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const analyticsOnly = args.includes('--analytics') || args.includes('--report');

  runProvincialBatch2({ count, dryRun, analyticsOnly }).then(() => {
    process.exit(0);
  }).catch(err => {
    console.error("Fatale fout in Batch 2 runner:", err);
    process.exit(1);
  });
}
