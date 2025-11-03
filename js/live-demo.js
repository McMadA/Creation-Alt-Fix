document.addEventListener('DOMContentLoaded', function() {

    // --- Fade-in animatie voor tijdlijn stappen bij scrollen ---
    const timelineSteps = document.querySelectorAll('.timeline-step');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.3 // Trigger als 30% van het element zichtbaar is
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optioneel: stop met observeren na de eerste keer voor betere performance
                // observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    timelineSteps.forEach(step => {
        observer.observe(step);
    });


    // --- Functionaliteit voor de JavaScript Demo (Stap 4) ---
    const jsDemoButton = document.getElementById('js-button');
    const jsDemoText = document.getElementById('js-text');
    const jsDemoTitle = document.getElementById('js-title');

    if (jsDemoButton && jsDemoText && jsDemoTitle) {
        jsDemoButton.addEventListener('click', () => {
            // Verander de tekst en de knop
            jsDemoTitle.textContent = 'Actie Voltooid!';
            jsDemoText.textContent = 'Bedankt voor het klikken! Dit is de kracht van JavaScript: de inhoud van de pagina dynamisch aanpassen zonder te herladen.';
            jsDemoButton.textContent = 'Gelukt!';
            
            // Maak de knop inactief
            jsDemoButton.disabled = true; 
            jsDemoButton.style.backgroundColor = '#6c757d'; // Grijze kleur
            jsDemoButton.style.cursor = 'not-allowed';
        });
    }

});