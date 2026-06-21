/* ===========================================================================
   Les révisions d'Ella — moteur du jeu
   Vanilla JS, aucune dépendance. Lit les thèmes dans themes.js (variable THEMES).
   =========================================================================== */

(function () {
  "use strict";

  // --- Petits raccourcis ----------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const app = $("#app");
  const QUESTIONS_PER_ROUND = 10;

  // --- État de la partie ----------------------------------------------------
  let state = {
    theme: null,        // le thème en cours
    tables: [],         // tables sélectionnées (thème multiplication)
    questions: [],      // les questions de la manche
    index: 0,           // question courante
    correct: 0,         // bonnes réponses
    streak: 0,          // série en cours
    bestStreak: 0,      // meilleure série de la manche
    locked: false,      // empêche de cliquer deux fois
    mode: "normal",     // "normal" ou "faibles" (entraînement ciblé)
  };

  // --- Son (Web Audio, généré, sans fichier) --------------------------------
  let soundOn = loadSetting("sonActif", true);
  let audioCtx = null;

  function getAudio() {
    if (!soundOn) return null;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    return audioCtx;
  }

  // Joue une petite mélodie de notes (fréquences en Hz, durée en secondes).
  function playNotes(notes) {
    const ctx = getAudio();
    if (!ctx) return;
    let t = ctx.currentTime;
    notes.forEach(({ f, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + d);
      t += d;
    });
  }

  const sndGood = () => playNotes([{ f: 660, d: 0.12 }, { f: 880, d: 0.12 }, { f: 1175, d: 0.18 }]);
  const sndBad  = () => playNotes([{ f: 300, d: 0.16 }, { f: 220, d: 0.22 }]);
  const sndWin  = () => playNotes([{ f: 523, d: 0.13 }, { f: 659, d: 0.13 }, { f: 784, d: 0.13 }, { f: 1047, d: 0.3 }]);
  const sndTap  = () => playNotes([{ f: 520, d: 0.06 }]);

  // --- Mémoire (records, par localStorage) ----------------------------------
  function loadSetting(key, fallback) {
    try {
      const v = localStorage.getItem("ella." + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function saveSetting(key, value) {
    try { localStorage.setItem("ella." + key, JSON.stringify(value)); } catch (e) {}
  }
  function getBest(themeId) { return loadSetting("best." + themeId, 0); }
  function setBest(themeId, score) { saveSetting("best." + themeId, score); }

  // --- Mémoire de la progression -------------------------------------------
  //   history.<id> : liste des parties terminées (date, score, étoiles, série).
  //   facts.<id>   : statistiques par calcul, ex. "7×8" -> { seen, ok }.
  function getHistory(themeId) { return loadSetting("history." + themeId, []); }
  function getFacts(themeId) { return loadSetting("facts." + themeId, {}); }

  // Enregistre le résultat d'un calcul (réussi ou non) pour mesurer les acquis.
  function recordAnswer(themeId, factKey, ok) {
    if (!factKey) return;
    const facts = getFacts(themeId);
    const f = facts[factKey] || { seen: 0, ok: 0 };
    f.seen += 1;
    if (ok) f.ok += 1;
    facts[factKey] = f;
    saveSetting("facts." + themeId, facts);
  }

  // Enregistre une partie terminée (on garde les 60 dernières).
  function recordSession(themeId, session) {
    const hist = getHistory(themeId);
    hist.push(session);
    if (hist.length > 60) hist.splice(0, hist.length - 60);
    saveSetting("history." + themeId, hist);
  }

  function clearProgress(themeId) {
    saveSetting("history." + themeId, []);
    saveSetting("facts." + themeId, {});
    saveSetting("best." + themeId, 0);
  }

  // --- Phrases rigolotes et motivantes --------------------------------------
  const GOOD = [
    "Bravo championne ! 🌟", "Trop forte, Ella ! 💪", "Pile poil exact ! 🎯",
    "Wahou, quelle vitesse ! ⚡", "Génialissime ! 🦄", "Tu assures grave ! 😎",
    "C'est tout bon ! 🍀", "Magique ! ✨", "Une vraie pro du calcul ! 🏆",
  ];
  const BAD = [
    "Oups ! On réessaie 😊", "Presque ! La voilà 👇", "Pas grave, on apprend ! 🌱",
    "Petite erreur, ça arrive ! 🤗", "Allez, la prochaine est à toi ! 💛",
  ];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const FOX = "🦊", FOX_HAPPY = "🤩", FOX_PARTY = "🥳", FOX_THINK = "🦊", FOX_OOPS = "🙀";

  // =========================================================================
  //  FABRICATION DES QUESTIONS
  // =========================================================================

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Construit une manche de questions selon le type de thème.
  function buildRound(theme) {
    if (theme.type === "multiplication") {
      return buildMultiplication(state.tables.length ? state.tables : theme.tables);
    }
    if (theme.type === "quiz") {
      return shuffle(theme.questions)
        .slice(0, QUESTIONS_PER_ROUND)
        .map((q) => ({
          display: q.question,
          choices: shuffle(q.choix.map(String)),
          answer: String(q.reponse),
        }));
    }
    return [];
  }

  // Fabrique une question de multiplication a × b (avec sa clé de suivi).
  function makeMultQuestion(a, b) {
    const answer = a * b;
    return {
      display: `${a} <span class="eq">×</span> ${b}`,
      choices: makeChoices(answer),
      answer: String(answer),
      factKey: `${a}×${b}`,
    };
  }

  function buildMultiplication(tables) {
    const round = [];
    const seen = new Set();
    let guard = 0;
    while (round.length < QUESTIONS_PER_ROUND && guard < 500) {
      guard++;
      const a = tables[Math.floor(Math.random() * tables.length)];
      const b = 1 + Math.floor(Math.random() * 10); // 1 à 10
      const key = a + "x" + b;
      if (seen.has(key)) continue;
      seen.add(key);
      round.push(makeMultQuestion(a, b));
    }
    return round;
  }

  // Fabrique 4 réponses possibles : la bonne + 3 leurres plausibles et proches.
  function makeChoices(answer) {
    const set = new Set([answer]);
    const candidates = [
      answer + 1, answer - 1, answer + 2, answer - 2,
      answer + 10, answer - 10, answer + 5,
    ];
    for (const c of shuffle(candidates)) {
      if (set.size >= 4) break;
      if (c > 0 && c !== answer) set.add(c);
    }
    // Filet de sécurité si pas assez de leurres positifs.
    let extra = answer + 3;
    while (set.size < 4) { if (extra > 0) set.add(extra); extra++; }
    return shuffle([...set]).map(String);
  }

  // =========================================================================
  //  ÉCRANS
  // =========================================================================

  function render(html) {
    app.innerHTML = `<div class="screen">${html}</div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- Accueil : choix du thème -------------------------------------------
  function showHome() {
    state.theme = null;
    const cards = THEMES.map((t) => {
      const best = getBest(t.id);
      const bestBadge = best > 0
        ? `<span class="theme-card__best">⭐ Record ${best}/${QUESTIONS_PER_ROUND}</span>` : "";
      return `
        <button class="theme-card" type="button" data-theme="${t.id}"
                style="--theme-color:${t.couleur}">
          ${bestBadge}
          <span class="theme-card__emoji" aria-hidden="true">${t.emoji}</span>
          <h3 class="theme-card__title">${t.titre}</h3>
          <p class="theme-card__phrase">${t.phrase}</p>
          <span class="theme-card__badge">Jouer&nbsp;!</span>
        </button>`;
    }).join("");

    // Une carte « bientôt » pour montrer que d'autres thèmes arriveront.
    const soonCard = `
      <div class="theme-card" disabled aria-disabled="true" style="--theme-color:#C9C4E8">
        <span class="theme-card__emoji" aria-hidden="true">🎁</span>
        <h3 class="theme-card__title">Bientôt de nouveaux jeux</h3>
        <p class="theme-card__phrase">Lecture, conjugaison, sciences… surprise !</p>
        <span class="theme-card__soon">À venir 🔜</span>
      </div>`;

    const hist = getHistory("tables");
    const totalStars = hist.reduce((s, h) => s + (h.stars || 0), 0);
    const heroStat = hist.length
      ? `<p class="hero__stat">⭐ ${totalStars} étoiles · ${hist.length} partie${hist.length > 1 ? "s" : ""} jouée${hist.length > 1 ? "s" : ""}</p>`
      : "";

    render(`
      <section class="hero">
        <div class="mascot" aria-hidden="true">${FOX}</div>
        <h1 class="hero__title">Les révisions d'<span class="pop">Ella</span></h1>
        <p class="hero__sub">Choisis un jeu et gagne un max d'étoiles&nbsp;! ⭐</p>
        ${heroStat}
        <div class="home-cta"><button class="btn btn--grape" id="progressBtn" type="button">📈 Voir mes progrès</button></div>
      </section>
      <p class="section-label">Les jeux</p>
      <div class="themes">
        ${cards}
        ${soonCard}
      </div>
    `);

    $("#progressBtn").addEventListener("click", () => { sndTap(); showProgress(); });
    app.querySelectorAll("[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        sndTap();
        openTheme(btn.dataset.theme);
      });
    });
  }

  // =========================================================================
  //  ÉCRAN « MES PROGRÈS » (mémoire + calculs de progression et d'acquis)
  // =========================================================================
  const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Détermine le niveau de maîtrise d'une table à partir du taux de réussite.
  function masteryLevel(seen, ok) {
    const taux = seen ? ok / seen : 0;
    if (seen === 0) return { label: "Pas encore testée", emoji: "⚪", color: "#C9C4E8" };
    if (seen >= 4 && taux >= 0.85) return { label: "Acquis", emoji: "✅", color: "#36C77B" };
    if (taux >= 0.6) return { label: "En cours", emoji: "🟡", color: "#FFC93C" };
    return { label: "À revoir", emoji: "🔴", color: "#FF6B6B" };
  }

  // Agrège les statistiques de tous les calculs d'une table (t × 1 … t × 10).
  function tableStats(facts, t) {
    let seen = 0, ok = 0;
    for (let b = 1; b <= 10; b++) {
      const f = facts[`${t}×${b}`];
      if (f) { seen += f.seen; ok += f.ok; }
    }
    return { seen, ok, taux: seen ? ok / seen : 0 };
  }

  // Les calculs les moins réussis (pour l'entraînement ciblé).
  function weakestFacts(facts, limit) {
    return Object.keys(facts)
      .map((k) => ({ key: k, seen: facts[k].seen, ok: facts[k].ok, taux: facts[k].ok / facts[k].seen }))
      .filter((f) => f.seen >= 1 && f.taux < 0.8)
      .sort((a, b) => a.taux - b.taux || b.seen - a.seen)
      .slice(0, limit);
  }

  function avgPct(arr) {
    if (!arr.length) return null;
    return arr.reduce((s, h) => s + (h.score / h.total) * 100, 0) / arr.length;
  }

  function showProgress() {
    const themeId = "tables";
    const hist = getHistory(themeId);
    const facts = getFacts(themeId);

    if (hist.length === 0) {
      render(`
        <div class="panel center">
          <div class="mascot" aria-hidden="true">${FOX}</div>
          <h2 class="panel__title">Mes progrès 📈</h2>
          <p class="panel__hint">Joue une première partie et tout apparaîtra ici&nbsp;: tes étoiles, tes scores et les tables que tu maîtrises&nbsp;!</p>
          <div class="stack">
            <button class="btn btn--block" id="playNow" type="button">Jouer maintenant 🚀</button>
            <button class="btn btn--ghost" id="backHome" type="button">← Les jeux</button>
          </div>
        </div>
      `);
      $("#playNow").addEventListener("click", () => { sndTap(); openTheme(themeId); });
      $("#backHome").addEventListener("click", () => { sndTap(); showHome(); });
      return;
    }

    // --- Calculs globaux ---
    const parties = hist.length;
    const totalStars = hist.reduce((s, h) => s + (h.stars || 0), 0);
    const bestStreak = hist.reduce((m, h) => Math.max(m, h.best || 0), 0);
    const moyenne = Math.round(avgPct(hist));

    // --- Tendance : 3 dernières parties vs 3 précédentes ---
    const last3 = avgPct(hist.slice(-3));
    const prev3 = avgPct(hist.slice(-6, -3));
    let trend = { label: "Continue à jouer pour voir ta progression", emoji: "🌱", color: "var(--grape)" };
    if (prev3 !== null && last3 !== null) {
      const d = Math.round(last3 - prev3);
      if (d >= 5) trend = { label: `En progression (+${d}%) — bravo&nbsp;!`, emoji: "📈", color: "var(--leaf)" };
      else if (d <= -5) trend = { label: `En petite baisse (${d}%) — on s'entraîne&nbsp;!`, emoji: "💪", color: "var(--coral)" };
      else trend = { label: "Tu gardes bien le rythme", emoji: "➡️", color: "var(--grape)" };
    }

    // --- Mini-graphe des 10 dernières parties ---
    const bars = hist.slice(-10).map((h) => {
      const p = Math.round((h.score / h.total) * 100);
      return `<div class="spark" style="height:${Math.max(8, p)}%" title="${h.score}/${h.total}"></div>`;
    }).join("");

    // --- Maîtrise par table ---
    const rows = TABLES.map((t) => {
      const s = tableStats(facts, t);
      const lvl = masteryLevel(s.seen, s.ok);
      const pct = Math.round(s.taux * 100);
      return `
        <div class="mastery-row">
          <span class="mastery-row__name">Table de ${t}</span>
          <div class="mastery-bar"><div class="mastery-bar__fill" style="width:${s.seen ? pct : 0}%;background:${lvl.color}"></div></div>
          <span class="mastery-row__val">${s.seen ? pct + "%" : "—"}</span>
          <span class="mastery-row__tag" style="--tag:${lvl.color}">${lvl.emoji} ${lvl.label}</span>
        </div>`;
    }).join("");

    // --- Points à revoir ---
    const weak = weakestFacts(facts, 6);
    const weakHtml = weak.length
      ? weak.map((f) => `<span class="weak-chip">${f.key.replace("×", " × ")}<small>${f.ok}/${f.seen} réussis</small></span>`).join("")
      : `<p class="panel__hint">Rien à signaler pour l'instant, tout roule&nbsp;! 🎉</p>`;

    render(`
      <div class="panel">
        <div class="center"><div class="mascot" aria-hidden="true">${FOX_HAPPY}</div></div>
        <h2 class="panel__title">Mes progrès 📈</h2>
        <p class="trend-pill" style="--tag:${trend.color}">${trend.emoji} ${trend.label}</p>

        <div class="summary-grid">
          <div class="stat-tile"><span class="stat-tile__num">${parties}</span><span class="stat-tile__lbl">parties jouées</span></div>
          <div class="stat-tile"><span class="stat-tile__num">${moyenne}%</span><span class="stat-tile__lbl">de réussite</span></div>
          <div class="stat-tile"><span class="stat-tile__num">⭐&nbsp;${totalStars}</span><span class="stat-tile__lbl">étoiles gagnées</span></div>
          <div class="stat-tile"><span class="stat-tile__num">🔥&nbsp;${bestStreak}</span><span class="stat-tile__lbl">meilleure série</span></div>
        </div>

        <p class="section-label">Mes dernières parties</p>
        <div class="spark-row" aria-label="Scores des dernières parties">${bars}</div>

        <p class="section-label">Mes tables — ce qui est acquis</p>
        <div class="mastery">${rows}</div>

        <p class="section-label">À revoir en priorité</p>
        <div class="weak-list">${weakHtml}</div>

        <div class="stack">
          ${weak.length ? `<button class="btn btn--block" id="trainWeak" type="button">M'entraîner sur ces calculs 🎯</button>` : ""}
          <button class="btn btn--grape btn--block" id="playNow" type="button">Nouvelle partie 🚀</button>
          <button class="btn btn--ghost" id="backHome" type="button">← Les jeux</button>
        </div>
        <p class="reset-line"><button class="linkish" id="resetBtn" type="button">Effacer mes progrès</button></p>
      </div>
    `);

    $("#playNow").addEventListener("click", () => { sndTap(); openTheme(themeId); });
    $("#backHome").addEventListener("click", () => { sndTap(); showHome(); });
    const trainBtn = $("#trainWeak");
    if (trainBtn) trainBtn.addEventListener("click", () => { sndTap(); startWeakRound(weak); });
    $("#resetBtn").addEventListener("click", () => {
      if (confirm("Effacer tout l'historique et les progrès d'Ella ? C'est définitif.")) {
        clearProgress(themeId);
        showProgress();
      }
    });
  }

  function openTheme(themeId) {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return showHome();
    state.theme = theme;
    if (theme.type === "multiplication") {
      showTablePicker(theme);
    } else {
      startRound();
    }
  }

  // ---- Choix des tables (thème multiplication) ----------------------------
  function showTablePicker(theme) {
    state.tables = [];
    const chips = theme.tables.map((n) => `
      <button class="chip" type="button" data-table="${n}" aria-pressed="false">
        ${n}<small>la table</small>
      </button>`).join("");

    render(`
      <div class="panel">
        <div class="center"><div class="mascot" aria-hidden="true">${FOX}</div></div>
        <h2 class="panel__title">Quelles tables on révise&nbsp;?</h2>
        <p class="panel__hint">Touche une ou plusieurs tables, ou prends la surprise&nbsp;!</p>
        <div class="chips">
          <button class="chip chip--all" type="button" data-all aria-pressed="false">
            🎲 Mélange surprise<small>toutes les tables</small>
          </button>
          ${chips}
        </div>
        <div class="stack">
          <button id="goBtn" class="btn btn--block" type="button" disabled>C'est parti&nbsp;! 🚀</button>
          <button class="btn btn--ghost" type="button" data-back>← Retour</button>
        </div>
      </div>
    `);

    const goBtn = $("#goBtn");
    const allBtn = app.querySelector("[data-all]");
    const tableBtns = [...app.querySelectorAll("[data-table]")];

    function refresh() {
      goBtn.disabled = state.tables.length === 0;
      const allSelected = state.tables.length === theme.tables.length;
      allBtn.setAttribute("aria-pressed", String(allSelected));
    }

    tableBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.table);
        const on = btn.getAttribute("aria-pressed") === "true";
        btn.setAttribute("aria-pressed", String(!on));
        if (on) state.tables = state.tables.filter((x) => x !== n);
        else state.tables.push(n);
        sndTap();
        refresh();
      });
    });

    allBtn.addEventListener("click", () => {
      const allSelected = state.tables.length === theme.tables.length;
      if (allSelected) {
        state.tables = [];
        tableBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
      } else {
        state.tables = theme.tables.slice();
        tableBtns.forEach((b) => b.setAttribute("aria-pressed", "true"));
      }
      sndTap();
      refresh();
    });

    goBtn.addEventListener("click", () => { sndTap(); startRound(); });
    app.querySelector("[data-back]").addEventListener("click", () => { sndTap(); showHome(); });
  }

  // ---- Démarrer une manche -------------------------------------------------
  function startRound() {
    state.mode = "normal";
    state.questions = buildRound(state.theme);
    state.index = 0;
    state.correct = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.locked = false;
    showQuestion();
  }

  // Entraînement ciblé : une manche bâtie sur les calculs les plus faibles.
  function startWeakRound(weak) {
    state.theme = THEMES.find((t) => t.id === "tables");
    state.mode = "faibles";
    state.tables = [];
    const pairs = weak.map((f) => f.key.split("×").map(Number));
    const round = [];
    let i = 0;
    while (round.length < QUESTIONS_PER_ROUND && pairs.length) {
      const [a, b] = pairs[i % pairs.length];
      round.push(makeMultQuestion(a, b));
      i++;
    }
    state.questions = shuffle(round);
    state.index = 0;
    state.correct = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.locked = false;
    showQuestion();
  }

  // ---- Une question --------------------------------------------------------
  function showQuestion() {
    const q = state.questions[state.index];
    const num = state.index + 1;
    const total = state.questions.length;
    const pct = (state.index / total) * 100;

    const choicesHtml = q.choices.map((c) => `
      <button class="choice" type="button" data-choice="${c}">${c}</button>`).join("");

    render(`
      <div class="quiz-head">
        <div class="progress"><div class="progress__fill" style="width:${pct}%"></div></div>
        <div class="quiz-stats">
          <span class="stat-pill">${num}/${total}</span>
          <span class="stat-pill stat-pill--streak">🔥 ${state.streak}</span>
        </div>
      </div>
      <div class="question-card">
        <div class="mascot question-card__mascot" id="mascot" aria-hidden="true">${FOX}</div>
        <p class="question" aria-label="Combien font ${stripTags(q.display)} ?">${q.display} <span class="eq">=</span> ?</p>
        <div class="choices">${choicesHtml}</div>
        <p class="feedback" id="feedback" role="status" aria-live="polite"></p>
      </div>
    `);

    state.locked = false;
    app.querySelectorAll("[data-choice]").forEach((btn) => {
      btn.addEventListener("click", () => answer(btn, q));
    });
  }

  function stripTags(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || "").replace(/×/g, " fois ");
  }

  function answer(btn, q) {
    if (state.locked) return;
    state.locked = true;

    const chosen = btn.dataset.choice;
    const correct = chosen === q.answer;
    const buttons = [...app.querySelectorAll("[data-choice]")];
    buttons.forEach((b) => (b.disabled = true));

    // Mémorise le résultat de ce calcul pour suivre les acquis.
    if (q.factKey) recordAnswer(state.theme.id, q.factKey, correct);

    const mascot = $("#mascot");
    const feedback = $("#feedback");

    if (correct) {
      state.correct++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      btn.classList.add("is-correct");
      feedback.textContent = pick(GOOD);
      feedback.className = "feedback feedback--good";
      mascot.textContent = state.streak >= 3 ? FOX_PARTY : FOX_HAPPY;
      mascot.classList.add("mascot--cheer");
      sndGood();
      burstConfetti(state.streak >= 3 ? 70 : 36);
    } else {
      state.streak = 0;
      btn.classList.add("is-wrong");
      buttons.find((b) => b.dataset.choice === q.answer)?.classList.add("is-correct");
      feedback.textContent = pick(BAD);
      feedback.className = "feedback feedback--bad";
      mascot.textContent = FOX_OOPS;
      mascot.classList.add("mascot--oops");
      sndBad();
    }

    setTimeout(() => {
      state.index++;
      if (state.index >= state.questions.length) showResult();
      else showQuestion();
    }, correct ? 1100 : 1700);
  }

  // ---- Résultats -----------------------------------------------------------
  function showResult() {
    const total = state.questions.length;
    const score = state.correct;
    const ratio = score / total;
    const stars = score >= total ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0;
    const starRow = "⭐".repeat(stars) + "☆".repeat(3 - stars);

    const prevBest = getBest(state.theme.id);
    const isNewBest = score > prevBest;
    if (isNewBest) setBest(state.theme.id, score);

    // On garde la trace de cette partie pour la page « Mes progrès ».
    recordSession(state.theme.id, {
      t: Date.now(),
      score: score,
      total: total,
      stars: stars,
      best: state.bestStreak,
      tables: state.tables.slice(),
      mode: state.mode,
    });

    let title, msg, face;
    if (stars === 3) {
      title = "PARFAIT !"; face = FOX_PARTY;
      msg = "Sans aucune faute ! Tu es une vraie championne. 🏆";
    } else if (stars === 2) {
      title = "Super joué !"; face = FOX_HAPPY;
      msg = "Tu y es presque, encore un petit tour et c'est gagné !";
    } else if (stars === 1) {
      title = "Bien essayé !"; face = FOX;
      msg = "Ça progresse ! On refait une partie pour s'entraîner ?";
    } else {
      title = "On continue !"; face = FOX;
      msg = "C'est en s'entraînant qu'on devient super forte. Allez, on recommence !";
    }

    render(`
      <div class="result">
        <div class="mascot" aria-hidden="true">${face}</div>
        <h2 class="result__title">${title}</h2>
        <div class="result__stars" aria-label="${stars} étoiles sur 3">${starRow}</div>
        <p class="result__score">${score} / ${total} bonnes réponses</p>
        <p class="result__score">🔥 Meilleure série : ${state.bestStreak}</p>
        ${isNewBest ? `<div class="result__new-best">🎉 Nouveau record&nbsp;!</div>` : ""}
        <p class="result__msg">${msg}</p>
        <div class="stack">
          <button class="btn btn--block" id="againBtn" type="button">Rejouer&nbsp;! 🔁</button>
          <button class="btn btn--grape btn--block" id="menuBtn" type="button">Autres tables ✏️</button>
          <button class="btn btn--ghost" id="progressBtn" type="button">📈 Mes progrès</button>
          <button class="btn btn--ghost" id="backHome" type="button">← Les jeux</button>
        </div>
      </div>
    `);

    if (stars >= 2) { sndWin(); celebrate(); }

    $("#againBtn").addEventListener("click", () => { sndTap(); startRound(); });
    $("#menuBtn").addEventListener("click", () => { sndTap(); openTheme(state.theme.id); });
    $("#progressBtn").addEventListener("click", () => { sndTap(); showProgress(); });
    $("#backHome").addEventListener("click", () => { sndTap(); showHome(); });
  }

  // =========================================================================
  //  CONFETTIS (canvas)
  // =========================================================================
  const canvas = $("#confetti");
  const ctx2d = canvas.getContext("2d");
  let pieces = [];
  let rafId = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#FF5DA2", "#FFC93C", "#7C5CFC", "#4ECDC4", "#36C77B", "#FF6B6B"];

  function sizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  function spawn(n, fromTop) {
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: fromTop ? -20 : canvas.height * 0.35 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 7,
        vy: fromTop ? Math.random() * 3 + 2 : -(Math.random() * 9 + 5),
        size: Math.random() * 9 + 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    if (!rafId) loop();
  }

  function burstConfetti(n) { if (!reduceMotion) spawn(n, false); }
  function celebrate() {
    if (reduceMotion) return;
    spawn(120, true);
    setTimeout(() => spawn(80, true), 350);
    setTimeout(() => spawn(80, true), 700);
  }

  function loop() {
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;          // gravité
      p.vx *= 0.99;
      p.rot += p.vr;
      ctx2d.save();
      ctx2d.translate(p.x, p.y);
      ctx2d.rotate(p.rot);
      ctx2d.fillStyle = p.color;
      ctx2d.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx2d.restore();
    });
    pieces = pieces.filter((p) => p.y < canvas.height + 30);
    if (pieces.length > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      rafId = null;
    }
  }

  // =========================================================================
  //  BARRE DU HAUT + DÉMARRAGE
  // =========================================================================
  function updateSoundBtn() {
    const btn = $("#soundBtn");
    btn.textContent = soundOn ? "🔊" : "🔇";
    btn.setAttribute("aria-pressed", String(soundOn));
  }

  $("#soundBtn").addEventListener("click", () => {
    soundOn = !soundOn;
    saveSetting("sonActif", soundOn);
    updateSoundBtn();
    if (soundOn) sndTap();
  });

  $("#homeBtn").addEventListener("click", () => { sndTap(); showHome(); });

  // Garde-fou si themes.js n'a pas été chargé.
  if (typeof THEMES === "undefined" || !Array.isArray(THEMES) || THEMES.length === 0) {
    app.innerHTML = `<div class="panel center"><h2 class="panel__title">Oups 🦊</h2>
      <p class="panel__hint">Aucun jeu trouvé. Vérifie que le fichier themes.js est bien là.</p></div>`;
    return;
  }

  updateSoundBtn();
  showHome();
})();
