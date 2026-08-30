/**
 * Creation+Alt+Fix - Client System Handover & Documentation Suite
 * Interactive Checklist, Dynamic Search, Scrollspy, Print/PDF & NL/EN Localization
 */

// --- 1. Bilingual Translation Dictionary ---
const docsTranslations = {
    nl: {
        docsNavOverview: "1. Overdracht & Start",
        docsNavDns: "2. Domein & E-mail DNS",
        docsNavCms: "3. CMS & Content Beheer",
        docsNavSecurity: "4. Beveiliging & AVG",
        docsNavSeo: "5. SEO & Google Setup",
        docsNavSupport: "6. Nazorg & Onderhoud",
        docsHeroBadge: "Officiële Systeem Overdracht",
        docsHeroTitle: "Oplevering & Documentatie Gids",
        docsHeroDesc: "Welkom bij jouw nieuwe website en software-infrastructuur van Creation+Alt+Fix. Hieronder vind je alle technische gegevens, beheerinstructies, videohandleidingen en onderhoudsrichtlijnen.",
        docsSearchPlaceholder: "🔍 Zoek op onderwerp (bijv. DNS, CMS, Analytics, E-mail)...",
        docsPrintBtn: "🖨️ Download / Print Gids (PDF)",
        docsPortalBtn: "🚀 Naar Klantenportaal",
        docsChecklistTitle: "Interactieve Overdrachts-Checklist",
        docsVideoCaption: "Videohandleiding: Content aanpassen, afbeeldingen uploaden en formulieren beheren."
    },
    en: {
        docsNavOverview: "1. Handover & Start",
        docsNavDns: "2. Domain & Email DNS",
        docsNavCms: "3. CMS & Content Editing",
        docsNavSecurity: "4. Security & GDPR",
        docsNavSeo: "5. SEO & Google Setup",
        docsNavSupport: "6. Aftercare & Support",
        docsHeroBadge: "Official System Handover",
        docsHeroTitle: "Delivery & Documentation Guide",
        docsHeroDesc: "Welcome to your new website and software infrastructure by Creation+Alt+Fix. Below you will find all technical specifications, management instructions, video tutorials, and maintenance guidelines.",
        docsSearchPlaceholder: "🔍 Search topic (e.g. DNS, CMS, Analytics, Email)...",
        docsPrintBtn: "🖨️ Download / Print Guide (PDF)",
        docsPortalBtn: "🚀 To Client Portal",
        docsChecklistTitle: "Interactive Handover Checklist",
        docsVideoCaption: "Video Tutorial: Editing content, uploading images, and managing form submissions."
    }
};

let currentLang = localStorage.getItem('preferredLanguage') || (navigator.language?.startsWith('en') ? 'en' : 'nl');

export function applyDocsLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('preferredLanguage', lang);
    const dict = docsTranslations[lang] || docsTranslations.nl;

    document.querySelectorAll('[data-docs-translate]').forEach(el => {
        const key = el.getAttribute('data-docs-translate');
        if (dict[key]) {
            if (el.tagName === 'INPUT') {
                el.placeholder = dict[key];
            } else {
                el.innerText = dict[key];
            }
        }
    });

    document.documentElement.lang = lang;
}

const navTranslations = {
    nl: {
        navHome: "Home",
        navServices: "Diensten",
        navWorkflow: "Werkwijze",
        navProjects: "Projecten",
        navAbout: "Over Ons",
        navContact: "Contact",
        navIntake: "Intake",
        navPortalLogin: "Portaal",
        navAIServices: "AI Services",
        navWebDesign: "Web Design & Tech",
        ariaInstagram: "Instagram CreationAltFix",
        ariaLinkedIn: "LinkedIn CreationAltFix",
        ariaToggleNav: "Navigatie in-/uitklappen",
        navServicesPagesHeader: "Diensten & Specialisaties",
        navServicesHomeHeader: "Op de Hoofdpagina",
        navWorkflowDropdownHeader: "Werkwijze & Portaal",
        navProjectsPagesHeader: "Portfolio & Cases",
        navProjectsHomeHeader: "Op de Hoofdpagina",
        navAboutDropdownHeader: "Over Creation+Alt+Fix",
        navServiceAll: "Alle Diensten Overzicht",
        navServiceAI: "Slimme Automatisering & AI",
        navServiceWeb: "Websites & Webshops",
        navServiceDashboards: "Data Dashboards & Inzichten",
        navServiceIT: "Software Support & Beheer",
        navAIServicesSection: "AI-Gedreven Oplossingen",
        navWhyUsSection: "Waarom Creation+Alt+Fix?",
        navWorkflowSection: "5-Stappen Aanpak (Home)",
        navPortalCase: "Klantenportaal Case Study",
        navDocsLink: "DevOps & AI Documentatie",
        navPortalDirect: "Direct naar Klantenportaal",
        navProjectsAll: "Alle Projecten (14+)",
        navCaseArnold: "Arnold Design (AI Shield)",
        navCaseHBI: "Home Buyer Intelligence",
        navCaseWind: "Wind Cloud Sync Tools",
        navLiveDemo: "Interactieve Live Demo",
        navProjectsSection: "Website Showcase",
        navGithubSection: "Open Source & GitHub",
        navAboutPage: "Over Allard & Achtergrond",
        navAboutSection: "Introductie (Home)",
        navFaqSection: "Veelgestelde Vragen (FAQ)"
    },
    en: {
        navHome: "Home",
        navServices: "Services",
        navWorkflow: "Workflow",
        navProjects: "Projects",
        navAbout: "About Us",
        navContact: "Contact",
        navIntake: "Intake",
        navPortalLogin: "Portal",
        navAIServices: "AI Services",
        navWebDesign: "Web Design & Tech",
        ariaInstagram: "Instagram CreationAltFix",
        ariaLinkedIn: "LinkedIn CreationAltFix",
        ariaToggleNav: "Toggle navigation",
        navServicesPagesHeader: "Services & Specializations",
        navServicesHomeHeader: "On the Homepage",
        navWorkflowDropdownHeader: "Workflow & Portal",
        navProjectsPagesHeader: "Portfolio & Cases",
        navProjectsHomeHeader: "On the Homepage",
        navAboutDropdownHeader: "About Creation+Alt+Fix",
        navServiceAll: "All Services Overview",
        navServiceAI: "Smart Automation & AI",
        navServiceWeb: "Websites & Webshops",
        navServiceDashboards: "Data Dashboards & Insights",
        navServiceIT: "Software Support & Management",
        navAIServicesSection: "AI-Driven Solutions",
        navWhyUsSection: "Why Creation+Alt+Fix?",
        navWorkflowSection: "5-Step Approach (Home)",
        navPortalCase: "Client Portal Case Study",
        navDocsLink: "DevOps & AI Documentation",
        navPortalDirect: "Go to Client Portal",
        navProjectsAll: "All Projects (14+)",
        navCaseArnold: "Arnold Design (AI Shield)",
        navCaseHBI: "Home Buyer Intelligence",
        navCaseWind: "Wind Cloud Sync Tools",
        navLiveDemo: "Interactive Live Demo",
        navProjectsSection: "Website Showcase",
        navGithubSection: "Open Source & GitHub",
        navAboutPage: "About Allard & Background",
        navAboutSection: "Introduction (Home)",
        navFaqSection: "Frequently Asked Questions (FAQ)"
    }
};

// --- 2. Dynamic Component Loader (Navbar & Footer) ---
async function loadComponents() {
    try {
        const [navRes, footRes] = await Promise.all([
            fetch('/components/navbar.html'),
            fetch('/components/footer.html')
        ]);

        if (navRes.ok) {
            const navHtml = await navRes.text();
            const navPlaceholder = document.getElementById('navbar-placeholder');
            if (navPlaceholder) navPlaceholder.outerHTML = navHtml;
        }

        if (footRes.ok) {
            const footHtml = await footRes.text();
            const footPlaceholder = document.getElementById('footer-placeholder');
            if (footPlaceholder) footPlaceholder.outerHTML = footHtml;
        }

        // Apply translations to navbar items
        const dict = navTranslations[currentLang] || navTranslations.nl;
        document.querySelectorAll('#navbar [data-translate-key]').forEach(el => {
            const key = el.getAttribute('data-translate-key');
            if (dict[key]) el.textContent = dict[key];
        });

        // Setup language toggle buttons if present
        document.querySelectorAll('.lang-btn, [data-lang]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetLang = btn.getAttribute('data-lang') || (currentLang === 'nl' ? 'en' : 'nl');
                applyDocsLanguage(targetLang);
                const updatedDict = navTranslations[targetLang] || navTranslations.nl;
                document.querySelectorAll('#navbar [data-translate-key]').forEach(el => {
                    const key = el.getAttribute('data-translate-key');
                    if (updatedDict[key]) el.textContent = updatedDict[key];
                });
            });
        });

        // Active page highlighting for Docs
        document.querySelectorAll('#navbar .dropdown-item').forEach(item => {
            if (item.getAttribute('href') === '/docs/') {
                item.classList.add('nav-active');
                const parent = item.closest('.nav-dropdown');
                if (parent) {
                    const toggle = parent.querySelector('.nav-dropdown-toggle');
                    if (toggle) toggle.classList.add('nav-active');
                }
            }
        });

        // Hamburger & Dropdown logic
        const hamburgerBtn = document.getElementById('hamburger-menu');
        const navMenuItems = document.getElementById('nav-menu-items');
        const navDropdowns = document.querySelectorAll('.nav-dropdown');

        if (hamburgerBtn && navMenuItems) {
            const hamburgerIcon = hamburgerBtn.querySelector('i');
            hamburgerBtn.addEventListener('click', () => {
                navMenuItems.classList.toggle('active');
                const isActive = navMenuItems.classList.contains('active');
                hamburgerBtn.setAttribute('aria-expanded', isActive.toString());
                if (hamburgerIcon) {
                    hamburgerIcon.classList.toggle('fa-bars', !isActive);
                    hamburgerIcon.classList.toggle('fa-times', isActive);
                }
            });

            navMenuItems.querySelectorAll('a:not(.nav-dropdown-toggle)').forEach(link => {
                link.addEventListener('click', () => {
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

        // Dropdown toggle click handlers
        navDropdowns.forEach(dropdown => {
            const toggleBtn = dropdown.querySelector('.nav-dropdown-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isAlreadyActive = dropdown.classList.contains('active');
                    navDropdowns.forEach(d => {
                        if (d !== dropdown) {
                            d.classList.remove('active');
                            const btn = d.querySelector('.nav-dropdown-toggle');
                            if (btn) btn.setAttribute('aria-expanded', 'false');
                        }
                    });
                    dropdown.classList.toggle('active', !isAlreadyActive);
                    toggleBtn.setAttribute('aria-expanded', (!isAlreadyActive).toString());
                });
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                navDropdowns.forEach(d => {
                    d.classList.remove('active');
                    const btn = d.querySelector('.nav-dropdown-toggle');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });
            }
        });

        // Escape key closes dropdowns
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                navDropdowns.forEach(d => {
                    d.classList.remove('active');
                    const btn = d.querySelector('.nav-dropdown-toggle');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });
            }
        });

    } catch (err) {
        console.warn("Kon externe navbar/footer componenten niet laden:", err);
    }
}

// --- 3. Interactive Checklist Persistence ---
const CHECKLIST_STORAGE_KEY = 'caf_docs_handover_checklist';

function initChecklist() {
    const savedState = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || '{}');
    const items = document.querySelectorAll('.checklist-item');

    items.forEach((item, index) => {
        const id = item.getAttribute('data-check-id') || `check_${index}`;
        if (savedState[id]) {
            item.classList.add('completed');
            const checkbox = item.querySelector('.checklist-checkbox');
            if (checkbox) checkbox.innerHTML = '<i class="fas fa-check"></i>';
        }

        item.addEventListener('click', () => {
            const isCompleted = item.classList.toggle('completed');
            savedState[id] = isCompleted;
            localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(savedState));
            
            const checkbox = item.querySelector('.checklist-checkbox');
            if (checkbox) {
                checkbox.innerHTML = isCompleted ? '<i class="fas fa-check"></i>' : '';
            }
            updateChecklistProgress();
        });
    });

    updateChecklistProgress();
}

function updateChecklistProgress() {
    const items = document.querySelectorAll('.checklist-item');
    const completed = document.querySelectorAll('.checklist-item.completed');
    const progressText = document.getElementById('checklist-progress-text');
    const progressBar = document.getElementById('checklist-progress-bar');

    if (items.length > 0) {
        const percent = Math.round((completed.length / items.length) * 100);
        if (progressText) progressText.innerText = `${completed.length} van ${items.length} stappen voltooid (${percent}%)`;
        if (progressBar) progressBar.style.width = `${percent}%`;
    }
}

// --- 4. Live Documentation Search Filter ---
function initSearch() {
    const searchInput = document.getElementById('docs-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const sections = document.querySelectorAll('.docs-section');

        sections.forEach(sec => {
            const text = sec.innerText.toLowerCase();
            if (!query || text.includes(query)) {
                sec.style.display = 'block';
            } else {
                sec.style.display = 'none';
            }
        });
    });
}

// --- 5. ScrollSpy & Sidebar Active State ---
function initScrollSpy() {
    const sections = document.querySelectorAll('.docs-section');
    const navLinks = document.querySelectorAll('.docs-nav-link');

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        sections.forEach(sec => {
            const top = sec.offsetTop - 120;
            if (window.scrollY >= top) {
                currentSectionId = sec.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });
}

// --- 6. Code Copy Snippet Handlers ---
function initCodeCopy() {
    document.querySelectorAll('.btn-copy-code').forEach(btn => {
        btn.addEventListener('click', () => {
            const pre = btn.closest('.code-snippet-box')?.querySelector('pre');
            if (pre) {
                navigator.clipboard.writeText(pre.innerText.trim());
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Gekopieerd!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            }
        });
    });
}

// --- 7. Print & PDF Trigger ---
function initPrintTrigger() {
    document.querySelectorAll('#btn-print-docs, .btn-print-docs').forEach(btn => {
        btn.addEventListener('click', () => {
            window.print();
        });
    });
}

// --- 8. URL Parameter Personalization ---
function initProjectPersonalization() {
    const params = new URLSearchParams(window.location.search);
    const domain = params.get('domain') || params.get('url');
    const client = params.get('client');

    if (domain) {
        document.querySelectorAll('.project-domain-display').forEach(el => {
            el.innerText = domain;
        });
    }
    if (client) {
        document.querySelectorAll('.project-client-display').forEach(el => {
            el.innerText = client;
        });
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadComponents();
    applyDocsLanguage(currentLang);
    initChecklist();
    initSearch();
    initScrollSpy();
    initCodeCopy();
    initPrintTrigger();
    initProjectPersonalization();
});
