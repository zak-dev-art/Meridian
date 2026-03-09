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
  goldGlow: "#f0c06030",
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

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = currentTime.getDay();
  const priorityColors = { high: THEMES.red, medium: THEMES.gold, low: THEMES.muted };

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0f", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24,
        fontFamily: "'DM Sans', sans-serif", color: "#e8e6ff",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
        <div style={{ fontSize: 40 }}>◈</div>
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

  return (
    <div style={{
      minHeight: "100vh", background: THEMES.bg, color: THEMES.text,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      backgroundImage: `radial-gradient(ellipse at 20% 0%, #1e1240 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, #0d1a30 0%, transparent 60%)`,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 4px; }
        input, textarea, select { outline: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .task-item:hover { background: #1e1e2e !important; }
        .nav-btn:hover { background: #1e1e2e !important; }
        .goal-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px #7c6af720; }
        .btn-primary:hover { background: #9080ff !important; }
        .dismiss:hover { opacity: 1 !important; }
        .chat-input:focus { border-color: #7c6af7 !important; }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "20px 32px", borderBottom: `1px solid ${THEMES.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `${THEMES.surface}cc`, backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${THEMES.accent}, #a78bfa)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>◈</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, letterSpacing: "-0.3px" }}>MNM</div>
            <div style={{ fontSize: 11, color: THEMES.muted, letterSpacing: "0.5px" }}>DAILY PLANNING</div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {[["dashboard", "⬡ Dashboard"], ["goals", "◎ Goals"], ["tasks", "⊞ Tasks"], ["chat", "◉ AI Coach"]].map(([v, label]) => (
            <button key={v} className="nav-btn" onClick={() => setView(v)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
              background: view === v ? THEMES.accentGlow : "transparent",
              color: view === v ? THEMES.accent : THEMES.muted,
              transition: "all 0.2s", fontFamily: "inherit",
            }}>{label}</button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {weather && (
            <div style={{ fontSize: 13, color: "#8884aa" }}>
              {weather.temp}°C · {weather.description}
            </div>
          )}
          <button onClick={() => {
            setListening(true);
            startListening((transcript) => {
              if (/what.*today|tasks today|schedule/i.test(transcript)) {
                speak(buildMorningBriefing(user, tasks, goals, weather));
              } else if (/add task/i.test(transcript)) {
                const title = transcript.replace(/add task/i, "").trim();
                if (title) { setTasks(p => [...p, { id: Date.now(), title, done: false, priority: "medium" }]); speak(`Added task: ${title}`); }
              } else {
                speak("I didn't understand that. Try saying: what do I have today, or add task followed by the task name.");
              }
            }, () => setListening(false));
          }} style={{
            width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
            background: listening ? "#f87171" : "#7c6af7", color: "#fff", fontSize: 16,
            animation: listening ? "pulse 1s infinite" : "none",
          }}>🎙</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.displayName}</div>
            <button onClick={logOut} style={{ fontSize: 11, color: "#8884aa", background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
          </div>
          <img src={user?.photoURL} alt="Profile" style={{ width: 34, height: 34, borderRadius: "50%" }} />
        </div>
      </header>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ padding: "12px 32px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderRadius: 10, animation: "fadeIn 0.3s ease",
              background: alert.type === "success" ? "#4ade8015" : "#7c6af715",
              border: `1px solid ${alert.type === "success" ? "#4ade8040" : "#7c6af740"}`,
            }}>
              <span style={{ fontSize: 13 }}>{alert.msg}</span>
              <button className="dismiss" onClick={() => dismissAlert(alert.id)} style={{
                background: "none", border: "none", color: THEMES.muted, cursor: "pointer", opacity: 0.6,
                fontSize: 16, padding: "0 4px", transition: "opacity 0.2s",
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      <main style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                Good {currentTime.getHours() < 12 ? "morning" : currentTime.getHours() < 17 ? "afternoon" : "evening"} ✦
              </h1>
              <p style={{ color: THEMES.muted, fontSize: 14 }}>Here's your planning overview for today.</p>
            </div>

            {/* Week strip */}
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              {days.map((d, i) => (
                <div key={d} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center",
                  background: i === today ? THEMES.accent : THEMES.card,
                  border: `1px solid ${i === today ? "transparent" : THEMES.border}`,
                  transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 11, color: i === today ? "#fff" : THEMES.muted, marginBottom: 4 }}>{d}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: i === today ? "#fff" : THEMES.text }}>
                    {new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() - today + i).getDate()}
                  </div>
                  {i === today && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", margin: "4px auto 0" }} />}
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Tasks Done", value: `${completedToday}/${totalToday}`, icon: "⊞", color: THEMES.accent },
                { label: "Daily Progress", value: `${progressPct}%`, icon: "◎", color: THEMES.green },
                { label: "Active Goals", value: goals.length, icon: "◈", color: THEMES.gold },
                { label: "Avg Goal Progress", value: `${Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length)}%`, icon: "▲", color: "#c084fc" },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 20, borderRadius: 16, background: THEMES.card, border: `1px solid ${THEMES.border}`,
                  transition: "all 0.3s",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: THEMES.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Today's progress bar */}
            <div style={{ padding: 20, borderRadius: 16, background: THEMES.card, border: `1px solid ${THEMES.border}`, marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>Today's Progress</span>
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
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: THEMES.muted }}>
                <span>{completedToday} completed</span>
                <span>{totalToday - completedToday} remaining</span>
              </div>
            </div>

            {/* Two columns: upcoming tasks + goal snapshot */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ padding: 20, borderRadius: 16, background: THEMES.card, border: `1px solid ${THEMES.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 15 }}>Upcoming Tasks</h3>
                  <button onClick={() => setView("tasks")} style={{ fontSize: 12, color: THEMES.accent, background: "none", border: "none", cursor: "pointer" }}>See all →</button>
                </div>
                {tasks.filter(t => !t.done).slice(0, 4).map(task => (
                  <div key={task.id} className="task-item" onClick={() => toggleTask(task.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 8px",
                    borderRadius: 8, cursor: "pointer", transition: "background 0.2s", marginBottom: 4,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, border: `2px solid ${THEMES.border}`,
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: THEMES.muted }}>{task.time}</div>
                    </div>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: priorityColors[task.priority],
                    }} />
                  </div>
                ))}
              </div>

              <div style={{ padding: 20, borderRadius: 16, background: THEMES.card, border: `1px solid ${THEMES.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 15 }}>Goal Snapshot</h3>
                  <button onClick={() => setView("goals")} style={{ fontSize: 12, color: THEMES.accent, background: "none", border: "none", cursor: "pointer" }}>See all →</button>
                </div>
                {goals.map(g => (
                  <div key={g.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span>{g.title}</span>
                      <span style={{ color: g.color, fontWeight: 600 }}>{g.progress}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 5, background: THEMES.border, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 5, width: `${g.progress}%`,
                        background: g.color, opacity: 0.85, transition: "width 1s ease",
                      }} />
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, marginBottom: 4 }}>Yearly Goals</h1>
                <p style={{ color: THEMES.muted, fontSize: 13 }}>Track your long-term objectives and milestones.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddGoal(!showAddGoal)} style={{
                padding: "10px 20px", borderRadius: 10, background: THEMES.accent, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500,
                transition: "background 0.2s",
              }}>+ Add Goal</button>
            </div>

            {showAddGoal && (
              <div style={{
                padding: 20, borderRadius: 16, background: THEMES.card, border: `1px solid ${THEMES.accent}40`,
                marginBottom: 24, animation: "fadeIn 0.3s ease",
              }}>
                <h3 style={{ marginBottom: 16, fontWeight: 600 }}>New Goal</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  {[
                    { key: "title", placeholder: "Goal title", label: "Title" },
                    { key: "category", placeholder: "Health, Career...", label: "Category" },
                    { key: "target", placeholder: "December 2026", label: "Target Date" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 6 }}>{f.label}</label>
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
                    border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", height: 40,
                    transition: "background 0.2s",
                  }}>Add</button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              {goals.map(g => {
                const linkedTasks = tasks.filter(t => t.goalId === g.id);
                const doneTasks = linkedTasks.filter(t => t.done).length;
                return (
                  <div key={g.id} className="goal-card" style={{
                    padding: 24, borderRadius: 20, background: THEMES.card,
                    border: `1px solid ${THEMES.border}`, transition: "all 0.3s",
                    borderLeft: `3px solid ${g.color}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <div>
                        <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{g.title}</h3>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 20,
                            background: `${g.color}20`, color: g.color,
                          }}>{g.category}</span>
                          <span style={{ fontSize: 11, color: THEMES.muted }}>→ {g.target}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: g.color }}>{g.progress}%</div>
                    </div>
                    <div style={{ height: 8, borderRadius: 8, background: THEMES.border, overflow: "hidden", marginBottom: 12 }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, marginBottom: 4 }}>Daily Tasks</h1>
                <p style={{ color: THEMES.muted, fontSize: 13 }}>{completedToday} of {totalToday} completed today</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddTask(!showAddTask)} style={{
                padding: "10px 20px", borderRadius: 10, background: THEMES.accent, color: "#fff",
                border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500,
                transition: "background 0.2s",
              }}>+ Add Task</button>
            </div>

            {showAddTask && (
              <div style={{
                padding: 20, borderRadius: 16, background: THEMES.card, border: `1px solid ${THEMES.accent}40`,
                marginBottom: 24, animation: "fadeIn 0.3s ease",
              }}>
                <h3 style={{ marginBottom: 16, fontWeight: 600 }}>New Task</h3>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  {[{ key: "title", label: "Task", placeholder: "What to do..." }, { key: "time", label: "Time", placeholder: "09:00" }].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 6 }}>{f.label}</label>
                      <input value={newTask[f.key]} onChange={e => setNewTask(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder} style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8,
                          background: THEMES.surface, border: `1px solid ${THEMES.border}`, color: THEMES.text,
                          fontSize: 13, fontFamily: "inherit",
                        }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 6 }}>Goal</label>
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
                    <label style={{ fontSize: 11, color: THEMES.muted, display: "block", marginBottom: 6 }}>Priority</label>
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
                    border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", height: 40,
                    transition: "background 0.2s",
                  }}>Add</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(task => {
                const goal = goals.find(g => g.id === task.goalId);
                return (
                  <div key={task.id} className="task-item" style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "14px 18px",
                    borderRadius: 12, background: THEMES.card, border: `1px solid ${THEMES.border}`,
                    cursor: "pointer", transition: "background 0.2s",
                    opacity: task.done ? 0.5 : 1,
                  }} onClick={() => toggleTask(task.id)}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${task.done ? THEMES.green : THEMES.border}`,
                      background: task.done ? THEMES.green : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                    }}>
                      {task.done && <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ width: 50, fontSize: 12, color: THEMES.muted, fontVariantNumeric: "tabular-nums" }}>{task.time}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, textDecoration: task.done ? "line-through" : "none" }}>{task.title}</div>
                      {goal && <div style={{ fontSize: 11, color: goal.color, marginTop: 2 }}>◈ {goal.title}</div>}
                    </div>
                    <div style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
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
          <div style={{ animation: "fadeIn 0.4s ease", height: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, marginBottom: 4 }}>AI Planning Coach</h1>
              <p style={{ color: THEMES.muted, fontSize: 13 }}>Powered by Claude · Knows your goals and daily schedule</p>
            </div>

            <div style={{
              flex: 1, overflowY: "auto", padding: "0 4px", display: "flex", flexDirection: "column", gap: 16,
            }}>
              {aiMessages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  animation: "fadeIn 0.3s ease",
                }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${THEMES.accent}, #a78bfa)`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                      marginRight: 10, flexShrink: 0, marginTop: 2,
                    }}>◈</div>
                  )}
                  <div style={{
                    maxWidth: "70%", padding: "12px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? THEMES.accent : THEMES.card,
                    border: msg.role === "user" ? "none" : `1px solid ${THEMES.border}`,
                    fontSize: 14, lineHeight: 1.6, color: msg.role === "user" ? "#fff" : THEMES.text,
                  }}>{msg.content}</div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex", gap: 8, padding: "0 0 0 42px" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: "50%", background: THEMES.accent,
                      animation: `pulse 1.2s ease infinite`, animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{
              display: "flex", gap: 12, marginTop: 16, padding: 16,
              background: THEMES.card, borderRadius: 16, border: `1px solid ${THEMES.border}`,
            }}>
              <input
                className="chat-input"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAiMessage()}
                placeholder="Ask your coach... 'What should I focus on today?' or 'Help me plan my week'"
                style={{
                  flex: 1, background: "transparent", border: `1px solid ${THEMES.border}`, borderRadius: 10,
                  padding: "10px 14px", color: THEMES.text, fontSize: 14, fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
              />
              <button className="btn-primary" onClick={sendAiMessage} disabled={aiLoading} style={{
                padding: "10px 20px", borderRadius: 10, background: aiLoading ? THEMES.border : THEMES.accent,
                color: "#fff", border: "none", cursor: aiLoading ? "not-allowed" : "pointer",
                fontSize: 13, fontFamily: "inherit", fontWeight: 500, transition: "background 0.2s",
              }}>{aiLoading ? "···" : "Send ↑"}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}