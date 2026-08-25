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

    // Update Phase Badge
    const badgeElem = document.getElementById('project-phase-badge');
    badgeElem.innerText = `Fase ${currentPhase}: ${status}`;
    badgeElem.className = `badge badge-${escapeHtml(p.statusClass || 'waiting')}`;

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

// --- Setup Form Handlers & Workflow Buttons ---
function setupFormHandlers() {
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

    // 3. Add Internal Note Form
    document.getElementById('add-internal-note-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const noteInput = document.getElementById('internal-note-input');
        addInternalNote(noteInput.value);
        noteInput.value = '';
    });

    // 4. Activate Firebase Auth Button
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

    // 7. Action: Generate Proposal
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

    return {
        id: id,
        client: "Arnold Doornbos (Arnold Design)",
        contactName: "Arnold Doornbos",
        email: "arnolddesign2024@gmail.com",
        domainName: "www.arnolddesign.nl",
        service: "Kunstenaarsportfolio & Webapplicatie",
        goals: "Interactieve artist portfolio showcase voor grafisch ontwerp, typografie, portrettekeningen en monumentaal glas-in-lood vakmanschap.",
        design: "Eigentijds, donker atelier-thema, lichte glasaccenten, minimalistische typografie.",
        status: "Opgeleverd (Livegang)",
        statusClass: "success",
        date: "25-08-2026",
        tasks: [
            { id: 't1', title: 'Intake afronden en wensen inventariseren', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-20' },
            { id: 't2', title: 'Ontwerp inrichten in React + Vite + Tailwind', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-22' },
            { id: 't3', title: 'Glas-in-lood galerij optimaliseren', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-24' },
            { id: 't4', title: 'Livegang & SEO configuratie', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' }
        ],
        internalNotes: [
            { id: 'n1', text: 'Klant was zeer tevreden over de snelle opzet van de categorie filtering en de dark studio esthetiek.', createdAt: '2026-08-25T14:00:00Z', author: 'Allard' }
        ],
        auditLog: [
            { id: 'l1', timestamp: '2026-08-25T12:00:00Z', type: 'status_updated', description: 'Status bijgewerkt naar Opgeleverd (Livegang)', actor: 'Allard' }
        ]
    };
}
