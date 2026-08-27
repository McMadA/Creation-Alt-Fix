/**
 * Dedicated Full-Screen Project Workspace Logic
 * Integrated with Firebase Auth & Firestore.
 * 
 * Features:
 * - [TASK-605] Full-Screen Workstation & Multi-Tab Navigation
 * - [TASK-601] Private Internal Notes & Automated Audit Trail Timeline
 * - [TASK-602] Project Tasks & Deliverables Checklist with Progress Bar
 * - Proposal, Design, Mollie & Aftercare Actions with Real-Time Logging
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, createUserWithEmailAndPassword, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig, escapeHtml, isAdminEmail } from "../../js/firebase-config.js";
import { generateProposalPDF, generateInvoicePDF, uploadPdfToStorage } from "../../js/pdf-generator.js";
import { getGeminiApiKey, setGeminiApiKey, hasGeminiApiKey, getGeminiModel, setGeminiModel, generateProposalScope, generateAftercareEmail } from "../../js/ai-engine.js";

let app, auth, db, storage, secondaryAuth;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.languageCode = 'nl';
    db = getFirestore(app);
    storage = getStorage(app);

    const secondaryApp = getApps().find(a => a.name === 'SecondaryAuth') || initializeApp(firebaseConfig, 'SecondaryAuth');
    secondaryAuth = getAuth(secondaryApp);
    secondaryAuth.languageCode = 'nl';
    setPersistence(secondaryAuth, inMemoryPersistence).catch(console.warn);
} catch (error) {
    console.warn("Firebase is nog niet (juist) geconfigureerd:", error);
}

// Current Project State in Memory
let currentProjectId = null;
let currentProjectData = null;

document.addEventListener('DOMContentLoaded', () => {
    setupAuthAndPage();
    setupTabNavigation();
    setupFormHandlers();
});

// --- URL Parameter & Authentication ---
async function setupAuthAndPage() {
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');

    if (!currentProjectId) {
        alert("Geen geldig project ID opgegeven in de URL.");
        window.location.href = "index.html";
        return;
    }

    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            const authOverlay = document.getElementById('auth-overlay');
            const adminApp = document.getElementById('admin-app');

            if (user) {
                const userEmail = (user.email || '').toLowerCase();
                let isAdmin = isAdminEmail(userEmail);

                if (!isAdmin && db) {
                    try {
                        const qAdmin = query(collection(db, "admins"), where("email", "==", userEmail));
                        const snapAdmin = await getDocs(qAdmin);
                        if (!snapAdmin.empty) isAdmin = true;
                    } catch (err) {
                        console.warn("Kon admins collectie niet controleren:", err);
                    }
                }

                if (!isAdmin) {
                    await signOut(auth);
                    alert("Toegang geweigerd: Dit account heeft geen beheerdersrechten.");
                    window.location.href = "../index.html";
                    return;
                }

                authOverlay.classList.add('hidden');
                adminApp.classList.remove('hidden');
                loadProjectData(currentProjectId);
            } else {
                authOverlay.classList.remove('hidden');
                adminApp.classList.add('hidden');
            }
        });
    } else {
        document.getElementById('auth-overlay').classList.remove('hidden');
    }

    // Login Form handler
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errDiv = document.getElementById('login-error');
        const btn = e.target.querySelector('button');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
        if (errDiv) errDiv.classList.add('hidden');

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            btn.innerHTML = 'Inloggen';
            if (errDiv) {
                errDiv.innerText = 'Ongeldig e-mailadres of wachtwoord.';
                errDiv.classList.remove('hidden');
            }
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        if (auth) await signOut(auth);
        window.location.href = "index.html";
    });
}

// --- Tab Navigation Setup ---
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

// --- Load Project Data from Firestore ---
async function loadProjectData(projectId) {
    if (!db) {
        console.warn("Mock project data fallback.");
        currentProjectData = getMockProject(projectId);
        renderProjectWorkspace(currentProjectData);
        return;
    }

    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProjectData = { id: docSnap.id, ...docSnap.data() };
            // Filter out canceled TASK-501 if present in Firestore
            if (currentProjectData.tasks && Array.isArray(currentProjectData.tasks)) {
                const origLen = currentProjectData.tasks.length;
                currentProjectData.tasks = currentProjectData.tasks.filter(t => !t.id?.includes('501') && !t.title?.includes('TASK-501') && !t.title?.includes('Google Ads') && !t.title?.includes('400'));
                if (currentProjectData.tasks.length !== origLen && db && projectId) {
                    updateDoc(doc(db, "projects", projectId), { tasks: currentProjectData.tasks }).catch(console.warn);
                }
            }

            // If tasks are missing or empty, match against mock definition or set clean delivery milestones
            if (!currentProjectData.tasks || !Array.isArray(currentProjectData.tasks) || currentProjectData.tasks.length === 0) {
                const mock = getMockProject(projectId);
                if (mock && mock.tasks && mock.tasks.length > 0) {
                    currentProjectData.tasks = mock.tasks;
                    if (db && projectId) {
                        updateDoc(doc(db, "projects", projectId), { tasks: mock.tasks }).catch(console.warn);
                    }
                } else {
                    const isDone = (currentProjectData.status || '').includes('Opgeleverd') || (currentProjectData.status || '').includes('Live');
                    const defaultTasks = [
                        { id: 'del_' + projectId + '_1', title: 'Intake, functionele briefing & wensenanalyse', completed: isDone, status: isDone ? 'done' : 'inprogress', priority: 'high', dueDate: currentProjectData.date || '2025-01-01' },
                        { id: 'del_' + projectId + '_2', title: 'UI/UX Design & responsive template ontwikkeling', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'high', dueDate: currentProjectData.date || '2025-01-01' },
                        { id: 'del_' + projectId + '_3', title: 'Content, formulieren, database & API koppeling', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'medium', dueDate: currentProjectData.date || '2025-01-01' },
                        { id: 'del_' + projectId + '_4', title: 'Livegang, DNS domeinkoppeling & SSL certificering', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'high', dueDate: currentProjectData.date || '2025-01-01' }
                    ];
                    currentProjectData.tasks = defaultTasks;
                    if (db && projectId) {
                        updateDoc(doc(db, "projects", projectId), { tasks: defaultTasks }).catch(console.warn);
                    }
                }
            }
            renderProjectWorkspace(currentProjectData);
        } else {
            alert("Project niet gevonden in Firestore.");
            window.location.href = "index.html";
        }
    } catch (err) {
        console.error("Fout bij laden van project:", err);
        alert("Fout bij ophalen van projectgegevens: " + err.message);
    }
}

// --- Render Full Workspace ---
function renderProjectWorkspace(p) {
    const clientName = p.client || p.companyName || 'Onbekende Klant';
    const contact = p.contactName || p.client || '';
    const email = p.email || '';
    const domain = p.domainName || p.domain || '';
    const service = p.service || '';
    const goals = p.goals || p.projectGoals || '';
    const design = p.design || p.designPreferences || '';
    const dateSubmitted = p.date || 'Onbekend';
    const status = p.status || 'Nieuwe Lead';
    const designUrl = p.designUrl || p.figmaUrl || '';
    const proposalPrice = p.proposalPrice || '';
    const isAuthActivated = Boolean((p.clientUid && p.clientUid !== 'QVzS7PyJkeXi7mM50HOgXsSiQFe2') || p.isClientAccount);

    // Header updates
    document.getElementById('project-title-display').innerText = clientName;
    document.title = `Project: ${clientName} - Creation+Alt+Fix Admin`;
    document.getElementById('project-date-display').innerText = dateSubmitted;
    
    // Determine Phase (1 to 5)
    let currentPhase = 1;
    if (status === "Nieuwe Lead" || status === "Intake Voltooid") currentPhase = 1;
    else if (status === "Wacht op Akkoord" || status.includes("Offerte")) currentPhase = 2;
    else if (status.includes("Design")) currentPhase = 3;
    else if (status.includes("Ontwikkeling") || status.includes("Wacht op Ontwikkeling")) currentPhase = 4;
    else if (status.includes("Mollie") || status.includes("Opgeleverd") || status === "Afgerond" || status.includes("Livegang")) currentPhase = 5;

    // Update Phase Badge & Quick Selector
    const badgeElem = document.getElementById('project-phase-badge');
    badgeElem.innerText = `Fase ${currentPhase}: ${status}`;
    badgeElem.className = `badge badge-${escapeHtml(p.statusClass || 'waiting')}`;

    const phaseChanger = document.getElementById('quick-phase-changer');
    if (phaseChanger) {
        phaseChanger.value = String(currentPhase);
    }

    // Update Visual 5-Stage Phase Tracker
    document.querySelectorAll('.phase-step').forEach(step => {
        const stepPhase = parseInt(step.getAttribute('data-phase'), 10);
        if (stepPhase === currentPhase) {
            step.style.background = 'rgba(34, 211, 238, 0.15)';
            step.style.border = '1px solid #22d3ee';
            step.style.color = '#22d3ee';
            step.style.fontWeight = '700';
        } else if (stepPhase < currentPhase) {
            step.style.background = 'rgba(34, 197, 94, 0.1)';
            step.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            step.style.color = '#4ade80';
            step.style.fontWeight = '500';
        } else {
            step.style.background = 'transparent';
            step.style.border = '1px solid transparent';
            step.style.color = '#64748b';
            step.style.fontWeight = '400';
        }
    });

    // Populate Intake Form Inputs
    document.getElementById('edit-client').value = clientName;
    document.getElementById('edit-contact').value = contact;
    document.getElementById('edit-email').value = email;
    document.getElementById('edit-domain').value = domain;
    document.getElementById('edit-service').value = service;
    document.getElementById('edit-goals').value = goals;
    document.getElementById('edit-design').value = design;
    document.getElementById('edit-designUrl').value = designUrl;

    // Populate Auth Info Box
    document.getElementById('auth-email-display').innerText = email || 'Geen e-mailadres ingesteld';
    const authStatusBadge = document.getElementById('auth-status-badge');
    if (isAuthActivated) {
        authStatusBadge.innerHTML = `<span style="color: #34d399; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Geactiveerd in Firebase Auth</span>`;
        document.getElementById('btn-activate-auth-text').innerText = 'Her-activeer / Koppel Account in Auth';
    } else {
        authStatusBadge.innerHTML = `<span style="color: #fbbf24; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-exclamation-circle"></i> Niet geactiveerd in Firebase Auth</span>`;
        document.getElementById('btn-activate-auth-text').innerText = 'Activeer Klantaccount & Stuur Inlog-Mail';
    }

    // Populate Right Sidebar Quick Info
    document.getElementById('quick-contact-display').innerHTML = contact 
        ? `<i class="fas fa-user text-accent"></i> ${escapeHtml(contact)}` 
        : '<span style="color: var(--color-text-secondary);">—</span>';
    
    document.getElementById('quick-email-display').innerHTML = email 
        ? `<a href="mailto:${escapeHtml(email)}" class="table-email-link"><i class="fas fa-envelope"></i> ${escapeHtml(email)}</a>` 
        : '<span style="color: var(--color-text-secondary);">Geen e-mail</span>';
    
    document.getElementById('quick-domain-display').innerHTML = domain 
        ? `<a href="${domain.startsWith('http') ? escapeHtml(domain) : 'https://' + escapeHtml(domain)}" target="_blank" class="table-domain-link"><i class="fas fa-globe"></i> ${escapeHtml(domain)}</a>` 
        : '<span style="color: var(--color-text-secondary);">Geen domein</span>';
    
    document.getElementById('quick-price-display').innerText = proposalPrice 
        ? `€ ${proposalPrice} (Offerte klaargezet)` 
        : 'Nog geen offerte';

    // Populate Proposal Box if already generated
    if (proposalPrice || p.proposalGeneratedAt) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/offerte/index.html?id=${p.id}`;
        document.getElementById('proposal-link-input').value = link;
        document.getElementById('proposal-visit-btn').href = link;
        document.getElementById('proposal-link-box').classList.remove('hidden');
    }

    // Render Sub-Components
    renderTasksList(p.tasks || []);
    renderAdminMessages(p.messages || []);
    renderAdminStaging(p);
    renderAiScopeBox(p);
    renderAftercareQueue(p);
    renderTimelineAndNotes(p.internalNotes || [], p.auditLog || []);
    renderFilesList(p.files || []);
}

// --- [TASK-602] Tasks & Checklist Management ---
function renderTasksList(tasks) {
    const listElem = document.getElementById('project-tasks-list');
    const countTabElem = document.getElementById('tab-tasks-count');
    const progressText = document.getElementById('task-progress-text');
    const progressBar = document.getElementById('project-task-progress-bar');

    countTabElem.innerText = tasks.length;

    if (tasks.length === 0) {
        listElem.innerHTML = `<p style="color: var(--color-text-secondary); font-style: italic; font-size: 0.9rem; padding: 10px 0;">Nog geen taken toegevoegd voor dit project. Voeg hierboven je eerste deliverable toe!</p>`;
        progressText.innerText = '0 van 0 voltooid (0%)';
        progressBar.style.width = '0%';
        return;
    }

    const completedCount = tasks.filter(t => t.completed).length;
    const percentage = Math.round((completedCount / tasks.length) * 100);
    progressText.innerText = `${completedCount} van de ${tasks.length} voltooid (${percentage}%)`;
    progressBar.style.width = `${percentage}%`;

    listElem.innerHTML = '';
    tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-checklist-item ${task.completed ? 'completed' : ''}`;
        
        let priorityClass = 'medium';
        if (task.priority === 'high') priorityClass = 'high';
        if (task.priority === 'low') priorityClass = 'low';

        const priorityLabel = task.priority === 'high' ? 'Hoog' : (task.priority === 'low' ? 'Laag' : 'Gemiddeld');

        let deadlineHtml = '';
        if (task.dueDate) {
            const today = new Date().toISOString().slice(0, 10);
            const isOverdue = !task.completed && task.dueDate < today;
            deadlineHtml = `<span class="deadline-tag ${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar-alt"></i> ${escapeHtml(task.dueDate)} ${isOverdue ? '(Verlopen!)' : ''}</span>`;
        }

        item.innerHTML = `
            <label class="task-check-label">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--color-primary);">
                <span style="font-size: 0.95rem; color: #fff; font-weight: ${task.completed ? '400' : '500'};">${escapeHtml(task.title)}</span>
            </label>
            <div style="display: flex; align-items: center; gap: 12px;">
                ${deadlineHtml}
                <span class="priority-pill ${priorityClass}">${priorityLabel}</span>
                <button class="btn btn-sm" data-action="delete-task" style="background: transparent; color: #f87171; border: none; padding: 4px; cursor: pointer;" title="Taak Verwijderen">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        item.querySelector('.task-checkbox').addEventListener('change', (e) => toggleTaskCompleted(task.id, e.target.checked));
        item.querySelector('[data-action="delete-task"]').addEventListener('click', () => deleteTask(task.id));

        listElem.appendChild(item);
    });
}

async function addNewTask(title, dueDate, priority) {
    if (!title || !title.trim()) return;

    const newTask = {
        id: 'task_' + Date.now(),
        title: title.trim(),
        dueDate: dueDate || null,
        priority: priority || 'medium',
        status: 'todo',
        completed: false,
        createdAt: new Date().toISOString()
    };

    const updatedTasks = [...(currentProjectData.tasks || []), newTask];
    currentProjectData.tasks = updatedTasks;

    renderTasksList(updatedTasks);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { tasks: updatedTasks });
            await logAuditEvent('task_created', `Taak toegevoegd: "${newTask.title}"`);
        } catch (err) {
            console.error("Fout bij toevoegen van taak:", err);
            alert("Fout bij opslaan taak: " + err.message);
        }
    }
}

async function toggleTaskCompleted(taskId, isCompleted) {
    const updatedTasks = (currentProjectData.tasks || []).map(t => {
        if (t.id === taskId) {
            return { ...t, completed: isCompleted, status: isCompleted ? 'done' : 'in_progress', completedAt: isCompleted ? new Date().toISOString() : null };
        }
        return t;
    });

    currentProjectData.tasks = updatedTasks;
    renderTasksList(updatedTasks);

    if (db && currentProjectId) {
        try {
            const taskObj = updatedTasks.find(t => t.id === taskId);
            await updateDoc(doc(db, "projects", currentProjectId), { tasks: updatedTasks });
            await logAuditEvent('task_status', `Taak "${taskObj ? taskObj.title : taskId}" gemarkeerd als ${isCompleted ? 'voltooid' : 'openstaand'}`);
        } catch (err) {
            console.error("Fout bij updaten taak:", err);
        }
    }
}

async function deleteTask(taskId) {
    if (!confirm("Weet je zeker dat je deze taak wilt verwijderen?")) return;

    const updatedTasks = (currentProjectData.tasks || []).filter(t => t.id !== taskId);
    currentProjectData.tasks = updatedTasks;
    renderTasksList(updatedTasks);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { tasks: updatedTasks });
            await logAuditEvent('task_deleted', `Taak verwijderd uit project.`);
        } catch (err) {
            console.error("Fout bij verwijderen taak:", err);
        }
    }
}

// --- [TASK-601] Internal Notes & Audit Trail Timeline ---
function renderTimelineAndNotes(notes, auditLogs) {
    const container = document.getElementById('project-timeline-list');
    const notesCountElem = document.getElementById('tab-notes-count');

    notesCountElem.innerText = notes.length;

    // Combine notes and audit logs into a unified timeline
    const allEvents = [];

    notes.forEach(note => {
        allEvents.push({
            id: note.id,
            timestamp: note.createdAt || new Date().toISOString(),
            type: 'note',
            title: 'Interne Notitie',
            description: note.text,
            actor: note.author || 'Beheerder',
            rawNote: note
        });
    });

    auditLogs.forEach(log => {
        allEvents.push({
            id: log.id,
            timestamp: log.timestamp || new Date().toISOString(),
            type: log.type || 'system',
            title: formatAuditTypeTitle(log.type),
            description: log.description,
            actor: log.actor || 'Systeem'
        });
    });

    // Sort descending by timestamp (newest first)
    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (allEvents.length === 0) {
        container.innerHTML = `<p style="color: var(--color-text-secondary); font-style: italic; font-size: 0.9rem;">Nog geen logboekberichten of notities. Schrijf hierboven je eerste interne notitie!</p>`;
        return;
    }

    container.innerHTML = '';
    allEvents.forEach(event => {
        const item = document.createElement('div');
        let typeClass = 'system-type';
        if (event.type === 'note') typeClass = 'note-type';
        else if (event.type.includes('status')) typeClass = 'status-type';
        else if (event.type.includes('proposal') || event.type.includes('quote')) typeClass = 'quote-type';
        else if (event.type.includes('auth')) typeClass = 'auth-type';

        item.className = `timeline-entry ${typeClass}`;
        
        const dateObj = new Date(event.timestamp);
        const formattedDate = isNaN(dateObj.getTime()) ? event.timestamp : dateObj.toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });

        item.innerHTML = `
            <div class="timeline-header">
                <div>
                    <strong style="color: #fff; font-size: 0.88rem;">${escapeHtml(event.title)}</strong>
                    <span class="timeline-actor" style="margin-left: 8px;">door ${escapeHtml(event.actor)}</span>
                </div>
                <span>${formattedDate}</span>
            </div>
            <div class="timeline-desc" style="white-space: pre-wrap;">${escapeHtml(event.description)}</div>
        `;

        container.appendChild(item);
    });
}

function formatAuditTypeTitle(type) {
    if (!type) return 'Systeem Gebeurtenis';
    if (type === 'project_created') return '✨ Intake Ontvangen';
    if (type === 'status_updated') return '🔄 Status Wijziging';
    if (type === 'proposal_generated') return '📑 Offerte Aangemaakt';
    if (type === 'design_sent') return '🎨 Design Verstuurd';
    if (type === 'mollie_generated') return '💳 Factuur & Mollie Link Aangemaakt';
    if (type === 'auth_activated') return '🔑 Klantenportaal Account Geactiveerd';
    if (type === 'password_reset') return '✉️ Wachtwoord-reset Verstuurd';
    if (type.startsWith('task_')) return '✅ Taak Wijziging';
    if (type === 'data_updated') return '💾 Gegevens Bijgewerkt';
    return '📋 Logboek';
}

async function addInternalNote(text) {
    if (!text || !text.trim()) return;

    const newNote = {
        id: 'note_' + Date.now(),
        text: text.trim(),
        createdAt: new Date().toISOString(),
        author: auth?.currentUser?.email || 'Allard (Beheerder)'
    };

    const updatedNotes = [...(currentProjectData.internalNotes || []), newNote];
    currentProjectData.internalNotes = updatedNotes;

    renderTimelineAndNotes(updatedNotes, currentProjectData.auditLog || []);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { internalNotes: updatedNotes });
            await logAuditEvent('note_added', `Interne notitie toegevoegd: "${newNote.text.slice(0, 50)}${newNote.text.length > 50 ? '...' : ''}"`);
        } catch (err) {
            console.error("Fout bij opslaan interne notitie:", err);
            alert("Fout bij opslaan notitie: " + err.message);
        }
    }
}

// --- Centralized Audit Log Event Dispatcher ---
async function logAuditEvent(type, description) {
    if (!currentProjectData) return;

    const newLog = {
        id: 'log_' + Date.now(),
        timestamp: new Date().toISOString(),
        type: type,
        description: description,
        actor: auth?.currentUser?.email || 'Allard (Beheerder)'
    };

    const updatedLogs = [...(currentProjectData.auditLog || []), newLog];
    currentProjectData.auditLog = updatedLogs;

    renderTimelineAndNotes(currentProjectData.internalNotes || [], updatedLogs);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { auditLog: updatedLogs });
        } catch (err) {
            console.warn("Kon audit log niet updaten:", err);
        }
    }
}

// --- Render Project Files List ---
function renderFilesList(files) {
    const container = document.getElementById('project-files-list');
    const filesCountElem = document.getElementById('tab-files-count');

    filesCountElem.innerText = files.length;

    if (files.length === 0) {
        container.innerHTML = `<p style="color: var(--color-text-secondary); font-style: italic; font-size: 0.9rem;">Er zijn nog geen bestanden geüpload voor dit project door de klant.</p>`;
        return;
    }

    container.innerHTML = files.map(f => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); padding: 12px 16px; margin-bottom: 10px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                <i class="fas fa-file-alt" style="color: var(--color-primary-light); font-size: 1.2rem;"></i>
                <div style="overflow: hidden;">
                    <div style="font-size: 0.92rem; color: #fff; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(f.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Toegevoegd op: ${f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('nl-NL') : 'onbekend'}</div>
                </div>
            </div>
            <a href="${escapeHtml(f.url)}" target="_blank" class="btn btn-secondary btn-sm" style="color: var(--color-accent); border-color: rgba(34, 211, 238, 0.3);">
                <i class="fas fa-download"></i> Downloaden
            </a>
        </div>
    `).join('');
}

// --- [TASK-604] Admin Messages & Tickets Management ---
let activeAdminChatFilter = 'all';

function renderAdminMessages(messages) {
    const threadElem = document.getElementById('admin-messages-thread');
    const countTabElem = document.getElementById('tab-messages-count');
    if (!threadElem) return;

    const msgsList = Array.isArray(messages) ? messages : [];
    if (countTabElem) countTabElem.innerText = msgsList.length;

    // Filter messages based on activeAdminChatFilter
    const filteredMessages = msgsList.filter(msg => {
        if (activeAdminChatFilter === 'all') return true;
        if (activeAdminChatFilter === 'open') return msg.status === 'open' || msg.status === 'in_progress';
        if (activeAdminChatFilter === 'revision') return msg.category === 'revision';
        if (activeAdminChatFilter === 'urgent') return msg.category === 'urgent';
        if (activeAdminChatFilter === 'resolved') return msg.status === 'resolved';
        return true;
    });

    if (filteredMessages.length === 0) {
        threadElem.innerHTML = `<p style="color: var(--color-text-secondary); font-style: italic; font-size: 0.9rem; padding: 25px 10px; text-align: center;">Geen berichten gevonden voor dit filter. Schrijf hieronder een reactie naar de klant om de conversatie te starten!</p>`;
        return;
    }

    threadElem.innerHTML = '';
    filteredMessages.forEach(msg => {
        const isAdmin = msg.sender === 'admin';
        const card = document.createElement('div');
        card.className = `admin-msg-card ${isAdmin ? 'from-admin' : 'from-client'}`;

        const senderLabel = isAdmin 
            ? 'Allard (Creation+Alt+Fix)' 
            : (escapeHtml(msg.senderName) || 'Klant');
        
        const senderBadge = isAdmin 
            ? '<span class="sender-badge admin"><i class="fas fa-shield-alt"></i> Beheerder</span>' 
            : '<span class="sender-badge client"><i class="fas fa-user"></i> Klant</span>';

        const dateStr = msg.createdAt 
            ? new Date(msg.createdAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
            : 'Zojuist';

        // Category Tag
        let catLabel = '💬 Algemeen';
        if (msg.category === 'revision') catLabel = '🎨 Design Revisie';
        else if (msg.category === 'urgent') catLabel = '⚡ Spoed';
        else if (msg.category === 'question') catLabel = '💬 Vraag';
        else if (msg.category === 'content') catLabel = '📄 Bestanden & Teksten';

        // Status
        const currentStatus = msg.status || 'open';
        let statusBtnClass = 'is-open';
        let statusBtnLabel = '<i class="fas fa-circle"></i> Openstaand';
        if (currentStatus === 'in_progress') {
            statusBtnClass = 'is-inprogress';
            statusBtnLabel = '<i class="fas fa-spinner fa-spin"></i> In Behandeling';
        } else if (currentStatus === 'resolved') {
            statusBtnClass = 'is-resolved';
            statusBtnLabel = '<i class="fas fa-check-circle"></i> Opgelost';
        }

        card.innerHTML = `
            <div class="admin-msg-header">
                <div class="admin-msg-sender">
                    <span>${senderLabel}</span>
                    ${senderBadge}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.75rem; color: var(--color-accent); font-weight: 600;">${catLabel}</span>
                    <span style="font-size: 0.75rem; color: var(--color-text-secondary);">${dateStr}</span>
                </div>
            </div>
            <div class="admin-msg-body">${escapeHtml(msg.message)}</div>
            <div class="admin-msg-footer">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Ticket Status:</span>
                    <button type="button" class="admin-ticket-status-btn ${statusBtnClass}" data-action="toggle-status" data-id="${msg.id}" title="Klik om status te wijzigen">
                        ${statusBtnLabel}
                    </button>
                </div>
                <div class="admin-msg-actions">
                    <button type="button" class="btn btn-sm" data-action="delete-msg" data-id="${msg.id}" style="background: transparent; color: #f87171; border: none; padding: 2px 6px; cursor: pointer;" title="Bericht verwijderen">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        // Toggle Status Handler
        card.querySelector('[data-action="toggle-status"]').addEventListener('click', () => {
            toggleMessageStatus(msg.id);
        });

        // Delete Message Handler
        card.querySelector('[data-action="delete-msg"]').addEventListener('click', () => {
            deleteMessage(msg.id);
        });

        threadElem.appendChild(card);
    });

    threadElem.scrollTop = threadElem.scrollHeight;
}

async function sendAdminMessage(category, messageText, ticketStatus) {
    if (!messageText || !messageText.trim() || !currentProjectId) return;

    const newMsg = {
        id: 'msg_' + Date.now(),
        sender: 'admin',
        senderName: 'Allard (Creation+Alt+Fix)',
        senderEmail: auth?.currentUser?.email || 'info@creationaltfix.nl',
        category: category || 'general',
        message: messageText.trim(),
        createdAt: new Date().toISOString(),
        status: ticketStatus || 'resolved',
        readByAdmin: true,
        readByClient: false
    };

    const updatedMessages = [...(currentProjectData.messages || []), newMsg];
    currentProjectData.messages = updatedMessages;

    renderAdminMessages(updatedMessages);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { messages: updatedMessages });
            await logAuditEvent('message_sent', `Reactie gestuurd naar klant (${category}): "${newMsg.message.slice(0, 45)}${newMsg.message.length > 45 ? '...' : ''}"`);
        } catch (err) {
            console.error("Fout bij versturen admin bericht:", err);
            alert("Fout bij opslaan bericht: " + err.message);
        }
    }
}

async function toggleMessageStatus(messageId) {
    if (!currentProjectData || !currentProjectData.messages) return;

    const updatedMessages = currentProjectData.messages.map(m => {
        if (m.id === messageId) {
            let nextStatus = 'in_progress';
            if (m.status === 'open') nextStatus = 'in_progress';
            else if (m.status === 'in_progress') nextStatus = 'resolved';
            else if (m.status === 'resolved') nextStatus = 'open';
            return { ...m, status: nextStatus };
        }
        return m;
    });

    currentProjectData.messages = updatedMessages;
    renderAdminMessages(updatedMessages);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { messages: updatedMessages });
            await logAuditEvent('ticket_status', `Status van ticket bijgewerkt.`);
        } catch (err) {
            console.error("Fout bij updaten ticket status:", err);
        }
    }
}

async function deleteMessage(messageId) {
    if (!confirm("Weet je zeker dat je dit bericht wilt verwijderen uit de chathistorie?")) return;

    const updatedMessages = (currentProjectData.messages || []).filter(m => m.id !== messageId);
    currentProjectData.messages = updatedMessages;
    renderAdminMessages(updatedMessages);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { messages: updatedMessages });
            await logAuditEvent('message_deleted', `Bericht/ticket verwijderd uit de projecthistorie.`);
        } catch (err) {
            console.error("Fout bij verwijderen bericht:", err);
        }
    }
}

// --- [TASK-401] Admin Live Staging & Visual Pins Management ---
let activeAdminPinsFilter = 'all';

function resolveAdminStagingUrl(p) {
    if (!p) return null;
    let url = p.domainName || p.domain || p.demoUrl || p.stagingUrl || p.designUrl;
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (url === '' || url.toLowerCase() === 'n.v.t.' || url.toLowerCase() === 'geen' || url.toLowerCase() === 'nog geen domein') {
        return null;
    }
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    return url;
}

function renderAdminStaging(p) {
    const iframe = document.getElementById('admin-staging-iframe');
    const urlDisplay = document.getElementById('admin-staging-url-display');
    const openBtn = document.getElementById('admin-open-staging-tab');
    const tabCount = document.getElementById('tab-staging-count');
    const pinsCountLabel = document.getElementById('admin-pins-count-label');
    const overlay = document.getElementById('admin-pins-overlay');
    const listContainer = document.getElementById('admin-pins-list-container');

    const annotations = Array.isArray(p.annotations) ? p.annotations : [];
    if (tabCount) tabCount.innerText = annotations.length;
    if (pinsCountLabel) pinsCountLabel.innerText = annotations.length;

    const resolvedUrl = resolveAdminStagingUrl(p);
    if (resolvedUrl) {
        if (iframe && iframe.dataset.loadedUrl !== resolvedUrl) {
            iframe.src = resolvedUrl;
            iframe.dataset.loadedUrl = resolvedUrl;
        }
        if (urlDisplay) urlDisplay.innerText = resolvedUrl;
        if (openBtn) {
            openBtn.href = resolvedUrl;
            openBtn.classList.remove('hidden');
        }
    } else {
        const dummyDemo = `https://demo.creationaltfix.nl/${encodeURIComponent((p.client || 'concept').toLowerCase().replace(/\s+/g, '-'))}`;
        if (urlDisplay) urlDisplay.innerText = `${dummyDemo} (Geen extern domein)`;
        if (openBtn) openBtn.classList.add('hidden');
    }

    // 1. Render Pins Markers on Admin Overlay
    if (overlay) {
        overlay.innerHTML = '';
        annotations.forEach((pin, idx) => {
            const pinNum = pin.pinNumber || (idx + 1);
            const isResolved = pin.status === 'resolved';
            const marker = document.createElement('div');
            marker.className = `annotation-pin ${isResolved ? 'resolved' : ''}`;
            marker.style.left = `${pin.xPercent}%`;
            marker.style.top = `${pin.yPercent}%`;
            marker.innerHTML = isResolved ? '<i class="fas fa-check"></i>' : String(pinNum);
            marker.title = `Pin #${pinNum} [${pin.category}]: ${escapeHtml(pin.comment)}`;
            marker.style.pointerEvents = 'auto';

            marker.addEventListener('click', () => {
                const itemEl = document.getElementById(`admin-pin-card-${pin.id}`);
                if (itemEl) {
                    itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    itemEl.style.borderColor = 'var(--color-accent)';
                    setTimeout(() => { itemEl.style.borderColor = 'var(--color-border)'; }, 1500);
                }
            });

            overlay.appendChild(marker);
        });
    }

    // 2. Render Pins Management List
    if (listContainer) {
        const filteredPins = annotations.filter(pin => {
            if (activeAdminPinsFilter === 'all') return true;
            if (activeAdminPinsFilter === 'open') return pin.status !== 'resolved';
            if (activeAdminPinsFilter === 'resolved') return pin.status === 'resolved';
            return true;
        });

        if (filteredPins.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--color-text-secondary); font-size: 0.85rem; font-style: italic; padding: 15px; text-align: center;">Geen pinnen gevonden voor dit filter.</p>`;
            return;
        }

        listContainer.innerHTML = filteredPins.map((pin, idx) => {
            const pinNum = pin.pinNumber || (idx + 1);
            const isResolved = pin.status === 'resolved';
            const catLabel = pin.category === 'design' ? '🎨 Design' : (pin.category === 'content' ? '📄 Tekst' : (pin.category === 'bug' ? '🐛 Bug' : '⚡ Functionaliteit'));
            const dateStr = pin.createdAt ? new Date(pin.createdAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Zojuist';
            const author = escapeHtml(pin.author || 'Klant');

            return `
                <div id="admin-pin-card-${pin.id}" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 10px 14px; transition: border-color 0.3s;">
                    <div style="display: flex; align-items: flex-start; gap: 12px; max-width: 70%;">
                        <span class="pin-badge" style="width: 26px; height: 26px; border-radius: 50%; background: ${isResolved ? '#10b981' : 'var(--color-accent)'}; color: ${isResolved ? '#fff' : '#000'}; font-weight: 800; font-size: 0.78rem; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                            ${isResolved ? '<i class="fas fa-check"></i>' : pinNum}
                        </span>
                        <div>
                            <div style="font-weight: 600; color: #fff; font-size: 0.88rem; line-height: 1.4;">${escapeHtml(pin.comment)}</div>
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 3px;">
                                <strong>${author}</strong> • ${catLabel} • Viewport: <code>${pin.device || 'desktop'}</code> • Geplaatst op: ${dateStr}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn btn-sm ${isResolved ? 'btn-secondary' : 'btn-primary'}" data-action="toggle-resolve-pin" data-id="${pin.id}" style="font-size: 0.8rem; padding: 5px 12px;">
                            ${isResolved ? '<i class="fas fa-undo"></i> Heropenen' : '<i class="fas fa-check-circle"></i> Markeer als Opgelost'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('[data-action="toggle-resolve-pin"]').forEach(btn => {
            btn.onclick = () => {
                const pinId = btn.getAttribute('data-id');
                togglePinResolution(pinId);
            };
        });
    }
}

async function togglePinResolution(pinId) {
    if (!currentProjectData || !currentProjectData.annotations) return;

    let targetPinNum = 1;
    let nextStatus = 'resolved';

    const updatedAnnotations = currentProjectData.annotations.map(pin => {
        if (pin.id === pinId) {
            targetPinNum = pin.pinNumber || 1;
            nextStatus = pin.status === 'resolved' ? 'open' : 'resolved';
            return {
                ...pin,
                status: nextStatus,
                resolvedAt: nextStatus === 'resolved' ? new Date().toISOString() : null
            };
        }
        return pin;
    });

    currentProjectData.annotations = updatedAnnotations;
    renderAdminStaging(currentProjectData);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { annotations: updatedAnnotations });
            await logAuditEvent('pin_resolution', `Feedback Pin #${targetPinNum} gemarkeerd als ${nextStatus === 'resolved' ? 'Opgelost' : 'Openstaand'}.`);
        } catch (err) {
            console.error("Fout bij bijwerken pin status:", err);
            alert("Fout bij updaten pin status: " + err.message);
        }
    }
}

// --- [TASK-302] AI Offerte Scope & Deliverables Suite ---
let currentDeliverablesList = [];

function renderAiScopeBox(p) {
    const scopeBox = document.getElementById('ai-scope-box');
    if (!scopeBox) return;

    const hasScopeData = Boolean(p.proposalScope || (p.deliverables && p.deliverables.length > 0) || p.proposalTitle);
    if (hasScopeData) {
        document.getElementById('ai-scope-title').value = p.proposalTitle || `Realisatie Maatwerk Oplossing - ${p.client || ''}`;
        document.getElementById('ai-scope-price').value = p.proposalPrice || '';
        document.getElementById('ai-scope-summary').value = p.proposalScope || '';
        currentDeliverablesList = Array.isArray(p.deliverables) ? [...p.deliverables] : [];
        renderDeliverablesInputs();
        scopeBox.classList.remove('hidden');
    }
}

function renderDeliverablesInputs() {
    const container = document.getElementById('ai-deliverables-list');
    if (!container) return;

    if (currentDeliverablesList.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: var(--color-text-secondary); font-style: italic;">Geen specifieke deliverables toegevoegd. Klik op 'Deliverable Toevoegen' of genereer automatisch via AI.</p>`;
        return;
    }

    container.innerHTML = currentDeliverablesList.map((item, idx) => `
        <div style="display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="flex: 1;">
                <input type="text" class="admin-input deliverable-title-input" data-idx="${idx}" value="${escapeHtml(item.title || '')}" placeholder="Deliverable titel (bijv. Responsive Frontend)..." style="margin: 0 0 4px 0; font-size: 0.85rem; font-weight: 600;">
                <input type="text" class="admin-input deliverable-desc-input" data-idx="${idx}" value="${escapeHtml(item.description || '')}" placeholder="Toelichting van de werkzaamheden..." style="margin: 0; font-size: 0.8rem; color: var(--color-text-secondary);">
            </div>
            <button type="button" class="btn btn-sm" data-action="remove-deliv" data-idx="${idx}" style="background: transparent; color: #f87171; border: none; padding: 6px; cursor: pointer;" title="Verwijderen">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    container.querySelectorAll('.deliverable-title-input').forEach(input => {
        input.onchange = (e) => {
            const i = parseInt(e.target.getAttribute('data-idx'), 10);
            if (currentDeliverablesList[i]) currentDeliverablesList[i].title = e.target.value;
        };
    });

    container.querySelectorAll('.deliverable-desc-input').forEach(input => {
        input.onchange = (e) => {
            const i = parseInt(e.target.getAttribute('data-idx'), 10);
            if (currentDeliverablesList[i]) currentDeliverablesList[i].description = e.target.value;
        };
    });

    container.querySelectorAll('[data-action="remove-deliv"]').forEach(btn => {
        btn.onclick = () => {
            const i = parseInt(btn.getAttribute('data-idx'), 10);
            currentDeliverablesList.splice(i, 1);
            renderDeliverablesInputs();
        };
    });
}

// --- [TASK-301] Nazorg & AI Dispatch Wachtrij Management ---
function renderAftercareQueue(p) {
    const aftercareBox = document.getElementById('aftercare-queue-box');
    if (!aftercareBox) return;

    const isCompleted = Boolean(p.status && (p.status.includes('Opgeleverd') || p.status.includes('Afgerond') || p.status.includes('Livegang') || p.status.includes('Mollie')));
    
    // If aftercare is already sent
    if (p.aftercareSentAt) {
        const sentDate = new Date(p.aftercareSentAt).toLocaleDateString('nl-NL');
        aftercareBox.classList.remove('hidden');
        document.getElementById('aftercare-subject-input').value = `Nazorg verzonden op ${sentDate}`;
        document.getElementById('aftercare-body-input').value = `Deze klant heeft reeds een nazorg check-in ontvangen op ${sentDate}.`;
        const approveBtn = document.getElementById('btn-approve-send-aftercare');
        if (approveBtn) {
            approveBtn.disabled = true;
            approveBtn.innerHTML = `<i class="fas fa-check"></i> Reeds Verzonden (${sentDate})`;
        }
        return;
    }

    if (isCompleted || p.aftercareQueuePending) {
        aftercareBox.classList.remove('hidden');
        const subjectInput = document.getElementById('aftercare-subject-input');
        const bodyInput = document.getElementById('aftercare-body-input');
        if (subjectInput && !subjectInput.value) {
            generateAftercareEmail(p, '14day').then(mail => {
                subjectInput.value = mail.subject;
                bodyInput.value = mail.body;
            });
        }
    }
}

// --- Change Project Phase & Workflow Status ---
async function changeProjectPhase(phaseNumber) {
    if (!currentProjectData) return;

    let targetStatus = "Intake Voltooid";
    let targetStatusClass = "waiting";

    if (phaseNumber === 1) {
        targetStatus = "Intake Voltooid";
        targetStatusClass = "waiting";
    } else if (phaseNumber === 2) {
        targetStatus = "Wacht op Akkoord";
        targetStatusClass = "waiting";
    } else if (phaseNumber === 3) {
        targetStatus = "Design & Ontwerp (Fase 3)";
        targetStatusClass = "active";
    } else if (phaseNumber === 4) {
        targetStatus = "In Ontwikkeling";
        targetStatusClass = "active";
    } else if (phaseNumber === 5) {
        targetStatus = "Opgeleverd (Livegang)";
        targetStatusClass = "success";
    }

    const updated = {
        status: targetStatus,
        statusClass: targetStatusClass
    };

    currentProjectData = { ...currentProjectData, ...updated };
    renderProjectWorkspace(currentProjectData);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), updated);
            await logAuditEvent('status_updated', `Projectfase gewijzigd naar Fase ${phaseNumber}: ${targetStatus}`);
            alert(`Projectfase succesvol bijgewerkt naar "Fase ${phaseNumber}: ${targetStatus}"!`);
        } catch (err) {
            console.error("Fout bij updaten fase:", err);
            alert("Fout bij updaten fase: " + err.message);
        }
    } else {
        alert(`Projectfase gewijzigd naar "Fase ${phaseNumber}: ${targetStatus}"!`);
    }
}

// --- Setup Form Handlers & Workflow Buttons ---
function setupFormHandlers() {
    // 0. Quick Phase Selector & Interactive Pipeline Tracker
    document.getElementById('quick-phase-changer')?.addEventListener('change', (e) => {
        const phaseNum = parseInt(e.target.value, 10);
        if (phaseNum) changeProjectPhase(phaseNum);
    });

    document.querySelectorAll('.phase-step').forEach(step => {
        step.addEventListener('click', () => {
            const phaseNum = parseInt(step.getAttribute('data-phase'), 10);
            if (phaseNum) changeProjectPhase(phaseNum);
        });
    });

    // 1. Save Intake Changes Form
    document.getElementById('project-edit-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentProjectId) return;

        const newEmail = document.getElementById('edit-email').value.trim().toLowerCase();
        const originalEmail = currentProjectData?.email || '';

        if (originalEmail && newEmail !== originalEmail.toLowerCase()) {
            if (!confirm(`Let op: je wijzigt het e-mailadres van "${originalEmail}" naar "${newEmail}". Wil je doorgaan?`)) return;
        }

        const updatedData = {
            client: document.getElementById('edit-client').value,
            companyName: document.getElementById('edit-client').value,
            contactName: document.getElementById('edit-contact').value,
            email: newEmail,
            domainName: document.getElementById('edit-domain').value,
            domain: document.getElementById('edit-domain').value,
            service: document.getElementById('edit-service').value,
            goals: document.getElementById('edit-goals').value,
            projectGoals: document.getElementById('edit-goals').value,
            design: document.getElementById('edit-design').value,
            designPreferences: document.getElementById('edit-design').value,
            designUrl: document.getElementById('edit-designUrl').value.trim(),
            figmaUrl: document.getElementById('edit-designUrl').value.trim()
        };

        currentProjectData = { ...currentProjectData, ...updatedData };

        if (db) {
            try {
                await updateDoc(doc(db, "projects", currentProjectId), updatedData);
                await logAuditEvent('data_updated', 'Klantgegevens & intakeformulier bijgewerkt door beheerder.');
                alert("Wijzigingen succesvol opgeslagen in Firestore!");
                renderProjectWorkspace(currentProjectData);
            } catch (err) {
                console.error("Fout bij opslaan:", err);
                alert("Fout bij opslaan: " + err.message);
            }
        }
    });

    // 2. Add Task Form
    document.getElementById('add-task-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('task-input-title');
        const dateInput = document.getElementById('task-input-date');
        const priorityInput = document.getElementById('task-input-priority');

        addNewTask(titleInput.value, dateInput.value, priorityInput.value);
        titleInput.value = '';
        dateInput.value = '';
    });

    // 3. Admin Messages & Tickets Filter & Reply Form
    document.getElementById('admin-chat-filter')?.addEventListener('change', (e) => {
        activeAdminChatFilter = e.target.value;
        if (currentProjectData) {
            renderAdminMessages(currentProjectData.messages || []);
        }
    });

    document.getElementById('admin-reply-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const catSelect = document.getElementById('admin-reply-category');
        const statusSelect = document.getElementById('admin-reply-status');
        const replyInput = document.getElementById('admin-reply-input');
        const sendBtn = document.getElementById('btn-admin-send-reply');

        const category = catSelect ? catSelect.value : 'general';
        const ticketStatus = statusSelect ? statusSelect.value : 'resolved';
        const messageText = replyInput ? replyInput.value.trim() : '';

        if (!messageText) return;

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
        }

        try {
            await sendAdminMessage(category, messageText, ticketStatus);
            if (replyInput) replyInput.value = '';
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Verstuur Reactie naar Klant';
            }
        }
    });

    // 4. Admin Live Staging & Pins Controls
    document.querySelectorAll('.admin-vp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-vp-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetVp = btn.getAttribute('data-vp');
            const wrap = document.getElementById('admin-staging-viewport-wrap');
            if (wrap) {
                if (targetVp === 'desktop') {
                    wrap.style.width = '100%';
                    wrap.style.borderRadius = '8px';
                } else if (targetVp === 'tablet') {
                    wrap.style.width = '768px';
                    wrap.style.borderRadius = '16px';
                } else if (targetVp === 'mobile') {
                    wrap.style.width = '375px';
                    wrap.style.borderRadius = '24px';
                }
            }
        });
    });

    document.getElementById('btn-admin-reload-staging')?.addEventListener('click', () => {
        const iframe = document.getElementById('admin-staging-iframe');
        if (iframe) {
            const currentSrc = iframe.src;
            iframe.src = '';
            setTimeout(() => { iframe.src = currentSrc; }, 50);
        }
    });

    document.getElementById('admin-pins-filter')?.addEventListener('change', (e) => {
        activeAdminPinsFilter = e.target.value;
        if (currentProjectData) {
            renderAdminStaging(currentProjectData);
        }
    });

    // 5. Add Internal Note Form
    document.getElementById('add-internal-note-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const noteInput = document.getElementById('internal-note-input');
        addInternalNote(noteInput.value);
        noteInput.value = '';
    });

    // 5. Activate Firebase Auth Button
    document.getElementById('btn-activate-auth')?.addEventListener('click', async () => {
        const email = document.getElementById('edit-email').value.trim().toLowerCase();
        const contact = document.getElementById('edit-contact').value;

        if (!email) return alert("Vul eerst een geldig e-mailadres in.");
        if (!confirm(`Wilt u het Firebase Auth account aanmaken en activeren voor ${email}?`)) return;

        const tempPassword = 'CAF-' + Math.random().toString(36).substring(2, 8);
        try {
            let clientUid = null;
            try {
                const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
                clientUid = userCred.user.uid;
            } catch (authErr) {
                console.warn("Auth account match/exists:", authErr.message);
            }

            if (db && currentProjectId) {
                await updateDoc(doc(db, "projects", currentProjectId), {
                    email: email,
                    isClientAccount: true,
                    clientUid: clientUid || null
                });
                currentProjectData.isClientAccount = true;
                if (clientUid) currentProjectData.clientUid = clientUid;
            }

            await sendPasswordResetEmail(auth, email);
            await logAuditEvent('auth_activated', `Klantenportaal account geactiveerd voor ${email} en welkomst/wachtwoordlink verstuurd.`);
            alert(`Succes! Het account voor ${email} is geactiveerd in Firebase Auth en er is een wachtwoord-instel e-mail verzonden.`);
            renderProjectWorkspace(currentProjectData);
        } catch (error) {
            console.error("Fout bij activeren account:", error);
            alert(`Fout bij activeren account: ${error.message}`);
        }
    });

    // 5. Reset Password Button
    document.getElementById('btn-reset-auth')?.addEventListener('click', async () => {
        const email = document.getElementById('edit-email').value.trim().toLowerCase();
        if (!email) return alert("Geen e-mailadres ingesteld.");
        if (!confirm(`Wachtwoord-reset link sturen naar ${email}?`)) return;

        try {
            await sendPasswordResetEmail(auth, email);
            await logAuditEvent('password_reset', `Wachtwoord reset e-mail handmatig verstuurd naar ${email}`);
            alert(`Wachtwoord reset e-mail is succesvol verzonden naar ${email}.`);
        } catch (err) {
            alert("Fout bij versturen reset: " + err.message);
        }
    });

    // 6. Action: AI Concept Email
    document.getElementById('btn-action-ai-email')?.addEventListener('click', () => {
        const p = currentProjectData || {};
        const contact = p.contactName || p.client || "klant";
        const service = p.service || "je project";
        const goals = p.goals || p.projectGoals || "jouw gewenste doelen";

        const box = document.getElementById('ai-email-box');
        const content = document.getElementById('ai-email-content');

        content.value = `Beste ${contact},\n\nBedankt voor je intake bij Creation+Alt+Fix voor ${service}!\n\nWe hebben je wensen in goede orde ontvangen. Je gaf aan dat het voornaamste doel is:\n"${goals}"\n\nDit kunnen we uitstekend voor je realiseren. Zullen we deze week even kort telefonisch of via Video Call de details afstemmen?\n\nMet vriendelijke groet,\n\nAllard Veldman\nCreation+Alt+Fix\nwww.creationaltfix.nl`;
        box.classList.remove('hidden');
    });

    document.getElementById('btn-open-email-client')?.addEventListener('click', () => {
        const email = document.getElementById('edit-email').value.trim();
        const body = encodeURIComponent(document.getElementById('ai-email-content').value);
        const subject = encodeURIComponent("Creation+Alt+Fix - Vervolg op je intake");
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    });

    document.getElementById('btn-copy-ai-email')?.addEventListener('click', () => {
        const content = document.getElementById('ai-email-content');
        content.select();
        navigator.clipboard.writeText(content.value);
        alert("Concept e-mail gekopieerd naar klembord!");
    });

    // 7. Gemini AI Setup Modal Handlers
    const geminiModal = document.getElementById('gemini-settings-modal');
    const geminiKeyInput = document.getElementById('gemini-api-key-input');
    const geminiKeyStatus = document.getElementById('gemini-key-status');
    const geminiModelSelect = document.getElementById('gemini-model-select');

    document.getElementById('btn-open-gemini-modal')?.addEventListener('click', () => {
        if (geminiKeyInput) geminiKeyInput.value = getGeminiApiKey();
        if (geminiModelSelect) geminiModelSelect.value = getGeminiModel();
        if (geminiKeyStatus) {
            geminiKeyStatus.innerHTML = hasGeminiApiKey() 
                ? '<strong style="color: #34d399;"><i class="fas fa-check-circle"></i> Gemini API sleutel is actief.</strong>' 
                : '<span style="color: #94a3b8;"><i class="fas fa-info-circle"></i> Geen sleutel ingevoerd. Systeem gebruikt de slimme offline generator.</span>';
        }
        geminiModal?.classList.remove('hidden');
    });

    document.getElementById('btn-close-gemini-modal')?.addEventListener('click', () => geminiModal?.classList.add('hidden'));
    document.getElementById('btn-cancel-gemini-modal')?.addEventListener('click', () => geminiModal?.classList.add('hidden'));

    document.getElementById('btn-save-gemini-key')?.addEventListener('click', () => {
        const val = geminiKeyInput?.value.trim() || '';
        const selectedModel = geminiModelSelect?.value || 'gemini-2.0-flash';
        setGeminiApiKey(val);
        setGeminiModel(selectedModel);
        alert(val ? `Gemini instellingen opgeslagen (Model: ${selectedModel})!` : "Gemini API sleutel gewist. Offline generator actief.");
        geminiModal?.classList.add('hidden');
    });

    document.getElementById('btn-clear-gemini-key')?.addEventListener('click', () => {
        setGeminiApiKey('');
        if (geminiKeyInput) geminiKeyInput.value = '';
        if (geminiKeyStatus) geminiKeyStatus.innerHTML = '<span style="color: #94a3b8;"><i class="fas fa-info-circle"></i> Sleutel gewist. Offline generator actief.</span>';
        alert("Gemini API sleutel gewist.");
    });

    // 8. AI Offerte & Scope Generator (TASK-302)
    const runAiScopeGeneration = async () => {
        const triggerBtn = document.getElementById('btn-trigger-ai-scope');
        const reGenBtn = document.getElementById('btn-re-generate-scope');
        const origText = triggerBtn ? triggerBtn.innerHTML : '';
        
        if (triggerBtn) {
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI Scope Wordt Gegenereerd...';
        }
        if (reGenBtn) reGenBtn.disabled = true;

        try {
            const scopeData = await generateProposalScope(currentProjectData || {});
            
            document.getElementById('ai-scope-title').value = scopeData.proposalTitle || `Realisatie Maatwerk Oplossing - ${currentProjectData?.client || ''}`;
            document.getElementById('ai-scope-price').value = scopeData.estimatedPrice || '650,00';
            document.getElementById('ai-scope-summary').value = scopeData.executiveSummary || '';
            
            currentDeliverablesList = Array.isArray(scopeData.deliverables) ? [...scopeData.deliverables] : [];
            renderDeliverablesInputs();

            const modelTag = document.getElementById('ai-generator-model-tag');
            if (modelTag) {
                modelTag.innerHTML = scopeData.isAiGenerated 
                    ? '<strong style="color: #34d399;"><i class="fas fa-bolt"></i> Gegenereerd via Live Google Gemini 1.5 API</strong>' 
                    : '<span style="color: var(--color-accent);"><i class="fas fa-cogs"></i> Gegenereerd via Creation+Alt+Fix Smart Heuristic Engine</span>';
            }

            document.getElementById('ai-scope-box')?.classList.remove('hidden');
            document.getElementById('ai-scope-box')?.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error("Fout bij genereren scope:", err);
            alert("Fout bij genereren scope: " + err.message);
        } finally {
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = origText;
            }
            if (reGenBtn) reGenBtn.disabled = false;
        }
    };

    document.getElementById('btn-trigger-ai-scope')?.addEventListener('click', runAiScopeGeneration);
    document.getElementById('btn-re-generate-scope')?.addEventListener('click', runAiScopeGeneration);
    document.getElementById('btn-close-scope-box')?.addEventListener('click', () => {
        document.getElementById('ai-scope-box')?.classList.add('hidden');
    });

    document.getElementById('btn-add-deliverable')?.addEventListener('click', () => {
        currentDeliverablesList.push({ title: "Nieuwe Deliverable", description: "Omschrijving van het op te leveren onderdeel..." });
        renderDeliverablesInputs();
    });

    // Save AI Scope & Activate Proposal
    document.getElementById('btn-save-ai-scope')?.addEventListener('click', async () => {
        if (!db || !currentProjectId) return;
        const title = document.getElementById('ai-scope-title')?.value.trim() || `Realisatie Maatwerk Oplossing - ${currentProjectData?.client || ''}`;
        const price = document.getElementById('ai-scope-price')?.value.trim() || '650,00';
        const summary = document.getElementById('ai-scope-summary')?.value.trim() || '';

        const saveBtn = document.getElementById('btn-save-ai-scope');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opslaan & Activeren...';
        }

        try {
            const updated = {
                proposalTitle: title,
                proposalPrice: price,
                proposalScope: summary,
                deliverables: currentDeliverablesList,
                status: "Wacht op Akkoord",
                statusClass: "waiting",
                proposalGeneratedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "projects", currentProjectId), updated);
            currentProjectData = { ...currentProjectData, ...updated };

            await logAuditEvent('ai_scope_saved', `AI Scope opgeslagen (€ ${price}) en offerte online geactiveerd (Status -> Wacht op Akkoord).`);
            alert("Investeringsvoorstel en deliverables zijn succesvol opgeslagen en geactiveerd in het klantenportaal!");
            renderProjectWorkspace(currentProjectData);

        } catch (err) {
            console.error("Fout bij opslaan AI scope:", err);
            alert("Fout bij opslaan: " + err.message);
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Opslaan & Offerte Activeren (Fase 2)';
            }
        }
    });

    // 9. Nazorg & Review Wachtrij Handlers (TASK-301)
    document.getElementById('btn-action-checkin')?.addEventListener('click', () => {
        const box = document.getElementById('aftercare-queue-box');
        if (box) {
            box.classList.remove('hidden');
            box.scrollIntoView({ behavior: 'smooth' });
            if (!document.getElementById('aftercare-body-input').value) {
                generateAftercareEmail(currentProjectData || {}, '14day').then(mail => {
                    document.getElementById('aftercare-subject-input').value = mail.subject;
                    document.getElementById('aftercare-body-input').value = mail.body;
                });
            }
        }
    });

    document.getElementById('btn-gen-14day-mail')?.addEventListener('click', async () => {
        const mail = await generateAftercareEmail(currentProjectData || {}, '14day');
        document.getElementById('aftercare-subject-input').value = mail.subject;
        document.getElementById('aftercare-body-input').value = mail.body;
    });

    document.getElementById('btn-gen-6month-mail')?.addEventListener('click', async () => {
        const mail = await generateAftercareEmail(currentProjectData || {}, '6month');
        document.getElementById('aftercare-subject-input').value = mail.subject;
        document.getElementById('aftercare-body-input').value = mail.body;
    });

    document.getElementById('btn-open-aftercare-client')?.addEventListener('click', () => {
        const email = document.getElementById('edit-email')?.value.trim();
        const subject = encodeURIComponent(document.getElementById('aftercare-subject-input')?.value || 'Nazorg • Creation+Alt+Fix');
        const body = encodeURIComponent(document.getElementById('aftercare-body-input')?.value || '');
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    });

    document.getElementById('btn-approve-send-aftercare')?.addEventListener('click', async () => {
        const email = document.getElementById('edit-email')?.value.trim();
        const subject = document.getElementById('aftercare-subject-input')?.value.trim();
        const body = document.getElementById('aftercare-body-input')?.value.trim();

        if (!email) return alert("Geen e-mailadres bekend voor deze klant.");
        if (!confirm(`Weet je zeker dat je deze nazorg e-mail wilt goedkeuren en verzenden naar ${email}?`)) return;

        const approveBtn = document.getElementById('btn-approve-send-aftercare');
        if (approveBtn) {
            approveBtn.disabled = true;
            approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met verzenden...';
        }

        try {
            // Dispatch via mailto and log to Firestore
            window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);

            const nowIso = new Date().toISOString();
            if (db && currentProjectId) {
                await updateDoc(doc(db, "projects", currentProjectId), {
                    aftercareSentAt: nowIso,
                    aftercareQueuePending: false
                });
                currentProjectData.aftercareSentAt = nowIso;
                currentProjectData.aftercareQueuePending = false;
            }

            await logAuditEvent('aftercare_sent', `Nazorg check-in e-mail goedgekeurd en verzonden naar ${email}.`);
            alert(`Nazorg e-mail is succesvol geopend en geregistreerd in het audit logboek!`);
            renderProjectWorkspace(currentProjectData);

        } catch (err) {
            console.error("Fout bij verzenden nazorg:", err);
            alert("Fout bij afronden nazorg: " + err.message);
        } finally {
            if (approveBtn) {
                approveBtn.disabled = false;
                approveBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 🚀 Goedkeuren & Direct Verzenden';
            }
        }
    });

    // 10. Action: Generate Proposal (Legacy Quick Prompt)
    document.getElementById('btn-action-proposal')?.addEventListener('click', async () => {
        if (!db || !currentProjectId) return;
        const priceInput = prompt("Wat is de geoffreerde investering voor dit project? (bijv. 450,00)");
        if (!priceInput) return;

        try {
            const updated = {
                proposalPrice: priceInput.trim(),
                status: "Wacht op Akkoord",
                statusClass: "waiting",
                proposalGeneratedAt: new Date().toISOString()
            };
            await updateDoc(doc(db, "projects", currentProjectId), updated);
            currentProjectData = { ...currentProjectData, ...updated };

            await logAuditEvent('proposal_generated', `Offerte gegenereerd met investering van € ${priceInput.trim()} (Status -> Wacht op Akkoord)`);
            alert("Offerte is gegenereerd en online klaargezet voor de klant!");
            renderProjectWorkspace(currentProjectData);
        } catch (err) {
            console.error("Fout bij genereren offerte:", err);
            alert("Fout bij genereren offerte: " + err.message);
        }
    });

    document.getElementById('btn-copy-proposal-link')?.addEventListener('click', () => {
        const link = document.getElementById('proposal-link-input').value;
        navigator.clipboard.writeText(link);
        alert("Offerte link gekopieerd naar klembord!");
    });

    // Action: Download Offerte PDF
    document.getElementById('btn-action-download-offerte')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-action-download-offerte');
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF Genereren...';
        try {
            const projData = { ...(currentProjectData || {}), id: currentProjectId };
            const isSigned = Boolean(projData.proposalAcceptedAt || projData.status?.includes('Design') || projData.status?.includes('Ontwikkeling') || projData.status?.includes('Opgeleverd'));
            const { doc: pdfDoc, blob: pdfBlob, filename } = await generateProposalPDF(projData, isSigned);
            
            // Upload to storage if not yet uploaded
            if (storage && currentProjectId && !projData.proposalPdfUrl) {
                const uploadRes = await uploadPdfToStorage(storage, pdfBlob, currentProjectId, filename);
                if (uploadRes && db) {
                    await updateDoc(doc(db, "projects", currentProjectId), {
                        proposalPdfUrl: uploadRes.downloadUrl,
                        proposalPdfName: filename
                    });
                    projData.proposalPdfUrl = uploadRes.downloadUrl;
                }
            }

            pdfDoc.save(filename);
            await logAuditEvent('pdf_generated', `Officiële offerte PDF gegenereerd & gedownload (${filename}).`);
        } catch (err) {
            console.error("Fout bij genereren offerte PDF:", err);
            alert("Kon offerte PDF niet genereren: " + err.message);
        } finally {
            btn.innerHTML = origText;
        }
    });

    // Action: Download Factuur PDF
    document.getElementById('btn-action-download-factuur')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-action-download-factuur');
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Factuur Genereren...';
        try {
            const projData = { ...(currentProjectData || {}), id: currentProjectId };
            const { doc: pdfDoc, blob: pdfBlob, filename, invoiceNumber } = await generateInvoicePDF(projData);

            if (storage && currentProjectId && db) {
                const uploadRes = await uploadPdfToStorage(storage, pdfBlob, currentProjectId, filename);
                if (uploadRes) {
                    await updateDoc(doc(db, "projects", currentProjectId), {
                        invoicePdfUrl: uploadRes.downloadUrl,
                        invoicePdfName: filename,
                        invoiceNumber: invoiceNumber
                    });
                }
            }

            pdfDoc.save(filename);
            await logAuditEvent('pdf_generated', `Officiële factuur PDF gegenereerd & gedownload (${filename}).`);
        } catch (err) {
            console.error("Fout bij genereren factuur PDF:", err);
            alert("Kon factuur PDF niet genereren: " + err.message);
        } finally {
            btn.innerHTML = origText;
        }
    });

    // 8. Action: Send Design to Client
    document.getElementById('btn-action-design')?.addEventListener('click', async () => {
        if (!db || !currentProjectId) return;
        const designUrl = document.getElementById('edit-designUrl').value.trim();

        if (!designUrl) {
            alert("Vul eerst de Design / Figma Prototype URL in bij het tabblad 'Intake & Gegevens'.");
            return;
        }

        if (!confirm(`Wil je het ontwerp versturen naar de klant?\n\nURL: ${designUrl}\n\nDe status wordt gewijzigd naar 'Design Gereed voor Review'.`)) return;

        try {
            const updated = {
                designUrl: designUrl,
                figmaUrl: designUrl,
                status: "Design Gereed voor Review",
                statusClass: "active",
                designSentAt: new Date().toISOString()
            };
            await updateDoc(doc(db, "projects", currentProjectId), updated);
            currentProjectData = { ...currentProjectData, ...updated };

            await logAuditEvent('design_sent', `Design prototype link verstuurd naar klant: ${designUrl}`);
            alert("Design is klaargezet in het klantenportaal!");
            renderProjectWorkspace(currentProjectData);
        } catch (err) {
            console.error("Fout bij versturen design:", err);
            alert("Fout: " + err.message);
        }
    });

    // 9. Action: Invoice + Mollie
    document.getElementById('btn-action-mollie')?.addEventListener('click', async () => {
        if (!db || !currentProjectId) return;
        const mockMollieLink = "https://useplink.com/payment/xyz123";

        try {
            const updated = {
                status: "Opgeleverd (Betaling via Mollie)",
                statusClass: "concept",
                mollieLink: mockMollieLink
            };
            await updateDoc(doc(db, "projects", currentProjectId), updated);
            currentProjectData = { ...currentProjectData, ...updated };

            await logAuditEvent('mollie_generated', `Mollie betaallink klaargezet (${mockMollieLink}) en status gewijzigd naar Opgeleverd.`);
            alert(`Factuurverzoek klaargezet!\n\nBetaallink:\n${mockMollieLink}`);
            renderProjectWorkspace(currentProjectData);
        } catch (err) {
            alert("Fout bij factuur: " + err.message);
        }
    });

    // 10. Action: 14-Day Checkin
    document.getElementById('btn-action-checkin')?.addEventListener('click', async () => {
        if (!db || !currentProjectId) return;
        try {
            const updated = {
                status: "Aftercare (Check-in gepland)",
                statusClass: "concept",
                checkinScheduledAt: new Date().toISOString()
            };
            await updateDoc(doc(db, "projects", currentProjectId), updated);
            currentProjectData = { ...currentProjectData, ...updated };

            await logAuditEvent('checkin_scheduled', `14-Dagen aftercare en review check-in ingepland.`);
            alert("14-Dagen check-in ingepland!");
            renderProjectWorkspace(currentProjectData);
        } catch (err) {
            alert("Fout bij check-in: " + err.message);
        }
    });

    // 11. Delete Project
    document.getElementById('btn-delete-project')?.addEventListener('click', async () => {
        const name = currentProjectData?.client || 'dit project';
        if (!confirm(`Weet je zeker dat je "${name}" permanent wilt verwijderen?`)) return;

        if (db && currentProjectId) {
            try {
                await deleteDoc(doc(db, "projects", currentProjectId));
                alert(`Project "${name}" is succesvol verwijderd.`);
                window.location.href = "index.html";
            } catch (err) {
                alert("Fout bij verwijderen: " + err.message);
            }
        }
    });
}

// Fallback Mock Projects
function getMockProject(id) {
    if (String(id) === "6" || String(id).includes("Hoofdwebsite") || String(id).includes("website")) {
        return {
            id: 6,
            client: "Creation+Alt+Fix (Hoofdwebsite)",
            companyName: "Creation+Alt+Fix (Hoofdwebsite)",
            contactName: "Allard Veldman",
            email: "info@creationaltfix.nl",
            domainName: "www.creationaltfix.nl",
            domain: "www.creationaltfix.nl",
            service: "Website & Portfolio Platform (Dark AI)",
            goals: "Hoofdwebsite voor software support & AI-diensten. Voorzien van meertaligheid (NL/EN), intake funnels, interactieve portfolio showcase met 13 projecten en Dark AI design token architectuur.",
            projectGoals: "Hoofdwebsite voor software support & AI-diensten. Voorzien van meertaligheid (NL/EN), intake funnels, interactieve portfolio showcase met 13 projecten en Dark AI design token architectuur.",
            design: "Dark AI thema, glassmorphism borders, Space Grotesk / Inter typografie, indigo & cyan gradients.",
            designPreferences: "Dark AI thema, glassmorphism borders, Space Grotesk / Inter typografie, indigo & cyan gradients.",
            status: "Opgeleverd (Livegang)",
            statusClass: "success",
            date: "25-08-2026",
            proposalPrice: "0,00",
            tasks: [
                { id: 'web_t1', title: '[TASK-109] Meertalige subpages en vertaalkoppelingen (NL/EN)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-15' },
                { id: 'web_t2', title: '[TASK-701] Portfolio & Showcase Pagina met interactieve filters', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                { id: 'web_t3', title: '[TASK-702] Creation+Alt+Fix CRM Case Study & Live Demo Showcase', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                { id: 'web_t5', title: '[TASK-502] Hosting Management & Terugkerende Onderhoudsdiensten', completed: false, status: 'todo', priority: 'low', dueDate: '2026-09-10' },
                { id: 'web_t6', title: 'SEO Sitemap, Structured Data & Google Search Console Indexering', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' }
            ],
            internalNotes: [
                { id: 'web_n1', text: 'Portfolio grid succesvol uitgebreid naar 13 projecten met responsive tablet/desktop navbar.', createdAt: '2026-08-25T18:00:00Z', author: 'Allard Veldman' }
            ],
            auditLog: [
                { id: 'web_l1', timestamp: '2026-08-25T18:30:00Z', type: 'status_updated', description: 'Hoofdwebsite succesvol live gezet op Vimexx public_html/', actor: 'Allard Veldman' }
            ]
        };
    }

    if (String(id) === "7" || String(id).includes("CRM") || String(id).includes("portal")) {
        return {
            id: 7,
            client: "Creation+Alt+Fix (CRM & Portaal)",
            companyName: "Creation+Alt+Fix (CRM & Portaal)",
            contactName: "Allard Veldman",
            email: "info@creationaltfix.nl",
            domainName: "portal.creationaltfix.nl",
            domain: "portal.creationaltfix.nl",
            service: "Custom CRM & Klantenportaal Applicatie",
            goals: "Proprietary Vanilla JS CRM systeem met Firebase Auth, Firestore real-time database, live 5-fasen voortgangstracker (/status), dedicated full-screen projectpagina's, Kanban bord, audit trail logboek en digitale offerte-ondertekening.",
            projectGoals: "Proprietary Vanilla JS CRM systeem met Firebase Auth, Firestore real-time database, live 5-fasen voortgangstracker (/status), dedicated full-screen projectpagina's, Kanban bord, audit trail logboek en digitale offerte-ondertekening.",
            design: "Full-screen dark workspace, responsive stat cards, Kanban kolommen, realtime filters en CSV export.",
            designPreferences: "Full-screen dark workspace, responsive stat cards, Kanban kolommen, realtime filters en CSV export.",
            status: "In Ontwikkeling",
            statusClass: "active",
            date: "25-08-2026",
            proposalPrice: "0,00",
            tasks: [
                { id: 'task_101', title: '[TASK-101] Intake Alert & Push Notificatie Dispatcher', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-12' },
                { id: 'task_102', title: '[TASK-102] Admin Klantkaart & Lead Inspector Modal', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-12' },
                { id: 'task_103', title: '[TASK-103] Digitale Offerte-Ondertekening in Klantenportaal', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-13' },
                { id: 'task_104', title: '[TASK-104] Live Klanten Voortgangstracker (/status)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-13' },
                { id: 'task_105', title: '[TASK-105] Admin Tabel Zoeken, Filteren & CSV Export', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-13' },
                { id: 'task_107', title: '[TASK-107] Branded HTML Welkomstmail Dispatcher (EmailJS)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-13' },
                { id: 'task_108', title: '[TASK-108] Admin Tabelkolom Uitbreiding & Directe Links', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                { id: 'task_605', title: '[TASK-605] Full-Screen Dedicated Project Werkplek (project.html)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                { id: 'task_601', title: '[TASK-601] Interne Notities & Automatische Audit Trail', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                { id: 'task_602', title: '[TASK-602] 4-Kolommen Kanban Bord voor Deliverables', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                { id: 'task_106', title: '[TASK-106] Firebase Auth Custom Sender Domain & SMTP Integratie', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                { id: 'task_201', title: '[TASK-201] Mollie API Integratie & Webhook Listener via Tailscale', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-05' },
                { id: 'task_301', title: '[TASK-301] Geautomatiseerde Aftercare Cronjobs (14d Review / 6m APK)', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-10' },
                { id: 'task_302', title: '[TASK-302] Live LLM API voor AI Offerte Scope Generator', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-15' },
                { id: 'task_603', title: '[TASK-603] Automatische PDF Generatie voor Offertes & Facturen', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-25' },
                { id: 'task_azure', title: '[TASK-503] Complete Multi-Domein & Cloud Migratie: Vimexx naar Microsoft Azure (12 Domeinen)', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-20' },
                { id: 'task_604', title: '[TASK-604] In-App Firestore Messaging & Ticketing', completed: false, status: 'todo', priority: 'low', dueDate: '2026-09-25' },
                { id: 'task_401', title: '[TASK-401] Visuele Feedback & Annotatie Widget op Demo Omgevingen', completed: false, status: 'todo', priority: 'low', dueDate: '2026-09-30' },
                { id: 'task_402', title: '[TASK-402] Gestandaardiseerd Systeem Overdrachtsdocument & Video Template', completed: false, status: 'todo', priority: 'low', dueDate: '2026-10-05' }
            ],
            internalNotes: [
                { id: 'crm_n1', text: 'EPIC-06 uitbreiding voltooid: dedicated project.html, Kanban bord en Firestore audit logging zijn 100% operationeel.', createdAt: '2026-08-25T20:00:00Z', author: 'Allard Veldman' }
            ],
            auditLog: [
                { id: 'crm_l1', timestamp: '2026-08-25T20:30:00Z', type: 'data_updated', description: 'CRM systeem bijgewerkt met Sprint 1 Roadmap features.', actor: 'Allard Veldman' }
            ]
        };
    }

    if (String(id) === "8" || String(id).includes("Besseling") || String(id).includes("besseling")) {
        return {
            id: 8,
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
            proposalPrice: "650,00",
            tasks: [
                { id: 'bes_1', title: "Echte foto's — Vervang decoratieve placeholders door foto's van Maico & projecten", completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-01' },
                { id: 'bes_2', title: 'Formulier backend koppelen aan Formspree / Netlify / API', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-20' },
                { id: 'bes_3', title: 'Deployment — Push naar GitHub en deploy via hosting', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-22' },
                { id: 'bes_4', title: 'Google Analytics tracking toevoegen', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-04' },
                { id: 'bes_5', title: 'Favicon & logo toevoegen', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-23' },
                { id: 'bes_6', title: 'E-mailadres unificeren op Over Mij pagina (info@besselinginstallatietechniek.nl)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-24' },
                { id: 'bes_7', title: 'Google Reviews widget / feedback link integreren', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-06' }
            ],
            internalNotes: [
                { id: 'bes_n1', text: 'Website structuur staat gereed. Wachten op definitieve projectfoto’s van Maico.', createdAt: '2026-08-25T15:00:00Z', author: 'Allard' }
            ],
            auditLog: [
                { id: 'bes_l1', timestamp: '2026-08-25T15:00:00Z', type: 'data_updated', description: 'Besseling taken gesynchroniseerd vanuit Microsoft To Do.', actor: 'Allard' }
            ]
        };
    }

    if (String(id) === "9" || String(id).includes("Angela") || String(id).includes("angelastenekes")) {
        return {
            id: 9,
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
            tasks: [
                { id: 'ang_1', title: 'angelastenekes.nl vibecoden & interactief prototype bouwen', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-03' }
            ],
            internalNotes: [
                { id: 'ang_n1', text: 'Toegevoegd via Microsoft To Do backlog.', createdAt: '2026-08-25T16:00:00Z', author: 'Allard' }
            ],
            auditLog: [
                { id: 'ang_l1', timestamp: '2026-08-25T16:00:00Z', type: 'lead_created', description: 'Lead aangemaakt vanuit Microsoft To Do.', actor: 'Allard' }
            ]
        };
    }

    if (String(id) === "10" || String(id).includes("Home Buyer") || String(id).includes("hbi")) {
        return {
            id: 10,
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
            tasks: [
                { id: 'hbi_1', title: 'Home Buyer Intelligence afmaken (AI Revisor & Local Mode)', completed: false, status: 'inprogress', priority: 'high', dueDate: '2026-09-15' }
            ],
            internalNotes: [
                { id: 'hbi_n1', text: 'Local mode architectuur diagram is al opgenomen in de showcase portfolio.', createdAt: '2026-08-25T17:00:00Z', author: 'Allard' }
            ],
            auditLog: [
                { id: 'hbi_l1', timestamp: '2026-08-25T17:00:00Z', type: 'data_updated', description: 'Project deliverables gesynchroniseerd.', actor: 'Allard' }
            ]
        };
    }

    if (String(id) === '12' || (typeof id === 'string' && id.toLowerCase().includes('ftruck'))) {
        return {
            id: id,
            client: "F-Truck Store",
            companyName: "F-Truck Store (ftruckstore.nl)",
            contactName: "F-Truck Store Beheer",
            email: "info@ftruckstore.nl",
            domainName: "ftruckstore.nl / ftruckstore.com",
            domain: "ftruckstore.nl",
            service: "Hosting & Website Migratie",
            serviceCategory: "Hosting & Migratie",
            goals: "Bestaande webshop en platform voor Ford F-Series trucks en onderdelen succesvol gemigreerd naar onze managed hostingomgeving.",
            projectGoals: "Bestaande webshop en platform voor Ford F-Series trucks en onderdelen succesvol gemigreerd naar onze managed hostingomgeving met zero-downtime DNS configuratie, SSL en database tuning.",
            design: "Bestaand webshop design behouden (Geen herontwerp vereist).",
            designPreferences: "Bestaand webshop design behouden (Geen herontwerp vereist).",
            status: "Opgeleverd (Livegang)",
            statusClass: "success",
            date: "25-08-2026",
            proposalPrice: "0,00",
            tasks: [
                { id: 'ft_1', title: '[MIG-01] Volledige website backup & database dump exporteren van oude host', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-15' },
                { id: 'ft_2', title: '[MIG-02] Doelomgeving inrichten (PHP, databases & opslag)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-16' },
                { id: 'ft_3', title: '[MIG-03] Bestanden en database importeren & configuratie updaten', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-17' },
                { id: 'ft_4', title: '[MIG-04] DNS records, MX mailforwarding & SSL certificaten omzetten', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-18' },
                { id: 'ft_5', title: '[MIG-05] 24/7 Uptime & periodiek back-upbeheer inrichten', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-20' },
                { id: 'ft_6', title: '[TASK-809] F-Truck Store Follow-Up & Klantafstemming', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-05' }
            ],
            internalNotes: [
                { id: 'ft_n1', text: 'Hosting & migratie project: website is niet door Creation+Alt+Fix ontworpen, maar gemigreerd naar ons managed platform.', createdAt: '2026-08-25T18:00:00Z', author: 'Allard Veldman' }
            ],
            auditLog: [
                { id: 'ft_l1', timestamp: '2026-08-25T18:00:00Z', type: 'status_updated', description: 'Migratie succesvol afgerond en live op managed hosting (5/5 taken voltooid).', actor: 'Allard Veldman' }
            ]
        };
    }

    if (String(id) === '13' || (typeof id === 'string' && (id.toLowerCase().includes('vanderplaats') || id.toLowerCase().includes('gerard')))) {
        return {
            id: id,
            client: "VAN DER PLAATS (Gerard Klusser)",
            companyName: "VAN DER PLAATS (Gerard Klusser)",
            contactName: "Gerard Klusser",
            email: "vanderplaats2@gmail.com",
            domainName: "www.vanderplaats.nl",
            domain: "www.vanderplaats.nl",
            service: "Website & Klusbedrijf Formulier Backend",
            goals: "Professionele klusbedrijf website met contact- en offerteformulier dat veilig e-mails verzendt naar vanderplaats2@gmail.com (Tel: +31 6 12104850, KvK: 98527339).",
            projectGoals: "Professionele klusbedrijf website met contact- en offerteformulier dat veilig e-mails verzendt naar vanderplaats2@gmail.com (Tel: +31 6 12104850, KvK: 98527339).",
            design: "Robuust, betrouwbaar, modern klusbedrijf thema.",
            designPreferences: "Robuust, betrouwbaar, modern klusbedrijf thema.",
            status: "In Ontwikkeling",
            statusClass: "active",
            date: "26-08-2026",
            proposalPrice: "650,00",
            tasks: [
                { id: 'vdp_1', title: '[TASK-808] VAN DER PLAATS Website & Formulier Backend (vanderplaats2@gmail.com)', completed: false, status: 'inprogress', priority: 'high', dueDate: '2026-09-02' }
            ],
            internalNotes: [
                { id: 'vdp_n1', text: 'Offerteformulier koppelen via server-side mailer direct naar vanderplaats2@gmail.com.', createdAt: '2026-08-26T10:00:00Z', author: 'Allard Veldman' }
            ],
            auditLog: [
                { id: 'vdp_l1', timestamp: '2026-08-26T10:00:00Z', type: 'lead_created', description: 'Project aangemaakt vanuit TODO.md DevOps backlog.', actor: 'Allard Veldman' }
            ]
        };
    }

    if (String(id) === '14' || (typeof id === 'string' && id.toLowerCase().includes('justin'))) {
        return {
            id: id,
            client: "Justin",
            companyName: "Justin",
            contactName: "Justin",
            email: "contact@justin.nl",
            domainName: "www.justin.nl",
            domain: "www.justin.nl",
            service: "Website Laten Maken & Prototype",
            goals: "Wensen en doelstellingen inventariseren, Dark AI prototype template opzetten en offerte opstellen.",
            projectGoals: "Wensen en doelstellingen inventariseren, Dark AI prototype template opzetten en offerte opstellen.",
            design: "Dark AI modern, strak, interactief.",
            designPreferences: "Dark AI modern, strak, interactief.",
            status: "Nieuwe Lead",
            statusClass: "concept",
            date: "27-08-2026",
            proposalPrice: "600,00",
            tasks: [
                { id: 'jus_1', title: '[TASK-810] Justin Website Intake, Prototype & Offerte', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-05' }
            ],
            internalNotes: [
                { id: 'jus_n1', text: 'Intake en offerte template voorbereiden.', createdAt: '2026-08-27T09:00:00Z', author: 'Allard Veldman' }
            ],
            auditLog: [
                { id: 'jus_l1', timestamp: '2026-08-27T09:00:00Z', type: 'lead_created', description: 'Lead toegevoegd vanuit backlog.', actor: 'Allard Veldman' }
            ]
        };
    }

    return {
        id: id,
        client: "Arnold Doornbos (Arnold Design)",
        contactName: "Arnold Doornbos",
        email: "arnolddesign2024@gmail.com",
        domainName: "www.arnolddesign.nl",
        service: "Kunstenaarsportfolio & Webapplicatie",
        goals: "Interactieve artist portfolio showcase voor grafisch ontwerp, typografie, portrettekeningen en monumentaal glas-in-lood vakmanschap.",
        design: "Eigentijds, donker atelier-thema, lichte glasaccenten, minimalistische typografie.",
        status: "Design & Ontwerp (Fase 3)",
        statusClass: "active",
        date: "25-08-2026",
        tasks: [
            { id: 't5_1', title: 'React + Vite + Tailwind architectuur inrichten', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-20' },
            { id: 't5_2', title: 'Glas-in-lood galerij & dynamische filter categorieën', completed: false, status: 'inprogress', priority: 'high', dueDate: '2026-08-30' },
            { id: 't5_3', title: 'Arnold foto AI scrape-proof maken (Watermarking / Glaze / Protect)', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-02' },
            { id: 't5_4', title: 'Portfolio showcase op Creation+Alt+Fix website integreren', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-05' }
        ],
        internalNotes: [
            { id: 't5_n1', text: 'Klant was zeer te spreken over de donkere atelier stijl en snelle laadtijd.', createdAt: '2026-08-25T14:00:00Z', author: 'Allard' }
        ],
        auditLog: [
            { id: 't5_l1', timestamp: '2026-08-25T12:00:00Z', type: 'status_updated', description: 'Status bijgewerkt naar Design & Ontwerp (Fase 3)', actor: 'Allard' }
        ]
    };
}
