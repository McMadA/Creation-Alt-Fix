/**
 * Admin Dashboard Logic
 * Integrated with Firebase Auth & Firestore.
 * Fallbacks to mock data if Firebase is not yet configured.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// TODO: Vul hier je Firebase configuratie in zodra je het project hebt aangemaakt!
const firebaseConfig = {

  apiKey: "AIzaSyAj2_cXCL6fs9qjp2q89F3ezLbErDp4wI8",

  authDomain: "mythical-cider-475118-e5.firebaseapp.com",

  projectId: "mythical-cider-475118-e5",

  storageBucket: "mythical-cider-475118-e5.firebasestorage.app",

  messagingSenderId: "755599901945",

  appId: "1:755599901945:web:589450049c785dacfcce28"

};


// We gebruiken een try-catch zodat de app niet direct crasht als de config nog dummy-data is.
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
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
                if (data.status === "Nieuwe Lead") leads++;
                if (data.status === "In Ontwikkeling") projects++;
                if (data.status === "Wacht op Akkoord") waiting++;
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
});

// Luister naar de status van de gebruiker (ingelogd/uitgelogd)
if (auth) {
    onAuthStateChanged(auth, (user) => {
        const authOverlay = document.getElementById('auth-overlay');
        const adminApp = document.getElementById('admin-app');

        if (user) {
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
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
    
    const success = await API.login(email, password);
    if (!success) {
        btn.innerHTML = 'Inloggen';
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
    const tbody = document.querySelector('#projects-table tbody');
    tbody.innerHTML = '';
    
    const getTaskNr = (status) => {
        if (!status) return "";
        if (status.includes("Nieuwe Lead") || status.includes("Intake Voltooid")) return "Taak 01/02";
        if (status.includes("Wacht op Akkoord")) return "Taak 03";
        if (status.includes("Ontwikkeling")) return "Fase 3";
        if (status.includes("Mollie")) return "Taak 05";
        if (status.includes("Aftercare")) return "Taak 06";
        return "";
    };

    cachedProjects.forEach(p => {
        const row = document.createElement('tr');
        const taskNr = getTaskNr(p.status);
        row.innerHTML = `
            <td><strong>${p.client || p.companyName || 'Onbekend'}</strong></td>
            <td>${p.service || 'Onbekend'}</td>
            <td><span class="badge badge-${p.statusClass}">${p.status} ${taskNr ? `(${taskNr})` : ''}</span></td>
            <td>${p.date || 'Onbekend'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="openProjectDetails('${p.id}')"><i class="fas fa-eye"></i> Klantkaart</button>
                <button class="btn btn-sm" onclick="deleteProject('${p.id}')" style="background: var(--danger-color, #ef4444); color: white; border: none; padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer; margin-left: 5px;" title="Verwijderen"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
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

// --- Modals (Global so HTML onClick works) ---
window.openNewLeadModal = () => {
    document.getElementById('modal-title').innerText = 'Nieuwe Lead Toevoegen';
    document.getElementById('modal-body').innerHTML = `
        <p>Voeg handmatig een lead toe. Later koppelen we dit aan je website contactformulier en Google Ads campagnes.</p>
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
    
    if (db) {
        try {
            await addDoc(collection(db, "projects"), {
                client: name,
                contactName: name,
                email: email,
                service: desc || "Onbekend",
                status: "Nieuwe Lead",
                statusClass: "waiting",
                date: new Date().toLocaleDateString('nl-NL')
            });
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

window.deleteProject = async (id) => {
    if (confirm('Weet je zeker dat je deze klant/dit project wilt verwijderen?')) {
        if (db) {
            try {
                await deleteDoc(doc(db, "projects", id));
            } catch(e) {
                console.error("Error deleting", e);
            }
        } else {
            alert("Verwijderen gesimuleerd (mock data)");
        }
        loadDashboardData();
    }
};

window.openProjectDetails = (id) => {
    const p = cachedProjects.find(item => item.id == id) || { id, client: "Onbekende Klant", service: "Onbekend", status: "Nieuwe Lead", statusClass: "waiting", date: "Zojuist" };

    const clientName = p.client || p.companyName || "Onbekend Bedrijf";
    const contact = p.contactName || p.client || "Niet opgegeven";
    const email = p.email || "";
    const domain = p.domainName || "Nog niet aanwezig";
    const service = p.service || "Onbekend";
    const goals = p.goals || p.projectGoals || "Geen specifieke projectdoelen opgegeven bij intake.";
    const design = p.design || p.designPreferences || "Geen specifieke stijlvoorkeuren opgegeven.";
    const dateSubmitted = p.date || "Onbekend";
    const status = p.status || "Nieuwe Lead";
    const statusClass = p.statusClass || "waiting";

    document.getElementById('modal-title').innerText = `Klantkaart: ${clientName}`;
    document.getElementById('modal-body').innerHTML = `
        <div class="klantkaart-container">
            <div class="klantkaart-header">
                <div>
                    <strong style="font-size: 1.1rem; color: #fff;">${clientName}</strong>
                    <span style="font-size: 0.85rem; color: var(--color-text-secondary); display: block; margin-top: 2px;">Ingediend op: ${dateSubmitted}</span>
                </div>
                <span class="badge badge-${statusClass}">${status}</span>
            </div>

            <div class="klantkaart-meta-grid">
                <div class="meta-box">
                    <div class="meta-label"><i class="fas fa-user"></i> Contactpersoon</div>
                    <div class="meta-value">${contact}</div>
                </div>
                <div class="meta-box">
                    <div class="meta-label"><i class="fas fa-envelope"></i> E-mailadres</div>
                    <div class="meta-value">
                        ${email ? `<a href="mailto:${email}?subject=Creation%2BAlt%2BFix%20-%20Jouw%20Aanvraag">${email}</a>` : 'Geen e-mail'}
                    </div>
                </div>
                <div class="meta-box">
                    <div class="meta-label"><i class="fas fa-globe"></i> Domeinnaam</div>
                    <div class="meta-value">${domain}</div>
                </div>
                <div class="meta-box">
                    <div class="meta-label"><i class="fas fa-concierge-bell"></i> Dienst</div>
                    <div class="meta-value">${service}</div>
                </div>
            </div>

            <div class="intake-box">
                <h4><i class="fas fa-bullseye"></i> Projectdoelen & Omschrijving</h4>
                <p>${goals}</p>
            </div>

            <div class="intake-box">
                <h4><i class="fas fa-palette"></i> Design & Stijlvoorkeuren</h4>
                <p>${design}</p>
            </div>

            <div>
                <h4 class="actions-title"><i class="fas fa-bolt"></i> Werkstroom & Snelacties</h4>
                <div class="action-buttons-grid">
                    <button class="btn btn-secondary btn-sm" onclick="generateAiEmail('${id}')">
                        <i class="fas fa-robot"></i> AI Concept E-mail (Taak 04)
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="generateProposal('${id}')">
                        <i class="fas fa-file-contract"></i> Genereer Offerte (Taak 03)
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="generateInvoiceMollieLink('${id}', '${clientName}')">
                        <i class="fas fa-euro-sign"></i> Factuur + Mollie Link (Taak 05)
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="triggerCheckIn('${id}', '${clientName}')">
                        <i class="fas fa-sync-alt"></i> 14-Dagen Check-in (Taak 06)
                    </button>
                </div>
            </div>

            <div id="ai-email-container" class="hidden" style="padding: 15px; background: rgba(34, 211, 238, 0.08); border-radius: 8px; border: 1px solid rgba(34, 211, 238, 0.3);">
                <p style="margin-bottom: 10px; font-weight: 600; color: var(--color-accent);"><i class="fas fa-magic"></i> AI Concept E-mail (Gepersonaliseerd op basis van intake):</p>
                <textarea id="ai-email-body" class="admin-input" rows="7" style="font-family: var(--font-body);"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn btn-primary btn-sm" onclick="sendMailToClient('${email}')"><i class="fas fa-paper-plane"></i> Open in E-mail Client</button>
                    <button class="btn btn-secondary btn-sm" onclick="copyAiEmail()"><i class="fas fa-copy"></i> Kopiëren</button>
                </div>
            </div>

            <div id="proposal-link-container" class="hidden" style="padding: 15px; background: rgba(99,102,241,0.08); border-radius: 8px; border: 1px solid rgba(99,102,241,0.3);">
                <p style="margin-bottom: 10px; font-weight: 600; color: #818cf8;"><i class="fas fa-link"></i> Gegenereerde Online Offerte Link:</p>
                <input type="text" id="proposal-link" class="admin-input" readonly style="margin-bottom: 10px;">
                <a id="proposal-visit-btn" href="#" target="_blank" class="btn btn-primary btn-sm"><i class="fas fa-external-link-alt"></i> Bekijk Offerte</a>
            </div>
        </div>
    `;
    document.getElementById('project-modal').classList.remove('hidden');
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
