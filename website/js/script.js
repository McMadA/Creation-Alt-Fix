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

        // Keys containing HTML markup — strictly whitelisted and sanitized before innerHTML; all others use textContent for XSS safety (CWE-79)
        var htmlKeys = new Set([
            'aboutTitle', 'aiH1', 'aiH2', 'aiOplossingenTitle', 'aiP3', 'aiP4', 'aiServicesTitle',
            'contactTitle', 'crmChallengeP2', 'crmH1', 'crmPillarsTitle',
            'dashH1', 'dashP3', 'dashP4', 'dienstenOverviewH1', 'dienstenOverviewTitle',
            'error404Title', 'faqTitle', 'githubTitle',
            'hbiH1', 'hbiH2Features', 'heroHeadline', 'heroQualityPill',
            'itH1', 'itP3', 'itP4', 'landingH1', 'learnMore', 'liveDemoH1',
            'overMijH1', 'overMijMissieP3', 'portfolioTitle',
            'privacyH1', 'privacyLi3_1', 'privacyLi3_2', 'privacyLi3_3',
            'privacyP1_1', 'privacyP1_2', 'privacyP6_1', 'privacyP8_2',
            'projectenCaseStudyTitle', 'projectenGridTitle', 'projectenH1',
            'qualityBadge', 'qualityP4Desc', 'qualityTitle', 'radarH2',
            'shieldH2', 'stagingH2', 'studioH2',
            'termsH1', 'termsLi1_1', 'termsLi1_2', 'termsLi1_3',
            'termsP10_1', 'termsP2_1', 'termsP3_1', 'termsP4_1', 'termsP5_1',
            'termsP6_1', 'termsP7_1', 'termsP8_1', 'termsP9_1',
            'trustTitle', 'watermarkText', 'webDesignTitle',
            'webH1', 'webP3', 'webP4', 'windH1', 'windH2Features', 'workflowSectionTitle'
        ]);

        function sanitizeTrustedHtml(str) {
            if (typeof str !== 'string') return '';
            return str
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
                .replace(/javascript:\s*/gi, '');
        }

        document.querySelectorAll('[data-translate-key]').forEach(function(element) {
            var key = element.getAttribute('data-translate-key');
            if (translations[lang][key] !== undefined) {
                var val = translations[lang][key];
                if (htmlKeys.has(key)) {
                    element.innerHTML = sanitizeTrustedHtml(val);
                } else {
                    element.textContent = val;
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

    // Intercept clicks on links that point to anchors on current page (navbar, hero, or in-page CTA)
    document.addEventListener('click', function(e) {
        var link = e.target.closest('a[href*="#"]');
        if (!link) return;

        var href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) return;
        if (link.getAttribute('target') === '_blank') return;

        var url;
        try {
            url = new URL(href, window.location.origin);
        } catch (err) {
            return;
        }

        // Check if link points to current page with hash
        if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === window.location.pathname) {
            if (url.hash) {
                var targetElement = null;
                try {
                    targetElement = document.querySelector(url.hash);
                } catch (err) {}
                if (targetElement) {
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
