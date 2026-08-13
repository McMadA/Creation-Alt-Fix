/**
 * Admin Dashboard Logic
 * Integrated with Firebase Auth & Firestore.
 * Fallbacks to mock data if Firebase is not yet configured.
 * 
 * Security: XSS-escaped output, centralized config, admin whitelist.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, createUserWithEmailAndPassword, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, escapeHtml, ADMIN_EMAILS, isAdminEmail } from "../../js/firebase-config.js";


// We gebruiken een try-catch zodat de app niet direct crasht als de config nog dummy-data is.
let app, auth, db, secondaryAuth;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    const secondaryApp = getApps().find(a => a.name === 'SecondaryAuth') || initializeApp(firebaseConfig, 'SecondaryAuth');
    secondaryAuth = getAuth(secondaryApp);
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
        if (!db) return { leads: 3, projects: 5, waiting: 2 }; // Mock fallback

        try {
            const querySnapshot = await getDocs(collection(db, "projects"));
            let leads = 0, projects = 0, waiting = 0;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const s = data.status || '';
                // Fase 1: Leads & Intakes
                if (s === "Nieuwe Lead" || s === "Intake Voltooid") leads++;
                // Fase 2-4: Lopende Projecten
                if (s === "In Ontwikkeling" || s === "Wacht op Ontwikkeling" || s === "Wacht op Design & Ontwerp" || s === "Design Gereed voor Review") projects++;
                // Wacht op akkoord (offerte of design)
                if (s === "Wacht op Akkoord") waiting++;
            });
            return { leads, projects, waiting };
        } catch (e) {
            console.warn("Kon Firestore niet uitlezen, val terug op mock data.");
            return { leads: 3, projects: 5, waiting: 2 };
        }
    },

    async getProjects() {
        if (!db) return this.getMockProjects();

        try {
            const querySnapshot = await getDocs(collection(db, "projects"));
            const projectsList = [];
            querySnapshot.forEach((doc) => {
                projectsList.push({ id: doc.id, ...doc.data() });
            });
            if (projectsList.length > 0) return projectsList;
            throw new Error("No projects found");
        } catch (e) {
            return this.getMockProjects();
        }
    },

    getMockProjects() {
        return [
            {
                id: 1,
                client: "Bakkerij de Vries",
                contactName: "Jan de Vries",
                email: "jan@bakkerijdevries.nl",
                domainName: "www.bakkerijdevries.nl",
                service: "Slimme Automatisering (AI)",
                goals: "Automatisch dagelijkse bestellingen scannen uit e-mails en doorzetten naar de bakkerij-planning.",
                design: "Ambachtelijk maar modern, warm oranje en donkerblauw.",
                status: "In Ontwikkeling",
                statusClass: "active",
                date: "Vandaag"
            },
            {
                id: 2,
                client: "Jansen IT",
                contactName: "Mark Jansen",
                email: "info@jansenit.nl",
                domainName: "www.jansenit.nl",
                service: "Data Dashboard",
                goals: "Centraal inzicht in alle server-statussen en klanttickets via PowerBI / custom dashboard.",
                design: "Strak tech design, donkere modus met cyaan accenten.",
                status: "Wacht op Akkoord",
                statusClass: "waiting",
                date: "Gisteren"
            },
            {
                id: 3,
                client: "Stenekes Riool",
                contactName: "Angela Stenekes",
                email: "angela@stenekes.nl",
                domainName: "www.stenekesriool.nl",
                service: "Website & Hosting",
                goals: "Nieuwe one-pager met directe belknop en offerte-intake voor rioolreiniging.",
                design: "Schoon en betrouwbaar, groen en wit.",
                status: "Opgeleverd (Betaling via Mollie)",
                statusClass: "concept",
                date: "3 Dagen Geleden"
            },
            {
                id: 4,
                client: "Nieuwe Aanvraag",
                contactName: "Karel Visser",
                email: "karel@visserlogistics.com",
                domainName: "Nog geen domein",
                service: "Website & Webshop",
                goals: "Wil een online portal waar transportklanten vrachtaanvragen kunnen indienen en rechtstreeks kunnen inloggen.",
                design: "Zakelijk, snelle laadtijd, mobiel geoptimaliseerd.",
                status: "Nieuwe Lead",
                statusClass: "waiting",
                date: "Zojuist"
            }
        ];
    }
};

let cachedProjects = [];


// --- UI Logic ---
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupSearchAndFilters();
});

// --- Search, Filter & CSV Export ---
function setupSearchAndFilters() {
    const searchInput = document.getElementById('admin-search-input');
    const statusFilter = document.getElementById('admin-status-filter');

    searchInput?.addEventListener('input', () => filterAndRenderTables());
    statusFilter?.addEventListener('change', () => filterAndRenderTables());
}

function filterAndRenderTables() {
    const searchVal = (document.getElementById('admin-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('admin-status-filter')?.value || 'all';

    const filtered = cachedProjects.filter(p => {
        const clientName = (p.client || p.companyName || '').toLowerCase();
        const contactName = (p.contactName || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const domain = (p.domainName || '').toLowerCase();
        const service = (p.service || '').toLowerCase();
        const goals = (p.goals || p.projectGoals || '').toLowerCase();
        const status = (p.status || '').toLowerCase();

        // Search match
        const matchesSearch = !searchVal || 
            clientName.includes(searchVal) || 
            contactName.includes(searchVal) || 
            email.includes(searchVal) || 
            domain.includes(searchVal) || 
            service.includes(searchVal) || 
            goals.includes(searchVal);

        // Status match
        let matchesStatus = true;
        if (statusVal !== 'all') {
            matchesStatus = status.includes(statusVal.toLowerCase());
        }

        return matchesSearch && matchesStatus;
    });

    renderTablesData(filtered);
}

window.exportProjectsToCSV = () => {
    if (!cachedProjects || cachedProjects.length === 0) {
        alert("Geen projecten/leads om te exporteren.");
        return;
    }

    const headers = ["Bedrijfsnaam", "Contactpersoon", "E-mailadres", "Dienst", "Gewenste Domeinnaam", "Status", "Datum", "Projectdoelen"];
    
    const rows = cachedProjects.map(p => {
        const escapeCsv = (val) => {
            if (!val) return '""';
            const clean = String(val).replace(/"/g, '""');
            return `"${clean}"`;
        };
        return [
            escapeCsv(p.client || p.companyName),
            escapeCsv(p.contactName),
            escapeCsv(p.email),
            escapeCsv(p.service),
            escapeCsv(p.domainName),
            escapeCsv(p.status),
            escapeCsv(p.date),
            escapeCsv(p.goals || p.projectGoals)
        ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `creation_alt_fix_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Luister naar de status van de gebruiker (ingelogd/uitgelogd)
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        const authOverlay = document.getElementById('auth-overlay');
        const adminApp = document.getElementById('admin-app');

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
                alert("Toegang geweigerd: Dit account heeft geen beheerdersrechten.");
                window.location.href = "../index.html";
                return;
            }

            authOverlay.classList.add('hidden');
            adminApp.classList.remove('hidden');
            loadDashboardData();
        } else {
            authOverlay.classList.remove('hidden');
            adminApp.classList.add('hidden');
        }
    });
} else {
    // Als auth faalt door dummy config, toon gewoon login scherm
    document.getElementById('auth-overlay').classList.remove('hidden');
}

// Login Form Handler
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('button');
    const errDiv = document.getElementById('login-error');
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
    if (errDiv) errDiv.classList.add('hidden');
    
    const success = await API.login(email, password);
    if (!success) {
        btn.innerHTML = 'Inloggen';
        if (errDiv) {
            errDiv.innerText = 'Ongeldig e-mailadres of wachtwoord. Controleer je gegevens.';
            errDiv.classList.remove('hidden');
        }
    }
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    API.logout();
});

async function loadDashboardData() {
    // 1. Load Stats
    const stats = await API.getDashboardStats();
    document.getElementById('stat-leads').innerText = stats.leads;
    document.getElementById('stat-projects').innerText = stats.projects;
    document.getElementById('stat-waiting').innerText = stats.waiting;

    // 2. Load Projects Table
    cachedProjects = await API.getProjects();
    
    // Initial Render
    filterAndRenderTables();
}

function renderTablesData(projectsToRender) {
    const getPhaseTag = (status) => {
        if (!status) return "Fase 1";
        if (status.includes("Nieuwe Lead") || status.includes("Intake Voltooid")) return "Fase 1";
        if (status.includes("Wacht op Akkoord") || status.includes("Offerte")) return "Fase 2";
        if (status.includes("Design")) return "Fase 3";
        if (status.includes("Ontwikkeling")) return "Fase 4";
        if (status.includes("Mollie") || status.includes("Opgeleverd") || status.includes("Afgerond") || status.includes("Livegang")) return "Fase 5";
        return "Fase 1";
    };

    const createRow = (p) => {
        const row = document.createElement('tr');
        const phaseTag = getPhaseTag(p.status);
        const safeClient = escapeHtml(p.client || p.companyName || 'Onbekend');
        const safeService = escapeHtml(p.service || 'Onbekend');
        const safeStatus = escapeHtml(p.status);
        const safeDate = escapeHtml(p.date || 'Onbekend');
        const safeId = escapeHtml(p.id);
        const safeStatusClass = escapeHtml(p.statusClass);
        row.innerHTML = `
            <td><strong>${safeClient}</strong></td>
            <td>${safeService}</td>
            <td><span class="badge badge-${safeStatusClass}">${safeStatus} (${phaseTag})</span></td>
            <td>${safeDate}</td>
            <td>
                <button class="btn btn-secondary btn-sm" data-action="details" data-id="${safeId}"><i class="fas fa-eye"></i> Klantkaart</button>
                <button class="btn btn-sm" data-action="delete" data-id="${safeId}" style="background: var(--danger-color, #ef4444); color: white; border: none; padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer; margin-left: 5px;" title="Verwijderen"><i class="fas fa-trash"></i></button>
            </td>
        `;
        // Use event delegation instead of inline onclick to prevent injection
        row.querySelector('[data-action="details"]').addEventListener('click', () => window.openProjectDetails(p.id));
        row.querySelector('[data-action="delete"]').addEventListener('click', () => window.deleteProject(p.id));
        return row;
    };

    // A. Overview Table (#projects-table)
    const overviewBody = document.querySelector('#projects-table tbody');
    if (overviewBody) {
        overviewBody.innerHTML = '';
        if (projectsToRender.length === 0) {
            overviewBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen resultaten gevonden voor deze zoekopdracht/filter.</td></tr>`;
        } else {
            projectsToRender.forEach(p => overviewBody.appendChild(createRow(p)));
        }
    }

    // B. Leads & Intakes Table (#leads-table)
    const leadsBody = document.querySelector('#leads-table tbody');
    if (leadsBody) {
        leadsBody.innerHTML = '';
        const leads = projectsToRender.filter(p => !p.status || p.status === "Nieuwe Lead" || p.status === "Intake Voltooid");
        if (leads.length === 0) {
            leadsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen nieuwe leads gevonden.</td></tr>`;
        } else {
            leads.forEach(p => leadsBody.appendChild(createRow(p)));
        }
    }

    // C. Lopende Projecten Table (#active-projects-table)
    const activeProjectsBody = document.querySelector('#active-projects-table tbody');
    if (activeProjectsBody) {
        activeProjectsBody.innerHTML = '';
        const activeProjects = projectsToRender.filter(p => p.status && p.status !== "Nieuwe Lead" && p.status !== "Intake Voltooid");
        if (activeProjects.length === 0) {
            activeProjectsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen lopende projecten gevonden.</td></tr>`;
        } else {
            activeProjects.forEach(p => activeProjectsBody.appendChild(createRow(p)));
        }
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentAreas = document.querySelectorAll('.content-area');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
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
        });
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
            alert("Fout bij opslaan lead.");
        }
    } else {
        alert("Opslaan gesimuleerd (Firebase is nog mock data)");
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

    // XSS-safe versions for innerHTML injection
    const s = {
        clientName: escapeHtml(clientName),
        contact: escapeHtml(contact),
        email: escapeHtml(email),
        domain: escapeHtml(domain),
        service: escapeHtml(service),
        goals: escapeHtml(goals),
        design: escapeHtml(design),
        dateSubmitted: escapeHtml(dateSubmitted),
        status: escapeHtml(status),
        statusClass: escapeHtml(p.statusClass || 'primary'),
        designUrl: escapeHtml(p.designUrl || p.figmaUrl || ''),
        safeId: escapeHtml(id)
    };

    let currentPhase = 1;
    if (status === "Nieuwe Lead" || status === "Intake Voltooid") currentPhase = 1;
    else if (status === "Wacht op Akkoord" || status.includes("Offerte")) currentPhase = 2;
    else if (status.includes("Design")) currentPhase = 3;
    else if (status.includes("Ontwikkeling") || status.includes("Wacht op Ontwikkeling")) currentPhase = 4;
    else if (status.includes("Mollie") || status.includes("Opgeleverd") || status === "Afgerond" || status.includes("Livegang")) currentPhase = 5;

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
                <a href="${escapeHtml(f.url)}" target="_blank" class="btn btn-sm" style="background: rgba(34, 211, 238, 0.1); color: #22d3ee; border: none; padding: 4px 8px; text-decoration: none; font-size: 0.8rem;"><i class="fas fa-download"></i> Download</a>
            </div>
        `).join('');
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
                    <span class="badge badge-${s.statusClass}" style="font-size: 0.85rem; padding: 6px 12px; font-weight: 600;">Fase ${currentPhase}: ${s.status}</span>
                </div>
            </div>

            <!-- Visual 5-Stage Phase Tracker -->
            <div class="admin-phase-tracker" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 12px 0 16px 0; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; ${currentPhase === 1 ? 'background: rgba(34, 211, 238, 0.2); border: 1px solid #22d3ee; color: #22d3ee; font-weight: 700;' : 'color: #94a3b8;'}">
                    <i class="fas fa-clipboard-check"></i><br>Fase 1: Intake
                </div>
                <div style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; ${currentPhase === 2 ? 'background: rgba(245, 158, 11, 0.2); border: 1px solid #fbbf24; color: #fbbf24; font-weight: 700;' : 'color: #94a3b8;'}">
                    <i class="fas fa-file-signature"></i><br>Fase 2: Offerte
                </div>
                <div style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; ${currentPhase === 3 ? 'background: rgba(168, 85, 247, 0.2); border: 1px solid #c084fc; color: #c084fc; font-weight: 700;' : 'color: #94a3b8;'}">
                    <i class="fas fa-palette"></i><br>Fase 3: Design
                </div>
                <div style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; ${currentPhase === 4 ? 'background: rgba(99, 102, 241, 0.2); border: 1px solid #818cf8; color: #818cf8; font-weight: 700;' : 'color: #94a3b8;'}">
                    <i class="fas fa-code"></i><br>Fase 4: Code
                </div>
                <div style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; ${currentPhase === 5 ? 'background: rgba(16, 185, 129, 0.2); border: 1px solid #34d399; color: #34d399; font-weight: 700;' : 'color: #94a3b8;'}">
                    <i class="fas fa-rocket"></i><br>Fase 5: Livegang
                </div>
            </div>

            <form id="edit-klantkaart-form">
                <h4 class="actions-title" style="margin-top: 0;"><i class="fas fa-edit"></i> Klantgegevens & Intake Bewerken</h4>
                
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
                        <input type="email" id="edit-email" class="admin-input" value="${s.email}" style="margin: 4px 0 0 0;" placeholder="info@bedrijf.nl" data-original-email="${s.email}">
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-globe"></i> Gewenste Domeinnaam</div>
                        <input type="text" id="edit-domain" class="admin-input" value="${s.domain}" style="margin: 4px 0 0 0;" placeholder="www.bedrijf.nl">
                    </div>
                    <div class="meta-box" style="grid-column: 1 / -1;">
                        <div class="meta-label"><i class="fas fa-concierge-bell"></i> Dienst</div>
                        <input type="text" id="edit-service" class="admin-input" value="${s.service}" style="margin: 4px 0 0 0;" placeholder="Bijv. Website & Webshop">
                    </div>
                </div>

                <div class="intake-box" style="margin-top: 15px;">
                    <h4><i class="fas fa-bullseye"></i> Projectdoelen & Omschrijving</h4>
                    <textarea id="edit-goals" class="admin-input" rows="4" style="margin: 4px 0 0 0;" placeholder="Omschrijving van het project en de doelen...">${s.goals}</textarea>
                </div>

                <div class="intake-box" style="margin-top: 15px;">
                    <h4><i class="fas fa-palette"></i> Design & Stijlvoorkeuren</h4>
                    <textarea id="edit-design" class="admin-input" rows="2" style="margin: 4px 0 0 0;" placeholder="Kleuren, stijlvoorkeuren of opmerkingen...">${s.design}</textarea>
                </div>

                <div class="intake-box" style="margin-top: 15px;">
                    <h4><i class="fas fa-drafting-compass"></i> Ontwerp / Figma Link (Fase 3)</h4>
                    <input type="url" id="edit-designUrl" class="admin-input" value="${s.designUrl}" style="margin: 4px 0 0 0;" placeholder="https://www.figma.com/design/... of preview URL">
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;"><i class="fas fa-info-circle"></i> Vul hier de link naar het ontwerp in. Gebruik de snelactie hieronder om het naar de klant te sturen.</p>
                </div>

                <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Wijzigingen Opslaan</button>
                </div>
            </form>

            <div style="border-top: 1px solid var(--color-border); padding-top: 15px; margin-top: 10px;">
                <h4 class="actions-title"><i class="fas fa-folder-open"></i> Project Bestanden & Uploads</h4>
                <div style="margin-top: 10px;">
                    ${filesHtml}
                </div>
            </div>

            <div style="border-top: 1px solid var(--color-border); padding-top: 15px; margin-top: 10px;">
                <h4 class="actions-title"><i class="fas fa-bolt"></i> Werkstroom & Snelacties per Fase</h4>
                <div class="action-buttons-grid" id="action-buttons-container">
                    <!-- Buttons bound via event listeners below -->
                </div>
            </div>

            <div id="ai-email-container" class="hidden" style="padding: 15px; background: rgba(34, 211, 238, 0.08); border-radius: 8px; border: 1px solid rgba(34, 211, 238, 0.3);">
                <p style="margin-bottom: 10px; font-weight: 600; color: var(--color-accent);"><i class="fas fa-magic"></i> AI Concept E-mail (Gepersonaliseerd op basis van intake):</p>
                <textarea id="ai-email-body" class="admin-input" rows="7" style="font-family: var(--font-body);"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;" id="ai-email-actions">
                    <!-- Bound below -->
                </div>
            </div>

            <div id="proposal-link-container" class="hidden" style="padding: 15px; background: rgba(99,102,241,0.08); border-radius: 8px; border: 1px solid rgba(99,102,241,0.3);">
                <p style="margin-bottom: 10px; font-weight: 600; color: #818cf8;"><i class="fas fa-link"></i> Gegenereerde Online Offerte Link:</p>
                <input type="text" id="proposal-link" class="admin-input" readonly style="margin-bottom: 10px;">
                <a id="proposal-visit-btn" href="#" target="_blank" class="btn btn-primary btn-sm"><i class="fas fa-external-link-alt"></i> Bekijk Offerte</a>
            </div>
        </div>
    `;

    // Bind form submit via event listener (not inline onsubmit) to avoid XSS via id injection
    document.getElementById('edit-klantkaart-form')?.addEventListener('submit', (e) => saveKlantkaartChanges(e, id));

    // Bind action buttons via event listeners instead of inline onclick
    const actionContainer = document.getElementById('action-buttons-container');
    actionContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" data-action="ai-email"><i class="fas fa-robot"></i> AI Concept Mail (Fase 1)</button>
        <button class="btn btn-secondary btn-sm" data-action="proposal"><i class="fas fa-file-contract"></i> Genereer Offerte (Fase 2)</button>
        <button class="btn btn-secondary btn-sm" data-action="design" style="border-color: rgba(168, 85, 247, 0.4); color: #c084fc;"><i class="fas fa-palette"></i> Verstuur Design naar Klant (Fase 3)</button>
        <button class="btn btn-secondary btn-sm" data-action="mollie"><i class="fas fa-euro-sign"></i> Factuur + Mollie (Fase 5)</button>
        <button class="btn btn-secondary btn-sm" data-action="checkin"><i class="fas fa-sync-alt"></i> 14-Dagen Check-in (Fase 5)</button>
    `;
    actionContainer.querySelector('[data-action="ai-email"]').addEventListener('click', () => generateAiEmail(id));
    actionContainer.querySelector('[data-action="proposal"]').addEventListener('click', () => generateProposal(id));
    actionContainer.querySelector('[data-action="design"]').addEventListener('click', () => sendDesignToClient(id));
    actionContainer.querySelector('[data-action="mollie"]').addEventListener('click', () => generateInvoiceMollieLink(id, clientName));
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
        designUrl: document.getElementById('edit-designUrl')?.value || '',
        figmaUrl: document.getElementById('edit-designUrl')?.value || '',
    };

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

    alert("Klantkaart gegevens succesvol bijgewerkt!");
    closeModal('project-modal');
    loadDashboardData();
};

window.updateProjectStatusDirect = async (id, newStatus) => {
    let statusClass = "active";
    if (newStatus === "Wacht op Akkoord") statusClass = "waiting";
    else if (newStatus.includes("Mollie") || newStatus === "Afgerond") statusClass = "concept";
    else statusClass = "active";

    const itemIndex = cachedProjects.findIndex(p => p.id == id);
    if (itemIndex !== -1) {
        cachedProjects[itemIndex].status = newStatus;
        cachedProjects[itemIndex].statusClass = statusClass;
    }

    if (db) {
        try {
            const docRef = doc(db, "projects", id);
            await updateDoc(docRef, { status: newStatus, statusClass: statusClass });
        } catch(err) {
            console.error("Fout bij updaten status in Firestore:", err);
        }
    }

    alert(`Status gewijzigd naar: "${newStatus}"!\nHet project staat nu ook op het juiste tabblad.`);
    closeModal('project-modal');
    loadDashboardData();
};


window.generateProposal = async (id) => {
    if (!db) {
        alert("Firestore is niet verbonden (in mock-modus).");
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
        alert("Firestore is niet verbonden (in mock-modus).");
        return;
    }

    // Read designUrl from the Klantkaart input if it's open, or from cached data
    let designUrl = document.getElementById('edit-designUrl')?.value || '';
    if (!designUrl) {
        const p = cachedProjects.find(item => item.id == id);
        designUrl = p?.designUrl || p?.figmaUrl || '';
    }

    if (!designUrl || !designUrl.trim()) {
        alert("Vul eerst de Design / Figma URL in op de Klantkaart voordat je deze naar de klant stuurt.");
        return;
    }

    if (!confirm(`Wil je het ontwerp versturen naar de klant?\n\nDesign URL: ${designUrl}\n\nDe status wordt gewijzigd naar "Design Gereed voor Review" en de klant kan het ontwerp beoordelen in zijn portaal.`)) return;

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
        const docRef = doc(db, "projects", id);
        
        // Simuleer een Mollie Betaallink (Plink)
        const mockMollieLink = "https://useplink.com/payment/xyz123";
        
        await updateDoc(docRef, {
            status: "Opgeleverd (Betaling via Mollie)",
            statusClass: "concept",
            mollieLink: mockMollieLink
        });

        alert(`Factuurverzoek klaargezet!\n\nStuur de volgende betaallink naar ${name}:\n${mockMollieLink}\n\nDe status in het dashboard is geüpdatet.`);
        
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
            await deleteDoc(doc(db, "projects", id));
            cachedProjects = cachedProjects.filter(item => item.id != id);
            filterAndRenderTables();
            alert(`Project "${clientName}" is succesvol verwijderd.`);
        } catch (err) {
            console.error("Fout bij verwijderen project:", err);
            alert("Fout bij verwijderen: " + err.message);
        }
    }
};
