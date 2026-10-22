#!/usr/bin/env node
/**
 * Creation+Alt+Fix - Social Media & Personal Branding CLI Runner (TASK-843)
 * 
 * Gebruik:
 *   node scripts/run-social-branding.mjs --status
 *   node scripts/run-social-branding.mjs --day 1
 *   node scripts/run-social-branding.mjs --script 1
 *   node scripts/run-social-branding.mjs --copy-linkedin 1
 *   node scripts/run-social-branding.mjs --export
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BRANDING_CONFIG,
  BRANDING_PILLARS,
  SOCIAL_CALENDAR_30_DAYS,
  STORY_REEL_SCRIPTS,
  synthesizeLinkedInPost,
  synthesizeStoryScript,
  calculatePublishDates,
  calculateSocialCampaignMetrics,
  exportSocialCalendarToMarkdown
} from '../crm/admin/js/modules/social-branding-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);

function printBanner() {
  console.log('========================================================');
  console.log('📱 CREATION+ALT+FIX SOCIAL MEDIA & PERSONAL BRANDING');
  console.log(`   Auteur: ${BRANDING_CONFIG.author} | ${BRANDING_CONFIG.agency}`);
  console.log('   Doel: Organische naamsbekendheid & MKB-conversie Noord-NL');
  console.log('========================================================\n');
}

async function main() {
  const isStatus = args.includes('--status') || args.includes('--overview') || args.length === 0;
  const dayIndex = args.indexOf('--day');
  const copyIndex = args.indexOf('--copy-linkedin');
  const scriptIndex = args.indexOf('--script');
  const isExport = args.includes('--export');

  if (copyIndex !== -1) {
    const day = Number(args[copyIndex + 1]) || 1;
    const post = synthesizeLinkedInPost(day);
    process.stdout.write(post.fullText + '\n');
    process.exit(0);
  }

  printBanner();

  if (dayIndex !== -1) {
    const day = Number(args[dayIndex + 1]) || 1;
    const item = SOCIAL_CALENDAR_30_DAYS.find(i => i.day === day) || SOCIAL_CALENDAR_30_DAYS[0];

    console.log(`📌 INVENTARISATIE DAG ${item.day} / 30`);
    console.log(`Kanaal : ${item.channel} (${item.format})`);
    console.log(`Pijler : ${BRANDING_PILLARS[item.pillarId]?.name || item.pillarId}`);
    console.log(`Thema  : ${item.theme}`);
    console.log(`Hook   : "${item.hook}"`);
    console.log(`Doel   : ${item.goalCta}\n`);

    if (item.channel === 'LinkedIn') {
      const post = synthesizeLinkedInPost(day);
      console.log('------------------ [ LINKEDIN POST COPY ] ------------------');
      console.log(post.body);
      console.log('\nHashtags: ' + post.hashtags.join(' '));
      console.log('------------------------------------------------------------');
      console.log(`Tekens: ${post.characterCount} | Woorden: ${post.wordCount} | Leestijd: ±${post.readTimeMinutes} min\n`);
    } else if (item.channel === 'Instagram') {
      console.log('📸 Instagram Story / Reel Prompt:');
      console.log(`Focus: ${item.hook}`);
      console.log(`CTA  : ${item.goalCta}`);
      console.log('\n(Bekijk het uitgewerkte videoscript via: node scripts/run-social-branding.mjs --script 1)\n');
    } else {
      console.log('☕ Zondagsrust: Geen actieve content gepland. Tijd voor reflectie en herstel.\n');
    }
    return;
  }

  if (scriptIndex !== -1) {
    const scriptNum = args[scriptIndex + 1] || '1';
    let scriptKey = 'script_1_speed_test';
    if (scriptNum === '2') scriptKey = 'script_2_no_login_flow';
    if (scriptNum === '3') scriptKey = 'script_3_behind_the_scenes';

    const script = synthesizeStoryScript(scriptKey);

    console.log(`🎬 VIDEOSCRIPT: ${script.title.toUpperCase()}`);
    console.log(`Formaat  : ${script.format} (${script.aspectRatio})`);
    console.log(`Doelduur : ${script.targetDurationSeconds} seconden (Berekend: ${script.totalCalculatedDuration}s)`);
    console.log(`Hook     : "${script.hook}"\n`);

    console.log('FRAMES & REGIE-AANWIJZINGEN:');
    script.frames.forEach(f => {
      console.log(`\n[ Frame ${f.frameNumber} - Fase: ${f.phase.toUpperCase()} (${f.durationSeconds}s) ]`);
      console.log(`  👁️  Beeld   : ${f.visualAction}`);
      console.log(`  🎙️  Spraak  : "${f.spokenAudio}"`);
      console.log(`  🔤  Overlay : [ ${f.onScreenOverlay} ]`);
      console.log(`  🔊  Geluid  : ${f.soundEffect}`);
    });

    console.log('\nHashtags: ' + script.hashtags.join(' ') + '\n');
    return;
  }

  if (isExport) {
    const markdown = exportSocialCalendarToMarkdown(SOCIAL_CALENDAR_30_DAYS, {
      startDate: '2026-10-26',
      publishedDays: [1]
    });

    const exportPath = path.join(ROOT_DIR, 'docs', 'SOCIAL-MEDIA-PUBLICATION-SCHEDULE.md');
    fs.writeFileSync(exportPath, markdown, 'utf8');
    console.log(`✅ Dossier succesvol geëxporteerd naar: ${exportPath}\n`);
    return;
  }

  // Standaard status overzicht
  const metrics = calculateSocialCampaignMetrics(SOCIAL_CALENDAR_30_DAYS, [1]);
  const datedCal = calculatePublishDates('2026-10-26', SOCIAL_CALENDAR_30_DAYS);

  console.log('📊 CAMPAGNE STATUS & METRIEKEN:');
  console.log(`• Totaal Dagen Gepland  : ${metrics.totalDays} dagen`);
  console.log(`• LinkedIn Posts        : ${metrics.linkedInCount} posts`);
  console.log(`• Instagram Reels/Stories: ${metrics.instagramCount} items`);
  console.log(`• Rustdagen (Zondag)    : ${metrics.restDaysCount} dagen`);
  console.log(`• Status Dag 1 (Vandaag): Gepubliceerd / Ready`);
  console.log(`• Geschat MKB Bereik    : ± ${metrics.estimatedReach.toLocaleString('nl-NL')} weergaven`);
  console.log(`• Verwachte Interacties : ± ${metrics.estimatedInteractions.toLocaleString('nl-NL')} reacties / DM's\n`);

  console.log('📅 EERSTE 7 DAGEN IN DE KALENDER:');
  datedCal.slice(0, 7).forEach(item => {
    console.log(`  Dag ${String(item.day).padStart(2, '0')} (${item.publishDate} ${item.dayOfWeek.padEnd(9)}) : [${item.channel.padEnd(9)}] ${item.pillarBadge.padEnd(20)} | ${item.hook}`);
  });

  console.log('\n💡 Snelle commando\'s:');
  console.log('  node scripts/run-social-branding.mjs --day 1        (Bekijk complete LinkedIn post Dag 1)');
  console.log('  node scripts/run-social-branding.mjs --script 1     (Bekijk Instagram Reel Script 1)');
  console.log('  node scripts/run-social-branding.mjs --export       (Exporteer compleet Markdown dossier)\n');
}

main().catch(err => {
  console.error('❌ Fout in social branding runner:', err);
  process.exit(1);
});
