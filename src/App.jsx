import { useState, useEffect, useRef } from "react";
import { auth, signInWithGoogle, logOut } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getWeatherForCity, getWeatherAlert } from "./weather";
import { speak, startListening, buildMorningBriefing } from "./voice";

const THEMES = {
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  border: "#2a2a3e",
  accent: "#7c6af7",
  accentGlow: "#7c6af740",
  gold: "#f0c060",
  green: "#4ade80",
  red: "#f87171",
  text: "#e8e6ff",
  muted: "#8884aa",
};

const SAMPLE_GOALS = [
  { id: 1, title: "Run a half marathon", category: "Health", progress: 35, target: "November 2026", color: "#4ade80" },
  { id: 2, title: "Read 24 books", category: "Learning", progress: 62, target: "December 2026", color: "#60a5fa" },
  { id: 3, title: "Launch side project", category: "Career", progress: 20, target: "June 2026", color: "#f0c060" },
  { id: 4, title: "Save $10,000", category: "Finance", progress: 47, target: "December 2026", color: "#c084fc" },
];

const SAMPLE_TASKS = [
  { id: 1, title: "Morning 5km run", goalId: 1, done: true, time: "07:00", priority: "high" },
  { id: 2, title: "Read 30 pages", goalId: 2, done: false, time: "08:30", priority: "medium" },
  { id: 3, title: "Work on landing page", goalId: 3, done: false, time: "10:00", priority: "high" },
  { id: 4, title: "Review budget spreadsheet", goalId: 4, done: false, time: "12:00", priority: "medium" },
  { id: 5, title: "Interval training", goalId: 1, done: false, time: "18:00", priority: "high" },
  { id: 6, title: "Read before bed", goalId: 2, done: false, time: "21:00", priority: "low" },
];

const API_KEY_PLACEHOLDER = import.meta.env.VITE_ANTHROPIC_API_KEY;

export default function DailyPlanner() {
  const [view, setView] = useState("dashboard");
  const [goals, setGoals] = useState(SAMPLE_GOALS);
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [alerts, setAlerts] = useState([
    { id: 1, msg: "🏃 Your run is in 30 minutes!", type: "reminder", time: new Date() },
    { id: 2, msg: "📚 You're 3 books ahead of schedule!", type: "success", time: new Date() },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", content: "Hi! I'm your planning assistant. Tell me about your day or ask me to help you plan tasks around your yearly goals. What's on your mind?" }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", goalId: "", time: "", priority: "medium" });
  const [newGoal, setNewGoal] = useState({ title: "", category: "", target: "" });
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [weather, setWeather] = useState(null);
  const [listening, setListening] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (user) {
      getWeatherForCity("Nairobi").then(w => {
        setWeather(w);
        tasks.forEach(task => {
          const alert = getWeatherAlert(w, task.title);
          if (alert) setAlerts(prev => [{ id: Date.now() + task.id, msg: alert, type: "reminder", time: new Date() }, ...prev]);
        });
      });
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const task = tasks.find(t => t.id === id);
    if (!task.done) {
      setAlerts(prev => [{ id: Date.now(), msg: `✅ "${task.title}" completed!`, type: "success", time: new Date() }, ...prev.slice(0, 4)]);
    }
  };

  const completedToday = tasks.filter(t => t.done).length;
  const totalToday = tasks.length;
  const progressPct = Math.round((completedToday / totalToday) * 100);

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);

    const systemPrompt = `You are an elite daily planning assistant integrated into a goal-tracking app. The user has these yearly goals:
${goals.map(g => `- "${g.title}" (${g.category}, ${g.progress}% complete, target: ${g.target})`).join("\n")}

Today's tasks:
${tasks.map(t => `- [${t.done ? "✓" : " "}] ${t.time} - ${t.title} (linked to goal: ${goals.find(g => g.id === t.goalId)?.title || "none"})`).join("\n")}

Be concise, motivating, and practical. Help the user plan their day, suggest task prioritization, break down goals into daily actions, and provide accountability insights. Keep responses under 150 words.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY_PLACEHOLDER,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...aiMessages, { role: "user", content: userMsg }],
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, I couldn't process that.";
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Connection issue. Please try again." }]);
    }
    setAiLoading(false);
  };

  const addTask = () => {
    if (!newTask.title) return;
    setTasks(prev => [...prev, { ...newTask, id: Date.now(), done: false, goalId: parseInt(newTask.goalId) || null }]);
    setNewTask({ title: "", goalId: "", time: "", priority: "medium" });
    setShowAddTask(false);
  };

  const addGoal = () => {
    if (!newGoal.title) return;
    const colors = ["#4ade80", "#60a5fa", "#f0c060", "#c084fc", "#f87171", "#34d399"];
    setGoals(prev => [...prev, { ...newGoal, id: Date.now(), progress: 0, color: colors[prev.length % colors.length] }]);
    setNewGoal({ title: "", category: "", target: "" });
    setShowAddGoal(false);
  };

  const dismissAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = currentTime.getDay();
  const priorityColors = { high: THEMES.red, medium: THEMES.gold, low: THEMES.muted };

  const navItems = [
    { id: "dashboard", icon: "⬡", label: "Home" },
    { id: "goals", icon: "◎", label: "Goals" },
    { id: "tasks", icon: "⊞", label: "Tasks" },
    { id: "chat", icon: "◉", label: "Coach" },
  ];

  // ─── Login Screen ───────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{
        minHeight: "100dvh", background: "#0a0a0f", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24,
        fontFamily: "'DM Sans', sans-serif", color: "#e8e6ff",
        padding: "0 24px", textAlign: "center",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
        <div style={{ fontSize: 48 }}>◈</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32 }}>Masaa Ni Machache</div>
        <p style={{ color: "#8884aa", fontSize: 14 }}>Your AI-powered daily planner</p>
        <button onClick={signInWithGoogle} style={{
          padding: "14px 32px", borderRadius: 12, background: "#7c6af7",
          color: "#fff", border: "none", cursor: "pointer", fontSize: 15,
          fontFamily: "inherit", fontWeight: 600, marginTop: 8,
        }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  // ─── Main App ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: THEMES.bg, color: THEMES.text,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      backgroundImage: `radial-gradient(ellipse at 20% 0%, #1e1240 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, #0d1a30 0%, transparent 60%)`,
      display: "flex", flexDirection: "column",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 4px; }
        input, textarea, select { outline: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .task-item:hover { background: #1e1e2e !important; }
        .goal-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px #7c6af720; }
        .btn-primary:hover { background: #9080ff !important; }
        .dismiss:hover { opacity: 1 !important; }
        .chat-input:focus { border-color: #7c6af7 !important; }
        .nav-tab:active { transform: scale(0.92); }

        /* ── Mobile defaults ── */
        .desktop-nav { display: none !important; }
        .bottom-nav { display: flex !important; }
        .header-user-name { display: none !important; }
        .weather-text { display: none !important; }
        .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .dashboard-cols { grid-template-columns: 1fr !important; }
        .goals-grid { grid-template-columns: 1fr !important; }
        .add-task-grid { grid-template-columns: 1fr !important; }
        .add-goal-grid { grid-template-columns: 1fr !important; }
        .main-pad { padding: 16px 16px 90px 16px !important; }
        .header-pad { padding: 12px 16px !important; }
        .page-title { font-size: 22px !important; }
        .chat-area { height: calc(100dvh - 175px) !important; }

        /* ── Desktop overrides ── */
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .bottom-nav { display: none !important; }
          .header-user-name { display: block !important; }
          .weather-text { display: block !important; }
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .dashboard-cols { grid-template-columns: 1fr 1fr !important; }
          .goals-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .add-task-grid { grid-template-columns: 2fr 1fr 1fr 1fr auto !important; }
          .add-goal-grid { grid-template-columns: 1fr 1fr 1fr auto !important; }
          .main-pad { padding: 24px 32px !important; }
          .header-pad { padding: 16px 32px !important; }
          .chat-area { height: calc(100vh - 200px) !important; }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="header-pad" style={{
        borderBottom: `1px solid ${THEMES.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `${THEMES.surface}cc`, backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100, flexShrink: 0, gap: 12,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `linear-gradient(135deg, ${THEMES.accent}, #a78bfa)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>◈</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, letterSpacing: "-0.3px" }}>MNM</div>
            <div style={{ fontSize: 10, color: THEMES.muted, letterSpacing: "0.5px" }}>DAILY PLANNING</div>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="desktop-nav" style={{ gap: 4 }}>
          {navItems.map(({ id, icon, label }) => (
            <button key={id} onClick={() => setView(id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
              background: view === id ? THEMES.accentGlow : "transparent",
              color: view === id ? THEMES.accent : THEMES.muted,
              transition: "all 0.2s", fontFamily: "inherit",
            }}>{icon} {label}</button>
          ))}
        </nav>

        {/* Right: weather + mic + user */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div className="weather-text" style={{ fontSize: 12, color: THEMES.muted, textAlign: "right" }}>
            {weather ? `${weather.temp}°C · ${weather.description}` : ""}
          </div>

          {/* Voice button */}
          <button onClick={() => {
            setListening(true);
            startListening((transcript) => {
              if (/what.*today|tasks today|schedule/i.test(transcript)) {
                speak(buildMorningBriefing(user, tasks, goals, weather));
              } else if (/add task/i.test(transcript)) {
                const title = transcript.replace(/add task/i, "").trim();
                if (title) {
                  setTasks(p => [...p, { id: Date.now(), title, done: false, priority: "medium" }]);
                  speak(`Added task: ${title}`);
                }
              } else {
                speak("Try saying: what do I have today, or add task followed by the task name.");
              }
            }, () => setListening(false));
          }} style={{
            width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
            background: listening ? THEMES.red : THEMES.accent, color: "#fff", fontSize: 15,
            flexShrink: 0, animation: listening ? "pulse 1s infinite" : "none",
          }}>🎙</button>

          {/* User info */}
          <div style={{ textAlign: "right" }}>
            <div className="header-user-name" style={{ fontSize: 12, fontWeight: 600 }}>{user?.displayName}</div>
            <button onClick={logOut} style={{ fontSize: 10, color: THEMES.muted, background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
          </div>
          <img src={user?.photoURL} alt="Profile" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} />
        </div>
      </header>

      {/* ── Alerts ───────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ padding: "8px 16px 0", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {alerts.slice(0, 2).map(alert => (
            <div key={alert.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px", borderRadius: 10, animation: "fadeIn 0.3s ease",
              background: alert.type === "success" ? "#4ade8015" : "#7c6af715",
              border: `1px solid ${alert.type === "success" ? "#4ade8040" : "#7c6af740"}`,
            }}>
              <span style={{ fontSize: 12 }}>{alert.msg}</span>
              <button className="dismiss" onClick={() => dismissAlert(alert.id)} style={{
                background: "none", border: "none", color: THEMES.muted, cursor: "pointer",
                opacity: 0.6, fontSize: 16, padding: "0 4px", transition: "opacity 0.2s", flexShrink: 0,
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="main-pad" style={{ flex: 1, overflowY: "auto", maxWidth: 1200, width: "100%", margin: "0 auto" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: 20 }}>
              <h1 className="page-title" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: 4 }}>
                Good {currentTime.getHours() < 12 ? "morning" : currentTime.getHours() < 17 ? "afternoon" : "evening"} ✦
              </h1>
              <p style={{ color: THEMES.muted, fontSize: 13 }}>Here's your planning overview for today.</p>
            </div>

            {/* Week strip */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
              {days.map((d, i) => (
                <div key={d} style={{
                  flex: "1 0 0", minWidth: 36, padding: "10px 6px", borderRadius: 12, textAlign: "center",
                  background: i === today ? THEMES.accent : THEMES.card,
                  border: `1px solid ${i === today ? "transparent" : THEMES.border}`,
                  transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 10, color: i === today ? "#fff" : THEMES.muted, marginBottom: 3 }}>{d}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: i === today ? "#fff" : THEMES.text }}>
                    {new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() - today + i).getDate()}
                  </div>
                  {i === today && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", margin: "3px auto 0" }} />}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Tasks Done", value: `${completedToday}/${totalToday}`, icon: "⊞", color: THEMES.accent },
                { label: "Daily Progress", value: `${progressPct}%`, icon: "◎", color: THEMES.green },
                { label: "Active Goals", value: goals.length, icon: "◈", color: THEMES.gold },
                { label: "Avg Progress", value: `${Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length)}%`, icon: "▲", color: "#c084fc" },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 16, borderRadius: 14, background: THEMES.card, border: `1px solid ${THEMES.border}`,
                }}>
                  <div style={{ fontSize: 20, marginBottom: 6, opacity: 0.8 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: THEMES.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ padding: 16, borderRadius: 14, background: THEMES.card, border: `1px solid ${THEMES.border}`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Today's Progress</span>
                <span style={{ color: THEMES.accent }}>{progressPct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: THEMES.border, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 8, width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${THEMES.accent}, #a78bfa)`,
                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: `0 0 12px ${THEMES.accentGlow}`,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: THEMES.muted }}>
                <span>{completedToday} completed</span>
                <span>{totalToday - completedToday} remaining</span>
              </div>
            </div>

            {/* Two columns */}
            <div className="dashboard-cols" style={{ display: "grid", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 14, background: THEMES.card, border: `1px solid ${THEMES.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 14 }}>Upcoming Tasks</h3>
                  <button onClick={() => setView("tasks")} style={{ fontSize: 12, color: THEMES.accent, background: "none", border: "none", cursor: "pointer" }}>See all →</button>
                </div>
                {tasks.filter(t => !t.done).slice(0, 4).map(task => (
                  <div key={task.id} className="task-item" onClick={() => toggleTask(task.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                    borderRadius: 8, cursor: "pointer", transition: "background 0.2s", marginBottom: 4,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, border: `2px solid ${THEMES.border}`, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: THEMES.muted }}>{task.time}</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColors[task.priority], flexShrink: 0 }} />
                  </div>
                ))}
              </div>

              <div style={{ padding: 16, borderRadius: 14, background: THEMES.card, border: `1px solid ${THEMES.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 14 }}>Goal Snapshot</h3>
                  <button onClick={() => setView("goals")} style={{ fontSize: 12, color: THEMES.accent, background: "none", border: "none", cursor: "pointer" }}>See all →</button>
                </div>
                {goals.map(g => (
                  <div key={g.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{g.title}</span>
                      <span style={{ color: g.color, fontWeight: 600, flexShrink: 0 }}>{g.progress}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 5, background: THEMES.border, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 5, width: `${g.progress}%`, background: g.color, opacity: 0.85 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GOALS */}
        {view === "goals" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h1 className="page-title" style={{ fontFamily: "'Playfair Display', serif", marginBottom: 2 }}>Yearly Goals</h1>
                <p style={{ color: THEMES.muted, fontSize: 12 }}>Track your long-term objectives.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddGoal(!showAddGoal)} style={{
                padding: "9px 16px", borderRadius: 10, background: THEMES.accent, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500,
                transition: "background 0.2s", flexShrink: 0,
              }}>+ Add Goal</button>
            </div>

            {showAddGoal && (
              <div style={{
                padding: 16, borderRadius: 14, background: THEMES.card, border: `1px solid ${THEMES.accent}40`,
                marginBottom: 20, animation: "fadeIn 0.3s ease",
              }}>
                <h3 style={{ marginBottom: 14, fontWeight: 600, fontSize: 14 }}>New Goal</h3>
                <div className="add-goal-grid" style={{ display: "grid", gap: 10 }}>
                  {[
                    { key: "title", placeholder: "Goal title", label: "Title" },
                    { key: "category", placeholder: "Health, Career...", label: "Category" },
                    { key: "target", placeholder: "December 2026", label: "Target Date" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 5 }}>{f.label}</label>
                      <input value={newGoal[f.key]} onChange={e => setNewGoal(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder} style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8,
                          background: THEMES.surface, border: `1px solid ${THEMES.border}`, color: THEMES.text,
                          fontSize: 13, fontFamily: "inherit",
                        }} />
                    </div>
                  ))}
                  <button className="btn-primary" onClick={addGoal} style={{
                    padding: "10px 20px", borderRadius: 8, background: THEMES.accent, color: "#fff",
                    border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                    transition: "background 0.2s", alignSelf: "end",
                  }}>Add</button>
                </div>
              </div>
            )}

            <div className="goals-grid" style={{ display: "grid", gap: 16 }}>
              {goals.map(g => {
                const linkedTasks = tasks.filter(t => t.goalId === g.id);
                const doneTasks = linkedTasks.filter(t => t.done).length;
                return (
                  <div key={g.id} className="goal-card" style={{
                    padding: 20, borderRadius: 18, background: THEMES.card,
                    border: `1px solid ${THEMES.border}`, transition: "all 0.3s",
                    borderLeft: `3px solid ${g.color}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ flex: 1, marginRight: 12 }}>
                        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{g.title}</h3>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${g.color}20`, color: g.color }}>{g.category}</span>
                          <span style={{ fontSize: 11, color: THEMES.muted }}>→ {g.target}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: g.color, flexShrink: 0 }}>{g.progress}%</div>
                    </div>
                    <div style={{ height: 8, borderRadius: 8, background: THEMES.border, overflow: "hidden", marginBottom: 10 }}>
                      <div style={{
                        height: "100%", borderRadius: 8, width: `${g.progress}%`,
                        background: `linear-gradient(90deg, ${g.color}99, ${g.color})`,
                        transition: "width 1s ease", boxShadow: `0 0 8px ${g.color}50`,
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEMES.muted }}>
                      <span>{linkedTasks.length} tasks linked · {doneTasks} done today</span>
                      <button onClick={() => setGoals(goals.map(gg => gg.id === g.id ? { ...gg, progress: Math.min(100, gg.progress + 5) } : gg))}
                        style={{ background: "none", border: "none", color: g.color, cursor: "pointer", fontSize: 12 }}>+5% ↑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TASKS */}
        {view === "tasks" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h1 className="page-title" style={{ fontFamily: "'Playfair Display', serif", marginBottom: 2 }}>Daily Tasks</h1>
                <p style={{ color: THEMES.muted, fontSize: 12 }}>{completedToday} of {totalToday} completed today</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddTask(!showAddTask)} style={{
                padding: "9px 16px", borderRadius: 10, background: THEMES.accent, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500,
                transition: "background 0.2s", flexShrink: 0,
              }}>+ Add Task</button>
            </div>

            {showAddTask && (
              <div style={{
                padding: 16, borderRadius: 14, background: THEMES.card, border: `1px solid ${THEMES.accent}40`,
                marginBottom: 20, animation: "fadeIn 0.3s ease",
              }}>
                <h3 style={{ marginBottom: 14, fontWeight: 600, fontSize: 14 }}>New Task</h3>
                <div className="add-task-grid" style={{ display: "grid", gap: 10 }}>
                  {[{ key: "title", label: "Task", placeholder: "What to do..." }, { key: "time", label: "Time", placeholder: "09:00" }].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 5 }}>{f.label}</label>
                      <input value={newTask[f.key]} onChange={e => setNewTask(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder} style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8,
                          background: THEMES.surface, border: `1px solid ${THEMES.border}`, color: THEMES.text,
                          fontSize: 13, fontFamily: "inherit",
                        }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 5 }}>Goal</label>
                    <select value={newTask.goalId} onChange={e => setNewTask(p => ({ ...p, goalId: e.target.value }))} style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      background: THEMES.surface, border: `1px solid ${THEMES.border}`, color: THEMES.text,
                      fontSize: 13, fontFamily: "inherit",
                    }}>
                      <option value="">None</option>
                      {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 5 }}>Priority</label>
                    <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      background: THEMES.surface, border: `1px solid ${THEMES.border}`, color: THEMES.text,
                      fontSize: 13, fontFamily: "inherit",
                    }}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <button className="btn-primary" onClick={addTask} style={{
                    padding: "10px 20px", borderRadius: 8, background: THEMES.accent, color: "#fff",
                    border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                    transition: "background 0.2s", alignSelf: "end",
                  }}>Add</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(task => {
                const goal = goals.find(g => g.id === task.goalId);
                return (
                  <div key={task.id} className="task-item" style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 14px",
                    borderRadius: 12, background: THEMES.card, border: `1px solid ${THEMES.border}`,
                    cursor: "pointer", transition: "background 0.2s", opacity: task.done ? 0.5 : 1,
                  }} onClick={() => toggleTask(task.id)}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${task.done ? THEMES.green : THEMES.border}`,
                      background: task.done ? THEMES.green : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                    }}>
                      {task.done && <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ width: 44, fontSize: 11, color: THEMES.muted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{task.time}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, textDecoration: task.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                      {goal && <div style={{ fontSize: 11, color: goal.color, marginTop: 1 }}>◈ {goal.title}</div>}
                    </div>
                    <div style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                      background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority],
                    }}>{task.priority}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI COACH */}
        {view === "chat" && (
          <div className="chat-area" style={{ animation: "fadeIn 0.4s ease", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 14, flexShrink: 0 }}>
              <h1 className="page-title" style={{ fontFamily: "'Playfair Display', serif", marginBottom: 2 }}>AI Planning Coach</h1>
              <p style={{ color: THEMES.muted, fontSize: 12 }}>Powered by Claude · Knows your goals and daily schedule</p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 2px", display: "flex", flexDirection: "column", gap: 12 }}>
              {aiMessages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  animation: "fadeIn 0.3s ease",
                }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${THEMES.accent}, #a78bfa)`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                      marginRight: 8, flexShrink: 0, marginTop: 2,
                    }}>◈</div>
                  )}
                  <div style={{
                    maxWidth: "78%", padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? THEMES.accent : THEMES.card,
                    border: msg.role === "user" ? "none" : `1px solid ${THEMES.border}`,
                    fontSize: 13, lineHeight: 1.6, color: msg.role === "user" ? "#fff" : THEMES.text,
                  }}>{msg.content}</div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex", gap: 6, padding: "0 0 0 36px" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: THEMES.accent,
                      animation: `pulse 1.2s ease infinite`, animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{
              display: "flex", gap: 10, marginTop: 12, padding: 12, flexShrink: 0,
              background: THEMES.card, borderRadius: 14, border: `1px solid ${THEMES.border}`,
            }}>
              <input
                className="chat-input"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAiMessage()}
                placeholder="Ask your coach anything..."
                style={{
                  flex: 1, background: "transparent", border: `1px solid ${THEMES.border}`, borderRadius: 10,
                  padding: "10px 12px", color: THEMES.text, fontSize: 13, fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
              />
              <button className="btn-primary" onClick={sendAiMessage} disabled={aiLoading} style={{
                padding: "10px 16px", borderRadius: 10, background: aiLoading ? THEMES.border : THEMES.accent,
                color: "#fff", border: "none", cursor: aiLoading ? "not-allowed" : "pointer",
                fontSize: 13, fontFamily: "inherit", fontWeight: 500, transition: "background 0.2s", flexShrink: 0,
              }}>{aiLoading ? "···" : "↑"}</button>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Nav (mobile only) ──────────────────────────────── */}
      <nav className="bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: `${THEMES.surface}f2`, backdropFilter: "blur(20px)",
        borderTop: `1px solid ${THEMES.border}`,
        justifyContent: "space-around", alignItems: "center",
        padding: "8px 0 16px",
      }}>
        {navItems.map(({ id, icon, label }) => (
          <button key={id} className="nav-tab" onClick={() => setView(id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", padding: "4px 20px",
            color: view === id ? THEMES.accent : THEMES.muted, transition: "color 0.2s",
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: view === id ? 600 : 400 }}>{label}</span>
            {view === id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: THEMES.accent }} />}
          </button>
        ))}
      </nav>
    </div>
  );
}