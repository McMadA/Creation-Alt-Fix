/**
 * @file scripts/run-cloud-cutover.mjs
 * Creation+Alt+Fix - Cloud- & Mailmigratie Cutover CLI & Verifier Script (TASK-505)
 * 
 * Gebruik:
 *   node scripts/run-cloud-cutover.mjs --status
 *   node scripts/run-cloud-cutover.mjs --wave 1
 *   node scripts/run-cloud-cutover.mjs --imapsync --mode delta
 *   node scripts/run-cloud-cutover.mjs --cancel
 *   node scripts/run-cloud-cutover.mjs --domain angelastenekes.nl
 *   node scripts/run-cloud-cutover.mjs --validate-epp "EPP-99#SecretToken!26"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    CUTOVER_WAVES,
    validateEppToken,
    maskEppToken,
    createEppCutoverDossier,
    generateBatchImapsyncScript,
    parseImapsyncLogOutput,
    generateDomainCutoverPlan,
    calculateDnsPropagationReadiness,
    evaluateSslReadiness,
    generateVimexxCancellationDossier
} from '../crm/admin/js/modules/cloud-cutover-executor.js';
import { PORTFOLIO_DOMAINS } from '../crm/admin/js/modules/cloud-migration-planner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

function printHeader() {
    console.log('================================================================================');
    console.log('🚀 CREATION+ALT+FIX - 12-DOMEINEN CLOUD- & MAILMIGRATIE CUTOVER (TASK-505)');
    console.log('================================================================================');
}

function printStatus() {
    printHeader();
    console.log('\n📊 12-DOMEINEN CUTOVER STATUS & GOLVEN-OVERZICHT:\n');

    CUTOVER_WAVES.forEach(w => {
        console.log(`🔷 ${w.name} [${w.schedule}] - Risico: ${w.riskLevel}`);
        console.log(`   Scope: ${w.subtitle}`);
        console.log(`   Domeinen: ${w.domains.join(', ')}`);
        console.log('');
    });

    console.log('📋 EPP VERHUISDOSSIER OVERZICHT (12 DOMEINEN):');
    const dossier = createEppCutoverDossier(PORTFOLIO_DOMAINS);
    dossier.forEach((d, idx) => {
        console.log(`   ${(idx + 1).toString().padStart(2, ' ')}. ${d.domain.padEnd(28, ' ')} | Status: ${d.status.padEnd(14, ' ')} | EPP: ${d.tokenMasked}`);
    });
    console.log('\n================================================================================');
}

function handleWave(waveNum) {
    printHeader();
    const wave = CUTOVER_WAVES.find(w => w.wave === parseInt(waveNum, 10));
    if (!wave) {
        console.error(`❌ Fout: Ongeldige golf '${waveNum}'. Kies uit 1, 2, 3 of 4.`);
        process.exit(1);
    }

    console.log(`\n📋 DETAILS VOOR ${wave.name.toUpperCase()}`);
    console.log(`   Planning: ${wave.schedule}`);
    console.log(`   Risicoprofiel: ${wave.riskLevel}`);
    console.log(`   Toelichting: ${wave.description}\n`);
    console.log('   Domeinen in deze golf:');
    wave.domains.forEach((dom, i) => {
        const plan = generateDomainCutoverPlan(dom, 'SOVEREIGN_MIJNHOST');
        console.log(`   ${i + 1}. ${dom}`);
        console.log(`      • A-Record Switch: ${plan.steps[2].recordsToUpdate[0].value}`);
        console.log(`      • MX Mail Routing: ${plan.steps[3].recordsToUpdate[0].value}`);
    });
    console.log('\n================================================================================');
}

function handleImapsync(mode = 'delta') {
    printHeader();
    console.log(`\n📦 GENEREREN IMAPSYNC BATCH SCRIPT (Modus: ${mode.toUpperCase()}):\n`);
    const data = generateBatchImapsyncScript(PORTFOLIO_DOMAINS, 'SOVEREIGN_MIJNHOST', { mode });
    console.log(data.script);
    console.log(`\n✅ Batch script gegenereerd voor ${data.mailboxCount} mailboxen.`);
}

function handleCancel() {
    printHeader();
    console.log('\n📄 VOORBEELD OPZEGGINGSBRIEF VIMEXX B.V.:\n');
    const letter = generateVimexxCancellationDossier(PORTFOLIO_DOMAINS);
    console.log(letter);
}

function handleDomain(domain) {
    printHeader();
    console.log(`\n🌐 ZERO-DOWNTIME CUTOVER PLAN VOOR: ${domain}\n`);
    const plan = generateDomainCutoverPlan(domain, 'SOVEREIGN_MIJNHOST');
    plan.steps.forEach(s => {
        console.log(`▶ Stap ${s.step}: ${s.name} (${s.timing})`);
        console.log(`   Actie: ${s.action}`);
        if (s.recordsToUpdate.length > 0) {
            s.recordsToUpdate.forEach(r => {
                console.log(`   + DNS: ${r.type} ${r.name} -> ${r.value}`);
            });
        }
        console.log('');
    });

    console.log('🛡️ ROLLBACK SNIPPET:');
    console.log(plan.rollbackPlan.snippet);
    console.log('\n================================================================================');
}

function handleValidateEpp(token) {
    printHeader();
    console.log(`\n🔑 EPP TOKEN VALIDATIE:\n`);
    const res = validateEppToken(token);
    if (res.isValid) {
        console.log(`✅ Token is RFC 5731 / SIDN compliant!`);
        console.log(`   Sterkte: ${res.strength.toUpperCase()}`);
        console.log(`   Gemaskeerd: ${maskEppToken(res.sanitizedToken)}`);
    } else {
        console.log(`❌ Token is ongeldig!`);
        console.log(`   Foutmelding: ${res.error}`);
    }
    console.log('\n================================================================================');
}

// Argument Dispatcher
if (args.includes('--status') || args.length === 0) {
    printStatus();
} else if (args.includes('--wave')) {
    const idx = args.indexOf('--wave');
    handleWave(args[idx + 1] || '1');
} else if (args.includes('--imapsync')) {
    const modeIdx = args.indexOf('--mode');
    const mode = modeIdx !== -1 ? args[modeIdx + 1] : 'delta';
    handleImapsync(mode);
} else if (args.includes('--cancel')) {
    handleCancel();
} else if (args.includes('--domain')) {
    const idx = args.indexOf('--domain');
    handleDomain(args[idx + 1] || 'creationaltfix.nl');
} else if (args.includes('--validate-epp')) {
    const idx = args.indexOf('--validate-epp');
    handleValidateEpp(args[idx + 1] || '');
} else {
    printStatus();
}
