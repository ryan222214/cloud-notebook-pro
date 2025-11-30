// ----------------------------
// Firebase initialization
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
// DOM elements
// ----------------------------
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const noteInput = document.getElementById("noteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesList = document.getElementById("notesList");
const emptyHint = document.getElementById("emptyHint");

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const categorySelect = document.getElementById("categorySelect");

const userEmailLabel = document.getElementById("userEmail");
const userMetaLabel = document.getElementById("userMeta");
const themeToggleBtn = document.getElementById("themeToggle");

// ----------------------------
// Theme handling
// ----------------------------
const THEME_KEY = "cloudNotebookTheme";

function applyTheme(theme) {
  document.body.classList.remove("theme-light", "theme-dark");
  if (theme === "light") {
    document.body.classList.add("theme-light");
  } else {
    document.body.classList.add("theme-dark");
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const initial = saved === "light" || saved === "dark" ? saved : "dark";
  applyTheme(initial);
}

themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.classList.contains("theme-light");
  const next = isLight ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

initTheme();

// ----------------------------
// Simple screen helpers
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
// Auth actions
// ----------------------------
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    alert("Account created");
  } catch (err) {
    alert(err.message);
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
});

// ----------------------------
// Notes state
// ----------------------------
let allNotes = [];
let currentUserId = null;

// Default categories
const baseCategories = ["General", "Ideas", "Tasks", "Personal"];

function getAllCategoriesFromNotes() {
  const set = new Set(baseCategories);
  allNotes.forEach((note) => {
    if (note.category) set.add(note.category);
  });
  return Array.from(set).sort();
}

function refreshCategoryOptions() {
  const cats = getAllCategoriesFromNotes();
  // Filter selector
  categoryFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All categories";
  categoryFilter.appendChild(allOption);

  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  // New note selector
  categorySelect.innerHTML = "";
  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

// ----------------------------
// Add note
// ----------------------------
addNoteBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  const user = auth.currentUser;
  const category = categorySelect.value || "General";

  if (!user) {
    alert("You need to be logged in.");
    return;
  }

  if (!text) return;

  await db.collection("notes").add({
    uid: user.uid,
    text,
    category,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  noteInput.value = "";
});

// ----------------------------
// Rendering and filters
// ----------------------------
function renderNotes() {
  notesList.innerHTML = "";

  const term = (searchInput.value || "").toLowerCase();
  const cat = categoryFilter.value || "all";

  let filtered = allNotes;

  if (cat !== "all") {
    filtered = filtered.filter((n) => (n.category || "General") === cat);
  }

  if (term) {
    filtered = filtered.filter((n) =>
      (n.text || "").toLowerCase().includes(term)
    );
  }

  if (filtered.length === 0) {
    emptyHint.style.display = "block";
  } else {
    emptyHint.style.display = "none";
  }

  filtered.forEach((note) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("note");

    const main = document.createElement("div");
    main.classList.add("note-main");

    const catLabel = document.createElement("div");
    catLabel.classList.add("note-category");
    catLabel.textContent = note.category || "General";

    const textEl = document.createElement("p");
    textEl.textContent = note.text || "";

    // Click to edit
    main.addEventListener("click", async () => {
      const current = note.text || "";
      const updated = prompt("Edit note", current);
      if (updated === null) return;
      const trimmed = updated.trim();
      if (!trimmed || trimmed === current) return;

      await db.collection("notes").doc(note.id).update({ text: trimmed });
    });

    main.appendChild(catLabel);
    main.appendChild(textEl);

    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.classList.add("deleteBtn");
    delBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await db.collection("notes").doc(note.id).delete();
    });

    wrapper.appendChild(main);
    wrapper.appendChild(delBtn);
    notesList.appendChild(wrapper);
  });

  // Update user meta
  if (userMetaLabel) {
    userMetaLabel.textContent =
      filtered.length === 1
        ? "1 note"
        : filtered.length + " notes";
  }
}

// Filters trigger rerender
searchInput.addEventListener("input", renderNotes);
categoryFilter.addEventListener("change", renderNotes);

// ----------------------------
// Live Firestore listener
// ----------------------------
function subscribeToNotes(uid) {
  return db
    .collection("notes")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      allNotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      refreshCategoryOptions();
      renderNotes();
    });
}

let unsubscribeNotes = null;

// ----------------------------
// Auth state listener
// ----------------------------
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserId = user.uid;
    userEmailLabel.textContent = user.email || "";
    showApp();

    if (unsubscribeNotes) unsubscribeNotes();
    unsubscribeNotes = subscribeToNotes(user.uid);
  } else {
    currentUserId = null;
    showAuth();
    allNotes = [];
    notesList.innerHTML = "";
    emptyHint.style.display = "block";
    if (userMetaLabel) userMetaLabel.textContent = "";
    if (unsubscribeNotes) {
      unsubscribeNotes();
      unsubscribeNotes = null;
    }
  }
});
