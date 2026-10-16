document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  // Contact Form AJAX Handler
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');

  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Check honeypot
      const hp = contactForm.querySelector('input[name="website"]');
      if (hp && hp.value.trim() !== '') {
        formStatus.className = 'form-status success';
        formStatus.textContent = 'Hartelijk dank voor uw bericht! Wij nemen zo spoedig mogelijk contact met u op.';
        contactForm.reset();
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Verzenden';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Bezig met verzenden...</span>';
      }

      formStatus.className = 'form-status';
      formStatus.textContent = '';
      formStatus.style.display = 'none';

      const formData = new FormData(contactForm);

      try {
        const response = await fetch('api/contact.php', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        const result = await response.json();

        if (response.ok && result.success) {
          formStatus.className = 'form-status success';
          formStatus.textContent = result.message || 'Hartelijk dank voor uw bericht! Wij nemen zo spoedig mogelijk contact met u op.';
          contactForm.reset();
        } else {
          throw new Error(result.message || 'Er is een fout opgetreden bij het verzenden. Probeer het later opnieuw of neem telefonisch contact op.');
        }
      } catch (err) {
        formStatus.className = 'form-status error';
        formStatus.textContent = err.message || 'Er is een onverwachte fout opgetreden. U kunt ons ook direct bellen via 0598 423992.';
      } finally {
        formStatus.style.display = 'block';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }
});

// ==========================================================================
// 20-Punten Keurmerk: Legal Modals & Zero-Tracking Cookie Banner
// ==========================================================================
window.openPrivacyModal = function() {
  const m = document.getElementById('modal-privacy');
  if (m) {
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.closePrivacyModal = function() {
  const m = document.getElementById('modal-privacy');
  if (m) {
    m.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.openTermsModal = function() {
  const m = document.getElementById('modal-terms');
  if (m) {
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.closeTermsModal = function() {
  const m = document.getElementById('modal-terms');
  if (m) {
    m.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.acceptFlagshipCookies = function() {
  try { localStorage.setItem('flagship_cookie_consent', 'accepted'); } catch(e) {}
  const b = document.getElementById('concept-cookie-bar');
  if (b) b.style.display = 'none';
};

window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    window.closePrivacyModal();
    window.closeTermsModal();
  }
});

// Check existing cookie consent
try {
  if (localStorage.getItem('flagship_cookie_consent') === 'accepted') {
    document.addEventListener('DOMContentLoaded', function() {
      const b = document.getElementById('concept-cookie-bar');
      if (b) b.style.display = 'none';
    });
  }
} catch(e) {}
