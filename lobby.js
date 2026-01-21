import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

onAuthStateChanged(auth, u => {
    if (!u) location.href = "login.html";
});

const code = localStorage.getItem("roomCode");
if (!code) location.href = "index.html";

const themes = {
    rain: "https://giffiles.alphacoders.com/105/105408.gif",
    night: "https://64.media.tumblr.com/c253e0c894134a6d728ae77f32ed98b2/7a2385d9de22bb25-6e/s1280x1920/919e8a6eb4833f25ba57059199415496741d88f4.gif",
    forest: "https://gifdb.com/images/high/anime-forest-and-butterflies-7gl83hrpsm18yrs7.gif",
    lofi: "https://www.gifcen.com/wp-content/uploads/2022/06/lofi-gif-7.gif",
    space: "https://i.gifer.com/4MES.gif"
};

const avatar = document.getElementById("avatar");
const nameInput = document.getElementById("displayName");
const preview = document.getElementById("preview");
const roomName = document.getElementById("roomName");
const roomInfo = document.getElementById("roomInfo");
const themeSelect = document.getElementById("themeSelect");

let seed = Math.random().toString(36).slice(2);

function setAvatar() {
    avatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
}
setAvatar();

document.getElementById("regen").onclick = () => {
    seed = Math.random().toString(36).slice(2);
    setAvatar();
};

async function loadRoom() {
    const snap = await getDoc(doc(db, "rooms", code));
    if (!snap.exists()) {
        alert("Room no longer exists");
        location.href = "home.html";
        return;
    }

    const data = snap.data();
    roomName.textContent = data.name;
    roomInfo.textContent = `Theme: ${data.theme} • Capacity: ${data.capacity}`;

    themeSelect.value = data.theme;
    preview.style.backgroundImage = `url(${themes[data.theme]})`;
}

loadRoom();

themeSelect.onchange = async () => {
    const newTheme = themeSelect.value;
    preview.style.backgroundImage = `url(${themes[newTheme]})`;

    await updateDoc(doc(db, "rooms", code), {
        theme: newTheme
    });
};

document.getElementById("enterBtn").onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) {
        alert("Please enter your name");
        return;
    }

    const user = auth.currentUser;

    await updateDoc(doc(db, "rooms", code), {
        users: arrayUnion({
            uid: user.uid,
            name,
            avatar: avatar.src
        })
    });

    localStorage.setItem("displayName", name);
    localStorage.setItem("avatar", avatar.src);

    location.href = "room.html";
};

document.getElementById("backBtn").onclick = () => {
    location.href = "home.html";
};
