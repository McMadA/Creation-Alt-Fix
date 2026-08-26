document.addEventListener('DOMContentLoaded', function() {

    // --- Bilingual Translation Engine for Live Demo ---
    const translations = {
        nl: {
            liveDemoPageTitle: "Live Demo: Hoe een Website Gebouwd Wordt - Creation+Alt+Fix",
            liveDemoMetaDesc: "Een live, interactieve tijdlijn die laat zien hoe een website wordt opgebouwd van pure HTML, via CSS styling tot interactief JavaScript.",
            skipToContent: "Direct naar inhoud",
            liveDemoBackBtn: "Terug naar de hoofdpagina",
            liveDemoH1: "De Geboorte van een <span>Website</span>",
            liveDemoSubtitle: "Scroll naar beneden om te zien hoe een simpele tekst transformeert in een interactieve webpagina.",
            liveDemoStep1Title: "De Blauwdruk: Pure HTML",
            liveDemoStep1Desc: "Alles begint met HTML (HyperText Markup Language). Dit is het skelet van de pagina. Het definieert de structuur en de inhoud, zoals koppen, paragrafen en knoppen, maar zonder enige opmaak.",
            liveDemoStep2Title: "De Eerste Verflaag: Basis CSS",
            liveDemoStep2Desc: "Met CSS (Cascading Style Sheets) voegen we stijl toe. We beginnen met de basis: lettertypes, kleuren en wat opvulling (padding) om de tekst leesbaarder te maken en het er netter uit te laten zien.",
            liveDemoStep3Title: "Design & Layout: Meer CSS",
            liveDemoStep3Desc: "Nu maken we het visueel aantrekkelijk. We centreren de inhoud, geven de \"box\" een mooie schaduw en stijlen de knop zodat hij uitnodigend is om op te klikken. Dit is waar het design echt tot leven komt.",
            liveDemoStep4Title: "De Magie: JavaScript",
            liveDemoStep4Desc: "JavaScript voegt interactiviteit toe. Het is het brein van de pagina. Hier maken we de knop functioneel. Klik op de \"Koop nu\" knop in het voorbeeld om te zien wat er gebeurt!",
            liveDemoPreviewTitle: "Mijn Product",
            liveDemoPreviewText: "Dit is een geweldig product dat je leven zal veranderen. Gemaakt met de beste materialen en ontworpen voor duurzaamheid.",
            liveDemoPreviewBtn: "Koop nu",
            liveDemoActionSuccessTitle: "Actie Voltooid!",
            liveDemoActionSuccessText: "Bedankt voor het klikken! Dit is de kracht van JavaScript: de inhoud van de pagina dynamisch aanpassen zonder te herladen.",
            liveDemoActionSuccessBtn: "Gelukt!",
            liveDemoFooterText: "Dit is het eindresultaat: een gestileerde en interactieve webcomponent.",
            liveDemoFooterBack: "Terug naar Creation+Alt+Fix",
            footerKvk: "KVK: 99986191",
            footerBtw: "BTW: NL005423147B16"
        },
        en: {
            liveDemoPageTitle: "Live Demo: How a Website is Built - Creation+Alt+Fix",
            liveDemoMetaDesc: "A live, interactive timeline demonstrating how a web application is constructed from raw HTML, styled with CSS, and made functional with JavaScript.",
            skipToContent: "Skip to content",
            liveDemoBackBtn: "Back to homepage",
            liveDemoH1: "The Birth of a <span>Website</span>",
            liveDemoSubtitle: "Scroll down to see how simple text transforms into an interactive web page.",
            liveDemoStep1Title: "The Blueprint: Pure HTML",
            liveDemoStep1Desc: "Everything begins with HTML (HyperText Markup Language). This is the page skeleton. It defines structure and content — headings, paragraphs, buttons — without visual styling.",
            liveDemoStep2Title: "The First Layer: Basic CSS",
            liveDemoStep2Desc: "With CSS (Cascading Style Sheets) we add styling. We start with typography, colors, and padding to make text readable and structured.",
            liveDemoStep3Title: "Design & Layout: Advanced CSS",
            liveDemoStep3Desc: "Now we craft visual appeal. We center the container, add elevation shadows, and style the button for intuitive clickability.",
            liveDemoStep4Title: "The Magic: JavaScript",
            liveDemoStep4Desc: "JavaScript adds interactivity — the brain of the webpage. Here we make the button functional. Click the \"Buy now\" button in the preview to test!",
            liveDemoPreviewTitle: "My Product",
            liveDemoPreviewText: "This is an exceptional product designed to elevate your workflow. Built with premium standards for durability.",
            liveDemoPreviewBtn: "Buy now",
            liveDemoActionSuccessTitle: "Action Completed!",
            liveDemoActionSuccessText: "Thank you for clicking! This is the power of JavaScript: dynamically updating page content without reloading.",
            liveDemoActionSuccessBtn: "Success!",
            liveDemoFooterText: "This is the final result: a styled, responsive, and interactive web component.",
            liveDemoFooterBack: "Back to Creation+Alt+Fix",
            footerKvk: "CoC (KVK): 99986191",
            footerBtw: "VAT (BTW): NL005423147B16"
        }
    };

    let currentLang = localStorage.getItem('preferredLanguage') || ((navigator.language || 'nl').split('-')[0] === 'en' ? 'en' : 'nl');
    let hasClickedJsDemo = false;

    function applyTranslations(lang) {
        if (!translations[lang]) lang = 'nl';
        currentLang = lang;
        document.documentElement.lang = lang;

        const htmlKeys = new Set(['liveDemoH1']);

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

        document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        // Update document title and meta
        if (translations[lang].liveDemoPageTitle) {
            document.title = translations[lang].liveDemoPageTitle;
        }

        // If user already clicked the demo button, update that state text too
        if (hasClickedJsDemo) {
            const jsDemoTitle = document.getElementById('js-title');
            const jsDemoText = document.getElementById('js-text');
            const jsDemoButton = document.getElementById('js-button');
            if (jsDemoTitle) jsDemoTitle.textContent = translations[lang].liveDemoActionSuccessTitle;
            if (jsDemoText) jsDemoText.textContent = translations[lang].liveDemoActionSuccessText;
            if (jsDemoButton) jsDemoButton.textContent = translations[lang].liveDemoActionSuccessBtn;
        }

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    // Language switcher buttons
    document.querySelectorAll('#language-switcher .lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            if (lang) {
                applyTranslations(lang);
                localStorage.setItem('preferredLanguage', lang);
            }
        });
    });

    applyTranslations(currentLang);

    // --- Fade-in animation on scroll ---
    const timelineSteps = document.querySelectorAll('.timeline-step');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.25 });

    timelineSteps.forEach(step => {
        observer.observe(step);
    });

    // --- JavaScript Interactive Demo (Step 4) ---
    const jsDemoButton = document.getElementById('js-button');
    const jsDemoText = document.getElementById('js-text');
    const jsDemoTitle = document.getElementById('js-title');

    if (jsDemoButton && jsDemoText && jsDemoTitle) {
        jsDemoButton.addEventListener('click', () => {
            hasClickedJsDemo = true;
            const t = translations[currentLang] || translations.nl;
            jsDemoTitle.textContent = t.liveDemoActionSuccessTitle;
            jsDemoText.textContent = t.liveDemoActionSuccessText;
            jsDemoButton.textContent = t.liveDemoActionSuccessBtn;
            jsDemoButton.disabled = true;
            jsDemoButton.style.backgroundColor = '#6c757d';
            jsDemoButton.style.cursor = 'not-allowed';
        });
    }
});