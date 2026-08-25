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
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig, escapeHtml, ADMIN_EMAILS, isAdminEmail } from "../../js/firebase-config.js";
import { generateProposalPDF, generateInvoicePDF, uploadPdfToStorage } from "../../js/pdf-generator.js";


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
        let leads = 0, active = 0, waiting = 0, delivered = 0, openTasks = 0;

        projects.forEach(p => {
            const s = (p.status || '').toLowerCase();

            // Fase 1: Leads & Intakes
            if (s.includes('lead') || s.includes('intake')) leads++;

            // Wachten op actie / akkoord / review
            if (s.includes('akkoord') || s.includes('review') || s.includes('wacht op')) waiting++;

            // Fase 2-4: Lopende Projecten
            if (s.includes('ontwikkeling') || s.includes('design') || s.includes('concept') || s.includes('bezig')) active++;

            // Fase 5: Opgeleverd / Livegang / Afgerond
            if (s.includes('opgeleverd') || s.includes('livegang') || s.includes('mollie') || s.includes('afgerond')) delivered++;

            // Count open tasks
            const tasks = p.tasks || [];
            tasks.forEach(t => {
                if (!t.completed && t.status !== 'done') openTasks++;
            });
        });

        return { leads, projects: active, waiting, delivered, openTasks };
    },

    async getProjects() {
        if (!db) return this.getMockProjects();

        try {
            const querySnapshot = await getDocs(collection(db, "projects"));
            const projectsList = [];
            querySnapshot.forEach((doc) => {
                projectsList.push({ id: doc.id, ...doc.data() });
            });

            // Ensure our own website, CRM & Foodtruck Store exist in Firestore for testing
            const hasOwnSite = projectsList.some(p => (p.client && p.client.includes("Hoofdwebsite")) || (p.domainName && p.domainName.includes("creationaltfix.nl") && !p.client?.includes("CRM")));
            const hasOwnCrm = projectsList.some(p => (p.client && p.client.includes("CRM")) || (p.domainName && p.domainName.includes("portal.creationaltfix.nl")));
            const hasFtruck = projectsList.some(p => (p.client && p.client.includes("Foodtruck")) || (p.domainName && p.domainName.includes("ftruckstore")));
            const mockList = this.getMockProjects();

            if (!hasOwnSite || !hasOwnCrm || !hasFtruck) {
                if (!hasOwnSite) {
                    const siteObj = mockList.find(m => m.id === 6);
                    if (siteObj) {
                        const { id, ...siteData } = siteObj;
                        try {
                            const ref = await addDoc(collection(db, "projects"), siteData);
                            projectsList.push({ id: ref.id, ...siteData });
                        } catch (err) { console.warn("Kon testproject website niet seeden:", err); }
                    }
                }
                if (!hasOwnCrm) {
                    const crmObj = mockList.find(m => m.id === 7);
                    if (crmObj) {
                        const { id, ...crmData } = crmObj;
                        try {
                            const ref = await addDoc(collection(db, "projects"), crmData);
                            projectsList.push({ id: ref.id, ...crmData });
                        } catch (err) { console.warn("Kon testproject CRM niet seeden:", err); }
                    }
                }
                if (!hasFtruck) {
                    const ftruckObj = mockList.find(m => m.id === 12);
                    if (ftruckObj) {
                        const { id, ...ftData } = ftruckObj;
                        try {
                            const ref = await addDoc(collection(db, "projects"), ftData);
                            projectsList.push({ id: ref.id, ...ftData });
                        } catch (err) { console.warn("Kon project Foodtruck Store niet seeden:", err); }
                    }
                }
            }

            // Universal task synchronization & canceled task filtering for ALL projects
            for (const p of projectsList) {
                // Filter out canceled TASK-501
                if (p.tasks && Array.isArray(p.tasks)) {
                    p.tasks = p.tasks.filter(t => !t.id?.includes('501') && !t.title?.includes('TASK-501') && !t.title?.includes('Google Ads') && !t.title?.includes('400'));
                }

                const pName = (p.client || p.companyName || '').toLowerCase();
                const pDom = (p.domainName || p.domain || '').toLowerCase();

                // Match against rich deliverables in mockList
                let matchedMock = mockList.find(m => {
                    const mName = (m.client || m.companyName || '').toLowerCase();
                    const mDom = (m.domainName || m.domain || '').toLowerCase();
                    if (pName.includes('hoofdwebsite') || (pDom.includes('creationaltfix') && !pName.includes('crm') && !pDom.includes('portal') && !pDom.includes('hbi'))) return m.id === 6;
                    if (pName.includes('crm') || pDom.includes('portal.creationaltfix')) return m.id === 7;
                    if (pName.includes('besseling') || pDom.includes('besseling')) return m.id === 8;
                    if (pName.includes('arnold') || pDom.includes('arnold')) return m.id === 5;
                    if (pName.includes('angela') || pDom.includes('angela')) return m.id === 9;
                    if (pName.includes('hbi') || pName.includes('buyer') || pDom.includes('hbi.')) return m.id === 10;
                    if (pName.includes('sieg') || pDom.includes('bakkertjesieg')) return m.id === 11;
                    if (pName.includes('ftruck') || pDom.includes('ftruck')) return m.id === 12;
                    if (pName && mName && (pName.includes(mName) || mName.includes(pName))) return true;
                    if (pDom && mDom && (pDom.includes(mDom) || mDom.includes(pDom))) return true;
                    return false;
                });

                if (matchedMock && matchedMock.tasks && matchedMock.tasks.length > 0) {
                    const currentCount = (p.tasks && Array.isArray(p.tasks)) ? p.tasks.length : 0;
                    // If current tasks are empty or missing new deliverables, update to matched tasks
                    if (currentCount < matchedMock.tasks.length || pName.includes('hoofdwebsite') || pName.includes('crm') || pName.includes('besseling') || pName.includes('arnold') || pName.includes('sieg') || pName.includes('angela')) {
                        p.tasks = matchedMock.tasks;
                        if (p.id && String(p.id).length > 5) {
                            updateDoc(doc(db, "projects", p.id), { tasks: matchedMock.tasks }).catch(console.warn);
                        }
                    }
                } else if (!p.tasks || !Array.isArray(p.tasks) || p.tasks.length === 0) {
                    // Populate clean delivery milestones for completed historical projects so none show '0 taken'
                    const isDone = (p.status || '').includes('Opgeleverd') || (p.status || '').includes('Live');
                    const defaultTasks = [
                        { id: 'del_' + (p.id || '1') + '_1', title: 'Intake, functionele briefing & wensenanalyse', completed: isDone, status: isDone ? 'done' : 'inprogress', priority: 'high', dueDate: p.date || '2025-01-01' },
                        { id: 'del_' + (p.id || '1') + '_2', title: 'UI/UX Design & responsive template ontwikkeling', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'high', dueDate: p.date || '2025-01-01' },
                        { id: 'del_' + (p.id || '1') + '_3', title: 'Content, formulieren, database & API koppeling', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'medium', dueDate: p.date || '2025-01-01' },
                        { id: 'del_' + (p.id || '1') + '_4', title: 'Livegang, DNS domeinkoppeling & SSL certificering', completed: isDone, status: isDone ? 'done' : 'todo', priority: 'high', dueDate: p.date || '2025-01-01' }
                    ];
                    p.tasks = defaultTasks;
                    if (p.id && String(p.id).length > 5) {
                        updateDoc(doc(db, "projects", p.id), { tasks: defaultTasks }).catch(console.warn);
                    }
                }
            }

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
                companyName: "Bakkerij de Vries",
                contactName: "Jan de Vries",
                email: "jan@bakkerijdevries.nl",
                domainName: "www.bakkerijdevries.nl",
                domain: "www.bakkerijdevries.nl",
                service: "Webshop Laten Maken",
                goals: "Online bestelsysteem voor ambachtelijk brood & gebak.",
                design: "Modern, warm, ambachtelijk met oranje tinten.",
                status: "In Ontwikkeling",
                statusClass: "active",
                date: "12-08-2026",
                tasks: [
                    { id: 't1_1', title: 'iDEAL & Mollie betaalkoppeling testen', status: 'inprogress', priority: 'high', dueDate: '2026-08-28' },
                    { id: 't1_2', title: 'Productcategorieën en allergenen invoeren', status: 'todo', priority: 'medium', dueDate: '2026-08-30' }
                ]
            },
            {
                id: 2,
                client: "Jansen IT Consulting",
                companyName: "Jansen IT Consulting",
                contactName: "Mark Jansen",
                email: "mark@jansen-it.nl",
                domainName: "www.jansen-it.nl",
                domain: "www.jansen-it.nl",
                service: "Slimme Automatisering & AI",
                goals: "Lead intake automatiseren met AI e-mail drafts.",
                design: "Zakelijk, minimalistisch, strak blauw.",
                status: "Wacht op Akkoord",
                statusClass: "waiting",
                date: "11-08-2026",
                tasks: [
                    { id: 't2_1', title: 'AI prompt tuning & webhook testen', status: 'review', priority: 'high', dueDate: '2026-08-27' }
                ]
            },
            {
                id: 3,
                client: "Stenekes Riool & Grondwerk",
                companyName: "Stenekes Riool & Grondwerk",
                contactName: "Klaas Stenekes",
                email: "info@stenekes-riool.nl",
                domainName: "www.stenekes-riool.nl",
                domain: "www.stenekes-riool.nl",
                service: "Website Laten Maken",
                goals: "Lokale vindbaarheid en spoedklus formulier.",
                design: "Donker thema met fel gele accenten.",
                status: "Opgeleverd (Livegang)",
                statusClass: "success",
                date: "08-08-2026",
                tasks: [
                    { id: 't3_1', title: 'Livegang en Google Bedrijfsprofiel koppeling', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-08' }
                ]
            },
            {
                id: 4,
                client: "Kapsalon Bella",
                companyName: "Kapsalon Bella",
                contactName: "Bella Visser",
                email: "afspraken@kapsalonbella.nl",
                domainName: "www.kapsalonbella.nl",
                domain: "www.kapsalonbella.nl",
                service: "Website & Afsprakensysteem",
                goals: "Online agenda koppeling voor knipafspraken.",
                design: "Pastel roze, goud, elegant.",
                status: "Nieuwe Lead",
                statusClass: "concept",
                date: "13-08-2026",
                tasks: [
                    { id: 't4_1', title: 'Intakegesprek inplannen & wensen inventariseren', status: 'todo', priority: 'high', dueDate: '2026-08-29' }
                ]
            },
            {
                id: 5,
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
            },
            {
                id: 6,
                client: "Creation+Alt+Fix (Hoofdwebsite)",
                companyName: "Creation+Alt+Fix (Hoofdwebsite)",
                contactName: "Allard Veldman",
                email: "info@creationaltfix.nl",
                domainName: "www.creationaltfix.nl",
                domain: "www.creationaltfix.nl",
                service: "Website & Portfolio Platform (Dark AI)",
                goals: "Hoofdwebsite voor software support & AI-diensten.",
                projectGoals: "Hoofdwebsite voor software support & AI-diensten.",
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
                    { id: 'web_t4', title: 'Wat gebeurt er als ik overlijd met de websites? (Noodprotocol & Continuïteitsplan)', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-08' },
                    { id: 'web_t5', title: '[TASK-502] Hosting Management & Terugkerende Onderhoudsdiensten', completed: false, status: 'todo', priority: 'low', dueDate: '2026-09-10' },
                    { id: 'web_t6', title: 'SEO Sitemap, Structured Data & Google Search Console Indexering', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'web_t7', title: 'Stories waarin ik bezig ben posten & Instagram branding', completed: false, status: 'inprogress', priority: 'medium', dueDate: '2026-08-28' },
                    { id: 'web_t8', title: 'Personal branding & profielversterking op LinkedIn/Instagram', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-12' }
                ],
                internalNotes: [
                    { id: 'web_n1', text: 'Portfolio grid succesvol uitgebreid naar 13 projecten met responsive tablet/desktop navbar.', createdAt: '2026-08-25T18:00:00Z', author: 'Allard Veldman' }
                ],
                auditLog: [
                    { id: 'web_l1', timestamp: '2026-08-25T18:30:00Z', type: 'status_updated', description: 'Hoofdwebsite succesvol live gezet op Vimexx public_html/', actor: 'Allard Veldman' }
                ]
            },
            {
                id: 7,
                client: "Creation+Alt+Fix (CRM & Portaal)",
                companyName: "Creation+Alt+Fix (CRM & Portaal)",
                contactName: "Allard Veldman",
                email: "info@creationaltfix.nl",
                domainName: "portal.creationaltfix.nl",
                domain: "portal.creationaltfix.nl",
                service: "Custom CRM & Klantenportaal Applicatie",
                goals: "Proprietary Vanilla JS CRM systeem met Firebase Auth, Firestore real-time database.",
                projectGoals: "Proprietary Vanilla JS CRM systeem met Firebase Auth, Firestore real-time database.",
                design: "Full-screen dark workspace, responsive stat cards, Kanban kolommen.",
                designPreferences: "Full-screen dark workspace, responsive stat cards, Kanban kolommen.",
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
            },
            {
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
            },
            {
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
            },
            {
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
            },
            {
                id: 11,
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
                proposalPrice: "750,00",
                tasks: [
                    { id: 'bs_1', title: 'Downloads klaarzetten na betaling in klantaccounts', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-10' },
                    { id: 'bs_2', title: 'Betalingen & iDEAL koppeling regelen', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-12' },
                    { id: 'bs_3', title: 'Instagram plugin werkend maken ipv statische afbeeldingen', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-14' },
                    { id: 'bs_4', title: 'Contactformulier routeren naar bakkertjesieg@gmail.com', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-15' },
                    { id: 'bs_5', title: 'Nieuwsbrief formulier API check uitvoeren', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-16' },
                    { id: 'bs_6', title: 'Factuur sturen & administratieve afronding', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-18' },
                    { id: 'bs_7', title: 'Beoordelingen checken en placeholders verwijderen', completed: true, status: 'done', priority: 'low', dueDate: '2026-08-19' },
                    { id: 'bs_8', title: 'Verzendkosten configuratie toevoegen aan checkout', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-20' },
                    { id: 'bs_9', title: 'Password reset custom email fixen', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-21' },
                    { id: 'bs_10', title: 'Nieuwsbrief MailerLite integratie migreren', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-22' },
                    { id: 'bs_11', title: 'Offertes laten genereren met bestelling in de mail', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-23' },
                    { id: 'bs_12', title: 'Admin portal updaten met nieuwe functies', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-24' }
                ],
                internalNotes: [
                    { id: 'bs_n1', text: 'Alle 12 projectdeliverables zijn succesvol opgeleverd (12/12 af).', createdAt: '2026-08-25T17:30:00Z', author: 'Allard' }
                ],
                auditLog: [
                    { id: 'bs_l1', timestamp: '2026-08-25T17:30:00Z', type: 'status_updated', description: 'Status bijgewerkt naar Opgeleverd (Livegang) - Alle 12 taken voltooid.', actor: 'Allard' }
                ]
            },
            {
                id: 12,
                client: "Foodtruck Store",
                companyName: "Foodtruck Store (ftruckstore.nl)",
                contactName: "Foodtruck Store Beheer",
                email: "info@ftruckstore.nl",
                domainName: "ftruckstore.nl / ftruckstore.com",
                domain: "ftruckstore.nl",
                service: "Hosting & Website Migratie",
                serviceCategory: "Hosting & Migratie",
                goals: "Bestaande webshop en platform succesvol gemigreerd naar onze managed hostingomgeving.",
                projectGoals: "Bestaande webshop en platform succesvol gemigreerd naar onze managed hostingomgeving met zero-downtime DNS configuratie, SSL en database tuning.",
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
                    { id: 'ft_5', title: '[MIG-05] 24/7 Uptime & periodiek back-upbeheer inrichten', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-20' }
                ],
                internalNotes: [
                    { id: 'ft_n1', text: 'Hosting & migratie project: website is niet door Creation+Alt+Fix ontworpen, maar gemigreerd naar ons managed platform.', createdAt: '2026-08-25T18:00:00Z', author: 'Allard Veldman' }
                ],
                auditLog: [
                    { id: 'ft_l1', timestamp: '2026-08-25T18:00:00Z', type: 'status_updated', description: 'Migratie succesvol afgerond en live op managed hosting (5/5 taken voltooid).', actor: 'Allard Veldman' }
                ]
            }
        ];
    }
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
    // 1. Load Projects Table & sync state
    cachedProjects = await API.getProjects();

    // 2. Compute dynamic stats from cached projects
    const stats = await API.getDashboardStats();
    
    const elLeads = document.getElementById('stat-leads');
    const elProjects = document.getElementById('stat-projects');
    const elWaiting = document.getElementById('stat-waiting');
    const elDelivered = document.getElementById('stat-delivered');
    const elTasks = document.getElementById('stat-tasks');

    if (elLeads) elLeads.innerText = stats.leads;
    if (elProjects) elProjects.innerText = stats.projects;
    if (elWaiting) elWaiting.innerText = stats.waiting;
    if (elDelivered) elDelivered.innerText = stats.delivered;
    if (elTasks) elTasks.innerText = stats.openTasks;
    
    // 3. Initial Render
    filterAndRenderTables();
    renderKanbanBoard();
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

    const formatTaskCounter = (p) => {
        const tasks = p.tasks || [];
        const total = tasks.length;
        if (total === 0) {
            return `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-size: 0.8rem; color: var(--color-text-secondary);"><i class="fas fa-minus" style="font-size: 0.65rem; opacity: 0.5;"></i> 0 taken</span>`;
        }
        const done = tasks.filter(t => t.completed || t.status === 'done').length;
        const isAllDone = done === total && total > 0;
        const color = isAllDone ? '#34d399' : done > 0 ? '#818cf8' : '#fbbf24';
        const bg = isAllDone ? 'rgba(16, 185, 129, 0.12)' : done > 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(251, 191, 36, 0.12)';
        const border = isAllDone ? 'rgba(16, 185, 129, 0.3)' : done > 0 ? 'rgba(99, 102, 241, 0.3)' : 'rgba(251, 191, 36, 0.3)';
        const icon = isAllDone ? 'fa-check-circle' : 'fa-tasks';

        return `<span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; background: ${bg}; border: 1px solid ${border}; font-size: 0.82rem; font-weight: 600; color: ${color}; white-space: nowrap;" title="${done} van de ${total} taken voltooid">
            <i class="fas ${icon}"></i> ${done}/${total} af
        </span>`;
    };

    const formatEmail = (email) => {
        if (!email || email.trim() === '' || email === '—') {
            return `<span style="color: var(--color-text-secondary); font-style: italic; font-size: 0.85rem;">Geen e-mail</span>`;
        }
        const safeEmail = escapeHtml(email.trim());
        return `<a href="mailto:${safeEmail}" class="table-email-link" title="Stuur e-mail naar ${safeEmail}"><i class="fas fa-envelope"></i> ${safeEmail}</a>`;
    };

    const formatDomain = (domain) => {
        if (!domain || domain.trim() === '' || domain.toLowerCase() === 'nog geen domein' || domain.toLowerCase() === 'geen' || domain.toLowerCase() === 'n.v.t.') {
            return `<span style="color: var(--color-text-secondary); font-style: italic; font-size: 0.85rem;">Geen domein</span>`;
        }
        const cleanDomain = escapeHtml(domain.trim());
        const href = (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) ? cleanDomain : 'https://' + cleanDomain;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="table-domain-link" title="Open ${cleanDomain}"><i class="fas fa-globe"></i> ${cleanDomain}</a>`;
    };

    const createRow = (p) => {
        const row = document.createElement('tr');
        const phaseTag = getPhaseTag(p.status);
        const safeClient = escapeHtml(p.client || p.companyName || 'Onbekend');
        const taskCounterHtml = formatTaskCounter(p);
        const emailHtml = formatEmail(p.email);
        const domainHtml = formatDomain(p.domainName || p.domain);
        const safeService = escapeHtml(p.service || 'Onbekend');
        const safeStatus = escapeHtml(p.status || 'Nieuwe Lead');
        const safeDate = escapeHtml(p.date || 'Onbekend');
        const safeId = escapeHtml(p.id);
        const safeStatusClass = escapeHtml(p.statusClass || 'waiting');

        row.innerHTML = `
            <td><strong style="color: #fff;">${safeClient}</strong></td>
            <td>${taskCounterHtml}</td>
            <td>${emailHtml}</td>
            <td>${domainHtml}</td>
            <td><span style="color: var(--color-text-primary);">${safeService}</span></td>
            <td><span class="badge badge-${safeStatusClass}">${safeStatus} (${phaseTag})</span></td>
            <td><span style="color: var(--color-text-secondary); font-size: 0.85rem;">${safeDate}</span></td>
            <td style="white-space: nowrap;">
                <a href="project.html?id=${safeId}" class="btn btn-primary btn-sm" style="text-decoration: none;" title="Open Dedicated Werkplek"><i class="fas fa-desktop"></i> Werkplek</a>
                <button class="btn btn-secondary btn-sm" data-action="details" data-id="${safeId}"><i class="fas fa-eye"></i> Snelmenu</button>
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
            overviewBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen resultaten gevonden voor deze zoekopdracht/filter.</td></tr>`;
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
            leadsBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen nieuwe leads gevonden.</td></tr>`;
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
            activeProjectsBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Geen lopende projecten gevonden.</td></tr>`;
        } else {
            activeProjects.forEach(p => activeProjectsBody.appendChild(createRow(p)));
        }
    }
}

function filterAndRenderTables() {
    const searchInput = document.getElementById('admin-search-input');
    const filterSelect = document.getElementById('admin-status-filter');

    const query = (searchInput?.value || '').trim().toLowerCase();
    const filterVal = filterSelect?.value || 'all';

    let filtered = cachedProjects.filter(p => {
        // Status filter
        if (filterVal !== 'all') {
            const st = (p.status || '').toLowerCase();
            if (filterVal === 'Intake' && !st.includes('intake') && !st.includes('lead')) return false;
            if (filterVal === 'Akkoord' && !st.includes('akkoord') && !st.includes('offerte')) return false;
            if (filterVal === 'Design' && !st.includes('design')) return false;
            if (filterVal === 'Ontwikkeling' && !st.includes('ontwikkeling')) return false;
            if (filterVal === 'Opgeleverd' && !st.includes('mollie') && !st.includes('opgeleverd') && !st.includes('afgerond') && !st.includes('livegang')) return false;
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

    renderTablesData(filtered);
}

function setupSearchAndFilters() {
    document.getElementById('admin-search-input')?.addEventListener('input', () => filterAndRenderTables());
    document.getElementById('admin-status-filter')?.addEventListener('change', () => filterAndRenderTables());
}

window.exportProjectsToCSV = () => {
    if (cachedProjects.length === 0) return alert("Geen projectgegevens om te exporteren.");

    const headers = ["ID", "Klant / Bedrijf", "Contactpersoon", "E-mailadres", "Domeinnaam", "Dienst", "Status", "Offertebedrag (EUR)", "Voltooide Taken", "Totale Taken", "Datum"];
    const rows = cachedProjects.map(p => {
        const tasks = p.tasks || [];
        const doneTasks = tasks.filter(t => t.completed || t.status === 'done').length;
        return [
            `"${p.id || ''}"`,
            `"${(p.client || p.companyName || '').replace(/"/g, '""')}"`,
            `"${(p.contactName || '').replace(/"/g, '""')}"`,
            `"${(p.email || '').replace(/"/g, '""')}"`,
            `"${(p.domainName || p.domain || '').replace(/"/g, '""')}"`,
            `"${(p.service || '').replace(/"/g, '""')}"`,
            `"${(p.status || '').replace(/"/g, '""')}"`,
            `"${(p.proposalPrice || '0').replace(/"/g, '""')}"`,
            doneTasks,
            tasks.length,
            `"${(p.date || '').replace(/"/g, '""')}"`
        ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CreationAltFix_Projecten_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

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
    const isAuthActivated = Boolean((p.clientUid && p.clientUid !== 'QVzS7PyJkeXi7mM50HOgXsSiQFe2') || p.isClientAccount);

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
                    <a href="project.html?id=${s.safeId}" class="btn btn-primary btn-sm" style="text-decoration: none;"><i class="fas fa-external-link-alt"></i> Open Werkplek</a>
                    <select onchange="window.updateProjectPhaseFromModal('${s.safeId}', this.value)" class="admin-input" style="padding: 4px 8px; font-size: 0.8rem; margin: 0; width: auto; cursor: pointer; background: rgba(15,23,42,0.9); border: 1px solid var(--color-primary-light); color: #fff; border-radius: 6px;" title="Wijzig status/fase direct">
                        <option value="1" ${currentPhase === 1 ? 'selected' : ''}>Fase 1: Intake</option>
                        <option value="2" ${currentPhase === 2 ? 'selected' : ''}>Fase 2: Offerte</option>
                        <option value="3" ${currentPhase === 3 ? 'selected' : ''}>Fase 3: Design</option>
                        <option value="4" ${currentPhase === 4 ? 'selected' : ''}>Fase 4: Code</option>
                        <option value="5" ${currentPhase === 5 ? 'selected' : ''}>Fase 5: Livegang</option>
                    </select>
                </div>
            </div>

            <!-- Visual 5-Stage Phase Tracker (Clickable) -->
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
                <div onclick="window.updateProjectPhaseFromModal('${s.safeId}', 5)" style="text-align: center; padding: 8px 4px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; ${currentPhase === 5 ? 'background: rgba(16, 185, 129, 0.2); border: 1px solid #34d399; color: #34d399; font-weight: 700;' : 'color: #94a3b8;'}" title="Klik om naar Fase 5 (Livegang) te schakelen">
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

                <div class="intake-box" style="margin-top: 15px; background: ${isAuthActivated ? 'rgba(16, 185, 129, 0.05)' : 'rgba(99, 102, 241, 0.05)'}; border: 1px solid ${isAuthActivated ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'};">
                    <h4 style="margin-top: 0;"><i class="fas fa-key"></i> Klantenportaal Inlog (Firebase Auth)</h4>
                    <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 8px;">
                        Gekoppeld account e-mailadres: <strong>${s.email || 'Nog geen e-mail ingevuld'}</strong>
                        ${isAuthActivated 
                            ? `<span style="color: #34d399; font-weight: 600; margin-left: 8px;"><i class="fas fa-check-circle"></i> Geactiveerd in Firebase Auth</span>` 
                            : `<span style="color: #fbbf24; font-weight: 600; margin-left: 8px;"><i class="fas fa-exclamation-circle"></i> Niet geactiveerd in Firebase Auth</span>`}
                    </p>
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 10px;">
                        <i class="fas fa-info-circle"></i> Hiermee logt de klant in op <code>https://creationaltfix.nl/portal/</code> om live de projectstatus en bestanden in te zien.
                    </p>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="btn btn-primary btn-sm" id="btn-activate-auth">
                            <i class="fas fa-user-plus"></i> ${isAuthActivated ? 'Her-activeer / Koppel Account in Auth' : 'Activeer Klantaccount & Stuur Inlog-Mail'}
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-auth">
                            <i class="fas fa-paper-plane"></i> Stuur Wachtwoord Reset E-mail
                        </button>
                    </div>
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

    // Bind Auth buttons
    document.getElementById('btn-activate-auth')?.addEventListener('click', () => createClientAuthAccount(id, document.getElementById('edit-email')?.value || email, contact));
    document.getElementById('btn-reset-auth')?.addEventListener('click', () => triggerAdminPasswordReset(document.getElementById('edit-email')?.value || email));

    // Bind action buttons via event listeners instead of inline onclick
    const actionContainer = document.getElementById('action-buttons-container');
    actionContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" data-action="ai-email"><i class="fas fa-robot"></i> AI Concept Mail (Fase 1)</button>
        <button class="btn btn-secondary btn-sm" data-action="proposal"><i class="fas fa-file-contract"></i> Genereer Offerte (Fase 2)</button>
        <button class="btn btn-secondary btn-sm" data-action="download-offerte" style="border-color: rgba(99, 102, 241, 0.4); color: var(--color-primary-light);"><i class="fas fa-file-pdf"></i> Download Offerte (PDF)</button>
        <button class="btn btn-secondary btn-sm" data-action="design" style="border-color: rgba(168, 85, 247, 0.4); color: #c084fc;"><i class="fas fa-palette"></i> Verstuur Design naar Klant (Fase 3)</button>
        <button class="btn btn-secondary btn-sm" data-action="mollie"><i class="fas fa-euro-sign"></i> Factuur + Mollie (Fase 5)</button>
        <button class="btn btn-secondary btn-sm" data-action="download-factuur" style="border-color: rgba(34, 211, 238, 0.4); color: var(--color-accent);"><i class="fas fa-receipt"></i> Download Factuur (PDF)</button>
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

window.updateProjectPhaseFromModal = async (id, phaseNum) => {
    const phase = parseInt(phaseNum, 10);
    if (!phase) return;

    let targetStatus = "Intake Voltooid";
    let targetStatusClass = "waiting";

    if (phase === 1) {
        targetStatus = "Intake Voltooid";
        targetStatusClass = "waiting";
    } else if (phase === 2) {
        targetStatus = "Wacht op Akkoord";
        targetStatusClass = "waiting";
    } else if (phase === 3) {
        targetStatus = "Design & Ontwerp (Fase 3)";
        targetStatusClass = "active";
    } else if (phase === 4) {
        targetStatus = "In Ontwikkeling";
        targetStatusClass = "active";
    } else if (phase === 5) {
        targetStatus = "Opgeleverd (Livegang)";
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

    alert(`Projectfase gewijzigd naar: "Fase ${phase}: ${targetStatus}"!`);
    loadDashboardData();
    window.openProjectDetails(id);
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
            renderKanbanBoard();
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

// ============================================================
// [TASK-602] Global Kanban Board & Task Management System
// ============================================================

function setupKanbanListeners() {
    document.getElementById('btn-open-kanban-task-modal')?.addEventListener('click', () => openGlobalTaskModal());
    document.getElementById('global-add-task-form')?.addEventListener('submit', (e) => saveGlobalTask(e));
}

function renderKanbanBoard() {
    const todoList = document.getElementById('list-kanban-todo');
    const inprogressList = document.getElementById('list-kanban-inprogress');
    const reviewList = document.getElementById('list-kanban-review');
    const doneList = document.getElementById('list-kanban-done');

    if (!todoList || !inprogressList || !reviewList || !doneList) return;

    // Reset Column containers
    todoList.innerHTML = '';
    inprogressList.innerHTML = '';
    reviewList.innerHTML = '';
    doneList.innerHTML = '';

    const allTasks = [];

    // Aggregate tasks from all cached projects
    cachedProjects.forEach(p => {
        const clientName = p.client || p.companyName || 'Onbekend Project';
        const projectTasks = p.tasks || [];

        // If project has no tasks yet, create default placeholder milestone task based on its status
        if (projectTasks.length === 0) {
            let defaultStatus = 'todo';
            if (p.status?.includes('Ontwikkeling') || p.status?.includes('Design')) defaultStatus = 'inprogress';
            if (p.status?.includes('Wacht op Akkoord')) defaultStatus = 'review';
            if (p.status?.includes('Opgeleverd') || p.status?.includes('Livegang')) defaultStatus = 'done';

            allTasks.push({
                id: 'gen_' + p.id,
                projectId: p.id,
                clientName: clientName,
                title: `${p.service || 'Project'} Oplevering & Coördinatie`,
                priority: 'medium',
                status: defaultStatus,
                dueDate: p.date || null,
                isAutoGenerated: true
            });
        } else {
            projectTasks.forEach(t => {
                let status = t.status || (t.completed ? 'done' : 'todo');
                if (status === 'in_progress') status = 'inprogress';
                allTasks.push({
                    ...t,
                    projectId: p.id,
                    clientName: clientName,
                    status: status
                });
            });
        }
    });

    // Counts
    let cTodo = 0, cInprogress = 0, cReview = 0, cDone = 0;

    const createKanbanCard = (t) => {
        const card = document.createElement('div');
        card.className = 'kanban-card';

        let priorityClass = 'medium';
        if (t.priority === 'high') priorityClass = 'high';
        if (t.priority === 'low') priorityClass = 'low';
        const priorityLabel = t.priority === 'high' ? 'Hoog' : (t.priority === 'low' ? 'Laag' : 'Gemiddeld');

        let deadlineHtml = '';
        if (t.dueDate) {
            const today = new Date().toISOString().slice(0, 10);
            const isOverdue = t.status !== 'done' && t.dueDate < today;
            deadlineHtml = `<span class="deadline-tag ${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar-alt"></i> ${escapeHtml(t.dueDate)}</span>`;
        }

        const safeProject = escapeHtml(t.clientName);
        const safeTitle = escapeHtml(t.title);
        const safeProjectId = escapeHtml(t.projectId);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                <span class="kanban-project-tag" title="${safeProject}">${safeProject}</span>
                <span class="priority-pill ${priorityClass}">${priorityLabel}</span>
            </div>
            <div class="kanban-card-title">${safeTitle}</div>
            <div class="kanban-card-meta">
                ${deadlineHtml}
                <a href="project.html?id=${safeProjectId}" class="btn btn-sm" style="background: rgba(99,102,241,0.15); color: var(--color-primary-light); padding: 2px 6px; font-size: 0.72rem; border-radius: 4px; text-decoration: none;" title="Open Project Werkplek">
                    <i class="fas fa-external-link-alt"></i> Open
                </a>
            </div>
            <div class="kanban-card-actions">
                <label style="font-size: 0.7rem; color: var(--color-text-secondary);">Status:</label>
                <select class="admin-input kanban-status-select" style="padding: 2px 6px; font-size: 0.75rem; margin: 0; width: auto; cursor: pointer;">
                    <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
                    <option value="inprogress" ${t.status === 'inprogress' ? 'selected' : ''}>In Behandeling</option>
                    <option value="review" ${t.status === 'review' ? 'selected' : ''}>Review</option>
                    <option value="done" ${t.status === 'done' ? 'selected' : ''}>Voltooid</option>
                </select>
            </div>
        `;

        card.querySelector('.kanban-status-select').addEventListener('change', (e) => {
            moveKanbanTask(t.projectId, t.id, e.target.value);
        });

        return card;
    };

    allTasks.forEach(t => {
        const card = createKanbanCard(t);
        if (t.status === 'inprogress') {
            inprogressList.appendChild(card);
            cInprogress++;
        } else if (t.status === 'review') {
            reviewList.appendChild(card);
            cReview++;
        } else if (t.status === 'done') {
            doneList.appendChild(card);
            cDone++;
        } else {
            todoList.appendChild(card);
            cTodo++;
        }
    });

    // Update count badges
    document.getElementById('count-kanban-todo').innerText = cTodo;
    document.getElementById('count-kanban-inprogress').innerText = cInprogress;
    document.getElementById('count-kanban-review').innerText = cReview;
    document.getElementById('count-kanban-done').innerText = cDone;
}

async function moveKanbanTask(projectId, taskId, targetStatus) {
    const project = cachedProjects.find(p => p.id == projectId);
    if (!project) return;

    let tasks = project.tasks || [];

    // If it's a generated task, initialize it into real project tasks
    if (taskId.startsWith('gen_')) {
        const newTask = {
            id: 'task_' + Date.now(),
            title: `${project.service || 'Project'} Oplevering & Deliverables`,
            status: targetStatus,
            completed: targetStatus === 'done',
            priority: 'medium',
            createdAt: new Date().toISOString()
        };
        tasks = [newTask];
    } else {
        tasks = tasks.map(t => {
            if (t.id === taskId) {
                return {
                    ...t,
                    status: targetStatus,
                    completed: targetStatus === 'done',
                    completedAt: targetStatus === 'done' ? new Date().toISOString() : null
                };
            }
            return t;
        });
    }

    project.tasks = tasks;
    renderKanbanBoard();

    if (db && projectId) {
        try {
            await updateDoc(doc(db, "projects", String(projectId)), { tasks: tasks });
        } catch (err) {
            console.error("Fout bij updaten kanban taak:", err);
        }
    }
}

function openGlobalTaskModal() {
    const select = document.getElementById('global-task-project');
    if (!select) return;

    select.innerHTML = '';
    if (cachedProjects.length === 0) {
        select.innerHTML = '<option value="">Geen actieve projecten beschikbaar</option>';
    } else {
        cachedProjects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = `${p.client || p.companyName || 'Project'} (${p.service || 'Algemeen'})`;
            select.appendChild(opt);
        });
    }

    document.getElementById('global-task-title').value = '';
    document.getElementById('global-task-date').value = '';
    document.getElementById('task-modal').classList.remove('hidden');
}

async function saveGlobalTask(e) {
    e.preventDefault();
    const projectId = document.getElementById('global-task-project').value;
    const title = document.getElementById('global-task-title').value.trim();
    const dueDate = document.getElementById('global-task-date').value;
    const priority = document.getElementById('global-task-priority').value;

    if (!projectId || !title) return;

    const project = cachedProjects.find(p => p.id == projectId);
    if (!project) return;

    const newTask = {
        id: 'task_' + Date.now(),
        title: title,
        dueDate: dueDate || null,
        priority: priority || 'medium',
        status: 'todo',
        completed: false,
        createdAt: new Date().toISOString()
    };

    const updatedTasks = [...(project.tasks || []), newTask];
    project.tasks = updatedTasks;

    closeModal('task-modal');
    renderKanbanBoard();

    if (db && projectId) {
        try {
            await updateDoc(doc(db, "projects", String(projectId)), { tasks: updatedTasks });
            alert(`Taak "${title}" succesvol toegevoegd aan ${project.client || 'project'}!`);
        } catch (err) {
            console.error("Fout bij opslaan taak:", err);
            alert("Fout bij opslaan taak: " + err.message);
        }
    }
}

// Initialisatie bij pagina-laad event
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupSearchAndFilters();
    document.getElementById('btn-open-kanban-task-modal')?.addEventListener('click', openGlobalTaskModal);
    document.getElementById('global-add-task-form')?.addEventListener('submit', saveGlobalTask);
});

