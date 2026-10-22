/**
 * Creation+Alt+Fix - Regional WhatsApp & E-mail Outreach Campaign Manager (TASK-906)
 * 
 * Roadmap: Week 4 & 5 - Blok 2: De Regionale MKB Verovering
 * Bron: docs/startup-bible/07-90-DAYS-EXECUTION-ROADMAP.md (Paragraaf 3)
 * 
 * Functionaliteiten:
 * 1. Prioriteert een cohort van 30 regionale vaklieden (Hoogezand, Veendam, Sappemeer, Winschoten & Groningen).
 * 2. Multi-channel pitch synthesizer (Allard's nuchtere Hoogezand WhatsApp script, .nl domein vrij haak,
 *    15s video preview reel, en het Groningse spraakbericht script voor 100% lokale gunfactor).
 * 3. Robuuste Nederlandse 06-nummer validatie & internationale WhatsApp click-to-chat URL generator.
 * 4. Frictieloze portaal onboarding & digitale offerte magic links (/status/?lead=<slug>&ref=outreach_w4).
 * 5. Campagne funnel telemetrie, conversieratio's en omzetprognose (€ 650 - € 850 deals).
 * 6. Hoogezand Success-Routine batchindeling (5-10 leads per dagblok ter voorkoming van WhatsApp rate limits).
 */

export const OUTREACH_CAMPAIGN_INFO = {
  id: 'cohort_w4_w5_regional',
  name: 'Regionale MKB Verovering (Week 4 & 5)',
  targetCohortSize: 30,
  minTargetDeals: 3,
  dealPricing: {
    min: 650,
    max: 850,
    standard: 750,
    depositPercentage: 50
  },
  sender: {
    name: 'Allard Veldman',
    agency: 'Creation+Alt+Fix',
    city: 'Hoogezand',
    phoneDisplay: '06 - 19135453',
    phoneInternational: '31619135453',
    kvk: '99986191',
    portalUrl: 'https://portal.creationaltfix.nl/crm/status/',
    marketingUrl: 'https://creationaltfix.nl'
  }
};

export const OUTREACH_STAGES = [
  'uncontacted',
  'queued',
  'sent_whatsapp',
  'sent_email',
  'viewed',
  'in_negotiation',
  'deal_closed',
  'declined'
];

/**
 * Normaliseert en valideert een Nederlands mobiel nummer voor WhatsApp integratie.
 * Converteert '06 12345678', '(06) 12 34 56 78', '+31 (0)6-12345678', etc. naar internationaal '316XXXXXXXX'.
 * Weert vaste netnummers (050, 0598, etc.), servicenummers (0800, 0900, 088, 085) en internationale nummers.
 * 
 * @param {string} phone 
 * @returns {{ valid: boolean, formatted: string, raw: string, error?: string }}
 */
export function normalizeDutchMobileForWhatsApp(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, formatted: '', raw: String(phone || ''), error: 'Geen telefoonnummer opgegeven' };
  }

  const raw = phone.trim();
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  // Detecteer en strip Nederlands kengetalprefix: +31, 0031 of 06
  if (cleaned.startsWith('+31(0)6')) {
    cleaned = '316' + cleaned.slice(7);
  } else if (cleaned.startsWith('+3106')) {
    cleaned = '316' + cleaned.slice(5);
  } else if (cleaned.startsWith('+316')) {
    cleaned = '316' + cleaned.slice(4);
  } else if (cleaned.startsWith('0031(0)6')) {
    cleaned = '316' + cleaned.slice(8);
  } else if (cleaned.startsWith('003106')) {
    cleaned = '316' + cleaned.slice(6);
  } else if (cleaned.startsWith('00316')) {
    cleaned = '316' + cleaned.slice(5);
  } else if (cleaned.startsWith('06')) {
    cleaned = '316' + cleaned.slice(2);
  }

  // Controleer of het nu een geldig Nederlands mobiel formaat is: 316 + 8 cijfers = 11 tekens
  const mobileRegex = /^316\d{8}$/;
  if (mobileRegex.test(cleaned)) {
    return { valid: true, formatted: cleaned, raw };
  }

  // Detecteer specifieke foutoorzaken voor heldere feedback
  if (/^(\+?31|0)(50|598|597|591|592|512|58|20|10|30)/.test(cleaned)) {
    return { valid: false, formatted: '', raw, error: 'Vast netnummer (geen mobiel/WhatsApp nummer)' };
  }
  if (/^(\+?31|0)(800|900|88|85)/.test(cleaned)) {
    return { valid: false, formatted: '', raw, error: 'Bedrijfs- of servicenummer (geen WhatsApp)' };
  }
  if (cleaned.startsWith('+') && !cleaned.startsWith('+31')) {
    return { valid: false, formatted: '', raw, error: 'Buitenlands telefoonnummer' };
  }

  return { valid: false, formatted: '', raw, error: 'Geen geldig 10-cijferig Nederlands 06-nummer' };
}

/**
 * Genereert een officiële WhatsApp Click-to-Chat URL (https://wa.me/316.../?text=...).
 * 
 * @param {string} phone 
 * @param {string} message 
 * @returns {string} Geformatteerde WhatsApp URL
 */
export function generateWhatsAppDispatchUrl(phone, message = '') {
  const norm = normalizeDutchMobileForWhatsApp(phone);
  if (!norm.valid) {
    throw new Error(`Kan geen WhatsApp URL genereren: ${norm.error} ('${phone}')`);
  }
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const encoded = encodeURIComponent(cleanMessage);
  return `https://wa.me/${norm.formatted}?text=${encoded}`;
}

/**
 * Genereert een beveiligde, directe link naar het klantenportaal (/status/)
 * voor geaccordeerde vakmensen inclusief pre-filled project en lead metadata.
 * 
 * @param {Object} lead 
 * @param {Object} [options]
 * @param {number} [options.price=750]
 * @param {string} [options.campaign='outreach_w4']
 * @returns {string} URL naar /status/
 */
export function generatePortalProposalLink(lead, options = {}) {
  if (!lead) return OUTREACH_CAMPAIGN_INFO.sender.portalUrl;
  const slug = encodeURIComponent(String(lead.slug || lead.id || '').trim());
  const campaign = encodeURIComponent(String(options.campaign || 'outreach_w4').trim());
  const price = Math.max(650, Math.min(850, Number(options.price) || OUTREACH_CAMPAIGN_INFO.dealPricing.standard));
  
  return `${OUTREACH_CAMPAIGN_INFO.sender.portalUrl}?lead=${slug}&ref=${campaign}&amount=${price}`;
}

/**
 * Multi-channel outreach pitch synthesizer.
 * Genereert gepersonaliseerde berichten conform Allard's nuchtere Hoogezand succesformule.
 * 
 * @param {Object} lead 
 * @param {Object} [options]
 * @param {('auto'|'nuchter_direct'|'domain_free'|'video_reel'|'gronings_voicenote'|'view_followup'|'portal_proposal'|'email_formal')} [options.template='auto']
 * @param {('whatsapp'|'email'|'sms')} [options.channel='whatsapp']
 * @param {number} [options.price=750]
 * @returns {Object} Gesynthetiseerde pitch met tekst, onderwerp, metadata en dispatch URLs
 */
export function synthesizeRegionalPitch(lead, options = {}) {
  if (!lead || typeof lead !== 'object') {
    throw new Error('Geldige lead data vereist voor pitch synthese');
  }

  const rawTemplate = options.template || 'auto';
  const channel = options.channel || 'whatsapp';
  const price = Math.max(650, Math.min(850, Number(options.price) || OUTREACH_CAMPAIGN_INFO.dealPricing.standard));

  const leadName = (lead.contactPerson || lead.name || 'Vakman').trim();
  const companyName = (lead.name || 'Jullie bedrijf').trim();
  const city = (lead.city || 'de regio').trim();
  const slug = (lead.slug || '').trim();
  const cleanConceptUrl = lead.liveUrl || `https://creationaltfix.nl/concept/${slug}/`;
  const domain = lead.recommendedDomain || (slug ? `${slug}.nl` : 'bedrijfsnaam.nl');
  
  const videoUrl = lead.videoPreview?.absoluteUrl ||
    (lead.videoPreview?.relativeUrl ? `https://creationaltfix.nl${lead.videoPreview.relativeUrl}` : `${cleanConceptUrl}video-preview.mp4`);
  
  const hasVideo = Boolean(lead.videoPreview?.generated || lead.videoPreview?.relativeUrl);
  const isDomainFree = Boolean(lead.isDomainAvailable || lead.domainCheck?.isAvailable);
  const isViewed = Number(lead.viewsCount || 0) > 0;

  // Intelligente auto-selectie van het meest converterende template
  let templateId = rawTemplate;
  if (templateId === 'auto') {
    if (isViewed) {
      templateId = 'view_followup';
    } else if (hasVideo) {
      templateId = 'video_reel';
    } else if (isDomainFree) {
      templateId = 'domain_free';
    } else {
      templateId = 'nuchter_direct';
    }
  }

  let text = '';
  let subject = '';
  let voicenoteTip = '';

  // 1. Spraakbericht script (troefkaart voor WhatsApp audio)
  const voiceNoteScript = `Hoi ${leadName}, Allard hier nog even kort van Creation+Alt+Fix in Hoogezand. Ik spreek het maar even in zodat je weet wie erachter zit. Ik zag jullie mooie klussen in ${city} voorbijkomen en gunde jullie gewoon een strakke, snelle mobiele site. Kijk er gerust naar op je telefoon wanneer het uitkomt, en als je vragen hebt app of bel me gerust!`;

  switch (templateId) {
    case 'nuchter_direct':
      subject = `Mobiel concept voor ${companyName} (${city})`;
      text = `Beste ${leadName},

Mijn naam is Allard van Creation+Alt+Fix hier uit de regio (Hoogezand).

Ik kwam je bedrijf tegen op Google en zag dat je website nog niet optimaal werkte op mobiele telefoons. Omdat ik lokale vakmensen graag help, heb ik alvast een modern, razendsnel concept gemaakt voor ${companyName}:

👉 ${cleanConceptUrl}

Het staat al werkend online, inclusief je Google reviews en openingstijden. Kijk er gerust even naar als je tijd hebt. Geen verplichtingen uiteraard!

Als je het mooi vindt, kunnen we het binnen 24 uur overzetten naar je eigen domein voor een vast tarief van € ${price},-.

Groet,
Allard Veldman
Creation+Alt+Fix | Hoogezand
Tel: 06 - 19135453`;
      voicenoteTip = voiceNoteScript;
      break;

    case 'domain_free':
      subject = `Belangrijk: ${domain} is nog vrij + nieuw mobiel concept voor ${companyName}`;
      text = `Hoi ${leadName}!

Allard hier van Creation+Alt+Fix in Hoogezand.

Ik heb alvast een razendsnelle mobiele website voor ${companyName} klaargezet:
👉 ${cleanConceptUrl}

🟢 Belangrijke tip: Ik zag via de officiële SIDN registercheck dat het domein '${domain}' op dit moment nog vrij is om te registreren. Zonde als een concurrent ermee vandoor gaat!

Als je wilt, claim ik het domein vandaag nog voor je en zetten we dit complete concept binnen 24 uur live voor een vast tarief van € ${price},-.

Kijk er rustig naar op je telefoon. Vragen? Stuur gerust een appje!

Groet,
Allard Veldman • 06 - 19135453`;
      voicenoteTip = voiceNoteScript;
      break;

    case 'video_reel':
      subject = `15s Video preview & concept voor ${companyName}`;
      text = `Hoi ${leadName}! Allard hier van Creation+Alt+Fix uit Hoogezand.

Ik zag jullie vermelding in ${city} en heb alvast een snel mobiel concept klaargezet:
👉 ${cleanConceptUrl}

Ik heb ook een korte 15s video-preview gemaakt van hoe jullie website eruit ziet op mobiel:
🎬 ${videoUrl}

Geen verplichtingen, kijk er gerust even naar als je pauze hebt op de klus!

Groet,
Allard • 06 - 19135453`;
      voicenoteTip = voiceNoteScript;
      break;

    case 'gronings_voicenote':
      subject = `Spraakbericht script voor ${leadName}`;
      text = voiceNoteScript;
      voicenoteTip = 'Stuur dit spraakbericht direct na je tekstbericht via WhatsApp voor maximale gunfactor.';
      break;

    case 'view_followup':
      subject = `Opvolging concept ${companyName} (${lead.viewsCount || 1}x bekeken)`;
      text = `Hoi ${leadName},

Allard hier van Creation+Alt+Fix!

Ik zag dat je net even hebt gekeken op het online concept dat ik voor ${companyName} had klaargezet:
👉 ${cleanConceptUrl}

Kon je alles goed vinden, of zijn er specifieke klussen of foto's die je er graag op zou willen zien? 

Als je wilt kunnen we de site morgen al live zetten op je eigen domein voor een vast tarief van € ${price},-.

Laat maar weten wat je denkt!

Groet,
Allard Veldman • 06 - 19135453`;
      voicenoteTip = `Hoi ${leadName}, Allard hier! Zag dat je het concept had geopend. Ben benieuwd wat je ervan vindt, laat gerust weten als je iets wilt aanpassen!`;
      break;

    case 'portal_proposal':
      const portalUrl = generatePortalProposalLink(lead, { price });
      subject = `Offerte & Voorstel voor ${companyName} (€ ${price},-)`;
      text = `Hoi ${leadName},

Hierbij de directe link naar het officiële voorstel en de oplever-omgeving voor ${companyName}:
👉 ${portalUrl}

Wat zit erin:
✅ Volledige livegang binnen 24 uur
✅ Inclusief eigen .nl domeinnaam en zakelijke mail
✅ Super snelle laadtijd (< 0.5s op smartphone)
✅ Vaste projectprijs: € ${price},- excl. BTW (50% aanbetaling via iDEAL)

Je kunt het voorstel hier met 1 klik digitaal bekijken en accorderen. Bij vragen ben ik bereikbaar op 06 - 19135453!

Groet,
Allard Veldman`;
      break;

    case 'email_formal':
    default:
      subject = `Nieuw modern mobiel webconcept voor ${companyName} (${city})`;
      text = `Geachte heer/mevrouw ${leadName},

Mijn naam is Allard Veldman, eigenaar van internetbureau Creation+Alt+Fix gevestigd in Hoogezand.

Tijdens een lokale inventarisatie in ${city} zag ik dat uw bedrijf ${companyName} nog geen optimale mobiele weergave heeft. Omdat lokale vakmensen het fundament zijn van onze regio, heb ik op eigen initiatief een werkend, razendsnel concept ontwikkeld:

👉 Bekijk het live concept: ${cleanConceptUrl}

Kenmerken van dit concept:
• Laadtijd onder 0,5 seconden op mobiele telefoons
• Directe WhatsApp en belfunctie voor particulieren
• Geïntegreerde Google recensies en openingstijden
• 100% AVG-proof en beveiligd met SSL

Dit concept kan binnen 24 uur worden opgeleverd op uw gewenste domeinnaam voor een eenmalig vast tarief van € ${price},- exclusief btw. Er zijn vooraf geen verplichtingen verbonden aan het inzien van het concept.

Heeft u interesse of wilt u kleine aanpassingen doorvoeren? U kunt mij direct bereiken via e-mail of telefonisch/WhatsApp op 06 - 19135453.

Met vriendelijke groet,

Allard Veldman
Creation+Alt+Fix
Hoogezand • KvK: 99986191
Tel: 06 - 19135453
Web: https://creationaltfix.nl`;
      break;
  }

  // Genereer WhatsApp dispatch URL indien telefoon beschikbaar is
  let whatsAppDispatchUrl = null;
  const phone = lead.phone || lead.normalizedPhone || lead.whatsAppNumber || '';
  const phoneValidation = normalizeDutchMobileForWhatsApp(phone);
  if (phoneValidation.valid) {
    try {
      whatsAppDispatchUrl = generateWhatsAppDispatchUrl(phoneValidation.formatted, text);
    } catch {
      whatsAppDispatchUrl = null;
    }
  }

  return {
    templateId,
    channel,
    subject,
    text,
    leadSlug: slug,
    leadName,
    companyName,
    city,
    phoneValidation,
    whatsAppDispatchUrl,
    magicPortalUrl: generatePortalProposalLink(lead, { price }),
    voicenoteTip,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Bouwt een geprioriteerde cohort-wachtrij van 30 regionale vaklieden (Week 4 & 5).
 * Selecteert en sorteert leads op hoogste conversiepotentieel:
 * 1. Geldig Nederlands 06-mobiel nummer aanwezig
 * 2. Aanwezigheid van live concept link
 * 3. Hoge Google rating / review-volume
 * 4. Hoge kwalificatiescore
 * 5. Berekent followUpDueAt (3 dagen bij views, 5 dagen bij unviewed)
 * 
 * @param {Array<Object>} leads 
 * @param {Object} [options]
 * @param {number} [options.targetCount=30]
 * @param {number} [options.sessionBatchSize=10]
 * @returns {Object} Cohort met geprioriteerde leads, sessie-batches en samenvatting
 */
export function buildOutreachQueue(leads = [], options = {}) {
  if (!Array.isArray(leads)) return { queue: [], sessions: [], summary: {} };

  const targetCount = Math.max(1, Math.min(100, Number(options.targetCount) || OUTREACH_CAMPAIGN_INFO.targetCohortSize));
  const batchSize = Math.max(1, Math.min(30, Number(options.sessionBatchSize) || 10));

  // Filter leads: uitsluiten van overgeslagen leads of leads zonder naam/slug
  const candidates = leads.filter(l => {
    if (!l || typeof l !== 'object') return false;
    const st = String(l.status || '').toLowerCase();
    if (st === 'skipped' || st === 'skipped_has_website' || st === 'deal_closed' || st === 'declined') {
      return false;
    }
    return Boolean(l.slug || l.name);
  });

  // Score en prioriteer leads
  const scored = candidates.map(l => {
    let priorityScore = 0;

    // 1. Telefoonvalidatie (WhatsApp gereedheid is prioriteit #1)
    const phone = l.phone || l.normalizedPhone || l.whatsAppNumber || '';
    const phoneNorm = normalizeDutchMobileForWhatsApp(phone);
    if (phoneNorm.valid) {
      priorityScore += 40;
    } else if (l.phone) {
      priorityScore += 10;
    }

    // 2. Bekeken status (hoogste urgentie voor directe follow-up)
    const views = Number(l.viewsCount || 0);
    if (views > 0) {
      priorityScore += 35 + Math.min(15, views * 5);
    }

    // 3. Vrij domein aanwezig
    if (l.isDomainAvailable || l.domainCheck?.isAvailable) {
      priorityScore += 15;
    }

    // 4. Video preview gegenereerd
    if (l.videoPreview?.generated || l.videoPreview?.relativeUrl) {
      priorityScore += 10;
    }

    // 5. Google rating & reviews
    const rating = Number(l.rating || 0);
    const reviews = Number(l.reviewsCount || 0);
    if (rating >= 4.5) priorityScore += 10;
    if (reviews >= 5) priorityScore += 10;

    // 6. Kwalificatiescore van de Lead Factory
    const leadScore = Number(l.score || 0);
    priorityScore += Math.min(20, Math.round(leadScore / 5));

    // Bepaal followUpDueAt datum
    let followUpDueAt = null;
    if (l.sentAt || views > 0) {
      const baseTime = l.sentAt ? new Date(l.sentAt).getTime() : (l.lastViewedAt ? new Date(l.lastViewedAt).getTime() : Date.now());
      const followUpDays = views > 0 ? 3 : 5;
      followUpDueAt = new Date(baseTime + (followUpDays * 24 * 60 * 60 * 1000)).toISOString();
    }

    // Genereer de beste pitch
    const pitch = synthesizeRegionalPitch(l, { template: 'auto' });

    return {
      ...l,
      priorityScore,
      phoneValidation: phoneNorm,
      followUpDueAt,
      synthesizedPitch: pitch,
      outreachStage: l.status || (views > 0 ? 'viewed' : (l.sentAt ? 'sent_whatsapp' : 'queued'))
    };
  });

  // Sorteer aflopend op priorityScore
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Neem top N cohort
  const cohort = scored.slice(0, targetCount);

  // Verdeel in sessie-batches voor de Hoogezand Success Routine (10:00 - 11:30)
  const sessions = [];
  for (let i = 0; i < cohort.length; i += batchSize) {
    const sessionNumber = Math.floor(i / batchSize) + 1;
    const batchLeads = cohort.slice(i, i + batchSize);
    sessions.push({
      sessionNumber,
      title: `Ochtendroutine Blok ${sessionNumber} (10:00 - 11:30)`,
      recommendedSchedule: `Dag ${sessionNumber} - Week ${Math.min(5, 3 + Math.ceil(sessionNumber / 2))}`,
      leadsCount: batchLeads.length,
      leads: batchLeads
    });
  }

  const validPhoneCount = cohort.filter(l => l.phoneValidation.valid).length;
  const viewedCount = cohort.filter(l => Number(l.viewsCount || 0) > 0).length;

  return {
    campaignId: OUTREACH_CAMPAIGN_INFO.id,
    targetCount,
    totalEligible: scored.length,
    cohortSize: cohort.length,
    validMobileCount: validPhoneCount,
    viewedCount,
    queue: cohort,
    sessions,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Berekent diepgaande campagne telemetrie, conversieratio's en omzetstatistieken.
 * 
 * @param {Array<Object>} leads 
 * @param {Object} [options]
 * @returns {Object} Campagne KPI metrics
 */
export function calculateOutreachCampaignMetrics(leads = [], options = {}) {
  const cohortData = buildOutreachQueue(leads, options);
  const targetCohortSize = OUTREACH_CAMPAIGN_INFO.targetCohortSize;
  const standardPrice = OUTREACH_CAMPAIGN_INFO.dealPricing.standard;

  const eligibleLeads = Array.isArray(leads) ? leads.filter(l => {
    if (!l || typeof l !== 'object') return false;
    const st = String(l.status || '').toLowerCase();
    return st !== 'skipped' && st !== 'skipped_has_website';
  }) : [];

  let uncontactedCount = 0;
  let queuedCount = 0;
  let sentWhatsAppCount = 0;
  let sentEmailCount = 0;
  let viewedCount = 0;
  let inNegotiationCount = 0;
  let dealsClosedCount = 0;
  let declinedCount = 0;
  let totalViewsSum = 0;

  for (const l of eligibleLeads) {
    const st = String(l.outreachStage || l.status || '').toLowerCase();
    const views = Number(l.viewsCount || 0);
    totalViewsSum += views;

    if (st === 'deal_closed' || st === 'won' || st === 'accepted') {
      dealsClosedCount++;
    } else if (st === 'in_negotiation' || st === 'proposal_sent' || st === 'pending_agreement') {
      inNegotiationCount++;
    } else if (st === 'declined' || st === 'rejected') {
      declinedCount++;
    } else if (views > 0) {
      viewedCount++;
    } else if (st === 'sent_whatsapp' || (l.sentAt && l.outreachChannel === 'whatsapp')) {
      sentWhatsAppCount++;
    } else if (st === 'sent_email' || (l.sentAt && l.outreachChannel === 'email')) {
      sentEmailCount++;
    } else if (st === 'queued') {
      queuedCount++;
    } else {
      uncontactedCount++;
    }
  }

  const totalSent = sentWhatsAppCount + sentEmailCount + viewedCount + inNegotiationCount + dealsClosedCount;
  const totalEngaged = viewedCount + inNegotiationCount + dealsClosedCount;

  const viewRate = totalSent > 0 ? Math.round((totalEngaged / totalSent) * 100) : 0;
  const responseRate = totalSent > 0 ? Math.round(((inNegotiationCount + dealsClosedCount) / totalSent) * 100) : 0;
  const conversionRate = totalSent > 0 ? Math.round((dealsClosedCount / totalSent) * 100) : 0;

  // Financiële calculaties
  const closedRevenueEur = dealsClosedCount * standardPrice;
  const pipelinePotentialEur = (inNegotiationCount + (viewedCount * 0.4)) * standardPrice;
  const targetGoalAchieved = dealsClosedCount >= OUTREACH_CAMPAIGN_INFO.minTargetDeals;

  return {
    campaignId: OUTREACH_CAMPAIGN_INFO.id,
    targetCohortSize,
    actualCohortSize: Math.min(targetCohortSize, eligibleLeads.length),
    queuedOutreachCount: cohortData.cohortSize,
    pipeline: {
      uncontacted: uncontactedCount,
      queued: queuedCount,
      sentWhatsApp: sentWhatsAppCount,
      sentEmail: sentEmailCount,
      viewed: viewedCount,
      inNegotiation: inNegotiationCount,
      dealsClosed: dealsClosedCount,
      declined: declinedCount
    },
    funnel: {
      totalSent,
      totalViews: totalViewsSum,
      totalEngaged,
      viewRatePercentage: viewRate,
      responseRatePercentage: responseRate,
      conversionRatePercentage: conversionRate
    },
    financial: {
      standardDealPriceEur: standardPrice,
      closedRevenueEur,
      pipelinePotentialEur: Math.round(pipelinePotentialEur),
      totalExpectedRevenueEur: closedRevenueEur + Math.round(pipelinePotentialEur),
      targetRevenueGoalEur: OUTREACH_CAMPAIGN_INFO.minTargetDeals * standardPrice,
      targetGoalAchieved
    },
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Genereert een compleet, printklaar Markdown dossier voor Allard's 10:00 - 11:30 dagelijkse routine.
 * 
 * @param {Array<Object>} leads 
 * @param {Object} [options]
 * @returns {string} Markdown document
 */
export function generateOutreachDossierMarkdown(leads = [], options = {}) {
  const queueData = buildOutreachQueue(leads, options);
  const metrics = calculateOutreachCampaignMetrics(leads, options);
  const { queue, sessions } = queueData;

  const now = new Date().toISOString().slice(0, 10);

  let md = `# 📱 Regionale MKB Outreach Campagne Dossier (TASK-906)
> **Campagne**: ${OUTREACH_CAMPAIGN_INFO.name}  
> **Doel**: 30 Benaderde Vaklieden • Minimaal 3 tot 5 Deals à € 650 - € 850  
> **Status Datum**: ${now} • **Locatie**: Hoogezand, Groningen  

---

## 📊 1. Funnel & Conversie Dashboard

| KPI Indicator | Waarde | Doelstelling | Status |
| :--- | :--- | :--- | :--- |
| **Geselecteerd Cohort** | **${queue.length} vaklieden** | 30 bedrijven | ${queue.length >= 30 ? '✅ 100% Volledig' : '⚡ In opbouw'} |
| **Verzonden Pitches** | **${metrics.funnel.totalSent} verstuurd** | 30 outreach pings | ${metrics.funnel.totalSent >= 10 ? '🔥 Op schema' : '⏳ Wachtrij klaargezet'} |
| **Concepten Bekeken** | **${metrics.pipeline.viewed + metrics.pipeline.inNegotiation + metrics.pipeline.dealsClosed} vaklieden (${metrics.funnel.viewRatePercentage}%)** | > 35% view rate | ${metrics.funnel.viewRatePercentage >= 35 ? '🏆 Uitstekend' : '📈 Actief'} |
| **In Onderhandeling** | **${metrics.pipeline.inNegotiation} leads** | 5 gesprekken | 💬 Actief via WhatsApp |
| **Gesloten Deals** | **${metrics.pipeline.dealsClosed} deals** | 3 - 5 deals | ${metrics.financial.targetGoalAchieved ? '🎉 Doel behaald!' : '🎯 In uitvoering'} |
| **Gerealiseerde Omzet** | **€ ${metrics.financial.closedRevenueEur},-** | € 2.500 - € 4.000 | 💰 Vaste marge (96%) |
| **Verwachte Pipeline** | **€ ${metrics.financial.totalExpectedRevenueEur},-** | € 3.750,- | 🚀 Gezonde orderportefeuille |

---

## ⏰ 2. De Hoogezand Ochtend-Routine (10:00 - 11:30)

Om WhatsApp spamfiltering te voorkomen en 100% persoonlijke aandacht te borgen, benadert Allard maximaal **5 tot 10 ondernemers per dagblok**:

\`\`\`
10:00 - 10:15  Inspecteer de 5-10 klaargezette leads van vandaag in het CRM.
10:15 - 10:45  Verstuur per lead het WhatsApp tekstberichtje via de 1-klik 'WhatsApp Openen' knop.
10:45 - 11:15  Spreek direct na het tekstbericht het 15-seconden spraakberichtje in (breekt argwaan!).
11:15 - 11:30  Markeer de leads als 'sent_whatsapp' in het CRM en noteer eventuele reacties.
\`\`\`

---

## 📋 3. Prioritaire Actielijst (Cohort van ${queue.length} Vaklieden)

| # | Bedrijfsnaam | Stad | Vakbranche | Mobiel (06) | Score | Status | Actielink |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  queue.forEach((lead, idx) => {
    const num = idx + 1;
    const name = lead.name || 'Onbekend';
    const city = lead.city || 'Regio';
    const cat = (lead.category || 'Vakman').split('&')[0].trim();
    const phone = lead.phoneValidation?.valid ? lead.phoneValidation.formatted : (lead.phone || '-');
    const score = lead.priorityScore || 0;
    const stage = lead.outreachStage || 'queued';
    const link = lead.liveUrl ? `[Concept](https://creationaltfix.nl/concept/${lead.slug}/)` : '-';
    
    md += `| ${num} | **${name}** | ${city} | ${cat} | \`${phone}\` | ${score} | \`${stage}\` | ${link} |\n`;
  });

  md += `\n---\n\n## 💬 4. Kant-en-Klare Scripts\n\n`;
  md += `### WhatsApp Bericht (Tekst)\n\`\`\`text\n${synthesizeRegionalPitch(queue[0] || { name: 'Klusbedrijf De Vries', city: 'Hoogezand', slug: 'klusbedrijf-de-vries' }, { template: 'nuchter_direct' }).text}\n\`\`\`\n\n`;
  md += `### WhatsApp Spraakbericht Script (20 Seconden)\n> *"Hoi [Naam], Allard hier nog even kort van Creation+Alt+Fix in Hoogezand. Ik spreek het maar even in zodat je weet wie erachter zit. Ik zag jullie mooie klussen in de regio voorbijkomen en gunde jullie gewoon een strakke mobiele site. Kijk er rustig naar wanneer het uitkomt, en als je vragen hebt app of bel me gerust!"*\n\n`;

  return md;
}
