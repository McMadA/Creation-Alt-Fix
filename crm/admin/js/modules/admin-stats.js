/**
 * Dashboard Stats & KPI Module
 * Computes live metrics across project phases and open deliverables.
 */

import { formatProjectStatus } from "../../../js/crm-config.js";

/**
 * Computes KPI counts from a list of project objects.
 * @param {Array<Object>} projects 
 * @returns {{ leads: number, projects: number, waiting: number, delivered: number, openTasks: number }}
 */
export function calculateDashboardStats(projects = []) {
    if (!Array.isArray(projects)) {
        return { leads: 0, projects: 0, waiting: 0, delivered: 0, openTasks: 0 };
    }

    let leads = 0;
    let active = 0;
    let waiting = 0;
    let delivered = 0;
    let openTasks = 0;

    projects.forEach(p => {
        if (!p || typeof p !== 'object') return;
        const info = formatProjectStatus(p.status, p.statusClass);

        // Fase 1: Leads & Intakes
        if (info.phase === 1) leads++;

        // Wachten op actie / akkoord / review / betaling
        if (info.phase === 2 || (info.phase === 5 && info.isPaymentWaiting)) waiting++;

        // Fase 3 & 4: In actieve ontwikkeling of design
        if (info.phase === 3 || info.phase === 4) active++;

        // Fase 5: Opgeleverd / Live & Voldaan
        if (info.phase === 5) delivered++;

        // Openstaande taken
        const tasks = Array.isArray(p.tasks) ? p.tasks : [];
        tasks.forEach(t => {
            if (t && typeof t === 'object' && !t.completed && t.status !== 'done') {
                openTasks++;
            }
        });
    });

    return { leads, projects: active, waiting, delivered, openTasks };
}

/**
 * Updates DOM KPI elements with formatted statistics.
 * @param {{ leads: number, projects: number, waiting: number, delivered: number, openTasks: number }} stats 
 */
export function updateDashboardStatsUI(stats) {
    const s = stats || { leads: 0, projects: 0, waiting: 0, delivered: 0, openTasks: 0 };
    const elLeads = document.getElementById('stat-leads');
    const elProjects = document.getElementById('stat-projects');
    const elWaiting = document.getElementById('stat-waiting');
    const elDelivered = document.getElementById('stat-delivered');
    const elTasks = document.getElementById('stat-tasks');

    if (elLeads) elLeads.textContent = String(s.leads ?? 0);
    if (elProjects) elProjects.textContent = String(s.projects ?? 0);
    if (elWaiting) elWaiting.textContent = String(s.waiting ?? 0);
    if (elDelivered) elDelivered.textContent = String(s.delivered ?? 0);
    if (elTasks) elTasks.textContent = String(s.openTasks ?? 0);
}
