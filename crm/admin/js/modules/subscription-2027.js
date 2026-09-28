/**
 * 2027 Subscription Communication & Migration Engine
 * Module for preparing, proposing, and communicating 2027 hosting & service plans to clients.
 */

import { SUBSCRIPTION_PLANS, escapeHtml, BRANDING } from "../../../js/crm-config.js";
import { getPiBoekhoudingInfo } from "./bookkeeping-data.js";

/**
 * Generates high-converting, professional email proposal text for 2027 subscription transition.
 */
export function generate2027ProposalText(project, planId) {
    const p = project || {};
    const clientName = p.client || p.contactName || p.companyName || 'Beste relatie';
    const domain = p.domainName || p.domain || 'jouw website';
    const clientEmail = (p.email || p.clientEmail || '').trim();
    const targetPlan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS['managed_nl'];
    const info = getPiBoekhoudingInfo(p);
    
    // Determine historical pricing context if available
    const oldPrice = p.subscriptionPrice || (info?.currentPlanId === 'legacy_22' ? '22,00' : null);
    let pricingDetails = `• Jaartarief: € ${targetPlan.price} excl. BTW per jaar`;
    if (planId === 'transition_2027_loyalty') {
        pricingDetails = `• Speciaal Trouwe Klant Tarief 2027: € 95,00 excl. BTW voor 2027 (in plaats van € 150,-)\n• Vanaf 2028: regulier € 150,00 excl. BTW per jaar`;
    } else if (oldPrice && oldPrice !== targetPlan.price) {
        pricingDetails += ` (ter vervanging van het eerdere/historische tarief van € ${oldPrice}/jr)`;
    }

    const portalUrl = p.id ? `https://creationaltfix.nl/crm/status/?id=${encodeURIComponent(p.id)}` : 'https://creationaltfix.nl/crm/status/';

    const loginEmailLine = clientEmail 
        ? `• Inloggen kan direct met jouw e-mailadres: ${clientEmail}`
        : `• Inloggen kan direct met jouw geregistreerde e-mailadres`;

    return `Beste ${clientName},

Ter voorbereiding op het nieuwe jaar 2027 wil ik je graag even op de hoogte stellen van een optimalisatie voor ${domain}.

Om ervoor te zorgen dat jouw website ook in 2027 gegarandeerd snel, veilig en continu online blijft, brengen we al onze relaties onder in onze continue Managed Service & Cloud standaard. Hiermee ben je verzekerd van high-speed NVMe servers, dagelijkse cloudbackups, continue uptime- & SSL-monitoring en proactief technisch onderhoud.

Voor ${domain} hebben we het volgende serviceplan klaargezet:

👉 Serviceplan 2027: ${targetPlan.name}
${pricingDetails}
• Facturatieperiode: Jaarlijks per 1 januari (eerste periode: 2027)
• Inbegrepen specificaties:
  - High-speed NVMe Cloud Hosting & Dataverkeer
  - Domeinregistratie & Automatische DNS-beveiliging
  - Gratis SSL / HTTPS Beveiligingscertificaat (automatische verlenging)
  - Tot 5 Professionele Zakelijke Mailboxen (DKIM/SPF beveiligd)
  - 24/7 Automatische Uptime Monitoring & DDoS mitigatie
  - Dagelijkse Cloud Back-ups met herstelservice
  - Inclusief 30 minuten per jaar gratis service voor kleine content- & tekstwijzigingen (bijv. openingstijden, foto's of contactgegevens bijwerken)
  - Directe telefonische & e-mail ondersteuning bij vragen

Je kunt jouw actuele websitegegevens en dit 2027 abonnement direct inzien en met 1 klik digitaal bevestigen via ons vernieuwde klantenportaal:
🔗 ${portalUrl}

🔐 Inloggen in het vernieuwde CRM / Klantenportaal:
We zijn onlangs overgestapt op een gloednieuw CRM en klantenportaal. Om voor de eerste keer in te loggen:
${loginEmailLine}
• Omdat dit een nieuw systeem is, klik je bij de eerste keer inloggen op "Wachtwoord vergeten?" of "Eerste keer inloggen" om eenmalig jouw wachtwoord in te stellen.
• Je ontvangt dan direct per e-mail een veilige link om jouw eigen wachtwoord aan te maken.
⚠️ Let op: deze e-mail voor wachtwoordherstel kan soms in de spam- / ongewenste e-mailmap belanden. Controleer deze map als je het bericht na een minuutje nog niet in je inbox ziet.

Mocht je hier vooraf vragen over hebben of willen overleggen over specifieke wensen (zoals extra domeinen of een jaarlijkse security APK), laat het me gerust even weten.

Met vriendelijke groet,

Allard
Creation+Alt+Fix
Web: https://creationaltfix.nl
E-mail: info@creationaltfix.nl`;
}

/**
 * Generates a clean WhatsApp message format.
 */
export function generate2027WhatsAppText(project, planId) {
    const p = project || {};
    const clientName = p.client || p.contactName || 'beste';
    const domain = p.domainName || p.domain || 'je website';
    const clientEmail = (p.email || p.clientEmail || '').trim();
    const targetPlan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS['managed_nl'];
    const portalUrl = p.id ? `https://creationaltfix.nl/crm/status/?id=${encodeURIComponent(p.id)}` : 'https://creationaltfix.nl/crm/status/';

    let pricingLine = `Tarief: € ${targetPlan.price},- excl. BTW per jaar (facturatie jan 2027)`;
    if (planId === 'transition_2027_loyalty') {
        pricingLine = `*Speciaal Trouwe Klant Tarief 2027: € 95,-* excl. BTW (ipv € 150,-! Vanaf 2028 pas € 150,-/jr)`;
    }

    const emailNote = clientEmail ? `Inloggen kan met *${clientEmail}*. ` : '';

    return `Hoi ${clientName},

Even een update m.b.t. ${domain} voor 2027! 🚀

Om je website snel, veilig en 24/7 gemonitord te houden, hebben we het hosting- en serviceplan voor komend jaar klaargezet:

*${targetPlan.name}*
${pricingLine}
Inclusief: NVMe hosting, domein & DNS, SSL, zakelijke mail, dagelijkse back-ups, 24/7 uptime monitoring én 30 min. gratis contentwijzigingen per jaar!

Je kunt het plan direct bekijken en bevestigen in je vernieuwde klantenportaal:
${portalUrl}

🔐 *Inloggen in het nieuwe portaal:*
${emailNote}Omdat we zijn overgestapt op een nieuw CRM, klik je bij de 1e keer even op "Wachtwoord vergeten" om je wachtwoord in te stellen (check evt. je spambox voor de resetmail!).

Laat gerust weten als je nog vragen hebt! 👍`;
}

/**
 * Creates and displays the 2027 Subscription Communication Modal.
 */
export function open2027SubscriptionModal({ project, onSavePlan, onSendPortalTicket }) {
    if (!project) return;

    let modal = document.getElementById('modal-2027-subscription');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-2027-subscription';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
        document.body.appendChild(modal);
    }

    const info = getPiBoekhoudingInfo(project);
    const initialPlanId = project.subscriptionPlan2027Id || project.subscriptionPlanId || info?.recommendedPlanId || 'managed_nl';
    const clientName = escapeHtml(project.client || project.companyName || 'Klant');
    const domain = escapeHtml(project.domainName || project.domain || 'Nog geen domein');

    const renderModalContent = (selectedPlanId) => {
        const plan = SUBSCRIPTION_PLANS[selectedPlanId] || SUBSCRIPTION_PLANS['managed_nl'];
        const messageText = generate2027ProposalText(project, selectedPlanId);
        const currentSubName = escapeHtml(project.subscriptionPlanName || info?.currentPlanName || 'Oud / Standaard Tarief');
        const currentPrice = escapeHtml(project.subscriptionPrice || (info?.currentPlanId === 'legacy_22' ? '22,00' : '—'));
        const isConfirmed = project.subscriptionPlan2027Status === 'bevestigd';

        modal.innerHTML = `
            <div style="background: #0f172a; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); display: flex; flex-direction: column;">
                
                <!-- Modal Header -->
                <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.5);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.3rem;">🚀</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; color: #fff; font-weight: 700;">2027 Abonnementsplan Berichten</h3>
                            <span style="font-size: 0.78rem; color: #94a3b8;">Klant: <strong style="color: #38bdf8;">${clientName}</strong> (${domain})</span>
                        </div>
                    </div>
                    <button type="button" id="btn-close-2027-modal" style="background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; padding: 4px 8px;">&times;</button>
                </div>

                <!-- Modal Body -->
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                    
                    <!-- Status Banner -->
                    <div style="background: ${isConfirmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)'}; border: 1px solid ${isConfirmed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)'}; border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 0.72rem; text-transform: uppercase; color: ${isConfirmed ? '#34d399' : '#818cf8'}; font-weight: 700;">
                                ${isConfirmed ? '✅ 2027 Plan Bevestigd door Klant' : '⏳ Status: Migratie voorbereiden / Voorstel verzenden'}
                            </div>
                            <div style="font-size: 0.85rem; color: #e2e8f0; margin-top: 2px;">
                                Huidig: <span style="color: #94a3b8;">${currentSubName} (€ ${currentPrice}/jr)</span> &rarr; Nieuw: <strong style="color: #34d399;">${escapeHtml(plan.name)} (€ ${plan.price}/jr)</strong>
                            </div>
                        </div>
                        <span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; background: rgba(0,0,0,0.4); color: #cbd5e1;">
                            ${project.subscriptionPlan2027Status || 'Concept'}
                        </span>
                    </div>

                    <!-- Plan Selector -->
                    <div>
                        <label style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 6px;">
                            Kies het 2027 Abonnement voor deze klant:
                        </label>
                        <select id="modal-2027-plan-select" class="admin-input" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; cursor: pointer; background: #1e293b; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                            <option value="managed_nl" ${selectedPlanId === 'managed_nl' ? 'selected' : ''}>🌐 Managed Cloud Hosting All-in (.nl) (€ 150,-/jr)</option>
                            <option value="transition_2027_loyalty" ${selectedPlanId === 'transition_2027_loyalty' ? 'selected' : ''}>⭐ Trouwe Klant Overgangstarief 2027 (€ 95,-/jr)</option>
                            <option value="managed_com" ${selectedPlanId === 'managed_com' ? 'selected' : ''}>🌐 Managed Cloud Hosting All-in (.com) (€ 165,-/jr)</option>
                            <option value="managed_multi" ${selectedPlanId === 'managed_multi' ? 'selected' : ''}>🌐 Managed Multi-Domein .nl + .com (€ 175,-/jr)</option>
                            <option value="managed_custom" ${selectedPlanId === 'managed_custom' ? 'selected' : ''}>🌐 Managed Cloud Hosting Custom TLD (€ 175,-/jr)</option>
                            <option value="security_apk" ${selectedPlanId === 'security_apk' ? 'selected' : ''}>🛡️ Jaarlijkse Website & Security APK (€ 350,-/jr)</option>
                            <option value="allin_apk" ${selectedPlanId === 'allin_apk' ? 'selected' : ''}>🚀 Managed Hosting All-in + Security APK Totaal (€ 500,-/jr)</option>
                            <option value="legacy_22" ${selectedPlanId === 'legacy_22' ? 'selected' : ''}>⏳ Historisch Tarief (€ 22,-/jr) [Niet aanbevolen]</option>
                            <option value="internal_project" ${selectedPlanId === 'internal_project' ? 'selected' : ''}>📁 Eigen Intern Project Allard (Vimexx intern)</option>
                            <option value="none" ${selectedPlanId === 'none' ? 'selected' : ''}>❌ Geen Hosting / Rustend (€ 0,-)</option>
                        </select>
                    </div>

                    <!-- Message Preview & Edit -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 600;">
                                Gepersonaliseerd Bericht (E-mail & Portaal):
                            </label>
                            <span style="font-size: 0.72rem; color: #64748b;">Inclusief link naar digitaal akkoord</span>
                        </div>
                        <textarea id="modal-2027-message-body" class="admin-input" rows="9" style="width: 100%; font-family: monospace; font-size: 0.8rem; line-height: 1.45; background: #090d16; border: 1px solid #334155; color: #e2e8f0; border-radius: 6px; padding: 10px;">${escapeHtml(messageText)}</textarea>
                    </div>

                    <!-- Dispatch Actions -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">
                            Direct Berichten & Acties:
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
                            <!-- 1. Send as Portal Ticket -->
                            <button type="button" id="btn-2027-send-portal" class="btn btn-sm" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border: none; font-weight: 600; padding: 9px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <i class="fas fa-comment-alt"></i> Plaats in Klantenportaal
                            </button>

                            <!-- 2. Open Mailto -->
                            <button type="button" id="btn-2027-open-mail" class="btn btn-sm" style="background: #1e293b; border: 1px solid #475569; color: #38bdf8; font-weight: 600; padding: 9px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <i class="fas fa-envelope"></i> Open in E-mail Client
                            </button>

                            <!-- 3. WhatsApp -->
                            <button type="button" id="btn-2027-open-whatsapp" class="btn btn-sm" style="background: #064e3b; border: 1px solid #059669; color: #34d399; font-weight: 600; padding: 9px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <i class="fab fa-whatsapp"></i> Open in WhatsApp
                            </button>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                            <button type="button" id="btn-2027-copy-text" class="btn btn-sm btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;">
                                <i class="fas fa-copy"></i> Kopieer Bericht
                            </button>

                            <button type="button" id="btn-2027-save-only" class="btn btn-sm btn-primary" style="font-size: 0.78rem; padding: 6px 14px;">
                                <i class="fas fa-save"></i> Sla Plan Alleen Op
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        `;

        // Event: Close modal
        modal.querySelector('#btn-close-2027-modal')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Event: Plan select change
        modal.querySelector('#modal-2027-plan-select')?.addEventListener('change', (e) => {
            renderModalContent(e.target.value);
        });

        // Event: Copy Text
        modal.querySelector('#btn-2027-copy-text')?.addEventListener('click', () => {
            const body = modal.querySelector('#modal-2027-message-body')?.value || '';
            navigator.clipboard.writeText(body);
            const btn = modal.querySelector('#btn-2027-copy-text');
            if (btn) {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check" style="color: #34d399;"></i> Gekopieerd!';
                setTimeout(() => btn.innerHTML = orig, 2000);
            }
        });

        // Event: Mailto Link
        modal.querySelector('#btn-2027-open-mail')?.addEventListener('click', () => {
            const body = modal.querySelector('#modal-2027-message-body')?.value || '';
            const email = (project.email || '').trim();
            const subject = encodeURIComponent(`Creation+Alt+Fix: Hosting- & Serviceplan 2027 voor ${domain}`);
            const mailtoUrl = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`;
            navigator.clipboard.writeText(body);
            window.location.href = mailtoUrl;
        });

        // Event: WhatsApp
        modal.querySelector('#btn-2027-open-whatsapp')?.addEventListener('click', () => {
            const waBody = generate2027WhatsAppText(project, selectedPlanId);
            let phone = (project.phone || '').replace(/[^0-9+]/g, '');
            if (phone.startsWith('06')) phone = '31' + phone.slice(1);
            if (phone.startsWith('+')) phone = phone.slice(1);
            const waUrl = phone 
                ? `https://wa.me/${phone}?text=${encodeURIComponent(waBody)}`
                : `https://wa.me/?text=${encodeURIComponent(waBody)}`;
            window.open(waUrl, '_blank');
        });

        // Event: Send as Portal Ticket
        modal.querySelector('#btn-2027-send-portal')?.addEventListener('click', async () => {
            const btn = modal.querySelector('#btn-2027-send-portal');
            const body = modal.querySelector('#modal-2027-message-body')?.value || '';
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verzenden...';

            try {
                if (onSendPortalTicket) {
                    await onSendPortalTicket(project, plan, body);
                }
                btn.innerHTML = '<i class="fas fa-check"></i> Geplaatst in Portaal!';
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 1500);
            } catch (err) {
                console.error("Fout bij plaatsen bericht:", err);
                alert("Kon bericht niet plaatsen in portaal: " + err.message);
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });

        // Event: Save Plan Only
        modal.querySelector('#btn-2027-save-only')?.addEventListener('click', async () => {
            const btn = modal.querySelector('#btn-2027-save-only');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                if (onSavePlan) {
                    await onSavePlan(project, plan);
                }
                btn.innerHTML = '<i class="fas fa-check"></i> Opgeslagen!';
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 1200);
            } catch (err) {
                console.error("Fout bij opslaan plan:", err);
                alert("Kon plan niet opslaan: " + err.message);
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    };

    modal.style.display = 'flex';
    renderModalContent(initialPlanId);
}
