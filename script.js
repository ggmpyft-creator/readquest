// --- Config ---
const BASE_URL = ""; // after deploy on Vercel, set to 'https://YOUR-APP.vercel.app'

// --- State (localStorage for now; you can swap to DB later) ---
let state = {
  user: { id: "me", name: "You", photo: "" }, // replace with real auth later
  books: [],      // master book catalog user added (subset of Google Books results or uploads)
  library: [],    // user ↔ book linkage {bookId, lastLocation, percent}
  sessions: [],   // reading sessions
  quizzes: [],    // quiz results
};

// Load/Save
function load() {
  try {
    const raw = localStorage.getItem("rq-state");
    if (raw) state = JSON.parse(raw);
  } catch {}
}
function save() { localStorage.setItem("rq-state", JSON.stringify(state)); }

// --- UI Navigation ---
const tabs = document.querySelectorAll(".tabs button");
const pages = document.querySelectorAll(".page");
tabs.forEach(b=>{
  b.onclick = () => {
    tabs.forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    pages.forEach(p=>p.classList.remove("show"));
    document.getElementById("page-"+b.dataset.page).classList.add("show");
    render();
  };
});

// --- Dashboard ---
function computeStats() {
  const now = new Date();
  const sevenDaysAgo = now.getTime() - 7*86400000;
  const weeklyMinutes = state.sessions.filter(s => s.userId==="me" && new Date(s.createdAt).getTime()>=sevenDaysAgo)
                                      .reduce((a,b)=>a+(b.minutes||0),0);
  const xp = state.sessions.reduce((a,b)=>a + (Math.round((b.minutes||0)*0.5) + (b.quizCorrect||0)*3), 0);
  // streak: count consecutive days with >=1 session
  const days = new Set(state.sessions.map(s => new Date(s.createdAt).toDateString()));
  let streak=0; for(let i=0;i<999;i++){ const d=new Date(); d.setDate(d.getDate()-i); if(days.has(d.toDateString())) streak++; else break; }
  // quiz accuracy
  const qs = state.quizzes.filter(q=>q.userId==="me");
  const acc = qs.length? Math.round(qs.reduce((a,b)=>a+(b.score||0),0)/qs.length) : 0;
  return { weeklyMinutes, xp, streak, acc };
}
function renderDashboard(){
  const {weeklyMinutes,xp,streak,acc} = computeStats();
  document.getElementById("stat-weekly").textContent = weeklyMinutes;
  document.getElementById("stat-xp").textContent = xp;
  document.getElementById("stat-streak").textContent = streak;
  document.getElementById("stat-acc").textContent = acc+"%";
  document.getElementById("dash-empty").style.display = state.sessions.length? "none":"block";
}

// --- Library (search + my books) ---
const searchInput = document.getElementById("searchInput");
document.getElementById("searchBtn").onclick = async () => {
  const q = searchInput.value.trim();
  if (!q) return;
  const results = await searchBooks(q);
  renderResults(results);
};

async function searchBooks(query){
  // TODO: after deploy, set BASE_URL and this will call /api/search
  try {
    const r = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    const j = await r.json();
    return j.results || [];
  } catch (e) {
    alert("Search API not connected yet. Deploy first, then set BASE_URL.");
    return [];
  }
}

function renderResults(items){
  const el = document.getElementById("searchResults");
  el.innerHTML = "";
  items.forEach(b=>{
    const d = document.createElement("div");
    d.className="tile";
    d.innerHTML = `
      <img src="${b.thumbnail||''}" alt="cover"/>
      <div><b>${b.title}</b></div>
      <div>${(b.authors||[]).join(", ")}</div>
      <div class="row">
        <button class="add">Add</button>
        <button class="open">Open</button>
      </div>`;
    d.querySelector(".add").onclick = ()=> addToLibrary(b);
    d.querySelector(".open").onclick = ()=> openBook(b);
    el.appendChild(d);
  });
}

function addToLibrary(book){
  // add to catalog if new
  if (!state.books.find(x=>x.id===book.id)) state.books.push(book);
  // link to user library
  if (!state.library.find(x=>x.userId==="me" && x.bookId===book.id)){
    state.library.push({ userId:"me", bookId:book.id, lastLocation:"", percent:0, addedAt:new Date().toISOString() });
  }
  save(); renderMyLibrary();
}

function renderMyLibrary(){
  const el = document.getElementById("myLibrary");
  el.innerHTML = "";
  const my = state.library.filter(x=>x.userId==="me").map(l=>{
    const b = state.books.find(k=>k.id===l.bookId) || {};
    return { ...b, ...l };
  });
  my.forEach(b=>{
    const d = document.createElement("div");
    d.className = "tile";
    d.innerHTML = `
      <img src="${b.thumbnail||''}" alt="cover"/>
      <div><b>${b.title||'Untitled'}</b></div>
      <div>${(b.authors||[]).join(", ")}</div>
      <div class="row">
        <button class="open">Open</button>
        <button class="remove">Remove</button>
      </div>`;
    d.querySelector(".open").onclick = ()=> openBook(b);
    d.querySelector(".remove").onclick = ()=>{
      state.library = state.library.filter(x=>!(x.userId==="me" && x.bookId===b.id));
      save(); renderMyLibrary();
    };
    el.appendChild(d);
  });
}

// --- Reader modal and sessions ---
const modal = document.getElementById("readerModal");
const frame = document.getElementById("readerFrame");
const startBtn = document.getElementById("startSessionBtn");
const endBtn = document.getElementById("endSessionBtn");
document.getElementById("closeReader").onclick = ()=>{ modal.classList.remove("show"); };

let session = null;
let currentBook = null;

function buildReaderURL(book){
  if (book.type === "google") return `gb.html?id=${encodeURIComponent(book.googleId)}`;
  if (book.type === "epub")   return `epub.html?file=${encodeURIComponent(book.fileUri||'')}&cfi=${encodeURIComponent(book.cfi||'')}`;
  if (book.type === "pdf")    return `pdf.html?file=${encodeURIComponent(book.fileUri||'')}&page=${encodeURIComponent(book.page||1)}`;
  return "#";
}

function openBook(book){
  currentBook = book;
  frame.src = buildReaderURL(book);
  modal.classList.add("show");
  startBtn.disabled = false;
  endBtn.disabled = true;
}

startBtn.onclick = ()=>{
  if (!currentBook) return;
  session = {
    sessionId: crypto.randomUUID(),
    userId: "me",
    bookId: currentBook.id,
    fromLoc: currentBook.cfi || currentBook.page || "",
    toLoc: "",
    minutes: 0,
    createdAt: new Date().toISOString(),
    quizCorrect: 0
  };
  startBtn.disabled = true;
  endBtn.disabled = false;
};

endBtn.onclick = ()=>{
  if (!session) return;
  session.toLoc = ""; // optional: capture from reader via callback
  const started = new Date(session.createdAt).getTime();
  session.minutes = Math.max(1, Math.round((Date.now()-started)/60000));
  state.sessions.push(session);
  save();
  modal.classList.remove("show");
  session = null;
  render();
  // prompt to generate quiz
  if (confirm("Generate a quiz from this session?")) {
    generateQuizFlow(currentBook);
  }
};

// --- Quizzes ---
async function generateQuizFlow(book){
  // For demo: get some text input
  const text = prompt("Paste a paragraph from what you read (for quiz):");
  if (!text) return;
  const questions = await generateQuizForSession(text, 4);
  const correctIdx = questions[0]?.answerIndex ?? 0;

  // simple “take quiz” for 1 question
  const choice = prompt(`Q: ${questions[0]?.question}\nA) ${questions[0]?.choices?.[0]}\nB) ${questions[0]?.choices?.[1]}\nC) ${questions[0]?.choices?.[2]}\nD) ${questions[0]?.choices?.[3]}\nType A/B/C/D`);
  const map = {A:0,B:1,C:2,D:3};
  const score = (map[(choice||"").toUpperCase()]===correctIdx)? 100: 0;

  state.quizzes.push({
    id: crypto.randomUUID(),
    userId: "me",
    bookId: book.id,
    sessionId: state.sessions[state.sessions.length-1]?.sessionId || null,
    score,
    createdAt: new Date().toISOString()
  });
  save(); render();
  alert(`Score: ${score}. Explanation: ${questions[0]?.explanation||'—'}`);
}

async function generateQuizForSession(text, n=4){
  // TODO: after deploy, set BASE_URL and this will call /api/quiz
  try {
    const r = await fetch(`${BASE_URL}/api/quiz`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text, n })
    });
    const j = await r.json();
    return j.questions || [];
  } catch(e){
    alert("Quiz API not connected yet. Deploy first, then set OPENAI key & BASE_URL.");
    // return 1 dummy structure so the flow doesn't crash during local testing
    return [{
      question:"(Placeholder) Which option is correct?",
      choices:["A","B","C","D"],
      answerIndex:0,
      explanation:"Replace with OpenAI webhook."
    }];
  }
}

// --- Leaderboard / Friends (local only; move to DB later) ---
function renderLeaderboard(){
  // rank by XP desc, then streak desc
  const {xp,streak} = computeStats();
  const me = { name: "You", xp, streak };
  const rows = [me]; // extend with real users later
  const el = document.getElementById("lbGlobal"); el.innerHTML="";
  rows.forEach((r,i)=>{
    const div = document.createElement("div");
    div.className="rowitem";
    div.innerHTML = `<b>#${i+1} ${r.name}</b><span>XP ${r.xp} • 🔥 ${r.streak}d</span>`;
    el.appendChild(div);
  });
}

function renderQuizzes(){
  const el = document.getElementById("quizList"); el.innerHTML="";
  const mine = state.quizzes.filter(q=>q.userId==="me").sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  if (!mine.length){ el.innerHTML = `<div class="empty">No quizzes yet.</div>`; return; }
  mine.forEach(q=>{
    const d = document.createElement("div");
    d.className="rowitem";
    d.innerHTML = `<span>${new Date(q.createdAt).toLocaleString()}</span><b>${q.score}</b>`;
    el.appendChild(d);
  });
}

function renderAchievements(){
  const {xp,streak} = computeStats();
  const el = document.getElementById("achList"); el.innerHTML="";
  const items = [];
  if (streak>=3) items.push("🔥 3-day streak");
  if (xp>=100)  items.push("🏅 100 XP");
  if (!items.length) el.innerHTML = `<li class="empty">Keep going to unlock badges.</li>`;
  items.forEach(t=>{ const li=document.createElement("li"); li.className="rowitem"; li.textContent=t; el.appendChild(li); });
}

function renderFriends(){
  const el = document.getElementById("friendsList"); el.innerHTML="";
  el.innerHTML = `<div class="empty">Friends will appear here once you add them (DB later).</div>`;
}

// --- Master render & boot ---
function render(){
  renderDashboard();
  renderMyLibrary();
  renderQuizzes();
  renderAchievements();
  renderLeaderboard();
}
load(); render();
