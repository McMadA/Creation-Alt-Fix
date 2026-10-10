/**
 * @file crm/js/core/toast.js
 * Productiewaardige Glassmorphic Notification & Confirmation Engine.
 * Vervangt alle blokkerende browser alert() en confirm() aanroepen.
 * Creation+Alt+Fix CRM (2026/2027)
 */

import { escapeHtml } from '../crm-config.js';

export class Toast {
    static _ensureContainer() {
        if (typeof document === 'undefined') return null;
        let container = document.getElementById('caf-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'caf-toast-container';
            container.setAttribute('aria-live', 'polite');
            container.style.cssText = `
                position: fixed;
                top: 24px;
                right: 24px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Toon een non-blocking notificatie
     * @param {Object} options
     * @param {string} options.title Hoofdtitel
     * @param {string} [options.message] Toelichting
     * @param {'success'|'error'|'warning'|'info'} [options.type='info']
     * @param {number} [options.duration=4000] Milliseconden voor auto-dismiss
     * @param {Object} [options.action] Optionele callback knop { label: 'Herstel', callback: () => {} }
     */
    static show({ title, message = '', type = 'info', duration = 4000, action = null }) {
        if (typeof document === 'undefined') {
            console.log(`[Toast ${type.toUpperCase()}] ${title}: ${message}`);
            return;
        }

        const container = this._ensureContainer();
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `caf-toast caf-toast-${type}`;
        toast.style.cssText = `
            pointer-events: auto;
            background: rgba(15, 23, 42, 0.94);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid ${this._getBorderColor(type)};
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px ${this._getGlowColor(type)};
            border-radius: 10px;
            padding: 14px 18px;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            transform: translateX(120%);
            transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease;
            position: relative;
            overflow: hidden;
        `;

        const icon = this._getIconSvg(type);

        toast.innerHTML = this._renderToastHtml({ title, message, type, duration, action });

        container.appendChild(toast);

        // Slide-in animatie
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            const progress = toast.querySelector('.toast-progress');
            if (progress && duration > 0) {
                progress.style.width = '0%';
            }
        });

        let timer = null;
        const dismiss = () => {
            clearTimeout(timer);
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        };

        if (duration > 0) {
            timer = setTimeout(dismiss, duration);
        }

        toast.querySelector('#toast-close-btn')?.addEventListener('click', dismiss);
        
        if (action) {
            toast.querySelector('#toast-action-btn')?.addEventListener('click', () => {
                dismiss();
                action.callback();
            });
        }
    }

    /**
     * Genereert veilige HTML voor de toast body met XSS bescherming
     * @private
     */
    static _renderToastHtml({ title, message = '', type = 'info', duration = 4000, action = null }) {
        const icon = this._getIconSvg(type);
        const safeTitle = escapeHtml(title || '');
        const safeMessage = message ? escapeHtml(message) : '';
        const safeActionLabel = action && action.label ? escapeHtml(action.label) : '';

        return `
            <div style="flex-shrink: 0; margin-top: 2px;">${icon}</div>
            <div style="flex-grow: 1;">
                <div style="font-weight: 600; font-size: 14px; line-height: 1.3;">${safeTitle}</div>
                ${safeMessage ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 4px; line-height: 1.4;">${safeMessage}</div>` : ''}
                ${action ? `<button id="toast-action-btn" style="background: none; border: 1px solid rgba(255,255,255,0.3); color: #38bdf8; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; margin-top: 8px;">${safeActionLabel}</button>` : ''}
            </div>
            <button id="toast-close-btn" style="background:none; border:none; color: rgba(255,255,255,0.4); cursor:pointer; font-size:16px; padding:0; margin-left: 4px;">&times;</button>
            <div class="toast-progress" style="position: absolute; bottom: 0; left: 0; height: 3px; background: ${this._getBorderColor(type)}; width: 100%; transition: width ${duration}ms linear;"></div>
        `;
    }

    /**
     * Non-blocking modal confirm dialoog die een Promise retourneert (vervangt window.confirm)
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.message
     * @param {string} [options.confirmText='Bevestigen']
     * @param {string} [options.cancelText='Annuleren']
     * @param {boolean} [options.danger=false]
     * @returns {Promise<boolean>}
     */
    static async confirm({ title, message, confirmText = 'Bevestigen', cancelText = 'Annuleren', danger = false }) {
        if (typeof document === 'undefined') {
            return true;
        }

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'caf-confirm-overlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; z-index: 100000;
                background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                animation: fadeIn 0.2s ease-out;
            `;

            const safeTitle = escapeHtml(title || '');
            const safeMessage = escapeHtml(message || '');
            const safeConfirmText = escapeHtml(confirmText || 'Bevestigen');
            const safeCancelText = escapeHtml(cancelText || 'Annuleren');

            overlay.innerHTML = `
                <div style="background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; width: 90%; max-width: 440px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 600;">${safeTitle}</h3>
                    <p style="margin: 0 0 20px 0; font-size: 13.5px; color: #94a3b8; line-height: 1.5;">${safeMessage}</p>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button id="modal-cancel-btn" style="padding: 8px 16px; border-radius: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; font-size: 13px;">${safeCancelText}</button>
                        <button id="modal-confirm-btn" style="padding: 8px 16px; border-radius: 6px; background: ${danger ? '#ef4444' : '#0284c7'}; border: none; color: #fff; cursor: pointer; font-weight: 500; font-size: 13px;">${safeConfirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#modal-cancel-btn')?.addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });

            overlay.querySelector('#modal-confirm-btn')?.addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });
        });
    }

    static _getBorderColor(type) {
        return { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#38bdf8' }[type] || '#38bdf8';
    }

    static _getGlowColor(type) {
        return { success: 'rgba(16, 185, 129, 0.2)', error: 'rgba(239, 68, 68, 0.2)', warning: 'rgba(245, 158, 11, 0.2)', info: 'rgba(56, 189, 248, 0.2)' }[type] || 'rgba(56, 189, 248, 0.2)';
    }

    static _getIconSvg(type) {
        if (type === 'success') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        if (type === 'error') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
        if (type === 'warning') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
}
