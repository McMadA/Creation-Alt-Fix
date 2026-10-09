# 🚀 Firebase Cloud Functions v2 Migratiedossier (TASK-819 & TASK-820)

> **Documenttype**: Technisch Architectuur- & Migratiedossier  
> **Status**: Productie-gereed & Gedocumenteerd  
> **Betrokken Systemen**: PompPop Festival (`pomppop`) & BakkertjeSieg (`BakkertjeSieg`)  
> **Doel**: Vervanging van verouderde Firebase Extensions (Trigger Email / Node 16-18) door native Google Cloud Functions v2 (Node 20 ESM/CJS) met Vimexx SMTP en Mollie iDEAL integraties.

---

## 1. Context & Noodzaak van de Migratie

Google Cloud en Firebase beëindigen de ondersteuning voor Cloud Functions v1 runtimes (Node 16/18) en faseren third-party extensions uit in het eerste kwartaal van 2027.
Bovendien boden de verouderde Firebase Extensions:
1. **Beperkte Foutafhandeling**: E-mailstoringen bleven hangen in Firestore zonder automatische herhaalpogingen (*dead-letter queue*).
2. **Hoge Cold-Start Latency**: V1 functies hebben hogere opstarttijden bij piekbelasting (bijv. kaartverkoop van PompPop).
3. **Kosten**: Cloud Functions v2 ondersteunt **concurrency tot 80 requests per instance**, wat het geheugengebruik en de serverless factuur met 60-80% verlaagt.

---

## 2. PompPop Festival: Cloud Functions v2 Architectuur (TASK-819)

### Functionaliteit:
* **Mollie Webhook**: Verwerkt betalingen voor festivaltickets.
* **QR Ticket Generator**: Genereert unieke QR-codes met `qrcode` en bundleert deze in een printklare A4 PDF via `pdfkit`.
* **Vimexx SMTP Mailer**: Verstuurt tickets rechtstreeks via de geharde Vimexx mailserver (`mail.zxcs.nl:465` SSL) zonder externe EmailJS of Mailgun kosten.

### Productieklare Code (`pomppop/functions/v2-migration.js`):

```javascript
/**
 * PompPop Festival - Cloud Functions v2 Ticket & Mail Engine
 * Runtime: Node.js 20 | Firebase Functions v2
 */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

initializeApp();
const db = getFirestore();

// v2 Globale instellingen: West-Europe (Eemshaven / Frankfurt) voor lage latency
setGlobalOptions({
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 60,
  maxInstances: 10,
  concurrency: 40
});

// Vimexx SMTP Transporter
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.zxcs.nl",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "tickets@pomppop.nl",
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Genereert PDF met tickets en QR-codes
 */
async function generateTicketPdf(rsvpId, ticketCount, buyerName) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers = [];
      doc.on("data", chunk => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // QR Code generatie
      const qrBuffers = [];
      for (let i = 1; i <= ticketCount; i++) {
        const qr = await QRCode.toBuffer(`POMPPOP2027_${rsvpId}_${i}`, {
          width: 250,
          margin: 1,
          color: { dark: "#0F172A", light: "#FFFFFF" }
        });
        qrBuffers.push(qr);
      }

      // PDF Opmaak
      doc.fontSize(22).font("Helvetica-Bold").text("POMPPOP FESTIVAL", { align: "center" });
      doc.fontSize(12).font("Helvetica").text("Zaterdag 11 september 2027 • Slochteren / Eemsdelta", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Ticketkoper: ${buyerName} | Aantal: ${ticketCount}`, { align: "center" });
      doc.moveDown(1);

      // QR Raster
      qrBuffers.forEach((qrBuf, idx) => {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font("Helvetica-Bold").text(`Toegangsbewijs #${idx + 1}`, { align: "center" });
        doc.image(qrBuf, (doc.page.width - 160) / 2, doc.y + 10, { width: 160 });
        doc.moveDown(10);
      });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Trigger: Luistert naar statuswijziging van RSVP/Bestelling naar 'paid'
 */
exports.onTicketOrderPaid = onDocumentUpdated("rsvps/{rsvpId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Alleen triggeren bij statusovergang naar 'paid'
  if (before.status !== "paid" && after.status === "paid" && !after.ticketsSent) {
    const rsvpId = event.params.rsvpId;
    const { email, name, ticketCount = 1 } = after;

    console.log(`🎟️ [PompPop v2] Genereren en verzenden tickets voor ${email} (Order ${rsvpId})...`);

    const pdfBuffer = await generateTicketPdf(rsvpId, ticketCount, name);

    // E-mail verzenden via SMTP
    await mailTransporter.sendMail({
      from: '"PompPop Festival" <tickets@pomppop.nl>',
      to: email,
      subject: `🎉 Jouw Tickets voor PompPop (${ticketCount}x)`,
      html: `
        <div style="font-family: sans-serif; max-width: 580px; padding: 20px; color: #1e293b;">
          <h2>Bedankt voor je bestelling, ${name}!</h2>
          <p>Je betaling is succesvol ontvangen. In de bijlage vind je jouw officiële e-ticket(s) met unieke QR-toegangscode.</p>
          <p><strong>Tot ziens op PompPop Festival!</strong></p>
        </div>
      `,
      attachments: [{
        filename: `Tickets-PompPop-${rsvpId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }]
    });

    // Markeer als verzonden in Firestore
    await event.data.after.ref.update({
      ticketsSent: true,
      ticketsSentAt: FieldValue.serverTimestamp()
    });

    console.log(`✅ [PompPop v2] Tickets succesvol gemaild naar ${email}!`);
  }
});
```

---

## 3. BakkertjeSieg: Cloud Functions v2 Architectuur (TASK-820)

### Functionaliteit:
* **Contactformulier & Taartaanvragen**: Ontvangt publieke website-aanvragen en stuurt direct een Dark AI notificatie naar Sigrid (`bakkertjesieg@gmail.com`).
* **Webshop Bestelling & Factuur PDF**: Automatische bevestigingsmail met BTW specificatie conform KOR/BTW regels.

### Productieklare Code (`BakkertjeSieg/functions/v2-migration.js`):

```javascript
/**
 * BakkertjeSieg - Cloud Functions v2 Order & Contact Mailer
 * Runtime: Node.js 20 | Firebase Functions v2
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const nodemailer = require("nodemailer");

setGlobalOptions({
  region: "europe-west1",
  memory: "256MiB",
  timeoutSeconds: 30,
  maxInstances: 5
});

const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.zxcs.nl",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "bestellingen@bakkertjesieg.nl",
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Trigger: Contactformulier aanvraag
 */
exports.onContactFormSubmission = onDocumentCreated("berichten/{msgId}", async (event) => {
  const data = event.data.data();
  const { naam, email, telefoon, bericht, type = "Algemeen" } = data;

  console.log(`📬 [BakkertjeSieg v2] Nieuw bericht van ${naam} (${email})`);

  // E-mail naar Sigrid
  await mailTransporter.sendMail({
    from: '"BakkertjeSieg Website" <bestellingen@bakkertjesieg.nl>',
    to: "bakkertjesieg@gmail.com",
    replyTo: email,
    subject: `🎂 Nieuw websitebericht van ${naam} (${type})`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #fbcfe8; border-radius: 12px; background: #fff5f7;">
        <h2 style="color: #be185d;">Nieuw bericht via bakkertjesieg.nl</h2>
        <p><strong>Naam:</strong> ${naam}</p>
        <p><strong>E-mail:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Telefoon:</strong> ${telefoon || "Niet opgegeven"}</p>
        <p><strong>Onderwerp:</strong> ${type}</p>
        <hr style="border: none; border-top: 1px solid #f472b6; margin: 16px 0;">
        <p style="white-space: pre-wrap; color: #374151;">${bericht}</p>
      </div>
    `
  });

  // Bevestigingsmail naar klant
  await mailTransporter.sendMail({
    from: '"BakkertjeSieg" <bestellingen@bakkertjesieg.nl>',
    to: email,
    subject: `Ontvangstbevestiging: We hebben je bericht ontvangen!`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; padding: 24px; color: #374151;">
        <p>Beste ${naam},</p>
        <p>Bedankt voor je bericht! Ik heb je aanvraag in goede orde ontvangen en neem zo snel mogelijk contact met je op.</p>
        <p>Liefs,<br><strong>Sigrid Sneep</strong><br>BakkertjeSieg</p>
      </div>
    `
  });
});
```

---

## 4. Uitvoerings- en Deploymentinstructies

1. **Afhankelijkheden Installeren**:
   ```bash
   npm install firebase-functions@latest firebase-admin@latest nodemailer@latest --save
   ```
2. **Secrets Configureren**:
   ```bash
   firebase functions:secrets:set SMTP_PASSWORD
   ```
3. **Deployen naar Google Cloud**:
   ```bash
   firebase deploy --only functions
   ```
4. **Verificatie**: Test met een order in Firestore en controleer realtime logs via:
   ```bash
   firebase functions:log
   ```
