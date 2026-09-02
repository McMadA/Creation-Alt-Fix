document.addEventListener('DOMContentLoaded', async function() {
    // --- LOAD COMPONENTS ---
    const loadComponent = async (id, file) => {
        const el = document.getElementById(id);
        if (el) {
            try {
                const response = await fetch(file);
                if (response.ok) { el.outerHTML = await response.text(); }
            } catch (e) { console.error("Failed to load component:", file, e); }
        }
    };
    await Promise.all([
        loadComponent('navbar-placeholder', '/components/navbar.html'),
        loadComponent('footer-placeholder', '/components/footer.html')
    ]);

    // --- TRANSLATIONS OBJECT ---
    const translations = {
        'nl': {
    // --- ALGEMEEN & NAVIGATIE ---
    "pageTitle": "Creation+Alt+Fix - Intelligente AI-Oplossingen & IT-Services Groningen",
    "navHome": "Home",
    "navServices": "Diensten",
    "navWorkflow": "Werkwijze",
    "navProjects": "Projecten",
    "navAbout": "Over Ons",
    "navContact": "Contact",
    "navIntake": "Intake",
    "navPortalLogin": "Portaal",
    "navAIServices": "AI Services",
    "navWebDesign": "Web Design & Tech",
    "ariaInstagram": "Instagram CreationAltFix",
    "ariaLinkedIn": "LinkedIn CreationAltFix",
    "ariaToggleNav": "Navigatie in-/uitklappen",
    "skipToContent": "Direct naar inhoud",

    // Dropdown Headers
    "navServicesPagesHeader": "Diensten & Specialisaties",
    "navServicesHomeHeader": "Op de Hoofdpagina",
    "navWorkflowDropdownHeader": "Werkwijze & Portaal",
    "navProjectsPagesHeader": "Portfolio & Cases",
    "navProjectsHomeHeader": "Op de Hoofdpagina",
    "navAboutDropdownHeader": "Over Creation+Alt+Fix",

    // Dropdown Items (Diensten)
    "navServiceAll": "Alle Diensten Overzicht",
    "navServiceAI": "Slimme Automatisering & AI",
    "navServiceWeb": "Websites & Webshops",
    "navServiceDashboards": "Data Dashboards & Inzichten",
    "navServiceIT": "Software Support & Beheer",
    "navAIServicesSection": "AI-Gedreven Oplossingen",
    "navWhyUsSection": "Waarom Creation+Alt+Fix?",

    // Dropdown Items (Werkwijze)
    "navWorkflowSection": "5-Stappen Aanpak (Home)",
    "navPortalCase": "Klantenportaal Case Study",
    "navDocsLink": "DevOps & AI Documentatie",
    "navPortalDirect": "Direct naar Klantenportaal",

    // Dropdown Items (Projecten)
    "navProjectsAll": "Alle Projecten (14+)",
    "navCaseArnold": "Arnold Design (AI Shield)",
    "navCaseHBI": "Home Buyer Intelligence",
    "navCaseWind": "Wind Cloud Sync Tools",
    "navLiveDemo": "Interactieve Live Demo",
    "navProjectsSection": "Website Showcase",
    "navGithubSection": "Open Source & GitHub",

    // Dropdown Items (Over Ons)
    "navAboutPage": "Over Allard & Achtergrond",
    "navAboutSection": "Introductie (Home)",
    "navFaqSection": "Veelgestelde Vragen (FAQ)",

    // --- HERO SECTIE (HOME) ---
    "heroSpotlight": "🛡️ Case Study: 7-Laags AI Scrape Shield voor Arnold Design",
    "spotlightNotifyTitle": "7-Laags AI Scrape Shield",
    "spotlightNotifyDesc": "Ontdek hoe we kunstwerken van Arnold Doornbos beschermen tegen AI-training en webscraping.",
    "spotlightNotifyBtn": "Lees het hele verhaal",
    "heroBadge": "AI-Powered Solutions",
    "heroHeadline": "Intelligente <span class=\"accent\">AI-Oplossingen</span> voor Jouw Bedrijf",
    "heroSubtitle": "Wij vertalen jouw idee razendsnel naar werkende software. Van slimme automatisering tot complete websites, aangedreven door AI.",
    "heroCtaPrimary": "Ontdek AI Services",
    "heroCtaSecondary": "Gratis AI Consult",
    "heroCtaIntake": "Start Intake Formulier",

    // --- AI SERVICES SECTIE (HOME) ---
    "aiServicesTitle": "AI-Gedreven <span>Oplossingen</span>",
    "learnMore": "Meer info <i class=\"fas fa-arrow-right\"></i>",

    // --- DIENSTEN (HOME & OVERZICHT) ---
    "dienstenOverviewPageTitle": "Onze Diensten - Software Support, AI, Websites & Dashboards | Creation+Alt+Fix",
    "dienstenOverviewTitle": "Onze <span>Diensten</span>",
    "dienstenOverviewSubtitle": "Van software support en AI-automatisering tot websites en data dashboards. Wij bieden een compleet pakket aan digitale oplossingen voor ondernemers en particulieren in Groningen en omgeving.",
    "dienstenOverviewH1": "Onze Diensten - Software Support, AI, Websites & Dashboards in <span>Groningen</span>",
    "dienstenHeroCta": "Direct Project Aanvragen",

    "dienst1Title": "Software Support & Systeembeheer",
    "dienst1P": "Systeemoptimalisatie, netwerkbeheer, softwareondersteuning. Snelle, betrouwbare support voor particulieren en MKB.",
    "dienst1K1": "Software & Systeem Support",
    "dienst1K2": "Netwerkbeheer",
    "dienst1K3": "Virusverwijdering",

    "dienst2Title": "Slimme Automatisering & AI",
    "dienst2P": "Van offertegeneratoren en simpele CRM's tot boekingssystemen en klantenportalen. Wij bouwen de tool die uw werk makkelijker maakt, snel en betaalbaar dankzij AI.",
    "dienst2K1": "Boekingssystemen",
    "dienst2K2": "Simpel CRM",
    "dienst2K3": "Workflow Automatisering",

    "dienst3Title": "Websites & Digitale Aanwezigheid vanaf €99",
    "dienst3P": "Een moderne, snelle website of webshop die uw verhaal vertelt en klanten aantrekt. Ontworpen met oog voor detail, gebouwd voor resultaat.",
    "dienst3K1": "Responsive Webdesign",
    "dienst3K2": "Webshops",
    "dienst3K3": "E-mail Flows",

    "dienst4Title": "Data Dashboards & Inzichten",
    "dienst4P": "Breng uw bedrijfsdata tot leven. Wij creëren overzichtelijke dashboards waarmee u direct ziet hoe uw bedrijf presteert en waar kansen liggen.",
    "dienst4K1": "Data Visualisatie",
    "dienst4K2": "KPI Dashboards",
    "dienst4K3": "Managementinformatie",

    // --- OVERZICHT CARDS ---
    "overzichtITTitle": "Software Support & Systeembeheer",
    "overzichtITP": "Software support, netwerkbeheer en betrouwbare IT-ondersteuning voor particulieren en bedrijven.",
    "overzichtITBtn": "Meer over Software Support",
    "overzichtAITitle": "Slimme Automatisering & AI",
    "overzichtAIP": "Workflow automatisering, AI-consultancy en slimme bedrijfstools die uw werk makkelijker maken.",
    "overzichtAIBtn": "Meer over AI & Automatisering",
    "overzichtWebTitle": "Website Laten Maken",
    "overzichtWebP": "Moderne, snelle websites en webshops vanaf €99. Responsive design, gebouwd voor resultaat.",
    "overzichtWebBtn": "Meer over Websites",
    "overzichtDashTitle": "Data Dashboards & Inzichten",
    "overzichtDashP": "Overzichtelijke dashboards en KPI-rapportages die uw bedrijfsdata tot leven brengen.",
    "overzichtDashBtn": "Meer over Dashboards",

    // --- WEB DESIGN / WAAROM WIJ (HOME) ---
    "webDesignTitle": "Waarom <span>Creation+Alt+Fix</span>?",
    "waarom1Title": "Toekomstgerichte Expertise",
    "waarom1P": "Jarenlange IT-ervaring gecombineerd met de nieuwste AI-ontwikkelingen. Duurzame oplossingen, geen tijdelijke pleisters.",
    "waarom2Title": "Uw Taal, Onze Techniek",
    "waarom2P": "U vertelt ons uw wens in heldere taal, wij zorgen voor de technische vertaling en snelle realisatie met AI. Geen jargon, wel resultaat.",
    "waarom3Title": "Van Concept tot Creatie",
    "waarom3P": "Of het nu softwareoptimalisatie of een complexe AI-strategie betreft, wij begeleiden het hele proces. Jouw partner in digitale transformatie.",
    "waarom4Title": "Design & Functionaliteit",
    "waarom4P": "Geïnspireerd door de beste designs, leveren we oplossingen die niet alleen perfect werken, maar er ook zo uitzien.",

    // --- AI BENEFITS ---
    "aiOplossingenTitle": "De Kracht van AI: <span>Sneller en Slimmer</span>",
    "aiBenefit1": "Optimaliseer je workflow met AI-gedreven taakautomatisering.",
    "aiBenefit2": "Krijg diepere inzichten uit je data met slimme analyse tools.",
    "aiBenefit3": "Verbeter klantinteractie met intelligente chatbots.",
    "aiBenefit4": "Laat AI repetitieve taken overnemen, focus op groei.",
    "aiBenefit5": "Realiseer software-ideeën in dagen in plaats van maanden.",
    "aiBenefit6": "Bespaar aanzienlijk op ontwikkelkosten voor simpele oplossingen.",

    // --- PORTFOLIO (HOME) ---
    "portfolioTitle": "Bekijk onze <span>Websites!</span>",
    "portfolioSubtitle": "Hieronder een selectie van websites en applicaties die wij recentelijk hebben ontwikkeld (zoals de portfolio-website van Arnold Design). Dit is een selecte greep uit ons complete portfolio om u een beeld te geven van wat wij voor u kunnen realiseren.",
    "project1Title": "Creation+Alt+Fix CRM & Klantenportaal",
    "project1P": "Een volledig custom CRM & Klantenportaal. Real-time Firebase tracking, digitale offertes, geautomatiseerde onboarding en statusportaal.",
    "project1Btn": "Bekijk Case Study",
    "projectArnoldTitle": "Arnold Design — AI Scrape Shield",
    "projectArnoldP": "7-laags IP- en AI-scraping protectiesysteem gecombineerd met een monumentale glas-in-lood showcase voor kunstenaar Arnold Doornbos.",
    "projectArnoldBtn": "Bekijk AI Case",
    "project2Title": "Home Buyer Intelligence",
    "project2P": "AI-gedreven woninganalyse met risicoscoring en biedstrategie voor de Nederlandse huizenmarkt. Gebouwd met React, Fastify en Google Gemini AI.",
    "project2Btn": "Bekijk AI Case",
    "project3Title": "Wind – Cloud Sync Tools",
    "project3P": "Synchroniseer bestanden tussen OneDrive, Google Drive, iCloud en Google Photos met SHA256 verificatie en real-time web monitoring.",
    "project3Btn": "Bekijk Tool Case",
    "project4Title": "Bakkertje Sieg Webshop",
    "project4P": "Volledige E-Commerce webshop met WordPress & WooCommerce. Inclusief receptencatalogus, winkelwagen en online betaalintegratie.",
    "project4Btn": "Ontdek de Webshop!",
    "project5Title": "Angela Stenekes",
    "project5P": "Moderne, responsive bedrijfswebsite voor een lokale knipperij met schrijfambities. Inclusief verhalenblog, behandelingsprijzen en afsprakencontact.",
    "project5Btn": "Ontdek de Website!",
    "liveDemoBtn": "Bekijk de live demo hoe een website tot stand komt!",
    "allProjectsBtn": "Bekijk alle projecten & volledig portfolio (14+)",

    // --- FAQ (HOME) ---
    "faqTitle": "Veelgestelde Vragen: <span>Snelle Websites</span>",
    "faq1Q": "Kan ik echt binnen een dag een website hebben?",
    "faq1A": "Ja, voor simpele websites zoals een online visitekaartje, een landingspagina, of een basis informatieve site is dit vaak mogelijk. Neem contact op met uw wensen, dan geven we direct een inschatting.",
    "faq2Q": "Wat kost het om snel een simpele website te laten maken?",
    "faq2A": "De kosten voor een snelle, professionele website zijn afhankelijk van uw wensen, maar altijd transparant en scherp geprijsd. Vraag gerust een vrijblijvende offerte aan voor uw specifieke situatie.",
    "faq3Q": "Welke informatie hebben jullie nodig om mijn website snel te kunnen bouwen?",
    "faq3A": "Om snel te kunnen leveren, hebben we uw basisteksten, eventueel logo, en gewenste kleurstellingen nodig. We hebben ook templates en voorbeelden om het proces te versnellen als u nog geen content heeft.",

    // --- 5-STAGE WORKFLOW & CRM SYNERGY ---
    "workflowBadge": "Volledige Transparantie",
    "workflowSectionTitle": "Hoe Wij Werken: <span>Transparant in 5 Stappen</span>",
    "workflowSectionSubtitle": "Geen zwarte doos of onduidelijke wachttijden. Vanaf dag één volg je elk detail van jouw website of software live in jouw persoonlijke Creation+Alt+Fix Klantenportaal.",
    "wfStep1Badge": "Fase 1",
    "wfStep1Title": "1. Slimme Intake & Analyse",
    "wfStep1Desc": "Geef online je wensen, doelen en voorkeuren door in 2 minuten. Onze AI-engine analyseert direct de scope en zet je beveiligde klantaccount klaar.",
    "wfStep1Pill": "Real-time Account",
    "wfStep2Badge": "Fase 2",
    "wfStep2Title": "2. Transparante Offerte",
    "wfStep2Desc": "Gespecificeerde offerte inclusief hosting (€ 150,-/jr) zonder verborgen kosten. 1-klik digitaal akkoord & directe PDF download.",
    "wfStep2Pill": "Digitaal Akkoord & PDF",
    "wfStep3Badge": "Fase 3",
    "wfStep3Title": "3. Design & Concept Review",
    "wfStep3Desc": "Samen stemmen we kleurenpaletten, typografie en interactieve wireframes af. Pas na jouw visuele goedkeuring starten we de bouw.",
    "wfStep3Pill": "Visuele Goedkeuring",
    "wfStep4Badge": "Fase 4 • Highlight",
    "wfStep4Title": "4. Live Staging & Pin-Feedback",
    "wfStep4Desc": "Kijk live mee in een responsieve desktop/tablet/mobiel emulator en klik direct feedback-pins op knoppen of teksten (Design, Tekst, Bug).",
    "wfStep4Pill": "Point-and-Click Pins",
    "wfStep5Badge": "Fase 5",
    "wfStep5Title": "5. Livegang & Documentatie",
    "wfStep5Desc": "Eindcontrole, DNS- & domeinoverdracht, overzicht van je Pi-facturen en officiële documentatiegids voor content- & systeembeheer.",
    "wfStep5Pill": "Pi-Facturen & Docs",
    "wfBannerBadge": "Inclusief bij Elk Project",
    "wfBannerTitle": "Altijd realtime grip op jouw digitale assets",
    "wfBannerDesc": "Ervaar de kracht van een eigen portaal met live chatberichten, bestandsuploads, interactieve offerte en staging annotaties.",
    "wfBannerCtaIntake": "Start Jouw Intake",
    "wfBannerCtaCase": "Bekijk CRM Case Study",
    "wfBannerCtaPortal": "Naar Portaal",

    // --- ABOUT (HOME) ---
    "aboutTitle": "Over Mij",
    "aboutP1": "Hoi, ik ben Allard Veldman, de drijvende kracht achter Creation+Alt+Fix. Met een diepe passie voor technologie en een scherp oog voor detail help ik ondernemers en particulieren om hun digitale uitdagingen om te zetten in kansen.",
    "aboutP2": "Mijn missie is simpel: complexe technologie toegankelijk en bruikbaar maken. Of het nu gaat om het bouwen van een bliksemsnelle website, het automatiseren van tijdrovende processen met AI, of het bieden van betrouwbare IT-support – ik sta voor een persoonlijke aanpak en resultaatgerichte oplossingen.",
    "aboutP3": "Laten we samen kijken hoe we technologie in jouw voordeel kunnen laten werken!",
    "aboutReadMore": "Lees meer over mij & achtergrond",

    // --- GITHUB ---
    "githubTitle": "Technische Projecten & <span>Open Source Bijdragen</span>",
    "githubLoading": "Laden van repositories...",
    "githubNoRepos": "Geen publieke repositories gevonden.",
    "githubError": "Kon repositories niet laden. Fout: {error}. Bekijk de console voor details.",

    // --- TESTIMONIALS ---
    "trustTitle": "Wat Klanten <span>Zeggen</span>",
    "testimonial1Quote": "\"Creation+Alt+Fix heeft onze werkprocessen volledig getransformeerd met slimme AI-automatisering. Wat voorheen uren kostte, is nu in minuten geregeld.\"",
    "testimonial1Author": "Mark de Vries",
    "testimonial1Role": "Ondernemer, Groningen",
    "testimonial2Quote": "\"Binnen twee dagen had ik een professionele website die er fantastisch uitziet. Snel, betaalbaar en precies wat ik nodig had.\"",
    "testimonial2Author": "Lisa Bakker",
    "testimonial2Role": "Freelancer, Haren",
    "testimonial3Quote": "\"Het dashboard dat ze voor ons hebben gebouwd geeft direct inzicht in onze KPI's. Eindelijk data-gedreven beslissingen zonder technische kennis.\"",
    "testimonial3Author": "Jan Scholten",
    "testimonial3Role": "Directeur MKB, Zuidhorn",

    // --- CONTACT (HOME) ---
    "contactTitle": "Klaar voor <span>AI-Transformatie?</span>",
    "contactIntro": "Heeft u een idee voor een slimme tool of software-oplossing? Neem contact op voor een vrijblijvend gesprek. We denken graag mee hoe we uw wens snel en betaalbaar kunnen realiseren.",
    "contactCtaBtn": "Contact voor AI Strategie",
    "contactIntakeBtn": "Start Direct Je Intake",
    "contactLocation": "Groningen e.o.",
    "formThanks": "Bedankt voor je bericht! (Dit is een demo, er is geen e-mail verstuurd)",
    "formErrorFillAll": "Vul alstublieft alle velden in.",

    // --- FOOTER & SHARED META ---
    "footerRights": "Alle rechten voorbehouden.",
    "footerPrivacy": "Privacyverklaring",
    "footerTerms": "Algemene Voorwaarden",
    "footerIntake": "Direct Project Aanvragen (Intake)",
    "footerPortal": "Klantenportaal Inloggen",
    "footerDocs": "Systeem Documentatie",
    "footerKvk": "KVK: 99986191",
    "footerBtw": "BTW: NL005423147B16",
    "footerAddress": "Hoofdstraat 60b, 9601 EJ Hoogezand",

    // --- BREADCRUMBS ---
    "breadcrumbHome": "Home",
    "breadcrumbDiensten": "Diensten",
    "breadcrumbProjecten": "Projecten",
    "breadcrumbAbout": "Over mij",
    "breadcrumbPrivacy": "Privacyverklaring",
    "breadcrumbTerms": "Algemene Voorwaarden",
    "breadcrumbAI": "Slimme Automatisering & AI",
    "breadcrumbWeb": "Website Laten Maken",
    "breadcrumbIT": "Software Support & Systeembeheer",
    "breadcrumbDash": "Data Dashboards",
    "breadcrumbHBI": "Home Buyer Intelligence",
    "breadcrumbWind": "Wind Cloud Sync",

    // --- IT SUPPORT SUBPAGE ---
    "itPageTitle": "Software Support & Systeembeheer Groningen | Creation+Alt+Fix",
    "itH1": "Software Support & Systeembeheer in <span>Groningen</span>",
    "itLead": "Betrouwbare IT-ondersteuning voor particulieren en MKB. Van softwareondersteuning tot compleet netwerkbeheer – wij zorgen dat uw technologie werkt.",
    "itHeroCta": "Start Aanvraag / Intake",
    "itH2Wat": "Wat wij doen",
    "itP1": "Of uw computer vastloopt, uw netwerk traag is, of u last heeft van malware – Creation+Alt+Fix staat voor u klaar. Met jarenlange ervaring in IT-support bieden wij snelle, persoonlijke hulp aan particulieren en bedrijven in Groningen en omgeving.",
    "itP2": "Wij geloven dat goede IT-support meer is dan alleen problemen oplossen. Het gaat om het voorkomen van problemen, het optimaliseren van uw systemen en het zorgen dat u zich kunt focussen op wat écht belangrijk is.",
    "itH2Diensten": "Onze IT-diensten",
    "itCard1Title": "Software Support & Optimalisatie",
    "itCard1P": "Software problemen of trage systemen? Wij diagnosticeren en optimaliseren uw computer snel en vakkundig.",
    "itCard2Title": "Netwerkbeheer & WiFi",
    "itCard2P": "Stabiel internet nodig? Wij optimaliseren uw netwerk, configureren routers en zorgen voor betrouwbare WiFi-dekking.",
    "itCard3Title": "Virusverwijdering & Beveiliging",
    "itCard3P": "Malware, ransomware of phishing? Wij verwijderen bedreigingen en beveiligen uw systemen tegen toekomstige aanvallen.",
    "itCard4Title": "Software Installatie & Updates",
    "itCard4P": "Van Windows-installaties tot softwareconfiguratie. Wij zorgen dat uw programma's up-to-date en goed ingesteld zijn.",
    "itH2Waarom": "Waarom kiezen voor Creation+Alt+Fix?",
    "itP3": "Wij combineren traditionele IT-expertise met moderne tools en AI-ondersteuning. Dat betekent snellere diagnoses, efficiëntere oplossingen en lagere kosten voor u. Bovendien spreken wij uw taal – geen technisch jargon, maar heldere uitleg.",
    "itP4": "Heeft u een IT-probleem dat u niet zelf kunt oplossen? Of zoekt u een betrouwbare partner voor doorlopend IT-beheer? Combineer dit met onze <a href=\"/diensten/slimme-automatisering-ai/\">AI-automatisering</a> voor nog slimmere oplossingen.",
    "itFaqTitle": "Veelgestelde vragen over IT Support",
    "itFaq1Q": "Hoe snel kunnen jullie mijn softwareondersteuningsvraag beantwoorden?",
    "itFaq1A": "Veel voorkomende problemen lossen wij dezelfde dag nog op. Voor complexere vragen geven wij altijd vooraf een tijdsinschatting.",
    "itFaq2Q": "Komen jullie ook aan huis?",
    "itFaq2A": "Ja, wij bieden IT-support aan huis in Groningen en omgeving. Voor veel problemen kan ook remote support een snelle oplossing zijn.",
    "itFaq3Q": "Wat kost IT-support bij Creation+Alt+Fix?",
    "itFaq3A": "Wij werken met transparante tarieven en geven altijd vooraf een prijsindicatie. Neem contact op voor een vrijblijvende offerte.",
    "itFaq4Q": "Ondersteunen jullie ook Apple / Mac computers?",
    "itFaq4A": "Ja, wij bieden support voor zowel Windows als macOS systemen, inclusief software-installatie, updates en probleemoplossing.",
    "itRelatedTitle": "Gerelateerde diensten",

    // --- AI SUBPAGE ---
    "aiPageTitle": "AI Automatisering & Consultancy Groningen | Creation+Alt+Fix",
    "aiH1": "AI Automatisering & Consultancy in <span>Groningen</span>",
    "aiLead": "Laat kunstmatige intelligentie voor u werken. Wij adviseren en implementeren AI-oplossingen die uw werkprocessen sneller, slimmer en goedkoper maken.",
    "aiHeroCta": "Start AI Intake & Aanvraag",
    "aiH2Wat": "De kracht van AI voor uw bedrijf",
    "aiP1": "Artificial Intelligence is geen toekomstmuziek meer – het is een praktische tool die vandaag al resultaat oplevert. Bij Creation+Alt+Fix vertalen wij de mogelijkheden van AI naar concrete oplossingen voor uw bedrijf. Geen hype, maar hands-on implementatie die direct waarde toevoegt.",
    "aiP2": "Of u nu repetitieve taken wilt automatiseren, slimmere inzichten uit uw data wilt halen, of een chatbot wilt inzetten voor klantenservice – wij helpen u van idee tot werkende oplossing.",
    "aiH2Diensten": "Onze AI-diensten",
    "aiCard1Title": "Workflow Automatisering",
    "aiCard1P": "Automatiseer terugkerende taken zoals e-mailverwerking, documentgeneratie en dataverwerking. Bespaar uren per week.",
    "aiCard2Title": "AI Consultancy & Strategie",
    "aiCard2P": "Weet u niet waar te beginnen met AI? Wij analyseren uw processen en adviseren waar AI de meeste impact heeft.",
    "aiCard3Title": "Chatbots & Klantinteractie",
    "aiCard3P": "Intelligente chatbots die 24/7 vragen beantwoorden, afspraken inplannen en leads genereren voor uw bedrijf.",
    "aiCard4Title": "Slimme Bedrijfstools",
    "aiCard4P": "Van offertegeneratoren tot CRM-systemen – wij bouwen op maat gemaakte tools aangedreven door AI.",
    "aiH2Waarom": "Waarom AI met Creation+Alt+Fix?",
    "aiP3": "Wij maken AI toegankelijk en betaalbaar voor het MKB. U hoeft geen techneut te zijn – u vertelt ons uw wens in heldere taal en wij zorgen voor de technische realisatie. Door onze combinatie van <a href=\"/diensten/it-support-beheer/\">IT-expertise</a> en AI-kennis leveren wij oplossingen die naadloos integreren in uw bestaande werkwijze.",
    "aiP4": "Combineer AI-automatisering met een <a href=\"/diensten/data-dashboards/\">data dashboard</a> voor maximaal inzicht in uw bedrijfsprestaties.",
    "aiFaqTitle": "Veelgestelde vragen over AI Automatisering",
    "aiFaq1Q": "Is AI ook geschikt voor kleine bedrijven?",
    "aiFaq1A": "Absoluut. Juist voor kleinere bedrijven kan AI een groot verschil maken door tijdrovende taken te automatiseren. Wij bieden oplossingen die passen bij elk budget.",
    "aiFaq2Q": "Hoe lang duurt het om een AI-oplossing te implementeren?",
    "aiFaq2A": "Simpele automatiseringen kunnen binnen enkele dagen operationeel zijn. Complexere projecten bespreken we uitgebreid, zodat u precies weet wat u kunt verwachten.",
    "aiFaq3Q": "Is mijn data veilig bij het gebruik van AI?",
    "aiFaq3A": "Data privacy heeft onze hoogste prioriteit. Wij adviseren altijd over veilige implementatie en zorgen dat uw data beschermd blijft.",
    "aiFaq4Q": "Wat kost AI-automatisering?",
    "aiFaq4A": "De kosten variëren per project. Wij werken met transparante offertes. Omdat automatisering tijd bespaart, verdient de investering zich vaak snel terug.",
    "aiRelatedTitle": "Gerelateerde diensten",

    // --- WEBSITE SUBPAGE ---
    "webPageTitle": "Website Laten Maken Groningen vanaf €99 | Creation+Alt+Fix",
    "webH1": "Website Laten Maken in <span>Groningen</span> vanaf €99",
    "webLead": "Een professionele, snelle website die klanten aantrekt en uw verhaal vertelt. Responsive design, SEO-geoptimaliseerd en gebouwd voor resultaat.",
    "webHeroCta": "Start Jouw Website Intake",
    "webH2Wat": "Uw online visitekaartje, professioneel en betaalbaar",
    "webP1": "Een goede website is onmisbaar in het digitale tijdperk. Of u nu een ondernemer bent die online gevonden wil worden, een webshop wilt starten, of simpelweg een professioneel online visitekaartje nodig heeft – Creation+Alt+Fix levert snelle, moderne websites die werken.",
    "webP2": "Dankzij onze efficiënte werkwijze met AI-ondersteuning kunnen wij websites leveren die er niet alleen prachtig uitzien, maar ook razendsnel gebouwd zijn. Geen maandenlange trajecten, maar resultaat in dagen.",
    "webH2Diensten": "Wat wij bouwen",
    "webCard1Title": "One-Page Websites",
    "webCard1P": "Alle informatie op één overzichtelijke pagina. Perfect als online visitekaartje voor uw bedrijf. Vanaf €99.",
    "webCard2Title": "Bedrijfswebsites",
    "webCard2P": "Meerdere pagina's, contactformulieren en een professionele uitstraling. Geschikt voor groeiende bedrijven.",
    "webCard3Title": "Webshops",
    "webCard3P": "Verkoop online met een gebruiksvriendelijke webshop. Inclusief productcatalogus, winkelwagen en betaalintegratie.",
    "webCard4Title": "Landingspagina's",
    "webCard4P": "Gerichte pagina's voor campagnes, evenementen of productlanceringen. Geoptimaliseerd voor conversie.",
    "webH2Tarieven": "Transparante Tarieven & Managed Hosting",
    "webPPackagesLead": "Bij Creation+Alt+Fix weet u exact waar u aan toe bent. Geen verborgen kosten, inclusief razendsnelle Nederlandse NVMe hosting en volledige technische ontzorging.",
    "webPricingDevTitle": "1. Website Realisatie",
    "webPricingDevP": "One-page online visitekaartje vanaf €99,- of complete maatwerk bedrijfswebsite vanaf €550,-. Inclusief responsive design, SEO basis en contactformulieren.",
    "webPricingHostTitle": "2. Managed Cloud Hosting All-in",
    "webPricingHostP": "Snelle NVMe webhosting, 1x .nl domein, SSL-certificaat, 5 zakelijke mailboxen (SPF/DKIM/DMARC), geautomatiseerde dagelijkse back-ups (100% dataherstelgarantie) en continue uptime- & security monitoring.",
    "webPricingApkTitle": "3. Website & Security APK",
    "webPricingApkP": "Jaarlijkse beveiligingsaudit, PHP/DB optimalisatie, SEO audit, inclusief 2 uur wijzigingsstrippenkaart (normaal €65,-/uur) en officieel APK keuringsrapport.",
    "webH2Waarom": "Waarom een website bij Creation+Alt+Fix?",
    "webP3": "Wij bouwen websites met oog voor detail en prestatie. Elke website is responsive (perfect op mobiel), snel ladend en geoptimaliseerd voor zoekmachines. Bekijk onze <a href=\"/projecten.html\">portfolio</a> voor voorbeelden van ons werk.",
    "webP4": "Heeft u al een website maar wilt u deze uitbreiden met <a href=\"/diensten/slimme-automatisering-ai/\">slimme automatisering</a>? Of heeft u behoefte aan een <a href=\"/diensten/data-dashboards/\">dashboard</a> om uw websitedata te analyseren? Wij denken graag mee.",
    "webFaqTitle": "Veelgestelde vragen over websites",
    "webFaq1Q": "Kan ik echt binnen een dag een website hebben?",
    "webFaq1A": "Ja, voor simpele websites zoals een online visitekaartje of landingspagina is dit vaak mogelijk. Neem contact op met uw wensen, dan geven we direct een inschatting.",
    "webFaq2Q": "Wat kost een website bij Creation+Alt+Fix?",
    "webFaq2A": "Onze websites beginnen vanaf €99 voor een eenvoudige one-pager. Complexere sites en webshops worden op maat geprijsd. Vraag een vrijblijvende offerte.",
    "webFaq3Q": "Wordt mijn website geoptimaliseerd voor Google?",
    "webFaq3A": "Ja, elke website die wij bouwen is SEO-geoptimaliseerd met snelle laadtijden, structured data en mobile-first design. Zo wordt u beter gevonden in Google.",
    "webFaq4Q": "Kan ik mijn website later nog aanpassen?",
    "webFaq4A": "Absoluut. Wij bouwen websites die makkelijk te onderhouden en uit te breiden zijn. Ook bieden wij onderhoudspakketten aan.",
    "webFaq5Q": "Regelen jullie ook hosting en domeinnaam?",
    "webFaq5A": "Ja, met ons Managed Cloud Hosting All-in pakket (€ 150,-/jaar excl. BTW) regelen wij uw .nl domeinnaam, snelle NVMe hosting, SSL beveiliging, 5 zakelijke e-mailaccounts met SPF/DKIM/DMARC anti-spoofing en geautomatiseerde dagelijkse back-ups met 1-klik herstelgarantie. U heeft nergens omkijken naar.",
    "webRelatedTitle": "Gerelateerde diensten",

    // --- DASHBOARD SUBPAGE ---
    "dashPageTitle": "Data Dashboards & KPI Inzichten | Creation+Alt+Fix Groningen",
    "dashH1": "Data Dashboards & KPI Inzichten in <span>Groningen</span>",
    "dashLead": "Breng uw bedrijfsdata tot leven met overzichtelijke dashboards. Zie direct hoe uw bedrijf presteert en waar kansen liggen.",
    "dashHeroCta": "Vraag een Dashboard Aan",
    "dashH2Wat": "Van data naar inzicht",
    "dashP1": "U verzamelt dagelijks data – van verkoopcijfers en websitebezoeken tot klanttevredenheid en voorraadniveaus. Maar kunt u deze data ook effectief benutten? Creation+Alt+Fix transformeert ruwe data in heldere, visuele dashboards die u helpen betere beslissingen te nemen.",
    "dashP2": "Onze dashboards zijn geen standaard templates. Wij bouwen op maat, afgestemd op uw specifieke KPI's en bedrijfsdoelen. Zo ziet u in één oogopslag wat er speelt.",
    "dashH2Diensten": "Wat wij bieden",
    "dashCard1Title": "KPI Dashboards",
    "dashCard1P": "Overzichtelijke dashboards die uw belangrijkste prestatie-indicatoren real-time weergeven. Altijd en overal toegankelijk.",
    "dashCard2Title": "Data Visualisatie",
    "dashCard2P": "Complexe data vertaald naar begrijpelijke grafieken, charts en rapportages die direct inzicht geven.",
    "dashCard3Title": "Geautomatiseerde Rapportages",
    "dashCard3P": "Laat rapportages automatisch genereren en versturen. Bespaar tijd en heb altijd actuele cijfers bij de hand.",
    "dashCard4Title": "Data Integratie",
    "dashCard4P": "Wij koppelen verschillende databronnen – van spreadsheets tot APIs – in één centraal dashboard.",
    "dashH2Waarom": "Waarom data dashboards van Creation+Alt+Fix?",
    "dashP3": "Wij combineren data-expertise met <a href=\"/diensten/slimme-automatisering-ai/\">AI en automatisering</a> om dashboards te bouwen die niet alleen data tonen, maar ook patronen herkennen en aanbevelingen doen. Zo wordt uw data een strategisch wapen.",
    "dashP4": "Een goed dashboard begint bij betrouwbare <a href=\"/diensten/it-support-beheer/\">IT-infrastructuur</a>. Wij zorgen voor het complete plaatje.",
    "dashFaqTitle": "Veelgestelde vragen over Data Dashboards",
    "dashFaq1Q": "Welke data kan ik in een dashboard verwerken?",
    "dashFaq1A": "Vrijwel alle data: verkoopcijfers, websitestatistieken, klanttevredenheid, financiële gegevens, voorraad, social media metrics en meer. Wij adviseren welke KPI's het meest relevant zijn voor uw bedrijf.",
    "dashFaq2Q": "Heb ik technische kennis nodig om een dashboard te gebruiken?",
    "dashFaq2A": "Nee, onze dashboards zijn ontworpen voor gebruiksgemak. U opent ze in uw browser en ziet direct uw data. Wij geven ook een korte uitleg bij oplevering.",
    "dashFaq3Q": "Hoe lang duurt het om een dashboard te bouwen?",
    "dashFaq3A": "Een basis dashboard kan binnen een week operationeel zijn. Complexere dashboards met meerdere databronnen nemen wat meer tijd in beslag. Wij geven altijd vooraf een tijdsinschatting.",
    "dashFaq4Q": "Wat kost een data dashboard?",
    "dashFaq4A": "De kosten hangen af van de complexiteit en het aantal databronnen. Neem contact op voor een vrijblijvend gesprek en een offerte op maat.",
    "dashRelatedTitle": "Gerelateerde diensten",

    // --- OVER MIJ SUBPAGE ---
    "overMijPageTitle": "Over mij - Allard Veldman | Creation+Alt+Fix",
    "overMijMetaDesc": "Allard Veldman, de drijvende kracht achter Creation+Alt+Fix. Ontdek mijn passie voor Software-Only services, AI-automatisering en supersnelle websites in Groningen.",
    "overMijBadge": "Allard Veldman",
    "overMijH1": "Over <span>Mij</span>",
    "overMijLead": "De drijvende kracht achter Creation+Alt+Fix. Ik maak complexe technologie toegankelijk en bruikbaar voor MKB en particulieren in Groningen en omstreken.",
    "overMijLinkedInBtn": "Connect op LinkedIn",
    "overMijMissieTitle": "Mijn Missie & Achtergrond",
    "overMijMissieP1": "Technologie moet voor jou werken, niet andersom. Met een persoonlijke aanpak en resultaatgerichte oplossingen zorg ik ervoor dat digitale vraagstukken helder en overzichtelijk worden.",
    "overMijMissieP2": "Mijn achtergrond in de wiskunde vormt de basis van mijn werkwijze. Als voormalig prijswinnaar van de Nederlandse Wiskunde Olympiade en auteur voor het wiskundetijdschrift Pythagoras, benader ik IT-uitdagingen sterk analytisch. Ik doorzie complexe systemen snel en vertaal ze naar efficiënte oplossingen.",
    "overMijMissieP3": "Mijn focus ligt uitsluitend op <strong style=\"color: #fff;\">Software-Only Services</strong>. Denk hierbij aan software support, cloud-omgevingen (Azure) en AI-implementaties. <span style=\"color: var(--color-primary-light);\">Let op: ik voer geen computer- of hardware reparaties meer uit.</span>",
    "overMijFocusTitle": "Focus & Diensten",
    "overMijFocusLi1": "AI-gedreven oplossingen & tools (zoals de Home Buyer Intelligence app)",
    "overMijFocusLi2": "Slimme automatisering (klantenportalen, offertegeneratoren)",
    "overMijFocusLi3": "Data dashboards voor direct inzicht in bedrijfsdata",
    "overMijFocusLi4": "Supersnelle websites (vanaf €99)",
    "overMijTechTitle": "Tech Stack & Aanpak",
    "overMijTechP": "Ik combineer jarenlange IT-ervaring met de nieuwste AI-ontwikkelingen om innovatieve en robuuste oplossingen te bouwen. Ik werk bij voorkeur met solide, snelle technieken zoals Vanilla JS, Firebase en Tailwind/CSS. Dit garandeert applicaties die er professioneel uitzien én onder de motorkap perfect presteren. Mijn tone of voice is altijd professioneel, toegankelijk, innovatief en transparant.",
    "overMijContactTitle": "Klaar om samen te werken?",
    "overMijContactP": "Transparant, professioneel en innovatief. Neem contact op voor een vrijblijvende kennismaking.",
    "overMijContactBtn": "Start jouw project",

    // --- WORKFLOW SECTION ---
    "workflowSectionSubtitle": "Hoe Wij Werken",
    "workflowSectionTitle": "Transparant in <span>5 Duidelijke Stappen</span>",
    "wfStep1Title": "1. Slimme Intake & Analyse",
    "wfStep1Desc": "Geautomatiseerde analyse van doelen, domeinstatus en stijlwensen via onze 5-staps wizard. Direct account en Firestore document aanmaak.",
    "wfStep2Title": "2. Transparante Offerte",
    "wfStep2Desc": "Duidelijke deliverables en tarieven. Direct digitaal akkoord geven in het portaal en downloaden als officiële PDF offerte.",
    "wfStep3Title": "3. Design & Concept Review",
    "wfStep3Desc": "Interactieve wireframes en previews. Visuele afstemming van de gewenste vibe en structuur alvorens over te gaan tot software-ontwikkeling.",
    "wfStep4Title": "4. Live Staging & Feedback",
    "wfStep4Desc": "Uniek: schakel live tussen desktop, tablet en mobiel. Plaats point-and-click annotaties en feedbackpins direct op knoppen of secties.",
    "wfStep5Title": "5. Livegang & Documentatie",
    "wfStep5Desc": "Volledige DNS-omzetting, Pi-Boekhouding factuuroverzicht en overdracht via onze interactieve systeem documentatiegids.",
    "workflowPortalBannerTitle": "Altijd 100% Regie via Jouw Eigen Klantenportaal",
    "workflowPortalBannerDesc": "Geen trage e-mailketens of onduidelijkheden. Volg elke wijziging, test je site in de emulator en accordeer documenten op één centrale plek.",
    "workflowPortalBannerBtn": "Bekijk Klantenportaal Live",

    // --- SERVICE PORTAL USP BOX ---
    "serviceUspTitle": "Inclusief Toegang tot Jouw Persoonlijke Klantenportaal",
    "serviceUspDesc": "Bij Creation+Alt+Fix is elk project voorzien van een dedicated klantaccount op ons live portaal. Zo behoud je 100% inzicht en regie over het hele proces:",
    "serviceUspF1Title": "5-Fasen Live Voortgang",
    "serviceUspF1Desc": "Volg de status van intake tot livegang in real-time.",
    "serviceUspF2Title": "Live Staging & Feedback Pins",
    "serviceUspF2Desc": "Plaats direct opmerkingen op desktop, tablet en mobiel.",
    "serviceUspF3Title": "Offertes & Pi-Facturen",
    "serviceUspF3Desc": "1-klik digitaal akkoord, jsPDF download en factureninzicht.",
    "serviceUspF4Title": "Directe Chat & Systeem Gids",
    "serviceUspF4Desc": "Wissel revisies uit en raadpleeg onze documentatiegids.",

    // --- CRM FLAGSHIP CASE STUDY SUBPAGE ---
    "crmCasePageTitle": "Creation+Alt+Fix CRM & Portaal – Flagship Case Study | Creation+Alt+Fix",
    "crmCaseMetaDesc": "Case Study: Hoe Creation+Alt+Fix een zero-framework CRM & Klantenportaal bouwde met 5-fasen tracking, live concept staging annotaties, jsPDF offertes en Pi-Boekhouding sync.",
    "breadcrumbCrmCase": "Creation+Alt+Fix CRM Case Study",
    "crmHeroBadge": "Flagship Software & CRM Architecture Case Study",
    "crmH1": "Creation+Alt+Fix CRM — <span>Real-time Portaal & Staging Suite</span>",
    "crmLead": "Hoe we een zero-framework, end-to-end CRM-ecosysteem ontwikkelden met realtime 5-fasen projecttracking, een interactieve staging feedback emulator, geautomatiseerde jsPDF offertes en Pi-Boekhouding synchronisatie.",
    "crmChallengeTitle": "De Uitdaging: Van 'Zwarte Doos' naar 100% Transparantie",
    "crmChallengeP1": "Bij traditionele webdevelopment- en IT-bureaus ervaren klanten vaak een 'zwarte doos': na de intake volgen trage e-mailketens, onduidelijke offertes en statische PDF-mockups waarbij feedback geven via screenshots frustrerend en inefficiënt is.",
    "crmChallengeP2": "<strong>Onze Visie:</strong> Een op maat ontwikkeld, razendsnel CRM en Klantenportaal dat het complete traject van intake tot livegang en beheer digitaliseert. Klanten krijgen direct bij de intake een beveiligd account en kunnen live meekijken hoe hun project tot stand komt.",
    "crmChallengeP3": "Geen logge frameworks met zware runtime-kosten, maar pure, schone Vanilla JavaScript gekoppeld aan Firebase Firestore voor sub-50ms synchronisatie en Pi-Boekhouding voor automatische factuurregels en vaste tariefmodellen (€ 150,-/jr All-in Cloud Hosting).",
    "crmStat1": "Volledig Geautomatiseerde Pipeline",
    "crmStat2": "Real-time Firestore Synchronisatie",
    "crmStat3": "Zero-Framework Client Overhead",
    "crmStat4": "Transparantie in Offerte & Staging",
    "crmPillarsTitle": "Vier Technische Paradepaardjes van het <span>Creation+Alt+Fix Ecosysteem</span>",
    "crmPillarsDesc": "Het portaal combineert state-of-the-art webtechnologieën om een frictieloze, converterende en uiterst professionele ervaring te bieden:",
    "crmF1Title": "Live Staging & Point-and-Click Annotaties",
    "crmF1Desc": "Klanten schakelen binnen het portaal live tussen Desktop-, Tablet- en Mobiele weergaven. In 'Feedback Modus' klikken ze direct op elementen om pins te plaatsen met specifieke categorieën (Design, Tekst, Functionaliteit of Bug). Pins synchroniseren realtime met de admin werkplek.",
    "crmF2Title": "jsPDF Engine & Pi-Boekhouding Synchronisatie",
    "crmF2Desc": "Dynamische generatie van officiële PDF-offertes direct in de browser. Klanten accorderen met 1 klik digitaal. Gekoppeld aan onze Raspberry Pi Boekhouding database voor live statusinzicht, factuurregels en de vaste € 150,-/jr Cloud Hosting en € 350,-/jr APK abonnementen.",
    "crmF3Title": "Zero-Framework Vanilla JS Architectuur",
    "crmF3Desc": "Gebouwd zonder zware SPA-frameworks (zoals React of Angular). Pure ES6+ modules zorgen voor onmiddellijke laadtijden, zero bundler latency en 100/100 Google Lighthouse prestatiescores op zowel mobiel als desktop.",
    "crmF4Title": "Multi-Step Intake met Contextuele Pre-Fill",
    "crmF4Desc": "De 5-staps onboarding wizard leest URL-parameters van de hoofdwebsite (bijv. ?service=ai-automation of ?service=dashboards). Bij afronding wordt direct een Firebase Auth klantaccount aangemaakt en een geautomatiseerde EmailJS welkomstmail verstuurd.",
    "crmPipelineTitle": "De 5-Fasen Klantreis in het Portaal",
    "crmPipelineDesc": "Vanaf het moment van intake tot aan de livegang begeleidt het systeem de klant stap voor stap door het proces:",
    "crmStep1Detail": "Geautomatiseerde analyse van doelen, domeinstatus en stijlwensen. Direct account en Firestore document aanmaak.",
    "crmStep2Detail": "Inzage in deliverables en tarieven, digitaal akkoord via modal en directe download van de officiële PDF offerte.",
    "crmStep3Detail": "Interactieve wireframe- en Figma preview. Visuele goedkeuring alvorens over te gaan tot software-ontwikkeling.",
    "crmStep4Detail": "Live responsieve viewport emulator. Klanten plaatsen feedback-pins op knoppen, titels en afbeeldingen.",
    "crmStep5Detail": "DNS-omzetting, Pi-facturen overzicht en koppeling met de live documentatiegids voor contentbeheer.",
    "crmTechTitle": "Toegepaste Technologieën & Stack",
    "crmCtaTitle": "Wil je ook een op maat gemaakt platform of applicatie?",
    "crmCtaDesc": "Creation+Alt+Fix ontwerpt en realiseert high-performance software, dashboards en portals die jouw bedrijfsprocessen transformeren.",
    "crmCtaIntakeBtn": "Start Je Software Intake",
    "crmCtaLiveBtn": "Ervaar het Klantenportaal",
    "crmCtaContactBtn": "Neem Contact Op",

    // --- PROJECTEN SHOWCASE SUBPAGE ---
    "projectenPageTitle": "Projecten & Portfolio - Websites, AI & Custom Software | Creation+Alt+Fix",
    "projectenMetaDesc": "Bekijk ons portfolio van websites, webshops, AI-tools en custom software. Van lokale bedrijfswebsites tot een eigen CRM-systeem — gebouwd met de kracht van AI.",
    "projectenH1": "Onze <span>Projecten</span> & Portfolio",
    "projectenLead": "Van lokale bedrijfswebsites en webshops tot AI-gedreven applicaties en een eigen CRM-systeem. Ontdek wat wij bouwen — en wat wij voor jou kunnen realiseren.",
    "projectenStatProjects": "Projecten opgeleverd",
    "projectenStatSatisfaction": "Klanttevredenheid",
    "projectenStatTech": "Technologieën",
    "projectenCaseStudyTitle": "Uitgelicht: <span>Custom CRM & Klantenportaal</span>",
    "caseStudyFlagshipBadge": "🏆 Flagship Project",
    "projectenCaseLabel": "Case Study — Intern Product & Systeem",
    "projectenCaseTitle": "Creation+Alt+Fix CRM & Klantenportaal",
    "projectenCaseDesc": "Een volledig zelfontwikkeld end-to-end CRM en klantenportaal dat het complete traject automatiseert: van AI intake en jsPDF offertes tot een live staging emulator met point-and-click annotaties en Pi-Boekhouding facturatiesynchronisatie.",
    "projectenCaseF1": "Real-time Firebase Firestore",
    "projectenCaseF2": "Live Staging & Point-and-Click Pins",
    "projectenCaseF3": "jsPDF Offerte & Digitaal Akkoord",
    "projectenCaseF4": "Pi-Boekhouding Factuursync",
    "projectenCaseF5": "5-Fase Interactieve Pipeline",
    "projectenCaseF6": "Multi-Project Switcher & Chat",
    "projectenCaseDeepDive": "Bekijk Volledige Case Study",
    "projectenCaseCta": "Ervaar het Klantenportaal",
    "projectenGridTitle": "Alle <span>Projecten</span>",
    "filterAll": "Alle",
    "filterWebsites": "Websites",
    "filterWebshops": "Webshops",
    "filterAI": "AI & Tools",
    "filterLanding": "Landingspagina's",
    "filterCountLabel": "projecten",
    "catWebsite": "Website",
    "catWebshop": "Webshop",
    "catAITool": "AI & Tool",
    "catLanding": "Landing Page",
    "catHosting": "🚀 Hosting & Migratie",
    "pVisitSite": "Bekijk Live",
    "pVisitShop": "Bekijk Webshop",
    "pViewCase": "Bekijk Case",
    "pArnoldTitle": "Arnold Doornbos (Arnold Design)",
    "pArnoldDesc": "Exclusieve portfolio-website voor kunstenaar en grafisch ontwerper Arnold Doornbos. Bevat interactieve showcases voor grafisch ontwerp, typografie & portretten, en monumentale glas-in-lood kunst (Academie Minerva).",
    "pAngelaTitle": "Angela Stenekes",
    "pAngelaDesc": "Een moderne, responsive website voor een lokale knipperij met schrijfambities. Inclusief verhaaltjessectie, afsprakensysteem en SEO-optimalisatie.",
    "pSiegTitle": "Bakkertje Sieg",
    "pSiegDesc": "Een volledig functionele webshop voor het verkopen van recepten. Inclusief receptencatalogus, winkelwagen, betaalintegratie en klantbeoordelingen.",
    "pScholteTitle": "Scholte-Elektrotechniek",
    "pScholteDesc": "Een op maat gemaakte one-pager voor een elektromonteur in Groningen. Alle informatie compact op één pagina, geoptimaliseerd voor snelheid en mobiel gebruik.",
    "pStenekesTitle": "Stenekes Rioolspecialist",
    "pStenekesDesc": "Informatieve bedrijfswebsite voor een rioolspecialist. Direct zichtbaar via Google dankzij lokale SEO en gestructureerde content over diensten en tarieven.",
    "pWillaTitle": "Naaiatelier Willa",
    "pWillaDesc": "Stijlvolle website voor een naaiatelier. Galerij met portfolio van creaties, diensten-overzicht en contactmogelijkheden — alles met een warme, ambachtelijke uitstraling.",
    "pCapybaraTitle": "Capybara Culture",
    "pCapybaraDesc": "Creatieve website rondom NFT-collecties en digitale kunst. Inclusief gallery, uitleg over blockchain-technologie en community links.",
    "pPomppopTitle": "PompPop",
    "pPomppopDesc": "High-converting aanmeldpagina voor een evenement. Eenvoudig aanmeldformulier, evenementdetails en sfeerbeelden — alles gericht op maximale conversie.",
    "pLivianTitle": "Livian Design",
    "pLivianDesc": "Portfolio-website voor een interieurontwerper. Showcase van projecten, sfeerbeelden en contactformulier met een stijlvol, minimalistisch design.",
    "pBesselingTitle": "Besseling Installatietechniek",
    "pBesselingDesc": "Professionele bedrijfswebsite voor een installatiebedrijf. Overzicht van diensten, projectreferenties en directe contactmogelijkheden voor offerte-aanvragen.",
    "pQolipaTitle": "Qolipa",
    "pQolipaDesc": "Zakelijke website met een focus op professionele uitstraling en gebruiksvriendelijkheid. Gebouwd met WordPress en geoptimaliseerd voor zoekmachines.",
    "pFtruckTitle": "F-Truck Store (ftruckstore.nl)",
    "pFtruckDesc": "Bestaande webshop en platform voor Ford F-Series trucks en onderdelen succesvol gemigreerd naar onze managed hostingomgeving. Inclusief veilige databaseoverzetting, DNS & mail-routing configuratie en 24/7 uptime monitoring.",
    "pHbiTitle": "Home Buyer Intelligence",
    "pHbiDesc": "AI-gedreven woninganalyse met risicoscoring en biedstrategie voor de Nederlandse huizenmarkt. Upload documenten, ontvang binnen minuten een complete analyse.",
    "pWindTitle": "Wind – Cloud Sync Tools",
    "pWindDesc": "Synchroniseer bestanden tussen OneDrive, Google Drive, iCloud en Google Photos. Met integriteitsverificatie, multi-threaded uploads en real-time monitoring.",
    "projectenCtaTitle": "Jouw project als volgende?",
    "projectenCtaText": "Of het nu een website, webshop, AI-tool of custom software is — wij bouwen het. Neem contact op voor een vrijblijvend gesprek over jouw idee.",

    // --- HOME BUYER INTELLIGENCE SUBPAGE ---
    "hbiPageTitle": "Home Buyer Intelligence - AI Woninganalyse | Creation+Alt+Fix",
    "hbiH1": "Home Buyer <span>Intelligence</span>",
    "hbiLead": "AI-gedreven woninganalyse die huizenkopers helpt de juiste beslissing te nemen. Upload uw documenten, ontvang een risicoscore en een persoonlijke biedstrategie — volledig GDPR-compliant.",
    "hbiH2Problem": "Het probleem: blind bieden op de huizenmarkt",
    "hbiP1": "Een huis kopen in Nederland is spannend, maar ook risicovol. Kopers ontvangen stapels documenten — VvE-rapporten, kadastergegevens, energielabels, juridische stukken — maar hebben vaak niet de expertise om deze goed te beoordelen. Het resultaat? Overbieden, verborgen gebreken missen, of juist kansen laten liggen.",
    "hbiH2Solution": "De oplossing: AI die uw documenten analyseert",
    "hbiP2": "Home Buyer Intelligence analyseert uw woningdocumenten met Google Gemini AI en levert binnen minuten een complete risicobeoordeling. U ontvangt een gewogen risicoscore, inzicht in structurele, juridische, financiële en milieu-risico's, en een gepersonaliseerde biedstrategie. Zodat u met vertrouwen kunt bieden.",
    "hbiH2Features": "Wat maakt dit product <span>uniek?</span>",
    "hbiCard1Title": "AI Documentanalyse & Revisor Agent",
    "hbiCard1P": "Upload tot 15 documenten tegelijk via ons robuuste document management systeem. Gemini AI en onze nieuwe AI revisor agent (Jules) extraheren en verifiëren automatisch alle relevante informatie uit VvE-rapporten en kadasterstukken.",
    "hbiCard2Title": "Risicoscoring",
    "hbiCard2P": "Gewogen risicobeoordeling over vier categorieën: structureel, juridisch, financieel en milieu. Overzichtelijke score van 0–100.",
    "hbiCard3Title": "Biedstrategie",
    "hbiCard3P": "Ontvang een risico-gecorrigeerd biedadvies met minimum, aanbevolen en maximum bod — afgestemd op marktdata en woningconditie.",
    "hbiCard4Title": "Veilig & GDPR-Compliant",
    "hbiCard4P": "Uw data wordt na 24 uur verwijderd en streng beschermd door IP-based rate limiting middleware. Veilige betalingen, poll-beveiliging en sessie-isolatie garanderen maximale privacy en stabiliteit.",
    "hbiCard5Title": "Nederlandse Huizenmarkt",
    "hbiCard5P": "Specifiek ontwikkeld voor de Nederlandse markt. Integratie met BAG, Kadaster, EP-Online en CBS voor actuele marktdata.",
    "hbiCard6Title": "Visueel Dashboard",
    "hbiCard6P": "Donker-themed dashboard met interactieve grafieken, risico-overzichten en marktanalyse. Direct bruikbaar na analyse.",
    "hbiH2HowItWorks": "Hoe werkt het?",
    "hbiStep1Title": "Documenten uploaden",
    "hbiStep1P": "Sleep uw woningdocumenten in de upload zone. Tot 15 bestanden tegelijk, maximaal 25 MB per bestand.",
    "hbiStep2Title": "AI Analyse",
    "hbiStep2P": "Google Gemini AI leest en begrijpt uw documenten. Het extraheert woningdetails, VvE-financiën en juridische risico's.",
    "hbiStep3Title": "Risicobeoordeling",
    "hbiStep3P": "De resultaten worden verwerkt door ons risicoscoringsmodel. U ontvangt een gewogen score per categorie.",
    "hbiStep4Title": "Biedadvies",
    "hbiStep4P": "Op basis van de risicoanalyse en marktdata ontvangt u een gepersonaliseerd biedadvies met drie scenario's.",
    "hbiH2Tech": "Gebouwd met bewezen technologie",
    "hbiTechP": "Een robuuste, schaalbare architectuur die klaar is voor productie en enterprise-gebruik.",
    "hbiTechFrontend": "Frontend",
    "hbiTechBackend": "Backend",
    "hbiTechAIData": "AI & Data",
    "hbiTechInfra": "Infrastructuur",
    "hbiCtaTitle": "Interesse in deze oplossing?",
    "hbiCtaText": "Wilt u een soortgelijke AI-applicatie voor uw branche? Of bent u benieuwd naar een demo? Neem vrijblijvend contact op.",
    "hbiCtaDemo": "Bekijk Live Demo",
    "hbiCtaMail": "Neem Contact Op",

    // --- WIND SUBPAGE ---
    "windPageTitle": "Wind – Cloud Sync Tools | Creation+Alt+Fix",
    "windH1": "Wind – Cloud <span>Sync Tools</span>",
    "windLead": "Synchroniseer uw bestanden naadloos tussen OneDrive, Google Drive, iCloud en Google Photos. Met integriteitsverificatie, multi-threaded uploads en een browser-interface voor real-time monitoring.",
    "windH2Problem": "Het probleem: versnipperde cloudopslag",
    "windP1": "Foto's op iCloud, documenten op OneDrive, back-ups op Google Drive. De meeste mensen hebben hun bestanden verspreid over meerdere clouddiensten. Handmatig synchroniseren is tijdrovend, foutgevoelig en biedt geen garantie dat bestanden intact overkomen. Bestaande tools ondersteunen zelden alle grote platforms tegelijk.",
    "windH2Solution": "De oplossing: één tool voor al uw clouds",
    "windP2": "Wind verbindt OneDrive, Google Drive, iCloud en Google Photos in één krachtige sync engine. Upload, verplaats of kopieer bestanden tussen elke combinatie van diensten — met automatische integriteitscontrole via SHA256, MD5 of bestandsgrootte. Geen enkel bestand gaat verloren.",
    "windH2Features": "Waarom <span>Wind?</span>",
    "windCard1Title": "Multi-Cloud Support",
    "windCard1P": "Sync tussen OneDrive, Google Drive, iCloud Drive en Google Photos. Elke combinatie van bron en bestemming werkt out-of-the-box.",
    "windCard2Title": "Integriteitsverificatie",
    "windCard2P": "Elk bestand wordt geverifieerd na overdracht. SHA256 voor OneDrive, MD5 voor Google Drive, bestandsgrootte voor iCloud. Nul dataverlies.",
    "windCard3Title": "Multi-Threaded Uploads",
    "windCard3P": "Configureerbare worker threads voor parallel uploaden. Batch-processing via de Google Photos API reduceert API-calls met factor 50.",
    "windCard4Title": "Browser Interface",
    "windCard4P": "FastAPI-powered web UI met real-time log streaming via Server-Sent Events. Configureer syncs via formulieren, geen CLI-kennis nodig.",
    "windCard5Title": "Slimme Deduplicatie",
    "windCard5P": "Drie dedup-modes: bestandsnaam, hash of beide. Voorkom dubbele uploads en bespaar opslagruimte automatisch.",
    "windCard6Title": "Veilige Move-Modus",
    "windCard6P": "Verplaats bestanden met een Copy-Verify-Delete strategie. Bronbestanden worden pas verwijderd na succesvolle verificatie.",
    "windH2HowItWorks": "Hoe werkt het?",
    "windStep1Title": "Configureren",
    "windStep1P": "Kies bron- en bestemmingsdienst via de web-interface of CLI. Stel opties in zoals move-modus, dry-run of dedup-strategie.",
    "windStep2Title": "Downloaden",
    "windStep2P": "Bestanden worden recursief opgehaald van de bron en tijdelijk lokaal opgeslagen. De mappenstructuur blijft behouden.",
    "windStep3Title": "Uploaden & Verifiëren",
    "windStep3P": "Bestanden worden geüpload naar de bestemming en automatisch geverifieerd via checksums. Fouten worden direct gemeld.",
    "windStep4Title": "Rapportage",
    "windStep4P": "Een samenvatting toont het aantal overgedragen, geverifieerde en gefaalde bestanden. Alles wordt gelogd voor audit.",
    "windH2Tech": "De technologie achter Wind",
    "windTechP": "Gebouwd met beproefde technologieën voor betrouwbaarheid en performance bij grote volumes.",
    "windTechCore": "Core Engine",
    "windTechWeb": "Web Interface",
    "windTechCloudAPIs": "Cloud API's",
    "windTechInfra": "Infrastructuur",
    "windCtaTitle": "Interesse in cloud-synchronisatie?",
    "windCtaText": "Wilt u een vergelijkbare integratietool voor uw organisatie? Of heeft u een custom sync-oplossing nodig? Neem vrijblijvend contact op.",
    "windCtaMail": "Neem Contact Op",
    "windCtaCall": "Bel Ons",

    // --- PRIVACY POLICY ---
    "privacyPageTitle": "Privacyverklaring - Creation+Alt+Fix | IT, AI & Webdesign",
    "privacyMetaDesc": "Privacyverklaring van Creation+Alt+Fix (Allard Veldman). Lees hoe wij zorgvuldig omgaan met persoonsgegevens conform de AVG / GDPR wetgeving.",
    "privacyBadge": "AVG / GDPR Compliance",
    "privacyH1": "Privacyverklaring",
    "privacyLastUpdated": "Laatst gewijzigd: 25 augustus 2026",
    "privacyH2_1": "1. Wie zijn wij?",
    "privacyP1_1": "Creation+Alt+Fix is een eenmanszaak gevestigd in Hoogezand, ingeschreven bij de Kamer van Koophandel onder nummer <strong>99986191</strong>. Wij bieden IT-consultancy, software-ontwikkeling, AI-automatisering en webdesign aan.",
    "privacyP1_2": "<strong>Contactgegevens:</strong><br>Creation+Alt+Fix (t.a.v. Allard Veldman)<br>Hoofdstraat 60b, 9601 EJ Hoogezand<br>E-mail: <a href=\"mailto:info@creationaltfix.nl\" style=\"color: var(--color-accent);\">info@creationaltfix.nl</a><br>Telefoon: <a href=\"tel:+31619135453\" style=\"color: var(--color-accent);\">+31 6 19135453</a>",
    "privacyH2_2": "2. Welke persoonsgegevens verwerken wij?",
    "privacyP2_1": "Wij verwerken uitsluitend persoonsgegevens die u zelf aan ons verstrekt wanneer u contact opneemt, een offerte aanvraagt of gebruikmaakt van onze diensten:",
    "privacyLi2_1": "Voor- en achternaam",
    "privacyLi2_2": "Bedrijfsnaam (indien van toepassing)",
    "privacyLi2_3": "E-mailadres en telefoonnummer",
    "privacyLi2_4": "Adres- en factuurgegevens (bij opdrachten)",
    "privacyLi2_5": "Projectspecificaties en correspondentie",
    "privacyLi2_6": "IP-adres en geanonimiseerde browsergegevens (bij websitebezoek)",
    "privacyH2_3": "3. Waarom verwerken wij deze gegevens?",
    "privacyP3_1": "Wij verwerken uw gegevens voor de volgende doeleinden:",
    "privacyLi3_1": "<strong>Dienstverlening & Offertes:</strong> Om contact met u op te nemen, offertes op te stellen en overeengekomen software- of webdesignopdrachten uit te voeren.",
    "privacyLi3_2": "<strong>Facturatie & Administratie:</strong> Om te voldoen aan onze wettelijke en fiscale administratieplicht.",
    "privacyLi3_3": "<strong>Websiteverbetering & Beveiliging:</strong> Om de prestaties, functionaliteit en veiligheid van onze website te waarborgen.",
    "privacyH2_4": "4. Grondslagen voor verwerking",
    "privacyP4_1": "Wij verwerken persoonsgegevens uitsluitend op basis van de wettelijke grondslagen van de AVG: de uitvoering van een overeenkomst, het voldoen aan een wettelijke verplichting, ons gerechtvaardigd bedrijfsbelang of uw expliciete toestemming.",
    "privacyH2_5": "5. Bewaartermijnen",
    "privacyP5_1": "Wij bewaren uw gegevens niet langer dan strikt noodzakelijk is. Contactverzoeken en projectcommunicatie bewaren wij maximaal 2 jaar na afronding van het contact. Financiële administratie en facturen bewaren wij 7 jaar conform de fiscale bewaarplicht van de Belastingdienst.",
    "privacyH2_6": "6. Delen van gegevens met derden",
    "privacyP6_1": "Creation+Alt+Fix verkoopt uw gegevens <strong>nooit</strong> aan derden. Wij delen gegevens alleen met betrouwbare verwerkers (zoals hostingproviders, e-mailservers en cloudinfrastructuur) voor zover dat noodzakelijk is voor onze dienstverlening. Met deze partijen hebben wij verwerkersovereenkomsten gesloten die voldoen aan de AVG.",
    "privacyH2_7": "7. Cookies & Analytics",
    "privacyP7_1": "Onze website maakt gebruik van functionele cookies om de website optimaal te laten werken en geanonimiseerde analytische cookies om statistieken bij te houden. U kunt cookies te allen tijde uitschakelen of verwijderen via uw browserinstellingen.",
    "privacyH2_8": "8. Uw rechten",
    "privacyP8_1": "U heeft op grond van de AVG te allen tijde het recht om:",
    "privacyLi8_1": "Inzage te vragen in de persoonsgegevens die wij van u bewaren.",
    "privacyLi8_2": "Correctie of aanvulling van onjuiste gegevens aan te vragen.",
    "privacyLi8_3": "Verwijdering van uw persoonsgegevens te verzoeken ('recht op vergetelheid').",
    "privacyLi8_4": "Bezwaar te maken tegen de verwerking of overdracht van uw gegevens te vragen.",
    "privacyP8_2": "Wilt u gebruikmaken van een van deze rechten? Stuur dan een e-mail naar <a href=\"mailto:info@creationaltfix.nl\" style=\"color: var(--color-accent);\">info@creationaltfix.nl</a>. Wij reageren binnen 14 dagen op uw verzoek.",
    "privacyH2_9": "9. Beveiliging",
    "privacyP9_1": "Wij nemen passende technische en organisatorische maatregelen om misbruik, verlies, onbevoegde toegang en ongewenste openbaarmaking te voorkomen. Onze website maakt gebruik van een beveiligde SSL/TLS-verbinding (HTTPS) en strikte Content Security Policies.",

    // --- TERMS & CONDITIONS ---
    "termsPageTitle": "Algemene Voorwaarden - Creation+Alt+Fix | IT, AI & Webdesign",
    "termsMetaDesc": "Algemene voorwaarden van Creation+Alt+Fix (Allard Veldman). Duidelijke afspraken over webdesign, AI automatisering, softwareontwikkeling, offertes en betalingen.",
    "termsBadge": "Heldere Zakelijke Afspraken",
    "termsH1": "Algemene Voorwaarden",
    "termsLastUpdated": "Laatst gewijzigd: 25 augustus 2026",
    "termsArt1Title": "Artikel 1. Definities",
    "termsP1_1": "In deze algemene voorwaarden wordt verstaan onder:",
    "termsLi1_1": "<strong>Creation+Alt+Fix:</strong> De opdrachtnemer, gevestigd te Hoogezand, ingeschreven bij de KvK onder nummer 99986191.",
    "termsLi1_2": "<strong>Opdrachtgever:</strong> De natuurlijke of rechtspersoon die een overeenkomst aangaat met Creation+Alt+Fix.",
    "termsLi1_3": "<strong>Diensten:</strong> Alle door Creation+Alt+Fix geleverde softwareontwikkeling, webdesign, AI-automatiseringen, dashboards, consultancy en support.",
    "termsArt2Title": "Artikel 2. Toepasselijkheid & Offertes",
    "termsP2_1": "1. Deze voorwaarden zijn van toepassing op alle aanbiedingen, offertes, werkzaamheden en overeenkomsten tussen Creation+Alt+Fix en de Opdrachtgever.<br>2. Alle offertes zijn vrijblijvend en hebben een geldigheidsduur van 30 dagen, tenzij anders schriftelijk aangegeven.<br>3. Een overeenkomst komt tot stand zodra de Opdrachtgever de offerte schriftelijk, per e-mail of digitaal via het klantenportaal accordeert.",
    "termsArt3Title": "Artikel 3. Uitvoering van de Werkzaamheden",
    "termsP3_1": "1. Creation+Alt+Fix zal de overeenkomst naar beste inzicht en vermogen en overeenkomstig de eisen van goed vakmanschap uitvoeren.<br>2. Opgegeven oplevertermijnen gelden als richttermijnen en zijn geen fatale termijnen, tenzij uitdrukkelijk schriftelijk anders is overeengekomen.<br>3. De Opdrachtgever draagt er zorg voor dat alle gegevens, documenten en materialen die noodzakelijk zijn voor de uitvoering tijdig en correct worden verstrekt.",
    "termsArt4Title": "Artikel 4. Wijzigingen & Meerwerk",
    "termsP4_1": "1. Indien tijdens de uitvoering blijkt dat wijzigingen of uitbreidingen noodzakelijk zijn, treden partijen tijdig in overleg.<br>2. Meerwerk zal op basis van nacalculatie tegen het overeengekomen uurtarief of via een aanvullende offerte in rekening worden gebracht na goedkeuring van de Opdrachtgever.",
    "termsArt5Title": "Artikel 5. Prijzen & Betaling",
    "termsP5_1": "1. Alle vermelde tarieven voor zakelijke klanten zijn exclusief BTW, tenzij uitdrukkelijk anders vermeld.<br>2. Facturen dienen te worden voldaan binnen 14 dagen na factuurdatum.<br>3. Bij projecten kan Creation+Alt+Fix een aanbetaling van 50% bij aanvang vragen, waarbij het restant bij oplevering verschuldigd is.",
    "termsArt6Title": "Artikel 6. Intellectueel Eigendom",
    "termsP6_1": "1. Tenzij anders schriftelijk overeengekomen, behoudt Creation+Alt+Fix het intellectueel eigendom op alle ontwikkelde code, templates, scripts en ontwerpen.<br>2. Na volledige betaling van alle facturen verkrijgt de Opdrachtgever een niet-exclusief en onbeperkt gebruiksrecht voor het geleverde eindproduct.",
    "termsArt7Title": "Artikel 7. Aansprakelijkheid & Garantie",
    "termsP7_1": "1. Creation+Alt+Fix is uitsluitend aansprakelijk voor directe schade die het rechtstreekse gevolg is van een toerekenbare tekortkoming in de nakoming van de overeenkomst.<br>2. De totale aansprakelijkheid van Creation+Alt+Fix is in alle gevallen beperkt tot het bedrag dat voor de desbetreffende opdracht is gefactureerd.<br>3. Opgeleverde websites en maatwerksoftware genieten van een gratis garantieperiode van 30 dagen na oplevering voor het kosteloos herstellen van eventuele technische bugs.",
    "termsArt8Title": "Artikel 8. Toepasselijk Recht & Geschillen",
    "termsP8_1": "1. Op alle rechtsbetrekkingen waarbij Creation+Alt+Fix partij is, is uitsluitend het Nederlands recht van toepassing.<br>2. Geschillen zullen bij uitsluiting worden voorgelegd aan de bevoegde rechter in het arrondissement Noord-Nederland.",

    // --- 404 PAGE ---
    "error404PageTitle": "404 - Pagina niet gevonden | Creation+Alt+Fix",
    "error404MetaDesc": "Oeps! Deze pagina bestaat niet of is verplaatst. Keer terug naar Creation+Alt+Fix home.",
    "error404Title": "404 - <span>Pagina niet gevonden</span>",
    "error404Desc": "De pagina die u zoekt bestaat niet of is verplaatst.",
    "error404HomeBtn": "Terug naar Home",

    // --- LIVE DEMO PAGE ---
    "liveDemoPageTitle": "Live Demo: Hoe een Website Gebouwd Wordt - Creation+Alt+Fix",
    "liveDemoMetaDesc": "Een live, interactieve tijdlijn die laat zien hoe een website wordt opgebouwd van pure HTML, via CSS styling tot interactief JavaScript.",
    "liveDemoH1": "De Geboorte van een <span>Website</span>",
    "liveDemoSubtitle": "Scroll naar beneden om te zien hoe een simpele tekst transformeert in een interactieve webpagina.",
    "liveDemoBackBtn": "Terug naar de hoofdpagina",
    "liveDemoStep1Title": "De Blauwdruk: Pure HTML",
    "liveDemoStep1Desc": "Alles begint met HTML (HyperText Markup Language). Dit is het skelet van de pagina. Het definieert de structuur en de inhoud, zoals koppen, paragrafen en knoppen, maar zonder enige opmaak.",
    "liveDemoStep2Title": "De Eerste Verflaag: Basis CSS",
    "liveDemoStep2Desc": "Met CSS (Cascading Style Sheets) voegen we stijl toe. We beginnen met de basis: lettertypes, kleuren en wat opvulling (padding) om de tekst leesbaarder te maken en het er netter uit te laten zien.",
    "liveDemoStep3Title": "Design & Layout: Meer CSS",
    "liveDemoStep3Desc": "Nu maken we het visueel aantrekkelijk. We centreren de inhoud, geven de \"box\" een mooie schaduw en stijlen de knop zodat hij uitnodigend is om op te klikken. Dit is waar het design echt tot leven komt.",
    "liveDemoStep4Title": "De Magie: JavaScript",
    "liveDemoStep4Desc": "JavaScript voegt interactiviteit toe. Het is het brein van de pagina. Hier maken we de knop functioneel. Klik op de \"Koop nu\" knop in het voorbeeld om te zien wat er gebeurt!",
    "liveDemoPreviewTitle": "Mijn Product",
    "liveDemoPreviewText": "Dit is een geweldig product dat je leven zal veranderen. Gemaakt met de beste materialen en ontworpen voor duurzaamheid.",
    "liveDemoPreviewBtn": "Koop nu",
    "liveDemoPreviewBoughtText": "Bedankt voor uw aankoop!",
    "liveDemoFooterText": "Dit is het eindresultaat: een gestileerde en interactieve webcomponent.",
    "liveDemoFooterBack": "Terug naar Creation+Alt+Fix",

    // --- SERVICE SUBPAGE SHARED KEYS ---
    "relITTitle": "Software Support & Systeembeheer",
    "relITP": "Betrouwbare softwareondersteuning, netwerkbeheer en troubleshooting.",
    "relAITitle": "Slimme Automatisering & AI",
    "relAIP": "Workflow automatisering, chatbots en AI bedrijfstools.",
    "relWebTitle": "Website Laten Maken",
    "relWebP": "Moderne, snelle websites en webshops vanaf €99.",
    "relDashTitle": "Data Dashboards & Inzichten",
    "relDashP": "Overzichtelijke dashboards die uw data tot leven brengen.",
    "ctaTitle": "Klaar om te beginnen?",
    "ctaText": "Heeft u vragen of wilt u direct aan de slag? Neem vrijblijvend contact op.",
    "ctaIntake": "Start Intake Formulier",
    "ctaCall": "Bel Ons",
    "ctaMail": "Neem Contact Op",

    // --- LANDING PAGE ---
    "landingPageTitle": "Software Support & AI Automatisering - Creation+Alt+Fix",
    "landingMetaDesc": "Klaar voor de volgende stap? Creation+Alt+Fix helpt jouw bedrijf met webontwikkeling, software support en slimme AI-automatisering. Vraag nu een gratis consult aan.",
    "landingBackBtn": "Terug naar hoofdwebsite",
    "landingBadge": "Nieuwe Klant Actie",
    "landingH1": "Slimme Webontwikkeling & <br><span class=\"gradient-text\">AI Automatisering</span>",
    "landingSubtitle": "Ben je te veel tijd kwijt aan randzaken? Laat Creation+Alt+Fix jouw processen stroomlijnen. Wij bouwen razendsnelle websites, veilige webshops en koppelen AI-systemen die het zware werk voor je doen.",
    "landingCtaBtn": "Start Jouw Project Vandaag",
    "landingTrustPoints": "Vrijblijvende Intake &nbsp;&bull;&nbsp; Remote Worldwide &nbsp;&bull;&nbsp; Persoonlijk Contact",
    "landingFeat1Title": "Websites & Portals",
    "landingFeat1Desc": "Van een converterende landingspagina tot complexe, beveiligde klantportalen op maat. Gebouwd voor snelheid, veiligheid en SEO.",
    "landingFeat2Title": "Slimme AI Integraties",
    "landingFeat2Desc": "Laat AI je e-mails conceptueel opstellen of documenten scannen. Wij koppelen de slimste modellen direct aan jouw bedrijfssoftware.",
    "landingFeat3Title": "Software Support",
    "landingFeat3Desc": "Problemen met je huidige systemen? Wij bieden robuuste software support en oplossingen (zoals Tailscale en cloud-omgevingen) om je online infrastructuur te fixen.",
    "landingSocialProofTitle": "Wereldwijd, altijd dichtbij",
    "landingSocialProofDesc": "Hoewel we vanuit Nederland werken, bedienen we klanten wereldwijd via veilige, snelle remote oplossingen. Onze communicatie is helder, direct en zonder onnodige technische jargon.",
    "landingSocialProofCta": "Bespaar tijd, stuur je intake direct in"
        },
        'en': {
    // --- GENERAL & NAVIGATION ---
    "pageTitle": "Creation+Alt+Fix - Intelligent AI Solutions & IT Services Groningen",
    "navHome": "Home",
    "navServices": "Services",
    "navWorkflow": "Workflow",
    "navProjects": "Projects",
    "navAbout": "About Us",
    "navContact": "Contact",
    "navIntake": "Intake",
    "navPortalLogin": "Portal",
    "navAIServices": "AI Services",
    "navWebDesign": "Web Design & Tech",
    "ariaInstagram": "Instagram CreationAltFix",
    "ariaLinkedIn": "LinkedIn CreationAltFix",
    "ariaToggleNav": "Toggle navigation",
    "skipToContent": "Skip to content",

    // Dropdown Headers
    "navServicesPagesHeader": "Services & Specializations",
    "navServicesHomeHeader": "On the Homepage",
    "navWorkflowDropdownHeader": "Workflow & Portal",
    "navProjectsPagesHeader": "Portfolio & Cases",
    "navProjectsHomeHeader": "On the Homepage",
    "navAboutDropdownHeader": "About Creation+Alt+Fix",

    // Dropdown Items (Services)
    "navServiceAll": "All Services Overview",
    "navServiceAI": "Smart Automation & AI",
    "navServiceWeb": "Websites & Webshops",
    "navServiceDashboards": "Data Dashboards & Insights",
    "navServiceIT": "Software Support & Management",
    "navAIServicesSection": "AI-Driven Solutions",
    "navWhyUsSection": "Why Creation+Alt+Fix?",

    // Dropdown Items (Workflow)
    "navWorkflowSection": "5-Step Approach (Home)",
    "navPortalCase": "Client Portal Case Study",
    "navDocsLink": "DevOps & AI Documentation",
    "navPortalDirect": "Go to Client Portal",

    // Dropdown Items (Projects)
    "navProjectsAll": "All Projects (14+)",
    "navCaseArnold": "Arnold Design (AI Shield)",
    "navCaseHBI": "Home Buyer Intelligence",
    "navCaseWind": "Wind Cloud Sync Tools",
    "navLiveDemo": "Interactive Live Demo",
    "navProjectsSection": "Website Showcase",
    "navGithubSection": "Open Source & GitHub",

    // Dropdown Items (About Us)
    "navAboutPage": "About Allard & Background",
    "navAboutSection": "Introduction (Home)",
    "navFaqSection": "Frequently Asked Questions (FAQ)",

    // --- HERO SECTION (HOME) ---
    "heroSpotlight": "🛡️ Case Study: 7-Layer AI Scrape Shield for Arnold Design",
    "spotlightNotifyTitle": "7-Layer AI Scrape Shield",
    "spotlightNotifyDesc": "Discover how we protect artworks by Arnold Doornbos from unauthorized AI training and scraping.",
    "spotlightNotifyBtn": "Read the full story",
    "heroBadge": "AI-Powered Solutions",
    "heroHeadline": "Intelligent <span class=\"accent\">AI Solutions</span> for Your Business",
    "heroSubtitle": "We translate your idea into working software at lightning speed. From smart automation to complete websites, powered by AI.",
    "heroCtaPrimary": "Discover AI Services",
    "heroCtaSecondary": "Free AI Consult",
    "heroCtaIntake": "Start Intake Form",

    // --- AI SERVICES SECTION (HOME) ---
    "aiServicesTitle": "AI-Driven <span>Solutions</span>",
    "learnMore": "Learn more <i class=\"fas fa-arrow-right\"></i>",

    // --- SERVICES (HOME & OVERVIEW) ---
    "dienstenOverviewPageTitle": "Our Services - Software Support, AI, Websites & Dashboards | Creation+Alt+Fix",
    "dienstenOverviewTitle": "Our <span>Services</span>",
    "dienstenOverviewSubtitle": "From software support and AI automation to websites and data dashboards. We offer a complete package of digital solutions for entrepreneurs and individuals in Groningen and beyond.",
    "dienstenOverviewH1": "Our Services - Software Support, AI, Websites & Dashboards in <span>Groningen</span>",
    "dienstenHeroCta": "Start Project Intake",

    "dienst1Title": "Software Support & System Management",
    "dienst1P": "Software optimization, network management, software support. Fast, reliable support for individuals and SMEs.",
    "dienst1K1": "Software & System Support",
    "dienst1K2": "Network Management",
    "dienst1K3": "Virus Removal",

    "dienst2Title": "Smart Business Tools & Automation",
    "dienst2P": "From quote generators and simple CRMs to booking systems and client portals. We build the tool that makes your work easier, fast and affordable thanks to AI.",
    "dienst2K1": "Booking Systems",
    "dienst2K2": "Simple CRM",
    "dienst2K3": "Workflow Automation",

    "dienst3Title": "Websites & Digital Presence from €99",
    "dienst3P": "A modern, fast website or webshop that tells your story and attracts customers. Designed with attention to detail, built for results.",
    "dienst3K1": "Responsive Web Design",
    "dienst3K2": "Webshops",
    "dienst3K3": "Email Flows",

    "dienst4Title": "Data Dashboards & Insights",
    "dienst4P": "Bring your business data to life. We create clear dashboards that allow you to instantly see how your business performs and where opportunities lie.",
    "dienst4K1": "Data Visualization",
    "dienst4K2": "KPI Dashboards",
    "dienst4K3": "Management Information",

    // --- OVERVIEW CARDS ---
    "overzichtITTitle": "Software Support & System Management",
    "overzichtITP": "Software support, network management and reliable IT support for individuals and businesses.",
    "overzichtITBtn": "More about Software Support",
    "overzichtAITitle": "Smart Automation & AI",
    "overzichtAIP": "Workflow automation, AI consultancy and smart business tools that make your work easier.",
    "overzichtAIBtn": "More about AI & Automation",
    "overzichtWebTitle": "Website Development",
    "overzichtWebP": "Modern, fast websites and webshops from €99. Responsive design, built for results.",
    "overzichtWebBtn": "More about Websites",
    "overzichtDashTitle": "Data Dashboards & Insights",
    "overzichtDashP": "Clear dashboards and KPI reports that bring your business data to life.",
    "overzichtDashBtn": "More about Dashboards",

    // --- WEB DESIGN / WHY US (HOME) ---
    "webDesignTitle": "Why <span>Creation+Alt+Fix</span>?",
    "waarom1Title": "Future-Oriented Expertise",
    "waarom1P": "Years of IT experience combined with the latest AI developments. Sustainable solutions, not temporary patches.",
    "waarom2Title": "Your Language, Our Technology",
    "waarom2P": "You tell us your wish in clear language, we handle the technical translation and rapid delivery with AI. No jargon, just results.",
    "waarom3Title": "From Concept to Creation",
    "waarom3P": "Whether it's software optimization or a complex AI strategy, we guide the entire process. Your partner in digital transformation.",
    "waarom4Title": "Design & Functionality",
    "waarom4P": "Inspired by top-tier designs, we deliver solutions that not only work seamlessly but also look the part.",

    // --- AI BENEFITS ---
    "aiOplossingenTitle": "The Power of AI: <span>Faster and Smarter</span>",
    "aiBenefit1": "Optimize your workflow with AI-driven task automation.",
    "aiBenefit2": "Gain deeper insights from your data with smart analysis tools.",
    "aiBenefit3": "Improve customer interaction with intelligent chatbots.",
    "aiBenefit4": "Let AI handle repetitive tasks, focus on growth.",
    "aiBenefit5": "Realize software ideas in days instead of months.",
    "aiBenefit6": "Save significantly on development costs for simple solutions.",

    // --- PORTFOLIO (HOME) ---
    "portfolioTitle": "Check Out Our <span>Websites!</span>",
    "portfolioSubtitle": "Below is a selection of websites and applications we have recently developed (such as the Arnold Design portfolio). This represents a select snapshot of our complete portfolio to give you an idea of what we can realize for you.",
    "project1Title": "Creation+Alt+Fix CRM & Client Portal",
    "project1P": "A full custom CRM & Client Portal. Real-time Firebase tracking, digital proposals, automated onboarding and status portal.",
    "project1Btn": "View Case Study",
    "projectArnoldTitle": "Arnold Design — AI Scrape Shield",
    "projectArnoldP": "7-layer IP & AI scraping defense system paired with a monumental stained glass showcase for artist Arnold Doornbos.",
    "projectArnoldBtn": "View AI Case",
    "project2Title": "Home Buyer Intelligence",
    "project2P": "AI-powered property analysis with risk scoring and bidding strategy for the Dutch housing market. Built with React, Fastify and Google Gemini AI.",
    "project2Btn": "View AI Case",
    "project3Title": "Wind – Cloud Sync Tools",
    "project3P": "Sync files between OneDrive, Google Drive, iCloud and Google Photos with SHA256 integrity verification and real-time web monitoring.",
    "project3Btn": "View Tool Case",
    "project4Title": "Bakkertje Sieg Webshop",
    "project4P": "Full E-Commerce webshop with WordPress & WooCommerce. Featuring recipe catalog, shopping cart and online payment integration.",
    "project4Btn": "Discover the Webshop!",
    "project5Title": "Angela Stenekes",
    "project5P": "Modern, responsive website for a local salon with creative writing stories. Featuring stories blog, treatment pricing and appointment booking.",
    "project5Btn": "Discover the Website!",
    "liveDemoBtn": "Watch the live demo of how a website is built!",
    "allProjectsBtn": "View all projects & full portfolio (14+)",

    // --- FAQ (HOME) ---
    "faqTitle": "Frequently Asked Questions: <span>Quick Websites</span>",
    "faq1Q": "Can I really have a website within a day?",
    "faq1A": "Yes, for simple websites like an online business card, a landing page, or a basic informative site, this is often possible. Contact us with your requirements for an instant estimate.",
    "faq2Q": "How much does it cost to quickly create a simple website?",
    "faq2A": "The costs for a fast, professional website depend on your specific needs, but are always transparent and competitively priced. Feel free to request a non-binding quote for your situation.",
    "faq3Q": "What information do you need to quickly build my website?",
    "faq3A": "To deliver quickly, we need your basic texts, logo (if any), and desired color scheme. We also have templates and examples to speed up the process if you don't have content yet.",

    // --- 5-STAGE WORKFLOW & CRM SYNERGY ---
    "workflowBadge": "Full Transparency",
    "workflowSectionTitle": "How We Work: <span>Transparent in 5 Steps</span>",
    "workflowSectionSubtitle": "No black box or unclear waiting times. From day one, track every detail of your website or software live in your personal Creation+Alt+Fix Client Portal.",
    "wfStep1Badge": "Phase 1",
    "wfStep1Title": "1. Smart Intake & Analysis",
    "wfStep1Desc": "Submit your requirements, goals and preferences online in 2 minutes. Our AI engine instantly analyzes the scope and prepares your secure client account.",
    "wfStep1Pill": "Real-time Account",
    "wfStep2Badge": "Phase 2",
    "wfStep2Title": "2. Transparent Proposal",
    "wfStep2Desc": "Detailed investment proposal including hosting (€ 150,-/yr) with no hidden fees. 1-click digital acceptance & direct PDF download.",
    "wfStep2Pill": "Digital Acceptance & PDF",
    "wfStep3Badge": "Phase 3",
    "wfStep3Title": "3. Design & Concept Review",
    "wfStep3Desc": "Together we align on color palettes, typography, and interactive wireframes. We only begin development after your visual approval.",
    "wfStep3Pill": "Visual Approval",
    "wfStep4Badge": "Phase 4 • Highlight",
    "wfStep4Title": "4. Live Staging & Pin-Feedback",
    "wfStep4Desc": "Preview live in a responsive desktop/tablet/mobile emulator and place feedback pins directly on buttons or copy (Design, Copy, Bug).",
    "wfStep4Pill": "Point-and-Click Pins",
    "wfStep5Badge": "Phase 5",
    "wfStep5Title": "5. Launch & Documentation",
    "wfStep5Desc": "Final quality checks, DNS & domain handover, Pi invoice overview, and official documentation guide for system management.",
    "wfStep5Pill": "Pi Invoices & Docs",
    "wfBannerBadge": "Included with Every Project",
    "wfBannerTitle": "Always in real-time control of your digital assets",
    "wfBannerDesc": "Experience the power of your dedicated portal with live messaging, file uploads, interactive proposals, and staging annotations.",
    "wfBannerCtaIntake": "Start Your Intake",
    "wfBannerCtaCase": "View CRM Case Study",
    "wfBannerCtaPortal": "Go to Portal",

    // --- ABOUT (HOME) ---
    "aboutTitle": "About <span>Me</span>",
    "aboutP1": "Hi, I'm Allard Veldman, the driving force behind Creation+Alt+Fix. With a deep passion for technology and a keen eye for detail, I help entrepreneurs and individuals turn digital challenges into opportunities.",
    "aboutP2": "My mission is simple: making complex technology accessible and usable. Whether it's building a lightning-fast website, automating time-consuming processes with AI, or providing reliable IT support – I stand for a personal approach and result-driven solutions.",
    "aboutP3": "Let's work together to see how technology can work to your advantage!",
    "aboutReadMore": "Read more about me & background",

    // --- GITHUB ---
    "githubTitle": "Technical Projects & <span>Open Source Contributions</span>",
    "githubLoading": "Loading repositories...",
    "githubNoRepos": "No public repositories found.",
    "githubError": "Could not load repositories. Error: {error}. Check the console for details.",

    // --- TESTIMONIALS ---
    "trustTitle": "What Clients <span>Say</span>",
    "testimonial1Quote": "\"Creation+Alt+Fix completely transformed our work processes with smart AI automation. What used to take hours is now done in minutes.\"",
    "testimonial1Author": "Mark de Vries",
    "testimonial1Role": "Entrepreneur, Groningen",
    "testimonial2Quote": "\"Within two days I had a professional website that looks fantastic. Fast, affordable and exactly what I needed.\"",
    "testimonial2Author": "Lisa Bakker",
    "testimonial2Role": "Freelancer, Haren",
    "testimonial3Quote": "\"The dashboard they built for us provides instant insight into our KPIs. Finally data-driven decisions without technical knowledge.\"",
    "testimonial3Author": "Jan Scholten",
    "testimonial3Role": "SME Director, Zuidhorn",

    // --- CONTACT (HOME) ---
    "contactTitle": "Ready for <span>AI Transformation?</span>",
    "contactIntro": "Have an idea for a smart tool or software solution? Contact us for a no-obligation consultation. We're happy to brainstorm how we can realize your wish quickly and affordably.",
    "contactCtaBtn": "Contact for AI Strategy",
    "contactIntakeBtn": "Start Your Intake Directly",
    "contactLocation": "Groningen area",
    "formThanks": "Thank you for your message! (This is a demo, no email was sent)",
    "formErrorFillAll": "Please fill in all fields.",

    // --- FOOTER & SHARED META ---
    "footerRights": "All rights reserved.",
    "footerPrivacy": "Privacy Policy",
    "footerTerms": "Terms and Conditions",
    "footerIntake": "Start Project Intake",
    "footerPortal": "Client Portal Login",
    "footerDocs": "System Documentation",
    "footerKvk": "CoC (KVK): 99986191",
    "footerBtw": "VAT (BTW): NL005423147B16",
    "footerAddress": "Hoofdstraat 60b, 9601 EJ Hoogezand, Netherlands",

    // --- BREADCRUMBS ---
    "breadcrumbHome": "Home",
    "breadcrumbDiensten": "Services",
    "breadcrumbProjecten": "Projects",
    "breadcrumbAbout": "About me",
    "breadcrumbPrivacy": "Privacy Policy",
    "breadcrumbTerms": "Terms and Conditions",
    "breadcrumbAI": "Smart Automation & AI",
    "breadcrumbWeb": "Website Development",
    "breadcrumbIT": "Software Support & System Management",
    "breadcrumbDash": "Data Dashboards",
    "breadcrumbHBI": "Home Buyer Intelligence",
    "breadcrumbWind": "Wind Cloud Sync",

    // --- IT SUPPORT SUBPAGE ---
    "itPageTitle": "Software Support & System Management Groningen | Creation+Alt+Fix",
    "itH1": "Software Support & System Management in <span>Groningen</span>",
    "itLead": "Reliable IT support for individuals and SMEs. From software support to complete network management – we ensure your technology works.",
    "itHeroCta": "Start Request / Intake",
    "itH2Wat": "What we do",
    "itP1": "Whether your computer crashes, your network is slow, or you're dealing with malware – Creation+Alt+Fix is here for you. With years of experience in IT support, we offer fast, personal help to individuals and businesses in Groningen and surroundings.",
    "itP2": "We believe good IT support is more than just fixing problems. It's about preventing issues, optimizing your systems and ensuring you can focus on what really matters.",
    "itH2Diensten": "Our IT services",
    "itCard1Title": "Software Support & Optimization",
    "itCard1P": "Software issues or slow systems? We diagnose and optimize your computer quickly and professionally.",
    "itCard2Title": "Network Management & WiFi",
    "itCard2P": "Need stable internet? We optimize your network, configure routers and ensure reliable WiFi coverage.",
    "itCard3Title": "Virus Removal & Security",
    "itCard3P": "Malware, ransomware or phishing? We remove threats and secure your systems against future attacks.",
    "itCard4Title": "Software Installation & Updates",
    "itCard4P": "From Windows installations to software configuration. We ensure your programs are up-to-date and properly configured.",
    "itH2Waarom": "Why choose Creation+Alt+Fix?",
    "itP3": "We combine traditional IT expertise with modern tools and AI support. This means faster diagnoses, more efficient solutions and lower costs for you. Plus, we speak your language – no technical jargon, just clear explanations.",
    "itP4": "Have an IT problem you can't solve yourself? Or looking for a reliable partner for ongoing IT management? Combine this with our <a href=\"/diensten/slimme-automatisering-ai/\">AI automation</a> for even smarter solutions.",
    "itFaqTitle": "Frequently asked questions about IT Support",
    "itFaq1Q": "How quickly can you answer my software support question?",
    "itFaq1A": "Many common problems are resolved the same day. For more complex questions, we always provide a time estimate in advance.",
    "itFaq2Q": "Do you also come to my home/office?",
    "itFaq2A": "Yes, we offer on-site IT support in Groningen and surroundings. For many issues, remote support can also provide a quick solution.",
    "itFaq3Q": "How much does IT support at Creation+Alt+Fix cost?",
    "itFaq3A": "We work with transparent rates and always provide a price indication in advance. Contact us for a non-binding quote.",
    "itFaq4Q": "Do you also support Apple / Mac computers?",
    "itFaq4A": "Yes, we offer support for both Windows and macOS systems, including software installation, updates and troubleshooting.",
    "itRelatedTitle": "Related services",

    // --- AI SUBPAGE ---
    "aiPageTitle": "AI Automation & Consultancy Groningen | Creation+Alt+Fix",
    "aiH1": "AI Automation & Consultancy in <span>Groningen</span>",
    "aiLead": "Let artificial intelligence work for you. We advise and implement AI solutions that make your work processes faster, smarter and cheaper.",
    "aiHeroCta": "Start AI Intake & Request",
    "aiH2Wat": "The power of AI for your business",
    "aiP1": "Artificial Intelligence is no longer a future concept – it's a practical tool that delivers results today. At Creation+Alt+Fix, we translate the possibilities of AI into concrete solutions for your business. No hype, but hands-on implementation that adds immediate value.",
    "aiP2": "Whether you want to automate repetitive tasks, gain smarter insights from your data, or deploy a chatbot for customer service – we help you from idea to working solution.",
    "aiH2Diensten": "Our AI services",
    "aiCard1Title": "Workflow Automation",
    "aiCard1P": "Automate recurring tasks such as email processing, document generation and data processing. Save hours per week.",
    "aiCard2Title": "AI Consultancy & Strategy",
    "aiCard2P": "Don't know where to start with AI? We analyze your processes and advise where AI has the most impact.",
    "aiCard3Title": "Chatbots & Customer Interaction",
    "aiCard3P": "Intelligent chatbots that answer questions 24/7, schedule appointments and generate leads for your business.",
    "aiCard4Title": "Smart Business Tools",
    "aiCard4P": "From quote generators to CRM systems – we build custom tools powered by AI.",
    "aiH2Waarom": "Why AI with Creation+Alt+Fix?",
    "aiP3": "We make AI accessible and affordable for SMEs. You don't need to be a tech expert – you tell us your wish in clear language and we handle the technical implementation. Through our combination of <a href=\"/diensten/it-support-beheer/\">IT expertise</a> and AI knowledge, we deliver solutions that seamlessly integrate into your existing workflow.",
    "aiP4": "Combine AI automation with a <a href=\"/diensten/data-dashboards/\">data dashboard</a> for maximum insight into your business performance.",
    "aiFaqTitle": "Frequently asked questions about AI Automation",
    "aiFaq1Q": "Is AI also suitable for small businesses?",
    "aiFaq1A": "Absolutely. Especially for smaller businesses, AI can make a big difference by automating time-consuming tasks. We offer solutions that fit every budget.",
    "aiFaq2Q": "How long does it take to implement an AI solution?",
    "aiFaq2A": "Simple automations can be operational within a few days. More complex projects are discussed extensively, so you know exactly what to expect.",
    "aiFaq3Q": "Is my data safe when using AI?",
    "aiFaq3A": "Data privacy is our top priority. We always advise on secure implementation and ensure your data remains protected.",
    "aiFaq4Q": "How much does AI automation cost?",
    "aiFaq4A": "Costs vary per project. We provide transparent quotes. Because automation saves time, the investment often pays for itself quickly.",
    "aiRelatedTitle": "Related services",

    // --- WEBSITE SUBPAGE ---
    "webPageTitle": "Website Development in Groningen from €99 | Creation+Alt+Fix",
    "webH1": "Website Development in <span>Groningen</span> from €99",
    "webLead": "A professional, fast website that attracts customers and tells your story. Responsive design, SEO-optimized and built for results.",
    "webHeroCta": "Start Your Website Intake",
    "webH2Wat": "Your online business card, professional and affordable",
    "webP1": "A good website is essential in the digital age. Whether you're an entrepreneur who wants to be found online, want to start a webshop, or simply need a professional online business card – Creation+Alt+Fix delivers fast, modern websites that work.",
    "webP2": "Thanks to our efficient approach with AI support, we can deliver websites that not only look beautiful but are also built at lightning speed. No month-long projects, but results in days.",
    "webH2Diensten": "What we build",
    "webCard1Title": "One-Page Websites",
    "webCard1P": "All information on one clear page. Perfect as an online business card for your company. From €99.",
    "webCard2Title": "Business Websites",
    "webCard2P": "Multiple pages, contact forms and a professional appearance. Suitable for growing businesses.",
    "webCard3Title": "Webshops",
    "webCard3P": "Sell online with a user-friendly webshop. Including product catalog, shopping cart and payment integration.",
    "webCard4Title": "Landing Pages",
    "webCard4P": "Targeted pages for campaigns, events or product launches. Optimized for conversion.",
    "webH2Tarieven": "Transparent Pricing & Managed Hosting",
    "webPPackagesLead": "At Creation+Alt+Fix, you always know where you stand. No hidden surprises, including high-speed Dutch NVMe hosting and full peace of mind.",
    "webPricingDevTitle": "1. Website Development",
    "webPricingDevP": "One-page digital business card from €99 or full custom business website from €550. Including mobile-first responsive design, foundational SEO, and secure contact forms.",
    "webPricingHostTitle": "2. Managed Cloud Hosting All-in",
    "webPricingHostP": "Ultra-fast NVMe hosting, 1x .nl domain, SSL certificate, 5 business mailboxes (SPF/DKIM/DMARC), automated daily backups (100% restore guarantee), and 24/7 uptime & security monitoring.",
    "webPricingApkTitle": "3. Website & Security APK",
    "webPricingApkP": "Annual security audit, PHP/database optimization, full SEO inspection, including 2 hours of prepaid change vouchers (worth €130), and an official APK inspection report.",
    "webH2Waarom": "Why a website from Creation+Alt+Fix?",
    "webP3": "We build websites with attention to detail and performance. Every website is responsive (perfect on mobile), fast-loading and optimized for search engines. Check our <a href=\"/projecten.html\">portfolio</a> for examples of our work.",
    "webP4": "Already have a website but want to extend it with <a href=\"/diensten/slimme-automatisering-ai/\">smart automation</a>? Or need a <a href=\"/diensten/data-dashboards/\">dashboard</a> to analyze your website data? We're happy to help.",
    "webFaqTitle": "Frequently asked questions about websites",
    "webFaq1Q": "Can I really have a website within a day?",
    "webFaq1A": "Yes, for simple websites like an online business card or landing page, this is often possible. Contact us with your wishes and we'll give you an estimate right away.",
    "webFaq2Q": "What does a website at Creation+Alt+Fix cost?",
    "webFaq2A": "Our websites start from €99 for a simple one-pager. More complex sites and webshops are custom-priced. Request a non-binding quote.",
    "webFaq3Q": "Will my website be optimized for Google?",
    "webFaq3A": "Yes, every website we build is SEO-optimized with fast loading times, structured data and mobile-first design. This helps you rank better in Google.",
    "webFaq4Q": "Can I modify my website later?",
    "webFaq4A": "Absolutely. We build websites that are easy to maintain and expand. We also offer maintenance packages.",
    "webFaq5Q": "Do you also arrange hosting and domain name?",
    "webFaq5A": "Yes, with our Managed Cloud Hosting All-in package (€150/yr excl. VAT) we provide your .nl domain name, ultra-fast NVMe hosting, SSL certificates, 5 corporate email accounts with SPF/DKIM/DMARC anti-spoofing, and automated daily backups with 1-click restore guarantee. Complete peace of mind.",
    "webRelatedTitle": "Related services",

    // --- DASHBOARD SUBPAGE ---
    "dashPageTitle": "Data Dashboards & KPI Insights | Creation+Alt+Fix Groningen",
    "dashH1": "Data Dashboards & KPI Insights in <span>Groningen</span>",
    "dashLead": "Bring your business data to life with clear dashboards. See at a glance how your business is performing and where opportunities lie.",
    "dashHeroCta": "Request a Dashboard",
    "dashH2Wat": "From data to insight",
    "dashP1": "You collect data daily – from sales figures and website visits to customer satisfaction and stock levels. But can you effectively use this data? Creation+Alt+Fix transforms raw data into clear, visual dashboards that help you make better decisions.",
    "dashP2": "Our dashboards are not standard templates. We build custom, tailored to your specific KPIs and business goals. So you can see at a glance what's happening.",
    "dashH2Diensten": "What we offer",
    "dashCard1Title": "KPI Dashboards",
    "dashCard1P": "Clear dashboards that display your most important performance indicators in real-time. Accessible anytime, anywhere.",
    "dashCard2Title": "Data Visualization",
    "dashCard2P": "Complex data translated into understandable graphs, charts and reports that provide immediate insight.",
    "dashCard3Title": "Automated Reports",
    "dashCard3P": "Have reports automatically generated and sent. Save time and always have current figures at hand.",
    "dashCard4Title": "Data Integration",
    "dashCard4P": "We connect various data sources – from spreadsheets to APIs – in one central dashboard.",
    "dashH2Waarom": "Why data dashboards from Creation+Alt+Fix?",
    "dashP3": "We combine data expertise with <a href=\"/diensten/slimme-automatisering-ai/\">AI and automation</a> to build dashboards that not only display data but also recognize patterns and make recommendations. This way, your data becomes a strategic weapon.",
    "dashP4": "A good dashboard starts with reliable <a href=\"/diensten/it-support-beheer/\">IT infrastructure</a>. We take care of the complete picture.",
    "dashFaqTitle": "Frequently asked questions about Data Dashboards",
    "dashFaq1Q": "What data can I process in a dashboard?",
    "dashFaq1A": "Almost any data: sales figures, website statistics, customer satisfaction, financial data, inventory, social media metrics and more. We advise which KPIs are most relevant for your business.",
    "dashFaq2Q": "Do I need technical knowledge to use a dashboard?",
    "dashFaq2A": "No, our dashboards are designed for ease of use. You open them in your browser and immediately see your data. We also provide a brief explanation upon delivery.",
    "dashFaq3Q": "How long does it take to build a dashboard?",
    "dashFaq3A": "A basic dashboard can be operational within a week. More complex dashboards with multiple data sources take a bit more time. We always provide a time estimate in advance.",
    "dashFaq4Q": "What does a data dashboard cost?",
    "dashFaq4A": "Costs depend on complexity and the number of data sources. Contact us for a non-binding conversation and a custom quote.",
    "dashRelatedTitle": "Related services",

    // --- OVER MIJ SUBPAGE ---
    "overMijPageTitle": "About me - Allard Veldman | Creation+Alt+Fix",
    "overMijMetaDesc": "Allard Veldman, the driving force behind Creation+Alt+Fix. Discover my passion for Software-Only services, AI automation, and lightning-fast websites in Groningen.",
    "overMijBadge": "Allard Veldman",
    "overMijH1": "About <span>Me</span>",
    "overMijLead": "The driving force behind Creation+Alt+Fix. I make complex technology accessible and usable for SMEs and individuals in and around Groningen.",
    "overMijLinkedInBtn": "Connect on LinkedIn",
    "overMijMissieTitle": "My Mission & Background",
    "overMijMissieP1": "Technology should work for you, not the other way around. With a personal approach and results-driven solutions, I ensure that digital challenges become clear and manageable.",
    "overMijMissieP2": "My background in mathematics forms the foundation of my approach. As a former Dutch Mathematical Olympiad prizewinner and author for Pythagoras mathematics magazine, I approach IT challenges with strong analytical rigor. I quickly understand complex systems and turn them into efficient solutions.",
    "overMijMissieP3": "My focus is strictly on <strong style=\"color: #fff;\">Software-Only Services</strong>. This includes software support, cloud environments (Azure), and AI implementations. <span style=\"color: var(--color-primary-light);\">Please note: I no longer perform computer or hardware repairs.</span>",
    "overMijFocusTitle": "Focus & Services",
    "overMijFocusLi1": "AI-driven solutions & tools (like the Home Buyer Intelligence app)",
    "overMijFocusLi2": "Smart automation (client portals, proposal generators)",
    "overMijFocusLi3": "Data dashboards for instant business insights",
    "overMijFocusLi4": "Lightning-fast websites (from €99)",
    "overMijTechTitle": "Tech Stack & Approach",
    "overMijTechP": "I combine years of IT experience with the latest AI developments to build innovative, robust solutions. I prefer working with solid, fast technologies like Vanilla JS, Firebase, and Tailwind/CSS. This guarantees applications that look professional and perform flawlessly under the hood. My communication is always professional, accessible, innovative, and transparent.",
    "overMijContactTitle": "Ready to work together?",
    "overMijContactP": "Transparent, professional, and innovative. Contact me for a no-obligation introduction.",
    "overMijContactBtn": "Start your project",

    // --- WORKFLOW SECTION ---
    "workflowSectionSubtitle": "How We Work",
    "workflowSectionTitle": "Transparent in <span>5 Clear Steps</span>",
    "wfStep1Title": "1. Smart Intake & Scope",
    "wfStep1Desc": "Automated analysis of goals, domain status and design preferences via our 5-step wizard. Instant account & project provisioning.",
    "wfStep2Title": "2. Transparent Proposal",
    "wfStep2Desc": "Clear deliverables and tariffs. Sign digitally in the portal with 1 click and download as official PDF quotation.",
    "wfStep3Title": "3. Design & Concept Review",
    "wfStep3Desc": "Interactive wireframes and layout previews. Visual alignment on vibe and structure before starting development.",
    "wfStep4Title": "4. Live Staging & Feedback",
    "wfStep4Desc": "Unique: switch live between desktop, tablet and mobile. Pin point-and-click feedback annotations directly on elements.",
    "wfStep5Title": "5. Launch & Handover",
    "wfStep5Desc": "Full DNS cutover, Pi-Boekhouding invoice insights and handover via our interactive system documentation guide.",
    "workflowPortalBannerTitle": "Always 100% Control via Your Dedicated Client Portal",
    "workflowPortalBannerDesc": "No slow email chains or ambiguity. Track every update, test your site in the emulator and approve documents in one central hub.",
    "workflowPortalBannerBtn": "Explore Client Portal Live",

    // --- SERVICE PORTAL USP BOX ---
    "serviceUspTitle": "Includes Access to Your Dedicated Client Portal",
    "serviceUspDesc": "At Creation+Alt+Fix, every project comes with a dedicated client account on our live portal. You maintain 100% clarity and control:",
    "serviceUspF1Title": "5-Stage Real-Time Progress",
    "serviceUspF1Desc": "Track milestones from intake to launch in real-time.",
    "serviceUspF2Title": "Live Staging & Feedback Pins",
    "serviceUspF2Desc": "Pin annotations directly onto desktop, tablet, and mobile views.",
    "serviceUspF3Title": "Proposals & Pi-Invoices",
    "serviceUspF3Desc": "1-click digital signature, jsPDF download, and invoice insights.",
    "serviceUspF4Title": "Direct Chat & System Guide",
    "serviceUspF4Desc": "Exchange revisions and consult our interactive documentation guide.",

    // --- CRM FLAGSHIP CASE STUDY SUBPAGE ---
    "crmCasePageTitle": "Creation+Alt+Fix CRM & Portal – Flagship Case Study | Creation+Alt+Fix",
    "crmCaseMetaDesc": "Case Study: How Creation+Alt+Fix engineered a zero-framework CRM & Client Portal featuring 5-stage tracking, live staging feedback pins, jsPDF proposals and Pi-Boekhouding sync.",
    "breadcrumbCrmCase": "Creation+Alt+Fix CRM Case Study",
    "crmHeroBadge": "Flagship Software & CRM Architecture Case Study",
    "crmH1": "Creation+Alt+Fix CRM — <span>Real-time Portal & Staging Suite</span>",
    "crmLead": "How we engineered a zero-framework, end-to-end CRM ecosystem featuring real-time 5-stage project tracking, an interactive staging emulator with point-and-click pins, automated jsPDF proposals, and Pi-Boekhouding sync.",
    "crmChallengeTitle": "The Challenge: From 'Black Box' to 100% Transparency",
    "crmChallengeP1": "At traditional web development and IT agencies, clients often experience a 'black box': after the intake come slow email chains, ambiguous proposals, and static PDF mockups where giving feedback via screenshots is frustrating and inefficient.",
    "crmChallengeP2": "<strong>Our Vision:</strong> A bespoke, ultra-fast CRM and Client Portal digitizing the entire journey from intake to deployment and maintenance. Clients receive a secure account immediately upon intake and can observe real-time progress.",
    "crmChallengeP3": "No bulky frameworks with heavy runtime overhead, but clean Vanilla JavaScript coupled with Firebase Firestore for sub-50ms sync and Pi-Boekhouding for automated invoice items and fixed pricing (€150/yr all-in hosting).",
    "crmStat1": "Fully Automated Pipeline",
    "crmStat2": "Real-time Firestore Sync",
    "crmStat3": "Zero-Framework Client Overhead",
    "crmStat4": "Transparency in Quotation & Staging",
    "crmPillarsTitle": "Four Technical Pillars of the <span>Creation+Alt+Fix Ecosystem</span>",
    "crmPillarsDesc": "The portal combines state-of-the-art web technologies to deliver a frictionless, high-converting, and exceptionally professional experience:",
    "crmF1Title": "Live Staging & Point-and-Click Annotations",
    "crmF1Desc": "Clients switch live between Desktop, Tablet, and Mobile viewports. In 'Feedback Mode', they click directly on elements to place pins with categories (Design, Copy, Feature, or Bug) syncing directly to the admin workbench.",
    "crmF2Title": "jsPDF Engine & Pi-Boekhouding Sync",
    "crmF2Desc": "Dynamic rendering of official PDF proposals directly in the browser. 1-click digital signature. Connected to our Raspberry Pi accounting system for live invoice items, payment status, and fixed hosting/APK subscriptions.",
    "crmF3Title": "Zero-Framework Vanilla JS Architecture",
    "crmF3Desc": "Engineered without bulky SPA frameworks. Pure ES6+ modules ensure instant load times, zero bundler latency, and flawless 100/100 Google Lighthouse scores across devices.",
    "crmF4Title": "Multi-Step Intake with Contextual Pre-Fill",
    "crmF4Desc": "The 5-step wizard parses URL query parameters from the main website (e.g. ?service=ai-automation or ?service=dashboards). On submission, it provisions a Firebase Auth account and dispatches an automated EmailJS welcome email.",
    "crmPipelineTitle": "The 5-Phase Client Journey in the Portal",
    "crmPipelineDesc": "From initial intake to final cutover, the system guides the client step-by-step through the process:",
    "crmStep1Detail": "Automated analysis of goals, domain status, and design preferences. Instant account and Firestore creation.",
    "crmStep2Detail": "Review deliverables and rates, digital signing via modal, and instant download of the official PDF quotation.",
    "crmStep3Detail": "Interactive wireframe and UI review. Visual approval before commencing software engineering.",
    "crmStep4Detail": "Live responsive viewport emulator. Clients place feedback pins on buttons, headings, and images.",
    "crmStep5Detail": "DNS cutover, Pi-invoice overview, and handover via the live system documentation guide.",
    "crmTechTitle": "Applied Technologies & Stack",
    "crmCtaTitle": "Want a bespoke platform or software application built for your business?",
    "crmCtaDesc": "Creation+Alt+Fix designs and delivers high-performance software, dashboards, and portals that transform your operations.",
    "crmCtaIntakeBtn": "Start Your Software Intake",
    "crmCtaLiveBtn": "Experience Client Portal",
    "crmCtaContactBtn": "Get in Touch",

    // --- PROJECTEN SHOWCASE SUBPAGE ---
    "projectenPageTitle": "Projects & Portfolio - Websites, AI & Custom Software | Creation+Alt+Fix",
    "projectenMetaDesc": "View our portfolio of websites, webshops, AI tools and custom software. From local business websites to a custom CRM system — built with the power of AI.",
    "projectenH1": "Our <span>Projects</span> & Portfolio",
    "projectenLead": "From local business websites and webshops to AI-driven applications and a custom CRM system. Discover what we build — and what we can create for you.",
    "projectenStatProjects": "Projects delivered",
    "projectenStatSatisfaction": "Client satisfaction",
    "projectenStatTech": "Technologies",
    "projectenCaseStudyTitle": "Featured: <span>Custom CRM & Client Portal</span>",
    "caseStudyFlagshipBadge": "🏆 Flagship Project",
    "projectenCaseLabel": "Case Study — Internal System & Product",
    "projectenCaseTitle": "Creation+Alt+Fix CRM & Client Portal",
    "projectenCaseDesc": "A fully custom-built end-to-end CRM and client portal that automates the entire journey: from AI intake and jsPDF proposals to a live staging emulator with point-and-click annotations and Pi-Boekhouding invoice sync.",
    "projectenCaseF1": "Real-time Firebase Firestore",
    "projectenCaseF2": "Live Staging & Point-and-Click Pins",
    "projectenCaseF3": "jsPDF Quotation & Digital Signature",
    "projectenCaseF4": "Pi-Boekhouding Invoice Sync",
    "projectenCaseF5": "5-Phase Interactive Pipeline",
    "projectenCaseF6": "Multi-Project Switcher & Chat",
    "projectenCaseDeepDive": "Read Full Case Study",
    "projectenCaseCta": "Experience Client Portal",
    "projectenGridTitle": "All <span>Projects</span>",
    "filterAll": "All",
    "filterWebsites": "Websites",
    "filterWebshops": "Webshops",
    "filterAI": "AI & Tools",
    "filterLanding": "Landing Pages",
    "filterCountLabel": "projects",
    "catWebsite": "Website",
    "catWebshop": "Webshop",
    "catAITool": "AI & Tool",
    "catLanding": "Landing Page",
    "catHosting": "🚀 Hosting & Migration",
    "pVisitSite": "Visit Live",
    "pVisitShop": "Visit Webshop",
    "pViewCase": "View Case",
    "pArnoldTitle": "Arnold Doornbos (Arnold Design)",
    "pArnoldDesc": "Exclusive portfolio website for artist and graphic designer Arnold Doornbos. Features interactive showcases for graphic design, typography & portraits, and monumental stained glass art (Minerva Art Academy).",
    "pAngelaTitle": "Angela Stenekes",
    "pAngelaDesc": "A modern, responsive website for a local hairdresser with writing ambitions. Including a story section, appointment system and SEO optimization.",
    "pSiegTitle": "Bakkertje Sieg",
    "pSiegDesc": "A fully functional webshop for selling recipes. Including recipe catalog, shopping cart, payment integration and customer reviews.",
    "pScholteTitle": "Scholte-Elektrotechniek",
    "pScholteDesc": "A custom-built one-pager for an electrician in Groningen. All information compactly on one page, optimized for speed and mobile use.",
    "pStenekesTitle": "Stenekes Rioolspecialist",
    "pStenekesDesc": "Informative business website for a drain specialist. Directly visible via Google thanks to local SEO and structured content about services and rates.",
    "pWillaTitle": "Naaiatelier Willa",
    "pWillaDesc": "Stylish website for a sewing studio. Gallery with portfolio of creations, service overview and contact options — all with a warm, artisan feel.",
    "pCapybaraTitle": "Capybara Culture",
    "pCapybaraDesc": "Creative website about NFT collections and digital art. Including gallery, blockchain technology explanation and community links.",
    "pPomppopTitle": "PompPop",
    "pPomppopDesc": "High-converting registration page for an event. Simple registration form, event details and atmosphere images — all aimed at maximum conversion.",
    "pLivianTitle": "Livian Design",
    "pLivianDesc": "Portfolio website for an interior designer. Showcase of projects, atmosphere images and contact form with a stylish, minimalist design.",
    "pBesselingTitle": "Besseling Installatietechniek",
    "pBesselingDesc": "Professional business website for an installation company. Overview of services, project references and direct contact options for quote requests.",
    "pQolipaTitle": "Qolipa",
    "pQolipaDesc": "Business website with a focus on professional appearance and user-friendliness. Built with WordPress and optimized for search engines.",
    "pFtruckTitle": "F-Truck Store (ftruckstore.nl)",
    "pFtruckDesc": "Existing webshop and platform for Ford F-Series trucks and parts successfully migrated to our managed hosting environment. Including secure database migration, DNS & mail routing configuration, and 24/7 uptime monitoring.",
    "pHbiTitle": "Home Buyer Intelligence",
    "pHbiDesc": "AI-powered property analysis with risk scoring and bidding strategy for the Dutch housing market. Upload documents, receive a complete analysis within minutes.",
    "pWindTitle": "Wind – Cloud Sync Tools",
    "pWindDesc": "Sync files between OneDrive, Google Drive, iCloud and Google Photos. With integrity verification, multi-threaded uploads and real-time monitoring.",
    "projectenCtaTitle": "Your project next?",
    "projectenCtaText": "Whether it's a website, webshop, AI tool or custom software — we build it. Get in touch for a no-obligation conversation about your idea.",

    // --- HOME BUYER INTELLIGENCE SUBPAGE ---
    "hbiPageTitle": "Home Buyer Intelligence - AI Property Analysis | Creation+Alt+Fix",
    "hbiH1": "Home Buyer <span>Intelligence</span>",
    "hbiLead": "AI-powered property analysis that helps home buyers make the right decision. Upload your documents, receive a risk score and a personalized bidding strategy — fully GDPR-compliant.",
    "hbiH2Problem": "The problem: bidding blind on the housing market",
    "hbiP1": "Buying a house in the Netherlands is exciting, but also risky. Buyers receive stacks of documents — VvE reports, Kadaster extracts, energy labels, legal disclosures — but often lack the expertise to properly assess them. The result? Overbidding, missing hidden defects, or losing out on opportunities.",
    "hbiH2Solution": "The solution: AI that analyses your documents",
    "hbiP2": "Home Buyer Intelligence analyses your property documents with Google Gemini AI and delivers a complete risk assessment in minutes. You receive a weighted risk score, insight into structural, legal, financial and environmental risks, and a personalized bidding strategy. So you can bid with confidence.",
    "hbiH2Features": "What makes this product <span>unique?</span>",
    "hbiCard1Title": "AI Document Analysis & Revisor Agent",
    "hbiCard1P": "Upload up to 15 documents at once via our robust document management system. Gemini AI and our new AI revisor agent (Jules) automatically extract and verify all relevant information from VvE reports and cadastral records.",
    "hbiCard2Title": "Risk Scoring",
    "hbiCard2P": "Weighted risk assessment across four categories: structural, legal, financial and environmental. Clear score from 0–100.",
    "hbiCard3Title": "Bidding Strategy",
    "hbiCard3P": "Receive a risk-adjusted bidding recommendation with minimum, recommended and maximum bid — based on market data and property condition.",
    "hbiCard4Title": "Secure & GDPR-Compliant",
    "hbiCard4P": "Your data is deleted after 24 hours and strictly protected by IP-based rate limiting middleware. Secure payments, polling protection, and session isolation ensure maximum privacy and stability.",
    "hbiCard5Title": "Dutch Housing Market",
    "hbiCard5P": "Specifically built for the Dutch market. Integration with BAG, Kadaster, EP-Online and CBS for current market data.",
    "hbiCard6Title": "Visual Dashboard",
    "hbiCard6P": "Dark-themed dashboard with interactive charts, risk overviews and market analysis. Ready to use after analysis.",
    "hbiH2HowItWorks": "How does it work?",
    "hbiStep1Title": "Upload Documents",
    "hbiStep1P": "Drag your property documents into the upload zone. Up to 15 files at once, maximum 25 MB per file.",
    "hbiStep2Title": "AI Analysis",
    "hbiStep2P": "Google Gemini AI reads and understands your documents. It extracts property details, VvE financials and legal risks.",
    "hbiStep3Title": "Risk Assessment",
    "hbiStep3P": "The results are processed by our risk scoring model. You receive a weighted score per category.",
    "hbiStep4Title": "Bidding Advice",
    "hbiStep4P": "Based on the risk analysis and market data, you receive personalized bidding advice with three scenarios.",
    "hbiH2Tech": "Built with proven technology",
    "hbiTechP": "A robust, scalable architecture that is ready for production and enterprise use.",
    "hbiTechFrontend": "Frontend",
    "hbiTechBackend": "Backend",
    "hbiTechAIData": "AI & Data",
    "hbiTechInfra": "Infrastructure",
    "hbiCtaTitle": "Interested in this solution?",
    "hbiCtaText": "Want a similar AI application for your industry? Or curious about a demo? Get in touch, no obligation.",
    "hbiCtaDemo": "View Live Demo",
    "hbiCtaMail": "Get in Touch",

    // --- WIND SUBPAGE ---
    "windPageTitle": "Wind – Cloud Sync Tools | Creation+Alt+Fix",
    "windH1": "Wind – Cloud <span>Sync Tools</span>",
    "windLead": "Seamlessly sync your files between OneDrive, Google Drive, iCloud and Google Photos. With integrity verification, multi-threaded uploads and a browser interface for real-time monitoring.",
    "windH2Problem": "The problem: fragmented cloud storage",
    "windP1": "Photos on iCloud, documents on OneDrive, backups on Google Drive. Most people have their files scattered across multiple cloud services. Manual syncing is time-consuming, error-prone and offers no guarantee that files arrive intact. Existing tools rarely support all major platforms at once.",
    "windH2Solution": "The solution: one tool for all your clouds",
    "windP2": "Wind connects OneDrive, Google Drive, iCloud and Google Photos in one powerful sync engine. Upload, move or copy files between any combination of services — with automatic integrity checks via SHA256, MD5 or file size. Not a single file gets lost.",
    "windH2Features": "Why <span>Wind?</span>",
    "windCard1Title": "Multi-Cloud Support",
    "windCard1P": "Sync between OneDrive, Google Drive, iCloud Drive and Google Photos. Every combination of source and destination works out-of-the-box.",
    "windCard2Title": "Integrity Verification",
    "windCard2P": "Every file is verified after transfer. SHA256 for OneDrive, MD5 for Google Drive, file size for iCloud. Zero data loss.",
    "windCard3Title": "Multi-Threaded Uploads",
    "windCard3P": "Configurable worker threads for parallel uploading. Batch processing via the Google Photos API reduces API calls by a factor of 50.",
    "windCard4Title": "Browser Interface",
    "windCard4P": "FastAPI-powered web UI with real-time log streaming via Server-Sent Events. Configure syncs through forms, no CLI knowledge needed.",
    "windCard5Title": "Smart Deduplication",
    "windCard5P": "Three dedup modes: filename, hash or both. Prevent duplicate uploads and save storage space automatically.",
    "windCard6Title": "Safe Move Mode",
    "windCard6P": "Move files with a Copy-Verify-Delete strategy. Source files are only deleted after successful verification.",
    "windH2HowItWorks": "How does it work?",
    "windStep1Title": "Configure",
    "windStep1P": "Choose source and destination service via the web interface or CLI. Set options like move mode, dry-run or dedup strategy.",
    "windStep2Title": "Download",
    "windStep2P": "Files are recursively fetched from the source and temporarily stored locally. The folder structure is preserved.",
    "windStep3Title": "Upload & Verify",
    "windStep3P": "Files are uploaded to the destination and automatically verified via checksums. Errors are reported immediately.",
    "windStep4Title": "Report",
    "windStep4P": "A summary shows the number of transferred, verified and failed files. Everything is logged for audit.",
    "windH2Tech": "The technology behind Wind",
    "windTechP": "Built with proven technologies for reliability and performance at large volumes.",
    "windTechCore": "Core Engine",
    "windTechWeb": "Web Interface",
    "windTechCloudAPIs": "Cloud API's",
    "windTechInfra": "Infrastructure",
    "windCtaTitle": "Interested in cloud synchronisation?",
    "windCtaText": "Want a similar integration tool for your organisation? Or need a custom sync solution? Get in touch, no obligation.",
    "windCtaMail": "Get in Touch",
    "windCtaCall": "Call Us",

    // --- PRIVACY POLICY ---
    "privacyPageTitle": "Privacy Policy - Creation+Alt+Fix | IT, AI & Web Design",
    "privacyMetaDesc": "Privacy policy of Creation+Alt+Fix (Allard Veldman). Read how we carefully handle personal data in accordance with the AVG / GDPR legislation.",
    "privacyBadge": "AVG / GDPR Compliance",
    "privacyH1": "Privacy Policy",
    "privacyLastUpdated": "Last updated: August 25, 2026",
    "privacyH2_1": "1. Who are we?",
    "privacyP1_1": "Creation+Alt+Fix is a sole proprietorship established in Hoogezand, registered with the Dutch Chamber of Commerce under number <strong>99986191</strong>. We provide IT consultancy, custom software development, AI automation, and web design.",
    "privacyP1_2": "<strong>Contact Information:</strong><br>Creation+Alt+Fix (attn. Allard Veldman)<br>Hoofdstraat 60b, 9601 EJ Hoogezand, Netherlands<br>Email: <a href=\"mailto:info@creationaltfix.nl\" style=\"color: var(--color-accent);\">info@creationaltfix.nl</a><br>Phone: <a href=\"tel:+31619135453\" style=\"color: var(--color-accent);\">+31 6 19135453</a>",
    "privacyH2_2": "2. Which personal data do we process?",
    "privacyP2_1": "We only process personal data that you provide to us directly when you contact us, request a quotation, or use our services:",
    "privacyLi2_1": "First and last name",
    "privacyLi2_2": "Company name (if applicable)",
    "privacyLi2_3": "Email address and telephone number",
    "privacyLi2_4": "Address and invoicing details (for project contracts)",
    "privacyLi2_5": "Project specifications and correspondence",
    "privacyLi2_6": "IP address and anonymized browser metadata (when visiting our website)",
    "privacyH2_3": "3. Why do we process this data?",
    "privacyP3_1": "We process your data for the following purposes:",
    "privacyLi3_1": "<strong>Service Delivery & Proposals:</strong> To contact you, prepare quotes, and execute agreed software or web design deliverables.",
    "privacyLi3_2": "<strong>Invoicing & Accounting:</strong> To comply with our legal and tax administration obligations.",
    "privacyLi3_3": "<strong>Website Improvement & Security:</strong> To guarantee optimal performance, functionality, and security of our online platform.",
    "privacyH2_4": "4. Legal Basis for Processing",
    "privacyP4_1": "We process personal data solely on the legal grounds established by the GDPR: contract execution, compliance with statutory legal obligations, legitimate business interests, or your explicit consent.",
    "privacyH2_5": "5. Retention Periods",
    "privacyP5_1": "We do not retain your data longer than strictly necessary. Contact inquiries and general project correspondence are retained for a maximum of 2 years. Financial records and invoices are stored for 7 years pursuant to Dutch tax law requirements.",
    "privacyH2_6": "6. Sharing Data with Third Parties",
    "privacyP6_1": "Creation+Alt+Fix <strong>never</strong> sells your data to third parties. We only share data with verified data processors (such as hosting providers, email servers, and cloud infrastructure) strictly necessary for our services. We maintain GDPR-compliant data processing agreements with all third-party providers.",
    "privacyH2_7": "7. Cookies & Analytics",
    "privacyP7_1": "Our website utilizes functional cookies for smooth performance and anonymized analytical cookies for usage metrics. You may disable or delete cookies anytime via your browser settings.",
    "privacyH2_8": "8. Your Rights",
    "privacyP8_1": "Under the GDPR, you retain the right at all times to:",
    "privacyLi8_1": "Request access to your stored personal data.",
    "privacyLi8_2": "Request correction or completion of inaccurate records.",
    "privacyLi8_3": "Request deletion of your personal data ('right to be forgotten').",
    "privacyLi8_4": "Object to data processing or request data portability.",
    "privacyP8_2": "To exercise any of these rights, email us at <a href=\"mailto:info@creationaltfix.nl\" style=\"color: var(--color-accent);\">info@creationaltfix.nl</a>. We respond within 14 days.",
    "privacyH2_9": "9. Security",
    "privacyP9_1": "We take appropriate technical and organizational measures to prevent misuse, loss, unauthorized access, and unauthorized disclosure. Our website utilizes encrypted SSL/TLS connections (HTTPS) and strict Content Security Policies.",

    // --- TERMS & CONDITIONS ---
    "termsPageTitle": "Terms and Conditions - Creation+Alt+Fix | IT, AI & Web Design",
    "termsMetaDesc": "Terms and conditions of Creation+Alt+Fix (Allard Veldman). Clear terms regarding web design, AI automation, software engineering, proposals, and payments.",
    "termsBadge": "Clear Business Agreements",
    "termsH1": "Terms and Conditions",
    "termsLastUpdated": "Last updated: August 25, 2026",
    "termsArt1Title": "Article 1. Definitions",
    "termsP1_1": "In these general terms and conditions, the following definitions apply:",
    "termsLi1_1": "<strong>Creation+Alt+Fix:</strong> The contractor, based in Hoogezand, registered with the Dutch Chamber of Commerce under number 99986191.",
    "termsLi1_2": "<strong>Client:</strong> The natural person or legal entity entering into an agreement with Creation+Alt+Fix.",
    "termsLi1_3": "<strong>Services:</strong> All software development, web design, AI automations, dashboards, consultancy, and technical support provided by Creation+Alt+Fix.",
    "termsArt2Title": "Article 2. Applicability & Quotations",
    "termsP2_1": "1. These terms apply to all offers, quotations, deliverables, and agreements between Creation+Alt+Fix and the Client.<br>2. All quotations are non-binding and valid for 30 days unless explicitly stated otherwise in writing.<br>3. An agreement is established once the Client approves the quotation in writing, via email, or digitally through the client status portal.",
    "termsArt3Title": "Article 3. Execution of Deliverables",
    "termsP3_1": "1. Creation+Alt+Fix executes every agreement to the best of its knowledge and ability, conforming to professional craftsmanship standards.<br>2. Stated delivery deadlines serve as target timelines and do not constitute strict deadlines unless explicitly agreed upon in writing.<br>3. The Client ensures that all information, credentials, documents, and materials necessary for execution are provided accurately and in a timely manner.",
    "termsArt4Title": "Article 4. Scope Changes & Additional Work",
    "termsP4_1": "1. If project modifications or scope expansions become necessary during execution, both parties will confer in a timely manner.<br>2. Additional work will be invoiced on a subsequent calculation basis at the agreed hourly rate or via an addendum quotation upon client approval.",
    "termsArt5Title": "Article 5. Pricing & Payments",
    "termsP5_1": "1. All stated rates for commercial clients are exclusive of VAT unless explicitly indicated otherwise.<br>2. Invoices are payable within 14 days of the invoice date.<br>3. For project engagements, Creation+Alt+Fix may request an initial 50% deposit upon kickoff, with the remaining balance due upon final delivery.",
    "termsArt6Title": "Article 6. Intellectual Property",
    "termsP6_1": "1. Unless agreed otherwise in writing, Creation+Alt+Fix retains intellectual property rights to all developed codebases, templates, scripts, and custom architectures.<br>2. Upon full settlement of all invoice balances, the Client receives a non-exclusive, perpetual license to use the delivered end product.",
    "termsArt7Title": "Article 7. Liability & Warranty",
    "termsP7_1": "1. Creation+Alt+Fix is solely liable for direct damages resulting directly from an attributable failure in fulfilling the agreement.<br>2. Total liability of Creation+Alt+Fix is in all circumstances limited to the total amount invoiced for the specific project assignment.<br>3. Delivered websites and custom software solutions include a complimentary 30-day warranty period following delivery for free remediation of any technical defects.",
    "termsArt8Title": "Article 8. Applicable Law & Jurisdiction",
    "termsP8_1": "1. All legal relationships to which Creation+Alt+Fix is a party are governed exclusively by Dutch law.<br>2. Disputes shall be submitted exclusively to the competent court in the judicial district of Northern Netherlands.",

    // --- 404 PAGE ---
    "error404PageTitle": "404 - Page Not Found | Creation+Alt+Fix",
    "error404MetaDesc": "Oops! This page does not exist or has been moved. Return to Creation+Alt+Fix home.",
    "error404Title": "404 - <span>Page Not Found</span>",
    "error404Desc": "The page you are looking for does not exist or has been moved.",
    "error404HomeBtn": "Back to Home",

    // --- LIVE DEMO PAGE ---
    "liveDemoPageTitle": "Live Demo: How a Website is Built - Creation+Alt+Fix",
    "liveDemoMetaDesc": "A live, interactive timeline demonstrating how a web application is constructed from raw HTML, styled with CSS, and made functional with JavaScript.",
    "liveDemoH1": "The Birth of a <span>Website</span>",
    "liveDemoSubtitle": "Scroll down to see how simple text transforms into an interactive web page.",
    "liveDemoBackBtn": "Back to Homepage",
    "liveDemoStep1Title": "The Blueprint: Pure HTML",
    "liveDemoStep1Desc": "Everything begins with HTML (HyperText Markup Language). This is the page skeleton. It defines structure and content — headings, paragraphs, buttons — without visual styling.",
    "liveDemoStep2Title": "The First Layer: Basic CSS",
    "liveDemoStep2Desc": "With CSS (Cascading Style Sheets) we add styling. We start with typography, colors, and padding to make text readable and structured.",
    "liveDemoStep3Title": "Design & Layout: Advanced CSS",
    "liveDemoStep3Desc": "Now we craft visual appeal. We center the container, add elevation shadows, and style the button for intuitive clickability.",
    "liveDemoStep4Title": "The Magic: JavaScript",
    "liveDemoStep4Desc": "JavaScript adds interactivity — the brain of the webpage. Here we make the button functional. Click the \"Buy now\" button in the preview to test!",
    "liveDemoPreviewTitle": "My Product",
    "liveDemoPreviewText": "This is an exceptional product designed to elevate your workflow. Built with premium standards for durability.",
    "liveDemoPreviewBtn": "Buy now",
    "liveDemoPreviewBoughtText": "Thank you for your purchase!",
    "liveDemoFooterText": "This is the final result: a styled, responsive, and interactive web component.",
    "liveDemoFooterBack": "Back to Creation+Alt+Fix",

    // --- SERVICE SUBPAGE SHARED KEYS ---
    "relITTitle": "Software Support & System Admin",
    "relITP": "Reliable software support, network management, and system troubleshooting.",
    "relAITitle": "Smart Automation & AI",
    "relAIP": "Workflow automation, conversational agents, and custom AI tools.",
    "relWebTitle": "Custom Web Development",
    "relWebP": "Modern, responsive websites and e-commerce stores from €99.",
    "relDashTitle": "Data Dashboards & Insights",
    "relDashP": "Interactive BI dashboards that bring your business data to life.",
    "ctaTitle": "Ready to get started?",
    "ctaText": "Have questions or ready to launch your project? Get in touch today.",
    "ctaIntake": "Start Intake Form",
    "ctaCall": "Call Us",
    "ctaMail": "Contact Us",

    // --- LANDING PAGE ---
    "landingPageTitle": "Software Support & AI Automation - Creation+Alt+Fix",
    "landingMetaDesc": "Ready for the next step? Creation+Alt+Fix helps your business with web development, software support and smart AI automation. Request a free consultation now.",
    "landingBackBtn": "Back to main website",
    "landingBadge": "New Client Offer",
    "landingH1": "Smart Web Development & <br><span class=\"gradient-text\">AI Automation</span>",
    "landingSubtitle": "Spending too much time on administrative overhead? Let Creation+Alt+Fix streamline your processes. We build lightning-fast websites, secure webshops, and connect AI systems to do the heavy lifting.",
    "landingCtaBtn": "Start Your Project Today",
    "landingTrustPoints": "Free Intake &nbsp;&bull;&nbsp; Remote Worldwide &nbsp;&bull;&nbsp; Direct Contact",
    "landingFeat1Title": "Websites & Portals",
    "landingFeat1Desc": "From high-converting landing pages to complex, secure custom client portals. Built for speed, security, and search engine ranking.",
    "landingFeat2Title": "Smart AI Integrations",
    "landingFeat2Desc": "Have AI draft email proposals or parse incoming documents. We connect smart LLM models directly to your workflow tools.",
    "landingFeat3Title": "Software Support",
    "landingFeat3Desc": "Experiencing issues with current systems? We provide robust software support and cloud solutions (like Tailscale and Azure) to optimize your online stack.",
    "landingSocialProofTitle": "Worldwide, Always Accessible",
    "landingSocialProofDesc": "Operating from the Netherlands, we serve clients globally through secure, fast remote workflows. Our communication is clear, direct, and free of unnecessary technical jargon.",
    "landingSocialProofCta": "Save time, submit your project intake now"
        }
    };

    var currentLanguage = 'nl';

    function applyTranslations(lang) {
        if (!translations[lang]) return;
        currentLanguage = lang;
        document.documentElement.lang = lang;

        // Keys containing HTML markup — must use innerHTML; all others use textContent for XSS safety
        var htmlKeys = new Set([
            'heroHeadline', 'aiServicesTitle', 'learnMore', 'webDesignTitle',
            'aiOplossingenTitle', 'portfolioTitle', 'faqTitle', 'githubTitle',
            'trustTitle', 'contactTitle', 'dienstenOverviewTitle', 'dienstenOverviewH1',
            'itH1', 'itP3', 'itP4', 'aiH1', 'aiP3', 'aiP4',
            'webH1', 'webP3', 'webP4', 'dashH1', 'dashP3', 'dashP4',
            'hbiH1', 'hbiH2Features', 'windH1', 'windH2Features',
            'overMijH1', 'overMijMissieP3', 'projectenH1', 'projectenCaseStudyTitle',
            'projectenGridTitle', 'termsH1', 'privacyH1', 'landingH1', 'liveDemoH1',
            'workflowSectionTitle', 'crmH1', 'crmChallengeP2', 'crmPillarsTitle'
        ]);

        document.querySelectorAll('[data-translate-key]').forEach(function(element) {
            var key = element.getAttribute('data-translate-key');
            if (translations[lang][key] !== undefined) {
                if (htmlKeys.has(key)) {
                    element.innerHTML = translations[lang][key];
                } else {
                    element.textContent = translations[lang][key];
                }
            }
        });

        document.querySelectorAll('[data-translate-key-placeholder]').forEach(function(element) {
            var key = element.getAttribute('data-translate-key-placeholder');
            if (translations[lang][key] !== undefined) {
                element.placeholder = translations[lang][key];
            }
        });
        document.querySelectorAll('[data-translate-key-aria]').forEach(function(element) {
            var key = element.getAttribute('data-translate-key-aria');
            if (translations[lang][key] !== undefined) {
                element.setAttribute('aria-label', translations[lang][key]);
            }
        });

        var pageTitleElement = document.querySelector('title[data-translate-key]');
        if (pageTitleElement) {
            var key = pageTitleElement.getAttribute('data-translate-key');
            if (translations[lang][key]) {
                document.title = translations[lang][key];
            }
        }

        document.querySelectorAll('meta[data-translate-key][name="description"]').forEach(function(meta) {
            var key = meta.getAttribute('data-translate-key');
            if (translations[lang][key]) {
                meta.setAttribute('content', translations[lang][key]);
            }
        });

        document.querySelectorAll('#language-switcher .lang-btn, .language-switcher .lang-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
    }

    function changeLanguage(lang) {
        applyTranslations(lang);
        localStorage.setItem('preferredLanguage', lang);
        if (typeof fetchRepos === 'function' && document.getElementById('repo-container')) {
            var repoContainer = document.getElementById('repo-container');
            if (!repoContainer.querySelector('.repo-card')) {
                fetchRepos();
            }
        }
    }

    function initializeLanguage() {
        var savedLang = localStorage.getItem('preferredLanguage');
        var browserLang = (navigator.language || 'nl').split('-')[0];
        var initialLang = 'nl';
        if (savedLang && translations[savedLang]) {
            initialLang = savedLang;
        } else if (translations[browserLang]) {
            initialLang = browserLang;
        }
        applyTranslations(initialLang);
        localStorage.setItem('preferredLanguage', initialLang);
    }

    initializeLanguage();

    // Event delegation for language switcher (works anytime, even after dynamic injection)
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('#language-switcher .lang-btn, .language-switcher .lang-btn');
        if (btn) {
            var lang = btn.getAttribute('data-lang');
            if (lang) {
                changeLanguage(lang);
            }
        }
    });

    // --- NAVIGATION & SMOOTH SCROLLING ---
    function scrollToHash(hash) {
        if (!hash || hash === '#') return;
        if (hash === '#hero' || hash === '#top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        var targetElement = document.querySelector(hash);
        if (targetElement) {
            var navbarHeight = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 0;
            var elementPosition = targetElement.getBoundingClientRect().top;
            var offsetPosition = elementPosition + window.pageYOffset - (navbarHeight + 10);
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    }

    // Intercept clicks on links that point to anchors on current page
    document.addEventListener('click', function(e) {
        var link = e.target.closest('#navbar a[href*="#"]');
        if (!link) return;

        var href = link.getAttribute('href');
        var url;
        try {
            url = new URL(href, window.location.origin);
        } catch (err) {
            return;
        }

        // Check if link points to current page with hash
        if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === window.location.pathname) {
            if (url.hash) {
                e.preventDefault();
                scrollToHash(url.hash);
                if (history.pushState) {
                    history.pushState(null, '', url.hash);
                }
                
                // Close mobile menu if open
                var navMenuItems = document.getElementById('nav-menu-items');
                var hamburgerBtn = document.getElementById('hamburger-menu');
                if (navMenuItems && navMenuItems.classList.contains('active')) {
                    navMenuItems.classList.remove('active');
                    if (hamburgerBtn) {
                        hamburgerBtn.setAttribute('aria-expanded', 'false');
                        var icon = hamburgerBtn.querySelector('i');
                        if (icon) {
                            icon.classList.remove('fa-times');
                            icon.classList.add('fa-bars');
                        }
                    }
                }
            }
        }
    });

    // Check if page loaded with a hash (e.g. from subpage jump like "/#ai-services")
    if (window.location.hash) {
        setTimeout(function() {
            scrollToHash(window.location.hash);
        }, 120);
    }

    // Scroll spy for active nav state
    var sections = document.querySelectorAll('.section[id]');
    var navLinksAll = document.querySelectorAll('#navbar a[href*="#"]');
    if (sections.length > 0 && navLinksAll.length > 0) {
        var scrollSpyObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var id = entry.target.getAttribute('id');
                    navLinksAll.forEach(function(link) {
                        var href = link.getAttribute('href');
                        var isMatch = href === '#' + id || href === '/#' + id;
                        link.classList.toggle('nav-active', isMatch);
                    });
                    // Highlight parent dropdown toggles
                    document.querySelectorAll('.nav-dropdown').forEach(function(dropdown) {
                        var toggle = dropdown.querySelector('.nav-dropdown-toggle');
                        if (toggle) {
                            var hasActiveItem = dropdown.querySelector('.dropdown-item.nav-active');
                            toggle.classList.toggle('nav-active', !!hasActiveItem);
                        }
                    });
                }
            });
        }, { rootMargin: '-20% 0px -75% 0px' });
        sections.forEach(function(section) { scrollSpyObserver.observe(section); });
    }

    // Current year in footer
    var currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // High-impact 3D scroll-driven reveal observer
    var fadeInElements = document.querySelectorAll('.fade-in, .reveal-up');
    var observerOptions = { root: null, rootMargin: '0px 0px -75px 0px', threshold: 0.08 };
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    window.__cafScrollObserver = observer;
    fadeInElements.forEach(function(el) { observer.observe(el); });

    // Subtle scroll-driven parallax for hero orbs
    var orb1 = document.querySelector('.hero-orb-1');
    var orb2 = document.querySelector('.hero-orb-2');
    var orb3 = document.querySelector('.hero-orb-3');
    if (orb1 || orb2 || orb3) {
        var ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
                    if (scrollY < 1200) {
                        if (orb1) orb1.style.transform = 'translate3d(0, ' + (scrollY * 0.18) + 'px, 0)';
                        if (orb2) orb2.style.transform = 'translate3d(0, ' + (scrollY * -0.12) + 'px, 0)';
                        if (orb3) orb3.style.transform = 'translate3d(0, ' + (scrollY * 0.08) + 'px, 0)';
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // Toast notification system
    function showToast(message, type) {
        type = type || 'success';
        var container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('role', 'status');
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(function() {
            toast.classList.add('visible');
        });
        setTimeout(function() {
            toast.classList.remove('visible');
            setTimeout(function() { toast.remove(); }, 300);
        }, 4000);
    }

    // Contact form
    var contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var name = document.getElementById('name').value;
            var email = document.getElementById('email').value;
            var message = document.getElementById('message').value;
            if (name && email && message) {
                showToast(translations[currentLanguage]['formThanks'], 'success');
                contactForm.reset();
            } else {
                showToast(translations[currentLanguage]['formErrorFillAll'], 'error');
            }
        });
    }

    // --- SPOTLIGHT FLOATING NOTIFICATION ---
    var spotlight = document.getElementById('case-study-notification');
    var closeSpotlightBtn = document.getElementById('close-spotlight-btn');
    if (spotlight) {
        var isDismissed = sessionStorage.getItem('spotlight_arnold_dismissed');
        if (!isDismissed) {
            setTimeout(function() {
                spotlight.classList.add('is-visible');
            }, 800);
        }
        if (closeSpotlightBtn) {
            closeSpotlightBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                spotlight.classList.remove('is-visible');
                spotlight.classList.add('is-closing');
                sessionStorage.setItem('spotlight_arnold_dismissed', 'true');
                setTimeout(function() {
                    spotlight.remove();
                }, 450);
            });
        }
    }

    // --- HAMBURGER MENU & DROPDOWN ACCORDION LOGIC ---
    var hamburgerBtn = document.getElementById('hamburger-menu');
    var navMenuItems = document.getElementById('nav-menu-items');
    var navDropdowns = document.querySelectorAll('.nav-dropdown');

    if (hamburgerBtn && navMenuItems) {
        var hamburgerIcon = hamburgerBtn.querySelector('i');
        hamburgerBtn.addEventListener('click', function() {
            navMenuItems.classList.toggle('active');
            var isActive = navMenuItems.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isActive);
            if (hamburgerIcon) {
                hamburgerIcon.classList.toggle('fa-bars', !isActive);
                hamburgerIcon.classList.toggle('fa-times', isActive);
            }
        });

        // Close mobile menu when a direct link is clicked
        navMenuItems.querySelectorAll('a:not(.nav-dropdown-toggle)').forEach(function(link) {
            link.addEventListener('click', function() {
                if (navMenuItems.classList.contains('active')) {
                    navMenuItems.classList.remove('active');
                    hamburgerBtn.setAttribute('aria-expanded', 'false');
                    if (hamburgerIcon) {
                        hamburgerIcon.classList.remove('fa-times');
                        hamburgerIcon.classList.add('fa-bars');
                    }
                }
            });
        });
    }

    // Dropdown toggle click handlers (mobile accordion + desktop toggle)
    navDropdowns.forEach(function(dropdown) {
        var toggleBtn = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var isAlreadyActive = dropdown.classList.contains('active');
                
                // Close other dropdowns on mobile/click
                navDropdowns.forEach(function(d) {
                    if (d !== dropdown) {
                        d.classList.remove('active');
                        var btn = d.querySelector('.nav-dropdown-toggle');
                        if (btn) btn.setAttribute('aria-expanded', 'false');
                    }
                });

                dropdown.classList.toggle('active', !isAlreadyActive);
                toggleBtn.setAttribute('aria-expanded', (!isAlreadyActive).toString());
            });
        }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            navDropdowns.forEach(function(d) {
                d.classList.remove('active');
                var btn = d.querySelector('.nav-dropdown-toggle');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Keyboard navigation (Escape closes dropdowns)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            navDropdowns.forEach(function(d) {
                d.classList.remove('active');
                var btn = d.querySelector('.nav-dropdown-toggle');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // --- PARTICLE SYSTEM (lightweight, disabled on mobile) ---
    var canvas = document.getElementById('hero-particles');
    if (canvas && window.innerWidth > 768) {
        var ctx = canvas.getContext('2d');
        var particles = [];
        var particleCount = 35;

        function resizeCanvas() {
            var hero = document.getElementById('hero');
            if (hero) {
                canvas.width = hero.offsetWidth;
                canvas.height = hero.offsetHeight;
            }
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        for (var i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                r: Math.random() * 2 + 1
            });
        }

        var animationId = null;
        var isCanvasVisible = true;

        function drawParticles() {
            if (!isCanvasVisible) { animationId = null; return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
                ctx.fill();

                // Draw connections
                for (var j = i + 1; j < particles.length; j++) {
                    var p2 = particles[j];
                    var dx = p.x - p2.x;
                    var dy = p.y - p2.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = 'rgba(99, 102, 241, ' + (0.1 * (1 - dist / 150)) + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            animationId = requestAnimationFrame(drawParticles);
        }

        var heroSection = document.getElementById('hero');
        if (heroSection) {
            var particleObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    isCanvasVisible = entry.isIntersecting;
                    if (isCanvasVisible && !animationId) {
                        drawParticles();
                    }
                });
            }, { threshold: 0 });
            particleObserver.observe(heroSection);
        }

        drawParticles();
    }
});

// --- GITHUB REPOS ---
function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

var githubUsername = 'McMadA';
var maxReposToShow = 6;
var repoContainer = document.getElementById('repo-container');

function renderRepos(repos) {
    repoContainer.innerHTML = '';
    if (repos.length === 0) {
        repoContainer.innerHTML = '<p class="error">Geen publieke repositories gevonden.</p>';
        return;
    }
    repos.forEach(function(repo, index) {
        var repoCard = document.createElement('div');
        repoCard.className = 'repo-card fade-in';
        repoCard.style.transitionDelay = (index * 0.12) + 's';

        var description = repo.description || 'Geen beschrijving opgegeven.';
        if (description.length > 120) {
            description = description.substring(0, 117) + '...';
        }

        var safeName = escapeHtml(repo.name);
        var safeDescription = escapeHtml(description);
        var safeLanguage = repo.language ? escapeHtml(repo.language) : '';

        repoCard.innerHTML =
            '<h3><a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer">' + safeName + '</a></h3>' +
            '<p class="repo-description">' + safeDescription + '</p>' +
            '<div class="repo-meta">' +
            (repo.language ? '<span><i class="fas fa-circle" style="color:' + getLanguageColor(repo.language) + ';"></i> ' + safeLanguage + '</span>' : '') +
            '<span><i class="fas fa-star"></i> ' + repo.stargazers_count + '</span>' +
            '<span><i class="fas fa-code-branch"></i> ' + repo.forks_count + '</span>' +
            '</div>';
        repoContainer.appendChild(repoCard);

        if (window.__cafScrollObserver) {
            window.__cafScrollObserver.observe(repoCard);
        } else {
            repoCard.classList.add('visible');
        }
    });
}

async function fetchRepos() {
    if (!repoContainer) return;

    var cacheKey = 'github_repos_' + githubUsername;
    var cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try {
            var cachedData = JSON.parse(cached);
            if (Date.now() - cachedData.timestamp < 300000) {
                renderRepos(cachedData.repos);
                return;
            }
        } catch(e) { /* ignore parse errors */ }
    }

    repoContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Laden van repositories...</p></div>';

    try {
        var response = await fetch('https://api.github.com/users/' + githubUsername + '/repos?sort=pushed&direction=desc&per_page=100');
        if (!response.ok) {
            throw new Error('GitHub API fout: ' + response.status + ' ' + response.statusText);
        }

        var repos = await response.json();
        repos = repos.slice(0, maxReposToShow);

        sessionStorage.setItem(cacheKey, JSON.stringify({
            repos: repos,
            timestamp: Date.now()
        }));

        renderRepos(repos);
    } catch (error) {
        console.error('[GitHub] Error:', error);
        if (repoContainer) {
            repoContainer.innerHTML = '<p class="error">Kon repositories niet laden. Fout: ' + error.message + '</p>';
        }
    }
}

function getLanguageColor(language) {
    var colors = {
        "JavaScript": "#f1e05a", "HTML": "#e34c26", "CSS": "#563d7c", "Python": "#3572A5",
        "Java": "#b07219", "TypeScript": "#2b7489", "PHP": "#4F5D95", "Ruby": "#701516",
        "C++": "#f34b7d", "C#": "#178600", "Go": "#00ADD8", "Shell": "#89e051", "SCSS": "#c6538c",
        "Vue": "#4FC08D", "Jupyter Notebook": "#DA5B0B"
    };
    return colors[language] || '#cccccc';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchRepos);
} else {
    fetchRepos();
}
