import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { sendIntakeNotification } from "./notifications.js";

// Zelfde Firebase config als in het Admin dashboard
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

// Secondaire app instantie om klantaccounts aan te maken zonder admin inlog te muteren
const secondaryApp = getApps().find(a => a.name === 'SecondaryAuth') || initializeApp(firebaseConfig, 'SecondaryAuth');
const secondaryAuth = getAuth(secondaryApp);
setPersistence(secondaryAuth, inMemoryPersistence).catch(console.warn);

function generateTempPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let code = 'CAF-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('intake-form');
    const submitBtn = document.getElementById('submit-btn');
    const successMsg = document.getElementById('success-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Visual feedback
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met versturen...';
        submitBtn.disabled = true;

        const emailInput = document.getElementById('email').value.trim().toLowerCase();
        const tempPassword = generateTempPassword();
        let clientUid = null;

        // Probeer een Firebase Auth account voor de klant aan te maken
        try {
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, emailInput, tempPassword);
            clientUid = userCred.user.uid;
            console.log("Klantaccount succesvol aangemaakt in Firebase Auth:", clientUid);

            // Stuur direct de Firebase Auth wachtwoord-instel e-mail naar de klant
            await sendPasswordResetEmail(secondaryAuth, emailInput);
            console.log("✅ Firebase Auth wachtwoord-instel e-mail verstuurd naar:", emailInput);
        } catch (authErr) {
            console.warn("Klant Auth account kon niet (of opnieuw) worden aangemaakt:", authErr.message);
            // Probeer alsnog wachtwoord reset mail te sturen als account al bestond
            try {
                await sendPasswordResetEmail(secondaryAuth, emailInput);
            } catch (rErr) {
                console.warn("Reset email warning:", rErr.message);
            }
        }

        // Gather Data
        const formData = {
            client: document.getElementById('companyName').value,
            contactName: document.getElementById('contactName').value,
            email: emailInput,
            clientUid: clientUid,
            isClientAccount: true,
            generatedPassword: tempPassword,
            service: document.getElementById('serviceType').value,
            domainName: document.getElementById('domainName').value,
            goals: document.getElementById('projectGoals').value,
            design: document.getElementById('designPreferences').value,
            status: "Intake Voltooid", 
            statusClass: "active",
            date: new Date().toLocaleDateString('nl-NL'),
            createdAt: serverTimestamp()
        };

        try {
            // Write to Firestore (Collection 'projects')
            const docRef = await addDoc(collection(db, "projects"), formData);
            
            // Dispatch active push / email notifications (non-blocking)
            sendIntakeNotification(formData, docRef ? docRef.id : null).catch(err => {
                console.warn("Error sending intake notification:", err);
            });

            // Success UI
            form.reset();
            submitBtn.classList.add('hidden');
            successMsg.classList.remove('hidden');

            console.log("Intake verstuurd! Dashboard en notificatie geactiveerd.");

        } catch (error) {
            console.error("Fout bij het versturen:", error);
            alert("Er is iets misgegaan bij het versturen. Probeer het later opnieuw.");
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
});
