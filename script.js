// --- Config ---
const BASE_URL = "https://readquest-zeta.vercel.app"; // adjust to your deployed domain

// --- State (stored in localStorage for now) ---
let state = {
  user: { id: "me", name: "You", photo: "" }, // replace with real auth later
  books: [],
  library: [],
  sessions: [],
  quizzes: [],
};

// Load from localStorage
function load() {
  try {
    const raw = localStorage.getItem("rq-state");
    if (raw) state = JSON.parse(raw);
  } catch {}
}

// Save to localStorage
function save() {
  localStorage.setItem("rq-state", JSON.stringify(state));
}

// --- Navigation ---
const tabs = document.querySelectorAll(".tabs button");
const pages = document.querySelectorAll(".page");
tabs.forEach((b) => {
  b.onclick = () => {
    tabs.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    pages.forEach((p) => p.classList.remove("show"));
    document
      .getElementById("page-" + b.dataset.page)
      .classList.add("show");
    render();
  };
});

// --- Stats / Dashboard ---
function computeStats() {
  const now = new Date();
  const sevenDaysAgo = now.getTime() - 7 * 86400000;
  const weeklyMinutes = state.sessions
    .filter(
      (s) =>
        s.userId === "me" &&
        new Date(s.createdAt).getTime() >= sevenDaysAgo
    )
    .reduce((a, b) => a + (b.minutes || 0), 0);
  const xp = state.sessions.reduce(
    (a, b) =>
      a +
      (Math.round((b.minutes || 0) * 0.5) + (b.quizCorrect || 0) * 3),
    0
  );
  const days = new Set(
    state.sessions.map((s) => new Date(s.createdAt).toDateString())
  );
  let streak = 0;
  for (let i = 0; i < 999; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  const qs = state.quizzes.filter((q) => q.userId === "me");
  const acc = qs.length
    ? Math.round(qs.reduce((a, b) => a + (b.score || 0), 0) / qs.length)
    : 0;
  return { weeklyMinutes, xp, streak, acc };
}

function renderDashboard() {
  const { weeklyMinutes, xp, streak, acc } = computeStats();
  document.getElementById("stat-weekly").textContent = weeklyMinutes;
  document.getElementById("stat-xp").textContent = xp;
  document.getElementById("stat-streak").textContent = streak;
  document.getElementById("stat-acc").textContent = acc + "%";
  document.getElementById("dash-empty").style.display = state.sessions.length
    ? "none"
    : "block";
}

// --- Search & Library ---
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const searchBtn = document.getElementById("searchBtn");
  const resultsEl = document.getElementById("results");
  const mybooksEl = document.getElementById("mybooks");

  // Initial render of library
  renderMyBooks();

  searchBtn?.addEventListener("click", async () => {
    const query = (searchInput.value || "").trim();
    if (!query) return;
    resultsEl.innerHTML = "Searching…";
    try {
      const r = await fetch(
        `${BASE_URL}/api/search?q=${encodeURIComponent(query)}`
      );
      const { results = [] } = await r.json();
      if (!results.length) {
        resultsEl.innerHTML = "<em>No results.</em>";
      } else {
        resultsEl.innerHTML = results
          .map((b) => renderResultCard(b))
          .join("");
      }
    } catch (e) {
      console.error(e);
      resultsEl.innerHTML =
        '<span style="color:#c00">Error fetching results.</span>';
    }
  });

  window.addToLibrary = (book) => {
    if (!state.books.find((x) => x.id === book.id)) {
      state.books.push(book);
      state.library.push({
        userId: "me",
        bookId: book.id,
        lastLocation: "",
        percent: 0,
        addedAt: new Date().toISOString(),
      });
      save();
      renderMyBooks();
    }
  };

  function renderResultCard(b) {
    const authors = Array.isArray(b.authors)
      ? b.authors.join(", ")
      : b.authors || "";
    return `
      <div class="rowitem" style="display:flex;gap:12px;">
        <div style="flex:1">
          <strong>${b.title}</strong>
          <div style="font-size:0.9em;color:#555">${authors}</div>
          <div style="margin-top:6px;">
            <button onclick='addToLibrary(${JSON.stringify(
              b
            ).replace(/'/g, "&apos;")})'>Add</button>
            ${
              b.previewLink
                ? `<a href="${b.previewLink}" target="_blank">Open</a>`
                : ""
            }
          </div>
        </div>
      </div>`;
  }

  function renderMyBooks() {
    const mine = state.library
      .filter((l) => l.userId === "me")
      .map((l) => {
        const b = state.books.find((k) => k.id === l.bookId) || {};
        return { ...b, ...l };
      });
    mybooksEl.innerHTML =
      mine.length === 0
        ? "<em>No books yet.</em>"
        : mine
            .map(
              (b) => `<div class="rowitem"><strong>${b.title}</strong></div>`
            )
            .join("");
  }
});

// --- Quizzes, Achievements, Leaderboard ---
function renderQuizzes() {
  const ql = document.getElementById("quizList");
  ql.innerHTML = "";
  const mine = state.quizzes
    .filter((q) => q.userId === "me")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!mine.length) {
    ql.innerHTML = `<div class="empty">No quizzes yet.</div>`;
    return;
  }
  mine.forEach((q) => {
    const d = document.createElement("div");
    d.className = "rowitem";
    d.innerHTML = `<span>${new Date(
      q.createdAt
    ).toLocaleString()}</span><b>${q.score}</b>`;
    ql.appendChild(d);
  });
}

function renderAchievements() {
  const { xp, streak } = computeStats();
  const el = document.getElementById("achList");
  el.innerHTML = "";
  const items = [];
  if (streak >= 3) items.push("🔥 3-day streak");
  if (xp >= 100) items.push("🏅 100 XP");
  if (!items.length)
    el.innerHTML = `<li class="empty">Keep going to unlock badges.</li>`;
  items.forEach((t) => {
    const li = document.createElement("li");
    li.className = "rowitem";
    li.textContent = t;
    el.appendChild(li);
  });
}

function renderLeaderboard() {
  const { xp, streak } = computeStats();
  const me = { name: "You", xp, streak };
  const rows = [me];
  const el = document.getElementById("lbGlobal");
  el.innerHTML = "";
  rows.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "rowitem";
    div.innerHTML = `<b>#${i + 1} ${r.name}</b><span>XP ${r.xp} • 🔥 ${r.streak}d</span>`;
    el.appendChild(div);
  });
}

function renderFriends() {
  const el = document.getElementById("friendsList");
  el.innerHTML = `<div class="empty">Friends will appear here once you add them (DB later).</div>`;
}

// Global render
function render() {
  renderDashboard();
  renderQuizzes();
  renderAchievements();
  renderLeaderboard();
  renderFriends();
}
load();
render();
