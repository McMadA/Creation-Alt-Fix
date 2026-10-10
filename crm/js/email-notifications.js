/**
 * CRM Email Notification Service
 * Creation+Alt+Fix — Zero-Backend E-mail Notificaties
 * 
 * Handles all automated email notifications for the CRM:
 * 1. Admin alert when a client sends a message/ticket
 * 2. Client notification when admin replies
 * 3. Client notification on project phase transitions
 * 
 * Uses EmailJS (existing service) for delivery.
 * Anti-spam throttle prevents duplicate emails within 2 minutes.
 * 
 * ============================================================
 * SETUP VEREIST (eenmalig in EmailJS Dashboard):
 * 
 * Template voor klant-notificaties (template_crm_client):
 *   Subject: {{subject}}
 *   To:      {{to_email}}
 *   Body:    Gebruik {{message_html}} voor de volledige HTML body
 * 
 * De admin-notificatie gebruikt het bestaande template_zihp21d.
 * ============================================================
 */

import { EMAILJS_CONFIG } from './firebase-config.js';
import { escapeHtml } from './crm-config.js';

// ============================================================
// Configuration
// ============================================================

/** 
 * EmailJS Template IDs 
 * - adminAlert: bestaand template → stuurt naar info@creationaltfix.nl
 * - clientNotification: NIEUW template → stuurt naar dynamisch klant-e-mail
 *   Maak dit template aan in https://dashboard.emailjs.com/ met:
 *   To: {{to_email}}, Subject: {{subject}}, Body: {{message_html}}
 */
const TEMPLATES = {
    adminAlert: EMAILJS_CONFIG.templateId,       // template_zihp21d
    clientNotification: 'template_crm_client'    // Nieuw template (aanmaken in EmailJS dashboard)
};

const THROTTLE_MS = 120_000; // 2 minuten anti-spam
const _sentLog = new Map();  // key → timestamp anti-duplicate map

const PORTAL_URL = 'https://portal.creationaltfix.nl/crm/status/';
const ADMIN_URL = 'https://portal.creationaltfix.nl/crm/admin/';

// ============================================================
// EmailJS Loader (lazy, CDN)
// ============================================================

let _emailjsReady = false;
let _emailjsLoading = null;

async function ensureEmailJS() {
    if (_emailjsReady && window.emailjs) return true;
    if (_emailjsLoading) return _emailjsLoading;

    _emailjsLoading = new Promise((resolve) => {
        if (window.emailjs) {
            window.emailjs.init(EMAILJS_CONFIG.publicKey);
            _emailjsReady = true;
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.onload = () => {
            if (window.emailjs) {
                window.emailjs.init(EMAILJS_CONFIG.publicKey);
                _emailjsReady = true;
                resolve(true);
            } else {
                console.warn('[CRM Notify] EmailJS loaded but emailjs object not found');
                resolve(false);
            }
        };
        script.onerror = () => {
            console.warn('[CRM Notify] Failed to load EmailJS CDN');
            resolve(false);
        };
        document.head.appendChild(script);
    });

    return _emailjsLoading;
}

// ============================================================
// Throttle Guard
// ============================================================

export function sanitizeHeader(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[\r\n\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Strikt valideren en saneren van ontvangers e-mailadres
 * Voorkomt CC/BCC injectie, header injection en multi-recipient misbruik
 * @param {string} email 
 * @returns {string} Schoon e-mailadres of lege string indien ongeldig
 */
export function sanitizeRecipientEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const clean = email.trim().toLowerCase().replace(/[\r\n\x00-\x1F\x7F,; ]/g, '');
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(clean) ? clean : '';
}

function pruneSentLog() {
    const now = Date.now();
    for (const [k, timestamp] of _sentLog.entries()) {
        if (now - timestamp > THROTTLE_MS * 2) {
            _sentLog.delete(k);
        }
    }
}

function isThrottled(key) {
    pruneSentLog();
    const last = _sentLog.get(key);
    if (last && (Date.now() - last) < THROTTLE_MS) return true;
    return false;
}

function markSent(key) {
    _sentLog.set(key, Date.now());
}

// ============================================================
// Branded HTML Email Templates
// ============================================================

function buildAdminAlertHtml({ clientName, clientEmail, projectName, messagePreview, category }) {
    const safeClient = escapeHtml(clientName || 'Klant');
    const safeEmail = escapeHtml(clientEmail || '—');
    const safeProject = escapeHtml(projectName || 'Project');
    const safeCategory = escapeHtml(category || 'Algemeen');
    const safePreview = escapeHtml(messagePreview || '');

    return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(99,102,241,0.3);">
        <div style="background: linear-gradient(135deg, #6366f1, #22d3ee); padding: 24px 28px;">
            <h1 style="color: #fff; margin: 0; font-size: 1.3rem;">💬 Nieuw Klantbericht</h1>
        </div>
        <div style="padding: 28px; color: #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; color: #94a3b8; width: 120px;">Klant:</td><td style="padding: 8px 0; color: #f8fafc; font-weight: 600;">${safeClient}</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8;">E-mail:</td><td style="padding: 8px 0; color: #22d3ee;">${safeEmail}</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8;">Project:</td><td style="padding: 8px 0; color: #f8fafc;">${safeProject}</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8;">Categorie:</td><td style="padding: 8px 0; color: #f8fafc;">${safeCategory}</td></tr>
            </table>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; color: #f1f5f9; line-height: 1.6;">"${safePreview}"</p>
            </div>
            <a href="${ADMIN_URL}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600;">Bekijk in Admin Dashboard →</a>
        </div>
        <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="margin: 0; font-size: 0.8rem; color: #64748b;">Creation+Alt+Fix CRM — Automatische Notificatie</p>
        </div>
    </div>`;
}

function buildClientNotificationHtml({ clientName, projectName, messagePreview, type }) {
    const isPhaseUpdate = type === 'phase';
    const safeClient = escapeHtml(clientName || 'Klant');
    const safeProject = escapeHtml(projectName || 'Project');
    const safePreview = isPhaseUpdate ? messagePreview : escapeHtml(messagePreview || '');

    const title = isPhaseUpdate 
        ? '🚀 Projectupdate: Nieuwe Mijlpaal Bereikt!' 
        : '💬 Allard heeft gereageerd op je bericht';
    const subtitle = isPhaseUpdate
        ? `Er is een update voor je project "${safeProject}".`
        : `Je hebt een nieuw antwoord ontvangen voor het project "${safeProject}".`;

    return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(99,102,241,0.3);">
        <div style="background: linear-gradient(135deg, #6366f1, #22d3ee); padding: 24px 28px;">
            <h1 style="color: #fff; margin: 0; font-size: 1.3rem;">${title}</h1>
        </div>
        <div style="padding: 28px; color: #e2e8f0;">
            <p style="margin: 0 0 8px; font-size: 1.05rem; color: #f8fafc;">Hallo ${safeClient},</p>
            <p style="color: #94a3b8; margin: 0 0 20px; line-height: 1.6;">${subtitle}</p>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #f1f5f9; line-height: 1.6;">${safePreview}</p>
            </div>
            <a href="${PORTAL_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem;">Bekijk in je Klantenportaal →</a>
            <p style="margin: 16px 0 0; font-size: 0.85rem; color: #64748b;">Of ga direct naar: <a href="${PORTAL_URL}" style="color: #22d3ee;">${PORTAL_URL}</a></p>
        </div>
        <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="margin: 0; font-size: 0.8rem; color: #64748b;">Creation+Alt+Fix — Webdesign, Development & Automatisering</p>
            <p style="margin: 4px 0 0; font-size: 0.75rem; color: #475569;">Je ontvangt dit bericht omdat je een actief project hebt bij Creation+Alt+Fix.</p>
        </div>
    </div>`;
}


// ============================================================
// Phase Transition Descriptions
// ============================================================

const PHASE_DESCRIPTIONS = {
    'Fase 1: Nieuwe Lead': 'Je aanvraag is ontvangen en wordt nu beoordeeld door ons team.',
    'Fase 1: Intake Voltooid': 'De intake is compleet. We stellen nu een offerte op basis van je wensen.',
    'Fase 2: Wacht op Akkoord (Offerte)': 'Je offerte staat klaar in het portaal! Review en onderteken deze digitaal om het project te starten.',
    'Fase 3: Design & Ontwerp': 'Het conceptontwerp is in ontwikkeling. Binnenkort kun je het eerste visuele ontwerp reviewen in je portaal.',
    'Fase 4: In Ontwikkeling': 'De technische ontwikkeling is gestart! Je website wordt nu gebouwd door ons development team.',
    'Fase 5: Wacht op Betaling (Mollie)': 'Je project is klaar voor oplevering! Rond de betaling af via iDEAL om de livegang te starten.',
    'Fase 5: Volledig Live & Voldaan': 'Gefeliciteerd! Je project is volledig live en operationeel. Bedankt voor het vertrouwen!'
};

// ============================================================
// Public API
// ============================================================

/**
 * Notify admin when a client sends a new message or ticket.
 * Sends to info@creationaltfix.nl via EmailJS (existing template).
 */
export async function notifyAdminNewMessage({ clientName, clientEmail, projectName, messagePreview, category }) {
    const cleanEmail = sanitizeHeader(clientEmail || '');
    const cleanName = sanitizeHeader(clientName || 'Klant');
    const cleanProject = sanitizeHeader(projectName || 'Project');
    const cleanCategory = sanitizeHeader(category || 'Algemeen');

    const throttleKey = `admin_msg_${cleanEmail}_${Date.now().toString().slice(0, -5)}`;
    if (isThrottled(throttleKey)) {
        console.log('[CRM Notify] Admin alert throttled (duplicate prevention)');
        return false;
    }

    const safeSubject = `💬 Nieuw bericht van ${cleanName} — ${cleanProject}`;

    try {
        const ready = await ensureEmailJS();
        if (!ready) {
            console.warn('[CRM Notify] EmailJS not available, using FormSubmit fallback');
            return await sendFormSubmitFallback({
                to: EMAILJS_CONFIG.toEmail,
                subject: safeSubject,
                html: buildAdminAlertHtml({ clientName: cleanName, clientEmail: cleanEmail, projectName: cleanProject, messagePreview, category: cleanCategory })
            });
        }

        await window.emailjs.send(EMAILJS_CONFIG.serviceId, TEMPLATES.adminAlert, {
            to_name: 'Allard',
            to_email: EMAILJS_CONFIG.toEmail,
            from_name: cleanName,
            reply_to: cleanEmail,
            subject: safeSubject,
            message: `Nieuw klantbericht ontvangen:\n\nKlant: ${cleanName}\nE-mail: ${cleanEmail}\nProject: ${cleanProject}\nCategorie: ${cleanCategory}\n\nBericht:\n"${messagePreview}"\n\nBekijk in Admin Dashboard: ${ADMIN_URL}`,
            message_html: buildAdminAlertHtml({ clientName: cleanName, clientEmail: cleanEmail, projectName: cleanProject, messagePreview, category: cleanCategory })
        });

        markSent(throttleKey);
        console.log(`[CRM Notify] ✅ Admin notificatie verstuurd voor bericht van ${cleanName}`);
        return true;
    } catch (err) {
        console.error('[CRM Notify] Admin alert failed:', err);
        return false;
    }
}

/**
 * Notify client when admin sends a reply to their message.
 * Sends branded email to client's email via EmailJS (client template).
 */
export async function notifyClientAdminReply({ clientEmail, clientName, projectName, messagePreview }) {
    const cleanEmail = sanitizeRecipientEmail(clientEmail || '');
    if (!cleanEmail) {
        console.warn('[CRM Notify] No valid client email provided, skipping notification');
        return false;
    }

    const cleanName = sanitizeHeader(clientName || 'Klant');
    const cleanProject = sanitizeHeader(projectName || 'Project');

    const throttleKey = `client_reply_${cleanEmail}_${Date.now().toString().slice(0, -5)}`;
    if (isThrottled(throttleKey)) {
        console.log('[CRM Notify] Client reply notification throttled');
        return false;
    }

    const safeSubject = `💬 Allard heeft gereageerd — ${cleanProject}`;

    try {
        const ready = await ensureEmailJS();
        if (!ready) return false;

        await window.emailjs.send(EMAILJS_CONFIG.serviceId, TEMPLATES.clientNotification, {
            to_name: cleanName,
            to_email: cleanEmail,
            from_name: 'Allard (Creation+Alt+Fix)',
            reply_to: 'info@creationaltfix.nl',
            subject: safeSubject,
            message: `Hallo ${cleanName},\n\nAllard heeft gereageerd op je bericht voor "${cleanProject}":\n\n"${messagePreview}"\n\nBekijk het volledige antwoord in je klantenportaal:\n${PORTAL_URL}`,
            message_html: buildClientNotificationHtml({ clientName: cleanName, projectName: cleanProject, messagePreview, type: 'reply' })
        });

        markSent(throttleKey);
        console.log(`[CRM Notify] ✅ Klant notificatie verstuurd naar ${cleanEmail}`);
        return true;
    } catch (err) {
        console.error('[CRM Notify] Client reply notification failed:', err);
        // Log but don't throw - notification failure should never block CRM operations
        return false;
    }
}

/**
 * Notify client when admin changes the project phase (milestone email).
 * Sends branded milestone update to client's email.
 */
export async function notifyClientPhaseChange({ clientEmail, clientName, projectName, newPhaseLabel }) {
    const cleanEmail = sanitizeRecipientEmail(clientEmail || '');
    if (!cleanEmail) {
        console.warn('[CRM Notify] No valid client email for phase notification, skipping');
        return false;
    }

    const cleanName = sanitizeHeader(clientName || 'Klant');
    const cleanProject = sanitizeHeader(projectName || 'Project');
    const cleanPhase = sanitizeHeader(newPhaseLabel || 'Nieuwe Mijlpaal');

    const throttleKey = `phase_${cleanEmail}_${cleanPhase}`;
    if (isThrottled(throttleKey)) {
        console.log('[CRM Notify] Phase notification throttled');
        return false;
    }

    const safePhase = escapeHtml(cleanPhase);
    const rawDesc = PHASE_DESCRIPTIONS[newPhaseLabel] || `Je project is bijgewerkt naar: ${cleanPhase}`;
    const safeDesc = escapeHtml(rawDesc);
    const safeSubject = `🚀 Mijlpaal bereikt — ${cleanProject}: ${cleanPhase}`;

    try {
        const ready = await ensureEmailJS();
        if (!ready) return false;

        await window.emailjs.send(EMAILJS_CONFIG.serviceId, TEMPLATES.clientNotification, {
            to_name: cleanName,
            to_email: cleanEmail,
            from_name: 'Creation+Alt+Fix',
            reply_to: 'info@creationaltfix.nl',
            subject: safeSubject,
            message: `Hallo ${cleanName},\n\nGoed nieuws! Er is een update voor je project "${cleanProject}".\n\n${cleanPhase}\n${rawDesc}\n\nVolg de live voortgang via je klantenportaal:\n${PORTAL_URL}`,
            message_html: buildClientNotificationHtml({ 
                clientName: cleanName, 
                projectName: cleanProject, 
                messagePreview: `<strong>${safePhase}</strong><br/><br/>${safeDesc}`, 
                type: 'phase' 
            })
        });

        markSent(throttleKey);
        console.log(`[CRM Notify] ✅ Fase-notificatie verstuurd naar ${cleanEmail}: ${cleanPhase}`);
        return true;
    } catch (err) {
        console.error('[CRM Notify] Phase notification failed:', err);
        return false;
    }
}

// ============================================================
// FormSubmit Fallback (admin direction only)
// ============================================================

async function sendFormSubmitFallback({ to, subject, html }) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
        const resp = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            signal: controller ? controller.signal : undefined,
            body: JSON.stringify({
                subject: subject,
                message: html,
                _template: 'box'
            })
        });
        if (timer) clearTimeout(timer);
        return resp.ok;
    } catch (err) {
        if (timer) clearTimeout(timer);
        console.warn('[CRM Notify] FormSubmit fallback failed:', err);
        return false;
    }
}
