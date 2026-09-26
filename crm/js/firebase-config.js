/**
 * Shared Firebase Configuration & Security Utilities
 * Creation+Alt+Fix CRM - Single Source of Truth
 * 
 * Re-exports everything from the centralized crm-config.js for full backward compatibility.
 */

export {
    BRANDING,
    firebaseConfig,
    FIREBASE_CONFIG,
    ADMIN_EMAILS,
    EMAILJS_CONFIG,
    SUBSCRIPTION_PLANS,
    WORKFLOW_STAGES,
    escapeHtml,
    isAdminEmail,
    formatProjectStatus,
    formatCurrency,
    normalizeDomain
} from "./crm-config.js";
