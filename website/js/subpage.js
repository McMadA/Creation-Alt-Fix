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

    // --- TRANSLATIONS MODULE IMPORT ---
    let translations = window.CREATION_TRANSLATIONS;
    if (!translations) {
        try {
            const transMod = await import('/js/modules/translations-data.js');
            translations = transMod.translations || transMod.default;
            window.CREATION_TRANSLATIONS = translations;
        } catch (e) {
            try {
                const transMod = await import('./modules/translations-data.js');
                translations = transMod.translations || transMod.default;
                window.CREATION_TRANSLATIONS = translations;
            } catch (err) {
                console.error("Failed to load translations module:", err);
                translations = { nl: {}, en: {} };
            }
        }
    }

    var currentLanguage = 'nl';

    function applyTranslations(lang) {
        if (!translations[lang]) return;
        currentLanguage = lang;
        document.documentElement.lang = lang;

        // Keys containing HTML markup — must use innerHTML; all others use textContent for XSS safety
        var htmlKeys = new Set([
            'dienstenOverviewTitle', 'dienstenOverviewH1',
            'itH1', 'itP3', 'itP4', 'aiH1', 'aiP3', 'aiP4',
            'webH1', 'webP3', 'webP4', 'dashH1', 'dashP3', 'dashP4',
            'hbiH1', 'hbiH2Features',
            'windH1', 'windH2Features',
            'overMijH1', 'overMijMissieP3',
            'projectenH1', 'projectenCaseStudyTitle', 'projectenGridTitle',
            'heroHeadline', 'aiServicesTitle', 'learnMore', 'webDesignTitle',
            'aiOplossingenTitle', 'portfolioTitle', 'faqTitle', 'githubTitle',
            'trustTitle', 'contactTitle', 'termsH1', 'privacyH1', 'landingH1', 'liveDemoH1',
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

        var titleEl = document.querySelector('title[data-translate-key]');
        if (titleEl) {
            var key = titleEl.getAttribute('data-translate-key');
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

    function initializeLanguage() {
        var saved = localStorage.getItem('preferredLanguage');
        var browser = (navigator.language || 'nl').split('-')[0];
        var lang = 'nl';
        if (saved && translations[saved]) {
            lang = saved;
        } else if (translations[browser]) {
            lang = browser;
        }
        applyTranslations(lang);
        localStorage.setItem('preferredLanguage', lang);
    }

    initializeLanguage();

    // Event delegation for language switcher (works anytime, even after dynamic injection)
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('#language-switcher .lang-btn, .language-switcher .lang-btn');
        if (btn) {
            var lang = btn.getAttribute('data-lang');
            if (lang) {
                applyTranslations(lang);
                localStorage.setItem('preferredLanguage', lang);
            }
        }
    });

    // Footer year
    var yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- ACTIVE PAGE HIGHLIGHTING (SUBPAGES) ---
    var currentPath = window.location.pathname;
    document.querySelectorAll('#navbar .dropdown-item').forEach(function(item) {
        var href = item.getAttribute('href');
        if (href && href !== '/' && currentPath.includes(href)) {
            item.classList.add('nav-active');
            var parentDropdown = item.closest('.nav-dropdown');
            if (parentDropdown) {
                var toggle = parentDropdown.querySelector('.nav-dropdown-toggle');
                if (toggle) toggle.classList.add('nav-active');
            }
        }
    });
    document.querySelectorAll('#navbar .nav-link').forEach(function(link) {
        var href = link.getAttribute('href');
        if (href && href !== '/' && currentPath.includes(href)) {
            link.classList.add('nav-active');
        }
    });

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
                
                // Close other dropdowns
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

    // Fade-in on scroll for subpages (Modern Subtle Fly-Up)
    var autoFadeSelectors = '.fade-in, .reveal-up, .detail-card, .step-item, .related-card, .tech-category, .faq-list-item, .service-portal-usp-box, .content-section h2, .cta-section h2, .project-card, .doc-card';
    var fadeInElements = document.querySelectorAll(autoFadeSelectors);
    if (fadeInElements.length > 0) {
        fadeInElements.forEach(function(el) {
            if (!el.classList.contains('fade-in') && !el.classList.contains('reveal-up')) {
                el.classList.add('fade-in');
            }
        });

        if ('IntersectionObserver' in window) {
            var observerOptions = { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 };
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);
            fadeInElements.forEach(function(el) { observer.observe(el); });
        } else {
            fadeInElements.forEach(function(el) { el.classList.add('visible'); });
        }
    }

    // Category filter logic (for projecten.html)
    var filterBar = document.getElementById('filter-bar');
    var grid = document.getElementById('projects-grid');
    var countEl = document.getElementById('visible-count');

    if (filterBar && grid) {
        function updateCount() {
            var visible = grid.querySelectorAll('.project-card:not(.hidden)').length;
            if (countEl) countEl.textContent = visible;
        }

        filterBar.addEventListener('click', function(e) {
            var btn = e.target.closest('.filter-btn');
            if (!btn) return;

            filterBar.querySelectorAll('.filter-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');

            var filter = btn.getAttribute('data-filter');
            var cards = grid.querySelectorAll('.project-card');

            cards.forEach(function(card) {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.classList.remove('hidden');
                    card.classList.add('visible');
                } else {
                    card.classList.add('hidden');
                }
            });

            updateCount();
        });

        updateCount();
    }
});
