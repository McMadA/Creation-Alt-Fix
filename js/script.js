document.addEventListener('DOMContentLoaded', function() {

    // --- LANGUAGE SWITCHER LOGIC START ---
    const translations = {
        'nl': {
            "pageTitle": "Creation+Alt+Fix - Van simpele IT-hulp tot slimme AI-oplossingen",
            "discoverExpertise": "Ontdek Expertise",
            "navDiensten": "Diensten", "navWaaromWij": "Waarom Wij?", "navAiOplossingen": "AI Oplossingen", "navWebsites": "Websites", "navProjecten": "Projecten", "navContact": "Contact",
            "heroSubtitle": "Van simpele IT-hulp tot slimme AI-oplossingen.", "heroTagline": "Technologie die werkt. Voor jou. Vandaag en morgen.",
            "introTitle": "IT die Vastloopt? Wij Creëren <span>Flow.</span>",
            "introP1": "In een wereld die steeds digitaler wordt, is haperende technologie meer dan een irritatie – het is een rem op je productiviteit en innovatie. Van die ene printer die nooit meewerkt tot de vraag hoe AI jouw bedrijf kan transformeren: Creation+Alt+Fix biedt helderheid en concrete oplossingen.",
            "introP2": "Wij zijn jouw partner voor robuuste IT-support en baanbrekende AI-integraties.",
            "dienstenTitle": "Onze Oplossingen: Van <span>Basis</span> tot <span>Baanbrekend</span>",
            "dienst1Title": "IT Support & Beheer", "dienst1P": "PC-reparatie, netwerkoptimalisatie, softwareproblemen, dataherstel. Snelle, betrouwbare support voor particulieren en MKB.", "dienst1K1": "PC & Mac Support", "dienst1K2": "Netwerkbeheer", "dienst1K3": "Virusverwijdering",
            "dienst2Title": "Slimme Automatisering & AI", "dienst2P": "Laat AI voor je werken. Advies en implementatie van AI-tools voor workflow-automatisering, data-analyse en slimmere processen.", "dienst2K1": "AI Consultancy", "dienst2K2": "Workflow Automatisering", "dienst2K3": "Data Analyse",
            "dienst3Title": "Digitale Creatie & Advies", "dienst3P": "Van een strakke, moderne website tot strategisch advies over jouw digitale toekomst. Wij bouwen met oog voor design en functionaliteit.", "dienst3K1": "Webdesign", "dienst3K2": "IT Strategie", "dienst3K3": "Cloud Oplossingen",
            "waaromWijTitle": "De <span>+</span> Factor: Meer dan Alleen een Fix",
            "waarom1Title": "Toekomstgerichte Expertise", "waarom1P": "Jarenlange IT-ervaring gecombineerd met de nieuwste AI-ontwikkelingen. Duurzame oplossingen, geen tijdelijke pleisters.",
            "waarom2Title": "Persoonlijk & Pragmatisch", "waarom2P": "Geen onbegrijpelijk jargon. We luisteren, analyseren en leveren een oplossing die past bij jouw situatie. Duidelijk en direct.",
            "waarom3Title": "Van Concept tot Creatie", "waarom3P": "Of het nu reparatie of een complexe AI-strategie betreft, wij begeleiden het hele proces. Jouw partner in digitale transformatie.",
            "waarom4Title": "Design & Functionaliteit", "waarom4P": "Geinspireerd door de beste designs, leveren we oplossingen die niet alleen perfect werken, maar er ook zo uitzien.",
            "aiOplossingenTitle": "AI: Geen Hype, Maar Concrete <span>Voordelen</span>",
            "aiBenefit1": "Optimaliseer je workflow met AI-gedreven taakautomatisering.", "aiBenefit2": "Krijg diepere inzichten uit je data met slimme analyse tools.", "aiBenefit3": "Verbeter klantinteractie met intelligente chatbots.", "aiBenefit4": "Laat AI repetitieve taken overnemen, focus op groei.",
            "portfolioTitle": "Bekijk Mijn <span> Websites!</span>", "portfolioSubtitle": "Hieronder een selectie van websites en applicaties die ik recentelijk heb ontwikkeld. Dit geeft een idee van wat ik voor u kan realiseren.",
            "project1Title": "Angela Stenekes", "project1P": "Een moderne, responsive website voor een lokale knipperij met schrijfambities, vol met verhaaltjes en gemaakt met WordPress", "project1Btn": "Bekijk Live Website",
            "project2Title": "Bakkertje Sieg", "project2P": "Een Webshop, gemaakt met Wordpress. Met receptencatalogus, winkelwagen en integratie van betalingsfunctie voor het verkopen van allerlei recepten!", "project2Btn": "Ontdek de Webshop!",
            "project3Title": "Scholte-Elektrotechniek", "project3P": "Een op maat gemaakte website waar alle informatie over deze fantastische elektromonteur op 1 pagina staat. Gebouwd op snelheid en informativiteit.", "project3Btn": "Bezoek de Pagina",
            "project4Title": "Creation+Alt+Fix", "project4P": "En natuurlijk deze site. Gemaakt met de oude HTML, CSS en JavaScript techniek i.c.m. AI!",
            "githubTitle": "Mijn <span>Open Source</span> Applicatie Bijdragen", "githubLoading": "Laden van repositories...", "githubNoRepos": "Geen publieke repositories gevonden.", "githubError": "Kon repositories niet laden. Fout: {error}. Bekijk de console voor details.",
            "contactTitle": "Klaar voor de <span>Volgende Stap?</span>", "contactIntro": "Neem vandaag nog contact op voor een vrijblijvend gesprek. We helpen je graag verder!",
            "contactNamePlaceholder": "Uw Naam", "contactEmailPlaceholder": "Uw Emailadres", "contactMessagePlaceholder": "Uw Bericht", "contactSendButton": "Verstuur Bericht",
            "contactLocation": "Zuidhorn e.o.",
            "footerRights": "Alle rechten voorbehouden.", "footerPrivacy": "Privacybeleid", "footerTerms": "Algemene Voorwaarden",
            "formThanks": "Bedankt voor je bericht! (Dit is een demo, er is geen e-mail verstuurd)", "formErrorFillAll": "Vul alstublieft alle velden in.",
            "ariaInstagram": "Instagram CreationAltFix"
        },
        'en': {
            "pageTitle": "Creation+Alt+Fix - From simple IT help to smart AI solutions",
            "discoverExpertise": "Discover Expertise",
            "navDiensten": "Services", "navWaaromWij": "Why Us?", "navAiOplossingen": "AI Solutions", "navWebsites": "Websites", "navProjecten": "Projects", "navContact": "Contact",
            "heroSubtitle": "From simple IT help to smart AI solutions.", "heroTagline": "Technology that works. For you. Today and tomorrow.",
            "introTitle": "IT Stuck? We Create <span>Flow.</span>",
            "introP1": "In an increasingly digital world, faltering technology is more than an irritation – it's a brake on your productivity and innovation. From that one printer that never cooperates to the question of how AI can transform your business: Creation+Alt+Fix offers clarity and concrete solutions.",
            "introP2": "We are your partner for robust IT support and groundbreaking AI integrations.",
            "dienstenTitle": "Our Solutions: From <span>Basic</span> to <span>Breakthrough</span>",
            "dienst1Title": "IT Support & Management", "dienst1P": "PC repair, network optimization, software issues, data recovery. Fast, reliable support for individuals and SMEs.", "dienst1K1": "PC & Mac Support", "dienst1K2": "Network Management", "dienst1K3": "Virus Removal",
            "dienst2Title": "Smart Automation & AI", "dienst2P": "Let AI work for you. Advice and implementation of AI tools for workflow automation, data analysis, and smarter processes.", "dienst2K1": "AI Consultancy", "dienst2K2": "Workflow Automation", "dienst2K3": "Data Analysis",
            "dienst3Title": "Digital Creation & Advice", "dienst3P": "From a sleek, modern website to strategic advice about your digital future. We build with an eye for design and functionality.", "dienst3K1": "Web Design", "dienst3K2": "IT Strategy", "dienst3K3": "Cloud Solutions",
            "waaromWijTitle": "The <span>+</span> Factor: More Than Just a Fix",
            "waarom1Title": "Future-Oriented Expertise", "waarom1P": "Years of IT experience combined with the latest AI developments. Sustainable solutions, not temporary patches.",
            "waarom2Title": "Personal & Pragmatic", "waarom2P": "No incomprehensible jargon. We listen, analyze, and deliver a solution that fits your situation. Clear and direct.",
            "waarom3Title": "From Concept to Creation", "waarom3P": "Whether it's a repair or a complex AI strategy, we guide the entire process. Your partner in digital transformation.",
            "waarom4Title": "Design & Functionality", "waarom4P": "Inspired by the best designs, we deliver solutions that not only work perfectly but also look the part.",
            "aiOplossingenTitle": "AI: Not Hype, But Concrete <span>Advantages</span>",
            "aiBenefit1": "Optimize your workflow with AI-driven task automation.", "aiBenefit2": "Gain deeper insights from your data with smart analysis tools.", "aiBenefit3": "Improve customer interaction with intelligent chatbots.", "aiBenefit4": "Let AI take over repetitive tasks, focus on growth.",
            "portfolioTitle": "Check Out My <span>Websites!</span>", "portfolioSubtitle": "Below is a selection of websites and applications I have recently developed. This gives an idea of what I can achieve for you.",
            "project1Title": "Angela Stenekes", "project1P": "A modern, responsive website for a local hairdresser with writing ambitions, full of stories and made with WordPress.", "project1Btn": "View Live Website",
            "project2Title": "Bakkertje Sieg", "project2P": "A Webshop, made with Wordpress. With recipe catalog, shopping cart and integration of payment function for selling all kinds of recipes!", "project2Btn": "Discover the Webshop!",
            "project3Title": "Scholte-Elektrotechniek", "project3P": "A custom-made website where all information about this fantastic electrician is on one page. Built for speed and informativeness.", "project3Btn": "Visit the Page",
            "project4Title": "Creation+Alt+Fix", "project4P": "And of course this site. Made with old HTML, CSS and JavaScript techniques in combination with AI!",
            "githubTitle": "My <span>Open Source</span> Application Contributions", "githubLoading": "Loading repositories...", "githubNoRepos": "No public repositories found.", "githubError": "Could not load repositories. Error: {error}. Check the console for details.",
            "contactTitle": "Ready for the <span>Next Step?</span>", "contactIntro": "Contact us today for a no-obligation conversation. We're happy to help you further!",
            "contactNamePlaceholder": "Your Name", "contactEmailPlaceholder": "Your Email Address", "contactMessagePlaceholder": "Your Message", "contactSendButton": "Send Message",
            "contactLocation": "Zuidhorn area",
            "footerRights": "All rights reserved.", "footerPrivacy": "Privacy Policy", "footerTerms": "Terms and Conditions",
            "formThanks": "Thank you for your message! (This is a demo, no email was sent)", "formErrorFillAll": "Please fill in all fields.",
            "ariaInstagram": "Instagram CreationAltFix"
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

        let initialLang = 'nl'; // Default
        if (savedLang && translations[savedLang]) {
            initialLang = savedLang;
        } else if (translations[browserLang]) {
            initialLang = browserLang;
        }
        // Apply translations without saving to localStorage yet, changeLanguage will do that.
        applyTranslations(initialLang); // Apply first, then ensure localStorage is set by changeLanguage
        localStorage.setItem('preferredLanguage', initialLang); // Explicitly set it here after first application
    }

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

