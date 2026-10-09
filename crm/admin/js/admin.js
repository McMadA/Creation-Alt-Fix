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
                'lead-factory': 'Autonome Leads <span class="accent">&amp; Concept Machine</span>',
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
                    onConfirmPlan: async (proj, plan) => {
                        const updatedFields = {
                            subscriptionPlan2027Id: plan.id,
                            subscriptionPlan2027Name: plan.name,
                            subscriptionPlan2027Price: plan.price,
                            subscriptionPlan2027Status: 'bevestigd',
                            subscriptionPlan2027ConfirmedAt: new Date().toISOString(),
                            subscriptionPlanId: plan.id,
                            subscriptionPlanName: plan.name,
                            subscriptionPrice: plan.price,
                            subscriptionCycle: 'jaar'
                        };
                        if (db && proj.id && String(proj.id).length > 5) {
                            await updateDoc(doc(db, "projects", proj.id), updatedFields);
                        }
                        Object.assign(proj, updatedFields);
                        initSubscriptionsTab(cachedProjects);
                        await logAuditEvent('2027_plan_confirmed', `2027 Abonnementsplan bevestigd: ${plan.name} (€ ${plan.price}/${plan.cycle}) voor ${proj.client || 'klant'}.`);
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

    // 1. Probeer eerst live data direct via de bridge server (indien actief)
    try {
        const bridgeCandidates = [];
        if (typeof window !== 'undefined' && window.location.port === '3847') {
            bridgeCandidates.push(window.location.origin);
        }
        bridgeCandidates.push('http://127.0.0.1:3847', 'http://localhost:3847');

        for (const host of [...new Set(bridgeCandidates)]) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 1200);
                const bridgeResp = await fetch(`${host}/api/leads`, { signal: controller.signal });
                clearTimeout(timeout);
                if (bridgeResp.ok) {
                    const bJson = await bridgeResp.json();
                    if (bJson && Array.isArray(bJson.leads) && bJson.leads.length > 0) {
                        leads = bJson.leads;
                        break;
                    }
                }
            } catch (_) {}
        }
    } catch (_) {}

    // 2. Fetch leads.json met cache-buster indien bridge niet direct antwoordde
    if (leads.length === 0) {
        try {
            const resp = await fetch(`./data/leads.json?t=${Date.now()}`);
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

    // 3. Firestore fallback
    if (leads.length === 0 && db) {
        try {
            const querySnapshot = await getDocs(collection(db, "leads_factory"));
            querySnapshot.forEach(docSnap => {
                leads.push({ id: docSnap.id, ...docSnap.data() });
            });
        } catch (err) {
            console.warn("[CRM] Kon leads niet ophalen uit Firestore:", err);
        }
    }

    const defaultLeads = [
        {
            id: 'lead_berends',
            slug: 'berends',
            name: 'Berends Bestrating & Grondwerk',
            category: 'Aannemer voor bestrating',
            address: 'Julianastraat 40, 9601 LR Hoogezand',
            phone: '06 27 31 94 14',
            normalizedPhone: '0627319414',
            whatsAppNumber: '31627319414',
            hasWhatsApp: true,
            hasWebsite: true,
            website: 'http://www.berendsbestrating.nl/',
            rating: 5.0,
            reviewsCount: 1,
            status: 'concept_ready',
            liveUrl: 'https://creationaltfix.nl/concept/berends/',
            pitchHook: "We zagen jouw vermelding voor Berends op Google Maps. We merkten op dat je website nog niet beschikt over een modern SSL-slotje (HTTPS). Browsers zoals Google Chrome tonen hierdoor een waarschuwing 'Niet beveiligd', wat zonde is voor het vertrouwen en de mobiele aanvragen van potentiële klanten.",
            pitch: {
                subject: "Veilige mobiele website-update voor Berends (concept)",
                bodyPlain: "Beste Berends,\n\nWe zagen jouw vermelding voor Berends op Google Maps. We merkten op dat je website nog niet beschikt over een modern SSL-slotje (HTTPS). Browsers zoals Google Chrome tonen hierdoor een waarschuwing 'Niet beveiligd'...\n\n👉 Bekijk hier jouw concept website: https://creationaltfix.nl/concept/berends/\n\nGroet,\nAllard Veldman - Creation+Alt+Fix",
                whatsAppText: "Hoi Berends! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik zag jullie Google vermelding, maar merkte dat de website nog op onveilig HTTP staat zonder slotje. Ik heb alvast een vrijblijvend modern concept klaargezet: https://creationaltfix.nl/concept/berends/ - Kijk er gerust naar op je telefoon, benieuwd wat je ervan vindt!"
            }
        },
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

    if (leads.length === 0) {
        const stored = localStorage.getItem('caf_leads_factory');
        if (stored) {
            try { leads = JSON.parse(stored); } catch {}
        }
    }

    // Sanering: Verwijder per direct alle spook-leads en skipped records
    leads = (leads || []).filter(l => l && l.status !== 'skipped_has_website');

    if (leads.length === 0) {
        leads = defaultLeads;
    }
    localStorage.setItem('caf_leads_factory', JSON.stringify(leads));

    const factoryHandlers = {
        onRefresh: async () => {
            await setupAndRenderLeadFactory();
        },
        onSendEmail: async (lead, customEmail = null) => {
            if (customEmail) lead.email = customEmail;
            const subject = encodeURIComponent(lead.pitch?.subject || `Concept website voor ${lead.name}`);
            const body = encodeURIComponent(lead.pitch?.bodyPlain || `Bekijk hier je concept website: ${lead.liveUrl}`);
            const mailto = `mailto:${lead.email || ''}?subject=${subject}&body=${body}`;
            
            // Betrouwbare popup-veilige open actie
            const link = document.createElement('a');
            link.href = mailto;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            link.remove();

            lead.status = 'sent_email';
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

            initLeadFactoryModule(stored, factoryHandlers);
            await logAuditEvent('lead_email_sent', `Concept acquisitiemail voorbereid en geopend voor ${lead.name}.`);
        },
        onUpdateStatus: async (lead, newStatus) => {
            lead.status = newStatus;
            if (newStatus === 'concept_ready') {
                lead.sentAt = null;
            }
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
            initLeadFactoryModule(stored, factoryHandlers);
            await logAuditEvent('lead_status_updated', `Lead status voor ${lead.name} gewijzigd naar '${newStatus}'.`);
        },
        onTriggerCycle: () => {
            alert("Autonome Engine Instructie:\n\nDe engine draait continu op jouw eigen Windows machine en gebruikt de 'agy' CLI (uit jouw AI abonnement).\n\nOm direct handmatig 1 extra concept te genereren, open een terminal en typ:\nnpm run factory:run\n\nOf start de 24/7 achtergrondservice via:\nnpm run factory:daemon");
        }
    };

    initLeadFactoryModule(leads, factoryHandlers);
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

// --- Modal Helper & Klantview Shortcut ---
window.closeModal = (id) => {
    document.getElementById(id)?.classList.add('hidden');
};

window.openKlantviewPreview = (id) => {
    window.open(`../status/index.html?preview=true&id=${encodeURIComponent(id)}`, '_blank');
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
    // Autonome Leads Werkstation op achtergrond voorladen voor directe badge- en tab-weergave
    setupAndRenderLeadFactory().catch(err => console.warn('[CRM] Lead Factory voorladen:', err));
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



