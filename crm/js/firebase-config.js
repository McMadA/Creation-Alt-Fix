/**
 * Shared Firebase Configuration & Security Utilities
 * Creation+Alt+Fix CRM - Single Source of Truth
 * 
 * Importeer dit bestand in alle CRM modules:
 * import { firebaseConfig, escapeHtml } from "../js/firebase-config.js";
 */

export const firebaseConfig = {
    apiKey: "AIzaSyAj2_cXCL6fs9qjp2q89F3ezLbErDp4wI8",
    authDomain: "mythical-cider-475118-e5.firebaseapp.com",
    projectId: "mythical-cider-475118-e5",
    storageBucket: "mythical-cider-475118-e5.firebasestorage.app",
    messagingSenderId: "755599901945",
    appId: "1:755599901945:web:589450049c785dacfcce28"
};

/**
 * Geautoriseerde beheerders e-mailadressen (Whitelist)
 * Wordt gebruikt door admin.js, index.html login routing, en status.js
 */
export const ADMIN_EMAILS = [
    "allardv03@gmail.com",
    "info@creationaltfix.nl"
];

/**
 * EmailJS Notification Configuration
 */
export const EMAILJS_CONFIG = {
    serviceId: "service_mwhtpq1",
    templateId: "template_zihp21d",
    publicKey: "tZxaPDxDxlE0ME3Xk",
    toEmail: "info@creationaltfix.nl"
};

/**
 * Escapes HTML special characters to prevent XSS injection.
 * MUST be used on all user-supplied data before inserting into innerHTML.
 * 
 * @param {string} str - The raw string to escape
 * @returns {string} - HTML-escaped string safe for innerHTML
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Checks if an email address belongs to an administrator.
 * @param {string} email
 * @returns {boolean}
 */
export function isAdminEmail(email) {
    return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

/**
 * Harmonizes project statuses across the CRM, ensuring uniform phase naming,
 * clean badges, and eliminating clumsy duplicate parentheses.
 * 
 * Phase 5 specifications:
 * - Fase 5: Wacht op Betaling (Mollie) -> blue/orange payment badge (technically live, awaiting settlement)
 * - Fase 5: Volledig Live & Voldaan -> green success badge (live & fully paid)
 * 
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

    // Fallback: clean up any redundant "(Fase X)" parentheses
    const cleaned = s.replace(/\s*\(\s*Fase\s*\d\s*\)/gi, '').trim();
    return {
        label: cleaned,
        badgeClass: fallbackStatusClass || 'waiting',
        phase: 1,
        isPhase5: false,
        isPaymentWaiting: false
    };
}

