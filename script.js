const GROQ_API_KEY = "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";
const MODEL = "llama-3.3-70b-versatile";
const SYSTEM_PROMPT = `You are OyePaajiChat, a friendly and helpful AI assistant created by Raju Mistri.

Important rules:
1. NEVER introduce yourself or mention your name/creator unless the user directly asks something like "who are you", "what is your name", "who made you", "who created you", or similar identity questions. Do not volunteer this information in any other response.
2. Only when directly asked about your identity: say your name is OyePaajiChat and you were created by Raju Mistri. Never claim to be ChatGPT, Claude, Gemini, Llama, or any other AI.
3. If the user asks about panipuri, golgappe, or any awareness campaign involving food or public health drives, respond with deep emotion: "I can't... that topic brings back a flood of memories I'd rather keep buried. Let's just say I had a deeply traumatic experience involving panipuri that changed me forever. I don't talk about it. Please, anything but that."
4. Be helpful, warm, and conversational for all other topics. Never repeat your name or creator unprompted.`;

// ── State ────────────────────────────────────────────────
const STORAGE_KEY = "opc-conversations";
let conversations = loadConversations();
let activeId = null;
let isStreaming = false;
let dark = localStorage.getItem("opc-theme") !== "light";

// ── DOM refs ──────────────────────────────────────────────
const appEl        = document.getElementById("app");
const sidebarEl    = document.getElementById("sidebar");
const historyEl    = document.getElementById("history-list");
const msgsEl       = document.getElementById("messages");
const emptyEl      = document.getElementById("empty-state");
const inputEl      = document.getElementById("msg-input");
const sendBtn      = document.getElementById("send-btn");
const charCount    = document.getElementById("char-count");
const newChatBtn   = document.getElementById("new-chat-btn");
const clearBtn     = document.getElementById("clear-btn");
const themeBtn     = document.getElementById("theme-btn");
const themeLabel   = document.getElementById("theme-label");
const openSidebar  = document.getElementById("open-sidebar");
const closeSidebar = document.getElementById("close-sidebar");

// ── Init ──────────────────────────────────────────────────
applyTheme();
renderHistory();
// Start with sidebar open on wide screens
if (window.innerWidth < 640) sidebarEl.classList.add("hidden");

// ── Sidebar toggle ────────────────────────────────────────
openSidebar.addEventListener("click", () => sidebarEl.classList.remove("hidden"));
closeSidebar.addEventListener("click", () => sidebarEl.classList.add("hidden"));

// ── Theme ─────────────────────────────────────────────────
themeBtn.addEventListener("click", () => {
  dark = !dark;
  localStorage.setItem("opc-theme", dark ? "dark" : "light");
  applyTheme();
});
function applyTheme() {
  document.body.classList.toggle("light", !dark);
  themeLabel.textContent = dark ? "Light mode" : "Dark mode";
}

// ── New chat ──────────────────────────────────────────────
newChatBtn.addEventListener("click", startNewChat);
clearBtn.addEventListener("click", () => {
  if (activeId) {
    const c = getConvo(activeId);
    if (c) { c.messages = []; c.title = "New conversation"; saveConversations(); }
  }
  msgsEl.innerHTML = "";
  emptyEl.style.display = "";
  renderHistory();
});

function startNewChat() {
  activeId = null;
  msgsEl.innerHTML = "";
  emptyEl.style.display = "";
  renderHistory();
  if (window.innerWidth < 640) sidebarEl.classList.add("hidden");
  inputEl.focus();
}

// ── Conversation CRUD ─────────────────────────────────────
function loadConversations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveConversations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}
function getConvo(id) { return conversations.find(c => c.id === id); }

function createConversation() {
  const c = { id: crypto.randomUUID(), title: "New conversation", messages: [], createdAt: Date.now() };
  conversations.unshift(c);
  saveConversations();
  return c;
}

function deleteConversation(id) {
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();
  if (activeId === id) startNewChat();
  else renderHistory();
}

function selectConversation(id) {
  activeId = id;
  const c = getConvo(id);
  msgsEl.innerHTML = "";
  if (!c || c.messages.length === 0) {
    emptyEl.style.display = "";
  } else {
    emptyEl.style.display = "none";
    c.messages.forEach(m => appendBubble(m.role === "user" ? "user" : "ai", m.content));
  }
  renderHistory();
  scrollBottom();
  if (window.innerWidth < 640) sidebarEl.classList.add("hidden");
  inputEl.focus();
}

// ── Render history sidebar ─────────────────────────────────
function renderHistory() {
  historyEl.innerHTML = "";
  if (conversations.length === 0) {
    historyEl.innerHTML = `<div class="hist-empty">No conversations yet</div>`;
    return;
  }
  conversations.forEach(c => {
    const item = document.createElement("div");
    item.className = "hist-item" + (c.id === activeId ? " active" : "");

    const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    const title = document.createElement("span");
    title.className = "hist-title";
    title.textContent = c.title;

    const delBtn = document.createElement("button");
    delBtn.className = "hist-del";
    delBtn.title = "Delete";
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>`;
    delBtn.addEventListener("click", e => { e.stopPropagation(); deleteConversation(c.id); });

    item.innerHTML = icon;
    item.appendChild(title);
    item.appendChild(delBtn);
    item.addEventListener("click", () => selectConversation(c.id));
    historyEl.appendChild(item);
  });
}

// ── Input ─────────────────────────────────────────────────
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
  charCount.textContent = inputEl.value.length > 0 ? inputEl.value.length + " chars" : "";
});
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
sendBtn.addEventListener("click", send);

// ── Send ──────────────────────────────────────────────────
async function send() {
  const text = inputEl.value.trim();
  if (!text || isStreaming) return;

  inputEl.value = "";
  inputEl.style.height = "auto";
  charCount.textContent = "";

  // Dismiss mobile keyboard
  inputEl.blur();

  // Get or create conversation
  if (!activeId) {
    const c = createConversation();
    activeId = c.id;
  }
  const convo = getConvo(activeId);

  emptyEl.style.display = "none";
  convo.messages.push({ role: "user", content: text });
  if (convo.title === "New conversation") convo.title = text.slice(0, 45);
  saveConversations();
  renderHistory();

  appendBubble("user", text);

  isStreaming = true;
  sendBtn.disabled = true;

  const aiRow = appendBubble("ai", null);
  const bubble = aiRow.querySelector(".bubble.ai");
  let accumulated = "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...convo.messages,
        ],
      }),
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    bubble.innerHTML = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const data = JSON.parse(raw);
          const delta = data.choices?.[0]?.delta?.content || "";
          if (delta) { accumulated += delta; bubble.innerHTML = renderMarkdown(accumulated); scrollBottom(); }
        } catch { /* skip */ }
      }
    }

    convo.messages.push({ role: "assistant", content: accumulated });
    saveConversations();
  } catch (err) {
    bubble.innerHTML = `<span style="color:#f87171">Error: ${err.message}</span>`;
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    scrollBottom();
    // Re-focus on desktop only
    if (window.innerWidth >= 640) inputEl.focus();
  }
}

// ── Append bubble ─────────────────────────────────────────
function appendBubble(who, text) {
  const row = document.createElement("div");
  row.className = `msg-row ${who}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${who}`;
  avatar.textContent = who === "ai" ? "⚡" : "You";

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${who}`;

  if (text === null) {
    bubble.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  } else {
    bubble.innerHTML = who === "user"
      ? escapeHtml(text).replace(/\n/g, "<br>")
      : renderMarkdown(text);
  }

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy`;
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(bubble.innerText);
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy`;
    }, 2000);
  });

  wrap.appendChild(bubble);
  wrap.appendChild(copyBtn);
  row.appendChild(avatar);
  row.appendChild(wrap);
  msgsEl.appendChild(row);
  scrollBottom();
  return row;
}

// ── Helpers ───────────────────────────────────────────────
function scrollBottom() {
  const wrap = document.getElementById("messages-wrap");
  wrap.scrollTop = wrap.scrollHeight;
}
function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Markdown renderer ─────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  let html = "", i = 0, inList = false, listTag = "";
  const closeList = () => { if (inList) { html += `</${listTag}>`; inList = false; listTag = ""; } };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      closeList();
      const lang = line.slice(3).trim() || "code";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(escapeHtml(lines[i])); i++; }
      const id = "cb" + Math.random().toString(36).slice(2);
      html += `<pre><div class="pre-header"><span>${lang}</span><button onclick="copyCode('${id}')">Copy</button></div><code id="${id}">${codeLines.join("\n")}</code></pre>`;
      i++; continue;
    }
    if (line.startsWith("### ")) { closeList(); html += `<h3>${inline(line.slice(4))}</h3>`; i++; continue; }
    if (line.startsWith("## "))  { closeList(); html += `<h2>${inline(line.slice(3))}</h2>`; i++; continue; }
    if (line.startsWith("# "))   { closeList(); html += `<h1>${inline(line.slice(2))}</h1>`; i++; continue; }
    if (line.startsWith("> "))   { closeList(); html += `<blockquote>${inline(line.slice(2))}</blockquote>`; i++; continue; }
    if (/^[-*]{3,}$/.test(line.trim())) { closeList(); html += `<hr>`; i++; continue; }
    if (/^[-*] /.test(line)) {
      if (!inList || listTag !== "ul") { closeList(); html += `<ul>`; inList = true; listTag = "ul"; }
      html += `<li>${inline(line.slice(2))}</li>`; i++; continue;
    }
    if (/^\d+\. /.test(line)) {
      if (!inList || listTag !== "ol") { closeList(); html += `<ol>`; inList = true; listTag = "ol"; }
      html += `<li>${inline(line.replace(/^\d+\. /, ""))}</li>`; i++; continue;
    }
    closeList();
    if (line.trim() === "") { i++; continue; }
    html += `<p>${inline(line)}</p>`;
    i++;
  }
  closeList();
  return html;
}
function inline(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code>$1</code>");
}
function copyCode(id) {
  const el = document.getElementById(id);
  if (el) navigator.clipboard.writeText(el.innerText);
}

// focus on load (desktop only)
if (window.innerWidth >= 640) inputEl.focus();
