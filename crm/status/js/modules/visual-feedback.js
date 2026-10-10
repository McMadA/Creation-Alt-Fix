/**
 * @file crm/status/js/modules/visual-feedback.js
 * Visuele Staging Feedback & Pin-Point Annotaties Module.
 * Hiermee kunnen klanten en beheerders direct revisie-pins met opmerkingen op de live website staging plaatsen.
 * Creation+Alt+Fix CRM (2026/2027)
 */

import { escapeHtml } from "../../../js/firebase-config.js";
import { Schemas } from "../../../js/core/schemas.js";

export class VisualFeedbackOverlay {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.containerElement Container die de staging iframe omhult
     * @param {string} options.projectId
     * @param {string} options.authorName Naam van auteur ('Klant' of 'Allard')
     * @param {Function} options.onSavePin Callback (newPin) => Promise<void>
     */
    constructor({ containerElement, projectId, authorName = 'Klant', onSavePin }) {
        this.container = containerElement;
        this.projectId = projectId;
        this.authorName = String(authorName || 'Klant').replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim().slice(0, 50) || 'Klant';
        this.onSavePin = onSavePin;
        this.isActive = false;
        this.pins = [];
        this.overlayEl = null;

        this._initOverlay();
    }

    _initOverlay() {
        if (!this.container) return;

        // Maak overlay container die 1:1 over de iframe ligt
        this.overlayEl = document.createElement('div');
        this.overlayEl.className = 'caf-staging-pin-overlay';
        this.overlayEl.style.cssText = `
            position: absolute;
            inset: 0;
            z-index: 50;
            pointer-events: none;
            overflow: hidden;
        `;
        
        // Zorg dat de parent container relative is
        if (getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }

        this.container.appendChild(this.overlayEl);

        // Click listener voor het plaatsen van pins wanneer actief
        this.overlayEl.addEventListener('click', (e) => {
            if (!this.isActive) return;
            if (e.target.closest('.caf-pin-marker') || e.target.closest('.caf-pin-dialog')) return;

            const rect = this.overlayEl.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const rawX = ((e.clientX - rect.left) / rect.width) * 100;
            const rawY = ((e.clientY - rect.top) / rect.height) * 100;
            const safeX = Math.max(0, Math.min(100, Number(rawX.toFixed(2))));
            const safeY = Math.max(0, Math.min(100, Number(rawY.toFixed(2))));

            if (isNaN(safeX) || isNaN(safeY)) return;

            this._promptPinCreation(safeX, safeY);
        });
    }

    /**
     * Activeer of deactiveer de annotatiemodus
     * @param {boolean} active 
     */
    setMode(active) {
        this.isActive = Boolean(active);
        if (this.overlayEl) {
            this.overlayEl.style.pointerEvents = this.isActive ? 'auto' : 'none';
            this.overlayEl.style.cursor = this.isActive ? 'crosshair' : 'default';
        }
    }

    /**
     * Laad bestaande pins in en toon markers
     * @param {Array<Object>} annotationsList 
     */
    renderPins(annotationsList = []) {
        this.pins = Array.isArray(annotationsList) ? annotationsList.map(Schemas.sanitizeAnnotation) : [];
        if (!this.overlayEl) return;

        // Behoud alleen actieve dialogen
        const existingDialog = this.overlayEl.querySelector('.caf-pin-dialog');
        this.overlayEl.innerHTML = '';
        if (existingDialog) this.overlayEl.appendChild(existingDialog);

        this.pins.forEach((pin, index) => {
            const isResolved = pin.status === 'resolved';
            const marker = document.createElement('div');
            marker.className = `caf-pin-marker ${isResolved ? 'resolved' : 'open'}`;
            marker.style.cssText = `
                position: absolute;
                left: ${pin.xPercent}%;
                top: ${pin.yPercent}%;
                transform: translate(-50%, -50%);
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: ${isResolved ? '#10b981' : '#0284c7'};
                border: 2px solid #ffffff;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                pointer-events: auto;
                transition: transform 0.15s ease, background 0.15s ease;
                z-index: 55;
            `;
            marker.textContent = String(index + 1);

            marker.addEventListener('mouseenter', () => {
                marker.style.transform = 'translate(-50%, -50%) scale(1.15)';
            });
            marker.addEventListener('mouseleave', () => {
                marker.style.transform = 'translate(-50%, -50%) scale(1)';
            });

            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showPinDetails(pin, marker);
            });

            this.overlayEl.appendChild(marker);
        });
    }

    _promptPinCreation(xPercent, yPercent) {
        // Sluit eventuele eerdere open dialogen
        this.overlayEl.querySelectorAll('.caf-pin-dialog').forEach(el => el.remove());

        const dialog = document.createElement('div');
        dialog.className = 'caf-pin-dialog';
        dialog.style.cssText = `
            position: absolute;
            left: ${Math.min(xPercent, 80)}%;
            top: ${Math.min(yPercent, 80)}%;
            width: 280px;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 15px 30px rgba(0,0,0,0.5);
            color: #f8fafc;
            font-size: 13px;
            z-index: 60;
            pointer-events: auto;
        `;

        dialog.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span>📍 Nieuwe Annotatie</span>
                <span id="close-dialog" style="cursor: pointer; opacity: 0.6;">&times;</span>
            </div>
            <textarea id="pin-comment" maxlength="1000" placeholder="Beschrijf je feedback of gewenste wijziging..." rows="3" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; padding: 6px; color: #fff; font-size: 12px; resize: none; margin-bottom: 8px;"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 6px;">
                <button id="cancel-pin" style="padding: 4px 8px; font-size: 11px; background: rgba(255,255,255,0.1); border: none; border-radius: 4px; color: #fff; cursor: pointer;">Annuleren</button>
                <button id="save-pin" style="padding: 4px 10px; font-size: 11px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-weight: 600; cursor: pointer;">Opslaan</button>
            </div>
        `;

        this.overlayEl.appendChild(dialog);
        const textarea = dialog.querySelector('#pin-comment');
        textarea.focus();

        const close = () => dialog.remove();
        dialog.querySelector('#close-dialog').addEventListener('click', close);
        dialog.querySelector('#cancel-pin').addEventListener('click', close);

        dialog.querySelector('#save-pin').addEventListener('click', async () => {
            const rawComment = textarea.value || '';
            const comment = rawComment.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 1000);
            if (!comment) return;

            const newPin = Schemas.sanitizeAnnotation({
                id: `pin_${Date.now()}`,
                xPercent: Number(xPercent.toFixed(2)),
                yPercent: Number(yPercent.toFixed(2)),
                comment: comment,
                author: this.authorName,
                status: 'open',
                createdAt: new Date().toISOString()
            });

            close();
            if (typeof this.onSavePin === 'function') {
                try {
                    await this.onSavePin(newPin);
                } catch (err) {
                    console.error("[VisualFeedback] Fout bij opslaan pin:", err);
                }
            }
        });
    }

    _showPinDetails(pin, markerEl) {
        this.overlayEl.querySelectorAll('.caf-pin-dialog').forEach(el => el.remove());

        const isResolved = pin.status === 'resolved';
        const dialog = document.createElement('div');
        dialog.className = 'caf-pin-dialog';
        dialog.style.cssText = `
            position: absolute;
            left: ${Math.min(pin.xPercent + 2, 75)}%;
            top: ${Math.min(pin.yPercent, 80)}%;
            width: 260px;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid ${isResolved ? '#10b981' : '#0284c7'};
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 15px 30px rgba(0,0,0,0.5);
            color: #f8fafc;
            font-size: 12.5px;
            z-index: 60;
            pointer-events: auto;
        `;

        const dateStr = pin.createdAt && !isNaN(new Date(pin.createdAt).getTime())
            ? new Date(pin.createdAt).toLocaleString('nl-NL')
            : 'Recent';

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 600; color: ${isResolved ? '#10b981' : '#38bdf8'};">${escapeHtml(pin.author)}</span>
                <span id="close-pin-popover" style="cursor: pointer; opacity: 0.6; font-size: 14px;">&times;</span>
            </div>
            <div style="margin-bottom: 10px; line-height: 1.4; opacity: 0.9;">
                ${escapeHtml(pin.comment)}
            </div>
            <div style="font-size: 10.5px; opacity: 0.5; margin-bottom: 8px;">
                ${dateStr}
            </div>
            <div style="display: flex; justify-content: flex-end;">
                <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${isResolved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 132, 199, 0.2)'}; color: ${isResolved ? '#10b981' : '#38bdf8'};">
                    ${isResolved ? '✅ Opgelost' : '⏳ In Behandeling'}
                </span>
            </div>
        `;

        this.overlayEl.appendChild(dialog);
        dialog.querySelector('#close-pin-popover').addEventListener('click', () => dialog.remove());
    }
}
