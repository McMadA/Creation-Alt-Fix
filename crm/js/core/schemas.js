/**
 * @file crm/js/core/schemas.js
 * JSDoc Typings & Defensive Schema Validation voor Creation+Alt+Fix CRM.
 * Garandeert veilige defaults en voorkomt runtime errors door ontbrekende velden.
 * Zero external dependencies.
 */

/**
 * @typedef {Object} TaskItem
 * @property {string} id
 * @property {string} title
 * @property {'todo'|'in_progress'|'done'} status
 * @property {boolean} completed
 * @property {string} [dueDate]
 */

/**
 * @typedef {Object} MessageItem
 * @property {string} id
 * @property {string} text
 * @property {'admin'|'client'|'system'} sender
 * @property {string} timestamp ISO datumstring
 * @property {'open'|'resolved'} [status]
 */

/**
 * @typedef {Object} InvoiceDocument
 * @property {string} invoiceNumber
 * @property {string} invoiceDate
 * @property {number} amountExcl
 * @property {number} amountVat
 * @property {number} amountIncl
 * @property {'open'|'paid'|'expired'|'canceled'} status
 * @property {string} [molliePaymentId]
 * @property {string} [mollieCheckoutUrl]
 * @property {string} [paidAt]
 * @property {string} [pdfUrl]
 */

/**
 * @typedef {Object} AnnotationItem
 * @property {string} id
 * @property {number} xPercent
 * @property {number} yPercent
 * @property {number} viewportWidth
 * @property {string} targetUrl
 * @property {string} comment
 * @property {'open'|'resolved'} status
 * @property {string} author
 * @property {string} createdAt
 * @property {string|null} [resolvedAt]
 * @property {string} [screenshotUrl]
 */

/**
 * @typedef {Object} ContractDocument
 * @property {string} contractNumber
 * @property {string} planId
 * @property {string} planName
 * @property {number} annualPrice
 * @property {number} serviceMinutesIncluded
 * @property {string} signedByName
 * @property {string} signedAt
 * @property {string} signerIp
 * @property {string} [signatureDataUrl]
 * @property {string} [pdfStorageUrl]
 * @property {'active'|'draft'|'expired'} status
 */

/**
 * @typedef {Object} ProjectDocument
 * @property {string} id
 * @property {string} client
 * @property {string} companyName
 * @property {string} email
 * @property {string} phone
 * @property {string} domainName
 * @property {string[]} additionalDomains
 * @property {number} status Fase index 1 t/m 5
 * @property {string} subscriptionPlan
 * @property {string} subscriptionPlan2027Status
 * @property {string} subscriptionPlan2027Name
 * @property {number} subscriptionPlan2027Price
 * @property {number} proposalPrice
 * @property {TaskItem[]} tasks
 * @property {MessageItem[]} messages
 * @property {InvoiceDocument[]} [invoices]
 * @property {AnnotationItem[]} [annotations]
 * @property {ContractDocument|null} [contract]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export const Schemas = {
    /**
     * Saniteert en normaliseert een ruw Firestore projectdocument
     * @param {Object} rawDoc 
     * @returns {ProjectDocument}
     */
    sanitizeProject(rawDoc = {}) {
        if (!rawDoc || typeof rawDoc !== 'object') rawDoc = {};
        
        const client = String(rawDoc.client || rawDoc.companyName || 'Naamloze Klant').trim();
        const companyName = String(rawDoc.companyName || rawDoc.client || client).trim();
        
        let status = Number(rawDoc.status);
        if (!Number.isInteger(status) || status < 1 || status > 5) {
            status = 1;
        }

        return {
            id: String(rawDoc.id || ''),
            client: client,
            companyName: companyName,
            email: String(rawDoc.email || '').trim().toLowerCase(),
            phone: String(rawDoc.phone || '').trim(),
            domainName: String(rawDoc.domainName || rawDoc.domain || '').toLowerCase().trim(),
            additionalDomains: Array.isArray(rawDoc.additionalDomains)
                ? rawDoc.additionalDomains.map(d => String(d || '').toLowerCase().trim()).filter(Boolean)
                : (typeof rawDoc.additionalDomains === 'string' && rawDoc.additionalDomains.trim()
                    ? rawDoc.additionalDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
                    : []),
            status: status,
            subscriptionPlan: String(rawDoc.subscriptionPlan || 'geen'),
            subscriptionPlan2027Status: String(rawDoc.subscriptionPlan2027Status || 'geen'),
            subscriptionPlan2027Name: String(rawDoc.subscriptionPlan2027Name || ''),
            subscriptionPlan2027Price: Number(rawDoc.subscriptionPlan2027Price || 0),
            subscriptionPlan2027ConfirmedAt: rawDoc.subscriptionPlan2027ConfirmedAt || null,
            proposalPrice: Number(rawDoc.proposalPrice || 0),
            proposalGeneratedAt: rawDoc.proposalGeneratedAt || null,
            tasks: Array.isArray(rawDoc.tasks) ? rawDoc.tasks.map(this.sanitizeTask) : [],
            messages: Array.isArray(rawDoc.messages) ? rawDoc.messages.map(this.sanitizeMessage) : [],
            invoices: Array.isArray(rawDoc.invoices) && rawDoc.invoices.length > 0
                ? rawDoc.invoices.map(it => this.sanitizeInvoice(it))
                : ((rawDoc.invoiceNumber || rawDoc.factuurnummer)
                    ? [this.sanitizeInvoice({
                        invoiceNumber: rawDoc.invoiceNumber || rawDoc.factuurnummer,
                        description: rawDoc.service || 'Website & Software Realisatie',
                        invoiceDate: rawDoc.invoiceDate || (rawDoc.createdAt ? rawDoc.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
                        amountExcl: Number(rawDoc.proposalPrice || 0),
                        amountVat: Number((rawDoc.proposalPrice || 0) * 0.21),
                        amountIncl: Number((rawDoc.proposalPrice || 0) * 1.21),
                        status: rawDoc.invoicePaid || rawDoc.status === 5 ? 'paid' : 'open',
                        mollieCheckoutUrl: rawDoc.mollieLink || '',
                        pdfUrl: rawDoc.invoicePdfUrl || ''
                    })]
                    : []),
            annotations: Array.isArray(rawDoc.annotations) ? rawDoc.annotations.map(this.sanitizeAnnotation) : [],
            contract: rawDoc.contract ? this.sanitizeContract(rawDoc.contract) : null,
            clientUid: String(rawDoc.clientUid || ''),
            isClientAccount: Boolean(rawDoc.isClientAccount),
            createdAt: rawDoc.createdAt || new Date().toISOString(),
            updatedAt: rawDoc.updatedAt || new Date().toISOString()
        };
    },

    /**
     * @param {Object} rawTask 
     * @returns {TaskItem}
     */
    sanitizeTask(rawTask = {}) {
        if (!rawTask || typeof rawTask !== 'object') rawTask = {};
        const isDone = Boolean(rawTask.completed || rawTask.status === 'done');
        return {
            id: String(rawTask.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`),
            title: String(rawTask.title || 'Nieuwe Taak').trim(),
            status: isDone ? 'done' : (rawTask.status === 'in_progress' ? 'in_progress' : 'todo'),
            completed: isDone,
            dueDate: String(rawTask.dueDate || '')
        };
    },

    /**
     * @param {Object} rawMsg 
     * @returns {MessageItem}
     */
    sanitizeMessage(rawMsg = {}) {
        if (!rawMsg || typeof rawMsg !== 'object') rawMsg = {};
        return {
            id: String(rawMsg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`),
            text: String(rawMsg.text || '').trim(),
            sender: ['admin', 'client', 'system'].includes(rawMsg.sender) ? rawMsg.sender : 'client',
            timestamp: rawMsg.timestamp || new Date().toISOString(),
            status: rawMsg.status === 'resolved' ? 'resolved' : 'open'
        };
    },

    /**
     * @param {Object} rawInvoice 
     * @returns {InvoiceDocument}
     */
    sanitizeInvoice(rawInvoice = {}) {
        if (!rawInvoice || typeof rawInvoice !== 'object') rawInvoice = {};
        const excl = Number(rawInvoice.amountExcl || 0);
        const vat = Number(rawInvoice.amountVat !== undefined ? rawInvoice.amountVat : (excl * 0.21));
        const incl = Number(rawInvoice.amountIncl !== undefined ? rawInvoice.amountIncl : (excl + vat));
        
        let status = 'open';
        if (['paid', 'voldaan'].includes(rawInvoice.status)) status = 'paid';
        else if (['canceled', 'geannuleerd'].includes(rawInvoice.status)) status = 'canceled';
        else if (['expired', 'verlopen'].includes(rawInvoice.status)) status = 'expired';

        return {
            invoiceNumber: String(rawInvoice.invoiceNumber || rawInvoice.number || rawInvoice.factuurnummer || `2026-001`),
            description: String(rawInvoice.description || rawInvoice.omschrijving || rawInvoice.service || 'Website Realisatie & Software Diensten'),
            invoiceDate: String(rawInvoice.invoiceDate || rawInvoice.date || new Date().toISOString().split('T')[0]),
            dueDate: String(rawInvoice.dueDate || rawInvoice.vervaldatum || ''),
            amountExcl: excl,
            amountVat: vat,
            amountIncl: incl,
            status: status,
            molliePaymentId: String(rawInvoice.molliePaymentId || ''),
            mollieCheckoutUrl: String(rawInvoice.mollieCheckoutUrl || rawInvoice.mollieLink || ''),
            paidAt: rawInvoice.paidAt || null,
            pdfUrl: String(rawInvoice.pdfUrl || '')
        };
    },

    /**
     * @param {Object} rawAnn 
     * @returns {AnnotationItem}
     */
    sanitizeAnnotation(rawAnn = {}) {
        if (!rawAnn || typeof rawAnn !== 'object') rawAnn = {};
        return {
            id: String(rawAnn.id || `pin_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`),
            xPercent: Math.max(0, Math.min(100, Number(rawAnn.xPercent || 50))),
            yPercent: Math.max(0, Math.min(100, Number(rawAnn.yPercent || 50))),
            viewportWidth: Number(rawAnn.viewportWidth || 1280),
            targetUrl: String(rawAnn.targetUrl || ''),
            comment: String(rawAnn.comment || '').trim(),
            status: rawAnn.status === 'resolved' ? 'resolved' : 'open',
            author: String(rawAnn.author || 'Klant'),
            createdAt: rawAnn.createdAt || new Date().toISOString(),
            resolvedAt: rawAnn.resolvedAt || null,
            screenshotUrl: String(rawAnn.screenshotUrl || '')
        };
    },

    /**
     * @param {Object} rawContract 
     * @returns {ContractDocument}
     */
    sanitizeContract(rawContract = {}) {
        if (!rawContract || typeof rawContract !== 'object') rawContract = {};
        return {
            contractNumber: String(rawContract.contractNumber || `SLA-${new Date().getFullYear()}-001`),
            planId: String(rawContract.planId || 'managed_nl'),
            planName: String(rawContract.planName || 'Managed Cloud Hosting'),
            annualPrice: Number(rawContract.annualPrice || 150),
            serviceMinutesIncluded: Number(rawContract.serviceMinutesIncluded || 30),
            signedByName: String(rawContract.signedByName || '').trim(),
            signedAt: rawContract.signedAt || new Date().toISOString(),
            signerIp: String(rawContract.signerIp || ''),
            signatureDataUrl: String(rawContract.signatureDataUrl || ''),
            pdfStorageUrl: String(rawContract.pdfStorageUrl || ''),
            status: ['active', 'draft', 'expired'].includes(rawContract.status) ? rawContract.status : 'active'
        };
    }
};
