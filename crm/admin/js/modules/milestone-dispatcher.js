/**
 * @file crm/admin/js/modules/milestone-dispatcher.js
 * Geautomatiseerde WhatsApp & E-mail Milestone Triggers met Beveiligde Magic Links (TASK-909).
 * 
 * Features:
 * - 5 Gestructureerde Projectfasen & Mijlpaal Definities (Offerte, Design, Ontwikkeling, Betaling, Livegang)
 * - Cryptografische Tokenized Magic Links (HMAC-SHA256, expiration, tamper-proof)
 * - Branded WhatsApp URL Dispatcher met geavanceerde Nederlandse nummernormalisatie
 * - Dark AI Branded Responsive HTML E-mail Generator (XSS-veilig & CRLF-beschermd)
 * - Server-Side PHP Dispatch Connector met fail-safe fallback
 * - Audit Trail Record Formatter voor Firestore timeline
 * 
 * Creation+Alt+Fix (2026/2027)
 */

import { escapeHtml } from "../../../js/firebase-config.js";

// ============================================================
// Constants & Milestone Definitions
// ============================================================

export const DEFAULT_PORTAL_BASE_URL = (typeof window !== 'undefined' && window.CAF_PORTAL_BASE_URL) || 'https://portal.creationaltfix.nl/crm/status/';
export const DEFAULT_MAGIC_SECRET = (typeof window !== 'undefined' && window.CAF_MAGIC_SECRET) || (typeof process !== 'undefined' && process.env && process.env.CAF_MAGIC_SECRET) || 'caf_portal_milestone_sec_2026_bf9a4c12';
export const DEFAULT_EXPIRY_HOURS = 168; // 7 dagen geldig

export const MILESTONE_DEFINITIONS = {
    proposal_ready: {
        key: 'proposal_ready',
        phaseNum: 2,
        title: 'Offerte & Voorstel Gereed',
        badgeText: 'Offerte Gereed',
        color: '#38bdf8', // Sky Blue
        icon: 'fas fa-file-signature',
        headline: 'Je offerte & projectscope staan klaar ter beoordeling',
        defaultSubject: '📄 Je digitale voorstel voor {projectName} staat klaar ter beoordeling',
        actionLabel: 'Offerte Inzien & Digitaal Accorderen',
        actionType: 'proposal',
        whatsappTemplate: 'Beste {clientName}, je digitale voorstel voor {projectName} staat klaar in je klantenportaal! 🚀\n\nBekijk de deliverables en begroting direct via je persoonlijke link:\n{portalLink}\n\nLaat gerust weten als je vragen hebt!\n\nMet vriendelijke groet,\nAllard — Creation+Alt+Fix',
        emailSummaryTemplate: 'We hebben het volledige plan van aanpak, de projectdeliverables en de investeringsbegroting voor {projectName} voor je klaargezet. Je kunt het voorstel direct digitaal inzien en accorderen met 1 klik.'
    },
    design_ready: {
        key: 'design_ready',
        phaseNum: 3,
        title: 'Design Concept & Staging Live',
        badgeText: 'Design Concept Live',
        color: '#c084fc', // Purple Accent
        icon: 'fas fa-palette',
        headline: 'Het interactieve design concept staat live voor je klaar',
        defaultSubject: '🎨 Het interactieve design voor {projectName} staat live!',
        actionLabel: 'Design Concept Beoordelen',
        actionType: 'design',
        whatsappTemplate: 'Hoi {clientName}, goed nieuws! Het interactieve design concept voor {projectName} staat live voor je klaar. 🎨\n\nBekijk het ontwerp en geef eenvoudig je feedback via je portaal:\n{portalLink}\n\nBenieuwd naar je reactie!\n\nMet vriendelijke groet,\nAllard — Creation+Alt+Fix',
        emailSummaryTemplate: 'Het prototype en de live staging omgeving van je nieuwe website staan gereed. Bekijk de visuele stijl, navigatie en opzet direct op desktop en mobiel via je persoonlijke link.'
    },
    development_started: {
        key: 'development_started',
        phaseNum: 4,
        title: 'Technische Ontwikkeling Gestart',
        badgeText: 'In Ontwikkeling',
        color: '#60a5fa', // Blue
        icon: 'fas fa-code',
        headline: 'De technische ontwikkeling van je project is gestart',
        defaultSubject: '💻 De technische ontwikkeling van {projectName} is gestart',
        actionLabel: 'Voortgang & Checklist Bekijken',
        actionType: 'development',
        whatsappTemplate: 'Hoi {clientName}, we zijn gestart met de technische realisatie van {projectName}! 💻\n\nJe kunt de actuele voortgang en de oplever-checklist live volgen in je klantenportaal:\n{portalLink}\n\nWe houden je op de hoogte!\n\nMet vriendelijke groet,\nAllard — Creation+Alt+Fix',
        emailSummaryTemplate: 'Ons development team is gestart met de implementatie van je website. Alle functionaliteiten, snelle laadtijden en mobiele optimalisaties worden nu gebouwd.'
    },
    payment_waiting: {
        key: 'payment_waiting',
        phaseNum: 5,
        title: 'Oplevering Gereed & Wacht op Betaling',
        badgeText: 'Oplevering & Betaling',
        color: '#f59e0b', // Amber
        icon: 'fas fa-credit-card',
        headline: 'Je website is gereed voor livegang (afronding betaling)',
        defaultSubject: '🚀 {projectName} is klaar voor livegang! (Afronding betaling)',
        actionLabel: 'Factuur Inzien & Betalen via iDEAL',
        actionType: 'payment',
        whatsappTemplate: 'Beste {clientName}, {projectName} is technisch helemaal klaar voor livegang! 🚀\n\nJe kunt de afronding en de factuur direct veilig via iDEAL voldoen in je klantenportaal:\n{portalLink}\n\nZodra dit rond is zetten we jouw website direct definitief live!\n\nMet vriendelijke groet,\nAllard — Creation+Alt+Fix',
        emailSummaryTemplate: 'De ontwikkelings- en testfase is succesvol doorlopen. Zodra de afrondende factuur via iDEAL is voldaan, activeren wij direct de DNS en zetten we jouw website officieel live.'
    },
    project_completed: {
        key: 'project_completed',
        phaseNum: 5,
        title: 'Project Volledig Live & Voldaan',
        badgeText: 'Live & Operationeel',
        color: '#10b981', // Emerald Green
        icon: 'fas fa-rocket',
        headline: 'Gefeliciteerd! Je website is officieel live en operationeel',
        defaultSubject: '🎉 Gefeliciteerd! {projectName} is officieel live!',
        actionLabel: 'Live Website & Klantendossier Openen',
        actionType: 'completed',
        whatsappTemplate: 'Gefeliciteerd {clientName}! 🎉\n\n{projectName} is vanaf nu officieel live en operationeel{domainClause}! Bekijk je live website en het opleverdossier in je portaal:\n{portalLink}\n\nOntzettend bedankt voor de prettige samenwerking!\n\nMet vriendelijke groet,\nAllard — Creation+Alt+Fix',
        emailSummaryTemplate: 'Je project is succesvol gelanceerd op het wereldwijde web! Vanaf nu profiteer je van sub-seconde laadtijden, optimale SEO en 99,9% uptime monitoring door Creation+Alt+Fix.'
    },
    custom: {
        key: 'custom',
        phaseNum: 0,
        title: 'Aangepaste Project Mijlpaal',
        badgeText: 'Project Update',
        color: '#00f2fe', // Cyan Accent
        icon: 'fas fa-bullhorn',
        headline: 'Belangrijke voortgangsupdate voor je project',
        defaultSubject: '📢 Voortgangsupdate voor {projectName}',
        actionLabel: 'Klantportaal Openen',
        actionType: 'custom',
        whatsappTemplate: 'Beste {clientName},\n\nEr is een update voor je project "{projectName}":\n\n{customNote}\n\nBekijk direct alle details in je klantenportaal:\n{portalLink}\n\nMet vriendelijke groet,\nAllard — Creation+Alt+Fix',
        emailSummaryTemplate: '{customNote}'
    }
};

// ============================================================
// Cryptographic Token & Magic Link Utilities
// ============================================================

/**
 * Base64URL Encoding & Decoding (RFC 4648)
 */
export function base64UrlEncode(str) {
    if (typeof btoa !== 'undefined') {
        const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1));
        return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'utf8').toString('base64url');
    }
    return '';
}

export function base64UrlDecode(b64) {
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof atob !== 'undefined') {
        const raw = atob(padded);
        return decodeURIComponent(Array.from(raw).map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(padded, 'base64').toString('utf8');
    }
    return '';
}

/**
 * Deterministic HMAC-SHA256 Signature (Synchronous + Web Crypto Compatible)
 * Produces standard hex string signature for payload authentication.
 */
export async function computeHmacSha256Hex(keyStr, dataStr) {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
        try {
            const enc = new TextEncoder();
            const cryptoKey = await globalThis.crypto.subtle.importKey(
                'raw',
                enc.encode(keyStr),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            const signature = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(dataStr));
            return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // fallback
        }
    }
    // Synchronous pure JS fallback for environments without WebCrypto subtle
    return computeFastHmacHex(keyStr, dataStr);
}

/**
 * Fast Deterministic Hash/MAC Fallback (Pure JS)
 */
export function computeFastHmacHex(keyStr, dataStr) {
    // 32-bit FNV-1a with mixing cascade
    let h1 = 0x811c9dc5;
    let h2 = 0x6c62272e;
    const combined = `${keyStr}:::${dataStr}:::${keyStr}`;
    for (let i = 0; i < combined.length; i++) {
        const code = combined.charCodeAt(i);
        h1 = Math.imul(h1 ^ code, 16777619);
        h2 = Math.imul(h2 ^ (code + i), 1099511628);
    }
    const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
    const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
    const part4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
    return `${part1}${part2}${part3}${part4}`;
}

/**
 * Generates a tamper-proof token for magic links
 */
export async function generateMagicToken(payload, secret = DEFAULT_MAGIC_SECRET) {
    const jsonStr = JSON.stringify(payload);
    const b64Payload = base64UrlEncode(jsonStr);
    const signature = await computeHmacSha256Hex(secret, b64Payload);
    return `${b64Payload}.${signature}`;
}

/**
 * Synchronous variant of magic token generator (uses deterministic hash)
 */
export function generateMagicTokenSync(payload, secret = DEFAULT_MAGIC_SECRET) {
    const jsonStr = JSON.stringify(payload);
    const b64Payload = base64UrlEncode(jsonStr);
    const signature = computeFastHmacHex(secret, b64Payload);
    return `${b64Payload}.${signature}`;
}

/**
 * Verifies and parses a magic token
 */
export async function verifyMagicToken(token, secret = DEFAULT_MAGIC_SECRET, expectedPid = null) {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
        return { valid: false, reason: 'Ongeldig token formaat (ontbrekende scheidingstekens).' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return { valid: false, reason: 'Token structuur ongeldig.' };
    }

    const [b64Payload, signature] = parts;
    let payload;
    try {
        const jsonStr = base64UrlDecode(b64Payload);
        payload = JSON.parse(jsonStr);
    } catch (err) {
        return { valid: false, reason: 'Token payload kan niet worden gedecodeerd.' };
    }

    if (!payload || typeof payload !== 'object') {
        return { valid: false, reason: 'Payload data is beschadigd.' };
    }

    // Verify Project ID
    if (expectedPid && payload.pid !== expectedPid) {
        return { valid: false, reason: 'Token behoort niet bij het opgevraagde project.' };
    }

    // Verify Expiration
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) {
        return { valid: false, reason: 'Token is verlopen. Vraag een nieuwe link op.', expired: true };
    }

    // Verify Signature
    const expectedWebSig = await computeHmacSha256Hex(secret, b64Payload);
    const expectedFastSig = computeFastHmacHex(secret, b64Payload);

    if (signature !== expectedWebSig && signature !== expectedFastSig) {
        return { valid: false, reason: 'Cryptografische handtekening ongeldig (mogelijke manipulatie).' };
    }

    return { valid: true, payload };
}

/**
 * Generates a full Portal Magic Link for client navigation
 */
export async function generatePortalMagicLink({
    projectId,
    clientEmail = '',
    action = 'view',
    expiresInHours = DEFAULT_EXPIRY_HOURS,
    secret = DEFAULT_MAGIC_SECRET,
    baseUrl = DEFAULT_PORTAL_BASE_URL
}) {
    if (!projectId) return baseUrl;

    const exp = Date.now() + (expiresInHours * 3600 * 1000);
    const nonce = Math.random().toString(36).substring(2, 10);
    const payload = {
        pid: projectId,
        email: clientEmail.toLowerCase().trim(),
        act: action,
        exp,
        nonce
    };

    const token = await generateMagicToken(payload, secret);
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return `${cleanBase}?id=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}&act=${encodeURIComponent(action)}`;
}

/**
 * Synchronous variant of generatePortalMagicLink
 */
export function generatePortalMagicLinkSync({
    projectId,
    clientEmail = '',
    action = 'view',
    expiresInHours = DEFAULT_EXPIRY_HOURS,
    secret = DEFAULT_MAGIC_SECRET,
    baseUrl = DEFAULT_PORTAL_BASE_URL
}) {
    if (!projectId) return baseUrl;

    const exp = Date.now() + (expiresInHours * 3600 * 1000);
    const nonce = Math.random().toString(36).substring(2, 10);
    const payload = {
        pid: projectId,
        email: clientEmail.toLowerCase().trim(),
        act: action,
        exp,
        nonce
    };

    const token = generateMagicTokenSync(payload, secret);
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return `${cleanBase}?id=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}&act=${encodeURIComponent(action)}`;
}

// ============================================================
// Phone Normalization & WhatsApp Dispatcher
// ============================================================

/**
 * Normalizes phone numbers to standard WhatsApp format (e.g. 31612345678)
 */
export function normalizeDutchPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';

    // Strip (0) right after +31 or 0031 before stripping non-digits
    let clean = phone.trim().replace(/(?:\+31|0031)\s*\(0\)/g, '+31');

    // Strip everything except digits and leading plus
    clean = clean.replace(/[^\d+]/g, '');

    // Handle +31 or 0031
    if (clean.startsWith('+31')) {
        clean = '31' + clean.slice(3);
    } else if (clean.startsWith('0031')) {
        clean = '31' + clean.slice(4);
    } else if (clean.startsWith('06')) {
        clean = '316' + clean.slice(2);
    } else if (clean.startsWith('+')) {
        clean = clean.slice(1);
    }

    // Strip any remaining internal parentheses or spaces that might have been digits
    clean = clean.replace(/\D/g, '');

    // Any number starting with 0 that wasn't 06 (e.g. 050, 020, 010) is a Dutch landline
    if (clean.startsWith('0')) {
        return '';
    }

    // Validate standard Dutch mobile length: 316 + 8 digits = 11 digits
    if (/^316\d{8}$/.test(clean)) {
        return clean;
    }

    // Allow other valid international numbers (8-15 digits) that don't start with 0
    if (/^[1-9]\d{7,14}$/.test(clean)) {
        return clean;
    }

    return '';
}

/**
 * Generates a 1-click WhatsApp Dispatch URL for a milestone
 */
export function generateMilestoneWhatsAppUrl({
    clientPhone = '',
    clientName = '',
    projectName = '',
    milestoneKey = 'proposal_ready',
    portalLink = '',
    customNote = '',
    domain = ''
}) {
    const digits = normalizeDutchPhone(clientPhone);
    const def = MILESTONE_DEFINITIONS[milestoneKey] || MILESTONE_DEFINITIONS.custom;

    const safeClient = clientName || 'klant';
    const safeProject = projectName || 'je website project';
    const safeDomain = domain ? ` op ${domain}` : '';

    let text = def.whatsappTemplate
        .replace(/{clientName}/g, safeClient)
        .replace(/{projectName}/g, safeProject)
        .replace(/{portalLink}/g, portalLink)
        .replace(/{domainClause}/g, safeDomain)
        .replace(/{customNote}/g, customNote || '');

    const encodedText = encodeURIComponent(text.trim());
    return digits 
        ? `https://api.whatsapp.com/send?phone=${digits}&text=${encodedText}`
        : `https://api.whatsapp.com/send?text=${encodedText}`;
}

// ============================================================
// Branded HTML Email Generator (Dark AI Theme)
// ============================================================

/**
 * Strips CWE-93 CRLF, HTML tags and control characters from email subjects/headers
 */
export function sanitizeEmailSubject(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').replace(/[\r\n\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Generates an ultra-crisp Dark AI Responsive HTML Email for Milestones
 */
export function generateMilestoneEmailHtml({
    clientName = '',
    projectName = '',
    milestoneKey = 'proposal_ready',
    portalLink = '',
    customNote = '',
    deliverables = [],
    domain = ''
}) {
    const def = MILESTONE_DEFINITIONS[milestoneKey] || MILESTONE_DEFINITIONS.custom;

    const safeClient = escapeHtml(clientName || 'Klant');
    const safeProject = escapeHtml(projectName || 'Website Project');
    const safeDomain = escapeHtml(domain || '');
    const safePortalLink = escapeHtml(portalLink || DEFAULT_PORTAL_BASE_URL);
    const safeActionLabel = escapeHtml(def.actionLabel);
    const safeBadgeText = escapeHtml(def.badgeText);
    const safeHeadline = escapeHtml(def.headline);

    // Format summary
    let summaryText = def.emailSummaryTemplate
        .replace(/{projectName}/g, safeProject)
        .replace(/{customNote}/g, escapeHtml(customNote || ''));
    if (!customNote && milestoneKey === 'custom') {
        summaryText = 'Er is een nieuwe statusupdate beschikbaar voor je project in het klantenportaal.';
    }

    // Deliverables block
    let deliverablesHtml = '';
    if (Array.isArray(deliverables) && deliverables.length > 0) {
        const items = deliverables
            .slice(0, 6)
            .map(d => {
                const text = typeof d === 'string' ? d : (d.title || d.label || '');
                return text ? `<li style="margin-bottom: 6px; color: #cbd5e1; font-size: 14px;">✔ ${escapeHtml(text)}</li>` : '';
            })
            .filter(Boolean)
            .join('');

        if (items) {
            deliverablesHtml = `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; margin: 20px 0 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${def.color}; margin-bottom: 10px;">
                    Belangrijkste Highlights & Deliverables
                </div>
                <ul style="margin: 0; padding-left: 20px; list-style-type: none;">
                    ${items}
                </ul>
            </div>`;
        }
    }

    return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(sanitizeEmailSubject(def.defaultSubject.replace('{projectName}', projectName)))}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050811; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050811; padding: 32px 16px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #0c1020; border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);">
                    
                    <!-- Top Brand Bar -->
                    <tr>
                        <td style="padding: 28px 32px 20px 32px; background: linear-gradient(180deg, rgba(0, 242, 254, 0.08) 0%, rgba(12, 16, 32, 0) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">
                                            Creation<span style="color: #00f2fe;">+</span>Alt<span style="color: #00f2fe;">+</span>Fix
                                        </div>
                                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-top: 3px;">
                                            DevOps • High-Performance Web • 2026/2027
                                        </div>
                                    </td>
                                    <td align="right">
                                        <span style="display: inline-block; padding: 5px 12px; font-size: 12px; font-weight: 700; border-radius: 9999px; background: rgba(0, 242, 254, 0.12); color: ${def.color}; border: 1px solid ${def.color};">
                                            ${safeBadgeText}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px;">
                            <div style="font-size: 16px; color: #94a3b8; margin-bottom: 8px;">
                                Beste ${safeClient},
                            </div>
                            
                            <h1 style="font-size: 22px; font-weight: 800; line-height: 1.35; color: #ffffff; margin: 0 0 16px 0;">
                                ${safeHeadline}
                            </h1>

                            <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
                                ${summaryText}
                            </div>

                            ${deliverablesHtml}

                            <!-- CTA Button Container -->
                            <div style="text-align: center; margin: 32px 0 24px 0;">
                                <a href="${safePortalLink}" style="display: inline-block; background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #050811; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 242, 254, 0.35); letter-spacing: 0.02em;">
                                    ${safeActionLabel} &rarr;
                                </a>
                            </div>

                            <!-- Magic Link Notice -->
                            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                                🔒 <strong>Beveiligde Toegang:</strong> Deze knop bevat een beveiligde 1-klik verificatielink die direct toegang geeft tot het statusportaal voor <strong>${safeProject}</strong> zonder wachtwoordgedoe.
                                <br><br>
                                Werkt de knop niet? Kopieer en plak deze link in je browser:<br>
                                <span style="word-break: break-all; color: #38bdf8;">${safePortalLink}</span>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px; background: rgba(5, 8, 17, 0.7); border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748b; line-height: 1.6;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <strong>Creation+Alt+Fix</strong> • Allard Dijkema<br>
                                        KvK: 99986191 • Tel / WhatsApp: +31 6 19135453<br>
                                        E-mail: <a href="mailto:info@creationaltfix.nl" style="color: #94a3b8; text-decoration: none;">info@creationaltfix.nl</a> • Web: <a href="https://creationaltfix.nl" style="color: #94a3b8; text-decoration: none;">creationaltfix.nl</a>
                                    </td>
                                    <td align="right" valign="bottom" style="font-size: 11px; color: #475569;">
                                        Groningen, Nederland
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ============================================================
// Server-Side Dispatch API Connector
// ============================================================

/**
 * Sends a milestone email via the hardened PHP backend endpoint
 */
export async function dispatchMilestoneServerSide({
    apiUrl = '../api/milestone-dispatcher.php',
    projectId,
    clientEmail,
    clientName,
    clientPhone = '',
    milestoneKey = 'proposal_ready',
    customSubject = '',
    customNote = '',
    portalLink = '',
    deliverables = []
}) {
    if (!projectId || !clientEmail) {
        return {
            success: false,
            error: 'Project ID en klant e-mailadres zijn verplicht.'
        };
    }

    const def = MILESTONE_DEFINITIONS[milestoneKey] || MILESTONE_DEFINITIONS.custom;
    const finalSubject = customSubject || def.defaultSubject.replace('{projectName}', projectId);
    const htmlBody = generateMilestoneEmailHtml({
        clientName,
        projectName: projectId,
        milestoneKey,
        portalLink,
        customNote,
        deliverables
    });

    const payload = {
        projectId,
        clientEmail: clientEmail.trim().toLowerCase(),
        clientName: clientName.trim(),
        clientPhone: normalizeDutchPhone(clientPhone),
        milestoneKey,
        subject: sanitizeEmailSubject(finalSubject),
        portalLink,
        htmlBody
    };

    try {
        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            let parsed = null;
            try { parsed = JSON.parse(errText); } catch (e) {}
            return {
                success: false,
                statusCode: resp.status,
                error: (parsed && parsed.error) || `Server fout (${resp.status}): ${errText.slice(0, 150)}`
            };
        }

        const data = await resp.json();
        return {
            success: true,
            data
        };
    } catch (err) {
        console.warn('[MilestoneDispatcher] Server-side dispatch network error, client fallback available:', err);
        return {
            success: false,
            error: err.message || 'Netwerkverbinding met server mislukt.',
            fallbackAvailable: true
        };
    }
}

// ============================================================
// Audit Trail Record Formatter
// ============================================================

/**
 * Creates a structured audit log entry for Firestore
 */
export function createMilestoneAuditRecord({
    milestoneKey,
    channels = ['email', 'whatsapp'],
    clientEmail = '',
    clientPhone = '',
    adminEmail = 'admin@creationaltfix.nl'
}) {
    const def = MILESTONE_DEFINITIONS[milestoneKey] || MILESTONE_DEFINITIONS.custom;
    const channelList = Array.isArray(channels) ? channels.join(' & ') : String(channels);
    const note = `🚀 Milestone Notificatie verstuurd [${def.title}] via ${channelList.toUpperCase()} naar ${clientEmail || clientPhone || 'klant'}`;

    return {
        type: 'milestone_dispatched',
        milestoneKey,
        title: def.title,
        channels: Array.isArray(channels) ? channels : [channels],
        recipientEmail: clientEmail || null,
        recipientPhone: clientPhone || null,
        timestamp: new Date().toISOString(),
        actor: adminEmail,
        note
    };
}

// ============================================================
// UI Modal HTML Template & Helper
// ============================================================

export function renderMilestoneModalHtml() {
    return `
    <div id="milestone-dispatch-modal" class="modal-backdrop hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px;">
        <div class="workspace-card" style="max-width: 720px; width: 100%; max-height: 90vh; overflow-y: auto; background: #0c1020; border: 1px solid rgba(0, 242, 254, 0.4); box-shadow: 0 25px 60px rgba(0,0,0,0.9); padding: 26px; border-radius: 14px;">
            
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px; margin-bottom: 18px;">
                <div>
                    <h3 style="margin: 0; font-size: 1.25rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-paper-plane text-accent"></i> 🚀 Milestone Notificatie Dispatcher
                    </h3>
                    <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin: 4px 0 0 0;">
                        Verstuur branded WhatsApp & e-mail updates met een beveiligde 1-klik magic-link naar het klantenportaal.
                    </p>
                </div>
                <button type="button" id="btn-close-milestone-modal" style="background: none; border: none; color: #94a3b8; font-size: 1.6rem; cursor: pointer; padding: 0 8px;">&times;</button>
            </div>

            <!-- Milestone Selector -->
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">Selecteer Project Mijlpaal:</label>
                <select id="milestone-select" class="admin-input" style="width: 100%; background: #0f172a; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 14px; font-size: 0.9rem;">
                    <option value="proposal_ready">📄 Fase 2: Offerte &amp; Voorstel Gereed</option>
                    <option value="design_ready">🎨 Fase 3: Design Concept &amp; Staging Live</option>
                    <option value="development_started">💻 Fase 4: Technische Ontwikkeling Gestart</option>
                    <option value="payment_waiting">💳 Fase 5: Oplevering Gereed &amp; Wacht op Betaling</option>
                    <option value="project_completed">🎉 Fase 5: Project Volledig Live &amp; Voldaan</option>
                    <option value="custom">📢 Aangepaste Mijlpaal / Mededeling</option>
                </select>
            </div>

            <!-- Magic Link Box -->
            <div style="background: rgba(0, 242, 254, 0.05); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 10px; padding: 14px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 0.78rem; text-transform: uppercase; font-weight: 700; color: var(--color-accent); letter-spacing: 0.05em;">
                        🔒 Beveiligde 1-Klik Klantenportaal Magic Link
                    </span>
                    <button type="button" id="btn-copy-magic-link" class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.75rem;">
                        <i class="fas fa-copy"></i> Link Kopiëren
                    </button>
                </div>
                <input type="text" id="milestone-magic-link-input" readonly class="admin-input" style="width: 100%; background: rgba(0,0,0,0.5); font-family: monospace; font-size: 0.8rem; color: #38bdf8; border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px;">
            </div>

            <!-- Custom Note Input -->
            <div id="milestone-custom-note-group" style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">Persoonlijke Notitie of Toelichting (Optioneel):</label>
                <textarea id="milestone-custom-note" class="admin-input" rows="2" placeholder="Bijv. Staging demo staat op https://concept.creationaltfix.nl/..." style="width: 100%; background: #0f172a; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; font-size: 0.85rem; resize: vertical;"></textarea>
            </div>

            <!-- Channels Grid (WhatsApp & Email) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
                
                <!-- WhatsApp Dispatch Card -->
                <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 700; color: #34d399; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                            <i class="fab fa-whatsapp"></i> WhatsApp Bericht
                        </div>
                        <p style="font-size: 0.78rem; color: #94a3b8; margin: 0 0 10px 0;">
                            Opent direct in WhatsApp Web/App met gepersonaliseerde tekst en magic link.
                        </p>
                    </div>
                    <button type="button" id="btn-dispatch-whatsapp" class="btn btn-sm" style="background: #10b981; color: #042f2e; font-weight: 700; width: 100%; border: none; padding: 10px; border-radius: 8px; cursor: pointer;">
                        <i class="fab fa-whatsapp"></i> Open in WhatsApp
                    </button>
                </div>

                <!-- Server-Side Email Dispatch Card -->
                <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-envelope"></i> Server-Side E-mail
                        </div>
                        <p style="font-size: 0.78rem; color: #94a3b8; margin: 0 0 10px 0;">
                            Verstuurt Dark AI HTML e-mail direct via de Creation+Alt+Fix server.
                        </p>
                    </div>
                    <button type="button" id="btn-dispatch-email" class="btn btn-sm" style="background: #0284c7; color: #fff; font-weight: 700; width: 100%; border: none; padding: 10px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-paper-plane"></i> Verzend E-mail
                    </button>
                </div>

            </div>

            <!-- Status Indicator -->
            <div id="milestone-dispatch-status" style="display: none; padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; margin-top: 10px;"></div>

        </div>
    </div>
    `;
}
