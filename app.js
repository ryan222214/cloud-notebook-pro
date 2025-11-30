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
const categoryFoldersEl = document.getElementById("categoryFolders");
const categorySelect = document.getElementById("categorySelect");

const userEmailLabel = document.getElementById("userEmail");
const userMetaLabel = document.getElementById("userMeta");
const themeToggleBtn = document.getElementById("themeToggle");

// Tabs
const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");

// Tasks
const taskInput = document.getElementById("taskInput");
const taskBucketSelect = document.getElementById("taskBucketSelect");
const addTaskBtn = document.getElementById("addTaskBtn");
const tasksList = document.getElementById("tasksList");
const tasksEmptyHint = document.getElementById("tasksEmptyHint");
const taskTabs = document.querySelectorAll(".task-tab");

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
// Top level tabs (Notes / Tasks)
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

let activeCategory = null;

function getAllCategoriesFromNotes() {
  const set = new Set(baseCategories);
  allNotes.forEach((note) => {
    if (note.category) set.add(note.category);
  });
  return Array.from(set).sort();
}

// Build category folders and dropdown
function refreshCategoryOptions() {
  const cats = getAllCategoriesFromNotes();

  if (!activeCategory || !cats.includes(activeCategory)) {
    activeCategory = cats[0] || "General";
  }

  // Build dropdown for new note destination
  categorySelect.innerHTML = "";
  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
  categorySelect.value = activeCategory;

  // Build folder list with counts
  categoryFoldersEl.innerHTML = "";
  cats.forEach((cat) => {
    const count = allNotes.filter(
      (n) => (n.category || "General") === cat
    ).length;

    const folder = document.createElement("button");
    folder.type = "button";
    folder.classList.add("folder");
    if (cat === activeCategory) folder.classList.add("active");

    const name = document.createElement("span");
    name.classList.add("folder-name");
    name.textContent = cat;

    const countEl = document.createElement("span");
    countEl.classList.add("folder-count");
    countEl.textContent = count === 1 ? "1 note" : count + " notes";

    folder.appendChild(name);
    folder.appendChild(countEl);

    folder.addEventListener("click", () => {
      activeCategory = cat;
      categorySelect.value = activeCategory;
      refreshCategoryOptions(); // rebuild to update active styling and counts
      renderNotes();
    });

    categoryFoldersEl.appendChild(folder);
  });
}

// ----------------------------
// Add note
// ----------------------------
addNoteBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  const user = auth.currentUser;
  const category = categorySelect.value || activeCategory || "General";

  if (!user) {
    alert("You need to be logged in.");
    return;
  }

  if (!text) return;

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
  const currentCategory = activeCategory || "General";

  let filtered = allNotes.filter(
    (n) => (n.category || "General") === currentCategory
  );

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

      const listCopy = allNotes.slice();
      const fromIndex = listCopy.findIndex((n) => n.id === dragSourceId);
      const toIndex = listCopy.findIndex((n) => n.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const [moved] = listCopy.splice(fromIndex, 1);
      listCopy.splice(toIndex, 0, moved);

      const batch = db.batch();
      const total = listCopy.length;
      listCopy.forEach((n, idx) => {
        const ref = db.collection("notes").doc(n.id);
        batch.update(ref, { order: total - idx });
      });
      await batch.commit();
    });

    wrapper.appendChild(main);
    wrapper.appendChild(delBtn);
    notesList.appendChild(wrapper);
  });

  if (userMetaLabel) {
    const total = allNotes.length;
    userMetaLabel.textContent =
      total === 1 ? "1 note total" : total + " notes total";
  }
}

// Search triggers rerender inside current folder
searchInput.addEventListener("input", renderNotes);

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
let activeTaskBucket = "today";
let dragTaskSourceId = null;

function renderTasks() {
  tasksList.innerHTML = "";

  const bucket = activeTaskBucket;

  let filtered = allTasks.filter(
    (t) => (t.bucket || "today") === bucket
  );

  // Sort by order then createdAt
  filtered.sort((a, b) => {
    const ao = a.order || 0;
    const bo = b.order || 0;
    if (ao !== bo) return bo - ao;
    const at = a.createdAt?.toMillis?.() || 0;
    const bt = b.createdAt?.toMillis?.() || 0;
    return bt - at;
  });

  if (filtered.length === 0) {
    tasksEmptyHint.style.display = "block";
  } else {
    tasksEmptyHint.style.display = "none";
  }

  filtered.forEach((task) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("task");
    wrapper.setAttribute("draggable", "true");
    wrapper.dataset.id = task.id;

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

    // Drag handlers
    wrapper.addEventListener("dragstart", () => {
      dragTaskSourceId = task.id;
      wrapper.classList.add("dragging");
    });

    wrapper.addEventListener("dragend", () => {
      wrapper.classList.remove("dragging");
      dragTaskSourceId = null;
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

      const targetId = task.id;
      if (!dragTaskSourceId || dragTaskSourceId === targetId) return;

      const listCopy = allTasks.filter(
        (t) => (t.bucket || "today") === bucket
      );

      const fromIndex = listCopy.findIndex(
        (t) => t.id === dragTaskSourceId
      );
      const toIndex = listCopy.findIndex((t) => t.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const [moved] = listCopy.splice(fromIndex, 1);
      listCopy.splice(toIndex, 0, moved);

      const batch = db.batch();
      const total = listCopy.length;
      listCopy.forEach((t, idx) => {
        const ref = db.collection("tasks").doc(t.id);
        batch.update(ref, { order: total - idx });
      });
      await batch.commit();
    });

    wrapper.appendChild(toggle);
    wrapper.appendChild(textEl);
    wrapper.appendChild(delBtn);
    tasksList.appendChild(wrapper);
  });
}

// Task subtabs
taskTabs.forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    const bucket = tabBtn.dataset.bucket;
    if (!bucket) return;

    activeTaskBucket = bucket;
    taskTabs.forEach((b) => b.classList.remove("active"));
    tabBtn.classList.add("active");

    // Keep the selector in sync
    taskBucketSelect.value = activeTaskBucket;

    renderTasks();
  });
});

// Add task
addTaskBtn.addEventListener("click", async () => {
  const text = taskInput.value.trim();
  const user = auth.currentUser;
  const bucket = taskBucketSelect.value || "today";

  if (!user) {
    alert("You need to be logged in.");
    return;
  }
  if (!text) return;

  const currentBucketTasks = allTasks.filter(
    (t) => (t.bucket || "today") === bucket
  );
  const maxOrder = currentBucketTasks.length
    ? Math.max(...currentBucketTasks.map((t) => t.order || 0))
    : 0;

  await db.collection("tasks").add({
    uid: user.uid,
    text,
    bucket,
    done: false,
    order: maxOrder + 1,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  taskInput.value = "";
});

// Subscribe to tasks
function subscribeToTasks(uid) {
  return db
    .collection("tasks")
    .where("uid", "==", uid)
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
