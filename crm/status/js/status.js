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

    let progress = 25;
    let stepNumber = 1;

    if (statusText === "Nieuwe Lead" || statusText === "Intake Voltooid") {
        progress = 25;
        stepNumber = 1;
        badge.className = "badge badge-active";
    } else if (statusText === "Wacht op Akkoord") {
        progress = 35;
        stepNumber = 1;
        badge.className = "badge badge-waiting";
    } else if (statusText === "Wacht op Ontwikkeling" || statusText === "In Ontwikkeling") {
        progress = 65;
        stepNumber = 3;
        badge.className = "badge badge-active";
    } else if (statusText.includes("Mollie") || statusText.includes("Opgeleverd") || statusText === "Afgerond") {
        progress = 100;
        stepNumber = 4;
        badge.className = "badge badge-success";
    }

    document.getElementById('progress-bar-fill').style.width = `${progress}%`;
    document.getElementById('progress-percent-display').innerText = `${progress}% Complete`;

    // Render 4-Stage Timeline highlights
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
    for (let i = 1; i <= 4; i++) {
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
    
    // Als er een prijs of scope is ingesteld door Allard, toon dan de offerte
    if (data.proposalPrice || data.proposalScope || data.status === "Wacht op Akkoord") {
        offerteCard.classList.remove('hidden');

        const price = data.proposalPrice || "Op aanvraag";
        const scope = data.proposalScope || `Op basis van de intake gaan we aan de slag met:\n\n${data.goals || "Nader te bepalen."}`;

        document.getElementById('offerte-price').innerText = `€ ${price}`;
        document.getElementById('offerte-scope').innerText = scope;

        const actionContainer = document.getElementById('offerte-action-container');
        const successMsg = document.getElementById('offerte-success-msg');

        // Als al geaccepteerd of in ontwikkeling
        if (data.status === "Wacht op Ontwikkeling" || data.status === "In Ontwikkeling" || data.status.includes("Opgeleverd")) {
            actionContainer.classList.add('hidden');
            successMsg.classList.remove('hidden');
            if (data.proposalAcceptedAt) {
                document.getElementById('accepted-date').innerText = new Date(data.proposalAcceptedAt).toLocaleDateString('nl-NL');
            }
        } else {
            actionContainer.classList.remove('hidden');
            successMsg.classList.add('hidden');

            // Setup Akkoord knop
            setupAgreeButton();
        }
    } else {
        offerteCard.classList.add('hidden');
    }
}

function setupAgreeButton() {
    const btn = document.getElementById('btn-akkoord');
    btn.onclick = async () => {
        if (!currentProjectDocId) {
            alert("Kan akkoord niet opslaan: project ID niet gevonden.");
            return;
        }

        if (!confirm("Weet je zeker dat je digitaal akkoord wilt geven op deze offerte?")) return;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met verwerken...';
        btn.disabled = true;

        try {
            const projectRef = doc(db, "projects", currentProjectDocId);
            const nowIso = new Date().toISOString();

            await updateDoc(projectRef, {
                status: "Wacht op Ontwikkeling",
                statusClass: "active",
                proposalAcceptedAt: nowIso
            });

            // Update UI direct
            document.getElementById('offerte-action-container').classList.add('hidden');
            document.getElementById('offerte-success-msg').classList.remove('hidden');
            document.getElementById('accepted-date').innerText = new Date(nowIso).toLocaleDateString('nl-NL');

            document.getElementById('status-badge').innerText = "Wacht op Ontwikkeling";
            document.getElementById('status-badge').className = "badge badge-active";
            document.getElementById('progress-bar-fill').style.width = "65%";
            document.getElementById('progress-percent-display').innerText = "65% Complete";
            updateTimeline(3);

            alert("Gefeliciteerd! Je akkoord is digitaal ondertekend. We gaan direct aan de slag.");

        } catch (error) {
            console.error("Fout bij digitaal akkoord:", error);
            alert("Er is een fout opgetreden bij het verwerken van je akkoord.");
            btn.innerHTML = '<i class="fas fa-signature"></i> Digitaal Akkoord Geven';
            btn.disabled = false;
        }
    };
}
