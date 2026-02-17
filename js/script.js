document.addEventListener('DOMContentLoaded', function() {
    // --- LANGUAGE SWITCHER LOGIC START ---
    const translations = {
        'nl': {
            // --- ALGEMEEN & NAVIGATIE ---
            "pageTitle": "Creation+Alt+Fix - Intelligente AI-Oplossingen & IT-Services Groningen",
            "navHome": "Home",
            "navAIServices": "AI Services",
            "navWebDesign": "Web Design & Tech",
            "navProjects": "Projecten",
            "navContact": "Contact",
            "ariaInstagram": "Instagram CreationAltFix",
            "ariaLinkedIn": "LinkedIn CreationAltFix",
            "ariaToggleNav": "Navigatie in-/uitklappen",

            // --- HERO SECTIE ---
            "heroBadge": "AI-Powered Solutions",
            "heroHeadline": "Intelligente <span class=\"accent\">AI-Oplossingen</span> voor Jouw Bedrijf",
            "heroSubtitle": "Wij vertalen jouw idee razendsnel naar werkende software. Van slimme automatisering tot complete websites, aangedreven door AI.",
            "heroCtaPrimary": "Ontdek AI Services",
            "heroCtaSecondary": "Gratis AI Consult",

            // --- AI SERVICES SECTIE ---
            "aiServicesTitle": "AI-Gedreven <span>Oplossingen</span>",
            "learnMore": "Meer info <i class=\"fas fa-arrow-right\"></i>",

            // --- DIENSTEN ---
            "dienst1Title": "IT Support & Beheer",
            "dienst1P": "PC-reparatie, netwerkoptimalisatie, softwareproblemen. Snelle, betrouwbare support voor particulieren en MKB.",
            "dienst1K1": "PC & Mac Support",
            "dienst1K2": "Netwerkbeheer",
            "dienst1K3": "Virusverwijdering",
            "dienst2Title": "Slimme Bedrijfstools & Automatisering",
            "dienst2P": "Van offertegeneratoren en simpele CRM's tot boekingssystemen en klantenportalen. Wij bouwen de tool die uw werk makkelijker maakt, snel en betaalbaar dankzij AI.",
            "dienst2K1": "Boekingssystemen",
            "dienst2K2": "Simpel CRM",
            "dienst2K3": "Workflow Automatisering",
            "dienst3Title": "Websites & Digitale Aanwezigheid vanaf \u20ac99",
            "dienst3P": "Een moderne, snelle website of webshop die uw verhaal vertelt en klanten aantrekt. Ontworpen met oog voor detail, gebouwd voor resultaat.",
            "dienst3K1": "Responsive Webdesign",
            "dienst3K2": "Webshops",
            "dienst3K3": "E-mail Flows",
            "dienst4Title": "Data Dashboards & Inzichten",
            "dienst4P": "Breng uw bedrijfsdata tot leven. Wij creëren overzichtelijke dashboards waarmee u direct ziet hoe uw bedrijf presteert en waar kansen liggen.",
            "dienst4K1": "Data Visualisatie",
            "dienst4K2": "KPI Dashboards",
            "dienst4K3": "Managementinformatie",

            // --- WEB DESIGN / WAAROM WIJ ---
            "webDesignTitle": "Waarom <span>Creation+Alt+Fix</span>?",
            "waarom1Title": "Toekomstgerichte Expertise",
            "waarom1P": "Jarenlange IT-ervaring gecombineerd met de nieuwste AI-ontwikkelingen. Duurzame oplossingen, geen tijdelijke pleisters.",
            "waarom2Title": "Uw Taal, Onze Techniek",
            "waarom2P": "U vertelt ons uw wens in heldere taal, wij zorgen voor de technische vertaling en snelle realisatie met AI. Geen jargon, wel resultaat.",
            "waarom3Title": "Van Concept tot Creatie",
            "waarom3P": "Of het nu reparatie of een complexe AI-strategie betreft, wij begeleiden het hele proces. Jouw partner in digitale transformatie.",
            "waarom4Title": "Design & Functionaliteit",
            "waarom4P": "Geinspireerd door de beste designs, leveren we oplossingen die niet alleen perfect werken, maar er ook zo uitzien.",

            // --- AI BENEFITS ---
            "aiOplossingenTitle": "De Kracht van AI: <span>Sneller en Slimmer</span>",
            "aiBenefit1": "Optimaliseer je workflow met AI-gedreven taakautomatisering.",
            "aiBenefit2": "Krijg diepere inzichten uit je data met slimme analyse tools.",
            "aiBenefit3": "Verbeter klantinteractie met intelligente chatbots.",
            "aiBenefit4": "Laat AI repetitieve taken overnemen, focus op groei.",
            "aiBenefit5": "Realiseer software-ideeën in dagen in plaats van maanden.",
            "aiBenefit6": "Bespaar aanzienlijk op ontwikkelkosten voor simpele oplossingen.",

            // --- PORTFOLIO ---
            "portfolioTitle": "Bekijk onze <span>Websites!</span>",
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
            "project5Title": "PompPop",
            "project5P": "Aanmeldpagina voor een prachtig feest!",
            "project5Btn": "Aanmelden!",
            "project6Title": "Stenekes Rioolspecialist",
            "project6P": "Alle informatie over uw verstoppingen!",
            "project6Btn": "Kijk snel!",
            "project7Title": "Willa",
            "project7P": "Prachtige mogelijkheden voor jouw oude kleren",
            "project7Btn": "Kijk snel!",
            "project8Title": "Capybara Culture",
            "project8P": "Check hier wat NFT's zijn!",
            "project8Btn": "Kijk snel!",
            "liveDemoBtn": "Bekijk de live demo hoe een website tot stand komt!",

            // --- FAQ ---
            "faqTitle": "Veelgestelde Vragen: <span>Snelle Websites</span>",
            "faq1Q": "Kan ik echt binnen een dag een website hebben?",
            "faq1A": "Ja, voor simpele websites zoals een online visitekaartje, een landingspagina, of een basis informatieve site is dit vaak mogelijk. Neem contact op met uw wensen, dan geven we direct een inschatting.",
            "faq2Q": "Wat kost het om snel een simpele website te laten maken?",
            "faq2A": "De kosten voor een snelle, simpele website zijn aanzienlijk lager dan voor complexe maatwerkprojecten. We bieden transparante pakketten vanaf \u20ac99. Vraag een vrijblijvende offerte voor uw specifieke situatie.",
            "faq3Q": "Welke informatie hebben jullie nodig om mijn website snel te kunnen bouwen?",
            "faq3A": "Om snel te kunnen leveren, hebben we uw basisteksten, eventueel logo, en gewenste kleurstellingen nodig. We hebben ook templates en voorbeelden om het proces te versnellen als u nog geen content heeft.",

            // --- GITHUB ---
            "githubTitle": "Technische Projecten & <span>Open Source Bijdragen</span>",
            "githubLoading": "Laden van repositories...",
            "githubNoRepos": "Geen publieke repositories gevonden.",
            "githubError": "Kon repositories niet laden. Fout: {error}. Bekijk de console voor details.",

            // --- TRUST / TESTIMONIALS ---
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

            // --- CONTACT ---
            "contactTitle": "Klaar voor <span>AI-Transformatie?</span>",
            "contactIntro": "Heeft u een idee voor een slimme tool of software-oplossing? Neem contact op voor een vrijblijvend gesprek. We denken graag mee hoe we uw wens snel en betaalbaar kunnen realiseren.",
            "contactCtaBtn": "Contact voor AI Strategie",
            "contactLocation": "Groningen e.o.",
            "formThanks": "Bedankt voor je bericht! (Dit is een demo, er is geen e-mail verstuurd)",
            "formErrorFillAll": "Vul alstublieft alle velden in.",

            // --- FOOTER ---
            "footerRights": "Alle rechten voorbehouden.",
            "footerPrivacy": "Privacybeleid",
            "footerTerms": "Algemene Voorwaarden"
        },
        'en': {
            // --- GENERAL & NAVIGATION ---
            "pageTitle": "Creation+Alt+Fix - Intelligent AI Solutions & IT Services Groningen",
            "navHome": "Home",
            "navAIServices": "AI Services",
            "navWebDesign": "Web Design & Tech",
            "navProjects": "Projects",
            "navContact": "Contact",
            "ariaInstagram": "Instagram CreationAltFix",
            "ariaLinkedIn": "LinkedIn CreationAltFix",
            "ariaToggleNav": "Toggle navigation",

            // --- HERO SECTION ---
            "heroBadge": "AI-Powered Solutions",
            "heroHeadline": "Intelligent <span class=\"accent\">AI Solutions</span> for Your Business",
            "heroSubtitle": "We translate your idea into working software at lightning speed. From smart automation to complete websites, powered by AI.",
            "heroCtaPrimary": "Discover AI Services",
            "heroCtaSecondary": "Free AI Consult",

            // --- AI SERVICES SECTION ---
            "aiServicesTitle": "AI-Driven <span>Solutions</span>",
            "learnMore": "Learn more <i class=\"fas fa-arrow-right\"></i>",

            // --- SERVICES ---
            "dienst1Title": "IT Support & Management",
            "dienst1P": "PC repair, network optimization, software issues, data recovery. Fast, reliable support for individuals and SMEs.",
            "dienst1K1": "PC & Mac Support",
            "dienst1K2": "Network Management",
            "dienst1K3": "Virus Removal",
            "dienst2Title": "Smart Business Tools & Automation",
            "dienst2P": "From quote generators and simple CRMs to booking systems and customer portals. We build the tool that makes your work easier, quickly and affordably thanks to AI.",
            "dienst2K1": "Booking Systems",
            "dienst2K2": "Simple CRM",
            "dienst2K3": "Workflow Automation",
            "dienst3Title": "Websites & Digital Presence from \u20ac99",
            "dienst3P": "A modern, fast website or webshop that tells your story and attracts customers. Designed with attention to detail, built for results.",
            "dienst3K1": "Responsive Web Design",
            "dienst3K2": "Webshops",
            "dienst3K3": "Email Flows",
            "dienst4Title": "Data Dashboards & Insights",
            "dienst4P": "Bring your business data to life. We create clear dashboards that allow you to instantly see how your business is performing and where opportunities lie.",
            "dienst4K1": "Data Visualization",
            "dienst4K2": "KPI Dashboards",
            "dienst4K3": "Management Information",

            // --- WEB DESIGN / WHY US ---
            "webDesignTitle": "Why <span>Creation+Alt+Fix</span>?",
            "waarom1Title": "Future-Oriented Expertise",
            "waarom1P": "Years of IT experience combined with the latest AI developments. Sustainable solutions, not temporary patches.",
            "waarom2Title": "Your Language, Our Technology",
            "waarom2P": "You tell us your wish in clear language, we take care of the technical translation and fast realization with AI. No jargon, just results.",
            "waarom3Title": "From Concept to Creation",
            "waarom3P": "Whether it's a repair or a complex AI strategy, we guide the entire process. Your partner in digital transformation.",
            "waarom4Title": "Design & Functionality",
            "waarom4P": "Inspired by the best designs, we deliver solutions that not only work perfectly but also look the part.",

            // --- AI BENEFITS ---
            "aiOplossingenTitle": "The Power of AI: <span>Faster and Smarter</span>",
            "aiBenefit1": "Optimize your workflow with AI-driven task automation.",
            "aiBenefit2": "Gain deeper insights from your data with smart analysis tools.",
            "aiBenefit3": "Improve customer interaction with intelligent chatbots.",
            "aiBenefit4": "Let AI take over repetitive tasks, focus on growth.",
            "aiBenefit5": "Realize software ideas in days instead of months.",
            "aiBenefit6": "Save significantly on development costs for simple solutions.",

            // --- PORTFOLIO ---
            "portfolioTitle": "Check Out Our <span>Websites!</span>",
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
            "project5Title": "PompPop",
            "project5P": "Registration page for a wonderful party!",
            "project5Btn": "Visit the Page",
            "project6Title": "Stenekes Rioolspecialist",
            "project6P": "All information about your blockages!",
            "project6Btn": "Check it out quickly!",
            "project7Title": "Willa",
            "project7P": "Beautiful possibilities for your old clothes",
            "project7Btn": "Check it out quickly!",
            "project8Title": "Capybara Culture",
            "project8P": "Check out what NFTs are!",
            "project8Btn": "Check it out quickly!",
            "liveDemoBtn": "Watch the live demo of how a website is built!",

            // --- FAQ ---
            "faqTitle": "Frequently Asked Questions: <span>Quick Websites</span>",
            "faq1Q": "Can I really have a website within a day?",
            "faq1A": "Yes, for simple websites like an online business card, a landing page, or a basic informative site, this is often possible. Contact us with your wishes, and we will give you an estimate right away.",
            "faq2Q": "How much does it cost to quickly create a simple website?",
            "faq2A": "The costs for a quick, simple website are significantly lower than for complex custom projects. We offer transparent packages starting from \u20ac99. Request a non-binding quote for your specific situation.",
            "faq3Q": "What information do you need to quickly build my website?",
            "faq3A": "To deliver quickly, we need your basic texts, possibly a logo, and desired color schemes. We also have templates and examples to speed up the process if you don't have content yet.",

            // --- GITHUB ---
            "githubTitle": "Technical Projects & <span>Open Source Contributions</span>",
            "githubLoading": "Loading repositories...",
            "githubNoRepos": "No public repositories found.",
            "githubError": "Could not load repositories. Error: {error}. Check the console for details.",

            // --- TRUST / TESTIMONIALS ---
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

            // --- CONTACT ---
            "contactTitle": "Ready for <span>AI Transformation?</span>",
            "contactIntro": "Have an idea for a smart tool or software solution? Contact us for a no-obligation chat. We're happy to brainstorm how we can realize your wish quickly and affordably.",
            "contactCtaBtn": "Contact for AI Strategy",
            "contactLocation": "Groningen area",
            "formThanks": "Thank you for your message! (This is a demo, no email was sent)",
            "formErrorFillAll": "Please fill in all fields.",

            // --- FOOTER ---
            "footerRights": "All rights reserved.",
            "footerPrivacy": "Privacy Policy",
            "footerTerms": "Terms and Conditions"
        }
    };

    let currentLanguage = 'nl';

    function applyTranslations(lang) {
        if (!translations[lang]) {
            console.error('Translations for language "' + lang + '" not found.');
            return;
        }
        currentLanguage = lang;
        document.documentElement.lang = lang;

        // Keys containing HTML markup — must use innerHTML; all others use textContent for XSS safety
        var htmlKeys = new Set([
            'heroHeadline', 'aiServicesTitle', 'learnMore', 'webDesignTitle',
            'aiOplossingenTitle', 'portfolioTitle', 'faqTitle', 'githubTitle',
            'trustTitle', 'contactTitle'
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

        var pageTitleElement = document.querySelector('title[data-translate-key="pageTitle"]');
        if (pageTitleElement && translations[lang]['pageTitle']) {
            document.title = translations[lang]['pageTitle'];
        }

        document.querySelectorAll('#language-switcher .lang-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
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
        var browserLang = navigator.language.split('-')[0];
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

    document.querySelectorAll('#language-switcher .lang-btn').forEach(function(button) {
        button.addEventListener('click', function() {
            var lang = this.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });

    // Smooth scrolling for nav links
    var navLinks = document.querySelectorAll('#navbar a[href^="#"]');
    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var targetId = this.getAttribute('href');
            if (targetId === '#hero') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                var targetElement = document.querySelector(targetId);
                if (targetElement) {
                    var navbarHeight = document.getElementById('navbar').offsetHeight;
                    var elementPosition = targetElement.getBoundingClientRect().top;
                    var offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            }
        });
    });

    // Current year in footer
    var currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Fade-in on scroll
    var fadeInElements = document.querySelectorAll('.fade-in');
    var observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    fadeInElements.forEach(function(el) { observer.observe(el); });

    // Contact form
    var contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var name = document.getElementById('name').value;
            var email = document.getElementById('email').value;
            var message = document.getElementById('message').value;
            if (name && email && message) {
                alert(translations[currentLanguage]['formThanks']);
                contactForm.reset();
            } else {
                alert(translations[currentLanguage]['formErrorFillAll']);
            }
        });
    }

    // --- HAMBURGER MENU LOGIC ---
    var hamburgerBtn = document.getElementById('hamburger-menu');
    var navMenuItems = document.getElementById('nav-menu-items');
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

        navMenuItems.querySelectorAll('a[href^="#"]').forEach(function(link) {
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

        function drawParticles() {
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
            requestAnimationFrame(drawParticles);
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

async function fetchRepos() {
    if (!repoContainer) return;
    repoContainer.innerHTML = '<p class="loading">Laden van repositories...</p>';

    try {
        var response = await fetch('https://api.github.com/users/' + githubUsername + '/repos?sort=pushed&direction=desc&per_page=100');
        if (!response.ok) {
            throw new Error('GitHub API fout: ' + response.status + ' ' + response.statusText);
        }

        var repos = await response.json();
        repos = repos.slice(0, maxReposToShow);
        repoContainer.innerHTML = '';

        if (repos.length === 0) {
            repoContainer.innerHTML = '<p class="error">Geen publieke repositories gevonden.</p>';
            return;
        }

        repos.forEach(function(repo) {
            var repoCard = document.createElement('div');
            repoCard.className = 'repo-card fade-in visible';

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
        });

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
