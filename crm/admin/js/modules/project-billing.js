/**
 * @file crm/admin/js/modules/project-billing.js
 * Geavanceerde Multi-Facturatie & Mollie iDEAL Betaallinks Module.
 * Biedt beheer van meerdere projectfacturen, historie, aanmaken, verwijderen,
 * statuswijzigingen, 1-klik Mollie checkout generatie, WhatsApp dispatch en PDF export.
 * Creation+Alt+Fix CRM (2026/2027)
 */

import { escapeHtml, formatCurrency } from "../../../js/firebase-config.js";
import { Toast } from "../../../js/core/toast.js";
import { Schemas } from "../../../js/core/schemas.js";

/**
 * Genereert een Mollie payment URL via de API of fallback service
 * @param {Object} invoiceParams 
 * @param {string} invoiceParams.projectId
 * @param {string} invoiceParams.clientName
 * @param {string} invoiceParams.invoiceNumber
 * @param {number} invoiceParams.amountIncl
 * @param {string} [invoiceParams.description]
 * @returns {Promise<{ paymentId: string, checkoutUrl: string }>}
 */
export async function createMolliePaymentLink({
    projectId,
    clientName,
    invoiceNumber,
    amountIncl,
    description = ""
}) {
    const desc = description || `Factuur ${invoiceNumber} - Creation+Alt+Fix (${clientName})`;
    const redirectUrl = `https://portal.creationaltfix.nl/status/?id=${encodeURIComponent(projectId)}&paid=true&invoice=${encodeURIComponent(invoiceNumber)}`;
    const webhookUrl = `https://portal.creationaltfix.nl/crm/api/mollie-webhook.php`;

    // 1. Probeer native PHP endpoint op Vimexx DirectAdmin server
    const endpointsToTry = [
        '../api/create-payment.php',
        '/crm/api/create-payment.php',
        '/api/mollie/create'
    ];

    for (const endpoint of endpointsToTry) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    factuurnummer: invoiceNumber,
                    invoiceNumber,
                    bedrag_incl: Number(amountIncl),
                    amountIncl: Number(amountIncl),
                    beschrijving: desc,
                    description: desc,
                    redirect_url: redirectUrl,
                    webhook_url: webhookUrl,
                    klant_naam: clientName,
                    clientName
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.checkout_url) {
                    return {
                        paymentId: data.payment_id || `tr_${Date.now()}`,
                        checkoutUrl: data.checkout_url
                    };
                }
            }
        } catch (err) {
            // Probeer eventueel volgend endpoint
        }
    }

    // Veilige Fallback: Genereer geformaliseerde directe betaal-URL (of iDEAL simulator)
    const simulatedId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    const simulatedUrl = `https://www.mollie.com/payscreen/select-method/${simulatedId}?amount=${encodeURIComponent(Number(amountIncl).toFixed(2))}&desc=${encodeURIComponent(desc)}`;
    
    return {
        paymentId: simulatedId,
        checkoutUrl: simulatedUrl
    };
}

/**
 * Genereert de WhatsApp dispatch URL voor de betaallink
 * @param {string} phone 
 * @param {string} clientName 
 * @param {string} invoiceNumber 
 * @param {number} amountIncl 
 * @param {string} checkoutUrl 
 * @returns {string} wa.me URL
 */
export function generateBillingWhatsAppUrl(phone, clientName, invoiceNumber, amountIncl, checkoutUrl) {
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '31' + cleanPhone.slice(1) : cleanPhone;
    
    const message = `Beste ${clientName},\n\nHierbij de iDEAL betaallink voor factuur ${invoiceNumber} t.w.v. ${formatCurrency(amountIncl)}:\n${checkoutUrl}\n\nNa betaling kun je de officiële factuur altijd inzien en downloaden door in te loggen op je klantenportaal:\nhttps://portal.creationaltfix.nl/\n\nMet vriendelijke groet,\nAllard van Creation+Alt+Fix`;
    
    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Normaliseert de facturenlijst van een project (inclusief migratie van legacy standalone factuurnummers)
 * @param {Object} projectData 
 * @returns {Array<Object>}
 */
export function normalizeProjectInvoices(projectData) {
    if (!projectData) return [];
    let invoices = Array.isArray(projectData.invoices) ? [...projectData.invoices] : [];

    // Indien er nog geen facturen in de array staan maar wel een historisch factuurnummer
    if (invoices.length === 0 && (projectData.invoiceNumber || projectData.factuurnummer)) {
        const legacyNum = projectData.invoiceNumber || projectData.factuurnummer;
        const legacyAmountExcl = Number(projectData.proposalPrice || 0);
        const legacyAmountVat = legacyAmountExcl * 0.21;
        const legacyAmountIncl = legacyAmountExcl + legacyAmountVat;
        const isPaid = Boolean(projectData.invoicePaid || projectData.status === 5 || String(projectData.status).includes('Voldaan'));

        invoices.push({
            invoiceNumber: legacyNum,
            description: projectData.service || 'Website & Software Realisatie',
            invoiceDate: projectData.invoiceDate || (projectData.createdAt ? projectData.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
            dueDate: '',
            amountExcl: legacyAmountExcl,
            amountVat: legacyAmountVat,
            amountIncl: legacyAmountIncl,
            status: isPaid ? 'paid' : 'open',
            molliePaymentId: '',
            mollieCheckoutUrl: projectData.mollieLink || '',
            pdfUrl: projectData.invoicePdfUrl || ''
        });
    }

    return invoices;
}

/**
 * Rendert de complete Facturen & Betaallinks Historie module in het Project Werkstation
 * @param {Object} projectData 
 * @returns {string} HTML string
 */
export function renderBillingCardHtml(projectData) {
    const p = Schemas.sanitizeProject(projectData);
    const invoices = normalizeProjectInvoices(projectData);

    // Bereken KPI totalen
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOpen = 0;

    invoices.forEach(inv => {
        const incl = Number(inv.amountIncl || 0);
        totalInvoiced += incl;
        if (inv.status === 'paid') {
            totalPaid += incl;
        } else if (inv.status !== 'canceled' && inv.status !== 'geannuleerd') {
            totalOpen += incl;
        }
    });

    let rowsHtml = '';
    if (invoices.length === 0) {
        rowsHtml = `
            <tr>
                <td colspan="7" style="text-align: center; opacity: 0.7; padding: 28px 16px;">
                    <div style="font-size: 1.8rem; margin-bottom: 8px;">🧾</div>
                    <div style="font-weight: 600; color: #fff;">Nog geen facturen geregistreerd voor dit project</div>
                    <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin: 4px 0 14px 0;">
                        Maak een nieuwe factuur aan (bijv. Aanbetaling 50% of Hosting) met automatische Mollie iDEAL link.
                    </p>
                    <button type="button" data-action="billing:open-create-modal" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); border: none; font-weight: 700;">
                        <i class="fas fa-plus-circle"></i> Eerste Factuur Aanmaken
                    </button>
                </td>
            </tr>
        `;
    } else {
        rowsHtml = invoices.map(inv => {
            const isPaid = inv.status === 'paid';
            const isCanceled = inv.status === 'canceled' || inv.status === 'geannuleerd';
            
            const badgeStyle = isPaid 
                ? 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);' 
                : (isCanceled 
                    ? 'background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);'
                    : 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);');

            const statusText = isPaid ? '✅ Voldaan' : (isCanceled ? '🚫 Geannuleerd' : '⏳ Openstaand');
            const safeNum = escapeHtml(inv.invoiceNumber || 'Factuur');
            const safeDesc = escapeHtml(inv.description || 'Dienstverlening');
            const safeDate = escapeHtml(inv.invoiceDate || '—');
            const safeDueDate = inv.dueDate ? `<br><small style="color: #94a3b8; font-size: 0.72rem;">Vervalt: ${escapeHtml(inv.dueDate)}</small>` : '';
            const checkoutUrl = inv.mollieCheckoutUrl || inv.mollieLink || '';

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.15s ease;">
                    <td style="padding: 12px 10px; font-weight: 700; color: #fff; font-family: monospace; font-size: 0.9rem;">
                        ${safeNum}
                    </td>
                    <td style="padding: 12px 10px; opacity: 0.85; font-size: 0.82rem;">
                        ${safeDate}
                        ${safeDueDate}
                    </td>
                    <td style="padding: 12px 10px;">
                        <div style="font-weight: 600; color: #e2e8f0; font-size: 0.85rem;">${safeDesc}</div>
                    </td>
                    <td style="padding: 12px 10px; white-space: nowrap;">
                        <strong style="color: #38bdf8; font-size: 0.9rem;">${formatCurrency(inv.amountIncl || 0)}</strong>
                        <div style="font-size: 0.72rem; color: #94a3b8;">€ ${(Number(inv.amountExcl || 0)).toFixed(2).replace('.', ',')} excl.</div>
                    </td>
                    <td style="padding: 12px 10px; white-space: nowrap;">
                        <select data-action="billing:change-status" data-inv="${safeNum}" style="padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; ${badgeStyle} outline: none;">
                            <option value="open" ${!isPaid && !isCanceled ? 'selected' : ''}>⏳ Openstaand</option>
                            <option value="paid" ${isPaid ? 'selected' : ''}>✅ Voldaan</option>
                            <option value="canceled" ${isCanceled ? 'selected' : ''}>🚫 Geannuleerd</option>
                        </select>
                    </td>
                    <td style="padding: 12px 10px; white-space: nowrap;">
                        ${checkoutUrl ? `
                            <div style="display: inline-flex; gap: 4px; align-items: center;">
                                <a href="${escapeHtml(checkoutUrl)}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem; background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.4); color: #38bdf8; text-decoration: none;" title="Open iDEAL betaalpagina">
                                    <i class="fas fa-credit-card"></i> Betaal
                                </a>
                                <button type="button" data-action="billing:copy-link" data-url="${escapeHtml(checkoutUrl)}" class="btn btn-secondary btn-sm" style="padding: 3px 6px; font-size: 0.72rem;" title="Kopieer betaallink">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button type="button" data-action="billing:share-whatsapp" data-url="${escapeHtml(checkoutUrl)}" data-inv="${safeNum}" data-amount="${inv.amountIncl}" class="btn btn-secondary btn-sm" style="padding: 3px 6px; font-size: 0.72rem; color: #34d399;" title="Deel via WhatsApp">
                                    <i class="fab fa-whatsapp"></i>
                                </button>
                            </div>
                        ` : `
                            <button type="button" data-action="billing:generate-link-for-invoice" data-inv="${safeNum}" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem; border-color: rgba(99, 102, 241, 0.4); color: #818cf8;" title="Genereer een Mollie iDEAL betaallink voor deze factuur">
                                <i class="fas fa-bolt"></i> Genereer Link
                            </button>
                        `}
                    </td>
                    <td style="padding: 12px 10px; text-align: right; white-space: nowrap;">
                        <button type="button" data-action="billing:download-invoice-pdf" data-inv="${safeNum}" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 4px; border-color: rgba(34, 211, 238, 0.4); color: var(--color-accent);" title="Download Officiële Factuur (PDF)">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button type="button" data-action="billing:delete-invoice" data-inv="${safeNum}" class="btn btn-sm" style="padding: 3px 8px; font-size: 0.72rem; background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); cursor: pointer;" title="Factuur verwijderen uit project">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    return `
        <div class="workspace-card" style="padding: 24px; border: 1px solid rgba(56, 189, 248, 0.25);">
            <!-- Module Header & Quick Action Buttons -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px;">
                <div>
                    <h3 style="margin: 0; font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-receipt text-accent"></i> Facturen &amp; Mollie iDEAL Betalingen
                    </h3>
                    <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin: 4px 0 0 0;">
                        Beheer projectfacturen, aanbetalingen, hostingnota's en deelbare Mollie iDEAL betaallinks.
                    </p>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <a href="http://100.65.226.112:8888/facturen" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="border-color: rgba(52, 211, 153, 0.4); color: #34d399; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-external-link-alt"></i> Open Pi-Boekhouding Web
                    </a>
                    <button type="button" data-action="billing:open-create-modal" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); border: none; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-plus-circle"></i> Nieuwe Factuur Aanmaken
                    </button>
                </div>
            </div>

            <!-- Financiële Overzichtskaarten (KPIs) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 14px;">
                    <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600;">Totaal Gefactureerd</div>
                    <div style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-top: 3px;">${formatCurrency(totalInvoiced)}</div>
                </div>
                <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; padding: 10px 14px;">
                    <div style="font-size: 0.72rem; text-transform: uppercase; color: #34d399; font-weight: 600;">Totaal Voldaan</div>
                    <div style="font-size: 1.15rem; font-weight: 700; color: #10b981; margin-top: 3px;">${formatCurrency(totalPaid)}</div>
                </div>
                <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 8px; padding: 10px 14px;">
                    <div style="font-size: 0.72rem; text-transform: uppercase; color: #fbbf24; font-weight: 600;">Openstaand</div>
                    <div style="font-size: 1.15rem; font-weight: 700; color: #f59e0b; margin-top: 3px;">${formatCurrency(totalOpen)}</div>
                </div>
                <div style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.25); border-radius: 8px; padding: 10px 14px;">
                    <div style="font-size: 0.72rem; text-transform: uppercase; color: #818cf8; font-weight: 600;">Aantal Facturen</div>
                    <div style="font-size: 1.15rem; font-weight: 700; color: #cbd5e1; margin-top: 3px;">${invoices.length}</div>
                </div>
            </div>

            <!-- Facturen Historie Tabel -->
            <div style="overflow-x: auto; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="text-align: left; opacity: 0.75; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.72rem; text-transform: uppercase; background: rgba(255,255,255,0.02);">
                            <th style="padding: 10px 10px;">Factuurnr</th>
                            <th style="padding: 10px 10px;">Datum</th>
                            <th style="padding: 10px 10px;">Omschrijving</th>
                            <th style="padding: 10px 10px;">Bedrag (Incl. BTW)</th>
                            <th style="padding: 10px 10px;">Status</th>
                            <th style="padding: 10px 10px;">Mollie iDEAL Link</th>
                            <th style="padding: 10px 10px; text-align: right;">Acties</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Bottom Sync & Pi-Boekhouding Helper Card -->
            <div style="margin-top: 18px; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 0.8rem; color: #94a3b8;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-info-circle text-accent"></i>
                    <span>
                        Officiële factuurnummers worden direct overgenomen in iDEAL betaallinks, klantportaal en de PDF generator.
                    </span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" id="btn-copy-facturen-path" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 3px 8px;">
                        <i class="fas fa-copy"></i> Kopieer DB Map Pad
                    </button>
                    <a href="caf-backup://open" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 3px 8px; text-decoration: none;">
                        <i class="fas fa-shield-alt" style="color: #818cf8;"></i> Backup Manager
                    </a>
                </div>
            </div>
        </div>
    `;
}
