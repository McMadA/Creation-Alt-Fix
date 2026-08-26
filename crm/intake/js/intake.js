import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { sendIntakeNotification } from "./notifications.js";
import { firebaseConfig } from "../../js/firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Secondaire app instantie om klantaccounts aan te maken zonder admin inlog te muteren
const secondaryApp = getApps().find(a => a.name === 'SecondaryAuth') || initializeApp(firebaseConfig, 'SecondaryAuth');
const secondaryAuth = getAuth(secondaryApp);
secondaryAuth.languageCode = 'nl';
setPersistence(secondaryAuth, inMemoryPersistence).catch(console.warn);

function generateTempPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let code = 'CAF-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// --- Bilingual Translation Engine for Intake ---
const translations = {
    nl: {
        intakePageTitle: "Klant Intake - Creation+Alt+Fix",
        intakeCallBtn: "Liever direct ff bellen, bel hier ...",
        intakeH1: 'Welkom bij <span class="accent">Creation+Alt+Fix</span>',
        intakeSubtitle: "Leuk dat we gaan samenwerken! Vul hieronder je wensen en gegevens in, dan kunnen we direct aan de slag met jouw project.",
        intakeSec1Title: "1. Bedrijfsgegevens",
        intakeLblCompany: "Bedrijfsnaam *",
        intakePlhCompany: "Bijv. Jansen IT",
        intakeLblContact: "Contactpersoon *",
        intakePlhContact: "Jouw volledige naam",
        intakeLblEmail: "E-mailadres *",
        intakePlhEmail: "info@bedrijf.nl",
        intakeSec2Title: "2. Project Details",
        intakeLblService: "Welke dienst nemen we af? *",
        intakeOptServiceChoose: "Kies een dienst...",
        intakeOptServiceWeb: "Website & Webshop (vanaf €99)",
        intakeOptServiceAI: "Slimme Automatisering (AI)",
        intakeOptServiceDash: "Data Dashboard",
        intakeOptServiceOther: "Anders...",
        intakeLblDomain: "Heb je al een domeinnaam?",
        intakePlhDomain: "Bijv. www.mijnbedrijf.nl of 'Nee, ik heb er nog geen'",
        intakeLblGoals: "Wat is het belangrijkste doel van dit project? *",
        intakePlhGoals: "Bijv. Meer aanvragen via de website, of handmatig werk automatiseren...",
        intakeSec3Title: "3. Design & Bestanden",
        intakeLblDesign: "Heb je voorkeur voor bepaalde kleuren of een stijl?",
        intakePlhDesign: "Bijv. Blauw en strak, of zie bijlage",
        intakeLblFiles: "Logo's & Teksten (Later uploaden)",
        intakeHelpFiles: "Zodra we deze intake hebben ontvangen, sturen we je een veilige link om je logo's en bestanden te uploaden.",
        intakeSubmitBtn: "Intake Versturen",
        intakeSubmitting: "Bezig met versturen...",
        intakeSuccessTitle: "Bedankt! Je account is succesvol aangemaakt.",
        intakeSuccessDesc: "We hebben je zojuist een e-mail gestuurd (check ook je spambox) met een link om je wachtwoord in te stellen. Daarna kun je direct inloggen op het klantenportaal om de status van je project te volgen.",
        intakePortalBtn: "Naar Klantenportaal",
        intakeSubmitError: "Er is iets misgegaan bij het versturen. Probeer het later opnieuw."
    },
    en: {
        intakePageTitle: "Client Intake - Creation+Alt+Fix",
        intakeCallBtn: "Prefer to call directly? Call here ...",
        intakeH1: 'Welcome to <span class="accent">Creation+Alt+Fix</span>',
        intakeSubtitle: "Great to work together! Fill in your details and requirements below, and we'll get started with your project right away.",
        intakeSec1Title: "1. Company Details",
        intakeLblCompany: "Company Name *",
        intakePlhCompany: "e.g. Acme Corp",
        intakeLblContact: "Contact Person *",
        intakePlhContact: "Your full name",
        intakeLblEmail: "Email Address *",
        intakePlhEmail: "name@company.com",
        intakeSec2Title: "2. Project Details",
        intakeLblService: "Which service are you interested in? *",
        intakeOptServiceChoose: "Choose a service...",
        intakeOptServiceWeb: "Website & Webshop (from €99)",
        intakeOptServiceAI: "Smart Automation (AI)",
        intakeOptServiceDash: "Data Dashboard",
        intakeOptServiceOther: "Other...",
        intakeLblDomain: "Do you already have a domain name?",
        intakePlhDomain: "e.g. www.mycompany.com or 'No, not yet'",
        intakeLblGoals: "What is the main goal of this project? *",
        intakePlhGoals: "e.g. More leads via the website, or automating repetitive tasks...",
        intakeSec3Title: "3. Design & Files",
        intakeLblDesign: "Do you have preferences for colors or visual style?",
        intakePlhDesign: "e.g. Modern dark theme, minimal, see attachment",
        intakeLblFiles: "Logos & Content (Upload later)",
        intakeHelpFiles: "Once we receive this intake, we will send you a secure link to upload your assets and branding files.",
        intakeSubmitBtn: "Submit Intake",
        intakeSubmitting: "Submitting intake...",
        intakeSuccessTitle: "Thank you! Your account has been created successfully.",
        intakeSuccessDesc: "We have sent you an email (please check your spam folder too) with a link to set up your password. You can then log into the client status portal to track your project in real time.",
        intakePortalBtn: "Go to Client Portal",
        intakeSubmitError: "Something went wrong while submitting. Please try again later."
    }
};

let currentLang = localStorage.getItem('preferredLanguage') || ((navigator.language || 'nl').split('-')[0] === 'en' ? 'en' : 'nl');

function applyTranslations(lang) {
    if (!translations[lang]) lang = 'nl';
    currentLang = lang;
    document.documentElement.lang = lang;
    secondaryAuth.languageCode = lang;

    const htmlKeys = new Set(['intakeH1']);

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (translations[lang][key]) {
            if (htmlKeys.has(key)) {
                el.innerHTML = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });

    document.querySelectorAll('[data-translate-key-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-key-placeholder');
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    if (translations[lang].intakePageTitle) {
        document.title = translations[lang].intakePageTitle;
    }

    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations(currentLang);

    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            if (lang) {
                applyTranslations(lang);
                localStorage.setItem('preferredLanguage', lang);
            }
        });
    });

    const form = document.getElementById('intake-form');
    const submitBtn = document.getElementById('submit-btn');
    const successMsg = document.getElementById('success-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const t = translations[currentLang] || translations.nl;
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.intakeSubmitting}`;
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
            alert(t.intakeSubmitError);
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
});
