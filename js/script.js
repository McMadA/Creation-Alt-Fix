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