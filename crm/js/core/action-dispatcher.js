/**
 * @file crm/js/core/action-dispatcher.js
 * Centrale Event Delegation Engine voor Creation+Alt+Fix CRM.
 * Ontkoppelt DOM elementen van JavaScript handlers via [data-action].
 * Zero external dependencies.
 */

export class ActionDispatcher {
    /**
     * @param {HTMLElement|Document} [rootElement] Standaard document.body of document
     */
    constructor(rootElement = null) {
        this.root = rootElement;
        this.actions = new Map();
        this._isBound = false;
        if (typeof document !== 'undefined') {
            this.root = rootElement || document.body || document.documentElement;
            this._bindEvents();
        }
    }

    /**
     * Stel de root in en bind listeners indien nog niet gedaan
     * @param {HTMLElement} element 
     */
    mount(element) {
        this.root = element;
        if (!this._isBound && typeof document !== 'undefined') {
            this._bindEvents();
        }
        return this;
    }

    /**
     * Registreer een action handler
     * @param {string} actionName Naam van data-action, bijv. 'project:edit'
     * @param {Function} handler (dataset, event, targetElement) => void | Promise<void>
     */
    register(actionName, handler) {
        this.actions.set(actionName, handler);
        return this;
    }

    /**
     * Verwijder een actie registratie
     * @param {string} actionName 
     */
    unregister(actionName) {
        this.actions.delete(actionName);
        return this;
    }

    /**
     * Filter gevaarlijke prototype pollution keys (__proto__, constructor, prototype)
     * @param {Object} obj 
     * @returns {Object}
     */
    static sanitizePayload(obj) {
        if (!obj || typeof obj !== 'object') return {};
        const clean = {};
        for (const [key, val] of Object.entries(obj)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            clean[key] = val;
        }
        return clean;
    }

    /**
     * Voer een actie programmatisch uit
     * @param {string} actionName 
     * @param {Object} dataset 
     * @param {Event} [event] 
     * @param {HTMLElement} [targetElement] 
     */
    dispatch(actionName, dataset = {}, event = null, targetElement = null) {
        const handler = this.actions.get(actionName);
        if (typeof handler === 'function') {
            try {
                const safeData = ActionDispatcher.sanitizePayload(dataset);
                const res = handler(safeData, event, targetElement);
                if (res && typeof res.catch === 'function') {
                    res.catch(err => console.error(`[ActionDispatcher] Async fout in actie "${actionName}":`, err));
                }
                return res;
            } catch (err) {
                console.error(`[ActionDispatcher] Fout in actie "${actionName}":`, err);
                return null;
            }
        }
        console.warn(`[ActionDispatcher] Geen handler geregistreerd voor actie: "${actionName}"`);
        return null;
    }

    _bindEvents() {
        if (!this.root || this._isBound) return;
        this._isBound = true;

        // Clicks afvangen via Event Bubbling
        this.root.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target || (this.root !== document && !this.root.contains(target))) return;

            const actionName = target.getAttribute('data-action');
            if (!actionName) return;

            // Voorkom standaard hashtag sprongen
            if (target.tagName === 'A' && (target.getAttribute('href') === '#' || target.getAttribute('href') === '')) {
                event.preventDefault();
            }

            const handler = this.actions.get(actionName);
            if (typeof handler === 'function') {
                try {
                    const safeDataset = ActionDispatcher.sanitizePayload(target.dataset);
                    const res = handler(safeDataset, event, target);
                    if (res && typeof res.catch === 'function') {
                        res.catch(err => console.error(`[ActionDispatcher] Async fout in actie "${actionName}":`, err));
                    }
                } catch (err) {
                    console.error(`[ActionDispatcher] Fout in actie "${actionName}":`, err);
                }
            } else {
                console.warn(`[ActionDispatcher] Onbekende actie: "${actionName}"`);
            }
        });

        // Form submits afvangen via data-action op het <form> element
        this.root.addEventListener('submit', (event) => {
            const target = event.target.closest('form[data-action]');
            if (!target || (this.root !== document && !this.root.contains(target))) return;

            event.preventDefault();
            const actionName = target.getAttribute('data-action');
            const handler = this.actions.get(actionName);

            if (typeof handler === 'function') {
                try {
                    const formData = new FormData(target);
                    const rawPayload = Object.fromEntries(formData.entries());
                    const safePayload = ActionDispatcher.sanitizePayload(rawPayload);
                    const safeDataset = ActionDispatcher.sanitizePayload(target.dataset);
                    // Voeg eventuele data-attributen samen met formdata velden
                    const mergedData = { ...safeDataset, ...safePayload };
                    const res = handler(mergedData, event, target);
                    if (res && typeof res.catch === 'function') {
                        res.catch(err => console.error(`[ActionDispatcher] Async fout in formulieractie "${actionName}":`, err));
                    }
                } catch (err) {
                    console.error(`[ActionDispatcher] Fout in formulieractie "${actionName}":`, err);
                }
            }
        });
    }
}

// Centrale Singleton Instantie voor het CRM
export const dispatcher = new ActionDispatcher();
