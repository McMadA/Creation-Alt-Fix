#!/usr/bin/env node
/**
 * Creation+Alt+Fix - Regional Outreach Campaign CLI Runner (TASK-906)
 * 
 * Gebruik:
 *   node scripts/run-regional-outreach.mjs --status
 *   node scripts/run-regional-outreach.mjs --queue [--session 1]
 *   node scripts/run-regional-outreach.mjs --preview [--slug <slug>] [--template auto|nuchter|domain_free|video_reel|voicenote]
 *   node scripts/run-regional-outreach.mjs --export [--output path]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  OUTREACH_CAMPAIGN_INFO,
  buildOutreachQueue,
  calculateOutreachCampaignMetrics,
  generateOutreachDossierMarkdown,
  synthesizeRegionalPitch,
  generateWhatsAppDispatchUrl,
  normalizeDutchMobileForWhatsApp
} from '../crm/admin/js/modules/regional-outreach-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    status: false,
    queue: false,
    preview: false,
    export: false,
    slug: null,
    template: 'auto',
    session: null,
    count: 30,
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--status') options.status = true;
    else if (arg === '--queue') options.queue = true;
    else if (arg === '--preview') options.preview = true;
    else if (arg === '--export') options.export = true;
    else if (arg === '--slug' && args[i + 1]) options.slug = args[++i];
    else if (arg === '--template' && args[i + 1]) options.template = args[++i];
    else if (arg === '--session' && args[i + 1]) options.session = parseInt(args[++i], 10);
    else if (arg === '--count' && args[i + 1]) options.count = parseInt(args[++i], 10);
    else if (arg === '--output' && args[i + 1]) options.output = args[++i];
  }

  // Default to status if no main action is specified
  if (!options.status && !options.queue && !options.preview && !options.export) {
    options.status = true;
  }

  return options;
}

function loadLeads() {
  const primaryPath = path.join(ROOT_DIR, 'crm/admin/data/leads.json');
  const fallbackPath = path.join(ROOT_DIR, 'factory/data/leads.json');
  
  let targetPath = primaryPath;
  if (!fs.existsSync(targetPath)) {
    targetPath = fallbackPath;
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Leads database niet gevonden op ${primaryPath} of ${fallbackPath}`);
  }

  const raw = fs.readFileSync(targetPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.leads || []);
}

function main() {
  const options = parseArgs();
  const leads = loadLeads();

  console.log('===============================================================');
  console.log(`📱 CREATION+ALT+FIX - REGIONALE OUTREACH RUNNER (TASK-906)`);
  console.log(`Campagne: ${OUTREACH_CAMPAIGN_INFO.name}`);
  console.log('===============================================================\n');

  const queueData = buildOutreachQueue(leads, { targetCount: options.count });
  const metrics = calculateOutreachCampaignMetrics(leads, { targetCount: options.count });

  // 1. STATUS WEERGAVE
  if (options.status) {
    console.log(`🎯 DOELSTELLING & SPRINT TELEMETRIE:`);
    console.log(`• Doelcohort:        ${OUTREACH_CAMPAIGN_INFO.targetCohortSize} regionale vaklieden`);
    console.log(`• Huidig cohort:     ${queueData.cohortSize} gekwalificeerde leads`);
    console.log(`• Geldig 06-mobiel:  ${queueData.validMobileCount} van ${queueData.cohortSize} (${Math.round(queueData.validMobileCount / queueData.cohortSize * 100)}%)`);
    console.log(`• Totaal verstuurd:  ${metrics.funnel.totalSent} outreach pings`);
    console.log(`• Concept bekeken:   ${metrics.pipeline.viewed + metrics.pipeline.inNegotiation + metrics.pipeline.dealsClosed} leads (${metrics.funnel.viewRatePercentage}% view rate)`);
    console.log(`• In onderhandeling: ${metrics.pipeline.inNegotiation} leads`);
    console.log(`• Deals gesloten:    ${metrics.pipeline.dealsClosed} deals (Doel: >= 3)`);
    console.log(`• Gerealiseerd:      € ${metrics.financial.closedRevenueEur},-`);
    console.log(`• Verwachte Omzet:   € ${metrics.financial.totalExpectedRevenueEur},-\n`);

    console.log(`📊 FUNNEL STAGES:`);
    console.log(`  [Uncontacted: ${metrics.pipeline.uncontacted}] -> [Queued: ${metrics.pipeline.queued}] -> [Sent: ${metrics.pipeline.sentWhatsApp + metrics.pipeline.sentEmail}] -> [Viewed: ${metrics.pipeline.viewed}] -> [Negotiation: ${metrics.pipeline.inNegotiation}] -> [Won: ${metrics.pipeline.dealsClosed}]`);
    console.log(`  Doel bereikt: ${metrics.financial.targetGoalAchieved ? '✅ JA (>= 3 deals)' : '⏳ Bezig (Week 4 & 5)'}\n`);
  }

  // 2. QUEUE WEERGAVE
  if (options.queue) {
    console.log(`📋 HOOGEZAND OCHTEND-ROUTINE WACHTRIJ (10:00 - 11:30):`);
    let displaySessions = queueData.sessions;
    if (options.session) {
      displaySessions = queueData.sessions.filter(s => s.sessionNumber === options.session);
    }

    displaySessions.forEach(session => {
      console.log(`\n📌 ${session.title} [${session.recommendedSchedule}] (${session.leadsCount} leads):`);
      session.leads.forEach((l, idx) => {
        const phone = l.phoneValidation?.valid ? l.phoneValidation.formatted : (l.phone || 'GEEN MOBIEL');
        const viewsStr = (l.viewsCount || 0) > 0 ? `👀 ${l.viewsCount}x bekeken` : '⏳ onbekeken';
        console.log(`  ${idx + 1}. [Score: ${l.priorityScore}] ${l.name} (${l.city || 'Regio'}) - ${l.category || 'Vakman'}`);
        console.log(`     Mobiel: ${phone} | Status: ${l.outreachStage} | ${viewsStr}`);
        console.log(`     Concept: https://creationaltfix.nl/concept/${l.slug}/`);
      });
    });
    console.log('');
  }

  // 3. PREVIEW WEERGAVE
  if (options.preview) {
    let targetLead = queueData.queue[0];
    if (options.slug) {
      targetLead = leads.find(l => (l.slug || '').toLowerCase() === options.slug.toLowerCase()) || targetLead;
    }

    if (!targetLead) {
      console.error('❌ Geen lead gevonden om te previewen');
      process.exit(1);
    }

    const pitch = synthesizeRegionalPitch(targetLead, { template: options.template });

    console.log(`✉️ PITCH PREVIEW VOOR: ${targetLead.name} (${targetLead.city || 'Regio'})`);
    console.log(`Template: ${pitch.templateId} | Kanaal: ${pitch.channel}`);
    console.log(`Onderwerp: ${pitch.subject}`);
    console.log('---------------------------------------------------------------');
    console.log(pitch.text);
    console.log('---------------------------------------------------------------');
    if (pitch.voicenoteTip) {
      console.log(`🎙️ GRONINGSE STEM TROEFKAART (Spraakbericht Script):`);
      console.log(pitch.voicenoteTip);
      console.log('---------------------------------------------------------------');
    }
    if (pitch.whatsAppDispatchUrl) {
      console.log(`🔗 1-KLIK WHATSAPP DISPATCH URL:`);
      console.log(pitch.whatsAppDispatchUrl);
    } else {
      console.log(`⚠️ Geen geldig mobiel nummer voor WhatsApp URL: ${pitch.phoneValidation.error}`);
    }
    console.log(`🌐 PORTAAL ONBOARDING LINK: ${pitch.magicPortalUrl}\n`);
  }

  // 4. EXPORT DOSSIER
  if (options.export) {
    const outputPath = options.output || path.join(ROOT_DIR, 'docs/REGIONAL-OUTREACH-BATCH1-DOSSIER.md');
    const md = generateOutreachDossierMarkdown(leads, { targetCount: options.count });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, md, 'utf-8');
    console.log(`✅ Campagne dossier succesvol geëxporteerd naar:\n   ${outputPath}\n`);
  }
}

try {
  main();
} catch (err) {
  console.error('❌ Fout bij uitvoeren van regionale outreach runner:', err.message);
  process.exit(1);
}
