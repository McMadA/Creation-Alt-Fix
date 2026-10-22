/**
 * @file crm/status/js/modules/document-vault.js
 * Gestructureerde Document & Media Vault met Categorieën en Versiebeheer (TASK-912).
 * 
 * Biedt een georganiseerde documentenkluis voor klantsites:
 * - Categorieën: Huisstijl & Logo's, Fotografie & Teksten, Offertes & Facturen, Technisch & Overig
 * - Intelligente auto-categorisering op basis van bestandsnaam en extensie
 * - Versiebeheer per document (detectie van herhaalde uploads, v1 -> v2 -> v3)
 * - Zoek- en filterfuncties (categorieën, vrije zoekterm, toon alleen nieuwste versies)
 * - Inline Image & PDF previews (lightbox modal)
 * - 1-Klik download en georganiseerde download-all per categorie
 * - Compatibel met Firebase Storage & Firestore 'files: []' datamodel
 * 
 * Creation+Alt+Fix (2026/2027)
 */

import { escapeHtml, sanitizeUrl } from "../../../js/firebase-config.js";

/**
 * Canonieke Categorieën van de Document & Media Vault
 */
export const VAULT_CATEGORIES = {
    all: {
        id: 'all',
        labelNl: 'Alle Bestanden',
        labelEn: 'All Files',
        icon: 'fa-layer-group',
        color: '#38bdf8',
        descriptionNl: 'Compleet overzicht van alle aangeleverde en gegenereerde bestanden',
        descriptionEn: 'Complete overview of all uploaded and generated assets'
    },
    brand: {
        id: 'brand',
        labelNl: "Huisstijl & Logo's",
        labelEn: 'Brand & Logos',
        icon: 'fa-palette',
        color: '#ec4899',
        descriptionNl: "Logo's, beeldmerken, vectorbestanden, kleurcodes en stijlgidsen",
        descriptionEn: 'Logos, brand marks, vector files, color palettes, and style guides',
        keywords: ['logo', 'huisstijl', 'brand', 'embleem', 'beeldmerk', 'icon', 'favicon', 'badge', 'banner', 'vector', 'typography', 'branding', 'header'],
        extensions: ['svg', 'ai', 'eps', 'psd', 'fig', 'sketch']
    },
    content: {
        id: 'content',
        labelNl: 'Fotografie & Teksten',
        labelEn: 'Photos & Copy',
        icon: 'fa-images',
        color: '#a855f7',
        descriptionNl: "Teksten, pagina-indelingen, foto's, folders en marketingmateriaal",
        descriptionEn: 'Copy, page layouts, photos, brochures, and marketing material',
        keywords: ['foto', 'photo', 'beeld', 'image', 'picture', 'tekst', 'copy', 'content', 'over-ons', 'overons', 'dienst', 'diensten', 'project', 'projecten', 'brochure', 'flyer', 'portfolio', 'team', 'werk'],
        extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'doc', 'docx', 'txt', 'rtf', 'md', 'odt']
    },
    financial: {
        id: 'financial',
        labelNl: 'Offertes & Facturen',
        labelEn: 'Proposals & Invoices',
        icon: 'fa-file-invoice-dollar',
        color: '#22c55e',
        descriptionNl: 'Geaccordeerde offertes, specificaties, contracten en factuur-PDFs',
        descriptionEn: 'Approved proposals, scopes, contracts, and invoice PDFs',
        keywords: ['factuur', 'invoice', 'offerte', 'proposal', 'nota', 'creditnota', 'contract', 'overeenkomst', 'sla', 'voorstel', 'betaalbewijs', 'kostenopgave', 'begroting', 'order'],
        extensions: ['pdf', 'xls', 'xlsx', 'csv']
    },
    technical: {
        id: 'technical',
        labelNl: 'Technisch & Overig',
        labelEn: 'Technical & Misc',
        icon: 'fa-cogs',
        color: '#f59e0b',
        descriptionNl: 'EPP verhuistokens, DNS exports, SSL certs, backups en archieven',
        descriptionEn: 'EPP transfer tokens, DNS exports, SSL certs, backups, and archives',
        keywords: ['dns', 'ssl', 'epp', 'token', 'backup', 'dump', 'zip', 'tar', 'gz', 'config', 'cert', 'key', 'database', 'sql', 'settings'],
        extensions: ['zip', 'rar', '7z', 'gz', 'tar', 'json', 'xml']
    }
};

export const VALID_VAULT_CATEGORIES = ['brand', 'content', 'financial', 'technical'];

/**
 * Bepaalt intelligent de juiste vault-categorie voor een bestand.
 * Respecteert een reeds expliciet toegekende categorie, of detecteert automatisch
 * op basis van bestandsnaam-trefwoorden en extensies.
 * 
 * @param {Object|string} file - Bestands-object of bestandsnaam
 * @returns {string} Eén van: 'brand', 'content', 'financial', 'technical'
 */
export function resolveFileCategory(file) {
    if (!file) return 'technical';

    // Bestaande expliciete categorie valideren
    if (typeof file === 'object' && file.category && VALID_VAULT_CATEGORIES.includes(file.category)) {
        return file.category;
    }

    const rawName = (typeof file === 'string' ? file : (file.name || file.filename || file.url || ''))
        .trim()
        .toLowerCase();

    if (!rawName) return 'technical';

    // Extensie extraheren
    const ext = (rawName.split('.').pop() || '').replace(/[^a-z0-9]/g, '');

    // 1. Trefwoorden in bestandsnaam prioriteren
    // Financiële trefwoorden hebben hoogste prioriteit (offerte/factuur in bestandsnaam)
    const financialKeywords = VAULT_CATEGORIES.financial.keywords;
    if (financialKeywords.some(kw => rawName.includes(kw))) {
        return 'financial';
    }

    // Huisstijl & Logo trefwoorden
    const brandKeywords = VAULT_CATEGORIES.brand.keywords;
    if (brandKeywords.some(kw => rawName.includes(kw))) {
        return 'brand';
    }

    // Technisch / Backup / EPP trefwoorden
    const technicalKeywords = VAULT_CATEGORIES.technical.keywords;
    if (technicalKeywords.some(kw => rawName.includes(kw))) {
        return 'technical';
    }

    // Fotografie & Content trefwoorden
    const contentKeywords = VAULT_CATEGORIES.content.keywords;
    if (contentKeywords.some(kw => rawName.includes(kw))) {
        return 'content';
    }

    // 2. Extensie fallback
    if (VAULT_CATEGORIES.brand.extensions.includes(ext)) {
        return 'brand';
    }

    if (VAULT_CATEGORIES.financial.extensions.includes(ext)) {
        // PDF default: als het PDF is, in de context van de projecten meestal proposal of invoice
        return 'financial';
    }

    if (VAULT_CATEGORIES.technical.extensions.includes(ext)) {
        return 'technical';
    }

    if (VAULT_CATEGORIES.content.extensions.includes(ext)) {
        return 'content';
    }

    return 'technical';
}

/**
 * Normaliseert een bestandsnaam naar een canonieke basis-sleutel voor versieherkenning.
 * Verwijdert timestamps, upload-prefixen, en versie-achtervoegsels (_v1, -v2, (1)).
 * 
 * @param {string} filename 
 * @returns {string} bijv. 'logo_stenekes.png'
 */
export function normalizeFileBaseKey(filename) {
    if (!filename || typeof filename !== 'string') return 'bestand';

    let clean = filename.trim().toLowerCase();
    
    // Verwijder upload prefixen zoals 1729555200000_
    clean = clean.replace(/^\d{10,14}[-_]/, '');

    // Splits naam en extensie
    const lastDot = clean.lastIndexOf('.');
    let base = lastDot > 0 ? clean.substring(0, lastDot) : clean;
    const ext = lastDot > 0 ? clean.substring(lastDot + 1) : '';

    // Verwijder versie tags: _v2, -v3,  v4, _versie_2, (1), etc.
    base = base.replace(/[-_ ]*(?:v|ver|versie|version)[-_ ]*\d+/gi, '');
    base = base.replace(/\s*\(\d+\)$/g, '');


    // Normaliseer naar veilige alfanumerieke tekens
    base = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!base) base = 'bestand';

    return ext ? `${base}.${ext}` : base;
}

/**
 * Verrijkt een lijst met bestanden met versie-metadata en canonieke categorieën.
 * Groepeert bestanden met dezelfde baseKey, kent opeenvolgende versienummers (v1, v2, ...) toe,
 * en markeert de meest recente versie met isLatest = true.
 * 
 * @param {Array} filesList - Ruwe array van project bestanden
 * @returns {Array} Verrijkte array met { id, category, version, isLatest, versionCount, ... }
 */
export function computeFileVersions(filesList) {
    if (!Array.isArray(filesList)) return [];

    // Stap 1: Normaliseer basisvelden
    const prepared = filesList.map((f, idx) => {
        const raw = (typeof f === 'string') ? { name: f, url: f } : (f || {});
        const name = (raw.name || raw.filename || 'bestand').trim();
        const baseKey = normalizeFileBaseKey(name);
        const category = resolveFileCategory(raw);
        const uploadedAt = raw.uploadedAt || raw.timestamp || new Date(0).toISOString();
        const size = typeof raw.size === 'number' && raw.size >= 0 ? raw.size : 0;
        const url = raw.url || '#';
        const id = raw.id || `file_${idx}_${Math.random().toString(36).substring(2, 8)}`;
        const uploadedBy = raw.uploadedBy === 'admin' ? 'admin' : 'client';
        const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';

        return {
            ...raw,
            id,
            name,
            baseKey,
            category,
            uploadedAt,
            size,
            url,
            uploadedBy,
            notes,
            _originalIndex: idx
        };
    });

    // Stap 2: Groeperen per baseKey
    const groups = new Map();
    for (const file of prepared) {
        if (!groups.has(file.baseKey)) {
            groups.set(file.baseKey, []);
        }
        groups.get(file.baseKey).push(file);
    }

    // Stap 3: Versies toekennen per groep
    const result = [];
    for (const group of groups.values()) {
        // Sorteer op upload-datum (oudste eerst) of originele volgorde
        group.sort((a, b) => {
            const timeA = new Date(a.uploadedAt).getTime() || a._originalIndex;
            const timeB = new Date(b.uploadedAt).getTime() || b._originalIndex;
            return timeA - timeB;
        });

        const totalInGroup = group.length;
        const newestFile = group[totalInGroup - 1];

        group.forEach((item, index) => {
            const versionNum = typeof item.version === 'number' && item.version > 0
                ? item.version
                : (index + 1);
            
            const isLatest = (index === totalInGroup - 1);

            result.push({
                ...item,
                version: versionNum,
                versionCount: totalInGroup,
                isLatest,
                latestId: newestFile.id,
                latestVersion: typeof newestFile.version === 'number' && newestFile.version > 0
                    ? newestFile.version
                    : totalInGroup
            });
        });
    }

    // Behoud originele volgorde of sorteer op meest recent geüpload
    return result.sort((a, b) => {
        const timeA = new Date(a.uploadedAt).getTime() || 0;
        const timeB = new Date(b.uploadedAt).getTime() || 0;
        return timeB - timeA;
    });
}

/**
 * Formatteert een bestandsgrootte in bytes naar een mensvriendelijke weergave.
 * 
 * @param {number} bytes 
 * @returns {string} bijv. '1.2 MB', '450 KB', '0 B'
 */
export function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined || typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
        return '';
    }
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * Geeft de juiste FontAwesome icoonklasse terug voor een bestand.
 * 
 * @param {string} filename 
 * @returns {string} FontAwesome fa-* klasse
 */
export function getFileIcon(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const iconMap = {
        pdf: 'fa-file-pdf',
        doc: 'fa-file-word',
        docx: 'fa-file-word',
        xls: 'fa-file-excel',
        xlsx: 'fa-file-excel',
        csv: 'fa-file-csv',
        png: 'fa-file-image',
        jpg: 'fa-file-image',
        jpeg: 'fa-file-image',
        gif: 'fa-file-image',
        svg: 'fa-palette',
        webp: 'fa-file-image',
        ai: 'fa-palette',
        eps: 'fa-palette',
        psd: 'fa-palette',
        fig: 'fa-palette',
        zip: 'fa-file-archive',
        rar: 'fa-file-archive',
        '7z': 'fa-file-archive',
        tar: 'fa-file-archive',
        gz: 'fa-file-archive',
        txt: 'fa-file-alt',
        rtf: 'fa-file-alt',
        md: 'fa-file-alt',
        mp4: 'fa-file-video',
        mov: 'fa-file-video',
        avi: 'fa-file-video',
        json: 'fa-file-code',
        xml: 'fa-file-code',
        sql: 'fa-database'
    };
    return iconMap[ext] || 'fa-file-alt';
}

/**
 * Filtert bestanden op categorie, zoekterm en optioneel alleen nieuwste versies.
 * 
 * @param {Array} files - Reeds verrijkte of ruwe bestandenlijst
 * @param {Object} options - { category, searchQuery, latestOnly }
 * @returns {Array} Gefilterde bestanden
 */
export function filterVaultFiles(files, options = {}) {
    const { category = 'all', searchQuery = '', latestOnly = false } = options;
    const versioned = computeFileVersions(files);

    const query = (searchQuery || '').trim().toLowerCase();

    return versioned.filter(f => {
        // Categorie filter
        if (category && category !== 'all' && f.category !== category) {
            return false;
        }

        // Alleen laatste versies filter
        if (latestOnly && !f.isLatest) {
            return false;
        }

        // Zoekterm filter
        if (query) {
            const nameMatch = (f.name || '').toLowerCase().includes(query);
            const notesMatch = (f.notes || '').toLowerCase().includes(query);
            const catMatch = (f.category || '').toLowerCase().includes(query);
            const baseMatch = (f.baseKey || '').toLowerCase().includes(query);
            if (!nameMatch && !notesMatch && !catMatch && !baseMatch) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Berekent statistieken en tellers over de complete bestandenkluis.
 * 
 * @param {Array} files 
 * @returns {Object} { total, totalBytes, formattedTotalSize, byCategory, multiVersionCount }
 */
export function getVaultStats(files) {
    const versioned = computeFileVersions(files);

    const stats = {
        total: versioned.length,
        totalBytes: 0,
        formattedTotalSize: '0 B',
        byCategory: {
            brand: { count: 0, bytes: 0 },
            content: { count: 0, bytes: 0 },
            financial: { count: 0, bytes: 0 },
            technical: { count: 0, bytes: 0 }
        },
        multiVersionCount: 0
    };

    const uniqueBaseKeys = new Set();
    const versionedKeys = new Set();

    for (const f of versioned) {
        stats.totalBytes += (f.size || 0);

        if (stats.byCategory[f.category]) {
            stats.byCategory[f.category].count++;
            stats.byCategory[f.category].bytes += (f.size || 0);
        }

        if (f.versionCount > 1) {
            versionedKeys.add(f.baseKey);
        }
        uniqueBaseKeys.add(f.baseKey);
    }

    stats.formattedTotalSize = formatFileSize(stats.totalBytes);
    stats.multiVersionCount = versionedKeys.size;
    return stats;
}

/**
 * Bereidt een nieuw bestandsobject voor om atomair toe te voegen aan Firestore 'files: []'.
 * Voert strikte boundary-validatie, XSS-neutralisatie en categorie-/versietoekenning uit.
 * 
 * @param {Object} params - { file, category, uploadedBy, notes, existingFiles }
 * @returns {Object} Schoon bestandsobject
 */
export function prepareFileRecord({ file, category, uploadedBy = 'client', notes = '', existingFiles = [] }) {
    if (!file) throw new Error("Bestandsobject is verplicht");

    const rawName = (file.name || file.filename || 'bestand').trim().slice(0, 150);
    // Verwijder gevaarlijke besturingskarakters
    const safeName = rawName.replace(/[\r\n\x00-\x1F\x7F]/g, '');

    const resolvedCat = (category && VALID_VAULT_CATEGORIES.includes(category))
        ? category
        : resolveFileCategory(file);

    const safeUrl = sanitizeUrl(file.url || file.downloadURL || '');
    const safeSize = typeof file.size === 'number' && file.size >= 0 ? Math.floor(file.size) : 0;
    const safeType = (file.type || '').slice(0, 80);
    const safeUploadedBy = uploadedBy === 'admin' ? 'admin' : 'client';
    const safeNotes = typeof notes === 'string' ? notes.trim().slice(0, 200).replace(/[\r\n\x00-\x1F\x7F]/g, '') : '';

    // Bereken het volgende versienummer t.o.v. bestaande bestanden
    const baseKey = normalizeFileBaseKey(safeName);
    const existingMatches = computeFileVersions(existingFiles).filter(f => f.baseKey === baseKey);
    const nextVersion = existingMatches.length > 0
        ? Math.max(...existingMatches.map(m => m.version || 1)) + 1
        : 1;

    return {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: safeName,
        url: safeUrl,
        size: safeSize,
        type: safeType,
        category: resolvedCat,
        version: nextVersion,
        uploadedAt: new Date().toISOString(),
        uploadedBy: safeUploadedBy,
        notes: safeNotes
    };
}

/**
 * Genereert de HTML voor de categorie filter-tabs van de Document Vault.
 * 
 * @param {Object} params - { activeCategory, stats, lang }
 * @returns {string} Veilige HTML string
 */
export function renderVaultCategoryTabsHtml({ activeCategory = 'all', stats, lang = 'nl' }) {
    const isEn = lang === 'en';
    const safeStats = stats || { total: 0, byCategory: { brand: { count: 0 }, content: { count: 0 }, financial: { count: 0 }, technical: { count: 0 } } };

    const tabs = [
        { id: 'all', cat: VAULT_CATEGORIES.all, count: safeStats.total },
        { id: 'brand', cat: VAULT_CATEGORIES.brand, count: safeStats.byCategory.brand?.count || 0 },
        { id: 'content', cat: VAULT_CATEGORIES.content, count: safeStats.byCategory.content?.count || 0 },
        { id: 'financial', cat: VAULT_CATEGORIES.financial, count: safeStats.byCategory.financial?.count || 0 },
        { id: 'technical', cat: VAULT_CATEGORIES.technical, count: safeStats.byCategory.technical?.count || 0 }
    ];

    return `
        <div class="vault-tabs-bar" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 16px; -webkit-overflow-scrolling: touch;">
            ${tabs.map(tab => {
                const isActive = activeCategory === tab.id;
                const label = isEn ? tab.cat.labelEn : tab.cat.labelNl;
                const activeStyle = isActive 
                    ? `background: rgba(34, 211, 238, 0.15); border-color: var(--color-accent, #22d3ee); color: #fff; box-shadow: 0 0 12px rgba(34, 211, 238, 0.2);`
                    : `background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08); color: var(--color-text-secondary, #94a3b8);`;

                return `
                    <button type="button" class="vault-tab-btn ${isActive ? 'active' : ''}" data-vault-tab="${escapeHtml(tab.id)}" style="display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 9999px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid; transition: all 0.2s; white-space: nowrap; ${activeStyle}">
                        <i class="fas ${tab.cat.icon}" style="color: ${tab.cat.color};"></i>
                        <span>${escapeHtml(label)}</span>
                        <span class="vault-tab-badge" style="background: rgba(255,255,255,0.08); color: #e2e8f0; padding: 1px 7px; border-radius: 10px; font-size: 0.72rem; font-weight: 700;">${tab.count}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Genereert de HTML voor de bestandenrijen / grid in de Document Vault.
 * 
 * @param {Object} params - { files, activeCategory, searchQuery, lang, isAdmin }
 * @returns {string} Veilige HTML string
 */
export function renderVaultFilesGridHtml({ files = [], activeCategory = 'all', searchQuery = '', lang = 'nl', isAdmin = false }) {
    const isEn = lang === 'en';
    const filtered = filterVaultFiles(files, { category: activeCategory, searchQuery });

    if (filtered.length === 0) {
        const catInfo = VAULT_CATEGORIES[activeCategory] || VAULT_CATEGORIES.all;
        const emptyTitle = isEn ? 'No files in this category yet' : 'Nog geen bestanden in deze categorie';
        const emptyDesc = isEn 
            ? (catInfo.descriptionEn || 'Upload your project assets above.')
            : (catInfo.descriptionNl || 'Upload je projectbestanden via de uploadbalk hierboven.');

        return `
            <div class="vault-empty-state" style="text-align: center; padding: 36px 20px; background: rgba(255,255,255,0.015); border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px; margin-top: 10px;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(34, 211, 238, 0.08); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
                    <i class="fas ${catInfo.icon}" style="color: ${catInfo.color}; font-size: 1.4rem;"></i>
                </div>
                <div style="font-weight: 600; font-size: 0.95rem; color: #f1f5f9; margin-bottom: 4px;">${escapeHtml(emptyTitle)}</div>
                <div style="font-size: 0.82rem; color: var(--color-text-secondary, #94a3b8); max-width: 420px; margin: 0 auto;">${escapeHtml(emptyDesc)}</div>
            </div>
        `;
    }

    const localeStr = isEn ? 'en-US' : 'nl-NL';

    return `
        <div class="vault-files-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${filtered.map(f => {
                const cat = VAULT_CATEGORIES[f.category] || VAULT_CATEGORIES.technical;
                const catLabel = isEn ? cat.labelEn : cat.labelNl;
                const icon = getFileIcon(f.name);
                const sizeStr = formatFileSize(f.size);
                const dateStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString(localeStr, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                const safeUrl = escapeHtml(sanitizeUrl(f.url));
                const safeName = escapeHtml(f.name);
                const ext = (f.name || '').split('.').pop().toLowerCase();
                const canPreview = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'pdf'].includes(ext);

                // Versie pill
                let versionPillHtml = '';
                if (f.versionCount > 1) {
                    if (f.isLatest) {
                        versionPillHtml = `<span style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 10px; display: inline-flex; align-items: center; gap: 3px;" title="${isEn ? 'Latest revision' : 'Nieuwste revisie'}"><i class="fas fa-check"></i> v${f.version} (${isEn ? 'Latest' : 'Nieuwste'})</span>`;
                    } else {
                        versionPillHtml = `<span style="background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.25); color: #94a3b8; font-size: 0.7rem; font-weight: 600; padding: 2px 6px; border-radius: 10px;" title="${isEn ? 'Superseded earlier version' : 'Eerdere versie'}">v${f.version}</span>`;
                    }
                }

                // Uploader pill
                const uploaderPill = f.uploadedBy === 'admin'
                    ? `<span style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-shield-alt"></i> Creation+Alt+Fix</span>`
                    : `<span style="background: rgba(255, 255, 255, 0.05); color: #94a3b8; font-size: 0.7rem; padding: 1px 6px; border-radius: 4px;"><i class="fas fa-user"></i> ${isEn ? 'Client' : 'Klant'}</span>`;

                return `
                    <div class="vault-file-row" data-file-id="${escapeHtml(f.id)}" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.06); padding: 12px 16px; border-radius: 10px; transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(34, 211, 238, 0.3)'; this.style.background='rgba(0, 0, 0, 0.35)';" onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.06)'; this.style.background='rgba(0, 0, 0, 0.25)';">
                        <!-- Icon & Details -->
                        <div style="display: flex; align-items: center; gap: 14px; overflow: hidden; flex: 1;">
                            <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="fas ${icon}" style="color: ${cat.color}; font-size: 1.25rem;"></i>
                            </div>
                            <div style="overflow: hidden; flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px;">
                                    <span style="font-size: 0.9rem; font-weight: 600; color: #f8fafc; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 380px;" title="${safeName}">${safeName}</span>
                                    ${versionPillHtml}
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; font-size: 0.74rem; color: var(--color-text-secondary, #94a3b8); flex-wrap: wrap;">
                                    <span style="display: inline-flex; align-items: center; gap: 4px; color: ${cat.color}; font-weight: 600;">
                                        <i class="fas ${cat.icon}" style="font-size: 0.7rem;"></i> ${escapeHtml(catLabel)}
                                    </span>
                                    ${sizeStr ? `<span>&bull; ${escapeHtml(sizeStr)}</span>` : ''}
                                    ${dateStr ? `<span>&bull; ${escapeHtml(dateStr)}</span>` : ''}
                                    ${uploaderPill}
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                            ${canPreview ? `
                                <button type="button" class="btn-vault-preview" data-preview-url="${safeUrl}" data-preview-name="${safeName}" data-preview-type="${escapeHtml(ext)}" style="padding: 6px 10px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" title="${isEn ? 'Preview file' : 'Bekijk preview'}">
                                    <i class="fas fa-eye"></i> ${isEn ? 'Preview' : 'Inzien'}
                                </button>
                            ` : ''}
                            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" download="${safeName}" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); color: var(--color-accent, #22d3ee); font-size: 0.78rem; font-weight: 600; text-decoration: none; transition: all 0.2s;" title="${isEn ? 'Download file' : 'Bestand downloaden'}">
                                <i class="fas fa-download"></i> ${isEn ? 'Download' : 'Downloaden'}
                            </a>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Genereert de HTML voor de Lightbox Preview Modal.
 * 
 * @param {string} lang - 'nl' | 'en'
 * @returns {string} Modal HTML
 */
export function renderPreviewModalHtml(lang = 'nl') {
    const isEn = lang === 'en';
    return `
        <div id="vault-preview-modal" class="vault-modal-backdrop" style="display: none; position: fixed; inset: 0; z-index: 99999; background: rgba(10, 15, 29, 0.88); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 20px;">
            <div class="vault-modal-card" style="background: #0f172a; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 14px; width: 100%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                        <i class="fas fa-file-alt text-accent" style="color: var(--color-accent, #22d3ee);"></i>
                        <span id="vault-modal-filename" style="font-weight: 600; font-size: 0.95rem; color: #f8fafc; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">Bestand Preview</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <a id="vault-modal-download-btn" href="#" target="_blank" rel="noopener noreferrer" style="color: var(--color-accent, #22d3ee); background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); padding: 5px 12px; border-radius: 6px; font-size: 0.78rem; text-decoration: none; font-weight: 600;">
                            <i class="fas fa-download"></i> ${isEn ? 'Download' : 'Downloaden'}
                        </a>
                        <button type="button" id="vault-modal-close-btn" style="background: rgba(255,255,255,0.06); border: none; color: #94a3b8; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.2s;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <!-- Content Body -->
                <div id="vault-modal-body" style="flex: 1; overflow: auto; padding: 20px; display: flex; align-items: center; justify-content: center; background: #090d16; min-height: 340px;">
                    <!-- Dynamisch geladen preview (img of iframe) -->
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialiseert interactieve event listeners voor de Document Vault (preview modal, tabs, download-all).
 * 
 * @param {HTMLElement|Document} root 
 * @param {Object} handlers - { onCategoryChange, onSearch, onDownloadAll }
 */
export function initDocumentVaultEvents(root = document, handlers = {}) {
    if (!root) return;

    // Category tabs click handler
    root.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('[data-vault-tab]');
        if (tabBtn && typeof handlers.onCategoryChange === 'function') {
            const catId = tabBtn.getAttribute('data-vault-tab');
            handlers.onCategoryChange(catId);
        }

        // Preview button click handler
        const previewBtn = e.target.closest('.btn-vault-preview');
        if (previewBtn) {
            const url = previewBtn.getAttribute('data-preview-url');
            const name = previewBtn.getAttribute('data-preview-name');
            const type = previewBtn.getAttribute('data-preview-type');
            openVaultPreview(url, name, type);
        }

        // Modal close button
        if (e.target.closest('#vault-modal-close-btn')) {
            closeVaultPreview();
        }

        // Click on modal backdrop outside card
        const modal = document.getElementById('vault-preview-modal');
        if (modal && e.target === modal) {
            closeVaultPreview();
        }
    });

    // ESC toets sluit preview modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeVaultPreview();
        }
    });
}

/**
 * Opent de Lightbox preview voor een afbeelding of PDF.
 */
export function openVaultPreview(url, name, type) {
    let modal = document.getElementById('vault-preview-modal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', renderPreviewModalHtml());
        modal = document.getElementById('vault-preview-modal');
    }

    const titleElem = document.getElementById('vault-modal-filename');
    const downloadBtn = document.getElementById('vault-modal-download-btn');
    const bodyElem = document.getElementById('vault-modal-body');

    if (titleElem) titleElem.innerText = name || 'Bestand Preview';
    if (downloadBtn) {
        downloadBtn.href = url || '#';
        downloadBtn.setAttribute('download', name || 'bestand');
    }

    if (bodyElem) {
        const ext = (type || name.split('.').pop() || '').toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
            bodyElem.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">`;
        } else if (ext === 'pdf') {
            bodyElem.innerHTML = `<iframe src="${escapeHtml(url)}" style="width: 100%; height: 70vh; border: none; border-radius: 8px;" title="${escapeHtml(name)}"></iframe>`;
        } else {
            bodyElem.innerHTML = `
                <div style="text-align: center; color: #94a3b8;">
                    <i class="fas fa-file" style="font-size: 3rem; margin-bottom: 12px; color: var(--color-accent, #22d3ee);"></i>
                    <p>Geen directe preview beschikbaar voor dit bestandstype.</p>
                    <a href="${escapeHtml(url)}" target="_blank" download="${escapeHtml(name)}" class="btn" style="margin-top: 10px; display: inline-block;">Downloaden</a>
                </div>
            `;
        }
    }

    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Sluit de Lightbox preview modal.
 */
export function closeVaultPreview() {
    const modal = document.getElementById('vault-preview-modal');
    if (modal) {
        modal.style.display = 'none';
        const bodyElem = document.getElementById('vault-modal-body');
        if (bodyElem) bodyElem.innerHTML = '';
    }
}
