// Mock or standard Firebase init file
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// Note: Replace with actual Firebase config from the parent environment
const firebaseConfig = {
    apiKey: "demo-key",
    authDomain: "spelling-bee-demo.firebaseapp.com",
    projectId: "spelling-bee-demo",
    storageBucket: "spelling-bee-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

let db = null;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase could not be initialized. Using local storage only.", e);
}

export { db, doc, setDoc, getDoc, onSnapshot };
