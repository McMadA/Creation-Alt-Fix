/**
 * Creation+Alt+Fix - Admin Lead Factory Module
 * Beheert de 24/7 "Concept Stapel" review UI, preview modals en 1-klik outreach acties.
 */

import { escapeHtml, sanitizeUrl } from "../../../js/crm-config.js";

let _leads = [];
let _activeFilter = 'concept_ready';
let _searchTerm = '';

/**
 * Initialiseert de Autonome Leads view in het CRM Admin Dashboard
 */
export function initLeadFactoryModule(leads = [], handlers = {}) {
    _leads = leads || [];

    // 1. Bereken KPI's en update sidebar badge
    updateFactoryKPIs(_leads);

    // 2. Render de kaartenstapel
    renderLeadCards(_leads, handlers);

    // 3. Setup zoekbalk listener
    const searchInput = document.getElementById('factory-search-input');
    if (searchInput && !searchInput._hasListener) {
        searchInput.addEventListener('input', (e) => {
            _searchTerm = (e.target.value || '').toLowerCase().trim();
            renderLeadCards(_leads, handlers);
        });
        searchInput._hasListener = true;
    }

    // 4. Setup statusfilter listener
    const statusFilter = document.getElementById('factory-status-filter');
    if (statusFilter && !statusFilter._hasListener) {
        statusFilter.addEventListener('change', (e) => {
            _activeFilter = e.target.value;
            renderLeadCards(_leads, handlers);
        });
        statusFilter._hasListener = true;
    }

    // 5. Setup Refresh knop
    const refreshBtn = document.getElementById('btn-refresh-lead-factory');
    if (refreshBtn && !refreshBtn._hasListener) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            if (handlers.onRefresh) await handlers.onRefresh();
            await checkBridgeStatus(handlers);
            refreshBtn.classList.remove('fa-spin');
        });
        refreshBtn._hasListener = true;
    }

    // 6. Setup Trigger Cyclus knop (start direct via Lokale Bridge)
    const triggerBtn = document.getElementById('btn-trigger-factory-cycle');
    if (triggerBtn && !triggerBtn._hasListener) {
        triggerBtn.addEventListener('click', async () => {
            await handleTriggerBridgeScan(handlers);
        });
        triggerBtn._hasListener = true;
    }

    // 7. Setup 24/7 Daemon Toggle knop
    const daemonBtn = document.getElementById('btn-toggle-daemon');
    if (daemonBtn && !daemonBtn._hasListener) {
        daemonBtn.addEventListener('click', async () => {
            await handleToggleBridgeDaemon(handlers);
        });
        daemonBtn._hasListener = true;
    }

    // 8. Setup Modal Preview Controls
    setupPreviewModalListeners();

    // 9. Start Bridge Polling & Status Check
    checkBridgeStatus(handlers);
    if (!window._cafBridgePollInterval) {
        window._cafBridgePollInterval = setInterval(() => {
            const view = document.getElementById('view-lead-factory');
            if (view && !view.classList.contains('hidden')) {
                checkBridgeStatus(handlers);
            }
        }, 5000);
    }
}

let _bridgeToken = '';
let _isBridgeOnline = false;
let _isDaemonActive = false;

/**
 * Haalt de auth token op voor de bridge
 */
async function getBridgeAuthToken() {
    if (_bridgeToken) return _bridgeToken;
    try {
        const resp = await fetch('./data/bridge-token.json');
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.token) {
                _bridgeToken = data.token;
                return _bridgeToken;
            }
        }
    } catch {}
    _bridgeToken = localStorage.getItem('caf_bridge_token') || '';
    return _bridgeToken;
}

/**
 * Controleert de status van de lokale bridge op 127.0.0.1:3847
 */
export async function checkBridgeStatus(handlers = {}) {
    const badge = document.getElementById('bridge-status-badge');
    const dot = document.getElementById('bridge-status-dot');
    const text = document.getElementById('bridge-status-text');
    const daemonBtnText = document.getElementById('daemon-btn-text');
    const daemonIcon = document.getElementById('daemon-icon');

    try {
        const token = await getBridgeAuthToken();
        const headers = token ? { 'x-caf-auth': token } : {};
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch('http://127.0.0.1:3847/api/status', { 
            headers,
            signal: controller.signal 
        });
        clearTimeout(timeout);

        if (resp.ok) {
            const data = await resp.json();
            _isBridgeOnline = true;
            _isDaemonActive = data.isDaemonActive;

            if (badge) {
                badge.style.background = 'rgba(52, 211, 153, 0.2)';
                badge.style.color = '#34d399';
                badge.style.borderColor = 'rgba(52, 211, 153, 0.4)';
            }
            if (dot) dot.style.color = '#34d399';
            if (text) text.textContent = 'Bridge: Verbonden (3847)';

            if (daemonBtnText && daemonIcon) {
                if (_isDaemonActive) {
                    daemonBtnText.textContent = '24/7 Modus: Pauzeren';
                    daemonIcon.className = 'fas fa-pause';
                    daemonIcon.style.color = '#fbbf24';
                } else {
                    daemonBtnText.textContent = '24/7 Modus: Starten';
                    daemonIcon.className = 'fas fa-play';
                    daemonIcon.style.color = '#34d399';
                }
            }

            // Werk console drawer bij als er logs zijn
            if (data.recentLogs && data.recentLogs.length > 0) {
                updateConsoleDrawer(data.recentLogs, data.isCycleRunning);
            }

            return data;
        }
    } catch (err) {
        _isBridgeOnline = false;
        if (badge) {
            badge.style.background = 'rgba(239, 68, 68, 0.2)';
            badge.style.color = '#f87171';
            badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        }
        if (dot) dot.style.color = '#f87171';
        if (text) text.textContent = 'Bridge: Offline';
    }
    return { online: false };
}

/**
 * Start een live scan via de lokale bridge
 */
async function handleTriggerBridgeScan(handlers = {}) {
    const triggerBtn = document.getElementById('btn-trigger-factory-cycle');
    const spinIcon = document.getElementById('factory-spin-icon');
    const triggerText = document.getElementById('factory-trigger-btn-text');

    if (!_isBridgeOnline) {
        alert("De lokale Factory Bridge server is momenteel niet actief.\n\nStart de bridge op de achtergrond via:\n- Dubbelklik op 'scripts/start-lead-factory-bridge.bat'\n- Of voer uit in de terminal: npm run bridge:start");
        return;
    }

    const token = await getBridgeAuthToken();

    try {
        if (spinIcon) spinIcon.className = 'fas fa-spinner fa-spin';
        if (triggerText) triggerText.textContent = 'Scan gestart...';

        const resp = await fetch('http://127.0.0.1:3847/api/trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-caf-auth': token
            }
        });

        if (resp.status === 202) {
            // Open console drawer
            const drawer = document.getElementById('factory-activity-drawer');
            if (drawer) drawer.classList.remove('hidden');

            pollRunningCycle(handlers);
        } else {
            const errData = await resp.json().catch(() => ({}));
            alert(errData.error || "Kon scan niet starten.");
        }
    } catch (e) {
        alert("Fout bij communicatie met lokale bridge: " + e.message);
    } finally {
        if (spinIcon) spinIcon.className = 'fas fa-bolt';
        if (triggerText) triggerText.textContent = 'Nieuwe Lead Scannen';
    }
}

/**
 * Schakelt de 24/7 daemon in of uit via de bridge
 */
async function handleToggleBridgeDaemon(handlers = {}) {
    if (!_isBridgeOnline) {
        alert("De lokale Factory Bridge server is offline. Start eerst 'scripts/start-lead-factory-bridge.bat'.");
        return;
    }

    const token = await getBridgeAuthToken();
    const endpoint = _isDaemonActive ? '/api/daemon/stop' : '/api/daemon/start';

    try {
        const resp = await fetch(`http://127.0.0.1:3847${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-caf-auth': token
            }
        });

        if (resp.ok) {
            await checkBridgeStatus(handlers);
            alert(_isDaemonActive ? "24/7 Autonome Daemon is geactiveerd! Hij scant nu elke 30 minuten." : "24/7 Autonome Daemon is gepauzeerd.");
        }
    } catch (e) {
        alert("Fout bij schakelen van 24/7 modus: " + e.message);
    }
}

/**
 * Pollt de actieve cyclus tot voltooiing en ververst het dashboard
 */
function pollRunningCycle(handlers = {}) {
    const pollInterval = setInterval(async () => {
        const status = await checkBridgeStatus(handlers);
        if (!status || !status.isCycleRunning) {
            clearInterval(pollInterval);
            const drawerStatus = document.getElementById('factory-drawer-status');
            if (drawerStatus) drawerStatus.innerHTML = '✅ <span style="color:#34d399;">Cyclus voltooid!</span>';
            if (handlers.onRefresh) await handlers.onRefresh();
        }
    }, 2500);
}

/**
 * Rendert realtime logberichten in de activity drawer
 */
function updateConsoleDrawer(logs = [], isRunning = false) {
    const drawer = document.getElementById('factory-activity-drawer');
    const container = document.getElementById('factory-console-output');
    const drawerStatus = document.getElementById('factory-drawer-status');

    if (!container) return;

    if (isRunning && drawer) {
        drawer.classList.remove('hidden');
    }

    if (drawerStatus) {
        drawerStatus.innerHTML = isRunning 
            ? '<i class="fas fa-circle-notch fa-spin" style="color: #38bdf8;"></i> Bezig met crawlen & agy generatie...'
            : 'Gereed';
    }

    container.innerHTML = logs.map(l => {
        let color = '#cbd5e1';
        if (l.type === 'error') color = '#f87171';
        else if (l.type === 'success') color = '#34d399';
        else if (l.type === 'action') color = '#38bdf8';
        return `<div><span style="color:#64748b;">[${escapeHtml(l.time)}]</span> <span style="color:${color};">${escapeHtml(l.text)}</span></div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
}


/**
 * Berekent de statistieken en werkt de KPI kaarten bij
 */
export function updateFactoryKPIs(leads = []) {
    const readyCount = leads.filter(l => l.status === 'concept_ready').length;
    const sentCount = leads.filter(l => l.status === 'sent' || l.status === 'email_sent').length;
    const whatsappCount = leads.filter(l => l.status === 'whatsapp_sent').length;
    const totalCount = leads.length;

    const elReady = document.getElementById('kpi-factory-ready');
    const elSent = document.getElementById('kpi-factory-sent');
    const elWhatsApp = document.getElementById('kpi-factory-whatsapp');
    const elTotal = document.getElementById('kpi-factory-total');
    const badgeSidebar = document.getElementById('admin-lead-factory-count');

    if (elReady) elReady.textContent = readyCount;
    if (elSent) elSent.textContent = sentCount;
    if (elWhatsApp) elWhatsApp.textContent = whatsappCount;
    if (elTotal) elTotal.textContent = totalCount;
    if (badgeSidebar) {
        badgeSidebar.textContent = readyCount;
        if (readyCount > 0) {
            badgeSidebar.style.background = 'rgba(56, 189, 248, 0.25)';
            badgeSidebar.style.color = '#38bdf8';
        } else {
            badgeSidebar.style.background = 'rgba(255, 255, 255, 0.08)';
            badgeSidebar.style.color = '#94a3b8';
        }
    }
}

/**
 * Rendert de grid van concept cards
 */
export function renderLeadCards(leads = [], handlers = {}) {
    const container = document.getElementById('factory-leads-container');
    if (!container) return;

    // Filteren op status en zoekterm
    let filtered = leads.filter(lead => {
        if (_activeFilter !== 'all') {
            if (_activeFilter === 'concept_ready' && lead.status !== 'concept_ready') return false;
            if (_activeFilter === 'sent' && lead.status !== 'sent' && lead.status !== 'email_sent' && lead.status !== 'whatsapp_sent') return false;
            if (_activeFilter === 'skipped' && lead.status !== 'skipped' && lead.status !== 'skipped_has_website') return false;
        }

        if (_searchTerm) {
            const str = `${lead.name} ${lead.category || ''} ${lead.address || ''} ${lead.phone || ''}`.toLowerCase();
            if (!str.includes(_searchTerm)) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(15,23,42,0.6); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px;">
                <i class="fas fa-magic" style="font-size: 2.5rem; color: #38bdf8; margin-bottom: 16px; opacity: 0.6;"></i>
                <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 8px;">Geen concepten gevonden</h3>
                <p style="color: var(--color-text-secondary); max-width: 450px; margin: 0 auto 20px; font-size: 0.9rem;">
                    Er zijn momenteel geen leads die voldoen aan de geselecteerde filters. Start een scan via de knop 'Nieuwe Lead Scannen' of via 'npm run factory:run'.
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(lead => renderSingleLeadCard(lead)).join('');

    // Koppel interactieve knoppen
    attachCardActionListeners(container, leads, handlers);
}

/**
 * Genereert de HTML voor een individuele concept kaart
 */
function renderSingleLeadCard(lead) {
    const isReady = lead.status === 'concept_ready';
    const isSent = lead.status === 'sent' || lead.status === 'email_sent';
    const isWhatsApp = lead.status === 'whatsapp_sent';

    let statusBadge = `<span class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4);"><i class="fas fa-sparkles"></i> Klaar voor Review</span>`;
    if (isSent) {
        statusBadge = `<span class="badge" style="background: rgba(52,211,153,0.2); color: #34d399; border: 1px solid rgba(52,211,153,0.4);"><i class="fas fa-check"></i> E-mail Verzonden</span>`;
    } else if (isWhatsApp) {
        statusBadge = `<span class="badge" style="background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4);"><i class="fab fa-whatsapp"></i> WhatsApp Contact</span>`;
    } else if (lead.status?.includes('skipped')) {
        statusBadge = `<span class="badge" style="background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.25);">Gearchiveerd</span>`;
    }

    const ratingStars = lead.rating ? `⭐ ${lead.rating} (${lead.reviewsCount || 0} reviews)` : '⭐ 5.0 (Nieuw)';
    const cleanUrl = lead.liveUrl || `https://creationaltfix.nl/concept/${lead.slug}/`;
    const safeLiveUrl = sanitizeUrl(cleanUrl);

    return `
        <div class="admin-card lead-card" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.12); padding: 22px; transition: transform 0.2s, border-color 0.2s;">
            <div>
                <!-- Top Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 10px;">
                    <div>
                        <h3 style="color: #fff; font-size: 1.15rem; font-weight: 700; margin: 0 0 4px 0; line-height: 1.3;">
                            ${escapeHtml(lead.name)}
                        </h3>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            <span style="font-size: 0.78rem; color: #38bdf8; font-weight: 600;">${escapeHtml(lead.category || 'ZZP Vakman')}</span>
                            <span style="font-size: 0.78rem; color: #94a3b8;">•</span>
                            <span style="font-size: 0.78rem; color: #fbbf24;">${ratingStars}</span>
                        </div>
                    </div>
                    <div>
                        ${statusBadge}
                    </div>
                </div>

                <!-- Archetype & Pricing Pills -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px;">
                    <span style="font-size: 0.73rem; padding: 2px 8px; border-radius: 4px; background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);">
                        <i class="fas fa-bullseye"></i> ${escapeHtml(lead.archetypeLabel || 'Vakmanschap (Archetype A)')}
                    </span>
                    <span style="font-size: 0.73rem; padding: 2px 8px; border-radius: 4px; background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25);">
                        <i class="fas fa-tag"></i> Realisatie € 199,- • Hosting € 150,-/jr
                    </span>
                </div>

                <!-- Contact & Adres details -->
                <div style="font-size: 0.84rem; color: #cbd5e1; margin-bottom: 16px; line-height: 1.5; background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    ${lead.address ? `<div><i class="fas fa-map-marker-alt" style="color: #ef4444; width: 16px;"></i> ${escapeHtml(lead.address)}</div>` : ''}
                    ${lead.phone ? `<div><i class="fas fa-phone-alt" style="color: #38bdf8; width: 16px;"></i> <a href="tel:${escapeHtml(lead.phone)}" style="color: #cbd5e1;">${escapeHtml(lead.phone)}</a></div>` : ''}
                    <div><i class="fas fa-globe" style="color: #fbbf24; width: 16px;"></i> ${lead.hasWebsite ? escapeHtml(lead.website) : '<strong style="color: #f87171;">Geen website op Google Maps</strong>'}</div>
                </div>

                <!-- Pitch Hook preview -->
                <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 18px; line-height: 1.45; font-style: italic; border-left: 2px solid #38bdf8; padding-left: 10px;">
                    "${escapeHtml(lead.pitchHook || 'Geen pitch beschikbaar')}"
                </div>
            </div>

            <!-- Footer Knoppen -->
            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-sm btn-preview-concept" data-url="${safeLiveUrl}" data-name="${escapeHtml(lead.name)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fas fa-eye text-accent"></i> <span>Live Preview</span>
                    </button>
                    <button class="btn btn-secondary btn-sm btn-view-pitch" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fas fa-envelope-open-text" style="color: #fbbf24;"></i> <span>Bekijk Pitch</span>
                    </button>
                </div>

                <!-- Primaire 1-Klik Acties -->
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary btn-sm btn-send-email-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #2563eb;">
                        <i class="fas fa-paper-plane"></i> <span>1-Klik Mail</span>
                    </button>
                    ${lead.hasWhatsApp ? `
                        <button class="btn btn-secondary btn-sm btn-send-whatsapp-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #10b981; border-color: rgba(16,185,129,0.3);">
                            <i class="fab fa-whatsapp"></i> <span>WhatsApp</span>
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm btn-reject-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="color: #ef4444; border-color: rgba(239,68,68,0.25);" title="Afwijzen / Archiveren">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Koppelt event handlers aan de knoppen van de kaarten
 */
function attachCardActionListeners(container, leads, handlers) {
    // 1. Live Preview Knop
    container.querySelectorAll('.btn-preview-concept').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            const name = btn.getAttribute('data-name');
            openConceptPreviewModal(url, name);
        });
    });

    // 2. Pitch Bekijken Knop
    container.querySelectorAll('.btn-view-pitch').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (lead) openPitchModal(lead, handlers);
        });
    });

    // 3. 1-Klik E-mail Verzenden
    container.querySelectorAll('.btn-send-email-action').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (lead && handlers.onSendEmail) {
                await handlers.onSendEmail(lead);
            }
        });
    });

    // 4. WhatsApp Versturen
    container.querySelectorAll('.btn-send-whatsapp-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (lead) {
                const text = encodeURIComponent(lead.pitch?.whatsAppText || `Hallo ${lead.name}, ik heb een website concept voor je klaarstaan: ${lead.liveUrl}`);
                const waUrl = `https://wa.me/${lead.whatsAppNumber}?text=${text}`;
                window.open(waUrl, '_blank');
                if (handlers.onUpdateStatus) {
                    handlers.onUpdateStatus(lead, 'whatsapp_sent');
                }
            }
        });
    });

    // 5. Afwijzen / Archiveren
    container.querySelectorAll('.btn-reject-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (lead && confirm(`Weet je zeker dat je concept voor "${lead.name}" wilt archiveren?`)) {
                if (handlers.onUpdateStatus) {
                    handlers.onUpdateStatus(lead, 'skipped');
                }
            }
        });
    });
}

/**
 * Opent het interactieve Responsive Preview Modal
 */
export function openConceptPreviewModal(url, title = 'Concept Website') {
    const modal = document.getElementById('factory-preview-modal');
    const iframe = document.getElementById('factory-preview-iframe');
    const titleEl = document.getElementById('preview-modal-title');
    const urlBadge = document.getElementById('preview-modal-url-badge');
    const extLink = document.getElementById('preview-external-link');

    if (!modal || !iframe) return;

    if (titleEl) titleEl.textContent = title;
    if (urlBadge) urlBadge.textContent = url;
    if (extLink) extLink.href = url;

    iframe.src = url;
    modal.classList.remove('hidden');
}

/**
 * Setup modal listeners (Desktop / Mobile toggle & sluiten)
 */
function setupPreviewModalListeners() {
    const modal = document.getElementById('factory-preview-modal');
    const iframe = document.getElementById('factory-preview-iframe');
    const btnClose = document.getElementById('btn-close-preview-modal');
    const btnDesktop = document.getElementById('btn-preview-device-desktop');
    const btnMobile = document.getElementById('btn-preview-device-mobile');

    if (btnClose && !btnClose._hasListener) {
        btnClose.addEventListener('click', () => {
            if (modal) modal.classList.add('hidden');
            if (iframe) iframe.src = 'about:blank';
        });
        btnClose._hasListener = true;
    }

    if (btnDesktop && !btnDesktop._hasListener) {
        btnDesktop.addEventListener('click', () => {
            if (iframe) {
                iframe.style.width = '100%';
                btnDesktop.classList.add('btn-primary');
                btnDesktop.classList.remove('btn-secondary');
                btnMobile.classList.remove('btn-primary');
                btnMobile.classList.add('btn-secondary');
            }
        });
        btnDesktop._hasListener = true;
    }

    if (btnMobile && !btnMobile._hasListener) {
        btnMobile.addEventListener('click', () => {
            if (iframe) {
                iframe.style.width = '375px';
                btnMobile.classList.add('btn-primary');
                btnMobile.classList.remove('btn-secondary');
                btnDesktop.classList.remove('btn-primary');
                btnDesktop.classList.add('btn-secondary');
            }
        });
        btnMobile._hasListener = true;
    }
}

/**
 * Toont een inspectievenster voor de e-mail & WhatsApp pitch met tabbladen
 */
function openPitchModal(lead, handlers) {
    const pitch = lead.pitch || {};
    const subject = pitch.subject || `Concept website voor ${lead.name}`;
    const plainText = pitch.bodyPlain || '';
    const htmlBody = pitch.bodyHtml || `<p>${escapeHtml(plainText)}</p>`;
    const whatsAppText = pitch.whatsAppText || '';
    const archetypeLabel = pitch.archetypeLabel || lead.archetypeLabel || 'Vakmanschap (Archetype A)';

    const mailtoUrl = `mailto:${encodeURIComponent(lead.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;

    const modalHtml = `
        <div id="factory-pitch-detail-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: #0B0F19; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; width: 95%; max-width: 780px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
                
                <!-- Modal Header -->
                <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(15,23,42,0.95);">
                    <div>
                        <h3 style="color: #fff; margin: 0 0 4px 0; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-envelope-open-text text-accent"></i> Acquisitie Pitch: ${escapeHtml(lead.name)}
                        </h3>
                        <span style="font-size: 0.76rem; color: #a5b4fc; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); padding: 2px 8px; border-radius: 4px;">
                            <i class="fas fa-bullseye"></i> ${escapeHtml(archetypeLabel)}
                        </span>
                    </div>
                    <button id="btn-close-pitch-detail" class="btn btn-secondary btn-sm" style="color: #ef4444;"><i class="fas fa-times"></i></button>
                </div>

                <!-- Tab Selectie -->
                <div style="display: flex; gap: 8px; padding: 12px 20px; background: rgba(15,23,42,0.6); border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <button id="tab-pitch-html" class="btn btn-primary btn-sm" style="padding: 6px 14px;"><i class="fas fa-code"></i> HTML E-mail</button>
                    <button id="tab-pitch-plain" class="btn btn-secondary btn-sm" style="padding: 6px 14px;"><i class="fas fa-align-left"></i> Tekst Mail (Spam-Safe)</button>
                    <button id="tab-pitch-wa" class="btn btn-secondary btn-sm" style="padding: 6px 14px; color: #10b981; border-color: rgba(16,185,129,0.3);"><i class="fab fa-whatsapp"></i> WhatsApp Bericht</button>
                </div>

                <!-- Tab Inhoud: HTML Mail -->
                <div id="content-pitch-html" style="padding: 20px; overflow-y: auto; flex: 1; background: #0f172a;">
                    <div style="background: rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.88rem; color: #cbd5e1;">
                        <strong style="color: #fff;">Onderwerp:</strong> ${escapeHtml(subject)}
                    </div>
                    <div style="background: #ffffff; border-radius: 8px; padding: 20px; color: #1e293b;">
                        ${htmlBody}
                    </div>
                </div>

                <!-- Tab Inhoud: Tekst Mail (Verborgen op start) -->
                <div id="content-pitch-plain" style="padding: 20px; overflow-y: auto; flex: 1; font-family: monospace; font-size: 0.86rem; color: #cbd5e1; background: #030712; line-height: 1.5; white-space: pre-wrap; display: none;">
<strong>Onderwerp:</strong> ${escapeHtml(subject)}
------------------------------------------------------------
${escapeHtml(plainText)}
                </div>

                <!-- Tab Inhoud: WhatsApp (Verborgen op start) -->
                <div id="content-pitch-wa" style="padding: 24px; overflow-y: auto; flex: 1; background: #0f172a; display: none;">
                    <div style="max-width: 480px; margin: 0 auto; background: #075e54; border-radius: 12px; padding: 16px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <div style="background: #054d44; color: #99f6e4; font-size: 0.78rem; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px; display: inline-block;">
                            <i class="fab fa-whatsapp"></i> WhatsApp naar: ${escapeHtml(lead.phone || 'Onbekend')}
                        </div>
                        <div style="background: #ffffff; color: #1e293b; padding: 14px 16px; border-radius: 8px 8px 0 8px; font-size: 0.9rem; line-height: 1.5; word-break: break-word;">
                            ${escapeHtml(whatsAppText)}
                        </div>
                        ${lead.whatsAppNumber ? `
                            <div style="margin-top: 16px; text-align: center;">
                                <a href="https://wa.me/${lead.whatsAppNumber}?text=${encodeURIComponent(whatsAppText)}" target="_blank" class="btn btn-primary btn-sm" style="background: #25d366; color: #000; font-weight: 700;">
                                    <i class="fab fa-whatsapp"></i> Nu Openen in WhatsApp Web
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Modal Footer Knoppen -->
                <div style="padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; gap: 10px; background: rgba(15,23,42,0.95); flex-wrap: wrap;">
                    <div style="display: flex; gap: 8px;">
                        <button id="btn-copy-pitch-subject" class="btn btn-secondary btn-sm"><i class="fas fa-copy"></i> Kopieer Onderwerp</button>
                        <button id="btn-copy-pitch-text" class="btn btn-secondary btn-sm"><i class="fas fa-file-alt"></i> Kopieer Tekst</button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <a href="${mailtoUrl}" class="btn btn-secondary btn-sm" style="color: #38bdf8; border-color: rgba(56,189,248,0.3);"><i class="fas fa-external-link-alt"></i> Open in Mail Client</a>
                        <button id="btn-pitch-send-now" class="btn btn-primary btn-sm" style="background: #2563eb;"><i class="fas fa-paper-plane"></i> Verstuur via info@creationaltfix.nl</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    // Tab Switchers
    const tabHtml = div.querySelector('#tab-pitch-html');
    const tabPlain = div.querySelector('#tab-pitch-plain');
    const tabWa = div.querySelector('#tab-pitch-wa');
    const contentHtml = div.querySelector('#content-pitch-html');
    const contentPlain = div.querySelector('#content-pitch-plain');
    const contentWa = div.querySelector('#content-pitch-wa');

    function setActiveTab(activeTab, activeContent) {
        [tabHtml, tabPlain, tabWa].forEach(t => {
            t.classList.remove('btn-primary');
            t.classList.add('btn-secondary');
        });
        [contentHtml, contentPlain, contentWa].forEach(c => c.style.display = 'none');

        activeTab.classList.add('btn-primary');
        activeTab.classList.remove('btn-secondary');
        activeContent.style.display = 'block';
    }

    tabHtml.onclick = () => setActiveTab(tabHtml, contentHtml);
    tabPlain.onclick = () => setActiveTab(tabPlain, contentPlain);
    tabWa.onclick = () => setActiveTab(tabWa, contentWa);

    div.querySelector('#btn-close-pitch-detail').onclick = () => div.remove();
    div.querySelector('#btn-copy-pitch-subject').onclick = () => {
        navigator.clipboard.writeText(subject);
        alert("Onderwerpregel gekopieerd naar klembord!");
    };
    div.querySelector('#btn-copy-pitch-text').onclick = () => {
        navigator.clipboard.writeText(plainText);
        alert("Volledige pitch tekst gekopieerd naar klembord!");
    };
    div.querySelector('#btn-pitch-send-now').onclick = async () => {
        div.remove();
        if (handlers.onSendEmail) await handlers.onSendEmail(lead);
    };
}
