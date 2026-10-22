/**
 * Creation+Alt+Fix - Provincial Batch & Sector Conversion Analytics Engine (TASK-908)
 * 
 * Roadmap: Week 11 - Opschalen van Regio naar Provincie (Groningen, Assen, Drachten & Emmen)
 * Functionaliteiten:
 * 1. Generatie van 20 gerichte provinciale zoekopdrachten over prioriteitsbranches en provinciecentra.
 * 2. Conversie- & prestatieanalyse per vakbranche (welke sector converteert sneller: schilders of loodgieters?).
 * 3. Regionale dekkingsscore over Groningen, Drenthe en Friesland grensregio.
 */

export const PROVINCIAL_TARGET_REGIONS = [
  { name: 'Groningen', province: 'Groningen', lat: 53.2194, lng: 6.5665, priority: 1 },
  { name: 'Assen', province: 'Drenthe', lat: 52.9925, lng: 6.5625, priority: 1 },
  { name: 'Drachten', province: 'Friesland', lat: 53.1060, lng: 6.1000, priority: 1 },
  { name: 'Emmen', province: 'Drenthe', lat: 52.7792, lng: 6.9069, priority: 1 },
  { name: 'Hoogezand', province: 'Groningen', lat: 53.1616, lng: 6.7583, priority: 2 },
  { name: 'Veendam', province: 'Groningen', lat: 53.1000, lng: 6.8750, priority: 2 },
  { name: 'Hoogeveen', province: 'Drenthe', lat: 52.7289, lng: 6.4764, priority: 2 },
  { name: 'Winschoten', province: 'Groningen', lat: 53.1436, lng: 7.0347, priority: 2 }
];

export const PROVINCIAL_PRIORITY_SECTORS = [
  { id: 'dakdekker', label: 'Dakdekkers & Zinkwerk', keywords: ['dakdekker', 'dakrenovatie'] },
  { id: 'loodgieter', label: 'Loodgieters & Installatietechniek', keywords: ['loodgieter', 'installatiebedrijf', 'cv ketel'] },
  { id: 'schilder', label: 'Schilders & Glaszetters', keywords: ['schilder', 'buitenschilder'] },
  { id: 'stukadoor', label: 'Stukadoors & Afbouw', keywords: ['stukadoor', 'stucadoor'] },
  { id: 'hovenier', label: 'Hoveniers & Stratenmakers', keywords: ['hovenier', 'stratenmaker', 'bestrating'] },
  { id: 'elektricien', label: 'Elektriciens & Verduurzaming', keywords: ['elektricien', 'groepenkast', 'laadpaal'] },
  { id: 'klusbedrijf', label: 'Klus- & Timmerbedrijven', keywords: ['klusbedrijf', 'timmerman', 'aannemer'] }
];

/**
 * Genereert een gebalanceerde provinciale batch zoekopdrachten (standaard 20 stuks voor Week 11)
 * @param {Object} options
 * @param {number} [options.count=20] Aantal queries (geclamped tussen 1 en 100)
 * @param {Array<string>} [options.regions] Optionele custom steden/regio's
 * @param {Array<string>} [options.keywords] Optionele custom trefwoorden
 * @returns {Array<string>} Array van unieke zoekquery-strings
 */
export function generateProvincialBatchQueries(options = {}) {
  const rawCount = typeof options.count === 'number' ? options.count : 20;
  const count = Math.max(1, Math.min(100, Math.floor(rawCount) || 20));

  const targetRegions = Array.isArray(options.regions) && options.regions.length > 0
    ? options.regions.map(r => String(r).trim()).filter(Boolean)
    : ['Groningen', 'Assen', 'Drachten', 'Emmen', 'Hoogeveen', 'Hoogezand', 'Veendam', 'Winschoten'];

  const targetKeywords = Array.isArray(options.keywords) && options.keywords.length > 0
    ? options.keywords.map(k => String(k).trim()).filter(Boolean)
    : [
        'dakdekker',
        'loodgieter',
        'installateur',
        'schilder',
        'stukadoor',
        'hovenier',
        'stratenmaker',
        'elektricien',
        'klusbedrijf',
        'timmerman'
      ];

  const queries = [];
  const seen = new Set();

  // Ronde-1: Interleave top vakken met kernprovinciecentra
  for (let k = 0; k < targetKeywords.length; k++) {
    for (let r = 0; r < targetRegions.length; r++) {
      const q = `${targetKeywords[k]} ${targetRegions[r]}`.trim();
      if (!seen.has(q.toLowerCase())) {
        seen.add(q.toLowerCase());
        queries.push(q);
        if (queries.length >= count) return queries;
      }
    }
  }

  // Fallback indien meer queries nodig dan unieke combinaties
  let i = 0;
  while (queries.length < count) {
    const k = targetKeywords[i % targetKeywords.length];
    const r = targetRegions[i % targetRegions.length];
    const altQ = `${k} in ${r}`;
    if (!seen.has(altQ.toLowerCase())) {
      seen.add(altQ.toLowerCase());
      queries.push(altQ);
    } else {
      queries.push(`${k} ${r} ${queries.length + 1}`);
    }
    i++;
  }

  return queries.slice(0, count);
}

/**
 * Classificeert een lead naar een canonieke vaksector op basis van categorie, naam en trefwoorden
 * @param {Object} lead
 * @returns {string} Sector ID
 */
export function classifyLeadSector(lead = {}) {
  const combined = `${lead.category || ''} ${lead.name || ''} ${lead.slug || ''}`.toLowerCase();

  if (combined.includes('dak') || combined.includes('zink') || combined.includes('bitumen')) {
    return 'dakdekker';
  }
  if (combined.includes('ontstop') || combined.includes('riool') || combined.includes('loodgieter') || combined.includes('installat') || combined.includes('cv ') || combined.includes('warmtepomp')) {
    return 'loodgieter';
  }
  if (combined.includes('schilder') || combined.includes('glaszet') || combined.includes('lakwerk')) {
    return 'schilder';
  }
  if (combined.includes('stukadoor') || combined.includes('stuc') || combined.includes('spack') || combined.includes('afbouw')) {
    return 'stukadoor';
  }
  if (combined.includes('hovenier') || combined.includes('tuin') || combined.includes('stratenmaker') || combined.includes('bestrat')) {
    return 'hovenier';
  }
  if (combined.includes('elektr') || combined.includes('groepenkast') || combined.includes('laadpaal')) {
    return 'elektricien';
  }
  if (combined.includes('timmer') || combined.includes('klus') || combined.includes('aannem') || combined.includes('bouw')) {
    return 'klusbedrijf';
  }
  return 'overig';
}

/**
 * Berekent diepgaande conversieratio's per sector en regionale dekkingsstatistieken (Week 11 - Task 11.3)
 * @param {Array<Object>} leads Leads array uit database
 * @returns {Object} Analyse rapport met statistieken per branche
 */
export function calculateSectorConversionMetrics(leads = []) {
  const safeLeads = Array.isArray(leads) ? leads.filter(l => l && typeof l === 'object') : [];

  const sectorMap = {
    dakdekker: { id: 'dakdekker', label: 'Dakdekkers & Zinkwerk', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] },
    loodgieter: { id: 'loodgieter', label: 'Loodgieters & Installatietechniek', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] },
    schilder: { id: 'schilder', label: 'Schilders & Glaszetters', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] },
    stukadoor: { id: 'stukadoor', label: 'Stukadoors & Afbouw', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] },
    hovenier: { id: 'hovenier', label: 'Hoveniers & Stratenmakers', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] },
    elektricien: { id: 'elektricien', label: 'Elektriciens & Verduurzaming', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] },
    klusbedrijf: { id: 'klusbedrijf', label: 'Klus- & Timmerbedrijven', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] },
    overig: { id: 'overig', label: 'Overige Vaklieden & Diensten', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0, ratings: [] }
  };

  const regionalMap = new Map();

  for (const lead of safeLeads) {
    const sectorKey = classifyLeadSector(lead);
    const sec = sectorMap[sectorKey] || sectorMap.overig;

    sec.totalLeads++;
    if (lead.hasWebsite || (lead.website && String(lead.website).startsWith('http'))) {
      sec.withWebsite++;
    } else {
      sec.noWebsite++;
    }

    const views = Math.max(0, parseInt(lead.viewsCount || 0, 10) || 0);
    sec.viewsCount += views;
    if (views > 0 || lead.lastViewedAt) {
      sec.viewedLeadsCount++;
    }

    const st = String(lead.status || '').toLowerCase();
    const isSent = st === 'sent' || st.includes('sent_') || st.includes('_sent') || Boolean(lead.sentAt);
    if (isSent) {
      sec.sentCount++;
    }

    const isConverted = st === 'deal_closed' || st === 'accepted' || st === 'won' || st === 'client' || lead.isConverted === true;
    if (isConverted) {
      sec.convertedCount++;
    }

    if (typeof lead.rating === 'number' && !isNaN(lead.rating)) {
      sec.ratings.push(lead.rating);
    }

    // Regionale aggregatie
    const city = String(lead.city || lead.region || 'Onbekend').trim() || 'Onbekend';
    if (!regionalMap.has(city)) {
      regionalMap.set(city, { city, totalLeads: 0, viewsCount: 0, convertedCount: 0 });
    }
    const regStat = regionalMap.get(city);
    regStat.totalLeads++;
    regStat.viewsCount += views;
    if (isConverted) regStat.convertedCount++;
  }

  // Finaliseer sector statistieken en bereken ratio's
  const sectorsArray = Object.values(sectorMap).map(sec => {
    const viewRate = sec.totalLeads > 0
      ? Math.round((sec.viewedLeadsCount / sec.totalLeads) * 1000) / 10
      : 0;

    const conversionRate = sec.totalLeads > 0
      ? Math.round((sec.convertedCount / sec.totalLeads) * 1000) / 10
      : 0;

    const outreachConversionRate = sec.sentCount > 0
      ? Math.round((sec.convertedCount / sec.sentCount) * 1000) / 10
      : 0;

    const avgRating = sec.ratings.length > 0
      ? Math.round((sec.ratings.reduce((a, b) => a + b, 0) / sec.ratings.length) * 10) / 10
      : null;

    return {
      id: sec.id,
      label: sec.label,
      totalLeads: sec.totalLeads,
      withWebsite: sec.withWebsite,
      noWebsite: sec.noWebsite,
      viewsCount: sec.viewsCount,
      viewedLeadsCount: sec.viewedLeadsCount,
      viewRate,
      sentCount: sec.sentCount,
      convertedCount: sec.convertedCount,
      conversionRate,
      outreachConversionRate,
      averageRating: avgRating
    };
  });

  // Sorteer branches op prestatie: conversieratio (DESC), dan bekeken leads (DESC), dan totalLeads (DESC)
  sectorsArray.sort((a, b) => {
    if (b.conversionRate !== a.conversionRate) return b.conversionRate - a.conversionRate;
    if (b.viewsCount !== a.viewsCount) return b.viewsCount - a.viewsCount;
    return b.totalLeads - a.totalLeads;
  });

  // Bepaal de best convertirerende sector (Top Sector)
  const activeSectorsWithLeads = sectorsArray.filter(s => s.totalLeads > 0);
  const topConvertingSector = activeSectorsWithLeads.length > 0 ? activeSectorsWithLeads[0] : null;

  // Provinciale dekkingsscore
  const coreHubs = ['groningen', 'assen', 'drachten', 'emmen', 'hoogezand', 'veendam'];
  const coveredHubs = coreHubs.filter(hub => {
    for (const [cityName] of regionalMap.entries()) {
      if (cityName.toLowerCase().includes(hub)) return true;
    }
    return false;
  });
  const provincialCoverageScore = Math.round((coveredHubs.length / coreHubs.length) * 100);

  const summary = {
    totalLeads: safeLeads.length,
    totalViews: sectorsArray.reduce((acc, s) => acc + s.viewsCount, 0),
    totalSent: sectorsArray.reduce((acc, s) => acc + s.sentCount, 0),
    totalConverted: sectorsArray.reduce((acc, s) => acc + s.convertedCount, 0),
    overallConversionRate: safeLeads.length > 0
      ? Math.round((sectorsArray.reduce((acc, s) => acc + s.convertedCount, 0) / safeLeads.length) * 1000) / 10
      : 0,
    provincialCoverageScore,
    coveredHubs,
    targetHubs: coreHubs
  };

  const regionalBreakdown = Array.from(regionalMap.values()).sort((a, b) => b.totalLeads - a.totalLeads);

  return {
    summary,
    sectors: sectorsArray,
    topConvertingSector,
    regionalBreakdown,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Genereert een beknopt ASCII rapport voor weergave in logs of de CRM admin console
 * @param {Array<Object>} leads
 * @returns {string}
 */
export function exportProvincialReport(leads = []) {
  const metrics = calculateSectorConversionMetrics(leads);
  const lines = [];

  lines.push(`============================================================`);
  lines.push(`📊 CREATION+ALT+FIX - PROVINCIALE BATCH 2 & SECTOR CONVERSIE`);
  lines.push(`============================================================`);
  lines.push(`Totaal Leads      : ${metrics.summary.totalLeads}`);
  lines.push(`Totaal Views      : ${metrics.summary.totalViews} (Zero-Cookie)`);
  lines.push(`Uitgestuurd       : ${metrics.summary.totalSent}`);
  lines.push(`Deals Geconverteerd: ${metrics.summary.totalConverted} (${metrics.summary.overallConversionRate}%)`);
  lines.push(`Provinciale Dekking: ${metrics.summary.provincialCoverageScore}% (${metrics.summary.coveredHubs.join(', ') || 'Nog geen'})`);
  lines.push(`------------------------------------------------------------`);
  lines.push(`🏆 TOP CONVERTERENDE BRANCHE: ${metrics.topConvertingSector ? metrics.topConvertingSector.label : 'Nog onvoldoende data'}`);
  if (metrics.topConvertingSector) {
    lines.push(`   • Conversieratio: ${metrics.topConvertingSector.conversionRate}% | Views: ${metrics.topConvertingSector.viewsCount} | Deals: ${metrics.topConvertingSector.convertedCount}`);
  }
  lines.push(`------------------------------------------------------------`);
  lines.push(`RANKING PER BRANCHE:`);
  for (const s of metrics.sectors) {
    if (s.totalLeads > 0) {
      lines.push(` • ${s.label.padEnd(32)}: ${String(s.totalLeads).padStart(2)} leads | ${String(s.viewsCount).padStart(2)} views | ${s.conversionRate}% conversie`);
    }
  }
  lines.push(`============================================================\n`);

  return lines.join('\n');
}
