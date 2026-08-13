/**
 * Interactive Proposal Logic
 * Fetches the proposal from Firestore and allows the client to agree.
 * Synchronized with Client Portal Phase Workflow (Fase 1-5).
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, escapeHtml } from "../../js/firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async () => {
    // Haal het ID uit de URL, bijv: index.html?id=PROJECT_ID
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        alert("Geen offerte ID gevonden in de link.");
        return;
    }

    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            renderOfferte(data);
            setupAgreeButton(docRef);
            
            // Verberg loader
            document.getElementById('loader')?.classList.add('hidden');
            document.getElementById('offerte-container')?.classList.remove('hidden');
        } else {
            alert("Offerte niet gevonden.");
        }
    } catch (error) {
        console.error("Error fetching offerte:", error);
        alert("Fout bij het laden van de offerte.");
    }
});

function renderOfferte(data) {
    const clientName = data.client || data.companyName || "Onbekend";
    const serviceName = data.service || "Project";
    
    document.getElementById('client-name').innerText = clientName;
    document.getElementById('project-service').innerText = serviceName;
    document.getElementById('offerte-date').innerText = new Date().toLocaleDateString('nl-NL');
    
    const scopeText = data.proposalScope || `Op basis van de intake gaan we aan de slag met het realiseren van: \n\n${data.goals || data.projectGoals || "Nader te bepalen."}`;
    document.getElementById('project-scope').innerText = scopeText;

    // Pricing
    const price = data.proposalPrice || "0";
    const tbody = document.getElementById('pricing-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td>Realisatie: ${escapeHtml(serviceName)}</td>
                <td class="text-right">€ ${escapeHtml(price)}</td>
            </tr>
        `;
    }
    
    document.getElementById('total-price').innerText = `€ ${price}`;

    // Status checks across all 5 phases
    const isAlreadyAccepted = Boolean(
        data.proposalAcceptedAt ||
        data.status === "Wacht op Design & Ontwerp" ||
        data.status === "Design Gereed voor Review" ||
        data.status === "Wacht op Ontwikkeling" ||
        data.status === "In Ontwikkeling" ||
        (data.status && data.status.includes("Opgeleverd")) ||
        data.status === "Afgerond"
    );

    if (isAlreadyAccepted) {
        document.querySelector('.offerte-action')?.classList.add('hidden');
        const msg = document.getElementById('success-msg');
        if (msg) {
            msg.classList.remove('hidden');
            const p = msg.querySelector('p');
            if (p) p.innerText = "Deze offerte is reeds geaccepteerd. Het project is in behandeling.";
        }
    }
}

function setupAgreeButton(docRef) {
    const btn = document.getElementById('btn-akkoord');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
        btn.disabled = true;

        try {
            // Update Firestore document status to Phase 3 (Wacht op Design & Ontwerp)
            await updateDoc(docRef, {
                status: "Wacht op Design & Ontwerp",
                statusClass: "active",
                proposalAcceptedAt: new Date().toISOString()
            });

            // Toon succesbericht
            document.querySelector('.offerte-action')?.classList.add('hidden');
            document.getElementById('success-msg')?.classList.remove('hidden');

        } catch (error) {
            console.error("Error updating status:", error);
            alert("Er is een fout opgetreden. Probeer het later opnieuw.");
            btn.innerHTML = '<i class="fas fa-signature"></i> Digitaal Akkoord Geven';
            btn.disabled = false;
        }
    });
}
