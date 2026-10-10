/**
 * Notifications Handler for Intake Submissions
 * Creation+Alt+Fix - CRM
 * 
 * Supports:
 * - FormSubmit (Zero-config email delivery to your inbox)
 * - Generic Webhook / Telegram Bot API / Discord Webhook
 * - EmailJS REST API Integration
 */

export const NOTIFICATION_CONFIG = {
    // Enable or disable notifications
    enabled: true,

    // FormSubmit Configuration (Zero-setup instant email to your inbox)
    // First time an email is sent, FormSubmit will send a 1-click confirmation link to this email address.
    formSubmit: {
        enabled: true,
        toEmail: "info@creationaltfix.nl" // Change to your preferred email address
    },

    // Webhook Configuration (e.g. Telegram Bot, Discord Webhook, Make.com, n8n, Zapier)
    // Telegram Example: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>
    // Discord Example: https://discord.com/api/webhooks/<WEBHOOK_ID>/<WEBHOOK_TOKEN>
    webhookUrl: "", // Set your Webhook URL here

    // EmailJS Configuration (optional direct client-side email delivery)
    emailJs: {
        enabled: true,
        serviceId: "service_mwhtpq1",   // Vimexx SMTP Service
        templateId: "template_zihp21d", // e.g. 'template_intake_alert'
        publicKey: "tZxaPDxDxlE0ME3Xk" , //e.g. 'user_xxxxx'
        toEmail: "info@creationaltfix.nl"
    }
};

/**
 * Main Notification Dispatcher
 * @param {Object} data - Intake form data
 * @param {string} docId - Firestore document ID
 */
export async function sendIntakeNotification(data, docId) {
    if (!NOTIFICATION_CONFIG.enabled) return;

    console.log("🔔 Preparing intake notification dispatch for:", data.client);

    // 1. FormSubmit Direct Email Delivery (Admin Alert)
    if (NOTIFICATION_CONFIG.formSubmit.enabled && NOTIFICATION_CONFIG.formSubmit.toEmail) {
        try {
            await dispatchFormSubmit(data, docId);
            console.log("✅ FormSubmit email notification sent successfully to:", NOTIFICATION_CONFIG.formSubmit.toEmail);
        } catch (err) {
            console.warn("⚠️ FormSubmit email notification failed:", err.message);
        }
    }

    // 2. Webhook Push Notification (Telegram / Discord / Custom Endpoint)
    if (NOTIFICATION_CONFIG.webhookUrl) {
        const message = formatNotificationText(data, docId);
        try {
            await dispatchWebhook(NOTIFICATION_CONFIG.webhookUrl, message, data, docId);
            console.log("✅ Webhook notification delivered successfully.");
        } catch (err) {
            console.warn("⚠️ Webhook notification failed:", err.message);
        }
    } else {
        console.info("ℹ️ Webhook notification skipped (URL not configured yet).");
    }

    // 3. EmailJS Delivery (if enabled)
    if (NOTIFICATION_CONFIG.emailJs.enabled && NOTIFICATION_CONFIG.emailJs.publicKey) {
        try {
            await dispatchEmailJS(data, docId);
            console.log("✅ EmailJS notification sent successfully.");
        } catch (err) {
            console.warn("⚠️ EmailJS notification failed:", err.message);
        }
    }

    // 4. Dedicated Client Welcome Email (via EmailJS)
    if (data.email) {
        try {
            const sent = await dispatchClientWelcomeEmailJS(data);
            if (sent) {
                console.log("✅ Dedicated client welcome email dispatched to:", data.email);
            }
        } catch (err) {
            console.warn("⚠️ Client welcome email dispatch failed:", err.message);
        }
    }
}

/**
 * Escapes characters for Telegram and Discord Markdown parsing (CWE-79 / API 400 defense)
 */
export function sanitizeMarkdown(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[_*`\[\]()~>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Valideert of een Webhook URL veilig extern HTTPS is (CWE-918 SSRF Defensie)
 */
export function isSafeWebhookUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        const host = parsed.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
        if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return false;
        const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (ipv4Match) {
            const [, b1, b2] = ipv4Match.map(Number);
            if (b1 === 10) return false;
            if (b1 === 172 && b2 >= 16 && b2 <= 31) return false;
            if (b1 === 192 && b2 === 168) return false;
            if (b1 === 169 && b2 === 254) return false;
            if (b1 === 100 && b2 >= 64 && b2 <= 127) return false;
            if (b1 === 127 || b1 === 0) return false;
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Formats a clean markdown / plain text summary for notifications
 */
function formatNotificationText(data, docId) {
    const safeClient = sanitizeMarkdown(data.client || 'Niet opgegeven');
    const safeContact = sanitizeMarkdown(data.contactName || 'Niet opgegeven');
    const safeEmail = sanitizeMarkdown(data.email || 'Niet opgegeven');
    const safeService = sanitizeMarkdown(data.service || 'Niet opgegeven');
    const safeDomain = sanitizeMarkdown(data.domainName || 'Geen / Nog niet bekend');
    const safeGoals = sanitizeMarkdown(data.goals || 'Geen specifieke doelen beschreven');
    const safeDesign = sanitizeMarkdown(data.design || 'Geen specifieke voorkeuren');

    return [
        `🚨 *NIEUWE INTAKE ONTVANGEN!*`,
        ``,
        `🏢 *Bedrijf:* ${safeClient}`,
        `👤 *Contactpersoon:* ${safeContact}`,
        `✉️ *E-mail:* ${safeEmail}`,
        `🛠️ *Dienst:* ${safeService}`,
        `🌐 *Domein:* ${safeDomain}`,
        `🎯 *Doel:* ${safeGoals}`,
        `🎨 *Design:* ${safeDesign}`,
        ``,
        `🆔 *ID:* \`${String(docId || 'N/A').replace(/[`\\]/g, '')}\``,
        `🔗 *Bekijk Klantkaart in Admin Dashboard:*`,
        `https://portal.creationaltfix.nl/admin/`
    ].join('\n');
}

/**
 * Dispatches FormSubmit AJAX Email Request (Zero-Setup) met AbortController timeout
 */
async function dispatchFormSubmit(data, docId) {
    const email = NOTIFICATION_CONFIG.formSubmit.toEmail;
    const url = `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;

    const payload = {
        "_subject": `🚨 Nieuwe Intake Ontvangen: ${String(data.client || 'Onbekende Lead').slice(0, 100)}`,
        "_template": "table",
        "_captcha": "false",
        "Bedrijfsnaam": data.client || 'Niet opgegeven',
        "Contactpersoon": data.contactName || 'Niet opgegeven',
        "E-mailadres Lead": data.email || 'Niet opgegeven',
        "Gekozen Dienst": data.service || 'Niet opgegeven',
        "Domeinnaam": data.domainName || 'Nog geen domein',
        "Projectdoelen": data.goals || 'Geen opgegeven',
        "Designvoorkeuren": data.design || 'Geen specifieke voorkeuren',
        "Datum Intake": data.date || new Date().toLocaleDateString('nl-NL'),
        "Firestore Document ID": docId || 'N/A',
        "Admin Dashboard Link": "https://portal.creationaltfix.nl/admin/"
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`FormSubmit HTTP error ${res.status}: ${res.statusText}`);
        }

        const resData = await res.json();
        if (resData.success !== "true" && resData.success !== true) {
            throw new Error(`FormSubmit returned non-success response: ${JSON.stringify(resData)}`);
        }
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Dispatches HTTP Webhook Request met SSRF filtering en AbortController timeout
 */
async function dispatchWebhook(url, text, rawData, docId) {
    if (!isSafeWebhookUrl(url)) {
        throw new Error("Ongeldige of onveilige Webhook URL (SSRF geblokkeerd)");
    }

    let body;

    // Auto-detect Telegram Bot API URL format
    if (url.includes('api.telegram.org')) {
        body = JSON.stringify({
            text: text,
            parse_mode: 'Markdown'
        });
    } 
    // Auto-detect Discord Webhook URL format
    else if (url.includes('discord.com/api/webhooks')) {
        body = JSON.stringify({
            content: text.replace(/\*/g, '**') // Convert markdown bold syntax for Discord
        });
    } 
    // Generic HTTP POST payload for custom webhooks / Make / n8n
    else {
        body = JSON.stringify({
            event: "intake_created",
            timestamp: new Date().toISOString(),
            id: docId,
            text: text,
            data: rawData
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Dispatches EmailJS REST API Request with AbortController timeout
 */
async function dispatchEmailJS(data, docId) {
    const config = NOTIFICATION_CONFIG.emailJs;
    const url = "https://api.emailjs.com/api/v1.0/email/send";

    const payload = {
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
            client_name: data.client,
            contact_name: data.contactName,
            client_email: data.email,
            service: data.service,
            domain: data.domainName,
            goals: data.goals,
            design: data.design,
            to_email: config.toEmail,
            doc_id: docId
        }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`EmailJS API response ${res.status}`);
        }
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Dispatches a beautifully styled Dark AI HTML Welcome Email to the client upon intake completion
 */
async function dispatchClientWelcomeEmailJS(data) {
    const config = NOTIFICATION_CONFIG.emailJs;
    if (!config.enabled || !config.publicKey || !config.serviceId || !config.templateId) {
        console.info("ℹ️ Dedicated client welcome email skipped (EmailJS config pending setup in NOTIFICATION_CONFIG).");
        return false;
    }

    // Valideer recipient email tegen header injectie (CWE-93)
    const cleanEmail = (data.email || '').trim().toLowerCase().replace(/[\r\n\x00-\x1F\x7F,; ]/g, '');
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
        console.warn("⚠️ Ongeldig e-mailadres voor client welcome email, dispatch geannuleerd");
        return false;
    }

    const url = "https://api.emailjs.com/api/v1.0/email/send";
    const payload = {
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
            client_name: data.client || "jouw bedrijf",
            contact_name: data.contactName || data.client || "klant",
            client_email: cleanEmail,
            service: data.service || "software & web services",
            portal_url: "https://portal.creationaltfix.nl/",
            to_email: cleanEmail
        }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`EmailJS client welcome email error: HTTP ${res.status}`);
        }
        return true;
    } finally {
        clearTimeout(timeout);
    }
}


