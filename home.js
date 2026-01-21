import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

onAuthStateChanged(auth, user => {
    if (!user) location.href = "login.html";
});

document.getElementById("logoutBtn").onclick = async () => {
    await signOut(auth);
    location.href = "login.html";
};

function genCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

document.getElementById("createBtn").onclick = async () => {
    const code = genCode();

    await setDoc(doc(db, "rooms", code), {
        name: "New Room",
        theme: "rain",
        capacity: 6,
        users: []
    });

    localStorage.setItem("roomCode", code);
    location.href = "lobby.html";
};

/* Join Modal Logic */
const modal = document.getElementById("joinModal");
const input = document.getElementById("roomCodeInput");

document.getElementById("joinBtn").onclick = () => {
    modal.classList.remove("hidden");
    input.value = "";
    input.focus();
};

document.getElementById("cancelJoin").onclick = () => {
    modal.classList.add("hidden");
};

document.getElementById("confirmJoin").onclick = async () => {
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    const snap = await getDoc(doc(db, "rooms", code));
    if (!snap.exists()) {
        alert("Room not found");
        return;
    }

    localStorage.setItem("roomCode", code);
    location.href = "lobby.html";
};
