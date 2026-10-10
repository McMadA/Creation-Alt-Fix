/**
 * Central CRM Configuration & Settings
 * Single Source of Truth for branding, API keys, plans, and core utilities.
 * 
 * To white-label or transfer this CRM to another business:
 * Simply update the values in BRANDING and FIREBASE_CONFIG below.
 */

// ==========================================
// 1. BRANDING & COMPANY DETAILS
// ==========================================
export const BRANDING = {
    companyName: "Creation+Alt+Fix",
    legalName: "Creation+Alt+Fix",
    tagline: "Software & Web Development",
    supportEmail: "info@creationaltfix.nl",
    phone: "+31 6 19135453",
    kvk: "99986191",
    vat: "NL005423147B16",
    address: "Hoofdstraat 60B, 9601 EK Hoogezand",
    website: "https://creationaltfix.nl",
    portalTitle: "Klantenportaal & Project Workspace",
    currencySymbol: "€",
    currencyCode: "EUR",
    defaultVatPercentage: 21,
    locale: "nl-NL"
};

// ==========================================
// 2. FIREBASE & CLOUD CREDENTIALS
// ==========================================
export const firebaseConfig = {
    apiKey: "AIzaSyAj2_cXCL6fs9qjp2q89F3ezLbErDp4wI8",
    authDomain: "mythical-cider-475118-e5.firebaseapp.com",
    projectId: "mythical-cider-475118-e5",
    storageBucket: "mythical-cider-475118-e5.firebasestorage.app",
    messagingSenderId: "755599901945",
    appId: "1:755599901945:web:589450049c785dacfcce28"
};

// Backwards compatibility alias
export const FIREBASE_CONFIG = firebaseConfig;

// ==========================================
// 3. ADMIN ACCESS WHITELIST
// ==========================================
export const ADMIN_EMAILS = [
    "allardv03@gmail.com",
    "info@creationaltfix.nl"
];

// ==========================================
// 4. NOTIFICATIONS (EMAILJS)
// ==========================================
export const EMAILJS_CONFIG = {
    serviceId: "service_mwhtpq1",
    templateId: "template_zihp21d",
    publicKey: "tZxaPDxDxlE0ME3Xk",
    toEmail: "info@creationaltfix.nl"
};

// ==========================================
// 5. SUBSCRIPTION & HOSTING PLANS
// ==========================================
export const SUBSCRIPTION_PLANS = {
    "managed_nl": { 
        id: "managed_nl", 
        name: "Managed Cloud Hosting & .nl Domein All-in", 
        price: "150,00", 
        cycle: "jaar", 
        badge: "Aanbevolen", 
        desc: "NVMe hosting, 1x .nl domein, SSL, 5 mailboxen, dagelijkse backups + 30 min. service per jaar" 
    },
    "transition_2027_loyalty": { 
        id: "transition_2027_loyalty", 
        name: "Trouwe Klant Overgangstarief 2027", 
        price: "95,00", 
        cycle: "jaar", 
        badge: "Trouwe Klant", 
        desc: "Speciaal overgangstarief voor 2027 (€ 95,-), per 2028 standaard € 150,-/jr. Incl. NVMe hosting, SSL, 5 mailboxen & 30 min. service" 
    },
    "managed_com": { 
        id: "managed_com", 
        name: "Managed Cloud Hosting & .com Domein All-in", 
        price: "165,00", 
        cycle: "jaar", 
        badge: ".com Domein", 
        desc: "NVMe hosting, 1x .com domein, SSL, 5 mailboxen, dagelijkse backups + 30 min. service per jaar" 
    },
    "managed_multi": { 
        id: "managed_multi", 
        name: "Managed Cloud Hosting Multi-Domein (.nl + .com)", 
        price: "175,00", 
        cycle: "jaar", 
        badge: "Multi-domein", 
        desc: "NVMe hosting, .nl + .com registraties, SSL, 5 mailboxen, dagelijkse backups + 30 min. service per jaar" 
    },
    "managed_custom": { 
        id: "managed_custom", 
        name: "Managed Cloud Hosting & Custom TLD", 
        price: "175,00", 
        cycle: "jaar", 
        badge: "Custom TLD", 
        desc: "NVMe hosting, internationale TLD registratie (.eu, .de, .org), SSL, 5 mailboxen + 30 min. service per jaar" 
    },
    "security_apk": { 
        id: "security_apk", 
        name: "Jaarlijkse Website & Security APK", 
        price: "350,00", 
        cycle: "jaar", 
        badge: "Onderhoud", 
        desc: "Security audit, optimalisaties, SEO check + 2u strippenkaart voor aanpassingen" 
    },
    "allin_apk": { 
        id: "allin_apk", 
        name: "Managed Hosting All-in + Security APK Totaal", 
        price: "500,00", 
        cycle: "jaar", 
        badge: "Full Service", 
        desc: "Managed hosting, domein, mailboxen + jaarlijkse APK & 2u strippenkaart" 
    },
    "legacy_22": { 
        id: "legacy_22", 
        name: "Historisch Budget Tarief", 
        price: "22,00", 
        cycle: "jaar", 
        badge: "Huidig Tarief", 
        desc: "12x € 1,- webhosting + € 10,- .nl domeinregistratie (lopend t/m 31-12-2026)" 
    },
    "internal_project": { 
        id: "internal_project", 
        name: "Eigen Project (Vimexx intern)", 
        price: "0,00", 
        cycle: "intern", 
        badge: "Intern", 
        desc: "Eigen project van Allard. Factuur van Vimexx registrar wordt intern direct doorgestuurd/doorbelast." 
    },
    "none": { 
        id: "none", 
        name: "Geen / Eenmalig Project (€ 0,-)", 
        price: "0,00", 
        cycle: "n.v.t.", 
        badge: "Eenmalig", 
        desc: "Eenmalig project zonder doorlopende hosting of service (rustend, tenzij klant contact opneemt)" 
    }
};

// ==========================================
// 6. WORKFLOW STAGES (5-PHASE MODEL)
// ==========================================
export const WORKFLOW_STAGES = [
    { number: 1, key: "intake", label: "Fase 1: Intake & Wensen", badgeClass: "concept", desc: "Aanvraag ontvangen en wensen in kaart gebracht." },
    { number: 2, key: "offerte", label: "Fase 2: Wacht op Akkoord (Offerte)", badgeClass: "waiting", desc: "Offerte en digitaal akkoord." },
    { number: 3, key: "design", label: "Fase 3: Design & Ontwerp", badgeClass: "concept", desc: "Visuele stijl en kleurenschema afstemmen." },
    { number: 4, key: "ontwikkeling", label: "Fase 4: In Ontwikkeling", badgeClass: "active", desc: "Code realiseren en grondig testen." },
    { number: 5, key: "livegang", label: "Fase 5: Volledig Live & Voldaan", badgeClass: "success", desc: "Eindcontrole en domein overdracht." }
];

// ==========================================
// 7. CORE UTILITIES
// ==========================================

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/`/g, '&#96;');
}

/**
 * Sanitizes URLs to prevent javascript:, data:, vbscript: and malicious protocol injection.
 * Whitelists https://, http://, /, mailto: and tel: schemes.
 * @param {string} url
 * @returns {string} Safe URL or '#' if dangerous
 */
export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    // Neutralize control characters
    if (/[\x00-\x1F\x7F]/.test(trimmed)) return '#';
    // Reject attribute breakouts, tags and script injection characters
    if (/[\s<>"'`]/.test(trimmed)) return '#';
    // Reject protocol-relative and backslash injection (//attacker.com, /\attacker.com, \\attacker.com, \path)
    if (/^[\/\\]{2}/.test(trimmed) || /^\/[\\\/]/.test(trimmed) || trimmed.startsWith('\\')) return '#';
    // Whitelist safe web protocols and strictly relative paths (e.g. /path, but not // or /\)
    if (/^(https?:\/\/|\/(?![\/\\])|mailto:|tel:)/i.test(trimmed)) {
        return trimmed;
    }
    return '#';
}

/**
 * Checks if email belongs to an administrator.
 * @param {string} email
 * @returns {boolean}
 */
export function isAdminEmail(email) {
    return ADMIN_EMAILS.includes((email || '').toLowerCase().trim());
}

/**
 * Evaluates whether a client project has an active, authenticated Firebase Auth account.
 * Crucially requires a valid email address; an account without an email can NEVER be activated.
 * Filters out legacy mock UIDs.
 * 
 * @param {Object} p - Project document
 * @returns {boolean}
 */
export function isClientAuthActivated(p) {
    if (!p) return false;
    const email = (p.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return false;

    // Check for authentic non-mock UID
    const hasAuthenticUid = Boolean(p.clientUid && p.clientUid !== 'QVzS7PyJkeXi7mM50HOgXsSiQFe2');
    return Boolean(hasAuthenticUid || p.isClientAccount);
}


/**
 * Standardizes project status badge and phase metadata.
 * @param {string} rawStatus 
 * @param {string} [fallbackStatusClass]
 * @returns {{ label: string, badgeClass: string, phase: number, isPhase5: boolean, isPaymentWaiting: boolean }}
 */
export function formatProjectStatus(rawStatus, fallbackStatusClass = '') {
    const s = (rawStatus || 'Nieuwe Lead').trim();
    const sLower = s.toLowerCase();

    // 1. Fase 5: Wacht op Betaling (Mollie)
    if (sLower.includes('mollie') || sLower.includes('wacht op betaling') || sLower.includes('betaling via')) {
        return {
            label: 'Fase 5: Wacht op Betaling (Mollie)',
            badgeClass: 'payment',
            phase: 5,
            isPhase5: true,
            isPaymentWaiting: true
        };
    }

    // 2. Fase 5: Volledig Live & Voldaan
    if (
        sLower.includes('voldaan') ||
        sLower.includes('volledig live') ||
        sLower.includes('opgeleverd') ||
        sLower.includes('livegang') ||
        sLower === 'afgerond' ||
        sLower === 'live' ||
        sLower.includes('aftercare')
    ) {
        return {
            label: 'Fase 5: Volledig Live & Voldaan',
            badgeClass: 'success',
            phase: 5,
            isPhase5: true,
            isPaymentWaiting: false
        };
    }

    // 3. Fase 4: In Ontwikkeling
    if (sLower.includes('ontwikkel') || sLower.includes('code')) {
        return {
            label: 'Fase 4: In Ontwikkeling',
            badgeClass: 'active',
            phase: 4,
            isPhase5: false,
            isPaymentWaiting: false
        };
    }

    // 4. Fase 3: Design & Ontwerp
    if (sLower.includes('design') || sLower.includes('ontwerp') || sLower.includes('concept')) {
        return {
            label: 'Fase 3: Design & Ontwerp',
            badgeClass: 'concept',
            phase: 3,
            isPhase5: false,
            isPaymentWaiting: false
        };
    }

    // 5. Fase 2: Wacht op Akkoord (Offerte)
    if (sLower.includes('akkoord') || sLower.includes('offerte') || sLower.includes('wacht op')) {
        return {
            label: 'Fase 2: Wacht op Akkoord (Offerte)',
            badgeClass: 'waiting',
            phase: 2,
            isPhase5: false,
            isPaymentWaiting: false
        };
    }

    // 6. Fase 1: Leads & Intakes
    if (sLower.includes('lead') || sLower.includes('intake')) {
        const cleanLabel = sLower.includes('intake') ? 'Fase 1: Intake Voltooid' : 'Fase 1: Nieuwe Lead';
        return {
            label: cleanLabel,
            badgeClass: 'concept',
            phase: 1,
            isPhase5: false,
            isPaymentWaiting: false
        };
    }

    // Fallback
    const cleaned = s.replace(/\s*\(\s*Fase\s*\d\s*\)/gi, '').trim();
    return {
        label: cleaned,
        badgeClass: fallbackStatusClass || 'waiting',
        phase: 1,
        isPhase5: false,
        isPaymentWaiting: false
    };
}

/**
 * Formats a numeric price into a localized currency string.
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return `${BRANDING.currencySymbol} 0,00`;
    let num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
    if (isNaN(num)) num = 0;
    return `${BRANDING.currencySymbol} ${num.toFixed(2).replace('.', ',')}`;
}

/**
 * Normalizes domain by stripping protocols, trailing slashes and www.
 * @param {string} domain 
 * @returns {string}
 */
export function normalizeDomain(domain) {
    if (!domain) return '';
    return domain.trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .trim();
}
