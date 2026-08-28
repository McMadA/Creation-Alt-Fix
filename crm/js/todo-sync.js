/**
 * Creation+Alt+Fix - TODO.md DevOps Backlog & CRM Kanban Synchronizer
 * [TASK-814] Intelligent Two-Way Synchronization Engine
 * 
 * Provides:
 * 1. Markdown Backlog Parser (Epics, Tasks, Priorities, Statuses, Deliverables)
 * 2. Intelligent Project Mapping Matrix (Assigns tasks to CRM Client Projects & Internal Platforms)
 * 3. Firestore Kanban Synchronization (Auto-provisioning missing projects & merging task states)
 * 4. Two-Way Markdown Exporter (Recalculates Sprint Dashboard KPIs & updates task statuses)
 */

import { escapeHtml } from "./firebase-config.js";

/**
 * Standard project mapping dictionary and metadata seed profiles.
 */
export const PROJECT_PROFILES = {
    CRM_PORTAL: {
        id: "7",
        matchKeys: ["crm", "portaal", "portal", "creation+alt+fix (crm", "epic-01", "epic-02", "epic-03", "epic-04", "epic-06", "task-813", "task-814", "task-815", "task-816", "task-818"],
        client: "Creation+Alt+Fix (CRM & Portaal)",
        companyName: "Creation+Alt+Fix (CRM & Portaal)",
        contactName: "Allard Veldman",
        email: "info@creationaltfix.nl",
        domainName: "portal.creationaltfix.nl",
        domain: "portal.creationaltfix.nl",
        service: "Custom CRM & Klantenportaal Applicatie",
        goals: "Proprietary Vanilla JS CRM systeem met Firebase Auth, Firestore real-time database, live 5-fasen voortgangstracker (/status), dedicated full-screen projectpagina's, Kanban bord, audit trail logboek en digitale offerte-ondertekening.",
        design: "Full-screen dark workspace, responsive stat cards, Kanban kolommen, realtime filters en CSV export.",
        status: "In Ontwikkeling",
        statusClass: "active",
        date: "25-08-2026",
        proposalPrice: "0,00"
    },
    HOOFDWEBSITE: {
        id: "6",
        matchKeys: ["hoofdwebsite", "creation+alt+fix (hoofdwebsite", "marketing site", "epic-05", "epic-07", "task-805", "task-807", "task-811", "task-812"],
        client: "Creation+Alt+Fix (Hoofdwebsite)",
        companyName: "Creation+Alt+Fix (Hoofdwebsite)",
        contactName: "Allard Veldman",
        email: "info@creationaltfix.nl",
        domainName: "www.creationaltfix.nl",
        domain: "www.creationaltfix.nl",
        service: "Website & Portfolio Platform (Dark AI)",
        goals: "Hoofdwebsite voor software support & AI-diensten. Voorzien van meertaligheid (NL/EN), intake funnels, interactieve portfolio showcase met 13 projecten en Dark AI design token architectuur.",
        design: "Dark AI thema, glassmorphism borders, Space Grotesk / Inter typografie, indigo & cyan gradients.",
        status: "Opgeleverd (Livegang)",
        statusClass: "success",
        date: "25-08-2026",
        proposalPrice: "0,00"
    },
    BESSELING: {
        id: "8",
        matchKeys: ["besseling", "maico", "besselinginstallatietechniek", "task-801"],
        client: "Besseling Installatietechniek",
        companyName: "Besseling Installatietechniek",
        contactName: "Maico Besseling",
        email: "info@besselinginstallatietechniek.nl",
        domainName: "www.besselinginstallatietechniek.nl",
        domain: "www.besselinginstallatietechniek.nl",
        service: "Installatie & Elektra Website",
        goals: "Professionele website voor loodgieterswerk, cv-ketels, warmtepompen en elektra.",
        design: "Modern, fris wit met blauw/oranje accenten.",
        status: "In Ontwikkeling",
        statusClass: "active",
        date: "25-08-2026",
        proposalPrice: "650,00"
    },
    ARNOLD: {
        id: "5",
        matchKeys: ["arnold", "arnold design", "doornbos", "task-802"],
        client: "Arnold Doornbos (Arnold Design)",
        companyName: "Arnold Doornbos (Arnold Design)",
        contactName: "Arnold Doornbos",
        email: "arnolddesign2024@gmail.com",
        domainName: "www.arnolddesign.nl",
        domain: "www.arnolddesign.nl",
        service: "Kunstenaarsportfolio & Webapplicatie",
        goals: "Interactieve artist portfolio showcase voor grafisch ontwerp, typografie, portrettekeningen en monumentaal glas-in-lood vakmanschap.",
        design: "Eigentijds, donker atelier-thema, lichte glasaccenten, minimalistische typografie.",
        status: "Design & Ontwerp (Fase 3)",
        statusClass: "active",
        date: "25-08-2026",
        proposalPrice: "850,00"
    },
    ANGELA: {
        id: "9",
        matchKeys: ["angela", "stenekes", "angelastenekes", "task-803", "task-817"],
        client: "Angela Stenekes",
        companyName: "Angela Stenekes",
        contactName: "Angela Stenekes",
        email: "contact@angelastenekes.nl",
        domainName: "www.angelastenekes.nl",
        domain: "www.angelastenekes.nl",
        service: "Website Laten Maken & Vibecoding",
        goals: "Persoonlijke website en showcase portfolio.",
        design: "Stijlvol, minimalistisch, modern.",
        status: "Nieuwe Lead",
        statusClass: "concept",
        date: "25-08-2026",
        proposalPrice: "500,00"
    },
    HBI: {
        id: "10",
        matchKeys: ["home buyer", "hbi", "proptech", "task-804"],
        client: "Home Buyer Intelligence",
        companyName: "Home Buyer Intelligence (PropTech AI)",
        contactName: "Allard Veldman",
        email: "info@creationaltfix.nl",
        domainName: "hbi.creationaltfix.nl",
        domain: "hbi.creationaltfix.nl",
        service: "PropTech AI Webapplicatie",
        goals: "Intelligente vastgoeddata analyse en geautomatiseerde aankoopadviezen met AI Revisor agent in local mode.",
        design: "Modern dashboard, 3D architectuur visualisatie, real-time filters.",
        status: "In Ontwikkeling",
        statusClass: "active",
        date: "25-08-2026",
        proposalPrice: "0,00"
    },
    BAKKERTJESIEG: {
        id: "11",
        matchKeys: ["bakkertjesieg", "siegert"],
        client: "BakkertjeSieg",
        companyName: "BakkertjeSieg",
        contactName: "Siegert",
        email: "bakkertjesieg@gmail.com",
        domainName: "www.bakkertjesieg.nl",
        domain: "www.bakkertjesieg.nl",
        service: "Webshop & Digitaal Bestelsysteem",
        goals: "Ambachtelijke bakkerij webshop met digitale downloads, iDEAL betalingen en nieuwsbriefintegratie.",
        design: "Warm, gastvrij, ambachtelijk.",
        status: "Opgeleverd (Livegang)",
        statusClass: "success",
        date: "25-08-2026",
        proposalPrice: "750,00"
    },
    FTRUCK: {
        id: "12",
        matchKeys: ["ftruck", "f-truck", "ford trucks", "task-809"],
        client: "F-Truck Store",
        companyName: "F-Truck Store (ftruckstore.nl)",
        contactName: "F-Truck Store Beheer",
        email: "info@ftruckstore.nl",
        domainName: "ftruckstore.nl / ftruckstore.com",
        domain: "ftruckstore.nl",
        service: "Hosting & Website Migratie",
        goals: "Bestaande webshop en platform voor Ford F-Series trucks en onderdelen gemigreerd naar onze managed hostingomgeving.",
        design: "Bestaand webshop design behouden (Geen herontwerp vereist).",
        status: "Opgeleverd (Livegang)",
        statusClass: "success",
        date: "25-08-2026",
        proposalPrice: "0,00"
    },
    VANDERPLAATS: {
        id: "vanderplaats",
        matchKeys: ["vanderplaats", "gerard klusser", "plaats", "task-808"],
        client: "VAN DER PLAATS (Gerard Klusser)",
        companyName: "VAN DER PLAATS (Gerard Klusser)",
        contactName: "Gerard Klusser",
        email: "vanderplaats2@gmail.com",
        domainName: "www.vanderplaats.nl",
        domain: "www.vanderplaats.nl",
        service: "Website & Klusbedrijf Formulier Backend",
        goals: "Professionele klusbedrijf website met werkend contact- en offerteformulier dat veilig e-mails verzendt naar vanderplaats2@gmail.com (Tel: +31 6 12104850, KvK: 98527339).",
        design: "Robuust, betrouwbaar, modern klusbedrijf thema.",
        status: "In Ontwikkeling",
        statusClass: "active",
        date: "26-08-2026",
        proposalPrice: "650,00"
    },
    JUSTIN: {
        id: "justin",
        matchKeys: ["justin", "task-810"],
        client: "Justin",
        companyName: "Justin",
        contactName: "Justin",
        email: "contact@justin.nl",
        domainName: "www.justin.nl",
        domain: "www.justin.nl",
        service: "Website Laten Maken & Prototype",
        goals: "Wensen en doelstellingen inventariseren, Dark AI prototype template opzetten en offerte opstellen.",
        design: "Dark AI modern, strak, interactief.",
        status: "Nieuwe Lead",
        statusClass: "concept",
        date: "27-08-2026",
        proposalPrice: "600,00"
    }
};

/**
 * Parses raw TODO.md markdown content into a structured list of Epics and Tasks.
 * @param {string} markdown 
 * @returns {Array<Object>} List of parsed task objects
 */
export function parseTodoMarkdown(markdown) {
    if (!markdown || typeof markdown !== 'string') return [];

    const lines = markdown.split(/\r?\n/);
    const tasks = [];
    let currentEpic = null;
    let currentTask = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match Epic Header: e.g. "### 🚀 EPIC-01: CRM & Client Portal Infrastructure"
        const epicMatch = line.match(/^###\s+[^\w]*\s*(EPIC-\d+):\s*(.+)$/i);
        if (epicMatch) {
            currentEpic = {
                code: epicMatch[1].toUpperCase(),
                title: epicMatch[2].trim()
            };
            currentTask = null;
            continue;
        }

        // Match Task Item: e.g. "- [x] `[TASK-101]` `[P1-CRITICAL]` `[STATUS: DONE]` **Title**"
        // Also supports "- [ ] `[TASK-814]` ...", "- [~] `[TASK-501]` ..."
        const taskMatch = line.match(/^-\s*\[([ xX~])\]\s*`\[(TASK-\d+|MIG-\d+)\]`\s*`\[(P\d+[^\]]*)\]`\s*`\[STATUS:\s*([^\]]+)\]`\s*\*\*(.+?)\*\*/i);
        if (taskMatch) {
            const checkMark = taskMatch[1].trim().toLowerCase();
            const taskCode = taskMatch[2].toUpperCase();
            const rawPriority = taskMatch[3].toUpperCase();
            const rawStatus = taskMatch[4].trim().toUpperCase();
            const rawTitle = taskMatch[5].trim();

            // Normalize Status
            let normalizedStatus = 'todo';
            let completed = false;

            if (checkMark === 'x' || rawStatus === 'DONE' || rawStatus === 'VOLTOOID') {
                normalizedStatus = 'done';
                completed = true;
            } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'IN BEHANDELING' || rawStatus === 'BEZIG') {
                normalizedStatus = 'inprogress';
            } else if (rawStatus === 'REVIEW' || rawStatus === 'TESTEN' || rawStatus === 'FEEDBACK') {
                normalizedStatus = 'review';
            } else if (checkMark === '~' || rawStatus === 'CANCELLED' || rawStatus === 'GEANNULEERD') {
                normalizedStatus = 'cancelled';
            } else {
                normalizedStatus = 'todo';
            }

            // Normalize Priority
            let priority = 'medium';
            if (rawPriority.includes('P1') || rawPriority.includes('CRITICAL') || rawPriority.includes('P2') || rawPriority.includes('HIGH')) {
                priority = 'high';
            } else if (rawPriority.includes('P4') || rawPriority.includes('LOW')) {
                priority = 'low';
            }

            currentTask = {
                id: taskCode.toLowerCase().replace('-', '_'),
                taskCode: taskCode,
                title: `[${taskCode}] ${rawTitle}`,
                cleanTitle: rawTitle,
                status: normalizedStatus,
                completed: completed,
                priority: priority,
                rawPriority: rawPriority,
                rawStatus: rawStatus,
                epicCode: currentEpic ? currentEpic.code : null,
                epicTitle: currentEpic ? currentEpic.title : null,
                scope: '',
                details: '',
                subtasks: [],
                dueDate: calculateDefaultDueDate(normalizedStatus, taskCode)
            };

            // Map target project
            currentTask.targetProject = mapTaskToProject(currentTask);

            tasks.push(currentTask);
            continue;
        }

        // Parse Scope, Details, Acceptance Criteria, Tasks under current task
        if (currentTask) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- **Scope**:')) {
                currentTask.scope = trimmed.replace('- **Scope**:', '').trim();
            } else if (trimmed.startsWith('- **Details**:')) {
                currentTask.details = trimmed.replace('- **Details**:', '').trim();
            } else if (trimmed.startsWith('- **Tasks**:')) {
                currentTask.details = trimmed.replace('- **Tasks**:', '').trim();
            } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                const subtaskText = trimmed.replace(/^[-*]\s*/, '').trim();
                if (subtaskText && !subtaskText.startsWith('**Scope**') && !subtaskText.startsWith('**Details**')) {
                    currentTask.subtasks.push(subtaskText);
                }
            }
        }
    }

    return tasks;
}

/**
 * Intelligent project assignment heuristic matrix.
 * @param {Object} task 
 * @returns {Object} Target project metadata
 */
export function mapTaskToProject(task) {
    const code = (task.taskCode || '').toUpperCase();
    const title = (task.cleanTitle || task.title || '').toLowerCase();
    const epic = (task.epicCode || '').toUpperCase();
    const scope = (task.scope || '').toLowerCase();
    const details = (task.details || '').toLowerCase();
    const fullText = `${code} ${title} ${epic} ${scope} ${details}`;

    // 1. Check explicit task code mappings
    if (code === 'TASK-801' || fullText.includes('besseling') || fullText.includes('maico')) {
        return PROJECT_PROFILES.BESSELING;
    }
    if (code === 'TASK-802' || fullText.includes('arnold') || fullText.includes('glas-in-lood')) {
        return PROJECT_PROFILES.ARNOLD;
    }
    if (code === 'TASK-803' || code === 'TASK-817' || fullText.includes('angela') || fullText.includes('angelastenekes')) {
        return PROJECT_PROFILES.ANGELA;
    }
    if (code === 'TASK-804' || fullText.includes('home buyer') || fullText.includes('hbi') || fullText.includes('proptech')) {
        return PROJECT_PROFILES.HBI;
    }
    if (code === 'TASK-808' || fullText.includes('vanderplaats') || fullText.includes('gerard klusser')) {
        return PROJECT_PROFILES.VANDERPLAATS;
    }
    if (code === 'TASK-809' || fullText.includes('ftruck') || fullText.includes('f-truck')) {
        return PROJECT_PROFILES.FTRUCK;
    }
    if (code === 'TASK-810' || fullText.includes('justin')) {
        return PROJECT_PROFILES.JUSTIN;
    }
    if (code === 'TASK-805' || code === 'TASK-807' || code === 'TASK-811' || code === 'TASK-812') {
        return PROJECT_PROFILES.HOOFDWEBSITE;
    }
    if (code === 'TASK-813' || code === 'TASK-814' || code === 'TASK-815' || code === 'TASK-816' || code === 'TASK-818') {
        return PROJECT_PROFILES.CRM_PORTAL;
    }

    // 2. Check Epic Level Mappings
    if (epic === 'EPIC-01' || epic === 'EPIC-02' || epic === 'EPIC-03' || epic === 'EPIC-04' || epic === 'EPIC-06') {
        return PROJECT_PROFILES.CRM_PORTAL;
    }
    if (epic === 'EPIC-05' || epic === 'EPIC-07') {
        return PROJECT_PROFILES.HOOFDWEBSITE;
    }

    // 3. Fallback: Search all match keys
    for (const key of Object.keys(PROJECT_PROFILES)) {
        const profile = PROJECT_PROFILES[key];
        if (profile.matchKeys.some(mk => fullText.includes(mk))) {
            return profile;
        }
    }

    // Default Fallback
    return PROJECT_PROFILES.CRM_PORTAL;
}

/**
 * Calculates a reasonable default due date string (YYYY-MM-DD) based on status and task code.
 */
function calculateDefaultDueDate(status, taskCode) {
    if (status === 'done') return '2026-08-25';
    const num = parseInt(taskCode.replace(/\D/g, ''), 10) || 100;
    const dayOffset = (num % 20) + 1;
    const day = dayOffset < 10 ? `0${dayOffset}` : `${dayOffset}`;
    return `2026-09-${day}`;
}

/**
 * Synchronizes parsed tasks with existing Firestore or mock projects.
 * @param {Array} currentProjects - Array of existing projects
 * @param {Array} parsedTasks - Array of tasks parsed from TODO.md
 * @param {Object} db - Firestore database instance (optional)
 * @param {Function} updateDocFn - Firestore updateDoc (optional)
 * @param {Function} setDocFn - Firestore setDoc (optional)
 * @param {Function} docFn - Firestore doc (optional)
 * @returns {Promise<Object>} Summary of sync results
 */
export async function syncTodoToFirestore(currentProjects, parsedTasks, db = null, updateDocFn = null, setDocFn = null, docFn = null) {
    const summary = {
        totalTasks: parsedTasks.length,
        projectsAffected: 0,
        projectsCreated: 0,
        tasksAddedOrUpdated: 0,
        detailsByProject: {}
    };

    // Group parsed tasks by target project identifier
    const tasksByTarget = {};
    parsedTasks.forEach(task => {
        // Skip cancelled tasks
        if (task.status === 'cancelled') return;

        const target = task.targetProject || PROJECT_PROFILES.CRM_PORTAL;
        const targetId = target.id;
        if (!tasksByTarget[targetId]) {
            tasksByTarget[targetId] = {
                profile: target,
                tasks: []
            };
        }
        tasksByTarget[targetId].tasks.push(task);
    });

    // Match or provision projects
    for (const [targetKey, group] of Object.entries(tasksByTarget)) {
        const profile = group.profile;
        const newTasks = group.tasks;

        // Find existing project in current projects
        let existingProj = currentProjects.find(p => {
            if (String(p.id) === String(profile.id)) return true;
            const pName = (p.client || p.companyName || '').toLowerCase();
            const targetName = profile.client.toLowerCase();
            if (pName === targetName) return true;
            if (profile.matchKeys.some(mk => pName.includes(mk))) return true;
            return false;
        });

        let isNewlyCreated = false;
        if (!existingProj) {
            // Provision new project document
            existingProj = {
                id: profile.id,
                client: profile.client,
                companyName: profile.companyName,
                contactName: profile.contactName,
                email: profile.email,
                domainName: profile.domainName,
                domain: profile.domain,
                service: profile.service,
                goals: profile.goals,
                projectGoals: profile.goals,
                design: profile.design,
                designPreferences: profile.design,
                status: profile.status,
                statusClass: profile.statusClass,
                date: profile.date,
                proposalPrice: profile.proposalPrice,
                tasks: [],
                internalNotes: [
                    { id: 'sync_n_' + Date.now(), text: 'Project automatisch aangemaakt via TODO.md DevOps Backlog Synchronisatie.', createdAt: new Date().toISOString(), author: 'DevOps AutoSync' }
                ],
                auditLog: [
                    { id: 'sync_l_' + Date.now(), timestamp: new Date().toISOString(), type: 'project_created', description: 'Project gesynchroniseerd vanuit TODO.md.', actor: 'DevOps AutoSync' }
                ]
            };
            currentProjects.push(existingProj);
            isNewlyCreated = true;
            summary.projectsCreated++;
        }

        // Merge existing tasks with new parsed tasks
        const existingTasksList = existingProj.tasks || [];
        const mergedTasks = [];

        // Helper to normalize title for similarity matching
        const normalizeStr = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

        // 1. Process all parsed tasks from TODO.md for this project
        newTasks.forEach(pt => {
            const ptNorm = normalizeStr(pt.title);

            // Check if task already exists in project by taskCode, id, or semantic title match
            const existingTask = existingTasksList.find(et => {
                if (et.id === pt.id) return true;
                if (et.title && et.title.includes(pt.taskCode)) return true;
                const etNorm = normalizeStr(et.title);
                if (etNorm && ptNorm && (etNorm === ptNorm || (etNorm.includes('stories') && etNorm.includes('instagram') && ptNorm.includes('stories')))) {
                    return true;
                }
                return false;
            });

            if (existingTask) {
                // Merge state: keep custom dates if present, update status & title from TODO.md
                mergedTasks.push({
                    ...existingTask,
                    id: pt.id,
                    title: pt.title,
                    status: pt.status,
                    completed: pt.completed,
                    priority: pt.priority,
                    dueDate: existingTask.dueDate || pt.dueDate,
                    scope: pt.scope || existingTask.scope || '',
                    details: pt.details || existingTask.details || ''
                });
            } else {
                // New task
                mergedTasks.push({
                    id: pt.id,
                    title: pt.title,
                    status: pt.status,
                    completed: pt.completed,
                    priority: pt.priority,
                    dueDate: pt.dueDate,
                    scope: pt.scope,
                    details: pt.details,
                    createdAt: new Date().toISOString()
                });
            }
            summary.tasksAddedOrUpdated++;
        });

        // 2. Preserve any existing manual tasks in project that don't have a TASK-xxx prefix and are not duplicates
        existingTasksList.forEach(et => {
            const hasTaskCode = et.title && et.title.match(/\[(TASK-\d+|MIG-\d+)\]/i);
            const etNorm = normalizeStr(et.title);
            
            if (!hasTaskCode) {
                // Check if it's a semantic duplicate of an already merged task (e.g. Stories / Instagram)
                const isDuplicate = mergedTasks.some(mt => {
                    if (mt.id === et.id) return true;
                    const mtNorm = normalizeStr(mt.title);
                    if (mtNorm === etNorm) return true;
                    if (etNorm.includes('stories') && etNorm.includes('instagram') && mtNorm.includes('stories')) return true;
                    return false;
                });

                if (!isDuplicate) {
                    mergedTasks.push(et);
                }
            }
        });

        // Update in-memory project
        existingProj.tasks = mergedTasks;
        summary.projectsAffected++;
        summary.detailsByProject[profile.client] = {
            taskCount: mergedTasks.length,
            isNew: isNewlyCreated
        };

        // Write to Firestore if connected
        if (db && docFn) {
            try {
                const docRef = docFn(db, "projects", String(existingProj.id));
                if (isNewlyCreated && setDocFn) {
                    await setDocFn(docRef, existingProj);
                } else if (updateDocFn) {
                    await updateDocFn(docRef, { tasks: mergedTasks });
                }
            } catch (err) {
                console.warn(`Kon project ${profile.client} niet opslaan naar Firestore:`, err);
            }
        }
    }

    return summary;
}

/**
 * Regenerates the TODO.md Markdown content reflecting the latest live Kanban state.
 * Automatically recalculates the Sprint Status Dashboard metrics table and progress bar.
 * 
 * @param {string} originalMarkdown - Existing TODO.md content
 * @param {Array} projectsList - Current projects with their tasks
 * @returns {string} Updated TODO.md markdown string
 */
export function exportKanbanToTodoMarkdown(originalMarkdown, projectsList) {
    if (!originalMarkdown) return '';

    // Collect all tasks across all projects in a lookup map by TASK code
    const taskStatusMap = new Map();
    (projectsList || []).forEach(p => {
        (p.tasks || []).forEach(t => {
            const match = (t.title || '').match(/\[(TASK-\d+|MIG-\d+)\]/i);
            if (match) {
                const code = match[1].toUpperCase();
                let status = t.status || (t.completed ? 'done' : 'todo');
                if (status === 'in_progress') status = 'inprogress';
                taskStatusMap.set(code, {
                    status: status,
                    completed: status === 'done' || t.completed === true,
                    priority: t.priority || 'medium'
                });
            }
        });
    });

    const lines = originalMarkdown.split(/\r?\n/);
    const updatedLines = [];
    let totalTracked = 0;
    let completedCount = 0;
    let inQueueCount = 0;
    let cancelledCount = 0;

    // First pass: inspect updated lines and collect metric counts
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Check task line
        const taskMatch = line.match(/^-\s*\[([ xX~])\]\s*`\[(TASK-\d+|MIG-\d+)\]`\s*`\[(P\d+[^\]]*)\]`\s*`\[STATUS:\s*([^\]]+)\]`\s*\*\*(.+?)\*\*/i);
        if (taskMatch) {
            totalTracked++;
            const checkMark = taskMatch[1].trim().toLowerCase();
            const taskCode = taskMatch[2].toUpperCase();
            const rawPriority = taskMatch[3];
            const rawStatus = taskMatch[4];
            const title = taskMatch[5];

            // If task is cancelled, keep it cancelled
            if (checkMark === '~' || rawStatus.toUpperCase() === 'CANCELLED') {
                cancelledCount++;
                updatedLines.push(line);
                continue;
            }

            const liveState = taskStatusMap.get(taskCode);
            if (liveState) {
                let newCheck = liveState.completed ? 'x' : ' ';
                let newStatusStr = 'BACKLOG';
                if (liveState.status === 'done') {
                    newStatusStr = 'DONE';
                    newCheck = 'x';
                    completedCount++;
                } else if (liveState.status === 'inprogress') {
                    newStatusStr = 'IN_PROGRESS';
                    newCheck = ' ';
                    inQueueCount++;
                } else if (liveState.status === 'review') {
                    newStatusStr = 'REVIEW';
                    newCheck = ' ';
                    inQueueCount++;
                } else {
                    newStatusStr = 'BACKLOG';
                    newCheck = ' ';
                    inQueueCount++;
                }

                line = `- [${newCheck}] \`[${taskCode}]\` \`[${rawPriority}]\` \`[STATUS: ${newStatusStr}]\` **${title}**`;
            } else {
                if (checkMark === 'x' || rawStatus.toUpperCase() === 'DONE') {
                    completedCount++;
                } else {
                    inQueueCount++;
                }
            }
        }

        updatedLines.push(line);
    }

    // Calculate percentage (excluding cancelled tasks from percentage denominator)
    const activeTasks = totalTracked - cancelledCount;
    const percent = activeTasks > 0 ? Math.round((completedCount / activeTasks) * 100) : 0;

    // Generate progress bar visual
    const totalBars = 24;
    const filledBars = Math.round((percent / 100) * totalBars);
    const emptyBars = Math.max(0, totalBars - filledBars);
    const progressBar = `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${percent}% Complete`;

    // Second pass: Replace Sprint Dashboard metrics
    const finalLines = [];
    for (let i = 0; i < updatedLines.length; i++) {
        let line = updatedLines[i];

        if (line.includes('| **Total Features / Backlog Tasks** |')) {
            line = `| **Total Features / Backlog Tasks** | 🔢 Tracked | **${totalTracked} Active Epics & Tasks (${cancelledCount} Canceled)** |`;
        } else if (line.includes('| **Completed Work Items** |')) {
            line = `| **Completed Work Items** | ✅ Done | **${completedCount} Tasks (${percent}%)** |`;
        } else if (line.includes('| **Active / Backlog Items** |')) {
            line = `| **Active / Backlog Items** | ⏳ In Queue | **${inQueueCount} Tasks (${100 - percent}%)** |`;
        } else if (line.startsWith('`[███') || line.startsWith('`[░░░') || (line.startsWith('`[') && line.endsWith('% Complete`'))) {
            line = `\`${progressBar}\``;
        }

        finalLines.push(line);
    }

    return finalLines.join('\n');
}
