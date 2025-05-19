document.addEventListener('DOMContentLoaded', function() {
        // --- LANGUAGE SWITCHER LOGIC START ---
    const translations = {
        'nl': {
            // --- ALGEMEEN & NAVIGATIE ---
            "pageTitle": "Creation+Alt+Fix - Uw Idee, Snel een Slimme Software Oplossing",
            "navDiensten": "Diensten",
            "navWaaromWij": "Waarom Wij?",
            "navAiOplossingen": "AI Oplossingen",
            "navWebsites": "Websites",
            "navProjecten": "Projecten",
            "navContact": "Contact",
            "ariaInstagram": "Instagram CreationAltFix",
            "ariaToggleNav": "Navigatie in-/uitklappen",

            // --- HERO SECTIE ---
            "heroSubtitle": "Uw bedrijfsidee, razendsnel een werkende oplossing. Dankzij slimme AI, door ons vertaald.",
            "heroTagline": "Wij maken software simpel, betaalbaar en snel. U de wens, wij de code.",
            "discoverExpertise": "Bekijk Snelbouw Oplossingen",

            // --- INTRODUCTIE SECTIE ---
            "introTitle": "Uw Idee, Onze Code: Snel <span>Software op Maat.</span>",
            "introP1": "U heeft een slim idee voor uw bedrijf – een handige tool, een geautomatiseerd proces, een beter klantensysteem – maar de stap naar werkende software lijkt groot, duur of technisch ingewikkeld? Creation+Alt+Fix overbrugt die kloof. Wij vertalen uw functionele wens naar een concrete oplossing, razendsnel gerealiseerd met de kracht van AI.",
            "introP2": "Geen maandenlange ontwikkeltrajecten of onbegrijpelijke technische taal. Wij leveren betaalbare, simpele softwareoplossingen, vaak binnen dagen. Voor ondernemers die vooruit willen, zonder zelf tech-expert te zijn.",

            // --- DIENSTEN SECTIE ---
            "dienstenTitle": "Onze Snelbouw Oplossingen: <span>Idee naar Realiteit</span> in Dagen",
            "dienst1Title": "IT Support & Beheer", // Behoud basis IT-dienst
            "dienst1P": "PC-reparatie, netwerkoptimalisatie, softwareproblemen. Snelle, betrouwbare support voor particulieren en MKB.",
            "dienst1K1": "PC & Mac Support",
            "dienst1K2": "Netwerkbeheer",
            "dienst1K3": "Virusverwijdering",
            "dienst2Title": "Slimme Bedrijfstools & Automatisering",
            "dienst2P": "Van offertegeneratoren en simpele CRM's tot boekingssystemen en klantenportalen. Wij bouwen de tool die uw werk makkelijker maakt, snel en betaalbaar dankzij AI.",
            "dienst2K1": "Boekingssystemen",
            "dienst2K2": "Simpel CRM",
            "dienst2K3": "Workflow Automatisering",
            "dienst3Title": "Websites & Digitale Aanwezigheid vanaf €99",
            "dienst3P": "Een moderne, snelle website of webshop die uw verhaal vertelt en klanten aantrekt. Ontworpen met oog voor detail, gebouwd voor resultaat.",
            "dienst3K1": "Responsive Webdesign",
            "dienst3K2": "Webshops",
            "dienst3K3": "E-mail Flows",
            // Optionele nieuwe dienstkaart (HTML moet aangepast worden)
            "dienst4Title": "Data Dashboards & Inzichten",
            "dienst4P": "Breng uw bedrijfsdata tot leven. Wij creëren overzichtelijke dashboards waarmee u direct ziet hoe uw bedrijf presteert en waar kansen liggen.",
            "dienst4K1": "Data Visualisatie",
            "dienst4K2": "KPI Dashboards",
            "dienst4K3": "Managementinformatie",

            // --- WAAROM WIJ SECTIE ---
            "waaromWijTitle": "De <span>+</span> Factor: Meer dan Alleen een Fix",
            "waarom1Title": "Toekomstgerichte Expertise",
            "waarom1P": "Jarenlange IT-ervaring gecombineerd met de nieuwste AI-ontwikkelingen. Duurzame oplossingen, geen tijdelijke pleisters.",
            "waarom2Title": "Uw Taal, Onze Techniek",
            "waarom2P": "U vertelt ons uw wens in heldere taal, wij zorgen voor de technische vertaling en snelle realisatie met AI. Geen jargon, wel resultaat.",
            "waarom3Title": "Van Concept tot Creatie",
            "waarom3P": "Of het nu reparatie of een complexe AI-strategie betreft, wij begeleiden het hele proces. Jouw partner in digitale transformatie.",
            "waarom4Title": "Design & Functionaliteit",
            "waarom4P": "Geinspireerd door de beste designs, leveren we oplossingen die niet alleen perfect werken, maar er ook zo uitzien.",

            // --- AI OPLOSSINGEN SECTIE ---
            "aiOplossingenTitle": "De Kracht van AI: <span>Sneller en Slimmer</span> voor U",
            "aiBenefit1": "Optimaliseer je workflow met AI-gedreven taakautomatisering.",
            "aiBenefit2": "Krijg diepere inzichten uit je data met slimme analyse tools.",
            "aiBenefit3": "Verbeter klantinteractie met intelligente chatbots.",
            "aiBenefit4": "Laat AI repetitieve taken overnemen, focus op groei.",
            // Optionele nieuwe AI benefits (HTML moet aangepast worden)
            "aiBenefit5": "Realiseer software-ideeën in dagen in plaats van maanden.",
            "aiBenefit6": "Bespaar aanzienlijk op ontwikkelkosten voor simpele oplossingen.",

            // --- PORTFOLIO (Websites) SECTIE ---
            "portfolioTitle": "Bekijk Mijn <span> Websites!</span>",
            "portfolioSubtitle": "Hieronder een selectie van websites en applicaties die ik recentelijk heb ontwikkeld. Dit geeft een idee van wat ik voor u kan realiseren.",
            "project1Title": "Angela Stenekes",
            "project1P": "Een moderne, responsive website voor een lokale knipperij met schrijfambities, vol met verhaaltjes en gemaakt met WordPress",
            "project1Btn": "Bekijk Live Website",
            "project2Title": "Bakkertje Sieg",
            "project2P": "Een Webshop, gemaakt met Wordpress. Met receptencatalogus, winkelwagen en integratie van betalingsfunctie voor het verkopen van allerlei recepten!",
            "project2Btn": "Ontdek de Webshop!",
            "project3Title": "Scholte-Elektrotechniek",
            "project3P": "Een op maat gemaakte website waar alle informatie over deze fantastische elektromonteur op 1 pagina staat. Gebouwd op snelheid en informativiteit.",
            "project3Btn": "Bezoek de Pagina",
            "project4Title": "Creation+Alt+Fix",
            "project4P": "En natuurlijk deze site. Gemaakt met de oude HTML, CSS en JavaScript techniek i.c.m. AI!",

            "faqTitle": "Veelgestelde Vragen: <span>Snelle Websites</span>", 
            "faq1Q": "Kan ik echt binnen een dag een website hebben?",
            "faq1A": "Ja, voor simpele websites zoals een online visitekaartje, een landingspagina, of een basis informatieve site is dit vaak mogelijk. Neem contact op met uw wensen, dan geven we direct een inschatting.",  
            "faq2Q": "Wat kost het om snel een simpele website te laten maken?",
            "faq2A": "De kosten voor een snelle, simpele website zijn aanzienlijk lager dan voor complexe maatwerkprojecten. We bieden transparante pakketten vanaf €99. Vraag een vrijblijvende offerte voor uw specifieke situatie.",
            "faq3Q": "Welke informatie hebben jullie nodig om mijn website snel te kunnen bouwen?",
            "faq3A": "Om snel te kunnen leveren, hebben we uw basisteksten, eventueel logo, en gewenste kleurstellingen nodig. We hebben ook templates en voorbeelden om het proces te versnellen als u nog geen content heeft.",


            // --- GITHUB PROJECTEN SECTIE ---
            "githubTitle": "Technische Projecten & <span>Open Source Bijdragen</span>",
            "githubLoading": "Laden van repositories...", // Behoud bestaande sleutel
            "githubNoRepos": "Geen publieke repositories gevonden.", // Behoud
            "githubError": "Kon repositories niet laden. Fout: {error}. Bekijk de console voor details.", // Behoud

            // --- CONTACT SECTIE ---
            "contactTitle": "Uw Idee Bespreken? <span>Laten we Praten!</span>",
            "contactIntro": "Heeft u een idee voor een slimme tool of software-oplossing? Neem contact op voor een vrijblijvend gesprek. We denken graag mee hoe we uw wens snel en betaalbaar kunnen realiseren.",
            "contactNamePlaceholder": "Uw Naam",
            "contactEmailPlaceholder": "Uw Emailadres",
            "contactMessagePlaceholder": "Uw Bericht",
            "contactSendButton": "Verstuur Bericht",
            "contactLocation": "Groningen e.o.",
            "formThanks": "Bedankt voor je bericht! (Dit is een demo, er is geen e-mail verstuurd)", // Behoud
            "formErrorFillAll": "Vul alstublieft alle velden in.", // Behoud

            // --- FOOTER ---
            "footerRights": "Alle rechten voorbehouden.",
            "footerPrivacy": "Privacybeleid", // Behoud, ook al is het gecommentarieerd in HTML
            "footerTerms": "Algemene Voorwaarden" // Behoud
        },
        'en': {
            // --- GENERAL & NAVIGATION ---
            "pageTitle": "Creation+Alt+Fix - Your Idea, Quickly a Smart Software Solution",
            "navDiensten": "Services",
            "navWaaromWij": "Why Us?",
            "navAiOplossingen": "AI Solutions",
            "navWebsites": "Websites",
            "navProjecten": "Projects",
            "navContact": "Contact",
            "ariaInstagram": "Instagram CreationAltFix",
            "ariaToggleNav": "Toggle navigation",

            // --- HERO SECTION ---
            "heroSubtitle": "Your business idea, a working solution at lightning speed. Thanks to smart AI, translated by us.",
            "heroTagline": "We make software simple, affordable, and fast. You have the wish, we write the code.",
            "discoverExpertise": "Explore Quick-Build Solutions",

            // --- INTRODUCTION SECTION ---
            "introTitle": "Your Idea, Our Code: Fast <span>Custom Software.</span>",
            "introP1": "You have a smart idea for your business – a handy tool, an automated process, a better customer system – but the step to working software seems big, expensive, or technically complicated? Creation+Alt+Fix bridges that gap. We translate your functional wish into a concrete solution, realized at lightning speed with the power of AI.",
            "introP2": "No month-long development processes or incomprehensible technical jargon. We deliver affordable, simple software solutions, often within days. For entrepreneurs who want to move forward, without being tech experts themselves.",

            // --- SERVICES SECTION ---
            "dienstenTitle": "Our Quick-Build Solutions: <span>Idea to Reality</span> in Days",
            "dienst1Title": "IT Support & Management", // Keep basic IT service
            "dienst1P": "PC repair, network optimization, software issues, data recovery. Fast, reliable support for individuals and SMEs.",
            "dienst1K1": "PC & Mac Support",
            "dienst1K2": "Network Management",
            "dienst1K3": "Virus Removal",
            "dienst2Title": "Smart Business Tools & Automation",
            "dienst2P": "From quote generators and simple CRMs to booking systems and customer portals. We build the tool that makes your work easier, quickly and affordably thanks to AI.",
            "dienst2K1": "Booking Systems",
            "dienst2K2": "Simple CRM",
            "dienst2K3": "Workflow Automation",
            "dienst3Title": "Websites & Digital Presence from €99",
            "dienst3P": "A modern, fast website or webshop that tells your story and attracts customers. Designed with attention to detail, built for results.",
            "dienst3K1": "Responsive Web Design",
            "dienst3K2": "Webshops",
            "dienst3K3": "Email Flows",
            // Optional new service card (HTML needs adjustment)
            "dienst4Title": "Data Dashboards & Insights",
            "dienst4P": "Bring your business data to life. We create clear dashboards that allow you to instantly see how your business is performing and where opportunities lie.",
            "dienst4K1": "Data Visualization",
            "dienst4K2": "KPI Dashboards",
            "dienst4K3": "Management Information",

            // --- WHY US SECTION ---
            "waaromWijTitle": "The <span>+</span> Factor: More Than Just a Fix",
            "waarom1Title": "Future-Oriented Expertise",
            "waarom1P": "Years of IT experience combined with the latest AI developments. Sustainable solutions, not temporary patches.",
            "waarom2Title": "Your Language, Our Technology",
            "waarom2P": "You tell us your wish in clear language, we take care of the technical translation and fast realization with AI. No jargon, just results.",
            "waarom3Title": "From Concept to Creation",
            "waarom3P": "Whether it's a repair or a complex AI strategy, we guide the entire process. Your partner in digital transformation.",
            "waarom4Title": "Design & Functionality",
            "waarom4P": "Inspired by the best designs, we deliver solutions that not only work perfectly but also look the part.",

            // --- AI SOLUTIONS SECTION ---
            "aiOplossingenTitle": "The Power of AI: <span>Faster and Smarter</span> for You",
            "aiBenefit1": "Optimize your workflow with AI-driven task automation.",
            "aiBenefit2": "Gain deeper insights from your data with smart analysis tools.",
            "aiBenefit3": "Improve customer interaction with intelligent chatbots.",
            "aiBenefit4": "Let AI take over repetitive tasks, focus on growth.",
            // Optional new AI benefits (HTML needs adjustment)
            "aiBenefit5": "Realize software ideas in days instead of months.",
            "aiBenefit6": "Save significantly on development costs for simple solutions.",

            // --- PORTFOLIO (Websites) SECTION ---
            "portfolioTitle": "Check Out My <span>Websites!</span>",
            "portfolioSubtitle": "Below is a selection of websites and applications I have recently developed. This gives an idea of what I can achieve for you.",
            "project1Title": "Angela Stenekes",
            "project1P": "A modern, responsive website for a local hairdresser with writing ambitions, full of stories and made with WordPress.",
            "project1Btn": "View Live Website",
            "project2Title": "Bakkertje Sieg",
            "project2P": "A Webshop, made with Wordpress. With recipe catalog, shopping cart and integration of payment function for selling all kinds of recipes!",
            "project2Btn": "Discover the Webshop!",
            "project3Title": "Scholte-Elektrotechniek",
            "project3P": "A custom-made website where all information about this fantastic electrician is on one page. Built for speed and informativeness.",
            "project3Btn": "Visit the Page",
            "project4Title": "Creation+Alt+Fix",
            "project4P": "And of course this site. Made with old HTML, CSS and JavaScript techniques in combination with AI!",

            "faqTitle": "Frequently Asked Questions: <span>Quick Websites</span>",
            "faq1Q": "Can I really have a website within a day?",
            "faq1A": "Yes, for simple websites like an online business card, a landing page, or a basic informative site, this is often possible. Contact us with your wishes, and we will give you an estimate right away.",
            "faq2Q": "How much does it cost to quickly create a simple website?",
            "faq2A": "The costs for a quick, simple website are significantly lower than for complex custom projects. We offer transparent packages starting from €99. Request a non-binding quote for your specific situation.",
            "faq3Q": "What information do you need to quickly build my website?",
            "faq3A": "To deliver quickly, we need your basic texts, possibly a logo, and desired color schemes. We also have templates and examples to speed up the process if you don't have content yet.",


            // --- GITHUB PROJECTS SECTION ---
            "githubTitle": "Technical Projects & <span>Open Source Contributions</span>",
            "githubLoading": "Loading repositories...", // Keep existing key
            "githubNoRepos": "No public repositories found.", // Keep
            "githubError": "Could not load repositories. Error: {error}. Check the console for details.", // Keep

            // --- CONTACT SECTION ---
            "contactTitle": "Discuss Your Idea? <span>Let's Talk!</span>",
            "contactIntro": "Have an idea for a smart tool or software solution? Contact us for a no-obligation chat. We're happy to brainstorm how we can realize your wish quickly and affordably.",
            "contactNamePlaceholder": "Your Name",
            "contactEmailPlaceholder": "Your Email Address",
            "contactMessagePlaceholder": "Your Message",
            "contactSendButton": "Send Message",
            "contactLocation": "Groningen area",
            "formThanks": "Thank you for your message! (This is a demo, no email was sent)", // Keep
            "formErrorFillAll": "Please fill in all fields.", // Keep

            // --- FOOTER ---
            "footerRights": "All rights reserved.",
            "footerPrivacy": "Privacy Policy", // Keep, even if commented out in HTML
            "footerTerms": "Terms and Conditions" // Keep
        }
    };

    let currentLanguage = 'nl'; // Default language, will be updated by initializeLanguage
    let intersectionObserverInstance; // For fade-in animations

    function applyTranslations(lang) {

        
        if (!translations[lang]) {
            console.error(`Translations for language "${lang}" not found.`);
            return;
        }
        currentLanguage = lang;
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-translate-key]').forEach(element => {
            const key = element.getAttribute('data-translate-key');
            if (translations[lang][key] !== undefined) {
                element.innerHTML = translations[lang][key];
            } else {
                console.warn(`Translation key "${key}" not found for language "${lang}" in element:`, element);
            }
        });

        document.querySelectorAll('[data-translate-key-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-key-placeholder');
            if (translations[lang][key] !== undefined) {
                element.placeholder = translations[lang][key];
            }
        });
        document.querySelectorAll('[data-translate-key-title]').forEach(element => {
            const key = element.getAttribute('data-translate-key-title');
            if (translations[lang][key] !== undefined) {
                element.title = translations[lang][key];
            }
        });
        document.querySelectorAll('[data-translate-key-aria]').forEach(element => {
            const key = element.getAttribute('data-translate-key-aria');
            if (translations[lang][key] !== undefined) {
                element.setAttribute('aria-label', translations[lang][key]);
            }
        });
        
        
        // Special case for page title element if it has data-translate-key
        const pageTitleElement = document.querySelector('title[data-translate-key="pageTitle"]');
        if (pageTitleElement && translations[lang]['pageTitle']) {
            document.title = translations[lang]['pageTitle']; // Also update the actual document.title
        }


        document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    function changeLanguage(lang) {
        applyTranslations(lang);
        localStorage.setItem('preferredLanguage', lang);
        // If GitHub repos are already loaded and you want to refresh their text (e.g. "Loading...", "No repos..."), call fetchRepos again.
        // This example assumes fetchRepos will be called once on page load after language init.
        // If you need to refresh already displayed repo cards' descriptions (if they were translatable), that's more complex.
        // For now, only messages like "Loading..." from fetchRepos will use the new language if fetchRepos is called.
        if (typeof fetchRepos === 'function' && document.getElementById('repo-container')) {
             // If the container is empty or shows a message, re-fetch to update message.
             // If cards are already there, their content won't change unless you explicitly update them or re-fetch all.
            const repoContainer = document.getElementById('repo-container');
            if (!repoContainer.querySelector('.repo-card')) { // Only re-fetch if no cards are present (i.e., it's showing a message or is empty)
                fetchRepos();
            }
        }
    }

    function initializeLanguage() {
        const savedLang = localStorage.getItem('preferredLanguage');
        const browserLang = navigator.language.split('-')[0];
        console.log("Initial Language Check: Saved Lang =", savedLang, "Browser Lang =", browserLang); // DEBUG

        let initialLang = 'nl'; // Default
        if (savedLang && translations[savedLang]) {
            initialLang = savedLang;
        } else if (translations[browserLang]) {
            initialLang = browserLang;
        }
        console.log("Initial Language Check: Determined initialLang =", initialLang); // DEBUG
        // Roep applyTranslations aan met de vastgestelde taal
        applyTranslations(initialLang);
        // Sla de taal op, zelfs als het de default is, voor consistentie
        localStorage.setItem('preferredLanguage', initialLang);
        }
    
    // Initialiseer de taal bij DOMContentLoaded
    initializeLanguage();
    // --- LANGUAGE SWITCHER LOGIC END ---

    // console.log("DOMContentLoaded: Forcing browser language translations directly.");
    // applyTranslations('nl'); // Forceer NL direct
    // localStorage.setItem('preferredLanguage', 'nl'); // Zet ook localStorage

    document.querySelectorAll('#language-switcher .lang-btn').forEach(button => {
        button.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
    // --- LANGUAGE SWITCHER LOGIC END ---


    // Smooth scrolling voor navigatielinks (redundant als html scroll-behavior werkt, maar goede fallback)
    const navLinks = document.querySelectorAll('#navbar a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            let targetId = this.getAttribute('href');
            // Special case voor #hero, anders scrollt het niet helemaal naar boven
            if (targetId === '#hero') {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            } else {
                let targetElement = document.querySelector(targetId);
                if (targetElement) {
                    // Calculate offset for sticky navbar
                    const navbarHeight = document.getElementById('navbar').offsetHeight;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Huidige jaar in footer
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Fade-in effect bij scrollen
    const fadeInElements = document.querySelectorAll('.fade-in');

    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1 // Trigger als 10% van element zichtbaar is
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    }, observerOptions);

    fadeInElements.forEach(el => {
        observer.observe(el);
    });

    // Contactformulier (simpele console log, voor echte functionaliteit heb je backend nodig)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            if (name && email && message) {
                console.log('Formulier verzonden:');
                console.log('Naam:', name);
                console.log('Email:', email);
                console.log('Bericht:', message);
                alert('Bedankt voor je bericht! (Dit is een demo, er is geen e-mail verstuurd)');
                contactForm.reset();
            } else {
                alert('Vul alstublieft alle velden in.');
            }
        });
    }

});
const githubUsername = 'McMadA'; // VERVANG DEZE!
const maxReposToShow = 6;

const repoContainer = document.getElementById('repo-container');
console.log('[GitHub] Script gestart. repoContainer gevonden:', repoContainer);

async function fetchRepos() {
    if (!repoContainer) {
        console.error('[GitHub] FOUT: Element met ID "repo-container" niet gevonden.');
        return;
    }
    repoContainer.innerHTML = '<p class="loading">Laden van repositories...</p>';
    console.log('[GitHub] Laadbericht getoond.');

    try {
        console.log(`[GitHub] Ophalen van repositories voor gebruiker: ${githubUsername}`);
        const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=pushed&direction=desc&per_page=100`);
        console.log('[GitHub] Fetch response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorBody = await response.text(); // Probeer de body te lezen voor meer info
            console.error('[GitHub] API Fout Details:', errorBody);
            throw new Error(`GitHub API fout: ${response.status} ${response.statusText}`);
        }

        let repos = await response.json();
        console.log('[GitHub] Ruwe data ontvangen van API:', JSON.parse(JSON.stringify(repos))); // Kopie voor logging

        // Optioneel: filter forks
        // repos = repos.filter(repo => !repo.fork);

        repos = repos.slice(0, maxReposToShow);
        console.log(`[GitHub] Repositories na filter/slice (max ${maxReposToShow}):`, JSON.parse(JSON.stringify(repos)));

        repoContainer.innerHTML = ''; // Wis laadbericht
        console.log('[GitHub] Laadbericht gewist.');

        if (repos.length === 0) {
            console.log('[GitHub] Geen publieke repositories om weer te geven.');
            repoContainer.innerHTML = '<p class="error">Geen publieke repositories gevonden.</p>';
            return;
        }

        console.log(`[GitHub] Verwerken van ${repos.length} repositories...`);
        repos.forEach((repo, index) => {
            console.log(`[GitHub] Verwerken repo ${index + 1}: ${repo.name}`);
            const repoCard = document.createElement('div');
            // BELANGRIJKE WIJZIGING HIER: voeg 'visible' toe
            repoCard.className = 'repo-card fade-in visible';

            let description = repo.description || 'Geen beschrijving opgegeven.';
            if (description.length > 120) {
                description = description.substring(0, 117) + '...';
            }

            repoCard.innerHTML = `
                <h3><a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a></h3>
                <p class="repo-description">${description}</p>
                <div class="repo-meta">
                    ${repo.language ? `<span><i class="fas fa-circle" style="color:${getLanguageColor(repo.language)};"></i> ${repo.language}</span>` : ''}
                    <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                    <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
                </div>
            `;
            repoContainer.appendChild(repoCard);
            console.log(`[GitHub] Kaart toegevoegd voor ${repo.name}`);
        });
        console.log('[GitHub] Alle kaarten toegevoegd.');

    } catch (error) {
        console.error('[GitHub] Fout tijdens laden/verwerken repositories:', error);
        if (repoContainer) { // Zorg ervoor dat repoContainer nog steeds bestaat
            repoContainer.innerHTML = `<p class="error">Kon repositories niet laden. Fout: ${error.message}. Bekijk de console voor details.</p>`;
        }
    }
}

function getLanguageColor(language) {
    const colors = {
        "JavaScript": "#f1e05a", "HTML": "#e34c26", "CSS": "#563d7c", "Python": "#3572A5",
        "Java": "#b07219", "TypeScript": "#2b7489", "PHP": "#4F5D95", "Ruby": "#701516",
        "C++": "#f34b7d", "C#": "#178600", "Go": "#00ADD8", "Shell": "#89e051", "SCSS": "#c6538c",
        "Vue": "#4FC08D", "Jupyter Notebook": "#DA5B0B"
        // Voeg meer toe naar wens
    };
    return colors[language] || '#cccccc';
}

// Roep functie aan. Script staat aan het einde van de body, dus DOM is wss geladen.
// Voor extra zekerheid, vooral als je js/script.js ook DOM manipuleert:
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchRepos);
        console.log('[GitHub] DOMContentLoaded listener toegevoegd voor fetchRepos.');
} else {
    fetchRepos();
    console.log('[GitHub] fetchRepos direct aangeroepen.');
}

    // --- HAMBURGER MENU LOGIC START ---
    const hamburgerBtn = document.getElementById('hamburger-menu');
    const navMenuItems = document.getElementById('nav-menu-items');
    const hamburgerIcon = hamburgerBtn.querySelector('i'); // Get the icon element

    if (hamburgerBtn && navMenuItems && hamburgerIcon) {
        hamburgerBtn.addEventListener('click', () => {
            navMenuItems.classList.toggle('active');
            const isActive = navMenuItems.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isActive);

            if (isActive) {
                hamburgerIcon.classList.remove('fa-bars');
                hamburgerIcon.classList.add('fa-times');
            } else {
                hamburgerIcon.classList.remove('fa-times');
                hamburgerIcon.classList.add('fa-bars');
            }
        });

        // Close menu when a link inside it is clicked
        const navMenuLinks = navMenuItems.querySelectorAll('a[href^="#"]');
        navMenuLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navMenuItems.classList.contains('active')) {
                    navMenuItems.classList.remove('active');
                    hamburgerBtn.setAttribute('aria-expanded', 'false');
                    hamburgerIcon.classList.remove('fa-times');
                    hamburgerIcon.classList.add('fa-bars');
                }
            });
        });
    }
    // --- HAMBURGER MENU LOGIC END ---