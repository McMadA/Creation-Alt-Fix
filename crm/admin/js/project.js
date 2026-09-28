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
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, sendPasswordResetEmail, createUserWithEmailAndPassword, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig, escapeHtml, isAdminEmail, formatProjectStatus, isClientAuthActivated } from "../../js/firebase-config.js";
import { generateProposalPDF, generateInvoicePDF, uploadPdfToStorage } from "../../js/pdf-generator.js";
import { getGeminiApiKey, setGeminiApiKey, hasGeminiApiKey, getGeminiModel, setGeminiModel, generateProposalScope, generateAftercareEmail, generateVisualDesignConcept } from "../../js/ai-engine.js";
import { syncDomainChangeToMonitoring, normalizeDomain, getDomainStatusWithFallback } from "../../js/uptime-monitor.js";
import { notifyClientAdminReply, notifyClientPhaseChange } from "../../js/email-notifications.js";

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

// --- Plans & Bookkeeping Records (Modularized) ---
import { SUBSCRIPTION_PLANS } from "../../js/crm-config.js";
import { PI_BOEKHOUDING_CLIENT_DATA, getPiBoekhoudingInfo } from "./modules/bookkeeping-data.js";
import { open2027SubscriptionModal } from "./modules/subscription-2027.js";
export { SUBSCRIPTION_PLANS, PI_BOEKHOUDING_CLIENT_DATA, getPiBoekhoudingInfo };


document.addEventListener('DOMContentLoaded', () => {
    // Only run workspace initialization if on project.html
    if (window.location.pathname.includes('project.html') || document.getElementById('project-title-display')) {
        setupAuthAndPage();
        setupTabNavigation();
        setupFormHandlers();
    }
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
            const authLoading = document.getElementById('auth-loading');

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
                    if (authLoading) authLoading.style.display = 'none';
                    if (authOverlay) authOverlay.classList.remove('hidden');
                    const errDiv = document.getElementById('login-error');
                    if (errDiv) {
                        errDiv.innerText = `Toegang geweigerd: Account "${userEmail}" heeft geen beheerdersrechten.`;
                        errDiv.classList.remove('hidden');
                    } else {
                        alert("Toegang geweigerd: Dit account heeft geen beheerdersrechten.");
                        window.location.href = "index.html";
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
                    } else {
                        alert("Beveiligingswaarschuwing: Wachtwoordinlog is uitgeschakeld voor beheerders. Log verplicht in via Google.");
                        window.location.href = "index.html";
                    }
                    return;
                }

                if (authLoading) authLoading.style.display = 'none';
                if (authOverlay) authOverlay.classList.add('hidden');
                if (adminApp) adminApp.classList.remove('hidden');
                loadProjectData(currentProjectId);
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

    // Google Sign-In Handler voor Beheerder
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    document.getElementById('btn-google-login')?.addEventListener('click', async () => {
        const errDiv = document.getElementById('login-error');
        const btn = document.getElementById('btn-google-login');
        if (errDiv) errDiv.classList.add('hidden');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifiëren bij Google...';
        }

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
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Inloggen met Google (Beheerder)';
                }
            }
        } catch (err) {
            console.error("Google Sign-In Fout:", err);
            if (errDiv) {
                errDiv.innerText = `Inlogfout: ${err.message || 'Authenticatie geannuleerd of mislukt.'}`;
                errDiv.classList.remove('hidden');
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Inloggen met Google (Beheerder)';
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

            if (targetId === 'tab-clientview' && currentProjectId) {
                initOrRefreshClientviewIframe();
            }
        });
    });

    setupClientviewControls();
}

function initOrRefreshClientviewIframe(forceReload = false) {
    const iframe = document.getElementById('clientview-iframe');
    if (!iframe || !currentProjectId) return;

    if (currentProjectData) {
        try {
            sessionStorage.setItem('caf_preview_project_' + currentProjectId, JSON.stringify(currentProjectData));
        } catch (e) {}
    }

    const expectedSrc = `../status/index.html?preview=true&id=${encodeURIComponent(currentProjectId)}`;
    if (forceReload || iframe.src === 'about:blank' || iframe.dataset.loadedId !== currentProjectId) {
        iframe.src = expectedSrc;
        iframe.dataset.loadedId = currentProjectId;
    }
}

function setupClientviewControls() {
    // Viewport switcher (Desktop 100%, Tablet 768px, Mobile 400px)
    document.querySelectorAll('.btn-device-switch').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-device-switch').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'none';
                b.style.color = '#94a3b8';
            });
            this.classList.add('active');
            this.style.background = 'var(--color-primary, #6366f1)';
            this.style.color = '#fff';

            const targetWidth = this.getAttribute('data-width') || '100%';
            const container = document.getElementById('clientview-frame-container');
            if (container) {
                container.style.maxWidth = targetWidth;
            }
        });
    });

    // Refresh button
    document.getElementById('btn-refresh-clientview')?.addEventListener('click', () => {
        initOrRefreshClientviewIframe(true);
    });
}


// --- Load Project Data from Firestore ---
async function loadProjectData(projectId) {
    if (!db) {
        console.error("Geen verbinding met Firestore database.");
        alert("Fout: Geen verbinding met de Firestore database.");
        return;
    }

    try {
        let projectFound = false;
        const docRef = doc(db, "projects", projectId);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                currentProjectData = { id: docSnap.id, ...docSnap.data() };
                projectFound = true;
            }
        } catch (getErr) {
            console.warn("Directe doc() lookup via ID gaf melding:", getErr.message);
        }

        // Fallback: Als directe document-ID lookup niets oplevert, zoek op 'id' veld in collectie
        if (!projectFound) {
            try {
                const numId = Number(projectId);
                const queryVal = isNaN(numId) ? projectId : numId;
                const q = query(collection(db, "projects"), where("id", "==", queryVal));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                    const foundDoc = qSnap.docs[0];
                    currentProjectId = foundDoc.id;
                    currentProjectData = { id: foundDoc.id, ...foundDoc.data() };
                    projectFound = true;
                }
            } catch (qErr) {
                console.warn("Query fallback gaf melding:", qErr.message);
            }
        }

        if (projectFound && currentProjectData) {
            // Filter out canceled TASK-501 if present in Firestore
            if (currentProjectData.tasks && Array.isArray(currentProjectData.tasks)) {
                const origLen = currentProjectData.tasks.length;
                currentProjectData.tasks = currentProjectData.tasks.filter(t => !t.id?.includes('501') && !t.title?.includes('TASK-501') && !t.title?.includes('Google Ads') && !t.title?.includes('400'));
                if (currentProjectData.tasks.length !== origLen && db && currentProjectId) {
                    updateDoc(doc(db, "projects", currentProjectId), { tasks: currentProjectData.tasks }).catch(console.warn);
                }
            }

            // If tasks are missing or empty, set clean initial delivery milestones
            if (!currentProjectData.tasks || !Array.isArray(currentProjectData.tasks) || currentProjectData.tasks.length === 0) {
                const isDone = (currentProjectData.status || '').includes('Opgeleverd') || (currentProjectData.status || '').includes('Live') || (currentProjectData.status || '').includes('Voldaan');
                const now = new Date();
                const addDaysIso = (days) => {
                    const d = new Date(now.getTime() + days * 86400000);
                    return d.toISOString().split('T')[0];
                };

                const defaultTasks = [
                    { id: 'del_' + projectId + '_1', title: 'Intake, functionele briefing & wensenanalyse', completed: isDone, status: isDone ? 'done' : 'inprogress', priority: 'high', dueDate: isDone ? (currentProjectData.date || addDaysIso(0)) : addDaysIso(2) },
                    { id: 'del_' + projectId + '_2', title: 'UI/UX Design & responsive template concept', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'high', dueDate: isDone ? (currentProjectData.date || addDaysIso(0)) : addDaysIso(6) },
                    { id: 'del_' + projectId + '_3', title: 'Content, formulieren, functionaliteit & API koppeling', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'medium', dueDate: isDone ? (currentProjectData.date || addDaysIso(0)) : addDaysIso(12) },
                    { id: 'del_' + projectId + '_4', title: 'Livegang, DNS domeinkoppeling & SSL certificering', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'high', dueDate: isDone ? (currentProjectData.date || addDaysIso(0)) : addDaysIso(18) }
                ];
                currentProjectData.tasks = defaultTasks;
                if (db && currentProjectId) {
                    updateDoc(doc(db, "projects", currentProjectId), { tasks: defaultTasks }).catch(console.warn);
                }
            }
            renderProjectWorkspace(currentProjectData);
        } else {
            // Document niet in Firestore
            alert("Project niet gevonden in Firestore database.");
            window.location.href = "index.html";
        }
    } catch (err) {
        console.error("Fout bij laden van project:", err);
        alert("Fout bij ophalen van projectgegevens: " + err.message);
        window.location.href = "index.html";
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
    const hasValidEmail = Boolean(email && email.trim() && email.includes('@'));
    const isAuthActivated = isClientAuthActivated(p);

    // Header updates
    document.getElementById('project-title-display').innerText = clientName;
    document.title = `Project: ${clientName} - Creation+Alt+Fix Admin`;
    document.getElementById('project-date-display').innerText = dateSubmitted;
    
    // Determine Phase & Harmonized Status
    const statusInfo = formatProjectStatus(status, p.statusClass);
    const currentPhase = statusInfo.phase;

    // Update Phase Badge & Quick Selector
    const badgeElem = document.getElementById('project-phase-badge');
    if (badgeElem) {
        badgeElem.innerText = statusInfo.label;
        badgeElem.className = `badge badge-${escapeHtml(statusInfo.badgeClass)}`;
    }

    const phaseChanger = document.getElementById('quick-phase-changer');
    if (phaseChanger) {
        if (currentPhase === 5) {
            phaseChanger.value = statusInfo.isPaymentWaiting ? '5-payment' : '5-complete';
        } else {
            phaseChanger.value = String(currentPhase);
        }
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

    // Populate Intake Form Inputs with safe null guards
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('edit-client', clientName);
    setVal('edit-contact', contact);
    setVal('edit-email', email);
    setVal('edit-domain', domain);
    const domainEl = document.getElementById('edit-domain');
    if (domainEl) domainEl.dataset.originalDomain = domain;

    // Populate Extra / Secondary Domains
    const extraDomainsList = Array.isArray(currentProjectData.additionalDomains) 
        ? currentProjectData.additionalDomains 
        : (typeof currentProjectData.additionalDomains === 'string' ? currentProjectData.additionalDomains.split(/[\r\n,;]+/).map(d => d.trim()).filter(Boolean) : []);
    const extraInput = document.getElementById('edit-extra-domains');
    if (extraInput) {
        extraInput.value = extraDomainsList.join(', ');
        extraInput.dataset.originalExtra = extraDomainsList.join(', ');
    }

    // Render Realtime DNS & Uptime status badge under domain input
    const monStatusEl = document.getElementById('project-domain-monitor-status');
    if (monStatusEl) {
        const cleanDom = normalizeDomain(domain);
        if (cleanDom) {
            monStatusEl.innerHTML = `
                <span class="monitoring-pulse-dot operational"></span>
                <span style="color: #94a3b8;"><strong style="color: #fff;">${escapeHtml(cleanDom)}</strong> realtime DNS &amp; Uptime actief</span>
            `;
            if (db) {
                getDomainStatusWithFallback(db, cleanDom).then(st => {
                    if (st && monStatusEl) {
                        monStatusEl.innerHTML = `
                            <span class="monitoring-pulse-dot ${st.overallStatus}"></span>
                            <span style="color: ${st.statusColor || '#10b981'}; font-weight: 600;">${escapeHtml(st.statusText || 'Operationeel')}</span>
                            <span style="color: #64748b;">(${st.latencyMs || 0}ms • HTTP ${st.httpCode || 200} • DNS ${escapeHtml(st.dnsStatus || 'NOERROR')})</span>
                        `;
                    }
                }).catch(() => {});
            }
        } else {
            monStatusEl.innerHTML = `<span style="color: #64748b; font-style: italic;">Geen domein ingesteld. Vul in om realtime monitoring te activeren.</span>`;
        }
    }

    setVal('edit-service', service);
    setVal('edit-goals', goals);
    setVal('edit-design', design);
    setVal('edit-designUrl', designUrl);
    setVal('edit-street', p.streetAndNumber || p.address || '');
    setVal('edit-postalCode', p.postalCode || '');
    setVal('edit-city', p.city || '');
    setVal('edit-kvk', p.kvkNumber || p.kvk || '');
    setVal('edit-vat', p.vatNumber || p.btwNummer || '');
    setVal('edit-targetDeliveryDate', p.targetDeliveryDate || '');

    // Populate Auth Info Box
    document.getElementById('auth-email-display').innerText = email || 'Geen e-mailadres ingesteld';
    const authStatusBadge = document.getElementById('auth-status-badge');
    const btnActivateAuth = document.getElementById('btn-activate-auth');
    const btnActivateText = document.getElementById('btn-activate-auth-text');
    const btnResetAuth = document.getElementById('btn-reset-auth');

    if (!hasValidEmail) {
        authStatusBadge.innerHTML = `<span style="color: #f87171; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-exclamation-triangle"></i> Niet geactiveerd (Geen e-mailadres)</span>`;
        if (btnActivateText) btnActivateText.innerText = 'Vul e-mailadres in om te activeren';
        if (btnActivateAuth) {
            btnActivateAuth.disabled = true;
            btnActivateAuth.style.opacity = '0.6';
            btnActivateAuth.style.cursor = 'not-allowed';
            btnActivateAuth.title = 'Vul eerst een geldig e-mailadres in bij Klantgegevens';
        }
        if (btnResetAuth) {
            btnResetAuth.disabled = true;
            btnResetAuth.style.opacity = '0.6';
            btnResetAuth.style.cursor = 'not-allowed';
            btnResetAuth.title = 'Geen e-mailadres om reset naar te sturen';
        }
    } else if (isAuthActivated) {
        authStatusBadge.innerHTML = `<span style="color: #34d399; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Geactiveerd in Firebase Auth</span>`;
        if (btnActivateText) btnActivateText.innerText = 'Her-activeer / Koppel Account in Auth';
        if (btnActivateAuth) {
            btnActivateAuth.disabled = false;
            btnActivateAuth.style.opacity = '1';
            btnActivateAuth.style.cursor = 'pointer';
            btnActivateAuth.title = '';
        }
        if (btnResetAuth) {
            btnResetAuth.disabled = false;
            btnResetAuth.style.opacity = '1';
            btnResetAuth.style.cursor = 'pointer';
            btnResetAuth.title = '';
        }
    } else {
        authStatusBadge.innerHTML = `<span style="color: #fbbf24; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-exclamation-circle"></i> Niet geactiveerd in Firebase Auth</span>`;
        if (btnActivateText) btnActivateText.innerText = 'Activeer Klantaccount & Stuur Inlog-Mail';
        if (btnActivateAuth) {
            btnActivateAuth.disabled = false;
            btnActivateAuth.style.opacity = '1';
            btnActivateAuth.style.cursor = 'pointer';
            btnActivateAuth.title = '';
        }
        if (btnResetAuth) {
            btnResetAuth.disabled = false;
            btnResetAuth.style.opacity = '1';
            btnResetAuth.style.cursor = 'pointer';
            btnResetAuth.title = '';
        }
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

    const goalsEl = document.getElementById('quick-goals-display');
    if (goalsEl) {
        goalsEl.innerText = p.goals || p.projectGoals || 'Geen specifieke doelen opgegeven';
    }

    const styleEl = document.getElementById('quick-style-display');
    if (styleEl) {
        styleEl.innerText = p.design || p.designPreferences || 'Standaard Dark AI / Modern';
    }

    // Design Approval feedback in action button
    const designActionBtn = document.getElementById('btn-action-design');
    if (designActionBtn) {
        if (p.designAcceptedAt) {
            const accDate = new Date(p.designAcceptedAt).toLocaleDateString('nl-NL');
            designActionBtn.innerHTML = `<i class="fas fa-check-circle" style="color: #34d399;"></i> Design Akkoord (${accDate})`;
            designActionBtn.style.borderColor = '#10b981';
            designActionBtn.style.color = '#34d399';
        } else if (p.designUrl || p.figmaUrl) {
            designActionBtn.innerHTML = `<i class="fas fa-palette"></i> Design Review Actief (Fase 3)`;
            designActionBtn.style.borderColor = 'rgba(168, 85, 247, 0.4)';
            designActionBtn.style.color = '#c084fc';
        } else {
            designActionBtn.innerHTML = `<i class="fas fa-palette"></i> Verstuur Design naar Klant (Fase 3)`;
            designActionBtn.style.borderColor = 'rgba(168, 85, 247, 0.4)';
            designActionBtn.style.color = '#c084fc';
        }
    }

    // Populate Proposal Box if already generated
    if (proposalPrice || p.proposalGeneratedAt) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/offerte/index.html?id=${p.id}`;
        const propLinkInput = document.getElementById('proposal-link-input');
        if (propLinkInput) propLinkInput.value = link;
        const propVisitBtn = document.getElementById('proposal-visit-btn');
        if (propVisitBtn) propVisitBtn.href = link;
        const propLinkBox = document.getElementById('proposal-link-box');
        if (propLinkBox) propLinkBox.classList.remove('hidden');

        const signedBadge = document.getElementById('proposal-signed-badge');
        const signedText = document.getElementById('proposal-signed-text');
        const pdfDlBtn = document.getElementById('proposal-pdf-download-btn');

        if (p.proposalAcceptedAt || p.proposalSignedBy) {
            if (signedBadge) signedBadge.classList.remove('hidden');
            if (signedText) {
                const signer = p.proposalSignedBy ? `door ${escapeHtml(p.proposalSignedBy)}` : 'Digitaal Akkoord';
                const dateStr = p.proposalAcceptedAt ? new Date(p.proposalAcceptedAt).toLocaleDateString('nl-NL') : '';
                signedText.innerHTML = `Akkoord ${signer} ${dateStr ? '(' + dateStr + ')' : ''}`;
            }
            if (pdfDlBtn && p.proposalPdfUrl) {
                pdfDlBtn.href = p.proposalPdfUrl;
                pdfDlBtn.classList.remove('hidden');
            } else if (pdfDlBtn) {
                pdfDlBtn.classList.add('hidden');
            }
        } else {
            if (signedBadge) signedBadge.classList.add('hidden');
            if (pdfDlBtn) pdfDlBtn.classList.add('hidden');
        }
    }

    // Render Sub-Components
    renderTasksList(p.tasks || []);
    renderAdminMessages(p.messages || []);
    renderAdminStaging(p);
    renderAiScopeBox(p);
    renderAftercareQueue(p);
    renderTimelineAndNotes(p.internalNotes || [], p.auditLog || []);
    renderFilesList(p.files || []);
    renderSubscriptionAndInvoiceCard(p);

    // Update Klantview Preview links & state
    const clientviewUrl = `../status/index.html?preview=true&id=${encodeURIComponent(currentProjectId)}`;
    const headerPortalBtn = document.getElementById('btn-open-client-portal');
    if (headerPortalBtn) {
        headerPortalBtn.href = clientviewUrl;
    }
    const extClientviewBtn = document.getElementById('btn-external-clientview');
    if (extClientviewBtn) {
        extClientviewBtn.href = clientviewUrl;
    }
    const clientviewNameEl = document.getElementById('clientview-client-name');
    if (clientviewNameEl) {
        clientviewNameEl.innerText = clientName;
    }
    try {
        sessionStorage.setItem('caf_preview_project_' + currentProjectId, JSON.stringify(p));
    } catch (e) {}

    const clientviewTab = document.getElementById('tab-clientview');
    if (clientviewTab && clientviewTab.classList.contains('active')) {
        initOrRefreshClientviewIframe();
    }
}

// --- Pi-Boekhouding & Subscription Management Card ---
function renderSubscriptionAndInvoiceCard(p) {
    const info = getPiBoekhoudingInfo(p);
    if (!info) return;

    const currentPlanId = p.subscriptionPlanId || info.currentPlanId || 'managed_nl';
    const currentPlan = SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS['managed_nl'];

    const recPlanId = info.recommendedPlanId || 'managed_nl';
    const recPlan = SUBSCRIPTION_PLANS[recPlanId] || SUBSCRIPTION_PLANS['managed_nl'];

    // 1. Current Plan Display
    const currentBadge = document.getElementById('subscription-status-badge');
    if (currentBadge) {
        currentBadge.innerText = currentPlan.badge || 'Actief';
        if (currentPlanId === 'legacy_22') {
            currentBadge.style.color = '#fbbf24';
        } else if (currentPlanId === 'none') {
            currentBadge.style.color = '#94a3b8';
        } else {
            currentBadge.style.color = '#34d399';
        }
    }

    const currentDisplay = document.getElementById('subscription-current-display');
    if (currentDisplay) {
        if (p.subscriptionPlanName) {
            currentDisplay.innerHTML = `<span style="color: #38bdf8;">${escapeHtml(p.subscriptionPlanName)}</span> &mdash; <strong style="color: #34d399;">€ ${escapeHtml(p.subscriptionPrice || currentPlan.price)}</strong> / ${escapeHtml(p.subscriptionCycle || currentPlan.cycle)}`;
        } else if (info.currentPlanName) {
            currentDisplay.innerHTML = `<span style="color: #e2e8f0;">${escapeHtml(info.currentPlanName)}</span>`;
        } else {
            currentDisplay.innerHTML = `<span style="color: #38bdf8;">${escapeHtml(currentPlan.name)}</span> &mdash; <strong style="color: #34d399;">€ ${currentPlan.price}</strong> / ${currentPlan.cycle}`;
        }
    }

    // 2. Recommended Plan Display
    const recDisplay = document.getElementById('subscription-recommended-display');
    if (recDisplay) {
        recDisplay.innerHTML = `<strong>${escapeHtml(recPlan.name)} (€ ${recPlan.price}/${recPlan.cycle})</strong><br><span style="color: #cbd5e1;">${escapeHtml(info.recommendedReason || recPlan.desc)}</span>`;
    }

    // 3. Dropdown Selector
    const selectElem = document.getElementById('select-client-subscription');
    if (selectElem) {
        selectElem.value = currentPlanId;
    }

    // 4. Latest Invoice from Pi-Boekhouding
    const invBadge = document.getElementById('pi-invoice-badge');
    const invSummary = document.getElementById('pi-invoice-summary');
    const invItems = document.getElementById('pi-invoice-items');

    if (info.latestInvoice) {
        const inv = info.latestInvoice;
        if (invBadge) {
            invBadge.innerText = inv.status || 'Betaald';
            invBadge.className = inv.status === 'Betaald' ? 'badge badge-success' : 'badge badge-waiting';
        }
        if (invSummary) {
            const formattedTotal = Number(inv.totalExcl).toFixed(2).replace('.', ',');
            invSummary.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <strong style="color: #fff;"><i class="fas fa-file-invoice" style="color: #34d399;"></i> Factuur ${escapeHtml(inv.number)}</strong>
                    <span style="color: #94a3b8; font-size: 0.72rem;">${escapeHtml(inv.date)}</span>
                </div>
                <div style="font-size: 0.82rem; font-weight: 700; color: #34d399;">
                    € ${formattedTotal} excl. BTW <span style="font-size: 0.7rem; font-weight: 400; color: #94a3b8;">(Status: ${escapeHtml(inv.status)})</span>
                </div>
            `;
        }
        if (invItems && inv.items && inv.items.length > 0) {
            invItems.innerHTML = `
                <div style="font-size: 0.7rem; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">Afgenomen Regels:</div>
                ${inv.items.map(it => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #cbd5e1;">
                        <span>• ${it.qty}x ${escapeHtml(it.name)} ${it.desc ? '<span style="color:#64748b;">(' + escapeHtml(it.desc) + ')</span>' : ''}</span>
                        <span style="font-family: monospace; color: #e2e8f0;">€ ${(it.qty * it.price).toFixed(2).replace('.', ',')}</span>
                    </div>
                `).join('')}
            `;
        } else if (invItems) {
            invItems.innerHTML = '';
        }
    } else {
        if (invBadge) {
            invBadge.innerText = 'Geen Factuur';
            invBadge.className = 'badge badge-secondary';
        }
        if (invSummary) {
            invSummary.innerHTML = `<span style="color: #94a3b8; font-style: italic;">Nog geen historische facturen geregistreerd in Pi-Boekhouding voor dit project.</span>`;
        }
        if (invItems) {
            invItems.innerHTML = '';
        }
    }
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

// --- [TASK-832] Enhanced Project Files List with Download Manager ---
function renderFilesList(files) {
    const container = document.getElementById('project-files-list');
    const filesCountElem = document.getElementById('tab-files-count');

    filesCountElem.innerText = files.length;

    if (files.length === 0) {
        container.innerHTML = `<p style="color: var(--color-text-secondary); font-style: italic; font-size: 0.9rem;">Er zijn nog geen bestanden geüpload voor dit project door de klant.</p>`;
        return;
    }

    // File type icon resolver
    function getFileIcon(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
            'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'csv': 'fa-file-csv',
            'png': 'fa-file-image', 'jpg': 'fa-file-image', 'jpeg': 'fa-file-image',
            'gif': 'fa-file-image', 'svg': 'fa-file-image', 'webp': 'fa-file-image',
            'zip': 'fa-file-archive', 'rar': 'fa-file-archive', '7z': 'fa-file-archive',
            'txt': 'fa-file-alt', 'rtf': 'fa-file-alt', 'md': 'fa-file-alt',
            'mp4': 'fa-file-video', 'mov': 'fa-file-video', 'avi': 'fa-file-video',
            'psd': 'fa-palette', 'ai': 'fa-palette', 'fig': 'fa-palette'
        };
        return iconMap[ext] || 'fa-file';
    }

    function getFileColor(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        if (['pdf'].includes(ext)) return '#ef4444';
        if (['doc', 'docx'].includes(ext)) return '#3b82f6';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return '#22c55e';
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '#a855f7';
        if (['zip', 'rar', '7z'].includes(ext)) return '#f59e0b';
        if (['psd', 'ai', 'fig'].includes(ext)) return '#ec4899';
        return 'var(--color-primary-light)';
    }

    // Summary header with download-all button
    let html = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-folder-open" style="color: var(--color-accent); font-size: 1.1rem;"></i>
                <span style="color: #f8fafc; font-weight: 600; font-size: 0.95rem;">Aangeleverde Klantbestanden</span>
                <span style="background: rgba(34,211,238,0.15); color: var(--color-accent); padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">${files.length}</span>
            </div>
            <button type="button" id="btn-download-all-files" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.3); color: var(--color-accent); border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" title="Open alle bestanden in nieuw tabblad">
                <i class="fas fa-download"></i> Download Alle
            </button>
        </div>
    `;

    // File rows
    html += files.map(f => {
        const icon = getFileIcon(f.name);
        const color = getFileColor(f.name);
        const dateStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'onbekend';
        const sizeStr = f.size ? (f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : (f.size / 1024).toFixed(0) + ' KB') : '';

        return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(34,211,238,0.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'">
            <div style="display: flex; align-items: center; gap: 12px; overflow: hidden; flex: 1;">
                <i class="fas ${icon}" style="color: ${color}; font-size: 1.3rem; width: 24px; text-align: center;"></i>
                <div style="overflow: hidden; flex: 1;">
                    <div style="font-size: 0.92rem; color: #fff; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(f.name)}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); display: flex; gap: 12px; flex-wrap: wrap;">
                        <span><i class="far fa-clock" style="margin-right: 3px;"></i>${dateStr}</span>
                        ${sizeStr ? `<span><i class="fas fa-weight-hanging" style="margin-right: 3px;"></i>${sizeStr}</span>` : ''}
                    </div>
                </div>
            </div>
            <a href="${escapeHtml(f.url)}" target="_blank" class="btn btn-secondary btn-sm" style="color: var(--color-accent); border-color: rgba(34, 211, 238, 0.3); white-space: nowrap; margin-left: 10px;">
                <i class="fas fa-download"></i> Downloaden
            </a>
        </div>`;
    }).join('');

    container.innerHTML = html;

    // Download All handler — opens each file in a new tab
    document.getElementById('btn-download-all-files')?.addEventListener('click', () => {
        files.forEach((f, i) => {
            setTimeout(() => {
                window.open(f.url, '_blank');
            }, i * 300); // stagger to prevent popup blocker
        });
    });
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

    // If marked resolved, update matching client tickets to resolved as well
    let updatedMessages = (currentProjectData.messages || []).map(m => {
        if (m.sender === 'client' && (m.category === category || category === 'general') && ticketStatus === 'resolved') {
            return { ...m, status: 'resolved' };
        }
        return m;
    });
    updatedMessages.push(newMsg);
    currentProjectData.messages = updatedMessages;

    renderAdminMessages(updatedMessages);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), { messages: updatedMessages });
            await logAuditEvent('message_sent', `Reactie gestuurd naar klant (${category}): "${newMsg.message.slice(0, 45)}${newMsg.message.length > 45 ? '...' : ''}" (Status: ${ticketStatus})`);

            // [TASK-829] Notify client via email that admin has replied
            const clientEmail = currentProjectData.email || '';
            const clientName = currentProjectData.contactName || currentProjectData.client || 'Klant';
            const projectName = currentProjectData.companyName || currentProjectData.client || 'Project';
            if (clientEmail) {
                notifyClientAdminReply({
                    clientEmail,
                    clientName,
                    projectName,
                    messagePreview: newMsg.message.length > 200 ? newMsg.message.slice(0, 200) + '...' : newMsg.message
                }).catch(err => console.warn('[CRM Notify] Client reply notification error (non-blocking):', err));
            }
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
    let url = p.stagingUrl || p.demoUrl || p.designUrl || p.domainName || p.domain;
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (url === '' || url.toLowerCase() === 'n.v.t.' || url.toLowerCase() === 'geen' || url.toLowerCase() === 'nog geen domein') {
        return null;
    }
    if (url.includes(' / ')) {
        url = url.split(' / ')[0].trim();
    }
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
    }
    if (/bakkertjesieg\.nl(\/)?$/i.test(url)) {
        url = url.replace(/\/+$/, '') + '/new/';
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
        if (urlDisplay) urlDisplay.innerText = "Geen staging URL of extern domein geconfigureerd.";
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

    const isCompleted = Boolean(p.status && (p.status.includes('Opgeleverd') || p.status.includes('Afgerond') || p.status.includes('Livegang') || p.status.includes('Mollie') || p.status.includes('Voldaan') || p.status.includes('Fase 5')));
    
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
async function changeProjectPhase(phaseKey) {
    if (!currentProjectData) return;

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

    const updated = {
        status: targetStatus,
        statusClass: targetStatusClass
    };

    currentProjectData = { ...currentProjectData, ...updated };
    renderProjectWorkspace(currentProjectData);

    if (db && currentProjectId) {
        try {
            await updateDoc(doc(db, "projects", currentProjectId), updated);
            await logAuditEvent('status_updated', `Projectfase gewijzigd naar: ${targetStatus}`);
            alert(`Projectfase succesvol bijgewerkt naar "${targetStatus}"!`);

            // [TASK-829] Notify client about phase transition via email
            const clientEmail = currentProjectData.email || '';
            const clientName = currentProjectData.contactName || currentProjectData.client || 'Klant';
            const projectName = currentProjectData.companyName || currentProjectData.client || 'Project';
            if (clientEmail) {
                notifyClientPhaseChange({
                    clientEmail,
                    clientName,
                    projectName,
                    newPhaseLabel: targetStatus
                }).catch(err => console.warn('[CRM Notify] Phase notification error (non-blocking):', err));
            }
        } catch (err) {
            console.error("Fout bij updaten fase:", err);
            alert("Fout bij updaten fase: " + err.message);
        }
    } else {
        alert(`Projectfase gewijzigd naar "${targetStatus}"!`);
    }
}

// --- Setup Form Handlers & Workflow Buttons ---
function setupFormHandlers() {
    // 0. Quick Phase Selector & Interactive Pipeline Tracker
    document.getElementById('quick-phase-changer')?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) changeProjectPhase(val);
    });

    document.querySelectorAll('.phase-step').forEach(step => {
        step.addEventListener('click', () => {
            const phaseNum = parseInt(step.getAttribute('data-phase'), 10);
            if (phaseNum === 5) {
                const cur = formatProjectStatus(currentProjectData?.status || '');
                if (cur.isPaymentWaiting) {
                    if (confirm("Betaling ontvangen via Mollie of overboeking?\n\nKlik 'OK' om het project definitief te markeren als 'Fase 5: Volledig Live & Voldaan'.")) {
                        changeProjectPhase('5-complete');
                    }
                } else {
                    changeProjectPhase('5-complete');
                }
            } else if (phaseNum) {
                changeProjectPhase(phaseNum);
            }
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

        const domainInput = document.getElementById('edit-domain');
        const originalDomain = domainInput?.dataset?.originalDomain 
            || currentProjectData?.domainName 
            || currentProjectData?.domain 
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
            designUrl: document.getElementById('edit-designUrl').value.trim(),
            figmaUrl: document.getElementById('edit-designUrl').value.trim(),
            streetAndNumber: document.getElementById('edit-street')?.value.trim() || '',
            address: document.getElementById('edit-street')?.value.trim() || '',
            postalCode: document.getElementById('edit-postalCode')?.value.trim() || '',
            city: document.getElementById('edit-city')?.value.trim() || '',
            kvkNumber: document.getElementById('edit-kvk')?.value.trim() || '',
            kvk: document.getElementById('edit-kvk')?.value.trim() || '',
            vatNumber: document.getElementById('edit-vat')?.value.trim() || '',
            btwNummer: document.getElementById('edit-vat')?.value.trim() || '',
            targetDeliveryDate: document.getElementById('edit-targetDeliveryDate')?.value || ''
        };

        if (!newEmail) {
            updatedData.isClientAccount = false;
            updatedData.clientUid = null;
        }

        currentProjectData = { ...currentProjectData, ...updatedData };

        if (db) {
            try {
                await updateDoc(doc(db, "projects", currentProjectId), updatedData);
                await logAuditEvent('data_updated', 'Klantgegevens & intakeformulier bijgewerkt door beheerder.');

                // Synchronize domain change with Realtime Uptime & DNS Monitoring
                let monitoringNotice = '';
                const cleanOld = normalizeDomain(originalDomain);
                const cleanNew = normalizeDomain(newDomain);

                if (cleanOld !== cleanNew) {
                    try {
                        const syncResult = await syncDomainChangeToMonitoring(db, originalDomain, newDomain, {
                            client: updatedData.client,
                            companyName: updatedData.companyName,
                            contactName: updatedData.contactName,
                            projectId: currentProjectId
                        });

                        if (syncResult && syncResult.changed) {
                            if (domainInput) domainInput.dataset.originalDomain = newDomain;
                            await logAuditEvent('domain_monitoring_synced', 
                                `Domeinnaam gewijzigd van "${originalDomain || 'geen'}" naar "${newDomain}". Automatisch gekoppeld en geverifieerd in Realtime Uptime & DNS Monitor (${syncResult.report?.statusText || 'OK'}).`
                            );
                            monitoringNotice = `\n\n🌐 Realtime Uptime & DNS Monitoring bijgewerkt:\n` +
                                (cleanOld ? `• Oud domein (${cleanOld}) uitgefaseerd & opgeschoond\n` : '') +
                                (cleanNew ? `• Nieuw domein (${cleanNew}) geverifieerd (${syncResult.report?.statusText || 'OK'})` : '');
                        }
                    } catch (syncErr) {
                        console.warn("Fout bij synchroniseren naar Uptime Monitoring:", syncErr);
                    }
                }

                alert("Wijzigingen succesvol opgeslagen in Firestore!" + monitoringNotice);
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

    // Live feedback when typing/editing email in Project Workstation
    document.getElementById('edit-email')?.addEventListener('input', (e) => {
        const liveEmail = e.target.value.trim().toLowerCase();
        const liveHasValidEmail = Boolean(liveEmail && liveEmail.includes('@'));
        const liveProj = { ...(currentProjectData || {}), email: liveEmail };
        const liveIsActivated = isClientAuthActivated(liveProj);

        const emailDisplay = document.getElementById('auth-email-display');
        const authStatusBadge = document.getElementById('auth-status-badge');
        const btnActivateAuth = document.getElementById('btn-activate-auth');
        const btnActivateText = document.getElementById('btn-activate-auth-text');
        const btnResetAuth = document.getElementById('btn-reset-auth');

        if (emailDisplay) emailDisplay.innerText = liveEmail || 'Geen e-mailadres ingesteld';

        if (!liveHasValidEmail) {
            if (authStatusBadge) authStatusBadge.innerHTML = `<span style="color: #f87171; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-exclamation-triangle"></i> Niet geactiveerd (Geen e-mailadres)</span>`;
            if (btnActivateText) btnActivateText.innerText = 'Vul e-mailadres in om te activeren';
            if (btnActivateAuth) {
                btnActivateAuth.disabled = true;
                btnActivateAuth.style.opacity = '0.6';
                btnActivateAuth.style.cursor = 'not-allowed';
                btnActivateAuth.title = 'Vul eerst een geldig e-mailadres in bij Klantgegevens';
            }
            if (btnResetAuth) {
                btnResetAuth.disabled = true;
                btnResetAuth.style.opacity = '0.6';
                btnResetAuth.style.cursor = 'not-allowed';
                btnResetAuth.title = 'Geen e-mailadres om reset naar te sturen';
            }
        } else if (liveIsActivated) {
            if (authStatusBadge) authStatusBadge.innerHTML = `<span style="color: #34d399; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Geactiveerd in Firebase Auth</span>`;
            if (btnActivateText) btnActivateText.innerText = 'Her-activeer / Koppel Account in Auth';
            if (btnActivateAuth) {
                btnActivateAuth.disabled = false;
                btnActivateAuth.style.opacity = '1';
                btnActivateAuth.style.cursor = 'pointer';
                btnActivateAuth.title = '';
            }
            if (btnResetAuth) {
                btnResetAuth.disabled = false;
                btnResetAuth.style.opacity = '1';
                btnResetAuth.style.cursor = 'pointer';
                btnResetAuth.title = '';
            }
        } else {
            if (authStatusBadge) authStatusBadge.innerHTML = `<span style="color: #fbbf24; font-weight: 600; font-size: 0.8rem;"><i class="fas fa-exclamation-circle"></i> Niet geactiveerd in Firebase Auth</span>`;
            if (btnActivateText) btnActivateText.innerText = 'Activeer Klantaccount & Stuur Inlog-Mail';
            if (btnActivateAuth) {
                btnActivateAuth.disabled = false;
                btnActivateAuth.style.opacity = '1';
                btnActivateAuth.style.cursor = 'pointer';
                btnActivateAuth.title = '';
            }
            if (btnResetAuth) {
                btnResetAuth.disabled = false;
                btnResetAuth.style.opacity = '1';
                btnResetAuth.style.cursor = 'pointer';
                btnResetAuth.title = '';
            }
        }
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
            alert("Offerte en projectscope zijn succesvol opgeslagen en geactiveerd in het klantenportaal!");
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
        const priceInput = prompt("Wat is het geoffreerde offertebedrag (excl. 21% BTW) voor dit project? (bijv. 450,00)");
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

            await logAuditEvent('proposal_generated', `Offerte gegenereerd met offertebedrag van € ${priceInput.trim()} (Status -> Wacht op Akkoord)`);
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
            const isSigned = Boolean(projData.proposalAcceptedAt || projData.status?.includes('Design') || projData.status?.includes('Ontwikkeling') || projData.status?.includes('Opgeleverd') || projData.status?.includes('Live') || projData.status?.includes('Voldaan') || projData.status?.includes('Fase 5') || projData.status?.includes('Mollie'));
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

    // Action: Copy Pi-Boekhouding Facturen Folder Path
    document.getElementById('btn-copy-facturen-path')?.addEventListener('click', () => {
        navigator.clipboard.writeText('C:\\Users\\Admin\\Backups\\Pi-Boekhouding');
        const btn = document.getElementById('btn-copy-facturen-path');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check" style="color: #34d399;"></i> Gekopieerd!';
            setTimeout(() => btn.innerHTML = orig, 2000);
        }
    });

    // Action: Save Client Subscription Plan
    document.getElementById('btn-save-subscription')?.addEventListener('click', async () => {
        const select = document.getElementById('select-client-subscription');
        if (!select || !currentProjectId) return;
        const planId = select.value;
        const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS['managed_nl'];
        const saveBtn = document.getElementById('btn-save-subscription');
        const origText = saveBtn.innerHTML;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opslaan...';

        try {
            const updatedFields = {
                subscriptionPlanId: plan.id,
                subscriptionPlanName: plan.name,
                subscriptionPrice: plan.price,
                subscriptionCycle: plan.cycle,
                subscriptionUpdatedAt: new Date().toISOString()
            };

            if (db && currentProjectId) {
                await updateDoc(doc(db, "projects", currentProjectId), updatedFields);
            }

            currentProjectData = { ...(currentProjectData || {}), ...updatedFields };

            await logAuditEvent('subscription_updated', `Abonnement bijgewerkt naar: ${plan.name} (€ ${plan.price}/${plan.cycle}).`);

            saveBtn.innerHTML = '<i class="fas fa-check" style="color: #34d399;"></i> Opgeslagen!';
            
            // Re-render subscription card display
            renderSubscriptionAndInvoiceCard(currentProjectData);

            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = origText;
            }, 2000);
        } catch (err) {
            console.error("Fout bij opslaan abonnement:", err);
            alert("Kon abonnement niet opslaan: " + err.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = origText;
        }
    });

    // Action: 2027 Subscription Communication Modal
    document.getElementById('btn-workstation-2027-proposal')?.addEventListener('click', () => {
        if (!currentProjectData) return;
        open2027SubscriptionModal({
            project: currentProjectData,
            onSavePlan: async (proj, plan) => {
                const updatedFields = {
                    subscriptionPlan2027Id: plan.id,
                    subscriptionPlan2027Name: plan.name,
                    subscriptionPlan2027Price: plan.price,
                    subscriptionPlan2027Status: 'voorgesteld',
                    subscriptionPlan2027ProposedAt: new Date().toISOString()
                };
                if (db && currentProjectId) {
                    await updateDoc(doc(db, "projects", currentProjectId), updatedFields);
                }
                currentProjectData = { ...(currentProjectData || {}), ...updatedFields };
                renderSubscriptionAndInvoiceCard(currentProjectData);
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
                if (!currentProjectData.messages) currentProjectData.messages = [];
                const updatedMsgs = [...currentProjectData.messages, msgObj];
                if (db && currentProjectId) {
                    await updateDoc(doc(db, "projects", currentProjectId), {
                        ...updatedFields,
                        messages: updatedMsgs
                    });
                }
                currentProjectData.messages = updatedMsgs;
                Object.assign(currentProjectData, updatedFields);
                renderSubscriptionAndInvoiceCard(currentProjectData);
                if (typeof renderAdminMessages === 'function') {
                    renderAdminMessages(currentProjectData.messages);
                }
                await logAuditEvent('2027_plan_ticket_sent', `2027 Abonnementsvoorstel als ticket in klantenportaal geplaatst voor ${proj.client || 'klant'}.`);
            }
        });
    });

    // 8. Action: Send Design to Client (Opens Phase 3 Design Studio Modal)
    const openPhase3Modal = () => {
        const modal = document.getElementById('phase3-design-modal');
        if (!modal) return;

        const p = currentProjectData || {};
        const clientDomain = p.domainName || p.domain || '';
        const defaultStagingUrl = p.stagingUrl || p.demoUrl || (clientDomain ? `https://${clientDomain}` : 'https://creationaltfix.nl');

        const designUrlInput = document.getElementById('edit-designUrl')?.value.trim() || p.designUrl || p.figmaUrl || defaultStagingUrl;
        
        document.getElementById('modal-design-title').value = p.designTitle || `Visueel Ontwerp & Concept • ${p.client || 'Klant'}`;
        document.getElementById('modal-design-url').value = designUrlInput;
        document.getElementById('modal-design-notes').value = p.designNotes || (p.design ? `Ontwerp afgestemd op de stijlvoorkeuren: "${p.design}".` : '');
        document.getElementById('modal-ai-image-prompt').value = p.designAiPrompt || '';

        modal.classList.remove('hidden');
    };

    document.getElementById('btn-action-design')?.addEventListener('click', openPhase3Modal);

    // Modal Close Triggers
    document.getElementById('btn-close-design-modal-x')?.addEventListener('click', () => {
        document.getElementById('phase3-design-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-cancel-design-modal')?.addEventListener('click', () => {
        document.getElementById('phase3-design-modal')?.classList.add('hidden');
    });

    // Preset: Live Staging Prototype
    document.getElementById('btn-modal-use-staging')?.addEventListener('click', () => {
        const p = currentProjectData || {};
        const resolved = resolveAdminStagingUrl(p) || `https://demo.creationaltfix.nl/${encodeURIComponent((p.client || 'concept').toLowerCase().replace(/\s+/g, '-'))}`;
        document.getElementById('modal-design-url').value = resolved;
        alert(`✓ Live staging prototype link gekoppeld: ${resolved}`);
    });

    // Preset: Generate AI Concept & Google Imagen / Banana Prompt
    document.getElementById('btn-modal-gen-ai-concept')?.addEventListener('click', async () => {
        const genBtn = document.getElementById('btn-modal-gen-ai-concept');
        const origText = genBtn.innerHTML;
        genBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI Concept Genereren...';
        genBtn.disabled = true;

        try {
            const p = currentProjectData || {};
            const concept = await generateVisualDesignConcept(p);

            document.getElementById('modal-design-title').value = concept.conceptTitle || '';
            document.getElementById('modal-ai-image-prompt').value = concept.aiImagePrompt || '';
            document.getElementById('modal-design-notes').value = concept.designRationale || '';
            if (concept.suggestedPrototypeUrl && !document.getElementById('modal-design-url').value) {
                document.getElementById('modal-design-url').value = concept.suggestedPrototypeUrl;
            }
        } catch (err) {
            console.error("Fout bij genereren AI design concept:", err);
            alert("Kon AI concept niet genereren: " + err.message);
        } finally {
            genBtn.innerHTML = origText;
            genBtn.disabled = false;
        }
    });

    // Copy AI Image Generator Prompt
    document.getElementById('btn-copy-ai-image-prompt')?.addEventListener('click', () => {
        const promptVal = document.getElementById('modal-ai-image-prompt')?.value || '';
        if (!promptVal) {
            alert("Genereer eerst een AI prompt via de knop hierboven.");
            return;
        }
        navigator.clipboard.writeText(promptVal);
        alert("Google Imagen / Banana prompt gekopieerd naar klembord!");
    });

    // Confirm Send Design (Fase 3 Activeren)
    document.getElementById('btn-confirm-send-design')?.addEventListener('click', async () => {
        if (!db || !currentProjectId) return;
        const designUrl = document.getElementById('modal-design-url')?.value.trim();
        const designTitle = document.getElementById('modal-design-title')?.value.trim() || 'Visueel Ontwerp & Wireframe';
        const designNotes = document.getElementById('modal-design-notes')?.value.trim() || '';
        const designAiPrompt = document.getElementById('modal-ai-image-prompt')?.value.trim() || '';

        if (!designUrl) {
            alert("Vul een geldige prototype, Google Imagen/Banana mockup URL of staging link in.");
            return;
        }

        const confirmBtn = document.getElementById('btn-confirm-send-design');
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opleveren...';
        confirmBtn.disabled = true;

        try {
            const updated = {
                designUrl: designUrl,
                figmaUrl: designUrl,
                designTitle: designTitle,
                designNotes: designNotes,
                designAiPrompt: designAiPrompt,
                status: "Design Gereed voor Review",
                statusClass: "active",
                designSentAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "projects", currentProjectId), updated);
            currentProjectData = { ...currentProjectData, ...updated };

            // Update edit input on tab-intake as well
            const intakeInput = document.getElementById('edit-designUrl');
            if (intakeInput) intakeInput.value = designUrl;

            await logAuditEvent('design_sent', `Design concept opgeleverd naar klantportaal: ${designTitle} (${designUrl})`);
            
            document.getElementById('phase3-design-modal')?.classList.add('hidden');
            alert("🎉 Design concept is succesvol klaargezet in het klantenportaal!");
            renderProjectWorkspace(currentProjectData);
        } catch (err) {
            console.error("Fout bij versturen design:", err);
            alert("Fout: " + err.message);
        } finally {
            confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 🚀 Design Opleveren (Fase 3 Activeren)';
            confirmBtn.disabled = false;
        }
    });

    // 9. Action: Invoice + Mollie (Open Modal)
    document.getElementById('btn-action-mollie')?.addEventListener('click', () => {
        const modal = document.getElementById('mollie-config-modal');
        if (!modal) return;
        const p = currentProjectData || {};
        document.getElementById('modal-mollie-url-input').value = p.mollieLink || '';
        document.getElementById('modal-mollie-amount-input').value = p.proposalPrice ? `€ ${p.proposalPrice}` : '';
        modal.classList.remove('hidden');
    });

    document.getElementById('btn-close-mollie-modal')?.addEventListener('click', () => {
        document.getElementById('mollie-config-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-cancel-mollie-modal')?.addEventListener('click', () => {
        document.getElementById('mollie-config-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-save-mollie-link')?.addEventListener('click', async () => {
        if (!db || !currentProjectId) return;
        const mollieUrl = document.getElementById('modal-mollie-url-input')?.value.trim();
        if (!mollieUrl) {
            alert("Voer een geldige Mollie Plink / betaal-URL in.");
            return;
        }

        try {
            const updated = {
                status: "Fase 5: Wacht op Betaling (Mollie)",
                statusClass: "payment",
                mollieLink: mollieUrl
            };
            await updateDoc(doc(db, "projects", currentProjectId), updated);
            currentProjectData = { ...currentProjectData, ...updated };

            await logAuditEvent('mollie_generated', `Mollie betaallink gekoppeld (${mollieUrl}) en status gewijzigd naar Fase 5: Wacht op Betaling (Mollie).`);
            document.getElementById('mollie-config-modal')?.classList.add('hidden');
            alert(`✓ Mollie factuurverzoek is succesvol klaargezet in het klantenportaal!\n\nStatus: Fase 5: Wacht op Betaling (Mollie)\nBetaallink:\n${mollieUrl}`);
            renderProjectWorkspace(currentProjectData);
        } catch (err) {
            alert("Fout bij opslaan Mollie link: " + err.message);
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
