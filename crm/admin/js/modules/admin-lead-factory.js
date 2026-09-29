/**
 * Creation+Alt+Fix - Admin Lead Factory Module
 * Beheert de 24/7 "Concept Stapel" review UI, preview modals en 1-klik outreach acties.
 */

import { escapeHtml, sanitizeUrl } from "../../../js/crm-config.js";

let _leads = [];
let _activeFilter = 'concept_ready';
let _searchTerm = '';
let _factoryHandlers = {};

/**
 * Werkt de tellers en styling van de snelle filterknoppen (pills) bij
 */
function updateFilterPillsUI() {
    const readyCount = _leads.filter(l => l.status === 'concept_ready').length;
    const sentCount = _leads.filter(l => l.status === 'sent' || l.status === 'email_sent').length;
    const skippedCount = _leads.filter(l => l.status === 'skipped' || l.status === 'skipped_has_website').length;
    const totalCount = _leads.length;

    const elReady = document.getElementById('pill-count-ready');
    const elSent = document.getElementById('pill-count-sent');
    const elSkipped = document.getElementById('pill-count-skipped');
    const elAll = document.getElementById('pill-count-all');

    if (elReady) elReady.textContent = readyCount;
    if (elSent) elSent.textContent = sentCount;
    if (elSkipped) elSkipped.textContent = skippedCount;
    if (elAll) elAll.textContent = totalCount;

    document.querySelectorAll('.factory-filter-pill').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        if (filter === _activeFilter) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        }
    });
}

/**
 * Initialiseert de Autonome Leads view in het CRM Admin Dashboard
 */
export function initLeadFactoryModule(leads = [], handlers = {}) {
    _leads = leads || [];
    if (handlers && Object.keys(handlers).length > 0) {
        _factoryHandlers = handlers;
    }

    const readyCount = _leads.filter(l => l.status === 'concept_ready').length;
    const sentCount = _leads.filter(l => l.status === 'sent' || l.status === 'email_sent').length;

    // Als er 0 leads op review wachten, maar er zijn wel verzonden leads, val dan terug op 'all'
    if (readyCount === 0 && sentCount > 0 && _activeFilter === 'concept_ready') {
        _activeFilter = 'all';
    }

    // 1. Bereken KPI's en update sidebar badge en pills
    updateFactoryKPIs(_leads);
    updateFilterPillsUI();

    const statusFilter = document.getElementById('factory-status-filter');
    if (statusFilter) statusFilter.value = _activeFilter;

    // 2. Render de kaartenstapel
    renderLeadCards(_leads, _factoryHandlers);

    // 3. Setup zoekbalk listener
    const searchInput = document.getElementById('factory-search-input');
    if (searchInput && !searchInput._hasListener) {
        searchInput.addEventListener('input', (e) => {
            _searchTerm = (e.target.value || '').toLowerCase().trim();
            renderLeadCards(_leads, _factoryHandlers);
        });
        searchInput._hasListener = true;
    }

    // 4. Setup statusfilter select listener
    if (statusFilter && !statusFilter._hasListener) {
        statusFilter.addEventListener('change', (e) => {
            _activeFilter = e.target.value;
            updateFilterPillsUI();
            renderLeadCards(_leads, _factoryHandlers);
        });
        statusFilter._hasListener = true;
    }

    // 5. Setup Filter Pill knoppen
    document.querySelectorAll('.factory-filter-pill').forEach(pill => {
        if (!pill._hasListener) {
            pill.addEventListener('click', () => {
                _activeFilter = pill.getAttribute('data-filter') || 'all';
                if (statusFilter) statusFilter.value = _activeFilter;
                updateFilterPillsUI();
                renderLeadCards(_leads, _factoryHandlers);
            });
            pill._hasListener = true;
        }
    });

    // 6. Setup KPI Card clicks voor directe navigatie
    const kpiReady = document.getElementById('kpi-card-factory-ready');
    if (kpiReady && !kpiReady._hasListener) {
        kpiReady.addEventListener('click', () => {
            _activeFilter = 'concept_ready';
            if (statusFilter) statusFilter.value = _activeFilter;
            updateFilterPillsUI();
            renderLeadCards(_leads, _factoryHandlers);
        });
        kpiReady._hasListener = true;
    }

    const kpiSent = document.getElementById('kpi-card-factory-sent');
    if (kpiSent && !kpiSent._hasListener) {
        kpiSent.addEventListener('click', () => {
            _activeFilter = 'sent';
            if (statusFilter) statusFilter.value = _activeFilter;
            updateFilterPillsUI();
            renderLeadCards(_leads, _factoryHandlers);
        });
        kpiSent._hasListener = true;
    }

    const kpiWhatsApp = document.getElementById('kpi-card-factory-whatsapp');
    if (kpiWhatsApp && !kpiWhatsApp._hasListener) {
        kpiWhatsApp.addEventListener('click', () => {
            _activeFilter = 'sent';
            if (statusFilter) statusFilter.value = _activeFilter;
            updateFilterPillsUI();
            renderLeadCards(_leads, _factoryHandlers);
        });
        kpiWhatsApp._hasListener = true;
    }

    const kpiTotal = document.getElementById('kpi-card-factory-total');
    if (kpiTotal && !kpiTotal._hasListener) {
        kpiTotal.addEventListener('click', () => {
            _activeFilter = 'all';
            if (statusFilter) statusFilter.value = _activeFilter;
            updateFilterPillsUI();
            renderLeadCards(_leads, _factoryHandlers);
        });
        kpiTotal._hasListener = true;
    }

    // 7. Setup Refresh knop
    const refreshBtn = document.getElementById('btn-refresh-lead-factory');
    if (refreshBtn && !refreshBtn._hasListener) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            if (_factoryHandlers.onRefresh) await _factoryHandlers.onRefresh();
            await checkBridgeStatus(_factoryHandlers);
            refreshBtn.classList.remove('fa-spin');
        });
        refreshBtn._hasListener = true;
    }

    // 8. Setup Trigger Cyclus knop (start direct via Lokale Bridge)
    const triggerBtn = document.getElementById('btn-trigger-factory-cycle');
    if (triggerBtn && !triggerBtn._hasListener) {
        triggerBtn.addEventListener('click', async () => {
            await handleTriggerBridgeScan(_factoryHandlers);
        });
        triggerBtn._hasListener = true;
    }

    // 9. Setup 24/7 Daemon Toggle knop
    const daemonBtn = document.getElementById('btn-toggle-daemon');
    if (daemonBtn && !daemonBtn._hasListener) {
        daemonBtn.addEventListener('click', async () => {
            await handleToggleBridgeDaemon(_factoryHandlers);
        });
        daemonBtn._hasListener = true;
    }

    // 10. Setup Modal Preview Controls
    setupPreviewModalListeners();

    // 11. Start Bridge Polling & Status Check
    checkBridgeStatus(_factoryHandlers);
    if (!window._cafBridgePollInterval) {
        window._cafBridgePollInterval = setInterval(() => {
            const view = document.getElementById('view-lead-factory');
            if (view && !view.classList.contains('hidden')) {
                checkBridgeStatus(_factoryHandlers);
            }
        }, 5000);
    }
}

let _bridgeToken = '';
let _isBridgeOnline = false;
let _isDaemonActive = false;
let _activeBridgeHost = 'http://127.0.0.1:3847';

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
 * Controleert de status van de lokale bridge (127.0.0.1:3847 en localhost:3847)
 */
export async function checkBridgeStatus(handlers = {}) {
    const badge = document.getElementById('bridge-status-badge');
    const dot = document.getElementById('bridge-status-dot');
    const text = document.getElementById('bridge-status-text');
    const daemonBtnText = document.getElementById('daemon-btn-text');
    const daemonIcon = document.getElementById('daemon-icon');

    // Maak statusbadge interactief voor beheerder-diagnostiek
    if (badge && !badge._hasClickListener) {
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', () => {
            if (!_isBridgeOnline) {
                alert("Lead Factory Bridge Status:\n\nDe server draait lokaal op poort 3847.\nAls je op https://portal.creationaltfix.nl zit, kan een browserbeveiliging (zoals Mixed Content in Firefox of Chrome Private Network Access) cross-origin verbinding blokkeren.\n\nTip: Je kunt het CRM ook direct lokaal openen via:\nhttp://127.0.0.1:3847/admin/\n(Daar werkt alles 100% lokaal zonder browserblokkades)");
            } else {
                alert(`Lead Factory Bridge Status: Verbonden!\nActieve host: ${_activeBridgeHost}\n24/7 Daemon: ${_isDaemonActive ? 'Actief' : 'Gepauzeerd'}`);
            }
        });
        badge._hasClickListener = true;
    }

    try {
        const token = await getBridgeAuthToken();
        const headers = token ? { 'x-caf-auth': token } : {};

        // Bepaal kandidaat hosts (huidige loopback origin eerst indien van toepassing)
        const candidates = [];
        if (window.location.port === '3847') candidates.push(window.location.origin);
        candidates.push('http://127.0.0.1:3847', 'http://localhost:3847');

        let resp = null;
        let lastErr = null;

        for (const host of candidates) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 2000);
                const r = await fetch(`${host}/api/status`, { 
                    headers,
                    signal: controller.signal 
                });
                clearTimeout(timeout);
                if (r.ok) {
                    resp = r;
                    _activeBridgeHost = host;
                    break;
                }
            } catch (candErr) {
                lastErr = candErr;
            }
        }

        if (resp && resp.ok) {
            const data = await resp.json();
            _isBridgeOnline = true;
            _isDaemonActive = data.isDaemonActive;

            if (badge) {
                badge.style.background = 'rgba(52, 211, 153, 0.2)';
                badge.style.color = '#34d399';
                badge.style.borderColor = 'rgba(52, 211, 153, 0.4)';
                badge.title = `Bridge actief op ${_activeBridgeHost}. Klik voor details.`;
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
        } else {
            throw lastErr || new Error("Geen respons van bridge");
        }
    } catch (err) {
        _isBridgeOnline = false;
        console.warn('[Lead Factory Bridge] Verbinding controleren:', err);
        if (badge) {
            badge.style.background = 'rgba(239, 68, 68, 0.2)';
            badge.style.color = '#f87171';
            badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            badge.title = 'Bridge offline of geblokkeerd door browser. Klik voor opties.';
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
        alert("De lokale Factory Bridge server is momenteel niet bereikbaar.\n\nControles:\n1. Zorg dat de bridge draait: npm run bridge:start\n2. Open je het dashboard via HTTPS (portal.creationaltfix.nl)? In browsers zoals Firefox kan Mixed Content een verbinding naar 127.0.0.1 blokkeren.\n\nTip: Open het CRM lokaal via: http://127.0.0.1:3847/admin/");
        return;
    }

    const token = await getBridgeAuthToken();

    try {
        if (spinIcon) spinIcon.className = 'fas fa-spinner fa-spin';
        if (triggerText) triggerText.textContent = 'Scan gestart...';

        const resp = await fetch(`${_activeBridgeHost}/api/trigger`, {
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
        alert("De lokale Factory Bridge server is offline. Tip: Open het dashboard via http://127.0.0.1:3847/admin/ of start de bridge.");
        return;
    }

    const token = await getBridgeAuthToken();
    const endpoint = _isDaemonActive ? '/api/daemon/stop' : '/api/daemon/start';

    try {
        const resp = await fetch(`${_activeBridgeHost}${endpoint}`, {
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

    const effectiveHandlers = (handlers && Object.keys(handlers).length > 0) ? handlers : _factoryHandlers;
    const readyCount = leads.filter(l => l.status === 'concept_ready').length;
    const sentCount = leads.filter(l => l.status === 'sent' || l.status === 'email_sent' || l.status === 'whatsapp_sent').length;

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
        if (_activeFilter === 'concept_ready' && sentCount > 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: rgba(15,23,42,0.7); border: 1px solid rgba(56,189,248,0.25); border-radius: 12px;">
                    <i class="fas fa-check-circle" style="font-size: 2.8rem; color: #34d399; margin-bottom: 16px;"></i>
                    <h3 style="color: #fff; font-size: 1.25rem; margin-bottom: 8px;">Alle actieve concepten zijn afgehandeld!</h3>
                    <p style="color: #cbd5e1; max-width: 520px; margin: 0 auto 20px; font-size: 0.95rem; line-height: 1.5;">
                        Er staan momenteel 0 leads in 'Klaar voor Review'. Er staan <strong>${sentCount} verzonden concept(en)</strong> in het systeem die je direct kunt openen, bekijken of heropenen.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button id="btn-empty-switch-sent" class="btn btn-primary" style="padding: 10px 20px; background: #2563eb;">
                            <i class="fas fa-envelope-open-text"></i> Bekijk ${sentCount} Verzonden Concept(en)
                        </button>
                        <button id="btn-empty-switch-all" class="btn btn-secondary" style="padding: 10px 20px;">
                            <i class="fas fa-folder-open"></i> Toon Alle Concepten (${leads.length})
                        </button>
                    </div>
                </div>
            `;
            const btnSwitchSent = container.querySelector('#btn-empty-switch-sent');
            if (btnSwitchSent) {
                btnSwitchSent.addEventListener('click', () => {
                    _activeFilter = 'sent';
                    const sf = document.getElementById('factory-filter-status');
                    if (sf) sf.value = 'sent';
                    updateFilterPillsUI();
                    renderLeadCards(leads, effectiveHandlers);
                });
            }
            const btnSwitchAll = container.querySelector('#btn-empty-switch-all');
            if (btnSwitchAll) {
                btnSwitchAll.addEventListener('click', () => {
                    _activeFilter = 'all';
                    const sf = document.getElementById('factory-filter-status');
                    if (sf) sf.value = 'all';
                    updateFilterPillsUI();
                    renderLeadCards(leads, effectiveHandlers);
                });
            }
            return;
        }

        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: rgba(15,23,42,0.6); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px;">
                <i class="fas fa-search" style="font-size: 2.5rem; color: #38bdf8; margin-bottom: 16px; opacity: 0.6;"></i>
                <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 8px;">Geen concepten gevonden</h3>
                <p style="color: var(--color-text-secondary); max-width: 450px; margin: 0 auto 20px; font-size: 0.9rem;">
                    Er zijn momenteel geen leads die voldoen aan het actieve filter.
                </p>
                <button id="btn-empty-switch-all" class="btn btn-secondary" style="padding: 8px 16px;">
                    <i class="fas fa-folder-open"></i> Toon Alle Concepten (${leads.length})
                </button>
            </div>
        `;
        const btnSwitchAll = container.querySelector('#btn-empty-switch-all');
        if (btnSwitchAll) {
            btnSwitchAll.addEventListener('click', () => {
                _activeFilter = 'all';
                const sf = document.getElementById('factory-filter-status');
                if (sf) sf.value = 'all';
                updateFilterPillsUI();
                renderLeadCards(leads, effectiveHandlers);
            });
        }
        return;
    }

    container.innerHTML = filtered.map(lead => renderSingleLeadCard(lead)).join('');

    // Koppel interactieve knoppen
    attachCardActionListeners(container, leads, effectiveHandlers);
}

/**
 * Genereert de HTML voor een individuele concept kaart
 */
function renderSingleLeadCard(lead) {
    const isReady = lead.status === 'concept_ready';
    const isSent = lead.status === 'sent' || lead.status === 'email_sent';
    const isWhatsApp = lead.status === 'whatsapp_sent';
    const isArchived = lead.status?.includes('skipped');

    let statusBadge = `<span class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4);"><i class="fas fa-sparkles"></i> Klaar voor Review</span>`;
    if (isSent) {
        statusBadge = `<span class="badge" style="background: rgba(52,211,153,0.2); color: #34d399; border: 1px solid rgba(52,211,153,0.4);"><i class="fas fa-check-circle"></i> E-mail Verzonden</span>`;
    } else if (isWhatsApp) {
        statusBadge = `<span class="badge" style="background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4);"><i class="fab fa-whatsapp"></i> WhatsApp Contact</span>`;
    } else if (isArchived) {
        statusBadge = `<span class="badge" style="background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.25);"><i class="fas fa-archive"></i> Gearchiveerd</span>`;
    }

    const ratingStars = lead.rating ? `⭐ ${lead.rating} (${lead.reviewsCount || 0} reviews)` : '⭐ 5.0 (Nieuw)';
    const cleanUrl = lead.liveUrl || `https://creationaltfix.nl/concept/${lead.slug}/`;
    const safeLiveUrl = sanitizeUrl(cleanUrl);

    return `
        <div class="admin-card lead-card" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid ${isSent ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.12)'}; padding: 22px; transition: transform 0.2s, border-color 0.2s;">
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
                    ${lead.email ? `<div><i class="fas fa-envelope" style="color: #a78bfa; width: 16px;"></i> <a href="mailto:${escapeHtml(lead.email)}" style="color: #cbd5e1;">${escapeHtml(lead.email)}</a></div>` : ''}
                    <div><i class="fas fa-globe" style="color: #fbbf24; width: 16px;"></i> ${lead.hasWebsite ? escapeHtml(lead.website) : '<strong style="color: #f87171;">Geen website op Google Maps</strong>'}</div>
                </div>

                <!-- Pitch Hook preview -->
                <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 18px; line-height: 1.45; font-style: italic; border-left: 2px solid #38bdf8; padding-left: 10px;">
                    "${escapeHtml(lead.pitchHook || lead.pitch?.subject || 'Geen pitch beschikbaar')}"
                </div>
            </div>

            <!-- Footer Knoppen -->
            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; display: flex; flex-direction: column; gap: 10px;">
                <!-- Rij 1: Inspectie & Live Preview (altijd beschikbaar!) -->
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-sm btn-preview-concept" data-url="${safeLiveUrl}" data-name="${escapeHtml(lead.name)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" title="Open live responsive preview van het concept">
                        <i class="fas fa-eye text-accent"></i> <span>Live Preview</span>
                    </button>
                    <button class="btn btn-secondary btn-sm btn-view-pitch" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" title="Bekijk volledige acquisitie pitch en e-mailtekst">
                        <i class="fas fa-envelope-open-text" style="color: #fbbf24;"></i> <span>Bekijk Pitch</span>
                    </button>
                </div>

                <!-- Rij 2: Acties op basis van status -->
                <div style="display: flex; gap: 8px;">
                    ${isSent ? `
                        <button class="btn btn-secondary btn-sm btn-send-email-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #38bdf8; border-color: rgba(56,189,248,0.3);" title="E-mail opnieuw openen in Outlook / Mail Client">
                            <i class="fas fa-redo"></i> <span>Mail Heropenen</span>
                        </button>
                        <button class="btn btn-secondary btn-sm btn-revert-review-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #f59e0b; border-color: rgba(245,158,11,0.3);" title="Herstel status naar 'Klaar voor Review'">
                            <i class="fas fa-undo"></i> <span>Terug naar Review</span>
                        </button>
                    ` : isArchived ? `
                        <button class="btn btn-secondary btn-sm btn-revert-review-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #38bdf8; border-color: rgba(56,189,248,0.3);" title="Herstel lead naar 'Klaar voor Review'">
                            <i class="fas fa-undo"></i> <span>Herstellen naar Review</span>
                        </button>
                    ` : `
                        <button class="btn btn-primary btn-sm btn-send-email-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #2563eb;" title="Open e-mail direct in Outlook / Mail Client">
                            <i class="fas fa-paper-plane"></i> <span>1-Klik Mail</span>
                        </button>
                        ${lead.hasWhatsApp ? `
                            <button class="btn btn-secondary btn-sm btn-send-whatsapp-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #10b981; border-color: rgba(16,185,129,0.3);" title="Verstuur via WhatsApp">
                                <i class="fab fa-whatsapp"></i> <span>WhatsApp</span>
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm btn-reject-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="color: #ef4444; border-color: rgba(239,68,68,0.25);" title="Afwijzen / Archiveren">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Koppelt event handlers aan de knoppen van de kaarten
 */
function attachCardActionListeners(container, leads, handlers) {
    const effectiveHandlers = (handlers && Object.keys(handlers).length > 0) ? handlers : _factoryHandlers;

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
            if (lead) openPitchModal(lead, effectiveHandlers);
        });
    });

    // 3. 1-Klik E-mail Verzenden / Heropenen
    container.querySelectorAll('.btn-send-email-action').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (!lead) return;
            if (!lead.email) {
                // Open pitch modal zodat gebruiker het adres kan invullen
                openPitchModal(lead, effectiveHandlers);
            } else if (effectiveHandlers.onSendEmail) {
                await effectiveHandlers.onSendEmail(lead);
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
                if (effectiveHandlers.onUpdateStatus) {
                    effectiveHandlers.onUpdateStatus(lead, 'whatsapp_sent');
                }
            }
        });
    });

    // 5. Herstel naar 'Klaar voor Review'
    container.querySelectorAll('.btn-revert-review-action').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (lead && effectiveHandlers.onUpdateStatus) {
                await effectiveHandlers.onUpdateStatus(lead, 'concept_ready');
            }
        });
    });

    // 6. Afwijzen / Archiveren
    container.querySelectorAll('.btn-reject-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (lead && confirm(`Weet je zeker dat je concept voor "${lead.name}" wilt archiveren?`)) {
                if (effectiveHandlers.onUpdateStatus) {
                    effectiveHandlers.onUpdateStatus(lead, 'skipped');
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
 * Toont een inspectievenster voor de e-mail & WhatsApp pitch met tabbladen en transparante verzendacties
 */
function openPitchModal(lead, handlers) {
    const effectiveHandlers = (handlers && Object.keys(handlers).length > 0) ? handlers : _factoryHandlers;
    const pitch = lead.pitch || {};
    const subject = pitch.subject || `Concept website voor ${lead.name}`;
    const plainText = pitch.bodyPlain || '';
    const htmlBody = pitch.bodyHtml || `<p>${escapeHtml(plainText)}</p>`;
    const whatsAppText = pitch.whatsAppText || '';
    const archetypeLabel = pitch.archetypeLabel || lead.archetypeLabel || 'Vakmanschap (Archetype A)';
    const isSent = lead.status === 'sent' || lead.status === 'email_sent';

    const modalHtml = `
        <div id="factory-pitch-detail-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: #0B0F19; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; width: 95%; max-width: 820px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
                
                <!-- Modal Header -->
                <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(15,23,42,0.95);">
                    <div>
                        <h3 style="color: #fff; margin: 0 0 4px 0; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-envelope-open-text text-accent"></i> Acquisitie Pitch: ${escapeHtml(lead.name)}
                        </h3>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <span style="font-size: 0.76rem; color: #a5b4fc; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); padding: 2px 8px; border-radius: 4px;">
                                <i class="fas fa-bullseye"></i> ${escapeHtml(archetypeLabel)}
                            </span>
                            <span style="font-size: 0.76rem; ${isSent ? 'color: #34d399; background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3);' : 'color: #38bdf8; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3);'} padding: 2px 8px; border-radius: 4px;">
                                ${isSent ? '<i class="fas fa-check-circle"></i> E-mail Status: Reeds Geopend/Verzonden' : '<i class="fas fa-sparkles"></i> E-mail Status: Klaar voor Review'}
                            </span>
                        </div>
                    </div>
                    <button id="btn-close-pitch-detail" class="btn btn-secondary btn-sm" style="color: #ef4444;"><i class="fas fa-times"></i></button>
                </div>

                <!-- Ontvanger E-mail Input Balk -->
                <div style="padding: 12px 20px; background: rgba(15,23,42,0.85); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 280px;">
                        <label for="pitch-modal-email-input" style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600; white-space: nowrap;">
                            <i class="fas fa-at" style="color: #38bdf8;"></i> Ontvanger E-mailadres:
                        </label>
                        <input type="email" id="pitch-modal-email-input" value="${escapeHtml(lead.email || '')}" placeholder="bijv. info@bedrijf.nl" style="flex: 1; padding: 6px 12px; background: #030712; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-size: 0.88rem;">
                    </div>
                    ${lead.phone ? `
                        <div style="font-size: 0.82rem; color: #94a3b8;">
                            <i class="fas fa-phone-alt" style="color: #38bdf8;"></i> ${escapeHtml(lead.phone)}
                        </div>
                    ` : ''}
                </div>

                <!-- Tab Selectie -->
                <div style="display: flex; gap: 8px; padding: 10px 20px; background: rgba(15,23,42,0.6); border-bottom: 1px solid rgba(255,255,255,0.08);">
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
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button id="btn-copy-pitch-subject" class="btn btn-secondary btn-sm" title="Kopieer alleen de onderwerpregel"><i class="fas fa-copy"></i> Kopieer Onderwerp</button>
                        <button id="btn-copy-pitch-text" class="btn btn-secondary btn-sm" title="Kopieer de volledige platte tekst"><i class="fas fa-file-alt"></i> Kopieer Tekst</button>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                        ${isSent ? `
                            <button id="btn-pitch-revert-review" class="btn btn-secondary btn-sm" style="color: #f59e0b; border-color: rgba(245,158,11,0.3);" title="Herstel status naar 'Klaar voor Review'">
                                <i class="fas fa-undo"></i> Zet terug naar 'Review'
                            </button>
                            <button id="btn-pitch-open-client" class="btn btn-primary btn-sm" style="background: #2563eb;" title="Open opnieuw in Outlook / Mail Client">
                                <i class="fas fa-external-link-alt"></i> Opnieuw Openen in Mail
                            </button>
                        ` : `
                            <button id="btn-pitch-mark-sent" class="btn btn-secondary btn-sm" style="color: #34d399; border-color: rgba(52,211,153,0.3);" title="Markeer als verzonden zonder mailprogramma te openen">
                                <i class="fas fa-check"></i> Alleen Markeren als Verzonden
                            </button>
                            <button id="btn-pitch-open-client" class="btn btn-primary btn-sm" style="background: #2563eb;" title="Open concept e-mail direct in Outlook / Mail Client">
                                <i class="fas fa-external-link-alt"></i> Open in Outlook / Mail Client
                            </button>
                        `}
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

    // Open in Outlook / Mail Client
    const btnOpenClient = div.querySelector('#btn-pitch-open-client');
    if (btnOpenClient) {
        btnOpenClient.onclick = async () => {
            const emailInput = div.querySelector('#pitch-modal-email-input');
            const customEmail = emailInput ? emailInput.value.trim() : (lead.email || '');
            div.remove();
            if (effectiveHandlers.onSendEmail) {
                await effectiveHandlers.onSendEmail(lead, customEmail);
            }
        };
    }

    // Zet terug naar 'Review'
    const btnRevertReview = div.querySelector('#btn-pitch-revert-review');
    if (btnRevertReview) {
        btnRevertReview.onclick = async () => {
            div.remove();
            if (effectiveHandlers.onUpdateStatus) {
                await effectiveHandlers.onUpdateStatus(lead, 'concept_ready');
            }
        };
    }

    // Alleen Markeren als Verzonden
    const btnMarkSent = div.querySelector('#btn-pitch-mark-sent');
    if (btnMarkSent) {
        btnMarkSent.onclick = async () => {
            const emailInput = div.querySelector('#pitch-modal-email-input');
            if (emailInput && emailInput.value.trim()) {
                lead.email = emailInput.value.trim();
            }
            div.remove();
            if (effectiveHandlers.onUpdateStatus) {
                await effectiveHandlers.onUpdateStatus(lead, 'sent');
            }
        };
    }
}
