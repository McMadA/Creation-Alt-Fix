/**
 * Client Portal Dashboard Logic
 * Creation+Alt+Fix - Client Status & Proposal View
 * 
 * Multi-project support, full NL/EN bilingual localization, XSS-escaped rendering, graceful error handling.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig, escapeHtml } from "../../js/firebase-config.js";
import { generateProposalPDF, uploadPdfToStorage } from "../../js/pdf-generator.js";

let app, auth, db, storage;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (err) {
    console.error("Fout bij initialiseren Firebase in status.js:", err);
}

let currentProjectDocId = null;
let clientProjectsList = [];
let currentLang = localStorage.getItem('preferredLanguage') || ((navigator.language || 'nl').split('-')[0] === 'en' ? 'en' : 'nl');

const translations = {
    nl: {
        statusPageTitle: "Mijn Project Dashboard - Creation+Alt+Fix",
        statusLoadingUser: "Laden...",
        statusResetPassBtn: "Wachtwoord Resetten",
        statusLogoutBtn: "Uitloggen",
        statusLoadingText: "Je project-dashboard wordt geladen...",
        statusNoProjectTitle: "Geen actief project gevonden",
        statusNoProjectDesc: "Er is momenteel geen actief project gekoppeld aan dit e-mailadres. Heb je recent een intake ingevuld of wil je een nieuw project starten?",
        statusNewIntakeBtn: "Nieuwe Intake Invoeren",
        statusWhatsAppBtn: "Neem contact op via WhatsApp",
        statusMultipleProjectsLabel: "Je hebt meerdere projecten:",
        statusProgressLabel: "Projectvoortgang",
        statusTimelineTitle: "Project Timeline & Fasen",
        stage1Number: "Fase 1",
        stage1Title: "Intake Voltooid",
        stage1Desc: "Aanvraag ontvangen en wensen in kaart gebracht.",
        stage2Number: "Fase 2",
        stage2Title: "Offerte & Akkoord",
        stage2Desc: "Investeringsvoorstel en digitaal akkoord.",
        stage3Number: "Fase 3",
        stage3Title: "Design & Ontwerp",
        stage3Desc: "Visuele stijl en kleurenschema afstemmen.",
        stage4Number: "Fase 4",
        stage4Title: "Ontwikkeling",
        stage4Desc: "Code realiseren en grondig testen.",
        stage5Number: "Fase 5",
        stage5Title: "Livegang",
        stage5Desc: "Eindcontrole en domein overdracht.",
        statusOfferteTitle: "Project Offerte & Investeringsvoorstel",
        statusProposalSub: "Investeringsvoorstel",
        statusOffertePending: "In behandeling",
        statusOfferteAcceptedTitle: "Offerte Geaccepteerd!",
        statusOfferteAcceptedOn: "Je hebt op",
        statusOfferteAcceptedNotice: "akkoord gegeven op deze offerte.",
        statusDownloadPdfBtn: "Download Officiële Offerte (PDF)",
        statusDesignTitle: "Design & Ontwerp Review",
        statusDesignSub: "Visueel Ontwerp & Wireframe",
        statusDesignApprovedTitle: "Design Goedgekeurd!",
        statusDesignApprovedOn: "Je hebt op",
        statusDesignApprovedNotice: "akkoord gegeven op het ontwerp. De ontwikkeling is gestart.",
        statusFilesTitle: "Project Bestanden",
        statusFilesDesc: "Upload hier je logo's, teksten of andere benodigde bestanden voor dit project.",
        statusSelectFilesBtn: "Selecteer Bestanden...",
        statusActionsTitle: "Snelle Acties & Contact",
        statusLiveDemoTitle: "Bekijk Live Demo",
        statusLiveDemoDesc: "Probeer je nieuwe site/software in de test-omgeving",
        statusPayMollieTitle: "Factuur Betalen (Mollie)",
        statusPayMollieDesc: "Betaal veilig en snel online via iDEAL / Creditcard",
        statusWhatsAppAllardTitle: "WhatsApp met Allard",
        statusWhatsAppAllardDesc: "Stuur direct een bericht voor snelle vragen",
        statusSendEmailTitle: "Stuur een E-mail",
        statusUploadingFiles: "Bezig met uploaden... Even geduld.",
        statusFilesUploaded: "bestand(en) succesvol geüpload!",
        statusUploadError: "Fout bij uploaden. Probeer het opnieuw.",
        statusNoFilesYet: "Nog geen bestanden geüpload.",
        statusAddedOn: "Toegevoegd op",
        statusViewFile: "Bekijk",
        statusAgreeBtn: "Digitaal Akkoord Geven & Starten",
        statusOpenSignModalBtn: "✍️ Definitief Digitaal Akkoord Geven",
        statusPreviewPdfBtn: "📄 Offerte & PDF Inzien",
        statusPreviewPdfDesc: "Bekijk de officiële offerte specificaties, leveringsvoorwaarden en investering in PDF.",
        statusSigningModalTitle: "Definitief Digitaal Akkoord & Ondertekening",
        statusSigningModalSubtitle: "Controleer onderstaande gegevens en bevestig je digitale handtekening om het project direct te starten.",
        statusSigningProjectLabel: "Project / Offerte",
        statusSigningTotalLabel: "Totaal Investering",
        statusSigningSignerNameLabel: "Naam ondertekenaar (gemachtigde) *",
        statusSigningSignerEmailLabel: "E-mailadres ter verificatie",
        statusSigningDateLabel: "Datum van akkoord",
        statusSigningCheckboxLabel: "Ik verklaar bevoegd te zijn om namens de opdrachtgever akkoord te geven op dit investeringsvoorstel en de deliverables, en ga akkoord met de algemene voorwaarden van Creation+Alt+Fix.",
        statusSigningConfirmBtn: "Definitief Ondertekenen & Starten",
        statusSigningCancelBtn: "Annuleren",
        statusSigningCheckboxRequired: "Vink de akkoordverklaring aan om digitaal te kunnen ondertekenen.",
        statusSigningNameRequired: "Vul alsjeblieft de naam van de gemachtigde ondertekenaar in.",
        statusAgreeNotice: "Door te ondertekenen ga je digitaal akkoord met de voorgestelde scope en prijsopgave.",
        statusAgreeConfirm: "Weet je zeker dat je digitaal akkoord wilt geven op deze offerte",
        statusAgreeSigning: "Bezig met digitaal ondertekenen & PDF genereren...",
        statusAgreeSuccessAlert: "Gefeliciteerd! Je akkoord is digitaal ondertekend en de officiële offerte PDF is gegenereerd en gedownload.",
        statusAgreeErrorAlert: "Er is een fout opgetreden bij het verwerken van je akkoord.",
        statusDesignViewLink: "Bekijk Design / Wireframe in nieuw tabblad",
        statusDesignViewHelp: "Klik hierboven om het voorgestelde visueel ontwerp te bekijken in Figma of de design preview.",
        statusDesignAgreeBtn: "Akkoord op Design",
        statusDesignFeedbackBtn: "Ik heb feedback",
        statusDesignAgreeHelp: "Door op 'Akkoord' te klikken geef je goedkeuring op het ontwerp en starten we met de ontwikkeling.",
        statusDesignConfirm: "Weet je zeker dat je akkoord wilt geven op het ontwerp? Hierna start de ontwikkeling (code).",
        statusDesignProcessing: "Bezig met verwerken...",
        statusDesignSuccessAlert: "Top! Je design-akkoord is geregistreerd. We starten nu met de ontwikkeling van jouw project.",
        statusDesignErrorAlert: "Er is een fout opgetreden bij het verwerken van je design-akkoord.",
        statusProposalPrepDesc: "Bedankt voor het invullen van de intake!\n\nCreation+Alt+Fix is momenteel jouw projectwensen aan het analyseren om een passend investeringsvoorstel op te stellen.\n\nZodra Allard de offerte heeft klaargezet, verschijnt de definitieve prijs en scope hier direct en kun je deze met één klik digitaal accepteren.",
        statusProposalPrepBtn: "Offerte wordt opgesteld door Creation+Alt+Fix...",
        statusProposalPrepHelp: "Vragen of spoed? Neem gerust direct contact op via WhatsApp of E-mail hieronder.",
        statusDesignPrepBtn: "Creation+Alt+Fix werkt aan het visuele ontwerp...",
        statusDesignPrepHelp: "Zodra het ontwerp/wireframe klaar is, verschijnt hier een preview en kun je het met één klik goedkeuren.",
        statusMessagesTitle: "Berichten & Revisieverzoeken",
        statusMessagesDesc: "Heb je een vraag, wens of revisieverzoek voor je project? Wissel hier direct berichten uit met Allard.",
        statusChatFilterAll: "Alle Berichten",
        statusChatFilterRevision: "🎨 Revisies & Feedback",
        statusChatFilterQuestion: "💬 Vragen",
        statusChatFilterUrgent: "⚡ Spoed",
        statusChatTypeLabel: "Type Bericht / Onderwerp:",
        statusCategoryGeneral: "💬 Algemeen / Vraag",
        statusCategoryRevision: "🎨 Design Feedback / Revisieverzoek",
        statusCategoryUrgent: "⚡ Spoedvraag",
        statusCategoryContent: "📄 Teksten & Bestanden Aanleveren",
        statusChatPlaceholder: "Typ hier je vraag, toelichting of revisieverzoek...",
        statusChatEncryptedNotice: "Direct gekoppeld aan jouw project workspace.",
        statusChatSendBtn: "Verstuur Bericht",
        statusOpenTicketTitle: "Stuur Bericht of Vraag",
        statusOpenTicketDesc: "Stel direct een vraag of dien een revisie in",
        statusChatEmpty: "Nog geen berichten gewisseld. Heb je een vraag of feedback? Stuur hieronder direct een bericht!",
        statusChatSending: "Bezig met verzenden...",
        statusChatSentSuccess: "Bericht succesvol verzonden!",
        statusChatSendError: "Fout bij verzenden van bericht.",
        statusChatStatusOpen: "Open",
        statusChatStatusProgress: "In Behandeling",
        statusChatStatusResolved: "Opgelost",
        statusChatFromTeam: "Creation+Alt+Fix Support",
        statusChatFromYou: "Jij (Klant)",
        statusStagingTitle: "Live Concept Preview & Visuele Feedback",
        statusStagingDesc: "Bekijk je website live in verschillende apparaten. Klik op 'Visuele Feedback Geven' om direct opmerkingen op elementen te pinnen.",
        statusToggleFeedbackBtn: "✏️ Visuele Feedback Geven",
        statusStopFeedbackBtn: "✅ Feedback Modus Sluiten",
        statusOpenTabBtn: "Nieuw Tabblad",
        statusLiveUrlLabel: "Live URL:",
        statusViewportDesktop: "Desktop",
        statusViewportTablet: "Tablet",
        statusViewportMobile: "Mobiel",
        statusAnnotationModeActiveTitle: "Feedback Modus is Actief!",
        statusAnnotationModeActiveDesc: "Klik op elk gewenst element (titel, knop, sectie) op de website hieronder om een feedback pin te plaatsen.",
        statusAnnotationCloseBtn: "Gereed",
        statusPinPopoverTitle: "Feedback Pin Toevoegen",
        statusPinCategoryLabel: "Categorie:",
        statusPinCatDesign: "🎨 Design & Styling",
        statusPinCatText: "📄 Tekst & Afbeeldingen",
        statusPinCatFeature: "⚡ Functionaliteit",
        statusPinCatBug: "🐛 Bug / Verbetering",
        statusPinPlaceholder: "Bijv. Maak dit logo iets groter en pas de knopkleur aan naar donkerblauw...",
        statusPinCancelBtn: "Annuleren",
        statusPinSubmitBtn: "Plaats Pin",
        statusPinsListTitle: "Geplaatst Feedback Overzicht",
        statusNoPinsYet: "Nog geen pinnen geplaatst. Activeer feedback modus om een pin op de website te plaatsen.",
        statusPinPlacedSuccess: "Feedback pin succesvol geplaatst!",
        statusNavDocs: "Documentatie",
        statusHandoverTitle: "Systeem Overdracht & Documentatie",
        statusHandoverDesc: "Bekijk de officiële documentatiegids voor contentbeheer, DNS-instellingen, videohandleidingen en SEO-richtlijnen.",
        statusOpenDocsBtn: "Open Documentatie Gids"
    },
    en: {
        statusPageTitle: "My Project Dashboard - Creation+Alt+Fix",
        statusLoadingUser: "Loading...",
        statusResetPassBtn: "Reset Password",
        statusLogoutBtn: "Sign Out",
        statusLoadingText: "Loading your project dashboard...",
        statusNoProjectTitle: "No active project found",
        statusNoProjectDesc: "There is currently no active project associated with this email address. Have you recently submitted an intake or would you like to start a new project?",
        statusNewIntakeBtn: "Submit New Intake",
        statusWhatsAppBtn: "Contact via WhatsApp",
        statusMultipleProjectsLabel: "You have multiple projects:",
        statusProgressLabel: "Project Progress",
        statusTimelineTitle: "Project Timeline & Stages",
        stage1Number: "Stage 1",
        stage1Title: "Intake Completed",
        stage1Desc: "Requirements received and scope initialized.",
        stage2Number: "Stage 2",
        stage2Title: "Proposal & Approval",
        stage2Desc: "Investment proposal and digital acceptance.",
        stage3Number: "Stage 3",
        stage3Title: "Design & Wireframe",
        stage3Desc: "Visual identity and styling alignment.",
        stage4Number: "Stage 4",
        stage4Title: "Development",
        stage4Desc: "Code implementation and rigorous testing.",
        stage5Number: "Stage 5",
        stage5Title: "Deployment & Launch",
        stage5Desc: "Final review and domain cutover.",
        statusOfferteTitle: "Project Proposal & Quotation",
        statusProposalSub: "Investment Proposal",
        statusOffertePending: "Pending review",
        statusOfferteAcceptedTitle: "Proposal Accepted!",
        statusOfferteAcceptedOn: "You accepted this proposal on",
        statusOfferteAcceptedNotice: "",
        statusDownloadPdfBtn: "Download Signed Proposal (PDF)",
        statusDesignTitle: "Design & Wireframe Review",
        statusDesignSub: "Visual Concept & Wireframe",
        statusDesignApprovedTitle: "Design Approved!",
        statusDesignApprovedOn: "You approved the design on",
        statusDesignApprovedNotice: ". Active development is underway.",
        statusFilesTitle: "Project Files",
        statusFilesDesc: "Upload your brand logos, copy, or required assets for this project here.",
        statusSelectFilesBtn: "Select Files...",
        statusActionsTitle: "Quick Actions & Direct Contact",
        statusLiveDemoTitle: "View Live Demo",
        statusLiveDemoDesc: "Test your new site/application in the staging environment",
        statusPayMollieTitle: "Pay Invoice (Mollie)",
        statusPayMollieDesc: "Secure and instant online payment via iDEAL / Credit Card",
        statusWhatsAppAllardTitle: "WhatsApp with Allard",
        statusWhatsAppAllardDesc: "Send a direct instant message for quick questions",
        statusSendEmailTitle: "Send an Email",
        statusUploadingFiles: "Uploading files... Please wait.",
        statusFilesUploaded: "file(s) successfully uploaded!",
        statusUploadError: "Upload failed. Please try again.",
        statusNoFilesYet: "No files uploaded yet.",
        statusAddedOn: "Uploaded on",
        statusViewFile: "View",
        statusAgreeBtn: "Accept Proposal Digitally & Start",
        statusOpenSignModalBtn: "✍️ Give Final Digital Acceptance",
        statusPreviewPdfBtn: "📄 Preview Proposal & PDF",
        statusPreviewPdfDesc: "Review official quotation specifications, deliverables, and investment in PDF format.",
        statusSigningModalTitle: "Final Digital Acceptance & Signature",
        statusSigningModalSubtitle: "Review the project specifications below and confirm your digital signature to start development.",
        statusSigningProjectLabel: "Project / Quotation",
        statusSigningTotalLabel: "Total Investment",
        statusSigningSignerNameLabel: "Signer Name (Authorized Person) *",
        statusSigningSignerEmailLabel: "Verification Email",
        statusSigningDateLabel: "Date of Acceptance",
        statusSigningCheckboxLabel: "I confirm that I am authorized to accept this project proposal and deliverables, and I agree to the terms and conditions of Creation+Alt+Fix.",
        statusSigningConfirmBtn: "Sign Digitally & Start Project",
        statusSigningCancelBtn: "Cancel",
        statusSigningCheckboxRequired: "Please check the agreement box to digitally sign.",
        statusSigningNameRequired: "Please provide the name of the authorized signer.",
        statusAgreeNotice: "By signing, you digitally agree to the proposed scope and quotation.",
        statusAgreeConfirm: "Are you sure you want to digitally sign and accept this proposal",
        statusAgreeSigning: "Digitally signing & generating official PDF...",
        statusAgreeSuccessAlert: "Congratulations! Your agreement is signed and the official proposal PDF has been generated and downloaded.",
        statusAgreeErrorAlert: "An error occurred while processing your digital signature.",
        statusDesignViewLink: "View Design / Wireframe in new tab",
        statusDesignViewHelp: "Click above to inspect the visual concept in Figma or the staging preview.",
        statusDesignAgreeBtn: "Approve Design",
        statusDesignFeedbackBtn: "I have feedback",
        statusDesignAgreeHelp: "By approving the design, you authorize code development to begin.",
        statusDesignConfirm: "Are you sure you want to approve the design? Development (coding) will commence immediately.",
        statusDesignProcessing: "Processing approval...",
        statusDesignSuccessAlert: "Awesome! Your design approval is recorded. We are now building your project.",
        statusDesignErrorAlert: "An error occurred while recording your design approval.",
        statusProposalPrepDesc: "Thank you for submitting your project intake!\n\nCreation+Alt+Fix is currently analyzing your project specifications to prepare a tailored investment proposal.\n\nAs soon as Allard has prepared your quotation, the finalized pricing and scope will appear here immediately for 1-click digital acceptance.",
        statusProposalPrepBtn: "Proposal is being prepared by Creation+Alt+Fix...",
        statusProposalPrepHelp: "Questions or urgent timeline? Feel free to contact Allard directly via WhatsApp or Email below.",
        statusDesignPrepBtn: "Creation+Alt+Fix is crafting the visual design...",
        statusDesignPrepHelp: "As soon as wireframes/designs are ready, a preview will appear here for instant approval.",
        statusMessagesTitle: "Messages & Revision Requests",
        statusMessagesDesc: "Have a question, request, or revision for your project? Communicate directly with Allard here.",
        statusChatFilterAll: "All Messages",
        statusChatFilterRevision: "🎨 Revisions & Feedback",
        statusChatFilterQuestion: "💬 Questions",
        statusChatFilterUrgent: "⚡ Urgent",
        statusChatTypeLabel: "Message Type / Subject:",
        statusCategoryGeneral: "💬 General / Question",
        statusCategoryRevision: "🎨 Design Feedback / Revision",
        statusCategoryUrgent: "⚡ Urgent Request",
        statusCategoryContent: "📄 Submit Copy & Assets",
        statusChatPlaceholder: "Type your question, details, or revision request here...",
        statusChatEncryptedNotice: "Directly linked to your project workspace.",
        statusChatSendBtn: "Send Message",
        statusOpenTicketTitle: "Send Message or Request",
        statusOpenTicketDesc: "Ask a question or submit a project revision",
        statusChatEmpty: "No messages exchanged yet. Have a question or feedback? Send a message below!",
        statusChatSending: "Sending message...",
        statusChatSentSuccess: "Message sent successfully!",
        statusChatSendError: "Error sending message.",
        statusChatStatusOpen: "Open",
        statusChatStatusProgress: "In Progress",
        statusChatStatusResolved: "Resolved",
        statusChatFromTeam: "Creation+Alt+Fix Support",
        statusChatFromYou: "You (Client)",
        statusStagingTitle: "Live Concept Preview & Visual Feedback",
        statusStagingDesc: "Preview your website live across devices. Click 'Give Visual Feedback' to drop annotation pins directly onto elements.",
        statusToggleFeedbackBtn: "✏️ Give Visual Feedback",
        statusStopFeedbackBtn: "✅ Close Feedback Mode",
        statusOpenTabBtn: "New Tab",
        statusLiveUrlLabel: "Live URL:",
        statusViewportDesktop: "Desktop",
        statusViewportTablet: "Tablet",
        statusViewportMobile: "Mobile",
        statusAnnotationModeActiveTitle: "Visual Feedback Mode is Active!",
        statusAnnotationModeActiveDesc: "Click on any element (headline, button, section) on the website below to drop a feedback pin.",
        statusAnnotationCloseBtn: "Done",
        statusPinPopoverTitle: "Add Feedback Pin",
        statusPinCategoryLabel: "Category:",
        statusPinCatDesign: "🎨 Design & Styling",
        statusPinCatText: "📄 Text & Images",
        statusPinCatFeature: "⚡ Functionality",
        statusPinCatBug: "🐛 Bug / Fix",
        statusPinPlaceholder: "E.g. Make this logo slightly larger and adjust button color to dark blue...",
        statusPinCancelBtn: "Cancel",
        statusPinSubmitBtn: "Place Pin",
        statusPinsListTitle: "Placed Feedback Summary",
        statusNoPinsYet: "No feedback pins placed yet. Activate feedback mode to pin notes onto the live concept.",
        statusPinPlacedSuccess: "Feedback pin placed successfully!",
        statusNavDocs: "Documentation",
        statusHandoverTitle: "System Handover & Documentation",
        statusHandoverDesc: "View the official documentation guide for content management, DNS settings, video tutorials, and SEO guidelines.",
        statusOpenDocsBtn: "Open Documentation Guide"
    }
};

function applyTranslations(lang) {
    if (!translations[lang]) lang = 'nl';
    currentLang = lang;
    document.documentElement.lang = lang;
    if (auth) auth.languageCode = lang;

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    if (translations[lang].statusPageTitle) {
        document.title = translations[lang].statusPageTitle;
    }

    // Re-render active project sections if loaded
    if (currentProjectDocId && clientProjectsList.length > 0) {
        const active = clientProjectsList.find(p => p.id === currentProjectDocId);
        if (active) renderDashboard(active.data);
    }
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
        const t = translations[currentLang] || translations.nl;
        if (!confirm(`Wil je een e-mail ontvangen op ${user.email} om je wachtwoord opnieuw in te stellen? / Send reset email to ${user.email}?`)) return;

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

    // File Upload Handler
    document.getElementById('file-upload-input')?.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !currentProjectDocId || !storage) return;

        const t = translations[currentLang] || translations.nl;
        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusUploadingFiles}`;
        statusDiv.style.color = '#3b82f6';
        
        let projectRef = doc(db, "projects", currentProjectDocId);
        
        const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
        let existingFiles = (activeProject && activeProject.data.files) ? activeProject.data.files : [];

        let uploadCount = 0;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const filePath = `projects/${currentProjectDocId}/${Date.now()}_${safeName}`;
                const storageRef = ref(storage, filePath);
                
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                
                existingFiles.push({
                    name: file.name,
                    url: downloadURL,
                    uploadedAt: new Date().toISOString()
                });
                uploadCount++;
            }
            
            await updateDoc(projectRef, { files: existingFiles });
            if (activeProject) activeProject.data.files = existingFiles; 
            
            statusDiv.style.color = '#10b981';
            statusDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${uploadCount} ${t.statusFilesUploaded}`;
            setTimeout(() => { statusDiv.innerText = ""; }, 4000);
            
            if (activeProject) renderFilesSection(activeProject.data);

        } catch (err) {
            console.error("Upload error:", err);
            statusDiv.style.color = '#fca5a5';
            statusDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${t.statusUploadError}`;
        }
        
        e.target.value = ''; 
    });
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
            loader.classList.add('hidden');
            content.classList.add('hidden');
            noProjectView.classList.remove('hidden');
            return;
        }

        noProjectView.classList.add('hidden');
        content.classList.remove('hidden');
        loader.classList.add('hidden');

        if (clientProjectsList.length > 1) {
            multiSelector.classList.remove('hidden');
            projectDropdown.innerHTML = clientProjectsList.map((p, idx) => {
                const name = escapeHtml(p.data.client || p.data.companyName || `Project #${idx + 1}`);
                const service = escapeHtml(p.data.service || 'Dienst');
                return `<option value="${escapeHtml(p.id)}">${name} - ${service}</option>`;
            }).join('');

            currentProjectDocId = clientProjectsList[0].id;
            renderDashboard(clientProjectsList[0].data);
        } else {
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
    const t = translations[currentLang] || translations.nl;
    const clientName = data.client || data.companyName || (currentLang === 'en' ? "My Project" : "Mijn Project");
    const serviceName = data.service || (currentLang === 'en' ? "Website & Software Development" : "Website & Software Realisatie");
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

    // Render Proposal / Offerte
    renderProposalSection(data);

    // Render Design Review Card (Fase 3)
    renderDesignSection(data);

    // Render Project Bestanden
    renderFilesSection(data);

    // Render Live Staging & Visual Feedback Annotation Suite (TASK-401)
    renderStagingSection(data);

    // Render In-App Berichten & Revisies (TASK-604)
    renderMessagesSection(data);

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

    // Configure Handover Docs Link (TASK-402)
    const docsBtn = document.getElementById('btn-open-project-docs');
    if (docsBtn) {
        const domainVal = data.domainName || data.domain || '';
        const clientVal = clientName;
        docsBtn.href = `https://creationaltfix.nl/docs/?domain=${encodeURIComponent(domainVal)}&client=${encodeURIComponent(clientVal)}`;
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
    const t = translations[currentLang] || translations.nl;
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
        statusPill.innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusOfferteAcceptedTitle}`;

        priceEl.innerText = data.proposalPrice ? `€ ${data.proposalPrice}` : (currentLang === 'en' ? "Agreed quotation" : "Prijs overeengekomen");
        scopeEl.innerText = data.proposalScope || `${currentLang === 'en' ? 'Based on the intake:' : 'Op basis van de intake:'}\n\n${data.goals || data.projectGoals || (currentLang === 'en' ? 'Specifications aligned.' : 'Specificaties afgestemd.')}`;

        actionContainer.classList.add('hidden');
        successMsg.classList.remove('hidden');
        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        if (data.proposalAcceptedAt) {
            document.getElementById('accepted-date').innerText = new Date(data.proposalAcceptedAt).toLocaleDateString(localeStr);
        } else {
            document.getElementById('accepted-date').innerText = currentLang === 'en' ? "earlier" : "eerder";
        }

        // Wire up PDF download button on existing accepted proposal
        const dlBtn = document.getElementById('btn-download-proposal-pdf');
        if (dlBtn) {
            dlBtn.onclick = async () => {
                if (data.proposalPdfUrl) {
                    window.open(data.proposalPdfUrl, '_blank');
                } else {
                    const originalText = dlBtn.innerHTML;
                    dlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF...';
                    try {
                        const projData = { ...data, id: currentProjectDocId };
                        const { doc: pDoc, filename } = await generateProposalPDF(projData, true);
                        pDoc.save(filename);
                    } catch (err) {
                        console.error("PDF download fout:", err);
                        alert(t.statusAgreeErrorAlert);
                    } finally {
                        dlBtn.innerHTML = originalText;
                    }
                }
            };
        }
    } else if (isReadyForAcceptance) {
        // STATE B: Offerte Gereed voor Akkoord
        statusPill.className = "offerte-status-pill action-required";
        statusPill.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${currentLang === 'en' ? 'Action Required: Digital Acceptance' : 'Actie Vereist: Digitaal Akkoord'}`;

        let scopeHtml = '';
        if (data.proposalTitle) {
            scopeHtml += `<h4 style="color: #fff; margin-bottom: 8px; font-size: 1.05rem;"><i class="fas fa-layer-group text-accent"></i> ${escapeHtml(data.proposalTitle)}</h4>`;
        }
        if (data.proposalScope) {
            scopeHtml += `<p style="margin-bottom: 12px; line-height: 1.5; color: #cbd5e1;">${escapeHtml(data.proposalScope)}</p>`;
        } else {
            scopeHtml += `<p style="margin-bottom: 12px; line-height: 1.5; color: #cbd5e1;">${escapeHtml(data.goals || data.projectGoals || (currentLang === 'en' ? 'Complete software & website realization as discussed.' : 'Volledige software & website realisatie zoals besproken.'))}</p>`;
        }

        if (Array.isArray(data.deliverables) && data.deliverables.length > 0) {
            scopeHtml += `<div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
                <strong style="color: var(--color-accent); font-size: 0.82rem; text-transform: uppercase;">${currentLang === 'en' ? 'Included Deliverables & Scope:' : 'Inbegrepen Deliverables & Scope:'}</strong>
                ${data.deliverables.map((d) => `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px;">
                        <div style="font-weight: 700; color: #fff; font-size: 0.9rem;"><i class="fas fa-check-circle" style="color: #34d399; margin-right: 6px;"></i> ${escapeHtml(d.title || '')}</div>
                        ${d.description ? `<div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 3px;">${escapeHtml(d.description)}</div>` : ''}
                    </div>
                `).join('')}
            </div>`;
        }

        scopeEl.innerHTML = scopeHtml;

        successMsg.classList.add('hidden');
        actionContainer.classList.remove('hidden');
        actionContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
                <div style="display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap;">
                    <button id="btn-open-sign-modal" type="button" class="btn-akkoord" style="flex: 1.2; min-width: 240px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-size: 1rem; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);">
                        <i class="fas fa-file-signature"></i> <span>${t.statusOpenSignModalBtn}</span>
                    </button>
                    <button id="btn-preview-proposal-pdf" type="button" class="btn-logout" style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.18); color: #fff; padding: 12px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.92rem; transition: all 0.2s ease;">
                        <i class="fas fa-file-pdf text-accent"></i> <span>${t.statusPreviewPdfBtn}</span>
                    </button>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-shield-alt text-accent"></i> <span>${t.statusPreviewPdfDesc}</span>
                </p>
            </div>
        `;

        setupProposalActionFlow(data);
    } else {
        // STATE A: Offerte in Voorbereiding (Intake ontvangen)
        statusPill.className = "offerte-status-pill pending";
        statusPill.innerHTML = `<i class="fas fa-clock"></i> ${t.statusOffertePending}`;

        priceEl.innerText = currentLang === 'en' ? "Calculating..." : "Wordt berekend...";
        scopeEl.innerText = t.statusProposalPrepDesc;

        successMsg.classList.add('hidden');
        actionContainer.classList.remove('hidden');
        actionContainer.innerHTML = `
            <button class="btn-akkoord-disabled" disabled>
                <i class="fas fa-hourglass-half"></i> ${t.statusProposalPrepBtn}
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-info-circle"></i> ${t.statusProposalPrepHelp}
            </p>
        `;
    }
}

function setupProposalActionFlow(data) {
    const t = translations[currentLang] || translations.nl;

    // 1. Setup Preview Concept PDF button
    const btnPreview = document.getElementById('btn-preview-proposal-pdf');
    if (btnPreview) {
        btnPreview.onclick = async () => {
            const originalHtml = btnPreview.innerHTML;
            btnPreview.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF genereren...';
            btnPreview.disabled = true;
            try {
                const activeProjectObj = clientProjectsList.find(p => p.id === currentProjectDocId);
                const projData = activeProjectObj ? { ...activeProjectObj.data } : { ...data };
                projData.id = currentProjectDocId || 'concept';

                const { doc: pDoc, filename } = await generateProposalPDF(projData, false);
                pDoc.save(filename);
            } catch (err) {
                console.error("Concept PDF download fout:", err);
                alert("Kon de concept offerte PDF niet genereren: " + err.message);
            } finally {
                btnPreview.innerHTML = originalHtml;
                btnPreview.disabled = false;
            }
        };
    }

    // 2. Setup Open Signing Modal button
    const btnOpenSign = document.getElementById('btn-open-sign-modal');
    const modal = document.getElementById('proposal-signing-modal');
    if (btnOpenSign && modal) {
        btnOpenSign.onclick = () => {
            const activeProjectObj = clientProjectsList.find(p => p.id === currentProjectDocId);
            const proj = activeProjectObj ? activeProjectObj.data : data;

            // Fill project title & numbers
            const titleEl = document.getElementById('sign-modal-project-title');
            if (titleEl) {
                titleEl.innerText = proj.proposalTitle || proj.client || proj.companyName || proj.service || 'Creation+Alt+Fix Offerte';
            }

            const rawPrice = proj.proposalPrice ? String(proj.proposalPrice).replace(/[^0-9,.-]/g, '').replace(',', '.') : '0';
            const numPrice = parseFloat(rawPrice) || 0;
            const vatPrice = numPrice * 0.21;
            const totalIncPrice = numPrice * 1.21;

            const formatVal = (val) => `€ ${val.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalPriceEl = document.getElementById('sign-modal-total-price');
            const priceExEl = document.getElementById('sign-modal-price-ex');
            const priceVatEl = document.getElementById('sign-modal-price-vat');
            const priceIncEl = document.getElementById('sign-modal-price-inc');

            if (totalPriceEl) totalPriceEl.innerText = formatVal(numPrice);
            if (priceExEl) priceExEl.innerText = formatVal(numPrice);
            if (priceVatEl) priceVatEl.innerText = formatVal(vatPrice);
            if (priceIncEl) priceIncEl.innerText = formatVal(totalIncPrice);

            // Fill signer info
            const nameInput = document.getElementById('sign-signer-name');
            if (nameInput) {
                nameInput.value = proj.contactName || proj.client || auth.currentUser?.displayName || '';
            }

            const emailInput = document.getElementById('sign-signer-email');
            if (emailInput) {
                emailInput.value = proj.email || auth.currentUser?.email || '';
            }

            const dateInput = document.getElementById('sign-signer-date');
            if (dateInput) {
                dateInput.value = new Date().toLocaleDateString(currentLang === 'en' ? 'en-US' : 'nl-NL', { year: 'numeric', month: 'long', day: 'numeric' });
            }

            const checkbox = document.getElementById('sign-agreement-checkbox');
            if (checkbox) checkbox.checked = false;

            const errBox = document.getElementById('sign-modal-error');
            if (errBox) {
                errBox.innerText = '';
                errBox.classList.add('hidden');
            }

            modal.classList.remove('hidden');
        };
    }

    // 3. Modal Close Triggers
    const closeBtnX = document.getElementById('btn-close-sign-modal-x');
    const cancelBtn = document.getElementById('btn-cancel-sign-modal');
    if (closeBtnX) closeBtnX.onclick = () => modal?.classList.add('hidden');
    if (cancelBtn) cancelBtn.onclick = () => modal?.classList.add('hidden');

    // 4. Confirm Signature Trigger
    const btnConfirmSign = document.getElementById('btn-confirm-final-signature');
    if (btnConfirmSign) {
        btnConfirmSign.onclick = async () => {
            const errBox = document.getElementById('sign-modal-error');
            const signerName = document.getElementById('sign-signer-name')?.value.trim();
            const agreementChecked = document.getElementById('sign-agreement-checkbox')?.checked;

            if (!signerName) {
                if (errBox) {
                    errBox.innerText = t.statusSigningNameRequired;
                    errBox.classList.remove('hidden');
                }
                return;
            }

            if (!agreementChecked) {
                if (errBox) {
                    errBox.innerText = t.statusSigningCheckboxRequired;
                    errBox.classList.remove('hidden');
                }
                return;
            }

            if (errBox) errBox.classList.add('hidden');

            const origConfirmText = btnConfirmSign.innerHTML;
            btnConfirmSign.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusAgreeSigning}`;
            btnConfirmSign.disabled = true;

            try {
                const projectRef = doc(db, "projects", currentProjectDocId);
                const nowIso = new Date().toISOString();

                const activeProjectObj = clientProjectsList.find(p => p.id === currentProjectDocId);
                const projData = activeProjectObj ? { ...activeProjectObj.data } : { ...data };
                projData.proposalAcceptedAt = nowIso;
                projData.proposalSignedBy = signerName;
                projData.id = currentProjectDocId;

                // 1. Generate Signed Proposal PDF
                let pdfDownloadUrl = null;
                let pdfFileName = null;
                try {
                    const { doc: pdfDoc, blob: pdfBlob, filename } = await generateProposalPDF(projData, true);
                    pdfFileName = filename;

                    // 2. Upload to Firebase Storage if available
                    if (storage) {
                        const uploadRes = await uploadPdfToStorage(storage, pdfBlob, currentProjectDocId, filename);
                        if (uploadRes) {
                            pdfDownloadUrl = uploadRes.downloadUrl;
                        }
                    }

                    // Auto-download for the client
                    pdfDoc.save(filename);
                } catch (pdfErr) {
                    console.warn("PDF generatie / upload waarschuwing:", pdfErr);
                }

                const updatePayload = {
                    status: "Wacht op Design & Ontwerp",
                    statusClass: "active",
                    proposalAcceptedAt: nowIso,
                    proposalSignedBy: signerName
                };
                if (pdfDownloadUrl) {
                    updatePayload.proposalPdfUrl = pdfDownloadUrl;
                    updatePayload.proposalPdfName = pdfFileName;
                }

                await updateDoc(projectRef, updatePayload);

                if (activeProjectObj) {
                    activeProjectObj.data.status = "Wacht op Design & Ontwerp";
                    activeProjectObj.data.proposalAcceptedAt = nowIso;
                    activeProjectObj.data.proposalSignedBy = signerName;
                    if (pdfDownloadUrl) activeProjectObj.data.proposalPdfUrl = pdfDownloadUrl;
                }

                // Close modal
                modal?.classList.add('hidden');

                // Update UI to State C (Accepted)
                document.getElementById('offerte-status-pill').className = "offerte-status-pill accepted";
                document.getElementById('offerte-status-pill').innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusOfferteAcceptedTitle}`;

                document.getElementById('offerte-action-container').classList.add('hidden');
                document.getElementById('offerte-success-msg').classList.remove('hidden');
                const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
                document.getElementById('accepted-date').innerText = new Date(nowIso).toLocaleDateString(localeStr);

                const dlBtn = document.getElementById('btn-download-proposal-pdf');
                if (dlBtn) {
                    dlBtn.onclick = async () => {
                        if (pdfDownloadUrl) {
                            window.open(pdfDownloadUrl, '_blank');
                        } else {
                            const { doc: pDoc, filename } = await generateProposalPDF(projData, true);
                            pDoc.save(filename);
                        }
                    };
                }

                document.getElementById('status-badge').innerText = "Wacht op Design & Ontwerp";
                document.getElementById('status-badge').className = "badge badge-active";
                document.getElementById('progress-bar-fill').style.width = "60%";
                document.getElementById('progress-percent-display').innerText = "60% Complete";
                updateTimeline(3);

                renderDesignSection({ status: "Wacht op Design & Ontwerp" });

                alert(t.statusAgreeSuccessAlert);
            } catch (error) {
                console.error("Akkoord opslaan fout:", error);
                if (errBox) {
                    errBox.innerText = t.statusAgreeErrorAlert + " (" + error.message + ")";
                    errBox.classList.remove('hidden');
                }
                alert(t.statusAgreeErrorAlert);
            } finally {
                btnConfirmSign.innerHTML = origConfirmText;
                btnConfirmSign.disabled = false;
            }
        };
    }
}

function renderDesignSection(data) {
    const t = translations[currentLang] || translations.nl;
    const designCard = document.getElementById('design-card');
    if (!designCard) return;

    const statusText = data.status || '';

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
        designStatusPill.innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusDesignApprovedTitle}`;

        designPreview.classList.add('hidden');
        designAction.classList.add('hidden');
        designSuccess.classList.remove('hidden');

        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        if (data.designAcceptedAt) {
            document.getElementById('design-accepted-date').innerText = new Date(data.designAcceptedAt).toLocaleDateString(localeStr);
        } else {
            document.getElementById('design-accepted-date').innerText = currentLang === 'en' ? "earlier" : "eerder";
        }

    } else if (isDesignReady) {
        // STATE B: Design Gereed voor Review
        designStatusPill.className = "offerte-status-pill action-required";
        designStatusPill.innerHTML = `<i class="fas fa-palette"></i> ${currentLang === 'en' ? 'Action Required: Review Design' : 'Actie Vereist: Design Beoordelen'}`;

        const previewUrl = data.designUrl || data.figmaUrl || '#';
        const designTitle = data.designTitle || (currentLang === 'en' ? 'Visual Concept & Wireframe' : 'Visueel Ontwerp & Wireframe');
        const designNotes = data.designNotes || '';

        designPreview.classList.remove('hidden');
        designPreview.innerHTML = `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                <h4 style="margin: 0 0 6px 0; color: #fff; font-size: 1rem;"><i class="fas fa-layer-group text-accent"></i> ${escapeHtml(designTitle)}</h4>
                ${designNotes ? `<p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">${escapeHtml(designNotes)}</p>` : ''}
                <a href="${previewUrl}" target="_blank" class="design-preview-link" style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 600;">
                    <i class="fas fa-external-link-alt"></i> ${t.statusDesignViewLink}
                </a>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                <i class="fas fa-info-circle"></i> ${t.statusDesignViewHelp}
            </p>
        `;

        designSuccess.classList.add('hidden');
        designAction.classList.remove('hidden');
        designAction.innerHTML = `
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="btn-design-akkoord" class="btn-akkoord" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #a855f7, #7c3aed);">
                    <i class="fas fa-palette"></i> ${t.statusDesignAgreeBtn}
                </button>
                <button type="button" id="btn-design-feedback-trigger" class="btn-akkoord" style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); text-align: center; cursor: pointer;">
                    <i class="fas fa-comment-dots"></i> ${t.statusDesignFeedbackBtn}
                </button>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
                <i class="fas fa-shield-alt"></i> ${t.statusDesignAgreeHelp}
            </p>
        `;

        setupDesignAcceptButton();

        const feedbackTrigger = document.getElementById('btn-design-feedback-trigger');
        if (feedbackTrigger) {
            feedbackTrigger.onclick = () => {
                const categorySelect = document.getElementById('chat-category-select');
                if (categorySelect) categorySelect.value = 'revision';
                const inputArea = document.getElementById('chat-message-input');
                const messagesCard = document.getElementById('messages-card');
                if (messagesCard) messagesCard.scrollIntoView({ behavior: 'smooth' });
                if (inputArea) {
                    inputArea.focus();
                    if (!inputArea.value) {
                        inputArea.value = currentLang === 'en' 
                            ? "Regarding the visual design: " 
                            : "Betreft het visueel ontwerp: ";
                    }
                }
            };
        }

    } else {
        // STATE A: Design in Voorbereiding
        designStatusPill.className = "offerte-status-pill pending";
        designStatusPill.innerHTML = `<i class="fas fa-clock"></i> ${currentLang === 'en' ? 'Design in Preparation' : 'Design in Voorbereiding'}`;

        designPreview.classList.add('hidden');
        designSuccess.classList.add('hidden');
        designAction.classList.remove('hidden');
        designAction.innerHTML = `
            <button class="btn-akkoord-disabled" disabled>
                <i class="fas fa-drafting-compass"></i> ${t.statusDesignPrepBtn}
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-info-circle"></i> ${t.statusDesignPrepHelp}
            </p>
        `;
    }
}

function setupDesignAcceptButton() {
    const btn = document.getElementById('btn-design-akkoord');
    if (!btn) return;

    btn.onclick = async () => {
        const t = translations[currentLang] || translations.nl;
        if (!currentProjectDocId) {
            alert(t.statusDesignErrorAlert);
            return;
        }

        if (!confirm(t.statusDesignConfirm)) return;

        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusDesignProcessing}`;
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
            document.getElementById('design-status-pill').innerHTML = `<i class="fas fa-check-circle"></i> ${t.statusDesignApprovedTitle}`;

            document.getElementById('design-action-container').classList.add('hidden');
            document.getElementById('design-preview-container').classList.add('hidden');
            document.getElementById('design-success-msg').classList.remove('hidden');
            const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
            document.getElementById('design-accepted-date').innerText = new Date(nowIso).toLocaleDateString(localeStr);

            document.getElementById('status-badge').innerText = "In Ontwikkeling";
            document.getElementById('status-badge').className = "badge badge-active";
            document.getElementById('progress-bar-fill').style.width = "80%";
            document.getElementById('progress-percent-display').innerText = "80% Complete";
            updateTimeline(4);

            alert(t.statusDesignSuccessAlert);

        } catch (error) {
            console.error("Fout bij design akkoord:", error);
            alert(t.statusDesignErrorAlert);
            btn.innerHTML = `<i class="fas fa-palette"></i> ${t.statusDesignAgreeBtn}`;
            btn.disabled = false;
        }
    };
}

function renderFilesSection(data) {
    const t = translations[currentLang] || translations.nl;
    const filesListContainer = document.getElementById('uploaded-files-list');
    if (!filesListContainer) return;

    const files = data.files || [];
    
    if (files.length === 0) {
        filesListContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">${t.statusNoFilesYet}</p>`;
        return;
    }

    const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
    filesListContainer.innerHTML = files.map(f => {
        const dateStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString(localeStr) : (currentLang === 'en' ? 'earlier' : 'eerder');
        const safeUrl = escapeHtml(f.url);
        const safeName = escapeHtml(f.name);
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                    <i class="fas fa-file-alt" style="color: #6366f1; font-size: 1.2rem;"></i>
                    <div style="overflow: hidden;">
                        <div style="font-size: 0.9rem; font-weight: 500; color: #f8fafc; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${safeName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${t.statusAddedOn} ${dateStr}</div>
                    </div>
                </div>
                <a href="${safeUrl}" target="_blank" style="color: #22d3ee; background: rgba(34, 211, 238, 0.1); padding: 8px 12px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; flex-shrink: 0; transition: all 0.2s;">
                    <i class="fas fa-download"></i> ${t.statusViewFile}
                </a>
            </div>
        `;
    }).join('');
}

// ===========================================
// IN-APP MESSAGING & TICKETING LOGIC (TASK-604)
// ===========================================
let activeChatFilter = 'all';

function renderMessagesSection(data) {
    const t = translations[currentLang] || translations.nl;
    const threadContainer = document.getElementById('messages-thread');
    const countBadge = document.getElementById('messages-count-badge');
    if (!threadContainer) return;

    const messages = (data && data.messages && Array.isArray(data.messages)) ? data.messages : [];
    
    if (countBadge) {
        countBadge.innerText = `${messages.length} ${messages.length === 1 ? (currentLang === 'en' ? 'message' : 'bericht') : (currentLang === 'en' ? 'messages' : 'berichten')}`;
    }

    // Filter messages based on activeChatFilter
    const filteredMessages = messages.filter(msg => {
        if (activeChatFilter === 'all') return true;
        if (activeChatFilter === 'revision') return msg.category === 'revision';
        if (activeChatFilter === 'question') return msg.category === 'question' || msg.category === 'general';
        if (activeChatFilter === 'urgent') return msg.category === 'urgent';
        return true;
    });

    if (filteredMessages.length === 0) {
        threadContainer.innerHTML = `
            <div class="chat-empty-state">
                <i class="fas fa-comments"></i>
                <p style="font-size: 0.9rem; margin-top: 6px;">${t.statusChatEmpty}</p>
            </div>
        `;
    } else {
        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        
        threadContainer.innerHTML = filteredMessages.map(msg => {
            const isAdmin = msg.sender === 'admin';
            const isClient = !isAdmin;
            const bubbleClass = isAdmin ? 'admin' : 'client';
            
            const senderDisplayName = isAdmin 
                ? 'Allard (Creation+Alt+Fix)' 
                : (escapeHtml(msg.senderName) || t.statusChatFromYou);
            
            const senderIcon = isAdmin 
                ? '<i class="fas fa-shield-alt" style="color: var(--color-accent);"></i>' 
                : '<i class="fas fa-user-circle"></i>';
            
            const teamBadge = isAdmin 
                ? `<span class="chat-badge-team">${t.statusChatFromTeam}</span>` 
                : '';

            const dateStr = msg.createdAt 
                ? new Date(msg.createdAt).toLocaleString(localeStr, { 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) 
                : (currentLang === 'en' ? 'Just now' : 'Zojuist');

            // Category tag formatting
            let catLabel = '💬 Algemeen';
            let catClass = 'general';
            if (msg.category === 'revision') {
                catLabel = '🎨 Revisie';
                catClass = 'revision';
            } else if (msg.category === 'urgent') {
                catLabel = '⚡ Spoed';
                catClass = 'urgent';
            } else if (msg.category === 'question') {
                catLabel = '💬 Vraag';
                catClass = 'question';
            } else if (msg.category === 'content') {
                catLabel = '📄 Bestanden';
                catClass = 'content';
            }

            // Ticket Status formatting
            let statusHtml = '';
            if (msg.status === 'open') {
                statusHtml = `<span class="chat-ticket-status open"><i class="fas fa-circle" style="font-size: 0.55rem;"></i> ${t.statusChatStatusOpen}</span>`;
            } else if (msg.status === 'in_progress') {
                statusHtml = `<span class="chat-ticket-status in_progress"><i class="fas fa-spinner fa-spin" style="font-size: 0.55rem;"></i> ${t.statusChatStatusProgress}</span>`;
            } else if (msg.status === 'resolved') {
                statusHtml = `<span class="chat-ticket-status resolved"><i class="fas fa-check" style="font-size: 0.55rem;"></i> ${t.statusChatStatusResolved}</span>`;
            }

            return `
                <div class="chat-bubble ${bubbleClass}">
                    <div class="chat-bubble-header">
                        <div class="chat-sender-name">
                            ${senderIcon}
                            <span>${senderDisplayName}</span>
                            ${teamBadge}
                        </div>
                        <span class="chat-timestamp">${dateStr}</span>
                    </div>
                    <div class="chat-bubble-body">${escapeHtml(msg.message)}</div>
                    <div class="chat-bubble-footer">
                        <span class="chat-cat-tag ${catClass}">${catLabel}</span>
                        ${statusHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Auto scroll to bottom
        threadContainer.scrollTop = threadContainer.scrollHeight;
    }

    setupChatListeners();
}

function setupChatListeners() {
    // Filter buttons
    document.querySelectorAll('.chat-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.chat-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeChatFilter = btn.getAttribute('data-filter') || 'all';
            const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
            if (activeProject) renderMessagesSection(activeProject.data);
        };
    });

    // Compose Form Submit
    const form = document.getElementById('chat-compose-form');
    if (form && !form.dataset.bound) {
        form.dataset.bound = "true";
        form.onsubmit = async (e) => {
            e.preventDefault();
            const t = translations[currentLang] || translations.nl;
            const categoryEl = document.getElementById('chat-category-select');
            const messageEl = document.getElementById('chat-message-input');
            const sendBtn = document.getElementById('btn-send-message');

            const category = categoryEl ? categoryEl.value : 'general';
            const messageText = messageEl ? messageEl.value.trim() : '';

            if (!messageText || !currentProjectDocId) return;

            sendBtn.disabled = true;
            const origBtnHtml = sendBtn.innerHTML;
            sendBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusChatSending}`;

            try {
                const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
                const existingMessages = (activeProject && activeProject.data.messages && Array.isArray(activeProject.data.messages)) 
                    ? [...activeProject.data.messages] 
                    : [];

                const clientName = (activeProject && (activeProject.data.contactName || activeProject.data.client)) || 'Klant';
                const clientEmail = auth?.currentUser?.email || (activeProject && activeProject.data.email) || '';

                const newMsg = {
                    id: 'msg_' + Date.now(),
                    sender: 'client',
                    senderName: clientName,
                    senderEmail: clientEmail,
                    category: category,
                    message: messageText,
                    createdAt: new Date().toISOString(),
                    readByAdmin: false,
                    readByClient: true,
                    status: 'open'
                };

                existingMessages.push(newMsg);

                // Update Firestore
                if (db) {
                    await updateDoc(doc(db, "projects", currentProjectDocId), {
                        messages: existingMessages
                    });
                }

                if (activeProject) {
                    activeProject.data.messages = existingMessages;
                }

                messageEl.value = '';
                renderMessagesSection(activeProject ? activeProject.data : { messages: existingMessages });

            } catch (err) {
                console.error("Fout bij verzenden bericht:", err);
                alert(t.statusChatSendError + " " + err.message);
            } finally {
                sendBtn.disabled = false;
                sendBtn.innerHTML = origBtnHtml;
            }
        };
    }

    // Quick contact button hookup
    const quickTicketBtn = document.getElementById('btn-open-messaging-card');
    if (quickTicketBtn && !quickTicketBtn.dataset.bound) {
        quickTicketBtn.dataset.bound = "true";
        quickTicketBtn.onclick = () => {
            const messagesCard = document.getElementById('messages-card');
            const inputArea = document.getElementById('chat-message-input');
            if (messagesCard) messagesCard.scrollIntoView({ behavior: 'smooth' });
            if (inputArea) inputArea.focus();
        };
    }
}

// ===========================================
// LIVE STAGING & VISUAL ANNOTATION SUITE (TASK-401)
// ===========================================

export function resolveStagingUrl(p) {
    if (!p) return null;
    let url = p.domainName || p.domain || p.demoUrl || p.stagingUrl || p.designUrl;
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (url === '' || url.toLowerCase() === 'n.v.t.' || url.toLowerCase() === 'geen' || url.toLowerCase() === 'nog geen domein') {
        return null;
    }
    // Prefix https:// if protocol is missing
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    return url;
}

let isAnnotationModeActive = false;
let currentPendingPinCoords = null;
let currentViewport = 'desktop';

function renderStagingSection(data) {
    const t = translations[currentLang] || translations.nl;
    const stagingCard = document.getElementById('staging-card');
    if (!stagingCard) return;

    const resolvedUrl = resolveStagingUrl(data);
    const iframe = document.getElementById('staging-iframe');
    const urlDisplay = document.getElementById('staging-url-display');
    const mockupUrl = document.getElementById('mockup-address-text');
    const openTabBtn = document.getElementById('btn-open-staging-tab');

    if (resolvedUrl) {
        if (iframe && iframe.dataset.loadedUrl !== resolvedUrl) {
            iframe.removeAttribute('srcdoc');
            iframe.src = resolvedUrl;
            iframe.dataset.loadedUrl = resolvedUrl;
        }
        if (urlDisplay) urlDisplay.innerText = resolvedUrl;
        if (mockupUrl) mockupUrl.innerText = resolvedUrl;
        if (openTabBtn) {
            openTabBtn.href = resolvedUrl;
            openTabBtn.classList.remove('hidden');
        }
    } else {
        // Generate built-in interactive Dark AI prototype
        if (iframe && iframe.dataset.loadedUrl !== 'prototype') {
            iframe.removeAttribute('src');
            iframe.srcdoc = generateFallbackPrototype(data);
            iframe.dataset.loadedUrl = 'prototype';
        }
        const protoTitle = (data.client || data.companyName || 'Concept') + ' - Concept Prototype';
        if (urlDisplay) urlDisplay.innerText = `https://demo.creationaltfix.nl/${encodeURIComponent((data.client || 'concept').toLowerCase().replace(/\s+/g, '-'))}`;
        if (mockupUrl) mockupUrl.innerText = `https://demo.creationaltfix.nl/${encodeURIComponent((data.client || 'concept').toLowerCase().replace(/\s+/g, '-'))}`;
        if (openTabBtn) {
            openTabBtn.href = '#';
            openTabBtn.onclick = (e) => {
                e.preventDefault();
                const newWin = window.open('about:blank', '_blank');
                if (newWin) newWin.document.write(generateFallbackPrototype(data));
            };
        }
    }

    // Render placed pins
    renderAnnotationPins(data.annotations || []);

    // Wire up Device Switcher and Annotation Engine
    setupStagingControls(data);
}

function generateFallbackPrototype(p) {
    const clientName = escapeHtml(p.client || p.companyName || 'Jouw Bedrijf');
    const service = escapeHtml(p.service || 'Website & Webshop Realisatie');
    const goals = escapeHtml(p.goals || p.projectGoals || 'Een converterende, razendsnelle online aanwezigheid op maat.');
    const design = escapeHtml(p.design || p.designPreferences || 'Modern, Dark AI met professionele typografie en vloeiende animaties.');

    return `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${clientName} - Live Staging Preview</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Inter', sans-serif; background: #0a0e1a; color: #f8fafc; line-height: 1.6; }
                .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 10; }
                .logo { font-family: 'Space Grotesk', sans-serif; font-size: 1.3rem; font-weight: 700; color: #22d3ee; text-decoration: none; }
                .nav-links { display: flex; gap: 20px; list-style: none; }
                .nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
                .hero { text-align: center; padding: 70px 20px; max-width: 900px; margin: 0 auto; }
                .hero-badge { display: inline-block; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-bottom: 20px; }
                .hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2.8rem; font-weight: 700; color: #fff; margin-bottom: 18px; line-height: 1.2; }
                .hero p { color: #94a3b8; font-size: 1.1rem; max-width: 700px; margin: 0 auto 30px auto; }
                .hero-btn { background: linear-gradient(135deg, #6366f1, #22d3ee); color: #fff; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; max-width: 1000px; margin: 40px auto 80px auto; padding: 0 20px; }
                .card { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); padding: 25px; border-radius: 12px; }
                .card h3 { font-size: 1.15rem; color: #fff; margin-bottom: 10px; }
                .card p { color: #94a3b8; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <nav class="nav">
                <a href="#" class="logo">${clientName}</a>
                <ul class="nav-links">
                    <li><a href="#">Diensten</a></li>
                    <li><a href="#">Over Ons</a></li>
                    <li><a href="#">Projecten</a></li>
                    <li><a href="#">Contact</a></li>
                </ul>
            </nav>
            <div class="hero">
                <div class="hero-badge">Concept Prototype • Creation+Alt+Fix</div>
                <h1>Welkom bij ${clientName}</h1>
                <p>${goals}</p>
                <button class="hero-btn">Ontdek Mogelijkheden</button>
            </div>
            <div class="grid">
                <div class="card">
                    <h3>🎯 Project Deliverables</h3>
                    <p>${service}</p>
                </div>
                <div class="card">
                    <h3>🎨 Design Richting</h3>
                    <p>${design}</p>
                </div>
                <div class="card">
                    <h3>⚡ Live Staging</h3>
                    <p>Plaats via het klantenportaal direct visuele feedback pinnen op elk element in deze preview.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function renderAnnotationPins(annotations) {
    const overlay = document.getElementById('annotation-overlay');
    const summaryList = document.getElementById('pins-summary-list');
    const countDisplay = document.getElementById('pins-count-display');
    const t = translations[currentLang] || translations.nl;

    const pins = Array.isArray(annotations) ? annotations : [];
    if (countDisplay) countDisplay.innerText = pins.length;

    // 1. Render glowing pin markers on the overlay
    if (overlay) {
        // Preserve popover if inside overlay
        const popover = document.getElementById('pin-popover');
        overlay.innerHTML = '';
        if (popover) overlay.appendChild(popover);

        pins.forEach((pin, idx) => {
            const pinNum = pin.pinNumber || (idx + 1);
            const pinEl = document.createElement('div');
            pinEl.className = `annotation-pin ${pin.status === 'resolved' ? 'resolved' : ''}`;
            pinEl.style.left = `${pin.xPercent}%`;
            pinEl.style.top = `${pin.yPercent}%`;
            pinEl.innerHTML = pin.status === 'resolved' ? '<i class="fas fa-check"></i>' : String(pinNum);
            pinEl.title = `Pin #${pinNum}: ${escapeHtml(pin.comment)}`;

            pinEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openExistingPinPopover(pin, pinEl);
            });

            overlay.appendChild(pinEl);
        });
    }

    // 2. Render summary list under the frame
    if (summaryList) {
        if (pins.length === 0) {
            summaryList.innerHTML = `<p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">${t.statusNoPinsYet}</p>`;
            return;
        }

        const localeStr = currentLang === 'en' ? 'en-US' : 'nl-NL';
        summaryList.innerHTML = pins.map((pin, idx) => {
            const pinNum = pin.pinNumber || (idx + 1);
            const isResolved = pin.status === 'resolved';
            const catLabel = pin.category === 'design' ? '🎨 Design' : (pin.category === 'content' ? '📄 Tekst' : (pin.category === 'bug' ? '🐛 Bug' : '⚡ Functie'));
            const dateStr = pin.createdAt ? new Date(pin.createdAt).toLocaleDateString(localeStr) : '';

            return `
                <div class="pin-summary-item ${isResolved ? 'resolved' : ''}">
                    <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                        <span class="pin-badge">${pinNum}</span>
                        <div style="overflow: hidden;">
                            <div style="font-weight: 600; color: #fff; font-size: 0.85rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                                ${escapeHtml(pin.comment)}
                            </div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">
                                ${catLabel} • ${dateStr} • <span style="color: ${isResolved ? '#34d399' : '#fbbf24'};">${isResolved ? (currentLang === 'en' ? 'Resolved' : 'Opgelost') : (currentLang === 'en' ? 'Open' : 'Openstaand')}</span>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm" data-action="delete-pin" data-id="${pin.id}" style="background: transparent; color: #f87171; border: none; padding: 4px; cursor: pointer;" title="Verwijder pin">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }).join('');

        summaryList.querySelectorAll('[data-action="delete-pin"]').forEach(btn => {
            btn.onclick = () => {
                const pinId = btn.getAttribute('data-id');
                deleteAnnotationPin(pinId);
            };
        });
    }
}

function openExistingPinPopover(pin, pinEl) {
    const popover = document.getElementById('pin-popover');
    if (!popover) return;

    popover.style.left = `calc(${pin.xPercent}% + 15px)`;
    popover.style.top = `${pin.yPercent}%`;
    popover.classList.remove('hidden');

    const catLabel = pin.category === 'design' ? '🎨 Design & Styling' : (pin.category === 'content' ? '📄 Tekst & Afbeeldingen' : (pin.category === 'bug' ? '🐛 Bug / Verbetering' : '⚡ Functionaliteit'));
    const isResolved = pin.status === 'resolved';

    popover.innerHTML = `
        <div class="popover-header">
            <span><i class="fas fa-map-pin" style="color: var(--color-accent);"></i> <strong>Feedback Pin #${pin.pinNumber || ''}</strong></span>
            <button type="button" id="btn-close-popover-existing" class="popover-close-btn">&times;</button>
        </div>
        <div class="popover-body">
            <div style="font-size: 0.75rem; color: var(--color-accent); font-weight: 700; margin-bottom: 6px;">${catLabel}</div>
            <p style="font-size: 0.88rem; color: #fff; line-height: 1.4; margin-bottom: 10px; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px;">${escapeHtml(pin.comment)}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
                <span>Status: <strong style="color: ${isResolved ? '#34d399' : '#fbbf24'};">${isResolved ? '✅ Opgelost' : '⏳ In Behandeling'}</strong></span>
                <button type="button" id="btn-del-existing-pin" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 3px 8px; font-size: 0.72rem;">Verwijder</button>
            </div>
        </div>
    `;

    document.getElementById('btn-close-popover-existing')?.addEventListener('click', () => {
        popover.classList.add('hidden');
    });

    document.getElementById('btn-del-existing-pin')?.addEventListener('click', () => {
        popover.classList.add('hidden');
        deleteAnnotationPin(pin.id);
    });
}

function setupStagingControls(data) {
    const t = translations[currentLang] || translations.nl;
    const toggleBtn = document.getElementById('btn-toggle-annotation-mode');
    const stopBtn = document.getElementById('btn-stop-annotation-mode');
    const banner = document.getElementById('annotation-mode-banner');
    const overlay = document.getElementById('annotation-overlay');
    const frameBox = document.getElementById('staging-frame-box');
    const popover = document.getElementById('pin-popover');
    const viewportContainer = document.getElementById('staging-viewport-container');
    const viewportSizeLabel = document.getElementById('mockup-viewport-size');

    // 1. Device Viewport Switcher
    document.querySelectorAll('.staging-device-btn[data-viewport]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.staging-device-btn[data-viewport]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetVp = btn.getAttribute('data-viewport');
            currentViewport = targetVp;

            if (viewportContainer) {
                viewportContainer.className = `staging-viewport-container viewport-${targetVp}`;
            }
            if (viewportSizeLabel) {
                viewportSizeLabel.innerText = targetVp === 'desktop' ? '100%' : (targetVp === 'tablet' ? '768px' : '375px');
            }
            if (popover) popover.classList.add('hidden');
        };
    });

    // 2. Reload Frame Button
    const reloadBtn = document.getElementById('btn-reload-staging-frame');
    if (reloadBtn && !reloadBtn.dataset.bound) {
        reloadBtn.dataset.bound = "true";
        reloadBtn.onclick = () => {
            const iframe = document.getElementById('staging-iframe');
            if (iframe) {
                const currentSrc = iframe.src;
                iframe.src = '';
                setTimeout(() => { iframe.src = currentSrc; }, 50);
            }
        };
    }

    // 3. Toggle Annotation Mode
    const toggleMode = (enable) => {
        isAnnotationModeActive = enable;
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', enable);
            document.getElementById('annotation-toggle-text').innerText = enable ? t.statusStopFeedbackBtn : t.statusToggleFeedbackBtn;
        }
        if (banner) banner.classList.toggle('hidden', !enable);
        if (overlay) overlay.classList.toggle('hidden', !enable);
        if (popover) popover.classList.add('hidden');
    };

    if (toggleBtn && !toggleBtn.dataset.bound) {
        toggleBtn.dataset.bound = "true";
        toggleBtn.onclick = () => toggleMode(!isAnnotationModeActive);
    }
    if (stopBtn && !stopBtn.dataset.bound) {
        stopBtn.dataset.bound = "true";
        stopBtn.onclick = () => toggleMode(false);
    }

    // 4. Click on Annotation Overlay to Drop Pin
    if (overlay && !overlay.dataset.clickBound) {
        overlay.dataset.clickBound = "true";
        overlay.onclick = (e) => {
            if (!isAnnotationModeActive) return;
            if (e.target !== overlay) return; // Don't trigger if clicked on an existing pin

            const rect = overlay.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const xPercent = Math.round((x / rect.width) * 1000) / 10;
            const yPercent = Math.round((y / rect.height) * 1000) / 10;

            currentPendingPinCoords = { xPercent, yPercent };

            // Position Popover
            if (popover) {
                // Adjust if too close to right edge
                const popoverX = xPercent > 70 ? Math.max(5, xPercent - 35) : xPercent;
                popover.style.left = `${popoverX}%`;
                popover.style.top = `${Math.min(yPercent, 65)}%`;

                // Restore default popover html
                popover.innerHTML = `
                    <div class="popover-header">
                        <span><i class="fas fa-map-pin" style="color: var(--color-accent);"></i> <strong data-translate-key="statusPinPopoverTitle">${t.statusPinPopoverTitle}</strong></span>
                        <button type="button" id="btn-close-popover" class="popover-close-btn">&times;</button>
                    </div>
                    <div class="popover-body">
                        <label for="pin-category-select" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">${t.statusPinCategoryLabel}</label>
                        <select id="pin-category-select" class="chat-category-dropdown" style="width: 100%; margin-bottom: 8px;">
                            <option value="design">${t.statusPinCatDesign}</option>
                            <option value="content">${t.statusPinCatText}</option>
                            <option value="feature">${t.statusPinCatFeature}</option>
                            <option value="bug">${t.statusPinCatBug}</option>
                        </select>
                        <textarea id="pin-comment-input" rows="3" class="chat-textarea" placeholder="${t.statusPinPlaceholder}" style="margin-bottom: 10px; font-size: 0.85rem;"></textarea>
                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button type="button" id="btn-cancel-pin" class="btn-logout" style="padding: 6px 12px; font-size: 0.8rem;">${t.statusPinCancelBtn}</button>
                            <button type="button" id="btn-submit-pin" class="btn-akkoord" style="width: auto; padding: 6px 16px; font-size: 0.82rem;">${t.statusPinSubmitBtn}</button>
                        </div>
                    </div>
                `;

                popover.classList.remove('hidden');
                document.getElementById('pin-comment-input')?.focus();

                document.getElementById('btn-close-popover').onclick = () => popover.classList.add('hidden');
                document.getElementById('btn-cancel-pin').onclick = () => popover.classList.add('hidden');
                document.getElementById('btn-submit-pin').onclick = submitNewPin;
            }
        };
    }
}

async function submitNewPin() {
    const t = translations[currentLang] || translations.nl;
    const catSelect = document.getElementById('pin-category-select');
    const commentInput = document.getElementById('pin-comment-input');
    const popover = document.getElementById('pin-popover');
    const submitBtn = document.getElementById('btn-submit-pin');

    if (!commentInput || !currentPendingPinCoords || !currentProjectDocId) return;
    const comment = commentInput.value.trim();
    if (!comment) return alert(t.statusPinPlaceholder);

    const category = catSelect ? catSelect.value : 'design';

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
        const existingAnnotations = (activeProject && activeProject.data.annotations && Array.isArray(activeProject.data.annotations)) 
            ? [...activeProject.data.annotations] 
            : [];
        
        const existingMessages = (activeProject && activeProject.data.messages && Array.isArray(activeProject.data.messages)) 
            ? [...activeProject.data.messages] 
            : [];

        const nextPinNumber = existingAnnotations.length + 1;
        const authorName = (activeProject && (activeProject.data.contactName || activeProject.data.client)) || 'Klant';

        const newPin = {
            id: 'pin_' + Date.now(),
            pinNumber: nextPinNumber,
            xPercent: currentPendingPinCoords.xPercent,
            yPercent: currentPendingPinCoords.yPercent,
            device: currentViewport,
            category: category,
            comment: comment,
            createdAt: new Date().toISOString(),
            status: 'open',
            author: authorName
        };

        existingAnnotations.push(newPin);

        // Also sync automatically as a revision ticket in the In-App Chat
        const newMsg = {
            id: 'msg_pin_' + Date.now(),
            sender: 'client',
            senderName: authorName,
            senderEmail: auth?.currentUser?.email || '',
            category: 'revision',
            message: `[Visuele Pin #${nextPinNumber} - ${category.toUpperCase()}]: ${comment}`,
            createdAt: new Date().toISOString(),
            status: 'open',
            readByAdmin: false,
            readByClient: true
        };
        existingMessages.push(newMsg);

        if (db) {
            await updateDoc(doc(db, "projects", currentProjectDocId), {
                annotations: existingAnnotations,
                messages: existingMessages
            });
        }

        if (activeProject) {
            activeProject.data.annotations = existingAnnotations;
            activeProject.data.messages = existingMessages;
        }

        if (popover) popover.classList.add('hidden');
        renderAnnotationPins(existingAnnotations);
        renderMessagesSection(activeProject ? activeProject.data : { messages: existingMessages });

        alert(t.statusPinPlacedSuccess);

    } catch (err) {
        console.error("Fout bij opslaan pin:", err);
        alert("Fout bij opslaan pin: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = t.statusPinSubmitBtn;
    }
}

async function deleteAnnotationPin(pinId) {
    if (!confirm("Weet je zeker dat je deze feedback pin wilt verwijderen?")) return;

    try {
        const activeProject = clientProjectsList.find(p => p.id === currentProjectDocId);
        if (!activeProject || !currentProjectDocId) return;

        const updatedAnnotations = (activeProject.data.annotations || []).filter(p => p.id !== pinId);
        activeProject.data.annotations = updatedAnnotations;

        if (db) {
            await updateDoc(doc(db, "projects", currentProjectDocId), {
                annotations: updatedAnnotations
            });
        }

        renderAnnotationPins(updatedAnnotations);

    } catch (err) {
        console.error("Fout bij verwijderen pin:", err);
    }
}

