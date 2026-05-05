"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────
const QUIZ_SIZE = 50;
const QUEUE_TARGET = 3;

const LEVELS = [
  { id:1, label:"Débutant",      emoji:"🌱", color:"#4ade80", dark:"#052e16" },
  { id:2, label:"Intermédiaire", emoji:"📘", color:"#60a5fa", dark:"#0c1a2e" },
  { id:3, label:"Confirmé",      emoji:"🔥", color:"#f59e0b", dark:"#1c0f00" },
  { id:4, label:"Avancé",        emoji:"⚡", color:"#e879f9", dark:"#1a0522" },
  { id:5, label:"Expert",        emoji:"💎", color:"#f87171", dark:"#2d0707" },
];

const CATEGORIES = [
  "Géographie","Histoire","Sciences","Nature & Animaux",
  "Littérature","Musique","Sport","Cinéma & Séries",
  "Jeux vidéo","Technologie","Philosophie"
];

const CAT_COLORS = {
  "Géographie":"#4ade80","Histoire":"#f59e0b","Sciences":"#60a5fa",
  "Nature & Animaux":"#86efac","Littérature":"#f87171","Musique":"#fb923c",
  "Sport":"#34d399","Cinéma & Séries":"#a78bfa","Jeux vidéo":"#818cf8",
  "Technologie":"#22d3ee","Philosophie":"#e2e8f0"
};

// ─── SIMILARITÉ ──────────────────────────────────────────────
function normalize(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").trim();
}
function isTooSimilar(newQ, allQuestions) {
  const nNew = normalize(newQ);
  const wordsNew = new Set(nNew.split(" ").filter(w => w.length > 4));
  for (const q of allQuestions) {
    const nOld = normalize(q.q || q);
    if (nNew === nOld) return true;
    const wordsOld = new Set(nOld.split(" ").filter(w => w.length > 4));
    if (!wordsNew.size || !wordsOld.size) continue;
    let shared = 0;
    for (const w of wordsNew) { if (wordsOld.has(w)) shared++; }
    if (shared / Math.min(wordsNew.size, wordsOld.size) > 0.6) return true;
  }
  return false;
}

// ─── APPEL API (côté serveur via Next.js route) ──────────────
async function generateQuestion(level, allKnown) {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, allKnown, category }),
  });
  if (!res.ok) throw new Error("Erreur API");
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function Quiz() {
  const [phase, setPhase] = useState("start");
  const [startLevel, setStartLevel] = useState(3);
  const [currentLevel, setCurrentLevel] = useState(3);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [played, setPlayed] = useState([]);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [levelAnim, setLevelAnim] = useState(null);
  const [error, setError] = useState(null);

  const generatingRef = useRef(false);
  const levelRef = useRef(3);
  const playedRef = useRef([]);
  const currentRef = useRef(null);
  const queueRef = useRef([]);
  const animTimer = useRef(null);

  useEffect(() => { levelRef.current = currentLevel; }, [currentLevel]);
  useEffect(() => { playedRef.current = played; }, [played]);

  useEffect(() => {
    if (phase !== "quiz") return;
    setTimeout(fillQueue, 50);
  }, [currentLevel, phase]);

  // ── File de questions ─────────────────────────────────────
  const fillQueue = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setError(null);
    try {
      while (true) {
        if (queueRef.current.length >= QUEUE_TARGET) break;
        const allKnown = [
          ...playedRef.current,
          ...(currentRef.current ? [currentRef.current] : []),
          ...queueRef.current,
        ];
        let q = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          q = await generateQuestion(levelRef.current, allKnown);
          if (!isTooSimilar(q.q, allKnown)) break;
          q = null;
        }
        if (!q) continue;
        queueRef.current = [...queueRef.current, q];
        setQueue([...queueRef.current]);
      }
    } catch (e) {
      setError("Erreur réseau. Nouvelle tentative…");
      setTimeout(() => { generatingRef.current = false; fillQueue(); }, 2500);
      return;
    }
    generatingRef.current = false;
  }, []);

  // ── Démarrage ─────────────────────────────────────────────
  async function startQuiz(lvl) {
    setStartLevel(lvl);
    setCurrentLevel(lvl);
    levelRef.current = lvl;
    setPlayed([]); playedRef.current = [];
    currentRef.current = null;
    queueRef.current = [];
    setQueue([]); setScore(0);
    setSelected(null); setRevealed(false); setError(null);
    setPhase("loading");
    try {
      const q = await generateQuestion(lvl, []);
      currentRef.current = q;
      setCurrent(q);
      setPhase("quiz");
      generatingRef.current = false;
      setTimeout(fillQueue, 100);
    } catch {
      setError("Impossible de démarrer. Vérifiez la connexion.");
      setPhase("start");
    }
  }

  // ── Sélection ─────────────────────────────────────────────
  function handleSelect(i) {
    if (revealed || !current) return;
    setSelected(i);
    setRevealed(true);
    const correct = i === current.answer;
    if (correct) setScore(s => s + 1);
    const newLevel = correct ? Math.min(5, currentLevel + 1) : Math.max(1, currentLevel - 1);
    if (newLevel !== currentLevel) {
      setLevelAnim(newLevel > currentLevel ? "up" : "down");
      clearTimeout(animTimer.current);
      animTimer.current = setTimeout(() => setLevelAnim(null), 2000);
    }
    setCurrentLevel(newLevel);
    levelRef.current = newLevel;
    const entry = { ...current, chosen: i, correct };
    setPlayed(p => [...p, entry]);
    playedRef.current = [...playedRef.current, entry];
    setTimeout(fillQueue, 50);
  }

  // ── Suivante ──────────────────────────────────────────────
  async function handleNext() {
    if (played.length >= QUIZ_SIZE) { setPhase("result"); return; }
    setSelected(null); setRevealed(false);
    if (queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      queueRef.current = rest;
      currentRef.current = next;
      setCurrent(next); setQueue([...rest]);
      setTimeout(fillQueue, 50);
    } else {
      setPhase("loading_next");
      try {
        const allKnown = [...playedRef.current, ...(currentRef.current ? [currentRef.current] : [])];
        const q = await generateQuestion(currentLevel, allKnown);
        currentRef.current = q; setCurrent(q); setPhase("quiz");
        setTimeout(fillQueue, 50);
      } catch {
        setError("Erreur réseau — nouvelle tentative…");
        setTimeout(() => handleNext(), 2500);
      }
    }
  }

  function restart() { setPhase("start"); }

  // ─── RENDU ───────────────────────────────────────────────
  const lv = LEVELS[currentLevel - 1];
  const progress = (played.length / QUIZ_SIZE) * 100;

  if (phase === "start") return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={S.startHeader}>
          <span style={S.startIcon}>∞</span>
          <h1 style={S.startTitle}>Infinité Quiz</h1>
          <p style={S.startSub}>Questions générées par IA, calibrées pour les 14 ans.<br />Le niveau s'adapte à chaque réponse.</p>
        </div>
        <p style={S.sectionLabel}>CHOISIS TON NIVEAU DE DÉPART</p>
        <div style={S.levelGrid}>
          {LEVELS.map(lv => (
            <button key={lv.id}
              style={{ ...S.levelBtn, borderColor: lv.color + "66", background: startLevel === lv.id ? lv.dark : "transparent" }}
              onClick={() => startQuiz(lv.id)}>
              <span style={{ fontSize: 20 }}>{lv.emoji}</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ color: lv.color, fontSize: 13, fontFamily: "monospace", letterSpacing: "1px" }}>{lv.label}</div>
                <div style={{ color: "#334155", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>
                  {lv.id === 1 ? "Ce qu'on apprend en primaire" : lv.id === 2 ? "Programme de 6e-5e" : lv.id === 3 ? "Programme de 4e-3e" : lv.id === 4 ? "Ado très curieux & lecteur" : "Niveau lycée — ado brillant"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {[1,2,3,4,5].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: d <= lv.id ? lv.color : "#1e293b" }} />)}
              </div>
            </button>
          ))}
        </div>
        {error && <p style={{ color: "#f87171", fontFamily: "monospace", fontSize: 11, textAlign: "center", marginBottom: 8 }}>{error}</p>}
        <p style={S.footNote}>50 questions · IA générative · adapté 14 ans · 11 thèmes</p>
      </div>
    </div>
  );

  if (phase === "loading" || phase === "loading_next") return (
    <div style={S.root}>
      <div style={{ ...S.card, textAlign: "center", padding: "60px 24px" }}>
        <div style={S.spinner}>⚙</div>
        <p style={{ color: "#475569", fontFamily: "monospace", fontSize: 13, marginTop: 16 }}>
          {phase === "loading" ? "Génération de la première question…" : "Question suivante en cours…"}
        </p>
        {error && <p style={{ color: "#f87171", fontSize: 11, fontFamily: "monospace", marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );

  if (phase === "result") {
    const pct = Math.round((score / QUIZ_SIZE) * 100);
    const finalLv = LEVELS[currentLevel - 1];
    const mention = pct >= 90 ? ["🏆","Légendaire !"] : pct >= 75 ? ["🎯","Excellent !"] : pct >= 55 ? ["🔥","Très bien !"] : pct >= 35 ? ["👍","Pas mal !"] : ["📚","À réviser !"];
    const catStats = {};
    played.forEach(h => {
      if (!catStats[h.category]) catStats[h.category] = { total: 0, correct: 0 };
      catStats[h.category].total++;
      if (h.correct) catStats[h.category].correct++;
    });
    let lTrace = startLevel;
    const lvCurve = played.map(h => { const b = lTrace; lTrace = h.correct ? Math.min(5,lTrace+1) : Math.max(1,lTrace-1); return b; });

    return (
      <div style={S.root}>
        <div style={S.card}>
          <div style={{ fontSize: 44, textAlign: "center" }}>{mention[0]}</div>
          <h2 style={S.finishTitle}>{mention[1]}</h2>
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 52, color: "#4ade80", fontFamily: "monospace" }}>{score}</span>
            <span style={{ fontSize: 22, color: "#475569", fontFamily: "monospace" }}>/{QUIZ_SIZE}</span>
          </div>
          <p style={{ textAlign: "center", color: "#64748b", fontFamily: "monospace", fontSize: 12, marginBottom: 4 }}>{pct}% de réussite</p>
          <p style={{ textAlign: "center", fontFamily: "monospace", fontSize: 12, marginBottom: 20 }}>
            Niveau final : <span style={{ color: finalLv.color }}>{finalLv.emoji} {finalLv.label}</span>
          </p>
          <div style={S.curveBox}>
            <p style={S.curveLabel}>PARCOURS DE NIVEAU</p>
            <svg width="100%" height="56" viewBox={`0 0 ${QUIZ_SIZE} 4`} preserveAspectRatio="none">
              <polyline points={lvCurve.map((l,i) => `${i},${4-l}`).join(" ")} fill="none" stroke="#0ea5e9" strokeWidth="0.25" opacity="0.6" />
              {lvCurve.map((l,i) => <circle key={i} cx={i} cy={4-l} r="0.45" fill={played[i]?.correct ? "#4ade80" : "#f87171"} opacity="0.9" />)}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#334155", fontFamily: "monospace", marginTop: 2 }}>
              <span>Q1</span><span style={{ color: "#1e3a5f" }}>● bonne  ● mauvaise</span><span>Q{QUIZ_SIZE}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", marginBottom: 18 }}>
            {played.map((h,i) => <div key={i} title={`Q${i+1} · ${h.category}`} style={{ width: 15, height: 15, borderRadius: "50%", background: h.correct ? "#4ade80" : "#f87171" }} />)}
          </div>
          <p style={S.sectionLabel}>PAR THÈME</p>
          {Object.entries(catStats).sort((a,b) => b[1].total - a[1].total).map(([cat,s]) => {
            const c = CAT_COLORS[cat] || "#94a3b8";
            return (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", width: 110, color: c, flexShrink: 0 }}>{cat}</span>
                <div style={{ flex: 1, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((s.correct/s.total)*100)}%`, background: c, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", width: 28, textAlign: "right" }}>{s.correct}/{s.total}</span>
              </div>
            );
          })}
          <button style={{ ...S.btn, marginTop: 20 }} onClick={restart}>Nouvelle partie →</button>
        </div>
      </div>
    );
  }

  // ── QUIZ ─────────────────────────────────────────────────
  const catColor = CAT_COLORS[current?.category] || "#94a3b8";
  return (
    <div style={S.root}>
      {levelAnim && (
        <div style={{ ...S.toast, background: levelAnim === "up" ? "#052e16" : "#2d0707", borderColor: levelAnim === "up" ? "#4ade80" : "#f87171", color: levelAnim === "up" ? "#4ade80" : "#f87171" }}>
          {levelAnim === "up" ? `⬆ ${LEVELS[currentLevel-1].emoji} ${LEVELS[currentLevel-1].label}` : `⬇ ${LEVELS[currentLevel-1].emoji} ${LEVELS[currentLevel-1].label}`}
        </div>
      )}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ ...S.badge, background: catColor + "20", color: catColor, borderColor: catColor + "44" }}>{current?.category}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...S.badge, background: lv.dark, color: lv.color, borderColor: lv.color + "44" }}>{lv.emoji} {lv.label}</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }}>{played.length + 1}/{QUIZ_SIZE}</span>
          </div>
        </div>
        <div style={{ height: 3, background: "#1a2a40", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: lv.color, borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {LEVELS.map(l => <div key={l.id} style={{ flex: 1, height: 4, borderRadius: 2, transition: "all 0.4s", background: l.id <= currentLevel ? l.color : "#1a2a40", boxShadow: l.id === currentLevel ? `0 0 8px ${l.color}` : "none" }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>✦ Score : <strong style={{ color: "#e2e8f0" }}>{score}</strong></span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#1e3a5f" }}>{queue.length > 0 ? `${queue.length} en file` : "⚙ génération…"}</span>
        </div>
        <p style={{ fontSize: 17, color: "#f1f5f9", lineHeight: 1.65, marginBottom: 22, fontFamily: "Georgia, serif", fontWeight: "normal" }}>{current?.q}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {current?.choices.map((c, i) => {
            let bg = "#111c2d", border = "#1e3a5f", col = "#cbd5e1";
            if (revealed) {
              if (i === current.answer) { bg = "#052e16"; border = "#4ade80"; col = "#4ade80"; }
              else if (i === selected) { bg = "#2d0707"; border = "#f87171"; col = "#f87171"; }
            } else if (selected === i) { bg = "#0f2a45"; border = catColor; }
            return (
              <button key={i} onClick={() => handleSelect(i)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: bg, border: `1px solid ${border}`, borderRadius: 10, cursor: revealed ? "default" : "pointer", fontSize: 14, textAlign: "left", color: col, transition: "all 0.2s", fontFamily: "Georgia, serif" }}>
                <span style={{ width: 22, height: 22, border: `1px solid ${border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "monospace", flexShrink: 0, color: col }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {c}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div style={{ padding: "11px 16px", borderRadius: 8, border: "1px solid", marginBottom: 14, fontSize: 13, fontFamily: "monospace", background: selected === current?.answer ? "#052e16" : "#2d0707", borderColor: selected === current?.answer ? "#4ade80" : "#f87171", color: selected === current?.answer ? "#4ade80" : "#f87171" }}>
            {selected === current?.answer ? "✓ Bonne réponse !" : `✗ Réponse correcte : ${current?.choices[current?.answer]}`}
          </div>
        )}
        {revealed && (
          <button style={S.btn} onClick={handleNext}>
            {played.length + 1 >= QUIZ_SIZE ? "Voir les résultats" : "Question suivante →"}
          </button>
        )}
      </div>
    </div>
  );
}

const S = {
  root: { minHeight: "100vh", background: "#060d18", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: "20px", boxSizing: "border-box" },
  card: { background: "#0a1525", border: "1px solid #162033", borderRadius: 20, padding: "26px 22px", width: "100%", maxWidth: 520, boxShadow: "0 0 80px #0ea5e910", position: "relative" },
  startHeader: { textAlign: "center", marginBottom: 24 },
  startIcon: { display: "block", fontSize: 48, color: "#0ea5e9", fontFamily: "monospace", lineHeight: 1 },
  startTitle: { color: "#e2e8f0", fontSize: 28, fontWeight: "normal", margin: "8px 0 6px" },
  startSub: { color: "#475569", fontSize: 13, lineHeight: 1.6, fontFamily: "monospace", margin: 0 },
  sectionLabel: { color: "#1e3a5f", fontFamily: "monospace", fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 },
  levelGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  levelBtn: { display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", border: "1px solid", borderRadius: 12, cursor: "pointer", transition: "all 0.2s", width: "100%" },
  footNote: { textAlign: "center", color: "#1e3a5f", fontFamily: "monospace", fontSize: 10 },
  badge: { fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px", padding: "3px 10px", borderRadius: 20, border: "1px solid" },
  btn: { width: "100%", padding: 13, background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "Georgia, serif", letterSpacing: "0.5px" },
  toast: { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", padding: "8px 20px", borderRadius: 30, border: "1px solid", fontFamily: "monospace", fontSize: 13, zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 20px #00000066" },
  finishTitle: { color: "#f1f5f9", textAlign: "center", fontSize: 22, fontWeight: "normal", marginBottom: 14 },
  curveBox: { background: "#060d18", borderRadius: 10, padding: "12px 14px", marginBottom: 16, border: "1px solid #162033" },
  curveLabel: { color: "#1e3a5f", fontFamily: "monospace", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 },
  spinner: { fontSize: 40, textAlign: "center", color: "#0ea5e9" },
};
