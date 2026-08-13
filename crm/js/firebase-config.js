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
    "info@creationaltfix.nl",
    "allard@creationaltfix.nl",
    "allardveldman@gmail.com"
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
