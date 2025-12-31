/*
  Важно про запуск:
  - Если открыть index.html как file://..., fetch('/questions/...') может не работать (зависит от браузера).
  - Запускайте через локальный сервер:
      python3 -m http.server 5173
    или
      npx http-server -p 5173
  - Потом откройте: http://localhost:5173
*/

const RESULTS_KEY = "quiz_results_v1";
const MAX_RESULTS = 50;

const screens = {
    start: document.getElementById("screenStart"),
    quiz: document.getElementById("screenQuiz"),
    result: document.getElementById("screenResult"),
    leaderboard: document.getElementById("screenLeaderboard"),
};

const ui = {
    // nav
    navStart: document.getElementById("navStart"),
    navLeaderboard: document.getElementById("navLeaderboard"),

    // start
    playerName: document.getElementById("playerName"),
    topicSelect: document.getElementById("topicSelect"),
    questionCount: document.getElementById("questionCount"),
    btnStart: document.getElementById("btnStart"),
    btnStartLeaderboard: document.getElementById("btnStartLeaderboard"),
    startError: document.getElementById("startError"),
    startHint: document.getElementById("startHint"),

    // quiz
    quizTitle: document.getElementById("quizTitle"),
    quizProgress: document.getElementById("quizProgress"),
    questionText: document.getElementById("questionText"),
    optionsList: document.getElementById("optionsList"),
    btnNext: document.getElementById("btnNext"),
    btnQuit: document.getElementById("btnQuit"),
    quizError: document.getElementById("quizError"),

    // result
    resultSummary: document.getElementById("resultSummary"),
    resultBreakdown: document.getElementById("resultBreakdown"),
    btnPlayAgain: document.getElementById("btnPlayAgain"),
    btnToLeaderboard: document.getElementById("btnToLeaderboard"),

    // leaderboard
    leaderRows: document.getElementById("leaderRows"),
    leaderEmpty: document.getElementById("leaderEmpty"),
    btnClear: document.getElementById("btnClear"),
    leaderTopicFilter: document.getElementById("leaderTopicFilter"),
};

const state = {
    topics: [],
    topicPack: null,
    currentIndex: 0,
    // answers: [{ questionId, selected: number[], correct: boolean }]
    answers: [],
    playerName: "",
    selectedTopic: null, // { id, title, file }
    startedAt: null,
};

function showScreen(name) {
    for (const key of Object.keys(screens)) {
        screens[key].classList.toggle("hidden", key !== name);
    }
    // сброс ошибок при смене экрана
    ui.startError.classList.add("hidden");
    ui.quizError.classList.add("hidden");
}

function setError(el, text) {
    el.textContent = text;
    el.classList.remove("hidden");
}

function clearError(el) {
    el.textContent = "";
    el.classList.add("hidden");
}

function uuid() {
    // достаточно для localStorage
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function normalizeIndexes(arr) {
    return [...arr].sort((a, b) => a - b);
}

function isAnswerCorrect(selected, correct) {
    if (selected.length !== correct.length) return false;
    const a = normalizeIndexes(selected);
    const b = normalizeIndexes(correct);
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

async function loadJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Не удалось загрузить: ${path} (HTTP ${res.status})`);
    }
    return await res.json();
}

async function init() {
    wireEvents();

    try {
        state.topics = await loadJson("/questions/topics.json");
        fillTopics(state.topics);
        ui.startHint.textContent = `Тем загружено: ${state.topics.length}.`;
    } catch (e) {
        fillTopics([]);
        ui.startHint.textContent = "";
        setError(ui.startError, "Не удалось загрузить список тем.");
        console.error(e);
    }

    renderLeaderboardFilters();
    showScreen("start");
}

function fillTopics(topics) {
    ui.topicSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = topics.length ? "Выберите тему" : "Тем нет";
    ui.topicSelect.appendChild(placeholder);

    for (const t of topics) {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.title;
        ui.topicSelect.appendChild(opt);
    }
}

function getSelectedTopic() {
    const id = ui.topicSelect.value;
    return state.topics.find((x) => x.id === id) || null;
}

async function startQuiz() {
    clearError(ui.startError);

    const name = (ui.playerName.value || "").trim();
    if (!name) {
        setError(ui.startError, "Введите имя игрока.");
        return;
    }

    const topic = getSelectedTopic();
    if (!topic) {
        setError(ui.startError, "Выберите тему.");
        return;
    }

    state.playerName = name;
    state.selectedTopic = topic;
    state.currentIndex = 0;
    state.answers = [];
    state.startedAt = new Date().toISOString();

    try {
        state.topicPack = await loadJson(topic.file);

        const selectedLimit = Number(ui.questionCount.value || "10");
        const totalAvailable = state.topicPack.questions.length;
        const limit = Math.min(selectedLimit, totalAvailable);

        state.topicPack.questions = shuffle([...state.topicPack.questions]).slice(0, limit);
    } catch (e) {
        setError(ui.startError, "Не удалось загрузить вопросы темы. Проверьте файл темы и путь в topics.json.");
        console.error(e);
        return;
    }

    if (!state.topicPack || !Array.isArray(state.topicPack.questions) || state.topicPack.questions.length === 0) {
        setError(ui.startError, "В теме нет вопросов.");
        return;
    }

    // (Опционально) перемешать вопросы, чтобы было веселее:
    state.topicPack.questions = shuffle([...state.topicPack.questions]);

    showScreen("quiz");
    renderQuestion();
}

function renderQuestion() {
    clearError(ui.quizError);

    const pack = state.topicPack;
    const q = pack.questions[state.currentIndex];

    const isSingleSelect = Array.isArray(q.correct) && q.correct.length === 1;

    ui.quizTitle.textContent = pack.title || "Викторина";
    ui.quizProgress.textContent = `Вопрос ${state.currentIndex + 1} из ${pack.questions.length}` +
        (isSingleSelect ? " • один ответ" : " • несколько ответов");
    ui.questionText.textContent = q.text;

    ui.optionsList.innerHTML = "";

    for (let i = 0; i < q.options.length; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "optBtn";
        btn.dataset.index = String(i);
        btn.textContent = q.options[i];

        // aria-pressed нормально подходит для toggle-кнопок.
        // В радио-режиме мы просто не даём снять выбор, а переключаем.
        btn.setAttribute("aria-pressed", "false");

        btn.addEventListener("click", () => {
            if (isSingleSelect) {
                // Радио-поведение: снять выбор нельзя, только переключить на другую кнопку
                const alreadySelected = btn.classList.contains("selected");
                if (alreadySelected) return;

                ui.optionsList.querySelectorAll(".optBtn.selected").forEach((el) => {
                    el.classList.remove("selected");
                    el.setAttribute("aria-pressed", "false");
                });

                btn.classList.add("selected");
                btn.setAttribute("aria-pressed", "true");
            } else {
                // Мультивыбор: toggle
                btn.classList.toggle("selected");
                btn.setAttribute("aria-pressed", btn.classList.contains("selected") ? "true" : "false");
            }
        });

        ui.optionsList.appendChild(btn);
    }

    ui.btnNext.textContent =
        state.currentIndex === pack.questions.length - 1 ? "Завершить" : "Далее";
}


function collectSelectedIndexes() {
    const selected = ui.optionsList.querySelectorAll(".optBtn.selected");
    return Array.from(selected).map((el) => Number(el.dataset.index));
}

function nextStep() {
    clearError(ui.quizError);

    const pack = state.topicPack;
    const q = pack.questions[state.currentIndex];
    const selected = collectSelectedIndexes();

    if (selected.length === 0) {
        setError(ui.quizError, "Нужно выбрать хотя бы один вариант.");
        return;
    }

    const correct = isAnswerCorrect(selected, q.correct);
    state.answers.push({
        questionId: q.id,
        selected,
        correct,
    });

    if (state.currentIndex < pack.questions.length - 1) {
        state.currentIndex += 1;
        renderQuestion();
        return;
    }

    finishQuiz();
}

function finishQuiz() {
    const pack = state.topicPack;
    const score = state.answers.filter((a) => a.correct).length;
    const total = pack.questions.length;

    const finishedAt = new Date().toISOString();

    const attempt = {
        id: uuid(),
        playerName: state.playerName,
        topicId: state.selectedTopic.id,
        topicTitle: state.selectedTopic.title,
        score,
        total,
        startedAt: state.startedAt,
        finishedAt,
    };

    saveAttempt(attempt);

    ui.resultSummary.textContent = `${state.playerName}, ваш результат: ${score} / ${total}`;
    renderBreakdown();

    renderLeaderboardFilters();
    renderLeaderboard();

    showScreen("result");
}

function renderBreakdown() {
    const pack = state.topicPack;
    ui.resultBreakdown.innerHTML = "";

    for (let i = 0; i < pack.questions.length; i++) {
        const q = pack.questions[i];
        const a = state.answers[i];

        const item = document.createElement("div");
        item.className = "breakItem";

        const title = document.createElement("div");
        title.innerHTML = `<strong>Вопрос ${i + 1}:</strong> ${escapeHtml(q.text)}`;

        const status = document.createElement("div");
        status.className = a.correct ? "ok" : "error";
        status.textContent = a.correct ? "Верно" : "Неверно";

        const user = document.createElement("div");
        user.className = "muted small";
        user.innerHTML = `<span>Ваш ответ:</span> ${escapeHtml(formatOptionsByIndexes(q.options, a.selected))}`;

        const spoiler = document.createElement("details");
        spoiler.className = "spoiler";

        const summary = document.createElement("summary");
        summary.textContent = "Показать правильный ответ (спойлер)";

        const spoilerContent = document.createElement("div");
        spoilerContent.className = "spoilerContent";
        spoilerContent.innerHTML = `<span>Правильно:</span> ${escapeHtml(formatOptionsByIndexes(q.options, q.correct))}`;

        spoiler.appendChild(summary);
        spoiler.appendChild(spoilerContent);


        item.appendChild(title);
        item.appendChild(status);
        item.appendChild(user);
        item.appendChild(spoiler);

        ui.resultBreakdown.appendChild(item);
    }
}

function formatOptionsByIndexes(options, indexes) {
    const names = indexes
        .map((i) => options[i])
        .filter((x) => typeof x === "string");
    return names.join(", ");
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// localStorage results
function loadAttempts() {
    try {
        const raw = localStorage.getItem(RESULTS_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveAttempt(attempt) {
    const list = loadAttempts();
    list.unshift(attempt);
    const trimmed = list.slice(0, MAX_RESULTS);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(trimmed));
}

function clearAttempts() {
    localStorage.removeItem(RESULTS_KEY);
}

function renderLeaderboardFilters() {
    // фильтр по теме в таблице
    ui.leaderTopicFilter.innerHTML = `<option value="">Все темы</option>`;
    for (const t of state.topics) {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.title;
        ui.leaderTopicFilter.appendChild(opt);
    }
}

function renderLeaderboard() {
    const attempts = loadAttempts();
    const filter = ui.leaderTopicFilter.value;

    const rows = filter ? attempts.filter((a) => a.topicId === filter) : attempts;

    ui.leaderRows.innerHTML = "";

    ui.leaderEmpty.classList.toggle("hidden", rows.length !== 0);

    for (const a of rows) {
        const tr = document.createElement("tr");

        const dt = new Date(a.finishedAt);
        const dateText = isNaN(dt.getTime())
            ? a.finishedAt
            : dt.toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

        tr.innerHTML = `
      <td>${escapeHtml(dateText)}</td>
      <td>${escapeHtml(a.playerName)}</td>
      <td>${escapeHtml(a.topicTitle)}</td>
      <td><strong>${escapeHtml(a.score)} / ${escapeHtml(a.total)}</strong></td>
    `;
        ui.leaderRows.appendChild(tr);
    }
}

// events
function wireEvents() {
    ui.navStart.addEventListener("click", () => showScreen("start"));
    ui.navLeaderboard.addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboard"); });

    ui.btnStart.addEventListener("click", startQuiz);
    ui.btnStartLeaderboard.addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboard"); });

    ui.btnNext.addEventListener("click", nextStep);
    ui.btnQuit.addEventListener("click", () => showScreen("start"));

    ui.btnPlayAgain.addEventListener("click", () => showScreen("start"));
    ui.btnToLeaderboard.addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboard"); });

    ui.btnClear.addEventListener("click", () => {
        clearAttempts();
        renderLeaderboard();
    });

    ui.leaderTopicFilter.addEventListener("change", renderLeaderboard);

    // enter на старте
    ui.playerName.addEventListener("keydown", (e) => {
        if (e.key === "Enter") startQuiz();
    });
}

// (Если захотите перемешивание)
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

init();
