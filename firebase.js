import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyDQRc_4Xl8ip07lYAoIkUxBAby7j-4zuLU",
    authDomain: "focus-cafe-ef38d.firebaseapp.com",
    projectId: "focus-cafe-ef38d",
    storageBucket: "focus-cafe-ef38d.firebasestorage.app",
    messagingSenderId: "1073331173646",
    appId: "1:1073331173646:web:078d63073a878217c4bf5f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
