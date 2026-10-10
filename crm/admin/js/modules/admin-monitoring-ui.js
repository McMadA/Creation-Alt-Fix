/**
 * @file crm/admin/js/modules/admin-monitoring-ui.js
 * Realtime Uptime Monitoring Dashboard Interface Module.
 * Beheert de weergave van DoH-probes, responsetijden, incidenten en automatische verversingscycli.
 * Creation+Alt+Fix CRM (2026/2027)
 */

import { escapeHtml } from "../../../js/firebase-config.js";
import { Toast } from "../../../js/core/toast.js";
import { 
    getMonitoredDomains, 
    runAllDomainChecks, 
    saveDomainReportToFirestore, 
    dispatchDowntimeAlert, 
    getIncidentLogs,
    isDomainIgnored,
    setDomainIgnored,
    REQUIRED_CONSECUTIVE_FAILURES
} from "../../../js/uptime-monitor.js";

let monitoringReports = [];
let isScanningMonitors = false;
let monitoringAutoRefreshEnabled = true;
let monitoringAutoRefreshTimer = null;
let monitoringAudioAlertsEnabled = false;
let monitoringSearchQuery = '';
let monitoringCurrentFilter = 'all';
let hasDoneInitialMonitoringScan = false;

/**
 * Initialiseert het monitoring tabblad en laadt gecachte data
 */
export function initMonitoringTab(getProjectsFn, db) {
    setupMonitoringEventListeners(getProjectsFn, db);

    const activeProjects = typeof getProjectsFn === 'function' ? getProjectsFn() : [];
    const activeMonitors = getMonitoredDomains(activeProjects);
    const activeIds = new Set(activeMonitors.map(m => m.id));
    const activeDomains = new Set(activeMonitors.map(m => m.domain));

    if (monitoringReports.length === 0) {
        try {
            const cached = localStorage.getItem('caf_cached_monitor_reports');
            if (cached) {
                const parsed = JSON.parse(cached);
                monitoringReports = activeMonitors.length > 0
                    ? parsed.filter(r => activeIds.has(r.id) || activeDomains.has(r.domain))
                    : parsed;
                renderMonitorsTable();
            }
        } catch (e) {}
    } else if (activeMonitors.length > 0) {
        monitoringReports = monitoringReports.filter(r => activeIds.has(r.id) || activeDomains.has(r.domain));
        renderMonitorsTable();
    }

    if (!hasDoneInitialMonitoringScan && !isScanningMonitors && activeMonitors.length > 0) {
        hasDoneInitialMonitoringScan = true;
        executeScanAllMonitors(getProjectsFn, db);
    }

    restartMonitoringAutoRefresh(getProjectsFn, db);
}

/**
 * Bindt alle listeners voor het monitoring tabblad
 */
export function setupMonitoringEventListeners(getProjectsFn, db) {
    if (window._monitoringListenersBound) return;
    window._monitoringListenersBound = true;

    document.getElementById('btn-scan-all-monitors')?.addEventListener('click', () => {
        executeScanAllMonitors(getProjectsFn, db);
    });

    document.getElementById('btn-toggle-auto-refresh')?.addEventListener('click', () => {
        monitoringAutoRefreshEnabled = !monitoringAutoRefreshEnabled;
        const label = document.getElementById('auto-refresh-label');
        if (label) {
            label.innerText = monitoringAutoRefreshEnabled ? 'Auto-Refresh: Aan (60s)' : 'Auto-Refresh: Uit';
        }
        restartMonitoringAutoRefresh(getProjectsFn, db);
    });

    document.getElementById('btn-toggle-alert-sound')?.addEventListener('click', () => {
        monitoringAudioAlertsEnabled = !monitoringAudioAlertsEnabled;
        const icon = document.getElementById('audio-alert-icon');
        const label = document.getElementById('audio-alert-label');
        if (icon && label) {
            if (monitoringAudioAlertsEnabled) {
                icon.className = 'fas fa-volume-up';
                icon.style.color = '#10b981';
                label.innerText = 'Audio: Aan';
            } else {
                icon.className = 'fas fa-volume-mute';
                icon.style.color = '#94a3b8';
                label.innerText = 'Audio: Uit';
            }
        }
    });

    document.getElementById('btn-open-add-domain-modal')?.addEventListener('click', () => {
        Toast.show({
            title: "Dynamisch Domeinbeheer",
            message: "Domeinen worden automatisch ingeladen en gemonitord via de Klantkaart van projecten.",
            type: "info"
        });
    });

    document.getElementById('monitor-search-input')?.addEventListener('input', (e) => {
        monitoringSearchQuery = (e.target.value || '').trim().toLowerCase();
        renderMonitorsTable();
    });

    document.querySelectorAll('.btn-monitor-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-monitor-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            monitoringCurrentFilter = btn.getAttribute('data-filter') || 'all';
            renderMonitorsTable();
        });
    });

    document.getElementById('monitors-tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="inspect-monitor"]');
        if (btn) {
            const domain = btn.getAttribute('data-domain');
            if (domain && typeof window.openMonitorDetailModal === 'function') {
                window.openMonitorDetailModal(domain);
            }
        }
    });
}

/**
 * Herstart het automatische verversingsinterval
 */
export function restartMonitoringAutoRefresh(getProjectsFn, db) {
    if (monitoringAutoRefreshTimer) {
        clearInterval(monitoringAutoRefreshTimer);
        monitoringAutoRefreshTimer = null;
    }
    if (monitoringAutoRefreshEnabled) {
        monitoringAutoRefreshTimer = setInterval(() => {
            if (!isScanningMonitors) {
                executeScanAllMonitors(getProjectsFn, db, true);
            }
        }, 60000);
    }
}

/**
 * Voert een volledige scan uit van alle actieve domeinen
 */
export async function executeScanAllMonitors(getProjectsFn, db, isSilent = false) {
    if (isScanningMonitors) return;
    isScanningMonitors = true;

    const scanBtn = document.getElementById('btn-scan-all-monitors');
    const scanSpinner = document.getElementById('scan-all-spinner');
    const scanBtnText = document.getElementById('scan-all-btn-text');
    const progressContainer = document.getElementById('monitoring-scan-progress-container');
    const progressBar = document.getElementById('monitoring-scan-bar');
    const progressText = document.getElementById('monitoring-scan-status-text');

    if (scanBtn) scanBtn.disabled = true;
    if (scanSpinner) scanSpinner.classList.add('fa-spin');
    if (scanBtnText) scanBtnText.innerText = 'Bezig met scannen...';

    if (progressContainer) progressContainer.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '0%';

    const activeProjects = typeof getProjectsFn === 'function' ? getProjectsFn() : [];
    const domains = getMonitoredDomains(activeProjects);

    try {
        const results = await runAllDomainChecks(domains, (completed, total, report) => {
            const pct = Math.round((completed / total) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.innerText = `${completed} / ${total}`;

            if (report.overallStatus === 'down' && !isDomainIgnored(report.domain)) {
                dispatchDowntimeAlert(report, { playAudio: monitoringAudioAlertsEnabled });
            }

            if (db) {
                saveDomainReportToFirestore(db, report);
            }
        });

        monitoringReports = results;

        try {
            localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(results));
        } catch (e) {}

        renderMonitorsTable();

    } catch (err) {
        console.error("Fout tijdens monitoring scan:", err);
    } finally {
        isScanningMonitors = false;
        if (scanBtn) scanBtn.disabled = false;
        if (scanSpinner) scanSpinner.classList.remove('fa-spin');
        if (scanBtnText) scanBtnText.innerText = 'Nu Alle Domeinen Scannen';

        const statusLabel = document.getElementById('monitoring-scan-status-label');
        if (statusLabel) statusLabel.innerText = 'Alle domeinen gecontroleerd!';
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.innerText = 'Voltooid (100%)';

        setTimeout(() => {
            if (progressContainer) progressContainer.classList.add('hidden');
            if (statusLabel) statusLabel.innerText = 'Bezig met scannen van DNS-records en HTTPS endpoints...';
        }, 1500);
    }
}

/**
 * Rendert de monitoring tabel
 */
export function renderMonitorsTable() {
    const tbody = document.getElementById('monitors-tbody');
    if (!tbody) return;

    let filtered = monitoringReports.filter(r => {
        if (monitoringCurrentFilter === 'up' && r.overallStatus !== 'up') return false;
        if (monitoringCurrentFilter === 'down' && r.overallStatus !== 'down') return false;
        if (monitoringCurrentFilter === 'degraded' && r.overallStatus !== 'degraded') return false;

        if (monitoringSearchQuery) {
            const str = `${r.name} ${r.domain} ${r.client || ''}`.toLowerCase();
            if (!str.includes(monitoringSearchQuery)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; opacity: 0.6; padding: 24px;">Geen gemonitorde domeinen gevonden die aan de filters voldoen.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        const isUp = r.overallStatus === 'up';
        const isDown = r.overallStatus === 'down';
        const statusClass = isUp ? 'status-up' : (isDown ? 'status-down' : 'status-degraded');
        const statusText = isUp ? 'Online' : (isDown ? 'Offline' : 'Vertraagd');

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 12px 14px;">
                    <div style="font-weight: 600; color: #fff;">${escapeHtml(r.name)}</div>
                    <div style="font-size: 11px; opacity: 0.6;">${escapeHtml(r.domain)}</div>
                </td>
                <td style="padding: 12px 14px;">
                    <span class="status-pill ${statusClass}" style="padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600;">
                        ${statusText}
                    </span>
                </td>
                <td style="padding: 12px 14px; font-family: monospace; font-size: 12px;">${r.dnsLatencyMs || 0} ms</td>
                <td style="padding: 12px 14px; font-size: 12px;">${escapeHtml(r.httpCode || '—')}</td>
                <td style="padding: 12px 14px; font-size: 11px; opacity: 0.6;">${r.lastChecked ? new Date(r.lastChecked).toLocaleTimeString('nl-NL') : '—'}</td>
                <td style="padding: 12px 14px; text-align: right;">
                    <button data-action="inspect-monitor" data-domain="${escapeHtml(r.domain)}" class="btn-secondary" style="padding: 3px 8px; font-size: 11px;">
                        Inspecteren
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    renderIncidentList();
}

/**
 * Rendert de recente storings- en incidentlijst
 */
export function renderIncidentList() {
    const container = document.getElementById('monitors-incident-list');
    if (!container) return;

    const incidents = getIncidentLogs();
    if (!incidents || incidents.length === 0) {
        container.innerHTML = `
            <div style="font-size: 0.85rem; color: #94a3b8; padding: 12px 16px; text-align: center;">
                <i class="fas fa-check-circle" style="color: #10b981; margin-right: 6px;"></i> Geen actieve storingen geregistreerd. Alle systemen draaien stabiel.
            </div>
        `;
        return;
    }

    container.innerHTML = incidents.slice(0, 8).map(inc => {
        const time = new Date(inc.timestamp).toLocaleString('nl-NL');
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.84rem;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="monitoring-pulse-dot down"></span>
                    <strong style="color: #fff;">${escapeHtml(inc.domain)}</strong>
                    <span style="color: #f87171;">${escapeHtml(inc.status)}</span>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(time)}</div>
            </div>
        `;
    }).join('');
}
