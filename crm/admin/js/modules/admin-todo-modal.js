/**
 * @file crm/admin/js/modules/admin-todo-modal.js
 * TODO.md DevOps Backlog Sync & Export Controller Module.
 * Biedt tweerichtingssynchronisatie tussen lokale markdown backlogs en Firestore projecten.
 * Creation+Alt+Fix CRM (2026/2027)
 */

import { doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml } from "../../../js/firebase-config.js";
import { parseTodoMarkdown, syncTodoToFirestore, exportKanbanToTodoMarkdown, PROJECT_PROFILES } from "../../../js/todo-sync.js";
import { Toast } from "../../../js/core/toast.js";

export const FALLBACK_TODO_MARKDOWN = `# 🛠️ Creation+Alt+Fix - DevOps Backlog & Engineering Roadmap

## 📊 Sprint Status Dashboard
| Metric | Status | Count |
| :--- | :--- | :--- |
| **Total Features / Backlog Tasks** | 🔢 Tracked | **40 Active Epics & Tasks** |
| **CI/CD Pipeline Status** | 🚀 Automated | **GitHub Actions FTP (\`main.yml\`)** |
`;

let currentTodoMarkdownContent = '';
let currentParsedTasks = [];

/**
 * Haalt TODO.md op via verschillende kandidaat-paden
 */
export async function fetchTodoMarkdown() {
    const candidateUrls = [
        '../../TODO.md?t=' + Date.now(),
        '../TODO.md?t=' + Date.now(),
        'TODO.md?t=' + Date.now(),
        '/TODO.md?t=' + Date.now(),
        '/crm/TODO.md?t=' + Date.now(),
        'https://raw.githubusercontent.com/McMadA/Creation-Alt-Fix/main/TODO.md'
    ];

    for (const url of candidateUrls) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                if (text && text.includes('Sprint Status Dashboard')) {
                    currentTodoMarkdownContent = text;
                    return currentTodoMarkdownContent;
                }
            }
        } catch (e) {
            // probeer volgende kandidaat
        }
    }

    currentTodoMarkdownContent = FALLBACK_TODO_MARKDOWN;
    return currentTodoMarkdownContent;
}

/**
 * Opent de TODO sync modal en parseert de actuele taken
 */
export async function openTodoSyncModal(getProjectsFn) {
    const modal = document.getElementById('todo-sync-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    switchSyncModalTab('import', getProjectsFn);

    const totalBadge = document.getElementById('sync-parsed-total-badge');
    const statusMsg = document.getElementById('sync-execution-status');

    if (totalBadge) totalBadge.innerText = 'Laden...';
    if (statusMsg) statusMsg.innerHTML = '<i class="fas fa-spinner fa-spin text-accent"></i> TODO.md backlog inlezen en analyseren...';

    const md = await fetchTodoMarkdown();
    currentParsedTasks = parseTodoMarkdown(md || FALLBACK_TODO_MARKDOWN);
    renderSyncBreakdown(currentParsedTasks);

    const exportArea = document.getElementById('todo-export-textarea');
    if (exportArea && typeof getProjectsFn === 'function') {
        exportArea.value = exportKanbanToTodoMarkdown(md || FALLBACK_TODO_MARKDOWN, getProjectsFn());
    }

    if (statusMsg) {
        statusMsg.innerHTML = `<span style="color: #34d399;"><i class="fas fa-check-circle"></i> <strong>${currentParsedTasks.length} taken</strong> geanalyseerd uit TODO.md. Klaar voor synchronisatie.</span>`;
    }
}

/**
 * Rendert de projectverdeling van de geparseerde taken
 */
export function renderSyncBreakdown(tasks) {
    const totalBadge = document.getElementById('sync-parsed-total-badge');
    const breakdownGrid = document.getElementById('sync-project-breakdown-grid');
    if (!breakdownGrid) return;

    breakdownGrid.innerHTML = '';
    const summaryByProject = {};

    (tasks || []).forEach(t => {
        const p = t.targetProject || PROJECT_PROFILES.CRM_PORTAL;
        const pName = p.client;
        if (!summaryByProject[pName]) {
            summaryByProject[pName] = { profile: p, tasks: [] };
        }
        summaryByProject[pName].tasks.push(t);
    });

    if (totalBadge) {
        totalBadge.innerText = `${tasks.length} Taken over ${Object.keys(summaryByProject).length} Projecten`;
    }

    for (const [pName, group] of Object.entries(summaryByProject)) {
        const card = document.createElement('div');
        card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;';
        
        const doneCount = group.tasks.filter(t => t.status === 'done').length;
        const activeCount = group.tasks.length - doneCount;

        card.innerHTML = `
            <div style="overflow: hidden; padding-right: 6px;">
                <div style="font-size: 0.8rem; font-weight: 600; color: #fff; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;" title="${escapeHtml(pName)}">
                    ${escapeHtml(pName)}
                </div>
                <div style="font-size: 0.7rem; color: var(--color-text-secondary);">
                    ${doneCount} voltooid · ${activeCount} openstaand
                </div>
            </div>
            <span class="badge badge-active" style="font-size: 0.72rem; padding: 2px 6px; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: var(--color-primary-light);">
                ${group.tasks.length} taken
            </span>
        `;
        breakdownGrid.appendChild(card);
    }
}

/**
 * Schakelt tussen import- en exportweergave in de modal
 */
export function switchSyncModalTab(tab, getProjectsFn) {
    const paneImport = document.getElementById('pane-sync-import');
    const paneExport = document.getElementById('pane-sync-export');
    const btnImport = document.getElementById('tab-btn-sync-import');
    const btnExport = document.getElementById('tab-btn-sync-export');

    if (tab === 'import') {
        paneImport?.classList.remove('hidden');
        paneExport?.classList.add('hidden');
        btnImport?.classList.replace('btn-secondary', 'btn-primary');
        btnExport?.classList.replace('btn-primary', 'btn-secondary');
    } else {
        paneImport?.classList.add('hidden');
        paneExport?.classList.remove('hidden');
        btnExport?.classList.replace('btn-secondary', 'btn-primary');
        btnImport?.classList.replace('btn-primary', 'btn-secondary');

        const exportArea = document.getElementById('todo-export-textarea');
        if (exportArea && typeof getProjectsFn === 'function') {
            exportArea.value = exportKanbanToTodoMarkdown(currentTodoMarkdownContent || FALLBACK_TODO_MARKDOWN, getProjectsFn());
        }
    }
}

/**
 * Voert de Firestore synchronisatie uit
 */
export async function handleExecuteTodoSync(getProjectsFn, db, onSyncComplete) {
    const btn = document.getElementById('btn-execute-todo-sync');
    const statusMsg = document.getElementById('sync-execution-status');

    if (!currentParsedTasks || currentParsedTasks.length === 0) {
        Toast.show({ title: "Geen taken gevonden", message: "Herlaad het bestand eerst.", type: "warning" });
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Synchroniseren...';
    }
    if (statusMsg) {
        statusMsg.innerHTML = '<i class="fas fa-spinner fa-spin text-accent"></i> Bezig met bijwerken van Firestore documenten...';
    }

    try {
        const cachedProjects = typeof getProjectsFn === 'function' ? getProjectsFn() : [];
        const summary = await syncTodoToFirestore(cachedProjects, currentParsedTasks, db, updateDoc, setDoc, doc);
        
        if (typeof onSyncComplete === 'function') {
            await onSyncComplete(summary);
        }

        if (statusMsg) {
            statusMsg.innerHTML = `
                <div style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: 6px; padding: 8px 12px; color: #34d399; width: 100%;">
                    <i class="fas fa-check-circle"></i> <strong>Synchronisatie Voltooid!</strong><br>
                    <span style="font-size: 0.8rem; color: #a7f3d0;">
                        ${summary.totalTasks} taken verwerkt over ${summary.projectsAffected} projecten (${summary.projectsCreated} nieuw).
                    </span>
                </div>
            `;
        }

        Toast.show({
            title: "TODO.md Gesynchroniseerd",
            message: `${summary.totalTasks} taken bijgewerkt in CRM.`,
            type: "success"
        });
    } catch (err) {
        console.error("Fout tijdens synchronisatie:", err);
        if (statusMsg) {
            statusMsg.innerHTML = `<span style="color: #f87171;"><i class="fas fa-times-circle"></i> Fout bij synchroniseren: ${escapeHtml(err.message)}</span>`;
        }
        Toast.show({ title: "Fout bij synchroniseren", message: err.message, type: "error" });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bolt"></i> 🚀 Nu Synchroniseren naar Firestore';
        }
    }
}

/**
 * Kopieert de actuele Kanban export naar het klembord
 */
export function handleCopyExportMarkdown() {
    const exportArea = document.getElementById('todo-export-textarea');
    const feedback = document.getElementById('export-copy-feedback');
    if (!exportArea || !exportArea.value) return;

    navigator.clipboard.writeText(exportArea.value).then(() => {
        if (feedback) {
            feedback.innerHTML = '<i class="fas fa-check"></i> Gekopieerd!';
            setTimeout(() => { feedback.innerHTML = ''; }, 3000);
        }
        Toast.show({ title: "Gekopieerd naar klembord", type: "info", duration: 2000 });
    }).catch(() => {
        exportArea.select();
        document.execCommand('copy');
        Toast.show({ title: "Gekopieerd!", type: "info", duration: 2000 });
    });
}

/**
 * Downloadt de actuele export als TODO.md bestand
 */
export function handleDownloadExportMarkdown() {
    const exportArea = document.getElementById('todo-export-textarea');
    if (!exportArea || !exportArea.value) return;

    const blob = new Blob([exportArea.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TODO.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Initialiseert alle listeners voor de TODO sync modal
 */
export function setupTodoSyncListeners(getProjectsFn, db, onSyncComplete) {
    document.getElementById('btn-open-todo-sync-modal')?.addEventListener('click', () => openTodoSyncModal(getProjectsFn));
    document.getElementById('btn-close-todo-sync-modal')?.addEventListener('click', () => {
        document.getElementById('todo-sync-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-cancel-todo-sync')?.addEventListener('click', () => {
        document.getElementById('todo-sync-modal')?.classList.add('hidden');
    });
    document.getElementById('tab-btn-sync-import')?.addEventListener('click', () => switchSyncModalTab('import', getProjectsFn));
    document.getElementById('tab-btn-sync-export')?.addEventListener('click', () => switchSyncModalTab('export', getProjectsFn));
    document.getElementById('btn-reload-todo-file')?.addEventListener('click', () => openTodoSyncModal(getProjectsFn));
    document.getElementById('btn-execute-todo-sync')?.addEventListener('click', () => handleExecuteTodoSync(getProjectsFn, db, onSyncComplete));
    document.getElementById('btn-copy-todo-markdown')?.addEventListener('click', handleCopyExportMarkdown);
    document.getElementById('btn-download-todo-markdown')?.addEventListener('click', handleDownloadExportMarkdown);
}
