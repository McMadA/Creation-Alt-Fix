document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  // 2. High-Performance Vanilla JS Lightbox Gallery
  const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
  const lightbox = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const closeBtn = document.getElementById('lightboxClose');

  let currentIndex = 0;

  function updateLightbox(index) {
    if (!galleryItems.length || index < 0 || index >= galleryItems.length) return;
    currentIndex = index;
    const item = galleryItems[currentIndex];
    const fullSrc = item.getAttribute('data-full') || item.querySelector('img')?.src;
    const caption = item.getAttribute('data-caption') || item.querySelector('img')?.alt || '';

    if (lightboxImg) lightboxImg.src = fullSrc;
    if (lightboxCaption) lightboxCaption.textContent = caption;
    if (lightboxCounter) lightboxCounter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
  }

  function openLightbox(index) {
    if (!lightbox) return;
    updateLightbox(index);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  galleryItems.forEach((item, idx) => {
    item.addEventListener('click', () => openLightbox(idx));
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateLightbox((currentIndex - 1 + galleryItems.length) % galleryItems.length);
  });
  if (nextBtn) nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateLightbox((currentIndex + 1) % galleryItems.length);
  });

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') updateLightbox((currentIndex - 1 + galleryItems.length) % galleryItems.length);
    if (e.key === 'ArrowRight') updateLightbox((currentIndex + 1) % galleryItems.length);
  });

  // 3. Contact & Reservation Form Submission Handler
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');

  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Check honeypot
      const hp = contactForm.querySelector('input[name="website"]');
      if (hp && hp.value.trim() !== '') {
        formStatus.className = 'form-status success';
        formStatus.textContent = 'Hartelijk dank voor uw reserveringsaanvraag! Wij nemen zo spoedig mogelijk contact met u op.';
        contactForm.reset();
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Aanvraag Verzenden';

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
          formStatus.textContent = result.message || 'Hartelijk dank voor uw aanvraag! Wij nemen zo spoedig mogelijk contact met u op.';
          contactForm.reset();
        } else {
          throw new Error(result.message || 'Er is een fout opgetreden bij het verzenden. Probeer het later opnieuw of neem telefonisch contact op.');
        }
      } catch (err) {
        formStatus.className = 'form-status error';
        formStatus.textContent = err.message || 'Er is een onverwachte fout opgetreden. U kunt ons ook direct bellen via 0598 423902.';
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
