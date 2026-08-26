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
        statusAgreeNotice: "Door te klikken ga je digitaal akkoord met de voorgestelde scope en prijsopgave.",
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
        statusDesignPrepHelp: "Zodra het ontwerp/wireframe klaar is, verschijnt hier een preview en kun je het met één klik goedkeuren."
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
        statusAgreeNotice: "By clicking, you digitally agree to the proposed scope and quotation.",
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
        statusDesignPrepHelp: "As soon as wireframes/designs are ready, a preview will appear here for instant approval."
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

        const priceVal = data.proposalPrice || (currentLang === 'en' ? "Custom quotation" : "In overleg");
        priceEl.innerText = priceVal.startsWith("€") ? priceVal : `€ ${priceVal}`;
        
        scopeEl.innerText = data.proposalScope || `${currentLang === 'en' ? 'Based on your submitted intake, we will deliver the following scope:' : 'Op basis van de door jou ingevulde intake gaan we de volgende scope realiseren:'}\n\n${data.goals || data.projectGoals || (currentLang === 'en' ? 'Complete software & website realization as discussed.' : 'Volledige software & website realisatie zoals besproken.')}`;

        successMsg.classList.add('hidden');
        actionContainer.classList.remove('hidden');
        actionContainer.innerHTML = `
            <button id="btn-akkoord" class="btn-akkoord">
                <i class="fas fa-signature"></i> ${t.statusAgreeBtn}
            </button>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                <i class="fas fa-shield-alt"></i> ${t.statusAgreeNotice}
            </p>
        `;

        setupAgreeButton();
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

function setupAgreeButton() {
    const btn = document.getElementById('btn-akkoord');
    if (!btn) return;

    btn.onclick = async () => {
        const t = translations[currentLang] || translations.nl;
        if (!currentProjectDocId) {
            alert(t.statusAgreeErrorAlert);
            return;
        }

        const priceText = document.getElementById('offerte-price')?.innerText || '';
        if (!confirm(`${t.statusAgreeConfirm} (${priceText})?`)) return;

        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.statusAgreeSigning}`;
        btn.disabled = true;

        try {
            const projectRef = doc(db, "projects", currentProjectDocId);
            const nowIso = new Date().toISOString();

            const activeProjectObj = clientProjectsList.find(p => p.id === currentProjectDocId);
            const projData = activeProjectObj ? { ...activeProjectObj.data } : {};
            projData.proposalAcceptedAt = nowIso;
            projData.id = currentProjectDocId;

            // 1. Generate Signed Proposal PDF
            let pdfDownloadUrl = null;
            let pdfFileName = null;
            try {
                const { doc: pdfDoc, blob: pdfBlob, filename } = await generateProposalPDF(projData, true);
                pdfFileName = filename;

                // 2. Upload to Firebase Storage
                if (storage) {
                    const uploadRes = await uploadPdfToStorage(storage, pdfBlob, currentProjectDocId, filename);
                    if (uploadRes) {
                        pdfDownloadUrl = uploadRes.downloadUrl;
                    }
                }

                pdfDoc.save(filename);
            } catch (pdfErr) {
                console.warn("PDF generatie / upload waarschuwing:", pdfErr);
            }

            const updatePayload = {
                status: "Wacht op Design & Ontwerp",
                statusClass: "active",
                proposalAcceptedAt: nowIso
            };
            if (pdfDownloadUrl) {
                updatePayload.proposalPdfUrl = pdfDownloadUrl;
                updatePayload.proposalPdfName = pdfFileName;
            }

            await updateDoc(projectRef, updatePayload);

            if (activeProjectObj) {
                activeProjectObj.data.status = "Wacht op Design & Ontwerp";
                activeProjectObj.data.proposalAcceptedAt = nowIso;
                if (pdfDownloadUrl) activeProjectObj.data.proposalPdfUrl = pdfDownloadUrl;
            }

            // Update UI direct naar State C (Geaccepteerd)
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
            console.error("Fout bij digitaal akkoord:", error);
            alert(t.statusAgreeErrorAlert);
            btn.innerHTML = `<i class="fas fa-signature"></i> ${t.statusAgreeBtn}`;
            btn.disabled = false;
        }
    };
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
        designPreview.classList.remove('hidden');
        designPreview.innerHTML = `
            <a href="${previewUrl}" target="_blank" class="design-preview-link">
                <i class="fas fa-external-link-alt"></i> ${t.statusDesignViewLink}
            </a>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px;">
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
                <a href="mailto:info@creationaltfix.nl?subject=Feedback%20Design%20Project" class="btn-akkoord" style="flex: 1; min-width: 200px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); text-align: center; text-decoration: none;">
                    <i class="fas fa-comment-dots"></i> ${t.statusDesignFeedbackBtn}
                </a>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
                <i class="fas fa-shield-alt"></i> ${t.statusDesignAgreeHelp}
            </p>
        `;

        setupDesignAcceptButton();

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
