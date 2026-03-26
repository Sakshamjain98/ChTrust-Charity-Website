// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";


// Your web app's Firebase configuration
// Note: These are client-side public keys, safe to expose
const firebaseConfig = {
    apiKey: (window.env && window.env.NEXT_PUBLIC_FIREBASE_API_KEY) ,
    authDomain: (window.env && window.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: (window.env && window.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ,
    storageBucket: (window.env && window.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: (window.env && window.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) ,
    appId: (window.env && window.env.NEXT_PUBLIC_FIREBASE_APP_ID) 
};

// Initialize Firebase (client-side only)
// This code only runs in the browser, not during SSR
let app, auth, db, storage;

try {
    if (typeof window !== 'undefined') {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } else {
        // Server-side fallback (should not execute in production)
        console.warn('Firebase initialization attempted on server-side');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Provide fallback objects to prevent crashes
    app = null;
    auth = null;
    db = null;
    storage = null;
}

export { auth, db, storage };
