/**
 * Creation+Alt+Fix - Week 3 Pipeline Droogtest Runner
 * Voert 10 gerichte zoekopdrachten uit voor Hoogezand en Sappemeer,
 * genereert concepten en synchroniseert deze naar het CRM en live via FTPS.
 */

import { LeadFactoryEngine } from './run-engine.js';

const queries = [
  "dakdekker Hoogezand",
  "hovenier Hoogezand",
  "loodgieter Hoogezand",
  "installateur Hoogezand",
  "dakdekker Sappemeer",
  "hovenier Sappemeer",
  "installateur Sappemeer",
  "klusbedrijf Sappemeer",
  "schilder Hoogezand",
  "elektricien Hoogezand"
];

export async function runWeek3Batch(customQueries = null, engineInstance = null) {
  const activeQueries = Array.isArray(customQueries) && customQueries.length > 0
    ? customQueries.map(q => String(q).replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim().slice(0, 120)).filter(Boolean).slice(0, 20)
    : queries;

  console.log(`\n============================================================`);
  console.log(`🏭 [Week 3 Pipeline] Start ${activeQueries.length}-Sector Scan`);
  console.log(`============================================================\n`);

  const engine = engineInstance || new LeadFactoryEngine();
  let totalProcessed = 0;

  for (let i = 0; i < activeQueries.length; i++) {
    const q = activeQueries[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`🔍 [${i + 1}/${activeQueries.length}] Verwerken van query: "${q}"...`);
    console.log(`------------------------------------------------------------`);

    try {
      const res = await engine.runCycle({ query: q, limit: 1 });
      totalProcessed += (res.processed || 0);
    } catch (err) {
      console.warn(`⚠️ [Week 3] Waarschuwing bij query "${q}":`, err.message);
    }

    // Korte pauze tussen queries voor menselijke scraping cadence
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n============================================================`);
  console.log(`🎉 [Week 3 Pipeline] ${activeQueries.length} Zoekopdrachten Voltooid!`);
  console.log(`📊 Totaal nieuw gegenereerd in deze batch: ${totalProcessed}`);
  console.log(`============================================================\n`);

  return { totalProcessed, queriesCount: activeQueries.length };
}

if (process.argv[1] && process.argv[1].endsWith('run-week3-pipeline.js')) {
  runWeek3Batch().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error("Fatale fout in Week 3 batch:", err);
    process.exit(1);
  });
}
