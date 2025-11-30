// ----------------------------
// Firebase Initialization
// ----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAc61u9eQg7gVakbhbQq-yI14bY9ECHsOw",
  authDomain: "cloud-notebook-pro.firebaseapp.com",
  projectId: "cloud-notebook-pro",
  storageBucket: "cloud-notebook-pro.firebasestorage.app",
  messagingSenderId: "530994617086",
  appId: "1:530994617086:web:c270ae41c2a802506823af"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ----------------------------
// Get DOM Elements
// ----------------------------
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const noteInput = document.getElementById("noteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesList = document.getElementById("notesList");

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

// NEW: empty-state hint
const emptyHint = document.getElementById("emptyHint");

// ----------------------------
// Show / Hide Screens
// ----------------------------
function showApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
}

function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
}

// ----------------------------
// Signup
// ----------------------------
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    alert("Account created!");
  } catch (error) {
    alert(error.message);
  }
});

// ----------------------------
// Login
// ----------------------------
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    alert(error.message);
  }
});

// ----------------------------
// Logout
// ----------------------------
logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
});

// ----------------------------
// Add Note
// ----------------------------
addNoteBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  const user = auth.currentUser;

  if (!user) return alert("Not logged in.");
  if (text === "") return;

  await db.collection("notes").add({
    uid: user.uid,
    text: text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  noteInput.value = "";
});

// ----------------------------
// Load Notes
// ----------------------------
function loadNotes(uid) {
  db.collection("notes")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      notesList.innerHTML = "";

      // NEW: show or hide “No notes yet”
      if (snapshot.empty) {
        emptyHint.style.display = "block";
      } else {
        emptyHint.style.display = "none";
      }

      snapshot.forEach((doc) => {
        const note = doc.data();
        const id = doc.id;

        const div = document.createElement("div");
        div.classList.add("note");

        const p = document.createElement("p");
        p.textContent = note.text;

        const delBtn = document.createElement("button");
        delBtn.textContent = "✕";
        delBtn.classList.add("deleteBtn");

        delBtn.addEventListener("click", () => {
          db.collection("notes").doc(id).delete();
        });

        div.appendChild(p);
        div.appendChild(delBtn);
        notesList.appendChild(div);
      });
    });
}

// ----------------------------
// Auth State Listener
// ----------------------------
auth.onAuthStateChanged((user) => {
  if (user) {
    showApp();
    loadNotes(user.uid);
  } else {
    showAuth();
    notesList.innerHTML = "";
    if (emptyHint) emptyHint.style.display = "block"; // show message if logged out
  }
});
