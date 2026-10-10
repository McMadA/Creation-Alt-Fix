/**
 * CRM Firestore Database Service
 * Provides clean, centralized CRUD operations for projects, tasks, logs, and messages.
 */

import { 
    db, 
    collection, 
    getDocs, 
    getDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    addDoc, 
    setDoc, 
    query, 
    where, 
    orderBy 
} from "./firebase.js";
import { escapeHtml } from "../crm-config.js";

const PROJECTS_COLLECTION = "projects";
const MONITORS_COLLECTION = "monitors";

/**
 * Valideert Firestore Document ID's tegen path traversal en ongeldige tekens.
 * @param {string} id 
 * @returns {boolean}
 */
export function isValidDocId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]{1,128}$/.test(id.trim());
}

/**
 * Fetches all projects from Firestore.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllProjects() {
    if (!db) return [];
    try {
        const querySnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
        const list = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
                id: docSnap.id,
                ...data
            });
        });
        return list;
    } catch (err) {
        console.error("[DB Service] Fout bij ophalen projecten:", err);
        throw err;
    }
}

/**
 * Fetches a single project by document ID.
 * @param {string} projectId 
 * @returns {Promise<Object|null>}
 */
export async function getProjectById(projectId) {
    if (!db || !isValidDocId(projectId)) return null;
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId.trim());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (err) {
        console.error(`[DB Service] Fout bij ophalen project ${projectId}:`, err);
        throw err;
    }
}

/**
 * Updates a project with new data and timestamps the update.
 * @param {string} projectId 
 * @param {Object} updateData 
 * @returns {Promise<void>}
 */
export async function updateProject(projectId, updateData) {
    if (!db || !isValidDocId(projectId)) return;
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId.trim());
        const payload = {
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        await updateDoc(docRef, payload);
    } catch (err) {
        console.error(`[DB Service] Fout bij updaten project ${projectId}:`, err);
        throw err;
    }
}

/**
 * Creates a new project in Firestore.
 * @param {Object} projectData 
 * @returns {Promise<string>} Created document ID
 */
export async function createProject(projectData) {
    if (!db) throw new Error("Database niet geïnitialiseerd");
    try {
        const payload = {
            ...projectData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), payload);
        return docRef.id;
    } catch (err) {
        console.error("[DB Service] Fout bij aanmaken project:", err);
        throw err;
    }
}

/**
 * Deletes a project by ID.
 * @param {string} projectId 
 * @returns {Promise<void>}
 */
export async function deleteProjectDoc(projectId) {
    if (!db || !isValidDocId(projectId)) return;
    try {
        await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId.trim()));
    } catch (err) {
        console.error(`[DB Service] Fout bij verwijderen project ${projectId}:`, err);
        throw err;
    }
}

/**
 * Records an audit log event inside a project document.
 * @param {string} projectId 
 * @param {string} type 
 * @param {string} description 
 * @param {Array} currentLogs 
 * @returns {Promise<Array>} Updated logs array
 */
export async function recordAuditLog(projectId, type, description, currentLogs = []) {
    if (!isValidDocId(projectId)) return currentLogs;
    const now = new Date();
    const cleanType = String(type || "INFO").replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().substring(0, 32);
    const cleanDescription = String(description || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().substring(0, 500);
    const newLog = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        type: cleanType,
        description: cleanDescription,
        timestamp: now.toISOString(),
        dateFormatted: now.toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    };
    
    // Bounded log array (max 100 entries) ter bescherming tegen Firestore document payload bloat
    const updated = [newLog, ...(currentLogs || [])].slice(0, 100);
    await updateProject(projectId, { auditLogs: updated });
    return updated;
}

/**
 * Appends a client message or ticket to a project.
 * @param {string} projectId 
 * @param {Object} message 
 * @param {Array} currentMessages 
 * @returns {Promise<Array>}
 */
export async function appendProjectMessage(projectId, message, currentMessages = []) {
    if (!isValidDocId(projectId) || !message || typeof message !== 'object') return currentMessages;
    
    const sender = String(message.sender || 'Klant').replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().substring(0, 100);
    const text = String(message.text || message.content || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().substring(0, 5000);
    const role = ['client', 'admin', 'system'].includes(message.role) ? message.role : 'client';
    const timestamp = message.timestamp || new Date().toISOString();

    const cleanMsg = {
        id: message.id || ("msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6)),
        sender,
        text,
        role,
        timestamp
    };

    // Bounded message list (max 250 entries) ter voorkoming van Document Size Limit (1MB) overschrijding
    const updated = [...(currentMessages || []), cleanMsg].slice(-250);
    await updateProject(projectId, { messages: updated });
    return updated;
}
