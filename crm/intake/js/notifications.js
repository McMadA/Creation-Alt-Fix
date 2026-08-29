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
 * Formats a clean markdown / plain text summary for notifications
 */
function formatNotificationText(data, docId) {
    return [
        `🚨 *NIEUWE INTAKE ONTVANGEN!*`,
        ``,
        `🏢 *Bedrijf:* ${data.client || 'Niet opgegeven'}`,
        `👤 *Contactpersoon:* ${data.contactName || 'Niet opgegeven'}`,
        `✉️ *E-mail:* ${data.email || 'Niet opgegeven'}`,
        `🛠️ *Dienst:* ${data.service || 'Niet opgegeven'}`,
        `🌐 *Domein:* ${data.domainName || 'Geen / Nog niet bekend'}`,
        `🎯 *Doel:* ${data.goals || 'Geen specifieke doelen beschreven'}`,
        `🎨 *Design:* ${data.design || 'Geen specifieke voorkeuren'}`,
        ``,
        `🆔 *ID:* \`${docId || 'N/A'}\``,
        `🔗 *Bekijk Klantkaart in Admin Dashboard:*`,
        `https://portal.creationaltfix.nl/admin/`
    ].join('\n');
}

/**
 * Dispatches FormSubmit AJAX Email Request (Zero-Setup)
 */
async function dispatchFormSubmit(data, docId) {
    const email = NOTIFICATION_CONFIG.formSubmit.toEmail;
    const url = `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;

    const payload = {
        "_subject": `🚨 Nieuwe Intake Ontvangen: ${data.client || 'Onbekende Lead'}`,
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

    const res = await fetch(url, {
        method: 'POST',
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
}

/**
 * Dispatches HTTP Webhook Request
 */
async function dispatchWebhook(url, text, rawData, docId) {
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

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
}

/**
 * Dispatches EmailJS REST API Request without needing external scripts
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

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error(`EmailJS API response ${res.status}`);
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

    const url = "https://api.emailjs.com/api/v1.0/email/send";
    const payload = {
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
            client_name: data.client || "jouw bedrijf",
            contact_name: data.contactName || data.client || "klant",
            client_email: data.email,
            service: data.service || "software & web services",
            portal_url: "https://portal.creationaltfix.nl/",
            to_email: data.email
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error(`EmailJS client welcome email error: HTTP ${res.status}`);
    }
    return true;
}


