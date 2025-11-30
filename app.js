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

// Tabs
const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");

// Tasks
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const tasksList = document.getElementById("tasksList");
const tasksEmptyHint = document.getElementById("tasksEmptyHint");

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
// Tabs logic
// ----------------------------
tabs.forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    const targetId = tabBtn.dataset.tab;
    if (!targetId) return;

    tabs.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));

    tabBtn.classList.add("active");
    const panel = document.getElementById(targetId);
    if (panel) panel.classList.add("active");
  });
});

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

  // Determine next order value based on current notes
  const maxOrder = allNotes.length
    ? Math.max(...allNotes.map((n) => n.order || 0))
    : 0;

  await db.collection("notes").add({
    uid: user.uid,
    text,
    category,
    order: maxOrder + 1,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  noteInput.value = "";
});

// ----------------------------
// Rendering and filters
// ----------------------------
let dragSourceId = null;

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
    wrapper.setAttribute("draggable", "true");
    wrapper.dataset.id = note.id;

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

    // Drag handlers
    wrapper.addEventListener("dragstart", () => {
      dragSourceId = note.id;
      wrapper.classList.add("dragging");
    });

    wrapper.addEventListener("dragend", () => {
      wrapper.classList.remove("dragging");
      dragSourceId = null;
    });

    wrapper.addEventListener("dragover", (e) => {
      e.preventDefault();
      wrapper.classList.add("drag-over");
    });

    wrapper.addEventListener("dragleave", () => {
      wrapper.classList.remove("drag-over");
    });

    wrapper.addEventListener("drop", async (e) => {
      e.preventDefault();
      wrapper.classList.remove("drag-over");

      const targetId = note.id;
      if (!dragSourceId || dragSourceId === targetId) return;

      // Reorder in memory
      const listCopy = allNotes.slice();
      const fromIndex = listCopy.findIndex((n) => n.id === dragSourceId);
      const toIndex = listCopy.findIndex((n) => n.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const [moved] = listCopy.splice(fromIndex, 1);
      listCopy.splice(toIndex, 0, moved);

      // Write new order values to Firestore
      const batch = db.batch();
      const total = listCopy.length;
      listCopy.forEach((n, idx) => {
        const ref = db.collection("notes").doc(n.id);
        // Highest order at top
        batch.update(ref, { order: total - idx });
      });
      await batch.commit();
    });

    wrapper.appendChild(main);
    wrapper.appendChild(delBtn);
    notesList.appendChild(wrapper);
  });

  // Update user meta (notes count)
  if (userMetaLabel) {
    userMetaLabel.textContent =
      filtered.length === 1 ? "1 note" : filtered.length + " notes";
  }
}

// Filters trigger rerender
searchInput.addEventListener("input", renderNotes);
categoryFilter.addEventListener("change", renderNotes);

// ----------------------------
// Live Firestore listener for notes
// ----------------------------
function subscribeToNotes(uid) {
  return db
    .collection("notes")
    .where("uid", "==", uid)
    .onSnapshot((snapshot) => {
      allNotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort locally by order, then createdAt
      allNotes.sort((a, b) => {
        const ao = a.order || 0;
        const bo = b.order || 0;
        if (ao !== bo) return bo - ao;
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      });

      refreshCategoryOptions();
      renderNotes();
    });
}

let unsubscribeNotes = null;

// ----------------------------
// Tasks state
// ----------------------------
let allTasks = [];

function renderTasks() {
  tasksList.innerHTML = "";

  if (allTasks.length === 0) {
    tasksEmptyHint.style.display = "block";
  } else {
    tasksEmptyHint.style.display = "none";
  }

  allTasks.forEach((task) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("task");

    const toggle = document.createElement("button");
    toggle.classList.add("task-toggle");
    if (task.done) toggle.classList.add("done");
    toggle.textContent = task.done ? "✓" : "";

    const textEl = document.createElement("p");
    textEl.classList.add("task-text");
    if (task.done) textEl.classList.add("done");
    textEl.textContent = task.text || "";

    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.classList.add("deleteBtn", "task-delete");

    toggle.addEventListener("click", async () => {
      await db
        .collection("tasks")
        .doc(task.id)
        .update({ done: !task.done });
    });

    delBtn.addEventListener("click", async () => {
      await db.collection("tasks").doc(task.id).delete();
    });

    wrapper.appendChild(toggle);
    wrapper.appendChild(textEl);
    wrapper.appendChild(delBtn);
    tasksList.appendChild(wrapper);
  });
}

addTaskBtn.addEventListener("click", async () => {
  const text = taskInput.value.trim();
  const user = auth.currentUser;

  if (!user) {
    alert("You need to be logged in.");
    return;
  }
  if (!text) return;

  await db.collection("tasks").add({
    uid: user.uid,
    text,
    done: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  taskInput.value = "";
});

function subscribeToTasks(uid) {
  return db
    .collection("tasks")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      allTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      renderTasks();
    });
}

let unsubscribeTasks = null;

// ----------------------------
// Auth state listener
// ----------------------------
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserId = user.uid;
    userEmailLabel.textContent = user.email || "";
    showApp();

    if (unsubscribeNotes) unsubscribeNotes();
    if (unsubscribeTasks) unsubscribeTasks();

    unsubscribeNotes = subscribeToNotes(user.uid);
    unsubscribeTasks = subscribeToTasks(user.uid);
  } else {
    currentUserId = null;
    showAuth();

    allNotes = [];
    notesList.innerHTML = "";
    emptyHint.style.display = "block";

    allTasks = [];
    tasksList.innerHTML = "";
    tasksEmptyHint.style.display = "block";

    if (userMetaLabel) userMetaLabel.textContent = "";

    if (unsubscribeNotes) {
      unsubscribeNotes();
      unsubscribeNotes = null;
    }
    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = null;
    }
  }
});
