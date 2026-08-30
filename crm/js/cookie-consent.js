// Cookie Consent Manager for Creation+Alt+Fix (AVG/GDPR Compliant) - Bilingual NL/EN
(function() {
    const translations = {
        nl: {
            text: 'Wij gebruiken functionele en geanonimiseerde analytische cookies om uw gebruikerservaring op onze website te verbeteren. Lees onze <a href="https://creationaltfix.nl/privacy-policy.html" style="color: var(--color-accent, #6366f1); text-decoration: underline;">Privacyverklaring</a> voor meer informatie.',
            accept: 'Accepteren',
            decline: 'Weigeren'
        },
        en: {
            text: 'We use functional and anonymized analytical cookies to improve your user experience on our website. Read our <a href="https://creationaltfix.nl/privacy-policy.html" style="color: var(--color-accent, #6366f1); text-decoration: underline;">Privacy Policy</a> for more information.',
            accept: 'Accept',
            decline: 'Decline'
        }
    };

    function getCurrentLanguage() {
        const saved = localStorage.getItem('preferredLanguage');
        if (saved && translations[saved]) return saved;
        const browser = (navigator.language || 'nl').split('-')[0];
        return translations[browser] ? browser : 'nl';
    }

    function updateBannerLanguage(banner, lang) {
        const t = translations[lang] || translations.nl;
        const textSpan = banner.querySelector('.cookie-banner-text span');
        const acceptBtn = banner.querySelector('#cookie-accept-btn');
        const declineBtn = banner.querySelector('#cookie-decline-btn');
        if (textSpan) textSpan.innerHTML = t.text;
        if (acceptBtn) acceptBtn.textContent = t.accept;
        if (declineBtn) declineBtn.textContent = t.decline;
    }

    function initCookieConsent() {
        const consent = localStorage.getItem('cookie_consent');
        if (consent) return; // Already accepted or rejected

        let banner = document.getElementById('cookie-consent-banner');
        if (banner) return;

        const lang = getCurrentLanguage();
        const t = translations[lang] || translations.nl;

        banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-banner-container">
                <div class="cookie-banner-text">
                    <i class="fas fa-cookie-bite" style="color: var(--color-accent, #6366f1); font-size: 1.5rem; margin-right: 12px;"></i>
                    <span>${t.text}</span>
                </div>
                <div class="cookie-banner-actions">
                    <button id="cookie-accept-btn" class="cookie-btn cookie-btn-accept">${t.accept}</button>
                    <button id="cookie-decline-btn" class="cookie-btn cookie-btn-decline">${t.decline}</button>
                </div>
            </div>
        `;

        // Inject banner styles if not present
        if (!document.getElementById('cookie-consent-styles')) {
            const style = document.createElement('style');
            style.id = 'cookie-consent-styles';
            style.textContent = `
                #cookie-consent-banner {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    right: 20px;
                    max-width: 900px;
                    margin: 0 auto;
                    background: rgba(18, 18, 26, 0.95);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 16px;
                    padding: 18px 24px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                    z-index: 99999;
                    animation: slideUpCookie 0.4s ease-out;
                }
                @keyframes slideUpCookie {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .cookie-banner-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    flex-wrap: wrap;
                }
                .cookie-banner-text {
                    display: flex;
                    align-items: center;
                    color: #e2e8f0;
                    font-size: 0.92rem;
                    line-height: 1.5;
                    flex: 1 1 500px;
                }
                .cookie-banner-actions {
                    display: flex;
                    gap: 10px;
                }
                .cookie-btn {
                    padding: 8px 18px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }
                .cookie-btn-accept {
                    background: linear-gradient(135deg, #6366f1, #4f46e5);
                    color: #ffffff;
                }
                .cookie-btn-accept:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }
                .cookie-btn-decline {
                    background: rgba(255, 255, 255, 0.1);
                    color: #cbd5e1;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .cookie-btn-decline:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: #ffffff;
                }
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(banner);

        document.getElementById('cookie-accept-btn').addEventListener('click', function() {
            localStorage.setItem('cookie_consent', 'accepted');
            banner.remove();
        });

        document.getElementById('cookie-decline-btn').addEventListener('click', function() {
            localStorage.setItem('cookie_consent', 'declined');
            banner.remove();
        });

        // Listen for language changes across the site
        window.addEventListener('languageChanged', function(e) {
            if (e.detail && e.detail.lang) {
                const b = document.getElementById('cookie-consent-banner');
                if (b) updateBannerLanguage(b, e.detail.lang);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieConsent);
    } else {
        initCookieConsent();
    }
})();
