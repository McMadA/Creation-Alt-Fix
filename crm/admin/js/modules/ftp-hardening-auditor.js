/**
 * @file crm/admin/js/modules/ftp-hardening-auditor.js
 * Creation+Alt+Fix - Webserver FTP Hardening & DirectAdmin Security Auditor
 * [TASK-837] Enterprise TLS Enforcement, CSF/LFD Brute-Force Shielding & DPAPI Hygiene
 * 
 * Beveiligingsdoelen conform docs/VIMEXX-FTP-HARDENING-GUIDE.md:
 * 1. Forceren van Explicit TLS (TLSRequired on): blokkeert alle onversleutelde poort 21 logins
 * 2. Protocolrestrictie: uitsluitend TLSv1.2 en TLSv1.3 (verbiedt SSLv2, SSLv3, TLSv1.0, TLSv1.1)
 * 3. Chroot Directory Jail: strikte opsluiting in ~/public_html zonder toegang tot het Linux OS
 * 4. Uitschakelen van Anonymous FTP over alle 12 gehoste domeinen
 * 5. CSF/LFD Brute-Force Ban: LF_FTP=5, LF_PERMBLOCK=1, LF_TRIGGER=5
 * 6. Wachtwoordhygiëne: min. 32 tekens, hoge Shannon-entropie, opslag in Windows DPAPI kluis
 */

/**
 * De 12 officiële Vimexx-domeinen van Creation+Alt+Fix
 */
export const AUTHORIZED_DOMAINS = Object.freeze([
    'creationaltfix.nl',
    'stenekesrioolspecialist.nl',
    'angelastenekes.nl',
    'bakkertjesieg.nl',
    'arnolddesign.nl',
    'scholte-elektrotechniek.nl',
    'naaiatelier-willa.nl',
    'pomppop.nl',
    'besselinginstallatietechniek.nl',
    'deholterij.nl',
    'lutjestee.nl',
    'remtheerd.nl'
]);

/**
 * Richtlijnen en drempelwaarden voor ProFTPD / Pure-FTPd
 */
export const RECOMMENDED_PROFTPD_DIRECTIVES = Object.freeze({
    TLSEngine: 'on',
    TLSRequired: 'on',
    TLSProtocol: ['TLSv1.2', 'TLSv1.3'],
    TLSOptions: ['NoSessionReuseRequired'],
    DefaultRoot: '~',
    AnonymousFTP: 'disabled',
    CertificateFile: '/etc/httpd/conf/ssl.crt/server.crt',
    CertificateKeyFile: '/etc/httpd/conf/ssl.key/server.key'
});

/**
 * Richtlijnen voor ConfigServer Security & Firewall (CSF / LFD)
 */
export const RECOMMENDED_CSF_RULES = Object.freeze({
    LF_FTP: 5,        // Max mislukte inlogpogingen voor permanente IP-ban
    LF_FTP_SYN: 10,   // SYN flood probe bescherming
    LF_TRIGGER: 5,    // Trigger automatische firewall ban
    LF_PERMBLOCK: 1,  // Permanente IP-ban (1 = permanent)
    LF_SELECTIVE: 1   // Selectieve servicepoort blokkade
});

export const MIN_PASSWORD_LENGTH = 32;
export const MIN_SHANNON_ENTROPY = 3.8;

/**
 * Berekent de Shannon-entropie van een wachtwoordstring (bits per karakter)
 * H = -sum(p_i * log2(p_i))
 * 
 * @param {string} str - Te analyseren wachtwoord
 * @returns {number} Entropie in bits/char (0.0 tot ~6.5)
 */
export function calculateShannonEntropy(str) {
    if (!str || typeof str !== 'string' || str.length === 0) {
        return 0.0;
    }

    const freqMap = {};
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        freqMap[char] = (freqMap[char] || 0) + 1;
    }

    const len = str.length;
    let entropy = 0.0;

    for (const char in freqMap) {
        const p = freqMap[char] / len;
        entropy -= p * Math.log2(p);
    }

    return Math.round(entropy * 100) / 100;
}

/**
 * Valideert ProFTPD / Pure-FTPd configuratietekst tegen de DirectAdmin hardening standaard
 * 
 * @param {string} configContent - Inhoud van proftpd.conf of DirectAdmin template
 * @returns {object} Auditresultaat met score, overtredingen en aanbevelingen
 */
export function auditProftpdConfig(configContent) {
    const result = {
        isCompliant: false,
        score: 0,
        tlsEngineActive: false,
        tlsRequiredEnforced: false,
        protocolsCompliant: false,
        chrootJailEnforced: false,
        anonymousDisabled: true,
        sessionReuseOptionConfigured: false,
        certificatesFound: false,
        detectedProtocols: [],
        violations: [],
        passedChecks: []
    };

    if (!configContent || typeof configContent !== 'string') {
        result.violations.push({
            severity: 'CRITICAL',
            code: 'EMPTY_CONFIG',
            message: 'Geen configuratie ontvangen ter inspectie.',
            recommendation: 'Laad de actieve proftpd.conf van /etc/proftpd.conf in.'
        });
        return result;
    }

    // Strippen van inline en block comments voor schone directive parsing
    const cleaned = configContent
        .replace(/#.*$/gm, '')
        .trim();

    // 1. TLSEngine on
    if (/^\s*TLSEngine\s+on\b/mi.test(cleaned)) {
        result.tlsEngineActive = true;
        result.passedChecks.push('TLSEngine is ingeschakeld (on).');
    } else {
        result.violations.push({
            severity: 'CRITICAL',
            code: 'TLS_ENGINE_OFF',
            message: 'TLSEngine ontbreekt of staat uit. FTPS encryptie is niet actief.',
            recommendation: 'Voeg "TLSEngine on" toe in het <IfModule mod_tls.c> blok.'
        });
    }

    // 2. TLSRequired on (De kern van TASK-837: weigeren van plain FTP op poort 21)
    if (/^\s*TLSRequired\s+on\b/mi.test(cleaned)) {
        result.tlsRequiredEnforced = true;
        result.passedChecks.push('TLSRequired staat op "on": onversleuteld FTP verkeer wordt geweigerd met 530/534.');
    } else {
        const hasAuthOnly = /^\s*TLSRequired\s+auth\b/mi.test(cleaned);
        result.violations.push({
            severity: 'CRITICAL',
            code: 'TLS_REQUIRED_MISSING',
            message: hasAuthOnly 
                ? 'TLSRequired staat op "auth" (staat onversleutelde data-overdracht toe).'
                : 'TLSRequired ontbreekt of staat niet op "on". Poort 21 staat platte tekst inloggen toe.',
            recommendation: 'Zet "TLSRequired on" om alle inlog- en data-verbindingen te forceren over TLS.'
        });
    }

    // 3. TLSProtocol inspectie (geen legacy SSLv2, SSLv3, TLSv1.0, TLSv1.1)
    const protocolMatch = cleaned.match(/^\s*TLSProtocol\s+([^\r\n]+)/mi);
    if (protocolMatch) {
        const protocols = protocolMatch[1].trim().split(/\s+/);
        result.detectedProtocols = protocols;

        const hasInsecure = protocols.some(p => ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.0', 'TLSv1.1'].includes(p));
        const hasModern = protocols.some(p => ['TLSv1.2', 'TLSv1.3'].includes(p));

        if (hasInsecure) {
            result.violations.push({
                severity: 'HIGH',
                code: 'INSECURE_TLS_PROTOCOL',
                message: `Insecure cryptografische protocollen gedetecteerd: ${protocols.filter(p => ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.0', 'TLSv1.1'].includes(p)).join(', ')}.`,
                recommendation: 'Beperk TLSProtocol strikt tot: "TLSProtocol TLSv1.2 TLSv1.3".'
            });
        } else if (hasModern) {
            result.protocolsCompliant = true;
            result.passedChecks.push(`TLSProtocols zijn modern en gehard (${protocols.join(', ')}).`);
        }
    } else {
        result.violations.push({
            severity: 'MEDIUM',
            code: 'TLS_PROTOCOL_UNDEFINED',
            message: 'Geen expliciete TLSProtocol richtlijn gevonden (server hanteert verouderde defaults).',
            recommendation: 'Definieer "TLSProtocol TLSv1.2 TLSv1.3" in mod_tls.c.'
        });
    }

    // 4. TLSOptions NoSessionReuseRequired
    if (/^\s*TLSOptions\s+.*NoSessionReuseRequired/mi.test(cleaned)) {
        result.sessionReuseOptionConfigured = true;
        result.passedChecks.push('TLSOptions NoSessionReuseRequired geconfigureerd (stabiele data transfers over TLS).');
    }

    // 5. DefaultRoot chroot jail isolation
    if (/^\s*DefaultRoot\s+(\~|\/domains\/|\/home\/)/mi.test(cleaned)) {
        result.chrootJailEnforced = true;
        result.passedChecks.push('DefaultRoot chroot jail is actief: gebruikers zijn opgesloten in hun webroot.');
    } else {
        result.violations.push({
            severity: 'CRITICAL',
            code: 'CHROOT_JAIL_MISSING',
            message: 'DefaultRoot chroot ontbreekt. FTP-gebruikers kunnen buiten hun public_html navigeren naar Linux systeemmappen.',
            recommendation: 'Voeg "DefaultRoot ~" toe aan proftpd.conf voor hermetische isolatie.'
        });
    }

    // 6. Anonymous FTP uitschakelen
    // Zoek naar <Anonymous ...> blokken die niet zijn uitgeschakeld
    const hasAnonymousBlock = /<Anonymous\s+[^>]+>[\s\S]*?<\/Anonymous>/mi.test(configContent);
    if (hasAnonymousBlock) {
        result.anonymousDisabled = false;
        result.violations.push({
            severity: 'CRITICAL',
            code: 'ANONYMOUS_FTP_ENABLED',
            message: '<Anonymous> blok aangetroffen in configuratie. Anonieme inlog via poort 21 is mogelijk.',
            recommendation: 'Verwijder alle <Anonymous> blokken definitief uit proftpd.conf.'
        });
    } else {
        result.passedChecks.push('Anonymous FTP is volledig uitgeschakeld / afwezig.');
    }

    // 7. Certificaten aanwezig
    const hasCert = /^\s*TLSRSACertificateFile\s+/mi.test(cleaned);
    const hasKey = /^\s*TLSRSACertificateKeyFile\s+/mi.test(cleaned);
    if (hasCert && hasKey) {
        result.certificatesFound = true;
        result.passedChecks.push('TLSRSACertificateFile en TLSRSACertificateKeyFile zijn geconfigureerd.');
    } else {
        result.violations.push({
            severity: 'HIGH',
            code: 'CERTIFICATES_UNDEFINED',
            message: 'SSL Certificaat of private key pad ontbreekt in mod_tls.c.',
            recommendation: 'Configureer paden naar server.crt en server.key.'
        });
    }

    // Score berekening (Max 100)
    let score = 0;
    if (result.tlsEngineActive) score += 20;
    if (result.tlsRequiredEnforced) score += 30; // Zwaartepunt van hardening
    if (result.protocolsCompliant) score += 15;
    if (result.chrootJailEnforced) score += 20;
    if (result.anonymousDisabled) score += 10;
    if (result.certificatesFound) score += 5;

    result.score = Math.min(100, Math.max(0, score));
    result.isCompliant = (
        result.tlsEngineActive &&
        result.tlsRequiredEnforced &&
        result.protocolsCompliant &&
        result.chrootJailEnforced &&
        result.anonymousDisabled
    );

    return result;
}

/**
 * Valideert CSF / LFD firewall parameters conform docs/VIMEXX-FTP-HARDENING-GUIDE.md
 * 
 * @param {string} csfContent - Inhoud van /etc/csf/csf.conf
 * @returns {object} Auditresultaat voor brute-force preventie
 */
export function auditCsfConfig(csfContent) {
    const result = {
        isCompliant: false,
        score: 0,
        rules: {},
        violations: [],
        passedChecks: []
    };

    if (!csfContent || typeof csfContent !== 'string') {
        result.violations.push({
            severity: 'CRITICAL',
            code: 'EMPTY_CSF_CONFIG',
            message: 'Geen CSF configuratie ontvangen.',
            recommendation: 'Laad /etc/csf/csf.conf in ter controle.'
        });
        return result;
    }

    const parseValue = (key) => {
        const regex = new RegExp(`^\\s*${key}\\s*=\\s*["']?([\\w\\d]+)["']?`, 'mi');
        const match = csfContent.match(regex);
        return match ? match[1].trim() : null;
    };

    const lfFtp = parseInt(parseValue('LF_FTP'), 10);
    const lfFtpSyn = parseInt(parseValue('LF_FTP_SYN'), 10);
    const lfTrigger = parseInt(parseValue('LF_TRIGGER'), 10);
    const lfPermblock = parseInt(parseValue('LF_PERMBLOCK'), 10);
    const lfSelective = parseInt(parseValue('LF_SELECTIVE'), 10);

    result.rules = {
        LF_FTP: isNaN(lfFtp) ? null : lfFtp,
        LF_FTP_SYN: isNaN(lfFtpSyn) ? null : lfFtpSyn,
        LF_TRIGGER: isNaN(lfTrigger) ? null : lfTrigger,
        LF_PERMBLOCK: isNaN(lfPermblock) ? null : lfPermblock,
        LF_SELECTIVE: isNaN(lfSelective) ? null : lfSelective
    };

    // 1. LF_FTP (Aanbevolen: 5)
    if (!isNaN(lfFtp) && lfFtp > 0 && lfFtp <= RECOMMENDED_CSF_RULES.LF_FTP) {
        result.passedChecks.push(`LF_FTP staat strak afgesteld op ${lfFtp} pogingen.`);
    } else {
        result.violations.push({
            severity: 'HIGH',
            code: 'LF_FTP_LOOSE',
            message: isNaN(lfFtp) || lfFtp === 0 
                ? 'LF_FTP ontbreekt of staat uit (0). FTP brute-force pogingen worden niet geblokkeerd!'
                : `LF_FTP staat te ruim afgesteld (${lfFtp} > ${RECOMMENDED_CSF_RULES.LF_FTP}).`,
            recommendation: `Zet "LF_FTP = ${RECOMMENDED_CSF_RULES.LF_FTP}" in /etc/csf/csf.conf.`
        });
    }

    // 2. LF_PERMBLOCK (Moet 1 zijn voor permanente ban)
    if (lfPermblock === 1) {
        result.passedChecks.push('LF_PERMBLOCK = 1 (Permanente IP-ban geactiveerd voor hardnekkige aanvallers).');
    } else {
        result.violations.push({
            severity: 'MEDIUM',
            code: 'LF_PERMBLOCK_DISABLED',
            message: `LF_PERMBLOCK staat op ${lfPermblock ?? 0}. Aanvallers worden slechts tijdelijk geband en komen terug.`,
            recommendation: 'Zet "LF_PERMBLOCK = 1" om herhaalde inbraakpogingen definitief te bannen.'
        });
    }

    // 3. LF_TRIGGER
    if (!isNaN(lfTrigger) && lfTrigger > 0 && lfTrigger <= RECOMMENDED_CSF_RULES.LF_TRIGGER) {
        result.passedChecks.push(`LF_TRIGGER is actief (${lfTrigger}).`);
    } else {
        result.violations.push({
            severity: 'MEDIUM',
            code: 'LF_TRIGGER_WEAK',
            message: `LF_TRIGGER (${lfTrigger ?? 'ontbreekt'}) moet maximaal ${RECOMMENDED_CSF_RULES.LF_TRIGGER} zijn.`,
            recommendation: `Zet "LF_TRIGGER = ${RECOMMENDED_CSF_RULES.LF_TRIGGER}".`
        });
    }

    // 4. LF_FTP_SYN
    if (!isNaN(lfFtpSyn) && lfFtpSyn > 0 && lfFtpSyn <= 15) {
        result.passedChecks.push(`LF_FTP_SYN bescherming actief (${lfFtpSyn}).`);
    }

    // Score CSF (Max 100)
    let score = 0;
    if (result.rules.LF_FTP && result.rules.LF_FTP <= 5) score += 40;
    if (result.rules.LF_PERMBLOCK === 1) score += 30;
    if (result.rules.LF_TRIGGER && result.rules.LF_TRIGGER <= 5) score += 20;
    if (result.rules.LF_FTP_SYN && result.rules.LF_FTP_SYN <= 15) score += 10;

    result.score = score;
    result.isCompliant = (
        result.rules.LF_FTP <= RECOMMENDED_CSF_RULES.LF_FTP &&
        result.rules.LF_PERMBLOCK === 1 &&
        result.rules.LF_TRIGGER <= RECOMMENDED_CSF_RULES.LF_TRIGGER
    );

    return result;
}

/**
 * Valideert FTP accounts tegen de 12 geautoriseerde domeinen, chroot paden en generieke logins
 * 
 * @param {Array<object>} accounts - Lijst met FTP account objecten [{ username, directory, domain }]
 * @param {Array<string>} authorizedDomains - Whitelist van toegestane domeinen
 * @returns {object} Account audit resultaat
 */
export function auditFtpAccounts(accounts = [], authorizedDomains = AUTHORIZED_DOMAINS) {
    const result = {
        isCompliant: false,
        totalAccounts: 0,
        validAccounts: 0,
        orphanedAccounts: [],
        anonymousAccounts: [],
        traversalViolations: [],
        violations: []
    };

    if (!Array.isArray(accounts)) {
        result.violations.push({
            severity: 'HIGH',
            code: 'INVALID_ACCOUNT_LIST',
            message: 'Accounts lijst is niet in array formaat.'
        });
        return result;
    }

    result.totalAccounts = accounts.length;
    const authSet = new Set(authorizedDomains.map(d => d.toLowerCase()));

    for (const acc of accounts) {
        if (!acc || typeof acc !== 'object') continue;

        const user = String(acc.username || '').trim().toLowerCase();
        const dir = String(acc.directory || '').trim();
        const domain = String(acc.domain || '').trim().toLowerCase();

        // 1. Detecteer anonieme of gevaarlijke generieke logins
        if (['anonymous', 'ftp', 'guest', 'public', 'test', 'admin'].includes(user)) {
            result.anonymousAccounts.push(user);
            result.violations.push({
                severity: 'CRITICAL',
                code: 'DANGEROUS_GENERIC_ACCOUNT',
                account: user,
                message: `Gevaarlijk generiek account aangetroffen: "${user}".`,
                recommendation: `Verwijder account "${user}" direct via DirectAdmin FTP Management.`
            });
            continue;
        }

        // 2. Valideer chroot directory en path traversal
        if (!dir || dir === '/' || dir === '/root' || dir === '/etc' || dir === '/home' || dir.includes('..')) {
            result.traversalViolations.push({ user, dir });
            result.violations.push({
                severity: 'CRITICAL',
                code: 'DIRECTORY_TRAVERSAL_RISK',
                account: user,
                directory: dir,
                message: `Account "${user}" heeft ongeoorloofde of ongechrootte rootdirectory: "${dir}".`,
                recommendation: `Beperk pad tot "domains/${domain || 'domein.nl'}/public_html/".`
            });
            continue;
        }

        // 3. Valideer gekoppeld domein tegen geautoriseerde domeinen
        if (domain && !authSet.has(domain)) {
            result.orphanedAccounts.push({ user, domain });
            result.violations.push({
                severity: 'HIGH',
                code: 'ORPHANED_DOMAIN_ACCOUNT',
                account: user,
                domain,
                message: `Account "${user}" behoort tot niet-geautoriseerd of verouderd domein: "${domain}".`,
                recommendation: 'Verwijder verweesde sub-FTP accounts van verlopen projecten.'
            });
            continue;
        }

        result.validAccounts++;
    }

    result.isCompliant = (
        result.anonymousAccounts.length === 0 &&
        result.traversalViolations.length === 0 &&
        result.orphanedAccounts.length === 0
    );

    return result;
}

/**
 * Valideert de veiligheid, lengte en entropie van het FTP wachtwoord conform de DPAPI standaard
 * 
 * @param {string} password - Te valideren wachtwoord
 * @param {object} metadata - Optionele metadata ({ storageType: 'dpapi' | 'plaintext' | 'env' })
 * @returns {object} Wachtwoord audit resultaat
 */
export function auditFtpPassword(password, metadata = {}) {
    const result = {
        isCompliant: false,
        length: 0,
        entropy: 0.0,
        hasUpper: false,
        hasLower: false,
        hasDigit: false,
        hasSpecial: false,
        storageSecure: true,
        violations: [],
        passedChecks: []
    };

    if (!password || typeof password !== 'string') {
        result.violations.push({
            severity: 'CRITICAL',
            code: 'PASSWORD_EMPTY',
            message: 'Geen wachtwoord opgegeven voor audit.'
        });
        return result;
    }

    result.length = password.length;
    result.entropy = calculateShannonEntropy(password);

    result.hasUpper = /[A-Z]/.test(password);
    result.hasLower = /[a-z]/.test(password);
    result.hasDigit = /[0-9]/.test(password);
    result.hasSpecial = /[^A-Za-z0-9]/.test(password);

    // 1. Lengte validatie (TASK-837: min. 32 tekens)
    if (result.length >= MIN_PASSWORD_LENGTH) {
        result.passedChecks.push(`Wachtwoordlengte (${result.length} tekens) voldoet aan de 32-karakter norm.`);
    } else {
        result.violations.push({
            severity: 'CRITICAL',
            code: 'PASSWORD_TOO_SHORT',
            message: `Wachtwoord is te kort (${result.length} tekens). Vereist is minimaal ${MIN_PASSWORD_LENGTH} tekens conform TASK-837.`,
            recommendation: 'Genereer een cryptografisch sterk wachtwoord van minstens 32 tekens in de DPAPI kluis.'
        });
    }

    // 2. Karakterdiversiteit
    const diversityCount = [result.hasUpper, result.hasLower, result.hasDigit, result.hasSpecial].filter(Boolean).length;
    if (diversityCount === 4) {
        result.passedChecks.push('Wachtwoord bevat alle 4 karakterklassen (hoofdletters, kleine letters, cijfers, symbolen).');
    } else {
        result.violations.push({
            severity: 'HIGH',
            code: 'INSUFFICIENT_CHARSET',
            message: `Wachtwoord mist karaktervariatie (${diversityCount}/4 categorieën).`,
            recommendation: 'Gebruik een combinatie van hoofdletters, kleine letters, cijfers en speciale symbolen.'
        });
    }

    // 3. Shannon Entropie
    if (result.entropy >= MIN_SHANNON_ENTROPY) {
        result.passedChecks.push(`Shannon-entropie is hoog (${result.entropy} bits/karakter).`);
    } else {
        result.violations.push({
            severity: 'HIGH',
            code: 'LOW_ENTROPY',
            message: `Entropie is te laag (${result.entropy} < ${MIN_SHANNON_ENTROPY} bits/char). Mogelijk herhalende patronen.`,
            recommendation: 'Vermijd herhalende patronen of woordenboeken in het wachtwoord.'
        });
    }

    // 4. Opslaghygiëne (DPAPI / Git uitsluiting)
    if (metadata.storageType === 'plaintext' || metadata.inGitHistory === true) {
        result.storageSecure = false;
        result.violations.push({
            severity: 'CRITICAL',
            code: 'INSECURE_STORAGE',
            message: 'FTP wachtwoord is opgeslagen in platte tekst of gecommit in Git!',
            recommendation: 'Sla credentials uitsluitend op via save-crm-credentials-secure.ps1 in de DPAPI kluis.'
        });
    } else {
        result.passedChecks.push('Opslaghygiëne gevalideerd (DPAPI kluis / beveiligde omgevingsvariabelen).');
    }

    result.isCompliant = (
        result.length >= MIN_PASSWORD_LENGTH &&
        diversityCount === 4 &&
        result.entropy >= MIN_SHANNON_ENTROPY &&
        result.storageSecure
    );

    return result;
}

/**
 * Genereert de officiële, geharde ProFTPD configuratiesnippet voor DirectAdmin
 * 
 * @param {object} customOptions - Optionele overrides voor paden
 * @returns {string} Productieklare ProFTPD configuratieblok
 */
export function generateHardenedProftpdConfig(customOptions = {}) {
    const certPath = customOptions.certPath || RECOMMENDED_PROFTPD_DIRECTIVES.CertificateFile;
    const keyPath = customOptions.keyPath || RECOMMENDED_PROFTPD_DIRECTIVES.CertificateKeyFile;

    return `# ========================================================
# Creation+Alt+Fix - DirectAdmin ProFTPD Hardening Snippet
# [TASK-837] Explicit TLS Forceren & Chroot Isolatie
# ========================================================

<IfModule mod_tls.c>
    # 1. Activeer TLS Engine
    TLSEngine on

    # 2. Forceer TLS voor ALLE logins en data-overdracht
    # Weigert plain onversleutelde inlogpogingen met:
    # 530 Please login with USER and PASS over TLS
    TLSRequired on

    # 3. Protocol Restrictie (uitsluitend moderne protocollen)
    TLSProtocol TLSv1.2 TLSv1.3

    # 4. Data-transfer stabiliteit over TLS
    TLSOptions NoSessionReuseRequired

    # 5. SSL / TLS Certificaten
    TLSRSACertificateFile ${certPath}
    TLSRSACertificateKeyFile ${keyPath}

    # 6. Logging van TLS-handshakes
    TLSLog /var/log/proftpd/tls.log
</IfModule>

# Hermetische Chroot Isolatie: Gebruiker kan webroot niet verlaten
DefaultRoot ~

# Anonieme FTP definitief uitschakelen
# (Geen <Anonymous> blokken toestaan)
`;
}

/**
 * Genereert de officiële, geharde CSF/LFD configuratieregels voor /etc/csf/csf.conf
 * 
 * @returns {string} Productieklare CSF firewall configuratiesectie
 */
export function generateHardenedCsfSnippet() {
    return `# ========================================================
# Creation+Alt+Fix - CSF / LFD FTP Brute-Force Shielding
# [TASK-837]docs/VIMEXX-FTP-HARDENING-GUIDE.md
# ========================================================
LF_FTP = 5
LF_FTP_SYN = 10
LF_TRIGGER = 5
LF_PERMBLOCK = 1
LF_SELECTIVE = 1
`;
}

/**
 * Voert een volledige end-to-end audit uit over ProFTPD, CSF, accounts en wachtwoorden
 * 
 * @param {object} auditInputs - { proftpdConfig, csfConfig, accounts, password, passwordMeta }
 * @returns {object} Geaggregeerd auditrapport met score, status en checklist
 */
export function runFtpSecurityAudit(auditInputs = {}) {
    const proftpdReport = auditProftpdConfig(auditInputs.proftpdConfig || '');
    const csfReport = auditCsfConfig(auditInputs.csfConfig || '');
    const accountReport = auditFtpAccounts(auditInputs.accounts || [], AUTHORIZED_DOMAINS);
    const passwordReport = auditInputs.password 
        ? auditFtpPassword(auditInputs.password, auditInputs.passwordMeta || {})
        : null;

    // Gewogen totaalscore
    // ProFTPD: 40%, CSF: 30%, Accounts: 20%, Password: 10%
    const weights = {
        proftpd: 0.40,
        csf: 0.30,
        accounts: 0.20,
        password: passwordReport ? 0.10 : 0.00
    };

    // Herberekenen gewichten indien geen wachtwoord is aangeleverd
    if (!passwordReport) {
        weights.proftpd = 0.45;
        weights.csf = 0.35;
        weights.accounts = 0.20;
    }

    const totalScore = Math.round(
        (proftpdReport.score * weights.proftpd) +
        (csfReport.score * weights.csf) +
        (accountReport.isCompliant ? 100 * weights.accounts : 0) +
        (passwordReport ? passwordReport.length >= MIN_PASSWORD_LENGTH ? 100 * weights.password : 0 : 0)
    );

    let status = 'CRITICAL';
    let grade = 'F';

    if (totalScore >= 95) {
        status = 'SECURED';
        grade = 'A+';
    } else if (totalScore >= 80) {
        status = 'GOOD';
        grade = 'A';
    } else if (totalScore >= 60) {
        status = 'WARNING';
        grade = 'B';
    }

    const allViolations = [
        ...proftpdReport.violations,
        ...csfReport.violations,
        ...accountReport.violations,
        ...(passwordReport ? passwordReport.violations : [])
    ];

    return {
        timestamp: new Date().toISOString(),
        status,
        grade,
        totalScore,
        proftpd: proftpdReport,
        csf: csfReport,
        accounts: accountReport,
        password: passwordReport,
        violations: allViolations,
        isFullyHardened: totalScore >= 95 && allViolations.length === 0
    };
}
