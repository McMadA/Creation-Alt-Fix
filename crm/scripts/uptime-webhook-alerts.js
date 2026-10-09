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

/**
 * Verstuurt een veilige HTTPS GET of POST request
 */
function makeRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000
      };

      const req = client.request(reqOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
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
  const targetPhone = phone || process.env.CALLMEBOT_PHONE || '31619135453';
  const targetKey = apiKey || process.env.CALLMEBOT_API_KEY || '';

  if (!targetKey) {
    console.warn('⚠️ [Alerts] Geen CALLMEBOT_API_KEY geconfigureerd. WhatsApp alert overgeslagen.');
    return false;
  }

  const message = `🚨 *CREATION+ALT+FIX ALERT*\n\n` +
    `Domein: *${domain}*\n` +
    `Status: *OFFLINE* (Code ${statusCode || 'DOWN'})\n` +
    `Oorzaak: ${reason || 'Geen response'}\n` +
    `Tijdstip: ${timestamp || new Date().toLocaleTimeString('nl-NL')}\n\n` +
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
  const targetUrl = webhookUrl || process.env.DISCORD_UPTIME_WEBHOOK_URL || '';

  if (!targetUrl || !targetUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.warn('⚠️ [Alerts] Geen geldige Discord webhook URL geconfigureerd.');
    return false;
  }

  const payload = JSON.stringify({
    username: "Creation+Alt+Fix Uptime Guard",
    avatar_url: "https://creationaltfix.nl/apple-touch-icon.png",
    embeds: [
      {
        title: `🚨 Uptime Incident: ${domain}`,
        description: `Het gemonitorde domein reageert niet of geeft een serverfout.`,
        color: 15158332, // Rood (#E74C3C)
        fields: [
          { name: "Domein", value: `\`${domain}\``, inline: true },
          { name: "Statuscode", value: `${statusCode || '0 (TIMEOUT)'}`, inline: true },
          { name: "Oorzaak", value: `${reason || 'Verbinding geweigerd'}`, inline: true },
          { name: "Gedetecteerd op", value: `${timestamp || new Date().toISOString()}`, inline: false }
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
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
  const chat = chatId || process.env.TELEGRAM_CHAT_ID || '';

  if (!token || !chat) {
    console.warn('⚠️ [Alerts] Geen Telegram bot token of chat ID geconfigureerd.');
    return false;
  }

  const text = `🚨 *Creation+Alt+Fix Uptime Incident*\n\n` +
    `*Domein:* \`${domain}\`\n` +
    `*Status:* OFFLINE (Code ${statusCode || 'DOWN'})\n` +
    `*Oorzaak:* ${reason || 'Geen response'}\n` +
    `*Tijd:* ${timestamp || new Date().toISOString()}`;

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
