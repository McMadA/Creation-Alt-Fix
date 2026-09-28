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
     * Voer een actie programmatisch uit
     * @param {string} actionName 
     * @param {Object} dataset 
     * @param {Event} [event] 
     * @param {HTMLElement} [targetElement] 
     */
    dispatch(actionName, dataset = {}, event = null, targetElement = null) {
        const handler = this.actions.get(actionName);
        if (typeof handler === 'function') {
            return handler(dataset, event, targetElement);
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
                    handler(target.dataset, event, target);
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
                    const payload = Object.fromEntries(formData.entries());
                    // Voeg eventuele data-attributen samen met formdata velden
                    const mergedData = { ...target.dataset, ...payload };
                    handler(mergedData, event, target);
                } catch (err) {
                    console.error(`[ActionDispatcher] Fout in formulieractie "${actionName}":`, err);
                }
            }
        });
    }
}

// Centrale Singleton Instantie voor het CRM
export const dispatcher = new ActionDispatcher();
