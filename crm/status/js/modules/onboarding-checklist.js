/**
 * @file crm/status/js/modules/onboarding-checklist.js
 * Interactieve Klant Onboarding & Oplever-Checklist Module (TASK-910).
 * Helpt klanten exact te weten welke input (logo, verhuiscode, teksten, reviews) nodig is
 * om het project soepel en razendsnel naar de livegang te loodsen.
 * 
 * Creation+Alt+Fix (2026/2027)
 */

import { escapeHtml } from "../../../js/firebase-config.js";

/**
 * Standaard onboarding taakdefinities
 */
export const ONBOARDING_TASK_DEFS = [
    {
        id: 'profile',
        icon: 'fas fa-id-card',
        phase: 1,
        defaultOrder: 1,
        titleKey: 'onboardingTaskProfileTitle',
        descKey: 'onboardingTaskProfileDesc',
        defaultTitleNl: 'Bedrijfs- & Factuurgegevens controleren',
        defaultTitleEn: 'Verify company & billing details',
        defaultDescNl: 'Controleer je KvK, btw-nummer en factuuradres zodat facturen en contracten juridisch direct kloppen.',
        defaultDescEn: 'Verify your Chamber of Commerce (KvK), VAT ID, and address for compliant invoicing and records.',
        actionType: 'modal',
        actionTarget: 'client-profile-modal',
        actionLabelNl: 'Gegevens Inzien / Aanvullen',
        actionLabelEn: 'View / Edit Details'
    },
    {
        id: 'proposal',
        icon: 'fas fa-file-signature',
        phase: 2,
        defaultOrder: 2,
        titleKey: 'onboardingTaskProposalTitle',
        descKey: 'onboardingTaskProposalDesc',
        defaultTitleNl: 'Offerte & Projectscope digitaal accorderen',
        defaultTitleEn: 'Digitally approve proposal & scope',
        defaultDescNl: 'Bekijk de deliverables en investeringsbegroting, en geef digitaal akkoord om de ontwikkelfase te starten.',
        defaultDescEn: 'Review deliverables and budget, then provide 1-click digital sign-off to start development.',
        actionType: 'scroll',
        actionTarget: 'offerte-card',
        actionLabelNl: 'Offerte Bekijken & Tekenen',
        actionLabelEn: 'View & Sign Proposal'
    },
    {
        id: 'logo',
        icon: 'fas fa-palette',
        phase: 1,
        defaultOrder: 3,
        titleKey: 'onboardingTaskLogoTitle',
        descKey: 'onboardingTaskLogoDesc',
        defaultTitleNl: 'Bedrijfslogo & Huisstijl aanleveren',
        defaultTitleEn: 'Provide company logo & branding',
        defaultDescNl: 'Upload je logo (vector SVG/PNG/PDF) of geef aan dat Creation+Alt+Fix een passend modern beeldmerk mag ontwerpen.',
        defaultDescEn: 'Upload your vector logo (SVG/PNG/PDF) or have Creation+Alt+Fix design a bespoke brand mark.',
        actionType: 'upload',
        actionTarget: 'files-card',
        actionLabelNl: 'Logo Uploaden',
        actionLabelEn: 'Upload Logo'
    },
    {
        id: 'domain',
        icon: 'fas fa-globe',
        phase: 2,
        defaultOrder: 4,
        titleKey: 'onboardingTaskDomainTitle',
        descKey: 'onboardingTaskDomainDesc',
        defaultTitleNl: 'Domeinnaam & EPP Verhuiscode instellen',
        defaultTitleEn: 'Domain name & EPP transfer code',
        defaultDescNl: 'Voer je EPP-verhuiscode in voor een bestaand domein, of geef akkoord voor nieuwe domeinregistratie door ons.',
        defaultDescEn: 'Enter your EPP authorization transfer code for existing domains, or request new registration by us.',
        actionType: 'custom_epp',
        actionTarget: 'domain-token-form',
        actionLabelNl: 'Verhuiscode Doorgeven',
        actionLabelEn: 'Submit Transfer Token'
    },
    {
        id: 'content',
        icon: 'fas fa-file-lines',
        phase: 2,
        defaultOrder: 5,
        titleKey: 'onboardingTaskContentTitle',
        descKey: 'onboardingTaskContentDesc',
        defaultTitleNl: 'Gewenste teksten, foto\'s of diensten aanleveren',
        defaultTitleEn: 'Provide texts, photos or services',
        defaultDescNl: 'Upload bestaande teksten, brochures of fotomateriaal. Wij herschrijven het naar converterende Dark AI copy.',
        defaultDescEn: 'Upload existing texts, brochures, or photos. We optimize and format them into sharp, high-converting copy.',
        actionType: 'scroll',
        actionTarget: 'files-card',
        actionLabelNl: 'Bestanden Uploaden',
        actionLabelEn: 'Upload Content Files'
    },
    {
        id: 'design',
        icon: 'fas fa-desktop',
        phase: 3,
        defaultOrder: 6,
        titleKey: 'onboardingTaskDesignTitle',
        descKey: 'onboardingTaskDesignDesc',
        defaultTitleNl: 'Design concept & Staging prototype reviewen',
        defaultTitleEn: 'Review design concept & staging prototype',
        defaultDescNl: 'Bekijk het live prototype in verschillende schermen (mobiel/tablet/desktop) en plaats eventuele revisie-pins.',
        defaultDescEn: 'Review the live staging prototype on mobile, tablet, and desktop viewports and pin visual feedback.',
        actionType: 'scroll',
        actionTarget: 'staging-card',
        actionLabelNl: 'Open Live Preview',
        actionLabelEn: 'Open Live Staging'
    },
    {
        id: 'delivery',
        icon: 'fas fa-rocket',
        phase: 5,
        defaultOrder: 7,
        titleKey: 'onboardingTaskDeliveryTitle',
        descKey: 'onboardingTaskDeliveryDesc',
        defaultTitleNl: 'Eindcontrole & Vrijgave voor Livegang',
        defaultTitleEn: 'Final quality check & launch sign-off',
        defaultDescNl: 'Definitieve checklist van formulieren, DNS-cutover, SSL-certificaat en Google indexering voor officiële lancering.',
        defaultDescEn: 'Final quality check of forms, DNS cutover, SSL certificate, and Google indexing for go-live launch.',
        actionType: 'scroll',
        actionTarget: 'card-20-points-quality',
        actionLabelNl: 'Kwaliteitscontrole Bekijken',
        actionLabelEn: 'View Quality Checklist'
    }
];

/**
 * Veilig opschonen van EPP verhuiscode token
 * @param {string} token
 * @returns {string}
 */
export function sanitizeDomainToken(token) {
    if (!token || typeof token !== 'string') return '';
    return token.replace(/[\r\n\t\x00-\x1F\x7F]/g, '').trim().slice(0, 100);
}

/**
 * Bepaal de dynamische fase van een project
 * @param {Object} project
 * @returns {number} 1 t/m 5
 */
export function getProjectPhaseNumber(project = {}) {
    const status = String(project.status || '').toLowerCase();
    const statusClass = String(project.statusClass || '').toLowerCase();

    if (status.includes('intake') || status.includes('aanvraag') || statusClass === 'lead') return 1;
    if (status.includes('offerte') || status.includes('akkoord') || status.includes('voorstel')) return 2;
    if (status.includes('design') || status.includes('ontwerp') || status.includes('wireframe')) return 3;
    if (status.includes('ontwikkeling') || status.includes('bouwen') || status.includes('testen')) return 4;
    if (status.includes('live') || status.includes('opgeleverd') || status.includes('afgerond') || statusClass === 'done') return 5;
    return 2;
}

/**
 * Evalueert een specifieke onboarding taak tegen de actuele projectstatus en Firestore data
 * @param {Object} taskDef
 * @param {Object} projectData
 * @returns {Object} Geëvalueerde taak met status, badges en context
 */
export function resolveTask(taskDef, projectData = {}) {
    const currentPhase = getProjectPhaseNumber(projectData);
    const ob = projectData.onboarding || {};
    const taskState = (ob.tasks && ob.tasks[taskDef.id]) ? ob.tasks[taskDef.id] : {};
    const completedList = Array.isArray(ob.completedTaskIds) ? ob.completedTaskIds : [];

    let isCompleted = completedList.includes(taskDef.id) || Boolean(taskState.completed);
    let isActionRequired = false;
    let isUpcoming = false;
    let note = taskState.note || '';
    let customValue = taskState.value || '';

    switch (taskDef.id) {
        case 'profile': {
            // Auto-detectie: bedrijf, email en kvk/adres ingevuld
            const hasCompany = Boolean(projectData.companyName || projectData.client);
            const hasEmail = Boolean(projectData.email);
            const hasAddressOrKvk = Boolean(projectData.kvkNumber || projectData.kvk || projectData.factuurAdres || projectData.address || projectData.streetAndNumber || projectData.postalCode);
            
            if (isCompleted || (hasCompany && hasEmail && hasAddressOrKvk)) {
                isCompleted = true;
                note = note || 'Bedrijfs- en facturatiegegevens zijn geverifieerd';
            } else {
                isActionRequired = true;
                note = 'Vul je adres- en KvK-gegevens aan voor officiële documenten';
            }
            break;
        }

        case 'proposal': {
            // Auto-detectie: proposal geaccepteerd of status voorbij Fase 2
            const isAccepted = Boolean(projectData.proposalAccepted || projectData.proposalAcceptedAt || projectData.proposalSignedBy);
            const isPastPhase2 = currentPhase >= 3;
            const isRefusedOrWaiting = String(projectData.status || '').toLowerCase().includes('offerte verzonden') || String(projectData.status || '').toLowerCase().includes('wacht op akkoord');

            if (isCompleted || isAccepted || (isPastPhase2 && !isRefusedOrWaiting)) {
                isCompleted = true;
                note = note || (projectData.proposalAcceptedAt ? `Geaccordeerd op ${new Date(projectData.proposalAcceptedAt).toLocaleDateString('nl-NL')}` : 'Offerte digitaal geaccordeerd');
            } else {
                isActionRequired = true;
                note = 'Offerte staat klaar voor digitaal akkoord';
            }
            break;
        }

        case 'logo': {
            // Auto-detectie: bestanden met logo/afbeeldingen geüpload OF toggle 'geen logo nodig'
            const hasLogoInFiles = Array.isArray(projectData.files) && projectData.files.some(f => {
                const name = (typeof f === 'string' ? f : (f.name || f.url || '')).toLowerCase();
                return (name.includes('logo') || name.includes('huisstijl') || name.includes('brand') || name.includes('icon'))
                    && name.match(/\.(png|jpe?g|svg|webp|ai|eps|pdf)$/);
            });
            const noLogoNeeded = Boolean(taskState.noLogoNeeded || ob.noLogoNeeded);

            if (isCompleted || hasLogoInFiles) {
                isCompleted = true;
                note = note || 'Logo & beeldmateriaal succesvol ontvangen';
            } else if (noLogoNeeded) {
                isCompleted = true;
                note = 'Creation+Alt+Fix ontwerpt een passend vector-beeldmerk';
            } else {
                isActionRequired = true;
                note = 'Lever je logo aan of laat Creation+Alt+Fix er een ontwerpen';
            }
            break;
        }

        case 'domain': {
            // Auto-detectie: EPP code aanwezig of nieuw domein geregistreerd
            const savedToken = sanitizeDomainToken(ob.domainToken || projectData.domainTransferToken || projectData.eppCode || taskState.eppToken);
            const isNewRegistration = Boolean(taskState.isNewRegistration || ob.isNewRegistration);
            const isAlreadyLive = currentPhase === 5 && Boolean(projectData.domain || projectData.domainName);

            if (savedToken) {
                isCompleted = true;
                customValue = savedToken;
                note = `EPP verhuiscode opgeslagen: ${savedToken.slice(0, 3)}••••••••`;
            } else if (isNewRegistration) {
                isCompleted = true;
                note = 'Nieuw domein wordt direct geregistreerd door Creation+Alt+Fix';
            } else if (isAlreadyLive) {
                isCompleted = true;
                note = `Domein live gekoppeld: ${projectData.domain || projectData.domainName}`;
            } else if (isCompleted) {
                note = note || 'Domeininstellingen voltooid';
            } else {
                isActionRequired = true;
                note = 'EPP-verhuiscode nodig voor overdracht of autorisatie';
            }
            break;
        }

        case 'content': {
            // Auto-detectie: meervoudige bestanden geüpload of specifieke contentnotities
            const filesCount = Array.isArray(projectData.files) ? projectData.files.length : 0;
            const hasContentNotes = Boolean(ob.contentNotes || taskState.contentNotes);

            if (isCompleted || hasContentNotes || filesCount >= 2) {
                isCompleted = true;
                note = note || (filesCount > 0 ? `${filesCount} projectbestanden aangeleverd` : 'Teksten & pagina-opzet ontvangen');
            } else {
                isActionRequired = true;
                note = 'Lever teksten of gewenste paginastructuur aan';
            }
            break;
        }

        case 'design': {
            if (currentPhase < 3) {
                isUpcoming = true;
                note = 'Wordt geactiveerd in Fase 3 (Design & Ontwerp)';
            } else {
                const isDesignApproved = Boolean(projectData.designAccepted || projectData.designAcceptedAt || taskState.designApproved);
                if (isCompleted || isDesignApproved || currentPhase >= 4) {
                    isCompleted = true;
                    note = note || 'Designconcept is beoordeeld en goedgekeurd';
                } else {
                    isActionRequired = true;
                    note = 'Interactief staging concept gereed voor jouw feedback';
                }
            }
            break;
        }

        case 'delivery': {
            if (currentPhase < 4) {
                isUpcoming = true;
                note = 'Wordt geactiveerd bij afronding van de bouw (Fase 5)';
            } else if (currentPhase === 5 || isCompleted || taskState.delivered) {
                isCompleted = true;
                note = note || 'Project is officieel live en overgedragen';
            } else {
                isActionRequired = true;
                note = 'Eindcontrole uitvoeren en definitieve livegang fiatteren';
            }
            break;
        }
    }

    let status = 'pending';
    if (isCompleted) status = 'completed';
    else if (isUpcoming) status = 'upcoming';
    else if (isActionRequired) status = 'action_required';

    return {
        ...taskDef,
        status,
        isCompleted,
        isActionRequired,
        isUpcoming,
        note,
        customValue
    };
}

/**
 * Berekent de totale onboarding voortgang over alle taken
 * @param {Object} projectData
 * @returns {Object} Voortgangsstatistieken
 */
export function calculateOnboardingProgress(projectData = {}) {
    const tasks = ONBOARDING_TASK_DEFS.map(def => resolveTask(def, projectData));
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const actionRequired = tasks.filter(t => t.isActionRequired).length;
    const upcoming = tasks.filter(t => t.isUpcoming).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isAllDone = completed === total;

    return {
        total,
        completed,
        actionRequired,
        upcoming,
        percent,
        isAllDone,
        tasks
    };
}

/**
 * Genereert de complete HTML voor de onboarding & oplever-checklist kaart
 * @param {Object} projectData
 * @param {string} lang 'nl' | 'en'
 * @returns {string} Schone HTML string
 */
export function renderOnboardingChecklistHtml(projectData = {}, lang = 'nl') {
    const isEn = lang === 'en';
    const progress = calculateOnboardingProgress(projectData);

    const title = isEn ? "Interactive Client Onboarding & Delivery Checklist" : "Interactieve Klant Onboarding & Oplever-Checklist";
    const subtitle = isEn 
        ? "Complete these straightforward steps to get your website launched rapidly and impeccably." 
        : "Voltooi deze overzichtelijke actiepunten om je website razendsnel en zorgeloos live te laten gaan.";

    const statusBadgeText = progress.isAllDone 
        ? (isEn ? "🟢 100% Ready for Go-Live!" : "🟢 100% Gereed voor Livegang!")
        : (progress.actionRequired > 0 
            ? (isEn ? `🟡 ${progress.actionRequired} Actions Required` : `🟡 ${progress.actionRequired} Actiepunten vereist`)
            : (isEn ? "⏳ In Progress" : "⏳ In Behandeling"));

    const progressSummaryText = isEn
        ? `${progress.completed} of ${progress.total} tasks completed (${progress.percent}%)`
        : `${progress.completed} van de ${progress.total} taken voltooid (${progress.percent}%)`;

    // Render task items
    const taskItemsHtml = progress.tasks.map((task, index) => {
        const itemNumber = index + 1;
        const taskTitle = isEn ? task.defaultTitleEn : task.defaultTitleNl;
        const taskDesc = isEn ? task.defaultDescEn : task.defaultDescNl;
        const actionBtnLabel = isEn ? task.actionLabelEn : task.actionLabelNl;

        let badgeClass = 'badge-pending';
        let badgeText = isEn ? 'In progress' : 'In afwachting';
        let iconHtml = `<span class="onboarding-step-num">${itemNumber}</span>`;

        if (task.isCompleted) {
            badgeClass = 'badge-completed';
            badgeText = isEn ? 'Completed' : 'Voltooid';
            iconHtml = '<i class="fas fa-check-circle" style="color: #34d399; font-size: 1.35rem;"></i>';
        } else if (task.isActionRequired) {
            badgeClass = 'badge-action';
            badgeText = isEn ? 'Action required' : 'Actie vereist';
            iconHtml = '<span class="onboarding-pulse-dot action"></span>';
        } else if (task.isUpcoming) {
            badgeClass = 'badge-upcoming';
            badgeText = isEn ? 'Upcoming stage' : 'Binnenkort';
            iconHtml = `<span class="onboarding-step-num disabled">${itemNumber}</span>`;
        }

        // Action controls per task type
        let actionControlsHtml = '';
        if (task.id === 'domain') {
            actionControlsHtml = `
                <div class="onboarding-domain-box" style="margin-top: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 8px;">
                    <label style="display: block; font-size: 0.78rem; color: #94a3b8; margin-bottom: 6px;">
                        ${isEn ? 'EPP Authorization / Transfer Token:' : 'EPP-verhuiscode van je huidige registrar:'}
                    </label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <input type="text" id="input-onboarding-epp" class="onboarding-inline-input" placeholder="${isEn ? 'E.g. EPP-993812-NL' : 'Bijv. ABC123XYZ'}" value="${escapeHtml(task.customValue || '')}" style="flex: 1; min-width: 180px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 7px 12px; color: #fff; font-size: 0.85rem;" />
                        <button type="button" id="btn-save-onboarding-epp" class="btn btn-sm" style="background: linear-gradient(135deg, #22d3ee, #0284c7); color: #000; font-weight: 700; border: none; padding: 7px 16px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-save"></i> ${isEn ? 'Save Code' : 'Code Opslaan'}
                        </button>
                        <button type="button" id="btn-toggle-new-domain" class="btn btn-sm" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 7px 12px; border-radius: 6px; cursor: pointer;" title="${isEn ? 'Click if you want Creation+Alt+Fix to register a new domain for you' : 'Klik als Creation+Alt+Fix een nieuw domein voor je mag registreren'}">
                            <i class="fas fa-plus-circle text-accent"></i> ${isEn ? 'New Domain Registration' : 'Nieuw Domein Registreren'}
                        </button>
                        <button type="button" id="btn-open-domain-wizard" class="btn btn-sm" style="background: rgba(0, 242, 254, 0.12); border: 1px solid rgba(0, 242, 254, 0.35); color: #00f2fe; padding: 7px 12px; border-radius: 6px; cursor: pointer;" title="${isEn ? 'Open Domain & Email Setup Wizard' : 'Open Domein & E-mail Setup Wizard'}">
                            <i class="fas fa-sliders-h"></i> ${isEn ? 'Domain Wizard' : 'Domein Wizard'}
                        </button>
                    </div>
                    <div id="onboarding-epp-feedback" style="margin-top: 6px; font-size: 0.78rem; display: none;"></div>
                </div>
            `;
        } else if (task.id === 'logo') {
            actionControlsHtml = `
                <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn btn-sm btn-onboarding-action" data-action="upload-logo" style="background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-cloud-upload-alt"></i> ${isEn ? 'Upload Logo File' : 'Logo Bestand Uploaden'}
                    </button>
                    <button type="button" id="btn-toggle-caf-logo" class="btn btn-sm" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: #94a3b8; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-wand-magic-sparkles text-accent"></i> ${isEn ? 'Creation+Alt+Fix may design logo' : 'Creation+Alt+Fix ontwerpt beeldmerk'}
                    </button>
                </div>
            `;
        } else {
            actionControlsHtml = `
                <div style="margin-top: 8px;">
                    <button type="button" class="btn btn-sm btn-onboarding-action" data-action="${escapeHtml(task.actionType)}" data-target="${escapeHtml(task.actionTarget)}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: #f1f5f9; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; transition: all 0.2s;">
                        <i class="${escapeHtml(task.icon)} text-accent"></i> ${escapeHtml(actionBtnLabel)}
                    </button>
                </div>
            `;
        }

        return `
            <div class="onboarding-task-item ${task.status}" data-task-id="${escapeHtml(task.id)}" style="display: flex; gap: 14px; padding: 14px 16px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid ${task.isCompleted ? 'rgba(52, 211, 153, 0.25)' : (task.isActionRequired ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255,255,255,0.07)')}; transition: all 0.25s ease;">
                <div class="onboarding-task-icon-col" style="display: flex; align-items: flex-start; justify-content: center; width: 32px; flex-shrink: 0; padding-top: 2px;">
                    ${iconHtml}
                </div>
                <div class="onboarding-task-content-col" style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 4px;">
                        <h4 style="margin: 0; font-size: 0.95rem; color: #fff; font-weight: 600;">
                            ${escapeHtml(taskTitle)}
                        </h4>
                        <span class="onboarding-task-badge ${badgeClass}" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; font-weight: 700; ${task.isCompleted ? 'background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3);' : (task.isActionRequired ? 'background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4);' : 'background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);')}">
                            ${escapeHtml(badgeText)}
                        </span>
                    </div>
                    <p style="margin: 0 0 6px 0; font-size: 0.83rem; color: #94a3b8; line-height: 1.5;">
                        ${escapeHtml(taskDesc)}
                    </p>
                    ${task.note ? `<div style="font-size: 0.78rem; color: ${task.isCompleted ? '#34d399' : (task.isActionRequired ? '#fbbf24' : '#64748b')}; display: flex; align-items: center; gap: 5px; margin-bottom: 6px;"><i class="${task.isCompleted ? 'fas fa-check' : 'fas fa-info-circle'}"></i> <span>${escapeHtml(task.note)}</span></div>` : ''}
                    ${actionControlsHtml}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="onboarding-card-wrapper" style="position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                <div>
                    <h2 class="section-title" style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-list-check text-accent"></i> <span>${escapeHtml(title)}</span>
                    </h2>
                    <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">
                        ${escapeHtml(subtitle)}
                    </p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); color: #38bdf8;">
                        ${escapeHtml(statusBadgeText)}
                    </span>
                </div>
            </div>

            <!-- Progress Meter -->
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); padding: 14px 16px; border-radius: 10px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; margin-bottom: 8px;">
                    <span style="color: #cbd5e1; font-weight: 600;">${escapeHtml(progressSummaryText)}</span>
                    <strong style="color: var(--color-accent);">${progress.percent}%</strong>
                </div>
                <div style="height: 8px; width: 100%; background: rgba(255,255,255,0.06); border-radius: 9999px; overflow: hidden;">
                    <div style="height: 100%; width: ${progress.percent}%; background: linear-gradient(135deg, #6366f1, #22d3ee); border-radius: 9999px; transition: width 0.4s ease;"></div>
                </div>
            </div>

            <!-- Task Items Container -->
            <div class="onboarding-tasks-container" style="display: flex; flex-direction: column; gap: 12px;">
                ${taskItemsHtml}
            </div>
        </div>
    `;
}

/**
 * Initialiseert de onboarding checklist interacties in het status portaal
 * @param {Object} options
 * @param {string} options.containerId ID van de parent sectie (bijv. 'onboarding-checklist-card')
 * @param {Object} options.projectData Het actieve project document
 * @param {Function} options.onUpdateProject Callback voor Firestore updates (payload) => Promise<void>
 * @param {string} options.lang 'nl' | 'en'
 */
export function initOnboardingChecklist({ containerId = 'onboarding-checklist-card', projectData = {}, onUpdateProject, lang = 'nl' }) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Render HTML in container
    container.innerHTML = renderOnboardingChecklistHtml(projectData, lang);

    // Bind EPP Code Save Listener
    const saveEppBtn = container.querySelector('#btn-save-onboarding-epp');
    const eppInput = container.querySelector('#input-onboarding-epp');
    const eppFeedback = container.querySelector('#onboarding-epp-feedback');

    if (saveEppBtn && eppInput) {
        saveEppBtn.addEventListener('click', async () => {
            const cleanToken = sanitizeDomainToken(eppInput.value);
            if (!cleanToken) {
                if (eppFeedback) {
                    eppFeedback.style.display = 'block';
                    eppFeedback.style.color = '#f87171';
                    eppFeedback.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${lang === 'en' ? 'Please enter a valid transfer token.' : 'Vul een geldige verhuiscode in.'}`;
                }
                return;
            }

            saveEppBtn.disabled = true;
            saveEppBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${lang === 'en' ? 'Saving...' : 'Opslaan...'}`;

            try {
                const currentOb = projectData.onboarding || {};
                const currentTasks = currentOb.tasks || {};
                const completedList = Array.isArray(currentOb.completedTaskIds) ? [...currentOb.completedTaskIds] : [];
                if (!completedList.includes('domain')) completedList.push('domain');

                const updatedPayload = {
                    domainTransferToken: cleanToken,
                    eppCode: cleanToken,
                    onboarding: {
                        ...currentOb,
                        domainToken: cleanToken,
                        completedTaskIds: completedList,
                        tasks: {
                            ...currentTasks,
                            domain: {
                                completed: true,
                                completedAt: new Date().toISOString(),
                                eppToken: cleanToken,
                                note: `Verhuiscode opgeslagen: ${cleanToken.slice(0, 3)}••••••••`
                            }
                        },
                        lastUpdated: new Date().toISOString()
                    }
                };

                if (typeof onUpdateProject === 'function') {
                    await onUpdateProject(updatedPayload);
                }

                if (eppFeedback) {
                    eppFeedback.style.display = 'block';
                    eppFeedback.style.color = '#34d399';
                    eppFeedback.innerHTML = `<i class="fas fa-check-circle"></i> ${lang === 'en' ? 'Transfer token saved successfully!' : 'Verhuiscode succesvol opgeslagen!'}`;
                }
            } catch (err) {
                console.error("Fout bij opslaan EPP verhuiscode:", err);
                if (eppFeedback) {
                    eppFeedback.style.display = 'block';
                    eppFeedback.style.color = '#f87171';
                    eppFeedback.innerHTML = `<i class="fas fa-times-circle"></i> ${lang === 'en' ? 'Could not save token. Please try again.' : 'Fout bij opslaan. Probeer opnieuw.'}`;
                }
            } finally {
                saveEppBtn.disabled = false;
                saveEppBtn.innerHTML = `<i class="fas fa-save"></i> ${lang === 'en' ? 'Save Code' : 'Code Opslaan'}`;
            }
        });
    }

    // Bind Toggle Nieuw Domein Registratie
    const toggleNewDomainBtn = container.querySelector('#btn-toggle-new-domain');
    if (toggleNewDomainBtn) {
        toggleNewDomainBtn.addEventListener('click', async () => {
            const confirmMsg = lang === 'en' 
                ? "Would you like Creation+Alt+Fix to register and manage a fresh domain for you?" 
                : "Wil je dat Creation+Alt+Fix een gloednieuwe domeinnaam voor je registreert en beheert?";
            if (!confirm(confirmMsg)) return;

            try {
                const currentOb = projectData.onboarding || {};
                const currentTasks = currentOb.tasks || {};
                const completedList = Array.isArray(currentOb.completedTaskIds) ? [...currentOb.completedTaskIds] : [];
                if (!completedList.includes('domain')) completedList.push('domain');

                const updatedPayload = {
                    onboarding: {
                        ...currentOb,
                        isNewRegistration: true,
                        completedTaskIds: completedList,
                        tasks: {
                            ...currentTasks,
                            domain: {
                                completed: true,
                                isNewRegistration: true,
                                completedAt: new Date().toISOString(),
                                note: 'Nieuw domein wordt geregistreerd door Creation+Alt+Fix'
                            }
                        },
                        lastUpdated: new Date().toISOString()
                    }
                };

                if (typeof onUpdateProject === 'function') {
                    await onUpdateProject(updatedPayload);
                }
            } catch (err) {
                console.error("Fout bij registreren nieuw domein verzoek:", err);
            }
        });
    }

    // Bind Open Domain & Email Setup Wizard (TASK-911)
    const openWizardBtn = container.querySelector('#btn-open-domain-wizard');
    if (openWizardBtn) {
        openWizardBtn.addEventListener('click', () => {
            const wizardCard = document.getElementById('domain-setup-wizard-card');
            if (wizardCard) {
                wizardCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                wizardCard.style.boxShadow = '0 0 25px rgba(0, 242, 254, 0.4)';
                setTimeout(() => {
                    wizardCard.style.boxShadow = '0 10px 32px rgba(0, 0, 0, 0.35)';
                }, 2500);
            }
        });
    }

    // Bind Toggle Creation+Alt+Fix mag logo ontwerpen
    const toggleCafLogoBtn = container.querySelector('#btn-toggle-caf-logo');
    if (toggleCafLogoBtn) {
        toggleCafLogoBtn.addEventListener('click', async () => {
            const confirmMsg = lang === 'en' 
                ? "Do you want Creation+Alt+Fix to design a modern vector brandmark for your business?" 
                : "Wil je dat Creation+Alt+Fix een passend modern vector-beeldmerk ontwerpt voor jouw bedrijf?";
            if (!confirm(confirmMsg)) return;

            try {
                const currentOb = projectData.onboarding || {};
                const currentTasks = currentOb.tasks || {};
                const completedList = Array.isArray(currentOb.completedTaskIds) ? [...currentOb.completedTaskIds] : [];
                if (!completedList.includes('logo')) completedList.push('logo');

                const updatedPayload = {
                    onboarding: {
                        ...currentOb,
                        noLogoNeeded: true,
                        completedTaskIds: completedList,
                        tasks: {
                            ...currentTasks,
                            logo: {
                                completed: true,
                                noLogoNeeded: true,
                                completedAt: new Date().toISOString(),
                                note: 'Creation+Alt+Fix ontwerpt een passend vector-beeldmerk'
                            }
                        },
                        lastUpdated: new Date().toISOString()
                    }
                };

                if (typeof onUpdateProject === 'function') {
                    await onUpdateProject(updatedPayload);
                }
            } catch (err) {
                console.error("Fout bij instellen logo voorkeur:", err);
            }
        });
    }

    // Bind Quick Navigation Buttons (modals, scroll targets)
    container.querySelectorAll('.btn-onboarding-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.getAttribute('data-action');
            const target = btn.getAttribute('data-target');

            if (action === 'upload-logo') {
                const fileInput = document.getElementById('file-upload-input');
                if (fileInput) fileInput.click();
                const filesCard = document.getElementById('files-card');
                if (filesCard) filesCard.scrollIntoView({ behavior: 'smooth' });
            } else if (action === 'modal' && target) {
                const modal = document.getElementById(target);
                if (modal) modal.classList.remove('hidden');
            } else if (action === 'scroll' && target) {
                const targetEl = document.getElementById(target);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                    targetEl.style.transition = 'box-shadow 0.4s ease';
                    targetEl.style.boxShadow = '0 0 25px rgba(34, 211, 238, 0.4)';
                    setTimeout(() => { targetEl.style.boxShadow = ''; }, 2000);
                }
            }
        });
    });
}
