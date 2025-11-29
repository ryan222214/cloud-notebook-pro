// Auth elements
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// App elements
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const noteInput = document.getElementById("noteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesList = document.getElementById("notesList");

// ---- AUTH LOGIC ----

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    alert(err.message);
  }
});

// Signup
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    alert("Account created!");
  } catch (err) {
    alert(err.message);
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

// Listen for auth changes
auth.onAuthStateChanged(user => {
  if (user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    loadNotes(user.uid);
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    notesList.innerHTML = "";
  }
});


// ---- NOTES LOGIC ----

// Add a new note
addNoteBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = noteInput.value.trim();

  if (!text) return;

  await db.collection("notes").add({
    uid: user.uid,
    text: text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  noteInput.value = "";
  loadNotes(user.uid);
});

// Load notes
async function loadNotes(uid) {
  const snapshot = await db.collection("notes")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .get();

  notesList.innerHTML = "";

  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("note");

    div.innerHTML = `
      <p>${data.text}</p>
      <button class="deleteBtn">X</button>
    `;

    div.querySelector(".deleteBtn").addEventListener("click", () => {
      db.collection("notes").doc(doc.id).delete();
      loadNotes(uid);
    });

    notesList.appendChild(div);
  });
}
