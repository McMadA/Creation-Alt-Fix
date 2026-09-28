/**
 * @file crm/admin/js/modules/project-timeline.js
 * Klantactiviteit & Audit Tijdlijn met Visual Pulse Tracker.
 * Biedt realtime inzicht in klantactiviteit (portaal, offertes, staging) en chronologische geschiedenis.
 * Creation+Alt+Fix CRM (2026/2027)
 */

import { escapeHtml } from "../../../js/firebase-config.js";

/**
 * Berekent de Visual Pulse status van de klant op basis van recente activiteit
 * @param {Array<Object>} activityLogs 
 * @returns {{ state: 'active'|'recent'|'passive', label: string, color: string, icon: string, timeAgo: string }}
 */
export function calculateVisualPulse(activityLogs = []) {
    if (!Array.isArray(activityLogs) || activityLogs.length === 0) {
        return {
            state: 'passive',
            label: 'Geen recente klantactiviteit',
            color: '#64748b',
            icon: '💤',
            timeAgo: 'Onbekend'
        };
    }

    // Sorteer op meest recente timestamp
    const sorted = [...activityLogs].sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime();
        const tB = new Date(b.timestamp || 0).getTime();
        return tB - tA;
    });

    const latest = sorted[0];
    const latestTime = new Date(latest.timestamp || 0).getTime();
    const diffMinutes = Math.floor((Date.now() - latestTime) / (1000 * 60));

    if (diffMinutes < 5) {
        return {
            state: 'active',
            label: 'Klant nu actief in portaal',
            color: '#10b981',
            icon: '🟢',
            timeAgo: `${diffMinutes === 0 ? 'Zojuist' : diffMinutes + 'm geleden'}`
        };
    } else if (diffMinutes < 60) {
        return {
            state: 'recent',
            label: `${formatEventType(latest.eventType)} (${diffMinutes}m geleden)`,
            color: '#38bdf8',
            icon: '👁️',
            timeAgo: `${diffMinutes} minuten geleden`
        };
    } else if (diffMinutes < 24 * 60) {
        const hours = Math.floor(diffMinutes / 60);
        return {
            state: 'recent',
            label: `${formatEventType(latest.eventType)} (${hours}u geleden)`,
            color: '#38bdf8',
            icon: '👁️',
            timeAgo: `${hours} uur geleden`
        };
    } else {
        const days = Math.floor(diffMinutes / (24 * 60));
        return {
            state: 'passive',
            label: `Laatst actief: ${days} ${days === 1 ? 'dag' : 'dagen'} geleden`,
            color: '#94a3b8',
            icon: '💤',
            timeAgo: `${days} dagen geleden`
        };
    }
}

/**
 * Zet interne event types om in menselijke Nederlandse omschrijvingen
 * @param {string} eventType 
 * @returns {string}
 */
export function formatEventType(eventType) {
    switch (eventType) {
        case 'portal_login': return 'Ingelogd in Klantenportaal';
        case 'proposal_view': return 'Offerte Bekeken';
        case 'staging_view': return 'Live Staging Geïnspecteerd';
        case 'file_download': return 'Bestand Gedownload';
        case 'plan_confirmed': return '2027 Serviceplan Bevestigd';
        case 'ticket_sent': return 'Bericht Verzonden';
        default: return 'Portaal Bezocht';
    }
}

/**
 * Rendert de Visual Pulse badge HTML voor in de project header
 * @param {Array<Object>} activityLogs 
 * @returns {string} HTML string
 */
export function renderVisualPulseBadge(activityLogs = []) {
    const pulse = calculateVisualPulse(activityLogs);
    return `
        <div class="visual-pulse-pill" style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 9999px; background: rgba(15, 23, 42, 0.6); border: 1px solid ${pulse.color}40; box-shadow: 0 0 10px ${pulse.color}20; font-size: 12px;">
            <span style="display: inline-block; animation: ${pulse.state === 'active' ? 'pulse 2s infinite' : 'none'}; font-size: 10px;">${pulse.icon}</span>
            <span style="font-weight: 500; color: ${pulse.color};">${escapeHtml(pulse.label)}</span>
        </div>
    `;
}

/**
 * Rendert de volledige chronologische tijdlijn in het Project Werkstation
 * @param {Array<Object>} timelineEvents Gecombineerde lijst van notities, statuswijzigingen en activiteit
 * @returns {string} HTML string
 */
export function renderTimelineHtml(timelineEvents = []) {
    if (!Array.isArray(timelineEvents) || timelineEvents.length === 0) {
        return `<div style="text-align: center; opacity: 0.6; padding: 32px;">Nog geen tijdlijn- of audit gebeurtenissen vastgelegd.</div>`;
    }

    const itemsHtml = timelineEvents.map(evt => {
        const isClientAction = evt.actor === 'client' || evt.type === 'client_activity';
        const icon = isClientAction ? '👤' : (evt.type === 'status_change' ? '🔄' : '📝');
        const borderColor = isClientAction ? '#38bdf8' : (evt.type === 'status_change' ? '#10b981' : 'rgba(255,255,255,0.2)');
        const dateStr = evt.timestamp ? new Date(evt.timestamp).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

        return `
            <div class="timeline-item" style="display: flex; gap: 14px; position: relative; margin-bottom: 20px;">
                <div style="flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: #0f172a; border: 2px solid ${borderColor}; display: flex; align-items: center; justify-content: center; font-size: 14px; z-index: 2;">
                    ${icon}
                </div>
                <div style="flex-grow: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-weight: 600; font-size: 13.5px; color: ${isClientAction ? '#38bdf8' : '#f8fafc'};">${escapeHtml(evt.title || formatEventType(evt.eventType))}</span>
                        <span style="font-size: 11px; opacity: 0.5;">${escapeHtml(dateStr)}</span>
                    </div>
                    <div style="font-size: 12.5px; opacity: 0.85; line-height: 1.4;">
                        ${escapeHtml(evt.description || evt.text || '')}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="timeline-container" style="position: relative; padding-left: 8px;">
            <div style="position: absolute; left: 23px; top: 16px; bottom: 16px; width: 2px; background: rgba(255,255,255,0.08); z-index: 1;"></div>
            ${itemsHtml}
        </div>
    `;
}
