import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Constants ────────────────────────────────────────────────────────────────
const COLORS = ["#e07b54","#5b9bd5","#6dbf8b","#c07dd4","#e6b84a","#e05470","#5bbfbf","#a0b060"];

// ── Small UI helpers ─────────────────────────────────────────────────────────
function getPlayerColor(name, players) {
  const idx = players.findIndex(p => p.name === name);
  return idx >= 0 ? players[idx].color : "#888";
}

function Avatar({ name, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Playfair Display', serif", fontWeight: 700,
      fontSize: size * 0.38, color: "#0e1520", flexShrink: 0,
      boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
    }}>
      {name[0].toUpperCase()}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(8,12,24,0.85)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={onClose}>
      <div style={{
        background: "#1e2535", border: "1px solid #364a6a", borderRadius: 16,
        padding: 28, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 60px rgba(0,0,0,0.7)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 25, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff", fontSize: 25, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: "#ffffff", fontSize: 14, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{label}</label>}
      <input {...props} style={{
        width: "100%", background: "#252e40", border: "1px solid #364a6a", borderRadius: 8,
        color: "#ffffff", padding: "9px 12px", fontSize: 16, fontFamily: "Georgia, serif",
        outline: "none", boxSizing: "border-box", ...props.style
      }} />
    </div>
  );
}

function Btn({ children, variant = "primary", ...props }) {
  const styles = {
    primary:   { background: "linear-gradient(135deg,#4a7ab8,#2d5a90)", color: "#e8f0ff", border: "none" },
    secondary: { background: "transparent", color: "#ffffff", border: "1px solid #364a6a" },
    danger:    { background: "transparent", color: "#d06080", border: "1px solid #4a2840" },
  };
  return (
    <button {...props} style={{
      padding: "9px 18px", borderRadius: 8, cursor: "pointer",
      fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600,
      transition: "opacity .15s", ...styles[variant], ...props.style
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = ".8"}
    onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      {children}
    </button>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "#1a2e3a", border: "1px solid #2a5048", color: "#70c090",
      padding: "10px 20px", borderRadius: 10, fontFamily: "Georgia, serif", fontSize: 16,
      zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
    }}>
      {message}
    </div>
  );
}

// ── Responsive hook ──────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const windowWidth = useWindowWidth();
  const isDesktop = windowWidth >= 1024;
  const isTablet  = windowWidth >= 640;
  const maxW = isDesktop ? 1140 : isTablet ? 740 : "100%";
  const [tab, setTab]               = useState("plays");
  const [plays, setPlays]           = useState([]);
  const [games, setGames]           = useState([]);
  const [players, setPlayers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);

  const [showAddPlay, setShowAddPlay]     = useState(false);
  const [showAddGame, setShowAddGame]     = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedPlay, setSelectedPlay]   = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedGame, setSelectedGame]   = useState(null);
  const [saving, setSaving]               = useState(false);
  const [editingPlay, setEditingPlay]     = useState(null);

  const [form, setForm]         = useState({ game: "", date: new Date().toISOString().slice(0,10), selectedPlayers: [], winners: [], scores: {}, coop: false, rpsWinner: "" });
  const [newGame, setNewGame]   = useState("");
  const [newPlayer, setNewPlayer] = useState("");

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: gData }, { data: pData }, { data: plData }] = await Promise.all([
      supabase.from("games").select("*").order("name"),
      supabase.from("players").select("*").order("created_at"),
      supabase.from("plays").select("*").order("created_at", { ascending: false }),
    ]);
    if (gData)  setGames(gData.map(g => g.name));
    if (pData)  setPlayers(pData.map(p => ({ name: p.name, color: p.color })));
    if (plData) setPlays(plData);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function notify(msg) { setToast(msg); }
  function resetForm() { setForm({ game: "", date: new Date().toISOString().slice(0,10), selectedPlayers: [], winners: [], scores: {}, coop: false, rpsWinner: "" }); }

  // ── Form helpers ───────────────────────────────────────────────────────────
  function togglePlayer(name) {
    setForm(f => {
      const has = f.selectedPlayers.includes(name);
      const selectedPlayers = has ? f.selectedPlayers.filter(p => p !== name) : [...f.selectedPlayers, name];
      return { ...f, selectedPlayers, winners: f.winners.filter(w => selectedPlayers.includes(w)) };
    });
  }

  function toggleWinner(name) {
    setForm(f => f.coop
      ? { ...f, winners: f.winners.includes(name) ? f.winners.filter(w => w !== name) : [...f.winners, name] }
      : { ...f, winners: f.winners.includes(name) ? [] : [name] }
    );
  }

  function startEditPlay(play) {
    setForm({
      game: play.game, date: play.date, selectedPlayers: play.players,
      winners: play.winners, scores: play.scores || {}, coop: play.coop || false,
      rpsWinner: play.rps_winner || "",
    });
    setEditingPlay(play);
    setSelectedPlay(null);
    setSelectedGame(null);
    setShowAddPlay(true);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function submitPlay() {
    if (!form.game || form.selectedPlayers.length < 2 || saving) return;
    setSaving(true);
    const payload = {
      game: form.game, date: form.date, players: form.selectedPlayers,
      winners: form.winners, scores: form.scores, coop: form.coop,
      rps_winner: form.rpsWinner || null,
    };
    const { error } = editingPlay
      ? await supabase.from("plays").update(payload).eq("id", editingPlay.id)
      : await supabase.from("plays").insert(payload);
    setSaving(false);
    if (error) { alert("Error saving play: " + error.message); return; }
    await loadAll();
    setShowAddPlay(false);
    setEditingPlay(null);
    resetForm();
    notify(editingPlay ? "Play updated!" : "Play logged! 🎲");
  }

  async function deletePlay(id) {
    const { error } = await supabase.from("plays").delete().eq("id", id);
    if (error) { alert("Error deleting: " + error.message); return; }
    await loadAll();
    setSelectedPlay(null);
    notify("Play deleted.");
  }

  async function addGame() {
    const name = newGame.trim();
    if (!name) return;
    const { error } = await supabase.from("games").insert({ name });
    if (error) { alert("Error: " + error.message); return; }
    await loadAll();
    setNewGame("");
    setShowAddGame(false);
    notify(`"${name}" added to library!`);
  }

  async function addPlayer() {
    const name = newPlayer.trim();
    if (!name) return;
    const color = COLORS[players.length % COLORS.length];
    const { error } = await supabase.from("players").insert({ name, color });
    if (error) { alert("Error: " + error.message); return; }
    await loadAll();
    setNewPlayer("");
    setShowAddPlayer(false);
    notify(`${name} joined the crew!`);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {};
  players.forEach(p => { stats[p.name] = { plays: 0, wins: 0 }; });
  plays.forEach(play => {
    play.players.forEach(p => { if (stats[p]) stats[p].plays++; });
    play.winners.forEach(p => { if (stats[p]) stats[p].wins++; });
  });
  const gameCounts = {};
  const gameLastPlayed = {};
  const gameWinCounts = {};
  plays.forEach(p => {
    gameCounts[p.game] = (gameCounts[p.game] || 0) + 1;
    if (!gameLastPlayed[p.game] || p.date > gameLastPlayed[p.game]) gameLastPlayed[p.game] = p.date;
    if (!gameWinCounts[p.game]) gameWinCounts[p.game] = {};
    p.winners.forEach(w => { gameWinCounts[p.game][w] = (gameWinCounts[p.game][w] || 0) + 1; });
  });
  const gameTopWinner = {};
  Object.entries(gameWinCounts).forEach(([game, wc]) => {
    const sorted = Object.entries(wc).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return;
    const maxWins = sorted[0][1];
    const tied = sorted.filter(([, w]) => w === maxWins);
    gameTopWinner[game] = { name: tied.map(([n]) => n).join(" & "), wins: maxWins };
  });
  const topGame = Object.entries(gameCounts).sort((a,b) => b[1]-a[1])[0];
  const leaderboard = players.map(p => ({ ...p, ...stats[p.name] })).sort((a,b) => b.wins - a.wins || b.plays - a.plays);

  const TABS = ["plays","library","players","stats"];
  const TAB_ICONS = { plays:"🎲", library:"📚", players:"👥", stats:"🏆" };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#131a27", fontFamily: "Georgia, serif", color: "#ffffff" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#1e2535,#171d2b)", borderBottom: "1px solid #2c3d58", padding: "20px 24px 16px" }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: "#ffffff", margin: 0 }}>SBZO Board Game Tracker</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#171d2b", borderBottom: "1px solid #242f45", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", display: "flex" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "12px 6px", background: "none", border: "none",
              borderBottom: tab === t ? "2px solid #6a9ed4" : "2px solid transparent",
              color: tab === t ? "#90b8e8" : "#485c78", cursor: "pointer",
              fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600,
              textTransform: "capitalize", transition: "color .15s"
            }}>
              {TAB_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: maxW, margin: "0 auto", padding: "20px 16px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#ffffff", fontStyle: "italic" }}>
            Loading your game night data…
          </div>
        )}

        {!loading && (
          <>
            {/* PLAYS TAB */}
            {tab === "plays" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", margin: 0, fontSize: 21 }}>Recent Plays</h2>
                  <Btn onClick={() => { resetForm(); setShowAddPlay(true); }}>+ Log Play</Btn>
                </div>
                {plays.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#ffffff" }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>🎲</div>
                    <p style={{ fontStyle: "italic" }}>No plays logged yet. Start by clicking "Log Play"!</p>
                  </div>
                )}
                <div>
                {[...plays].sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at)).map(play => (
                  <div key={play.id} onClick={() => setSelectedPlay(play)} style={{
                    background: "#1e2535", border: "1px solid #2c3d58", borderRadius: 12,
                    padding: "14px 16px", marginBottom: 10, cursor: "pointer",
                    transition: "border-color .15s, transform .1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a6890"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#2c3d58"; e.currentTarget.style.transform = "none"; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#ffffff", fontSize: 19, flex: 1 }}>{play.game}</span>
                      {play.coop && <span style={{ fontSize: 12, background: "#1a2e3a", color: "#70b090", padding: "2px 7px", borderRadius: 10, fontFamily: "monospace" }}>CO-OP</span>}
                      <span style={{ color: "#ffffff", fontSize: 14, fontFamily: "monospace" }}>{play.date}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {play.players.map(p => <Avatar key={p} name={p} color={getPlayerColor(p, players)} size={26} />)}
                      {play.winners.length > 0 && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#2a2010", border: "1px solid #6a5020", borderRadius: 8, padding: "4px 10px", marginLeft: "auto" }}>
                          <span style={{ fontSize: 14 }}>🏆</span>
                          <span style={{ fontSize: 15, color: "#e8c050", fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{play.winners.join(" & ")}</span>
                        </div>
                      )}
                    </div>
                    {play.scores && Object.keys(play.scores).length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {play.players.filter(p => play.scores[p]).map(p => (
                          <span key={p} style={{ fontSize: 13, fontFamily: "monospace", color: "#ffffff" }}>
                            {p}: <span style={{ color: "#ffffff" }}>{play.scores[p]}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                </div>
              </div>
            )}

            {/* LIBRARY TAB */}
            {tab === "library" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", margin: 0, fontSize: 21 }}>Game Library</h2>
                  <Btn onClick={() => setShowAddGame(true)}>+ Add Game</Btn>
                </div>
                {games.length === 0 && <p style={{ color: "#ffffff", fontStyle: "italic" }}>No games yet — add some!</p>}
                <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
                  {games.map(g => (
                    <div key={g} onClick={() => setSelectedGame(g)} style={{
                      background: "#1e2535", border: "1px solid #2c3d58", borderRadius: 10,
                      padding: "12px 14px", cursor: "pointer", transition: "border-color .15s, transform .1s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a6890"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#2c3d58"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: gameCounts[g] ? 8 : 0 }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 17 }}>{g}</span>
                        <span style={{ fontSize: 13, color: "#ffffff", fontFamily: "monospace", flexShrink: 0, marginLeft: 8 }}>{gameCounts[g] || 0}×</span>
                      </div>
                      {gameTopWinner[g] && (
                        <div style={{ fontSize: 13, color: "#d4aa3a", fontFamily: "monospace" }}>🏆 {gameTopWinner[g].name} ({gameTopWinner[g].wins}W)</div>
                      )}
                      {gameLastPlayed[g] && (
                        <div style={{ fontSize: 13, color: "#ffffff", fontFamily: "monospace", marginTop: 3 }}>Last: {gameLastPlayed[g]}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PLAYERS TAB */}
            {tab === "players" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", margin: 0, fontSize: 21 }}>Players</h2>
                  <Btn onClick={() => setShowAddPlayer(true)}>+ Add Player</Btn>
                </div>
                {players.length === 0 && <p style={{ color: "#ffffff", fontStyle: "italic" }}>No players yet — add some!</p>}
                <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {players.map(p => (
                  <div key={p.name} onClick={() => setSelectedPlayer(p)} style={{
                    background: "#1e2535", border: "1px solid #2c3d58", borderRadius: 12,
                    padding: "14px 16px", marginBottom: isDesktop ? 0 : 10,
                    display: "flex", alignItems: "center", gap: 14,
                    cursor: "pointer", transition: "border-color .15s, transform .1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a6890"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#2c3d58"; e.currentTarget.style.transform = "none"; }}>
                    <Avatar name={p.name} color={p.color} size={42} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 19, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 14, color: "#ffffff", marginTop: 2 }}>
                        {stats[p.name]?.plays || 0} plays · {stats[p.name]?.wins || 0} wins
                        {stats[p.name]?.plays > 0 && ` · ${Math.round((stats[p.name].wins / stats[p.name].plays) * 100)}% win rate`}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}

            {/* STATS TAB */}
            {tab === "stats" && (
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", margin: "0 0 16px", fontSize: 21 }}>Leaderboard</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Total Plays", value: plays.length, icon: "🎲" },
                    { label: "Games", value: games.length, icon: "📚" },
                    { label: "Top Game", value: topGame ? topGame[0] : "—", icon: "⭐" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#1e2535", border: "1px solid #2c3d58", borderRadius: 10, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 25 }}>{s.icon}</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 21, fontWeight: 700 }}>{s.value}</div>
                      <div style={{ fontSize: 13, color: "#ffffff", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {leaderboard.map((p, i) => {
                  const winRate = p.plays > 0 ? Math.round((p.wins / p.plays) * 100) : 0;
                  return (
                    <div key={p.name} onClick={() => setSelectedPlayer(p)} style={{
                      background: i === 0 && p.wins > 0 ? "linear-gradient(135deg,#1e2a40,#1e2535)" : "#1e2535",
                      border: `1px solid ${i === 0 && p.wins > 0 ? "#405878" : "#2c3d58"}`,
                      borderRadius: 12, padding: "14px 16px", marginBottom: 10,
                      display: "flex", alignItems: "center", gap: 14,
                      cursor: "pointer", transition: "border-color .15s, transform .1s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a6890"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = i === 0 && p.wins > 0 ? "#405878" : "#2c3d58"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ width: 28, textAlign: "center", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 19, color: i < 3 ? ["#d4aa3a","#c0c0c0","#cd8540"][i] : "#ffffff" }}>
                        {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                      </div>
                      <Avatar name={p.name} color={p.color} size={38} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: 14, color: "#ffffff" }}>{p.plays} plays · {p.wins} wins</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", color: "#d4aa3a", fontWeight: 700, fontSize: 21 }}>{winRate}%</div>
                        <div style={{ fontSize: 12, color: "#ffffff", fontFamily: "monospace" }}>WIN RATE</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ADD PLAY MODAL ── */}
      {showAddPlay && (
        <Modal title={editingPlay ? "Edit Play" : "Log a Play"} onClose={() => { setShowAddPlay(false); setEditingPlay(null); resetForm(); }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: "#ffffff", fontSize: 14, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Game</label>
            <select value={form.game} onChange={e => setForm(f => ({ ...f, game: e.target.value }))} style={{
              width: "100%", background: "#252e40", border: "1px solid #364a6a", borderRadius: 8,
              color: "#ffffff", padding: "9px 12px", fontSize: 16, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box"
            }}>
              <option value="">Select a game…</option>
              {games.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: "#ffffff", fontSize: 14, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Players</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {players.map(p => {
                const sel = form.selectedPlayers.includes(p.name);
                return (
                  <button key={p.name} onClick={() => togglePlayer(p.name)} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
                    border: sel ? `1px solid ${p.color}` : "1px solid #2c3d58",
                    background: sel ? `${p.color}22` : "transparent", cursor: "pointer",
                    color: sel ? p.color : "#485c78", fontFamily: "Georgia, serif", fontSize: 15
                  }}>
                    <Avatar name={p.name} color={p.color} size={20} />{p.name}
                  </button>
                );
              })}
            </div>
          </div>
          {form.selectedPlayers.length >= 2 && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#ffffff", fontSize: 14, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>✌️ RPS — Who Goes First? <span style={{ color: "#ffffff" }}>(optional)</span></label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {form.selectedPlayers.map(name => {
                    const sel = form.rpsWinner === name;
                    const p = players.find(x => x.name === name);
                    return (
                      <button key={name} onClick={() => setForm(f => ({ ...f, rpsWinner: sel ? "" : name }))} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
                        border: sel ? `1px solid #70b090` : "1px solid #2c3d58",
                        background: sel ? "#1a3028" : "transparent", cursor: "pointer",
                        color: sel ? "#70b090" : "#485c78", fontFamily: "Georgia, serif", fontSize: 15
                      }}>
                        <Avatar name={name} color={p?.color || "#888"} size={20} />{name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ color: "#ffffff", fontSize: 14, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>Winner{form.coop ? "s" : ""}</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, color: "#ffffff" }}>
                    <input type="checkbox" checked={form.coop} onChange={e => setForm(f => ({ ...f, coop: e.target.checked, winners: [] }))} />
                    Co-op mode
                  </label>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {form.selectedPlayers.map(name => {
                    const win = form.winners.includes(name);
                    return (
                      <button key={name} onClick={() => toggleWinner(name)} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
                        border: win ? "1px solid #d4aa3a" : "1px solid #2c3d58",
                        background: win ? "#2a2510" : "transparent", cursor: "pointer",
                        color: win ? "#d4aa3a" : "#485c78", fontFamily: "Georgia, serif", fontSize: 15
                      }}>
                        {win && "🏆 "}{name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: "#ffffff", fontSize: 14, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Scores (optional)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {form.selectedPlayers.map(name => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={name} color={getPlayerColor(name, players)} size={22} />
                      <input type="number" placeholder="Score" value={form.scores[name] || ""} onChange={e => setForm(f => ({ ...f, scores: { ...f.scores, [name]: e.target.value } }))} style={{
                        flex: 1, background: "#252e40", border: "1px solid #364a6a", borderRadius: 6,
                        color: "#ffffff", padding: "7px 10px", fontSize: 15, outline: "none", boxSizing: "border-box"
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => { setShowAddPlay(false); setEditingPlay(null); resetForm(); }}>Cancel</Btn>
            <Btn onClick={submitPlay} style={{ opacity: (!form.game || form.selectedPlayers.length < 2 || saving) ? 0.4 : 1 }}>
              {saving ? "Saving…" : editingPlay ? "Update Play" : "Save Play"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── ADD GAME MODAL ── */}
      {showAddGame && (
        <Modal title="Add Game" onClose={() => setShowAddGame(false)}>
          <Input label="Game Name" value={newGame} onChange={e => setNewGame(e.target.value)} placeholder="e.g. Terraforming Mars" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowAddGame(false)}>Cancel</Btn>
            <Btn onClick={addGame}>Add Game</Btn>
          </div>
        </Modal>
      )}

      {/* ── ADD PLAYER MODAL ── */}
      {showAddPlayer && (
        <Modal title="Add Player" onClose={() => setShowAddPlayer(false)}>
          <Input label="Player Name" value={newPlayer} onChange={e => setNewPlayer(e.target.value)} placeholder="e.g. Jordan" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowAddPlayer(false)}>Cancel</Btn>
            <Btn onClick={addPlayer}>Add Player</Btn>
          </div>
        </Modal>
      )}

      {/* ── PLAY DETAIL MODAL ── */}
      {selectedPlay && (
        <Modal title={selectedPlay.game} onClose={() => setSelectedPlay(null)}>
          <div style={{ marginBottom: 12, fontSize: 15, color: "#ffffff", fontFamily: "monospace" }}>{selectedPlay.date}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {selectedPlay.coop && <span style={{ fontSize: 13, background: "#1a2e3a", color: "#70b090", padding: "2px 8px", borderRadius: 10, fontFamily: "monospace" }}>CO-OP</span>}
            {selectedPlay.rps_winner && <span style={{ fontSize: 13, background: "#1a2e3a", color: "#70b090", padding: "2px 8px", borderRadius: 10, fontFamily: "monospace" }}>✌️ {selectedPlay.rps_winner} went first</span>}
          </div>
          <div style={{ color: "#ffffff", fontSize: 13, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Players</div>
          {selectedPlay.players.map(name => {
            const p = players.find(x => x.name === name);
            const isWinner = selectedPlay.winners.includes(name);
            const score = selectedPlay.scores?.[name];
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Avatar name={name} color={p?.color || "#888"} size={32} />
                <span style={{ fontFamily: "'Playfair Display', serif", color: isWinner ? "#d4aa3a" : "#ffffff", flex: 1 }}>{name} {isWinner && "🏆"}</span>
                {score && <span style={{ fontFamily: "monospace", color: "#ffffff", fontSize: 16 }}>{score} pts</span>}
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <Btn variant="danger" onClick={() => deletePlay(selectedPlay.id)}>Delete</Btn>
            <Btn variant="secondary" onClick={() => startEditPlay(selectedPlay)}>Edit</Btn>
            <Btn variant="secondary" onClick={() => setSelectedPlay(null)}>Close</Btn>
          </div>
        </Modal>
      )}

      {/* ── GAME DETAIL MODAL ── */}
      {selectedGame && (() => {
        const gamePlays = plays.filter(p => p.game === selectedGame);
        const winCounts = {};
        gamePlays.forEach(p => p.winners.forEach(w => { winCounts[w] = (winCounts[w] || 0) + 1; }));
        const topWinner = Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0];
        const recentPlays = [...gamePlays].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        return (
          <Modal title={selectedGame} onClose={() => setSelectedGame(null)}>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Times Played", value: gamePlays.length },
                { label: "Top Winner", value: topWinner ? topWinner[0] : "—" },
                { label: "Top Wins", value: topWinner ? topWinner[1] : "—" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "#252e40", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 21, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#ffffff", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ color: "#ffffff", fontSize: 13, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Recent Plays</div>
            {recentPlays.length === 0 && <p style={{ color: "#ffffff", fontStyle: "italic", fontSize: 15 }}>No plays yet.</p>}
            {recentPlays.map(play => (
              <div key={play.id} onClick={() => { setSelectedGame(null); setSelectedPlay(play); }} style={{ background: "#252e40", borderRadius: 8, padding: "8px 10px", marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "#ffffff", fontFamily: "monospace" }}>{play.date}</span>
                  {play.coop && <span style={{ fontSize: 12, background: "#1a2e3a", color: "#70b090", padding: "2px 7px", borderRadius: 10, fontFamily: "monospace" }}>CO-OP</span>}
                  {play.winners.length > 0 && <span style={{ fontSize: 14, color: "#d4aa3a" }}>🏆 {play.winners.join(", ")}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {play.players.map(p => <Avatar key={p} name={p} color={getPlayerColor(p, players)} size={22} />)}
                </div>
                {play.scores && Object.keys(play.scores).length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {play.players.filter(p => play.scores[p]).map(p => (
                      <span key={p} style={{ fontSize: 13, fontFamily: "monospace", color: "#ffffff" }}>
                        {p}: <span style={{ color: "#ffffff" }}>{play.scores[p]}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <Btn variant="secondary" onClick={() => setSelectedGame(null)}>Close</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* ── PLAYER DETAIL MODAL ── */}
      {selectedPlayer && (() => {
        const playerPlays = plays.filter(p => p.players.includes(selectedPlayer.name));
        const playerWins  = playerPlays.filter(p => p.winners.includes(selectedPlayer.name));
        const winRate     = playerPlays.length > 0 ? Math.round((playerWins.length / playerPlays.length) * 100) : 0;
        const winsByGame  = {};
        playerWins.forEach(p => { winsByGame[p.game] = (winsByGame[p.game] || 0) + 1; });
        const topWinGame  = Object.entries(winsByGame).sort((a, b) => b[1] - a[1])[0];
        const recentPlays = [...playerPlays].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        const leadingGames = Object.entries(gameTopWinner)
          .filter(([, v]) => v.name.split(" & ").includes(selectedPlayer.name))
          .sort((a, b) => b[1].wins - a[1].wins);
        return (
          <Modal title={selectedPlayer.name} onClose={() => setSelectedPlayer(null)}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <Avatar name={selectedPlayer.name} color={selectedPlayer.color} size={52} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flex: 1 }}>
                {[
                  { label: "Played", value: playerPlays.length },
                  { label: "Won", value: playerWins.length },
                  { label: "Win Rate", value: `${winRate}%` },
                ].map(s => (
                  <div key={s.label} style={{ background: "#252e40", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 21, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#ffffff", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {topWinGame && (
              <div style={{ background: "#252e40", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#ffffff", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Most Wins In</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 17 }}>{topWinGame[0]}</div>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", color: "#d4aa3a", fontSize: 23, fontWeight: 700 }}>🏆 {topWinGame[1]}</div>
              </div>
            )}
            {leadingGames.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: "#ffffff", fontSize: 13, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>👑 Leading In</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {leadingGames.map(([game, { wins }]) => (
                    <div key={game} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#252e40", borderRadius: 8, padding: "8px 12px" }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 15 }}>{game}</span>
                      <span style={{ fontFamily: "monospace", color: "#d4aa3a", fontSize: 14 }}>{wins} win{wins !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ color: "#ffffff", fontSize: 13, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Recent Plays</div>
            {recentPlays.length === 0 && <p style={{ color: "#ffffff", fontStyle: "italic", fontSize: 15 }}>No plays yet.</p>}
            {recentPlays.map(play => {
              const won = play.winners.includes(selectedPlayer.name);
              return (
                <div key={play.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 10px", background: "#252e40", borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: "#ffffff", fontSize: 16 }}>{play.game}</div>
                    <div style={{ fontSize: 13, color: "#ffffff", fontFamily: "monospace", marginTop: 2 }}>{play.date}</div>
                  </div>
                  {won
                    ? <span style={{ fontSize: 14, color: "#d4aa3a", fontFamily: "monospace" }}>🏆 Win</span>
                    : <span style={{ fontSize: 14, color: "#ffffff", fontFamily: "monospace" }}>Loss</span>
                  }
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <Btn variant="secondary" onClick={() => setSelectedPlayer(null)}>Close</Btn>
            </div>
          </Modal>
        );
      })()}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
