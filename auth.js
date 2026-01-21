import { auth } from "./firebase.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const email = document.getElementById("email");
const pass = document.getElementById("password");

document.getElementById("loginBtn").onclick = async () => {
    try {
        await signInWithEmailAndPassword(auth, email.value, pass.value);
    } catch (e) { alert(e.message); }
};

document.getElementById("registerBtn").onclick = async () => {
    try {
        await createUserWithEmailAndPassword(auth, email.value, pass.value);
    } catch (e) { alert(e.message); }
};

document.getElementById("googleBtn").onclick = async () => {
    try {
        const p = new GoogleAuthProvider();
        await signInWithPopup(auth, p);
    } catch (e) { alert(e.message); }
};

onAuthStateChanged(auth, user => {
    if (user) location.href = "index.html";
});
