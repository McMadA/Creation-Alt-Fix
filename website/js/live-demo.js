document.addEventListener('DOMContentLoaded', function() {

    // ==========================================================================
    // 1. LAB NAVIGATION STICKY SPY & SMOOTH SCROLL
    // ==========================================================================
    const labNavPills = document.querySelectorAll('.lab-nav-pill');
    const labSections = document.querySelectorAll('.lab-section');

    labNavPills.forEach(pill => {
        pill.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                const headerOffset = 130;
                const elementPosition = targetEl.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                labNavPills.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    window.addEventListener('scroll', function() {
        let current = '';
        const scrollPosition = window.pageYOffset + 160;

        labSections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = '#' + section.getAttribute('id');
            }
        });

        if (current) {
            labNavPills.forEach(pill => {
                pill.classList.toggle('active', pill.getAttribute('href') === current);
            });
        }
    });

    // ==========================================================================
    // 2. MODULE 1: LIVE CODE & BUILD STUDIO
    // ==========================================================================
    const studioStepCards = document.querySelectorAll('.studio-step-card');
    const studioLiveBox = document.getElementById('studio-live-box');
    const studioStageTitle = document.getElementById('studio-stage-title');
    const studioStageBadge = document.getElementById('studio-stage-badge');
    const studioCssControls = document.getElementById('studio-css-controls');
    const liveBillingWrapper = document.getElementById('live-billing-wrapper');
    const livePriceRow = document.getElementById('live-price-row');
    const livePriceVal = document.getElementById('live-price-val');
    const livePeriodText = document.getElementById('live-period-text');
    const liveFeaturesList = document.getElementById('live-features-list');
    const liveCardBadge = document.getElementById('live-card-badge');
    const liveCardTitle = document.getElementById('live-card-title');
    const liveCardDesc = document.getElementById('live-card-desc');
    const btnLiveAction = document.getElementById('btn-live-action');
    const btnLiveText = document.getElementById('btn-live-text');
    const studioToast = document.getElementById('studio-toast');
    const studioToastText = document.getElementById('studio-toast-text');

    // Controls for CSS Stage
    const sliderBlur = document.getElementById('slider-blur');
    const sliderRadius = document.getElementById('slider-radius');
    const colorPills = document.querySelectorAll('.color-pill');

    let currentBilling = 'monthly';
    let currentAccentColor = '#6366f1';
    let currentStage = 1;

    function setStudioStage(stepNum) {
        currentStage = stepNum;
        studioStepCards.forEach(c => c.classList.toggle('active', parseInt(c.getAttribute('data-step')) === stepNum));
        studioLiveBox.className = 'live-target-box';

        if (stepNum === 1) {
            studioLiveBox.classList.add('stage-html');
            studioStageTitle.textContent = 'preview://stage-1-raw-html.dom';
            studioStageBadge.textContent = 'HTML5 Engine';
            studioStageBadge.style.background = 'rgba(239, 68, 68, 0.15)';
            studioStageBadge.style.color = '#ef4444';
            studioCssControls.classList.remove('show');
            liveBillingWrapper.style.display = 'none';
            livePriceRow.style.display = 'none';
            liveFeaturesList.style.display = 'none';
            liveCardBadge.style.display = 'none';
            btnLiveText.textContent = 'Pakket Kiezen';
            studioLiveBox.style.cssText = '';
        } else if (stepNum === 2) {
            studioLiveBox.classList.add('stage-css');
            studioStageTitle.textContent = 'preview://stage-2-glassmorphism.css';
            studioStageBadge.textContent = 'CSS3 Tokens';
            studioStageBadge.style.background = 'rgba(34, 211, 238, 0.15)';
            studioStageBadge.style.color = '#22d3ee';
            studioCssControls.classList.add('show');
            liveBillingWrapper.style.display = 'none';
            livePriceRow.style.display = 'none';
            liveFeaturesList.style.display = 'none';
            liveCardBadge.style.display = 'inline-block';
            btnLiveText.textContent = 'Pakket Kiezen';
            updateLiveCssStyles();
        } else if (stepNum === 3) {
            studioLiveBox.classList.add('stage-js');
            studioStageTitle.textContent = 'preview://stage-3-reactive-state.mjs';
            studioStageBadge.textContent = 'ES6 State Engine';
            studioStageBadge.style.background = 'rgba(168, 85, 247, 0.15)';
            studioStageBadge.style.color = '#a855f7';
            studioCssControls.classList.remove('show');
            liveBillingWrapper.style.display = 'flex';
            livePriceRow.style.display = 'flex';
            liveFeaturesList.style.display = 'block';
            liveCardBadge.style.display = 'inline-block';
            btnLiveText.textContent = 'Configureer & Boek Nu';
            studioLiveBox.style.cssText = '';
            updatePriceCalculation();
        } else if (stepNum === 4) {
            studioLiveBox.classList.add('stage-ai');
            studioStageTitle.textContent = 'preview://stage-4-cloud-ai-sync.api';
            studioStageBadge.textContent = 'Gemini & Firestore (sub-50ms)';
            studioStageBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            studioStageBadge.style.color = '#10b981';
            studioCssControls.classList.remove('show');
            liveBillingWrapper.style.display = 'flex';
            livePriceRow.style.display = 'flex';
            liveFeaturesList.style.display = 'block';
            liveCardBadge.style.display = 'inline-block';
            liveCardBadge.innerHTML = '<i class="fas fa-bolt" style="color:#10b981;"></i> Cloud Real-Time Active';
            btnLiveText.textContent = 'Genereer AI Verrijking';
            studioLiveBox.style.cssText = '';
            updatePriceCalculation();
        }
    }

    function updateLiveCssStyles() {
        if (currentStage !== 2) return;
        const blurVal = sliderBlur ? sliderBlur.value : 16;
        const radiusVal = sliderRadius ? sliderRadius.value : 16;
        studioLiveBox.style.backdropFilter = `blur(${blurVal}px)`;
        studioLiveBox.style.webkitBackdropFilter = `blur(${blurVal}px)`;
        studioLiveBox.style.borderRadius = `${radiusVal}px`;
        studioLiveBox.style.borderColor = currentAccentColor;
        studioLiveBox.style.boxShadow = `0 20px 45px rgba(0,0,0,0.5), 0 0 25px ${currentAccentColor}44`;
        if (btnLiveAction) {
            btnLiveAction.style.background = currentAccentColor;
        }
    }

    function updatePriceCalculation() {
        const isDutch = document.documentElement.lang !== 'en';
        if (currentBilling === 'annual') {
            livePriceVal.textContent = isDutch ? '€ 12,00' : '€ 12.00';
            livePeriodText.textContent = isDutch ? '/ maand (jaarlijks gefactureerd)' : '/ month (billed annually)';
        } else {
            livePriceVal.textContent = isDutch ? '€ 15,00' : '€ 15.00';
            livePeriodText.textContent = isDutch ? '/ maand' : '/ month';
        }
    }

    function showToast(msg) {
        if (!studioToast) return;
        studioToastText.textContent = msg;
        studioToast.classList.add('show');
        setTimeout(() => {
            studioToast.classList.remove('show');
        }, 3000);
    }

    studioStepCards.forEach(card => {
        card.addEventListener('click', function() {
            const stepNum = parseInt(this.getAttribute('data-step'));
            setStudioStage(stepNum);
        });
    });

    if (sliderBlur) sliderBlur.addEventListener('input', updateLiveCssStyles);
    if (sliderRadius) sliderRadius.addEventListener('input', updateLiveCssStyles);

    colorPills.forEach(pill => {
        pill.addEventListener('click', function() {
            colorPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentAccentColor = this.getAttribute('data-color');
            updateLiveCssStyles();
        });
    });

    document.querySelectorAll('.billing-switch-btn[data-period]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.billing-switch-btn[data-period]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentBilling = this.getAttribute('data-period');
            updatePriceCalculation();
            showToast(currentBilling === 'annual' ? 'Jaarkorting van 20% geactiveerd!' : 'Maandelijkse facturatie ingesteld.');
        });
    });

    if (btnLiveAction) {
        btnLiveAction.addEventListener('click', function() {
            const isDutch = document.documentElement.lang !== 'en';
            if (currentStage === 1) {
                showToast(isDutch ? 'HTML element geactiveerd.' : 'HTML element activated.');
            } else if (currentStage === 2) {
                showToast(isDutch ? 'Glassmorphism token toegepast!' : 'Glassmorphism token applied!');
            } else if (currentStage === 3) {
                showToast(isDutch ? 'Pakket geselecteerd: Managed Cloud All-in!' : 'Plan selected: Managed Cloud All-in!');
            } else if (currentStage === 4) {
                btnLiveAction.disabled = true;
                btnLiveText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI Generating...';
                setTimeout(() => {
                    liveCardTitle.textContent = isDutch ? 'Autonomous Cloud Core Pro 2026' : 'Autonomous Cloud Core Pro 2026';
                    liveCardDesc.textContent = isDutch 
                        ? 'AI-verrijkte cloudstack met automatische traffic scaling, zero-downtime micro-backups en realtime anomaly detectie.'
                        : 'AI-enriched cloud stack with automated traffic scaling, zero-downtime micro-backups, and realtime anomaly detection.';
                    btnLiveAction.disabled = false;
                    btnLiveText.textContent = isDutch ? 'AI Verrijking Voltooid' : 'AI Enrichment Complete';
                    showToast(isDutch ? '✨ AI Heuristics & Firestore gesynchroniseerd!' : '✨ AI Heuristics & Firestore synced!');
                }, 1100);
            }
        });
    }

    // ==========================================================================
    // 3. MODULE 2: 7-LAYER AI SCRAPE SHIELD SIMULATOR
    // ==========================================================================
    const toggleTdm = document.getElementById('toggle-tdm');
    const toggleNoise = document.getElementById('toggle-noise');
    const toggleHoneypot = document.getElementById('toggle-honeypot');
    const shieldNoiseLayer = document.getElementById('shield-noise-layer');
    const shieldWatermarkLayer = document.getElementById('shield-watermark-layer');
    const shieldTerminalLogs = document.getElementById('shield-terminal-logs');
    const btnSimulateBot = document.getElementById('btn-simulate-bot');

    function appendTerminalLog(msg, type = 'info') {
        if (!shieldTerminalLogs) return;
        const entry = document.createElement('div');
        entry.className = 'terminal-log-entry';
        const now = new Date().toLocaleTimeString();
        let tag = `<span class="log-time">[${now}]</span> `;
        if (type === 'warn') tag += `<span class="log-warn">[WARN]</span> `;
        else if (type === 'danger') tag += `<span class="log-danger">[BLOCKED]</span> `;
        else if (type === 'success') tag += `<span class="log-success">[SHIELD OK]</span> `;
        else tag += `<span class="log-time">[INFO]</span> `;

        entry.innerHTML = tag + msg;
        shieldTerminalLogs.appendChild(entry);
        shieldTerminalLogs.scrollTop = shieldTerminalLogs.scrollHeight;
    }

    if (toggleTdm) {
        toggleTdm.addEventListener('change', function() {
            if (this.checked) {
                appendTerminalLog('Directive 2019/790 EU TDM headers: ENABLED (tdm-reservation: 1)', 'success');
            } else {
                appendTerminalLog('EU TDM headers: DISABLED (Caution: machine crawlers unhindered)', 'warn');
            }
        });
    }

    if (toggleNoise) {
        toggleNoise.addEventListener('change', function() {
            if (this.checked) {
                shieldNoiseLayer.classList.add('active');
                shieldWatermarkLayer.classList.add('active');
                appendTerminalLog('Canvas dynamic noise layer & pixel disturbance: ARMED', 'success');
            } else {
                shieldNoiseLayer.classList.remove('active');
                shieldWatermarkLayer.classList.remove('active');
                appendTerminalLog('Canvas disturbance: DISABLED', 'warn');
            }
        });
    }

    if (toggleHoneypot) {
        toggleHoneypot.addEventListener('change', function() {
            if (this.checked) {
                appendTerminalLog('Server honeypot trap & CSF/LFD firewall bans: ARMED', 'success');
            } else {
                appendTerminalLog('Honeypot trap: DISABLED', 'warn');
            }
        });
    }

    if (btnSimulateBot) {
        btnSimulateBot.addEventListener('click', function() {
            btnSimulateBot.disabled = true;
            appendTerminalLog('Inbound request: Python-urllib/3.11 scraping /images/arnolddesign.webp...', 'warn');

            setTimeout(() => {
                if (toggleTdm && toggleTdm.checked) {
                    appendTerminalLog('Layer 1 check: Machine-readable EU TDM Opt-Out header served. Bot ignored directive.', 'warn');
                } else {
                    appendTerminalLog('Layer 1: No TDM headers present.', 'warn');
                }
            }, 600);

            setTimeout(() => {
                if (toggleNoise && toggleNoise.checked) {
                    appendTerminalLog('Layer 2 check: Dynamic canvas pixel noise injected. AI training weights corrupted.', 'success');
                }
            }, 1200);

            setTimeout(() => {
                if (toggleHoneypot && toggleHoneypot.checked) {
                    appendTerminalLog('Layer 3 trigger: Crawler navigated into hidden honeypot URL /secret-ai-crawler-trap/.', 'danger');
                    appendTerminalLog('Firewall action: Bot IP 194.26.29.112 permanently banned via CSF/LFD (HTTP 403).', 'danger');
                    appendTerminalLog('Security summary: Artwork 100% protected. Zero training data leaked.', 'success');
                } else {
                    appendTerminalLog('Bot crawl succeeded (Honeypot was off).', 'warn');
                }
                btnSimulateBot.disabled = false;
            }, 1900);
        });
    }

    // ==========================================================================
    // 4. MODULE 3: CRM LIVE STAGING ANNOTATOR SIMULATOR
    // ==========================================================================
    const stagingCanvas = document.getElementById('staging-canvas');
    const stagingNotesList = document.getElementById('staging-notes-list');
    const pinsCountSpan = document.getElementById('pins-count');
    const btnClearPins = document.getElementById('btn-clear-pins');
    const pinModalOverlay = document.getElementById('pin-modal-overlay');
    const btnClosePinModal = document.getElementById('btn-close-pin-modal');
    const pinTitleInput = document.getElementById('pin-title-input');
    const pinDescInput = document.getElementById('pin-desc-input');
    const btnSavePin = document.getElementById('btn-save-pin');

    const pdfModalOverlay = document.getElementById('pdf-modal-overlay');
    const btnOpenPdfModal = document.getElementById('btn-open-pdf-modal');
    const btnClosePdfModal = document.getElementById('btn-close-pdf-modal');
    const signatureCanvas = document.getElementById('signature-canvas');
    const btnClearSignature = document.getElementById('btn-clear-signature');
    const btnSignProposal = document.getElementById('btn-sign-proposal');

    let pins = [
        { id: 1, x: 38, y: 24, title: 'Koptekst aanscherpen', status: 'Open' },
        { id: 2, x: 50, y: 65, title: 'Knopkleur afstemmen op huisstijl', status: 'In Behandeling' }
    ];
    let pendingPinCoords = null;

    function renderPins() {
        if (!stagingCanvas) return;
        // Remove existing pin elements
        document.querySelectorAll('.staging-pin').forEach(el => el.remove());

        pins.forEach(pin => {
            const pinEl = document.createElement('div');
            pinEl.className = 'staging-pin';
            pinEl.style.left = pin.x + '%';
            pinEl.style.top = pin.y + '%';
            pinEl.textContent = pin.id;
            pinEl.title = pin.title;
            stagingCanvas.appendChild(pinEl);
        });

        if (pinsCountSpan) pinsCountSpan.textContent = pins.length;

        // Render backlog list
        if (stagingNotesList) {
            stagingNotesList.innerHTML = '';
            pins.forEach(pin => {
                const item = document.createElement('div');
                item.className = 'staging-note-item';
                item.setAttribute('data-pin-id', pin.id);
                item.innerHTML = `
                    <span class="note-pin-num">${pin.id}</span>
                    <div class="note-content-text">
                        <strong>${pin.title}</strong>
                        <span>Positie: (${Math.round(pin.x)}%, ${Math.round(pin.y)}%) • Status: ${pin.status}</span>
                    </div>
                    <button type="button" class="note-delete-btn" data-id="${pin.id}" title="Verwijder"><i class="fas fa-times"></i></button>
                `;
                stagingNotesList.appendChild(item);
            });
        }
    }

    if (stagingCanvas) {
        stagingCanvas.addEventListener('click', function(e) {
            const rect = stagingCanvas.getBoundingClientRect();
            const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
            const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
            pendingPinCoords = { x: xPercent, y: yPercent };

            if (pinTitleInput) pinTitleInput.value = '';
            if (pinDescInput) pinDescInput.value = '';
            if (pinModalOverlay) pinModalOverlay.classList.add('open');
        });
    }

    if (btnClosePinModal) {
        btnClosePinModal.addEventListener('click', () => {
            if (pinModalOverlay) pinModalOverlay.classList.remove('open');
        });
    }

    if (btnSavePin) {
        btnSavePin.addEventListener('click', () => {
            const title = pinTitleInput.value.trim() || 'Feedback annotatie #' + (pins.length + 1);
            const newPin = {
                id: pins.length + 1,
                x: pendingPinCoords.x,
                y: pendingPinCoords.y,
                title: title,
                status: 'Open'
            };
            pins.push(newPin);
            renderPins();
            if (pinModalOverlay) pinModalOverlay.classList.remove('open');
            showToast('Feedback pin #' + newPin.id + ' geplaatst op live staging!');
        });
    }

    if (stagingNotesList) {
        stagingNotesList.addEventListener('click', function(e) {
            const delBtn = e.target.closest('.note-delete-btn');
            if (delBtn) {
                const id = parseInt(delBtn.getAttribute('data-id'));
                pins = pins.filter(p => p.id !== id);
                renderPins();
                showToast('Pin #' + id + ' verwijderd.');
            }
        });
    }

    if (btnClearPins) {
        btnClearPins.addEventListener('click', () => {
            pins = [];
            renderPins();
            showToast('Alle annotatie pins gewist.');
        });
    }

    // Signature Canvas Pad
    let isDrawing = false;
    let sigCtx = null;

    if (signatureCanvas) {
        sigCtx = signatureCanvas.getContext('2d');
        signatureCanvas.width = signatureCanvas.offsetWidth || 400;
        signatureCanvas.height = 120;
        sigCtx.strokeStyle = '#22d3ee';
        sigCtx.lineWidth = 2.5;
        sigCtx.lineCap = 'round';

        function startPosition(e) {
            isDrawing = true;
            draw(e);
        }
        function endPosition() {
            isDrawing = false;
            sigCtx.beginPath();
        }
        function draw(e) {
            if (!isDrawing) return;
            const rect = signatureCanvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            sigCtx.lineTo(clientX - rect.left, clientY - rect.top);
            sigCtx.stroke();
            sigCtx.beginPath();
            sigCtx.moveTo(clientX - rect.left, clientY - rect.top);
        }

        signatureCanvas.addEventListener('mousedown', startPosition);
        signatureCanvas.addEventListener('mouseup', endPosition);
        signatureCanvas.addEventListener('mousemove', draw);
        signatureCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPosition(e); });
        signatureCanvas.addEventListener('touchend', endPosition);
        signatureCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
    }

    if (btnClearSignature && sigCtx) {
        btnClearSignature.addEventListener('click', () => {
            sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        });
    }

    if (btnOpenPdfModal && pdfModalOverlay) {
        btnOpenPdfModal.addEventListener('click', () => {
            pdfModalOverlay.classList.add('open');
            setTimeout(() => {
                if (signatureCanvas && sigCtx) {
                    signatureCanvas.width = signatureCanvas.offsetWidth || 400;
                    signatureCanvas.height = 120;
                    sigCtx.strokeStyle = '#22d3ee';
                    sigCtx.lineWidth = 2.5;
                    sigCtx.lineCap = 'round';
                }
            }, 100);
        });
    }

    if (btnClosePdfModal && pdfModalOverlay) {
        btnClosePdfModal.addEventListener('click', () => {
            pdfModalOverlay.classList.remove('open');
        });
    }

    if (btnSignProposal && pdfModalOverlay) {
        btnSignProposal.addEventListener('click', () => {
            pdfModalOverlay.classList.remove('open');
            showToast('✅ Offerte digitaal ondertekend & PDF gegenereerd via jsPDF!');
        });
    }

    renderPins();

    // ==========================================================================
    // 5. MODULE 4: AI PROMPT & DATA AUTOMATION SANDBOX
    // ==========================================================================
    const aiUsecasePills = document.querySelectorAll('.ai-usecase-pill');
    const aiPromptInput = document.getElementById('ai-prompt-input');
    const btnRunAi = document.getElementById('btn-run-ai');
    const aiOutputText = document.getElementById('ai-output-text');
    const aiModelTag = document.getElementById('ai-model-tag');

    const aiPresets = {
        seo: {
            model: 'gemini-2.0-flash // structured-json',
            input: 'Bedrijf: Scholte Elektrotechniek Groningen. Doelgroep: Particulieren & MKB. Diensten: Zonnepanelen, groepenkasten, laadpalen, 24/7 storingsdienst.',
            output: `{\n  "meta_title": "Elektricien Groningen | Zonnepanelen & Storingsdienst - Scholte",\n  "meta_description": "Erkend elektricien in Groningen voor groepenkasten, laadpalen en zonnepanelen. 24/7 spoed storingsdienst voor particulier & zakelijk.",\n  "h1_heading": "Vakkundige Elektrotechniek & Duurzame Energie in Groningen",\n  "key_usps": [\n    "24/7 Nooddienst bij stroomuitval & kortsluiting",\n    "Gecertificeerd zonnepanelen- en laadpaalinstallateur",\n    "Transparante tarieven zonder verborgen voorrijkosten"\n  ]\n}`
        },
        json: {
            model: 'gemini-2.0-flash // data-extraction',
            input: 'Factuur ontvangen van Vimexx Webhosting op 28 augustus 2026. Bedrag € 149,50 excl. btw (21% btw = € 31,40, totaal € 180,90). Factuurnummer VMX-2026-89412.',
            output: `{\n  "document_type": "PURCHASE_INVOICE",\n  "vendor": "Vimexx Webhosting",\n  "invoice_number": "VMX-2026-89412",\n  "invoice_date": "2026-08-28",\n  "subtotal_cents": 14950,\n  "vat_percentage": 21,\n  "vat_cents": 3140,\n  "total_cents": 18090,\n  "currency": "EUR",\n  "verification_hash": "a9f84bc12e87d"\n}`
        },
        ticket: {
            model: 'gemini-2.0-flash // nlp-classifier',
            input: 'Klantmail: "Hallo, onze webshop checkout geeft sinds vanmorgen een foutmelding bij iDEAL betalingen. Klanten kunnen niet afrekenen!"',
            output: `{\n  "intent": "PAYMENT_GATEWAY_ERROR",\n  "priority": "CRITICAL",\n  "sentiment": "URGENT",\n  "assigned_department": "DevOps & E-Commerce Engineering",\n  "suggested_action": "Check Mollie webhook SSL listener & API key sync immediately.",\n  "estimated_resolution_time_min": 15\n}`
        },
        code: {
            model: 'gemini-2.0-flash // ast-optimizer',
            input: 'Array(10000).forEach(item => { document.getElementById("list").innerHTML += "<li>" + item.name + "</li>"; });',
            output: `// OPTIMIZED (Zero DOM Thrashing with DocumentFragment)\nconst fragment = document.createDocumentFragment();\nitems.forEach(item => {\n  const li = document.createElement('li');\n  li.textContent = item.name;\n  fragment.appendChild(li);\n});\ndocument.getElementById('list').appendChild(fragment);\n\n// Performance Gain: 98.4% faster (1 render cycle vs 10,000 reflows)`
        }
    };

    let activeUsecase = 'seo';

    aiUsecasePills.forEach(pill => {
        pill.addEventListener('click', function() {
            aiUsecasePills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            activeUsecase = this.getAttribute('data-usecase');
            const preset = aiPresets[activeUsecase];
            if (preset) {
                if (aiPromptInput) aiPromptInput.value = preset.input;
                if (aiModelTag) aiModelTag.textContent = preset.model;
            }
        });
    });

    if (btnRunAi) {
        btnRunAi.addEventListener('click', function() {
            btnRunAi.disabled = true;
            btnRunAi.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bezig met AI Synthese...';
            if (aiOutputText) aiOutputText.textContent = 'Verbinding maken met LLM inference endpoint...';

            setTimeout(() => {
                const preset = aiPresets[activeUsecase] || aiPresets.seo;
                if (aiOutputText) aiOutputText.textContent = preset.output;
                btnRunAi.disabled = false;
                btnRunAi.innerHTML = '<i class="fas fa-bolt"></i> Voer AI Transformatie Uit';
                showToast('✨ AI Transformatie succesvol voltooid!');
            }, 800);
        });
    }

    // ==========================================================================
    // 6. MODULE 5: TECHNOLOGY RADAR FILTER
    // ==========================================================================
    const radarFilterBtns = document.querySelectorAll('.radar-filter-btn');
    const radarCards = document.querySelectorAll('.radar-card');

    radarFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            radarFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');

            radarCards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.style.display = 'block';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        card.style.opacity = '1';
                    }, 50);
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // ==========================================================================
    // 7. BILINGUAL EVENT LISTENER
    // ==========================================================================
    window.addEventListener('languageChanged', function(e) {
        const lang = e.detail && e.detail.lang ? e.detail.lang : 'nl';
        updatePriceCalculation();
    });

});