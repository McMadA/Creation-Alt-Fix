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
    if (!db || !projectId) return null;
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId);
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
    if (!db || !projectId) return;
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId);
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
    if (!db || !projectId) return;
    try {
        await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
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
    if (!projectId) return currentLogs;
    const now = new Date();
    const newLog = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        type: type || "INFO",
        description: description || "",
        timestamp: now.toISOString(),
        dateFormatted: now.toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    };
    
    const updated = [newLog, ...(currentLogs || [])];
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
    if (!projectId || !message) return currentMessages;
    const updated = [...(currentMessages || []), message];
    await updateProject(projectId, { messages: updated });
    return updated;
}
