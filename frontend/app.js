/* ─────────────────────────────────────────────────────────
   God-Tier AI Agent  –  Frontend Logic  (v4.0)
   ───────────────────────────────────────────────────────── */

// ── Token: read from <meta> so it never lives in global scope ─────────────
// The Python server injects the real token when it serves index.html.
// For dev convenience we also fall back to a hardcoded default that matches
// the server's default (random token is printed to the terminal on startup).
function getToken() {
    const meta = document.querySelector('meta[name="api-token"]');
    if (meta && meta.content && meta.content !== "__M1_TOKEN_PLACEHOLDER__") {
        return meta.content;
    }
    // Read from sessionStorage if user manually set it (token shown in terminal)
    return sessionStorage.getItem("m1_token") || "change-me";
}

// ── DOM References ───────────────────────────────────────────────────────────
const chatInput     = document.getElementById("chat-input");
const sendBtn       = document.getElementById("send-btn");
const chatWindow    = document.getElementById("chat-window");
const fileInput     = document.getElementById("image-upload");
const imagePreview  = document.getElementById("image-preview");
const previewImg    = document.getElementById("preview-img");
const removeImgBtn  = document.getElementById("remove-img-btn");
const statusBadge   = document.getElementById("status-badge");
const statusText    = document.getElementById("status-text");
const modelTag      = document.getElementById("model-tag");
const newChatBtn    = document.getElementById("new-chat-btn");
const clearBtn      = document.getElementById("clear-btn");
const historyList   = document.getElementById("history-list");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebar       = document.getElementById("sidebar");
const charCount     = document.getElementById("char-count");

// ── State ────────────────────────────────────────────────────────────────────
let currentImageBase64 = null;
let currentFileBase64  = null;
let currentFileName    = null;
let currentSessionId   = generateSessionId();
let sessions           = {};   // sessionId → { label, messages[] }

// ── Marked.js config ─────────────────────────────────────────────────────────
if (window.marked) {
    marked.setOptions({
        breaks: true,
        gfm: true,
        // Sanitize: prevent XSS by not rendering <script> etc.
        // (marked v5+ has no built-in sanitize – we rely on CSP)
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateSessionId() {
    return "sess-" + Math.random().toString(36).slice(2, 11) + "-" + Date.now().toString(36);
}

function renderMarkdown(text) {
    let processed = text;
    // Handle unclosed <think> tag if generation was interrupted or still streaming
    if (processed.includes("<think>") && !processed.includes("</think>")) {
        processed += "</think>";
    }
    
    // Convert <think> blocks into collapsable HTML details tags
    processed = processed.replace(/<think>([\s\S]*?)<\/think>/gi, (match, thought) => {
        return `\n\n<details class="thought-box"><summary>🧠 Agent Reasoning</summary><div class="thought-content">\n\n${thought.trim()}\n\n</div></details>\n\n`;
    });

    if (window.marked) {
        try { return marked.parse(processed); }
        catch (_) { /* fall through */ }
    }
    // Fallback: escape HTML and preserve newlines
    return processed
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

// ── Status Polling ────────────────────────────────────────────────────────────
async function checkStatus() {
    try {
        const res = await fetch("http://127.0.0.1:8000/api/status", { cache: "no-store" });
        const data = await res.json();

        if (res.ok && data.model_ready) {
            setStatus("online", `✅ ${data.model} ready`);
            if (modelTag) modelTag.textContent = `Model: ${data.model}`;
        } else if (res.ok && !data.model_ready) {
            setStatus("warn", `⚠ Pull: ollama pull ${data.model || "llava"}`);
        } else {
            setStatus("offline", "❌ Server offline");
        }
    } catch {
        setStatus("offline", "❌ Backend not running");
    }
}

function setStatus(state, text) {
    statusBadge.className = `status-badge status-${state}`;
    statusText.textContent = text;
}

// ── File Upload ───────────────────────────────────────────────────────────────
fileInput.addEventListener("change", function () {
    if (!this.files || !this.files[0]) return;
    const file = this.files[0];

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
        showError("File too large (max 10 MB).");
        this.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        if (file.type.startsWith("image/")) {
            currentImageBase64 = e.target.result;
            previewImg.src = currentImageBase64;
            previewImg.style.display = "block";
        } else {
            // Keep full data URL if backend expects base64 decode from it, 
            // but our backend handles raw b64 strings natively.
            currentFileBase64 = e.target.result.split(',')[1] || e.target.result;
            currentFileName = file.name;
            previewImg.style.display = "none";
            
            let fileBadge = document.getElementById("file-badge");
            if (!fileBadge) {
                fileBadge = document.createElement("div");
                fileBadge.id = "file-badge";
                fileBadge.style.cssText = "padding: 6px 10px; font-size: 13px; color: var(--text-primary); border: 1px solid var(--border-mid); border-radius: var(--radius-sm); margin: 6px 0;";
                imagePreview.insertBefore(fileBadge, removeImgBtn);
            }
            fileBadge.textContent = "📄 " + file.name;
        }
        imagePreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
});

removeImgBtn.addEventListener("click", clearImage);

function clearImage() {
    currentImageBase64 = null;
    currentFileBase64 = null;
    currentFileName = null;
    fileInput.value = "";
    previewImg.src = "";
    imagePreview.classList.add("hidden");
    const fb = document.getElementById("file-badge");
    if (fb) fb.remove();
}

// ── Textarea auto-resize ──────────────────────────────────────────────────────
chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + "px";
    charCount.textContent = chatInput.value.length;
});

// ── Message Rendering ─────────────────────────────────────────────────────────
function appendMessage(sender, text, imageSrc = null, actionTag = null) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender === "ai" ? "ai-message" : "user-message");

    // Avatar
    const avatar = document.createElement("div");
    avatar.classList.add("avatar", sender === "ai" ? "ai-avatar" : "user-avatar");
    avatar.textContent = sender === "ai" ? "AI" : "YOU";

    // Content
    const content = document.createElement("div");
    content.classList.add("message-content");

    if (text) {
        if (sender === "ai") {
            // Render markdown for AI responses
            content.innerHTML = renderMarkdown(text);
        } else {
            // Plain text for user messages (XSS safe via innerText)
            const p = document.createElement("p");
            p.innerText = text;
            content.appendChild(p);
        }
    }

    // Attached image thumbnail
    if (imageSrc) {
        const img = document.createElement("img");
        img.src = imageSrc;
        img.alt = "Attached image";
        content.appendChild(img);
    }

    // Action badge
    if (actionTag && actionTag !== "chat" && actionTag !== "error") {
        const tag = document.createElement("div");
        tag.classList.add("action-tag");
        tag.textContent = `✅ ${actionTag.replace(/_/g, " ")}`;
        content.appendChild(tag);
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(content);
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    return msgDiv;
}

function showError(msg) {
    appendMessage("ai", `⚠️ **Error:** ${msg}`);
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function addTypingIndicator() {
    const wrap = document.createElement("div");
    wrap.classList.add("typing-indicator");
    wrap.id = "typing-indicator";

    // Avatar
    const av = document.createElement("div");
    av.classList.add("avatar", "ai-avatar");
    av.textContent = "AI";

    // Dots
    const dots = document.createElement("div");
    dots.classList.add("typing-dots");
    for (let i = 0; i < 3; i++) {
        const s = document.createElement("span");
        dots.appendChild(s);
    }

    wrap.appendChild(av);
    wrap.appendChild(dots);
    chatWindow.appendChild(wrap);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return wrap;
}

function removeTypingIndicator() {
    document.getElementById("typing-indicator")?.remove();
}

// ── Session Management ────────────────────────────────────────────────────────
function startNewSession(label = null) {
    currentSessionId = generateSessionId();
    const firstMsg = label || `Session ${Object.keys(sessions).length + 1}`;
    sessions[currentSessionId] = { label: firstMsg, messages: [] };
    renderSidebar();

    // Clear chat window, show welcome
    chatWindow.innerHTML = "";
    renderWelcome();
}

function renderSidebar() {
    historyList.innerHTML = "";
    Object.entries(sessions).reverse().forEach(([id, sess]) => {
        const li = document.createElement("li");
        li.classList.add("history-item");
        if (id === currentSessionId) li.classList.add("active");
        li.textContent = sess.label;
        li.dataset.id = id;
        li.addEventListener("click", () => switchSession(id));
        historyList.appendChild(li);
    });
}

function switchSession(id) {
    if (!sessions[id]) return;
    currentSessionId = id;

    // Re-render messages
    chatWindow.innerHTML = "";
    const msgs = sessions[id].messages;
    if (msgs.length === 0) {
        renderWelcome();
    } else {
        msgs.forEach(m => appendMessage(m.sender, m.text, m.img, m.action));
    }
    renderSidebar();
}

function saveMessageToSession(sender, text, img = null, action = null) {
    if (!sessions[currentSessionId]) {
        sessions[currentSessionId] = { label: text.slice(0, 30) || "Chat", messages: [] };
    }
    sessions[currentSessionId].messages.push({ sender, text, img, action });

    // Update session label from first user message
    const msgs = sessions[currentSessionId].messages;
    if (msgs.filter(m => m.sender === "user").length === 1 && sender === "user") {
        sessions[currentSessionId].label = text.slice(0, 36) || "New Chat";
        renderSidebar();
    }
}

function renderWelcome() {
    appendMessage(
        "ai",
        "Hello! I am your **God-Tier Local AI Agent**.\n\n" +
        "I can:\n" +
        "- 💬 Chat and answer any question\n" +
        "- 📄 **Create PDF documents** — just say *'create a PDF about X'*\n" +
        "- 🖼 **Analyse images** — attach a photo and ask me anything\n" +
        "- 💻 **Write code** — any language, any task\n\n" +
        "Everything runs **100% locally** on your machine. How can I help?"
    );
}

// ── Clear current session ────────────────────────────────────────────────────
clearBtn?.addEventListener("click", async () => {
    // Tell backend to forget history for this session
    try {
        await fetch(`http://127.0.0.1:8000/api/session/${currentSessionId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${getToken()}` }
        });
    } catch { /* ignore if offline */ }

    chatWindow.innerHTML = "";
    if (sessions[currentSessionId]) sessions[currentSessionId].messages = [];
    renderWelcome();
});

// ── Send Message ──────────────────────────────────────────────────────────────
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text && !currentImageBase64 && !currentFileBase64) return;

    const imgPayload = currentImageBase64;
    const fileB64Payload = currentFileBase64;
    const fileNamePayload = currentFileName;
    const txtPayload = text;

    // Show user message
    let displayTxt = txtPayload;
    if (fileNamePayload) displayTxt += `\n\n📄 _Attached: ${fileNamePayload}_`;
    appendMessage("user", displayTxt, imgPayload);
    saveMessageToSession("user", displayTxt, imgPayload);

    // Reset inputs
    chatInput.value = "";
    chatInput.style.height = "auto";
    charCount.textContent = "0";
    clearImage();
    sendBtn.disabled = true;

    // Show typing indicator
    addTypingIndicator();

    try {
        const res = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`,
            },
            body: JSON.stringify({
                message: txtPayload || `Analyse attached file.`,
                image_b64: imgPayload,
                file_b64: fileB64Payload,
                file_name: fileNamePayload,
                session_id: currentSessionId,
            }),
        });

        removeTypingIndicator();

        if (res.status === 429) {
            showError("Rate limited — too many requests. Wait a moment.");
        } else if (res.status === 403 || res.status === 401) {
            showError(
                "M1 Security: Invalid token.\n\n" +
                "Check the terminal for the correct token and set it with:\n" +
                "```js\nsessionStorage.setItem('m1_token', 'YOUR_TOKEN_HERE')\n```"
            );
        } else if (!res.ok) {
            showError(`Server error ${res.status}. Check the Python terminal.`);
        } else {
            const data = await res.json();
            const aiText = data.response || "No response received.";
            const action = data.action_taken;

            // Update session_id from server (it creates one if none was sent)
            if (data.session_id) currentSessionId = data.session_id;

            appendMessage("ai", aiText, null, action);
            saveMessageToSession("ai", aiText, null, action);
        }
    } catch (err) {
        removeTypingIndicator();
        showError(
            "**Connection failed.** Is the Python backend running?\n\n" +
            "Start it with:\n```bash\npython ai.py\n```\n\n" +
            `_Details: ${err.message}_`
        );
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// ── Event Listeners ───────────────────────────────────────────────────────────
sendBtn.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

newChatBtn.addEventListener("click", () => startNewSession());

sidebarToggle?.addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

// Close sidebar on outside tap (mobile)
document.addEventListener("click", (e) => {
    if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        e.target !== sidebarToggle
    ) {
        sidebar.classList.remove("open");
    }
});

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
    // Create first session entry
    sessions[currentSessionId] = { label: "Session 1", messages: [] };
    renderSidebar();
    renderWelcome();
    checkStatus();

    // Re-check status every 30 s
    setInterval(checkStatus, 30_000);

    // Focus input
    chatInput.focus();
})();
