/**
 * @file crm/status/js/modules/chat-notifications.js
 * Realtime In-Portal Chat Notificaties (Geluid & Browservenster Badges) (TASK-913).
 * 
 * Biedt een realtime notificatie-architectuur voor in-portal messaging:
 * - Web Audio API dual-harmonic chime & blip synthesizer (100% zero-asset, geen externe audiobestanden nodig)
 * - Geluidsvoorkeur persistence (localStorage audio toggle met muting/unmuting & visual status)
 * - Paginatitel flashing & dynamische badge notificaties bij inactief tabblad (document.hidden / blur)
 * - HTML5 Canvas favicon badge generator (dynamische rode/accent teller direct op het tabicoon)
 * - Floating glassmorphism in-app toast notificatie met 1-klik "Bekijken" scroll-naar-chat actie
 * - Pure deterministische differential engine voor geautomatiseerde unittests en Node.js integratie
 * 
 * Creation+Alt+Fix (2026/2027)
 */

import { escapeHtml } from "../../../js/firebase-config.js";

/**
 * Audio Synthesizer Configuratie & Constanten
 */
export const DEFAULT_SOUND_CONFIG = {
    chime: {
        tones: [
            { freq: 587.33, start: 0, duration: 0.22, gainRatio: 0.8 }, // D5
            { freq: 880.00, start: 0.09, duration: 0.35, gainRatio: 1.0 }  // A5
        ],
        type: 'sine'
    },
    ping: {
        tones: [
            { freq: 783.99, start: 0, duration: 0.18, gainRatio: 0.9 } // G5
        ],
        type: 'sine'
    },
    urgent: {
        tones: [
            { freq: 523.25, start: 0, duration: 0.14, gainRatio: 0.85 },   // C5
            { freq: 659.25, start: 0.08, duration: 0.14, gainRatio: 0.9 },  // E5
            { freq: 783.99, start: 0.16, duration: 0.28, gainRatio: 1.0 }   // G5
        ],
        type: 'sine'
    }
};

export const CHAT_SOUND_STORAGE_KEY = 'caf_portal_chat_sound_enabled';

let cachedAudioContext = null;

/**
 * Initialiseert of herstelt een singleton AudioContext voor Web Audio API synthese.
 * @returns {AudioContext|null}
 */
export function getNotificationAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!cachedAudioContext) {
        try {
            cachedAudioContext = new AudioCtx();
        } catch (e) {
            return null;
        }
    }
    return cachedAudioContext;
}

/**
 * Controleert of notificatiegeluiden zijn ingeschakeld door de gebruiker.
 * @returns {boolean}
 */
export function isChatSoundEnabled() {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    try {
        return window.localStorage.getItem(CHAT_SOUND_STORAGE_KEY) !== 'false';
    } catch (e) {
        return true;
    }
}

/**
 * Werkt de voorkeur voor notificatiegeluid bij in localStorage.
 * @param {boolean} enabled 
 * @returns {boolean}
 */
export function setChatSoundEnabled(enabled) {
    const val = Boolean(enabled);
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(CHAT_SOUND_STORAGE_KEY, val ? 'true' : 'false');
        } catch (e) {
            // Safe fallback
        }
    }
    return val;
}

/**
 * Schakelt notificatiegeluid om tussen actief en gedempt.
 * @returns {boolean} De nieuwe actieve status
 */
export function toggleChatSound() {
    const nextState = !isChatSoundEnabled();
    setChatSoundEnabled(nextState);
    return nextState;
}

/**
 * Synthetiseert een professioneel, subtiel notificatiegeluid via de Web Audio API.
 * Werkt zonder externe audiobestanden (0 latency, 0 netwerkaanvragen, werkt offline).
 * 
 * @param {Object} options
 * @param {'chime'|'ping'|'urgent'} [options.soundType='chime']
 * @param {number} [options.volume=0.25] Volume tussen 0.01 en 1.0
 * @param {AudioContext} [options.audioContext] Optionele mock context voor tests
 * @returns {Promise<boolean>}
 */
export async function playChimeSound({ soundType = 'chime', volume = 0.25, audioContext = null } = {}) {
    if (typeof window === 'undefined' && !audioContext) {
        return false;
    }

    try {
        const ctx = audioContext || getNotificationAudioContext();
        if (!ctx) return false;

        // Browsers blokkeren audio tot de eerste gebruikersinteractie
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
            try {
                await ctx.resume();
            } catch (e) {
                // Autoplay policy kan resume blokkeren
            }
        }

        if (ctx.state !== 'running') {
            return false;
        }

        const config = DEFAULT_SOUND_CONFIG[soundType] || DEFAULT_SOUND_CONFIG.chime;
        const safeVol = Math.max(0.01, Math.min(1.0, Number(volume) || 0.25));
        const now = ctx.currentTime;

        config.tones.forEach(tone => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            const startTime = now + tone.start;
            const stopTime = startTime + tone.duration;
            const peakGain = safeVol * tone.gainRatio;

            osc.type = config.type || 'sine';
            osc.frequency.setValueAtTime(tone.freq, startTime);

            // Envelope: zachte aanval en soepele exponentiële decay
            gainNode.gain.setValueAtTime(0.0001, startTime);
            gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(stopTime + 0.01);
        });

        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Pure deterministische functie: Detecteert nieuwe inkomende berichten tussen twee toestanden.
 * Filtert berichten van de huidige gebruiker weg (klant krijgt geen ping voor eigen berichten).
 * 
 * @param {Object} params
 * @param {Array} [params.previousMessages=[]]
 * @param {Array} [params.currentMessages=[]]
 * @param {'client'|'admin'} [params.currentUserRole='client']
 * @param {string|null} [params.lastSeenTimestamp=null]
 * @param {Set|Array|null} [params.knownIds=null]
 * @returns {{ hasNew: boolean, count: number, newMessages: Array, latestMessage: Object|null }}
 */
export function detectNewIncomingMessages({
    previousMessages = [],
    currentMessages = [],
    currentUserRole = 'client',
    lastSeenTimestamp = null,
    knownIds = null
} = {}) {
    const prevList = Array.isArray(previousMessages) ? previousMessages : [];
    const currList = Array.isArray(currentMessages) ? currentMessages : [];

    const prevIdSet = new Set();
    if (knownIds) {
        const idIterable = knownIds instanceof Set ? knownIds : (Array.isArray(knownIds) ? knownIds : []);
        idIterable.forEach(id => {
            if (id) prevIdSet.add(String(id));
        });
    }

    if (prevIdSet.size === 0) {
        prevList.forEach(m => {
            if (!m) return;
            const id = m.id || m.ticketId || (m.createdAt ? `${m.sender || 'm'}_${m.createdAt}` : null);
            if (id) prevIdSet.add(String(id));
        });
    }

    const lastSeenTime = lastSeenTimestamp ? new Date(lastSeenTimestamp).getTime() : 0;
    const newMessages = [];

    currList.forEach(msg => {
        if (!msg) return;
        const msgId = msg.id || msg.ticketId || (msg.createdAt ? `${msg.sender || 'm'}_${msg.createdAt}` : null);
        const strId = msgId ? String(msgId) : null;

        // Skip als het bericht al bekend was
        if (strId && prevIdSet.has(strId)) return;

        // Bepaal of het bericht door de huidige gebruiker zelf is verzonden
        const isSelf = (currentUserRole === 'client')
            ? (msg.sender === 'client' || msg.senderRole === 'client' || msg.role === 'client')
            : (msg.sender === 'admin' || msg.senderRole === 'admin' || msg.role === 'admin');

        if (isSelf) return;

        // Skip als het bericht ouder is dan het laatste bekeken tijdstip
        if (lastSeenTime > 0 && msg.createdAt) {
            const msgTime = new Date(msg.createdAt).getTime();
            if (msgTime <= lastSeenTime) return;
        }

        newMessages.push(msg);
    });

    const hasNew = newMessages.length > 0;
    const latestMessage = hasNew ? newMessages[newMessages.length - 1] : null;

    return {
        hasNew,
        count: newMessages.length,
        newMessages,
        latestMessage
    };
}

/**
 * Formatteert de paginatitel met aantal ongelezen berichten.
 * Pure deterministische functie, geschikt voor tests.
 * 
 * @param {number} unreadCount 
 * @param {string} [originalTitle='Creation+Alt+Fix']
 * @param {Object} [options={}]
 * @param {string} [options.senderName]
 * @param {string} [options.prefix='💬']
 * @returns {string}
 */
export function formatTabTitle(unreadCount, originalTitle = 'Creation+Alt+Fix', options = {}) {
    const orig = (typeof originalTitle === 'string' && originalTitle.trim().length > 0)
        ? originalTitle.trim()
        : 'Creation+Alt+Fix';

    const count = Math.max(0, parseInt(unreadCount, 10) || 0);
    if (count <= 0) return orig;

    const prefix = options.prefix || '💬';
    const senderSuffix = options.senderName ? ` van ${options.senderName}` : '';
    const label = count === 1
        ? `(${count}) ${prefix} Nieuw bericht${senderSuffix}`
        : `(${count}) ${prefix} Nieuwe berichten`;

    return `${label} | ${orig}`;
}

/**
 * Start het knipperen/afwisselen van de documenttitel bij inactief tabblad.
 * 
 * @param {Object} params
 * @param {number} params.unreadCount
 * @param {string} [params.senderName]
 * @param {string} [params.originalTitle]
 * @param {number} [params.intervalMs=1800]
 * @returns {number|null} Interval ID voor opruiming
 */
export function startTitleFlashing({ unreadCount, senderName, originalTitle, intervalMs = 1800 } = {}) {
    if (typeof document === 'undefined') return null;

    const baseTitle = originalTitle || document.title || 'Creation+Alt+Fix';
    const count = Math.max(1, parseInt(unreadCount, 10) || 1);
    const alertTitle = formatTabTitle(count, baseTitle, { senderName });

    let isAlertState = true;
    document.title = alertTitle;

    const intervalId = setInterval(() => {
        if (typeof document === 'undefined') return;
        isAlertState = !isAlertState;
        document.title = isAlertState ? alertTitle : baseTitle;
    }, intervalMs);

    return intervalId;
}

/**
 * Stopt het knipperen van de documenttitel en herstelt de oorspronkelijke titel.
 * 
 * @param {number|null} intervalId 
 * @param {string} [originalTitle]
 */
export function stopTitleFlashing(intervalId, originalTitle) {
    if (intervalId) {
        clearInterval(intervalId);
    }
    if (typeof document !== 'undefined' && originalTitle) {
        document.title = originalTitle;
    }
}

/**
 * Genereert een dynamische Favicon met een rode/accent notificatiebadge via HTML5 Canvas.
 * 
 * @param {number} unreadCount 
 * @param {Object} [options={}]
 * @param {string} [options.badgeColor='#ef4444']
 * @param {string} [options.textColor='#ffffff']
 * @param {number} [options.size=32]
 * @returns {Promise<string|null>} Data URL of null
 */
export async function generateFaviconWithBadge(unreadCount, {
    badgeColor = '#ef4444',
    textColor = '#ffffff',
    size = 32
} = {}) {
    if (typeof document === 'undefined') return null;

    const count = Math.max(0, parseInt(unreadCount, 10) || 0);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Basisicoon: Donkere AI cirkel met Creation+Alt+Fix accent
    ctx.clearRect(0, 0, size, size);

    // Achtergrond glyph
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(0, 0, size, size, 6) : ctx.rect(0, 0, size, size);
    ctx.fill();

    // Merkaccent gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#22d3ee');
    grad.addColorStop(1, '#6366f1');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Symbool 'C+'
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C+', size / 2, size / 2 + 1);

    if (count > 0) {
        // Notificatie Badge Cirkel in rechter bovenhoek
        const badgeRadius = 7.5;
        const badgeX = size - badgeRadius - 1;
        const badgeY = badgeRadius + 1;

        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Contrasterende rand
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Getal
        ctx.fillStyle = textColor;
        ctx.font = 'bold 8.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayCount = count > 9 ? '9+' : String(count);
        ctx.fillText(displayCount, badgeX, badgeY + 0.5);
    }

    try {
        return canvas.toDataURL('image/png');
    } catch (e) {
        return null;
    }
}

/**
 * Werkt de browser favicon bij met het aantal ongelezen berichten.
 * 
 * @param {number} unreadCount 
 * @param {Object} [options={}]
 * @returns {Promise<boolean>}
 */
export async function updateFaviconBadge(unreadCount, options = {}) {
    if (typeof document === 'undefined') return false;

    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }

    // Bewaar originele URL als deze nog niet is opgeslagen
    if (!link.dataset.originalHref) {
        link.dataset.originalHref = link.getAttribute('href') || '/images/logo.webp';
    }

    const count = Math.max(0, parseInt(unreadCount, 10) || 0);

    if (count <= 0) {
        // Herstel originele favicon
        link.setAttribute('href', link.dataset.originalHref);
        return true;
    }

    const dataUrl = await generateFaviconWithBadge(count, options);
    if (dataUrl) {
        link.setAttribute('href', dataUrl);
        return true;
    }
    return false;
}

/**
 * Formatteert toast metadata voor een inkomend bericht.
 * Pure deterministische functie.
 * 
 * @param {Object} msg 
 * @param {Object} [options={}]
 * @returns {Object|null}
 */
export function formatNotificationToast(msg, options = {}) {
    if (!msg) return null;

    const isAdmin = msg.sender === 'admin' || msg.senderRole === 'admin' || msg.role === 'admin';
    const fallbackSender = isAdmin ? 'Allard (Creation+Alt+Fix)' : (msg.senderName || 'Klant');
    const senderName = options.senderName || fallbackSender;

    const rawBody = msg.message || msg.text || msg.content || '';
    const cleanBody = String(rawBody).replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim();
    const truncatedBody = cleanBody.length > 120 ? cleanBody.slice(0, 117) + '...' : cleanBody;

    const category = msg.category || 'general';
    let catLabel = '💬 Algemeen';
    if (category === 'revision') catLabel = '🎨 Revisie';
    else if (category === 'urgent') catLabel = '⚡ Spoed';
    else if (category === 'question') catLabel = '💬 Vraag';
    else if (category === 'content') catLabel = '📄 Bestanden';

    return {
        id: msg.id || ('toast_' + Date.now()),
        senderName,
        messagePreview: truncatedBody,
        category,
        categoryLabel: catLabel,
        isUrgent: category === 'urgent',
        createdAt: msg.createdAt || new Date().toISOString()
    };
}

/**
 * Toont een moderne Dark AI in-portal floating toast notificatie.
 * 
 * @param {Object} params
 * @param {Object} params.toastData Metadata verkregen via formatNotificationToast
 * @param {Function} [params.onView] Callback wanneer op 'Bekijken' geklikt wordt
 * @param {number} [params.duration=6500] Auto-dismiss tijd in ms
 * @param {Object} [params.t] Vertalingen object
 * @returns {HTMLElement|null}
 */
export function showChatNotificationToast({ toastData, onView, duration = 6500, t = {} } = {}) {
    if (typeof document === 'undefined' || !toastData) return null;

    let container = document.getElementById('chat-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'chat-toast-container';
        container.className = 'chat-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `chat-toast ${toastData.isUrgent ? 'urgent' : ''}`;
    toast.setAttribute('role', 'alert');

    const viewBtnLabel = t.statusChatToastViewBtn || 'Bekijken';
    const safeSender = escapeHtml(toastData.senderName);
    const safePreview = escapeHtml(toastData.messagePreview);
    const safeCat = escapeHtml(toastData.categoryLabel);

    toast.innerHTML = `
        <div class="chat-toast-header">
            <span class="chat-toast-title">
                <i class="fas fa-comment-dots"></i>
                <span>${safeSender}</span>
            </span>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span class="chat-cat-tag ${toastData.category}" style="font-size: 0.68rem; padding: 2px 6px;">${safeCat}</span>
                <button type="button" class="chat-toast-close" title="Sluiten" aria-label="Notificatie sluiten">&times;</button>
            </div>
        </div>
        <div class="chat-toast-body">${safePreview}</div>
        <div class="chat-toast-actions">
            <button type="button" class="chat-toast-btn btn-view-chat">
                <i class="fas fa-arrow-down" style="font-size: 0.7rem; margin-right: 4px;"></i>${viewBtnLabel}
            </button>
        </div>
    `;

    const closeToast = () => {
        toast.classList.add('closing');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 220);
    };

    const closeBtn = toast.querySelector('.chat-toast-close');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeToast();
        };
    }

    const viewBtn = toast.querySelector('.btn-view-chat');
    if (viewBtn) {
        viewBtn.onclick = (e) => {
            e.stopPropagation();
            closeToast();
            if (typeof onView === 'function') onView();
        };
    }

    toast.onclick = () => {
        closeToast();
        if (typeof onView === 'function') onView();
    };

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(closeToast, duration);
    }

    return toast;
}

/**
 * Verwijdert actieve in-portal chat toasts.
 */
export function dismissAllChatToasts() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('chat-toast-container');
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Hoofdcontroller: Beheert de realtime chat notificatiestatus en interacties.
 */
export class PortalChatNotifier {
    /**
     * @param {Object} options 
     */
    constructor(options = {}) {
        this.currentUserRole = options.currentUserRole || 'client';
        this.soundEnabled = options.soundEnabled !== undefined ? options.soundEnabled : isChatSoundEnabled();
        this.originalTitle = options.originalTitle || (typeof document !== 'undefined' ? document.title : 'Creation+Alt+Fix');
        this.originalFaviconHref = options.originalFaviconHref || null;
        this.knownMessageIds = new Set();
        this.unreadCount = 0;
        this.flashIntervalId = null;
        this.isTabActive = typeof document !== 'undefined' ? !document.hidden : true;
        this.currentProjectId = null;
        this.lastSeenTimestamp = null;
        this.onUnreadCountChange = options.onUnreadCountChange || null;
        this.isInitialized = false;
    }

    /**
     * Initialiseert browser event listeners voor focus, visibility en geluidsknoppen.
     */
    init() {
        if (this.isInitialized || typeof window === 'undefined') return;
        this.isInitialized = true;

        if (typeof document !== 'undefined') {
            this.originalTitle = document.title || this.originalTitle;
            const faviconLink = document.querySelector("link[rel*='icon']");
            if (faviconLink) {
                this.originalFaviconHref = faviconLink.getAttribute('href');
                faviconLink.dataset.originalHref = this.originalFaviconHref;
            }

            // Tabblad focus & zichtbaarheid
            document.addEventListener('visibilitychange', () => {
                this.isTabActive = !document.hidden;
                if (this.isTabActive && this.unreadCount > 0) {
                    this.markAllAsRead();
                }
            });

            window.addEventListener('focus', () => {
                this.isTabActive = true;
                if (this.unreadCount > 0) {
                    this.markAllAsRead();
                }
            });

            window.addEventListener('blur', () => {
                this.isTabActive = false;
            });

            // Unlock Web Audio API bij eerste interactie
            const unlockAudio = () => {
                const ctx = getNotificationAudioContext();
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(() => {});
                }
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
            };
            window.addEventListener('click', unlockAudio, { once: true, passive: true });
            window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
        }

        this.syncSoundToggleButton();
    }

    /**
     * Koppelt de audio toggle knop (#btn-toggle-chat-sound) en synchroniseert de iconen.
     */
    syncSoundToggleButton() {
        if (typeof document === 'undefined') return;
        const btn = document.getElementById('btn-toggle-chat-sound');
        if (!btn) return;

        this.soundEnabled = isChatSoundEnabled();
        btn.classList.toggle('muted', !this.soundEnabled);
        btn.innerHTML = `<i class="fas ${this.soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}"></i>`;
        btn.title = this.soundEnabled ? 'Notificatiegeluid ingeschakeld (klik om te dempen)' : 'Notificatiegeluid gedempt (klik om in te schakelen)';
        btn.setAttribute('aria-label', btn.title);

        if (!btn.dataset.bound) {
            btn.dataset.bound = 'true';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const nextState = toggleChatSound();
                this.soundEnabled = nextState;
                this.syncSoundToggleButton();
                if (nextState) {
                    playChimeSound({ soundType: 'ping', volume: 0.2 });
                }
            });
        }
    }

    /**
     * Zet het actieve project en registreert bestaande berichten als 'bekend'
     * zodat historische berichten geen audio-alarmen triggeren.
     * 
     * @param {string} projectId 
     * @param {Array} [initialMessages=[]] 
     */
    setCurrentProject(projectId, initialMessages = []) {
        this.currentProjectId = projectId;
        this.knownMessageIds.clear();

        if (Array.isArray(initialMessages)) {
            initialMessages.forEach(msg => {
                if (!msg) return;
                const id = msg.id || msg.ticketId || (msg.createdAt ? `${msg.sender}_${msg.createdAt}` : null);
                if (id) this.knownMessageIds.add(String(id));
            });
        }

        this.markAllAsRead();
    }

    /**
     * Wordt aangeroepen bij een realtime Firestore onSnapshot update.
     * 
     * @param {Array} currentMessages 
     * @param {Object} [options={}]
     */
    async onMessagesUpdated(currentMessages = [], options = {}) {
        const diff = detectNewIncomingMessages({
            currentMessages,
            currentUserRole: this.currentUserRole,
            knownIds: this.knownMessageIds,
            lastSeenTimestamp: this.lastSeenTimestamp
        });

        if (!diff.hasNew) return diff;

        // Registreer nieuwe berichten als bekend
        diff.newMessages.forEach(msg => {
            const id = msg.id || msg.ticketId || (msg.createdAt ? `${msg.sender}_${msg.createdAt}` : null);
            if (id) this.knownMessageIds.add(String(id));
        });

        this.unreadCount += diff.count;

        // 1. Audio notificatie afspelen
        if (this.soundEnabled) {
            const isUrgent = diff.latestMessage && diff.latestMessage.category === 'urgent';
            playChimeSound({ soundType: isUrgent ? 'urgent' : 'chime', volume: 0.25 });
        }

        // 2. Tabblad badges & titel
        if (typeof document !== 'undefined') {
            if (!this.isTabActive) {
                if (this.flashIntervalId) {
                    stopTitleFlashing(this.flashIntervalId, this.originalTitle);
                }
                const senderName = diff.latestMessage ? diff.latestMessage.senderName : null;
                this.flashIntervalId = startTitleFlashing({
                    unreadCount: this.unreadCount,
                    senderName,
                    originalTitle: this.originalTitle
                });
                updateFaviconBadge(this.unreadCount);
            }
        }

        // 3. Floating In-Portal Toast tonen
        if (diff.latestMessage) {
            const toastData = formatNotificationToast(diff.latestMessage);
            showChatNotificationToast({
                toastData,
                t: options.t || {},
                onView: () => {
                    this.scrollToChatAndFocus();
                    this.markAllAsRead();
                }
            });
        }

        if (typeof this.onUnreadCountChange === 'function') {
            this.onUnreadCountChange(this.unreadCount);
        }

        return diff;
    }

    /**
     * Markeert alle berichten als gezien en herstelt titel & favicon.
     */
    markAllAsRead() {
        this.unreadCount = 0;
        this.lastSeenTimestamp = new Date().toISOString();

        if (this.flashIntervalId) {
            stopTitleFlashing(this.flashIntervalId, this.originalTitle);
            this.flashIntervalId = null;
        }

        if (typeof document !== 'undefined') {
            document.title = this.originalTitle;
            updateFaviconBadge(0);
        }

        dismissAllChatToasts();

        if (typeof this.onUnreadCountChange === 'function') {
            this.onUnreadCountChange(0);
        }
    }

    /**
     * Scrollt de pagina vloeiend naar de berichtenkaart en focust het invoerveld.
     */
    scrollToChatAndFocus() {
        if (typeof document === 'undefined') return;
        const messagesCard = document.getElementById('messages-card');
        const inputArea = document.getElementById('chat-message-input');

        if (messagesCard) {
            messagesCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (inputArea) {
            setTimeout(() => {
                inputArea.focus();
            }, 300);
        }
    }
}

/**
 * Singleton instantie voor in-portal chat notificaties
 */
let portalChatNotifierInstance = null;

/**
 * Haalt de singleton instantie op of initialiseert deze.
 * @param {Object} [options={}]
 * @returns {PortalChatNotifier}
 */
export function initPortalChatNotifications(options = {}) {
    if (!portalChatNotifierInstance) {
        portalChatNotifierInstance = new PortalChatNotifier(options);
        portalChatNotifierInstance.init();
    }
    return portalChatNotifierInstance;
}
