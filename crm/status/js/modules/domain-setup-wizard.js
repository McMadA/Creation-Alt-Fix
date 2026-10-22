/**
 * @file crm/status/js/modules/domain-setup-wizard.js
 * Zelfbediening Domein- & E-mail Setup Wizard Module (TASK-911).
 * 
 * Biedt klanten een intuïtieve, stapsgewijze wizard om hun domeinnaam te koppelen,
 * verhuiscodes (EPP) door te geven, DNS-records te inspecteren (via healthcheck.php)
 * en direct zakelijke e-mail (IMAP/SMTP/Outlook/iOS) in te stellen.
 * 
 * Creation+Alt+Fix (2026/2027)
 */

import { escapeHtml } from "../../../js/firebase-config.js";

/**
 * Domeinkoppeling scenario-definities
 */
export const DOMAIN_SETUP_SCENARIOS = {
    full_transfer: {
        id: 'full_transfer',
        nameNl: 'Complete Verhuizing naar Creation+Alt+Fix (Aanbevolen)',
        nameEn: 'Full Transfer to Creation+Alt+Fix (Recommended)',
        badgeNl: '100% Zorgeloos',
        badgeEn: '100% Carefree',
        descNl: 'Wij beheren je domein, DNS, SSL-beveiliging en jaarlijkse verlenging. Je hebt er zelf geen technische omkijken naar.',
        descEn: 'We manage your domain, DNS, SSL security, and annual renewal. Completely hands-off for you.',
        icon: 'fas fa-shield-alt',
        color: '#00f2fe'
    },
    external_dns: {
        id: 'external_dns',
        nameNl: 'Bestaande Registrar Behouden (Zelf DNS Instellen)',
        nameEn: 'Keep Existing Registrar (Configure Custom DNS)',
        badgeNl: 'Voor Techneuten',
        badgeEn: 'Custom DNS',
        descNl: 'Behoud je domein bij je huidige provider (TransIP, Hostnet, Mijndomein) en stel zelf onze snelle A-, CNAME- en MX-records in.',
        descEn: 'Keep your domain registered with your existing provider and configure the A, CNAME, and MX records pointing to our server.',
        icon: 'fas fa-sliders-h',
        color: '#6366f1'
    },
    new_domain: {
        id: 'new_domain',
        nameNl: 'Nieuw .nl Domein Vastleggen',
        nameEn: 'Register a Brand New .nl Domain',
        badgeNl: 'Nieuwe Registratie',
        badgeEn: 'New Registration',
        descNl: 'Heb je nog geen domeinnaam? Creation+Alt+Fix legt jouw gewenste .nl domeinnaam direct vast en configureert alles turn-key.',
        descEn: 'No domain name yet? Creation+Alt+Fix registers and secures your desired .nl domain turnkey.',
        icon: 'fas fa-plus-circle',
        color: '#10b981'
    }
};

/**
 * Canonieke DNS en server target definities voor Creation+Alt+Fix
 */
export const RECOMMENDED_DNS_TARGETS = {
    primaryServerIp: '185.104.29.148',
    fallbackServerIp: '185.182.56.12',
    mailServer: 'mail.zxcs.nl',
    mailPriority: 10,
    spfRecord: 'v=spf1 a mx ip4:185.104.29.148 include:filter-out.zxcs.nl ~all',
    webmailUrl: 'https://webmail.creationaltfix.nl',
    nameservers: ['ns1.zxcs.nl', 'ns2.zxcs.nl', 'ns3.zxcs.nl']
};

/**
 * Normaliseert en saneert een domeinnaam invoer
 * @param {string} domain 
 * @returns {string} Gezuiverde domeinnaam in kleine letters
 */
export function sanitizeDomainName(domain) {
    if (!domain || typeof domain !== 'string') return '';
    let clean = domain.trim().toLowerCase();
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
    clean = clean.replace(/\/.*$/, '');
    clean = clean.replace(/[^a-z0-9.-]/g, '');
    clean = clean.replace(/\.{2,}/g, '.').replace(/-{2,}/g, '-');
    clean = clean.replace(/^\.+|\.+$/g, '');
    return clean;
}

/**
 * Normaliseert een EPP verhuiscode token
 * @param {string} token 
 * @returns {string} Veilige string zonder control characters (max 64 tekens)
 */
export function sanitizeEppToken(token) {
    if (!token || typeof token !== 'string') return '';
    return token.trim().replace(/[\x00-\x1F\x7F\r\n\t]/g, '').slice(0, 64);
}

/**
 * Genereert de canonieke lijst van aanbevolen DNS-records
 * @param {string} domain 
 * @param {Object} options 
 * @returns {Array<Object>}
 */
export function generateRecommendedDnsRecords(domain, options = {}) {
    const cleanDomain = sanitizeDomainName(domain) || 'jouwdomein.nl';
    const serverIp = options.serverIp || RECOMMENDED_DNS_TARGETS.primaryServerIp;
    const mailServer = options.mailServer || RECOMMENDED_DNS_TARGETS.mailServer;
    const spfRecord = options.spfRecord || RECOMMENDED_DNS_TARGETS.spfRecord;

    return [
        {
            id: 'record-a',
            type: 'A',
            host: '@',
            value: serverIp,
            ttl: '3600 (1 uur)',
            purposeNl: 'Koppelt je hoofddomein direct aan onze NVMe SSD webserver',
            purposeEn: 'Points your root domain to our high-speed NVMe SSD web server',
            required: true
        },
        {
            id: 'record-cname',
            type: 'CNAME',
            host: 'www',
            value: cleanDomain,
            ttl: '3600 (1 uur)',
            purposeNl: `Zorgt dat www.${cleanDomain} foutloos doorstuurt naar je website`,
            purposeEn: `Routes www.${cleanDomain} directly to your primary website`,
            required: true
        },
        {
            id: 'record-mx',
            type: 'MX',
            host: '@',
            value: mailServer,
            priority: 10,
            ttl: '3600 (1 uur)',
            purposeNl: 'Afhandeling van alle inkomende zakelijke e-mails',
            purposeEn: 'Handles all incoming business email routing',
            required: options.includeEmail !== false
        },
        {
            id: 'record-spf',
            type: 'TXT',
            host: '@',
            value: spfRecord,
            ttl: '3600 (1 uur)',
            purposeNl: 'SPF authenticatie: voorkomt dat jouw e-mails in de spam-inbox van klanten belanden',
            purposeEn: 'SPF authentication: prevents your emails from landing in customer spam folders',
            required: options.includeEmail !== false
        }
    ];
}

/**
 * Genereert e-mailinstellingen voor desktop & mobiele mailclients
 * @param {string} domain 
 * @returns {Object}
 */
export function getEmailClientSettings(domain) {
    const cleanDomain = sanitizeDomainName(domain) || 'jouwdomein.nl';
    return {
        domain: cleanDomain,
        defaultEmail: `info@${cleanDomain}`,
        imap: {
            server: RECOMMENDED_DNS_TARGETS.mailServer,
            port: 993,
            security: 'SSL / TLS',
            username: `info@${cleanDomain}`,
            auth: 'Wachtwoord (Password)'
        },
        smtp: {
            server: RECOMMENDED_DNS_TARGETS.mailServer,
            port: 465,
            security: 'SSL / TLS',
            username: `info@${cleanDomain}`,
            auth: 'Wachtwoord (Password)'
        },
        pop3: {
            server: RECOMMENDED_DNS_TARGETS.mailServer,
            port: 995,
            security: 'SSL / TLS'
        },
        webmailUrl: RECOMMENDED_DNS_TARGETS.webmailUrl
    };
}

/**
 * Evalueert de live DNS status op basis van analysegegevens
 * @param {Object} analysis 
 * @returns {Object}
 */
export function evaluateDnsStatus(analysis = {}) {
    const isAValid = Boolean(analysis.a_valid);
    const isWwwValid = Boolean(analysis.www_valid);
    const isMxValid = Boolean(analysis.mx_valid);
    const isSpfValid = Boolean(analysis.spf_valid);

    const isFullyReady = isAValid && isWwwValid;
    let overallBadge = 'pending';
    let statusTextNl = 'DNS-koppeling nog in behandeling';
    let statusTextEn = 'DNS configuration pending';

    if (isFullyReady) {
        overallBadge = 'success';
        statusTextNl = 'Domein wijst correct naar de Creation+Alt+Fix webserver';
        statusTextEn = 'Domain correctly resolves to the Creation+Alt+Fix web server';
    } else if (isAValid && !isWwwValid) {
        overallBadge = 'partial';
        statusTextNl = 'A-record actief, wacht nog op www CNAME propagatie';
        statusTextEn = 'A record verified, waiting for www CNAME propagation';
    } else if (!isAValid && (analysis.detected_a || (analysis.records?.a && analysis.records.a.length > 0))) {
        overallBadge = 'mismatch';
        statusTextNl = 'A-record wijst naar een ander IP-adres (nog niet naar Creation+Alt+Fix)';
        statusTextEn = 'A record points to another IP (not yet pointing to Creation+Alt+Fix)';
    }

    return {
        isAValid,
        isWwwValid,
        isMxValid,
        isSpfValid,
        isFullyReady,
        overallBadge,
        statusTextNl,
        statusTextEn,
        detectedA: analysis.detected_a || (analysis.records?.a ? analysis.records.a[0] : null),
        detectedMx: analysis.detected_mx || (analysis.records?.mx ? analysis.records.mx[0]?.target : null),
        detectedSpf: analysis.detected_spf || null
    };
}

/**
 * Voert een live DNS diagnostic check uit via crm/api/healthcheck.php
 * @param {string} domain 
 * @param {string} apiBase 
 * @returns {Promise<Object>}
 */
export async function runLiveDnsDiagnostic(domain, apiBase = '../api/healthcheck.php') {
    const clean = sanitizeDomainName(domain);
    if (!clean) {
        return {
            success: false,
            error: 'Ongeldig domein opgegeven.'
        };
    }

    try {
        const url = `${apiBase}?type=dns&domain=${encodeURIComponent(clean)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.warn('Live DNS diagnostic fallback:', err);
        return {
            success: false,
            domain: clean,
            error: err.message || 'Kon live DNS-controle niet voltooien. Controleer verbinding.',
            fallbackEvaluation: {
                isAValid: false,
                isWwwValid: false,
                overallBadge: 'pending',
                statusTextNl: 'DNS status kon niet live worden opgehaald. Probeer het over een minuut opnieuw.',
                statusTextEn: 'Could not fetch live DNS status. Please retry shortly.'
            }
        };
    }
}

/**
 * Rendert de complete Dark AI Wizard HTML structuur
 * @param {Object} params
 * @returns {string} HTML string
 */
export function renderDomainSetupWizardHtml({
    projectData = {},
    lang = 'nl',
    currentStep = 1,
    selectedScenario = 'full_transfer',
    dnsCheckResult = null,
    isCheckingDns = false,
    savedNotice = null
}) {
    const isEn = lang === 'en';
    const domainVal = projectData.domain || projectData.domainName || projectData.domainSetup?.domain || '';
    const cleanDomain = sanitizeDomainName(domainVal);
    const eppVal = projectData.domainTransferToken || projectData.eppCode || projectData.domainSetup?.eppCode || '';
    const cleanEpp = sanitizeEppToken(eppVal);

    const activeScenarioKey = projectData.domainSetup?.scenario || selectedScenario || 'full_transfer';
    const recRecords = generateRecommendedDnsRecords(cleanDomain);
    const emailConfig = getEmailClientSettings(cleanDomain);

    const dnsEval = dnsCheckResult?.analysis 
        ? evaluateDnsStatus(dnsCheckResult.analysis)
        : (projectData.domainSetup?.dnsAnalysis ? evaluateDnsStatus(projectData.domainSetup.dnsAnalysis) : null);

    const steps = [
        { num: 1, labelNl: 'Kies Scenario', labelEn: 'Select Scenario', icon: 'fas fa-route' },
        { num: 2, labelNl: 'Domein & Verhuiscode', labelEn: 'Domain & Transfer Token', icon: 'fas fa-key' },
        { num: 3, labelNl: 'Live DNS Verificatie', labelEn: 'Live DNS Diagnostic', icon: 'fas fa-network-wired' },
        { num: 4, labelNl: 'Zakelijke E-mail', labelEn: 'Business Email Setup', icon: 'fas fa-envelope-open-text' }
    ];

    // Status badge generator
    const getRecordBadge = (type) => {
        if (!dnsEval) {
            return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-question-circle"></i> ${isEn ? 'Not verified' : 'Nog niet geverifieerd'}</span>`;
        }
        if (type === 'A') {
            if (dnsEval.isAValid) {
                return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);"><i class="fas fa-check-circle"></i> ${isEn ? 'Active & Correct' : 'Actief & Correct'}</span>`;
            }
            return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4);"><i class="fas fa-clock"></i> ${isEn ? 'Pending propagation' : 'Wacht op propagatie'}</span>`;
        }
        if (type === 'CNAME') {
            if (dnsEval.isWwwValid) {
                return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);"><i class="fas fa-check-circle"></i> ${isEn ? 'Active' : 'Actief'}</span>`;
            }
            return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-clock"></i> ${isEn ? 'Optional / Pending' : 'Optioneel / Propagatie'}</span>`;
        }
        if (type === 'MX') {
            if (dnsEval.isMxValid) {
                return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);"><i class="fas fa-check-circle"></i> ${isEn ? 'Configured' : 'Geconfigureerd'}</span>`;
            }
            return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);">${isEn ? 'Pending' : 'In afwachting'}</span>`;
        }
        if (type === 'TXT') {
            if (dnsEval.isSpfValid) {
                return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);"><i class="fas fa-shield-alt"></i> SPF OK</span>`;
            }
            return `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);">SPF Optioneel</span>`;
        }
        return '';
    };

    return `
    <div class="domain-wizard-container" style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Wizard Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
            <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                    <span style="display: inline-flex; width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(99, 102, 241, 0.2)); border: 1px solid rgba(0, 242, 254, 0.4); align-items: center; justify-content: center; color: #00f2fe; font-size: 1rem;">
                        <i class="fas fa-globe"></i>
                    </span>
                    <h2 class="section-title" style="margin: 0; font-size: 1.25rem;">
                        ${isEn ? 'Domain & Business Email Setup Wizard' : 'Zelfbediening Domein- & E-mail Setup Wizard'}
                    </h2>
                    <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; background: rgba(0, 242, 254, 0.15); color: #00f2fe; border: 1px solid rgba(0, 242, 254, 0.35); font-weight: 700;">
                        TASK-911
                    </span>
                </div>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">
                    ${isEn 
                        ? 'Effortlessly connect your domain, submit your EPP transfer token, verify live DNS records, and configure business email.' 
                        : 'Koppel eenvoudig jouw domeinnaam, geef de EPP-verhuiscode door, verifieer live DNS-records en configureer zakelijke e-mail.'}
                </p>
            </div>

            <!-- Fast-jump buttons or status badge -->
            <div style="display: flex; align-items: center; gap: 8px;">
                ${dnsEval?.isFullyReady ? `
                    <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 5px 12px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); font-weight: 600;">
                        <i class="fas fa-check-double"></i> ${isEn ? 'DNS Fully Connected' : 'DNS 100% Gekoppeld'}
                    </span>
                ` : `
                    <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 5px 12px; border-radius: 9999px; background: rgba(99, 102, 241, 0.15); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.35);">
                        <i class="fas fa-sliders-h"></i> ${isEn ? 'Step ' + currentStep + ' of 4' : 'Stap ' + currentStep + ' van 4'}
                    </span>
                `}
            </div>
        </div>

        <!-- Wizard Step Navigation Pills -->
        <div class="domain-wizard-nav" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
            ${steps.map(s => {
                const isActive = s.num === currentStep;
                const isPassed = s.num < currentStep;
                return `
                    <button type="button" class="btn-wizard-step" data-step-target="${s.num}" style="
                        display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; cursor: pointer; text-align: left;
                        background: ${isActive ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(99, 102, 241, 0.15))' : (isPassed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)')};
                        border: 1px solid ${isActive ? '#00f2fe' : (isPassed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.08)')};
                        color: ${isActive ? '#fff' : (isPassed ? '#34d399' : '#94a3b8')};
                        font-family: inherit; font-size: 0.82rem; font-weight: 600; transition: all 0.2s ease;
                    ">
                        <span style="
                            width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; flex-shrink: 0;
                            background: ${isActive ? '#00f2fe' : (isPassed ? '#10b981' : 'rgba(255,255,255,0.1)')};
                            color: ${isActive || isPassed ? '#000' : '#fff'}; font-weight: 700;
                        ">
                            ${isPassed ? '<i class="fas fa-check"></i>' : s.num}
                        </span>
                        <span>${isEn ? s.labelEn : s.labelNl}</span>
                    </button>
                `;
            }).join('')}
        </div>

        ${savedNotice ? `
            <div style="padding: 10px 16px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-check-circle"></i> <span>${escapeHtml(savedNotice)}</span>
            </div>
        ` : ''}

        <!-- STEP 1: SCENARIO SELECTOR -->
        <div class="wizard-step-pane ${currentStep === 1 ? '' : 'hidden'}" id="wizard-step-1">
            <h3 style="margin: 0 0 10px 0; font-size: 1.05rem; color: #fff;">
                <i class="fas fa-route text-accent"></i> ${isEn ? 'Step 1: Choose Your Preferred Domain Strategy' : 'Stap 1: Kies Jouw Gewenste Domeinstrategie'}
            </h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
                ${isEn 
                    ? 'Select whether you want Creation+Alt+Fix to manage everything turnkey, configure DNS with your current provider, or register a new domain.' 
                    : 'Selecteer of je de verhuizing volledig aan ons toevertrouwt, zelf de DNS wilt beheren, of een gloednieuwe domeinnaam wilt laten vastleggen.'}
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
                ${Object.values(DOMAIN_SETUP_SCENARIOS).map(sc => {
                    const isSelected = activeScenarioKey === sc.id;
                    return `
                        <div class="scenario-card ${isSelected ? 'selected' : ''}" data-scenario-id="${sc.id}" style="
                            padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; position: relative;
                            background: ${isSelected ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.1), rgba(99, 102, 241, 0.08))' : 'rgba(255,255,255,0.03)'};
                            border: 2px solid ${isSelected ? sc.color : 'rgba(255,255,255,0.08)'};
                            box-shadow: ${isSelected ? `0 6px 20px rgba(0, 242, 254, 0.15)` : 'none'};
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="color: ${sc.color}; font-size: 1.3rem;">
                                        <i class="${sc.icon}"></i>
                                    </span>
                                    <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">
                                        ${isEn ? sc.nameEn : sc.nameNl}
                                    </h4>
                                </div>
                                <span style="font-size: 0.68rem; padding: 2px 7px; border-radius: 9999px; background: rgba(255,255,255,0.1); color: ${sc.color}; font-weight: 700;">
                                    ${isEn ? sc.badgeEn : sc.badgeNl}
                                </span>
                            </div>
                            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 0 0 12px 0; line-height: 1.45;">
                                ${isEn ? sc.descEn : sc.descNl}
                            </p>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: ${isSelected ? sc.color : '#94a3b8'};">
                                <input type="radio" name="wizard-scenario-radio" value="${sc.id}" ${isSelected ? 'checked' : ''} style="cursor: pointer; accent-color: ${sc.color};">
                                <span>${isSelected ? (isEn ? 'Selected Option' : 'Geselecteerd') : (isEn ? 'Select this' : 'Kies deze optie')}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- STEP 2: DOMAIN & EPP FORM -->
        <div class="wizard-step-pane ${currentStep === 2 ? '' : 'hidden'}" id="wizard-step-2">
            <h3 style="margin: 0 0 10px 0; font-size: 1.05rem; color: #fff;">
                <i class="fas fa-key text-accent"></i> ${isEn ? 'Step 2: Enter Domain Name & Transfer Authorization Token' : 'Stap 2: Domeinnaam & EPP-Verhuiscode Invoeren'}
            </h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
                ${isEn 
                    ? 'Enter the domain name for your project. If you are transferring an existing domain, provide the EPP authorization code from your current registrar.' 
                    : 'Vul de gewenste domeinnaam in. Bij verhuizing van een bestaand domein vul je de EPP-verhuiscode van je huidige registrar (bijv. TransIP of Hostnet) in.'}
            </p>

            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label for="input-wizard-domain" style="display: block; font-size: 0.85rem; color: #cbd5e1; font-weight: 600; margin-bottom: 6px;">
                        ${isEn ? 'Domain Name (without www or https):' : 'Domeinnaam (zonder www of https):'}
                    </label>
                    <div style="position: relative;">
                        <input type="text" id="input-wizard-domain" value="${escapeHtml(cleanDomain)}" placeholder="bijv. aannemer-vanderplaats.nl" style="
                            width: 100%; padding: 10px 14px 10px 38px; border-radius: 8px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-family: monospace; font-size: 0.95rem; box-sizing: border-box;
                        ">
                        <i class="fas fa-globe" style="position: absolute; left: 14px; top: 12px; color: var(--color-accent); font-size: 0.9rem;"></i>
                    </div>
                </div>

                <div id="wizard-epp-field-container" style="${activeScenarioKey === 'external_dns' ? 'display: none;' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label for="input-wizard-epp" style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">
                            ${isEn ? 'EPP Authorization / Transfer Token:' : 'EPP-Verhuiscode (Autorisatietoken):'}
                        </label>
                        <span style="font-size: 0.75rem; color: var(--color-accent);">
                            <i class="fas fa-shield-alt"></i> ${isEn ? 'Encrypted & Confidential' : 'Veilig opgeslagen in projectdossier'}
                        </span>
                    </div>
                    <div style="position: relative;">
                        <input type="text" id="input-wizard-epp" value="${escapeHtml(cleanEpp)}" placeholder="bijv. EPP-98xL!a4-2026" style="
                            width: 100%; padding: 10px 14px 10px 38px; border-radius: 8px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-family: monospace; font-size: 0.95rem; box-sizing: border-box;
                        ">
                        <i class="fas fa-lock" style="position: absolute; left: 14px; top: 12px; color: #fbbf24; font-size: 0.9rem;"></i>
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">
                        ${isEn 
                            ? 'You can request this token from your current provider (TransIP, Hostnet, Strato, Mijndomein) under Domain Management.' 
                            : 'Deze code vraag je eenvoudig op in het beheerpaneel van je huidige provider onder Domeinbeheer &gt; Verhuiscode.'}
                    </div>
                </div>
            </div>
        </div>

        <!-- STEP 3: LIVE DNS DIAGNOSTIC & RECORDS TABLE -->
        <div class="wizard-step-pane ${currentStep === 3 ? '' : 'hidden'}" id="wizard-step-3">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
                <div>
                    <h3 style="margin: 0; font-size: 1.05rem; color: #fff;">
                        <i class="fas fa-network-wired text-accent"></i> ${isEn ? 'Step 3: Live DNS Diagnostic & Required Records' : 'Stap 3: Live DNS-Controle & Benodigde Records'}
                    </h3>
                    <p style="color: var(--text-muted); font-size: 0.82rem; margin: 4px 0 0 0;">
                        ${isEn 
                            ? 'Point these records to our server. Click "Verify DNS Live" to check propagation status in realtime.' 
                            : 'Stel deze records in bij je registrar of controleer de live status. Klik op "Verifieer DNS Nu Live" voor realtime inspectie.'}
                    </p>
                </div>

                <button type="button" id="btn-wizard-run-dns" class="btn btn-sm" style="
                    background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.25);
                ">
                    <i class="fas ${isCheckingDns ? 'fa-spinner fa-spin' : 'fa-sync-alt'}"></i>
                    <span>${isCheckingDns ? (isEn ? 'Checking DNS...' : 'DNS Controleren...') : (isEn ? 'Verify DNS Live' : 'Verifieer DNS Nu Live')}</span>
                </button>
            </div>

            ${dnsEval ? `
                <div style="margin-bottom: 14px; padding: 12px 16px; border-radius: 10px; background: ${dnsEval.isFullyReady ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; border: 1px solid ${dnsEval.isFullyReady ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2rem; color: ${dnsEval.isFullyReady ? '#34d399' : '#fbbf24'};">
                            <i class="fas ${dnsEval.isFullyReady ? 'fa-check-circle' : 'fa-hourglass-half'}"></i>
                        </span>
                        <div>
                            <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">
                                ${isEn ? dnsEval.statusTextEn : dnsEval.statusTextNl}
                            </div>
                            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                                Gedetecteerd A-Record: <code style="color: #38bdf8;">${escapeHtml(dnsEval.detectedA || 'Geen resolutie')}</code> | MX: <code style="color: #cbd5e1;">${escapeHtml(dnsEval.detectedMx || 'Geen')}</code>
                            </div>
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">
                        ${isEn ? 'Checked via healthcheck.php' : 'Gecontroleerd via healthcheck.php'}
                    </span>
                </div>
            ` : ''}

            <!-- DNS Records Table -->
            <div style="overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(0,0,0,0.25);">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">
                            <th style="padding: 10px 14px;">Type</th>
                            <th style="padding: 10px 14px;">Host / Naam</th>
                            <th style="padding: 10px 14px;">Doelwaarde</th>
                            <th style="padding: 10px 14px;">Status</th>
                            <th style="padding: 10px 14px; text-align: right;">Actie</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recRecords.map(rec => {
                            return `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                                    <td style="padding: 12px 14px; font-weight: 700; color: #00f2fe;">
                                        ${rec.type}
                                    </td>
                                    <td style="padding: 12px 14px; font-family: monospace; color: #fff;">
                                        ${rec.host}
                                    </td>
                                    <td style="padding: 12px 14px; font-family: monospace; color: #38bdf8; word-break: break-all;">
                                        ${escapeHtml(rec.value)}
                                        <div style="font-family: inherit; font-size: 0.72rem; color: var(--text-muted); margin-top: 3px;">
                                            ${isEn ? rec.purposeEn : rec.purposeNl}
                                        </div>
                                    </td>
                                    <td style="padding: 12px 14px;">
                                        ${getRecordBadge(rec.type)}
                                    </td>
                                    <td style="padding: 12px 14px; text-align: right;">
                                        <button type="button" class="btn-copy-dns-val" data-copy-val="${escapeHtml(rec.value)}" style="
                                            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s ease;
                                        ">
                                            <i class="fas fa-copy"></i> <span>${isEn ? 'Copy' : 'Kopiëren'}</span>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- STEP 4: BUSINESS EMAIL SETTINGS -->
        <div class="wizard-step-pane ${currentStep === 4 ? '' : 'hidden'}" id="wizard-step-4">
            <h3 style="margin: 0 0 10px 0; font-size: 1.05rem; color: #fff;">
                <i class="fas fa-envelope-open-text text-accent"></i> ${isEn ? 'Step 4: Business Email Client Setup (Outlook, iOS & Webmail)' : 'Stap 4: Zakelijke E-mail Instellen (Outlook, iPhone & Webmail)'}
            </h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
                ${isEn 
                    ? 'Use these standardized settings to connect your mailbox (e.g. info@' + cleanDomain + ') to your phone or favorite mail app.' 
                    : 'Gebruik deze beveiligde gegevens om je zakelijke mailbox (bijv. info@' + cleanDomain + ') toe te voegen op je telefoon of computer.'}
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 16px;">
                <!-- IMAP Incoming -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.78rem; text-transform: uppercase; color: var(--color-accent); font-weight: 700;">
                            <i class="fas fa-inbox"></i> Inkomende E-mail (IMAP)
                        </span>
                        <span style="font-size: 0.72rem; color: #34d399; font-weight: 600;">SSL / TLS Encrypted</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Server:</span>
                            <code style="color: #fff;">${emailConfig.imap.server}</code>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Poort (Port):</span>
                            <code style="color: #38bdf8;">${emailConfig.imap.port}</code>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Beveiliging:</span>
                            <span style="color: #cbd5e1;">SSL/TLS</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Gebruikersnaam:</span>
                            <code style="color: #fff;">info@${escapeHtml(cleanDomain)}</code>
                        </div>
                    </div>
                </div>

                <!-- SMTP Outgoing -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.78rem; text-transform: uppercase; color: #38bdf8; font-weight: 700;">
                            <i class="fas fa-paper-plane"></i> Uitgaande E-mail (SMTP)
                        </span>
                        <span style="font-size: 0.72rem; color: #34d399; font-weight: 600;">SSL / TLS Encrypted</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Server:</span>
                            <code style="color: #fff;">${emailConfig.smtp.server}</code>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Poort (Port):</span>
                            <code style="color: #38bdf8;">${emailConfig.smtp.port}</code>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Beveiliging:</span>
                            <span style="color: #cbd5e1;">SSL/TLS</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Authenticatie:</span>
                            <span style="color: #cbd5e1;">Vereist (zelfde als IMAP)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px 16px; border-radius: 10px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-external-link-alt" style="color: var(--color-accent); font-size: 1.1rem;"></i>
                    <div>
                        <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">
                            Direct inloggen op Webmail
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            Lees en beantwoord je zakelijke e-mails direct vanuit elke browser.
                        </div>
                    </div>
                </div>
                <a href="${emailConfig.webmailUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;
                ">
                    <i class="fas fa-globe"></i> <span>Open Webmail</span>
                </a>
            </div>
        </div>

        <!-- Wizard Action Controls Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
            <div>
                ${currentStep > 1 ? `
                    <button type="button" id="btn-wizard-prev" class="btn btn-secondary btn-sm" style="
                        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;
                    ">
                        <i class="fas fa-chevron-left"></i> <span>${isEn ? 'Previous Step' : 'Vorige Stap'}</span>
                    </button>
                ` : `<div></div>`}
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
                <button type="button" id="btn-wizard-save-project" class="btn btn-sm" style="
                    background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-weight: 700; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;
                ">
                    <i class="fas fa-save"></i> <span>${isEn ? 'Save to Project Dossier' : 'Opslaan in Dossier'}</span>
                </button>

                ${currentStep < 4 ? `
                    <button type="button" id="btn-wizard-next" class="btn btn-sm" style="
                        background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: #000; font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; border: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.25);
                    ">
                        <span>${isEn ? 'Next Step' : 'Volgende Stap'}</span> <i class="fas fa-chevron-right"></i>
                    </button>
                ` : `
                    <button type="button" id="btn-wizard-finish" class="btn btn-sm" style="
                        background: linear-gradient(135deg, #10b981, #059669); color: #000; font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; border: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
                    ">
                        <i class="fas fa-check-circle"></i> <span>${isEn ? 'Complete Setup' : 'Setup Afronden'}</span>
                    </button>
                `}
            </div>
        </div>

    </div>
    `;
}

/**
 * Initialiseert en beheert de interactieve event lifecycle van de Domain Setup Wizard
 * @param {Object} options
 * @returns {Object} Wizard instance controller
 */
export function initDomainSetupWizard({
    containerId = 'domain-setup-wizard-card',
    projectData = {},
    onUpdateProject,
    lang = 'nl',
    onStatusChange
}) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return null;

    let currentStep = 1;
    let selectedScenario = projectData.domainSetup?.scenario || 'full_transfer';
    let dnsCheckResult = projectData.domainSetup?.dnsResult || null;
    let isCheckingDns = false;
    let savedNotice = null;

    const render = () => {
        container.innerHTML = renderDomainSetupWizardHtml({
            projectData,
            lang,
            currentStep,
            selectedScenario,
            dnsCheckResult,
            isCheckingDns,
            savedNotice
        });
        bindEvents();
    };

    const bindEvents = () => {
        // Step nav buttons
        container.querySelectorAll('.btn-wizard-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = parseInt(btn.getAttribute('data-step-target'), 10);
                if (!isNaN(target) && target >= 1 && target <= 4) {
                    currentStep = target;
                    savedNotice = null;
                    render();
                }
            });
        });

        // Scenario selection cards
        container.querySelectorAll('.scenario-card').forEach(card => {
            card.addEventListener('click', () => {
                const scId = card.getAttribute('data-scenario-id');
                if (scId && DOMAIN_SETUP_SCENARIOS[scId]) {
                    selectedScenario = scId;
                    render();
                }
            });
        });

        // Previous button
        container.querySelector('#btn-wizard-prev')?.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                savedNotice = null;
                render();
            }
        });

        // Next button
        container.querySelector('#btn-wizard-next')?.addEventListener('click', () => {
            if (currentStep < 4) {
                currentStep++;
                savedNotice = null;
                render();
            }
        });

        // Copy buttons
        container.querySelectorAll('.btn-copy-dns-val').forEach(btn => {
            btn.addEventListener('click', async () => {
                const val = btn.getAttribute('data-copy-val');
                if (val && navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(val);
                        const origHtml = btn.innerHTML;
                        btn.innerHTML = `<i class="fas fa-check" style="color: #34d399;"></i> <span>${lang === 'en' ? 'Copied!' : 'Gekopieerd!'}</span>`;
                        btn.style.borderColor = '#10b981';
                        setTimeout(() => {
                            btn.innerHTML = origHtml;
                            btn.style.borderColor = 'rgba(255,255,255,0.15)';
                        }, 2000);
                    } catch (e) {
                        console.warn('Clipboard write error:', e);
                    }
                }
            });
        });

        // Live DNS verification button
        container.querySelector('#btn-wizard-run-dns')?.addEventListener('click', async () => {
            const domainInput = container.querySelector('#input-wizard-domain');
            const cleanDomain = sanitizeDomainName(domainInput ? domainInput.value : (projectData.domain || ''));
            if (!cleanDomain) {
                alert(lang === 'en' ? 'Please enter a valid domain name first.' : 'Vul eerst een geldige domeinnaam in.');
                return;
            }

            isCheckingDns = true;
            render();

            try {
                const res = await runLiveDnsDiagnostic(cleanDomain);
                dnsCheckResult = res;
                if (onStatusChange) onStatusChange(res);
            } catch (err) {
                console.error("Fout bij uitvoeren live DNS check:", err);
            } finally {
                isCheckingDns = false;
                render();
            }
        });

        // Save to Project Dossier button
        const handleSave = async () => {
            const domainInput = container.querySelector('#input-wizard-domain');
            const eppInput = container.querySelector('#input-wizard-epp');

            const cleanDomain = sanitizeDomainName(domainInput ? domainInput.value : (projectData.domain || ''));
            const cleanEpp = sanitizeEppToken(eppInput ? eppInput.value : (projectData.domainTransferToken || ''));

            const updates = {
                domain: cleanDomain,
                domainName: cleanDomain,
                domainTransferToken: cleanEpp,
                eppCode: cleanEpp,
                domainSetup: {
                    domain: cleanDomain,
                    scenario: selectedScenario,
                    eppCode: cleanEpp,
                    lastVerifiedAt: new Date().toISOString(),
                    dnsAnalysis: dnsCheckResult?.analysis || null,
                    dnsResult: dnsCheckResult || null,
                    updatedAt: new Date().toISOString()
                }
            };

            // Auto-mark onboarding checklist domain task
            const existingCompleted = Array.isArray(projectData.onboarding?.completedTasks) 
                ? [...projectData.onboarding.completedTasks] 
                : [];
            if (!existingCompleted.includes('domain')) {
                existingCompleted.push('domain');
                updates['onboarding.completedTasks'] = existingCompleted;
            }

            if (typeof onUpdateProject === 'function') {
                try {
                    await onUpdateProject(updates);
                    savedNotice = lang === 'en' 
                        ? 'Domain settings successfully saved to project dossier!' 
                        : 'Domein- en e-mail instellingen succesvol opgeslagen in het projectdossier!';
                    // Update local copy
                    Object.assign(projectData, updates);
                } catch (err) {
                    console.error('Fout bij opslaan:', err);
                    savedNotice = lang === 'en' ? 'Failed to save settings.' : 'Opslaan mislukt. Probeer het opnieuw.';
                }
            } else {
                savedNotice = lang === 'en' ? 'Settings updated locally.' : 'Instellingen lokaal bijgewerkt.';
            }

            render();
        };

        container.querySelector('#btn-wizard-save-project')?.addEventListener('click', handleSave);
        container.querySelector('#btn-wizard-finish')?.addEventListener('click', handleSave);
    };

    render();

    return {
        getStep: () => currentStep,
        setStep: (s) => { currentStep = s; render(); },
        getScenario: () => selectedScenario,
        setScenario: (sc) => { selectedScenario = sc; render(); },
        reRender: render
    };
}
