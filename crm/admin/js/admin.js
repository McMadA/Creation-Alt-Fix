/**
 * Admin Dashboard Logic
 * Integrated with Firebase Auth & Firestore.
 * Fallbacks to mock data if Firebase is not yet configured.
 * 
 * Security: XSS-escaped output, centralized config, admin whitelist.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, sendPasswordResetEmail, createUserWithEmailAndPassword, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig, escapeHtml, ADMIN_EMAILS, isAdminEmail } from "../../js/firebase-config.js";
import { generateProposalPDF, generateInvoicePDF, uploadPdfToStorage } from "../../js/pdf-generator.js";
import { getGeminiApiKey, setGeminiApiKey, hasGeminiApiKey, getGeminiModel, setGeminiModel } from "../../js/ai-engine.js";
import { parseTodoMarkdown, mapTaskToProject, syncTodoToFirestore, exportKanbanToTodoMarkdown, PROJECT_PROFILES } from "../../js/todo-sync.js";
import { SUBSCRIPTION_PLANS, PI_BOEKHOUDING_CLIENT_DATA, getPiBoekhoudingInfo } from "./project.js";



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

            // Ensure ALL clients & historical projects from the portfolio / CRM exports exist in active list
            const mockList = this.getMockProjects();
            for (const m of mockList) {
                const mName = (m.client || m.companyName || '').toLowerCase();
                const mDom = (m.domainName || m.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                const exists = projectsList.some(p => {
                    const pName = (p.client || p.companyName || '').toLowerCase();
                    const pDom = (p.domainName || p.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                    if (mName && pName && (pName.includes(mName) || mName.includes(pName))) return true;
                    if (mDom && pDom && (pDom.includes(mDom) || mDom.includes(pDom))) return true;
                    return false;
                });

                if (!exists) {
                    const { id, ...dataToSeed } = m;
                    projectsList.push({ id: `seed_${m.id}`, ...dataToSeed });
                    if (db) {
                        try {
                            addDoc(collection(db, "projects"), dataToSeed).catch(console.warn);
                        } catch (e) {}
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
                    { id: 't5_2', title: 'Glas-in-lood galerij & dynamische filter categorieën', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-30' },
                    { id: 't5_3', title: 'Arnold foto AI scrape-proof maken (Watermarking / Glaze / Protect)', completed: true, status: 'done', priority: 'high', dueDate: '2026-09-02' },
                    { id: 't5_4', title: 'Portfolio showcase op Creation+Alt+Fix website integreren', completed: true, status: 'done', priority: 'medium', dueDate: '2026-09-05' }
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
                    { id: 'web_t4', title: '[TASK-805] Creation+Alt+Fix Continuïteitsplan & Noodprotocol', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-08' },
                    { id: 'web_t5', title: '[TASK-502] Hosting Management & Terugkerende Onderhoudsdiensten (Vaste Tarieven)', completed: true, status: 'done', priority: 'low', dueDate: '2026-08-27' },
                    { id: 'web_t6', title: '[TASK-703] Volledige Site-Wide & Portal EN-NL Vertaling', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'web_t7', title: '[TASK-807] Stories waarin ik bezig ben posten & Instagram Branding', completed: false, status: 'todo', priority: 'medium', dueDate: '2026-09-12' },
                    { id: 'web_t8', title: '[TASK-811] Vimexx Server Complete Back-up, Desktop App & Lokale/Cloud Archivering', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-28' },
                    { id: 'web_t9', title: '[TASK-812] Webserver FTP Hardening & Brute-Force Aanvalspreventie', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-16' },
                    { id: 'web_t10', title: '[TASK-503] Complete Multi-Domein & Cloud Migratie: Vimexx naar Microsoft Azure (12 Domeinen)', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-20' }
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
                    { id: 'task_106', title: '[TASK-106] Firebase Auth Custom Sender Domain & SMTP Integratie', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'task_107', title: '[TASK-107] Branded HTML Welkomstmail Dispatcher (EmailJS)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-13' },
                    { id: 'task_108', title: '[TASK-108] Admin Tabelkolom Uitbreiding & Directe Links', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'task_109', title: '[TASK-109] Site-Wide Intake Funnel & CTA Button Integration', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'task_605', title: '[TASK-605] Full-Screen Dedicated Project Werkplek (project.html)', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'task_601', title: '[TASK-601] Interne Notities & Automatische Audit Trail', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'task_602', title: '[TASK-602] 4-Kolommen Kanban Bord voor Deliverables', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'task_603', title: '[TASK-603] Automatische PDF Generatie voor Offertes & Facturen', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-25' },
                    { id: 'task_301', title: '[TASK-301] Geautomatiseerde Nazorg & Review Wachtrij met Handmatige Goedkeurings-Gate', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-27' },
                    { id: 'task_302', title: '[TASK-302] Live LLM API Integratie voor AI Offerte Scope Generator', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-27' },
                    { id: 'task_401', title: '[TASK-401] Visual Feedback & Annotation Overlay on Demo Environments', completed: true, status: 'done', priority: 'low', dueDate: '2026-08-27' },
                    { id: 'task_402', title: '[TASK-402] Client System Handover & Documentation Template', completed: true, status: 'done', priority: 'low', dueDate: '2026-08-27' },
                    { id: 'task_604', title: '[TASK-604] In-App Messaging & Project Ticketing Suite', completed: true, status: 'done', priority: 'low', dueDate: '2026-08-27' },
                    { id: 'task_201', title: '[TASK-201] Mollie API Integratie & Webhook Listener via Tailscale', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-05' },
                    { id: 'task_813', title: '[TASK-813] Klantenportaal Offerte Acceptatieflow: Gescheiden Preview & Definitief Akkoord', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-08' },
                    { id: 'task_814', title: '[TASK-814] TODO.md DevOps Backlog naar CRM Firestore Kanban Tweeweg-Synchronisatie', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-27' },
                    { id: 'task_815', title: '[TASK-815] Fase 3 Design Versturen & UX Validatie Check', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-10' },
                    { id: 'task_816', title: '[TASK-816] Vaste Hosting & Domeintarieven Formaliseren in Offerte Templates & Website', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-28' }
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
                    { id: 'bes_0', title: '[TASK-801] Besseling Installatietechniek Projectafronding', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-01' },
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
                    { id: 'ang_1', title: '[TASK-803] Angela Stenekes Website Prototype & vibecoden', completed: false, status: 'todo', priority: 'high', dueDate: '2026-09-03' }
                ],
                internalNotes: [
                    { id: 'ang_n1', text: 'Toegevoegd via Microsoft To Do backlog.', createdAt: '2026-08-25T16:00:00Z', author: 'Allard' }
                ],
                auditLog: [
                    { id: 'ang_l1', timestamp: '2026-08-25T16:00:00Z', type: 'lead_created', description: 'Lead aangemaakt vanuit Microsoft To Do.', actor: 'Allard' }
                ]
            },
            {
                id: 11,
                client: "BakkertjeSieg",
                companyName: "BakkertjeSieg",
                contactName: "Siegert",
                email: "bakkertjesieg@gmail.com",
                domainName: "www.bakkertjesieg.nl/new/",
                domain: "www.bakkertjesieg.nl/new/",
                stagingUrl: "https://www.bakkertjesieg.nl/new/",
                demoUrl: "https://www.bakkertjesieg.nl/new/",
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
            },
            {
                id: 13,
                client: "VAN DER PLAATS (Gerard Klusser)",
                companyName: "VAN DER PLAATS (Gerard Klusser)",
                contactName: "Gerard Klusser",
                email: "vanderplaats2@gmail.com",
                domainName: "www.vanderplaats.nl",
                domain: "www.vanderplaats.nl",
                service: "Website & Klusbedrijf Formulier Backend",
                goals: "Professionele klusbedrijf website met contact- en offerteformulier dat veilig e-mails verzendt naar vanderplaats2@gmail.com (Tel: +31 6 12104850, KvK: 98527339).",
                design: "Robuust, betrouwbaar, modern klusbedrijf thema.",
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
            },
            {
                id: 14,
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
            },
            {
                id: 15,
                client: "Scholte Elektrotechniek",
                companyName: "Scholte Elektrotechniek",
                contactName: "Gerjo Scholte",
                email: "info@scholte-elektrotechniek.nl",
                domainName: "www.scholte-elektrotechniek.nl",
                domain: "www.scholte-elektrotechniek.nl",
                service: "Elektrotechniek & Duurzaamheid Website",
                goals: "Professionele one-pager website voor elektrotechnische installaties, meterkasten en zonnepanelen in Groningen (KvK: 89192036).",
                design: "Strak, betrouwbaar, blauw/grijs modern zakelijk thema.",
                status: "Opgeleverd (Livegang)",
                statusClass: "success",
                date: "19-08-2026",
                proposalPrice: "550,00",
                tasks: [
                    { id: 'sch_1', title: 'Intake, functionele briefing & wensenanalyse', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-05' },
                    { id: 'sch_2', title: 'UI/UX Design & responsive one-page template ontwikkeling', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-10' },
                    { id: 'sch_3', title: 'Content, formulieren & mobiele optimalisatie', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-15' },
                    { id: 'sch_4', title: 'Livegang, DNS domeinkoppeling & SSL certificering', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-19' }
                ]
            },
            {
                id: 16,
                client: "Capybara Culture",
                companyName: "Capybara Culture",
                contactName: "Capybara Culture Team",
                email: "info@capybaraculture.com",
                domainName: "capybaraculture.com",
                domain: "capybaraculture.com",
                service: "Community & Merchandise Platform",
                goals: "Webplatform voor internationale capybara community, digitale kunst showcase en merchandise webshop.",
                design: "Vrolijk, speels, modern en responsive.",
                status: "Opgeleverd (Livegang)",
                statusClass: "success",
                date: "20-08-2026",
                proposalPrice: "450,00",
                tasks: [
                    { id: 'cap_1', title: 'Community platform structuur & branding', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-10' },
                    { id: 'cap_2', title: 'Merchandise showcase & productcatalogus', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-14' },
                    { id: 'cap_3', title: 'Web3 & community links integratie', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-18' },
                    { id: 'cap_4', title: 'Livegang, hosting en DNS configuratie', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-20' }
                ]
            },
            {
                id: 17,
                client: "Naaiatelier Willa",
                companyName: "Naaiatelier Willa",
                contactName: "Willa",
                email: "info@naaiatelier-willa.nl",
                domainName: "www.naaiatelier-willa.nl",
                domain: "www.naaiatelier-willa.nl",
                service: "Kledingreparatie & Atelier Website",
                goals: "Eigentijdse website voor kledingreparaties, maatkleding en atelier diensten met prijslijst en fotogalerij.",
                design: "Warm, elegant, ambachtelijk met responsive portfolio galerij.",
                status: "Opgeleverd (Livegang)",
                statusClass: "success",
                date: "22-08-2026",
                proposalPrice: "500,00",
                tasks: [
                    { id: 'wil_1', title: 'Intake & dienstenpakket structureren', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-12' },
                    { id: 'wil_2', title: 'Fotogalerij van creaties & maatkleding ontwerpen', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-16' },
                    { id: 'wil_3', title: 'Prijslijst en contactformulier implementeren', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-19' },
                    { id: 'wil_4', title: 'Livegang, domeinnaam koppeling & hosting oplevering', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-22' }
                ]
            },
            {
                id: 18,
                client: "PompPop Festival",
                companyName: "Stichting PompPop",
                contactName: "PompPop Organisatie",
                email: "info@pomppop.nl",
                domainName: "www.pomppop.nl",
                domain: "www.pomppop.nl",
                service: "Festival Website & Line-up Programma",
                goals: "Muziekfestival website met dynamisch tijdschema, artiesten line-up, sponsoren en ticketlinks.",
                design: "Energiek, festival sfeer, donker met felle neon accenten.",
                status: "Opgeleverd (Livegang)",
                statusClass: "success",
                date: "24-08-2026",
                proposalPrice: "650,00",
                tasks: [
                    { id: 'pop_1', title: 'Festival branding & line-up overzicht inrichten', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-18' },
                    { id: 'pop_2', title: 'Dynamisch tijdschema & artiestenpagina’s ontwikkelen', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-20' },
                    { id: 'pop_3', title: 'Sponsorenoverzicht & ticketverkoop links koppelen', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-22' },
                    { id: 'pop_4', title: 'Livegang, performance caching & SSL oplevering', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-24' }
                ]
            },
            {
                id: 19,
                client: "Qolipa Webshop & Brand",
                companyName: "Qolipa",
                contactName: "Qolipa Beheer",
                email: "info@qolipa.nl",
                domainName: "qolipa.nl / qolipa.com",
                domain: "qolipa.nl",
                service: "Brand Portfolio & Webshop",
                goals: "Merkpositionering en webshop integratie voor lifestyle producten.",
                design: "Luxe, minimalistisch, strak en SEO-geoptimaliseerd.",
                status: "Opgeleverd (Livegang)",
                statusClass: "success",
                date: "15-08-2026",
                proposalPrice: "950,00",
                tasks: [
                    { id: 'qol_1', title: 'Merkidentiteit & e-commerce architectuur ontwerpen', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-02' },
                    { id: 'qol_2', title: 'Productcatalogus & betalingsgateway inrichten', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-08' },
                    { id: 'qol_3', title: 'SEO-optimalisatie & multi-domein configuratie (.nl + .com)', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-12' },
                    { id: 'qol_4', title: 'Livegang en managed hosting oplevering', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-15' }
                ]
            },
            {
                id: 20,
                client: "Livian Design (Lianne Steinfelder)",
                companyName: "Livian Design",
                contactName: "Lianne Steinfelder",
                email: "info@liviandesign.nl",
                domainName: "creationaltfix.nl/liviandesign/",
                domain: "creationaltfix.nl/liviandesign/",
                service: "Interieurportfolio & Showcase",
                goals: "Portfolio-website voor interieurontwerp met projectshowcase, sfeerbeelden en contactformulier (KvK: 98849794).",
                design: "Stijlvol, minimalistisch, warm interieur design.",
                status: "Opgeleverd (Livegang)",
                statusClass: "success",
                date: "24-03-2026",
                proposalPrice: "50,00",
                tasks: [
                    { id: 'liv_1', title: 'Interieurportfolio architectuur & showcase opzetten', completed: true, status: 'done', priority: 'high', dueDate: '2026-03-15' },
                    { id: 'liv_2', title: 'Sfeerbeelden & projectfotografie optimaliseren', completed: true, status: 'done', priority: 'high', dueDate: '2026-03-20' },
                    { id: 'liv_3', title: 'Contactformulier & SEO inrichten', completed: true, status: 'done', priority: 'medium', dueDate: '2026-03-22' },
                    { id: 'liv_4', title: 'Oplevering & software realisatie afronding', completed: true, status: 'done', priority: 'high', dueDate: '2026-03-24' }
                ]
            },
            {
                id: 21,
                client: "Home Buyer Intelligence (HBI)",
                companyName: "Home Buyer Intelligence",
                contactName: "HBI Platform Beheer",
                email: "hbi@creationaltfix.nl",
                domainName: "hbi.creationaltfix.nl",
                domain: "hbi.creationaltfix.nl",
                service: "AI Vastgoed & Aankoop Analyse Platform",
                goals: "Intelligent platform voor het analyseren van vastgoedkoopopties met AI, bouwkundige checklists en berekeningen.",
                design: "Modern data-dashboard thema met interactieve visualisaties.",
                status: "In Ontwikkeling",
                statusClass: "active",
                date: "25-08-2026",
                proposalPrice: "1200,00",
                tasks: [
                    { id: 'hbi_1', title: 'AI analyse engine & vastgoed evaluatie algoritme', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-20' },
                    { id: 'hbi_2', title: 'Interactief dashboard UI & responsive layout', completed: true, status: 'done', priority: 'high', dueDate: '2026-08-25' },
                    { id: 'hbi_3', title: 'PDF export & aankooprapportage generator', completed: true, status: 'done', priority: 'medium', dueDate: '2026-08-28' },
                    { id: 'hbi_4', title: '[TASK-804] Home Buyer Intelligence AI Revisor & Local Mode integratie', completed: false, status: 'inprogress', priority: 'high', dueDate: '2026-09-06' }
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
                const errDiv = document.getElementById('login-error');
                if (errDiv) {
                    errDiv.innerText = `Beveiligingswaarschuwing: Wachtwoordinlog is uitgeschakeld voor beheerders. Log verplicht in via de knop "Inloggen met Google".`;
                    errDiv.classList.remove('hidden');
                }
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
    document.getElementById('auth-overlay').classList.remove('hidden');
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
        let taskBadge = '';
        if (total === 0) {
            taskBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-size: 0.8rem; color: var(--color-text-secondary);"><i class="fas fa-minus" style="font-size: 0.65rem; opacity: 0.5;"></i> 0 taken</span>`;
        } else {
            const done = tasks.filter(t => t.completed || t.status === 'done').length;
            const isAllDone = done === total && total > 0;
            const color = isAllDone ? '#34d399' : done > 0 ? '#818cf8' : '#fbbf24';
            const bg = isAllDone ? 'rgba(16, 185, 129, 0.12)' : done > 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(251, 191, 36, 0.12)';
            const border = isAllDone ? 'rgba(16, 185, 129, 0.3)' : done > 0 ? 'rgba(99, 102, 241, 0.3)' : 'rgba(251, 191, 36, 0.3)';
            const icon = isAllDone ? 'fa-check-circle' : 'fa-tasks';

            taskBadge = `<span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; background: ${bg}; border: 1px solid ${border}; font-size: 0.82rem; font-weight: 600; color: ${color}; white-space: nowrap;" title="${done} van de ${total} taken voltooid">
                <i class="fas ${icon}"></i> ${done}/${total} af
            </span>`;
        }

        const msgs = p.messages || [];
        if (msgs.length > 0) {
            const unreadCount = msgs.filter(m => m.sender === 'client' && (m.status === 'open' || !m.readByAdmin)).length;
            if (unreadCount > 0) {
                taskBadge += ` <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); font-size: 0.8rem; font-weight: 700; color: #f87171; margin-left: 6px;" title="${unreadCount} openstaande ticket(s)/bericht(en)">
                    <i class="fas fa-comment-dots"></i> ${unreadCount}
                </span>`;
            } else {
                taskBadge += ` <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); font-size: 0.8rem; font-weight: 600; color: var(--color-accent); margin-left: 6px;" title="${msgs.length} bericht(en) in historie">
                    <i class="fas fa-comments"></i> ${msgs.length}
                </span>`;
            }
        }

        return taskBadge;
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
    if (!cachedProjects || cachedProjects.length === 0) return alert("Geen projectgegevens om te exporteren.");

    const getPhaseTag = (status) => {
        if (!status) return "Fase 1: Intake Voltooid";
        if (status.includes("Nieuwe Lead") || status.includes("Intake Voltooid")) return "Fase 1: Intake Voltooid";
        if (status.includes("Wacht op Akkoord") || status.includes("Offerte")) return "Fase 2: Offerte & Akkoord";
        if (status.includes("Design")) return "Fase 3: Design & Ontwerp";
        if (status.includes("Ontwikkeling")) return "Fase 4: In Ontwikkeling";
        if (status.includes("Mollie") || status.includes("Opgeleverd") || status.includes("Afgerond") || status.includes("Livegang")) return "Fase 5: Opgeleverd (Livegang)";
        return "Fase 1: Intake Voltooid";
    };

    const headers = [
        "Project ID",
        "Klantnaam",
        "Bedrijfsnaam",
        "Contactpersoon",
        "E-mailadres",
        "Telefoonnummer",
        "Domeinnaam",
        "Dienst",
        "Categorie",
        "Huidige Fase",
        "Status Omschrijving",
        "Offertebedrag Excl BTW (EUR)",
        "Offertebedrag Incl 21% BTW (EUR)",
        "Doelstellingen & Scope",
        "Design Voorkeuren / Thema",
        "Voltooide Taken",
        "Openstaande Taken",
        "Totale Taken",
        "Aanmaakdatum",
        "Laatste Update"
    ];

    const rows = cachedProjects.map(p => {
        const tasks = p.tasks || [];
        const doneTasks = tasks.filter(t => t.completed || t.status === 'done').length;
        const openTasks = tasks.length - doneTasks;
        
        // Parse raw proposal price
        const priceClean = (p.proposalPrice || "0").toString().replace(/[^0-9,.-]/g, '').replace('.', ',');
        const numPrice = parseFloat((p.proposalPrice || "0").toString().replace(',', '.')) || 0;
        const numWithVat = (numPrice * 1.21).toFixed(2).replace('.', ',');

        return [
            `"${p.id || ''}"`,
            `"${(p.client || p.companyName || '').replace(/"/g, '""')}"`,
            `"${(p.companyName || p.client || '').replace(/"/g, '""')}"`,
            `"${(p.contactName || p.client || '').replace(/"/g, '""')}"`,
            `"${(p.email || '').replace(/"/g, '""')}"`,
            `"${(p.phone || p.telephone || '+31 6 12345678').replace(/"/g, '""')}"`,
            `"${(p.domainName || p.domain || '').replace(/"/g, '""')}"`,
            `"${(p.service || '').replace(/"/g, '""')}"`,
            `"${(p.serviceCategory || p.category || 'MKB Web & Cloud').replace(/"/g, '""')}"`,
            `"${getPhaseTag(p.status)}"`,
            `"${(p.status || '').replace(/"/g, '""')}"`,
            `"${priceClean}"`,
            `"${numWithVat}"`,
            `"${(p.goals || p.projectGoals || '').replace(/"/g, '""')}"`,
            `"${(p.design || p.designPreferences || '').replace(/"/g, '""')}"`,
            doneTasks,
            openTasks,
            tasks.length,
            `"${(p.date || '25-08-2026').replace(/"/g, '""')}"`,
            `"${new Date().toLocaleDateString('nl-NL')}"`
        ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CreationAltFix_CRM_Projecten_${new Date().toISOString().slice(0, 10)}.csv`);
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

            if (targetView === 'settings') {
                initSettingsTab();
            }
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
                        <div class="meta-label"><i class="fas fa-globe"></i> Domeinnaam</div>
                        <input type="text" id="edit-domain" class="admin-input" value="${s.domain}" style="margin: 4px 0 0 0;" placeholder="bijv. www.klant.nl">
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-tag"></i> Geselecteerde Dienst</div>
                        <input type="text" id="edit-service" class="admin-input" value="${s.service}" style="margin: 4px 0 0 0;">
                    </div>
                    <div class="meta-box">
                        <div class="meta-label"><i class="fas fa-euro-sign"></i> Offerte Investering (€)</div>
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

                <div class="intake-box" style="margin-top: 15px; background: ${isAuthActivated ? 'rgba(16, 185, 129, 0.05)' : 'rgba(99, 102, 241, 0.05)'}; border: 1px solid ${isAuthActivated ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'};">
                    <h4 style="margin-top: 0;"><i class="fas fa-key"></i> Klantenportaal Inlog (Firebase Auth)</h4>
                    <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 8px;">
                        Gekoppeld account e-mailadres: <strong>${s.email || 'Nog geen e-mail ingevuld'}</strong>
                        ${isAuthActivated 
                            ? `<span style="color: #34d399; font-weight: 600; margin-left: 8px;"><i class="fas fa-check-circle"></i> Geactiveerd in Firebase Auth</span>` 
                            : `<span style="color: #fbbf24; font-weight: 600; margin-left: 8px;"><i class="fas fa-exclamation-circle"></i> Niet geactiveerd in Firebase Auth</span>`}
                    </p>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="btn btn-primary btn-sm" id="btn-activate-auth">
                            <i class="fas fa-user-plus"></i> ${isAuthActivated ? 'Her-activeer / Koppel Account' : 'Activeer Klantaccount'}
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-auth">
                            <i class="fas fa-paper-plane"></i> Wachtwoord Reset
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
                        Locatie: C:\Users\Admin\Backups\Pi-Boekhouding
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

// ============================================================
// [TASK-814] TODO.md DevOps Backlog Sync & Export Controller
// ============================================================
let currentTodoMarkdownContent = '';
let currentParsedTasks = [];

const FALLBACK_TODO_MARKDOWN = `# 🛠️ Creation+Alt+Fix - DevOps Backlog & Engineering Roadmap

## 📊 Sprint Status Dashboard
| Metric | Status | Count |
| :--- | :--- | :--- |
| **Total Features / Backlog Tasks** | 🔢 Tracked | **40 Active Epics & Tasks (1 Canceled)** |
| **Completed Work Items** | ✅ Done | **22 Tasks (56%)** |
| **Active / Backlog Items** | ⏳ In Queue | **17 Tasks (44%)** |
| **CI/CD Pipeline Status** | 🚀 Automated | **GitHub Actions FTP (\`main.yml\`)** |

**Sprint Completion Progress:**
\`[█████████████░░░░░░░░░░░] 56% Complete\`

---

## 🎯 Active Epics & Backlog

### 🚀 EPIC-01: CRM & Client Portal Infrastructure
- [x] \`[TASK-101]\` \`[P1-CRITICAL]\` \`[STATUS: DONE]\` **Intake Alert & Push Notification Dispatcher**
- [x] \`[TASK-102]\` \`[P1-CRITICAL]\` \`[STATUS: DONE]\` **Admin Klantkaart & Detailed Lead Inspector**
- [x] \`[TASK-103]\` \`[P1-CRITICAL]\` \`[STATUS: DONE]\` **Integrated Digital Proposal Signing Suite**
- [x] \`[TASK-104]\` \`[P1-CRITICAL]\` \`[STATUS: DONE]\` **Live Client Progress Tracker (\`/status\`)**
- [x] \`[TASK-105]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Admin Data Table Search, Filtering & CSV Exporter**
- [x] \`[TASK-106]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Firebase Auth Custom Sender Domain & SMTP Integration**
- [x] \`[TASK-107]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Dedicated Branded Client Welcome Email Dispatcher**
- [x] \`[TASK-108]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Admin Data Table Column Expansion & Quick Links**
- [x] \`[TASK-109]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Site-Wide Intake Funnel & CTA Button Integration**

### 💳 EPIC-02: FinTech & Payment Pipeline
- [ ] \`[TASK-201]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Mollie API Integration & Webhook Listener**

### 🤖 EPIC-03: AI Operations & Automation
- [x] \`[TASK-301]\` \`[P3-MEDIUM]\` \`[STATUS: DONE]\` **Geautomatiseerde Nazorg & Review Wachtrij met Handmatige Goedkeurings-Gate**
- [x] \`[TASK-302]\` \`[P3-MEDIUM]\` \`[STATUS: DONE]\` **Live LLM API Integratie voor AI Offerte Scope & Deliverables Generator**

### 🎨 EPIC-04: Client Experience & Co-Creation
- [x] \`[TASK-401]\` \`[P4-LOW]\` \`[STATUS: DONE]\` **Visual Feedback & Annotation Overlay on Demo Environments (Live Staging Suite)**
- [x] \`[TASK-402]\` \`[P4-LOW]\` \`[STATUS: DONE]\` **Client System Handover & Documentation Template**

### 📈 EPIC-05: Growth, Marketing & Infra Pipelines
- [~] \`[TASK-501]\` \`[P3-MEDIUM]\` \`[STATUS: CANCELLED]\` **Google Ads Campaign Activation (€400 Credit)**
- [ ] \`[TASK-502]\` \`[P4-LOW]\` \`[STATUS: BACKLOG]\` **Hosting Management & Terugkerende Onderhoudsdiensten**
- [ ] \`[TASK-503]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Complete Multi-Domein & Cloud Migratie: Vimexx naar Microsoft Azure (12 Domeinen)**

### 🗃️ EPIC-06: Advanced CRM Features (Expansion)
- [x] \`[TASK-601]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Internal Notes & Audit Trail (Logboek)**
- [x] \`[TASK-602]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Task & Deadline Management (Kanban)**
- [x] \`[TASK-603]\` \`[P3-MEDIUM]\` \`[STATUS: DONE]\` **Automated PDF Generation for Quotes & Invoices**
- [x] \`[TASK-604]\` \`[P4-LOW]\` \`[STATUS: DONE]\` **In-App Messaging & Project Ticketing Suite**
- [x] \`[TASK-605]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Admin Klantkaart Layout Expansion / Full-Screen Page View**

### 🎨 EPIC-07: Public Portfolio & Project Showcase (Website)
- [x] \`[TASK-701]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Portfolio & Project Showcase Subpage (\`website/projecten.html\`)**
- [x] \`[TASK-702]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Creation+Alt+Fix Proprietary CRM Showcase & Case Study**
- [x] \`[TASK-703]\` \`[P2-HIGH]\` \`[STATUS: DONE]\` **Volledige Site-Wide & Portal EN-NL Vertaling (Bilingual Localization)**

### 📋 EPIC-08: Client Project Deliverables & Systems Backlog (Microsoft To Do Sync)
- [ ] \`[TASK-801]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Besseling Installatietechniek Projectafronding**
- [ ] \`[TASK-802]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Arnold Design AI Scrape Protection & Showcase**
- [ ] \`[TASK-803]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Angela Stenekes Website Prototype**
- [ ] \`[TASK-804]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Home Buyer Intelligence (PropTech AI) Afronding**
- [ ] \`[TASK-805]\` \`[P3-MEDIUM]\` \`[STATUS: BACKLOG]\` **Creation+Alt+Fix Continuïteitsplan & Noodprotocol**
- [ ] \`[TASK-807]\` \`[P3-MEDIUM]\` \`[STATUS: BACKLOG]\` **Marketing, Stories & Personal Branding**
- [ ] \`[TASK-808]\` \`[P2-HIGH]\` \`[STATUS: IN_PROGRESS]\` **VAN DER PLAATS Website & Formulier Backend (vanderplaats2@gmail.com)**
- [ ] \`[TASK-809]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **F-Truck Store (ftruckstore.nl / ftruckstore.com) Follow-Up & Klantafstemming**
- [ ] \`[TASK-810]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Justin Website Intake, Prototype & Offerte**
- [ ] \`[TASK-811]\` \`[P1-CRITICAL]\` \`[STATUS: BACKLOG]\` **Vimexx Server Complete Back-up & Lokale/Cloud Archivering**
- [ ] \`[TASK-812]\` \`[P1-CRITICAL]\` \`[STATUS: BACKLOG]\` **Webserver FTP Hardening & Brute-Force Aanvalspreventie**
- [ ] \`[TASK-813]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Klantenportaal Offerte Acceptatieflow: Gescheiden Preview & Definitief Akkoord**
- [x] \`[TASK-814]\` \`[P3-MEDIUM]\` \`[STATUS: DONE]\` **TODO.md DevOps Backlog naar CRM Firestore Kanban Tweeweg-Synchronisatie**
- [ ] \`[TASK-815]\` \`[P2-HIGH]\` \`[STATUS: BACKLOG]\` **Fase 3 Design Versturen & UX Validatie Check**
- [ ] \`[TASK-816]\` \`[P3-MEDIUM]\` \`[STATUS: BACKLOG]\` **Vaste Hosting & Domeintarieven Formaliseren in Offerte Templates & Website**
`;

async function fetchTodoMarkdown() {
    const candidateUrls = [
        '../../TODO.md?t=' + Date.now(),
        '../TODO.md?t=' + Date.now(),
        'TODO.md?t=' + Date.now(),
        '/TODO.md?t=' + Date.now(),
        '/crm/TODO.md?t=' + Date.now(),
        'https://raw.githubusercontent.com/McMadA/Creation-Alt-Fix/main/TODO.md'
    ];

    for (const url of candidateUrls) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                if (text && text.includes('Sprint Status Dashboard')) {
                    currentTodoMarkdownContent = text;
                    return currentTodoMarkdownContent;
                }
            }
        } catch (e) {
            // probeer volgende kandidaat
        }
    }

    // Slimme fallback als alle netwerk/bestandspaden falen (bijv. offline of lokaal file://)
    currentTodoMarkdownContent = FALLBACK_TODO_MARKDOWN;
    return currentTodoMarkdownContent;
}

async function openTodoSyncModal() {
    const modal = document.getElementById('todo-sync-modal');
    if (!modal) {
        console.warn("Modal #todo-sync-modal niet gevonden in DOM!");
        return;
    }

    modal.classList.remove('hidden');
    switchSyncModalTab('import');

    const totalBadge = document.getElementById('sync-parsed-total-badge');
    const statusMsg = document.getElementById('sync-execution-status');

    if (totalBadge) totalBadge.innerText = 'Laden...';
    if (statusMsg) statusMsg.innerHTML = '<i class="fas fa-spinner fa-spin text-accent"></i> TODO.md backlog inlezen en analyseren...';

    const md = await fetchTodoMarkdown();
    currentParsedTasks = parseTodoMarkdown(md || FALLBACK_TODO_MARKDOWN);
    renderSyncBreakdown(currentParsedTasks);

    // Also populate export tab
    const exportArea = document.getElementById('todo-export-textarea');
    if (exportArea) {
        exportArea.value = exportKanbanToTodoMarkdown(md || FALLBACK_TODO_MARKDOWN, cachedProjects);
    }

    if (statusMsg) {
        statusMsg.innerHTML = `<span style="color: #34d399;"><i class="fas fa-check-circle"></i> <strong>${currentParsedTasks.length} taken</strong> succesvol geanalyseerd uit TODO.md. Klaar voor synchronisatie.</span>`;
    }
}

function renderSyncBreakdown(tasks) {
    const totalBadge = document.getElementById('sync-parsed-total-badge');
    const breakdownGrid = document.getElementById('sync-project-breakdown-grid');
    if (!breakdownGrid) return;

    breakdownGrid.innerHTML = '';
    const summaryByProject = {};

    tasks.forEach(t => {
        const p = t.targetProject || PROJECT_PROFILES.CRM_PORTAL;
        const pName = p.client;
        if (!summaryByProject[pName]) {
            summaryByProject[pName] = { profile: p, tasks: [] };
        }
        summaryByProject[pName].tasks.push(t);
    });

    if (totalBadge) {
        totalBadge.innerText = `${tasks.length} Taken over ${Object.keys(summaryByProject).length} Projecten`;
    }

    for (const [pName, group] of Object.entries(summaryByProject)) {
        const card = document.createElement('div');
        card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;';
        
        let doneCount = group.tasks.filter(t => t.status === 'done').length;
        let activeCount = group.tasks.length - doneCount;

        card.innerHTML = `
            <div style="overflow: hidden; padding-right: 6px;">
                <div style="font-size: 0.8rem; font-weight: 600; color: #fff; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;" title="${escapeHtml(pName)}">
                    ${escapeHtml(pName)}
                </div>
                <div style="font-size: 0.7rem; color: var(--color-text-secondary);">
                    ${doneCount} voltooid · ${activeCount} openstaand
                </div>
            </div>
            <span class="badge badge-active" style="font-size: 0.72rem; padding: 2px 6px; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: var(--color-primary-light);">
                ${group.tasks.length} taken
            </span>
        `;
        breakdownGrid.appendChild(card);
    }
}

function switchSyncModalTab(tab) {
    const paneImport = document.getElementById('pane-sync-import');
    const paneExport = document.getElementById('pane-sync-export');
    const btnImport = document.getElementById('tab-btn-sync-import');
    const btnExport = document.getElementById('tab-btn-sync-export');

    if (tab === 'import') {
        paneImport?.classList.remove('hidden');
        paneExport?.classList.add('hidden');
        btnImport?.classList.replace('btn-secondary', 'btn-primary');
        btnExport?.classList.replace('btn-primary', 'btn-secondary');
    } else {
        paneImport?.classList.add('hidden');
        paneExport?.classList.remove('hidden');
        btnExport?.classList.replace('btn-secondary', 'btn-primary');
        btnImport?.classList.replace('btn-primary', 'btn-secondary');

        // Update live export text
        const exportArea = document.getElementById('todo-export-textarea');
        if (exportArea && (currentTodoMarkdownContent || FALLBACK_TODO_MARKDOWN)) {
            exportArea.value = exportKanbanToTodoMarkdown(currentTodoMarkdownContent || FALLBACK_TODO_MARKDOWN, cachedProjects);
        }
    }
}

async function handleExecuteTodoSync() {
    const btn = document.getElementById('btn-execute-todo-sync');
    const statusMsg = document.getElementById('sync-execution-status');

    if (!currentParsedTasks || currentParsedTasks.length === 0) {
        alert("Geen taken gevonden om te synchroniseren. Herlaad het bestand eerst.");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Synchroniseren...';
    }
    if (statusMsg) {
        statusMsg.innerHTML = '<i class="fas fa-spinner fa-spin text-accent"></i> Bezig met bijwerken van Firestore documenten en lokale projecten...';
    }

    try {
        const summary = await syncTodoToFirestore(cachedProjects, currentParsedTasks, db, updateDoc, setDoc, doc);
        
        // Re-render Kanban board and stats
        renderKanbanBoard();
        renderProjectsTable(cachedProjects);
        
        if (statusMsg) {
            statusMsg.innerHTML = `
                <div style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: 6px; padding: 8px 12px; color: #34d399; width: 100%;">
                    <i class="fas fa-check-circle"></i> <strong>Synchronisatie Voltooid!</strong><br>
                    <span style="font-size: 0.8rem; color: #a7f3d0;">
                        ${summary.totalTasks} taken verwerkt over ${summary.projectsAffected} projecten (${summary.projectsCreated} nieuwe projecten aangemaakt in CRM).
                    </span>
                </div>
            `;
        }

        // Update export textarea as well
        const exportArea = document.getElementById('todo-export-textarea');
        if (exportArea && (currentTodoMarkdownContent || FALLBACK_TODO_MARKDOWN)) {
            exportArea.value = exportKanbanToTodoMarkdown(currentTodoMarkdownContent || FALLBACK_TODO_MARKDOWN, cachedProjects);
        }

        alert(`✅ Succesvol gesynchroniseerd!\n${summary.totalTasks} taken zijn gekoppeld en bijgewerkt in de CRM projecten.`);
    } catch (err) {
        console.error("Fout tijdens synchronisatie:", err);
        if (statusMsg) {
            statusMsg.innerHTML = `<span style="color: #f87171;"><i class="fas fa-times-circle"></i> Fout bij synchroniseren: ${escapeHtml(err.message)}</span>`;
        }
        alert("Fout bij synchroniseren: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bolt"></i> 🚀 Nu Synchroniseren naar Firestore';
        }
    }
}

function handleCopyExportMarkdown() {
    const exportArea = document.getElementById('todo-export-textarea');
    const feedback = document.getElementById('export-copy-feedback');
    if (!exportArea || !exportArea.value) return;

    navigator.clipboard.writeText(exportArea.value).then(() => {
        if (feedback) {
            feedback.innerHTML = '<i class="fas fa-check"></i> Gekopieerd naar klembord!';
            setTimeout(() => { feedback.innerHTML = ''; }, 3000);
        }
    }).catch(err => {
        exportArea.select();
        document.execCommand('copy');
        if (feedback) {
            feedback.innerHTML = '<i class="fas fa-check"></i> Gekopieerd!';
            setTimeout(() => { feedback.innerHTML = ''; }, 3000);
        }
    });
}

function handleDownloadExportMarkdown() {
    const exportArea = document.getElementById('todo-export-textarea');
    if (!exportArea || !exportArea.value) return;

    const blob = new Blob([exportArea.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TODO.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Bind to window for direct HTML event access
window.openTodoSyncModal = openTodoSyncModal;
window.closeTodoSyncModal = () => document.getElementById('todo-sync-modal')?.classList.add('hidden');
window.switchSyncModalTab = switchSyncModalTab;
window.handleExecuteTodoSync = handleExecuteTodoSync;
window.handleCopyExportMarkdown = handleCopyExportMarkdown;
window.handleDownloadExportMarkdown = handleDownloadExportMarkdown;

function setupTodoSyncListeners() {
    document.getElementById('btn-open-todo-sync-modal')?.addEventListener('click', openTodoSyncModal);
    document.getElementById('btn-close-todo-sync-modal')?.addEventListener('click', () => {
        document.getElementById('todo-sync-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-cancel-todo-sync')?.addEventListener('click', () => {
        document.getElementById('todo-sync-modal')?.classList.add('hidden');
    });
    document.getElementById('tab-btn-sync-import')?.addEventListener('click', () => switchSyncModalTab('import'));
    document.getElementById('tab-btn-sync-export')?.addEventListener('click', () => switchSyncModalTab('export'));
    document.getElementById('btn-reload-todo-file')?.addEventListener('click', () => openTodoSyncModal());
    document.getElementById('btn-execute-todo-sync')?.addEventListener('click', handleExecuteTodoSync);
    document.getElementById('btn-copy-todo-markdown')?.addEventListener('click', handleCopyExportMarkdown);
    document.getElementById('btn-download-todo-markdown')?.addEventListener('click', handleDownloadExportMarkdown);
}

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

function initAdminPage() {
    setupNavigation();
    setupSearchAndFilters();
    setupTodoSyncListeners();
    initSettingsTab();
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



