/**
 * @file crm/status/js/modules/sla-signer.js
 * Contract & Service Level Agreement (SLA) Generator & Digitaal Handtekening Systeem.
 * Genereert officiële overeenkomsten conform de Creation+Alt+Fix 2027 voorwaarden met canvas handtekening.
 * Creation+Alt+Fix CRM (2026/2027)
 */

import { escapeHtml, formatCurrency, SUBSCRIPTION_PLANS } from "../../../js/firebase-config.js";
import { Schemas } from "../../../js/core/schemas.js";

/**
 * Genereert de contractuele specificaties voor een gekozen 2027 abonnementsplan
 * @param {string} planId 
 * @param {Object} projectData 
 * @returns {Object} Contract details
 */
export function generateSlaContractDetails(planId, projectData = {}) {
    const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS['managed_nl'] || { name: 'Managed Cloud Hosting', price: '150,00' };
    const clientName = projectData.client || projectData.companyName || 'Opdrachtgever';
    const domain = projectData.domainName || projectData.domain || 'domeinnaam.nl';
    const cleanPrice = parseFloat(String(plan.price).replace(',', '.'));

    return {
        contractNumber: `SLA-2027-${(projectData.id || 'CAF').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`,
        planId: planId,
        planName: plan.name,
        annualPrice: cleanPrice,
        serviceMinutesIncluded: planId === 'transition_2027_loyalty' || planId.startsWith('managed_') ? 30 : 60,
        uptimeTarget: "99.9% Streefnorm Uptime (Inspanningsverplichting)",
        uptimeSidenote: "Hosting en cloudinfrastructuur worden geleverd via externe datacenterproviders (o.a. Vimexx NVMe Cloud). Creation+Alt+Fix bewaakt de werking 24/7 proactief via DoH-healthchecks. De uptime-norm van 99,9% geldt als een inspanningsverplichting; storingen, datacenterincidenten of onderhoud bij de externe hostingpartij vallen buiten de directe invloed en gelden als overmacht.",
        termAndRenewal: "12 maanden (B2B stilzwijgend verlengd met 12 maanden, 1 maand opzegtermijn)",
        dpaIncluded: "Inclusief Verwerkersovereenkomst conform Artikel 28 AVG (Creation+Alt+Fix als verwerker)",
        backupSchedule: "Wekelijkse offsite cloudback-up (30 dagen bewaartermijn)",
        sslSecurity: "Gratis Let's Encrypt Wildcard SSL & HSTS / DNSSEC ondersteuning",
        supportChannel: "info@creationaltfix.nl & Realtime In-App Klantenportaal Chat",
        termsUrl: "https://creationaltfix.nl/voorwaarden/",
        domain: domain,
        clientName: clientName
    };
}

/**
 * Initialiseert het handtekeningcanvas in een container
 * @param {HTMLCanvasElement} canvas 
 * @returns {{ getSignatureDataUrl: () => string, clear: () => void, hasSignature: () => boolean }}
 */
export function initSignaturePad(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;

    // Canvas resolutie aanpassen aan DPI
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = '#38bdf8'; // Creation+Alt+Fix cyaan
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        hasDrawn = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    // Mouse listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    // Touch listeners voor mobiel/tablet
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);

    return {
        getSignatureDataUrl: () => (hasDrawn ? canvas.toDataURL('image/png') : ''),
        clear: () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasDrawn = false;
        },
        hasSignature: () => hasDrawn
    };
}

/**
 * Bouwt de HTML voor het interactieve digitale handtekening en akkoord modal
 * @param {Object} contractDetails 
 * @returns {string} HTML string
 */
export function renderSlaSigningModalHtml(contractDetails) {
    return `
        <div id="sla-signing-modal" class="modal-overlay" style="position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 16px;">
            <div class="modal-card" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; max-width: 580px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; color: #fff; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 600;">Hosting & Service Overeenkomst 2027</h3>
                        <span style="font-size: 12px; opacity: 0.6;">Dossier: ${escapeHtml(contractDetails.contractNumber)}</span>
                    </div>
                    <button id="close-sla-modal" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">&times;</button>
                </div>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.5; margin-bottom: 18px;">
                    <div style="margin-bottom: 6px;"><strong>Opdrachtgever:</strong> ${escapeHtml(contractDetails.clientName)}</div>
                    <div style="margin-bottom: 6px;"><strong>Gedekt Domein:</strong> ${escapeHtml(contractDetails.domain)}</div>
                    <div style="margin-bottom: 6px;"><strong>Dienstverlener:</strong> Creation+Alt+Fix (Allard Veldman)</div>
                    <div style="margin-bottom: 6px;"><strong>Pakket:</strong> ${escapeHtml(contractDetails.planName)} (${formatCurrency(contractDetails.annualPrice)} / jaar excl. BTW)</div>
                    <div style="margin-bottom: 6px;"><strong>Inbegrepen Service:</strong> ${contractDetails.serviceMinutesIncluded} minuten per jaar voor contentwijzigingen</div>
                    <div style="margin-bottom: 6px;"><strong>Beschikbaarheid (SLA):</strong> ${escapeHtml(contractDetails.uptimeTarget || '99.9% Streefnorm Uptime (Inspanningsverplichting)')}</div>
                    <div style="margin-bottom: 6px;"><strong>Back-up & Monitoring:</strong> ${escapeHtml(contractDetails.backupSchedule)}</div>
                    <div style="margin-bottom: 6px;"><strong>Looptijd & Verlenging:</strong> ${escapeHtml(contractDetails.termAndRenewal || '12 maanden (B2B stilzwijgend verlengd)')}</div>
                    <div style="margin-bottom: 6px;"><strong>Gegevensbescherming:</strong> ${escapeHtml(contractDetails.dpaIncluded || 'Verwerkersovereenkomst Art. 28 AVG inbegrepen')}</div>
                    ${contractDetails.uptimeSidenote ? `
                    <div style="margin-top: 8px; padding: 8px 10px; background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; border-radius: 4px; font-size: 11.5px; line-height: 1.4; color: #94a3b8;">
                        <strong style="color: #38bdf8;">Sidenote Externe Hosting:</strong> ${escapeHtml(contractDetails.uptimeSidenote)}
                    </div>` : ''}
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12.5px; font-weight: 500; margin-bottom: 6px;">Ondertekenaar (Volledige Naam):</label>
                    <input type="text" id="sla-signer-name" value="${escapeHtml(contractDetails.clientName)}" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 8px 12px; color: #fff; font-size: 13px;">
                </div>

                <div style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                        <label style="font-size: 12.5px; font-weight: 500;">Digitale Handtekening (Teken met muis of vinger):</label>
                        <button id="clear-signature" style="background: none; border: none; color: #38bdf8; font-size: 11px; cursor: pointer;">Wissen</button>
                    </div>
                    <div style="border: 1px dashed rgba(255,255,255,0.25); border-radius: 8px; background: rgba(0,0,0,0.4); height: 130px; position: relative;">
                        <canvas id="sla-signature-canvas" style="width: 100%; height: 100%; display: block; cursor: crosshair;"></canvas>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; opacity: 0.85; cursor: pointer;">
                        <input type="checkbox" id="sla-terms-agree" style="margin-top: 2px;">
                        <span>Ik verklaar bevoegd te zijn namens de Opdrachtgever en ga uitdrukkelijk akkoord met het Creation+Alt+Fix 2027 hostingvoorstel, de <a href="https://creationaltfix.nl/voorwaarden/" target="_blank" style="color: #38bdf8; text-decoration: underline;">Algemene Voorwaarden</a> (incl. 12 mnd B2B stilzwijgende verlenging en art. 6:119a BW rente) en de Verwerkersovereenkomst conform Artikel 28 AVG.</span>
                    </label>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="cancel-sla-btn" style="padding: 8px 16px; border-radius: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; font-size: 13px;">Annuleren</button>
                    <button id="submit-sla-btn" style="padding: 8px 20px; border-radius: 6px; background: #0284c7; border: none; color: #fff; font-weight: 600; cursor: pointer; font-size: 13px;">
                        ✍️ Digitaal Ondertekenen & Bevestigen
                    </button>
                </div>
            </div>
        </div>
    `;
}
