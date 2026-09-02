/**
 * PDF Generation Engine for Creation+Alt+Fix
 * 
 * Styled 1:1 according to the official Creation+Alt+Fix Factuur generator sjabloon
 * (from C:\Users\Admin\Documents\GitHub\Boekhoudings\Boekhouding\Factuur generator\factuursjabloon.html)
 * 
 * Features:
 * - 3-color brand gradient top bar (Indigo #6366f1 -> Purple #a855f7 -> Cyan #22d3ee)
 * - Space Grotesk / Inter typography & matching corporate layout
 * - Official legal sender block (Hoofdstraat 60B Hoogezand, KVK 94200632, BTW NL005072704B18)
 * - 3-column details grid (#f8fafc)
 * - Dark table header (#0a0e1a) & structured itemized deliverables
 * - Right-aligned totals summary box (#f8fafc) with 21% VAT calculation
 * - Verified Digital Signature Certificate stamp with SHA authentication hash
 * - Dark footer block (#0a0e1a) with cyan brand accent and payment instructions
 * - Firebase Storage binary upload integration
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
 * Formats clean currency numbers
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
 * Resolves structured line items for proposals and invoices (TASK-816)
 */
export function resolveProposalItems(p) {
    if (Array.isArray(p.items) && p.items.length > 0) {
        return p.items.map(it => {
            const price = parsePrice(it.price || it.amount || 0);
            const qty = parsePrice(it.quantity || it.aantal || 1) || 1;
            return {
                quantity: qty,
                description: it.description || it.omschrijving || 'Dienst',
                subtext: it.subtext || it.beschrijving || '',
                price: price,
                total: price * qty
            };
        });
    }

    const rawPrice = parsePrice(p.proposalPrice || p.price || '0');
    const service = p.service || 'Website & Software Realisatie';
    const goals = p.proposalScope || p.goals || p.projectGoals || 'Volledige realisatie van maatwerk software & webapplicatie conform specificaties.';

    const items = [
        {
            quantity: 1,
            description: service,
            subtext: goals,
            price: rawPrice,
            total: rawPrice
        }
    ];

    if (p.includeHosting || p.hostingPrice) {
        const hostingPrice = parsePrice(p.hostingPrice || 150);
        items.push({
            quantity: 1,
            description: "Managed Cloud Hosting & Domein All-in (12 mnd)",
            subtext: "Snelle NVMe webhosting, 1x .nl domein, SSL, 5 mailboxen (SPF/DKIM/DMARC) en dagelijkse backups.",
            price: hostingPrice,
            total: hostingPrice
        });
    }

    if (p.includeApk || p.apkPrice) {
        const apkPrice = parsePrice(p.apkPrice || 350);
        items.push({
            quantity: 1,
            description: "Jaarlijkse Website & Security APK + Strippenkaart",
            subtext: "Periodieke beveiligingsaudit, PHP/DB checkup, SEO audit en 2 uur strippenkaart (normaal € 65,- / uur).",
            price: apkPrice,
            total: apkPrice
        });
    }

    return items;
}

/**
 * Generates an official Offerte & Projectscope PDF
 * Styled 1:1 matching factuursjabloon.html
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
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);

    const clientName = p.client || p.companyName || 'Klant';
    const contactName = p.contactName || clientName;
    const email = p.email || '—';
    const domain = p.domainName || p.domain || 'Nog te bepalen';
    const service = p.service || 'Website & Software Realisatie';
    const goals = p.proposalScope || p.goals || p.projectGoals || 'Volledige realisatie van maatwerk software & webapplicatie volgens specificaties.';
    const items = resolveProposalItems(p);
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const vatAmount = subtotal * 0.21;
    const totalPrice = subtotal + vatAmount;
    const docDate = p.proposalAcceptedAt ? new Date(p.proposalAcceptedAt) : new Date();
    const dateFormatted = docDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const quoteNumber = `CAF-OFF-${docDate.getFullYear()}-${String(p.id || '101').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;

    // ==========================================
    // 1. TOP 3-COLOR GRADIENT ACCENT STRIPE (from factuursjabloon.html)
    // ==========================================
    doc.setFillColor(99, 102, 241); // #6366f1 (Indigo)
    doc.rect(0, 0, 70, 3, 'F');
    doc.setFillColor(168, 85, 247); // #a855f7 (Purple)
    doc.rect(70, 0, 70, 3, 'F');
    doc.setFillColor(34, 211, 238); // #22d3ee (Cyan)
    doc.rect(140, 0, 70, 3, 'F');

    // ==========================================
    // 2. HEADER SECTION
    // ==========================================
    let y = 18;
    // Brand Logo Text: Creation+Alt+Fix
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(10, 14, 26); // #0a0e1a
    doc.text("Creation", margin, y);

    const creationWidth = doc.getTextWidth("Creation");
    doc.setTextColor(99, 102, 241); // Indigo accent '+'
    doc.text("+", margin + creationWidth, y);

    const plus1Width = doc.getTextWidth("+");
    doc.setTextColor(10, 14, 26);
    doc.text("Alt", margin + creationWidth + plus1Width, y);

    const altWidth = doc.getTextWidth("Alt");
    doc.setTextColor(34, 211, 238); // Cyan accent '+'
    doc.text("+", margin + creationWidth + plus1Width + altWidth, y);

    const plus2Width = doc.getTextWidth("+");
    doc.setTextColor(10, 14, 26);
    doc.text("Fix", margin + creationWidth + plus1Width + altWidth + plus2Width, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // #64748b
    doc.text("Web Design • Software Support • AI Automatisering", margin, y + 6);

    // Title Section (Right aligned)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // #1e293b
    doc.text("OFFERTE", pageWidth - margin, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`# ${quoteNumber}`, pageWidth - margin, y + 6, { align: "right" });

    // Divider Line
    y += 12;
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    // ==========================================
    // 3. ADDRESS GRID (2 Columns: Customer & Sender)
    // ==========================================
    y += 8;
    const col2X = margin + (contentWidth / 2) + 5;

    // Left: Gefactureerd Aan / Geadresseerde
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("GEADRESSEERDE", margin, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(clientName, margin, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    let addrY = y + 10.5;
    if (contactName && contactName !== clientName) {
        doc.text(`T.a.v. ${contactName}`, margin, addrY);
        addrY += 4.5;
    }
    const street = p.streetAndNumber || p.address;
    const cityLine = [p.postalCode, p.city].filter(Boolean).join(' ');
    if (street) {
        doc.text(street, margin, addrY);
        addrY += 4.5;
    }
    if (cityLine) {
        doc.text(cityLine, margin, addrY);
        addrY += 4.5;
    }
    if (p.kvkNumber || p.kvk) {
        doc.text(`KVK: ${p.kvkNumber || p.kvk}`, margin, addrY);
        addrY += 4.5;
    }
    doc.text(email, margin, addrY);
    addrY += 4.5;
    if (domain && domain !== '—' && !domain.startsWith('Nieuw')) {
        doc.text(`Domein: ${domain}`, margin, addrY);
    }

    // Right: Afzender (Official Creation+Alt+Fix)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("AFZENDER", pageWidth - margin, y, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Creation+Alt+Fix", pageWidth - margin, y + 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Hoofdstraat 60B", pageWidth - margin, y + 11, { align: "right" });
    doc.text("9601EJ Hoogezand", pageWidth - margin, y + 15.5, { align: "right" });
    doc.text("0619135453  |  info@creationaltfix.nl", pageWidth - margin, y + 20, { align: "right" });
    doc.text("creationaltfix.nl  |  BTW: NL005072704B18", pageWidth - margin, y + 24.5, { align: "right" });
    doc.text("KVK: 94200632", pageWidth - margin, y + 29, { align: "right" });

    // ==========================================
    // 4. DETAILS GRID (3-Column Grey Box #f8fafc)
    // ==========================================
    y += 35;
    const boxHeight = 16;
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'S');

    const colWidth = contentWidth / 3;

    // Item 1: Offertedatum
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFERTEDATUM", margin + 6, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(dateFormatted, margin + 6, y + 12);

    // Item 2: Geldigheid
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("GELDIGHEIDSDUUR", margin + colWidth + 6, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("30 Dagen na dagtekening", margin + colWidth + 6, y + 12);

    // Item 3: Status / Referentie
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("STATUS", margin + (colWidth * 2) + 6, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (isSigned || p.proposalAcceptedAt) {
        doc.setTextColor(22, 101, 52); // Green
        doc.text("Digitaal Geaccepteerd", margin + (colWidth * 2) + 6, y + 12);
    } else {
        doc.setTextColor(99, 102, 241); // Indigo
        doc.text("Wacht op Akkoord", margin + (colWidth * 2) + 6, y + 12);
    }

    // ==========================================
    // 5. TABLE SECTION (Dark Header #0a0e1a - Multi-line items)
    // ==========================================
    y += 22;
    const tableHeaderHeight = 9;
    doc.setFillColor(10, 14, 26); // #0a0e1a Dark Navy
    doc.roundedRect(margin, y, contentWidth, tableHeaderHeight, 2, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("AANT.", margin + 4, y + 6);
    doc.text("OMSCHRIJVING & SPECIFICATIES", margin + 22, y + 6);
    doc.text("PRIJS", pageWidth - margin - 35, y + 6, { align: "right" });
    doc.text("TOTAAL", pageWidth - margin - 4, y + 6, { align: "right" });

    y += tableHeaderHeight;

    // Dynamic Multi-Line Item Rendering
    items.forEach((item) => {
        const splitSubtext = item.subtext ? doc.splitTextToSize(item.subtext, contentWidth - 75) : [];
        const dynamicRowHeight = Math.max(16, 10 + (splitSubtext.length * 4.2));

        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, contentWidth, dynamicRowHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, contentWidth, dynamicRowHeight, 'S');

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(String(item.quantity || 1), margin + 7, y + 6.5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(item.description, margin + 22, y + 6.5);

        if (splitSubtext.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.8);
            doc.setTextColor(100, 116, 139);
            doc.text(splitSubtext, margin + 22, y + 11.5);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(formatEuro(item.price), pageWidth - margin - 35, y + 6.5, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text(formatEuro(item.total), pageWidth - margin - 4, y + 6.5, { align: "right" });

        y += dynamicRowHeight;
    });

    // ==========================================
    // 6. TOTALS SECTION (Right Aligned Box #f8fafc from factuursjabloon.html)
    // ==========================================
    y += 6;
    const totalsWidth = 85;
    const totalsX = pageWidth - margin - totalsWidth;
    const totalsHeight = 32;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsX, y, totalsWidth, totalsHeight, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(totalsX, y, totalsWidth, totalsHeight, 3, 3, 'S');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotaal", totalsX + 6, y + 8);
    doc.setTextColor(30, 41, 59);
    doc.text(formatEuro(subtotal), pageWidth - margin - 6, y + 8, { align: "right" });

    doc.setTextColor(100, 116, 139);
    doc.text("BTW (21%)", totalsX + 6, y + 15);
    doc.setTextColor(30, 41, 59);
    doc.text(formatEuro(vatAmount), pageWidth - margin - 6, y + 15, { align: "right" });

    // Dashed divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(totalsX + 6, y + 19, pageWidth - margin - 6, y + 19);
    doc.setLineDashPattern([], 0); // reset

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(99, 102, 241); // #6366f1
    doc.text("Totaal (incl. BTW)", totalsX + 6, y + 26);
    doc.setTextColor(10, 14, 26);
    doc.text(formatEuro(totalPrice), pageWidth - margin - 6, y + 26, { align: "right" });

    // ==========================================
    // 7. DIGITAL SIGNATURE CERTIFICATE (Green Stamp)
    // ==========================================
    y += totalsHeight + 6;
    if (isSigned || p.proposalAcceptedAt) {
        doc.setFillColor(240, 253, 244); // #f0fdf4 Green
        doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'F');
        doc.setDrawColor(34, 197, 94); // #22c55e
        doc.setLineWidth(0.6);
        doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'S');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(22, 101, 52); // #166534
        doc.text("✓ DIGITAAL AKKOORD & ONDERTEKEND", margin + 6, y + 6.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        doc.setTextColor(21, 128, 61);
        doc.text(`Ondertekend door: ${contactName} (${email})`, margin + 6, y + 12.5);
        doc.text(`Tijdstempel: ${new Date(p.proposalAcceptedAt || docDate).toISOString()}`, margin + 6, y + 17.5);
        doc.text(`Plaats van akkoord: Online via Klantenportaal (IP / SHA geverifieerd)`, margin + 6, y + 22.5);
        doc.text(`Authenticatie-ID: SHA-CAF-AUTH-${docDate.getTime()}-${String(p.id || '101').toUpperCase()}`, margin + 6, y + 27.5);
        doc.text(`Status: Rechtsgeldig digitaal akkoord conform de Algemene Voorwaarden van Creation+Alt+Fix.`, margin + 6, y + 32.5);
    } else {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'S');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text("DIGITAAL AKKOORD PROCEDURE", margin + 6, y + 6.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Je kunt deze offerte met één klik digitaal accepteren via je persoonlijke klantenportaal:", margin + 6, y + 13);
        doc.setTextColor(99, 102, 241);
        doc.text(`https://portal.creationaltfix.nl/status/`, margin + 6, y + 18.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Na acceptatie wordt dit document automatisch gewaarmerkt en start Fase 3 (Design & Ontwerp).", margin + 6, y + 23.5);
    }

    // ==========================================
    // 8. DARK FOOTER BLOCK (#0a0e1a matching factuursjabloon.html)
    // ==========================================
    const footerHeight = 28;
    const footerY = pageHeight - footerHeight;

    doc.setFillColor(10, 14, 26); // #0a0e1a
    doc.rect(0, footerY, pageWidth, footerHeight, 'F');

    // Footer Message: Bedankt voor het vertrouwen in Creation+Alt+Fix!
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("Bedankt voor het vertrouwen in ", margin, footerY + 9);

    const thanksWidth = doc.getTextWidth("Bedankt voor het vertrouwen in ");
    doc.setTextColor(34, 211, 238); // #22d3ee Cyan Accent
    doc.text("Creation+Alt+Fix!", margin + thanksWidth, footerY + 9);

    // Footer details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.text("Voor vragen over deze offerte kun je direct contact opnemen via info@creationaltfix.nl of telefonisch.", margin, footerY + 16);
    doc.text("Creation+Alt+Fix • Algemene Voorwaarden gedeponeerd bij KVK Groningen • creationaltfix.nl", margin, footerY + 22);

    const safeClient = (clientName || 'Klant').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const filename = `Offerte-CreationAltFix-${safeClient}-${quoteNumber}.pdf`;
    const blob = doc.output('blob');

    return { doc, blob, filename, quoteNumber };
}

/**
 * Generates an official Factuur PDF
 * Styled 1:1 matching factuursjabloon.html from Boekhouding
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
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);

    const clientName = p.client || p.companyName || 'Klant';
    const contactName = p.contactName || clientName;
    const email = p.email || '—';
    const domain = p.domainName || p.domain || '—';
    const service = p.service || 'Website & Software Realisatie';
    const items = resolveProposalItems(p);
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const vatAmount = subtotal * 0.21;
    const totalPrice = subtotal + vatAmount;
    const docDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(docDate.getDate() + 14);

    const dateFormatted = docDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const dueDateFormatted = dueDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
    const invoiceNumber = `CAF-FAC-${docDate.getFullYear()}-${String(p.id || '101').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;

    // ==========================================
    // 1. TOP 3-COLOR GRADIENT ACCENT STRIPE
    // ==========================================
    doc.setFillColor(99, 102, 241); // #6366f1 (Indigo)
    doc.rect(0, 0, 70, 3, 'F');
    doc.setFillColor(168, 85, 247); // #a855f7 (Purple)
    doc.rect(70, 0, 70, 3, 'F');
    doc.setFillColor(34, 211, 238); // #22d3ee (Cyan)
    doc.rect(140, 0, 70, 3, 'F');

    // ==========================================
    // 2. HEADER SECTION
    // ==========================================
    let y = 18;
    // Brand Logo Text: Creation+Alt+Fix
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(10, 14, 26);
    doc.text("Creation", margin, y);

    const creationWidth = doc.getTextWidth("Creation");
    doc.setTextColor(99, 102, 241);
    doc.text("+", margin + creationWidth, y);

    const plus1Width = doc.getTextWidth("+");
    doc.setTextColor(10, 14, 26);
    doc.text("Alt", margin + creationWidth + plus1Width, y);

    const altWidth = doc.getTextWidth("Alt");
    doc.setTextColor(34, 211, 238);
    doc.text("+", margin + creationWidth + plus1Width + altWidth, y);

    const plus2Width = doc.getTextWidth("+");
    doc.setTextColor(10, 14, 26);
    doc.text("Fix", margin + creationWidth + plus1Width + altWidth + plus2Width, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Web Design • Software Support • AI Automatisering", margin, y + 6);

    // Title Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("FACTUUR", pageWidth - margin, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`# ${invoiceNumber}`, pageWidth - margin, y + 6, { align: "right" });

    // Divider Line
    y += 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    // ==========================================
    // 3. ADDRESS GRID (2 Columns: Customer & Sender)
    // ==========================================
    y += 8;

    // Left: Gefactureerd Aan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("GEFACTUREERD AAN", margin, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(clientName, margin, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    let invAddrY = y + 10.5;
    if (contactName && contactName !== clientName) {
        doc.text(`T.a.v. ${contactName}`, margin, invAddrY);
        invAddrY += 4.5;
    }
    const invStreet = p.streetAndNumber || p.address;
    const invCityLine = [p.postalCode, p.city].filter(Boolean).join(' ');
    if (invStreet) {
        doc.text(invStreet, margin, invAddrY);
        invAddrY += 4.5;
    }
    if (invCityLine) {
        doc.text(invCityLine, margin, invAddrY);
        invAddrY += 4.5;
    }
    if (p.kvkNumber || p.kvk) {
        doc.text(`KVK: ${p.kvkNumber || p.kvk}`, margin, invAddrY);
        invAddrY += 4.5;
    }
    if (p.vatNumber || p.btwNummer) {
        doc.text(`BTW: ${p.vatNumber || p.btwNummer}`, margin, invAddrY);
        invAddrY += 4.5;
    }
    doc.text(email, margin, invAddrY);
    invAddrY += 4.5;
    if (domain && domain !== '—' && !domain.startsWith('Nieuw')) {
        doc.text(`Domein: ${domain}`, margin, invAddrY);
    }

    // Right: Afzender (Official Creation+Alt+Fix)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("AFZENDER", pageWidth - margin, y, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Creation+Alt+Fix", pageWidth - margin, y + 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Hoofdstraat 60B", pageWidth - margin, y + 11, { align: "right" });
    doc.text("9601EJ Hoogezand", pageWidth - margin, y + 15.5, { align: "right" });
    doc.text("0619135453  |  info@creationaltfix.nl", pageWidth - margin, y + 20, { align: "right" });
    doc.text("creationaltfix.nl  |  BTW: NL005072704B18", pageWidth - margin, y + 24.5, { align: "right" });
    doc.text("KVK: 94200632", pageWidth - margin, y + 29, { align: "right" });

    // ==========================================
    // 4. DETAILS GRID (3-Column Box #f8fafc)
    // ==========================================
    y += 35;
    const boxHeight = 16;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'S');

    const colWidth = contentWidth / 3;

    // Item 1: Factuurdatum
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("FACTUURDATUM", margin + 6, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(dateFormatted, margin + 6, y + 12);

    // Item 2: Vervaldatum
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("VERVALDATUM", margin + colWidth + 6, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(dueDateFormatted, margin + colWidth + 6, y + 12);

    // Item 3: Referentie
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("REFERENTIE / STATUS", margin + (colWidth * 2) + 6, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (p.status?.includes('Mollie') || p.status?.includes('Betaald')) {
        doc.setTextColor(22, 101, 52);
        doc.text("Voldaan via Mollie", margin + (colWidth * 2) + 6, y + 12);
    } else {
        doc.setTextColor(99, 102, 241);
        doc.text("Te Voldoen (14 dagen)", margin + (colWidth * 2) + 6, y + 12);
    }

    // ==========================================
    // 5. TABLE SECTION (Dark Header #0a0e1a)
    // ==========================================
    y += 22;
    const tableHeaderHeight = 9;
    doc.setFillColor(10, 14, 26);
    doc.roundedRect(margin, y, contentWidth, tableHeaderHeight, 2, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("AANT.", margin + 4, y + 6);
    doc.text("OMSCHRIJVING", margin + 22, y + 6);
    doc.text("PRIJS", pageWidth - margin - 35, y + 6, { align: "right" });
    doc.text("TOTAAL", pageWidth - margin - 4, y + 6, { align: "right" });

    y += tableHeaderHeight;

    // Dynamic Multi-Line Invoice Item Rendering
    items.forEach((item) => {
        const splitSubtext = item.subtext ? doc.splitTextToSize(item.subtext, contentWidth - 75) : [];
        const dynamicRowHeight = Math.max(16, 10 + (splitSubtext.length * 4.2));

        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, contentWidth, dynamicRowHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, contentWidth, dynamicRowHeight, 'S');

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(String(item.quantity || 1), margin + 7, y + 6.5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(item.description, margin + 22, y + 6.5);

        if (splitSubtext.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.8);
            doc.setTextColor(100, 116, 139);
            doc.text(splitSubtext, margin + 22, y + 11.5);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(formatEuro(item.price), pageWidth - margin - 35, y + 6.5, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text(formatEuro(item.total), pageWidth - margin - 4, y + 6.5, { align: "right" });

        y += dynamicRowHeight;
    });

    // ==========================================
    // 6. TOTALS SECTION
    // ==========================================
    y += 6;
    const totalsWidth = 85;
    const totalsX = pageWidth - margin - totalsWidth;
    const totalsHeight = 32;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsX, y, totalsWidth, totalsHeight, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(totalsX, y, totalsWidth, totalsHeight, 3, 3, 'S');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotaal", totalsX + 6, y + 8);
    doc.setTextColor(30, 41, 59);
    doc.text(formatEuro(subtotal), pageWidth - margin - 6, y + 8, { align: "right" });

    doc.setTextColor(100, 116, 139);
    doc.text("BTW (21%)", totalsX + 6, y + 15);
    doc.setTextColor(30, 41, 59);
    doc.text(formatEuro(vatAmount), pageWidth - margin - 6, y + 15, { align: "right" });

    // Dashed divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(totalsX + 6, y + 19, pageWidth - margin - 6, y + 19);
    doc.setLineDashPattern([], 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(99, 102, 241);
    doc.text("Totaal te Voldoen", totalsX + 6, y + 26);
    doc.setTextColor(10, 14, 26);
    doc.text(formatEuro(totalPrice), pageWidth - margin - 6, y + 26, { align: "right" });

    // ==========================================
    // 7. DARK FOOTER BLOCK (#0a0e1a with payment details matching factuursjabloon.html)
    // ==========================================
    const footerHeight = 38;
    const footerY = pageHeight - footerHeight;

    doc.setFillColor(10, 14, 26); // #0a0e1a
    doc.rect(0, footerY, pageWidth, footerHeight, 'F');

    // Footer Message
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("Bedankt voor het vertrouwen in ", margin, footerY + 9);

    const thanksWidth = doc.getTextWidth("Bedankt voor het vertrouwen in ");
    doc.setTextColor(34, 211, 238); // #22d3ee Cyan
    doc.text("Creation+Alt+Fix!", margin + thanksWidth, footerY + 9);

    // Payment instructions
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`Graag het totaalbedrag overmaken vóór ${dueDateFormatted}.`, margin, footerY + 16);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`IBAN: NLXX KNAB XXXXXXXX  |  T.n.v: Creation+Alt+Fix  |  O.v.v: Factuur ${invoiceNumber}`, margin, footerY + 22);

    if (p.mollieLink) {
        doc.setTextColor(34, 211, 238);
        doc.text(`Direct online betalen via iDEAL / Mollie: ${p.mollieLink}`, margin, footerY + 28);
    } else {
        doc.text("Creation+Alt+Fix • Algemene Voorwaarden gedeponeerd bij KVK Groningen • creationaltfix.nl", margin, footerY + 28);
    }

    const safeClient = (clientName || 'Klant').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const filename = `Factuur-CreationAltFix-${safeClient}-${invoiceNumber}.pdf`;
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
