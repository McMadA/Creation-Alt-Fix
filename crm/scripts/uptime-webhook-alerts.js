/**
 * Creation+Alt+Fix - Standalone Uptime Webhook Alert Dispatcher (TASK-828)
 * Verstuurt realtime downtime alerts naar WhatsApp (CallMeBot), Discord en Telegram.
 * 
 * Gebruik via CLI:
 *   node crm/scripts/uptime-webhook-alerts.js --domain="stenekesrioolspecialist.nl" --status="down" --code="500" --reason="DNS SERVFAIL"
 *   node crm/scripts/uptime-webhook-alerts.js --test
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

const TELEGRAM_TOKEN_REGEX = /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/;
const TELEGRAM_CHAT_ID_REGEX = /^-?[0-9]{5,16}$/;
const DISCORD_WEBHOOK_REGEX = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d{15,22}\/[A-Za-z0-9_-]{50,80}$/;

/**
 * Valideert of een externe webhook hostname veilig is (CWE-918 SSRF Defensie)
 */
function isSafeExternalHost(host) {
  if (!host || typeof host !== 'string') return false;
  const clean = host.toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '::1' || clean === '0.0.0.0') return false;
  if (clean.endsWith('.local') || clean.endsWith('.internal') || clean.endsWith('.lan')) return false;
  const ipv4 = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, b1, b2] = ipv4.map(Number);
    if (b1 === 10) return false;
    if (b1 === 172 && b2 >= 16 && b2 <= 31) return false;
    if (b1 === 192 && b2 === 168) return false;
    if (b1 === 169 && b2 === 254) return false;
    if (b1 === 100 && b2 >= 64 && b2 <= 127) return false;
    if (b1 === 127 || b1 === 0) return false;
  }
  return true;
}

/**
 * Escapes special Markdown characters for Telegram API (API 400 defense)
 */
export function sanitizeMarkdown(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[_*`\[\]()~>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Verstuurt een veilige HTTPS GET of POST request (SSRF-beveiligd)
 */
function makeRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      if (parsedUrl.protocol !== 'https:') {
        return reject(new Error('Enkel HTTPS verbindingen zijn toegestaan voor veilige webhook alerts'));
      }
      if (!isSafeExternalHost(parsedUrl.hostname)) {
        return reject(new Error(`SSRF blokkade: ${parsedUrl.hostname} is een intern adres`));
      }

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000
      };

      const req = https.request(reqOptions, (res) => {
        let body = '';
        const MAX_BODY_BYTES = 64 * 1024;
        res.on('data', chunk => {
          if (body.length < MAX_BODY_BYTES) body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout bij verbinden met ${parsedUrl.hostname}`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 1. WhatsApp Alert via CallMeBot API
 */
export async function sendWhatsAppCallMeBotAlert({ domain, statusCode, reason, timestamp }, phone = null, apiKey = null) {
  const rawPhone = phone || process.env.CALLMEBOT_PHONE || '31619135453';
  const targetPhone = String(rawPhone).replace(/[^0-9+]/g, '');
  const targetKey = String(apiKey || process.env.CALLMEBOT_API_KEY || '').trim();

  if (!targetKey || !targetPhone) {
    console.warn('⚠️ [Alerts] Geen CALLMEBOT_API_KEY of geldig telefoonnummer geconfigureerd. WhatsApp alert overgeslagen.');
    return false;
  }

  const cleanDomain = String(domain || 'Onbekend').slice(0, 100);
  const cleanStatus = String(statusCode || 'DOWN').slice(0, 50);
  const cleanReason = String(reason || 'Geen response').slice(0, 200);
  const cleanTime = String(timestamp || new Date().toLocaleTimeString('nl-NL')).slice(0, 50);

  const message = `🚨 *CREATION+ALT+FIX ALERT*\n\n` +
    `Domein: *${cleanDomain}*\n` +
    `Status: *OFFLINE* (Code ${cleanStatus})\n` +
    `Oorzaak: ${cleanReason}\n` +
    `Tijdstip: ${cleanTime}\n\n` +
    `Beheer: https://portal.creationaltfix.nl/crm/admin/index.html?view=monitoring`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(targetPhone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(targetKey)}`;

  try {
    const res = await makeRequest(url);
    const success = res.statusCode >= 200 && res.statusCode < 300;
    console.log(`📱 [WhatsApp Alert] CallMeBot dispatch ${success ? 'geslaagd' : 'mislukt (status ' + res.statusCode + ')'}`);
    return success;
  } catch (err) {
    console.error(`❌ [WhatsApp Alert] Fout: ${err.message}`);
    return false;
  }
}

/**
 * 2. Discord Webhook Alert
 */
export async function sendDiscordWebhookAlert({ domain, statusCode, reason, timestamp }, webhookUrl = null) {
  const targetUrl = (webhookUrl || process.env.DISCORD_UPTIME_WEBHOOK_URL || '').trim();

  if (!DISCORD_WEBHOOK_REGEX.test(targetUrl)) {
    console.warn('⚠️ [Alerts] Geen geldige Discord webhook URL geconfigureerd.');
    return false;
  }

  const cleanDomain = String(domain || 'Onbekend').slice(0, 100);
  const cleanStatus = String(statusCode || '0 (TIMEOUT)').slice(0, 50);
  const cleanReason = String(reason || 'Verbinding geweigerd').slice(0, 200);
  const cleanTime = String(timestamp || new Date().toISOString()).slice(0, 50);

  const payload = JSON.stringify({
    username: "Creation+Alt+Fix Uptime Guard",
    avatar_url: "https://creationaltfix.nl/apple-touch-icon.png",
    embeds: [
      {
        title: `🚨 Uptime Incident: ${cleanDomain}`,
        description: `Het gemonitorde domein reageert niet of geeft een serverfout.`,
        color: 15158332, // Rood (#E74C3C)
        fields: [
          { name: "Domein", value: `\`${cleanDomain}\``, inline: true },
          { name: "Statuscode", value: `${cleanStatus}`, inline: true },
          { name: "Oorzaak", value: `${cleanReason}`, inline: true },
          { name: "Gedetecteerd op", value: `${cleanTime}`, inline: false }
        ],
        footer: {
          text: "Creation+Alt+Fix DNS & Uptime Monitoring Suite"
        }
      }
    ]
  });

  try {
    const res = await makeRequest(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    const success = res.statusCode >= 200 && res.statusCode < 300;
    console.log(`💬 [Discord Alert] Dispatch ${success ? 'geslaagd' : 'mislukt (status ' + res.statusCode + ')'}`);
    return success;
  } catch (err) {
    console.error(`❌ [Discord Alert] Fout: ${err.message}`);
    return false;
  }
}

/**
 * 3. Telegram Bot Alert
 */
export async function sendTelegramAlert({ domain, statusCode, reason, timestamp }, botToken = null, chatId = null) {
  const token = (botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chat = (chatId || process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!TELEGRAM_TOKEN_REGEX.test(token) || !TELEGRAM_CHAT_ID_REGEX.test(chat)) {
    console.warn('⚠️ [Alerts] Geen geldig Telegram bot token of chat ID geconfigureerd.');
    return false;
  }

  const safeDomain = sanitizeMarkdown(domain || 'Onbekend');
  const safeReason = sanitizeMarkdown(reason || 'Geen response');
  const safeTimestamp = sanitizeMarkdown(timestamp || new Date().toISOString());
  const safeStatus = String(statusCode || 'DOWN').replace(/[^0-9a-zA-Z_-]/g, '');

  const text = `🚨 *Creation+Alt+Fix Uptime Incident*\n\n` +
    `*Domein:* \`${safeDomain}\`\n` +
    `*Status:* OFFLINE (Code ${safeStatus})\n` +
    `*Oorzaak:* ${safeReason}\n` +
    `*Tijd:* ${safeTimestamp}`;

  const payload = JSON.stringify({
    chat_id: chat,
    text: text,
    parse_mode: 'Markdown'
  });

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    const success = res.statusCode >= 200 && res.statusCode < 300;
    console.log(`✈️ [Telegram Alert] Dispatch ${success ? 'geslaagd' : 'mislukt'}`);
    return success;
  } catch (err) {
    console.error(`❌ [Telegram Alert] Fout: ${err.message}`);
    return false;
  }
}

/**
 * Multi-Channel Dispatcher
 */
export async function dispatchMultiChannelAlert(incident) {
  console.log(`\n🚨 ========================================================`);
  console.log(`📡 [Uptime Dispatcher] Multi-Channel Incident Alert`);
  console.log(`   Domein : ${incident.domain}`);
  console.log(`   Code   : ${incident.statusCode || 'DOWN'}`);
  console.log(`   Reden  : ${incident.reason || 'Timeout'}`);
  console.log(`========================================================\n`);

  const results = {
    whatsapp: await sendWhatsAppCallMeBotAlert(incident),
    discord: await sendDiscordWebhookAlert(incident),
    telegram: await sendTelegramAlert(incident)
  };

  return results;
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('uptime-webhook-alerts.js')) {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');

  const domainArg = args.find(a => a.startsWith('--domain='));
  const statusArg = args.find(a => a.startsWith('--code='));
  const reasonArg = args.find(a => a.startsWith('--reason='));

  const incident = {
    domain: domainArg ? domainArg.split('=')[1] : (isTest ? 'test-monitoring.creationaltfix.nl' : 'onbekend'),
    statusCode: statusArg ? statusArg.split('=')[1] : (isTest ? '503' : 'DOWN'),
    reason: reasonArg ? reasonArg.split('=')[1] : (isTest ? 'Gesimuleerde DNS / HTTP downtime test' : 'Onbereikbaar'),
    timestamp: new Date().toISOString()
  };

  dispatchMultiChannelAlert(incident).then(res => {
    console.log('🏁 Alert dispatch voltooid:', res);
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
