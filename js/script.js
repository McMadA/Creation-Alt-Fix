document.addEventListener('DOMContentLoaded', function() {

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