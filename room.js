import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
    doc, collection, setDoc, deleteDoc,
    onSnapshot, addDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const code = localStorage.getItem("roomCode");
if (!code) location.href = "home.html";

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const themes = {
    rain: "https://giffiles.alphacoders.com/105/105408.gif",
    night: "https://64.media.tumblr.com/c253e0c894134a6d728ae77f32ed98b2/7a2385d9de22bb25-6e/s1280x1920/919e8a6eb4833f25ba57059199415496741d88f4.gif",
    forest: "https://gifdb.com/images/high/anime-forest-and-butterflies-7gl83hrpsm18yrs7.gif",
    lofi: "https://www.gifcen.com/wp-content/uploads/2022/06/lofi-gif-7.gif",
    space: "https://i.gifer.com/4MES.gif"
};

const musicMap = {
    rain: "assets/music/rain.mp3",
    night: "assets/music/night.mp3",
    forest: "assets/music/forest.mp3",
    lofi: "assets/music/lofi.mp3",
    space: "assets/music/space.mp3"
};

const grid = document.getElementById("videoGrid");
const bg = document.getElementById("bg");
const nameEl = document.getElementById("roomName");
const codeEl = document.getElementById("roomCode");

let localStream = new MediaStream();
let micOn = false, camOn = false, sharing = false, musicOn = false;
let screenTrack = null;

let uid, roomRef, peersCol, offersCol, answersCol, iceCol;
const peers = new Map();

/* ---------- MUSIC ---------- */
let bgAudio = new Audio();
bgAudio.loop = true;
bgAudio.volume = 0;

function fadeInMusic() {
    bgAudio.play().catch(() => { });
    let v = 0;
    const i = setInterval(() => {
        v += 0.02;
        bgAudio.volume = Math.min(v, 0.4);
        if (v >= 0.4) clearInterval(i);
    }, 60);
}
function fadeOutMusic() {
    let v = bgAudio.volume;
    const i = setInterval(() => {
        v -= 0.02;
        bgAudio.volume = Math.max(v, 0);
        if (v <= 0) { clearInterval(i); bgAudio.pause(); }
    }, 60);
}

document.getElementById("musicBtn").onclick = () => {
    musicOn = !musicOn;
    const b = document.getElementById("musicBtn");
    if (musicOn) { fadeInMusic(); b.classList.remove("off"); }
    else { fadeOutMusic(); b.classList.add("off"); }
};

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, async user => {
    if (!user) location.href = "login.html";
    uid = user.uid;

    roomRef = doc(db, "rooms", code);
    peersCol = collection(roomRef, "peers");
    offersCol = collection(roomRef, "offers");
    answersCol = collection(roomRef, "answers");
    iceCol = collection(roomRef, "ice");

    await setDoc(doc(peersCol, uid), {
        name: localStorage.getItem("displayName"),
        avatar: localStorage.getItem("avatar"),
        joined: Date.now()
    });

    onSnapshot(roomRef, s => {
        if (!s.exists()) return;
        const d = s.data();
        nameEl.textContent = d.name;
        codeEl.textContent = "#" + code;
        bg.style.backgroundImage = `url(${themes[d.theme]})`;

        const track = musicMap[d.theme];
        if (track) {
            bgAudio.src = track;
            if (musicOn) fadeInMusic();
        }
    });

    watchPeers();
    watchOffers();
    watchAnswers();
});

/* ---------- TILE ---------- */
function createTile(id, name, avatar) {
    const wrap = document.createElement("div");
    wrap.className = "tile";
    wrap.id = "tile-" + id;

    const v = document.createElement("video");
    v.autoplay = true;
    v.playsInline = true;

    const a = document.createElement("div");
    a.className = "avatar-layer";
    a.innerHTML = `<img src="${avatar}"><span>${name}</span>`;

    wrap.appendChild(v);
    wrap.appendChild(a);
    grid.appendChild(wrap);
    wrap.onclick = () => {
        const g = document.getElementById("videoGrid");

        if (wrap.classList.contains("pinned")) {
            wrap.classList.remove("pinned");
            g.classList.remove("pinned-mode");
        } else {
            document.querySelectorAll(".tile")
                .forEach(t => t.classList.remove("pinned"));
            wrap.classList.add("pinned");
            g.classList.add("pinned-mode");
        }
    };

    return { video: v, avatarLayer: a };
}

/* ---------- SELF TILE ---------- */
const selfTile = document.createElement("div");
selfTile.className = "tile self";

const selfVideo = document.createElement("video");
selfVideo.autoplay = true;
selfVideo.muted = true;
selfVideo.playsInline = true;
selfVideo.srcObject = localStream;

const selfAvatar = document.createElement("div");
selfAvatar.className = "avatar-layer";
selfAvatar.innerHTML = `<img src="${localStorage.getItem("avatar")}"><span>${localStorage.getItem("displayName")}</span>`;

selfTile.appendChild(selfVideo);
selfTile.appendChild(selfAvatar);
grid.appendChild(selfTile);

/* ---------- PEERS ---------- */
function watchPeers() {
    onSnapshot(peersCol, snap => {
        snap.docChanges().forEach(ch => {
            const pid = ch.doc.id;
            if (pid === uid) return;
            if (ch.type === "added") connectTo(pid, ch.doc.data());
            if (ch.type === "removed") removePeer(pid);
        });
    });
}

function connectTo(pid, data) {
    const pc = new RTCPeerConnection(rtcConfig);
    peers.set(pid, pc);

    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    const tile = createTile(pid, data.name, data.avatar);
    pc.ontrack = e => {
        tile.video.srcObject = e.streams[0];
        tile.avatarLayer.style.display = "none";
    };

    pc.onicecandidate = e => {
        if (e.candidate)
            addDoc(collection(iceCol, `${uid}_${pid}`), e.candidate.toJSON());
    };

    pc.createOffer().then(o => {
        pc.setLocalDescription(o);
        addDoc(offersCol, { from: uid, to: pid, sdp: o });
    });
}

function watchOffers() {
    onSnapshot(offersCol, snap => {
        snap.forEach(async d => {
            const { from, to, sdp } = d.data();
            if (to !== uid || peers.has(from)) return;

            const pc = new RTCPeerConnection(rtcConfig);
            peers.set(from, pc);

            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

            const tile = createTile(from, "User", "");
            pc.ontrack = e => {
                tile.video.srcObject = e.streams[0];
                tile.avatarLayer.style.display = "none";
            };

            pc.onicecandidate = e => {
                if (e.candidate)
                    addDoc(collection(iceCol, `${uid}_${from}`), e.candidate.toJSON());
            };

            await pc.setRemoteDescription(sdp);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            addDoc(answersCol, { from: uid, to: from, sdp: ans });
        });
    });
}

function watchAnswers() {
    onSnapshot(answersCol, snap => {
        snap.forEach(d => {
            const { from, to, sdp } = d.data();
            if (to !== uid) return;
            const pc = peers.get(from);
            if (pc && !pc.currentRemoteDescription)
                pc.setRemoteDescription(sdp);
        });
    });
}

function removePeer(pid) {
    const pc = peers.get(pid);
    if (pc) pc.close();
    peers.delete(pid);
    const t = document.getElementById("tile-" + pid);
    if (t) t.remove();
}

/* ---------- CONTROLS ---------- */

document.getElementById("micBtn").onclick = async () => {
    micOn = !micOn;
    if (micOn && !localStream.getAudioTracks().length) {
        const a = await navigator.mediaDevices.getUserMedia({ audio: true });
        a.getTracks().forEach(t => localStream.addTrack(t));
    }
    localStream.getAudioTracks().forEach(t => t.enabled = micOn);
    document.getElementById("micBtn").classList.toggle("off", !micOn);
};

document.getElementById("camBtn").onclick = async () => {
    camOn = !camOn;
    if (camOn && !localStream.getVideoTracks().length) {
        const v = await navigator.mediaDevices.getUserMedia({ video: true });
        v.getTracks().forEach(t => localStream.addTrack(t));
    }
    localStream.getVideoTracks().forEach(t => t.enabled = camOn);
    selfAvatar.style.display = camOn ? "none" : "flex";
    document.getElementById("camBtn").classList.toggle("off", !camOn);
};

document.getElementById("shareBtn").onclick = async () => {
    if (!sharing) {
        const s = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        screenTrack = s.getVideoTracks()[0];

        if (localStream.getVideoTracks().length)
            localStream.removeTrack(localStream.getVideoTracks()[0]);
        localStream.addTrack(screenTrack);

        peers.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
            if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = stopSharing;
        sharing = true;
    } else stopSharing();
};

async function stopSharing() {
    if (screenTrack) screenTrack.stop();
    screenTrack = null;

    if (camOn) {
        const v = await navigator.mediaDevices.getUserMedia({ video: true });
        const t = v.getVideoTracks()[0];
        if (localStream.getVideoTracks().length)
            localStream.removeTrack(localStream.getVideoTracks()[0]);
        localStream.addTrack(t);

        peers.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");
            if (sender) sender.replaceTrack(t);
        });
    }
    sharing = false;
}

document.getElementById("leaveBtn").onclick = async () => {
    await deleteDoc(doc(peersCol, uid));
    location.href = "home.html";
};
