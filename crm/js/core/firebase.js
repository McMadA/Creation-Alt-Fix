/**
 * Single-Instance Firebase Service Provider
 * Initializes App, Auth, Firestore, Storage, and SecondaryAuth.
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged, 
    sendPasswordResetEmail, 
    createUserWithEmailAndPassword, 
    inMemoryPersistence, 
    setPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    addDoc, 
    setDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig } from "../crm-config.js";

let app = null;
let auth = null;
let db = null;
let storage = null;
let secondaryAuth = null;
let isReady = false;

try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.languageCode = 'nl';
    db = getFirestore(app);
    storage = getStorage(app);

    const existingSecondary = getApps().find(a => a.name === 'SecondaryAuth');
    const secondaryApp = existingSecondary || initializeApp(firebaseConfig, 'SecondaryAuth');
    secondaryAuth = getAuth(secondaryApp);
    secondaryAuth.languageCode = 'nl';
    setPersistence(secondaryAuth, inMemoryPersistence).catch(() => {});
    
    isReady = true;
} catch (error) {
    console.warn("[CRM Core] Firebase initialisatiefout:", error);
}

export {
    app,
    auth,
    db,
    storage,
    secondaryAuth,
    isReady,
    // Re-export common Firebase modules
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    setDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};
