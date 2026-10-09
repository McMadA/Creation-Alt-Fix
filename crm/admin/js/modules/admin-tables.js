/**
 * Admin Table Manager & 8-Column Sorting Engine
 * Handles rendering, filtering, sorting and CSV export for CRM project tables.
 */

import { escapeHtml, sanitizeUrl, formatProjectStatus, BRANDING } from "../../../js/crm-config.js";

// Sorteer Status
export let currentSortColumn = 'updated';
export let currentSortDirection = 'desc';

export function setSortState(col, dir) {
    currentSortColumn = col;
    currentSortDirection = dir;
}

/**
 * Parses dates from various Firestore and string formats.
 */
export function parseProjectDate(p) {
    if (p.updatedAt) {
        if (typeof p.updatedAt === 'object' && p.updatedAt.seconds) {
            return p.updatedAt.seconds * 1000;
        }
        if (p.updatedAt instanceof Date) return p.updatedAt.getTime();
        const parsed = Date.parse(p.updatedAt);
        if (!isNaN(parsed)) return parsed;
    }
    const dStr = (p.date || p.createdAt || '').trim();
    if (!dStr) return 0;

    const dmy = dStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmy) {
        return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10)).getTime();
    }
    const ymd = dStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
        return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10)).getTime();
    }
    const parsed = Date.parse(dStr);
    return isNaN(parsed) ? 0 : parsed;
}

export function getStatusWeight(status) {
    const info = formatProjectStatus(status);
    if (info.phase === 1) return 1;
    if (info.phase === 2) return 2;
    if (info.phase === 3) return 3;
    if (info.phase === 4) return 4;
    if (info.phase === 5) {
        return info.isPaymentWaiting ? 5.1 : 5.2;
    }
    return 99;
}

/**
 * Sorts project array across 8 columns.
 */
export function sortProjectsList(list, column, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    const sorted = [...list];

    return sorted.sort((a, b) => {
        let comp = 0;

        switch (column) {
            case 'client': {
                const nameA = (a.client || a.companyName || '').toLowerCase().trim();
                const nameB = (b.client || b.companyName || '').toLowerCase().trim();
                comp = nameA.localeCompare(nameB, 'nl', { sensitivity: 'base' });
                break;
            }

            case 'tasks': {
                const tasksA = a.tasks || [];
                const tasksB = b.tasks || [];
                const totalA = tasksA.length;
                const totalB = tasksB.length;
                const doneA = tasksA.filter(t => t.completed || t.status === 'done').length;
                const doneB = tasksB.filter(t => t.completed || t.status === 'done').length;

                const scoreA = totalA > 0 ? ((doneA / totalA) * 1000) + totalA : 0;
                const scoreB = totalB > 0 ? ((doneB / totalB) * 1000) + totalB : 0;
                comp = scoreA - scoreB;
                break;
            }

            case 'email': {
                const emailA = (a.email || '').toLowerCase().trim();
                const emailB = (b.email || '').toLowerCase().trim();
                if (!emailA && !emailB) comp = 0;
                else if (!emailA) comp = 1;
                else if (!emailB) comp = -1;
                else comp = emailA.localeCompare(emailB, 'nl', { sensitivity: 'base' });
                break;
            }

            case 'domain': {
                const domA = (a.domainName || a.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').trim();
                const domB = (b.domainName || b.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').trim();
                if (!domA && !domB) comp = 0;
                else if (!domA) comp = 1;
                else if (!domB) comp = -1;
                else comp = domA.localeCompare(domB, 'nl', { sensitivity: 'base' });
                break;
            }

            case 'service': {
                const servA = (a.service || '').toLowerCase().trim();
                const servB = (b.service || '').toLowerCase().trim();
                comp = servA.localeCompare(servB, 'nl', { sensitivity: 'base' });
                break;
            }

            case 'status': {
                const wA = getStatusWeight(a.status);
                const wB = getStatusWeight(b.status);
                if (wA !== wB) {
                    comp = wA - wB;
                } else {
                    const stA = (a.status || '').toLowerCase().trim();
                    const stB = (b.status || '').toLowerCase().trim();
                    comp = stA.localeCompare(stB, 'nl', { sensitivity: 'base' });
                }
                break;
            }

            case 'updated': {
                const dateA = parseProjectDate(a);
                const dateB = parseProjectDate(b);
                comp = dateA - dateB;
                break;
            }

            case 'actions': {
                const unreadA = (a.messages || []).filter(m => m.sender === 'client' && (m.status === 'open' || !m.readByAdmin)).length;
                const unreadB = (b.messages || []).filter(m => m.sender === 'client' && (m.status === 'open' || !m.readByAdmin)).length;
                const totalMsgsA = (a.messages || []).length;
                const totalMsgsB = (b.messages || []).length;

                const scoreA = (unreadA * 1000) + totalMsgsA;
                const scoreB = (unreadB * 1000) + totalMsgsB;
                comp = scoreA - scoreB;
                break;
            }

            default:
                comp = 0;
        }

        return comp * dir;
    });
}

/**
 * Updates sort icons on table headers.
 */
export function updateTableHeaderSortIcons() {
    const allHeaders = document.querySelectorAll('th.sortable-th');
    allHeaders.forEach(th => {
        const col = th.getAttribute('data-sort');
        const icon = th.querySelector('.sort-icon');
        if (col === currentSortColumn) {
            th.classList.add('active-sort');
            if (icon) {
                icon.className = `fas fa-sort-${currentSortDirection === 'asc' ? 'up' : 'down'} sort-icon`;
            }
        } else {
            th.classList.remove('active-sort');
            if (icon) {
                icon.className = 'fas fa-sort sort-icon';
            }
        }
    });
}

/**
 * Syncs the toolbar selector and toggle button with current sort state.
 */
export function syncSortToolbarUI() {
    const sortBySelect = document.getElementById('admin-sort-by');
    if (sortBySelect && sortBySelect.value !== currentSortColumn) {
        sortBySelect.value = currentSortColumn;
    }

    const dirBtn = document.getElementById('admin-sort-direction-btn');
    const dirIcon = document.getElementById('admin-sort-dir-icon');
    const dirLabel = document.getElementById('admin-sort-dir-label');

    if (dirBtn && dirIcon && dirLabel) {
        if (currentSortDirection === 'asc') {
            dirIcon.className = 'fas fa-sort-amount-up-alt';
            dirLabel.textContent = 'Oplopend';
            dirBtn.title = 'Huidige volgorde: Oplopend (A-Z / Oudste). Klik om te wisselen.';
        } else {
            dirIcon.className = 'fas fa-sort-amount-down';
            dirLabel.textContent = 'Aflopend';
            dirBtn.title = 'Huidige volgorde: Aflopend (Z-A / Nieuwste). Klik om te wisselen.';
        }
    }

    updateTableHeaderSortIcons();
}

/**
 * Renders data into Overview, Leads, and Active Project tables.
 */
export function renderTablesData(projectsToRender, handlers = {}) {
    const formatTaskCounter = (p) => {
        const tasks = p.tasks || [];
        const total = tasks.length;
        let taskBadge = '';
        if (total === 0) {
            taskBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-size: 0.8rem; color: var(--color-text-secondary); white-space: nowrap;"><i class="fas fa-minus" style="font-size: 0.65rem; opacity: 0.5;"></i> 0 taken</span>`;
        } else {
            const done = tasks.filter(t => t.completed || t.status === 'done').length;
            const isAllDone = done === total && total > 0;
            const color = isAllDone ? '#34d399' : done > 0 ? '#818cf8' : '#fbbf24';
            const bg = isAllDone ? 'rgba(16, 185, 129, 0.12)' : done > 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(251, 191, 36, 0.12)';
            const border = isAllDone ? 'rgba(16, 185, 129, 0.3)' : done > 0 ? 'rgba(99, 102, 241, 0.3)' : 'rgba(251, 191, 36, 0.3)';
            const icon = isAllDone ? 'fa-check-circle' : 'fa-tasks';

            taskBadge = `<span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; background: ${bg}; border: 1px solid ${border}; font-size: 0.82rem; font-weight: 600; color: ${color}; white-space: nowrap;" title="${done} van de ${total} taken voltooid">
                <i class="fas ${icon}"></i> ${done}/${total} af
            </span>`;
        }

        let msgBadge = '';
        const msgs = p.messages || [];
        if (msgs.length > 0) {
            const unreadCount = msgs.filter(m => m.sender === 'client' && (m.status === 'open' || !m.readByAdmin)).length;
            if (unreadCount > 0) {
                msgBadge = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); font-size: 0.8rem; font-weight: 700; color: #f87171; white-space: nowrap;" title="${unreadCount} openstaande ticket(s)/bericht(en)">
                    <i class="fas fa-comment-dots"></i> ${unreadCount}
                </span>`;
            } else {
                msgBadge = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); font-size: 0.8rem; font-weight: 600; color: var(--color-accent); white-space: nowrap;" title="${msgs.length} bericht(en) in historie">
                    <i class="fas fa-comments"></i> ${msgs.length}
                </span>`;
            }
        }

        return `<div class="table-task-badges" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">${taskBadge}${msgBadge}</div>`;
    };

    const formatEmail = (email) => {
        if (!email || email.trim() === '' || email === '—') {
            return `<span style="color: var(--color-text-secondary); font-style: italic; font-size: 0.85rem;">Geen e-mail</span>`;
        }
        const safeEmail = escapeHtml(email.trim());
        return `<a href="mailto:${safeEmail}" class="table-email-link" title="Stuur e-mail naar ${safeEmail}"><i class="fas fa-envelope"></i> ${safeEmail}</a>`;
    };

    const formatDomain = (domain) => {
        if (!domain || domain.trim() === '' || domain.toLowerCase() === 'nog geen domein' || domain.toLowerCase() === 'geen' || domain.toLowerCase() === 'n.v.t.') {
            return `<span style="color: var(--color-text-secondary); font-style: italic; font-size: 0.85rem;">Geen domein</span>`;
        }
        const trimmed = domain.trim();
        const rawHref = (trimmed.startsWith('http://') || trimmed.startsWith('https://')) ? trimmed : 'https://' + trimmed;
        const safeHref = sanitizeUrl(rawHref);
        const cleanDomain = escapeHtml(trimmed);
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="table-domain-link" title="Open ${cleanDomain}"><i class="fas fa-globe"></i> ${cleanDomain}</a>`;
    };

    const createRow = (p) => {
        const row = document.createElement('tr');
        const statusInfo = formatProjectStatus(p.status, p.statusClass);
        const safeClient = escapeHtml(p.client || p.companyName || 'Onbekend');
        const taskCounterHtml = formatTaskCounter(p);
        const emailHtml = formatEmail(p.email);
        const domainHtml = formatDomain(p.domainName || p.domain);
        const safeDate = escapeHtml(p.date || 'Onbekend');
        const safeId = escapeHtml(p.id);
        const safeStatusDisplay = escapeHtml(statusInfo.label);
        const safeStatusClass = escapeHtml(statusInfo.badgeClass);

        row.innerHTML = `
            <td><strong style="color: #fff;">${safeClient}</strong></td>
            <td style="white-space: nowrap;">${taskCounterHtml}</td>
            <td style="white-space: nowrap;">${emailHtml}</td>
            <td style="white-space: nowrap;">${domainHtml}</td>
            <td style="white-space: nowrap;"><span class="badge badge-${safeStatusClass}">${safeStatusDisplay}</span></td>
            <td style="white-space: nowrap;"><span style="color: var(--color-text-secondary); font-size: 0.85rem;">${safeDate}</span></td>
            <td style="white-space: nowrap;">
                <a href="project.html?id=${safeId}" class="btn btn-primary btn-sm" style="text-decoration: none;" title="Open Dedicated Werkplek"><i class="fas fa-desktop"></i> Werkplek</a>
                <a href="../status/index.html?preview=true&id=${safeId}" target="_blank" class="btn btn-sm" style="text-decoration: none; background: rgba(34, 211, 238, 0.12); color: #22d3ee; border: 1px solid rgba(34, 211, 238, 0.35);" title="Open Klantview (Preview zoals de klant het ziet)"><i class="fas fa-eye"></i> Klantview</a>
                <button class="btn btn-secondary btn-sm" data-action="details" data-id="${safeId}"><i class="fas fa-sliders-h"></i> Snelmenu</button>
                <button class="btn btn-sm" data-action="delete" data-id="${safeId}" style="background: var(--danger-color, #ef4444); color: white; border: none; padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer; margin-left: 5px;" title="Verwijderen"><i class="fas fa-trash"></i></button>
            </td>
        `;

        const detailsBtn = row.querySelector('[data-action="details"]');
        const deleteBtn = row.querySelector('[data-action="delete"]');

        if (detailsBtn && handlers.onOpenDetails) {
            detailsBtn.addEventListener('click', () => handlers.onOpenDetails(p.id));
        } else if (detailsBtn && window.openProjectDetails) {
            detailsBtn.addEventListener('click', () => window.openProjectDetails(p.id));
        }

        if (deleteBtn && handlers.onDelete) {
            deleteBtn.addEventListener('click', () => handlers.onDelete(p.id));
        } else if (deleteBtn && window.deleteProject) {
            deleteBtn.addEventListener('click', () => window.deleteProject(p.id));
        }

        return row;
    };

    // A. Overview Table
    const overviewBody = document.querySelector('#projects-table tbody');
    if (overviewBody) {
        overviewBody.innerHTML = '';
        if (projectsToRender.length === 0) {
            overviewBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen resultaten gevonden voor deze zoekopdracht/filter.</td></tr>`;
        } else {
            projectsToRender.forEach(p => overviewBody.appendChild(createRow(p)));
        }
    }

    // B. Leads & Intakes Table
    const leadsBody = document.querySelector('#leads-table tbody');
    if (leadsBody) {
        leadsBody.innerHTML = '';
        const leads = projectsToRender.filter(p => formatProjectStatus(p.status).phase === 1);
        if (leads.length === 0) {
            leadsBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-secondary); padding: 32px 20px; line-height: 1.6;">
                <i class="fas fa-inbox" style="font-size: 1.8rem; margin-bottom: 8px; display: block; opacity: 0.35;"></i>
                Geen nieuwe binnenkomende website-intakes in de wachtrij.<br>
                <span style="font-size: 0.82rem; color: #94a3b8;">Koude AI-prospects en concept-websites vind je onder <strong style="color: #38bdf8;">Autonome Leads</strong> in het linkermenu, of voeg direct handmatig een lead toe via de knop hierboven.</span>
            </td></tr>`;
        } else {
            leads.forEach(p => leadsBody.appendChild(createRow(p)));
        }
    }

    // C. Lopende Projecten Table
    const activeProjectsBody = document.querySelector('#active-projects-table tbody');
    if (activeProjectsBody) {
        activeProjectsBody.innerHTML = '';
        const activeProjects = projectsToRender.filter(p => formatProjectStatus(p.status).phase > 1);
        if (activeProjects.length === 0) {
            activeProjectsBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen lopende projecten gevonden.</td></tr>`;
        } else {
            activeProjects.forEach(p => activeProjectsBody.appendChild(createRow(p)));
        }
    }
}

/**
 * Sanitizes a value against CSV formula injection (CWE-1236).
 * Neutralizes leading =, +, -, @, tab, or carriage return characters.
 */
export function sanitizeCsvField(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }
    return str.replace(/"/g, '""');
}

/**
 * Exports current project dataset to CSV.
 */
export function exportProjectsToCSV(cachedProjects) {
    if (!cachedProjects || cachedProjects.length === 0) {
        alert("Geen projectgegevens om te exporteren.");
        return;
    }

    const headers = [
        "Project ID", "Klantnaam", "Bedrijfsnaam", "Contactpersoon",
        "E-mailadres", "Telefoonnummer", "Domeinnaam", "Dienst",
        "Huidige Fase", "Status Omschrijving", "Offertebedrag Excl BTW",
        "Offertebedrag Incl BTW", "Doelstellingen", "Taken Voltooid",
        "Taken Totaal", "Aanmaakdatum", "Exportdatum"
    ];

    const rows = cachedProjects.map(p => {
        const tasks = p.tasks || [];
        const doneTasks = tasks.filter(t => t.completed || t.status === 'done').length;
        const statusInfo = formatProjectStatus(p.status, p.statusClass);
        const priceClean = (p.proposalPrice || "0").toString().replace(/[^0-9,.-]/g, '').replace('.', ',');
        const numPrice = parseFloat((p.proposalPrice || "0").toString().replace(',', '.')) || 0;
        const numWithVat = (numPrice * (1 + (BRANDING.defaultVatPercentage / 100))).toFixed(2).replace('.', ',');

        return [
            `"${sanitizeCsvField(p.id)}"`,
            `"${sanitizeCsvField(p.client || p.companyName)}"`,
            `"${sanitizeCsvField(p.companyName || p.client)}"`,
            `"${sanitizeCsvField(p.contactName || p.client)}"`,
            `"${sanitizeCsvField(p.email)}"`,
            `"${sanitizeCsvField(p.phone || p.telephone)}"`,
            `"${sanitizeCsvField(p.domainName || p.domain)}"`,
            `"${sanitizeCsvField(p.service)}"`,
            `"${sanitizeCsvField(statusInfo.label.split(':')[0])}"`,
            `"${sanitizeCsvField(statusInfo.label)}"`,
            `"${sanitizeCsvField(priceClean)}"`,
            `"${sanitizeCsvField(numWithVat)}"`,
            `"${sanitizeCsvField(p.goals)}"`,
            doneTasks,
            tasks.length,
            `"${sanitizeCsvField(p.date)}"`,
            `"${sanitizeCsvField(new Date().toLocaleDateString('nl-NL'))}"`
        ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${BRANDING.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_CRM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
