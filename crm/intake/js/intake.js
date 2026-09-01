import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, inMemoryPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { sendIntakeNotification } from "./notifications.js";
import { firebaseConfig } from "../../js/firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Secondary Auth instance for client onboarding without mutating active admin session
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
        intakeBackHome: "Terug naar Hoofdwebsite",
        intakeNavServices: "Diensten",
        intakeNavDocs: "Documentatie",
        intakeWhatsAppBtn: "WhatsApp",
        intakeCallBtn: "Direct Bellen",
        intakeStep1Badge: "Stap 1 van 5",
        intakeStep2Badge: "Stap 2 van 5",
        intakeStep3Badge: "Stap 3 van 5",
        intakeStep4Badge: "Stap 4 van 5",
        intakeStep5Badge: "Stap 5 van 5",
        intakeStep1BadgeTitle: "Dienst Keuze",
        intakeStep2BadgeTitle: "Domein Status",
        intakeStep3BadgeTitle: "Doelen & Wensen",
        intakeStep4BadgeTitle: "Stijl & Vibe",
        intakeStep5BadgeTitle: "Contact & Start",
        
        // Step 1
        intakeStep1Title: "Wat wil je samen met ons realiseren?",
        intakeStep1Subtitle: "Kies de hoofdrichting voor jouw project. We stemmen alle specifieke details later persoonlijk af.",
        intakeBadgePopular: "Meest Gekozen",
        intakeBadgeAI: "AI Powered",
        intakeCardWebTitle: "Website & Webshop",
        intakeCardWebDesc: "Moderne, razendsnelle website of converterende webshop op maat.",
        intakeCardAITitle: "Slimme AI Automatisering",
        intakeCardAIDesc: "Bespaar uren per week door processen, e-mails en workflows slim te automatiseren.",
        intakeCardDashTitle: "Data Dashboard",
        intakeCardDashDesc: "Real-time KPI's, financiële rapportages en realtime business overzichten.",
        intakeCardOtherTitle: "Maatwerk Software",
        intakeCardOtherDesc: "Complexe webapplicaties, API koppelingen of unieke maatwerk software-ideeën.",
        
        // Step 2
        intakeStep2Title: "Heb je al een domeinnaam of website?",
        intakeStep2Subtitle: "Zo weten we of we kunnen bouwen op een bestaand domein of een nieuwe registratie moeten verzorgen.",
        intakeCardDomainYesTitle: "Ja, ik heb een domein",
        intakeCardDomainYesDesc: "Ik heb al een geregistreerde URL of bestaande website.",
        intakeCardDomainNoTitle: "Nee, nog geen domein",
        intakeCardDomainNoDesc: "Help mij met het bedenken en registreren van een passend domein.",
        intakeCardDomainNoneTitle: "Niet van toepassing",
        intakeCardDomainNoneDesc: "Het project vereist geen openbaar domein (bijv. intern dashboard).",
        intakeLblDomain: "Wat is jouw huidige domeinnaam of website URL?",
        intakePlhDomain: "Bijv. www.mijnbedrijf.nl",
        
        // Step 3
        intakeStep3Title: "Wat is het belangrijkste doel van dit project?",
        intakeStep3Subtitle: "Selecteer één of meerdere kerndoelen en licht eventuele specifieke wensen kort toe.",
        intakeGoalLeads: "Meer leads & klanten werven",
        intakeGoalTime: "Tijd & kosten besparen via automatisering",
        intakeGoalBrand: "Moderne, professionele uitstraling",
        intakeGoalSales: "Online verkoop & conversie stimuleren",
        intakeGoalData: "Beter overzicht & realtime data-inzicht",
        intakeGoalCustom: "Maatwerk innovatie & software",
        intakeLblGoalsDetails: "Aanvullende toelichting of specifieke functies *",
        intakePlhGoals: "Bijv. We willen een online afsprakensysteem en een modern donker design...",
        
        // Step 4
        intakeStep4Title: "Welke stijl & vibe past bij jouw onderneming?",
        intakeStep4Subtitle: "Kies een visuele richting. Geen zorgen, we sluiten altijd perfect aan op jouw merkidentiteit.",
        intakeBadgeRecommended: "Aanbevolen",
        intakeCardStyleDarkTitle: "Dark AI & Futuristic",
        intakeCardStyleDarkDesc: "Donkere interface, neon accenten, glassmorphism en high-tech uitstraling.",
        intakeCardStyleCleanTitle: "Strak & Zakelijk",
        intakeCardStyleCleanDesc: "Minimalistisch, overzichtelijk, veel witruimte en betrouwbaar zakelijk karakter.",
        intakeCardStyleCreativeTitle: "Creatief & Kleurrijk",
        intakeCardStyleCreativeDesc: "Opvallende kleurencombinaties, dynamische vormen en unieke merkidentiteit.",
        intakeCardStyleSurpriseTitle: "Verras mij!",
        intakeCardStyleSurpriseDesc: "Laat de ontwerpers van Creation+Alt+Fix een passend voorstel op maat ontwerpen.",
        intakeLblDesignExtra: "Specifieke kleuren, logo of huisstijl wensen? (Optioneel)",
        intakePlhDesign: "Bijv. Gebruik onze huiskleuren #22d3ee, of zie bijlage later",
        
        // Step 5
        intakeStep5Title: "Laatste stap: Waar mogen we het voorstel naartoe sturen?",
        intakeStep5Subtitle: "We maken direct jouw project aan en sturen een inloglink voor het realtime Klantenportaal.",
        intakeLblCompany: "Bedrijfsnaam *",
        intakePlhCompany: "Bijv. Jansen Media BV",
        intakeLblContact: "Contactpersoon *",
        intakePlhContact: "Jouw volledige naam",
        intakeLblEmail: "E-mailadres *",
        intakePlhEmail: "info@bedrijf.nl",
        intakeSummaryTitle: "Jouw Project Samenvatting",
        intakeSummLblService: "Gekozen Dienst",
        intakeSummLblDomain: "Domein Status",
        intakeSummLblGoals: "Belangrijkste Doel",
        intakeSummLblStyle: "Stijl & Vibe",
        intakeTrust1: "100% Vrijblijvend & Geen verplichtingen",
        intakeTrust2: "Binnen 24 uur een helder voorstel",
        intakeTrust3: "Direct toegang tot Klantenportaal",
        
        // Navigation & Actions
        intakeBtnPrev: "Vorige",
        intakeEnterHint: "om door te gaan",
        intakeBtnNext: "Volgende stap",
        intakeSubmitBtn: "Aanvraag Versturen & Direct Starten",
        intakeSubmitting: "Bezig met registreren...",
        
        // Success
        intakeSuccessTitle: "Bedankt! Je project is succesvol aangemeld.",
        intakeSuccessDesc: "We hebben jouw intake ontvangen en direct een beveiligd klantaccount voor je klaargezet in ons portaal.",
        intakeSuccessStep1Title: "Wachtwoord E-mail verstuurd:",
        intakeSuccessStep1Desc: "Check je inbox (en spambox) voor de link om je wachtwoord in te stellen.",
        intakeSuccessStep2Title: "Live Status Volgen:",
        intakeSuccessStep2Desc: "In het klantenportaal zie je live de voortgang van jouw offerte, ontwerp en ontwikkeling.",
        intakeSuccessStep3Title: "Persoonlijk Contact:",
        intakeSuccessStep3Desc: "Allard neemt binnen 24 uur contact met je op om de specificaties door te spreken.",
        intakePortalBtn: "Naar Klantenportaal",
        intakeSubmitError: "Er is iets misgegaan bij het versturen. Probeer het opnieuw.",
        intakeValidationRequired: "Vul alsjeblieft alle verplichte velden in om verder te gaan.",
        intakeDomainHelpNew: "Nieuw domein vereist (helpen met registratie)",
        intakeDomainHelpNone: "Niet van toepassing"
    },
    en: {
        intakePageTitle: "Client Intake - Creation+Alt+Fix",
        intakeBackHome: "Back to Main Website",
        intakeNavServices: "Services",
        intakeNavDocs: "Documentation",
        intakeWhatsAppBtn: "WhatsApp",
        intakeCallBtn: "Call Direct",
        intakeStep1Badge: "Step 1 of 5",
        intakeStep2Badge: "Step 2 of 5",
        intakeStep3Badge: "Step 3 of 5",
        intakeStep4Badge: "Step 4 of 5",
        intakeStep5Badge: "Step 5 of 5",
        intakeStep1BadgeTitle: "Service Selection",
        intakeStep2BadgeTitle: "Domain Status",
        intakeStep3BadgeTitle: "Goals & Wishes",
        intakeStep4BadgeTitle: "Style & Vibe",
        intakeStep5BadgeTitle: "Contact & Launch",
        
        // Step 1
        intakeStep1Title: "What would you like to build with us?",
        intakeStep1Subtitle: "Choose the main direction for your project. We'll fine-tune all specific details together personally.",
        intakeBadgePopular: "Most Popular",
        intakeBadgeAI: "AI Powered",
        intakeCardWebTitle: "Website & Webshop",
        intakeCardWebDesc: "Modern, ultra-fast website or high-converting custom webshop.",
        intakeCardAITitle: "Smart AI Automation",
        intakeCardAIDesc: "Save hours every week by automating processes, emails, and business workflows.",
        intakeCardDashTitle: "Data Dashboard",
        intakeCardDashDesc: "Real-time KPIs, financial reporting, and live business analytics overview.",
        intakeCardOtherTitle: "Custom Software",
        intakeCardOtherDesc: "Complex web applications, custom API integrations, or bespoke software ideas.",
        
        // Step 2
        intakeStep2Title: "Do you already have a domain or website?",
        intakeStep2Subtitle: "This helps us know whether to build on an existing domain or assist with a fresh registration.",
        intakeCardDomainYesTitle: "Yes, I have a domain",
        intakeCardDomainYesDesc: "I already own a registered domain or existing website URL.",
        intakeCardDomainNoTitle: "No domain yet",
        intakeCardDomainNoDesc: "Help me brainstorm and register an optimal new domain name.",
        intakeCardDomainNoneTitle: "Not applicable",
        intakeCardDomainNoneDesc: "The project does not require a public domain (e.g. internal tool).",
        intakeLblDomain: "What is your current domain name or website URL?",
        intakePlhDomain: "e.g. www.mycompany.com",
        
        // Step 3
        intakeStep3Title: "What is the primary goal of this project?",
        intakeStep3Subtitle: "Select one or more key objectives and describe any specific feature requirements.",
        intakeGoalLeads: "Generate more leads & clients",
        intakeGoalTime: "Save time & costs via automation",
        intakeGoalBrand: "Modern, professional brand presence",
        intakeGoalSales: "Boost online sales & conversion",
        intakeGoalData: "Better overview & real-time data metrics",
        intakeGoalCustom: "Custom innovation & software",
        intakeLblGoalsDetails: "Additional details or specific features *",
        intakePlhGoals: "e.g. We need an automated scheduling system and a sleek dark theme...",
        
        // Step 4
        intakeStep4Title: "Which visual style & vibe fits your brand?",
        intakeStep4Subtitle: "Pick a visual direction. No worries, we always tailor the final design to your exact identity.",
        intakeBadgeRecommended: "Recommended",
        intakeCardStyleDarkTitle: "Dark AI & Futuristic",
        intakeCardStyleDarkDesc: "Dark mode UI, glowing neon accents, glassmorphism, and high-tech feel.",
        intakeCardStyleCleanTitle: "Clean & Corporate",
        intakeCardStyleCleanDesc: "Minimalist, uncluttered, generous whitespace, and trustworthy corporate look.",
        intakeCardStyleCreativeTitle: "Creative & Colorful",
        intakeCardStyleCreativeDesc: "Bold color combinations, dynamic layouts, and distinctive branding.",
        intakeCardStyleSurpriseTitle: "Surprise me!",
        intakeCardStyleSurpriseDesc: "Let the Creation+Alt+Fix designers craft a bespoke visual proposal.",
        intakeLblDesignExtra: "Specific colors, logo, or brand guidelines? (Optional)",
        intakePlhDesign: "e.g. Use our brand color #22d3ee, or see attachments later",
        
        // Step 5
        intakeStep5Title: "Final step: Where should we send your proposal?",
        intakeStep5Subtitle: "We will create your project record immediately and send a login link for the Client Portal.",
        intakeLblCompany: "Company Name *",
        intakePlhCompany: "e.g. Acme Media Corp",
        intakeLblContact: "Contact Person *",
        intakePlhContact: "Your full name",
        intakeLblEmail: "Email Address *",
        intakePlhEmail: "info@company.com",
        intakeSummaryTitle: "Your Project Summary",
        intakeSummLblService: "Selected Service",
        intakeSummLblDomain: "Domain Status",
        intakeSummLblGoals: "Primary Goal",
        intakeSummLblStyle: "Style & Vibe",
        intakeTrust1: "100% Free & No obligations",
        intakeTrust2: "Clear proposal within 24 hours",
        intakeTrust3: "Instant access to Client Portal",
        
        // Navigation & Actions
        intakeBtnPrev: "Back",
        intakeEnterHint: "to continue",
        intakeBtnNext: "Next step",
        intakeSubmitBtn: "Submit Intake & Get Started",
        intakeSubmitting: "Registering project...",
        
        // Success
        intakeSuccessTitle: "Thank you! Your project has been registered.",
        intakeSuccessDesc: "We received your intake and set up a secure client account for you in our live portal.",
        intakeSuccessStep1Title: "Password Email Sent:",
        intakeSuccessStep1Desc: "Check your inbox (and spam folder) for the link to set your password.",
        intakeSuccessStep2Title: "Track Real-Time Status:",
        intakeSuccessStep2Desc: "In the client portal you can track the live progress of your proposal, design, and build.",
        intakeSuccessStep3Title: "Personal Contact:",
        intakeSuccessStep3Desc: "Allard will reach out within 24 hours to discuss the specifications.",
        intakePortalBtn: "Go to Client Portal",
        intakeSubmitError: "Something went wrong while submitting. Please try again.",
        intakeValidationRequired: "Please complete all required fields to continue.",
        intakeDomainHelpNew: "New domain requested (assistance with registration)",
        intakeDomainHelpNone: "Not applicable"
    }
};

let currentLang = localStorage.getItem('preferredLanguage') || ((navigator.language || 'nl').split('-')[0] === 'en' ? 'en' : 'nl');

function applyTranslations(lang) {
    if (!translations[lang]) lang = 'nl';
    currentLang = lang;
    document.documentElement.lang = lang;
    secondaryAuth.languageCode = lang;

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
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

    updateStepUI();
}

// --- Multi-Step Wizard State Machine ---
let currentStep = 1;
const totalSteps = 5;

const stepBadgeTitles = {
    1: 'intakeStep1BadgeTitle',
    2: 'intakeStep2BadgeTitle',
    3: 'intakeStep3BadgeTitle',
    4: 'intakeStep4BadgeTitle',
    5: 'intakeStep5BadgeTitle'
};

const stepBadgeKeys = {
    1: 'intakeStep1Badge',
    2: 'intakeStep2Badge',
    3: 'intakeStep3Badge',
    4: 'intakeStep4Badge',
    5: 'intakeStep5Badge'
};

function updateStepUI() {
    const t = translations[currentLang] || translations.nl;

    // 1. Show/hide active step
    for (let i = 1; i <= totalSteps; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (stepEl) {
            if (i === currentStep) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.remove('active');
            }
        }
    }

    // 2. Update Progress Bar & Badge
    const percent = Math.round((currentStep / totalSteps) * 100);
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const stepBadge = document.getElementById('step-badge');
    const stepTitleText = document.getElementById('step-title-text');

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (stepBadge && stepBadgeKeys[currentStep]) {
        stepBadge.textContent = t[stepBadgeKeys[currentStep]] || `Stap ${currentStep} van 5`;
    }
    if (stepTitleText && stepBadgeTitles[currentStep]) {
        stepTitleText.textContent = t[stepBadgeTitles[currentStep]] || '';
    }

    // 3. Update Footer Buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (prevBtn) {
        if (currentStep > 1) {
            prevBtn.classList.remove('hidden');
        } else {
            prevBtn.classList.add('hidden');
        }
    }

    if (currentStep < totalSteps) {
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
    } else {
        if (nextBtn) nextBtn.classList.add('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');
        updateLiveSummary();
    }
}

function validateCurrentStep() {
    const t = translations[currentLang] || translations.nl;

    if (currentStep === 1) {
        const service = document.getElementById('serviceType').value;
        if (!service) {
            alert(t.intakeValidationRequired);
            return false;
        }
    } else if (currentStep === 2) {
        // Step 2 is always valid, defaults cleanly
        return true;
    } else if (currentStep === 3) {
        const goalsText = document.getElementById('projectGoals').value.trim();
        const selectedTags = document.querySelectorAll('#goal-tags .goal-tag-btn.selected');
        if (!goalsText && selectedTags.length === 0) {
            alert(t.intakeValidationRequired);
            document.getElementById('projectGoals').focus();
            return false;
        }
    } else if (currentStep === 4) {
        // Step 4 has defaults selected
        return true;
    } else if (currentStep === 5) {
        const company = document.getElementById('companyName').value.trim();
        const contact = document.getElementById('contactName').value.trim();
        const email = document.getElementById('email').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!company || !contact || !email || !emailRegex.test(email)) {
            alert(t.intakeValidationRequired);
            return false;
        }
    }

    return true;
}

function goToNextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            currentStep++;
            updateStepUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

function goToPrevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateLiveSummary() {
    const t = translations[currentLang] || translations.nl;

    // Service
    const serviceVal = document.getElementById('serviceType').value || 'Website & Webshop';
    const summaryService = document.getElementById('summary-service');
    if (summaryService) summaryService.textContent = serviceVal;

    // Domain
    const selectedDomainCard = document.querySelector('#domain-grid .choice-card.selected');
    const domainChoice = selectedDomainCard ? selectedDomainCard.getAttribute('data-value') : 'existing';
    const domainInput = document.getElementById('domainName').value.trim();
    const summaryDomain = document.getElementById('summary-domain');
    if (summaryDomain) {
        if (domainChoice === 'existing') {
            summaryDomain.textContent = domainInput || (currentLang === 'en' ? 'Existing domain' : 'Bestaand domein');
        } else if (domainChoice === 'new') {
            summaryDomain.textContent = t.intakeDomainHelpNew || 'Nieuw domein registreren';
        } else {
            summaryDomain.textContent = t.intakeDomainHelpNone || 'Niet van toepassing';
        }
    }

    // Goals
    const selectedTags = Array.from(document.querySelectorAll('#goal-tags .goal-tag-btn.selected')).map(b => b.getAttribute('data-goal'));
    const goalsText = document.getElementById('projectGoals').value.trim();
    const summaryGoals = document.getElementById('summary-goals');
    if (summaryGoals) {
        if (selectedTags.length > 0) {
            summaryGoals.textContent = selectedTags.join(', ');
        } else if (goalsText) {
            summaryGoals.textContent = goalsText.length > 40 ? goalsText.substring(0, 40) + '...' : goalsText;
        } else {
            summaryGoals.textContent = 'Project realisatie';
        }
    }

    // Style
    const styleVal = document.getElementById('designStyleChoice').value || 'Dark AI & Futuristic';
    const summaryStyle = document.getElementById('summary-style');
    if (summaryStyle) summaryStyle.textContent = styleVal;
}

// --- Contextual URL Parameter Pre-Fill Engine ---
function handleUrlPreFill() {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = (urlParams.get('service') || urlParams.get('type') || urlParams.get('dienst') || '').toLowerCase().trim();
    
    if (!serviceParam) return;

    let targetValue = null;
    let targetPlaceholder = null;

    if (['websites', 'website', 'webshop', 'web', 'site'].includes(serviceParam)) {
        targetValue = 'Website & Webshop';
        targetPlaceholder = currentLang === 'en' 
            ? 'E.g. We need a modern, high-converting corporate website with SEO optimization and booking flow...'
            : 'Bijv. We willen een moderne, converterende bedrijfswebsite met SEO-optimalisatie en contactformulieren...';
    } else if (['ai-automation', 'ai', 'automatisering', 'slimme-automatisering-ai', 'bot', 'workflow'].includes(serviceParam)) {
        targetValue = 'Slimme Automatisering (AI)';
        targetPlaceholder = currentLang === 'en'
            ? 'E.g. Automate client onboarding emails, invoice generation and AI document processing...'
            : 'Bijv. Automatiseer onze klant-onboarding, factuurverwerking en AI documentgeneratie...';
    } else if (['dashboards', 'dashboard', 'data-dashboards', 'data', 'kpi'].includes(serviceParam)) {
        targetValue = 'Data Dashboard';
        targetPlaceholder = currentLang === 'en'
            ? 'E.g. Real-time KPI dashboard integrating sales figures and CRM metrics in one visual overview...'
            : 'Bijv. Real-time KPI dashboard dat verkoopcijfers en CRM data combineert in één overzicht...';
    } else if (['software', 'maatwerk', 'it-support', 'support', 'it-support-beheer', 'anders', 'other'].includes(serviceParam)) {
        targetValue = 'Anders';
        targetPlaceholder = currentLang === 'en'
            ? 'E.g. Custom web application with API integrations, IT infrastructure support and bespoke tools...'
            : 'Bijv. Maatwerk webapplicatie met API-koppelingen, IT-systeemondersteuning en specifieke beheertools...';
    }

    if (targetValue) {
        const serviceCards = document.querySelectorAll('#service-grid .choice-card');
        const serviceInput = document.getElementById('serviceType');
        
        serviceCards.forEach(c => {
            if (c.getAttribute('data-value') === targetValue) {
                serviceCards.forEach(card => card.classList.remove('selected'));
                c.classList.add('selected');
                if (serviceInput) serviceInput.value = targetValue;
            }
        });

        if (targetPlaceholder) {
            const projectGoalsTextarea = document.getElementById('projectGoals');
            if (projectGoalsTextarea && !projectGoalsTextarea.value.trim()) {
                projectGoalsTextarea.placeholder = targetPlaceholder;
            }
        }
    }
}

// --- DOM Initializations & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations(currentLang);
    handleUrlPreFill();

    // Language Switcher Buttons
    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            if (lang) {
                applyTranslations(lang);
                localStorage.setItem('preferredLanguage', lang);
                handleUrlPreFill();
            }
        });
    });

    // Step 1: Service Cards Selection
    const serviceCards = document.querySelectorAll('#service-grid .choice-card');
    const serviceInput = document.getElementById('serviceType');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            serviceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const val = card.getAttribute('data-value');
            if (serviceInput) serviceInput.value = val;
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Step 2: Domain Cards Selection
    const domainCards = document.querySelectorAll('#domain-grid .choice-card');
    const domainInputWrapper = document.getElementById('domain-input-wrapper');
    const domainNameInput = document.getElementById('domainName');

    domainCards.forEach(card => {
        card.addEventListener('click', () => {
            domainCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const val = card.getAttribute('data-value');

            if (val === 'existing') {
                domainInputWrapper.classList.remove('hidden');
                domainNameInput.focus();
            } else {
                domainInputWrapper.classList.add('hidden');
            }
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Step 3: Goal Tag Buttons
    const goalBtns = document.querySelectorAll('#goal-tags .goal-tag-btn');
    const projectGoalsTextarea = document.getElementById('projectGoals');
    goalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('selected');
            
            // Helpful sync: if textarea is blank, draft selected tags as initial text
            const selectedGoals = Array.from(document.querySelectorAll('#goal-tags .goal-tag-btn.selected'))
                .map(b => b.getAttribute('data-goal'));
            if (projectGoalsTextarea.value.trim() === '' && selectedGoals.length > 0) {
                projectGoalsTextarea.value = `${currentLang === 'en' ? 'Main goals:' : 'Belangrijkste doelen:'} ${selectedGoals.join(', ')}.`;
            }
        });
    });

    // Step 4: Style Cards Selection
    const styleCards = document.querySelectorAll('#style-grid .choice-card');
    const styleInput = document.getElementById('designStyleChoice');
    styleCards.forEach(card => {
        card.addEventListener('click', () => {
            styleCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const val = card.getAttribute('data-value');
            if (styleInput) styleInput.value = val;
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Next and Prev Buttons
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    if (nextBtn) nextBtn.addEventListener('click', goToNextStep);
    if (prevBtn) prevBtn.addEventListener('click', goToPrevStep);

    // Keyboard Navigation (Enter to advance unless typing in textarea)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.tagName === 'TEXTAREA') {
                return; // allow newline in textarea
            }
            if (currentStep < totalSteps) {
                e.preventDefault();
                goToNextStep();
            }
        }
    });

    // Live update summary on input change in Step 5
    ['companyName', 'contactName', 'email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateLiveSummary);
    });

    // --- Form Submission ---
    const form = document.getElementById('intake-form');
    const submitBtn = document.getElementById('submit-btn');
    const successScreen = document.getElementById('success-screen');
    const progressCard = document.getElementById('wizard-progress-card');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateCurrentStep()) return;

        const t = translations[currentLang] || translations.nl;
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.intakeSubmitting}`;
        submitBtn.disabled = true;

        const emailInput = document.getElementById('email').value.trim().toLowerCase();
        const companyInput = document.getElementById('companyName').value.trim();
        const contactInput = document.getElementById('contactName').value.trim();
        const serviceInputVal = document.getElementById('serviceType').value.trim();
        
        // Domain calculation
        const selectedDomainCard = document.querySelector('#domain-grid .choice-card.selected');
        const domainChoice = selectedDomainCard ? selectedDomainCard.getAttribute('data-value') : 'existing';
        let finalDomain = document.getElementById('domainName').value.trim();
        if (domainChoice === 'new') {
            finalDomain = 'Nieuw domein vereist (helpen met registratie)';
        } else if (domainChoice === 'none') {
            finalDomain = 'Niet van toepassing';
        } else if (!finalDomain) {
            finalDomain = 'Bestaand domein (URL nog door te geven)';
        }

        // Goals compilation
        const selectedGoalTags = Array.from(document.querySelectorAll('#goal-tags .goal-tag-btn.selected'))
            .map(b => b.getAttribute('data-goal'));
        const goalDetails = document.getElementById('projectGoals').value.trim();
        const finalGoals = selectedGoalTags.length > 0
            ? `${selectedGoalTags.join(', ')}${goalDetails ? ` | Details: ${goalDetails}` : ''}`
            : (goalDetails || 'Nieuwe projectaanvraag via intake wizard');

        // Design compilation
        const styleChoice = document.getElementById('designStyleChoice').value.trim();
        const extraDesign = document.getElementById('designPreferences').value.trim();
        const finalDesign = `${styleChoice}${extraDesign ? ` | Extra wensen: ${extraDesign}` : ''}`;

        const tempPassword = generateTempPassword();
        let clientUid = null;

        const actionCodeSettings = {
            url: 'https://portal.creationaltfix.nl/crm/index.html?resetSuccess=true',
            handleCodeInApp: false
        };

        // Provision Firebase Auth Client Account
        try {
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, emailInput, tempPassword);
            clientUid = userCred.user.uid;
            console.log("✅ Client account successfully created in Firebase Auth:", clientUid);

            // Trigger password setup email with branded redirect URL
            await sendPasswordResetEmail(secondaryAuth, emailInput, actionCodeSettings);
            console.log("✅ Password setup email dispatched to:", emailInput);
        } catch (authErr) {
            console.warn("Client Auth account provision note:", authErr.message);
            try {
                await sendPasswordResetEmail(secondaryAuth, emailInput, actionCodeSettings);
            } catch (rErr) {
                console.warn("Reset email warning:", rErr.message);
            }
        }

        // Detect TLD and recommended hosting plan
        let detectedTld = '.nl';
        if (finalDomain && typeof finalDomain === 'string') {
            const cleanDomainMatch = finalDomain.match(/\.([a-z0-9-]+)(?:\/|$)/i);
            if (cleanDomainMatch) {
                detectedTld = '.' + cleanDomainMatch[1].toLowerCase();
            }
        }

        let recommendedPlan = 'managed_nl';
        let recommendedPlanName = 'Managed Cloud Hosting & .nl Domein All-in';
        let recommendedPrice = '150,00';
        let domainCostNote = 'Standaard .nl domeinregistratie is inbegrepen in het basistarief (€ 150,-/jr).';

        if (detectedTld === '.com') {
            recommendedPlan = 'managed_com';
            recommendedPlanName = 'Managed Cloud Hosting & .com Domein All-in';
            recommendedPrice = '165,00';
            domainCostNote = 'Geschat hosting- & domeintarief (indicatief i.v.m. .com registratiekosten).';
        } else if (detectedTld !== '.nl' && !finalDomain.startsWith('Nieuw') && !finalDomain.startsWith('Bestaand') && !finalDomain.startsWith('Niet')) {
            recommendedPlan = 'managed_custom';
            recommendedPlanName = `Managed Cloud Hosting & ${detectedTld} Domein`;
            recommendedPrice = '175,00';
            domainCostNote = `Geschat hosting- & domeintarief (indicatief i.v.m. ${detectedTld} registratiekosten).`;
        }

        // Gather Data Payload
        const formData = {
            client: companyInput,
            contactName: contactInput,
            email: emailInput,
            clientUid: clientUid,
            isClientAccount: true,
            service: serviceInputVal,
            domainName: finalDomain,
            domainTld: detectedTld,
            subscriptionPlanId: recommendedPlan,
            subscriptionPlanName: recommendedPlanName,
            subscriptionPlanPrice: recommendedPrice,
            domainCostNote: domainCostNote,
            goals: finalGoals,
            design: finalDesign,
            status: "Intake Voltooid",
            statusClass: "active",
            date: new Date().toLocaleDateString('nl-NL'),
            createdAt: serverTimestamp()
        };

        try {
            // Write to Firestore ('projects' collection)
            const docRef = await addDoc(collection(db, "projects"), formData);

            // Dispatch active FormSubmit / EmailJS push notifications
            sendIntakeNotification(formData, docRef ? docRef.id : null).catch(err => {
                console.warn("Notification dispatch warning:", err);
            });

            // Transition to Success State (State 6)
            form.reset();
            form.classList.add('hidden');
            if (progressCard) progressCard.classList.add('hidden');
            if (successScreen) successScreen.classList.remove('hidden');

            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log("🎉 Intake wizard successfully completed and saved!");

        } catch (error) {
            console.error("Error submitting intake wizard:", error);
            alert(t.intakeSubmitError);
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
});
