/* Conciara — new screens: Dashboard, Conversations, Channels */

const { useState: useS3, useEffect: useE3, useMemo: useM3 } = React;

/* ─────────────────── SHARED MICRO-COMPONENTS ─────────────────── */

function KpiCard({ eyebrow, big, delta, deltaLabel, foot, children }) {
  const up = delta >= 0;
  return (
    <div className="card stat-card">
      <div className="stat-eyebrow">{eyebrow}</div>
      <div className="stat-num">
        <span className="stat-num-big">{big}</span>
        {delta !== undefined && (
          <span className={`kpi-delta kpi-delta--${up ? "up" : "down"}`}>
            {up ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {children}
      {foot !== undefined && (
        <div className="stat-foot">
          <span className="muted">{foot}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    open:     { cls: "badge--warn",    label: "Open" },
    resolved: { cls: "badge--success", label: "Resolved" },
    flagged:  { cls: "badge--warn",    label: "Flagged" },
    live:     { cls: "badge--success", label: "Live" },
    draft:    { cls: "badge--neutral", label: "Draft" },
    disabled: { cls: "badge--neutral", label: "Disabled" },
  };
  const b = map[status] || { cls: "badge--neutral", label: status };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

function AgentMark({ name, color, size = 28 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: 7, background: color,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "white", fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

/* ─────────────────── WORKSPACE DASHBOARD ─────────────────── */
function WorkspaceDashboardScreen({ tweaks, setScreen }) {
  const accent = window.ACCENTS[tweaks.accent];

  const kpis = [
    { eyebrow: "Active chats today",      big: "14",   delta: 17,   foot: "vs yesterday" },
    { eyebrow: "Messages this period",    big: "1,284", delta: -3,  foot: "billing period" },
    { eyebrow: "Active agents",           big: "1",    foot: "of 4 configured" },
    { eyebrow: "Credits used",            big: "0",    foot: "of 500 this period" },
  ];

  const recentConvos = [
    { id: "c1", agent: "Order Lab Tests", agentColor: "var(--accent)", user: "Dr. Emily Chen", snippet: "Can you check if the CBC panel for patient 4421 is in…", time: "2m ago",  status: "open" },
    { id: "c2", agent: "Patient Intake",  agentColor: "#0e9b6b",       user: "Marcus Liu",     snippet: "I've had a persistent cough for 3 days with low-grade…", time: "14m ago", status: "resolved" },
    { id: "c3", agent: "Order Lab Tests", agentColor: "var(--accent)", user: "Dr. Priya Nair",  snippet: "What is the normal range for TSH?",                     time: "1h ago",  status: "resolved" },
    { id: "c4", agent: "Billing Helper",  agentColor: "#b86a17",       user: "Sarah Kim",      snippet: "The CPT code for this doesn't seem right — it flagged…", time: "2h ago",  status: "flagged" },
    { id: "c5", agent: "Medication Q&A",  agentColor: "#c33665",       user: "Dr. James Park",  snippet: "Interaction between metformin and contrast dye?",        time: "3h ago",  status: "resolved" },
  ];

  const activity = [
    { icon: "check",   msg: "Agent trained on new document",     target: "Order Lab Tests",  time: "5m ago" },
    { icon: "users",   msg: "New member joined workspace",        target: "Dr. Priya Nair",   time: "1h ago" },
    { icon: "alert",   msg: "Agent flagged a low-confidence reply", target: "Billing Helper", time: "2h ago" },
    { icon: "spark",   msg: "Action fired successfully",          target: "Order lab order",  time: "4h ago" },
    { icon: "card",    msg: "Invoice generated",                  target: "INV-1042 · $32",   time: "yesterday" },
  ];

  return (
    <div className="page page--wide">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Test 01 / Workspace</span>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your workspace — active conversations, agent health, and credit burn.</p>
        </div>
        <div className="row">
          <button className="btn btn--secondary" onClick={() => setScreen && setScreen("conversations")}>
            <window.Icon name="scroll" size={13}/>Inbox
          </button>
          <button className="btn btn--primary" onClick={() => setScreen && setScreen("new-agent")}>
            <window.Icon name="plus" size={14}/>New agent
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <KpiCard key={i} {...k}/>
        ))}
      </div>

      {/* Lower two-col layout */}
      <div className="dash-layout">
        {/* Left: recent conversations */}
        <div className="col" style={{ gap: 16, minWidth: 0 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent conversations</div>
                <div className="card-subtitle">Latest messages across all agents</div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => setScreen && setScreen("conversations")}>
                View all <window.Icon name="arrow-right" size={12}/>
              </button>
            </div>
            <div>
              {recentConvos.map((c, i) => (
                <div
                  key={c.id}
                  className="convo-row"
                  style={{ borderTop: i === 0 ? "none" : undefined }}
                >
                  <AgentMark name={c.agent} color={c.agentColor}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user}</span>
                      <span className="muted" style={{ fontSize: 11.5 }}>via {c.agent}</span>
                    </div>
                    <p className="convo-snippet">{c.snippet}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span className="mono muted" style={{ fontSize: 11 }}>{c.time}</span>
                    <StatusBadge status={c.status}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini agents overview */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Agents at a glance</div>
              <button className="btn btn--ghost btn--sm" onClick={() => setScreen && setScreen("agents")}>
                Manage <window.Icon name="arrow-right" size={12}/>
              </button>
            </div>
            <div>
              {[
                { name: "Order Lab Tests & Blood Tests", model: "claude-haiku-4-5", status: "running", msgs: 1284, color: "var(--accent)" },
                { name: "Patient Intake Triage",          model: "claude-sonnet-4",  status: "idle",    msgs: 412,  color: "#0e9b6b" },
                { name: "Billing & Coding Helper",        model: "gpt-4.1",          status: "idle",    msgs: 88,   color: "#b86a17" },
                { name: "Medication Q&A",                 model: "claude-haiku-4-5", status: "warn",    msgs: 19,   color: "#c33665" },
              ].map((a, i) => (
                <div key={i} className="agent-mini-row" style={{ borderTop: i === 0 ? "none" : undefined }}>
                  <AgentMark name={a.name} color={a.color} size={26}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                    <div className="mono muted" style={{ fontSize: 11.5 }}>{a.model}</div>
                  </div>
                  <div className="row" style={{ gap: 10, flexShrink: 0 }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{a.msgs.toLocaleString()} msg</span>
                    <span className={`badge-dot badge-dot--${a.status === "running" ? "running" : a.status === "warn" ? "warn" : "idle"}`}>
                      {a.status === "running" ? "Active" : a.status === "warn" ? "Warning" : "Idle"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: activity feed + quick stats */}
        <div className="col" style={{ gap: 16, width: 284, flexShrink: 0 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Activity</div>
            </div>
            <ul className="activity-feed">
              {activity.map((e, i) => (
                <li key={i} className="feed-item">
                  <div className="feed-dot">
                    <window.Icon name={e.icon} size={11}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5 }}>{e.msg}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>{e.target}</div>
                  </div>
                  <div className="mono muted" style={{ fontSize: 11, flexShrink: 0 }}>{e.time}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Credit burn mini */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", fontWeight: 500, marginBottom: 12, fontFamily: "var(--font-mono)" }}>Credits</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>0</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>of 500 used</span>
            </div>
            <div style={{ height: 4, borderRadius: 4, background: "var(--line)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: "0.5%", height: "100%", background: "var(--accent)", borderRadius: "inherit" }}/>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Resets <strong style={{ color: "var(--ink-2)" }}>Jun 1</strong> · 5:00 AM</div>
            <button className="btn btn--secondary btn--sm" style={{ marginTop: 12, width: "100%" }}>
              View usage <window.Icon name="arrow-right" size={12}/>
            </button>
          </div>

          {/* Quick actions */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", fontWeight: 500, marginBottom: 10, fontFamily: "var(--font-mono)" }}>Quick actions</div>
            <div className="col" style={{ gap: 6 }}>
              {[
                { icon: "plus",     label: "Create new agent",    screen: "new-agent" },
                { icon: "users",    label: "Invite a teammate",   screen: "members" },
                { icon: "key",      label: "Generate API key",    screen: "api" },
                { icon: "external", label: "Get embed snippet",   screen: "channels" },
              ].map(a => (
                <button
                  key={a.screen}
                  className="quick-action-btn"
                  onClick={() => setScreen && setScreen(a.screen)}
                >
                  <window.Icon name={a.icon} size={13}/>
                  <span>{a.label}</span>
                  <window.Icon name="chevron-right" size={12} className="qa-arrow"/>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── CONVERSATIONS ─────────────────── */
function ConversationsScreen({ tweaks, setScreen }) {
  const [filter, setFilter] = useS3("all");
  const [search, setSearch] = useS3("");
  const [selected, setSelected] = useS3("c1");

  const allConvos = [
    { id: "c1",  agent: "Order Lab Tests",  agentColor: "var(--accent)", user: "Dr. Emily Chen",  avatar: "EC", snippetFull: "Hi there, can you check if the CBC panel for patient 4421 has been ordered and processed? We need results before the afternoon round.", time: "2m ago",   status: "open",     msgs: 6 },
    { id: "c2",  agent: "Patient Intake",   agentColor: "#0e9b6b",       user: "Marcus Liu",      avatar: "ML", snippetFull: "I've had a persistent cough for 3 days with low-grade fever. No shortness of breath but I'm concerned it might be something more.", time: "14m ago",  status: "resolved", msgs: 12 },
    { id: "c3",  agent: "Order Lab Tests",  agentColor: "var(--accent)", user: "Dr. Priya Nair",  avatar: "PN", snippetFull: "What is the normal range for TSH in adult patients? And does fasting matter for this test?", time: "1h ago",   status: "resolved", msgs: 4 },
    { id: "c4",  agent: "Billing Helper",   agentColor: "#b86a17",       user: "Sarah Kim",       avatar: "SK", snippetFull: "The CPT code for this laparoscopic procedure doesn't seem right — it flagged as a duplicate. Can you suggest the correct coding?", time: "2h ago",   status: "flagged",  msgs: 8 },
    { id: "c5",  agent: "Medication Q&A",   agentColor: "#c33665",       user: "Dr. James Park",  avatar: "JP", snippetFull: "What's the risk of interaction between metformin and contrast dye for an upcoming CT scan? Patient has T2DM, GFR 64.", time: "3h ago",   status: "resolved", msgs: 10 },
    { id: "c6",  agent: "Patient Intake",   agentColor: "#0e9b6b",       user: "Ana Reyes",        avatar: "AR", snippetFull: "I'm having severe lower back pain that started yesterday. I'm on blood thinners and wanted to know if I can take ibuprofen.", time: "5h ago",   status: "resolved", msgs: 7 },
    { id: "c7",  agent: "Order Lab Tests",  agentColor: "var(--accent)", user: "Dr. Sam Osei",    avatar: "SO", snippetFull: "Please place a stat order for lipid panel and HbA1c for patient #7852. New diabetic, just diagnosed.", time: "yesterday", status: "resolved", msgs: 5 },
    { id: "c8",  agent: "Billing Helper",   agentColor: "#b86a17",       user: "Tom Brady",       avatar: "TB", snippetFull: "Prior auth for the MRI came back denied. What diagnosis codes do I need to submit for the appeal?", time: "yesterday", status: "open",     msgs: 3 },
  ];

  const filtered = useM3(() => {
    let list = allConvos;
    if (filter !== "all") list = list.filter(c => c.status === filter);
    if (search) list = list.filter(c =>
      c.user.toLowerCase().includes(search.toLowerCase()) ||
      c.agent.toLowerCase().includes(search.toLowerCase()) ||
      c.snippetFull.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [filter, search]);

  const current = allConvos.find(c => c.id === selected) || allConvos[0];

  const counts = useM3(() => ({
    all: allConvos.length,
    open: allConvos.filter(c => c.status === "open").length,
    resolved: allConvos.filter(c => c.status === "resolved").length,
    flagged: allConvos.filter(c => c.status === "flagged").length,
  }), []);

  const THREAD_MESSAGES = {
    c1: [
      { from: "user", text: "Hi there, can you check if the CBC panel for patient #4421 has been ordered and processed?", time: "2:41 PM" },
      { from: "bot",  text: "Looking that up now… Patient #4421 has an active CBC order placed this morning at 9:14 AM. Sample was drawn at 10:02 AM. Results are expected by 3:30 PM today.", time: "2:41 PM", cited: true },
      { from: "user", text: "Great. Also add a metabolic panel to the order — attending wants it before rounds.", time: "2:43 PM" },
      { from: "bot",  text: "Metabolic panel added to the order for patient #4421. Order ID CMP-7821 confirmed. Lab will process alongside the CBC.", time: "2:43 PM", cited: false },
      { from: "user", text: "Perfect. Can you also flag the chart for the attending?", time: "2:44 PM" },
      { from: "bot",  text: "Chart flagged for Dr. Patel (attending). She'll receive a notification when results are ready.", time: "2:44 PM", cited: false },
    ],
    c4: [
      { from: "user", text: "The CPT code 47562 for this laparoscopic cholecystectomy is flagging as a duplicate.", time: "11:22 AM" },
      { from: "bot",  text: "CPT 47562 (laparoscopic cholecystectomy) is a standalone procedure code. A duplicate flag usually means the same code was billed for this patient within the lookback period. Check for a prior auth on the same date of service.", time: "11:22 AM", cited: true },
      { from: "user", text: "It was a different surgeon, different date. Still flagging.", time: "11:24 AM" },
      { from: "bot",  text: "In that case it may be a bilateral/re-do case. Consider appending modifier -76 (repeat procedure by same physician) or -77 (repeat by different physician). Given different surgeon + date, modifier -77 is most likely correct.", time: "11:25 AM", cited: false },
      { from: "user", text: "That makes sense. What ICD-10 should accompany this?", time: "11:26 AM" },
      { from: "bot",  text: "Primary: K80.20 (calculus of gallbladder without obstruction). Secondary: K80.10 if chronic cholecystitis was documented. Always match to the operative note wording for clean claim submission.", time: "11:26 AM", cited: true },
      { from: "user", text: "Still denied. Escalating to the billing lead.", time: "11:28 AM" },
      { from: "bot",  text: "Understood. I've added a note to the claim record: 'Modifier -77 applied, ICD-10 K80.20 + K80.10, re-review requested.' Billing lead will see this in the queue.", time: "11:28 AM", cited: false },
    ],
  };

  const messages = THREAD_MESSAGES[selected] || THREAD_MESSAGES.c1;

  return (
    <div className="page page--wide" style={{ padding: 0, maxWidth: "none" }}>
      <div className="convos-shell">
        {/* Left panel */}
        <div className="convos-sidebar">
          {/* Header */}
          <div className="convos-sidebar-head">
            <div className="row" style={{ marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Conversations</h2>
            </div>
            <div className="search-field">
              <window.Icon name="search" size={13}/>
              <input
                className="search-input"
                placeholder="Search by user, agent, or message…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="convos-filter-tabs" style={{ marginTop: 8 }}>
              {[
                { id: "all",      label: "All",      count: counts.all },
                { id: "open",     label: "Open",     count: counts.open },
                { id: "resolved", label: "Resolved", count: counts.resolved },
                { id: "flagged",  label: "Flagged",  count: counts.flagged },
              ].map(f => (
                <button
                  key={f.id}
                  className={`filter-tab ${filter === f.id ? "filter-tab--active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  <span className={`filter-count ${filter === f.id ? "filter-count--active" : ""}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="convos-list">
            {filtered.length === 0 ? (
              <div className="convos-empty">
                <window.Icon name="scroll" size={20}/>
                <div>No conversations found.</div>
              </div>
            ) : filtered.map(c => (
              <button
                key={c.id}
                className={`convo-item ${selected === c.id ? "convo-item--active" : ""}`}
                onClick={() => setSelected(c.id)}
              >
                <AgentMark name={c.agent} color={c.agentColor} size={30}/>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div className="row" style={{ gap: 6, marginBottom: 3, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{c.user}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)", flexShrink: 0 }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    via {c.agent}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 5, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {c.snippetFull.slice(0, 60)}…
                    </span>
                    <StatusBadge status={c.status}/>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel — thread view */}
        <div className="convos-thread">
          {/* Thread header */}
          <div className="thread-head">
            <div className="row" style={{ gap: 10, flex: 1, minWidth: 0 }}>
              <AgentMark name={current.agent} color={current.agentColor} size={32}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{current.user}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  via {current.agent} · {current.msgs} messages
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <StatusBadge status={current.status}/>
              <button className="btn btn--secondary btn--sm">
                <window.Icon name="user" size={12}/> Assign
              </button>
              {current.status === "open" ? (
                <button className="btn btn--primary btn--sm">
                  <window.Icon name="check" size={12}/> Resolve
                </button>
              ) : (
                <button className="btn btn--ghost btn--sm">
                  Re-open
                </button>
              )}
              <button className="icon-btn"><window.Icon name="more" size={14}/></button>
            </div>
          </div>

          {/* Messages */}
          <div className="thread-messages">
            {messages.map((m, i) => (
              <div key={i} className={`thread-msg thread-msg--${m.from}`}>
                {m.from === "bot" ? (
                  <div className="thread-bot-mark">
                    <window.Icon name="bot" size={13}/>
                  </div>
                ) : (
                  <div className="thread-user-mark">
                    {current.avatar}
                  </div>
                )}
                <div className="thread-bubble">
                  <p className="thread-text">{m.text}</p>
                  {m.cited && (
                    <div className="thread-citation">
                      <window.Icon name="book" size={11}/>
                      <span>Cited from knowledge base</span>
                    </div>
                  )}
                  <span className="thread-time mono">{m.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Input area (read-only — chat logs are read-only by nature) */}
          <div className="thread-foot">
            <div className="thread-input-note">
              <window.Icon name="scroll" size={14}/>
              <span>This is a read-only log. Use <strong>Revise</strong> on any bot reply to improve the answer.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── CHANNELS ─────────────────── */
function ChannelsScreen({ tweaks, setScreen }) {
  const channels = [
    {
      agentId: "lab-tests", agentName: "Order Lab Tests & Blood Tests", agentColor: "var(--accent)",
      deployments: [
        { type: "widget",    label: "Web widget",  status: "live",     detail: "Embedded on portal.hospital.com" },
        { type: "slack",     label: "Slack",       status: "draft",    detail: "Not published yet" },
        { type: "api",       label: "REST API",    status: "live",     detail: "api.conciara.app/v1/agents/lab-tests" },
      ],
    },
    {
      agentId: "intake", agentName: "Patient Intake Triage", agentColor: "#0e9b6b",
      deployments: [
        { type: "widget",    label: "Web widget",  status: "live",     detail: "intake.hospital.com" },
        { type: "whatsapp",  label: "WhatsApp",    status: "disabled", detail: "Requires Business API account" },
        { type: "email",     label: "Email",       status: "draft",    detail: "Connect an email address first" },
      ],
    },
    {
      agentId: "billing", agentName: "Billing & Coding Helper", agentColor: "#b86a17",
      deployments: [
        { type: "widget",    label: "Web widget",  status: "draft",    detail: "Not published" },
        { type: "api",       label: "REST API",    status: "disabled", detail: "Upgrade to Standard for API access" },
      ],
    },
    {
      agentId: "med-q", agentName: "Medication Q&A", agentColor: "#c33665",
      deployments: [
        { type: "widget",    label: "Web widget",  status: "live",     detail: "internal.hospital.com/med-qa" },
      ],
    },
  ];

  const CHANNEL_ICONS = {
    widget:   "bot",
    slack:    "command",
    api:      "key",
    whatsapp: "check",
    email:    "bell",
  };

  return (
    <div className="page page--wide">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Test 01 / Workspace</span>
          <h1 className="page-title">Channels</h1>
          <p className="page-subtitle">Everywhere your agents are deployed — web widget, Slack, WhatsApp, email, and API. Manage each deployment from here.</p>
        </div>
        <div className="row">
          <button className="btn btn--secondary"><window.Icon name="external" size={13}/> Docs</button>
        </div>
      </div>

      {/* Channel type legend */}
      <div className="channel-legend">
        {[
          { type: "widget",   label: "Web widget",  desc: "Floating chat embedded on your site" },
          { type: "slack",    label: "Slack",        desc: "Slash command + DM in your workspace" },
          { type: "api",      label: "REST API",     desc: "Direct programmatic access" },
          { type: "whatsapp", label: "WhatsApp",     desc: "Business API via Meta" },
          { type: "email",    label: "Email",        desc: "Inbound email-to-agent routing" },
        ].map(c => (
          <div key={c.type} className="legend-chip">
            <window.Icon name={CHANNEL_ICONS[c.type]} size={13}/>
            <span style={{ fontWeight: 600, fontSize: 12 }}>{c.label}</span>
            <span className="muted" style={{ fontSize: 11.5 }}>{c.desc}</span>
          </div>
        ))}
      </div>

      {/* Per-agent channel cards */}
      <div className="col" style={{ gap: 16, marginTop: 20 }}>
        {channels.map(agent => (
          <div key={agent.agentId} className="card">
            <div className="card-header">
              <div className="row" style={{ gap: 10 }}>
                <AgentMark name={agent.agentName} color={agent.agentColor} size={30}/>
                <div>
                  <div className="card-title">{agent.agentName}</div>
                  <div className="card-subtitle mono">{agent.agentId}</div>
                </div>
              </div>
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setScreen && setScreen("agent-inner")}
              >
                Open agent <window.Icon name="arrow-up-right" size={11}/>
              </button>
            </div>
            <div className="channel-row-grid">
              {agent.deployments.map(dep => (
                <div key={dep.type} className={`channel-card channel-card--${dep.status}`}>
                  <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                    <div className="channel-icon">
                      <window.Icon name={CHANNEL_ICONS[dep.type]} size={15}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{dep.label}</div>
                      <StatusBadge status={dep.status}/>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{dep.detail}</div>
                  <div className="channel-card-actions">
                    {dep.status === "live" ? (
                      <>
                        <button className="btn btn--secondary btn--sm">
                          <window.Icon name="settings" size={11}/> Configure
                        </button>
                        <button className="btn btn--ghost btn--sm">
                          <window.Icon name="copy" size={11}/> Snippet
                        </button>
                      </>
                    ) : dep.status === "draft" ? (
                      <button className="btn btn--primary btn--sm">
                        <window.Icon name="play" size={11}/> Publish
                      </button>
                    ) : (
                      <button className="btn btn--secondary btn--sm" disabled style={{ opacity: 0.5 }}>
                        <window.Icon name="external" size={11}/> Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add channel CTA */}
              <button className="channel-card channel-card--add">
                <div className="channel-add-inner">
                  <div className="channel-add-icon"><window.Icon name="plus" size={18}/></div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>Add channel</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Connect to Slack, WhatsApp, email…</div>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Enterprise CTA */}
      <div className="enterprise-strip" style={{ marginTop: 24 }}>
        <div>
          <div className="section-eyebrow" style={{ margin: 0 }}>Enterprise</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>Need a custom channel — Zendesk, Salesforce, Teams?</div>
        </div>
        <button className="btn btn--secondary">Talk to sales <window.Icon name="arrow-up-right" size={13}/></button>
      </div>
    </div>
  );
}

window.WorkspaceDashboardScreen = WorkspaceDashboardScreen;
window.ConversationsScreen = ConversationsScreen;
window.ChannelsScreen = ChannelsScreen;
