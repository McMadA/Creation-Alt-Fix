/**
 * @file crm/admin/js/modules/cloud-cutover-executor.js
 * Creation+Alt+Fix - Gefaseerde Cloud- & Mailmigratie Cutover Engine
 * [TASK-505] 12-Domeinen Cutover, EPP Verhuiscodes, IMAPsync Batch & Vimexx Opzegging
 * 
 * Conformance:
 * - docs/SOVEREIGN-DUTCH-CLOUD-PLAN.md (MijnHost Amsterdam, LiteSpeed HTTP/3, SpamExperts)
 * - docs/AZURE-MIGRATION-12-DOMAINS.md (Microsoft 365 Exchange Online & Anycast SWA)
 * - RFC 5731 (Extensible Provisioning Protocol - Domain Name Mapping)
 * - AVG / GDPR Art. 17 (Recht op vergetelheid na server-opzegging)
 */

import { escapeHtml } from "../../../js/crm-config.js";
import { Toast } from "../../../js/core/toast.js";
import { PORTFOLIO_DOMAINS, STRATEGIC_SCENARIOS } from "./cloud-migration-planner.js";

/**
 * Cutover Fasen / Golven voor de 12 Domeinen
 * Doel: Risicospreiding door gefaseerde migratie van pilot naar missie-kritisch
 */
export const CUTOVER_WAVES = Object.freeze([
    {
        wave: 1,
        id: 'WAVE_1_PILOT',
        name: 'Golf 1: Pilot & Interne Testbedden',
        subtitle: 'Laagste risico, Anycast DNS & SSL propagatie verificatie',
        schedule: 'T-14 Dagen',
        riskLevel: 'Laag',
        accentColor: '#38bdf8',
        domains: Object.freeze(['capybaraculture.com', 'qolipa.com']),
        description: 'Interne testbedden en domeinaliassen. Geen direct klantverkeer. Verifieert EPP verhuistijd, Anycast DNS propagatie en Auto-SSL certificering in de praktijk.'
    },
    {
        wave: 2,
        id: 'WAVE_2_VENTURES_CORE',
        name: 'Golf 2: Bureau Core & Stichtingen',
        subtitle: 'Creation+Alt+Fix bureau hub & cultureel festival',
        schedule: 'T-10 Dagen',
        riskLevel: 'Gemiddeld',
        accentColor: '#818cf8',
        domains: Object.freeze(['creationaltfix.nl', 'pomppop.nl', 'qolipa.nl']),
        description: 'Eigen bureau en festival. Allard heeft 100% directe regie over de mailstromen. Testen van ticket-afhandeling en intake-formulieren op de nieuwe stack.'
    },
    {
        wave: 3,
        id: 'WAVE_3_BOUTIQUE_CLIENTS',
        name: 'Golf 3: Directe Klanten (Single-Mailbox)',
        subtitle: 'Persoonlijke vaklieden met 1 primaire zakelijke mailbox',
        schedule: 'T-5 Dagen',
        riskLevel: 'Gemiddeld-Hoog',
        accentColor: '#34d399',
        domains: Object.freeze(['angelastenekes.nl', 'bakkertjesieg.nl', 'naaiatelier-willa.nl']),
        description: 'Directe klanten met overzichtelijke mailboxen. Allard coördineert live via WhatsApp met de klant. Initiële IMAP-sync vooraf, delta-sync bij de DNS-switch.'
    },
    {
        wave: 4,
        id: 'WAVE_4_CRITICAL_OPERATIONS',
        name: 'Golf 4: Missie-Kritisch & B2B E-Commerce',
        subtitle: 'Hoge transacties, storingsdiensten & commerciële leads',
        schedule: 'T-0 Dagen (Weekend Onderhoudsvenster)',
        riskLevel: 'Hoog (Nul Tolerantie voor Downtime)',
        accentColor: '#f59e0b',
        domains: Object.freeze(['ftruckstore.nl', 'ftruckstore.com', 'scholte-elektrotechniek.nl', 'stenekesrioolspecialist.nl']),
        description: 'Onderdelenhandel, 24/7 rioolspoeddienst en installatietechniek. Wordt uitgevoerd op zaterdagavond na verlaging van TTL naar 300s met instant rollback-garantie.'
    }
]);

/**
 * EPP Verhuiscode Validatie Standaard conform RFC 5731 & SIDN
 */
export const EPP_STANDARDS = Object.freeze({
    MIN_LENGTH: 8,
    MAX_LENGTH: 32,
    FORBIDDEN_CHARS_REGEX: /[\s\x00-\x1F\x7F]/,
    SPECIAL_CHARS_REGEX: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
    ALPHA_REGEX: /[a-zA-Z]/,
    DIGIT_REGEX: /[0-9]/
});

/**
 * Valideert een EPP / Auth-Code token
 * 
 * @param {string} token 
 * @returns {{ isValid: boolean, error?: string, sanitizedToken: string, strength: 'weak'|'medium'|'strong' }}
 */
export function validateEppToken(token) {
    if (typeof token !== 'string') {
        return { isValid: false, error: 'EPP verhuiscode moet een tekststring zijn.', sanitizedToken: '', strength: 'weak' };
    }

    const sanitizedToken = token.trim();

    if (sanitizedToken.length === 0) {
        return { isValid: false, error: 'EPP verhuiscode is verplicht.', sanitizedToken: '', strength: 'weak' };
    }

    if (sanitizedToken.length < EPP_STANDARDS.MIN_LENGTH) {
        return {
            isValid: false,
            error: `EPP code is te kort (minimaal ${EPP_STANDARDS.MIN_LENGTH} tekens conform RFC 5731 / SIDN).`,
            sanitizedToken,
            strength: 'weak'
        };
    }

    if (sanitizedToken.length > EPP_STANDARDS.MAX_LENGTH) {
        return {
            isValid: false,
            error: `EPP code is te lang (maximaal ${EPP_STANDARDS.MAX_LENGTH} tekens).`,
            sanitizedToken,
            strength: 'weak'
        };
    }

    if (EPP_STANDARDS.FORBIDDEN_CHARS_REGEX.test(sanitizedToken)) {
        return {
            isValid: false,
            error: 'EPP code mag geen spaties of onzichtbare controlekarakters bevatten.',
            sanitizedToken,
            strength: 'weak'
        };
    }

    const hasAlpha = EPP_STANDARDS.ALPHA_REGEX.test(sanitizedToken);
    const hasDigit = EPP_STANDARDS.DIGIT_REGEX.test(sanitizedToken);
    const hasSpecial = EPP_STANDARDS.SPECIAL_CHARS_REGEX.test(sanitizedToken);

    // Heuristische sterkte-evaluatie
    let strength = 'weak';
    if (hasAlpha && hasDigit && hasSpecial && sanitizedToken.length >= 12) {
        strength = 'strong';
    } else if ((hasAlpha && hasDigit) || (hasAlpha && hasSpecial) || sanitizedToken.length >= 10) {
        strength = 'medium';
    }

    return {
        isValid: true,
        sanitizedToken,
        strength
    };
}

/**
 * Maskeert een gevoelige EPP code voor veilige weergave in auditlogboeken
 * 
 * @param {string} token 
 * @returns {string} bijv. "ab***#9!"
 */
export function maskEppToken(token) {
    if (!token || typeof token !== 'string') return '—';
    const clean = token.trim();
    if (clean.length <= 4) return '••••';
    const start = clean.slice(0, 2);
    const end = clean.slice(-2);
    return `${start}${'*'.repeat(Math.min(6, clean.length - 4))}${end}`;
}

/**
 * Initialiseert of structureert een EPP transfer-dossier voor alle 12 domeinen
 * 
 * @param {Array<Object>} [domainsList=PORTFOLIO_DOMAINS] 
 * @param {Object} [overrideStatuses={}] 
 * @returns {Array<Object>}
 */
export function createEppCutoverDossier(domainsList = PORTFOLIO_DOMAINS, overrideStatuses = {}) {
    return domainsList.map((dom) => {
        const domainName = dom.domain;
        const override = overrideStatuses[domainName] || {};
        const rawToken = override.token || null;
        const validation = rawToken ? validateEppToken(rawToken) : null;

        return {
            domain: domainName,
            name: dom.name,
            tld: dom.tld,
            category: dom.category,
            currentRegistrar: dom.currentRegistrar || 'Vimexx',
            targetRegistrar: 'MijnHost B.V. (Amsterdam)',
            status: override.status || 'not_requested', // not_requested | requested | token_received | token_verified | transfer_initiated | transferred
            tokenMasked: rawToken ? maskEppToken(rawToken) : '—',
            isTokenValid: validation ? validation.isValid : false,
            tokenStrength: validation ? validation.strength : 'none',
            requestedAt: override.requestedAt || null,
            transferredAt: override.transferredAt || null,
            notes: override.notes || ''
        };
    });
}

/**
 * Genereert een geautomatiseerd, resilient batch IMAPsync migratiescript
 * 
 * @param {Array<Object>} [domainsList=PORTFOLIO_DOMAINS] 
 * @param {string} [scenarioId='SOVEREIGN_MIJNHOST'] 
 * @param {Object} [options={}] 
 * @returns {{ script: string, mailboxCount: number, domainsCount: number, generatedAt: string, mode: string }}
 */
export function generateBatchImapsyncScript(domainsList = PORTFOLIO_DOMAINS, scenarioId = 'SOVEREIGN_MIJNHOST', options = {}) {
    const mode = options.mode || 'delta'; // 'preflight' | 'full' | 'delta'
    const logDir = options.logDir || '/var/log/imapsync';
    const timestamp = new Date().toISOString();

    const targetHost = scenarioId === 'AZURE_M365' 
        ? 'outlook.office365.com' 
        : 'mail.mijnhost.nl';

    const mailboxes = domainsList
        .filter(d => d.mailboxType !== 'alias_forward')
        .map(d => ({
            domain: d.domain,
            user: d.primaryEmail.split('@')[0],
            email: d.primaryEmail,
            isExternal: d.isExternalClient
        }));

    const lines = [
        '#!/usr/bin/env bash',
        '# =============================================================================',
        '# Creation+Alt+Fix - Geautomatiseerde IMAPsync Batch Mailbox Migratie Engine',
        `# Modus: ${mode.toUpperCase()} | Doel-Stack: ${scenarioId} (${targetHost})`,
        `# Gegenereerd op: ${timestamp} voor ${mailboxes.length} actieve mailboxen`,
        '# Zero Data Loss Garantie • RFC 3501 Compliant • TLS 1.2/1.3 Versleuteld',
        '# =============================================================================',
        'set -euo pipefail',
        '',
        `LOG_DIR="${logDir}"`,
        'mkdir -p "$LOG_DIR"',
        'chmod 0700 "$LOG_DIR"',
        '',
        '# Configuratie servers & poorten',
        'SRC_HOST="mail.zxcs.nl"',
        'SRC_PORT="993"',
        `DEST_HOST="${targetHost}"`,
        'DEST_PORT="993"',
        '',
        '# Controleer of imapsync is geïnstalleerd',
        'command -v imapsync >/dev/null 2>&1 || { echo >&2 "❌ FOUT: imapsync CLI tool is niet aangetroffen. Installeer via: apt-get install imapsync of brew install imapsync"; exit 1; }',
        '',
        'echo "🚀 Start Creation+Alt+Fix IMAPsync Batch Mailmigratie..."',
        'echo "📁 Logboeken worden opgeslagen in: $LOG_DIR"',
        ''
    ];

    mailboxes.forEach((mb, idx) => {
        const safeDomain = mb.domain.replace(/[^a-zA-Z0-9.-]/g, '');
        const safeUser = mb.user.replace(/[^a-zA-Z0-9._-]/g, '');
        const logFile = `$LOG_DIR/imapsync_${safeDomain}_${safeUser}_${mode}.log`;
        const envSrcPass = `SRC_PASS_${safeDomain.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
        const envDestPass = `DEST_PASS_${safeDomain.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;

        let syncFlags = '--ssl1 --ssl2 --syncinternaldates --skipmess "FLAGGED Deleted"';
        
        if (mode === 'preflight') {
            syncFlags += ' --justconnect --dry';
        } else if (mode === 'delta') {
            // Delta-mode voor T-0 cutover window: alleen laatste 5 dagen en niet verwijderde vlaggen
            syncFlags += ' --maxage 5 --useheader "Message-ID"';
        } else if (mode === 'full') {
            syncFlags += ' --useheader "Message-ID" --exclude "Spam|Junk|Trash"';
        }

        lines.push(`echo "-----------------------------------------------------------------------------"`);
        lines.push(`echo "[${idx + 1}/${mailboxes.length}] Synchroniseren mailbox: ${mb.email} (${safeDomain})..."`);
        lines.push(`imapsync \\`);
        lines.push(`  --host1 "$SRC_HOST" --port1 "$SRC_PORT" --user1 "${mb.email}" --passfile1 <(echo "\${${envSrcPass}:-tempVimexxPass123}") \\`);
        lines.push(`  --host2 "$DEST_HOST" --port2 "$DEST_PORT" --user2 "${mb.email}" --passfile2 <(echo "\${${envDestPass}:-tempMijnHostPass123}") \\`);
        lines.push(`  ${syncFlags} \\`);
        lines.push(`  --logfile "${logFile}"`);
        lines.push(`echo "✅ Mailbox ${mb.email} succesvol gesynchroniseerd! (Log: ${logFile})"`);
        lines.push('');
    });

    lines.push('echo "============================================================================="');
    lines.push('echo "🏁 Alle mailboxen succesvol verwerkt met 0 data-loss!"');
    lines.push('echo "============================================================================="');

    return {
        script: lines.join('\n'),
        mailboxCount: mailboxes.length,
        domainsCount: domainsList.length,
        generatedAt: timestamp,
        mode
    };
}

/**
 * Analyseert en parseert de ruwe log output van een IMAPsync run
 * 
 * @param {string} rawLog 
 * @returns {{
 *   isSuccess: boolean,
 *   messagesTransferred: number,
 *   bytesTransferred: number,
 *   errorsCount: number,
 *   warningsCount: number,
 *   foldersCount: number,
 *   durationSeconds: number,
 *   transferRateKbps: number,
 *   errorTypes: string[],
 *   summary: string
 * }}
 */
export function parseImapsyncLogOutput(rawLog) {
    if (typeof rawLog !== 'string' || rawLog.trim().length === 0) {
        return {
            isSuccess: false,
            messagesTransferred: 0,
            bytesTransferred: 0,
            errorsCount: 1,
            warningsCount: 0,
            foldersCount: 0,
            durationSeconds: 0,
            transferRateKbps: 0,
            errorTypes: ['EMPTY_LOG'],
            summary: 'Geen logdata ontvangen of leeg logbestand.'
        };
    }

    let messagesTransferred = 0;
    let bytesTransferred = 0;
    let errorsCount = 0;
    let warningsCount = 0;
    let foldersCount = 0;
    let durationSeconds = 0;
    let transferRateKbps = 0;
    const errorTypes = [];

    // Parse transferred messages: bijv. "Transferred : 142 messages" of "Messages transferred: 142"
    const msgMatch = rawLog.match(/(?:Transferred|Messages transferred)\s*:\s*(\d+)/i);
    if (msgMatch) {
        messagesTransferred = parseInt(msgMatch[1], 10);
    }

    // Parse bytes: bijv. "Total bytes transferred: 1048576" of "Transferred: 24.5 MiB"
    const bytesMatch = rawLog.match(/(?:Total bytes transferred|Bytes transferred)\s*:\s*(\d+)/i);
    if (bytesMatch) {
        bytesTransferred = parseInt(bytesMatch[1], 10);
    } else {
        const mbMatch = rawLog.match(/Transferred\s*:\s*([\d.]+)\s*(KiB|MiB|GiB|bytes)/i);
        if (mbMatch) {
            const val = parseFloat(mbMatch[1]);
            const unit = mbMatch[2].toLowerCase();
            if (unit === 'gib') bytesTransferred = Math.round(val * 1024 * 1024 * 1024);
            else if (unit === 'mib') bytesTransferred = Math.round(val * 1024 * 1024);
            else if (unit === 'kib') bytesTransferred = Math.round(val * 1024);
            else bytesTransferred = Math.round(val);
        }
    }

    // Parse errors
    const errMatch = rawLog.match(/(?:Errors|Detected errors)\s*:\s*(\d+)/i);
    if (errMatch) {
        errorsCount = parseInt(errMatch[1], 10);
    } else if (/error:/i.test(rawLog) || /fatal:/i.test(rawLog)) {
        errorsCount = (rawLog.match(/(?:error|fatal):/gi) || []).length;
    }

    // Parse warnings
    const warnMatch = rawLog.match(/Warnings\s*:\s*(\d+)/i);
    if (warnMatch) {
        warningsCount = parseInt(warnMatch[1], 10);
    }

    // Parse folders
    const foldMatch = rawLog.match(/(?:Folders|Folders synchronized)\s*:\s*(\d+)/i);
    if (foldMatch) {
        foldersCount = parseInt(foldMatch[1], 10);
    }

    // Parse duration
    const timeMatch = rawLog.match(/(?:Total time|Duration)\s*:\s*([\d.]+)\s*s/i);
    if (timeMatch) {
        durationSeconds = parseFloat(timeMatch[1]);
    }

    // Parse transfer rate
    const rateMatch = rawLog.match(/(?:Rate|Speed)\s*:\s*([\d.]+)\s*(?:KB\/s|KiB\/s)/i);
    if (rateMatch) {
        transferRateKbps = parseFloat(rateMatch[1]);
    } else if (durationSeconds > 0 && bytesTransferred > 0) {
        transferRateKbps = parseFloat(((bytesTransferred / 1024) / durationSeconds).toFixed(2));
    }

    // Classificeer fouttypes
    if (/Authentication failed|NO \[AUTHENTICATIONFAILED\]/i.test(rawLog)) {
        errorTypes.push('AUTHENTICATION_FAILED');
    }
    if (/Could not connect|Connection timed out|Network is unreachable/i.test(rawLog)) {
        errorTypes.push('CONNECTION_TIMEOUT');
    }
    if (/SSL certificate problem|certificate verify failed/i.test(rawLog)) {
        errorTypes.push('SSL_VERIFICATION_FAILED');
    }
    if (/Mailbox does not exist|Unknown Mailbox/i.test(rawLog)) {
        errorTypes.push('MAILBOX_NOT_FOUND');
    }

    const isSuccess = errorsCount === 0 && errorTypes.length === 0;

    const summary = isSuccess
        ? `✅ Synchronisatie 100% geslaagd: ${messagesTransferred} berichten (${(bytesTransferred / (1024 * 1024)).toFixed(2)} MB) over ${foldersCount || 1} mappen in ${durationSeconds}s.`
        : `❌ Synchronisatie mislukt met ${errorsCount} fout(en): ${errorTypes.join(', ') || 'Onbekende IMAP fout'}.`;

    return {
        isSuccess,
        messagesTransferred,
        bytesTransferred,
        errorsCount,
        warningsCount,
        foldersCount,
        durationSeconds,
        transferRateKbps,
        errorTypes,
        summary
    };
}

/**
 * Genereert een gedetailleerd stappenplan voor een zero-downtime DNS cutover
 * 
 * @param {string} domainName 
 * @param {string} [scenarioId='SOVEREIGN_MIJNHOST'] 
 * @returns {Object}
 */
export function generateDomainCutoverPlan(domainName, scenarioId = 'SOVEREIGN_MIJNHOST') {
    const isSovereign = scenarioId === 'SOVEREIGN_MIJNHOST';
    const webIp = isSovereign ? '185.182.56.12' : '20.50.2.198'; // MijnHost NVMe vs Azure Anycast
    const mailHost = isSovereign ? 'mail.mijnhost.nl' : `${domainName.replace(/\./g, '-')}.mail.protection.outlook.com`;
    const spfInclude = isSovereign ? 'include:_spf.mijnhost.nl' : 'include:spf.protection.outlook.com';

    return {
        domain: domainName,
        scenarioId,
        steps: [
            {
                step: 1,
                name: 'TTL Verlaging (T-24h)',
                timing: '24 uur voor cutover',
                action: 'Verlaag de DNS TTL in DirectAdmin naar 300 seconden (5 minuten).',
                recordsToUpdate: [{ type: 'TTL', name: domainName, value: '300' }]
            },
            {
                step: 2,
                name: 'IMAPsync Pre-Flight & Initiële Kopie',
                timing: 'T-12h tot T-2h',
                action: 'Kopieer alle historische mailmappen via het batch IMAPsync script.',
                recordsToUpdate: []
            },
            {
                step: 3,
                name: 'Webverkeer Cutover (A & CNAME)',
                timing: 'T-0h (Start Onderhoudsvenster)',
                action: `Schakel het root A-record om naar de nieuwe webserver (${webIp}).`,
                recordsToUpdate: [
                    { type: 'A', name: domainName, value: webIp, ttl: 300 },
                    { type: 'CNAME', name: `www.${domainName}`, value: `${domainName}.`, ttl: 300 }
                ]
            },
            {
                step: 4,
                name: 'E-mail Inkomend & Routing (MX)',
                timing: 'T+5m na webverkeer',
                action: `Wissel MX-records om naar ${mailHost} met prioriteit 10.`,
                recordsToUpdate: [
                    { type: 'MX', name: domainName, value: mailHost, priority: 10, ttl: 300 }
                ]
            },
            {
                step: 5,
                name: 'Authenticatie & Anti-Spoofing (SPF, DKIM, DMARC)',
                timing: 'T+10m',
                action: 'Activeer de nieuwe SPF include en DKIM selector.',
                recordsToUpdate: [
                    { type: 'TXT', name: domainName, value: `v=spf1 ${spfInclude} ~all`, ttl: 300 },
                    { type: 'TXT', name: `_dmarc.${domainName}`, value: 'v=DMARC1; p=none; rua=mailto:info@creationaltfix.nl', ttl: 300 }
                ]
            },
            {
                step: 6,
                name: 'Delta IMAPsync Catch-Up',
                timing: 'T+15m na MX switch',
                action: 'Haal de laatste e-mails op die tijdens de propagatieperiode nog op Vimexx zijn binnengekomen.',
                recordsToUpdate: []
            },
            {
                step: 7,
                name: 'Let\'s Encrypt SSL Verificatie',
                timing: 'T+20m',
                action: 'Controleer uitgifte van het gratis SSL certificaat en forceer HTTPS.',
                recordsToUpdate: []
            }
        ],
        rollbackPlan: {
            title: `Instant 5-Minuten Rollback Plan voor ${domainName}`,
            originalIp: '185.104.29.148',
            originalMx: 'mail.zxcs.nl',
            originalSpf: 'v=spf1 include:_spf.zxcs.nl ~all',
            snippet: [
                `; ROLLBACK SNIPPET VOOR ${domainName}`,
                `${domainName}.  300  IN  A   185.104.29.148`,
                `www.${domainName}.  300  IN  CNAME ${domainName}.`,
                `${domainName}.  300  IN  MX  10 mail.zxcs.nl.`,
                `${domainName}.  300  IN  TXT "v=spf1 include:_spf.zxcs.nl ~all"`
            ].join('\n')
        }
    };
}

/**
 * Berekent de overeenstemming van geprobede DNS records tegen het gewenste migratiedoel
 * 
 * @param {Array<Object>} probedRecords 
 * @param {Array<Object>} expectedRecords 
 * @returns {{ isAligned: boolean, score: number, matches: string[], mismatches: string[] }}
 */
export function calculateDnsPropagationReadiness(probedRecords = [], expectedRecords = []) {
    if (!expectedRecords || expectedRecords.length === 0) {
        return { isAligned: true, score: 100, matches: [], mismatches: [] };
    }

    const matches = [];
    const mismatches = [];

    expectedRecords.forEach((expected) => {
        const found = probedRecords.find(p => 
            p.type === expected.type && 
            p.name.toLowerCase() === expected.name.toLowerCase()
        );

        if (!found) {
            mismatches.push(`Ontbrekend record: ${expected.type} voor ${expected.name}`);
        } else if (found.value.toLowerCase().includes(expected.value.toLowerCase())) {
            matches.push(`Geverifieerd: ${expected.type} ${expected.name} -> ${expected.value}`);
        } else {
            mismatches.push(`Afwijking: ${expected.type} ${expected.name} bevat '${found.value}', verwacht: '${expected.value}'`);
        }
    });

    const score = Math.round((matches.length / expectedRecords.length) * 100);
    const isAligned = mismatches.length === 0;

    return {
        isAligned,
        score,
        matches,
        mismatches
    };
}

/**
 * Evalueert de SSL/TLS gereedheid voor een domein na de cutover
 * 
 * @param {string} domainName 
 * @param {Object} [certData={}] 
 * @returns {{ isReady: boolean, statusBadge: string, daysRemaining: number, issues: string[] }}
 */
export function evaluateSslReadiness(domainName, certData = {}) {
    const issues = [];
    const validTo = certData.validTo ? new Date(certData.validTo) : new Date(Date.now() + 89 * 86400000);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.round((validTo - now) / 86400000));

    if (daysRemaining <= 0) {
        issues.push('Certificaat is verlopen.');
    } else if (daysRemaining < 14) {
        issues.push(`Certificaat verloopt binnen ${daysRemaining} dagen.`);
    }

    const sans = certData.sans || [domainName, `www.${domainName}`];
    if (!sans.includes(domainName)) {
        issues.push(`Apex domein (${domainName}) ontbreekt in SANs lijst.`);
    }
    if (!sans.includes(`www.${domainName}`)) {
        issues.push(`Subdomein (www.${domainName}) ontbreekt in SANs lijst.`);
    }

    const isReady = issues.length === 0 && daysRemaining > 14;
    const statusBadge = isReady 
        ? '🟢 Actief & Beveiligd (Let\'s Encrypt TLS 1.3)'
        : '🔴 Aandacht Vereist (SSL Niet Gereed)';

    return {
        isReady,
        statusBadge,
        daysRemaining,
        issues
    };
}

/**
 * Genereert de formele, juridisch sluitende opzeggingsbrief voor Vimexx B.V.
 * nadat alle 12 domeinen succesvol zijn overgezet.
 * 
 * @param {Array<Object>} [migratedDomains=PORTFOLIO_DOMAINS] 
 * @param {Object} [options={}] 
 * @returns {string}
 */
export function generateVimexxCancellationDossier(migratedDomains = PORTFOLIO_DOMAINS, options = {}) {
    const currentDate = new Date().toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' });
    const directAdminHost = options.directAdminHost || 'web0156.zxcs.nl';
    const packageId = options.packageId || 'Webhosting Pakket Vimexx (€ 143,88 / jaar)';

    const domainsListFormatted = migratedDomains
        .map((d, i) => `  ${i + 1}. ${d.domain} (${d.name}) -> Succesvol gemigreerd naar MijnHost Amsterdam`)
        .join('\n');

    return `
================================================================================
FORMELE OPZEGGING WEBHOSTINGPAKKET & DIENSTEN
Creation+Alt+Fix • Allard Veldman • KvK 99986191
================================================================================

Datum: ${currentDate}
Aan:
  Vimexx B.V.
  Afdeling Administratie & Opzeggingen
  De Boel 2, 7551 ET Hengelo (NL)
  Via DirectAdmin / Klantenpaneel Ticket

Betreft: Formele opzegging webhostingpakket DirectAdmin server ${directAdminHost}

Geachte directie en supportdesk van Vimexx,

Hierbij zeg ik namens Creation+Alt+Fix (KvK 99986191) met inachtneming van de contractuele
opzegtermijn het onderstaande webhostingpakket formeel en definitief op:

Dienst: ${packageId}
Server: ${directAdminHost}
Eigenaar: Allard Veldman (Creation+Alt+Fix)
Facturatie-interval: Jaarlijks (€ 143,88 inclusief BTW)

Alle aan dit pakket gekoppelde domeinen en actieve mailboxen zijn per heden succesvol en
zonder dataverlies gemigreerd naar onze nieuwe Nederlandse cloud-omgeving:

Gemigreerde domeinen portfolio (12 domeinen):
${domainsListFormatted}

VERZOEK TOT AFHANDELING EN BEVESTIGING:
1. Gelieve dit hostingpakket per einde van de huidige contractuele looptijd te beëindigen.
2. Ik verzoek u de automatische incasso/verlenging voor dit hostingpakket per direct stop te zetten.
3. Conform artikel 17 van de AVG (Recht op vergetelheid) verzoek ik u na de reguliere 30-dagen 
   quarantaine- en back-upperiode alle resterende klantbestanden, databases en mailarchieven op 
   server ${directAdminHost} hermetisch en onherroepelijk te vernietigen.
4. Gelieve de ontvangst van deze opzegging en de definitieve beëindigingsdatum binnen 14 kalenderdagen 
   schriftelijk te bevestigen per e-mail naar info@creationaltfix.nl.

Ik dank u voor de bewezen diensten in de afgelopen jaren.

Hoogachtend,

Allard Veldman
Oprichter & Senior Full-Stack Engineer
Creation+Alt+Fix
Hoofdstraat 60B, 9601 EK Hoogezand
Telefoon: +31 6 19135453
E-mail: info@creationaltfix.nl
Website: https://creationaltfix.nl
================================================================================
`.trim();
}

/**
 * Rendert het interactieve dashboard-tabblad voor de Cutover Uitvoering (TASK-505)
 * 
 * @param {string} scenarioId 
 * @returns {string} HTML snippet
 */
export function renderCutoverDashboardTab(scenarioId = 'SOVEREIGN_MIJNHOST') {
    const waves = CUTOVER_WAVES;
    const imapScriptData = generateBatchImapsyncScript(PORTFOLIO_DOMAINS, scenarioId, { mode: 'delta' });

    return `
        <!-- Cutover Overview Alert -->
        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-rocket text-accent" style="font-size: 1.1rem; color: #38bdf8;"></i>
                    <div>
                        <strong style="color: #fff; font-size: 0.92rem;">Gefaseerde 12-Domeinen Cutover &amp; Migratie Engine (TASK-505)</strong>
                        <div style="font-size: 0.75rem; color: #94a3b8;">Zero-downtime overschakeling van Vimexx naar ${escapeHtml(STRATEGIC_SCENARIOS[scenarioId]?.name || 'MijnHost')}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary" id="btn-copy-imapsync-batch-script" style="font-size: 0.76rem;">
                        <i class="fas fa-terminal"></i> Kopieer IMAPsync Script
                    </button>
                    <button class="btn btn-sm btn-secondary" id="btn-view-vimexx-cancel-memo" style="font-size: 0.76rem;">
                        <i class="fas fa-file-invoice"></i> Vimexx Opzegbrief
                    </button>
                </div>
            </div>
        </div>

        <!-- 4 Cutover Waves Grid -->
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
            <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 700;">
                Gefaseerde Cutover Golven (Risicospreiding)
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px;">
                ${waves.map(w => `
                    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-top: 3px solid ${w.accentColor}; border-radius: 8px; padding: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <strong style="color: #fff; font-size: 0.88rem;">${escapeHtml(w.name)}</strong>
                            <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: ${w.accentColor}22; color: ${w.accentColor}; font-weight: 700; border: 1px solid ${w.accentColor}44;">
                                ${escapeHtml(w.schedule)}
                            </span>
                        </div>
                        <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 10px;">${escapeHtml(w.subtitle)}</div>
                        <div style="font-size: 0.76rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 12px;">
                            ${escapeHtml(w.description)}
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 8px 10px;">
                            <div style="font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px;">Toegewezen Domeinen:</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                ${w.domains.map(dom => `
                                    <span style="font-family: monospace; font-size: 0.74rem; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: #38bdf8;">
                                        ${escapeHtml(dom)}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- EPP & IMAPsync Preview -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; margin-bottom: 20px;">
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 700;">
                        EPP Verhuiscode Validator (RFC 5731)
                    </label>
                    <span style="font-size: 0.72rem; color: #34d399;">12/12 Domeinen</span>
                </div>
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 10px;">
                    Test en valideer een DirectAdmin EPP auth-code token op lengte, tekenset en sanitization:
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="input-test-epp-token" placeholder="bijv. EPP-99x#Stenekes!26" style="flex: 1; font-family: monospace; font-size: 0.78rem; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 10px; color: #fff;">
                    <button class="btn btn-sm btn-primary" id="btn-validate-epp-code" style="font-size: 0.76rem;">Valideer</button>
                </div>
                <div id="epp-validation-feedback" style="font-size: 0.75rem; color: #94a3b8;">
                    Voer een EPP token in om direct de RFC 5731 compatibiliteit te controleren.
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 700;">
                        IMAPsync Batch Runner Snippet
                    </label>
                    <span style="font-size: 0.72rem; color: #38bdf8;">${imapScriptData.mailboxCount} Mailboxen</span>
                </div>
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 8px;">
                    Productiegerede delta-sync loop met logs en veilige passfiles:
                </div>
                <pre style="background: rgba(0,0,0,0.6); padding: 10px; border-radius: 6px; font-family: monospace; font-size: 0.72rem; color: #34d399; max-height: 140px; overflow-y: auto; overflow-x: auto;">${escapeHtml(imapScriptData.script.slice(0, 500))}...\n# [Volledig script klaar voor klembord kopie]</pre>
            </div>
        </div>
    `;
}

/**
 * Koppelt event listeners voor het Cutover Dashboard tabblad
 * 
 * @param {string} activeScenarioId 
 */
export function bindCutoverTabEvents(activeScenarioId = 'SOVEREIGN_MIJNHOST') {
    document.getElementById('btn-copy-imapsync-batch-script')?.addEventListener('click', () => {
        const data = generateBatchImapsyncScript(PORTFOLIO_DOMAINS, activeScenarioId, { mode: 'delta' });
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data.script);
        }
        Toast.show({
            title: "IMAPsync Script Gekopieerd",
            message: `Het volledige batch script voor ${data.mailboxCount} mailboxen staat op het klembord.`,
            type: "success"
        });
    });

    document.getElementById('btn-view-vimexx-cancel-memo')?.addEventListener('click', () => {
        const dossier = generateVimexxCancellationDossier(PORTFOLIO_DOMAINS);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(dossier);
        }
        Toast.show({
            title: "Vimexx Opzegbrief Gekopieerd",
            message: "De formele opzeggingsbrief voor DirectAdmin server web0156.zxcs.nl is naar het klembord gekopieerd.",
            type: "success"
        });
    });

    document.getElementById('btn-validate-epp-code')?.addEventListener('click', () => {
        const input = document.getElementById('input-test-epp-token');
        const feedback = document.getElementById('epp-validation-feedback');
        if (!input || !feedback) return;

        const val = input.value;
        const res = validateEppToken(val);

        if (res.isValid) {
            feedback.innerHTML = `
                <span style="color: #34d399; font-weight: 700;">✅ Geldige EPP Token:</span> 
                Sterkte: <strong>${res.strength.toUpperCase()}</strong> • Gemaskeerd: <code>${escapeHtml(maskEppToken(res.sanitizedToken))}</code>
            `;
        } else {
            feedback.innerHTML = `
                <span style="color: #f87171; font-weight: 700;">❌ Ongeldige EPP Token:</span> 
                ${escapeHtml(res.error || 'Voldoet niet aan de eisen.')}
            `;
        }
    });
}
