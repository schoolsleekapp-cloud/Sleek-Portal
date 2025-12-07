import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Declare global variables injected by the environment (if used)
declare const __app_id: string;

export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Firebase configuration for 'sleek-school-portals'
const firebaseConfig = {
  apiKey: "AIzaSyCXqYrkL_6Yb2N3lB9y_ZfzIBb5z9P8jgo",
  authDomain: "sleek-school-portals.firebaseapp.com",
  projectId: "sleek-school-portals",
  storageBucket: "sleek-school-portals.firebasestorage.app",
  messagingSenderId: "881341952180",
  appId: "1:881341952180:web:21568d2647a7210d5827e1",
  measurementId: "G-JSTFWR0LHQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with default settings to allow auto-detection of best connection method (WebSockets vs Long Polling)
export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
});