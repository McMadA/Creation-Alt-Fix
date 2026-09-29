/**
 * Admin Dashboard Logic
 * Integrated with Firebase Auth & Firestore.
 * Production mode: Firestore is the single source of truth.
 * 
 * Security: XSS-escaped output, centralized config, admin whitelist.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, sendPasswordResetEmail, createUserWithEmailAndPassword, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig, escapeHtml, sanitizeUrl, ADMIN_EMAILS, isAdminEmail, formatProjectStatus, BRANDING, isClientAuthActivated } from "../../js/firebase-config.js";
import { generateProposalPDF, generateInvoicePDF, uploadPdfToStorage } from "../../js/pdf-generator.js";
import { getGeminiApiKey, setGeminiApiKey, hasGeminiApiKey, getGeminiModel, setGeminiModel } from "../../js/ai-engine.js";
import { parseTodoMarkdown, mapTaskToProject, syncTodoToFirestore, exportKanbanToTodoMarkdown, PROJECT_PROFILES } from "../../js/todo-sync.js";
import { SUBSCRIPTION_PLANS, PI_BOEKHOUDING_CLIENT_DATA, getPiBoekhoudingInfo } from "./project.js";
import { 
    renderTablesData, 
    sortProjectsList, 
    updateTableHeaderSortIcons, 
    syncSortToolbarUI, 
    currentSortColumn, 
    currentSortDirection, 
    setSortState,
    exportProjectsToCSV 
} from "./modules/admin-tables.js";
import { calculateDashboardStats, updateDashboardStatsUI } from "./modules/admin-stats.js";
import { 
    getMonitoredDomains, 
    runDomainHealthCheck, 
    runAllDomainChecks, 
    saveDomainReportToFirestore, 
    dispatchDowntimeAlert, 
    addCustomMonitoredDomain, 
    getIncidentLogs,
    playAlertTone,
    syncDomainChangeToMonitoring,
    removeDomainFromMonitoring,
    normalizeDomain,
    getIgnoredDomains,
    isDomainIgnored,
    setDomainIgnored,
    REQUIRED_CONSECUTIVE_FAILURES,
    getConsecutiveFailures
} from "../../js/uptime-monitor.js";
import { open2027SubscriptionModal } from "./modules/subscription-2027.js";
import { initSubscriptionsTab } from "./modules/admin-subscriptions.js";
import { initLeadFactoryModule } from "./modules/admin-lead-factory.js";

import { 
    renderKanbanBoard as renderKanbanBoardModule, 
    setupKanbanListeners as setupKanbanListenersModule, 
    openGlobalTaskModal as openGlobalTaskModalModule, 
    saveGlobalTask as saveGlobalTaskModule, 
    moveKanbanTask as moveKanbanTaskModule 
} from "./modules/admin-kanban.js";
import { 
    setupTodoSyncListeners as setupTodoSyncListenersModule, 
    openTodoSyncModal as openTodoSyncModalModule, 
    handleExecuteTodoSync as handleExecuteTodoSyncModule, 
    handleCopyExportMarkdown, 
    handleDownloadExportMarkdown, 
    switchSyncModalTab as switchSyncModalTabModule,
    renderSyncBreakdown,
    fetchTodoMarkdown
} from "./modules/admin-todo-modal.js";
import { Toast } from "../../js/core/toast.js";
import { store } from "../../js/core/store.js";
import { dispatcher } from "../../js/core/action-dispatcher.js";




// We gebruiken een try-catch zodat de app niet direct crasht als de config nog dummy-data is.
let app, auth, db, storage, secondaryAuth;
let cachedProjects = [];
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
    console.warn("Firebase is nog niet (juist) geconfigureerd. Gebruik dummy config.");
}

// --- API Abstraction Layer ---
const API = {
    async login(email, password) {
        if (!auth) {
            alert("Firebase is nog niet geconfigureerd in admin.js!");
            return false;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("Login error:", error);
            return false;
        }
    },
    
    async logout() {
        if (auth) await signOut(auth);
        location.reload();
    },

    async getDashboardStats() {
        const projects = (cachedProjects && cachedProjects.length > 0) ? cachedProjects : await this.getProjects();
        return calculateDashboardStats(projects);
    },


    async getProjects() {
        if (!db) {
            console.warn('[CRM] Firebase niet beschikbaar. Geen projecten geladen.');
            return [];
        }

        try {
            const querySnapshot = await getDocs(collection(db, "projects"));
            const projectsList = [];
            querySnapshot.forEach((doc) => {
                projectsList.push({ id: doc.id, ...doc.data() });
            });

            // Data sanitization: filter out canceled tasks (TASK-501, Google Ads)
            for (const p of projectsList) {
                if (p.tasks && Array.isArray(p.tasks)) {
                    p.tasks = p.tasks.filter(t => !t.id?.includes('501') && !t.title?.includes('TASK-501') && !t.title?.includes('Google Ads') && !t.title?.includes('400'));
                    
                    // Sanitize Livian Design: strip internal Creation+Alt+Fix tasks from old ID 6 collision
                    const pName = (p.client || p.companyName || '').toLowerCase();
                    if (pName.includes('livian')) {
                        p.tasks = p.tasks.filter(t => {
                            const tStr = (t.title || t.id || '').toUpperCase();
                            return !tStr.includes('TASK-805') && !tStr.includes('TASK-807') && !tStr.includes('TASK-811') && !tStr.includes('TASK-812') && !tStr.includes('CREATION') && !tStr.includes('HOOFDWEBSITE') && !tStr.includes('TASK-');
                        });
                        if (p.tasks.length === 0 || p.tasks.length < 4) {
                            p.tasks = [
                                { id: "livian_t1", title: "Project Intake & Interieurportfolio Scope", status: "done", completed: true, dueDate: "2026-03-24" },
                                { id: "livian_t2", title: "Design Concept & Sfeerbeelden Akkoord", status: "done", completed: true, dueDate: "2026-03-24" },
                                { id: "livian_t3", title: "Showcase & Contactformulier Ontwikkeling", status: "done", completed: true, dueDate: "2026-03-24" },
                                { id: "livian_t4", title: "Oplevering & Livegang creationaltfix.nl/liviandesign/", status: "done", completed: true, dueDate: "2026-03-24" }
                            ];
                        }
                    }
                }
            }

            return projectsList;
        } catch (e) {
            console.error('[CRM] Fout bij laden projecten uit Firestore:', e);
            return [];
        }
    }
};
// Luister naar de status van de gebruiker (ingelogd/uitgelogd)
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        if (typeof window !== 'undefined' && window.__authTimeout) {
            clearTimeout(window.__authTimeout);
        }
        const authOverlay = document.getElementById('auth-overlay');
        const adminApp = document.getElementById('admin-app');
        const authLoading = document.getElementById('auth-loading');

        if (user) {
            const userEmail = (user.email || '').toLowerCase();
            
            // Geautoriseerde beheerders via centraal geïmporteerde whitelist
            let isAdmin = isAdminEmail(userEmail);

            // Optioneel: Controleer ook de Firestore 'admins' collectie indien aanwezig
            if (!isAdmin && db) {
                try {
                    const qAdmin = query(collection(db, "admins"), where("email", "==", userEmail));
                    const snapAdmin = await getDocs(qAdmin);
                    if (!snapAdmin.empty) {
                        isAdmin = true;
                    }
                } catch (err) {
                    console.warn("Kon Firestore admins collectie niet controleren:", err);
                }
            }

            // Strikt toegangsbeleid (Default Deny): Alleen expliciete beheerders krijgen toegang
            if (!isAdmin) {
                console.warn("Onbevoegde poging tot admin toegang door niet-beheerder account:", userEmail);
                await signOut(auth);
                if (authLoading) authLoading.style.display = 'none';
                if (authOverlay) authOverlay.classList.remove('hidden');
                const errDiv = document.getElementById('login-error');
                if (errDiv) {
                    errDiv.innerText = `Toegang geweigerd: Account "${userEmail}" heeft geen beheerdersrechten.`;
                    errDiv.classList.remove('hidden');
                }
                return;
            }

            // Zero-Password Policy: Beheerders MOETEN via Google OAuth (2FA) ingelogd zijn
            const isGoogleAuth = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
            if (!isGoogleAuth) {
                console.warn("Wachtwoordinlog geblokkeerd voor beheerder:", userEmail);
                await signOut(auth);
                if (authLoading) authLoading.style.display = 'none';
                if (authOverlay) authOverlay.classList.remove('hidden');
                const errDiv = document.getElementById('login-error');
                if (errDiv) {
                    errDiv.innerText = `Beveiligingswaarschuwing: Wachtwoordinlog is uitgeschakeld voor beheerders. Log verplicht in via de knop "Inloggen met Google".`;
                    errDiv.classList.remove('hidden');
                }
                return;
            }

            if (authLoading) authLoading.style.display = 'none';
            if (authOverlay) authOverlay.classList.add('hidden');
            if (adminApp) adminApp.classList.remove('hidden');
            loadDashboardData();
        } else {
            if (authLoading) authLoading.style.display = 'none';
            if (authOverlay) authOverlay.classList.remove('hidden');
            if (adminApp) adminApp.classList.add('hidden');
        }
    });
} else {
    const authLoading = document.getElementById('auth-loading');
    if (authLoading) authLoading.style.display = 'none';
    document.getElementById('auth-overlay')?.classList.remove('hidden');
}

// Google Sign-In Handler voor Beheerder (Zero-Password & 2FA Suite)
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    const errDiv = document.getElementById('login-error');
    const btn = document.getElementById('btn-google-login');
    if (errDiv) errDiv.classList.add('hidden');
    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifiëren bij Google...';

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const userEmail = (result.user.email || '').toLowerCase();
        
        let isAdmin = isAdminEmail(userEmail);
        if (!isAdmin && db) {
            try {
                const qAdmin = query(collection(db, "admins"), where("email", "==", userEmail));
                const snapAdmin = await getDocs(qAdmin);
                if (!snapAdmin.empty) { isAdmin = true; }
            } catch (e) { }
        }

        if (!isAdmin) {
            await signOut(auth);
            if (errDiv) {
                errDiv.innerText = `Toegang geweigerd: Google-account "${userEmail}" staat niet geregistreerd als beheerder.`;
                errDiv.classList.remove('hidden');
            }
            btn.disabled = false;
            btn.innerHTML = oldHtml;
            return;
        }
    } catch (err) {
        console.error("Google Sign-In mislukt:", err);
        if (errDiv) {
            errDiv.innerText = `Google Inloggen mislukt: ${err.message || 'Venster gesloten of geannuleerd.'}`;
            errDiv.classList.remove('hidden');
        }
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    API.logout();
});

async function loadDashboardData() {
    // 1. Load Projects Table & sync state
    cachedProjects = await API.getProjects();
    window.cachedProjects = cachedProjects;

    // 2. Compute dynamic stats from cached projects
    const stats = await API.getDashboardStats();
    updateDashboardStatsUI(stats);

    
    // 3. Initial Render
    filterAndRenderTables();
    renderKanbanBoard();

    // 4. Update Uptime & DNS Monitoring with active projects
    try {
        const activeMonitors = getMonitoredDomains(cachedProjects);
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
                }
            } catch (e) {}
        } else if (activeMonitors.length > 0) {
            monitoringReports = monitoringReports.filter(r => activeIds.has(r.id) || activeDomains.has(r.domain));
        }

        renderMonitorsTable();

        // Check if there are newly added domains that don't have a report yet
        const existingDomains = new Set(monitoringReports.map(r => r.domain));
        const missingMonitors = activeMonitors.filter(m => !existingDomains.has(m.domain));
        if (missingMonitors.length > 0 && !isScanningMonitors) {
            Promise.all(missingMonitors.map(m => runDomainHealthCheck(m))).then(newReports => {
                for (const nr of newReports) {
                    monitoringReports.push(nr);
                    if (db) saveDomainReportToFirestore(db, nr);
                }
                try {
                    localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(monitoringReports));
                } catch (e) {}
                renderMonitorsTable();
            }).catch(console.warn);
        }

        // Run initial scan automatically as soon as Firestore projects have arrived
        if (!hasDoneInitialMonitoringScan && !isScanningMonitors && activeMonitors.length > 0) {
            hasDoneInitialMonitoringScan = true;
            executeScanAllMonitors();
        }
    } catch (e) {
        console.error("Fout bij bijwerken monitoring in loadDashboardData:", e);
    }
}

// --- Project Tables & Sorter Module connected via modules/admin-tables.js ---


function filterAndRenderTables() {
    const searchInput = document.getElementById('admin-search-input');
    const filterSelect = document.getElementById('admin-status-filter');

    const query = (searchInput?.value || '').trim().toLowerCase();
    const filterVal = filterSelect?.value || 'all';

    let filtered = cachedProjects.filter(p => {
        // Status filter
        if (filterVal !== 'all') {
            const statusInfo = formatProjectStatus(p.status, p.statusClass);
            if (filterVal === 'Intake' && statusInfo.phase !== 1) return false;
            if (filterVal === 'Akkoord' && statusInfo.phase !== 2) return false;
            if (filterVal === 'Design' && statusInfo.phase !== 3) return false;
            if (filterVal === 'Ontwikkeling' && statusInfo.phase !== 4) return false;
            if (filterVal === 'Fase5-Payment' && (!statusInfo.isPhase5 || !statusInfo.isPaymentWaiting)) return false;
            if (filterVal === 'Fase5-Complete' && (!statusInfo.isPhase5 || statusInfo.isPaymentWaiting)) return false;
            if (filterVal === 'Opgeleverd' && !statusInfo.isPhase5) return false;
        }

        // Search query filter
        if (query) {
            const client = (p.client || p.companyName || '').toLowerCase();
            const contact = (p.contactName || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            const domain = (p.domainName || p.domain || '').toLowerCase();
            const service = (p.service || '').toLowerCase();
            const goals = (p.goals || p.projectGoals || '').toLowerCase();

            return client.includes(query) || contact.includes(query) || email.includes(query) || domain.includes(query) || service.includes(query) || goals.includes(query);
        }

        return true;
    });

    // Pas actieve sortering toe
    filtered = sortProjectsList(filtered, currentSortColumn, currentSortDirection);

    // Synchroniseer UI en icoontjes
    syncSortToolbarUI();

    renderTablesData(filtered);
}

// Veiligheidsschild / backward-compatibility fallback tegen cached aanroepen
window.renderProjectsTable = () => filterAndRenderTables();

function setupSearchAndFilters() {
    document.getElementById('admin-search-input')?.addEventListener('input', () => filterAndRenderTables());
    document.getElementById('admin-status-filter')?.addEventListener('change', () => filterAndRenderTables());

    // Sorteer dropdown wijziging
    document.getElementById('admin-sort-by')?.addEventListener('change', (e) => {
        const col = e.target.value;
        const dir = ['client', 'email', 'domain', 'status'].includes(col) ? 'asc' : 'desc';
        setSortState(col, dir);
        filterAndRenderTables();
    });

    // Sorteer richting knop toggle
    document.getElementById('admin-sort-direction-btn')?.addEventListener('click', () => {
        const newDir = currentSortDirection === 'asc' ? 'desc' : 'asc';
        setSortState(currentSortColumn, newDir);
        filterAndRenderTables();
    });

    // Klikbare tabelkolommen (event delegation op thead van alle tabellen)
    document.querySelectorAll('.data-table thead').forEach(thead => {
        thead.addEventListener('click', (e) => {
            const th = e.target.closest('th.sortable-th');
            if (!th) return;

            const col = th.getAttribute('data-sort');
            if (!col) return;

            if (currentSortColumn === col) {
                const newDir = currentSortDirection === 'asc' ? 'desc' : 'asc';
                setSortState(col, newDir);
            } else {
                const newDir = ['client', 'email', 'domain', 'status'].includes(col) ? 'asc' : 'desc';
                setSortState(col, newDir);
            }

            filterAndRenderTables();
        });
    });
}

window.exportProjectsToCSV = () => exportProjectsToCSV(cachedProjects);


function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentAreas = document.querySelectorAll('.content-area');
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const targetView = item.getAttribute('data-view');
            contentAreas.forEach(area => {
                if(area.id === 'view-' + targetView) {
                    area.classList.remove('hidden');
                } else {
                    area.classList.add('hidden');
                }
            });

            // Dynamische header-titel per tabblad
            const VIEW_TITLES = {
                dashboard: 'Dashboard <span class="accent">Overzicht</span>',
                leads: 'Leads <span class="accent">&amp; Intake</span>',
                projects: 'Projecten <span class="accent">&amp; Klantdossiers</span>',
                kanban: 'Taken <span class="accent">&amp; Kanban Sprintbord</span>',
                monitoring: 'Uptime <span class="accent">&amp; DNS Monitoring</span>',
                subscriptions: 'Abonnementen <span class="accent">&amp; 2027 Migratie</span>',
                settings: 'Systeem <span class="accent">Instellingen</span>'
            };
            const headerTitle = document.getElementById('admin-main-header-title');
            if (headerTitle && VIEW_TITLES[targetView]) {
                headerTitle.innerHTML = VIEW_TITLES[targetView];
            }

            // Toolbar synchronisatie: alleen tonen op tabel-overzichten
            const mainToolbar = document.getElementById('admin-main-toolbar') || document.querySelector('.admin-toolbar');
            if (mainToolbar) {
                if (['dashboard', 'leads', 'projects'].includes(targetView)) {
                    mainToolbar.classList.remove('hidden');
                } else {
                    mainToolbar.classList.add('hidden');
                }
            }

            if (targetView === 'settings') {
                initSettingsTab();
            }
            if (targetView === 'monitoring') {
                initMonitoringTab();
            }
            if (targetView === 'subscriptions') {
                initSubscriptionsTab(cachedProjects, {
                    onRefresh: () => loadProjects(),
                    onSavePlan: async (proj, plan) => {
                        const updatedFields = {
                            subscriptionPlan2027Id: plan.id,
                            subscriptionPlan2027Name: plan.name,
                            subscriptionPlan2027Price: plan.price,
                            subscriptionPlan2027Status: 'voorgesteld',
                            subscriptionPlan2027ProposedAt: new Date().toISOString()
                        };
                        if (db && proj.id && String(proj.id).length > 5) {
                            await updateDoc(doc(db, "projects", proj.id), updatedFields);
                        }
                        Object.assign(proj, updatedFields);
                        initSubscriptionsTab(cachedProjects);
                        await logAuditEvent('2027_plan_proposed', `2027 Abonnementsplan voorgesteld: ${plan.name} (€ ${plan.price}/${plan.cycle}).`);
                    },
                    onSendPortalTicket: async (proj, plan, messageText) => {
                        const updatedFields = {
                            subscriptionPlan2027Id: plan.id,
                            subscriptionPlan2027Name: plan.name,
                            subscriptionPlan2027Price: plan.price,
                            subscriptionPlan2027Status: 'voorgesteld',
                            subscriptionPlan2027ProposedAt: new Date().toISOString()
                        };
                        const msgObj = {
                            id: 'msg_2027_' + Date.now(),
                            sender: 'admin',
                            text: messageText,
                            createdAt: new Date().toISOString(),
                            status: 'open',
                            readByClient: false
                        };
                        if (db && proj.id && String(proj.id).length > 5) {
                            const currentMsgs = proj.messages || [];
                            await updateDoc(doc(db, "projects", proj.id), {
                                ...updatedFields,
                                messages: [...currentMsgs, msgObj]
                            });
                        }
                        if (!proj.messages) proj.messages = [];
                        proj.messages.push(msgObj);
                        Object.assign(proj, updatedFields);
                        initSubscriptionsTab(cachedProjects);
                        await logAuditEvent('2027_plan_ticket_sent', `2027 Abonnementsvoorstel als ticket in klantenportaal geplaatst voor ${proj.client || 'klant'}.`);
                    }
                });
            }
            if (targetView === 'lead-factory') {
                await setupAndRenderLeadFactory();
            }

        });
    });
}

/**
 * Laadt de data voor het Autonome Leads Werkstation en initialiseert de module
 */
async function setupAndRenderLeadFactory() {
    let leads = [];
    if (db) {
        try {
            const querySnapshot = await getDocs(collection(db, "leads_factory"));
            querySnapshot.forEach(docSnap => {
                leads.push({ id: docSnap.id, ...docSnap.data() });
            });
        } catch (err) {
            console.warn("[CRM] Kon leads niet ophalen uit Firestore:", err);
        }
    }

    if (leads.length === 0) {
        try {
            const resp = await fetch('./data/leads.json');
            if (resp.ok) {
                const json = await resp.json();
                if (json && Array.isArray(json.leads) && json.leads.length > 0) {
                    leads = json.leads;
                }
            }
        } catch (err) {
            // Lokale bestandssysteem fetch fallback
        }
    }

    if (leads.length === 0) {
        const stored = localStorage.getItem('caf_leads_factory');
        if (stored) {
            try { leads = JSON.parse(stored); } catch {}
        }
    }

    // Default demo leads voor Hoogezand als startpunt
    if (leads.length === 0) {

        leads = [
            {
                id: 'lead_demo_1',
                slug: 'schildersbedrijf-hoogezand',
                name: 'Schildersbedrijf Van der Veen',
                category: 'Schilder & Wandafwerking',
                address: 'Kerkstraat 42, 9601 AB Hoogezand',
                phone: '06 28 49 10 22',
                normalizedPhone: '0628491022',
                whatsAppNumber: '31628491022',
                hasWhatsApp: true,
                hasWebsite: false,
                website: null,
                rating: 4.9,
                reviewsCount: 16,
                status: 'concept_ready',
                liveUrl: 'https://creationaltfix.nl/concept/schildersbedrijf-hoogezand/',
                pitchHook: "We zagen dat je als schilder in regio Hoogezand uitstekend werk levert met 4.9 sterren, maar dat potentiële klanten via mobiel nog geen directe website kunnen bezoeken.",
                pitch: {
                    subject: "Concept website voor Schildersbedrijf Van der Veen in Hoogezand",
                    bodyPlain: "Beste heer/mevrouw,\n\nWe zagen dat je als schilder in regio Hoogezand uitstekend werk levert met 4.9 sterren op Google Maps, maar dat potentiële klanten nog geen mobiele website kunnen bezoeken.\n\nWe hebben alvast een werkend concept voor je live gezet:\n👉 https://creationaltfix.nl/concept/schildersbedrijf-hoogezand/\n\nVriendelijke groet,\nAllard Veldman - Creation+Alt+Fix\ninfo@creationaltfix.nl",
                    whatsAppText: "Hoi! Allard hier van Creation+Alt+Fix. Ik zag jullie 4.9 sterren op Google in Hoogezand, maar zag dat er nog geen mobiele website was. Ik heb alvast een vrijblijvend concept klaargezet: https://creationaltfix.nl/concept/schildersbedrijf-hoogezand/ - Wat vind je ervan?"
                }
            },
            {
                id: 'lead_demo_2',
                slug: 'hovenier-groningen-oost',
                name: 'Groen & Bestrating Noord',
                category: 'Hovenier & Bestrating',
                address: 'Noorderstraat 18, 9611 AS Sappemeer',
                phone: '06 14 55 89 30',
                normalizedPhone: '0614558930',
                whatsAppNumber: '31614558930',
                hasWhatsApp: true,
                hasWebsite: false,
                website: null,
                rating: 4.8,
                reviewsCount: 12,
                status: 'concept_ready',
                liveUrl: 'https://creationaltfix.nl/concept/hovenier-groningen-oost/',
                pitchHook: "We zagen jouw vermelding voor Groen & Bestrating Noord op Google Maps in Sappemeer met 12 positieve recensies, maar zonder website.",
                pitch: {
                    subject: "Concept website voor Groen & Bestrating Noord",
                    bodyPlain: "Beste Groen & Bestrating Noord,\n\nWe zagen jullie prachtige hoveniersprojecten in Sappemeer/Hoogezand. Omdat veel tuinbezitters via smartphone zoeken, hebben we alvast een snel concept voor jullie gemaakt:\n👉 https://creationaltfix.nl/concept/hovenier-groningen-oost/\n\nGroet,\nAllard Veldman - Creation+Alt+Fix",
                    whatsAppText: "Hoi! Allard van Creation+Alt+Fix. Ik heb alvast een demonstratie website voor jullie hoveniersbedrijf klaargezet: https://creationaltfix.nl/concept/hovenier-groningen-oost/ - Kijk gerust even!"
                }
            }
        ];
        localStorage.setItem('caf_leads_factory', JSON.stringify(leads));
    }

    initLeadFactoryModule(leads, {
        onRefresh: async () => {
            await setupAndRenderLeadFactory();
        },
        onSendEmail: async (lead) => {
            const subject = encodeURIComponent(lead.pitch?.subject || `Concept website voor ${lead.name}`);
            const body = encodeURIComponent(lead.pitch?.bodyPlain || `Bekijk hier je concept website: ${lead.liveUrl}`);
            const mailto = `mailto:${lead.email || ''}?subject=${subject}&body=${body}`;
            window.location.href = mailto;

            lead.status = 'sent';
            lead.sentAt = new Date().toISOString();
            if (db) {
                try {
                    await setDoc(doc(db, "leads_factory", lead.id), lead, { merge: true });
                } catch (e) { console.warn(e); }
            }
            const stored = JSON.parse(localStorage.getItem('caf_leads_factory') || '[]');
            const idx = stored.findIndex(s => s.id === lead.id);
            if (idx >= 0) stored[idx] = lead; else stored.push(lead);
            localStorage.setItem('caf_leads_factory', JSON.stringify(stored));

            initLeadFactoryModule(stored);
            await logAuditEvent('lead_email_sent', `Concept acquisitiemail voorbereid en geopend voor ${lead.name}.`);
        },
        onUpdateStatus: async (lead, newStatus) => {
            lead.status = newStatus;
            lead.updatedAt = new Date().toISOString();
            if (db) {
                try {
                    await setDoc(doc(db, "leads_factory", lead.id), lead, { merge: true });
                } catch (e) { console.warn(e); }
            }
            const stored = JSON.parse(localStorage.getItem('caf_leads_factory') || '[]');
            const idx = stored.findIndex(s => s.id === lead.id);
            if (idx >= 0) stored[idx] = lead; else stored.push(lead);
            localStorage.setItem('caf_leads_factory', JSON.stringify(stored));
            initLeadFactoryModule(stored);
        },
        onTriggerCycle: () => {
            alert("Autonome Engine Instructie:\n\nDe engine draait continu op jouw eigen Windows machine en gebruikt de 'agy' CLI (uit jouw AI abonnement).\n\nOm direct handmatig 1 extra concept te genereren, open een terminal en typ:\nnpm run factory:run\n\nOf start de 24/7 achtergrondservice via:\nnpm run factory:daemon");
        }
    });
}


// --- Modals & Editable Klantkaart ---
window.openNewLeadModal = () => {
    document.getElementById('modal-title').innerText = 'Nieuwe Lead Toevoegen';
    document.getElementById('modal-body').innerHTML = `
        <p>Voeg handmatig een lead toe. Deze verschijnt direct in het overzicht en onder het tabblad Leads.</p>
        <br>
        <input type="text" id="new-lead-name" class="admin-input" placeholder="Naam of Bedrijf">
        <input type="email" id="new-lead-email" class="admin-input" placeholder="E-mailadres">
        <textarea id="new-lead-desc" class="admin-input" placeholder="Wensen / Omschrijving" rows="4"></textarea>
        <button class="btn btn-primary" onclick="saveNewLead()" style="margin-top: 15px;">Opslaan</button>
    `;
    document.getElementById('project-modal').classList.remove('hidden');
};

window.saveNewLead = async () => {
    const name = document.getElementById('new-lead-name').value;
    const email = document.getElementById('new-lead-email').value;
    const desc = document.getElementById('new-lead-desc').value;
    
    if (!name) return alert('Naam of Bedrijf is verplicht');
    
    const newLeadObj = {
        client: name,
        contactName: name,
        email: email,
        service: desc || "Onbekend",
        status: "Nieuwe Lead",
        statusClass: "waiting",
        date: new Date().toLocaleDateString('nl-NL')
    };

    if (db) {
        try {
            await addDoc(collection(db, "projects"), newLeadObj);
        } catch(e) {
            console.error("Error saving lead", e);
            alert("Fout bij opslaan lead in Firestore: " + e.message);
        }
    } else {
        alert("Opslaan mislukt: Geen verbinding met Firestore.");
    }
    closeModal('project-modal');
    loadDashboardData();
};

// Eerste (verouderde) deleteProject definitie verwijderd — zie L908+ voor de actuele versie

window.openProjectDetails = (id) => {
    const p = cachedProjects.find(item => item.id == id) || { id, client: "Onbekende Klant", service: "Onbekend", status: "Nieuwe Lead", statusClass: "waiting", date: "Zojuist" };

    const clientName = p.client || p.companyName || "Onbekend Bedrijf";
    const contact = p.contactName || p.client || "";
    const email = p.email || "";
    const domain = p.domainName || p.domain || "";
    const service = p.service || "";
    const goals = p.goals || p.projectGoals || "";
    const design = p.design || p.designPreferences || "";
    const dateSubmitted = p.date || "Onbekend";
    const status = p.status || "Nieuwe Lead";
    const originalEmail = p.email || ""; // Track original email for change detection
    const hasValidEmail = Boolean(email && email.trim() && email.includes('@'));
    const isAuthActivated = isClientAuthActivated(p);

    // Parse extra/secondary domains
    const extraDomainsList = Array.isArray(p.additionalDomains) 
        ? p.additionalDomains 
        : (typeof p.additionalDomains === 'string' ? p.additionalDomains.split(/[\r\n,;]+/).map(d => d.trim()).filter(Boolean) : []);
    const extraDomainsStr = extraDomainsList.join(', ');

    // XSS-safe versions for innerHTML injection
    const s = {
        clientName: escapeHtml(clientName),
        contact: escapeHtml(contact),
        email: escapeHtml(email),
        domain: escapeHtml(domain),
        extraDomains: escapeHtml(extraDomainsStr),
        service: escapeHtml(service),
        goals: escapeHtml(goals),
        design: escapeHtml(design),
        dateSubmitted: escapeHtml(dateSubmitted),
        status: escapeHtml(status),
        statusClass: escapeHtml(p.statusClass || 'primary'),
        designUrl: escapeHtml(p.designUrl || p.figmaUrl || ''),
        safeId: escapeHtml(id)
    };

    const statusInfo = formatProjectStatus(status, p.statusClass);
    const currentPhase = statusInfo.phase;
    const isPaymentWaiting = statusInfo.isPaymentWaiting;

    const files = p.files || [];
    let filesHtml = '';
    if (files.length === 0) {
        filesHtml = '<p style="font-size: 0.85rem; color: var(--color-text-secondary); font-style: italic;">Nog geen bestanden geüpload.</p>';
    } else {
        filesHtml = files.map(f => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 8px 12px; margin-bottom: 6px; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <i class="fas fa-file-alt" style="color: #6366f1;"></i>
                    <div style="overflow: hidden;">
                        <div style="font-size: 0.85rem; color: #fff; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(f.name)}</div>
                        <div style="font-size: 0.7rem; color: var(--color-text-secondary);">Toegevoegd op: ${f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('nl-NL') : 'eerder'}</div>
                    </div>
                </div>
                <a href="${escapeHtml(sanitizeUrl(f.url))}" target="_blank" class="btn btn-sm" style="background: rgba(34, 211, 238, 0.1); color: #22d3ee; border: none; padding: 4px 8px; text-decoration: none; font-size: 0.8rem;"><i class="fas fa-download"></i> Download</a>
            </div>
        `).join('');
    }

    const info = getPiBoekhoudingInfo(p);
    const currentPlanId = p.subscriptionPlanId || (info && info.currentPlanId) || 'managed_nl';
    const currentPlan = SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS['managed_nl'];
    const recPlanId = (info && info.recommendedPlanId) || 'managed_nl';
    const recPlan = SUBSCRIPTION_PLANS[recPlanId] || SUBSCRIPTION_PLANS['managed_nl'];

    let invoiceHtml = '';
    if (info && info.latestInvoice) {
        const inv = info.latestInvoice;
        const totalFmt = Number(inv.totalExcl).toFixed(2).replace('.', ',');
        const itemsList = (inv.items || []).map(it => `
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #cbd5e1; margin-top: 2px;">
                <span>• ${it.qty}x ${escapeHtml(it.name)} ${it.desc ? '<span style="color:#64748b;">(' + escapeHtml(it.desc) + ')</span>' : ''}</span>
                <span style="font-family: monospace; color: #e2e8f0;">€ ${(it.qty * it.price).toFixed(2).replace('.', ',')}</span>
            </div>
        `).join('');

        invoiceHtml = `
            <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 8px 10px; margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <strong style="font-size: 0.78rem; color: #fff;"><i class="fas fa-receipt text-accent"></i> Laatste Factuur: ${escapeHtml(inv.number)} (${escapeHtml(inv.date)})</strong>
                    <span class="badge badge-success" style="font-size: 0.65rem; padding: 2px 5px;">${escapeHtml(inv.status)}</span>
                </div>
                <div style="font-size: 0.8rem; font-weight: 700; color: #34d399;">
                    € ${totalFmt} excl. BTW
                </div>
                <div style="border-top: 1px dashed rgba(255,255,255,0.08); margin-top: 4px; padding-top: 4px;">
                    ${itemsList}
                </div>
            </div>
        `;
    } else {
        invoiceHtml = `
            <div style="background: rgba(0,0,0,0.25); border-radius: 6px; padding: 8px 10px; margin-top: 8px; font-size: 0.74rem; color: #94a3b8; font-style: italic;">
                Geen historische facturen in Pi-Boekhouding geregistreerd voor dit project.
            </div>
        `;
    }

    document.getElementById('modal-title').innerText = `Klantkaart: ${clientName}`;
    document.getElementById('modal-body').innerHTML = `
        <div class="klantkaart-container">
            <div class="klantkaart-header">
                <div>
                    <strong style="font-size: 1.1rem; color: #fff;">${s.clientName}</strong>
                    <span style="font-size: 0.85rem; color: var(--color-text-secondary); display: block; margin-top: 2px;">Ingediend op: ${s.dateSubmitted}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <a href="project.html?id=${s.safeId}" class="btn btn-primary btn-sm" style="text-decoration: none;"><i class="fas fa-desktop"></i> Open Werkplek</a>
                    <a href="../status/index.html?preview=true&id=${s.safeId}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none; background: rgba(34, 211, 238, 0.12); color: #22d3ee; border: 1px solid rgba(34, 211, 238, 0.35); display: inline-flex; align-items: center; gap: 6px;" title="Bekijk het klantenportaal zoals deze klant het ziet (Directe Klantview)"><i class="fas fa-eye"></i> Klantview</a>
                    <select onchange="window.updateProjectPhaseFromModal('${s.safeId}', this.value)" class="admin-input" style="padding: 4px 8px; font-size: 0.8rem; margin: 0; width: auto; cursor: pointer; background: rgba(15,23,42,0.9); border: 1px solid var(--color-primary-light); color: #fff; border-radius: 6px;" title="Wijzig status/fase direct">
                        <option value="1" ${currentPhase === 1 ? 'selected' : ''}>Fase 1: Intake Voltooid</option>
                        <option value="2" ${currentPhase === 2 ? 'selected' : ''}>Fase 2: Wacht op Akkoord (Offerte)</option>
                        <option value="3" ${currentPhase === 3 ? 'selected' : ''}>Fase 3: Design &amp; Ontwerp</option>
                        <option value="4" ${currentPhase === 4 ? 'selected' : ''}>Fase 4: In Ontwikkeling</option>
                        <option value="5-payment" ${currentPhase === 5 && isPaymentWaiting ? 'selected' : ''}>Fase 5: Wacht op Betaling (Mollie)</option>
                        <option value="5-complete" ${currentPhase === 5 && !isPaymentWaiting ? 'selected' : ''}>Fase 5: Volledig Live &amp; Voldaan</option>
                    </select>
                </div>
            </div>

            <div class="admin-phase-tracker" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 12px 0 16px 0; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
                <div onclick="window.updateProjectPhaseFromModal('${s.safeId}', 1)" style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; ${currentPhase === 1 ? 'background: rgba(34, 211, 238, 0.2); border: 1px solid #22d3ee; color: #22d3ee; font-weight: 700;' : 'color: #94a3b8;'}" title="Klik om naar Fase 1 (Intake) te schakelen">
                    <i class="fas fa-clipboard-check"></i><br>Fase 1: Intake
                </div>
                <div onclick="window.updateProjectPhaseFromModal('${s.safeId}', 2)" style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; ${currentPhase === 2 ? 'background: rgba(245, 158, 11, 0.2); border: 1px solid #fbbf24; color: #fbbf24; font-weight: 700;' : 'color: #94a3b8;'}" title="Klik om naar Fase 2 (Offerte) te schakelen">
                    <i class="fas fa-file-signature"></i><br>Fase 2: Offerte
                </div>
                <div onclick="window.updateProjectPhaseFromModal('${s.safeId}', 3)" style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; ${currentPhase === 3 ? 'background: rgba(168, 85, 247, 0.2); border: 1px solid #c084fc; color: #c084fc; font-weight: 700;' : 'color: #94a3b8;'}" title="Klik om naar Fase 3 (Design) te schakelen">
                    <i class="fas fa-palette"></i><br>Fase 3: Design
                </div>
                <div onclick="window.updateProjectPhaseFromModal('${s.safeId}', 4)" style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; ${currentPhase === 4 ? 'background: rgba(99, 102, 241, 0.2); border: 1px solid #818cf8; color: #818cf8; font-weight: 700;' : 'color: #94a3b8;'}" title="Klik om naar Fase 4 (Code) te schakelen">
                    <i class="fas fa-code"></i><br>Fase 4: Code
                </div>
                <div onclick="window.updateProjectPhaseFromModal('${s.safeId}', 5)" style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; ${currentPhase === 5 ? (isPaymentWaiting ? 'background: linear-gradient(135deg, rgba(14,165,233,0.2) 0%, rgba(245,158,11,0.2) 100%); border: 1px solid #fbbf24; color: #38bdf8; font-weight: 700;' : 'background: rgba(16, 185, 129, 0.2); border: 1px solid #34d399; color: #34d399; font-weight: 700;') : 'color: #94a3b8;'}" title="Klik om naar Fase 5 (Live & Voldaan) te schakelen">
                    <i class="fas fa-rocket"></i><br>Fase 5: Live
                </div>
            </div>

            <form id="edit-klantkaart-form">
                <div class="klantkaart-meta-grid">
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-building"></i> Bedrijfsnaam</div>
                        <input type="text" id="edit-client" class="admin-input" value="${s.clientName}" required style="margin: 4px 0 0 0;">
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-user"></i> Contactpersoon</div>
                        <input type="text" id="edit-contact" class="admin-input" value="${s.contact}" style="margin: 4px 0 0 0;" placeholder="Volledige naam">
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-envelope"></i> E-mailadres</div>
                        <input type="email" id="edit-email" class="admin-input" value="${s.email}" required style="margin: 4px 0 0 0;" data-original-email="${s.email}">
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-globe"></i> Hoofddomein (Primair)</div>
                        <input type="text" id="edit-domain" class="admin-input" value="${s.domain}" style="margin: 4px 0 0 0;" placeholder="bijv. www.klant.nl" data-original-domain="${s.domain}">
                        <div id="modal-domain-status-pill" style="margin-top: 5px; font-size: 0.76rem; display: flex; align-items: center; gap: 6px;"></div>
                    </div>
                    <div class="meta-box" style="grid-column: span 2;">
                        <div class="meta-label"><i class="fas fa-network-wired"></i> Extra / Secundaire Domeinen (Optioneel)</div>
                        <input type="text" id="edit-extra-domains" class="admin-input" value="${s.extraDomains}" style="margin: 4px 0 0 0;" placeholder="bijv. klant.com, staging.klant.nl, shop.klant.nl (gescheiden door komma's)" data-original-extra="${s.extraDomains}">
                        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">
                            <i class="fas fa-shield-alt" style="color: var(--color-accent);"></i> Elk extra domein wordt direct automatisch gemonitord op DNS, SSL &amp; HTTPS bereikbaarheid.
                        </div>
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-tag"></i> Geselecteerde Dienst</div>
                        <input type="text" id="edit-service" class="admin-input" value="${s.service}" style="margin: 4px 0 0 0;">
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-euro-sign"></i> Offertebedrag (excl. 21% BTW) (€)</div>
                        <input type="text" id="edit-proposalPrice" class="admin-input" value="${escapeHtml(p.proposalPrice || '')}" style="margin: 4px 0 0 0;" placeholder="bijv. 650,00">
                    </div>
                </div>

                <div class="intake-box" style="margin-top: 15px;">
                    <h4><i class="fas fa-bullseye"></i> Doelstellingen & Scope</h4>
                    <textarea id="edit-goals" class="admin-input" rows="2" style="margin: 4px 0 0 0;">${s.goals}</textarea>
                </div>

                <div class="intake-box" style="margin-top: 15px;">
                    <h4><i class="fas fa-paint-brush"></i> Stijl- & Designvoorkeuren</h4>
                    <textarea id="edit-design" class="admin-input" rows="2" style="margin: 4px 0 0 0;">${s.design}</textarea>
                </div>

                <div class="intake-box" style="margin-top: 15px;">
                    <h4><i class="fas fa-drafting-compass"></i> Ontwerp / Figma Link (Fase 3)</h4>
                    <input type="url" id="edit-designUrl" class="admin-input" value="${s.designUrl}" style="margin: 4px 0 0 0;" placeholder="https://www.figma.com/design/... of preview URL">
                </div>

                <div class="intake-box" style="margin-top: 15px; background: ${isAuthActivated ? 'rgba(16, 185, 129, 0.05)' : (!hasValidEmail ? 'rgba(239, 68, 68, 0.05)' : 'rgba(99, 102, 241, 0.05)')}; border: 1px solid ${isAuthActivated ? 'rgba(16, 185, 129, 0.3)' : (!hasValidEmail ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.2)')};">
                    <h4 style="margin-top: 0;"><i class="fas fa-key"></i> Klantenportaal Inlog (Firebase Auth)</h4>
                    <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 8px;">
                        Gekoppeld account e-mailadres: <strong>${s.email || 'Nog geen e-mail ingevuld'}</strong>
                        ${!hasValidEmail 
                            ? `<span style="color: #f87171; font-weight: 600; margin-left: 8px;"><i class="fas fa-exclamation-triangle"></i> Niet geactiveerd (Geen e-mailadres)</span>` 
                            : (isAuthActivated 
                                ? `<span style="color: #34d399; font-weight: 600; margin-left: 8px;"><i class="fas fa-check-circle"></i> Geactiveerd in Firebase Auth</span>` 
                                : `<span style="color: #fbbf24; font-weight: 600; margin-left: 8px;"><i class="fas fa-exclamation-circle"></i> Niet geactiveerd in Firebase Auth</span>`)}
                    </p>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="btn btn-primary btn-sm" id="btn-activate-auth" ${!hasValidEmail ? 'disabled style="opacity: 0.6; cursor: not-allowed;" title="Vul eerst een geldig e-mailadres in"' : ''}>
                            <i class="fas fa-user-plus"></i> ${!hasValidEmail ? 'Vul e-mail in om te activeren' : (isAuthActivated ? 'Her-activeer / Koppel Account' : 'Activeer Klantaccount')}
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-auth" ${!hasValidEmail ? 'disabled style="opacity: 0.6; cursor: not-allowed;" title="Geen e-mailadres ingesteld"' : ''}>
                            <i class="fas fa-paper-plane"></i> Wachtwoord Reset
                        </button>
                    </div>
                </div>

                <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                    <a href="../status/index.html?preview=true&id=${s.safeId}" target="_blank" class="btn btn-secondary" style="text-decoration: none; background: rgba(34, 211, 238, 0.12); color: #22d3ee; border: 1px solid rgba(34, 211, 238, 0.35); display: inline-flex; align-items: center; gap: 6px;" title="Bekijk het klantenportaal zoals deze klant het ziet (Directe Klantview)"><i class="fas fa-eye"></i> Klantview</a>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Wijzigingen Opslaan</button>
                </div>
            </form>

            <div style="border-top: 1px solid var(--color-border); padding-top: 15px; margin-top: 10px;">
                <h4 class="actions-title"><i class="fas fa-folder-open"></i> Project Bestanden & Uploads</h4>
                <div style="margin-top: 10px;">
                    ${filesHtml}
                </div>
            </div>

            <!-- CARD: Pi-Boekhouding, Abonnement & Facturen -->
            <div style="border-top: 1px solid var(--color-border); padding-top: 15px; margin-top: 10px;">
                <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 8px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0; font-size: 0.92rem; color: #fff; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-file-invoice-dollar" style="color: #34d399;"></i> Facturen &amp; Abonnement (Pi Live)
                        </h4>
                        <span style="font-size: 0.7rem; padding: 2px 7px; border-radius: 4px; background: rgba(52, 211, 153, 0.15); color: #34d399; font-weight: 700; border: 1px solid rgba(52, 211, 153, 0.3);">Pi-Boekhouding</span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                        <div style="background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 0.68rem; color: var(--color-text-secondary); text-transform: uppercase;">Huidig Abonnement</div>
                            <div id="modal-sub-current" style="font-size: 0.82rem; font-weight: 600; color: #38bdf8; margin-top: 2px;">
                                ${escapeHtml(p.subscriptionPlanName || (info && info.currentPlanName) || currentPlan.name + ' (€ ' + currentPlan.price + '/' + currentPlan.cycle + ')')}
                            </div>
                        </div>
                        <div style="background: rgba(99,102,241,0.1); border-left: 3px solid #818cf8; padding: 8px 10px; border-radius: 4px;">
                            <div style="font-size: 0.68rem; color: #c7d2fe; text-transform: uppercase; font-weight: 700;">Systeemadvies</div>
                            <div style="font-size: 0.75rem; color: #e2e8f0; margin-top: 2px; line-height: 1.3;">
                                <strong>${escapeHtml(recPlan.name)} (€ ${recPlan.price}/${recPlan.cycle})</strong>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                        <select id="modal-select-subscription" class="admin-input" style="font-size: 0.78rem; padding: 6px 8px; margin: 0; flex: 1; cursor: pointer;">
                            <option value="managed_nl" ${currentPlanId === 'managed_nl' ? 'selected' : ''}>🌐 Managed Cloud Hosting All-in (€ 150,-/jr)</option>
                            <option value="transition_2027_loyalty" ${currentPlanId === 'transition_2027_loyalty' ? 'selected' : ''}>⭐ Trouwe Klant Overgangstarief 2027 (€ 95,-/jr)</option>
                            <option value="managed_multi" ${currentPlanId === 'managed_multi' ? 'selected' : ''}>🌐 Managed Multi-Domein .nl + .com (€ 175,-/jr)</option>
                            <option value="security_apk" ${currentPlanId === 'security_apk' ? 'selected' : ''}>🛡️ Jaarlijkse Website APK (€ 350,-/jr)</option>
                            <option value="allin_apk" ${currentPlanId === 'allin_apk' ? 'selected' : ''}>🚀 Managed Hosting All-in + APK (€ 500,-/jr)</option>
                            <option value="legacy_22" ${currentPlanId === 'legacy_22' ? 'selected' : ''}>⏳ Historisch / Oud Tarief (€ 22,-/jr)</option>
                            <option value="none" ${currentPlanId === 'none' ? 'selected' : ''}>❌ Geen / Eenmalig Project (€ 0,-)</option>
                        </select>
                        <button type="button" id="btn-modal-save-sub" class="btn btn-primary btn-sm" style="padding: 6px 12px; font-size: 0.78rem; white-space: nowrap;">
                            <i class="fas fa-save"></i> Opslaan
                        </button>
                    </div>

                    <button type="button" id="btn-modal-2027-proposal" class="btn btn-sm" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border: 1px solid #818cf8; font-weight: 600; padding: 7px 12px; font-size: 0.8rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px; margin-bottom: 8px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-paper-plane"></i> 🚀 2027 Abonnementsplan Berichten aan Klant
                    </button>

                    ${invoiceHtml}

                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px;">
                        <a href="http://100.65.226.112:8888/" target="_blank" rel="noopener" class="btn btn-sm" style="background: #047857; color: #fff; text-decoration: none; border: 1px solid #10b981; font-weight: 600; padding: 6px 12px; font-size: 0.78rem;">
                            <i class="fas fa-external-link-alt"></i> Open Facturen Web (100.65.226.112:8888)
                        </a>
                        <button type="button" id="btn-modal-copy-facturen" class="btn btn-secondary btn-sm" style="background: #1e293b; border-color: #334155; color: #cbd5e1; font-size: 0.78rem;">
                            <i class="fas fa-copy"></i> Kopieer Facturen Map
                        </button>
                    </div>
                    <div style="font-family: monospace; font-size: 0.7rem; color: #94a3b8; margin-top: 6px;">
                        Locatie: C:\\Users\\Admin\\Backups\\Pi-Boekhouding
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid var(--color-border); padding-top: 15px; margin-top: 10px;">
                <h4 class="actions-title"><i class="fas fa-bolt"></i> Werkstroom & Snelacties per Fase</h4>
                <div class="action-buttons-grid" id="action-buttons-container"></div>
            </div>

            <div id="ai-email-container" class="hidden" style="padding: 15px; background: rgba(34, 211, 238, 0.08); border-radius: 8px; border: 1px solid rgba(34, 211, 238, 0.3);">
                <p style="margin-bottom: 10px; font-weight: 600; color: var(--color-accent);"><i class="fas fa-magic"></i> AI Concept E-mail (Gepersonaliseerd op basis van intake):</p>
                <textarea id="ai-email-body" class="admin-input" rows="7" style="font-family: var(--font-body);"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;" id="ai-email-actions"></div>
            </div>

            <div id="proposal-link-container" class="hidden" style="padding: 15px; background: rgba(99,102,241,0.08); border-radius: 8px; border: 1px solid rgba(99,102,241,0.3);">
                <p style="margin-bottom: 10px; font-weight: 600; color: #818cf8;"><i class="fas fa-link"></i> Gegenereerde Online Offerte Link:</p>
                <input type="text" id="proposal-link" class="admin-input" readonly style="margin-bottom: 10px;">
                <a id="proposal-visit-btn" href="#" target="_blank" class="btn btn-primary btn-sm"><i class="fas fa-external-link-alt"></i> Bekijk Offerte</a>
            </div>
        </div>
    `;

    document.getElementById('edit-klantkaart-form')?.addEventListener('submit', (e) => saveKlantkaartChanges(e, id));
    document.getElementById('btn-activate-auth')?.addEventListener('click', () => createClientAuthAccount(id, document.getElementById('edit-email')?.value || email, contact));
    document.getElementById('btn-reset-auth')?.addEventListener('click', () => triggerAdminPasswordReset(document.getElementById('edit-email')?.value || email));

    // Render current monitoring status badge under domain input
    const cleanDomain = normalizeDomain(s.domain);
    const domainStatusPill = document.getElementById('modal-domain-status-pill');
    if (domainStatusPill) {
        if (cleanDomain) {
            const existingReport = monitoringReports.find(r => r.domain === cleanDomain);
            if (existingReport) {
                domainStatusPill.innerHTML = `
                    <span class="monitoring-pulse-dot ${existingReport.overallStatus}"></span>
                    <span style="color: ${existingReport.statusColor}; font-weight: 600;">${escapeHtml(existingReport.statusText)}</span>
                    <span style="color: #64748b;">(${existingReport.latencyMs}ms • DNS: ${escapeHtml(existingReport.dnsStatus)})</span>
                `;
            } else {
                domainStatusPill.innerHTML = `
                    <span class="monitoring-pulse-dot operational"></span>
                    <span style="color: #94a3b8;">Gekoppeld aan Realtime Monitoring Suite</span>
                `;
            }
        } else {
            domainStatusPill.innerHTML = `
                <span style="color: #64748b; font-style: italic;">Geen domein ingesteld. Vul in om realtime monitoring te activeren.</span>
            `;
        }
    }

    document.getElementById('btn-modal-save-sub')?.addEventListener('click', async () => {
        const select = document.getElementById('modal-select-subscription');
        if (!select) return;
        const planId = select.value;
        const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS['managed_nl'];
        const saveBtn = document.getElementById('btn-modal-save-sub');
        const origText = saveBtn.innerHTML;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            if (db && id && String(id).length > 5) {
                await updateDoc(doc(db, "projects", id), {
                    subscriptionPlanId: plan.id,
                    subscriptionPlanName: plan.name,
                    subscriptionPrice: plan.price,
                    subscriptionCycle: plan.cycle,
                    subscriptionUpdatedAt: new Date().toISOString()
                });
            }
            p.subscriptionPlanId = plan.id;
            p.subscriptionPlanName = plan.name;
            p.subscriptionPrice = plan.price;
            p.subscriptionCycle = plan.cycle;

            const currDisp = document.getElementById('modal-sub-current');
            if (currDisp) currDisp.innerText = `${plan.name} (€ ${plan.price}/${plan.cycle})`;

            saveBtn.innerHTML = '<i class="fas fa-check" style="color: #34d399;"></i>';
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = origText;
            }, 2000);
        } catch (err) {
            console.error("Fout bij opslaan abonnement in modal:", err);
            alert("Kon abonnement niet opslaan: " + err.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = origText;
        }
    });

    document.getElementById('btn-modal-2027-proposal')?.addEventListener('click', () => {
        open2027SubscriptionModal({
            project: p,
            onSavePlan: async (proj, plan) => {
                const updatedFields = {
                    subscriptionPlan2027Id: plan.id,
                    subscriptionPlan2027Name: plan.name,
                    subscriptionPlan2027Price: plan.price,
                    subscriptionPlan2027Status: 'voorgesteld',
                    subscriptionPlan2027ProposedAt: new Date().toISOString()
                };
                if (db && id && String(id).length > 5) {
                    await updateDoc(doc(db, "projects", id), updatedFields);
                }
                Object.assign(p, updatedFields);
                await logAuditEvent('2027_plan_proposed', `2027 Abonnementsplan voorgesteld: ${plan.name} (€ ${plan.price}/${plan.cycle}).`);
            },
            onSendPortalTicket: async (proj, plan, messageText) => {
                const updatedFields = {
                    subscriptionPlan2027Id: plan.id,
                    subscriptionPlan2027Name: plan.name,
                    subscriptionPlan2027Price: plan.price,
                    subscriptionPlan2027Status: 'voorgesteld',
                    subscriptionPlan2027ProposedAt: new Date().toISOString()
                };
                const msgObj = {
                    id: 'msg_2027_' + Date.now(),
                    sender: 'admin',
                    text: messageText,
                    createdAt: new Date().toISOString(),
                    status: 'open',
                    readByClient: false
                };
                if (db && id && String(id).length > 5) {
                    const currentMsgs = p.messages || [];
                    await updateDoc(doc(db, "projects", id), {
                        ...updatedFields,
                        messages: [...currentMsgs, msgObj]
                    });
                }
                if (!p.messages) p.messages = [];
                p.messages.push(msgObj);
                Object.assign(p, updatedFields);
                await logAuditEvent('2027_plan_ticket_sent', `2027 Abonnementsvoorstel als ticket in klantenportaal geplaatst voor ${proj.client || 'klant'}.`);
            }
        });
    });

    document.getElementById('btn-modal-copy-facturen')?.addEventListener('click', () => {
        navigator.clipboard.writeText('C:\\Users\\Admin\\Backups\\Pi-Boekhouding');
        const btn = document.getElementById('btn-modal-copy-facturen');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check" style="color: #34d399;"></i> Gekopieerd!';
            setTimeout(() => btn.innerHTML = orig, 2000);
        }
    });

    const actionContainer = document.getElementById('action-buttons-container');
    actionContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" data-action="ai-email"><i class="fas fa-robot"></i> AI Concept Mail (Fase 1)</button>
        <button class="btn btn-secondary btn-sm" data-action="proposal"><i class="fas fa-file-contract"></i> Genereer Offerte (Fase 2)</button>
        <button class="btn btn-secondary btn-sm" data-action="download-offerte" style="border-color: rgba(99, 102, 241, 0.4); color: var(--color-primary-light);"><i class="fas fa-file-pdf"></i> Download Offerte (PDF)</button>
        <button class="btn btn-secondary btn-sm" data-action="design" style="border-color: rgba(168, 85, 247, 0.4); color: #c084fc;"><i class="fas fa-palette"></i> Verstuur Design naar Klant (Fase 3)</button>
        <button class="btn btn-secondary btn-sm" data-action="mollie"><i class="fas fa-euro-sign"></i> Factuur + Mollie (Fase 5)</button>
        <button class="btn btn-secondary btn-sm" data-action="download-factuur" style="border-color: rgba(34, 211, 238, 0.4); color: var(--color-accent);"><i class="fas fa-receipt"></i> Download Factuur (PDF)</button>
        <a href="http://100.65.226.112:8888/" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="border-color: rgba(52, 211, 153, 0.4); color: #34d399; text-decoration: none;"><i class="fas fa-file-invoice-dollar"></i> Pi-Boekhouding Web</a>
        <button class="btn btn-secondary btn-sm" data-action="checkin"><i class="fas fa-sync-alt"></i> 14-Dagen Check-in (Fase 5)</button>
    `;
    actionContainer.querySelector('[data-action="ai-email"]').addEventListener('click', () => generateAiEmail(id));
    actionContainer.querySelector('[data-action="proposal"]').addEventListener('click', () => generateProposal(id));
    actionContainer.querySelector('[data-action="download-offerte"]').addEventListener('click', () => downloadProjectProposalPdf(id));
    actionContainer.querySelector('[data-action="design"]').addEventListener('click', () => sendDesignToClient(id));
    actionContainer.querySelector('[data-action="mollie"]').addEventListener('click', () => generateInvoiceMollieLink(id, clientName));
    actionContainer.querySelector('[data-action="download-factuur"]').addEventListener('click', () => downloadProjectInvoicePdf(id));
    actionContainer.querySelector('[data-action="checkin"]').addEventListener('click', () => triggerCheckIn(id, clientName));

    // Bind AI email action buttons
    const aiActions = document.getElementById('ai-email-actions');
    aiActions.innerHTML = `
        <button class="btn btn-primary btn-sm" data-action="send-mail"><i class="fas fa-paper-plane"></i> Open in E-mail Client</button>
        <button class="btn btn-secondary btn-sm" data-action="copy-mail"><i class="fas fa-copy"></i> Kopiëren</button>
    `;
    aiActions.querySelector('[data-action="send-mail"]').addEventListener('click', () => sendMailToClient(email));
    aiActions.querySelector('[data-action="copy-mail"]').addEventListener('click', () => copyAiEmail());

    document.getElementById('project-modal').classList.remove('hidden');
};

window.saveKlantkaartChanges = async (e, id) => {
    e.preventDefault();

    const newEmail = document.getElementById('edit-email').value.trim().toLowerCase();
    const originalEmail = document.getElementById('edit-email')?.dataset?.originalEmail || '';

    // Waarschuwing bij e-mailadres wijziging
    if (originalEmail && newEmail !== originalEmail.toLowerCase()) {
        const confirmed = confirm(
            `⚠️ Let op: je wijzigt het e-mailadres van "${originalEmail}" naar "${newEmail}".\n\n` +
            `Het Firebase Auth account van de klant is nog gekoppeld aan het originele e-mailadres.\n` +
            `Na het opslaan moet je mogelijk 'Activeer Klantaccount' opnieuw uitvoeren voor het nieuwe adres.\n\n` +
            `Wil je doorgaan?`
        );
        if (!confirmed) return;
    }

    const domainInput = document.getElementById('edit-domain');
    const originalDomain = domainInput?.dataset?.originalDomain 
        || cachedProjects.find(p => p.id == id)?.domainName 
        || cachedProjects.find(p => p.id == id)?.domain 
        || '';
    const newDomain = domainInput?.value?.trim() || '';

    const extraDomainsInput = document.getElementById('edit-extra-domains');
    const rawExtra = extraDomainsInput?.value?.trim() || '';
    const additionalDomains = rawExtra 
        ? rawExtra.split(/[\r\n,;]+/).map(d => d.trim()).filter(Boolean)
        : [];
    const allDomains = [newDomain, ...additionalDomains].filter(Boolean);

    const updatedData = {
        client: document.getElementById('edit-client').value,
        companyName: document.getElementById('edit-client').value,
        contactName: document.getElementById('edit-contact').value,
        email: newEmail,
        domainName: newDomain,
        domain: newDomain,
        additionalDomains,
        domains: allDomains,
        service: document.getElementById('edit-service').value,
        goals: document.getElementById('edit-goals').value,
        projectGoals: document.getElementById('edit-goals').value,
        design: document.getElementById('edit-design').value,
        designPreferences: document.getElementById('edit-design').value,
        designUrl: document.getElementById('edit-designUrl')?.value || '',
        figmaUrl: document.getElementById('edit-designUrl')?.value || '',
    };

    if (!newEmail) {
        updatedData.isClientAccount = false;
        updatedData.clientUid = null;
    }

    const itemIndex = cachedProjects.findIndex(p => p.id == id);
    if (itemIndex !== -1) {
        cachedProjects[itemIndex] = { ...cachedProjects[itemIndex], ...updatedData };
    }

    if (db) {
        try {
            const docRef = doc(db, "projects", id);
            await updateDoc(docRef, updatedData);
        } catch(err) {
            console.error("Fout bij opslaan in Firestore:", err);
            alert("Fout bij opslaan: " + err.message);
            return;
        }
    }

    // Synchronize domain change with Realtime Systeem, DNS & Uptime Monitoring
    let monitoringNotice = '';
    const cleanOld = normalizeDomain(originalDomain);
    const cleanNew = normalizeDomain(newDomain);

    if (cleanOld !== cleanNew) {
        try {
            const syncResult = await syncDomainChangeToMonitoring(db, originalDomain, newDomain, {
                client: updatedData.client,
                companyName: updatedData.companyName,
                contactName: updatedData.contactName,
                projectId: id
            });

            if (syncResult && syncResult.changed) {
                // Update in-memory monitoringReports list
                if (cleanOld) {
                    monitoringReports = monitoringReports.filter(r => r.domain !== cleanOld);
                }
                if (syncResult.report) {
                    monitoringReports.unshift(syncResult.report);
                }
                renderMonitorsTable();
                updateMonitoringKpis();

                monitoringNotice = `\n\n🌐 Realtime Uptime & DNS Monitoring bijgewerkt:\n` +
                    (cleanOld ? `• Oud domein (${cleanOld}) uitgefaseerd & opgeschoond\n` : '') +
                    (cleanNew ? `• Nieuw domein (${cleanNew}) geverifieerd (${syncResult.report?.statusText || 'OK'})` : '');
            }
        } catch (syncErr) {
            console.warn("Fout bij synchroniseren naar Uptime Monitoring:", syncErr);
        }
    }

    alert("Klantkaart gegevens succesvol bijgewerkt!" + monitoringNotice);
    closeModal('project-modal');
    loadDashboardData();
};

window.updateProjectStatusDirect = async (id, newStatus) => {
    const info = formatProjectStatus(newStatus);
    const targetStatus = info.label;
    const statusClass = info.badgeClass;

    const itemIndex = cachedProjects.findIndex(p => p.id == id);
    if (itemIndex !== -1) {
        cachedProjects[itemIndex].status = targetStatus;
        cachedProjects[itemIndex].statusClass = statusClass;
    }

    if (db) {
        try {
            const docRef = doc(db, "projects", id);
            await updateDoc(docRef, { status: targetStatus, statusClass: statusClass });
        } catch(err) {
            console.error("Fout bij updaten status in Firestore:", err);
        }
    }

    alert(`Status gewijzigd naar: "${targetStatus}"!\nHet project staat nu ook op het juiste tabblad.`);
    closeModal('project-modal');
    loadDashboardData();
};

window.updateProjectPhaseFromModal = async (id, phaseKey) => {
    let targetStatus = "Fase 1: Intake Voltooid";
    let targetStatusClass = "waiting";

    if (phaseKey === 1 || phaseKey === '1') {
        targetStatus = "Fase 1: Intake Voltooid";
        targetStatusClass = "waiting";
    } else if (phaseKey === 2 || phaseKey === '2') {
        targetStatus = "Fase 2: Wacht op Akkoord (Offerte)";
        targetStatusClass = "waiting";
    } else if (phaseKey === 3 || phaseKey === '3') {
        targetStatus = "Fase 3: Design & Ontwerp";
        targetStatusClass = "active";
    } else if (phaseKey === 4 || phaseKey === '4') {
        targetStatus = "Fase 4: In Ontwikkeling";
        targetStatusClass = "active";
    } else if (phaseKey === '5-payment') {
        targetStatus = "Fase 5: Wacht op Betaling (Mollie)";
        targetStatusClass = "payment";
    } else if (phaseKey === '5-complete' || phaseKey === 5 || phaseKey === '5') {
        targetStatus = "Fase 5: Volledig Live & Voldaan";
        targetStatusClass = "success";
    }

    const itemIndex = cachedProjects.findIndex(p => p.id == id);
    if (itemIndex > -1) {
        cachedProjects[itemIndex].status = targetStatus;
        cachedProjects[itemIndex].statusClass = targetStatusClass;
    }

    if (db) {
        try {
            const docRef = doc(db, "projects", String(id));
            await updateDoc(docRef, { status: targetStatus, statusClass: targetStatusClass });
        } catch (err) {
            console.error("Fout bij updaten status in Firestore:", err);
        }
    }

    alert(`Projectfase gewijzigd naar: "${targetStatus}"!`);
    loadDashboardData();
    window.openProjectDetails(id);
};


window.generateProposal = async (id) => {
    if (!db) {
        alert("Firestore is niet verbonden.");
        return;
    }
    
    const priceInput = prompt("Wat is de prijs voor dit project? (bijv. 450,00)");
    if (!priceInput) return;

    try {
        const docRef = doc(db, "projects", id);
        await updateDoc(docRef, {
            proposalPrice: priceInput,
            status: "Wacht op Akkoord",
            statusClass: "waiting",
            proposalGeneratedAt: new Date().toISOString()
        });

        const baseUrl = window.location.origin;
        const link = `${baseUrl}/offerte/index.html?id=${id}`;
        
        const container = document.getElementById('proposal-link-container');
        document.getElementById('proposal-link').value = link;
        document.getElementById('proposal-visit-btn').href = link;
        container.classList.remove('hidden');

        loadDashboardData();
    } catch (e) {
        console.error("Fout bij updaten offerte:", e);
        alert("Fout bij genereren offerte.");
    }
};

window.sendDesignToClient = async (id) => {
    if (!db) {
        alert("Firestore is niet verbonden.");
        return;
    }

    const p = cachedProjects.find(item => item.id == id);
    let designUrl = document.getElementById('edit-designUrl')?.value || '';
    if (!designUrl) {
        designUrl = p?.designUrl || p?.figmaUrl || '';
    }

    if (!designUrl || !designUrl.trim()) {
        const clientDomain = p?.domainName || p?.domain || '';
        const suggestedUrl = clientDomain ? `https://${clientDomain}` : 'https://creationaltfix.nl';
        const inputUrl = prompt(
            "Voer de URL in van het ontwerp, live HTML staging prototype, Figma of Google Imagen/Banana concept:",
            suggestedUrl
        );
        if (!inputUrl) return;
        designUrl = inputUrl.trim();
        const el = document.getElementById('edit-designUrl');
        if (el) el.value = designUrl;
    }

    if (!confirm(`Wil je het ontwerp versturen naar de klant?\n\nDesign / Prototype URL: ${designUrl}\n\nDe status wordt gewijzigd naar "Design Gereed voor Review" en de klant kan het ontwerp beoordelen in zijn portaal.`)) return;

    try {
        const docRef = doc(db, "projects", id);
        await updateDoc(docRef, {
            designUrl: designUrl.trim(),
            figmaUrl: designUrl.trim(),
            status: "Design Gereed voor Review",
            statusClass: "active",
            designSentAt: new Date().toISOString()
        });

        // Update in-memory cache
        const pIdx = cachedProjects.findIndex(p => p.id == id);
        if (pIdx !== -1) {
            cachedProjects[pIdx].designUrl = designUrl.trim();
            cachedProjects[pIdx].figmaUrl = designUrl.trim();
            cachedProjects[pIdx].status = "Design Gereed voor Review";
            cachedProjects[pIdx].statusClass = "active";
        }

        alert(`Design is verstuurd!\n\nDe klant kan het ontwerp nu bekijken in het klantenportaal en digitaal goedkeuring geven.\n\nDesign URL: ${designUrl}`);
        closeModal('project-modal');
        loadDashboardData();
    } catch (error) {
        console.error("Fout bij versturen design:", error);
        alert("Fout bij het versturen van het design naar de klant.");
    }
};

window.generateAiEmail = (id) => {
    const p = cachedProjects.find(item => item.id == id) || {};
    const contact = p.contactName || p.client || "klant";
    const service = p.service || "je project";
    const goals = p.goals || p.projectGoals || "jouw gewenste doelen";

    const emailContainer = document.getElementById('ai-email-container');
    const emailBody = document.getElementById('ai-email-body');
    
    emailBody.value = `Beste ${contact},\n\nBedankt voor je intake bij Creation+Alt+Fix voor ${service}!\n\nWe hebben je wensen in goede orde ontvangen. Je gaf aan dat het voornaamste doel is:\n"${goals}"\n\nDit kunnen we uitstekend voor je realiseren. Zullen we deze week even kort telefonisch of via Video Call de details afstemmen?\n\nMet vriendelijke groet,\n\nAllard Veldman\nCreation+Alt+Fix\nwww.creationaltfix.nl`;
    
    emailContainer.classList.remove('hidden');
};

window.sendMailToClient = (email) => {
    const body = encodeURIComponent(document.getElementById('ai-email-body').value);
    const subject = encodeURIComponent("Creation+Alt+Fix - Vervolg op je intake");
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
};

window.copyAiEmail = () => {
    const body = document.getElementById('ai-email-body');
    body.select();
    navigator.clipboard.writeText(body.value);
    alert("Concept e-mail gekopieerd naar klembord!");
};


window.generateInvoiceMollieLink = async (id, name) => {
    if (!db) {
        alert("Firestore is niet verbonden.");
        return;
    }

    try {
        const p = cachedProjects.find(item => item.id == id);
        const currentLink = p?.mollieLink || "";
        const enteredLink = prompt(`Voer de officiële Mollie / Plink betaallink in voor ${name}:`, currentLink || "https://useplink.com/payment/");
        if (!enteredLink || !enteredLink.trim()) return;

        const docRef = doc(db, "projects", id);
        await updateDoc(docRef, {
            status: "Fase 5: Wacht op Betaling (Mollie)",
            statusClass: "payment",
            mollieLink: enteredLink.trim()
        });

        alert(`Factuurverzoek opgeslagen in Firestore!\n\nBetaallink voor ${name}:\n${enteredLink.trim()}\n\nDe status in het dashboard is geüpdatet.`);
        
        // Herlaad tabel
        loadDashboardData();
        closeModal('project-modal');
    } catch (error) {
        console.error("Fout bij factuur:", error);
        alert("Fout bij het genereren van de factuur/Mollie link.");
    }
};

window.triggerCheckIn = async (id, name) => {
    if (!db) return;
    try {
        const docRef = doc(db, "projects", id);
        
        await updateDoc(docRef, {
            status: "Aftercare (Check-in gepland)",
            statusClass: "concept",
            checkinScheduledAt: new Date().toISOString()
        });

        alert(`Check-in ingepland!\n\nOver exact 14 dagen zal het systeem (via de server backend of een automatische herinnering) contact opnemen met ${name} om te vragen of alles bevalt en om een Google Review te vragen.`);
        
        loadDashboardData();
        closeModal('project-modal');
    } catch (error) {
        console.error("Fout bij inplannen check-in:", error);
    }
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

window.triggerAdminPasswordReset = async (email) => {
    if (!email || email === 'undefined') {
        alert("Geen geldig e-mailadres bekend voor deze klant.");
        return;
    }
    if (!confirm(`Wil je een e-mail sturen naar ${email} om zijn/haar wachtwoord in te stellen?`)) return;

    try {
        await sendPasswordResetEmail(auth, email);
        alert(`Succes! Er is een e-mail gestuurd naar ${email}.\nDe klant kan via de link in die e-mail een nieuw wachtwoord instellen.`);
    } catch (error) {
        console.error("Fout bij versturen wachtwoord reset:", error);
        alert(`Fout bij versturen reset-mail: ${error.message}`);
    }
};

window.createClientAuthAccount = async (projectId, email, contactName) => {
    if (!email || email === 'undefined' || !email.trim()) {
        alert("Vul eerst een geldig e-mailadres in op de Klantkaart en sla de wijzigingen op.");
        return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const tempPassword = 'CAF-' + Math.random().toString(36).substring(2, 8);

    if (!confirm(`Wilt u het Firebase Auth account aanmaken en activeren voor ${cleanEmail}?`)) return;

    try {
        let clientUid = null;
        try {
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, tempPassword);
            clientUid = userCred.user.uid;
            console.log("Client Auth user account created:", clientUid);
        } catch (authErr) {
            console.warn("Auth info (account match/exists):", authErr.message);
        }

        // Update document in Firestore so UI updates immediately
        if (db && projectId) {
            const docRef = doc(db, "projects", projectId);
            await updateDoc(docRef, {
                email: cleanEmail,
                isClientAccount: true,
                clientUid: clientUid || null
            });

            // Update in-memory cache as well
            const pIdx = cachedProjects.findIndex(p => p.id == projectId);
            if (pIdx !== -1) {
                cachedProjects[pIdx].isClientAccount = true;
                if (clientUid) cachedProjects[pIdx].clientUid = clientUid;
            }
        }

        // Stuur de officiële Firebase Auth wachtwoord-instel e-mail rechtstreeks naar de klant
        await sendPasswordResetEmail(auth, cleanEmail);

        alert(`Succes! Het account voor ${cleanEmail} is geactiveerd in Firebase Auth.\n\nEr is een e-mail gestuurd naar ${cleanEmail} om het wachtwoord in te stellen.`);
        loadDashboardData();
        closeModal('project-modal');
    } catch (error) {
        console.error("Fout bij activeren klantaccount:", error);
        alert(`Fout bij activeren account: ${error.message}`);
    }
};

window.deleteProject = async (id) => {
    const p = cachedProjects.find(item => item.id == id);
    const clientName = p ? (p.client || p.companyName || 'dit project') : 'dit project';
    if (!confirm(`Weet je zeker dat je "${clientName}" wilt verwijderen uit het dashboard?`)) return;

    if (db) {
        try {
            // 1. Delete document from Firestore
            await deleteDoc(doc(db, "projects", String(id)));

            // 2. Remove from local cached projects and re-render tables
            cachedProjects = cachedProjects.filter(item => item.id != id);
            filterAndRenderTables();
            renderKanbanBoard();

            // 3. Remove associated domain from Uptime & DNS Monitoring if present (isolated in try/catch)
            try {
                const domainToDelete = p ? (p.domainName || p.domain || '') : '';
                const monitored = typeof getMonitoredDomains === 'function' ? getMonitoredDomains() : [];
                const matchedMonitors = monitored.filter(m => {
                    if (domainToDelete && normalizeDomain(domainToDelete) === m.domain) return true;
                    const mClient = (m.client || m.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const pClient = (p ? (p.client || p.companyName || '') : '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (mClient && pClient && (mClient.includes(pClient) || pClient.includes(mClient))) return true;
                    return false;
                });

                for (const matched of matchedMonitors) {
                    if (typeof removeDomainFromMonitoring === 'function') {
                        await removeDomainFromMonitoring(db, matched.domain);
                    }
                    if (typeof monitoringReports !== 'undefined' && Array.isArray(monitoringReports)) {
                        monitoringReports = monitoringReports.filter(r => r.domain !== matched.domain);
                    }
                }
                if (matchedMonitors.length > 0 && typeof monitoringReports !== 'undefined' && Array.isArray(monitoringReports)) {
                    try {
                        localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(monitoringReports));
                    } catch (e) {}
                    if (typeof renderMonitorsTable === 'function') {
                        renderMonitorsTable();
                    }
                }
            } catch (monErr) {
                console.warn("Niet-kritieke waarschuwing bij opschonen monitoring na projectverwijdering:", monErr);
            }

            alert(`Project "${clientName}" is succesvol verwijderd.`);
        } catch (err) {
            console.error("Fout bij verwijderen project:", err);
            alert("Fout bij verwijderen: " + err.message);
        }
    }
};

window.downloadProjectProposalPdf = async (id) => {
    const p = cachedProjects.find(item => item.id == id);
    if (!p) return alert("Project niet gevonden.");

    const isSigned = Boolean(p.proposalAcceptedAt || p.status?.includes('Design') || p.status?.includes('Ontwikkeling') || p.status?.includes('Opgeleverd'));
    try {
        const { doc: pdfDoc, blob: pdfBlob, filename } = await generateProposalPDF(p, isSigned);
        if (storage && db && !p.proposalPdfUrl) {
            const uploadRes = await uploadPdfToStorage(storage, pdfBlob, id, filename);
            if (uploadRes) {
                await updateDoc(doc(db, "projects", String(id)), {
                    proposalPdfUrl: uploadRes.downloadUrl,
                    proposalPdfName: filename
                });
                p.proposalPdfUrl = uploadRes.downloadUrl;
            }
        }
        pdfDoc.save(filename);
    } catch (err) {
        console.error("Fout bij genereren offerte PDF:", err);
        alert("Kon offerte PDF niet genereren: " + err.message);
    }
};

window.downloadProjectInvoicePdf = async (id) => {
    const p = cachedProjects.find(item => item.id == id);
    if (!p) return alert("Project niet gevonden.");

    try {
        const { doc: pdfDoc, blob: pdfBlob, filename, invoiceNumber } = await generateInvoicePDF(p);
        if (storage && db) {
            const uploadRes = await uploadPdfToStorage(storage, pdfBlob, id, filename);
            if (uploadRes) {
                await updateDoc(doc(db, "projects", String(id)), {
                    invoicePdfUrl: uploadRes.downloadUrl,
                    invoicePdfName: filename,
                    invoiceNumber: invoiceNumber
                });
            }
        }
        pdfDoc.save(filename);
    } catch (err) {
        console.error("Fout bij genereren factuur PDF:", err);
        alert("Kon factuur PDF niet genereren: " + err.message);
    }
};

/// ============================================================
// [TASK-602] Global Kanban Board & Task Management System
// Delegated to ./modules/admin-kanban.js
// ============================================================

function setupKanbanListeners() {
    return setupKanbanListenersModule(() => cachedProjects, db, () => filterAndRenderTables());
}

function renderKanbanBoard() {
    return renderKanbanBoardModule(cachedProjects, db, () => filterAndRenderTables());
}

function moveKanbanTask(projectId, taskId, targetStatus) {
    return moveKanbanTaskModule(cachedProjects, db, projectId, taskId, targetStatus, () => filterAndRenderTables());
}

function openGlobalTaskModal(projectId) {
    return openGlobalTaskModalModule(cachedProjects);
}

async function saveGlobalTask(e) {
    return saveGlobalTaskModule(e, cachedProjects, db, () => filterAndRenderTables());
}

// ============================================================
// [TASK-814] TODO.md DevOps Backlog Sync & Export Controller
// Delegated to ./modules/admin-todo-modal.js
// ============================================================

async function openTodoSyncModal() {
    return openTodoSyncModalModule(() => cachedProjects);
}

function switchSyncModalTab(tab) {
    return switchSyncModalTabModule(tab, () => cachedProjects);
}

async function handleExecuteTodoSync() {
    return handleExecuteTodoSyncModule(() => cachedProjects, db, async (summary) => {
        renderKanbanBoard();
        filterAndRenderTables();
        try {
            const stats = await API.getDashboardStats();
            updateDashboardStatsUI(stats);
        } catch (statsErr) {
            console.warn("Kon dashboard stats niet direct herberekenen:", statsErr);
        }
    });
}

function setupTodoSyncListeners() {
    return setupTodoSyncListenersModule(() => cachedProjects, db, async (summary) => {
        renderKanbanBoard();
        filterAndRenderTables();
        try {
            const stats = await API.getDashboardStats();
            updateDashboardStatsUI(stats);
        } catch (statsErr) {}
    });
}

// Bind to window for direct HTML event access
window.openTodoSyncModal = openTodoSyncModal;
window.closeTodoSyncModal = () => document.getElementById('todo-sync-modal')?.classList.add('hidden');
window.switchSyncModalTab = switchSyncModalTab;
window.handleExecuteTodoSync = handleExecuteTodoSync;
window.handleCopyExportMarkdown = handleCopyExportMarkdown;
window.handleDownloadExportMarkdown = handleDownloadExportMarkdown;

function initSettingsTab() {
    const keyInput = document.getElementById('settings-gemini-key-input');
    const modelSelect = document.getElementById('settings-gemini-model');
    const badge = document.getElementById('settings-gemini-badge');
    const statusDiv = document.getElementById('settings-gemini-status');
    const toggleVisBtn = document.getElementById('btn-toggle-gemini-key-vis');

    function refreshSettingsUI() {
        const apiKey = getGeminiApiKey();
        const model = getGeminiModel();
        const hasKey = hasGeminiApiKey();

        if (keyInput) keyInput.value = apiKey;
        if (modelSelect) modelSelect.value = model;

        if (badge) {
            if (hasKey) {
                badge.style.background = '#064e3b';
                badge.style.color = '#34d399';
                badge.style.borderColor = '#059669';
                badge.innerHTML = '🟢 Gemini API Actief';
            } else {
                badge.style.background = '#1e293b';
                badge.style.color = '#94a3b8';
                badge.style.borderColor = '#334155';
                badge.innerHTML = 'Offline Generator';
            }
        }

        if (statusDiv) {
            statusDiv.innerHTML = hasKey
                ? `<strong style="color: #34d399;"><i class="fas fa-check-circle"></i> Live AI actief (Model: ${model}).</strong>`
                : '<span style="color: #94a3b8;"><i class="fas fa-info-circle"></i> Geen API sleutel ingevoerd. Systeem gebruikt de ingebouwde Creation+Alt+Fix offline generator.</span>';
        }
    }

    refreshSettingsUI();

    // Toggle Visibility
    toggleVisBtn?.addEventListener('click', () => {
        if (!keyInput) return;
        if (keyInput.type === 'password') {
            keyInput.type = 'text';
            toggleVisBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            keyInput.type = 'password';
            toggleVisBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });

    // Save Gemini Settings from Tab
    document.getElementById('btn-settings-save-gemini')?.addEventListener('click', () => {
        const val = keyInput?.value.trim() || '';
        const selectedModel = modelSelect?.value || 'gemini-3.5-flash';
        setGeminiApiKey(val);
        setGeminiModel(selectedModel);
        refreshSettingsUI();
        alert(val ? `Gemini instellingen succesvol opgeslagen (Model: ${selectedModel})!` : "Gemini API sleutel gewist. Offline generator actief.");
    });

    // Clear Gemini Key from Tab
    document.getElementById('btn-settings-clear-gemini')?.addEventListener('click', () => {
        setGeminiApiKey('');
        if (keyInput) keyInput.value = '';
        refreshSettingsUI();
        alert("Gemini API sleutel gewist. Systeem schakelt terug naar offline generator.");
    });

    // Open TODO.md Sync Hub from Settings
    document.getElementById('btn-settings-open-todo-sync')?.addEventListener('click', () => {
        if (typeof openTodoSyncModal === 'function') {
            openTodoSyncModal();
        } else {
            document.getElementById('todo-sync-modal')?.classList.remove('hidden');
        }
    });
}

// ===========================================
// UPTIME & WEBSITE MONITORING CONTROLLER [TASK-827]
// ===========================================
let monitoringReports = [];
let monitoringCurrentFilter = 'all';
let monitoringSearchQuery = '';
let monitoringAutoRefreshTimer = null;
let monitoringAutoRefreshEnabled = true;
let monitoringAudioAlertsEnabled = true;
let isScanningMonitors = false;
let hasDoneInitialMonitoringScan = false;

function initMonitoringTab() {
    setupMonitoringEventListeners();
    
    // Purge legacy storage keys
    try {
        localStorage.removeItem('caf_uptime_custom_domains');
        localStorage.removeItem('caf_uptime_replaced_domains');
    } catch (e) {}

    const activeProjects = (cachedProjects && cachedProjects.length > 0) ? cachedProjects : (window.cachedProjects || []);
    const activeMonitors = getMonitoredDomains(activeProjects);
    const activeIds = new Set(activeMonitors.map(m => m.id));
    const activeDomains = new Set(activeMonitors.map(m => m.domain));

    // Load from cache first for instant render, filtered to active projects only
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

    // Trigger initial scan if not performed yet and projects are loaded
    if (!hasDoneInitialMonitoringScan && !isScanningMonitors && activeMonitors.length > 0) {
        hasDoneInitialMonitoringScan = true;
        executeScanAllMonitors();
    }

    // Ensure auto-refresh timer is running
    restartMonitoringAutoRefresh();
}

function setupMonitoringEventListeners() {
    if (window._monitoringListenersBound) return;
    window._monitoringListenersBound = true;

    // Scan All Button
    document.getElementById('btn-scan-all-monitors')?.addEventListener('click', () => {
        executeScanAllMonitors();
    });

    // Auto Refresh Toggle
    document.getElementById('btn-toggle-auto-refresh')?.addEventListener('click', () => {
        monitoringAutoRefreshEnabled = !monitoringAutoRefreshEnabled;
        const label = document.getElementById('auto-refresh-label');
        if (label) {
            label.innerText = monitoringAutoRefreshEnabled ? 'Auto-Refresh: Aan (60s)' : 'Auto-Refresh: Uit';
        }
        restartMonitoringAutoRefresh();
    });

    // Audio Alert Toggle
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

    // Open Add Domain Modal: Inform that domains are managed via Klantkaart
    document.getElementById('btn-open-add-domain-modal')?.addEventListener('click', () => {
        alert("💡 Domeinen worden nu 100% dynamisch gekoppeld aan de Klantkaarten!\n\nOpen een project in het overzicht, vul de domeinnaam in op de Klantkaart en sla op. Het domein verschijnt direct in de Realtime Uptime Monitoring.");
    });

    // Add Domain Form Submit fallback
    document.getElementById('form-add-monitor-domain')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert("Domeinen worden automatisch ingeladen via de Klantkaart van projecten in het CRM.");
        document.getElementById('add-monitor-modal')?.classList.add('hidden');
    });

    // Sync / Cleanup Monitored Domains with Active Projects
    document.getElementById('btn-sync-monitors-with-projects')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-sync-monitors-with-projects');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met synchroniseren...';

        try {
            // Fresh reload from Firestore
            cachedProjects = await API.getProjects();
            window.cachedProjects = cachedProjects;

            // Purge legacy storage keys
            try {
                localStorage.removeItem('caf_uptime_custom_domains');
                localStorage.removeItem('caf_uptime_replaced_domains');
            } catch (e) {}

            const activeMonitored = getMonitoredDomains(cachedProjects);
            const activeIds = new Set(activeMonitored.map(m => m.id));
            const activeDomains = new Set(activeMonitored.map(m => m.domain));

            monitoringReports = monitoringReports.filter(r => activeIds.has(r.id) || activeDomains.has(r.domain));
            try {
                localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(monitoringReports));
            } catch (e) {}

            renderMonitorsTable();
            await executeScanAllMonitors(false);
            alert(`✓ Realtime Monitoring is 100% gesynchroniseerd met de ${activeMonitored.length} actieve projecten op de Klantkaarten!`);
        } catch (e) {
            console.error("Fout bij synchroniseren monitoring:", e);
            alert("Fout bij synchroniseren: " + e.message);
        } finally {
            if (btn) btn.innerHTML = originalHtml;
        }
    });

    // Search filter
    document.getElementById('monitor-search-input')?.addEventListener('input', (e) => {
        monitoringSearchQuery = (e.target.value || '').trim().toLowerCase();
        renderMonitorsTable();
    });

    // Filter Buttons
    document.querySelectorAll('.btn-monitor-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-monitor-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            monitoringCurrentFilter = btn.getAttribute('data-filter') || 'all';
            renderMonitorsTable();
        });
    });
}

function restartMonitoringAutoRefresh() {
    if (monitoringAutoRefreshTimer) {
        clearInterval(monitoringAutoRefreshTimer);
        monitoringAutoRefreshTimer = null;
    }
    if (monitoringAutoRefreshEnabled) {
        monitoringAutoRefreshTimer = setInterval(() => {
            if (!isScanningMonitors) {
                executeScanAllMonitors(true);
            }
        }, 60000);
    }
}

async function executeScanAllMonitors(isSilent = false) {
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

    const activeProjects = (cachedProjects && cachedProjects.length > 0) ? cachedProjects : (window.cachedProjects || []);
    const domains = getMonitoredDomains(activeProjects);

    try {
        const results = await runAllDomainChecks(domains, (completed, total, report) => {
            const pct = Math.round((completed / total) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.innerText = `${completed} / ${total}`;

            if (report.overallStatus === 'down' && !isDomainIgnored(report.domain)) {
                // dispatchDowntimeAlert enforces REQUIRED_CONSECUTIVE_FAILURES (3x down)
                // and only plays audio tone + sends alert email when confirmed down
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

function renderMonitorsTable() {
    const tbody = document.getElementById('monitors-tbody');
    if (!tbody) return;

    let filtered = monitoringReports.filter(r => {
        if (monitoringSearchQuery) {
            const q = monitoringSearchQuery;
            const matchName = (r.name || '').toLowerCase().includes(q);
            const matchDom = (r.domain || '').toLowerCase().includes(q);
            const matchClient = (r.client || '').toLowerCase().includes(q);
            const matchStatus = (r.statusText || '').toLowerCase().includes(q);
            if (!matchName && !matchDom && !matchClient && !matchStatus) return false;
        }

        if (monitoringCurrentFilter === 'issues') {
            return (r.overallStatus === 'down' || r.overallStatus === 'degraded') && !isDomainIgnored(r.domain);
        }
        if (monitoringCurrentFilter === 'ignored') {
            return isDomainIgnored(r.domain);
        }
        if (monitoringCurrentFilter === 'clients') {
            return r.category === 'client';
        }
        if (monitoringCurrentFilter === 'internal') {
            return r.category === 'internal';
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 35px 20px; color: var(--color-text-secondary);">
                    <i class="fas fa-search" style="font-size: 1.5rem; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
                    Geen domeinen gevonden voor de huidige selectie.
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = filtered.map(r => {
            const isIgnored = isDomainIgnored(r.domain) || !!r.isIgnored;
            const rowClass = isIgnored ? 'row-monitor-ignored' : '';
            const latencyClass = r.latencyMs < 200 ? 'latency-fast' : (r.latencyMs < 800 ? 'latency-medium' : 'latency-slow');
            const latencyPct = Math.min(100, Math.round((r.latencyMs / 1500) * 100));
            const isHttpSuccess = r.httpCode >= 200 && r.httpCode < 300;
            const isHttpRedirect = r.httpCode >= 300 && r.httpCode < 400;
            const httpBadge = isHttpSuccess 
                ? `<span class="tech-badge ssl-ok"><i class="fas fa-check"></i> ${r.httpCode} OK</span>`
                : (isHttpRedirect
                    ? `<span class="tech-badge ssl-ok" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #34d399;"><i class="fas fa-arrow-right"></i> ${r.httpCode}</span>`
                    : `<span class="tech-badge ssl-fail"><i class="fas fa-exclamation-triangle"></i> ${r.httpCode || 'ERR'}</span>`);
            
            const sslBadge = r.sslValid
                ? `<span class="tech-badge ssl-ok"><i class="fas fa-lock"></i> SSL Geldig</span>`
                : `<span class="tech-badge ssl-fail"><i class="fas fa-lock-open"></i> SSL Fout</span>`;

            const dnsBadge = r.dnsStatus === 'NOERROR'
                ? `<span class="tech-badge dns-ok"><i class="fas fa-check-circle"></i> NOERROR</span>`
                : `<span class="tech-badge dns-fail"><i class="fas fa-times-circle"></i> ${escapeHtml(r.dnsStatus)}</span>`;

            const resolvedIpDisplay = r.resolvedIps && r.resolvedIps.length > 0 
                ? r.resolvedIps[0] 
                : '<span style="color: #f87171;">Geen IP</span>';

            const lastCheckedFormatted = r.lastChecked 
                ? new Date(r.lastChecked).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '-';

            const isVerifying = r.overallStatus === 'down' && !r.isConfirmedDown;
            const statusDotClass = isVerifying ? 'degraded' : r.overallStatus;
            const statusPillClass = isVerifying ? 'degraded' : r.overallStatus;

            const statusColumnHtml = isIgnored
                ? `<div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="monitoring-pulse-dot ignored"></span>
                        <span class="monitoring-status-pill ignored"><i class="fas fa-eye-slash" style="font-size: 0.68rem;"></i> Genegeerd</span>
                    </div>
                    <span style="font-size: 0.68rem; color: #64748b; margin-left: 18px;">Meldingen uit</span>
                   </div>`
                : `<div style="display: flex; align-items: center; gap: 8px;">
                    <span class="monitoring-pulse-dot ${statusDotClass}"></span>
                    <span class="monitoring-status-pill ${statusPillClass}">${escapeHtml(r.statusText)}</span>
                   </div>`;

            const domainIgnoredTag = isIgnored
                ? `<span style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.35); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; margin-left: 6px;"><i class="fas fa-bell-slash"></i> Gedempt</span>`
                : '';

            return `
                <tr id="row-monitor-${escapeHtml(r.id)}" class="${rowClass}">
                    <td>${statusColumnHtml}</td>
                    <td>
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <a href="https://${escapeHtml(r.domain)}${r.path || '/'}" target="_blank" rel="noopener" style="color: #fff; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 5px;">
                                    <span>${escapeHtml(r.domain)}${r.path && r.path !== '/' ? escapeHtml(r.path) : ''}</span>
                                    <i class="fas fa-external-link-alt" style="font-size: 0.72rem; color: #94a3b8;"></i>
                                </a>
                                ${r.isPrimary === false 
                                    ? `<span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.35); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-network-wired" style="font-size: 0.65rem;"></i> Extra Domein</span>` 
                                    : `<span style="background: rgba(34, 211, 238, 0.15); color: #22d3ee; border: 1px solid rgba(34, 211, 238, 0.35); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-star" style="font-size: 0.65rem;"></i> Primair</span>`}
                                ${domainIgnoredTag}
                            </div>
                            <div style="font-size: 0.74rem; color: var(--color-text-secondary); margin-top: 2px;">
                                ${(!r.client || !r.name || r.client.trim().toLowerCase() === r.name.trim().toLowerCase())
                                    ? `<span style="color: var(--color-accent);">${escapeHtml(r.client || r.name || 'Website')}</span>`
                                    : `${escapeHtml(r.name)} • <span style="color: var(--color-accent);">${escapeHtml(r.client)}</span>`}
                            </div>
                        </div>
                    </td>
                    <td>${httpBadge}</td>
                    <td>${sslBadge}</td>
                    <td>
                        <div>
                            ${dnsBadge}
                            <div style="font-size: 0.72rem; color: #94a3b8; font-family: monospace; margin-top: 3px;">
                                ${resolvedIpDisplay}
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="latency-meter ${latencyClass}">
                            <span>${r.latencyMs} ms</span>
                            <div class="latency-bar-track">
                                <div class="latency-bar-fill" style="width: ${latencyPct}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 0.8rem; color: #94a3b8;">${lastCheckedFormatted}</span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <button class="btn btn-secondary btn-sm" onclick="openMonitorDetailModal('${escapeHtml(r.domain)}')" title="Diepgaande DNS- &amp; SSL inspectie" style="padding: 4px 8px;">
                                <i class="fas fa-search-plus" style="color: var(--color-accent);"></i>
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="recheckSingleDomain('${escapeHtml(r.domain)}')" title="Nu opnieuw testen" style="padding: 4px 8px;">
                                <i class="fas fa-sync-alt" id="recheck-spin-${escapeHtml(r.id)}"></i>
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="toggleIgnoreDomain('${escapeHtml(r.domain)}')" 
                                title="${isIgnored ? 'Dempen opheffen & monitoring heractiveren' : 'Negeer domein (vergrijzen en meldingen uitschakelen)'}" 
                                style="padding: 4px 8px; ${isIgnored ? 'color: #fbbf24; border-color: rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.15);' : ''}">
                                <i class="fas ${isIgnored ? 'fa-bell-slash' : 'fa-eye-slash'}"></i>
                            </button>
                            <a href="https://${escapeHtml(r.domain)}${r.path || '/'}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" title="Website bezoeken" style="padding: 4px 8px;">
                                <i class="fas fa-globe"></i>
                            </a>
                            <button class="btn btn-secondary btn-sm" onclick="window.removeMonitoredDomain('${escapeHtml(r.domain)}')" title="Verwijder domein uit monitoring" style="padding: 4px 8px; color: #ef4444; border-color: rgba(239, 68, 68, 0.35);">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const total = monitoringReports.length;
    const nonIgnored = monitoringReports.filter(r => !isDomainIgnored(r.domain));
    const ignoredCount = monitoringReports.filter(r => isDomainIgnored(r.domain)).length;

    const operational = nonIgnored.filter(r => r.overallStatus === 'operational').length;
    const down = nonIgnored.filter(r => r.overallStatus === 'down').length;
    const degraded = nonIgnored.filter(r => r.overallStatus === 'degraded').length;

    const sumLatency = nonIgnored.reduce((acc, r) => acc + (r.latencyMs || 0), 0);
    const avgLatency = nonIgnored.length > 0 ? Math.round(sumLatency / nonIgnored.length) : 0;

    const noerrorDns = nonIgnored.filter(r => r.dnsStatus === 'NOERROR').length;
    const dnsHealth = nonIgnored.length > 0 ? Math.round((noerrorDns / nonIgnored.length) * 100) : 100;

    const onlineCount = nonIgnored.length - down; // All domains responding 200 OK (both optimal and degraded)

    const kpiOperational = document.getElementById('kpi-mon-operational');
    if (kpiOperational) kpiOperational.innerHTML = `${onlineCount} <span style="font-size: 0.95rem; font-weight: 500; color: #94a3b8;">/ ${nonIgnored.length} Online</span>`;

    const kpiDown = document.getElementById('kpi-mon-down');
    if (kpiDown) kpiDown.innerHTML = `${down} <span style="font-size: 0.95rem; font-weight: 500; color: #94a3b8;">incidenten</span>`;

    const kpiDownSub = document.getElementById('kpi-mon-down-sub');
    if (kpiDownSub) {
        if (down > 0) {
            kpiDownSub.innerText = `${down} domein(en) vereisen directe actie!`;
            kpiDownSub.style.color = '#f87171';
        } else {
            kpiDownSub.innerText = degraded > 0 
                ? `${operational} optimaal, ${degraded} vertraagd` 
                : (ignoredCount > 0 ? `Geen actieve uitval (${ignoredCount} genegeerd)` : "Geen actieve DNS/HTTP uitval");
            kpiDownSub.style.color = 'var(--color-text-secondary)';
        }
    }

    const kpiLatency = document.getElementById('kpi-mon-latency');
    if (kpiLatency) kpiLatency.innerHTML = `~${avgLatency} <span style="font-size: 0.95rem; font-weight: 500; color: #94a3b8;">ms</span>`;

    const kpiDns = document.getElementById('kpi-mon-dns');
    if (kpiDns) kpiDns.innerHTML = `${dnsHealth}%`;

    const countBadge = document.getElementById('monitors-count-badge');
    if (countBadge) countBadge.innerText = `${total} Domeinen`;

    const statMonitoring = document.getElementById('stat-monitoring');
    const statMonitoringSub = document.getElementById('stat-monitoring-sub');
    if (statMonitoring) {
        if (down > 0) {
            statMonitoring.innerHTML = `<span class="monitoring-pulse-dot down"></span> <span id="stat-monitoring-text">${onlineCount}/${total} Live</span>`;
            statMonitoring.style.color = '#f87171';
        } else if (degraded > 0) {
            statMonitoring.innerHTML = `<span class="monitoring-pulse-dot operational"></span> <span id="stat-monitoring-text">${onlineCount}/${total} Online</span>`;
            statMonitoring.style.color = '#10b981';
        } else {
            statMonitoring.innerHTML = `<span class="monitoring-pulse-dot operational"></span> <span id="stat-monitoring-text">${total}/${total} Live</span>`;
            statMonitoring.style.color = '#10b981';
        }
    }
    if (statMonitoringSub) {
        if (down > 0) {
            statMonitoringSub.innerText = `🚨 ${down} domein(en) down!`;
            statMonitoringSub.style.color = '#f87171';
        } else if (degraded > 0) {
            statMonitoringSub.innerText = `DNS & SSL OK (${degraded} vertraagd, ~${avgLatency}ms)`;
            statMonitoringSub.style.color = 'var(--color-text-secondary)';
        } else {
            statMonitoringSub.innerText = `DNS, SSL & HTTP OK (~${avgLatency}ms)`;
            statMonitoringSub.style.color = 'var(--color-text-secondary)';
        }
    }

    const sidebarAlertBadge = document.getElementById('admin-uptime-alert-count');
    if (sidebarAlertBadge) {
        if (down > 0) {
            sidebarAlertBadge.innerText = down;
            sidebarAlertBadge.classList.remove('hidden');
        } else {
            sidebarAlertBadge.classList.add('hidden');
        }
    }

    renderIncidentList();
}

function renderIncidentList() {
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

window.openMonitorDetailModal = async (domainName) => {
    const report = monitoringReports.find(r => r.domain === domainName);
    if (!report) return;

    const modal = document.getElementById('monitor-detail-modal');
    const title = document.getElementById('modal-monitor-domain-title');
    const body = document.getElementById('modal-monitor-body');

    if (title) title.innerText = `${report.name} (${report.domain})`;
    if (body) {
        const isModalVerifying = report.overallStatus === 'down' && !report.isConfirmedDown;
        const modalDotClass = isModalVerifying ? 'degraded' : report.overallStatus;
        const modalPillClass = isModalVerifying ? 'degraded' : report.overallStatus;

        body.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="monitoring-pulse-dot ${modalDotClass}"></span>
                    <span class="monitoring-status-pill ${modalPillClass}" style="font-size: 0.85rem;">${escapeHtml(report.statusText)}</span>
                </div>
                <div style="font-size: 0.85rem; color: #94a3b8;">
                    Laatste controle: <strong>${new Date(report.lastChecked).toLocaleString('nl-NL')}</strong>
                </div>
            </div>

            <!-- DNS Inspection -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 16px;">
                <h4 style="margin: 0 0 10px 0; color: #38bdf8; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-network-wired"></i> DNS-over-HTTPS (DoH) Analyse
                </h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.83rem;">
                    <div><strong>DoH Provider:</strong> <span style="color: #c7d2fe;">${escapeHtml(report.dnsProvider)}</span></div>
                    <div><strong>DNS Status Code:</strong> <span class="tech-badge ${report.dnsStatus === 'NOERROR' ? 'dns-ok' : 'dns-fail'}">${escapeHtml(report.dnsStatus)}</span></div>
                    <div><strong>DNS Latency:</strong> <span>${report.dnsLatencyMs} ms</span></div>
                    <div><strong>Metingen &amp; Alert Status:</strong> <span style="color: ${report.overallStatus === 'down' ? (report.isConfirmedDown ? '#ef4444' : '#f59e0b') : '#10b981'}; font-weight: 600;">${report.overallStatus === 'down' ? (report.isConfirmedDown ? `🚨 Bevestigd Down (${report.consecutiveFailures}x)` : `⚠️ In verificatie (${report.consecutiveFailures || 1}/${REQUIRED_CONSECUTIVE_FAILURES})`) : '✓ Stabiel (0 fouten)'}</span></div>
                    <div><strong>Verwacht Server IP:</strong> <span style="font-family: monospace;">${escapeHtml(report.expectedIp || 'Niet ingesteld')}</span></div>
                    <div style="grid-column: span 2;">
                        <strong>Geresolveerde IPv4 A-Records:</strong>
                        <div style="font-family: monospace; color: #34d399; margin-top: 4px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 4px;">
                            ${report.resolvedIps && report.resolvedIps.length > 0 ? report.resolvedIps.join(', ') : 'Geen A-records aangetroffen'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- HTTPS & SSL Inspection -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #34d399; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-lock"></i> HTTPS &amp; SSL Certificaat Status
                </h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.83rem;">
                    <div><strong>HTTP Responscode:</strong> <span class="tech-badge ${(report.httpCode >= 200 && report.httpCode < 400) ? 'ssl-ok' : 'ssl-fail'}">HTTP ${report.httpCode}</span></div>
                    <div><strong>SSL Handshake:</strong> <span class="tech-badge ${report.sslValid ? 'ssl-ok' : 'ssl-fail'}">${report.sslValid ? '✓ Succesvol (TLS OK)' : '✗ Fout / Verlopen'}</span></div>
                    <div><strong>Totale Responsetijd:</strong> <span>${report.latencyMs} ms</span></div>
                    <div><strong>Subpad:</strong> <code>${escapeHtml(report.path || '/')}</code></div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
                <button type="button" class="btn btn-secondary" onclick="closeModal('monitor-detail-modal')">Sluiten</button>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-secondary" onclick="toggleIgnoreDomain('${escapeHtml(report.domain)}').then(() => openMonitorDetailModal('${escapeHtml(report.domain)}'))" style="${isDomainIgnored(report.domain) ? 'color: #fbbf24; border-color: rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.15);' : ''}">
                        <i class="fas ${isDomainIgnored(report.domain) ? 'fa-bell-slash' : 'fa-eye-slash'}"></i> ${isDomainIgnored(report.domain) ? 'Dempen Opheffen' : 'Negeer Domein'}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.removeMonitoredDomain('${escapeHtml(report.domain)}', true)" title="Verwijder dit domein definitief uit de monitoring" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">
                        <i class="fas fa-trash"></i> Verwijderen
                    </button>
                    <a href="https://${escapeHtml(report.domain)}${report.path || '/'}" target="_blank" rel="noopener" class="btn btn-secondary">
                        <i class="fas fa-globe"></i> Open Website
                    </a>
                    <button type="button" class="btn btn-primary" onclick="recheckSingleDomain('${escapeHtml(report.domain)}', true)">
                        <i class="fas fa-sync-alt"></i> Nu Opnieuw Testen
                    </button>
                </div>
            </div>
        `;
    }

    modal?.classList.remove('hidden');
};

window.removeMonitoredDomain = async (domainName, closeDetailModal = false) => {
    const clean = normalizeDomain(domainName);
    if (!clean) return;

    if (!confirm(`Weet je zeker dat je domein "${clean}" definitief wilt verwijderen uit de Realtime Uptime & DNS Monitoring?`)) {
        return;
    }

    try {
        await removeDomainFromMonitoring(db, clean);
        monitoringReports = monitoringReports.filter(r => r.domain !== clean);

        try {
            localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(monitoringReports));
        } catch (e) {}

        renderMonitorsTable();

        if (closeDetailModal) {
            closeModal('monitor-detail-modal');
        }

        alert(`✓ Domein "${clean}" is succesvol verwijderd uit Uptime Monitoring.`);
    } catch (err) {
        console.error("Fout bij verwijderen domein:", err);
        alert("Fout bij verwijderen domein: " + err.message);
    }
};

window.recheckSingleDomain = async (domainName, updateDetailModal = false) => {
    const activeProjects = (cachedProjects && cachedProjects.length > 0) ? cachedProjects : (window.cachedProjects || []);
    const domainObj = getMonitoredDomains(activeProjects).find(d => d.domain === domainName || d.id === domainName);
    if (!domainObj) return;

    const spinner = document.getElementById(`recheck-spin-${domainObj.id}`);
    if (spinner) spinner.classList.add('fa-spin');

    try {
        const freshReport = await runDomainHealthCheck(domainObj);
        const idx = monitoringReports.findIndex(r => r.domain === domainName);
        if (idx !== -1) {
            monitoringReports[idx] = freshReport;
        } else {
            monitoringReports.push(freshReport);
        }

        renderMonitorsTable();

        if (db) {
            saveDomainReportToFirestore(db, freshReport);
        }

        if (updateDetailModal) {
            window.openMonitorDetailModal(domainName);
        }
    } finally {
        if (spinner) spinner.classList.remove('fa-spin');
    }
};

window.toggleIgnoreDomain = async (domainName) => {
    const clean = normalizeDomain(domainName);
    if (!clean) return;
    const currentlyIgnored = isDomainIgnored(clean);
    const newIgnored = !currentlyIgnored;

    await setDomainIgnored(db, clean, newIgnored);

    const rep = monitoringReports.find(r => r.domain === clean);
    if (rep) {
        rep.isIgnored = newIgnored;
    }

    renderMonitorsTable();
};

function initAdminPage() {
    setupNavigation();
    setupSearchAndFilters();
    setupTodoSyncListeners();
    initSettingsTab();
    initMonitoringTab();
    document.getElementById('btn-open-kanban-task-modal')?.addEventListener('click', openGlobalTaskModal);
    document.getElementById('global-add-task-form')?.addEventListener('submit', saveGlobalTask);


    // Gemini Modal in Main Admin (for secondary modal access)
    const geminiModalMain = document.getElementById('gemini-settings-modal');
    const geminiKeyInputMain = document.getElementById('gemini-api-key-input-main');
    const geminiKeyStatusMain = document.getElementById('gemini-key-status-main');
    const geminiModelSelectMain = document.getElementById('gemini-model-select-main');

    document.getElementById('btn-open-gemini-modal-main')?.addEventListener('click', () => {
        if (geminiKeyInputMain) geminiKeyInputMain.value = getGeminiApiKey();
        if (geminiModelSelectMain) geminiModelSelectMain.value = getGeminiModel();
        if (geminiKeyStatusMain) {
            geminiKeyStatusMain.innerHTML = hasGeminiApiKey()
                ? '<strong style="color: #34d399;"><i class="fas fa-check-circle"></i> Gemini API sleutel is actief.</strong>'
                : '<span style="color: #94a3b8;"><i class="fas fa-info-circle"></i> Geen sleutel ingevoerd. Systeem gebruikt de slimme offline generator.</span>';
        }
        geminiModalMain?.classList.remove('hidden');
    });

    document.getElementById('btn-close-gemini-modal-main')?.addEventListener('click', () => geminiModalMain?.classList.add('hidden'));
    document.getElementById('btn-cancel-gemini-modal-main')?.addEventListener('click', () => geminiModalMain?.classList.add('hidden'));

    document.getElementById('btn-save-gemini-key-main')?.addEventListener('click', () => {
        const val = geminiKeyInputMain?.value.trim() || '';
        const selectedModel = geminiModelSelectMain?.value || 'gemini-3.5-flash';
        setGeminiApiKey(val);
        setGeminiModel(selectedModel);
        initSettingsTab();
        alert(val ? `Gemini instellingen opgeslagen (Model: ${selectedModel})!` : "Gemini API sleutel gewist. Offline generator actief.");
        geminiModalMain?.classList.add('hidden');
    });

    document.getElementById('btn-clear-gemini-key-main')?.addEventListener('click', () => {
        setGeminiApiKey('');
        if (geminiKeyInputMain) geminiKeyInputMain.value = '';
        if (geminiKeyStatusMain) geminiKeyStatusMain.innerHTML = '<span style="color: #94a3b8;"><i class="fas fa-info-circle"></i> Sleutel gewist. Offline generator actief.</span>';
        initSettingsTab();
        alert("Gemini API sleutel gewist.");
    });
}

// Initialisatie bij pagina-laad event of direct
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    initAdminPage();
}



