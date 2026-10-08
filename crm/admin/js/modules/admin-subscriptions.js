/**
 * Admin Subscriptions & 2027 Migration Dashboard Module
 * Manages the dedicated Subscriptions tab, metrics calculation, and customer migration tracking.
 */

import { SUBSCRIPTION_PLANS, escapeHtml } from "../../../js/crm-config.js";
import { getPiBoekhoudingInfo } from "./bookkeeping-data.js";
import { open2027SubscriptionModal } from "./subscription-2027.js";

let _currentProjects = [];
let _activeFilter = 'all';

/**
 * Initializes and renders the Subscriptions & 2027 Migration tab.
 */
export function initSubscriptionsTab(projects = [], handlers = {}) {
    _currentProjects = projects || [];

    // 1. Calculate KPI Metrics
    calculateSubscriptionKPIs(_currentProjects);

    // 2. Render Table
    renderSubscriptionsTable(_currentProjects, handlers);

    // 3. Setup Filter Listener
    const filterSelect = document.getElementById('filter-sub-status');
    if (filterSelect && !filterSelect._hasListener) {
        filterSelect.addEventListener('change', (e) => {
            _activeFilter = e.target.value;
            renderSubscriptionsTable(_currentProjects, handlers);
        });
        filterSelect._hasListener = true;
    }

    // 4. Setup Refresh Button
    const refreshBtn = document.getElementById('btn-refresh-sub-overview');
    if (refreshBtn && !refreshBtn._hasListener) {
        refreshBtn.addEventListener('click', () => {
            if (handlers.onRefresh) handlers.onRefresh();
            initSubscriptionsTab(_currentProjects, handlers);
        });
        refreshBtn._hasListener = true;
    }
}

/**
 * Calculates and updates subscription KPI cards.
 */
export function calculateSubscriptionKPIs(projects = []) {
    let confirmedCount = 0;
    let proposedCount = 0;
    let legacyCount = 0;
    let totalRevenue = 0;

    projects.forEach(p => {
        const info = getPiBoekhoudingInfo(p);
        const planId = p.subscriptionPlanId || info?.currentPlanId || 'managed_nl';
        const isInternal = planId === 'internal_project' || info?.currentPlanId === 'internal_project';
        const isOneOff = (planId === 'none' || info?.currentPlanId === 'none') && (info?.recommendedPlanId === 'none');
        const isConfirmed = p.subscriptionPlan2027Status === 'bevestigd' || info?.subscriptionPlan2027Status === 'bevestigd';
        const isProposed = !isConfirmed && (p.subscriptionPlan2027Status === 'voorgesteld' || info?.subscriptionPlan2027Status === 'voorgesteld');
        const isLegacy = (planId === 'legacy_22' || info?.currentPlanId === 'legacy_22') && !isInternal && !isOneOff && !isConfirmed;

        if (isConfirmed) {
            confirmedCount++;
        } else if (isProposed) {
            proposedCount++;
        }

        if (isLegacy) {
            legacyCount++;
        }

        // Calculate expected 2027 revenue (exclude internal and one-off projects)
        if (!isInternal && !isOneOff) {
            const targetPlanId = p.subscriptionPlan2027Id || info?.subscriptionPlan2027Id || (isLegacy ? 'transition_2027_loyalty' : (info?.recommendedPlanId || planId));
            const planObj = SUBSCRIPTION_PLANS[targetPlanId] || SUBSCRIPTION_PLANS['managed_nl'];
            const priceNum = parseFloat((planObj.price || '0').replace(',', '.'));
            if (!isNaN(priceNum) && planObj.id !== 'none' && planObj.id !== 'internal_project') {
                totalRevenue += priceNum;
            }
        }
    });

    const elConfirmed = document.getElementById('kpi-sub-confirmed');
    if (elConfirmed) elConfirmed.innerHTML = `${confirmedCount} <span style="font-size: 0.9rem; font-weight: 500; color: #94a3b8;">klanten</span>`;

    const elProposed = document.getElementById('kpi-sub-proposed');
    if (elProposed) elProposed.innerHTML = `${proposedCount} <span style="font-size: 0.9rem; font-weight: 500; color: #94a3b8;">voorstellen</span>`;

    const elLegacy = document.getElementById('kpi-sub-legacy');
    if (elLegacy) elLegacy.innerHTML = `${legacyCount} <span style="font-size: 0.9rem; font-weight: 500; color: #94a3b8;">actie vereist</span>`;

    const elRevenue = document.getElementById('kpi-sub-revenue');
    if (elRevenue) {
        const fmtRevenue = totalRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        elRevenue.innerText = `€ ${fmtRevenue}`;
    }
}

/**
 * Renders the customers migration table.
 */
export function renderSubscriptionsTable(projects = [], handlers = {}) {
    const tbody = document.getElementById('subscriptions-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const filtered = projects.filter(p => {
        const info = getPiBoekhoudingInfo(p);
        const planId = p.subscriptionPlanId || info?.currentPlanId || 'managed_nl';
        const isInternal = planId === 'internal_project' || info?.currentPlanId === 'internal_project';
        const isOneOff = (planId === 'none' || info?.currentPlanId === 'none') && (info?.recommendedPlanId === 'none');
        const isConfirmed = p.subscriptionPlan2027Status === 'bevestigd' || info?.subscriptionPlan2027Status === 'bevestigd';
        const isProposed = !isConfirmed && (p.subscriptionPlan2027Status === 'voorgesteld' || info?.subscriptionPlan2027Status === 'voorgesteld');
        const isLegacy = (planId === 'legacy_22' || info?.currentPlanId === 'legacy_22') && !isInternal && !isOneOff && !isConfirmed;

        if (_activeFilter === 'legacy') return isLegacy;
        if (_activeFilter === 'voorgesteld') return isProposed;
        if (_activeFilter === 'bevestigd') return isConfirmed;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-secondary); padding: 24px;">Geen klanten gevonden voor dit filter.</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const info = getPiBoekhoudingInfo(p);
        const safeClient = escapeHtml(p.client || p.companyName || 'Onbekend');
        const rawDomain = (p.domainName || p.domain || '').trim();
        const safeDomain = rawDomain ? escapeHtml(rawDomain) : '<span style="color:#64748b; font-style:italic;">Geen domein</span>';
        const domainHref = rawDomain ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`) : '#';

        // Project category
        const currentPlanId = p.subscriptionPlanId || info?.currentPlanId || 'managed_nl';
        const currentPlan = SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS['managed_nl'];
        const isInternal = currentPlanId === 'internal_project' || info?.currentPlanId === 'internal_project';
        const isOneOff = (currentPlanId === 'none' || info?.currentPlanId === 'none') && (info?.recommendedPlanId === 'none');
        const isConfirmed = p.subscriptionPlan2027Status === 'bevestigd' || info?.subscriptionPlan2027Status === 'bevestigd';
        const isProposed = !isConfirmed && (p.subscriptionPlan2027Status === 'voorgesteld' || info?.subscriptionPlan2027Status === 'voorgesteld');
        const isLegacy = (currentPlanId === 'legacy_22' || info?.currentPlanId === 'legacy_22') && !isInternal && !isOneOff && !isConfirmed;

        // Current Plan Badge
        let currentPlanBadge = `<span style="font-size: 0.78rem; color: #38bdf8; font-weight: 600;">${escapeHtml(p.subscriptionPlanName || info?.currentPlanName || currentPlan.name)} (€ ${escapeHtml(p.subscriptionPrice || currentPlan.price)}/jr)</span>`;
        if (isInternal) {
            currentPlanBadge = `<span class="badge" style="background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid #64748b; font-size: 0.75rem;"><i class="fas fa-user-shield"></i> Eigen Project</span>`;
        } else if (isOneOff) {
            currentPlanBadge = `<span class="badge" style="background: rgba(100, 116, 139, 0.2); color: #cbd5e1; border: 1px solid #475569; font-size: 0.75rem;">Eenmalig</span>`;
        } else if (isConfirmed && (info?.currentPlanId === 'legacy_22' || currentPlanId === 'legacy_22')) {
            currentPlanBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; font-size: 0.75rem;"><i class="fas fa-check-circle"></i> Historisch &rarr; 2027 Akkoord</span>`;
        } else if (isLegacy) {
            currentPlanBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; font-size: 0.75rem;">⏳ Historisch (€ 22,-/jr)</span>`;
        }

        // 2027 Proposed Plan
        const recPlanId = p.subscriptionPlan2027Id || info?.subscriptionPlan2027Id || (isInternal ? 'internal_project' : (isOneOff ? 'none' : (info?.recommendedPlanId || (isLegacy ? 'transition_2027_loyalty' : 'managed_nl'))));
        const recPlan = SUBSCRIPTION_PLANS[recPlanId] || SUBSCRIPTION_PLANS['managed_nl'];

        let planDetailsHtml = '';
        if (isInternal) {
            planDetailsHtml = `
                <strong style="color: #cbd5e1; font-size: 0.85rem;"><i class="fas fa-folder-open text-accent"></i> Eigen Project Allard</strong>
                <div style="font-size: 0.74rem; color: #94a3b8; line-height: 1.3;">Directe Vimexx registrar factuur doorgestuurd</div>
            `;
        } else if (isOneOff) {
            planDetailsHtml = `
                <strong style="color: #94a3b8; font-size: 0.85rem;">Geen actief abonnement</strong>
                <div style="font-size: 0.74rem; color: #64748b; line-height: 1.3;">Rustend (tenzij klant contact opneemt)</div>
            `;
        } else if (recPlanId === 'transition_2027_loyalty') {
            planDetailsHtml = `
                <strong style="color: #fde047; font-size: 0.85rem;">⭐ Trouwe Klant Overgangstarief</strong>
                <div style="font-size: 0.75rem; color: #34d399; font-weight: 700;">€ 95,- <span style="font-weight: 400; color: #94a3b8;">/ jr 2027 (→ € 150,- in '28)</span></div>
            `;
        } else {
            planDetailsHtml = `
                <strong style="color: #e2e8f0; font-size: 0.85rem;">${escapeHtml(recPlan.name)}</strong>
                <div style="font-size: 0.75rem; color: #34d399; font-weight: 700;">€ ${escapeHtml(recPlan.price)} / jr excl. BTW</div>
            `;
        }

        // 2027 Status
        let statusHtml = '';

        if (isInternal) {
            statusHtml = `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid #64748b; font-size: 0.75rem;"><i class="fas fa-check"></i> Intern Beheer</span>`;
        } else if (isOneOff) {
            statusHtml = `<span class="badge" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid #475569; font-size: 0.75rem;">Rustend</span>`;
        } else if (isConfirmed) {
            statusHtml = `<span class="badge badge-success" style="font-size: 0.75rem;"><i class="fas fa-check-circle"></i> Bevestigd (€ 95,-)</span>`;
        } else if (isProposed) {
            statusHtml = `<span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; border: 1px solid #818cf8; font-size: 0.75rem;"><i class="fas fa-paper-plane"></i> Voorstel Verzonden</span>`;
        } else if (isLegacy) {
            statusHtml = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; font-size: 0.75rem;"><i class="fas fa-exclamation-triangle"></i> Migratie Vereist</span>`;
        } else {
            statusHtml = `<span class="badge badge-secondary" style="font-size: 0.75rem;">Concept</span>`;
        }

        // Actions
        let actionsHtml = '';
        if (isInternal) {
            actionsHtml = `
                <span style="font-size: 0.75rem; color: #64748b; margin-right: 6px; font-style: italic;">Intern project</span>
                <a href="project.html?id=${escapeHtml(p.id)}" class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 5px 8px; text-decoration: none;" title="Open Werkplek">
                    <i class="fas fa-desktop"></i>
                </a>
            `;
        } else {
            actionsHtml = `
                <button type="button" class="btn btn-sm btn-action-proposal" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border: none; font-size: 0.75rem; padding: 5px 10px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Open communicatie modal">
                    <i class="fas fa-paper-plane"></i> Bericht
                </button>
                <a href="project.html?id=${escapeHtml(p.id)}" class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 5px 8px; text-decoration: none; margin-left: 4px;" title="Open Werkplek">
                    <i class="fas fa-desktop"></i>
                </a>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: #fff;">${safeClient}</strong></td>
            <td>${rawDomain ? `<a href="${domainHref}" target="_blank" rel="noopener" style="color: #38bdf8; text-decoration: none;"><i class="fas fa-globe"></i> ${safeDomain}</a>` : safeDomain}</td>
            <td>${currentPlanBadge}</td>
            <td>${planDetailsHtml}</td>
            <td>${statusHtml}</td>
            <td style="white-space: nowrap;">${actionsHtml}</td>
        `;

        tr.querySelector('.btn-action-proposal')?.addEventListener('click', () => {
            open2027SubscriptionModal({
                project: p,
                onSavePlan: handlers.onSavePlan,
                onSendPortalTicket: handlers.onSendPortalTicket,
                onConfirmPlan: handlers.onConfirmPlan
            });
        });

        tbody.appendChild(tr);
    });
}
