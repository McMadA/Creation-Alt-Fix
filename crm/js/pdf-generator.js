/**
 * PDF Generation Engine for Creation+Alt+Fix
 * Generates official, high-quality A4 Quotes (Offertes) and Invoices (Facturen)
 * with digital signature verification stamps and Firebase Storage upload support.
 */

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/**
 * Ensures jsPDF is loaded on window
 */
export function ensureJsPdfLoaded() {
    if (window.jspdf && window.jspdf.jsPDF) {
        return Promise.resolve(window.jspdf.jsPDF);
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = () => {
            if (window.jspdf && window.jspdf.jsPDF) {
                resolve(window.jspdf.jsPDF);
            } else {
                reject(new Error("Kon jsPDF niet laden"));
            }
        };
        script.onerror = () => reject(new Error("Fout bij inladen jsPDF CDN"));
        document.head.appendChild(script);
    });
}

/**
 * Formats a clean currency amount
 */
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const clean = String(priceStr).replace(/[^0-9,.-]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
}

function formatEuro(amount) {
    return 'EUR ' + amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generates an official Offerte / Investeringsvoorstel PDF
 * 
 * @param {Object} p - Project data object
 * @param {boolean} isSigned - Whether the quote contains the digital signature stamp
 * @returns {Promise<{ doc: any, blob: Blob, filename: string, quoteNumber: string }>}
 */
export async function generateProposalPDF(p, isSigned = false) {
    const jsPDF = await ensureJsPdfLoaded();
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const clientName = p.client || p.companyName || 'Klant';
    const contactName = p.contactName || clientName;
    const email = p.email || '—';
    const domain = p.domainName || p.domain || 'Nog te bepalen';
    const service = p.service || 'Website & Software Realisatie';
    const goals = p.proposalScope || p.goals || p.projectGoals || 'Volledige realisatie van maatwerk software & webapplicatie volgens specificaties.';
    const rawPrice = parsePrice(p.proposalPrice || '0');
    const vatAmount = rawPrice * 0.21;
    const totalPrice = rawPrice + vatAmount;
    const docDate = p.proposalAcceptedAt ? new Date(p.proposalAcceptedAt) : new Date();
    const dateFormatted = docDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const quoteNumber = `CAF-OFF-${docDate.getFullYear()}-${String(p.id || '101').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;

    // --- Header Background Accent ---
    doc.setFillColor(15, 23, 42); // #0f172a Dark AI Navy
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Indigo accent stripe
    doc.setFillColor(99, 102, 241); // #6366f1
    doc.rect(0, 42, pageWidth, 2.5, 'F');

    // Cyan sub-accent stripe
    doc.setFillColor(34, 211, 238); // #22d3ee
    doc.rect(140, 42, 70, 2.5, 'F');

    // --- Header Text (Creation+Alt+Fix) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("CREATION+ALT+FIX", margin, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.text("Web Design • Software Support • AI Automatisering", margin, 25);
    doc.text("www.creationaltfix.nl  |  info@creationaltfix.nl", margin, 31);

    // Header Right (Legal details)
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // #cbd5e1
    doc.text("KVK: 94200632", pageWidth - margin, 18, { align: "right" });
    doc.text("BTW: NL005072704B18", pageWidth - margin, 24, { align: "right" });
    doc.text("Groningen, Nederland", pageWidth - margin, 30, { align: "right" });

    // --- Document Title & Meta Box ---
    let y = 56;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("OFFERTE & INVESTERINGSVOORSTEL", margin, y);

    // Meta box details
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Offertenummer: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(quoteNumber, margin + 28, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Datum: ${dateFormatted}`, pageWidth - margin, y, { align: "right" });

    y += 5;
    doc.text(`Geldigheid: 30 dagen`, margin, y);
    doc.text(`Status: ${isSigned || p.proposalAcceptedAt ? 'DIGITAAL GEACCEPTEERD' : 'Wacht op Akkoord'}`, pageWidth - margin, y, { align: "right" });

    // Divider Line
    y += 6;
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    // --- Client Details Box ---
    y += 8;
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("GEADRESSEERDE / OPDRACHTGEVER", margin + 5, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Bedrijf / Klant: ${clientName}`, margin + 5, y + 13);
    doc.text(`Contactpersoon: ${contactName}`, margin + 5, y + 19);

    doc.text(`E-mail: ${email}`, margin + 90, y + 13);
    doc.text(`Domeinnaam: ${domain}`, margin + 90, y + 19);

    // --- Project Scope & Deliverables Table ---
    y += 34;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Projectomschrijving & Specificaties", margin, y);

    y += 6;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("ONDERDEEL / DIENST", margin + 4, y + 5.5);
    doc.text("SPECIFICATIE & LEVERING", margin + 55, y + 5.5);
    doc.text("BEDRAG", pageWidth - margin - 4, y + 5.5, { align: "right" });

    // Table Content Row
    y += 8;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 24, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 24, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(service, margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    // Split goals text across multiple lines
    const splitGoals = doc.splitTextToSize(goals, contentWidth - 80);
    doc.text(splitGoals, margin + 55, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatEuro(rawPrice), pageWidth - margin - 4, y + 6, { align: "right" });

    // --- Financial Summary Box ---
    y += 30;
    const summaryBoxWidth = 80;
    const summaryX = pageWidth - margin - summaryBoxWidth;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(summaryX, y, summaryBoxWidth, 28, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(summaryX, y, summaryBoxWidth, 28, 2, 2, 'S');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Subtotaal (Excl. BTW):", summaryX + 4, y + 7);
    doc.text(formatEuro(rawPrice), pageWidth - margin - 4, y + 7, { align: "right" });

    doc.text("BTW (21%):", summaryX + 4, y + 14);
    doc.text(formatEuro(vatAmount), pageWidth - margin - 4, y + 14, { align: "right" });

    doc.setDrawColor(203, 213, 225);
    doc.line(summaryX + 4, y + 17, pageWidth - margin - 4, y + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(99, 102, 241);
    doc.text("Totaal Investering:", summaryX + 4, y + 23);
    doc.text(formatEuro(totalPrice), pageWidth - margin - 4, y + 23, { align: "right" });

    // --- Digital Signature & Acceptance Stamp ---
    y += 36;
    if (isSigned || p.proposalAcceptedAt) {
        doc.setFillColor(240, 253, 244); // #f0fdf4 Green light
        doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');
        doc.setDrawColor(34, 197, 94); // #22c55e Green border
        doc.setLineWidth(0.6);
        doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'S');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(22, 101, 52); // #166534
        doc.text("✓ DIGITAAL AKKOORD & ONDERTEKEND", margin + 6, y + 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(21, 128, 61);
        doc.text(`Ondertekend door: ${contactName} (${email})`, margin + 6, y + 15);
        doc.text(`Tijdstempel: ${new Date(p.proposalAcceptedAt || docDate).toISOString()}`, margin + 6, y + 21);
        doc.text(`Authenticatie-ID: SHA-CAF-AUTH-${docDate.getTime()}-${String(p.id || '101').toUpperCase()}`, margin + 6, y + 27);
        doc.text(`Status: Dit document is rechtsgeldig digitaal ondertekend via het Creation+Alt+Fix Klantenportaal.`, margin + 6, y + 33);
    } else {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'S');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text("DIGITAAL AKKOORD PROCEDURE", margin + 6, y + 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Je kunt deze offerte met één klik digitaal accepteren via je persoonlijke Creation+Alt+Fix klantenportaal:", margin + 6, y + 15);
        doc.setTextColor(99, 102, 241);
        doc.text(`https://creationaltfix.nl/portal/status/`, margin + 6, y + 21);
        doc.setTextColor(100, 116, 139);
        doc.text("Na acceptatie wordt dit document automatisch gewaarmerkt en start Fase 3 (Design & Ontwerp).", margin + 6, y + 27);
    }

    // --- Footer ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Creation+Alt+Fix • Algemene Voorwaarden gedeponeerd bij KVK te Groningen • Bedankt voor het vertrouwen.", pageWidth / 2, pageHeight - 12, { align: "center" });

    const filename = `Offerte_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${quoteNumber}.pdf`;
    const blob = doc.output('blob');

    return { doc, blob, filename, quoteNumber };
}

/**
 * Generates an official Factuur PDF
 * 
 * @param {Object} p - Project data object
 * @returns {Promise<{ doc: any, blob: Blob, filename: string, invoiceNumber: string }>}
 */
export async function generateInvoicePDF(p) {
    const jsPDF = await ensureJsPdfLoaded();
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const clientName = p.client || p.companyName || 'Klant';
    const contactName = p.contactName || clientName;
    const email = p.email || '—';
    const domain = p.domainName || p.domain || '—';
    const service = p.service || 'Website & Software Realisatie';
    const rawPrice = parsePrice(p.proposalPrice || '0');
    const vatAmount = rawPrice * 0.21;
    const totalPrice = rawPrice + vatAmount;
    const docDate = new Date();
    const dateFormatted = docDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const invoiceNumber = `CAF-FAC-${docDate.getFullYear()}-${String(p.id || '101').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;

    // Header Background Accent
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 42, 'F');
    doc.setFillColor(34, 211, 238); // Cyan for invoice
    doc.rect(0, 42, pageWidth, 2.5, 'F');

    // Header text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("CREATION+ALT+FIX", margin, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Web Design • Software Support • AI Automatisering", margin, 25);
    doc.text("www.creationaltfix.nl  |  info@creationaltfix.nl", margin, 31);

    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text("KVK: 94200632", pageWidth - margin, 18, { align: "right" });
    doc.text("BTW: NL005072704B18", pageWidth - margin, 24, { align: "right" });
    doc.text("IBAN: NLXX KNAB XXXXXXXX", pageWidth - margin, 30, { align: "right" });

    // Document Title
    let y = 56;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("FACTUUR", margin, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Factuurnummer: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(invoiceNumber, margin + 28, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Factuurdatum: ${dateFormatted}`, pageWidth - margin, y, { align: "right" });

    y += 5;
    doc.text(`Vervaldatum: 14 dagen`, margin, y);
    doc.text(`Betaalstatus: ${p.status?.includes('Mollie') || p.status?.includes('Betaald') ? 'BETAALD' : 'TE VOLDOEN'}`, pageWidth - margin, y, { align: "right" });

    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    // Client Box
    y += 8;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(34, 211, 238);
    doc.text("FACTUURADRES", margin + 5, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Klant / Bedrijf: ${clientName}`, margin + 5, y + 13);
    doc.text(`Contactpersoon: ${contactName}`, margin + 5, y + 18);
    doc.text(`E-mail: ${email}`, margin + 90, y + 13);
    doc.text(`Domein: ${domain}`, margin + 90, y + 18);

    // Table Header
    y += 32;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("OMSCHRIJVING", margin + 4, y + 5.5);
    doc.text("AANTAL", margin + 110, y + 5.5);
    doc.text("BTW", margin + 135, y + 5.5);
    doc.text("BEDRAG", pageWidth - margin - 4, y + 5.5, { align: "right" });

    // Table Row
    y += 8;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 16, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(service, margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Oplevering & software implementatie", margin + 4, y + 11);

    doc.text("1", margin + 114, y + 8);
    doc.text("21%", margin + 137, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatEuro(rawPrice), pageWidth - margin - 4, y + 8, { align: "right" });

    // Totals
    y += 22;
    const summaryBoxWidth = 80;
    const summaryX = pageWidth - margin - summaryBoxWidth;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(summaryX, y, summaryBoxWidth, 28, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(summaryX, y, summaryBoxWidth, 28, 2, 2, 'S');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Subtotaal (Excl. BTW):", summaryX + 4, y + 7);
    doc.text(formatEuro(rawPrice), pageWidth - margin - 4, y + 7, { align: "right" });

    doc.text("BTW (21%):", summaryX + 4, y + 14);
    doc.text(formatEuro(vatAmount), pageWidth - margin - 4, y + 14, { align: "right" });

    doc.setDrawColor(203, 213, 225);
    doc.line(summaryX + 4, y + 17, pageWidth - margin - 4, y + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(34, 211, 238);
    doc.text("Totaal te Voldoen:", summaryX + 4, y + 23);
    doc.text(formatEuro(totalPrice), pageWidth - margin - 4, y + 23, { align: "right" });

    // Payment instructions
    y += 36;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("BETAALINSTRUCTIES", margin + 5, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Gelieve het totaalbedrag van ${formatEuro(totalPrice)} binnen 14 dagen over te maken onder vermelding van factuurnummer ${invoiceNumber}.`, margin + 5, y + 12);
    if (p.mollieLink) {
        doc.setTextColor(99, 102, 241);
        doc.text(`Direct betalen via iDEAL / Mollie: ${p.mollieLink}`, margin + 5, y + 18);
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Creation+Alt+Fix • Algemene Voorwaarden gedeponeerd bij KVK te Groningen • info@creationaltfix.nl", pageWidth / 2, pageHeight - 12, { align: "center" });

    const filename = `Factuur_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${invoiceNumber}.pdf`;
    const blob = doc.output('blob');

    return { doc, blob, filename, invoiceNumber };
}

/**
 * Uploads a generated PDF to Firebase Storage and returns the public download URL
 */
export async function uploadPdfToStorage(storageInstance, pdfBlob, projectId, filename) {
    if (!storageInstance || !projectId) return null;
    try {
        const timestamp = Date.now();
        const safeName = filename || `document_${timestamp}.pdf`;
        const storagePath = `projects/${projectId}/documents/${timestamp}_${safeName}`;
        const fileRef = ref(storageInstance, storagePath);

        const snapshot = await uploadBytes(fileRef, pdfBlob, {
            contentType: 'application/pdf',
            customMetadata: {
                projectId: String(projectId),
                uploadedAt: new Date().toISOString()
            }
        });

        const downloadUrl = await getDownloadURL(snapshot.ref);
        return { downloadUrl, storagePath, filename: safeName };
    } catch (err) {
        console.warn("Kon PDF niet uploaden naar Firebase Storage:", err);
        return null;
    }
}
