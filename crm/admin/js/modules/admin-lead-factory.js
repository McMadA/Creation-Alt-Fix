/**
 * Creation+Alt+Fix - Admin Lead Factory Module
 * Beheert de 24/7 "Concept Stapel" review UI, preview modals en 1-klik outreach acties.
 */

import { escapeHtml, sanitizeUrl } from "../../../js/crm-config.js";
import {
    calculateOutreachCampaignMetrics,
    buildOutreachQueue,
    synthesizeRegionalPitch,
    generateWhatsAppDispatchUrl,
    generatePortalProposalLink
} from "./regional-outreach-manager.js";

/**
 * Sanitizes preview HTML of generated outreach pitches.
 * Strips executable scripts, stylesheets, iframe/embed tags, inline event handlers, and javascript: links.
 * @param {string} html
 * @returns {string} Safe HTML string
 */
export function sanitizePitchHtml(html) {
    if (!html || typeof html !== 'string') return '';
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<(iframe|object|embed|applet|meta|link|base)\b[^>]*>/gi, '')
        .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
        .replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
}

/**
 * Saniteert en dedupliceert leads: elimineert duplicaten (Heinkens), ontkoppelt Berends van N ten seldam,
 * en dedupliceert op slug, telefoonnummer en domeinnaam.
 */
export function sanitizeAndDeduplicateLeads(rawLeads = []) {
    if (!Array.isArray(rawLeads)) return [];

    const phoneMap = new Map();
    const domainMap = new Map();
    const slugMap = new Map();
    const cleanList = [];

    for (const raw of rawLeads) {
        if (!raw || typeof raw !== 'object') continue;
        if (raw.status === 'skipped_has_website' || raw.status === 'skipped') continue;

        const l = { ...raw };

        // 1. Elimineer direct het duplicaat 'dakdekker' (samengevoegd in heinkens-daktechniek)
        if (l.slug === 'dakdekker') {
            continue;
        }

        // 2. Normaliseer canonieke Heinkens Daktechniek (Hoogezand)
        if (l.slug === 'heinkens-daktechniek' || (l.name && l.name.toLowerCase().includes('heinkens'))) {
            l.slug = 'heinkens-daktechniek';
            l.name = 'Heinkens Daktechniek';
            l.category = 'Dakdekker & Dakrenovatie';
            l.phone = '06 15 42 41 89';
            l.normalizedPhone = '0615424189';
            l.whatsAppNumber = '31615424189';
            l.website = 'http://heinkensdaktechniek.nl/';
            l.hasWebsite = true;
            l.address = 'Burgemeester van Roijenstraat Oost 242, 9602 CP Hoogezand';
            l.liveUrl = 'https://creationaltfix.nl/concept/heinkens-daktechniek/';
        }

        // 3. Ontkoppel Berends Bestrating data definitief van N ten seldam
        if (l.slug === 'n-ten-seldam' || (l.name && l.name.toLowerCase().includes('seldam'))) {
            l.slug = 'n-ten-seldam';
            l.name = 'N ten seldam';
            l.category = 'Stratenmaker & Hovenier';
            l.phone = '06 12567596';
            l.normalizedPhone = '0612567596';
            l.whatsAppNumber = '31612567596';
            l.hasWhatsApp = true;
            l.hasWebsite = false;
            l.website = null;
            l.email = null;
            l.archetype = 'A_TRADE_DIRECT';
            l.archetypeLabel = 'Direct Bellen (Geen Website)';
            l.strengths = ['Bewezen vakmanschap in sierbestrating & grondwerk', 'Direct contact via telefoon of WhatsApp'];
            l.liveUrl = 'https://creationaltfix.nl/concept/n-ten-seldam/';
            if (!l.pitchHook || l.pitchHook.includes('SSL') || l.pitchHook.includes('Berends')) {
                l.pitchHook = "We zagen jouw vermelding voor N ten seldam op Google Maps in Veendam. Omdat potentiële klanten mobiel zoeken naar een betrouwbare stratenmaker, hebben we alvast een snel concept klaargezet met directe belknoppen.";
            }
            if (!l.pitch || l.pitch.bodyPlain?.includes('Berends')) {
                l.pitch = {
                    subject: "Mobiel website concept voor N ten seldam",
                    bodyPlain: "Beste N ten seldam,\n\nWe zagen jouw vermelding voor N ten seldam op Google Maps in Veendam. Omdat veel particulieren mobiel zoeken naar een stratenmaker, hebben we alvast een snel concept klaargezet:\n👉 https://creationaltfix.nl/concept/n-ten-seldam/\n\nGroet,\nAllard Veldman - Creation+Alt+Fix",
                    whatsAppText: "Hoi N ten seldam! Allard hier van Creation+Alt+Fix. Ik zag jullie Google vermelding zonder website en heb alvast een mobiel concept klaargezet: https://creationaltfix.nl/concept/n-ten-seldam/ - Kijk er gerust naar op je telefoon!"
                };
            }
        }

        // 4. Deduplicatie op telefoonnummer (laatste 8 cijfers)
        const rawPhone = l.phone ? String(l.phone).replace(/\D/g, '') : null;
        const phoneSuffix = rawPhone && rawPhone.length >= 8 ? rawPhone.slice(-8) : rawPhone;
        if (phoneSuffix && phoneMap.has(phoneSuffix)) {
            continue;
        }

        // 5. Deduplicatie op domeinnaam
        const domain = l.website ? l.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim() : null;
        if (domain && domainMap.has(domain)) {
            continue;
        }

        // 6. Deduplicatie op unieke slug
        if (slugMap.has(l.slug)) {
            continue;
        }

        if (phoneSuffix) phoneMap.set(phoneSuffix, l);
        if (domain) domainMap.set(domain, l);
        slugMap.set(l.slug, l);
        cleanList.push(l);
    }

    return cleanList;
}

let _leads = [];
let _activeFilter = 'concept_ready';
let _activeRegionFilter = 'all'; // 'all' | 'Groningen' | 'Assen' | 'Drachten' | 'Emmen' | etc. (TASK-908)
let _searchTerm = '';
let _factoryHandlers = {};

/**
 * Formatteert de laatste bezoektijd van een concept naar een mensvriendelijke relatieve string
 */
export function formatLeadViewTime(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.round(diffMs / 60000);
        if (diffMin < 1) return 'Zojuist';
        if (diffMin < 60) return `${diffMin}m geleden`;
        const diffHours = Math.round(diffMin / 60);
        if (diffHours < 24) return `${diffHours}u geleden`;
        const diffDays = Math.round(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d geleden`;
        return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
    } catch {
        return '';
    }
}

/**
 * Werkt de tellers en styling van de snelle filterknoppen (pills) bij
 */
function updateFilterPillsUI() {
    const readyCount = _leads.filter(l => l.status === 'concept_ready').length;
    const sentCount = _leads.filter(l => l.status === 'sent' || l.status === 'email_sent' || l.status === 'sent_email' || l.status === 'whatsapp_sent' || l.status === 'sent_whatsapp').length;
    const viewedCount = _leads.filter(l => (parseInt(l.viewsCount, 10) || 0) > 0).length;
    const skippedCount = _leads.filter(l => l.status === 'skipped' || l.status === 'skipped_has_website').length;
    const videoCount = _leads.filter(l => Boolean(l.videoPreview && l.videoPreview.generated)).length;
    const totalCount = _leads.length;

    const elReady = document.getElementById('pill-count-ready');
    const elSent = document.getElementById('pill-count-sent');
    const elViewed = document.getElementById('pill-count-viewed');
    const elSkipped = document.getElementById('pill-count-skipped');
    const elVideo = document.getElementById('pill-count-video');
    const elAll = document.getElementById('pill-count-all');

    if (elReady) elReady.textContent = readyCount;
    if (elSent) elSent.textContent = sentCount;
    if (elViewed) elViewed.textContent = viewedCount;
    if (elSkipped) elSkipped.textContent = skippedCount;
    if (elVideo) elVideo.textContent = videoCount;
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
    _leads = sanitizeAndDeduplicateLeads(leads || []);
    if (handlers && Object.keys(handlers).length > 0) {
        _factoryHandlers = handlers;
    }

    const readyCount = _leads.filter(l => l.status === 'concept_ready').length;
    const sentCount = _leads.filter(l => l.status === 'sent' || l.status === 'email_sent' || l.status === 'sent_email' || l.status === 'whatsapp_sent' || l.status === 'sent_whatsapp').length;

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

    // 4b. Setup regiofilter select listener (TASK-908)
    const regionFilter = document.getElementById('factory-region-filter');
    if (regionFilter && !regionFilter._hasListener) {
        regionFilter.addEventListener('change', (e) => {
            _activeRegionFilter = e.target.value;
            renderLeadCards(_leads, _factoryHandlers);
        });
        regionFilter._hasListener = true;
    }

    // 4c. Setup Provinciale Batch 2 & Sector Conversie knop (TASK-908)
    const analyticsBtn = document.getElementById('btn-factory-analytics');
    if (analyticsBtn && !analyticsBtn._hasListener) {
        analyticsBtn.addEventListener('click', () => {
            openSectorAnalyticsModal(_leads);
        });
        analyticsBtn._hasListener = true;
    }

    // 4d. Setup Regionale Outreach Campagne knop (TASK-906)
    const outreachBtn = document.getElementById('btn-open-outreach-campaign');
    if (outreachBtn && !outreachBtn._hasListener) {
        outreachBtn.addEventListener('click', () => {
            openRegionalOutreachModal(_leads);
        });
        outreachBtn._hasListener = true;
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
 * Haalt het auth token op voor de bridge (via session-token endpoint, localStorage of fallback)
 */
async function getBridgeAuthToken(forceRefresh = false) {
    if (!forceRefresh && _bridgeToken) return _bridgeToken;

    if (!forceRefresh) {
        try {
            const stored = localStorage.getItem('caf_bridge_token');
            if (stored) {
                _bridgeToken = stored;
                return _bridgeToken;
            }
        } catch {}
    }

    // 1. Vraag token direct op via het /api/session-token endpoint van de lokale bridge
    const candidates = [];
    if (window.location.port === '3847') candidates.push(window.location.origin);
    candidates.push(_activeBridgeHost, 'http://127.0.0.1:3847', 'http://localhost:3847');
    const uniqueCandidates = [...new Set(candidates)];

    for (const host of uniqueCandidates) {
        try {
            const resp = await fetch(`${host}/api/session-token`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.token) {
                    _bridgeToken = data.token;
                    _activeBridgeHost = host;
                    try { localStorage.setItem('caf_bridge_token', _bridgeToken); } catch {}
                    return _bridgeToken;
                }
            }
        } catch {}
    }

    // 2. Lokale bestand-fallback
    try {
        const resp = await fetch('./data/bridge-token.json');
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.token) {
                _bridgeToken = data.token;
                try { localStorage.setItem('caf_bridge_token', _bridgeToken); } catch {}
                return _bridgeToken;
            }
        }
    } catch {}

    return _bridgeToken || '';
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
            _isDaemonActive = Boolean(data.isDaemonActive);

            // Synchroniseer sessietoken automatisch
            if (data.sessionToken || data.token) {
                _bridgeToken = data.sessionToken || data.token;
                try { localStorage.setItem('caf_bridge_token', _bridgeToken); } catch {}
            }

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
 * Synchroniseert status- of e-mailwijzigingen vanuit het CRM direct terug naar leads.json via de Bridge
 */
export async function syncLeadUpdateToBridge(payload = {}) {
    if (!payload || (!payload.slug && !payload.id)) return false;
    try {
        let token = await getBridgeAuthToken();
        if (!token) return false;
        const host = _activeBridgeHost || 'http://127.0.0.1:3847';
        let resp = await fetch(`${host}/api/leads/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-caf-auth': token
            },
            body: JSON.stringify(payload)
        });
        if (resp.status === 401) {
            token = await getBridgeAuthToken(true);
            resp = await fetch(`${host}/api/leads/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-caf-auth': token
                },
                body: JSON.stringify(payload)
            });
        }
        return resp.ok;
    } catch {
        return false;
    }
}

/**
 * Start een live scan via de lokale bridge (ondersteunt optionele eigen zoekopdracht/branche)
 */
async function handleTriggerBridgeScan(handlers = {}) {
    const triggerBtn = document.getElementById('btn-trigger-factory-cycle');
    const spinIcon = document.getElementById('factory-spin-icon');
    const triggerText = document.getElementById('factory-trigger-btn-text');
    const customQueryInput = document.getElementById('factory-custom-query');
    const customQuery = customQueryInput ? customQueryInput.value.trim() : '';

    if (!_isBridgeOnline) {
        alert("De lokale Factory Bridge server is momenteel niet bereikbaar.\n\nControles:\n1. Zorg dat de bridge draait: npm run bridge:start\n2. Open je het dashboard via HTTPS (portal.creationaltfix.nl)? In browsers zoals Firefox kan Mixed Content een verbinding naar 127.0.0.1 blokkeren.\n\nTip: Open het CRM lokaal via: http://127.0.0.1:3847/admin/");
        return;
    }

    try {
        if (spinIcon) spinIcon.className = 'fas fa-spinner fa-spin';
        if (triggerText) triggerText.textContent = 'Scan gestart...';

        let token = await getBridgeAuthToken();
        const reqBody = JSON.stringify({
            query: customQuery || undefined,
            limit: 1
        });

        let resp = await fetch(`${_activeBridgeHost}/api/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-caf-auth': token
            },
            body: reqBody
        });

        // Automatische token herstelpoging indien sessie herstart is (401)
        if (resp.status === 401) {
            token = await getBridgeAuthToken(true);
            resp = await fetch(`${_activeBridgeHost}/api/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-caf-auth': token
                },
                body: reqBody
            });
        }

        if (resp.status === 202) {
            // Open direct de live console drawer
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

    const daemonBtn = document.getElementById('btn-toggle-daemon');
    const daemonBtnText = document.getElementById('daemon-btn-text');
    const daemonIcon = document.getElementById('daemon-icon');
    const originalText = daemonBtnText ? daemonBtnText.textContent : '24/7 Modus';

    if (daemonBtnText) daemonBtnText.textContent = 'Bezig...';
    if (daemonIcon) daemonIcon.className = 'fas fa-circle-notch fa-spin';

    try {
        let token = await getBridgeAuthToken();
        const endpoint = _isDaemonActive ? '/api/daemon/stop' : '/api/daemon/start';

        let resp = await fetch(`${_activeBridgeHost}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-caf-auth': token
            }
        });

        // Automatische herstelpoging indien 401: ververs token en retry eenmaal
        if (resp.status === 401) {
            token = await getBridgeAuthToken(true);
            resp = await fetch(`${_activeBridgeHost}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-caf-auth': token
                }
            });
        }

        const data = await resp.json().catch(() => ({}));

        if (resp.ok) {
            _isDaemonActive = Boolean(data.isDaemonActive);
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

            // Open direct de console drawer als daemon gestart is zodat de beheerder live actie ziet
            if (_isDaemonActive) {
                const drawer = document.getElementById('factory-activity-drawer');
                if (drawer) drawer.classList.remove('hidden');
                pollRunningCycle(handlers);
            }

            await checkBridgeStatus(handlers);
            alert(_isDaemonActive ? "▶️ 24/7 Autonome Daemon is geactiveerd!\nHij scant nu automatisch op de achtergrond (elke 30 min)." : "⏹️ 24/7 Autonome Daemon is gepauzeerd.");
        } else {
            alert(data.error || `Kon 24/7 modus niet wijzigen (HTTP ${resp.status}).`);
            if (daemonBtnText) daemonBtnText.textContent = originalText;
            if (daemonIcon) {
                daemonIcon.className = _isDaemonActive ? 'fas fa-pause' : 'fas fa-play';
                daemonIcon.style.color = _isDaemonActive ? '#fbbf24' : '#34d399';
            }
        }
    } catch (e) {
        alert("Fout bij schakelen van 24/7 modus: " + e.message);
        if (daemonBtnText) daemonBtnText.textContent = originalText;
        if (daemonIcon) {
            daemonIcon.className = _isDaemonActive ? 'fas fa-pause' : 'fas fa-play';
            daemonIcon.style.color = _isDaemonActive ? '#fbbf24' : '#34d399';
        }
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
    const sentCount = leads.filter(l => l.status === 'sent' || l.status === 'email_sent' || l.status === 'sent_email').length;
    const whatsappCount = leads.filter(l => l.status === 'whatsapp_sent' || l.status === 'sent_whatsapp').length;
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
    const sentCount = leads.filter(l => l.status === 'sent' || l.status === 'email_sent' || l.status === 'sent_email' || l.status === 'whatsapp_sent' || l.status === 'sent_whatsapp' || l.status === 'converted').length;

    // Filteren op status en zoekterm
    let filtered = leads.filter(lead => {
        if (_activeFilter !== 'all') {
            if (_activeFilter === 'concept_ready' && lead.status !== 'concept_ready') return false;
            if (_activeFilter === 'sent' && lead.status !== 'sent' && lead.status !== 'email_sent' && lead.status !== 'sent_email' && lead.status !== 'whatsapp_sent' && lead.status !== 'sent_whatsapp' && lead.status !== 'converted') return false;
            if (_activeFilter === 'viewed' && (!lead.viewsCount || parseInt(lead.viewsCount, 10) <= 0)) return false;
            if (_activeFilter === 'video' && (!lead.videoPreview || !lead.videoPreview.generated)) return false;
            if (_activeFilter === 'skipped' && lead.status !== 'skipped' && lead.status !== 'skipped_has_website') return false;
        }

        if (_searchTerm) {
            const str = `${lead.name} ${lead.category || ''} ${lead.city || ''} ${lead.address || ''} ${lead.phone || ''}`.toLowerCase();
            if (!str.includes(_searchTerm)) return false;
        }

        if (_activeRegionFilter && _activeRegionFilter !== 'all') {
            const regStr = `${lead.region || ''} ${lead.city || ''} ${lead.address || ''}`.toLowerCase();
            if (!regStr.includes(_activeRegionFilter.toLowerCase())) return false;
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
                    const sf = document.getElementById('factory-status-filter');
                    if (sf) sf.value = 'sent';
                    updateFilterPillsUI();
                    renderLeadCards(leads, effectiveHandlers);
                });
            }
            const btnSwitchAll = container.querySelector('#btn-empty-switch-all');
            if (btnSwitchAll) {
                btnSwitchAll.addEventListener('click', () => {
                    _activeFilter = 'all';
                    const sf = document.getElementById('factory-status-filter');
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
                const sf = document.getElementById('factory-status-filter');
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
    const isConverted = lead.status === 'converted';
    const isSent = lead.status === 'sent' || lead.status === 'email_sent' || lead.status === 'sent_email';
    const isWhatsApp = lead.status === 'whatsapp_sent' || lead.status === 'sent_whatsapp';
    const isArchived = lead.status?.includes('skipped');

    const views = parseInt(lead.viewsCount, 10) || 0;
    const hasViewed = views > 0;
    const viewTimeStr = hasViewed && lead.lastViewedAt ? formatLeadViewTime(lead.lastViewedAt) : '';

    const viewsBadge = hasViewed ? `
        <span class="badge badge-views" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.45); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Klant heeft dit concept bekeken! Laatst: ${escapeHtml(lead.lastViewedAt || 'onbekend')}">
            <i class="fas fa-eye" style="color: #fbbf24;"></i> ${views}x bekeken${viewTimeStr ? ` (${viewTimeStr})` : ''}
        </span>
    ` : '';

    const hasVideo = Boolean(lead.videoPreview && lead.videoPreview.generated);
    const videoBadge = hasVideo ? `
        <span class="badge badge-video-ready" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.45); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="15s WhatsApp Reel gegenereerd! (${lead.videoPreview.durationSeconds || 15}s)">
            <i class="fas fa-play-circle" style="color: #c084fc;"></i> 15s Reel
        </span>
    ` : '';

    const domainFreeBadge = lead.isDomainAvailable ? `
        <span class="badge badge-domain-free" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Domein ${escapeHtml(lead.suggestedDomain || lead.recommendedDomain || (lead.slug + '.nl'))} is nog vrij om te registreren!">
            <i class="fas fa-check-circle" style="color: #10b981;"></i> .nl Vrij
        </span>
    ` : '';

    const cleanWaDigits = (lead.whatsAppNumber || '').replace(/[^0-9]/g, '');
    const isMobileWa = Boolean(lead.hasWhatsApp && /^316\d{7,9}$/.test(cleanWaDigits));

    let statusBadge = `<span class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4);"><i class="fas fa-sparkles"></i> Klaar voor Review</span>`;
    if (isConverted) {
        statusBadge = `<span class="badge" style="background: rgba(168,85,247,0.2); color: #c084fc; border: 1px solid rgba(168,85,247,0.45);"><i class="fas fa-rocket"></i> Klant / Project</span>`;
    } else if (isSent) {
        statusBadge = `<span class="badge" style="background: rgba(52,211,153,0.2); color: #34d399; border: 1px solid rgba(52,211,153,0.4);"><i class="fas fa-check-circle"></i> E-mail Verzonden</span>`;
    } else if (isWhatsApp) {
        statusBadge = `<span class="badge" style="background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.4);"><i class="fab fa-whatsapp"></i> WhatsApp Contact</span>`;
    } else if (isArchived) {
        statusBadge = `<span class="badge" style="background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.25);"><i class="fas fa-archive"></i> Gearchiveerd</span>`;
    }

    const safeRating = escapeHtml(String(lead.rating || '5.0'));
    const safeReviews = parseInt(lead.reviewsCount, 10) || 0;
    const ratingStars = lead.rating ? `⭐ ${safeRating} (${safeReviews} reviews)` : '⭐ 5.0 (Nieuw)';
    const cleanUrl = lead.liveUrl || `https://creationaltfix.nl/concept/${lead.slug}/`;
    const safeLiveUrl = sanitizeUrl(cleanUrl);
    const cleanTel = (lead.phone || '').replace(/[^0-9+]/g, '');

    return `
        <div class="admin-card lead-card" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid ${hasViewed ? 'rgba(245, 158, 11, 0.55)' : isConverted ? 'rgba(168,85,247,0.4)' : (isSent || isWhatsApp) ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.12)'}; padding: 22px; transition: transform 0.2s, border-color 0.2s;">
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
                            ${lead.city ? `<span style="font-size: 0.78rem; color: #94a3b8;">• 📍 ${escapeHtml(lead.city)}</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                        ${viewsBadge}
                        ${videoBadge}
                        ${domainFreeBadge}
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
                    ${lead.phone ? `<div><i class="fas fa-phone-alt" style="color: #38bdf8; width: 16px;"></i> <a href="tel:${escapeHtml(cleanTel)}" style="color: #cbd5e1;">${escapeHtml(lead.phone)}</a> ${isMobileWa ? '<span style="color:#10b981;font-size:0.74rem;margin-left:4px;">(Mobiel/WA)</span>' : '<span style="color:#94a3b8;font-size:0.74rem;margin-left:4px;">(Vast nr.)</span>'}</div>` : ''}
                    ${lead.email ? `<div><i class="fas fa-envelope" style="color: #a78bfa; width: 16px;"></i> <a href="mailto:${escapeHtml(lead.email)}" style="color: #cbd5e1;">${escapeHtml(lead.email)}</a></div>` : ''}
                    <div><i class="fas fa-globe" style="color: #fbbf24; width: 16px;"></i> ${lead.hasWebsite ? escapeHtml(lead.website) : '<strong style="color: #f87171;">Geen website op Google Maps</strong>'}</div>
                    ${lead.isDomainAvailable ? `<div style="margin-top: 4px;"><span style="color: #34d399; font-size: 0.78rem; font-weight: 600;"><i class="fas fa-check-circle" style="color: #10b981; margin-right: 4px;"></i>🟢 <strong>${escapeHtml(lead.suggestedDomain || lead.recommendedDomain || (lead.slug + '.nl'))}</strong> is nog vrij!</span></div>` : ''}
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
                    <button class="btn btn-secondary btn-sm btn-copy-concept-url" data-url="${safeLiveUrl}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 10px;" title="Kopieer concept URL direct naar klembord">
                        <i class="fas fa-link" style="color: #38bdf8;"></i>
                    </button>
                    ${hasVideo ? `
                        <button class="btn btn-secondary btn-sm btn-play-video-reel" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #c084fc; border-color: rgba(168,85,247,0.35); padding: 0 10px;" title="Bekijk en deel 15s WhatsApp Reel">
                            <i class="fas fa-play" style="color: #c084fc;"></i> <span>Reel</span>
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-sm btn-generate-video-reel" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #a855f7; border-color: rgba(168,85,247,0.3); padding: 0 10px;" title="Genereer 15s WhatsApp Video Reel via Playwright + FFmpeg">
                            <i class="fas fa-video" style="color: #a855f7;"></i>
                        </button>
                    `}
                    <button class="btn btn-secondary btn-sm btn-view-pitch" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" title="Bekijk volledige acquisitie pitch en e-mailtekst">
                        <i class="fas fa-envelope-open-text" style="color: #fbbf24;"></i> <span>Bekijk Pitch</span>
                    </button>
                </div>

                <!-- Rij 2: Acties op basis van status -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${isConverted ? `
                        <button class="btn btn-secondary btn-sm btn-send-email-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #c084fc; border-color: rgba(168,85,247,0.35);">
                            <i class="fas fa-check-double"></i> <span>Geconverteerd naar Project</span>
                        </button>
                        <button class="btn btn-secondary btn-sm btn-revert-review-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #f59e0b; border-color: rgba(245,158,11,0.3);" title="Herstel status naar 'Klaar voor Review'">
                            <i class="fas fa-undo"></i>
                        </button>
                    ` : (isSent || isWhatsApp) ? `
                        <button class="btn btn-secondary btn-sm btn-send-email-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #38bdf8; border-color: rgba(56,189,248,0.3);" title="E-mail opnieuw openen in Outlook / Mail Client">
                            <i class="fas fa-redo"></i> <span>Mail</span>
                        </button>
                        <button class="btn btn-secondary btn-sm btn-convert-lead" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #c084fc; border-color: rgba(168,85,247,0.4);" title="Zet deze lead met 1 klik om naar een actief CRM Project (€199)">
                            <i class="fas fa-rocket"></i> <span>Naar Project</span>
                        </button>
                        <button class="btn btn-secondary btn-sm btn-revert-review-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #f59e0b; border-color: rgba(245,158,11,0.3);" title="Herstel status naar 'Klaar voor Review'">
                            <i class="fas fa-undo"></i>
                        </button>
                    ` : isArchived ? `
                        <button class="btn btn-secondary btn-sm btn-revert-review-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #38bdf8; border-color: rgba(56,189,248,0.3);" title="Herstel lead naar 'Klaar voor Review'">
                            <i class="fas fa-undo"></i> <span>Herstellen naar Review</span>
                        </button>
                    ` : `
                        <button class="btn btn-primary btn-sm btn-send-email-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #2563eb;" title="Open e-mail direct in Outlook / Mail Client">
                            <i class="fas fa-paper-plane"></i> <span>1-Klik Mail</span>
                        </button>
                        ${isMobileWa ? `
                            <button class="btn btn-secondary btn-sm btn-send-whatsapp-action" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #10b981; border-color: rgba(16,185,129,0.3);" title="Verstuur via WhatsApp">
                                <i class="fab fa-whatsapp"></i> <span>WhatsApp</span>
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm btn-convert-lead" data-lead-id="${escapeHtml(lead.id || lead.slug)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #c084fc; border-color: rgba(168,85,247,0.35);" title="Zet direct om naar actief CRM Project (€199)">
                            <i class="fas fa-rocket"></i>
                        </button>
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

    // 1b. Kopieer Concept URL Knop
    container.querySelectorAll('.btn-copy-concept-url').forEach(btn => {
        btn.addEventListener('click', async () => {
            const url = btn.getAttribute('data-url');
            if (!url) return;
            try {
                await navigator.clipboard.writeText(url);
                const origHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i>';
                setTimeout(() => { btn.innerHTML = origHtml; }, 1800);
            } catch (e) {
                prompt('Kopieer de concept link:', url);
            }
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

    // 4. WhatsApp Versturen (alleen voor gevalideerde 06-nummers)
    container.querySelectorAll('.btn-send-whatsapp-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (lead) {
                const cleanWaNumber = (lead.whatsAppNumber || '').replace(/[^0-9]/g, '');
                if (/^316\d{7,9}$/.test(cleanWaNumber)) {
                    const text = encodeURIComponent(lead.pitch?.whatsAppText || `Hallo ${lead.name}, ik heb een website concept voor je klaarstaan: ${lead.liveUrl}`);
                    const waUrl = `https://wa.me/${cleanWaNumber}?text=${text}`;
                    window.open(waUrl, '_blank', 'noopener,noreferrer');
                    if (effectiveHandlers.onUpdateStatus) {
                        effectiveHandlers.onUpdateStatus(lead, 'sent_whatsapp');
                    }
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

    // 5b. 1-Klik Promoveren naar CRM Project
    container.querySelectorAll('.btn-convert-lead').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-lead-id');
            const lead = leads.find(l => (l.id || l.slug) === id);
            if (!lead) return;
            if (effectiveHandlers.onConvertToProject) {
                await effectiveHandlers.onConvertToProject(lead);
            } else if (effectiveHandlers.onUpdateStatus) {
                await effectiveHandlers.onUpdateStatus(lead, 'converted');
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

    let targetUrl = url;

    // Als we het CRM lokaal draaien via loopback (poort 3847 of localhost), transformeer naar de lokale bridge URL
    const isLoopback = window.location.port === '3847' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    if (isLoopback && url && url.includes('/concept/')) {
        const parts = url.split('/concept/');
        if (parts[1]) {
            targetUrl = `/concept/${parts[1]}`;
        }
    }

    const safeTargetUrl = sanitizeUrl(targetUrl);
    if (safeTargetUrl === '#') return;

    if (titleEl) titleEl.textContent = title;
    if (urlBadge) urlBadge.textContent = safeTargetUrl;
    if (extLink) {
        extLink.href = safeTargetUrl;
        extLink.setAttribute('target', '_blank');
        extLink.setAttribute('rel', 'noopener noreferrer');
    }

    iframe.src = safeTargetUrl;
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
    const htmlBody = pitch.bodyHtml ? sanitizePitchHtml(pitch.bodyHtml) : `<p>${escapeHtml(plainText)}</p>`;
    const whatsAppText = pitch.whatsAppText || '';
    const archetypeLabel = pitch.archetypeLabel || lead.archetypeLabel || 'Vakmanschap (Archetype A)';
    const isSent = lead.status === 'sent' || lead.status === 'email_sent' || lead.status === 'sent_email';
    const cleanPitchWa = (lead.whatsAppNumber || '').replace(/[^0-9]/g, '');
    const isMobilePitchWa = Boolean(lead.hasWhatsApp && /^316\d{7,9}$/.test(cleanPitchWa));

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
                            <i class="fab fa-whatsapp"></i> ${isMobilePitchWa ? `WhatsApp naar: ${escapeHtml(lead.phone || 'Onbekend')}` : `Let op: ${escapeHtml(lead.phone || 'Geen 06-nummer')} is een vast nummer (geen directe wa.me link)`}
                        </div>
                        <div style="background: #ffffff; color: #1e293b; padding: 14px 16px; border-radius: 8px 8px 0 8px; font-size: 0.9rem; line-height: 1.5; word-break: break-word;">
                            ${escapeHtml(whatsAppText)}
                        </div>
                        ${isMobilePitchWa ? `
                            <div style="margin-top: 16px; text-align: center;">
                                <a href="https://wa.me/${cleanPitchWa}?text=${encodeURIComponent(whatsAppText)}" id="btn-pitch-modal-wa-link" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="background: #25d366; color: #000; font-weight: 700;">
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

    const btnPitchWaLink = div.querySelector('#btn-pitch-modal-wa-link');
    if (btnPitchWaLink) {
        btnPitchWaLink.onclick = () => {
            if (effectiveHandlers.onUpdateStatus) {
                effectiveHandlers.onUpdateStatus(lead, 'sent_whatsapp');
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
                await effectiveHandlers.onUpdateStatus(lead, 'sent_email');
            }
        };
    }
}


/**
 * Genereert de geoptimaliseerde WhatsApp outreach pitch inclusief 15s videolink en conceptlink.
 */
export function generateWhatsAppVideoPitch(lead) {
    if (!lead) return '';
    const leadName = lead.name || 'Vakman';
    const city = lead.city || 'de regio';
    const cleanUrl = lead.liveUrl || `https://creationaltfix.nl/concept/${lead.slug}/`;
    const videoUrl = lead.videoPreview?.absoluteUrl || (lead.videoPreview?.relativeUrl ? `https://creationaltfix.nl${lead.videoPreview.relativeUrl}` : `${cleanUrl}video-preview.mp4`);

    return `Hoi ${leadName}! Allard hier van Creation+Alt+Fix. Ik zag jullie vermelding op Google Maps in ${city} en heb alvast een snel mobiel concept klaargezet:
👉 ${cleanUrl}

Ik heb ook een korte 15s video-preview gemaakt van hoe jullie website eruit ziet op mobiel:
🎬 ${videoUrl}

Kijk er gerust even naar op je telefoon!`;
}

/**
 * Genereert een 15-seconden MP4 video reel via de lokale Bridge Server (Playwright + FFmpeg).
 */
export async function generateLeadVideoReel(lead, leads = _leads, handlers = _factoryHandlers) {
    if (!lead) throw new Error("Lead ontbreekt");
    const token = sessionStorage.getItem('caf_bridge_token') || localStorage.getItem('caf_bridge_token') || '';
    const bridgeUrl = 'http://127.0.0.1:3847/api/leads/video';

    const res = await fetch(bridgeUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-caf-auth': token
        },
        body: JSON.stringify({ slug: lead.slug, durationMs: 15000 })
    });

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server antwoordde met status ${res.status}`);
    }

    const data = await res.json();
    lead.videoPreview = data.lead?.videoPreview || {
        generated: true,
        generatedAt: new Date().toISOString(),
        fileName: 'video-preview.mp4',
        relativeUrl: data.videoUrl,
        absoluteUrl: data.absoluteUrl,
        durationSeconds: data.durationSeconds || 15,
        sizeBytes: data.sizeBytes
    };

    const idx = leads.findIndex(l => (l.id || l.slug) === (lead.id || lead.slug));
    if (idx !== -1) {
        leads[idx] = lead;
    }

    updateFilterPillsUI();
    renderLeadCards(leads, handlers);
    openLeadVideoModal(lead, handlers);
    return data;
}

/**
 * Opent de Dark AI 15s WhatsApp Video Reel modal.
 */
export function openLeadVideoModal(lead, handlers = _factoryHandlers) {
    if (!lead) return;
    const modal = document.getElementById('factory-video-modal');
    if (!modal) return;

    const titleEl = document.getElementById('video-modal-title');
    const playerEl = document.getElementById('factory-video-player');
    const msgEl = document.getElementById('video-modal-message');
    const filesizeEl = document.getElementById('video-modal-filesize');
    const btnWa = document.getElementById('btn-video-modal-whatsapp');
    const btnCopy = document.getElementById('btn-video-modal-copy');
    const btnDownload = document.getElementById('btn-video-modal-download');
    const btnRegen = document.getElementById('btn-video-modal-regenerate');

    const cleanUrl = lead.liveUrl || `https://creationaltfix.nl/concept/${lead.slug}/`;
    const videoRelUrl = lead.videoPreview?.relativeUrl || `/concept/${lead.slug}/video-preview.mp4`;
    const videoAbsUrl = lead.videoPreview?.absoluteUrl || `https://creationaltfix.nl${videoRelUrl}`;
    
    // Bij lokaal dashboard gebruik maken van loopback bridge
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const videoSrc = isLocal ? `http://127.0.0.1:3847${videoRelUrl}` : videoAbsUrl;

    if (titleEl) titleEl.textContent = `🎬 15s WhatsApp Reel • ${lead.name}`;
    if (playerEl) {
        playerEl.src = videoSrc;
        playerEl.load();
        playerEl.play().catch(() => {});
    }

    const pitchText = generateWhatsAppVideoPitch(lead);
    if (msgEl) msgEl.value = pitchText;

    if (filesizeEl) {
        const sizeMb = lead.videoPreview?.sizeBytes ? (lead.videoPreview.sizeBytes / 1024 / 1024).toFixed(1) + ' MB' : '15s MP4';
        filesizeEl.textContent = `${sizeMb} • H.264/AAC (9:16)`;
    }

    const cleanWaDigits = (lead.whatsAppNumber || lead.phone || '').replace(/[^0-9]/g, '');
    const isMobileWa = /^316\d{7,9}$/.test(cleanWaDigits);
    if (btnWa) {
        if (isMobileWa) {
            btnWa.href = `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(pitchText)}`;
            btnWa.style.display = 'inline-flex';
        } else {
            btnWa.href = `https://wa.me/?text=${encodeURIComponent(pitchText)}`;
            btnWa.title = "Deel via WhatsApp Web / App";
        }
    }

    if (btnDownload) {
        btnDownload.href = videoSrc;
        btnDownload.download = `${lead.slug}-whatsapp-reel.mp4`;
    }

    if (btnCopy) {
        btnCopy.onclick = async () => {
            try {
                await navigator.clipboard.writeText(pitchText);
                const origText = btnCopy.innerHTML;
                btnCopy.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i> <span>Gekopieerd!</span>';
                setTimeout(() => { btnCopy.innerHTML = origText; }, 2000);
            } catch (e) {
                prompt("Kopieer WhatsApp bericht:", pitchText);
            }
        };
    }

    if (btnRegen) {
        btnRegen.onclick = async () => {
            btnRegen.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Renderen...</span>';
            btnRegen.disabled = true;
            try {
                await generateLeadVideoReel(lead, _leads, handlers);
                openLeadVideoModal(lead, handlers);
            } catch (err) {
                alert("Fout bij renderen video: " + err.message);
            } finally {
                btnRegen.innerHTML = '<i class="fas fa-redo"></i> <span>Opnieuw Renderen</span>';
                btnRegen.disabled = false;
            }
        };
    }

    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('btn-close-video-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (playerEl) playerEl.pause();
            modal.classList.add('hidden');
        };
    }
    modal.onclick = (e) => {
        if (e.target === modal) {
            if (playerEl) playerEl.pause();
            modal.classList.add('hidden');
        }
    };
}

/**
 * Classificeert een lead naar een vaksector
 */
export function classifyLeadSector(lead = {}) {
    const combined = `${lead.category || ''} ${lead.name || ''} ${lead.slug || ''}`.toLowerCase();
    if (combined.includes('dak') || combined.includes('zink') || combined.includes('bitumen')) return 'dakdekker';
    if (combined.includes('ontstop') || combined.includes('riool') || combined.includes('loodgieter') || combined.includes('installat') || combined.includes('cv') || combined.includes('warmtepomp')) return 'loodgieter';
    if (combined.includes('schilder') || combined.includes('glaszet') || combined.includes('lakwerk')) return 'schilder';
    if (combined.includes('stukadoor') || combined.includes('stuc') || combined.includes('spack') || combined.includes('afbouw')) return 'stukadoor';
    if (combined.includes('hovenier') || combined.includes('tuin') || combined.includes('stratenmaker') || combined.includes('bestrat')) return 'hovenier';
    if (combined.includes('elektr') || combined.includes('groepenkast') || combined.includes('laadpaal')) return 'elektricien';
    if (combined.includes('timmer') || combined.includes('klus') || combined.includes('aannem') || combined.includes('bouw')) return 'klusbedrijf';
    return 'overig';
}

/**
 * Berekent diepgaande conversieratio's per sector en regionale dekkingsstatistieken (TASK-908)
 */
export function calculateSectorConversionMetrics(leads = []) {
    const safeLeads = Array.isArray(leads) ? leads.filter(l => l && typeof l === 'object') : [];
    const sectorMap = {
        dakdekker: { id: 'dakdekker', label: 'Dakdekkers & Zinkwerk', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 },
        loodgieter: { id: 'loodgieter', label: 'Loodgieters & Installatietechniek', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 },
        schilder: { id: 'schilder', label: 'Schilders & Glaszetters', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 },
        stukadoor: { id: 'stukadoor', label: 'Stukadoors & Afbouw', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 },
        hovenier: { id: 'hovenier', label: 'Hoveniers & Stratenmakers', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 },
        elektricien: { id: 'elektricien', label: 'Elektriciens & Verduurzaming', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 },
        klusbedrijf: { id: 'klusbedrijf', label: 'Klus- & Timmerbedrijven', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 },
        overig: { id: 'overig', label: 'Overige Vaklieden & Diensten', totalLeads: 0, withWebsite: 0, noWebsite: 0, viewsCount: 0, viewedLeadsCount: 0, sentCount: 0, convertedCount: 0 }
    };

    const regionalMap = new Map();

    for (const lead of safeLeads) {
        const sectorKey = classifyLeadSector(lead);
        const sec = sectorMap[sectorKey] || sectorMap.overig;

        sec.totalLeads++;
        if (lead.hasWebsite || (lead.website && String(lead.website).startsWith('http'))) {
            sec.withWebsite++;
        } else {
            sec.noWebsite++;
        }

        const views = Math.max(0, parseInt(lead.viewsCount || 0, 10) || 0);
        sec.viewsCount += views;
        if (views > 0 || lead.lastViewedAt) sec.viewedLeadsCount++;

        const st = String(lead.status || '').toLowerCase();
        const isSent = st === 'sent' || st.includes('sent_') || st.includes('_sent') || Boolean(lead.sentAt);
        if (isSent) sec.sentCount++;

        const isConverted = st === 'deal_closed' || st === 'accepted' || st === 'won' || st === 'client' || lead.isConverted === true;
        if (isConverted) sec.convertedCount++;

        const city = String(lead.city || lead.region || 'Onbekend').trim() || 'Onbekend';
        if (!regionalMap.has(city)) regionalMap.set(city, { city, totalLeads: 0, viewsCount: 0, convertedCount: 0 });
        const regStat = regionalMap.get(city);
        regStat.totalLeads++;
        regStat.viewsCount += views;
        if (isConverted) regStat.convertedCount++;
    }

    const sectorsArray = Object.values(sectorMap).map(sec => {
        const viewRate = sec.totalLeads > 0 ? Math.round((sec.viewedLeadsCount / sec.totalLeads) * 1000) / 10 : 0;
        const conversionRate = sec.totalLeads > 0 ? Math.round((sec.convertedCount / sec.totalLeads) * 1000) / 10 : 0;
        return {
            ...sec,
            viewRate,
            conversionRate
        };
    });

    sectorsArray.sort((a, b) => {
        if (b.conversionRate !== a.conversionRate) return b.conversionRate - a.conversionRate;
        if (b.viewsCount !== a.viewsCount) return b.viewsCount - a.viewsCount;
        return b.totalLeads - a.totalLeads;
    });

    const activeWithLeads = sectorsArray.filter(s => s.totalLeads > 0);
    const topConvertingSector = activeWithLeads.length > 0 ? activeWithLeads[0] : null;

    const coreHubs = ['groningen', 'assen', 'drachten', 'emmen', 'hoogezand', 'veendam'];
    const coveredHubs = coreHubs.filter(hub => {
        for (const [cityName] of regionalMap.entries()) {
            if (cityName.toLowerCase().includes(hub)) return true;
        }
        return false;
    });
    const provincialCoverageScore = Math.round((coveredHubs.length / coreHubs.length) * 100);

    return {
        summary: {
            totalLeads: safeLeads.length,
            totalViews: sectorsArray.reduce((acc, s) => acc + s.viewsCount, 0),
            totalSent: sectorsArray.reduce((acc, s) => acc + s.sentCount, 0),
            totalConverted: sectorsArray.reduce((acc, s) => acc + s.convertedCount, 0),
            overallConversionRate: safeLeads.length > 0
                ? Math.round((sectorsArray.reduce((acc, s) => acc + s.convertedCount, 0) / safeLeads.length) * 1000) / 10
                : 0,
            provincialCoverageScore,
            coveredHubs,
            targetHubs: coreHubs
        },
        sectors: sectorsArray,
        topConvertingSector,
        regionalBreakdown: Array.from(regionalMap.values()).sort((a, b) => b.totalLeads - a.totalLeads),
        generatedAt: new Date().toISOString()
    };
}

/**
 * Opent de interactieve Provinciale Batch 2 & Sector Conversie modal (TASK-908)
 */
export function openSectorAnalyticsModal(leads = _leads) {
    const modal = document.getElementById('factory-analytics-modal');
    const content = document.getElementById('factory-analytics-content');
    if (!modal || !content) return;

    const metrics = calculateSectorConversionMetrics(leads);
    const topSec = metrics.topConvertingSector;

    content.innerHTML = `
        <!-- KPI Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
            <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Totaal Leads</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #38bdf8; margin: 4px 0;">${metrics.summary.totalLeads}</div>
                <div style="font-size: 0.75rem; color: #64748b;">In actieve database</div>
            </div>
            <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Zero-Cookie Views</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #fbbf24; margin: 4px 0;">${metrics.summary.totalViews}</div>
                <div style="font-size: 0.75rem; color: #64748b;">Bekeken door klanten</div>
            </div>
            <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Geconverteerde Deals</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #34d399; margin: 4px 0;">${metrics.summary.totalConverted}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${metrics.summary.overallConversionRate}% totale conversie</div>
            </div>
            <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Provinciale Dekking</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #c084fc; margin: 4px 0;">${metrics.summary.provincialCoverageScore}%</div>
                <div style="font-size: 0.75rem; color: #64748b;">${metrics.summary.coveredHubs.length} van ${metrics.summary.targetHubs.length} provinciecentra</div>
            </div>
        </div>

        <!-- Top Converterende Branche Spotlight -->
        <div style="background: linear-gradient(135deg, rgba(88,28,135,0.3) 0%, rgba(30,27,75,0.4) 100%); border: 1px solid rgba(168,85,247,0.4); border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
                <span class="badge" style="background: rgba(168,85,247,0.25); color: #c084fc; border: 1px solid rgba(168,85,247,0.5); font-size: 0.72rem; margin-bottom: 6px;">
                    🏆 BEST PRESTERENDE BRANCHE (WEEK 11)
                </span>
                <h4 style="margin: 4px 0; color: #fff; font-size: 1.15rem;">${topSec ? escapeHtml(topSec.label) : 'Onvoldoende data'}</h4>
                <div style="font-size: 0.82rem; color: #cbd5e1;">
                    ${topSec ? `${topSec.totalLeads} leads • ${topSec.viewsCount} views • ${topSec.convertedCount} deals (${topSec.conversionRate}% conversie)` : 'Start een provinciale scan om conversie te meten.'}
                </div>
            </div>
            <button id="btn-modal-generate-batch2" class="btn btn-primary" style="background: #a855f7; border-color: #9333ea; padding: 10px 18px; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fas fa-magic"></i> <span>🚀 Genereer 20 Batch 2 Queries</span>
            </button>
        </div>

        <!-- Sector Matrix Table -->
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden;">
            <div style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 700; color: #f1f5f9; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                <span>Vakbranche Conversie Ranking</span>
                <span style="font-size: 0.75rem; color: #94a3b8;">Sorteert op conversieratio &amp; prospect engagement</span>
            </div>
            <div style="overflow-x: auto;">
                <table class="admin-table" style="margin: 0; width: 100%;">
                    <thead>
                        <tr>
                            <th style="padding: 10px 16px;">Vakbranche</th>
                            <th style="padding: 10px 14px; text-align: center;">Leads</th>
                            <th style="padding: 10px 14px; text-align: center;">Zonder Website</th>
                            <th style="padding: 10px 14px; text-align: center;">Views</th>
                            <th style="padding: 10px 14px; text-align: center;">Uitgestuurd</th>
                            <th style="padding: 10px 14px; text-align: center;">Deals</th>
                            <th style="padding: 10px 16px; text-align: right;">Conversie %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${metrics.sectors.map(sec => {
                            const isTop = topSec && topSec.id === sec.id && sec.totalLeads > 0;
                            return `
                                <tr style="${isTop ? 'background: rgba(168,85,247,0.1);' : ''}">
                                    <td style="padding: 10px 16px; font-weight: 600; color: #fff;">
                                        ${isTop ? '<i class="fas fa-crown" style="color: #fbbf24; margin-right: 6px;"></i>' : ''}
                                        ${escapeHtml(sec.label)}
                                    </td>
                                    <td style="padding: 10px 14px; text-align: center; color: #cbd5e1;">${sec.totalLeads}</td>
                                    <td style="padding: 10px 14px; text-align: center; color: #38bdf8;">${sec.noWebsite}</td>
                                    <td style="padding: 10px 14px; text-align: center; color: #fbbf24;">${sec.viewsCount}</td>
                                    <td style="padding: 10px 14px; text-align: center; color: #94a3b8;">${sec.sentCount}</td>
                                    <td style="padding: 10px 14px; text-align: center; color: #34d399; font-weight: 700;">${sec.convertedCount}</td>
                                    <td style="padding: 10px 16px; text-align: right;">
                                        <span class="badge" style="background: ${sec.conversionRate > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}; color: ${sec.conversionRate > 0 ? '#34d399' : '#94a3b8'}; border: 1px solid rgba(255,255,255,0.1); font-weight: 700;">
                                            ${sec.conversionRate}%
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Regionale Dekking Strip -->
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 18px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">
                Regionale Spreiding over Noord-Nederland
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${metrics.regionalBreakdown.map(reg => `
                    <span class="badge" style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 5px 10px; font-size: 0.78rem;">
                        📍 ${escapeHtml(reg.city)}: <strong>${reg.totalLeads}</strong> (${reg.viewsCount} views)
                    </span>
                `).join('')}
            </div>
        </div>
    `;

    // Setup Batch 2 generator knop
    const batch2Btn = document.getElementById('btn-modal-generate-batch2');
    if (batch2Btn) {
        batch2Btn.onclick = async () => {
            batch2Btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Wachtrij laden...</span>';
            batch2Btn.disabled = true;
            try {
                const token = await getBridgeAuthToken();
                const res = await fetch(`${_activeBridgeHost}/api/leads/batch2/queue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-caf-auth': token },
                    body: JSON.stringify({ count: 20 })
                });
                if (res.ok) {
                    const data = await res.json();
                    alert(`✅ 20 Provinciale Batch 2 zoekopdrachten klaargezet!\n\nEerste 3 queries:\n1. ${data.queries[0]}\n2. ${data.queries[1]}\n3. ${data.queries[2]}`);
                } else {
                    alert("Bridge niet online of vereist authenticatie.");
                }
            } catch (err) {
                alert("Kon geen verbinding maken met de lokale Lead Factory bridge.");
            } finally {
                batch2Btn.innerHTML = '<i class="fas fa-magic"></i> <span>🚀 Genereer 20 Batch 2 Queries</span>';
                batch2Btn.disabled = false;
            }
        };
    }

    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('btn-close-analytics-modal');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    };
}

/**
 * Opent het interactieve Regionale MKB Outreach Campagne modal (TASK-906)
 */
export function openRegionalOutreachModal(leads = _leads) {
    const modal = document.getElementById('outreach-campaign-modal');
    const content = document.getElementById('outreach-campaign-content');
    if (!modal || !content) return;

    const queueData = buildOutreachQueue(leads);
    const metrics = calculateOutreachCampaignMetrics(leads);
    const cohort = queueData.queue;

    content.innerHTML = `
        <!-- KPI Metrics Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Target Cohort</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #38bdf8; margin: 4px 0;">${cohort.length} <span style="font-size: 0.9rem; color: #64748b;">/ 30</span></div>
                <div style="font-size: 0.72rem; color: #64748b;">${queueData.validMobileCount} met 06-mobiel</div>
            </div>
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Verstuurd</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #a78bfa; margin: 4px 0;">${metrics.funnel.totalSent}</div>
                <div style="font-size: 0.72rem; color: #64748b;">WhatsApp &amp; E-mail</div>
            </div>
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Concept Bekeken</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #fbbf24; margin: 4px 0;">${metrics.funnel.totalEngaged} <span style="font-size: 0.9rem; color: #fbbf24;">(${metrics.funnel.viewRatePercentage}%)</span></div>
                <div style="font-size: 0.72rem; color: #64748b;">Zero-cookie view pings</div>
            </div>
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">In Gesprek</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #38bdf8; margin: 4px 0;">${metrics.pipeline.inNegotiation}</div>
                <div style="font-size: 0.72rem; color: #64748b;">Statusportaal / offerte</div>
            </div>
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Deals Gesloten</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #34d399; margin: 4px 0;">${metrics.pipeline.dealsClosed}</div>
                <div style="font-size: 0.72rem; color: #64748b;">${metrics.financial.targetGoalAchieved ? '🏆 Doel behaald!' : 'Doel: min. 3 deals'}</div>
            </div>
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                <div style="font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Pipeline Waarde</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: #10b981; margin: 4px 0;">€ ${metrics.financial.totalExpectedRevenueEur},-</div>
                <div style="font-size: 0.72rem; color: #64748b;">€ ${metrics.financial.closedRevenueEur},- gerealiseerd</div>
            </div>
        </div>

        <!-- Routine Banner -->
        <div style="background: linear-gradient(135deg, rgba(6,78,59,0.35) 0%, rgba(15,23,42,0.9) 100%); border: 1px solid rgba(16,185,129,0.4); border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
                <span class="badge" style="background: rgba(16,185,129,0.25); color: #34d399; border: 1px solid rgba(16,185,129,0.5); font-size: 0.72rem; margin-bottom: 6px;">
                    ⚡ DE HOOGEZAND SUCCESS-ROUTINE (10:00 - 11:30)
                </span>
                <h4 style="margin: 4px 0; color: #fff; font-size: 1.15rem;">Blok 2: Regionale MKB Verovering (Week 4 &amp; 5)</h4>
                <div style="font-size: 0.82rem; color: #cbd5e1;">
                    Verstuur maximaal 5-10 WhatsApp pitches per ochtendblok en stuur direct een 15s spraakberichtje na voor 100% lokale gunfactor.
                </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button id="btn-export-outreach-dossier" class="btn btn-secondary" style="border-color: rgba(16,185,129,0.4); padding: 8px 14px; font-size: 0.82rem;">
                    <i class="fas fa-file-download" style="color: #34d399;"></i> <span>Download Dossier</span>
                </button>
            </div>
        </div>

        <!-- Cohort Queue Table -->
        <div style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden;">
            <div style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 700; color: #f1f5f9; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                <span>Prioritair Cohort (${cohort.length} Vaklieden)</span>
                <span style="font-size: 0.75rem; color: #94a3b8;">Gerangschikt op conversiepotentieel &amp; 06-WhatsApp bereikbaarheid</span>
            </div>
            <div style="overflow-x: auto;">
                <table class="admin-table" style="margin: 0; width: 100%;">
                    <thead>
                        <tr>
                            <th style="padding: 10px 14px;">Vakman / Bedrijf</th>
                            <th style="padding: 10px 14px;">Regio</th>
                            <th style="padding: 10px 14px;">Telefoon (06)</th>
                            <th style="padding: 10px 12px; text-align: center;">Status</th>
                            <th style="padding: 10px 12px; text-align: center;">Views</th>
                            <th style="padding: 10px 16px; text-align: right;">Snelacties</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cohort.map((lead, idx) => {
                            const isMobile = lead.phoneValidation?.valid;
                            const pitch = lead.synthesizedPitch || synthesizeRegionalPitch(lead);
                            const views = Number(lead.viewsCount || 0);
                            const st = lead.outreachStage || lead.status || 'queued';

                            return `
                                <tr>
                                    <td style="padding: 10px 14px; font-weight: 600; color: #fff;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="color: #64748b; font-size: 0.75rem;">${idx + 1}.</span>
                                            <div>
                                                <div>${escapeHtml(lead.name || 'Vakman')}</div>
                                                <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 400;">${escapeHtml((lead.category || 'Vakman').split('&')[0].trim())}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding: 10px 14px; color: #cbd5e1; font-size: 0.85rem;">
                                        📍 ${escapeHtml(lead.city || 'Regio')}
                                    </td>
                                    <td style="padding: 10px 14px; font-size: 0.85rem;">
                                        <span class="badge" style="background: ${isMobile ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${isMobile ? '#34d399' : '#f87171'}; border: 1px solid ${isMobile ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'};">
                                            ${escapeHtml(lead.phone || 'Geen nummer')}
                                        </span>
                                    </td>
                                    <td style="padding: 10px 12px; text-align: center;">
                                        <span class="badge" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); font-size: 0.72rem;">
                                            ${escapeHtml(st)}
                                        </span>
                                    </td>
                                    <td style="padding: 10px 12px; text-align: center;">
                                        ${views > 0
                                            ? `<span class="badge" style="background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid rgba(251,191,36,0.4); font-weight: 700;">👀 ${views}x</span>`
                                            : `<span style="color: #64748b; font-size: 0.75rem;">-</span>`
                                        }
                                    </td>
                                    <td style="padding: 10px 16px; text-align: right;">
                                        <div style="display: inline-flex; gap: 6px; align-items: center;">
                                            ${pitch.whatsAppDispatchUrl ? `
                                                <a href="${pitch.whatsAppDispatchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary" style="background: #10b981; border-color: #059669; padding: 4px 10px; font-size: 0.78rem; text-decoration: none;">
                                                    <i class="fab fa-whatsapp"></i> <span>WhatsApp</span>
                                                </a>
                                            ` : ''}
                                            <button class="btn btn-sm btn-secondary btn-copy-pitch" data-slug="${escapeHtml(lead.slug || '')}" style="padding: 4px 8px; font-size: 0.78rem;" title="Kopieer Pitch Tekst">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                            <button class="btn btn-sm btn-secondary btn-copy-voicenote" data-slug="${escapeHtml(lead.slug || '')}" style="padding: 4px 8px; font-size: 0.78rem;" title="Spraakbericht Script">
                                                <i class="fas fa-microphone"></i>
                                            </button>
                                            <a href="https://creationaltfix.nl/concept/${escapeHtml(lead.slug || '')}/" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="padding: 4px 8px; font-size: 0.78rem;" title="Open Live Concept">
                                                <i class="fas fa-external-link-alt"></i>
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Hook up copy buttons
    content.querySelectorAll('.btn-copy-pitch').forEach(btn => {
        btn.onclick = () => {
            const slug = btn.getAttribute('data-slug');
            const targetLead = cohort.find(l => l.slug === slug);
            if (targetLead) {
                const pitch = targetLead.synthesizedPitch || synthesizeRegionalPitch(targetLead);
                navigator.clipboard.writeText(pitch.text);
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check" style="color: #34d399;"></i>';
                setTimeout(() => { btn.innerHTML = originalHtml; }, 1500);
            }
        };
    });

    content.querySelectorAll('.btn-copy-voicenote').forEach(btn => {
        btn.onclick = () => {
            const slug = btn.getAttribute('data-slug');
            const targetLead = cohort.find(l => l.slug === slug);
            if (targetLead) {
                const pitch = targetLead.synthesizedPitch || synthesizeRegionalPitch(targetLead);
                navigator.clipboard.writeText(pitch.voicenoteTip || pitch.text);
                alert(`🎙️ GRONINGSE SPRAAKBERICHT TROEFKAART (15-20s):\n\n${pitch.voicenoteTip}\n\n(Gekopieerd naar klembord!)`);
            }
        };
    });

    const exportBtn = document.getElementById('btn-export-outreach-dossier');
    if (exportBtn) {
        exportBtn.onclick = () => {
            window.open('https://portal.creationaltfix.nl/crm/api/leads.php?action=outreach', '_blank');
        };
    }

    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('btn-close-outreach-modal');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    };
}
