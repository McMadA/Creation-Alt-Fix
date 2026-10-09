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

async function runWeek3Batch() {
  console.log(`\n============================================================`);
  console.log(`🏭 [Week 3 Pipeline] Start 10-Sector Scan Hoogezand & Sappemeer`);
  console.log(`============================================================\n`);

  const engine = new LeadFactoryEngine();
  let totalProcessed = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`🔍 [${i + 1}/${queries.length}] Verwerken van query: "${q}"...`);
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
  console.log(`🎉 [Week 3 Pipeline] 10 Zoekopdrachten Voltooid!`);
  console.log(`📊 Totaal nieuw gegenereerd in deze batch: ${totalProcessed}`);
  console.log(`============================================================\n`);
}

runWeek3Batch().then(() => {
  process.exit(0);
}).catch(err => {
  console.error("Fatale fout in Week 3 batch:", err);
  process.exit(1);
});
