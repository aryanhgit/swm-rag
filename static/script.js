const API_URL = "http://localhost:5000/query";
const input = document.getElementById("question");
const submitBtn = document.getElementById("submit");
const output = document.getElementById("output");
const suggestionsEl = document.getElementById("suggestions");
const historyListEl = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const overlay = document.getElementById("overlay");

const SAMPLE_QUESTIONS = [
    "What are the key provisions of the SWM Rules, 2016?",
    "What changed in the 2026 update to the SWM Rules?",
    "How does Bengaluru classify and segregate waste at the source?",
    "What are the ambient air quality standards near waste processing units?",
    "What is the minimum buffer zone required around a waste disposal facility?",
    "Which industries can use Refuse Derived Fuel (RDF) as an energy source?",
    "What noise standards apply to waste processing facilities?",
    "How should market waste like rotten fruits and vegetables be handled?"
];

const HISTORY_KEY = "wasteRagHistory";
let activeHistoryId = null;

function renderSuggestions() {
    suggestionsEl.innerHTML = SAMPLE_QUESTIONS
        .map(q => `<button class="suggestion-chip">${escapeHtml(q)}</button>`)
        .join("");

    suggestionsEl.querySelectorAll(".suggestion-chip").forEach((chip, i) => {
        chip.addEventListener("click", () => {
            input.value = SAMPLE_QUESTIONS[i];
            ask();
        });
    });
}

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveHistory(items) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

function addToHistory(question, answer, sources) {
    const items = loadHistory();
    const entry = {
        id: Date.now().toString(),
        question,
        answer,
        sources,
        timestamp: new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };
    items.unshift(entry);
    saveHistory(items.slice(0, 25));
    activeHistoryId = entry.id;
    renderHistory();
}

function renderHistory() {
    const items = loadHistory();
    if (!items.length) {
        historyListEl.innerHTML = '<p class="history-empty">Your past questions will appear here.</p>';
        return;
    }
    historyListEl.innerHTML = items.map(item => `
      <button class="history-item ${item.id === activeHistoryId ? "active" : ""}" data-id="${item.id}">
        <div class="q">${escapeHtml(item.question)}</div>
        <div class="t">${item.timestamp}</div>
      </button>
    `).join("");

    historyListEl.querySelectorAll(".history-item").forEach(el => {
        el.addEventListener("click", () => {
            const id = el.dataset.id;
            const item = loadHistory().find(h => h.id === id);
            if (!item) return;
            activeHistoryId = id;
            input.value = item.question;
            renderAnswer({ answer: item.answer, sources: item.sources });
            renderHistory();
            closeSidebarOnMobile();
        });
    });
}

function closeSidebarOnMobile() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
}

clearHistoryBtn.addEventListener("click", () => {
    saveHistory([]);
    activeHistoryId = null;
    renderHistory();
});

sidebarToggle.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("open");
});

overlay.addEventListener("click", closeSidebarOnMobile);

function initChart() {
    const ctx = document.getElementById("wasteChart");
    new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Processed", "Unprocessed"],
            datasets: [{
                data: [79, 21],
                backgroundColor: ["#0071e3", "#e5e5ea"],
                borderWidth: 0
            }]
        },
        options: {
            cutout: "72%",
            plugins: { legend: { display: false } },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

async function ask() {
    const question = input.value.trim();
    if (!question) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>';
    output.innerHTML = '<p class="state">Searching documents…</p>';
    suggestionsEl.style.display = "none";
    activeHistoryId = null;

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Request failed (${res.status})`);
        }

        const data = await res.json();
        renderAnswer(data);
        addToHistory(question, data.answer, data.sources);
    } catch (err) {
        output.innerHTML = `<div class="result visible"><div class="error-card">${escapeHtml(err.message)}. Make sure the Flask server is running on port 5000.</div></div>`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Ask";
    }
}

function renderAnswer(data) {
    const sourcesHtml = (data.sources || [])
        .map(s => `<span class="source-chip">${escapeHtml(s.document)} · p.${s.page}</span>`)
        .join("");

    output.innerHTML = `
      <div class="result">
        <div class="answer-card">
          <div class="answer-text">${renderMarkdown(data.answer)}</div>
          ${sourcesHtml ? `<div class="sources">${sourcesHtml}</div>` : ""}
        </div>
      </div>
    `;
    requestAnimationFrame(() => {
        output.querySelector(".result").classList.add("visible");
    });
}

function renderMarkdown(text) {
    const lines = escapeHtml(text).split("\n");
    let html = "";
    let inList = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        const isBullet = /^[\*\-]\s+/.test(line);

        if (isBullet) {
            if (!inList) { html += "<ul>"; inList = true; }
            html += `<li>${inlineMarkdown(line.replace(/^[\*\-]\s+/, ""))}</li>`;
            continue;
        }

        if (inList) { html += "</ul>"; inList = false; }
        if (line) html += `<p>${inlineMarkdown(line)}</p>`;
    }

    if (inList) html += "</ul>";
    return html;
}

function inlineMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

submitBtn.addEventListener("click", ask);
input.addEventListener("keydown", e => {
    if (e.key === "Enter") ask();
});

renderSuggestions();
renderHistory();
initChart();