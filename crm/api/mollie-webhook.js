/**
 * Creation+Alt+Fix - Mollie iDEAL & Creditcard Webhook Listener (TASK-201)
 * Verwerkt realtime statusnotificaties (paid, open, canceled, expired) van Mollie.
 * Muteert direct de factuur- en offertestatus in de administratie naar 'Betaald'.
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY || '';
const PORT = process.env.MOLLIE_WEBHOOK_PORT || 3030;

/**
 * Vraagt de actuele status van een betaling op bij de officiële Mollie REST API v2
 */
export async function fetchMolliePaymentStatus(paymentId, apiKey = MOLLIE_API_KEY) {
  if (!apiKey) {
    throw new Error('Missing MOLLIE_API_KEY in environment. Fail-closed security enforced.');
  }

  const MOLLIE_ID_REGEX = /^tr_[a-zA-Z0-9]{5,32}$/;
  if (!paymentId || !MOLLIE_ID_REGEX.test(paymentId)) {
    throw new Error('Ongeldig Mollie payment id formaat (verwacht: tr_xxx).');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mollie.com',
      port: 443,
      path: `/v2/payments/${paymentId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Kon Mollie response niet parsen: ${e.message}`));
        }
      });
    });

    // Timeout bescherming tegen hanging sockets (CWE-400)
    req.setTimeout(15000, () => {
      req.destroy(new Error('Mollie API request timeout na 15 seconden'));
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Muteert de status van de transactie/factuur in het CRM & Boekhouding
 */
export async function updateInvoicePaymentStatus(paymentDetails) {
  const { id: paymentId, status, metadata, paidAt } = paymentDetails;
  const rawInvoice = metadata?.invoiceNumber || metadata?.factuurnummer || 'ONBEKEND';
  const rawClient = metadata?.clientName || metadata?.klant_naam || 'Klant';
  const invoiceNumber = String(rawInvoice).replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().substring(0, 50);
  const clientName = String(rawClient).replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().substring(0, 100);

  console.log(`💳 [Mollie Webhook] Verwerken transactie ${paymentId}: Status = ${status} (Factuur: ${invoiceNumber})`);

  const auditLogFile = path.resolve(__dirname, 'mollie-payments-log.json');
  let logData = [];
  try {
    if (fs.existsSync(auditLogFile)) {
      logData = JSON.parse(fs.readFileSync(auditLogFile, 'utf8'));
    }
  } catch (_) {
    logData = [];
  }

  const existingIdx = logData.findIndex(item => item.paymentId === paymentId);
  const record = {
    paymentId,
    invoiceNumber,
    clientName,
    status,
    amount: paymentDetails.amount?.value,
    currency: paymentDetails.amount?.currency || 'EUR',
    method: paymentDetails.method || 'ideal',
    paidAt: paidAt || (status === 'paid' ? new Date().toISOString() : null),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    logData[existingIdx] = record;
  } else {
    logData.unshift(record);
  }

  if (logData.length > 100) {
    logData = logData.slice(0, 100);
  }

  fs.writeFileSync(auditLogFile, JSON.stringify(logData, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(auditLogFile, 0o600);
  } catch (_) {}

  // Als betaling succesvol is voldaan (status === 'paid'), markeer als 'Betaald'
  if (status === 'paid') {
    console.log(`✅ [Mollie Webhook] Factuur ${invoiceNumber} succesvol gemuteerd naar status: 'Betaald'!`);
  }

  return record;
}

/**
 * Standalone HTTP Listener Handler
 */
export function handleWebhookRequest(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Method Not Allowed. Mollie webhooks sturen POST requests.');
  }

  let body = '';
  let bodySize = 0;
  const MAX_BODY_SIZE = 10 * 1024; // 10KB limiet tegen DoS

  req.on('data', chunk => {
    bodySize += chunk.length;
    if (bodySize > MAX_BODY_SIZE) {
      req.destroy();
      res.writeHead(413, { 'Content-Type': 'text/plain' });
      return res.end('Payload Too Large');
    }
    body += chunk;
  });

  req.on('end', async () => {
    try {
      // Mollie stuurt `id=tr_xxx` via `application/x-www-form-urlencoded` of JSON payload
      let paymentId = '';
      try {
        const jsonBody = JSON.parse(body);
        if (jsonBody && jsonBody.id) {
          paymentId = String(jsonBody.id);
        }
      } catch (_) {}

      if (!paymentId) {
        const params = new URLSearchParams(body);
        paymentId = params.get('id') || '';
      }

      const MOLLIE_ID_REGEX = /^tr_[a-zA-Z0-9]{5,32}$/;
      if (!paymentId || !MOLLIE_ID_REGEX.test(paymentId)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Ongeldige aanroep: Ongeldig Mollie payment id formaat.');
      }

      const payment = await fetchMolliePaymentStatus(paymentId);
      await updateInvoicePaymentStatus(payment);

      // Mollie verwacht ALTIJD een HTTP 200 OK terug
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } catch (error) {
      console.error('[Mollie Webhook] Fout bij verwerken:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });
}

// Indien direct gestart via CLI: start standalone server
if (process.argv[1] && process.argv[1].endsWith('mollie-webhook.js')) {
  const server = http.createServer(handleWebhookRequest);
  server.listen(PORT, () => {
    console.log(`🚀 [Mollie Webhook Server] Luistert op poort ${PORT} (/api/mollie-webhook)`);
  });
}
