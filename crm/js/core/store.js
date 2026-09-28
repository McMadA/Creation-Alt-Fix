/**
 * @file crm/js/core/store.js
 * Frameworkloze Reactive State Store met microtask debouncing en Proxy-based mutatie tracking.
 * Zero external dependencies.
 * Creation+Alt+Fix CRM (2026/2027)
 */

export class ReactiveStore extends EventTarget {
    /**
     * @param {Object} initialState 
     */
    constructor(initialState = {}) {
        super();
        this._isBatching = false;
        this._pendingChanges = new Set();
        this._state = initialState;
        this.state = this._createProxy(this._state);
    }

    _createProxy(obj, path = '') {
        const self = this;
        return new Proxy(obj, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                // Recursief proxy wrapping voor geneste objecten (exclusief Arrays om iteratie overhead te vermijden)
                if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                    return self._createProxy(value, path ? `${path}.${String(prop)}` : String(prop));
                }
                return value;
            },
            set(target, prop, value, receiver) {
                const oldValue = Reflect.get(target, prop, receiver);
                if (oldValue === value) return true;

                const success = Reflect.set(target, prop, value, receiver);
                if (success) {
                    const fullPath = path ? `${path}.${String(prop)}` : String(prop);
                    self._notifyChange(fullPath, value, oldValue);
                }
                return success;
            }
        });
    }

    _notifyChange(path, value, oldValue) {
        this._pendingChanges.add(path);
        // Genereer ook notificatie voor root-key (bijv. 'projects.0.status' -> triggert ook 'projects')
        const rootKey = path.split('.')[0];
        this._pendingChanges.add(rootKey);

        if (!this._isBatching) {
            this._isBatching = true;
            // Coalesce multiple synchronous writes in 1 microtask tick
            queueMicrotask(() => {
                const changes = Array.from(this._pendingChanges);
                this._pendingChanges.clear();
                this._isBatching = false;

                changes.forEach(changedPath => {
                    this.dispatchEvent(new CustomEvent(`change:${changedPath}`, {
                        detail: { path: changedPath, state: this.state, value, oldValue }
                    }));
                });

                // Algemene staatsverandering event
                this.dispatchEvent(new CustomEvent('change', {
                    detail: { changedPaths: changes, state: this.state }
                }));
            });
        }
    }

    /**
     * Abonneer op specifieke property of root sleutel
     * @param {string} key Bijvoorbeeld 'projects', 'activeFilter', of '*' voor alles
     * @param {Function} callback Handler met (state, detail)
     * @returns {Function} Unsubscribe functie voor cleanup
     */
    subscribe(key, callback) {
        const eventName = key === '*' ? 'change' : `change:${key}`;
        const listener = (event) => callback(this.state, event.detail);
        this.addEventListener(eventName, listener);
        return () => this.removeEventListener(eventName, listener);
    }

    /**
     * Atomische batch mutatie: voert meerdere updates uit zonder tussentijdse UI flikkering
     * @param {Function} mutationFn (state) => void
     */
    batch(mutationFn) {
        const wasBatching = this._isBatching;
        this._isBatching = true;
        try {
            mutationFn(this.state);
        } finally {
            if (!wasBatching) {
                this._isBatching = false;
                this._notifyChange('_batch', null, null);
            }
        }
    }

    /**
     * Haal een immutable snapshot van de state op
     * @returns {Object}
     */
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }
}

// Centrale Singleton Instantie voor het CRM
export const store = new ReactiveStore({
    user: null,
    projects: [],
    monitors: [],
    activeFilter: 'all',
    searchTerm: '',
    currentSort: { column: 'date', direction: 'desc' },
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    selectedProjectId: null,
    stats: { totalProjects: 0, liveSites: 0, pendingTasks: 0, annualRevenue: 0 }
});
