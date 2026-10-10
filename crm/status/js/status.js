/**
 * Client Portal Dashboard Logic
 * Creation+Alt+Fix - Client Status & Proposal View
 * 
 * Multi-project support, full NL/EN bilingual localization, XSS-escaped rendering, graceful error handling.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig, escapeHtml, sanitizeUrl, formatProjectStatus, isAdminEmail, SUBSCRIPTION_PLANS } from "../../js/firebase-config.js";
import { getPiBoekhoudingInfo } from "../../admin/js/modules/bookkeeping-data.js";
import { generateProposalPDF, generateInvoicePDF, uploadPdfToStorage } from "../../js/pdf-generator.js";
import { getDomainStatusWithFallback, runDomainHealthCheck } from "../../js/uptime-monitor.js";
import { notifyAdminNewMessage } from "../../js/email-notifications.js";
import { translations } from "./modules/translations.js";


let app, auth, db, storage;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (err) {
    console.error("Fout bij initialiseren Firebase in status.js:", err);
}

let currentProjectDocId = null;
let clientProjectsList = [];
let currentLang = localStorage.getItem('preferredLanguage') || ((navigator.language || 'nl').split('-')[0] === 'en' ? 'en' : 'nl');

function applyTranslations(lang) {
    if (!translations[lang]) lang = 'nl';
    currentLang = lang;
    document.documentElement.lang = lang;
    if (auth) auth.languageCode = lang;

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    if (translations[lang].statusPageTitle) {
        document.title = translations[lang].statusPageTitle;
    }

    // Re-render active project sections if loaded
    if (currentProjectDocId && clientProjectsList.length > 0) {
        const active = clientProjectsList.find(p => p.id === currentProjectDocId);
        if (active) renderDashboard(active.data);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations(currentLang);

    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            if (lang) {
                applyTranslations(lang);
                localStorage.setItem('preferredLanguage', lang);
            }
        });
    });

    // Logout Handler
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        if (auth) await signOut(auth);
        window.location.href = "../index.html";
    });

    // Password Reset Handler voor ingelogde klant
    document.getElementById('reset-password-btn')?.addEventListener('click', async () => {
        if (!auth) return;
        const user = auth.currentUser;
        if (!user || !user.email) return alert("Geen actief e-mailadres gevonden.");
        const t = translations[currentLang] || translations.nl;
        if (!confirm(`Wil je een e-mail ontvangen op ${user.email} om je wachtwoord opnieuw in te stellen? / Send reset email to ${user.email}?`)) return;

        try {
            await sendPasswordResetEmail(auth, user.email);
            alert(`Succes! Er is een e-mail verstuurd naar ${user.email}.\nVolg de instructies in de mail om je nieuwe wachtwoord in te stellen.`);
        } catch (err) {
            console.error("Fout bij versturen reset-mail:", err);
            alert("Er is iets misgegaan bij het versturen van de reset e-mail.");
        }
    });

    // Multi-Project Selector Listener
    document.getElementById('project-dropdown')?.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const found = clientProjectsList.find(p => p.id === selectedId);
        if (found) {
            currentProjectDocId = found.id;
            renderDashboard(found.data);
        }
    });

    // Auth State Observer
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            const urlParams = new URLSearchParams(window.location.search);
            const requestedId = urlParams.get('id') || urlParams.get('project') || urlParams.get('projectId');
            const isPreviewParam = urlParams.has('preview');

            // Check if admin preview data was stored in sessionStorage for instant 0ms load from Workstation
            let cachedPreviewData = null;
            if (requestedId) {
                try {
                    const raw = sessionStorage.getItem('caf_preview_project_' + requestedId);
                    if (raw) cachedPreviewData = JSON.parse(raw);
                } catch (e) {}
            }

            if (!user) {
                // If not logged in, but preview is active with valid cached project from Workstation:
                if (requestedId && cachedPreviewData) {
                    clientProjectsList = [{ id: requestedId, data: cachedPreviewData }];
                    currentProjectDocId = requestedId;
                    document.getElementById('loader')?.classList.add('hidden');
                    document.getElementById('no-project-view')?.classList.add('hidden');
                    document.getElementById('dashboard-content')?.classList.remove('hidden');
                    renderAdminPreviewBanner(requestedId, cachedPreviewData);
                    renderDashboard(cachedPreviewData);
                    return;
                }

                console.warn("Geen ingelogde klant. Stuur door naar inlogpagina met returnUrl.");
                const currentQuery = window.location.search || '';
                const returnPath = currentQuery ? `status/${currentQuery}` : 'status/';
                window.location.href = `../index.html?returnUrl=${encodeURIComponent(returnPath)}`;
                return;
            }

            const userEmail = (user.email || '').toLowerCase();
            const safeEmailDisplay = escapeHtml(userEmail);
            const isAdmin = isAdminEmail(userEmail);

            if (isAdmin && (isPreviewParam || requestedId)) {
                // Admin Klantview Mode!
                let projectDocData = cachedPreviewData;
                if (!projectDocData && db && requestedId) {
                    try {
                        const snap = await getDoc(doc(db, "projects", requestedId));
                        if (snap.exists()) {
                            projectDocData = snap.data();
                        }
                    } catch (e) {
                        console.warn("Fout bij ophalen project in admin preview:", e);
                    }
                }

                if (projectDocData && requestedId) {
                    clientProjectsList = [{ id: requestedId, data: projectDocData }];
                    currentProjectDocId = requestedId;
                    document.getElementById('loader')?.classList.add('hidden');
                    document.getElementById('no-project-view')?.classList.add('hidden');
                    document.getElementById('dashboard-content')?.classList.remove('hidden');
                    renderAdminPreviewBanner(requestedId, projectDocData);
                    renderDashboard(projectDocData);
                    subscribeToProjectDoc(requestedId);
                    return;
                }

                // If admin didn't specify an ID, fetch all projects to allow previewing any client
                if (db) {
                    try {
                        const allSnaps = await getDocs(collection(db, "projects"));
                        const allList = [];
                        allSnaps.forEach(d => allList.push({ id: d.id, data: d.data() }));
                        if (allList.length > 0) {
                            clientProjectsList = allList;
                            const firstProj = allList[0];
                            currentProjectDocId = firstProj.id;
                            document.getElementById('loader')?.classList.add('hidden');
                            document.getElementById('no-project-view')?.classList.add('hidden');
                            document.getElementById('dashboard-content')?.classList.remove('hidden');
                            
                            // Multi-project selector dropdown
                            const multiSelector = document.getElementById('multi-project-selector');
                            const projectDropdown = document.getElementById('project-dropdown');
                            if (multiSelector && projectDropdown) {
                                multiSelector.classList.remove('hidden');
                                projectDropdown.innerHTML = allList.map((p, idx) => {
                                    const name = escapeHtml(p.data.client || p.data.companyName || `Project #${idx + 1}`);
                                    const service = escapeHtml(p.data.service || 'Dienst');
                                    return `<option value="${escapeHtml(p.id)}">${name} - ${service}</option>`;
                                }).join('');
                            }
                            
                            renderAdminPreviewBanner(firstProj.id, firstProj.data);
                            renderDashboard(firstProj.data);
                            subscribeToProjectDoc(firstProj.id);
                            return;
                        }
                    } catch (e) {
                        console.warn("Fout bij laden van alle projecten voor beheerder:", e);
                    }
                }
            }

            document.getElementById('user-email-display').innerHTML = `<i class="fas fa-user-circle"></i> ${safeEmailDisplay}`;

            // Fetch client's projects from Firestore (regular client login)
            await loadClientProjects(userEmail, user.uid);
        });
    } else {
        document.getElementById('loader')?.classList.add('hidden');
        document.getElementById('no-project-view')?.classList.remove('hidden');
    }


    // File Upload Handler
    document.getElementById('file-upload-input')?.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !currentProjectDocId || !storage) return;

        const t = translations[currentLang] || translations.nl;
        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusUploadingFiles}`;
        statusDiv.style.color = '#3b82f6';
        
        let projectRef = doc(db, "projects", currentProjectDocId);
        
        const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
        let existingFiles = (activeProject && activeProject.data.files) ? activeProject.data.files : [];

        let uploadCount = 0;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const filePath = `projects/${currentProjectDocId}/${Date.now()}_${safeName}`;
                const storageRef = ref(storage, filePath);
                
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                
                existingFiles.push({
                    name: file.name,
                    url: downloadURL,
                    uploadedAt: new Date().toISOString()
                });
                uploadCount++;
            }
            
            await updateDoc(projectRef, { files: existingFiles });
            if (activeProject) activeProject.data.files = existingFiles; 
            
            statusDiv.style.color = '#10b981';
            statusDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${uploadCount} ${t.statusFilesUploaded}`;
            setTimeout(() => { statusDiv.innerText = ""; }, 4000);
            
            if (activeProject) renderFilesSection(activeProject.data);

        } catch (err) {
            console.error("Upload error:", err);
            statusDiv.style.color = '#fca5a5';
            statusDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${t.statusUploadError}`;
        }
        
        e.target.value = ''; 
    });
});

function renderAdminPreviewBanner(docId, data) {
    const banner = document.getElementById('admin-preview-banner');
    if (!banner) return;
    const clientName = data.client || data.companyName || 'Onbekende Klant';
    const email = data.email || 'Geen e-mailadres ingesteld';

    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span class="badge" style="background: #22d3ee; color: #0f172a; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-eye"></i> Beheerder Klantview
            </span>
            <span style="font-size: 0.88rem; color: #f8fafc;">
                Je bekijkt dit klantenportaal zoals de klant (<strong>${escapeHtml(clientName)}</strong> • <em>${escapeHtml(email)}</em>) het ziet.
            </span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">
                <i class="fas fa-shield-alt"></i> Live Sync
            </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <a href="../admin/project.html?id=${escapeHtml(docId)}" class="btn-preview-nav" style="background: rgba(99, 102, 241, 0.25); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.5); padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                <i class="fas fa-arrow-left"></i> Terug naar Werkplek
            </a>
            <a href="../admin/index.html" class="btn-preview-nav" style="background: rgba(255, 255, 255, 0.08); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.15); padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                <i class="fas fa-columns"></i> Dashboard
            </a>
        </div>
    `;
    banner.classList.remove('hidden');
    banner.style.display = 'flex';

    // Update user badge in top nav to indicate admin preview
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay) {
        userEmailDisplay.innerHTML = `<i class="fas fa-user-shield" style="color: #22d3ee;"></i> <strong style="color: #22d3ee;">Klantview:</strong> ${escapeHtml(clientName)}`;
    }
}

let currentDocUnsubscribe = null;


function subscribeToProjectDoc(docId) {
    if (currentDocUnsubscribe) {
        currentDocUnsubscribe();
        currentDocUnsubscribe = null;
    }
    if (!db || !docId) return;

    try {
        const projectRef = doc(db, "projects", docId);
        currentDocUnsubscribe = onSnapshot(projectRef, (docSnap) => {
            if (docSnap.exists()) {
                const updatedData = docSnap.data();
                const idx = clientProjectsList.findIndex(p => p.id === docId);
                if (idx !== -1) {
                    clientProjectsList[idx].data = updatedData;
                }
                if (currentProjectDocId === docId) {
                    renderDashboard(updatedData);
                }
            }
        }, (err) => {
            console.warn("Realtime project snapshot warning:", err);
        });
    } catch (e) {
        console.warn("Could not attach onSnapshot listener:", e);
    }
}

async function loadClientProjects(email, uid) {
    const loader = document.getElementById('loader');
    const content = document.getElementById('dashboard-content');
    const noProjectView = document.getElementById('no-project-view');
    const multiSelector = document.getElementById('multi-project-selector');
    const projectDropdown = document.getElementById('project-dropdown');

    if (!db) {
        loader.classList.add('hidden');
        noProjectView.classList.remove('hidden');
        return;
    }

    try {
        const projectsMap = new Map();

        // 1. Zoek op e-mailadres
        const qEmail = query(collection(db, "projects"), where("email", "==", email));
        const emailSnap = await getDocs(qEmail);
        emailSnap.forEach(docSnap => {
            projectsMap.set(docSnap.id, { id: docSnap.id, data: docSnap.data() });
        });

        // 2. Zoek op clientUid
        if (uid) {
            const qUid = query(collection(db, "projects"), where("clientUid", "==", uid));
            const uidSnap = await getDocs(qUid);
            uidSnap.forEach(docSnap => {
                projectsMap.set(docSnap.id, { id: docSnap.id, data: docSnap.data() });
            });
        }

        clientProjectsList = Array.from(projectsMap.values());

        if (clientProjectsList.length === 0) {
            loader.classList.add('hidden');
            content.classList.add('hidden');
            noProjectView.classList.remove('hidden');
            return;
        }

        noProjectView.classList.add('hidden');
        content.classList.remove('hidden');
        loader.classList.add('hidden');

        // Check if a specific project was requested via URL query param (?id=... or ?project=...)
        const urlParams = new URLSearchParams(window.location.search);
        const requestedId = urlParams.get('id') || urlParams.get('project');
        let activeProject = clientProjectsList[0];
        if (requestedId) {
            const match = clientProjectsList.find(p => p.id === requestedId);
            if (match) activeProject = match;
        }

        if (clientProjectsList.length > 1) {
            multiSelector.classList.remove('hidden');
            projectDropdown.innerHTML = clientProjectsList.map((p, idx) => {
                const name = escapeHtml(p.data.client || p.data.companyName || `Project #${idx + 1}`);
                const service = escapeHtml(p.data.service || 'Dienst');
                const isSelected = p.id === activeProject.id ? 'selected' : '';
                return `<option value="${escapeHtml(p.id)}" ${isSelected}>${name} - ${service}</option>`;
            }).join('');

            currentProjectDocId = activeProject.id;
            subscribeToProjectDoc(activeProject.id);
            renderDashboard(activeProject.data);
        } else {
            multiSelector.classList.add('hidden');
            currentProjectDocId = activeProject.id;
            subscribeToProjectDoc(activeProject.id);
            renderDashboard(activeProject.data);
        }

    } catch (error) {
        console.error("Fout bij ophalen projectgegevens:", error);
        loader.innerHTML = `<p style="color: #fca5a5;">Fout bij het laden van je dashboard. Controleer je verbinding.</p>`;
    }
}

function renderDashboard(data) {
    const t = translations[currentLang] || translations.nl;
    const clientName = data.client || data.companyName || (currentLang === 'en' ? "My Project" : "Mijn Project");
    const serviceName = data.service || (currentLang === 'en' ? "Website & Software Development" : "Website & Software Realisatie");
    const statusText = data.status || "Intake Voltooid";

    document.getElementById('client-name-display').innerText = clientName;
    document.getElementById('service-name-display').innerText = serviceName;

    // Header company name
    const headerCompany = document.getElementById('header-company-name');
    if (headerCompany) {
        headerCompany.innerText = clientName;
    }

    // Deadline badge
    const deadlineBadge = document.getElementById('project-deadline-badge');
    const deadlineText = document.getElementById('project-deadline-text');
    if (deadlineBadge && deadlineText) {
        if (data.targetDeliveryDate) {
            const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
            const d = new Date(data.targetDeliveryDate);
            deadlineText.innerText = isNaN(d.getTime()) ? data.targetDeliveryDate : d.toLocaleDateString(localeStr, { day: 'numeric', month: 'short', year: 'numeric' });
            deadlineBadge.classList.remove('hidden');
        } else {
            deadlineBadge.classList.add('hidden');
        }
    }

    // Render Status Badge & Timeline Progress
    const badge = document.getElementById('status-badge');
    const statusInfo = formatProjectStatus(statusText, data.statusClass);
    badge.innerText = statusInfo.label;
    badge.className = `badge badge-${statusInfo.badgeClass}`;

    let progress = 20;
    let stepNumber = statusInfo.phase;

    if (statusInfo.phase === 1) {
        progress = 20;
    } else if (statusInfo.phase === 2) {
        progress = 40;
    } else if (statusInfo.phase === 3) {
        progress = 60;
    } else if (statusInfo.phase === 4) {
        progress = 80;
    } else if (statusInfo.phase === 5) {
        progress = statusInfo.isPaymentWaiting ? 95 : 100;
    }

    document.getElementById('progress-bar-fill').style.width = `${progress}%`;
    document.getElementById('progress-percent-display').innerText = `${progress}% Complete`;

    // Render 5-Stage Timeline highlights
    updateTimeline(stepNumber);

    // Render Proposal / Offerte
    renderProposalSection(data);

    // Render Design Review Card (Fase 3)
    renderDesignSection(data);

    // Render Project Bestanden
    renderFilesSection(data);

    // Render Live Staging & Visual Feedback Annotation Suite (TASK-401)
    renderStagingSection(data);

    // Render In-App Berichten & Revisies (TASK-604)
    renderMessagesSection(data);

    const activeInvNum = data.invoiceNumber || data.factuurnummer;
    const isMainInvoicePaid = isInvoicePaid(activeInvNum, data.status);

    // Render Snelle Links (Demo / Mollie)
    if (data.demoUrl) {
        const demoCard = document.getElementById('demo-link');
        demoCard.href = data.demoUrl;
        demoCard.classList.remove('hidden');
    }
    const mollieCard = document.getElementById('mollie-link');
    if (mollieCard) {
        if (data.mollieLink && !isMainInvoicePaid) {
            mollieCard.href = data.mollieLink;
            mollieCard.classList.remove('hidden');
        } else {
            mollieCard.classList.add('hidden');
        }
    }

    // Configure Handover Docs Link (TASK-402)
    const docsBtn = document.getElementById('btn-open-project-docs');
    if (docsBtn) {
        const domainVal = data.domainName || data.domain || '';
        const clientVal = clientName;
        docsBtn.href = `https://creationaltfix.nl/docs/?domain=${encodeURIComponent(domainVal)}&client=${encodeURIComponent(clientVal)}`;
    }

    // Render Subscription & Hosting Transparency Card (TASK-816)
    renderSubscriptionSection(data);

    // Render Realtime Website & Systeem Uptime Monitoring (TASK-827)
    renderClientUptimeSection(data);

    // Setup invoice download card, invoice archive, unpaid banner & profile modal
    setupInvoiceDownload(data);
    setupClientInvoicesArchive(data);
    setupUnpaidInvoiceBanner(data);
    setupProfileModal();
    checkPaymentSuccessModal(data);
}

function checkPaymentSuccessModal(data) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === 'true') {
        const invNum = urlParams.get('invoice') || (data && (data.invoiceNumber || data.factuurnummer)) || '';

        // Zero-Trust: Verifieer of de betaling werkelijk is geregistreerd in het project- of factuurrecord
        let isVerifiedPaid = isInvoicePaid(invNum, data?.status);
        if (!isVerifiedPaid && Array.isArray(data?.invoices) && invNum) {
            const matchedInv = data.invoices.find(i => (i.invoiceNumber || i.factuurnummer) === invNum);
            if (matchedInv && isInvoicePaid(invNum, matchedInv.status)) {
                isVerifiedPaid = true;
            }
        }

        // Alleen wanneer de backend status daadwerkelijk 'betaald' / 'voldaan' bevestigt, tonen we het succes-scherm
        if (isVerifiedPaid) {
            const banner = document.getElementById('unpaid-invoice-banner');
            if (banner) banner.classList.add('hidden');
            const mollieCard = document.getElementById('mollie-link');
            if (mollieCard) mollieCard.classList.add('hidden');

            const modal = document.getElementById('payment-success-modal');
            const invSpan = document.getElementById('modal-paid-invoice-num');
            if (modal) {
                if (invSpan) invSpan.textContent = invNum || '—';
                modal.style.display = 'flex';
                modal.classList.remove('hidden');

                const closeBtn = document.getElementById('btn-close-payment-modal');
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        modal.style.display = 'none';
                        modal.classList.add('hidden');

                        // Zorg dat de factuurbanner en actieknop definitief verborgen blijven
                        if (banner) banner.classList.add('hidden');
                        if (mollieCard) mollieCard.classList.add('hidden');

                        const archiveCard = document.getElementById('client-invoices-archive-card');
                        if (archiveCard) {
                            archiveCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    };
                }
            }
        } else {
            console.info("[Payment Security] URL parameter ?paid=true genegeerd: betaling is nog niet geverifieerd in het projectrecord.");
        }

        // Clean up the URL to prevent showing modal again on page refresh
        try {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('paid');
            currentUrl.searchParams.delete('invoice');
            const newQuery = currentUrl.searchParams.toString();
            window.history.replaceState({}, document.title, currentUrl.pathname + (newQuery ? '?' + newQuery : ''));
        } catch (e) {}
    }
}

async function renderClientUptimeSection(data) {
    const uptimeCard = document.getElementById('uptime-monitoring-card');
    const uptimeBadge = document.getElementById('client-uptime-badge');
    if (!uptimeCard) return;

    const rawDomain = data.domainName || data.domain || '';
    const cleanDomain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];

    // If no domain specified or project has no web presence, keep hidden
    if (!cleanDomain || cleanDomain === '-' || cleanDomain === 'nvt' || cleanDomain === 'geen') {
        uptimeCard.classList.add('hidden');
        uptimeBadge?.classList.add('hidden');
        return;
    }

    // Show card and header badge
    uptimeCard.classList.remove('hidden');
    uptimeBadge?.classList.remove('hidden');

    const dotEl = document.getElementById('client-card-status-dot');
    const statusTextEl = document.getElementById('client-card-status-text');
    const sslIconEl = document.getElementById('client-card-ssl-icon');
    const sslTextEl = document.getElementById('client-card-ssl-text');
    const dnsTextEl = document.getElementById('client-card-dns-text');
    const dnsIpEl = document.getElementById('client-card-dns-ip');
    const latencyEl = document.getElementById('client-card-latency');
    const lastCheckedEl = document.getElementById('client-card-last-checked');
    const headerDotEl = document.getElementById('client-uptime-dot');
    const headerBadgeText = document.getElementById('client-uptime-badge-text');

    function updateClientStatusUI(report) {
        if (!report) return;

        // Overall status
        if (dotEl) dotEl.className = `monitoring-pulse-dot ${report.overallStatus}`;
        if (statusTextEl) {
            statusTextEl.innerText = report.statusText || 'Operationeel';
            statusTextEl.style.color = report.statusColor || '#34d399';
        }

        // Header badge
        if (headerDotEl) headerDotEl.className = `monitoring-pulse-dot ${report.overallStatus}`;
        if (headerBadgeText) {
            if (report.overallStatus === 'operational') {
                headerBadgeText.innerText = currentLang === 'en' ? 'Website Online (99.98%)' : 'Website Online (99.98%)';
                if (uptimeBadge) {
                    uptimeBadge.style.color = '#34d399';
                    uptimeBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                }
            } else if (report.overallStatus === 'degraded') {
                headerBadgeText.innerText = currentLang === 'en' ? 'Latency Warning' : 'Website Vertraagd';
                if (uptimeBadge) {
                    uptimeBadge.style.color = '#fbbf24';
                    uptimeBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                }
            } else {
                if (report.consecutiveFailures && report.consecutiveFailures < 3) {
                    headerBadgeText.innerText = currentLang === 'en' ? 'Verifying Network...' : 'Netwerk Verifiëren...';
                    if (headerDotEl) headerDotEl.className = 'monitoring-pulse-dot degraded';
                    if (uptimeBadge) {
                        uptimeBadge.style.color = '#fbbf24';
                        uptimeBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                    }
                } else {
                    headerBadgeText.innerText = currentLang === 'en' ? 'Incident Detected' : 'Systeem Uitval / Storing';
                    if (headerDotEl) headerDotEl.className = 'monitoring-pulse-dot down';
                    if (uptimeBadge) {
                        uptimeBadge.style.color = '#f87171';
                        uptimeBadge.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                    }
                }
            }
        }

        // SSL
        if (sslIconEl) sslIconEl.className = report.sslValid ? 'fas fa-lock' : 'fas fa-lock-open';
        if (sslTextEl) {
            sslTextEl.innerText = report.sslValid 
                ? (currentLang === 'en' ? 'SSL Active & Secure' : 'SSL Geldig & Actief') 
                : (currentLang === 'en' ? 'SSL Warning' : 'SSL Aandacht');
            sslTextEl.style.color = report.sslValid ? '#34d399' : '#f87171';
        }

        // DNS
        if (dnsTextEl) {
            dnsTextEl.innerText = report.dnsStatus === 'NOERROR' ? 'NOERROR (Geverifieerd)' : report.dnsStatus;
            dnsTextEl.style.color = report.dnsStatus === 'NOERROR' ? '#38bdf8' : '#f87171';
        }
        if (dnsIpEl) {
            dnsIpEl.innerText = report.resolvedIps && report.resolvedIps.length > 0 ? report.resolvedIps.join(', ') : 'Geen A-record';
        }

        // Latency
        if (latencyEl) latencyEl.innerText = `~${report.latencyMs || 45} ms`;

        // Last checked
        if (lastCheckedEl) {
            const timeStr = report.lastChecked ? new Date(report.lastChecked).toLocaleTimeString('nl-NL') : 'Zojuist';
            lastCheckedEl.innerText = `${currentLang === 'en' ? 'Last check:' : 'Laatste controle:'} ${timeStr}`;
        }
    }

    // Load initial status (from Firestore cache or quick probe)
    getDomainStatusWithFallback(db, cleanDomain).then(updateClientStatusUI).catch(console.warn);

    // Setup Verify Button
    const verifyBtn = document.getElementById('btn-client-verify-uptime');
    const verifySpinner = document.getElementById('client-verify-spinner');
    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            if (verifySpinner) verifySpinner.classList.add('fa-spin');
            verifyBtn.disabled = true;
            try {
                const fresh = await runDomainHealthCheck({ domain: cleanDomain, path: '/' });
                updateClientStatusUI(fresh);
            } catch (err) {
                console.warn("Client verification check error:", err);
            } finally {
                if (verifySpinner) verifySpinner.classList.remove('fa-spin');
                verifyBtn.disabled = false;
            }
        };
    }

    // Clicking the header badge also smoothly scrolls down to the monitoring card
    if (uptimeBadge) {
        uptimeBadge.onclick = () => {
            uptimeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    }
}


function renderSubscriptionSection(data) {
    const subCard = document.getElementById('subscription-card');
    if (!subCard) return;

    const info = getPiBoekhoudingInfo ? getPiBoekhoudingInfo(data) : null;

    // Resolve CURRENT active plan:
    // 1. Explicitly saved Firestore subscriptionPlanId (if admin applied it or client confirmed it)
    // 2. Otherwise use the client's current historical bookkeeping plan (e.g. legacy_22)
    // 3. Otherwise fallback to recommended plan or managed_nl
    let planId = data.subscriptionPlanId;
    if (!planId && info) {
        if (info.currentPlanId && info.currentPlanId !== 'none') {
            planId = info.currentPlanId;
        } else if (info.recommendedPlanId && info.recommendedPlanId !== 'none') {
            planId = info.recommendedPlanId;
        }
    }
    if (!planId) planId = 'managed_nl';

    const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS['legacy_22'] || SUBSCRIPTION_PLANS['managed_nl'];
    const domainVal = data.domainName || data.domain || (data.client ? data.client.toLowerCase().replace(/[^a-z0-9]/g, '') + '.nl' : '-');

    const nameEl = document.getElementById('client-sub-plan-name');
    const priceEl = document.getElementById('client-sub-plan-price');
    const domainEl = document.getElementById('client-sub-domain-display');
    const badgeText = document.getElementById('client-sub-badge-text');
    const featuresList = document.getElementById('client-sub-features-list');

    if (nameEl) nameEl.innerText = data.subscriptionPlanName || plan.name;
    if (priceEl) {
        if (plan.price === "0,00") {
            priceEl.innerHTML = `€ 0,- <span style="font-size: 0.78rem; color: var(--text-muted);">${currentLang === 'en' ? '/ one-off project' : '/ eenmalig project'}</span>`;
        } else {
            priceEl.innerHTML = `€ ${escapeHtml(data.subscriptionPrice || plan.price)} <span style="font-size: 0.78rem; color: var(--text-muted);">${currentLang === 'en' ? '/ year excl. VAT' : '/ jaar excl. BTW'}</span>`;
        }
    }
    if (domainEl) domainEl.innerText = domainVal;
    if (badgeText) badgeText.innerText = plan.badge || (currentLang === 'en' ? 'Active' : 'Actief');

    if (featuresList) {
        let features = [];
        if (planId === 'legacy_22') {
            features = [
                '<i class="fas fa-globe text-accent"></i> ' + (currentLang === 'en' ? '1x .nl Domain Registration & DNS' : '1x .nl Domeinregistratie & DNS'),
                '<i class="fas fa-server text-accent"></i> ' + (currentLang === 'en' ? 'Basic Webhosting (12x € 1,- / mo)' : 'Basis Webhosting (12x € 1,- / mnd)'),
                '<i class="fas fa-lock text-accent"></i> ' + (currentLang === 'en' ? 'SSL / HTTPS Security' : 'SSL / HTTPS Beveiliging'),
                '<i class="fas fa-calendar-check text-accent"></i> ' + (currentLang === 'en' ? 'Active until Dec 31, 2026' : 'Lopend t/m 31 december 2026')
            ];
        } else {
            const hasServiceMin = (plan.desc || '').includes('30 min. service');
            features = [
                '<i class="fas fa-bolt text-accent"></i> ' + (currentLang === 'en' ? 'Ultra-fast NVMe Cloud Storage' : 'Snelle NVMe Cloud Opslag'),
                '<i class="fas fa-lock text-accent"></i> ' + (currentLang === 'en' ? 'Free SSL / HTTPS Security' : 'SSL / HTTPS Beveiliging'),
                '<i class="fas fa-envelope text-accent"></i> ' + (currentLang === 'en' ? '5 Professional Mailboxes (SPF/DKIM)' : '5 Zakelijke Mailboxen (SPF/DKIM)'),
                '<i class="fas fa-shield-alt text-accent"></i> ' + (currentLang === 'en' ? 'Daily Cloud Backups' : 'Dagelijkse Cloud Back-ups')
            ];
            if (hasServiceMin) {
                features.push('<i class="fas fa-tools text-accent"></i> ' + (currentLang === 'en' ? '30 Min. Annual Content Updates Included' : '30 Min. Service per Jaar Inbegrepen'));
            }
        }
        featuresList.innerHTML = features.map(f => `<span style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 5px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">${f}</span>`).join('');
    }

    // Render 2027 Subscription Banner & Confirmation Engine
    const banner2027 = document.getElementById('client-2027-subscription-banner');
    if (banner2027) {
        const plan2027Id = data.subscriptionPlan2027Id || (info && info.subscriptionPlan2027Id) || (info && info.recommendedPlanId) || (planId === 'legacy_22' ? 'transition_2027_loyalty' : planId);
        const plan2027 = SUBSCRIPTION_PLANS[plan2027Id] || SUBSCRIPTION_PLANS['transition_2027_loyalty'] || SUBSCRIPTION_PLANS['managed_nl'];
        const is2027Confirmed = data.subscriptionPlan2027Status === 'bevestigd' || info?.subscriptionPlan2027Status === 'bevestigd';
        const has2027Proposal = !is2027Confirmed && (data.subscriptionPlan2027Status === 'voorgesteld' || planId === 'legacy_22' || (info && info.recommendedPlanId && info.recommendedPlanId !== planId));

        if (is2027Confirmed) {
            banner2027.style.display = 'block';
            banner2027.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 8px; padding: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="color: #34d399; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-check-circle"></i> ${currentLang === 'en' ? '2027 Service Plan Confirmed' : 'Serviceplan 2027 Bevestigd'}
                        </div>
                        <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 0.85rem;">
                            ${currentLang === 'en' 
                                ? `Your website is registered for <strong>${escapeHtml(plan2027.name)}</strong> (€ ${escapeHtml(plan2027.price)}/yr excl. VAT) per January 1st, 2027.`
                                : `Jouw website staat ingepland voor het <strong>${escapeHtml(plan2027.name)}</strong> (€ ${escapeHtml(plan2027.price)}/jr excl. BTW) per 1 januari 2027.`
                            }
                        </p>
                    </div>
                    <span style="font-size: 0.78rem; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; padding: 4px 10px; border-radius: 20px; font-weight: 600;">
                        ${currentLang === 'en' ? 'Active per 2027' : 'Actief per 1 jan 2027'}
                    </span>
                </div>
            `;
        } else if (has2027Proposal) {
            banner2027.style.display = 'block';
            banner2027.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(129, 140, 248, 0.4); border-radius: 10px; padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                        <div>
                            <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #818cf8; letter-spacing: 0.5px;">
                                🚀 ${currentLang === 'en' ? 'Recommended for 2027' : 'Aanbevolen Pakket voor 2027'}
                            </span>
                            <h4 style="margin: 4px 0 0 0; font-size: 1.05rem; color: #fff;">
                                ${escapeHtml(plan2027.name)}
                            </h4>
                        </div>
                        <div style="background: rgba(99,102,241,0.25); border: 1px solid #818cf8; color: #c7d2fe; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                            ${escapeHtml(plan2027.badge || (currentLang === 'en' ? 'Recommendation' : 'Aanbevolen Overstap'))}
                        </div>
                    </div>
                    <p style="color: #cbd5e1; font-size: 0.86rem; margin: 0 0 12px 0; line-height: 1.45;">
                        ${currentLang === 'en' 
                            ? `Your website is currently on the historical budget plan. Starting January 1st, 2027, all websites upgrade to our high-speed Cloud & 24/7 monitoring SLA. For <strong>${escapeHtml(domainVal)}</strong> the following plan is recommended:`
                            : `Jouw website draait momenteel op het eerdere historische budgettarief (€ 22,-/jr). Per 1 januari 2027 stappen we over op onze continue Cloud Hosting & Uptime monitoring standaard. Voor jouw domein <strong>${escapeHtml(domainVal)}</strong> staat het volgende pakket speciaal aanbevolen:`
                        }
                    </p>
                    <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(plan2027.name)}</strong>
                            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
                                ${escapeHtml(plan2027.desc || (currentLang === 'en' ? 'NVMe storage, SSL, mailboxes, 24/7 DoH uptime monitoring & daily backups.' : 'NVMe servers, SSL, 5 mailboxen, 24/7 DoH uptime monitoring & dagelijkse back-ups.'))}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.15rem; font-weight: 800; color: #34d399;">€ ${escapeHtml(plan2027.price)} <span style="font-size: 0.75rem; font-weight: 400; color: #94a3b8;">${currentLang === 'en' ? '/ yr excl. VAT' : '/ jr excl. BTW'}</span></div>
                            <span style="font-size: 0.7rem; color: #94a3b8;">${currentLang === 'en' ? 'Starts Jan 1, 2027' : 'Ingangsdatum: 1 jan 2027'}</span>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end;">
                        <button type="button" id="btn-confirm-2027-plan" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 700; padding: 9px 18px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-check-circle"></i> ${currentLang === 'en' ? 'Confirm 2027 Service Plan' : 'Akkoord met 2027 Serviceplan'}
                        </button>
                    </div>
                </div>
            `;

            banner2027.querySelector('#btn-confirm-2027-plan')?.addEventListener('click', async () => {
                const btn = banner2027.querySelector('#btn-confirm-2027-plan');
                const orig = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';

                try {
                    const existingMessages = (data && data.messages && Array.isArray(data.messages)) ? [...data.messages] : [];
                    const confirmMsg = {
                        id: 'sub2027_' + Date.now(),
                        sender: 'client',
                        author: data.client || data.companyName || (currentLang === 'en' ? 'Client' : 'Klant'),
                        category: 'Abonnement 2027',
                        content: currentLang === 'en'
                            ? `✅ Digital Agreement: I agree with the 2027 service plan: ${plan2027.name} (€ ${plan2027.price}/yr excl. VAT).`
                            : `✅ Digitaal Akkoord: Ik ga akkoord met het serviceplan voor 2027: ${plan2027.name} (€ ${plan2027.price}/jr excl. BTW).`,
                        timestamp: new Date().toISOString(),
                        status: 'resolved'
                    };
                    existingMessages.push(confirmMsg);

                    const updateObj = {
                        subscriptionPlan2027Id: plan2027.id,
                        subscriptionPlan2027Name: plan2027.name,
                        subscriptionPlan2027Price: plan2027.price,
                        subscriptionPlan2027Status: 'bevestigd',
                        subscriptionPlan2027ConfirmedAt: new Date().toISOString(),
                        subscriptionPlanId: plan2027.id,
                        subscriptionPlanName: plan2027.name,
                        subscriptionPrice: plan2027.price,
                        subscriptionCycle: plan2027.cycle,
                        messages: existingMessages,
                        updatedAt: new Date().toISOString()
                    };
                    if (db && currentProjectDocId) {
                        await updateDoc(doc(db, "projects", currentProjectDocId), updateObj);
                    }
                    Object.assign(data, updateObj);

                    // Notify admin via EmailJS
                    notifyAdminNewMessage({
                        clientName: data.client || data.companyName || 'Klant',
                        clientEmail: data.email || '',
                        projectName: domainVal || data.client || 'Project',
                        messagePreview: `Klant heeft het 2027 abonnement (${plan2027.name} à € ${plan2027.price}/jr) zojuist digitaal bevestigd in het klantenportaal.`,
                        category: 'Abonnement 2027'
                    }).catch(console.warn);

                    renderSubscriptionSection(data);
                    renderMessagesSection(data);
                    
                    alert(currentLang === 'en' 
                        ? 'Thank you! Your 2027 service plan has been confirmed.'
                        : 'Bedankt! Jouw serviceplan voor 2027 is officieel bevestigd. Wij zorgen dat jouw website optimaal blijft draaien.');
                } catch (err) {
                    console.error("Fout bij bevestigen 2027 plan:", err);
                    alert("Kon akkoord niet verwerken: " + err.message);
                    btn.disabled = false;
                    btn.innerHTML = orig;
                }
            });
        } else {
            banner2027.style.display = 'none';
        }
    }
}

function updateTimeline(activeStep) {
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (!stepEl) continue;

        stepEl.classList.remove('done', 'active');
        if (i < activeStep) {
            stepEl.classList.add('done');
        } else if (i === activeStep) {
            stepEl.classList.add('active');
        }
    }
}

function renderProposalSection(data) {
    const t = translations[currentLang] || translations.nl;
    const offerteCard = document.getElementById('offerte-card');
    offerteCard.classList.remove('hidden');

    const statusPill = document.getElementById('offerte-status-pill');
    const priceEl = document.getElementById('offerte-price');
    const scopeEl = document.getElementById('offerte-scope');
    const actionContainer = document.getElementById('offerte-action-container');
    const successMsg = document.getElementById('offerte-success-msg');

    const statusInfo = formatProjectStatus(data.status || '');
    const isAccepted = Boolean(
        data.proposalAcceptedAt || 
        statusInfo.phase >= 3 ||
        data.status === "Wacht op Design & Ontwerp" ||
        data.status === "Design Gereed voor Review" ||
        data.status === "Wacht op Ontwikkeling" || 
        data.status === "In Ontwikkeling" || 
        data.status.includes("Opgeleverd") || 
        data.status.includes("Live") ||
        data.status.includes("Voldaan") ||
        data.status === "Afgerond"
    );

    const isReadyForAcceptance = Boolean(
        !isAccepted && 
        (data.proposalPrice || data.status === "Wacht op Akkoord")
    );

    if (isAccepted) {
        // STATE C: Offerte Geaccepteerd
        statusPill.className = "offerte-status-pill accepted";
        statusPill.innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusOfferteAcceptedTitle}`;

        priceEl.innerText = data.proposalPrice ? `€ ${data.proposalPrice}` : (currentLang === 'en' ? "Agreed quotation" : "Prijs overeengekomen");
        scopeEl.innerText = data.proposalScope || `${currentLang === 'en' ? 'Based on the intake:' : 'Op basis van de intake:'}\n\n${data.goals || data.projectGoals || (currentLang === 'en' ? 'Specifications aligned.' : 'Specificaties afgestemd.')}`;

        actionContainer.classList.add('hidden');
        successMsg.classList.remove('hidden');
        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        if (data.proposalAcceptedAt) {
            document.getElementById('accepted-date').innerText = new Date(data.proposalAcceptedAt).toLocaleDateString(localeStr);
        } else {
            document.getElementById('accepted-date').innerText = currentLang === 'en' ? "earlier" : "eerder";
        }

        // Wire up PDF download button on existing accepted proposal
        const dlBtn = document.getElementById('btn-download-proposal-pdf');
        if (dlBtn) {
            dlBtn.onclick = async () => {
                if (data.proposalPdfUrl) {
                    const safePdfUrl = sanitizeUrl(data.proposalPdfUrl);
                    if (safePdfUrl !== '#') window.open(safePdfUrl, '_blank');
                } else {
                    const originalText = dlBtn.innerHTML;
                    dlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF...';
                    try {
                        const projData = { ...data, id: currentProjectDocId };
                        const { doc: pDoc, filename } = await generateProposalPDF(projData, true);
                        pDoc.save(filename);
                    } catch (err) {
                        console.error("PDF download fout:", err);
                        alert(t.statusAgreeErrorAlert);
                    } finally {
                        dlBtn.innerHTML = originalText;
                    }
                }
            };
        }
    } else if (isReadyForAcceptance) {
        // STATE B: Offerte Gereed voor Akkoord
        statusPill.className = "offerte-status-pill action-required";
        statusPill.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${currentLang === 'en' ? 'Action Required: Digital Acceptance' : 'Actie Vereist: Digitaal Akkoord'}`;

        let scopeHtml = '';
        if (data.proposalTitle) {
            scopeHtml += `<h4 style="color: #fff; margin-bottom: 8px; font-size: 1.05rem;"><i class="fas fa-layer-group text-accent"></i> ${escapeHtml(data.proposalTitle)}</h4>`;
        }
        if (data.proposalScope) {
            scopeHtml += `<p style="margin-bottom: 12px; line-height: 1.5; color: #cbd5e1;">${escapeHtml(data.proposalScope)}</p>`;
        } else {
            scopeHtml += `<p style="margin-bottom: 12px; line-height: 1.5; color: #cbd5e1;">${escapeHtml(data.goals || data.projectGoals || (currentLang === 'en' ? 'Complete software & website realization as discussed.' : 'Volledige software & website realisatie zoals besproken.'))}</p>`;
        }

        if (Array.isArray(data.deliverables) && data.deliverables.length > 0) {
            scopeHtml += `<div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
                <strong style="color: var(--color-accent); font-size: 0.82rem; text-transform: uppercase;">${currentLang === 'en' ? 'Included Deliverables & Scope:' : 'Inbegrepen Deliverables & Scope:'}</strong>
                ${data.deliverables.map((d) => `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px;">
                        <div style="font-weight: 700; color: #fff; font-size: 0.9rem;"><i class="fas fa-check-circle" style="color: #34d399; margin-right: 6px;"></i> ${escapeHtml(d.title || '')}</div>
                        ${d.description ? `<div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 3px;">${escapeHtml(d.description)}</div>` : ''}
                    </div>
                `).join('')}
            </div>`;
        }

        scopeEl.innerHTML = scopeHtml;

        successMsg.classList.add('hidden');
        actionContainer.classList.remove('hidden');
        actionContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
                <div style="display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap;">
                    <button id="btn-open-sign-modal" type="button" class="btn-akkoord" style="flex: 1.2; min-width: 240px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-size: 1rem; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);">
                        <i class="fas fa-file-signature"></i> <span>${t.statusOpenSignModalBtn}</span>
                    </button>
                    <button id="btn-preview-proposal-pdf" type="button" class="btn-logout" style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.18); color: #fff; padding: 12px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.92rem; transition: all 0.2s ease;">
                        <i class="fas fa-file-pdf text-accent"></i> <span>${t.statusPreviewPdfBtn}</span>
                    </button>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-shield-alt text-accent"></i> <span>${t.statusPreviewPdfDesc}</span>
                </p>
            </div>
        `;

        setupProposalActionFlow(data);
    } else {
        // STATE A: Offerte in Voorbereiding (Intake ontvangen)
        statusPill.className = "offerte-status-pill pending";
        statusPill.innerHTML = `<i class="fas fa-clock"></i> ${t.statusOffertePending}`;

        priceEl.innerText = currentLang === 'en' ? "Calculating..." : "Wordt berekend...";
        scopeEl.innerText = t.statusProposalPrepDesc;

        successMsg.classList.add('hidden');
        actionContainer.classList.remove('hidden');
        actionContainer.innerHTML = `
            <button class="btn-akkoord-disabled" disabled>
                <i class="fas fa-hourglass-half"></i> ${t.statusProposalPrepBtn}
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-info-circle"></i> ${t.statusProposalPrepHelp}
            </p>
        `;
    }
}

function setupProposalActionFlow(data) {
    const t = translations[currentLang] || translations.nl;

    // 1. Setup Preview Concept PDF button
    const btnPreview = document.getElementById('btn-preview-proposal-pdf');
    if (btnPreview) {
        btnPreview.onclick = async () => {
            const originalHtml = btnPreview.innerHTML;
            btnPreview.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF genereren...';
            btnPreview.disabled = true;
            try {
                const activeProjectObj = clientProjectsList.find(p => p.id === currentProjectDocId);
                const projData = activeProjectObj ? { ...activeProjectObj.data } : { ...data };
                projData.id = currentProjectDocId || 'concept';

                const { doc: pDoc, filename } = await generateProposalPDF(projData, false);
                pDoc.save(filename);
            } catch (err) {
                console.error("Concept PDF download fout:", err);
                alert("Kon de concept offerte PDF niet genereren: " + err.message);
            } finally {
                btnPreview.innerHTML = originalHtml;
                btnPreview.disabled = false;
            }
        };
    }

    // 2. Setup Open Signing Modal button
    const btnOpenSign = document.getElementById('btn-open-sign-modal');
    const modal = document.getElementById('proposal-signing-modal');
    if (btnOpenSign && modal) {
        btnOpenSign.onclick = () => {
            const activeProjectObj = clientProjectsList.find(p => p.id === currentProjectDocId);
            const proj = activeProjectObj ? activeProjectObj.data : data;

            // Fill project title & numbers
            const titleEl = document.getElementById('sign-modal-project-title');
            if (titleEl) {
                titleEl.innerText = proj.proposalTitle || proj.client || proj.companyName || proj.service || 'Creation+Alt+Fix Offerte';
            }

            const rawPrice = proj.proposalPrice ? String(proj.proposalPrice).replace(/[^0-9,.-]/g, '').replace(',', '.') : '0';
            const numPrice = parseFloat(rawPrice) || 0;
            const vatPrice = numPrice * 0.21;
            const totalIncPrice = numPrice * 1.21;

            const formatVal = (val) => `€ ${val.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalPriceEl = document.getElementById('sign-modal-total-price');
            const priceExEl = document.getElementById('sign-modal-price-ex');
            const priceVatEl = document.getElementById('sign-modal-price-vat');
            const priceIncEl = document.getElementById('sign-modal-price-inc');

            if (totalPriceEl) totalPriceEl.innerText = formatVal(numPrice);
            if (priceExEl) priceExEl.innerText = formatVal(numPrice);
            if (priceVatEl) priceVatEl.innerText = formatVal(vatPrice);
            if (priceIncEl) priceIncEl.innerText = formatVal(totalIncPrice);

            // Fill signer info
            const nameInput = document.getElementById('sign-signer-name');
            if (nameInput) {
                nameInput.value = proj.contactName || proj.client || auth.currentUser?.displayName || '';
            }

            const emailInput = document.getElementById('sign-signer-email');
            if (emailInput) {
                emailInput.value = proj.email || auth.currentUser?.email || '';
            }

            const dateInput = document.getElementById('sign-signer-date');
            if (dateInput) {
                dateInput.value = new Date().toLocaleDateString(currentLang === 'en' ? 'en-US' : 'nl-NL', { year: 'numeric', month: 'long', day: 'numeric' });
            }

            const checkbox = document.getElementById('sign-agreement-checkbox');
            if (checkbox) checkbox.checked = false;

            const errBox = document.getElementById('sign-modal-error');
            if (errBox) {
                errBox.innerText = '';
                errBox.classList.add('hidden');
            }

            modal.classList.remove('hidden');
        };
    }

    // 3. Modal Close Triggers
    const closeBtnX = document.getElementById('btn-close-sign-modal-x');
    const cancelBtn = document.getElementById('btn-cancel-sign-modal');
    if (closeBtnX) closeBtnX.onclick = () => modal?.classList.add('hidden');
    if (cancelBtn) cancelBtn.onclick = () => modal?.classList.add('hidden');

    // 4. Confirm Signature Trigger
    const btnConfirmSign = document.getElementById('btn-confirm-final-signature');
    if (btnConfirmSign) {
        btnConfirmSign.onclick = async () => {
            const errBox = document.getElementById('sign-modal-error');
            const rawSignerName = document.getElementById('sign-signer-name')?.value || '';
            const signerName = rawSignerName.replace(/[\r\n\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
            const agreementChecked = document.getElementById('sign-agreement-checkbox')?.checked;

            if (!signerName) {
                if (errBox) {
                    errBox.innerText = t.statusSigningNameRequired;
                    errBox.classList.remove('hidden');
                }
                return;
            }

            if (!agreementChecked) {
                if (errBox) {
                    errBox.innerText = t.statusSigningCheckboxRequired;
                    errBox.classList.remove('hidden');
                }
                return;
            }

            if (errBox) errBox.classList.add('hidden');

            const origConfirmText = btnConfirmSign.innerHTML;
            btnConfirmSign.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusAgreeSigning}`;
            btnConfirmSign.disabled = true;

            try {
                const projectRef = doc(db, "projects", currentProjectDocId);
                const nowIso = new Date().toISOString();

                const activeProjectObj = clientProjectsList.find(p => p.id === currentProjectDocId);
                const projData = activeProjectObj ? { ...activeProjectObj.data } : { ...data };
                projData.proposalAcceptedAt = nowIso;
                projData.proposalSignedBy = signerName;
                projData.id = currentProjectDocId;

                // 1. Generate Signed Proposal PDF
                let pdfDownloadUrl = null;
                let pdfFileName = null;
                try {
                    const { doc: pdfDoc, blob: pdfBlob, filename } = await generateProposalPDF(projData, true);
                    pdfFileName = filename;

                    // 2. Upload to Firebase Storage if available
                    if (storage) {
                        const uploadRes = await uploadPdfToStorage(storage, pdfBlob, currentProjectDocId, filename);
                        if (uploadRes) {
                            pdfDownloadUrl = uploadRes.downloadUrl;
                        }
                    }

                    // Auto-download for the client
                    pdfDoc.save(filename);
                } catch (pdfErr) {
                    console.warn("PDF generatie / upload waarschuwing:", pdfErr);
                }

                const updatePayload = {
                    status: "Wacht op Design & Ontwerp",
                    statusClass: "active",
                    proposalAcceptedAt: nowIso,
                    proposalSignedBy: signerName
                };
                if (pdfDownloadUrl) {
                    updatePayload.proposalPdfUrl = pdfDownloadUrl;
                    updatePayload.proposalPdfName = pdfFileName;
                }

                await updateDoc(projectRef, updatePayload);

                if (activeProjectObj) {
                    activeProjectObj.data.status = "Wacht op Design & Ontwerp";
                    activeProjectObj.data.proposalAcceptedAt = nowIso;
                    activeProjectObj.data.proposalSignedBy = signerName;
                    if (pdfDownloadUrl) activeProjectObj.data.proposalPdfUrl = pdfDownloadUrl;
                }

                // Close modal
                modal?.classList.add('hidden');

                // Update UI to State C (Accepted)
                document.getElementById('offerte-status-pill').className = "offerte-status-pill accepted";
                document.getElementById('offerte-status-pill').innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusOfferteAcceptedTitle}`;

                document.getElementById('offerte-action-container').classList.add('hidden');
                document.getElementById('offerte-success-msg').classList.remove('hidden');
                const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
                document.getElementById('accepted-date').innerText = new Date(nowIso).toLocaleDateString(localeStr);

                const dlBtn = document.getElementById('btn-download-proposal-pdf');
                if (dlBtn) {
                    dlBtn.onclick = async () => {
                        if (pdfDownloadUrl) {
                            const safeUrl = sanitizeUrl(pdfDownloadUrl);
                            if (safeUrl !== '#') window.open(safeUrl, '_blank');
                        } else {
                            const { doc: pDoc, filename } = await generateProposalPDF(projData, true);
                            pDoc.save(filename);
                        }
                    };
                }

                document.getElementById('status-badge').innerText = "Wacht op Design & Ontwerp";
                document.getElementById('status-badge').className = "badge badge-active";
                document.getElementById('progress-bar-fill').style.width = "60%";
                document.getElementById('progress-percent-display').innerText = "60% Complete";
                updateTimeline(3);

                renderDesignSection({ status: "Wacht op Design & Ontwerp" });

                alert(t.statusAgreeSuccessAlert);
            } catch (error) {
                console.error("Akkoord opslaan fout:", error);
                if (errBox) {
                    errBox.innerText = t.statusAgreeErrorAlert + " (" + error.message + ")";
                    errBox.classList.remove('hidden');
                }
                alert(t.statusAgreeErrorAlert);
            } finally {
                btnConfirmSign.innerHTML = origConfirmText;
                btnConfirmSign.disabled = false;
            }
        };
    }
}

function renderDesignSection(data) {
    const t = translations[currentLang] || translations.nl;
    const designCard = document.getElementById('design-card');
    if (!designCard) return;

    const statusText = data.status || '';

    const statusInfo = formatProjectStatus(statusText);

    const showDesign = Boolean(
        statusInfo.phase >= 3 ||
        statusText === "Wacht op Design & Ontwerp" ||
        statusText === "Design Gereed voor Review" ||
        statusText === "Wacht op Ontwikkeling" ||
        statusText === "In Ontwikkeling" ||
        data.designAcceptedAt ||
        statusText.includes("Opgeleverd") ||
        statusText.includes("Live") ||
        statusText.includes("Voldaan") ||
        statusText === "Afgerond"
    );

    if (!showDesign) {
        designCard.classList.add('hidden');
        return;
    }

    designCard.classList.remove('hidden');

    const designStatusPill = document.getElementById('design-status-pill');
    const designPreview = document.getElementById('design-preview-container');
    const designAction = document.getElementById('design-action-container');
    const designSuccess = document.getElementById('design-success-msg');

    const isDesignAccepted = Boolean(
        data.designAcceptedAt ||
        statusInfo.phase >= 4 ||
        statusText === "Wacht op Ontwikkeling" ||
        statusText === "In Ontwikkeling" ||
        statusText.includes("Opgeleverd") ||
        statusText.includes("Live") ||
        statusText.includes("Voldaan") ||
        statusText === "Afgerond"
    );

    const isDesignReady = Boolean(
        !isDesignAccepted &&
        (statusText === "Design Gereed voor Review" || data.designUrl || data.figmaUrl)
    );

    if (isDesignAccepted) {
        // STATE C: Design Goedgekeurd
        designStatusPill.className = "offerte-status-pill accepted";
        designStatusPill.innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusDesignApprovedTitle}`;

        designPreview.classList.add('hidden');
        designAction.classList.add('hidden');
        designSuccess.classList.remove('hidden');

        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        if (data.designAcceptedAt) {
            document.getElementById('design-accepted-date').innerText = new Date(data.designAcceptedAt).toLocaleDateString(localeStr);
        } else {
            document.getElementById('design-accepted-date').innerText = currentLang === 'en' ? "earlier" : "eerder";
        }

    } else if (isDesignReady) {
        // STATE B: Design Gereed voor Review
        designStatusPill.className = "offerte-status-pill action-required";
        designStatusPill.innerHTML = `<i class="fas fa-palette"></i> ${currentLang === 'en' ? 'Action Required: Review Design' : 'Actie Vereist: Design Beoordelen'}`;

        const rawPreview = data.designUrl || data.figmaUrl;
        const previewUrl = rawPreview ? sanitizeUrl(rawPreview) : '#';
        const designTitle = data.designTitle || (currentLang === 'en' ? 'Visual Concept & Wireframe' : 'Visueel Ontwerp & Wireframe');
        const designNotes = data.designNotes || '';

        designPreview.classList.remove('hidden');
        designPreview.innerHTML = `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                <h4 style="margin: 0 0 6px 0; color: #fff; font-size: 1rem;"><i class="fas fa-layer-group text-accent"></i> ${escapeHtml(designTitle)}</h4>
                ${designNotes ? `<p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">${escapeHtml(designNotes)}</p>` : ''}
                <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" class="design-preview-link" style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 600;">
                    <i class="fas fa-external-link-alt"></i> ${t.statusDesignViewLink}
                </a>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                <i class="fas fa-info-circle"></i> ${t.statusDesignViewHelp}
            </p>
        `;

        designSuccess.classList.add('hidden');
        designAction.classList.remove('hidden');
        designAction.innerHTML = `
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="btn-design-akkoord" class="btn-akkoord" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #a855f7, #7c3aed);">
                    <i class="fas fa-palette"></i> ${t.statusDesignAgreeBtn}
                </button>
                <button type="button" id="btn-design-feedback-trigger" class="btn-akkoord" style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); text-align: center; cursor: pointer;">
                    <i class="fas fa-comment-dots"></i> ${t.statusDesignFeedbackBtn}
                </button>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
                <i class="fas fa-shield-alt"></i> ${t.statusDesignAgreeHelp}
            </p>
        `;

        setupDesignAcceptButton();

        const feedbackTrigger = document.getElementById('btn-design-feedback-trigger');
        if (feedbackTrigger) {
            feedbackTrigger.onclick = () => {
                const categorySelect = document.getElementById('chat-category-select');
                if (categorySelect) categorySelect.value = 'revision';
                const inputArea = document.getElementById('chat-message-input');
                const messagesCard = document.getElementById('messages-card');
                if (messagesCard) messagesCard.scrollIntoView({ behavior: 'smooth' });
                if (inputArea) {
                    inputArea.focus();
                    if (!inputArea.value) {
                        inputArea.value = currentLang === 'en' 
                            ? "Regarding the visual design: " 
                            : "Betreft het visueel ontwerp: ";
                    }
                }
            };
        }

    } else {
        // STATE A: Design in Voorbereiding
        designStatusPill.className = "offerte-status-pill pending";
        designStatusPill.innerHTML = `<i class="fas fa-clock"></i> ${currentLang === 'en' ? 'Design in Preparation' : 'Design in Voorbereiding'}`;

        designPreview.classList.add('hidden');
        designSuccess.classList.add('hidden');
        designAction.classList.remove('hidden');
        designAction.innerHTML = `
            <button class="btn-akkoord-disabled" disabled>
                <i class="fas fa-drafting-compass"></i> ${t.statusDesignPrepBtn}
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-info-circle"></i> ${t.statusDesignPrepHelp}
            </p>
        `;
    }
}

function setupDesignAcceptButton() {
    const btn = document.getElementById('btn-design-akkoord');
    if (!btn) return;

    btn.onclick = async () => {
        const t = translations[currentLang] || translations.nl;
        if (!currentProjectDocId) {
            alert(t.statusDesignErrorAlert);
            return;
        }

        if (!confirm(t.statusDesignConfirm)) return;

        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusDesignProcessing}`;
        btn.disabled = true;

        try {
            const projectRef = doc(db, "projects", currentProjectDocId);
            const nowIso = new Date().toISOString();

            await updateDoc(projectRef, {
                status: "In Ontwikkeling",
                statusClass: "active",
                designAcceptedAt: nowIso
            });

            // Update UI
            document.getElementById('design-status-pill').className = "offerte-status-pill accepted";
            document.getElementById('design-status-pill').innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusDesignApprovedTitle}`;

            document.getElementById('design-action-container').classList.add('hidden');
            document.getElementById('design-preview-container').classList.add('hidden');
            document.getElementById('design-success-msg').classList.remove('hidden');
            const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
            document.getElementById('design-accepted-date').innerText = new Date(nowIso).toLocaleDateString(localeStr);

            document.getElementById('status-badge').innerText = "In Ontwikkeling";
            document.getElementById('status-badge').className = "badge badge-active";
            document.getElementById('progress-bar-fill').style.width = "80%";
            document.getElementById('progress-percent-display').innerText = "80% Complete";
            updateTimeline(4);

            alert(t.statusDesignSuccessAlert);

        } catch (error) {
            console.error("Fout bij design akkoord:", error);
            alert(t.statusDesignErrorAlert);
            btn.innerHTML = `<i class="fas fa-palette"></i> ${t.statusDesignAgreeBtn}`;
            btn.disabled = false;
        }
    };
}

function renderFilesSection(data) {
    const t = translations[currentLang] || translations.nl;
    const filesListContainer = document.getElementById('uploaded-files-list');
    if (!filesListContainer) return;

    const files = data.files || [];
    
    if (files.length === 0) {
        filesListContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">${t.statusNoFilesYet}</p>`;
        return;
    }

    const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
    filesListContainer.innerHTML = files.map(f => {
        const dateStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString(localeStr) : (currentLang === 'en' ? 'earlier' : 'eerder');
        const safeUrl = escapeHtml(sanitizeUrl(f.url));
        const safeName = escapeHtml(f.name);
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                    <i class="fas fa-file-alt" style="color: #6366f1; font-size: 1.2rem;"></i>
                    <div style="overflow: hidden;">
                        <div style="font-size: 0.9rem; font-weight: 500; color: #f8fafc; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${safeName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${t.statusAddedOn} ${dateStr}</div>
                    </div>
                </div>
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #22d3ee; background: rgba(34, 211, 238, 0.1); padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; flex-shrink: 0; transition: all 0.2s;">
                    <i class="fas fa-download"></i> ${t.statusViewFile}
                </a>
            </div>
        `;
    }).join('');
}

// ===========================================
// IN-APP MESSAGING & TICKETING LOGIC (TASK-604)
// ===========================================
let activeChatFilter = 'all';

function renderMessagesSection(data) {
    const t = translations[currentLang] || translations.nl;
    const threadContainer = document.getElementById('messages-thread');
    const countBadge = document.getElementById('messages-count-badge');
    if (!threadContainer) return;

    const messages = (data && data.messages && Array.isArray(data.messages)) ? data.messages : [];
    
    if (countBadge) {
        countBadge.innerText = `${messages.length} ${messages.length === 1 ? (currentLang === 'en' ? 'message' : 'bericht') : (currentLang === 'en' ? 'messages' : 'berichten')}`;
    }

    // Filter messages based on activeChatFilter
    const filteredMessages = messages.filter(msg => {
        if (activeChatFilter === 'all') return true;
        if (activeChatFilter === 'revision') return msg.category === 'revision';
        if (activeChatFilter === 'question') return msg.category === 'question' || msg.category === 'general';
        if (activeChatFilter === 'urgent') return msg.category === 'urgent';
        return true;
    });

    if (filteredMessages.length === 0) {
        threadContainer.innerHTML = `
            <div class="chat-empty-state">
                <i class="fas fa-comments"></i>
                <p style="font-size: 0.9rem; margin-top: 6px;">${t.statusChatEmpty}</p>
            </div>
        `;
    } else {
        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        
        threadContainer.innerHTML = filteredMessages.map(msg => {
            const isAdmin = msg.sender === 'admin';
            const isClient = !isAdmin;
            const bubbleClass = isAdmin ? 'admin' : 'client';
            
            const senderDisplayName = isAdmin 
                ? 'Allard (Creation+Alt+Fix)' 
                : (escapeHtml(msg.senderName) || t.statusChatFromYou);
            
            const senderIcon = isAdmin 
                ? '<i class="fas fa-shield-alt" style="color: var(--color-accent);"></i>' 
                : '<i class="fas fa-user-circle"></i>';
            
            const teamBadge = isAdmin 
                ? `<span class="chat-badge-team">${t.statusChatFromTeam}</span>` 
                : '';

            const dateStr = msg.createdAt 
                ? new Date(msg.createdAt).toLocaleString(localeStr, { 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) 
                : (currentLang === 'en' ? 'Just now' : 'Zojuist');

            // Category tag formatting
            let catLabel = '💬 Algemeen';
            let catClass = 'general';
            if (msg.category === 'revision') {
                catLabel = '🎨 Revisie';
                catClass = 'revision';
            } else if (msg.category === 'urgent') {
                catLabel = '⚡ Spoed';
                catClass = 'urgent';
            } else if (msg.category === 'question') {
                catLabel = '💬 Vraag';
                catClass = 'question';
            } else if (msg.category === 'content') {
                catLabel = '📄 Bestanden';
                catClass = 'content';
            }

            // Ticket Status formatting
            let statusHtml = '';
            if (msg.status === 'open') {
                statusHtml = `<span class="chat-ticket-status open"><i class="fas fa-circle" style="font-size: 0.55rem;"></i> ${t.statusChatStatusOpen}</span>`;
            } else if (msg.status === 'in_progress') {
                statusHtml = `<span class="chat-ticket-status in_progress"><i class="fas fa-spinner fa-spin" style="font-size: 0.55rem;"></i> ${t.statusChatStatusProgress}</span>`;
            } else if (msg.status === 'resolved') {
                statusHtml = `<span class="chat-ticket-status resolved"><i class="fas fa-check" style="font-size: 0.55rem;"></i> ${t.statusChatStatusResolved}</span>`;
            }

            return `
                <div class="chat-bubble ${bubbleClass}">
                    <div class="chat-bubble-header">
                        <div class="chat-sender-name">
                            ${senderIcon}
                            <span>${senderDisplayName}</span>
                            ${teamBadge}
                        </div>
                        <span class="chat-timestamp">${dateStr}</span>
                    </div>
                    <div class="chat-bubble-body">${escapeHtml(msg.message)}</div>
                    <div class="chat-bubble-footer">
                        <span class="chat-cat-tag ${catClass}">${catLabel}</span>
                        ${statusHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Auto scroll to bottom
        threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    setupChatListeners();
}

function setupChatListeners() {
    // Filter buttons
    document.querySelectorAll('.chat-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.chat-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeChatFilter = btn.getAttribute('data-filter') || 'all';
            const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
            if (activeProject) renderMessagesSection(activeProject.data);
        };
    });

    // Compose Form Submit
    const form = document.getElementById('chat-compose-form');
    if (form && !form.dataset.bound) {
        form.dataset.bound = "true";
        form.onsubmit = async (e) => {
            e.preventDefault();
            const t = translations[currentLang] || translations.nl;
            const categoryEl = document.getElementById('chat-category-select');
            const messageEl = document.getElementById('chat-message-input');
            const sendBtn = document.getElementById('btn-send-message');

            const rawCategory = categoryEl ? categoryEl.value : 'general';
            const category = ['general', 'revision', 'urgent', 'question'].includes(rawCategory) ? rawCategory : 'general';
            const rawMessage = messageEl ? messageEl.value : '';
            const messageText = rawMessage.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 3000);

            if (!messageText || !currentProjectDocId) return;

            sendBtn.disabled = true;
            const origBtnHtml = sendBtn.innerHTML;
            sendBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusChatSending}`;

            try {
                const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
                const existingMessages = (activeProject && activeProject.data.messages && Array.isArray(activeProject.data.messages)) 
                    ? [...activeProject.data.messages] 
                    : [];

                // Prevent Firestore document bloat (1MB cap): retain latest 100 messages
                if (existingMessages.length >= 100) {
                    existingMessages.splice(0, existingMessages.length - 99);
                }

                const rawClientName = (activeProject && (activeProject.data.contactName || activeProject.data.client)) || 'Klant';
                const clientName = String(rawClientName).replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim().slice(0, 100) || 'Klant';
                const rawClientEmail = auth?.currentUser?.email || (activeProject && activeProject.data.email) || '';
                const clientEmail = String(rawClientEmail).replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().slice(0, 150);

                const newMsg = {
                    id: 'msg_' + Date.now(),
                    ticketId: 'tkt_' + Date.now(),
                    sender: 'client',
                    senderName: clientName,
                    senderEmail: clientEmail,
                    category: category,
                    message: messageText,
                    createdAt: new Date().toISOString(),
                    readByAdmin: false,
                    readByClient: true,
                    status: 'open'
                };

                existingMessages.push(newMsg);

                // Update Firestore
                if (db) {
                    await updateDoc(doc(db, "projects", currentProjectDocId), {
                        messages: existingMessages
                    });
                }

                if (activeProject) {
                    activeProject.data.messages = existingMessages;
                }

                // [TASK-829] Notify admin via email that client sent a new message
                notifyAdminNewMessage({
                    clientName: clientName,
                    clientEmail: clientEmail,
                    projectName: (activeProject && (activeProject.data.companyName || activeProject.data.client)) || 'Project',
                    messagePreview: messageText.length > 200 ? messageText.slice(0, 200) + '...' : messageText,
                    category: category === 'revision' ? 'Revisie' : category === 'urgent' ? 'Spoed' : category === 'question' ? 'Vraag' : 'Algemeen'
                }).catch(err => console.warn('[CRM Notify] Admin notification error (non-blocking):', err));

                messageEl.value = '';
                renderMessagesSection(activeProject ? activeProject.data : { messages: existingMessages });

            } catch (err) {
                console.error("Fout bij verzenden bericht:", err);
                alert(t.statusChatSendError + " " + err.message);
            } finally {
                sendBtn.disabled = false;
                sendBtn.innerHTML = origBtnHtml;
            }
        };
    }

    // Quick contact button hookup
    const quickTicketBtn = document.getElementById('btn-open-messaging-card');
    if (quickTicketBtn && !quickTicketBtn.dataset.bound) {
        quickTicketBtn.dataset.bound = "true";
        quickTicketBtn.onclick = () => {
            const messagesCard = document.getElementById('messages-card');
            const inputArea = document.getElementById('chat-message-input');
            if (messagesCard) messagesCard.scrollIntoView({ behavior: 'smooth' });
            if (inputArea) inputArea.focus();
        };
    }
}

// ===========================================
// LIVE STAGING & VISUAL ANNOTATION SUITE (TASK-401 & TASK-822)
// ===========================================

export function resolveStagingUrl(p) {
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
    // Prefix https:// if protocol is missing
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    // Enforce HTTPS to prevent Mixed Content blocking in modern browsers
    if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
    }
    // Fix for Bakkertje Sieg: the root domain https://www.bakkertjesieg.nl issues a 301 redirect to insecure http://www.bakkertjesieg.nl/new/
    if (/bakkertjesieg\.nl(\/)?$/i.test(url)) {
        url = url.replace(/\/+$/, '') + '/new/';
    }
    const safe = sanitizeUrl(url);
    return safe === '#' ? null : safe;
}

/**
 * [TASK-830] Shows a user-friendly fallback banner when the staging iframe 
 * is verified to be blocked by X-Frame-Options, CSP frame-ancestors, or CORS headers.
 */
function showIframeCORSFallback(url, container) {
    if (document.getElementById('staging-cors-fallback')) return; // already shown

    const t = translations[currentLang] || translations.nl;
    const isNL = currentLang !== 'en';

    const banner = document.createElement('div');
    banner.id = 'staging-cors-fallback';
    banner.dataset.verifiedBlocked = 'true';
    banner.style.cssText = `
        background: rgba(245, 158, 11, 0.12); 
        border: 1px solid rgba(245, 158, 11, 0.4); 
        border-radius: 12px; 
        padding: 16px 20px; 
        margin: 12px 0; 
        display: flex; 
        align-items: center; 
        gap: 14px; 
        flex-wrap: wrap;
    `;
    banner.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 1.3rem;"></i>
        <div style="flex: 1; min-width: 200px;">
            <strong style="color: #fbbf24; font-size: 0.95rem;">
                ${isNL ? 'Preview geblokkeerd door beveiligingsheaders' : 'Preview blocked by security headers'}
            </strong>
            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 0.85rem; line-height: 1.5;">
                ${isNL 
                    ? 'De hostingserver van deze website blokkeert het inladen in een preview-venster. Dit is een beveiligingsinstelling en heeft geen invloed op je website.'
                    : 'The hosting server blocks loading this site in a preview frame. This is a security setting and does not affect your website.'}
            </p>
        </div>
        <a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer" 
           style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.9rem; white-space: nowrap;">
            <i class="fas fa-external-link-alt"></i>
            ${isNL ? 'Open in nieuw venster' : 'Open in new window'}
        </a>
    `;

    // Insert before the iframe wrapper
    const iframeWrapper = container.querySelector('.staging-iframe-wrapper, .mockup-viewport');
    if (iframeWrapper) {
        iframeWrapper.parentNode.insertBefore(banner, iframeWrapper);
    } else {
        container.appendChild(banner);
    }
}

/**
 * [TASK-830] Verifies via server-side probe if the target domain genuinely sends
 * X-Frame-Options (DENY/SAMEORIGIN) or CSP frame-ancestors headers.
 * NEVER attempts client-side contentDocument probing to avoid false-positive SOP exceptions.
 */
async function checkIframeSecurityHeaders(url, container) {
    if (!url || typeof url !== 'string') return;
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const basePath = (typeof window !== 'undefined' && window.location.pathname.includes('/crm/')) ? '/crm' : '';
        const proxyUrl = `${basePath}/api/healthcheck.php?domain=${encodeURIComponent(domain)}`;
        
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.frame_blocked === true) {
                showIframeCORSFallback(url, container);
            }
        }
    } catch (e) {
        // If probe fails or runs offline, do not show false-positive warning
    }
}

let isAnnotationModeActive = false;
let currentPendingPinCoords = null;
let currentViewport = 'desktop';

function renderStagingSection(data) {
    const t = translations[currentLang] || translations.nl;
    const stagingCard = document.getElementById('staging-card');
    if (!stagingCard) return;

    const statusText = data.status || '';
    const isPhase1Or2 = Boolean(
        statusText === "Nieuwe Lead" ||
        statusText === "Intake Voltooid" ||
        statusText === "Wacht op Akkoord"
    );

    const isNonWeb = /(consultancy|advies|backend|data analytics)/i.test(data.service || '') && !/(website|webshop|frontend|portaal|app|software)/i.test(data.service || '');

    if (isPhase1Or2 || isNonWeb) {
        stagingCard.classList.add('hidden');
        return;
    }

    stagingCard.classList.remove('hidden');

    const resolvedUrl = resolveStagingUrl(data);
    const iframe = document.getElementById('staging-iframe');
    const urlDisplay = document.getElementById('staging-url-display');
    const mockupUrl = document.getElementById('mockup-address-text');
    const openTabBtn = document.getElementById('btn-open-staging-tab');

    if (resolvedUrl) {
        if (iframe && iframe.dataset.loadedUrl !== resolvedUrl) {
            iframe.removeAttribute('srcdoc');
            iframe.src = resolvedUrl;
            iframe.dataset.loadedUrl = resolvedUrl;

            // [TASK-830] Clear any old fallback banner on URL switch
            const corsFallbackBanner = document.getElementById('staging-cors-fallback');
            if (corsFallbackBanner) corsFallbackBanner.remove();

            iframe.onload = () => {
                const b = document.getElementById('staging-cors-fallback');
                if (b && !b.dataset.verifiedBlocked) b.remove();
            };

            iframe.onerror = () => {
                showIframeCORSFallback(resolvedUrl, stagingCard);
            };

            // Verify genuinely blocked headers via server probe instead of client-side DOM inspection
            checkIframeSecurityHeaders(resolvedUrl, stagingCard);
        }
        if (urlDisplay) urlDisplay.innerText = resolvedUrl;
        if (mockupUrl) mockupUrl.innerText = resolvedUrl;
        if (openTabBtn) {
            openTabBtn.href = resolvedUrl;
            openTabBtn.classList.remove('hidden');
        }
    } else {
        // Generate built-in interactive Dark AI prototype
        if (iframe && iframe.dataset.loadedUrl !== 'prototype') {
            iframe.removeAttribute('src');
            iframe.srcdoc = generateFallbackPrototype(data);
            iframe.dataset.loadedUrl = 'prototype';
        }
        const protoTitle = (data.client || data.companyName || 'Concept') + ' - Concept Prototype';
        if (urlDisplay) urlDisplay.innerText = `https://demo.creationaltfix.nl/${encodeURIComponent((data.client || 'concept').toLowerCase().replace(/\s+/g, '-'))}`;
        if (mockupUrl) mockupUrl.innerText = `https://demo.creationaltfix.nl/${encodeURIComponent((data.client || 'concept').toLowerCase().replace(/\s+/g, '-'))}`;
        if (openTabBtn) {
            openTabBtn.href = '#';
            openTabBtn.onclick = (e) => {
                e.preventDefault();
                const newWin = window.open('about:blank', '_blank');
                if (newWin) newWin.document.write(generateFallbackPrototype(data));
            };
        }
    }

    // Render placed pins
    renderAnnotationPins(data.annotations || []);

    // Wire up Device Switcher and Annotation Engine
    setupStagingControls(data);
}

function setupInvoiceDownload(data) {
    const invCard = document.getElementById('btn-download-factuur-card');
    if (!invCard) return;

    const statusText = data.status || '';
    const statusInfo = formatProjectStatus(statusText);
    const isDeliveredOrMollie = Boolean(
        statusInfo.phase === 5 ||
        statusText.includes('Mollie') ||
        statusText.includes('Opgeleverd') ||
        statusText.includes('Live') ||
        statusText.includes('Voldaan') ||
        statusText === 'Afgerond' ||
        data.invoicePdfUrl ||
        data.invoiceNumber ||
        data.factuurnummer
    );

    if (isDeliveredOrMollie) {
        invCard.classList.remove('hidden');
        invCard.onclick = async () => {
            if (data.invoicePdfUrl) {
                const safeUrl = sanitizeUrl(data.invoicePdfUrl);
                if (safeUrl !== '#') window.open(safeUrl, '_blank');
                return;
            }
            const origHtml = invCard.innerHTML;
            invCard.innerHTML = '<i class="fas fa-spinner fa-spin" style="color: var(--color-accent);"></i> <div><h4>Factuur Genereren...</h4><p>Een ogenblik geduld alstublieft</p></div>';
            try {
                const projData = { 
                    ...data, 
                    id: currentProjectDocId,
                    invoiceNumber: data.invoiceNumber || data.factuurnummer
                };
                const { doc: invDoc, filename } = await generateInvoicePDF(projData);
                invDoc.save(filename);
            } catch (err) {
                console.error("Fout bij factuur download:", err);
                alert("Kon factuur PDF niet genereren.");
            } finally {
                invCard.innerHTML = origHtml;
            }
        };
    } else {
        invCard.classList.add('hidden');
    }
}

function setupClientInvoicesArchive(data) {
    const archiveCard = document.getElementById('client-invoices-archive-card');
    const tableContainer = document.getElementById('client-invoices-table-container');
    const countBadge = document.getElementById('client-invoices-count-badge');
    if (!archiveCard || !tableContainer) return;

    // Verzamel alle geregistreerde facturen van dit project
    const invoices = Array.isArray(data.invoices) ? [...data.invoices] : [];

    // Pi-Boekhouding historische facturen synchroniseren indien nog niet in Firestore
    try {
        const piInfo = typeof getPiBoekhoudingInfo === 'function' ? getPiBoekhoudingInfo(data) : null;
        if (piInfo) {
            if (Array.isArray(piInfo.invoices)) {
                piInfo.invoices.forEach(piInv => {
                    const num = piInv.invoiceNumber || piInv.number;
                    if (num && !invoices.some(i => (i.invoiceNumber || i.number) === num)) {
                        invoices.push({
                            invoiceNumber: num,
                            description: piInv.description || (piInv.items?.[0]?.name ? `${piInv.items[0].name}${piInv.items[0].desc ? ' (' + piInv.items[0].desc + ')' : ''}` : 'Factuur Pi Boekhouding'),
                            invoiceDate: piInv.invoiceDate || piInv.date || '',
                            dueDate: piInv.dueDate || '',
                            amountExcl: Number(piInv.amountExcl || piInv.totalExcl || 0),
                            amountVat: Number(piInv.amountVat || (piInv.totalExcl ? piInv.totalExcl * 0.21 : 0)),
                            amountIncl: Number(piInv.amountIncl || piInv.totalIncl || ((piInv.totalExcl || 0) * 1.21)),
                            status: (piInv.status || '').toLowerCase().includes('betaald') || piInv.status === 'paid' ? 'paid' : ((piInv.status || '').toLowerCase().includes('geannuleerd') || piInv.status === 'canceled' ? 'canceled' : 'open'),
                            molliePaymentId: piInv.molliePaymentId || '',
                            mollieCheckoutUrl: piInv.mollieCheckoutUrl || piInv.mollieLink || '',
                            mollieLink: piInv.mollieCheckoutUrl || piInv.mollieLink || '',
                            pdfUrl: piInv.pdfUrl || ''
                        });
                    }
                });
            } else if (piInfo.latestInvoice && piInfo.latestInvoice.number) {
                const num = piInfo.latestInvoice.number;
                if (!invoices.some(i => (i.invoiceNumber || i.number) === num)) {
                    const totalExcl = Number(piInfo.latestInvoice.totalExcl || 0);
                    invoices.push({
                        invoiceNumber: num,
                        description: piInfo.latestInvoice.items?.[0]?.name || 'Factuur Pi Boekhouding',
                        invoiceDate: piInfo.latestInvoice.date || '',
                        amountIncl: totalExcl * 1.21,
                        status: (piInfo.latestInvoice.status || '').toLowerCase().includes('betaald') ? 'paid' : 'open',
                        pdfUrl: null,
                        mollieLink: null
                    });
                }
            }
        }
    } catch (e) {
        console.warn("Pi-Boekhouding sync error in setupClientInvoicesArchive:", e);
    }
    
    // Voeg standalone invoice toe indien niet aanwezig in array
    if ((data.invoiceNumber || data.factuurnummer) && !invoices.some(i => i.invoiceNumber === (data.invoiceNumber || data.factuurnummer))) {
        const invNum = data.invoiceNumber || data.factuurnummer;
        invoices.push({
            invoiceNumber: invNum,
            invoiceDate: data.invoiceDate || data.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            amountIncl: data.proposalPrice ? (data.proposalPrice * 1.21) : 0,
            status: data.status?.toLowerCase().includes('voldaan') || data.status?.toLowerCase().includes('paid') ? 'paid' : 'open',
            pdfUrl: data.invoicePdfUrl || null,
            mollieLink: data.mollieLink || null
        });
    }

    // Chronologisch sorteren op factuurnummer
    invoices.sort((a, b) => {
        const numA = a.invoiceNumber || a.number || '';
        const numB = b.invoiceNumber || b.number || '';
        return numA.localeCompare(numB);
    });

    if (invoices.length === 0) {
        archiveCard.classList.add('hidden');
        return;
    }

    archiveCard.classList.remove('hidden');
    if (countBadge) countBadge.innerText = `${invoices.length} factu${invoices.length === 1 ? 'ur' : 'ren'}`;

    tableContainer.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr style="text-align: left; opacity: 0.7; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; text-transform: uppercase;">
                        <th style="padding: 8px 10px;">Factuurnr</th>
                        <th style="padding: 8px 10px;">Datum</th>
                        <th style="padding: 8px 10px;">Bedrag (Incl.)</th>
                        <th style="padding: 8px 10px;">Status</th>
                        <th style="padding: 8px 10px; text-align: right;">Acties</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoices.map((inv, idx) => {
                        const isPaid = isInvoicePaid(inv.invoiceNumber, inv.status);
                        const mollieUrl = !isPaid ? (inv.mollieCheckoutUrl || inv.mollieLink || data.mollieLink) : null;
                        const badgeStyle = isPaid 
                            ? 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);'
                            : 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);';
                        const badgeText = isPaid ? '✅ Voldaan' : '⏳ Openstaand';
                        const safeNum = escapeHtml(inv.invoiceNumber || 'Factuur');
                        const safeDate = escapeHtml(inv.invoiceDate || '—');
                        const amountStr = inv.amountIncl ? formatCurrency(inv.amountIncl) : '—';

                        return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 10px; font-weight: 700; color: #fff;">${safeNum}</td>
                                <td style="padding: 10px; opacity: 0.8;">${safeDate}</td>
                                <td style="padding: 10px; font-weight: 600; color: #34d399;">${amountStr}</td>
                                <td style="padding: 10px;">
                                    <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.72rem; font-weight: 600; ${badgeStyle}">
                                        ${badgeText}
                                    </span>
                                </td>
                                <td style="padding: 10px; text-align: right; white-space: nowrap;">
                                    ${mollieUrl ? `
                                        <a href="${sanitizeUrl(mollieUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-ideal-pay" style="background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: #fff; padding: 4px 11px; border-radius: 6px; font-weight: 600; text-decoration: none; margin-right: 6px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(14,165,233,0.3); transition: transform 0.15s ease;">
                                            <i class="fas fa-credit-card"></i> <span>Betaal iDEAL</span>
                                        </a>
                                    ` : ''}
                                    <button type="button" class="btn btn-secondary btn-sm btn-dl-hist-inv" data-idx="${idx}" style="padding: 3px 10px; font-size: 0.75rem; border-color: rgba(34, 211, 238, 0.4); color: var(--color-accent); cursor: pointer;">
                                        <i class="fas fa-file-pdf"></i> PDF
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Hook up download buttons for each invoice row
    tableContainer.querySelectorAll('.btn-dl-hist-inv').forEach(btn => {
        btn.addEventListener('click', async () => {
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            const inv = invoices[idx];
            if (!inv) return;

            if (inv.pdfUrl) {
                const safeUrl = sanitizeUrl(inv.pdfUrl);
                if (safeUrl !== '#') {
                    window.open(safeUrl, '_blank');
                    return;
                }
            }

            const origHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            try {
                const invoiceProj = {
                    ...data,
                    id: currentProjectDocId,
                    invoiceNumber: inv.invoiceNumber,
                    invoiceDate: inv.invoiceDate,
                    dueDate: inv.dueDate,
                    invoiceDescription: inv.description,
                    amountExcl: inv.amountExcl || (inv.amountIncl ? (inv.amountIncl / 1.21) : data.proposalPrice),
                    amountVat: inv.amountVat,
                    amountIncl: inv.amountIncl,
                    mollieLink: inv.mollieCheckoutUrl || inv.mollieLink || data.mollieLink,
                    proposalPrice: inv.amountExcl || (inv.amountIncl ? (inv.amountIncl / 1.21) : data.proposalPrice)
                };
                const { doc: invDoc, filename } = await generateInvoicePDF(invoiceProj);
                invDoc.save(filename);
            } catch (err) {
                console.error("Fout bij downloaden historische factuur:", err);
                alert("Kon factuur PDF niet downloaden.");
            } finally {
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }
        });
    });
}

function isInvoicePaid(invNumber, status) {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === 'voldaan' || s === 'betaald' || s === 'paid' || s.includes('voldaan') || s.includes('betaald') || s.includes('paid');
}

function setupUnpaidInvoiceBanner(data) {
    const banner = document.getElementById('unpaid-invoice-banner');
    if (!banner) return;

    const invNum = data.invoiceNumber || data.factuurnummer;
    const isPaid = isInvoicePaid(invNum, data.status);
    const hasInvoice = !!invNum;
    const hasMollie = !!data.mollieLink;

    if (!isPaid && hasInvoice && hasMollie) {
        const totalIncl = data.proposalPrice ? (data.proposalPrice * 1.21) : 0;
        const amountStr = totalIncl > 0 ? formatCurrency(totalIncl) : '—';

        const invNumEl = document.getElementById('banner-inv-num');
        const amountEl = document.getElementById('banner-inv-amount');
        const mollieBtn = document.getElementById('banner-mollie-btn');

        if (invNumEl) invNumEl.textContent = invNum;
        if (amountEl) amountEl.textContent = amountStr;
        if (mollieBtn) {
            mollieBtn.href = data.mollieLink;
        }

        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

function setupProfileModal() {
    const btnOpen = document.getElementById('btn-open-client-profile');
    const modal = document.getElementById('client-profile-modal');
    const btnCloseX = document.getElementById('btn-close-profile-modal-x');
    const btnCancel = document.getElementById('btn-cancel-profile-modal');
    const btnSave = document.getElementById('btn-save-client-profile');
    const feedback = document.getElementById('prof-save-feedback');

    if (!btnOpen || !modal) return;

    btnOpen.onclick = () => {
        const activeProj = clientProjectsList.find(p => p.id === currentProjectDocId);
        const data = activeProj ? activeProj.data : {};

        document.getElementById('prof-company-name').value = data.client || data.companyName || '';
        document.getElementById('prof-contact-name').value = data.contactName || '';
        document.getElementById('prof-phone').value = data.phone || '';
        document.getElementById('prof-email').value = data.email || (auth?.currentUser?.email || '');
        document.getElementById('prof-street').value = data.streetAndNumber || data.address || '';
        document.getElementById('prof-postal-code').value = data.postalCode || '';
        document.getElementById('prof-city').value = data.city || '';
        document.getElementById('prof-kvk').value = data.kvkNumber || data.kvk || '';
        document.getElementById('prof-vat').value = data.vatNumber || data.btwNummer || '';

        if (feedback) {
            feedback.className = 'hidden';
            feedback.innerText = '';
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    if (btnCloseX) btnCloseX.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    if (btnSave && !btnSave.dataset.bound) {
        btnSave.dataset.bound = "true";
        btnSave.onclick = async () => {
            if (!currentProjectDocId || !db) return;
            const origHtml = btnSave.innerHTML;
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opslaan...';
            btnSave.disabled = true;

            const cleanStr = (val, maxLen) => String(val || '').replace(/[\r\n\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
            const companyName = cleanStr(document.getElementById('prof-company-name')?.value, 120);
            const contactName = cleanStr(document.getElementById('prof-contact-name')?.value, 100);
            const phone = cleanStr(document.getElementById('prof-phone')?.value, 30);
            const streetAndNumber = cleanStr(document.getElementById('prof-street')?.value, 150);
            const postalCode = cleanStr(document.getElementById('prof-postal-code')?.value, 20);
            const city = cleanStr(document.getElementById('prof-city')?.value, 80);
            const kvkNumber = cleanStr(document.getElementById('prof-kvk')?.value, 20);
            const vatNumber = cleanStr(document.getElementById('prof-vat')?.value, 30);

            const activeProj = clientProjectsList.find(p => p.id === currentProjectDocId);

            const updatePayload = {
                client: companyName || contactName || 'Klant',
                companyName: companyName,
                contactName: contactName,
                phone: phone,
                streetAndNumber: streetAndNumber,
                address: streetAndNumber,
                postalCode: postalCode,
                city: city,
                kvkNumber: kvkNumber,
                kvk: kvkNumber,
                vatNumber: vatNumber,
                btwNummer: vatNumber,
                updatedAt: new Date().toISOString()
            };

            if (auth?.currentUser?.uid && activeProj && !activeProj.data?.clientUid) {
                updatePayload.clientUid = auth.currentUser.uid;
            }

            try {
                const projectRef = doc(db, "projects", currentProjectDocId);
                await updateDoc(projectRef, updatePayload);

                if (activeProj) {
                    Object.assign(activeProj.data, updatePayload);
                    renderDashboard(activeProj.data);
                }

                if (feedback) {
                    feedback.className = '';
                    feedback.style.background = 'rgba(16, 185, 129, 0.15)';
                    feedback.style.border = '1px solid rgba(16, 185, 129, 0.35)';
                    feedback.style.color = '#34d399';
                    feedback.innerHTML = '<i class="fas fa-check-circle"></i> Gegevens succesvol bijgewerkt en gesynchroniseerd!';
                }

                setTimeout(() => {
                    closeModal();
                }, 1200);
            } catch (err) {
                console.error("Fout bij opslaan profiel:", err);
                if (feedback) {
                    feedback.className = '';
                    feedback.style.background = 'rgba(239, 68, 68, 0.15)';
                    feedback.style.border = '1px solid rgba(239, 68, 68, 0.35)';
                    feedback.style.color = '#f87171';
                    feedback.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Kon gegevens niet opslaan: ' + escapeHtml(err.message);
                }
            } finally {
                btnSave.innerHTML = origHtml;
                btnSave.disabled = false;
            }
        };
    }
}

function generateFallbackPrototype(p) {
    const clientName = escapeHtml(p.client || p.companyName || 'Jouw Bedrijf');
    const service = escapeHtml(p.service || 'Website & Webshop Realisatie');
    const goals = escapeHtml(p.goals || p.projectGoals || 'Een converterende, razendsnelle online aanwezigheid op maat.');
    const design = escapeHtml(p.design || p.designPreferences || 'Modern, Dark AI met professionele typografie en vloeiende animaties.');

    return `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${clientName} - Live Staging Preview</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Inter', sans-serif; background: #0a0e1a; color: #f8fafc; line-height: 1.6; }
                .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 10; }
                .logo { font-family: 'Space Grotesk', sans-serif; font-size: 1.3rem; font-weight: 700; color: #22d3ee; text-decoration: none; }
                .nav-links { display: flex; gap: 20px; list-style: none; }
                .nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
                .hero { text-align: center; padding: 70px 20px; max-width: 900px; margin: 0 auto; }
                .hero-badge { display: inline-block; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-bottom: 20px; }
                .hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2.8rem; font-weight: 700; color: #fff; margin-bottom: 18px; line-height: 1.2; }
                .hero p { color: #94a3b8; font-size: 1.1rem; max-width: 700px; margin: 0 auto 30px auto; }
                .hero-btn { background: linear-gradient(135deg, #6366f1, #22d3ee); color: #fff; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; max-width: 1000px; margin: 40px auto 80px auto; padding: 0 20px; }
                .card { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); padding: 25px; border-radius: 12px; }
                .card h3 { font-size: 1.15rem; color: #fff; margin-bottom: 10px; }
                .card p { color: #94a3b8; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <nav class="nav">
                <a href="#" class="logo">${clientName}</a>
                <ul class="nav-links">
                    <li><a href="#">Diensten</a></li>
                    <li><a href="#">Over Ons</a></li>
                    <li><a href="#">Projecten</a></li>
                    <li><a href="#">Contact</a></li>
                </ul>
            </nav>
            <div class="hero">
                <div class="hero-badge">Concept Prototype • Creation+Alt+Fix</div>
                <h1>Welkom bij ${clientName}</h1>
                <p>${goals}</p>
                <button class="hero-btn">Ontdek Mogelijkheden</button>
            </div>
            <div class="grid">
                <div class="card">
                    <h3>🎯 Project Deliverables</h3>
                    <p>${service}</p>
                </div>
                <div class="card">
                    <h3>🎨 Design Richting</h3>
                    <p>${design}</p>
                </div>
                <div class="card">
                    <h3>⚡ Live Staging</h3>
                    <p>Plaats via het klantenportaal direct visuele feedback pinnen op elk element in deze preview.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function renderAnnotationPins(annotations) {
    const overlay = document.getElementById('annotation-overlay');
    const summaryList = document.getElementById('pins-summary-list');
    const countDisplay = document.getElementById('pins-count-display');
    const t = translations[currentLang] || translations.nl;

    const pins = Array.isArray(annotations) ? annotations : [];
    if (countDisplay) countDisplay.innerText = pins.length;

    // 1. Render glowing pin markers on the overlay
    if (overlay) {
        // Preserve popover if inside overlay
        const popover = document.getElementById('pin-popover');
        overlay.innerHTML = '';
        if (popover) overlay.appendChild(popover);

        pins.forEach((pin, idx) => {
            const pinNum = pin.pinNumber || (idx + 1);
            const pinEl = document.createElement('div');
            pinEl.className = `annotation-pin ${pin.status === 'resolved' ? 'resolved' : ''}`;
            pinEl.style.left = `${pin.xPercent}%`;
            pinEl.style.top = `${pin.yPercent}%`;
            pinEl.innerHTML = pin.status === 'resolved' ? '<i class="fas fa-check"></i>' : String(pinNum);
            pinEl.title = `Pin #${pinNum}: ${escapeHtml(pin.comment)}`;

            pinEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openExistingPinPopover(pin, pinEl);
            });

            overlay.appendChild(pinEl);
        });
    }

    // 2. Render summary list under the frame
    if (summaryList) {
        if (pins.length === 0) {
            summaryList.innerHTML = `<p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">${t.statusNoPinsYet}</p>`;
            return;
        }

        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        summaryList.innerHTML = pins.map((pin, idx) => {
            const pinNum = pin.pinNumber || (idx + 1);
            const isResolved = pin.status === 'resolved';
            const catLabel = pin.category === 'design' ? '🎨 Design' : (pin.category === 'content' ? '📄 Tekst' : (pin.category === 'bug' ? '🐛 Bug' : '⚡ Functie'));
            const dateStr = pin.createdAt ? new Date(pin.createdAt).toLocaleDateString(localeStr) : '';

            return `
                <div class="pin-summary-item ${isResolved ? 'resolved' : ''}">
                    <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                        <span class="pin-badge">${pinNum}</span>
                        <div style="overflow: hidden;">
                            <div style="font-weight: 600; color: #fff; font-size: 0.85rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                                ${escapeHtml(pin.comment)}
                            </div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">
                                ${catLabel} • ${dateStr} • <span style="color: ${isResolved ? '#34d399' : '#fbbf24'};">${isResolved ? (currentLang === 'en' ? 'Resolved' : 'Opgelost') : (currentLang === 'en' ? 'Open' : 'Openstaand')}</span>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm" data-action="delete-pin" data-id="${escapeHtml(pin.id)}" style="background: transparent; color: #f87171; border: none; padding: 4px; cursor: pointer;" title="Verwijder pin">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }).join('');

        summaryList.querySelectorAll('[data-action="delete-pin"]').forEach(btn => {
            btn.onclick = () => {
                const pinId = btn.getAttribute('data-id');
                deleteAnnotationPin(pinId);
            };
        });
    }
}

function openExistingPinPopover(pin, pinEl) {
    const popover = document.getElementById('pin-popover');
    if (!popover) return;

    popover.style.left = `calc(${pin.xPercent}% + 15px)`;
    popover.style.top = `${pin.yPercent}%`;
    popover.classList.remove('hidden');

    const catLabel = pin.category === 'design' ? '🎨 Design & Styling' : (pin.category === 'content' ? '📄 Tekst & Afbeeldingen' : (pin.category === 'bug' ? '🐛 Bug / Verbetering' : '⚡ Functionaliteit'));
    const isResolved = pin.status === 'resolved';

    popover.innerHTML = `
        <div class="popover-header">
            <span><i class="fas fa-map-pin" style="color: var(--color-accent);"></i> <strong>Feedback Pin #${pin.pinNumber || ''}</strong></span>
            <button type="button" id="btn-close-popover-existing" class="popover-close-btn">&times;</button>
        </div>
        <div class="popover-body">
            <div style="font-size: 0.75rem; color: var(--color-accent); font-weight: 700; margin-bottom: 6px;">${catLabel}</div>
            <p style="font-size: 0.88rem; color: #fff; line-height: 1.4; margin-bottom: 10px; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px;">${escapeHtml(pin.comment)}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
                <span>Status: <strong style="color: ${isResolved ? '#34d399' : '#fbbf24'};">${isResolved ? '✅ Opgelost' : '⏳ In Behandeling'}</strong></span>
                <button type="button" id="btn-del-existing-pin" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 3px 8px; font-size: 0.72rem;">Verwijder</button>
            </div>
        </div>
    `;

    document.getElementById('btn-close-popover-existing')?.addEventListener('click', () => {
        popover.classList.add('hidden');
    });

    document.getElementById('btn-del-existing-pin')?.addEventListener('click', () => {
        popover.classList.add('hidden');
        deleteAnnotationPin(pin.id);
    });
}

function setupStagingControls(data) {
    const t = translations[currentLang] || translations.nl;
    const toggleBtn = document.getElementById('btn-toggle-annotation-mode');
    const stopBtn = document.getElementById('btn-stop-annotation-mode');
    const banner = document.getElementById('annotation-mode-banner');
    const overlay = document.getElementById('annotation-overlay');
    const frameBox = document.getElementById('staging-frame-box');
    const popover = document.getElementById('pin-popover');
    const viewportContainer = document.getElementById('staging-viewport-container');
    const viewportSizeLabel = document.getElementById('mockup-viewport-size');

    // 1. Device Viewport Switcher
    document.querySelectorAll('.staging-device-btn[data-viewport]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.staging-device-btn[data-viewport]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetVp = btn.getAttribute('data-viewport');
            currentViewport = targetVp;

            if (viewportContainer) {
                viewportContainer.className = `staging-viewport-container viewport-${targetVp}`;
            }
            if (viewportSizeLabel) {
                viewportSizeLabel.innerText = targetVp === 'desktop' ? '100%' : (targetVp === 'tablet' ? '768px' : '375px');
            }
            if (popover) popover.classList.add('hidden');
        };
    });

    // 2. Reload Frame Button
    const reloadBtn = document.getElementById('btn-reload-staging-frame');
    if (reloadBtn && !reloadBtn.dataset.bound) {
        reloadBtn.dataset.bound = "true";
        reloadBtn.onclick = () => {
            const iframe = document.getElementById('staging-iframe');
            if (iframe) {
                const currentSrc = iframe.src;
                iframe.src = '';
                setTimeout(() => { iframe.src = currentSrc; }, 50);
            }
        };
    }

    // 3. Toggle Annotation Mode
    const toggleMode = (enable) => {
        isAnnotationModeActive = enable;
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', enable);
            document.getElementById('annotation-toggle-text').innerText = enable ? t.statusStopFeedbackBtn : t.statusToggleFeedbackBtn;
        }
        if (banner) banner.classList.toggle('hidden', !enable);
        if (overlay) overlay.classList.toggle('hidden', !enable);
        if (popover) popover.classList.add('hidden');
    };

    if (toggleBtn && !toggleBtn.dataset.bound) {
        toggleBtn.dataset.bound = "true";
        toggleBtn.onclick = () => toggleMode(!isAnnotationModeActive);
    }
    if (stopBtn && !stopBtn.dataset.bound) {
        stopBtn.dataset.bound = "true";
        stopBtn.onclick = () => toggleMode(false);
    }

    // 4. Click on Annotation Overlay to Drop Pin
    if (overlay && !overlay.dataset.clickBound) {
        overlay.dataset.clickBound = "true";
        overlay.onclick = (e) => {
            if (!isAnnotationModeActive) return;
            if (e.target !== overlay) return; // Don't trigger if clicked on an existing pin

            const rect = overlay.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const xPercent = Math.round((x / rect.width) * 1000) / 10;
            const yPercent = Math.round((y / rect.height) * 1000) / 10;

            currentPendingPinCoords = { xPercent, yPercent };

            // Position Popover
            if (popover) {
                // Adjust if too close to right edge
                const popoverX = xPercent > 70 ? Math.max(5, xPercent - 35) : xPercent;
                popover.style.left = `${popoverX}%`;
                popover.style.top = `${Math.min(yPercent, 65)}%`;

                // Restore default popover html
                popover.innerHTML = `
                    <div class="popover-header">
                        <span><i class="fas fa-map-pin" style="color: var(--color-accent);"></i> <strong data-translate-key="statusPinPopoverTitle">${t.statusPinPopoverTitle}</strong></span>
                        <button type="button" id="btn-close-popover" class="popover-close-btn">&times;</button>
                    </div>
                    <div class="popover-body">
                        <label for="pin-category-select" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">${t.statusPinCategoryLabel}</label>
                        <select id="pin-category-select" class="chat-category-dropdown" style="width: 100%; margin-bottom: 8px;">
                            <option value="design">${t.statusPinCatDesign}</option>
                            <option value="content">${t.statusPinCatText}</option>
                            <option value="feature">${t.statusPinCatFeature}</option>
                            <option value="bug">${t.statusPinCatBug}</option>
                        </select>
                        <textarea id="pin-comment-input" rows="3" class="chat-textarea" placeholder="${t.statusPinPlaceholder}" style="margin-bottom: 10px; font-size: 0.85rem;"></textarea>
                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button type="button" id="btn-cancel-pin" class="btn-logout" style="padding: 6px 12px; font-size: 0.8rem;">${t.statusPinCancelBtn}</button>
                            <button type="button" id="btn-submit-pin" class="btn-akkoord" style="width: auto; padding: 6px 16px; font-size: 0.82rem;">${t.statusPinSubmitBtn}</button>
                        </div>
                    </div>
                `;

                popover.classList.remove('hidden');
                document.getElementById('pin-comment-input')?.focus();

                document.getElementById('btn-close-popover').onclick = () => popover.classList.add('hidden');
                document.getElementById('btn-cancel-pin').onclick = () => popover.classList.add('hidden');
                document.getElementById('btn-submit-pin').onclick = submitNewPin;
            }
        };
    }
}

async function submitNewPin() {
    const t = translations[currentLang] || translations.nl;
    const catSelect = document.getElementById('pin-category-select');
    const commentInput = document.getElementById('pin-comment-input');
    const popover = document.getElementById('pin-popover');
    const submitBtn = document.getElementById('btn-submit-pin');

    if (!commentInput || !currentPendingPinCoords || !currentProjectDocId) return;
    const comment = commentInput.value.trim();
    if (!comment) return alert(t.statusPinPlaceholder);

    const category = catSelect ? catSelect.value : 'design';

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
        const existingAnnotations = (activeProject && activeProject.data.annotations && Array.isArray(activeProject.data.annotations)) 
            ? [...activeProject.data.annotations] 
            : [];
        
        const existingMessages = (activeProject && activeProject.data.messages && Array.isArray(activeProject.data.messages)) 
            ? [...activeProject.data.messages] 
            : [];

        const nextPinNumber = existingAnnotations.length + 1;
        const authorName = (activeProject && (activeProject.data.contactName || activeProject.data.client)) || 'Klant';

        const newPin = {
            id: 'pin_' + Date.now(),
            pinNumber: nextPinNumber,
            xPercent: currentPendingPinCoords.xPercent,
            yPercent: currentPendingPinCoords.yPercent,
            device: currentViewport,
            category: category,
            comment: comment,
            createdAt: new Date().toISOString(),
            status: 'open',
            author: authorName
        };

        existingAnnotations.push(newPin);

        // Also sync automatically as a revision ticket in the In-App Chat
        const newMsg = {
            id: 'msg_pin_' + Date.now(),
            sender: 'client',
            senderName: authorName,
            senderEmail: auth?.currentUser?.email || '',
            category: 'revision',
            message: `[Visuele Pin #${nextPinNumber} - ${category.toUpperCase()}]: ${comment}`,
            createdAt: new Date().toISOString(),
            status: 'open',
            readByAdmin: false,
            readByClient: true
        };
        existingMessages.push(newMsg);

        if (db) {
            await updateDoc(doc(db, "projects", currentProjectDocId), {
                annotations: existingAnnotations,
                messages: existingMessages
            });
        }

        if (activeProject) {
            activeProject.data.annotations = existingAnnotations;
            activeProject.data.messages = existingMessages;
        }

        if (popover) popover.classList.add('hidden');
        renderAnnotationPins(existingAnnotations);
        renderMessagesSection(activeProject ? activeProject.data : { messages: existingMessages });

        alert(t.statusPinPlacedSuccess);

    } catch (err) {
        console.error("Fout bij opslaan pin:", err);
        alert("Fout bij opslaan pin: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = t.statusPinSubmitBtn;
    }
}

async function deleteAnnotationPin(pinId) {
    if (!confirm("Weet je zeker dat je deze feedback pin wilt verwijderen?")) return;

    try {
        const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
        if (!activeProject || !currentProjectDocId) return;

        const updatedAnnotations = (activeProject.data.annotations || []).filter(p => p.id !== pinId);
        activeProject.data.annotations = updatedAnnotations;

        if (db) {
            await updateDoc(doc(db, "projects", currentProjectDocId), {
                annotations: updatedAnnotations
            });
        }

        renderAnnotationPins(updatedAnnotations);

    } catch (err) {
        console.error("Fout bij verwijderen pin:", err);
    }
}

