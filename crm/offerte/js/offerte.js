/**
 * Interactive Proposal Logic
 * Fetches the proposal from Firestore and allows the client to agree.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAj2_cXCL6fs9qjp2q89F3ezLbErDp4wI8",
    authDomain: "mythical-cider-475118-e5.firebaseapp.com",
    projectId: "mythical-cider-475118-e5",
    storageBucket: "mythical-cider-475118-e5.firebasestorage.app",
    messagingSenderId: "755599901945",
    appId: "1:755599901945:web:589450049c785dacfcce28"
};

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
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('offerte-container').classList.remove('hidden');
        } else {
            alert("Offerte niet gevonden.");
        }
    } catch (error) {
        console.error("Error fetching offerte:", error);
        alert("Fout bij het laden van de offerte.");
    }
});

function renderOfferte(data) {
    document.getElementById('client-name').innerText = data.client || "Onbekend";
    document.getElementById('project-service').innerText = data.service || "Project";
    document.getElementById('offerte-date').innerText = new Date().toLocaleDateString('nl-NL');
    
    // Proposal details are added by the admin via the dashboard before sending the link
    // Fallback on standard goals if empty
    const scopeText = data.proposalScope || `Op basis van de intake gaan we aan de slag met het realiseren van: \n\n${data.goals || "Nader te bepalen."}`;
    document.getElementById('project-scope').innerText = scopeText;

    // Pricing
    const price = data.proposalPrice || "0";
    const tbody = document.getElementById('pricing-body');
    tbody.innerHTML = `
        <tr>
            <td>Realisatie: ${data.service || "Project"}</td>
            <td class="text-right">€ ${price}</td>
        </tr>
    `;
    
    document.getElementById('total-price').innerText = `€ ${price}`;

    // Als de status al akkoord is, verberg dan de actieknoppen
    if (data.status === "Wacht op Ontwikkeling" || data.status === "In Ontwikkeling" || data.status === "Opgeleverd") {
        document.querySelector('.offerte-action').classList.add('hidden');
        document.getElementById('success-msg').classList.remove('hidden');
        document.getElementById('success-msg').querySelector('p').innerText = "Deze offerte is reeds geaccepteerd. Het project is in behandeling.";
    }
}

function setupAgreeButton(docRef) {
    const btn = document.getElementById('btn-akkoord');
    btn.addEventListener('click', async () => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig...';
        btn.disabled = true;

        try {
            // Update Firestore document status
            await updateDoc(docRef, {
                status: "Wacht op Ontwikkeling",
                statusClass: "concept",
                proposalAcceptedAt: new Date().toISOString()
            });

            // Toon succesbericht
            document.querySelector('.offerte-action').classList.add('hidden');
            document.getElementById('success-msg').classList.remove('hidden');

        } catch (error) {
            console.error("Error updating status:", error);
            alert("Er is een fout opgetreden. Probeer het later opnieuw.");
            btn.innerHTML = '<i class="fas fa-signature"></i> Digitaal Akkoord Geven';
            btn.disabled = false;
        }
    });
}
