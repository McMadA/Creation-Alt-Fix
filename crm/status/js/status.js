/**
 * Client Portal Dashboard Logic
 * Creation+Alt+Fix - Client Status & Proposal View
 * 
 * Multi-project support, XSS-escaped rendering, graceful error handling.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, escapeHtml } from "../../js/firebase-config.js";

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (err) {
    console.error("Fout bij initialiseren Firebase in status.js:", err);
}

let currentProjectDocId = null;
let clientProjectsList = [];

document.addEventListener('DOMContentLoaded', () => {
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
        if (!confirm(`Wil je een e-mail ontvangen op ${user.email} om je wachtwoord opnieuw in te stellen?`)) return;

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
            if (!user) {
                console.warn("Geen ingelogde klant. Stuur door naar inlogpagina.");
                window.location.href = "../index.html";
                return;
            }

            const userEmail = (user.email || '').toLowerCase();
            const safeEmailDisplay = escapeHtml(userEmail);
            document.getElementById('user-email-display').innerHTML = `<i class="fas fa-user-circle"></i> ${safeEmailDisplay}`;

            // Fetch client's projects from Firestore
            await loadClientProjects(userEmail, user.uid);
        });
    } else {
        document.getElementById('loader')?.classList.add('hidden');
        document.getElementById('no-project-view')?.classList.remove('hidden');
    }
});

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
            // Geen projecten gevonden voor deze gebruiker
            loader.classList.add('hidden');
            content.classList.add('hidden');
            noProjectView.classList.remove('hidden');
            return;
        }

        // Project(en) gevonden!
        noProjectView.classList.add('hidden');
        content.classList.remove('hidden');
        loader.classList.add('hidden');

        if (clientProjectsList.length > 1) {
            // Meerdere projecten: Toon dropdown selector
            multiSelector.classList.remove('hidden');
            projectDropdown.innerHTML = clientProjectsList.map((p, idx) => {
                const name = escapeHtml(p.data.client || p.data.companyName || `Project #${idx + 1}`);
                const service = escapeHtml(p.data.service || 'Dienst');
                return `<option value="${escapeHtml(p.id)}">${name} - ${service}</option>`;
            }).join('');

            // Selecteer het eerste project
            currentProjectDocId = clientProjectsList[0].id;
            renderDashboard(clientProjectsList[0].data);
        } else {
            // 1 project
            multiSelector.classList.add('hidden');
            currentProjectDocId = clientProjectsList[0].id;
            renderDashboard(clientProjectsList[0].data);
        }

    } catch (error) {
        console.error("Fout bij ophalen projectgegevens:", error);
        loader.innerHTML = `<p style="color: #fca5a5;">Fout bij het laden van je dashboard. Controleer je verbinding.</p>`;
    }
}

function renderDashboard(data) {
    const clientName = data.client || data.companyName || "Mijn Project";
    const serviceName = data.service || "Website & Software Realisatie";
    const statusText = data.status || "Intake Voltooid";

    document.getElementById('client-name-display').innerText = clientName;
    document.getElementById('service-name-display').innerText = serviceName;

    // Render Status Badge & Timeline Progress
    const badge = document.getElementById('status-badge');
    badge.innerText = statusText;

    let progress = 20;
    let stepNumber = 1;

    if (statusText === "Nieuwe Lead" || statusText === "Intake Voltooid") {
        progress = 20;
        stepNumber = 1;
        badge.className = "badge badge-active";
    } else if (statusText === "Wacht op Akkoord") {
        progress = 40;
        stepNumber = 2;
        badge.className = "badge badge-waiting";
    } else if (statusText === "Wacht op Design & Ontwerp" || statusText === "Design Gereed voor Review") {
        progress = 60;
        stepNumber = 3;
        badge.className = "badge badge-active";
    } else if (statusText === "Wacht op Ontwikkeling" || statusText === "In Ontwikkeling") {
        progress = 80;
        stepNumber = 4;
        badge.className = "badge badge-active";
    } else if (statusText.includes("Mollie") || statusText.includes("Opgeleverd") || statusText === "Afgerond") {
        progress = 100;
        stepNumber = 5;
        badge.className = "badge badge-success";
    } else {
        progress = 40;
        stepNumber = 2;
        badge.className = "badge badge-active";
    }

    document.getElementById('progress-bar-fill').style.width = `${progress}%`;
    document.getElementById('progress-percent-display').innerText = `${progress}% Complete`;

    // Render 5-Stage Timeline highlights
    updateTimeline(stepNumber);

    // Render Proposal / Offerte (Taak 03)
    renderProposalSection(data);

    // Render Design Review Card (Fase 3)
    renderDesignSection(data);

    // Render Snelle Links (Demo / Mollie)
    if (data.demoUrl) {
        const demoCard = document.getElementById('demo-link');
        demoCard.href = data.demoUrl;
        demoCard.classList.remove('hidden');
    }
    if (data.mollieLink) {
        const mollieCard = document.getElementById('mollie-link');
        mollieCard.href = data.mollieLink;
        mollieCard.classList.remove('hidden');
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
    const offerteCard = document.getElementById('offerte-card');
    offerteCard.classList.remove('hidden');

    const statusPill = document.getElementById('offerte-status-pill');
    const priceEl = document.getElementById('offerte-price');
    const scopeEl = document.getElementById('offerte-scope');
    const actionContainer = document.getElementById('offerte-action-container');
    const successMsg = document.getElementById('offerte-success-msg');

    const isAccepted = Boolean(
        data.proposalAcceptedAt || 
        data.status === "Wacht op Design & Ontwerp" ||
        data.status === "Design Gereed voor Review" ||
        data.status === "Wacht op Ontwikkeling" || 
        data.status === "In Ontwikkeling" || 
        data.status.includes("Opgeleverd") || 
        data.status === "Afgerond"
    );

    const isReadyForAcceptance = Boolean(
        !isAccepted && 
        (data.proposalPrice || data.status === "Wacht op Akkoord")
    );

    if (isAccepted) {
        // STATE C: Offerte Geaccepteerd
        statusPill.className = "offerte-status-pill accepted";
        statusPill.innerHTML = '<i class="fas fa-check-circle"></i> Offerte Geaccepteerd';

        priceEl.innerText = data.proposalPrice ? `€ ${data.proposalPrice}` : "Prijs overeengekomen";
        scopeEl.innerText = data.proposalScope || `Op basis van de intake:\n\n${data.goals || data.projectGoals || "Specificaties afgestemd."}`;

        actionContainer.classList.add('hidden');
        successMsg.classList.remove('hidden');
        if (data.proposalAcceptedAt) {
            document.getElementById('accepted-date').innerText = new Date(data.proposalAcceptedAt).toLocaleDateString('nl-NL');
        } else {
            document.getElementById('accepted-date').innerText = "eerder";
        }
    } else if (isReadyForAcceptance) {
        // STATE B: Offerte Gereed voor Akkoord
        statusPill.className = "offerte-status-pill action-required";
        statusPill.innerHTML = '<i class="fas fa-exclamation-circle"></i> Actie Vereist: Digitaal Akkoord';

        const priceVal = data.proposalPrice || "In overleg";
        priceEl.innerText = priceVal.startsWith("€") ? priceVal : `€ ${priceVal}`;
        
        scopeEl.innerText = data.proposalScope || `Op basis van de door jou ingevulde intake gaan we de volgende scope realiseren:\n\n${data.goals || data.projectGoals || "Volledige software & website realisatie zoals besproken."}`;

        successMsg.classList.add('hidden');
        actionContainer.classList.remove('hidden');
        actionContainer.innerHTML = `
            <button id="btn-akkoord" class="btn-akkoord">
                <i class="fas fa-signature"></i> Digitaal Akkoord Geven & Starten
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-shield-alt"></i> Door te klikken ga je digitaal akkoord met de voorgestelde scope en prijsopgave.
            </p>
        `;

        setupAgreeButton();
    } else {
        // STATE A: Offerte in Voorbereiding (Intake ontvangen)
        statusPill.className = "offerte-status-pill pending";
        statusPill.innerHTML = '<i class="fas fa-clock"></i> Offerte in Voorbereiding';

        priceEl.innerText = "Wordt berekend...";
        scopeEl.innerText = `Bedankt voor het invullen van de intake!\n\nCreation+Alt+Fix is momenteel jouw projectwensen aan het analyseren om een passend investeringsvoorstel op te stellen.\n\nZodra Allard de offerte heeft klaargezet, verschijnt de definitieve prijs en scope hier direct en kun je deze met één klik digitaal accepteren.`;

        successMsg.classList.add('hidden');
        actionContainer.classList.remove('hidden');
        actionContainer.innerHTML = `
            <button class="btn-akkoord-disabled" disabled>
                <i class="fas fa-hourglass-half"></i> Offerte wordt opgesteld door Creation+Alt+Fix...
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-info-circle"></i> Vragen of spoed? Neem gerust direct contact op via WhatsApp of E-mail hieronder.
            </p>
        `;
    }
}

function setupAgreeButton() {
    const btn = document.getElementById('btn-akkoord');
    if (!btn) return;

    btn.onclick = async () => {
        if (!currentProjectDocId) {
            alert("Kan akkoord niet opslaan: project ID niet gevonden.");
            return;
        }

        const priceText = document.getElementById('offerte-price')?.innerText || '';
        if (!confirm(`Weet je zeker dat je digitaal akkoord wilt geven op deze offerte (${priceText})?`)) return;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met digitaal ondertekenen...';
        btn.disabled = true;

        try {
            const projectRef = doc(db, "projects", currentProjectDocId);
            const nowIso = new Date().toISOString();

            await updateDoc(projectRef, {
                status: "Wacht op Design & Ontwerp",
                statusClass: "active",
                proposalAcceptedAt: nowIso
            });

            // Update UI direct naar State C (Geaccepteerd)
            document.getElementById('offerte-status-pill').className = "offerte-status-pill accepted";
            document.getElementById('offerte-status-pill').innerHTML = '<i class="fas fa-check-circle"></i> Offerte Geaccepteerd';

            document.getElementById('offerte-action-container').classList.add('hidden');
            document.getElementById('offerte-success-msg').classList.remove('hidden');
            document.getElementById('accepted-date').innerText = new Date(nowIso).toLocaleDateString('nl-NL');

            document.getElementById('status-badge').innerText = "Wacht op Design & Ontwerp";
            document.getElementById('status-badge').className = "badge badge-active";
            document.getElementById('progress-bar-fill').style.width = "60%";
            document.getElementById('progress-percent-display').innerText = "60% Complete";
            updateTimeline(3);

            // Show Design Review card in State A (in voorbereiding)
            renderDesignSection({ status: "Wacht op Design & Ontwerp" });

            alert("Gefeliciteerd! Je akkoord is digitaal ondertekend. We gaan nu het visueel ontwerp voor je opstellen.");

        } catch (error) {
            console.error("Fout bij digitaal akkoord:", error);
            alert("Er is een fout opgetreden bij het verwerken van je akkoord.");
            btn.innerHTML = '<i class="fas fa-signature"></i> Digitaal Akkoord Geven & Starten';
            btn.disabled = false;
        }
    };
}

function renderDesignSection(data) {
    const designCard = document.getElementById('design-card');
    if (!designCard) return;

    const statusText = data.status || '';

    // Only show design card from Fase 3 onwards (after offerte accepted)
    const showDesign = Boolean(
        statusText === "Wacht op Design & Ontwerp" ||
        statusText === "Design Gereed voor Review" ||
        statusText === "Wacht op Ontwikkeling" ||
        statusText === "In Ontwikkeling" ||
        data.designAcceptedAt ||
        statusText.includes("Opgeleverd") ||
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
        statusText === "Wacht op Ontwikkeling" ||
        statusText === "In Ontwikkeling" ||
        statusText.includes("Opgeleverd") ||
        statusText === "Afgerond"
    );

    const isDesignReady = Boolean(
        !isDesignAccepted &&
        (statusText === "Design Gereed voor Review" || data.designUrl || data.figmaUrl)
    );

    if (isDesignAccepted) {
        // STATE C: Design Goedgekeurd
        designStatusPill.className = "offerte-status-pill accepted";
        designStatusPill.innerHTML = '<i class="fas fa-check-circle"></i> Design Goedgekeurd';

        designPreview.classList.add('hidden');
        designAction.classList.add('hidden');
        designSuccess.classList.remove('hidden');

        if (data.designAcceptedAt) {
            document.getElementById('design-accepted-date').innerText = new Date(data.designAcceptedAt).toLocaleDateString('nl-NL');
        } else {
            document.getElementById('design-accepted-date').innerText = "eerder";
        }

    } else if (isDesignReady) {
        // STATE B: Design Gereed voor Review
        designStatusPill.className = "offerte-status-pill action-required";
        designStatusPill.innerHTML = '<i class="fas fa-palette"></i> Actie Vereist: Design Beoordelen';

        const previewUrl = data.designUrl || data.figmaUrl || '#';
        designPreview.classList.remove('hidden');
        designPreview.innerHTML = `
            <a href="${previewUrl}" target="_blank" class="design-preview-link">
                <i class="fas fa-external-link-alt"></i> Bekijk Design / Wireframe in nieuw tabblad
            </a>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-info-circle"></i> Klik hierboven om het voorgestelde visueel ontwerp te bekijken in Figma of de design preview.
            </p>
        `;

        designSuccess.classList.add('hidden');
        designAction.classList.remove('hidden');
        designAction.innerHTML = `
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="btn-design-akkoord" class="btn-akkoord" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #a855f7, #7c3aed);">
                    <i class="fas fa-palette"></i> Akkoord op Design
                </button>
                <a href="mailto:info@creationaltfix.nl?subject=Feedback%20Design%20Project" class="btn-akkoord" style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); text-align: center; text-decoration: none;">
                    <i class="fas fa-comment-dots"></i> Ik heb feedback
                </a>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
                <i class="fas fa-shield-alt"></i> Door op 'Akkoord' te klikken geef je goedkeuring op het ontwerp en starten we met de ontwikkeling.
            </p>
        `;

        setupDesignAcceptButton();

    } else {
        // STATE A: Design in Voorbereiding
        designStatusPill.className = "offerte-status-pill pending";
        designStatusPill.innerHTML = '<i class="fas fa-clock"></i> Design in Voorbereiding';

        designPreview.classList.add('hidden');
        designSuccess.classList.add('hidden');
        designAction.classList.remove('hidden');
        designAction.innerHTML = `
            <button class="btn-akkoord-disabled" disabled>
                <i class="fas fa-drafting-compass"></i> Creation+Alt+Fix werkt aan het visuele ontwerp...
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-info-circle"></i> Zodra het ontwerp/wireframe klaar is, verschijnt hier een preview en kun je het met één klik goedkeuren.
            </p>
        `;
    }
}

function setupDesignAcceptButton() {
    const btn = document.getElementById('btn-design-akkoord');
    if (!btn) return;

    btn.onclick = async () => {
        if (!currentProjectDocId) {
            alert("Kan design-akkoord niet opslaan: project ID niet gevonden.");
            return;
        }

        if (!confirm("Weet je zeker dat je akkoord wilt geven op het ontwerp? Hierna start de ontwikkeling (code).")) return;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met verwerken...';
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
            document.getElementById('design-status-pill').innerHTML = '<i class="fas fa-check-circle"></i> Design Goedgekeurd';

            document.getElementById('design-action-container').classList.add('hidden');
            document.getElementById('design-preview-container').classList.add('hidden');
            document.getElementById('design-success-msg').classList.remove('hidden');
            document.getElementById('design-accepted-date').innerText = new Date(nowIso).toLocaleDateString('nl-NL');

            document.getElementById('status-badge').innerText = "In Ontwikkeling";
            document.getElementById('status-badge').className = "badge badge-active";
            document.getElementById('progress-bar-fill').style.width = "80%";
            document.getElementById('progress-percent-display').innerText = "80% Complete";
            updateTimeline(4);

            alert("Top! Je design-akkoord is geregistreerd. We starten nu met de ontwikkeling van jouw project.");

        } catch (error) {
            console.error("Fout bij design akkoord:", error);
            alert("Er is een fout opgetreden bij het verwerken van je design-akkoord.");
            btn.innerHTML = '<i class="fas fa-palette"></i> Akkoord op Design & Start Code';
            btn.disabled = false;
        }
    };
}
