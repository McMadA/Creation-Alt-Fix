// Cookie Consent Manager for Creation+Alt+Fix (AVG/GDPR Compliant)
(function() {
    function initCookieConsent() {
        const consent = localStorage.getItem('cookie_consent');
        if (consent) return; // Already accepted or rejected

        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-banner-container">
                <div class="cookie-banner-text">
                    <i class="fas fa-cookie-bite" style="color: var(--color-accent, #6366f1); font-size: 1.5rem; margin-right: 12px;"></i>
                    <span>
                        Wij gebruiken functionele en geanonimiseerde analytische cookies om uw gebruikerservaring op onze website te verbeteren. 
                        Lees onze <a href="/privacy-policy.html" style="color: var(--color-accent, #6366f1); text-decoration: underline;">Privacyverklaring</a> voor meer informatie.
                    </span>
                </div>
                <div class="cookie-banner-actions">
                    <button id="cookie-accept-btn" class="cookie-btn cookie-btn-accept">Accepteren</button>
                    <button id="cookie-decline-btn" class="cookie-btn cookie-btn-decline">Weigeren</button>
                </div>
            </div>
        `;

        // Inject banner styles
        const style = document.createElement('style');
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
        document.body.appendChild(banner);

        document.getElementById('cookie-accept-btn').addEventListener('click', function() {
            localStorage.setItem('cookie_consent', 'accepted');
            banner.remove();
        });

        document.getElementById('cookie-decline-btn').addEventListener('click', function() {
            localStorage.setItem('cookie_consent', 'declined');
            banner.remove();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieConsent);
    } else {
        initCookieConsent();
    }
})();
