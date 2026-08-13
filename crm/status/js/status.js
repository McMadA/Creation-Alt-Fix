/**
 * Client Portal Dashboard Logic
 * Creation+Alt+Fix - Client Status & Proposal View
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAj2_cXCL6fs9qjp2q89F3ezLbErDp4wI8",
    authDomain: "mythical-cider-475118-e5.firebaseapp.com",
    projectId: "mythical-cider-475118-e5",
    storageBucket: "mythical-cider-475118-e5.firebasestorage.app",
    messagingSenderId: "755599901945",
    appId: "1:755599901945:web:589450049c785dacfcce28"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentProjectDocId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Logout Handler
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = "../index.html";
    });

    // Password Reset Handler voor ingelogde klant
    document.getElementById('reset-password-btn')?.addEventListener('click', async () => {
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

    // Auth State Observer
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.warn("Geen ingelogde klant. Stuur door naar inlogpagina.");
            window.location.href = "../index.html";
            return;
        }

        const userEmail = (user.email || '').toLowerCase();
        document.getElementById('user-email-display').innerHTML = `<i class="fas fa-user-circle"></i> ${userEmail}`;

        // Fetch client's project from Firestore
        await loadClientProject(userEmail, user.uid);
    });
});

async function loadClientProject(email, uid) {
    const loader = document.getElementById('loader');
    const content = document.getElementById('dashboard-content');

    try {
        let projectData = null;
        let docId = null;

        // 1. Zoek op clientUid of e-mailadres
        const qEmail = query(collection(db, "projects"), where("email", "==", email));
        const emailSnap = await getDocs(qEmail);

        if (!emailSnap.empty) {
            docId = emailSnap.docs[0].id;
            projectData = emailSnap.docs[0].data();
        } else {
            // Probeer alternatieve match op clientUid
            const qUid = query(collection(db, "projects"), where("clientUid", "==", uid));
            const uidSnap = await getDocs(qUid);
            if (!uidSnap.empty) {
                docId = uidSnap.docs[0].id;
                projectData = uidSnap.docs[0].data();
            }
        }

        if (!projectData) {
            // Geen specifiek project gevonden in DB, toon fallback overzicht
            projectData = {
                client: "Welkom bij Creation+Alt+Fix",
                service: "Project in behandeling",
                status: "Intake Voltooid",
                goals: "We bereiden je projectomgeving voor."
            };
        } else {
            currentProjectDocId = docId;
        }

        // Render project details
        renderDashboard(projectData);

        // Hide loader & show dashboard
        loader.classList.add('hidden');
        content.classList.remove('hidden');

    } catch (error) {
        console.error("Fout bij ophalen projectgegevens:", error);
        alert("Kon projectgegevens niet laden. Probeer opnieuw in te loggen.");
        loader.innerHTML = `<p style="color: #fca5a5;">Fout bij het laden van je dashboard. Controleer je internetverbinding.</p>`;
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
    let stepNumber = 2; // Step 2 (Offerte & Akkoord) is active default after intake

    if (statusText === "Nieuwe Lead" || statusText === "Intake Voltooid") {
        progress = 20;
        stepNumber = 2;
        badge.className = "badge badge-active";
    } else if (statusText === "Wacht op Akkoord") {
        progress = 40;
        stepNumber = 2;
        badge.className = "badge badge-waiting";
    } else if (statusText === "Wacht op Ontwikkeling" || statusText === "In Ontwikkeling") {
        progress = 75;
        stepNumber = 4;
        badge.className = "badge badge-active";
    } else if (statusText.includes("Mollie") || statusText.includes("Opgeleverd") || statusText === "Afgerond") {
        progress = 100;
        stepNumber = 5;
        badge.className = "badge badge-success";
    } else {
        progress = 50;
        stepNumber = 3;
        badge.className = "badge badge-active";
    }

    document.getElementById('progress-bar-fill').style.width = `${progress}%`;
    document.getElementById('progress-percent-display').innerText = `${progress}% Complete`;

    // Render 5-Stage Timeline highlights
    updateTimeline(stepNumber);

    // Render Proposal / Offerte (Taak 03)
    renderProposalSection(data);

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
                status: "Wacht op Ontwikkeling",
                statusClass: "active",
                proposalAcceptedAt: nowIso
            });

            // Update UI direct naar State C (Geaccepteerd)
            document.getElementById('offerte-status-pill').className = "offerte-status-pill accepted";
            document.getElementById('offerte-status-pill').innerHTML = '<i class="fas fa-check-circle"></i> Offerte Geaccepteerd';

            document.getElementById('offerte-action-container').classList.add('hidden');
            document.getElementById('offerte-success-msg').classList.remove('hidden');
            document.getElementById('accepted-date').innerText = new Date(nowIso).toLocaleDateString('nl-NL');

            document.getElementById('status-badge').innerText = "Wacht op Ontwikkeling";
            document.getElementById('status-badge').className = "badge badge-active";
            document.getElementById('progress-bar-fill').style.width = "75%";
            document.getElementById('progress-percent-display').innerText = "75% Complete";
            updateTimeline(4);

            alert("Gefeliciteerd! Je akkoord is digitaal ondertekend. We gaan direct voor je aan de slag.");

        } catch (error) {
            console.error("Fout bij digitaal akkoord:", error);
            alert("Er is een fout opgetreden bij het verwerken van je akkoord.");
            btn.innerHTML = '<i class="fas fa-signature"></i> Digitaal Akkoord Geven & Starten';
            btn.disabled = false;
        }
    };
}
