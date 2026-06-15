/* Conciara — per-agent inner shell + screens
   Renders when tweaks.scope === 'agent'. Different sidebar + topbar than workspace.
*/

const { useState: aState, useMemo: aMemo, useEffect: aEffect } = React;

/* ---------- Per-agent topbar (replaces workspace topbar when in agent view) ---------- */
function AgentTopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="ws-switcher">
          <span className="ws-mark"><window.Icon name="logo-mark" size={22}/></span>
          <span className="ws-meta">
            <span className="ws-name">Test 02 — Paid Wo…</span>
            <span className="ws-plan">Standard plan</span>
          </span>
          <window.Icon name="chevron-up-down" size={14} className="ws-caret"/>
        </button>
        <span className="bc-sep">/</span>
        <button className="agent-pill">
          <span className="agent-pill-mark" style={{background: "var(--accent)"}}><window.Icon name="bot" size={12}/></span>
          <span className="agent-pill-name">Domaine Carneros: California Sp…</span>
          <window.Icon name="chevron-up-down" size={12} className="ws-caret"/>
        </button>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" aria-label="Notifications"><window.Icon name="bell" size={16}/></button>
        <button className="icon-btn icon-btn--text"><window.Icon name="book" size={16}/><span>Docs</span></button>
        <button className="avatar">SA</button>
      </div>
    </header>
  );
}

/* ---------- Per-agent sidebar ---------- */
function AgentSidebar({ section, setSection, setScreen }) {
  const items = [
    { group: null, entries: [
      { id: "playground", label: "Playground", icon: "play" },
    ]},
    { group: "Activity", entries: [
      { id: "chat-logs", label: "Chat logs", icon: "scroll" },
    ]},
    { group: "Analytics", entries: [
      { id: "chats", label: "Chats", icon: "usage" },
    ]},
    { group: "Data sources", entries: [
      { id: "files", label: "Files", icon: "scroll" },
      { id: "qa", label: "Q&A", icon: "book" },
      { id: "website", label: "Website", icon: "external" },
    ]},
    { group: null, entries: [
      { id: "connected", label: "Connected Apps", icon: "external" },
      { id: "actions", label: "Actions", icon: "spark" },
      { id: "widget", label: "Chat widget", icon: "bot" },
    ]},
    { group: "Settings", entries: [
      { id: "agent-general", label: "General", icon: "settings" },
    ]},
  ];
  return (
    <nav className="sidebar">
      <button className="back-to-ws" onClick={() => setScreen("agents")}>
        <window.Icon name="chevron-right" size={12} className="back-arrow"/>
        Back to workspace
      </button>
      {items.map((g, gi) => (
        <div key={gi} className="nav-group">
          {g.group && <div className="nav-group-label">{g.group}</div>}
          {g.entries.map(e => (
            <button
              key={e.id}
              onClick={() => setSection(e.id)}
              className={`nav-item ${section === e.id ? "nav-item--active" : ""}`}
            >
              <window.Icon name={e.icon} size={16}/>
              <span className="nav-label">{e.label}</span>
            </button>
          ))}
        </div>
      ))}
      <div className="sidebar-footer">
        <div className="period-note">
          <span className="period-dot"/>
          <span><strong>0</strong> / 4,000 credits</span>
        </div>
      </div>
    </nav>
  );
}

/* ---------- Inner agent app ---------- */
function AgentApp({ tweaks, setScreen }) {
  const [section, setSection] = aState("playground");

  return (
    <div className="agent-shell">
      <AgentTopBar/>
      <div className="app-body">
        <AgentSidebar section={section} setSection={setSection} setScreen={setScreen}/>
        <main className="content">
          <AgentRouter section={section}/>
        </main>
      </div>
    </div>
  );
}

function AgentRouter({ section }) {
  switch (section) {
    case "playground": return <PlaygroundScreen/>;
    case "chat-logs": return <ChatLogsScreen/>;
    case "chats": return <ChatsAnalyticsScreen/>;
    case "files": return <FilesScreen/>;
    case "qa": return <QaScreen/>;
    case "website": return <WebsiteScreen/>;
    case "connected": return <ConnectedAppsScreen/>;
    case "actions": return <ActionsScreen/>;
    case "widget": return <ChatWidgetScreen/>;
    case "agent-general": return <AgentGeneralScreen/>;
    default: return <PlaygroundScreen/>;
  }
}

/* ===================== PLAYGROUND ===================== */
function PlaygroundScreen() {
  return (
    <div className="playground">
      <div className="pg-config">
        <div className="page-header" style={{paddingBottom: 14, marginBottom: 18}}>
          <div>
            <h1 className="page-title" style={{fontSize: 18}}>Playground</h1>
            <p className="page-subtitle" style={{fontSize: 12.5}}>Test changes before deploying. Updates apply to the live agent on save.</p>
          </div>
        </div>

        <div className="card" style={{marginBottom: 14}}>
          <div className="card-body" style={{padding: 14}}>
            <div className="section-eyebrow">Training data</div>
            <div className="muted" style={{fontSize: 12.5, marginBottom: 12}}>3 files · 1 website · 0 Q&A pairs</div>
            <button className="btn btn--secondary btn--sm" style={{width: "100%"}}><window.Icon name="scroll" size={12}/> Manage data sources</button>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{padding: 14}}>
            <div className="section-eyebrow">AI model & system prompt</div>
            <p className="muted" style={{fontSize: 12.5, margin: "0 0 14px"}}>Choose the LLM and instructions. Changes apply to the next message.</p>
            <label className="field">
              <span className="field-label">Model</span>
              <select className="select"><option>GPT-4o Mini</option><option>Claude Haiku 4.5</option><option>Claude Sonnet 4</option></select>
            </label>
            <label className="field">
              <span className="field-label">Temperature <span className="muted mono" style={{fontSize: 11}}>0.7</span></span>
              <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="slider"/>
              <div className="slider-marks"><span>Precise</span><span>Balanced</span><span>Creative</span></div>
            </label>
            <label className="field" style={{marginBottom: 12}}>
              <span className="field-label">System prompt <span className="muted">(optional)</span></span>
              <textarea className="textarea" rows="8" defaultValue="You are the support assistant for Domaine Carneros, dedicated to providing helpful and professional assistance to our customers. Our mission is to enhance your experience with our renowned méthode traditionnelle sparkling wines and Pinot Noir, as well as our beautiful Napa Valley tasting experiences. Please answer questions and resolve issues based on our website content, ensuring your responses are concise, informative, and focused on our offerings."></textarea>
            </label>
            <div className="row" style={{justifyContent: "space-between"}}>
              <span className="muted" style={{fontSize: 11.5}}>Last saved <span className="mono">2m ago</span></span>
              <button className="btn btn--primary btn--sm"><window.Icon name="check" size={12}/> Update AI settings</button>
            </div>
          </div>
        </div>
      </div>

      <div className="pg-canvas">
        <div className="pg-canvas-toolbar">
          <span className="section-eyebrow" style={{margin: 0}}>Live preview</span>
          <div className="row" style={{gap: 6}}>
            <button className="btn btn--ghost btn--sm">Clear<window.Icon name="trash" size={11}/></button>
            <button className="btn btn--secondary btn--sm">Open in widget<window.Icon name="external" size={11}/></button>
          </div>
        </div>
        <div className="pg-bg">
          <ChatWidget messages={[
            { from: "bot", text: "Hi! Ask me anything. I use your trained data when available." },
          ]}/>
        </div>
      </div>
    </div>
  );
}

/* Reusable mini chat widget */
function ChatWidget({ messages = [], title = "Domaine Carneros: California Sparkling Wine…", primary = "var(--accent)" }) {
  return (
    <div className="cw">
      <div className="cw-head" style={{background: primary}}>
        <div className="row" style={{gap: 8}}>
          <span className="cw-dot"/>
          <span>{title}</span>
        </div>
        <button className="cw-close">×</button>
      </div>
      <div className="cw-body">
        {messages.map((m, i) => (
          <div key={i} className={`cw-msg cw-msg--${m.from}`}><span style={m.from==="user"?{background: primary}:undefined}>{m.text}</span></div>
        ))}
      </div>
      <div className="cw-input">
        <input placeholder="Message…"/>
        <button><window.Icon name="arrow-up-right" size={14}/></button>
      </div>
    </div>
  );
}

/* ===================== CHAT LOGS ===================== */
function ChatLogsScreen() {
  const [active, setActive] = aState(0);
  const [reviseIdx, setReviseIdx] = aState(null);
  const sessions = [
    { title: "Hi there tell me about something that I…", time: "5d ago", count: 24 },
    { title: "What type of wine do you sell?", time: "5d ago", count: 10 },
    { title: "Who is the CEO for business", time: "5d ago", count: 6 },
    { title: "Tell me about your business?", time: "5d ago", count: 8 },
    { title: "What do you know about Domaine Carn…", time: "5d ago", count: 8 },
  ];
  const messages = [
    { from: "user", text: "Hi there\ntell me about something that I might not know already", time: "07:53 PM" },
    { from: "bot", text: "Did you know our commitment to sustainability has been a core value since 1987? We've received certifications including Napa Green Winery and integrate practices like natural pest management and solar power. If you have any specific questions, feel free to ask!", time: "07:53 PM", revisable: true,
      source: { kind: "file", title: "About Domaine Carneros.pdf", page: 3, confidence: 0.78 } },
    { from: "user", text: "no i didn't know that, thanks for telling me", time: "07:54 PM" },
    { from: "bot", text: "I appreciate your feedback! If you have more questions or need assistance, feel free to ask.", time: "07:54 PM", revisable: true,
      source: { kind: "fallback", title: "No source matched — used base prompt", confidence: 0.32 } },
  ];

  // Find user question that prompted bot reply at index i
  const questionFor = (i) => {
    for (let j = i - 1; j >= 0; j--) if (messages[j].from === "user") return messages[j];
    return null;
  };

  return (
    <div className="logs">
      <div className="logs-side">
        <div className="page-header" style={{padding: "14px 14px 12px", margin: 0, borderBottom: "1px solid var(--line)"}}>
          <div style={{flex: 1}}>
            <h1 className="page-title" style={{fontSize: 17}}>Chat logs</h1>
          </div>
        </div>
        <div className="logs-toolbar">
          <div className="search-input">
            <window.Icon name="search" size={13}/>
            <input placeholder="Search sessions…"/>
          </div>
          <select className="select" style={{height: 30, fontSize: 12, padding: "0 8px"}}><option>Apr 28 – May 4</option></select>
        </div>
        <ul className="logs-list">
          {sessions.map((s, i) => (
            <li key={i} className={`logs-item ${active === i ? "logs-item--active" : ""}`} onClick={() => setActive(i)}>
              <div className="logs-item-title">{s.title}</div>
              <div className="logs-item-meta"><span>{s.time}</span><span className="dot-sep">·</span><span>{s.count} msg</span></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="logs-main">
        <div className="logs-main-head">
          <div>
            <div style={{fontWeight: 600, fontSize: 14}}>{sessions[active].title}</div>
            <div className="muted" style={{fontSize: 12}}>{sessions[active].time} · {sessions[active].count} messages · session <span className="mono">#a4f1</span></div>
          </div>
          <div className="row">
            <button className="btn btn--ghost btn--sm"><window.Icon name="copy" size={11}/> Copy transcript</button>
            <button className="btn btn--secondary btn--sm">Open in playground<window.Icon name="arrow-up-right" size={11}/></button>
          </div>
        </div>
        <div className="logs-thread">
          {messages.map((m, i) => (
            <div key={i} className={`thread-msg thread-msg--${m.from}`}>
              <div className="thread-avatar">{m.from === "user" ? "U" : <window.Icon name="bot" size={12}/>}</div>
              <div className="thread-bubble">
                <div className="thread-bubble-body">{m.text}</div>
                <div className="thread-bubble-foot">
                  <span className="mono">{m.time}</span>
                  {m.revisable && <button className="thread-revise" onClick={() => setReviseIdx(i)}><window.Icon name="spark" size={10}/> Revise</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {reviseIdx !== null && (
        <RevisePanel
          question={questionFor(reviseIdx)}
          answer={messages[reviseIdx]}
          onClose={() => setReviseIdx(null)}
        />
      )}
    </div>
  );
}

/* ===================== REVISE PANEL ===================== */
function RevisePanel({ question, answer, onClose }) {
  const [draft, setDraft] = aState(answer.text);
  const [mode, setMode] = aState("qa"); // qa | source | flag
  const [tested, setTested] = aState(false);
  const [testing, setTesting] = aState(false);

  aEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty = draft.trim() !== answer.text.trim();
  const conf = Math.round((answer.source?.confidence || 0) * 100);
  const lowConf = (answer.source?.confidence || 0) < 0.5;

  const applyTone = (t) => {
    const map = {
      shorter: draft.split(/[.!?]\s+/).filter(Boolean).slice(0, 2).join(". ") + ".",
      warmer:  draft.replace(/!\s*$/, "") + " — happy to help with anything else! ✨".replace("✨",""),
      tighter: draft.replace(/\s+/g, " ").replace(/\b(very|really|actually|basically|just)\s+/gi, "").trim(),
    };
    setDraft(map[t] || draft);
  };

  const runTest = () => {
    setTesting(true);
    setTested(false);
    setTimeout(() => { setTesting(false); setTested(true); }, 1200);
  };

  const saveLabel = mode === "qa" ? "Save to Q&A" : mode === "source" ? "Update source" : "Flag for review";

  return (
    <>
      <div className="rev-scrim" onClick={onClose}/>
      <aside className="rev-panel" role="dialog" aria-label="Revise answer">
        <header className="rev-head">
          <div className="rev-head-meta">
            <span className="rev-eyebrow"><window.Icon name="spark" size={11}/> Revise answer</span>
            <h2>Teach the agent a better reply</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div className="rev-body">
          {/* Context */}
          <section className="rev-section">
            <div className="rev-section-label">User asked</div>
            <div className="rev-quote rev-quote--user">{question?.text || "—"}</div>
          </section>

          <section className="rev-section">
            <div className="rev-section-label rev-section-label--row">
              <span>Agent replied</span>
              <span className="rev-meta-time mono">{answer.time}</span>
            </div>
            <div className="rev-quote rev-quote--bot">{answer.text}</div>

            {/* Source attribution */}
            <div className={`rev-source ${lowConf ? "rev-source--low" : ""}`}>
              <div className="rev-source-icon">
                <window.Icon name={answer.source?.kind === "file" ? "scroll" : "alert"} size={13}/>
              </div>
              <div className="rev-source-body">
                <div className="rev-source-title">
                  {answer.source?.kind === "file" ? "Drawn from" : "Source"} <strong>{answer.source?.title}</strong>
                  {answer.source?.page && <span className="muted"> · page {answer.source.page}</span>}
                </div>
                <div className="rev-source-conf">
                  <span className="rev-conf-bar"><span className="rev-conf-fill" style={{width: `${conf}%`, background: lowConf ? "var(--warn)" : "var(--success)"}}/></span>
                  <span className="mono">{conf}% match</span>
                  {answer.source?.kind === "file" && <button className="rev-source-link">Open source <window.Icon name="arrow-up-right" size={10}/></button>}
                </div>
              </div>
            </div>
          </section>

          {/* Better answer */}
          <section className="rev-section">
            <div className="rev-section-label rev-section-label--row">
              <span>Better answer</span>
              <span className="rev-counter mono">{draft.length} chars</span>
            </div>
            <textarea
              className="rev-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write the answer the agent should have given…"
              rows={7}
            />
            <div className="rev-tone-row">
              <span className="rev-tone-label">Quick edits</span>
              <button className="rev-chip" onClick={() => applyTone("shorter")}>Shorter</button>
              <button className="rev-chip" onClick={() => applyTone("warmer")}>Warmer</button>
              <button className="rev-chip" onClick={() => applyTone("tighter")}>Remove filler</button>
              <button className="rev-chip rev-chip--reset" onClick={() => setDraft(answer.text)} disabled={!dirty}>Reset</button>
            </div>
          </section>

          {/* Test */}
          <section className="rev-section">
            <div className="rev-section-label">Test the fix</div>
            <div className="rev-test">
              <div className="rev-test-q">
                <span className="rev-test-label">Re-ask</span>
                <span className="rev-test-text">{question?.text}</span>
              </div>
              <button className="btn btn--secondary btn--sm rev-test-run" onClick={runTest} disabled={testing || !dirty}>
                {testing ? <><span className="rev-spin"/> Running…</> : <><window.Icon name="play" size={11}/> Run with revised agent</>}
              </button>
              {tested && (
                <div className="rev-test-result">
                  <div className="rev-test-result-head">
                    <span className="badge badge--success"><window.Icon name="check" size={10}/> Match</span>
                    <span className="muted mono" style={{fontSize: 11}}>0.41s · 312 tokens</span>
                  </div>
                  <div className="rev-test-result-body">{draft}</div>
                </div>
              )}
            </div>
          </section>

          {/* Save as */}
          <section className="rev-section">
            <div className="rev-section-label">Save as</div>
            <div className="rev-mode">
              <label className={`rev-mode-opt ${mode === "qa" ? "is-on" : ""}`}>
                <input type="radio" name="rev-mode" checked={mode === "qa"} onChange={() => setMode("qa")}/>
                <div>
                  <div className="rev-mode-title"><window.Icon name="book" size={12}/> New Q&A pair</div>
                  <div className="rev-mode-desc">Agent learns this answer for similar questions. Available immediately.</div>
                </div>
              </label>
              <label className={`rev-mode-opt ${mode === "source" ? "is-on" : ""}`}>
                <input type="radio" name="rev-mode" checked={mode === "source"} onChange={() => setMode("source")} disabled={answer.source?.kind !== "file"}/>
                <div>
                  <div className="rev-mode-title"><window.Icon name="scroll" size={12}/> Patch source document {answer.source?.kind !== "file" && <span className="rev-mode-pill">no source</span>}</div>
                  <div className="rev-mode-desc">Edit the underlying file. Affects every answer drawn from it. Triggers re-index.</div>
                </div>
              </label>
              <label className={`rev-mode-opt ${mode === "flag" ? "is-on" : ""}`}>
                <input type="radio" name="rev-mode" checked={mode === "flag"} onChange={() => setMode("flag")}/>
                <div>
                  <div className="rev-mode-title"><window.Icon name="alert" size={12}/> Flag for review</div>
                  <div className="rev-mode-desc">Log feedback without training. Shows up in Unanswered queue.</div>
                </div>
              </label>
            </div>
          </section>
        </div>

        <footer className="rev-foot">
          <div className="rev-foot-meta">
            <span className="badge badge--neutral">session <span className="mono">#a4f1</span></span>
            {dirty && <span className="muted" style={{fontSize: 12}}>Unsaved changes</span>}
          </div>
          <div className="row">
            <button className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary btn--sm" disabled={!dirty}>
              {saveLabel} <window.Icon name="arrow-right" size={11}/>
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}

/* ===================== CHATS ANALYTICS ===================== */
function ChatsAnalyticsScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chats</h1>
          <p className="page-subtitle">Volume and trends for Domaine Carneros: California Sparkling Wine & Pinot Noir.</p>
        </div>
        <div className="row">
          <select className="select" style={{height: 32, width: 220}}><option>Apr 28 – May 4, 2026</option></select>
          <button className="btn btn--secondary btn--sm">Refresh</button>
        </div>
      </div>

      <div className="usage-grid">
        <div className="card stat-card">
          <div className="stat-eyebrow">Total messages</div>
          <div className="stat-num"><span className="stat-num-big">56</span></div>
          <div className="muted" style={{fontSize: 12}}>In selected period · 14 from users · 42 from agent</div>
        </div>
        <div className="card stat-card">
          <div className="stat-eyebrow">Conversations</div>
          <div className="stat-num"><span className="stat-num-big">5</span></div>
          <div className="muted" style={{fontSize: 12}}>Avg <span className="mono">11.2</span> messages each</div>
        </div>
        <div className="card stat-card">
          <div className="stat-eyebrow">Trend</div>
          <div className="stat-num"><span className="stat-num-big" style={{color: "var(--success)"}}>+150%</span></div>
          <div className="muted" style={{fontSize: 12}}>vs. previous 7 days</div>
        </div>
      </div>

      <div className="card" style={{marginTop: 14}}>
        <div className="card-header">
          <div>
            <div className="card-title">Chats over time</div>
            <div className="card-subtitle">Daily conversations · Apr 28 – May 4, 2026</div>
          </div>
          <div className="row">
            <button className="btn btn--ghost btn--sm">Conversations</button>
            <button className="btn btn--ghost btn--sm">Messages</button>
          </div>
        </div>
        <div className="card-body" style={{padding: "8px 0 0"}}>
          <ChatsLineChart/>
        </div>
      </div>
    </div>
  );
}

function ChatsLineChart() {
  const data = [0, 5, 1, 0, 0, 0, 0];
  const labels = ["Apr 28", "Apr 29", "Apr 30", "May 1", "May 2", "May 3", "May 4"];
  const max = Math.max(8, ...data);
  const W = 1000, H = 240, padL = 36, padR = 16, padT = 16, padB = 32;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const pts = data.map((v, i) => [padL + (i / (data.length - 1)) * innerW, padT + innerH - (v / max) * innerH]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `C${p[0]-30},${p[1]} ${pts[i-1][0]+30},${pts[i-1][1]} ${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${pts[pts.length-1][0]},${padT+innerH} L${pts[0][0]},${padT+innerH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{display: "block"}}>
      <defs>
        <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <g key={p}>
          <line x1={padL} x2={W-padR} y1={padT+innerH*(1-p)} y2={padT+innerH*(1-p)} stroke="var(--line)" strokeDasharray={p===0?"":"2 3"}/>
          <text x={padL-8} y={padT+innerH*(1-p)+3} fontSize="10" textAnchor="end" fontFamily="var(--font-mono)" fill="var(--ink-4)">{Math.round(max*p)}</text>
        </g>
      ))}
      <path d={area} fill="url(#chartGrad)"/>
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8"/>
      {pts.map((p, i) => data[i] > 0 && (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.8"/>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={padL + (i/(labels.length-1))*innerW} y={H-10} fontSize="10.5" textAnchor="middle" fontFamily="var(--font-mono)" fill="var(--ink-4)">{l}</text>
      ))}
    </svg>
  );
}

/* ===================== FILES ===================== */
function FilesScreen() {
  const files = [
    { name: "DomaineCarneros-FAQ.pdf", size: "412 KB", date: "May 2, 2026", status: "trained" },
    { name: "Wine-Club-Terms.docx", size: "88 KB", date: "May 2, 2026", status: "trained" },
    { name: "AttendanceReport.pdf", size: "83.6 KB", date: "May 4, 2026", status: "queued" },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Files</h1>
          <p className="page-subtitle">Upload documents the agent can reference. PDF, DOCX, TXT, MD up to 10 MB each.</p>
        </div>
        <div className="row">
          <span className="badge badge--warn"><span className="dot dot--ink" style={{background: "var(--warn)"}}/>1 file pending training</span>
          <button className="btn btn--primary"><window.Icon name="spark" size={13}/> Train agent</button>
        </div>
      </div>

      <div className="dropzone">
        <div className="dropzone-icon"><window.Icon name="scroll" size={20}/></div>
        <div style={{textAlign: "center"}}>
          <div style={{fontWeight: 500, fontSize: 14}}>Drag files here or click to upload</div>
          <div className="muted" style={{fontSize: 12.5, marginTop: 2}}>PDF, DOCX, TXT, MD · max 10 MB · up to 20 MB total on Standard</div>
        </div>
        <button className="btn btn--secondary btn--sm">Choose files</button>
      </div>

      <div className="card" style={{marginTop: 16}}>
        <div className="card-header">
          <div className="card-title">Uploaded · {files.length}</div>
          <input className="input" placeholder="Filter…" style={{width: 200, height: 28}}/>
        </div>
        <div className="files-list">
          {files.map((f, i) => (
            <div key={i} className="file-row">
              <div className="file-icon"><window.Icon name="scroll" size={14}/></div>
              <div className="file-meta">
                <div style={{fontWeight: 500}}>{f.name}</div>
                <div className="muted mono" style={{fontSize: 11.5}}>{f.size} · {f.date}</div>
              </div>
              <span className={`badge ${f.status === "trained" ? "badge--success" : "badge--warn"}`}>
                {f.status === "trained" ? "Trained" : "Queued"}
              </span>
              <button className="icon-btn"><window.Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== Q&A ===================== */
function QaScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Q&amp;A pairs</h1>
          <p className="page-subtitle">Exact question-answer pairs the agent prioritizes over training data. No retraining needed.</p>
        </div>
        <button className="btn btn--secondary btn--sm">Import CSV<window.Icon name="external" size={11}/></button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">New Q&amp;A</div>
        </div>
        <div className="card-body">
          <label className="field">
            <span className="field-label">Question</span>
            <input className="input" placeholder="e.g. What are your business hours?"/>
          </label>
          <label className="field">
            <span className="field-label row" style={{justifyContent: "space-between"}}>
              <span>Answer</span>
              <span className="muted" style={{fontSize: 11.5, fontWeight: 400}}>Rich text · stored as Markdown</span>
            </span>
            <div className="qa-toolbar">
              {["B","I","U","S","≡","¶","🔗","</>","⤺","⤻"].map((t,i) => (
                <button key={i} className="qa-tool" style={i===0?{fontWeight:700}:i===1?{fontStyle:"italic"}:undefined}>{t}</button>
              ))}
            </div>
            <textarea className="textarea" rows="5" style={{borderTopLeftRadius:0,borderTopRightRadius:0,borderTop:0}} placeholder="e.g. We're open Monday to Friday, 9am to 5pm EST."></textarea>
          </label>
          <div className="row" style={{justifyContent: "flex-end", gap: 8}}>
            <button className="btn btn--ghost btn--sm">Cancel</button>
            <button className="btn btn--primary btn--sm">Save Q&amp;A</button>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 14}}>
        <div className="card-header">
          <div className="card-title">Existing Q&amp;A · 0</div>
        </div>
        <div className="empty-soft">
          <div className="empty-soft-icon"><window.Icon name="book" size={18}/></div>
          <div style={{fontWeight: 500}}>No Q&amp;A pairs yet</div>
          <div className="muted" style={{fontSize: 12.5}}>Add one above. They'll be matched against incoming questions and answered verbatim.</div>
        </div>
      </div>
    </div>
  );
}

/* ===================== WEBSITE ===================== */
function WebsiteScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Website</h1>
          <p className="page-subtitle">Crawl URLs, follow same-domain links, and extract text. Press "Train" to feed content to the agent.</p>
        </div>
      </div>

      <div className="usage-grid" style={{gridTemplateColumns: "repeat(4, 1fr)"}}>
        {[
          { label: "Links fed", num: 30, sub: "Used in chat" },
          { label: "Not fed yet", num: 0, sub: "Press retrain" },
          { label: "Total size", num: "138 KB", sub: "In knowledge" },
          { label: "Pending size", num: "0 KB", sub: "Will be added" },
        ].map((s, i) => (
          <div key={i} className="card stat-card" style={{padding: 14}}>
            <div className="stat-eyebrow" style={{marginBottom: 8}}>{s.label}</div>
            <div className="stat-num" style={{marginBottom: 4}}><span className="stat-num-big" style={{fontSize: 22}}>{s.num}</span></div>
            <div className="muted" style={{fontSize: 11.5}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="row" style={{justifyContent: "space-between", margin: "16px 0"}}>
        <button className="btn btn--primary btn--sm"><window.Icon name="spark" size={13}/> Retrain agent</button>
        <span className="muted" style={{fontSize: 12}}>Last trained <span className="mono">Apr 26, 2026</span></span>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="row" style={{gap: 12}}>
            <div className="url-icon"><window.Icon name="external" size={14}/></div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 500}}>Add website URL</div>
              <div className="muted" style={{fontSize: 12}}>We'll crawl and index the page for your agent.</div>
            </div>
          </div>
          <div className="url-input">
            <input className="input" placeholder="https://example.com or https://example.com/docs"/>
            <button className="btn btn--primary">Crawl</button>
          </div>
        </div>
      </div>

      <div className="section-eyebrow" style={{margin: "18px 0 10px"}}>30 links · 138 KB</div>
      <div className="card">
        <div className="link-row">
          <div className="url-icon"><window.Icon name="external" size={13}/></div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 500}} className="mono">https://www.domainecarneros.com/</div>
            <div className="muted" style={{fontSize: 12}}>Last crawled Apr 26 · 30 links</div>
          </div>
          <span className="badge badge--success"><window.Icon name="check" size={10}/> Fed</span>
          <button className="icon-btn"><window.Icon name="more" size={14}/></button>
          <button className="icon-btn"><window.Icon name="chevron-right" size={14}/></button>
        </div>
      </div>
    </div>
  );
}

/* ===================== CONNECTED APPS ===================== */
function ConnectedAppsScreen() {
  const apps = [
    { name: "Slack", desc: "Respond in channels and DMs. @mention your agent or message it directly.", color: "#611f69", letter: "#", status: "available" },
    { name: "WhatsApp", desc: "Chat with customers over WhatsApp Business.", color: "#25d366", letter: "W", status: "soon" },
    { name: "Zendesk", desc: "Support tickets and help center in one place.", color: "#03363d", letter: "Z", status: "soon" },
    { name: "Shopify", desc: "Product and order context for your store.", color: "#7ab55c", letter: "S", status: "soon" },
    { name: "Intercom", desc: "Hand off to humans inside Intercom.", color: "#1f8ded", letter: "I", status: "soon" },
    { name: "HubSpot", desc: "Sync CRM contacts and conversations.", color: "#ff7a59", letter: "H", status: "soon" },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Connected Apps</h1>
          <p className="page-subtitle">Connect your agent to external services. Set up an integration to deploy beyond the embedded widget.</p>
        </div>
      </div>

      <div className="apps-grid">
        {apps.map(a => (
          <article key={a.name} className={`app-card ${a.status === "available" ? "app-card--available" : ""}`}>
            <div className="app-card-top">
              <div className="app-mark" style={{background: a.color}}>{a.letter}</div>
              <span className={`badge ${a.status === "available" ? "badge--success" : "badge--neutral"}`}>
                {a.status === "available" ? "Available" : "Coming soon"}
              </span>
            </div>
            <h3 className="app-name">{a.name}</h3>
            <p className="app-desc">{a.desc}</p>
            {a.status === "available" ? (
              <button className="btn btn--secondary btn--sm" style={{width: "100%"}}>Set up<window.Icon name="arrow-right" size={12}/></button>
            ) : (
              <button className="btn btn--ghost btn--sm" style={{width: "100%"}} disabled>Notify me</button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ===================== ACTIONS ===================== */
function ActionsScreen() {
  const [building, setBuilding] = aState(false);

  if (building) {
    return <NewActionBuilder onCancel={() => setBuilding(false)} onSave={() => setBuilding(false)}/>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Actions</h1>
          <p className="page-subtitle">Let the agent call your API or external tools. Define inputs, outputs, and authentication.</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setBuilding(true)}><window.Icon name="plus" size={12}/> New action</button>
      </div>

      <div className="actions-grid">
        {[
          { name: "Lookup order", method: "GET", url: "/v1/orders/:id", calls: 1240 },
          { name: "Schedule consultation", method: "POST", url: "/v1/calendar/events", calls: 88 },
          { name: "Refund request", method: "POST", url: "/v1/billing/refund", calls: 12, danger: true },
        ].map(a => (
          <div key={a.name} className="action-card">
            <div className="row" style={{gap: 10}}>
              <span className={`http-method http-method--${a.method.toLowerCase()}`}>{a.method}</span>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 600, fontSize: 13.5}}>{a.name}</div>
                <div className="muted mono" style={{fontSize: 11.5, marginTop: 2}}>{a.url}</div>
              </div>
              <div className="muted" style={{fontSize: 12, textAlign: "right"}}>
                <div className="mono" style={{color: "var(--ink)"}}>{a.calls.toLocaleString()}</div>
                <div style={{fontSize: 10.5}}>calls / 30d</div>
              </div>
              <button className="icon-btn"><window.Icon name="more" size={14}/></button>
            </div>
            {a.danger && <div className="action-warn"><window.Icon name="alert" size={11}/> Requires confirmation before execution</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== NEW ACTION BUILDER ===================== */
function NewActionBuilder({ onCancel, onSave }) {
  const [tab, setTab] = aState("setup");
  const [name, setName] = aState("");
  const [desc, setDesc] = aState("");
  const [method, setMethod] = aState("GET");
  const [url, setUrl] = aState("https://api.example.com/v1/");
  const [confirm, setConfirm] = aState(false);
  const [params, setParams] = aState([
    { id: 1, name: "id", type: "string", required: true, source: "agent", description: "Unique identifier extracted from the user message" },
  ]);
  const [headers, setHeaders] = aState([
    { id: 1, key: "Content-Type", value: "application/json" },
  ]);
  const [bodyType, setBodyType] = aState("json");
  const [bodyJson, setBodyJson] = aState(`{
  "id": "{{id}}"
}`);
  const [auth, setAuth] = aState("bearer");
  const [authValue, setAuthValue] = aState("env.STRIPE_API_KEY");
  const [responseMap, setResponseMap] = aState(`{
  "order_id": "$.data.id",
  "status":   "$.data.status"
}`);
  const [whenToCall, setWhenToCall] = aState("When the user asks about a specific order, refund, or shipment status.");
  const [testStatus, setTestStatus] = aState(null); // null | "running" | "ok" | "err"
  const [testResponse, setTestResponse] = aState(null);

  const tabs = [
    { id: "setup",      label: "Setup",      icon: "settings" },
    { id: "params",     label: "Parameters", icon: "scroll",   count: params.length },
    { id: "request",    label: "Request",    icon: "external" },
    { id: "auth",       label: "Auth",       icon: "shield" },
    { id: "response",   label: "Response",   icon: "spark" },
    { id: "when",       label: "When to call", icon: "command" },
  ];

  const isValid = name.trim().length > 0 && url.trim().length > 8;

  const runTest = () => {
    setTestStatus("running");
    setTestResponse(null);
    setTimeout(() => {
      // Simulate response
      const ok = Math.random() > 0.15;
      if (ok) {
        setTestStatus("ok");
        setTestResponse({
          status: 200,
          time: "284 ms",
          headers: { "content-type": "application/json", "x-request-id": "req_2k9af1" },
          body: { data: { id: "ord_4421", status: "shipped", total_cents: 12900, currency: "USD", shipped_at: "2026-05-04T14:22:00Z" } },
        });
      } else {
        setTestStatus("err");
        setTestResponse({
          status: 401,
          time: "98 ms",
          headers: { "content-type": "application/json" },
          body: { error: "invalid_api_key", message: "API key in env.STRIPE_API_KEY is not configured." },
        });
      }
    }, 900);
  };

  return (
    <div className="action-builder">
      {/* Top bar */}
      <header className="ab-header">
        <button className="back-link" onClick={onCancel}>
          <window.Icon name="chevron-right" size={12} className="back-arrow"/>
          Back to Actions
        </button>
        <div className="ab-header-meta">
          <span className="badge badge--neutral">Draft</span>
          <span className="muted" style={{fontSize: 11.5}}>Autosaved <span className="mono">just now</span></span>
        </div>
        <div className="row" style={{gap: 8}}>
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>Discard</button>
          <button className="btn btn--primary btn--sm" disabled={!isValid} onClick={onSave}>
            <window.Icon name="check" size={12}/> Save action
          </button>
        </div>
      </header>

      {/* Identity strip */}
      <div className="ab-identity">
        <div className="ab-identity-main">
          <input
            className="ab-name-input"
            placeholder="Untitled action"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="ab-desc-input"
            placeholder="What does this action do? (visible to the agent)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="ab-endpoint">
            <select className="ab-method" data-method={method.toLowerCase()} value={method} onChange={e => setMethod(e.target.value)}>
              {["GET","POST","PUT","PATCH","DELETE"].map(m => <option key={m}>{m}</option>)}
            </select>
            <input className="ab-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/v1/…"/>
          </div>
        </div>
      </div>

      {/* Body: two columns */}
      <div className="ab-body">
        <div className="ab-left">
          <nav className="ab-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`ab-tab ${tab === t.id ? "ab-tab--active" : ""}`}
              >
                <window.Icon name={t.icon} size={14}/>
                <span>{t.label}</span>
                {typeof t.count === "number" && <span className="ab-tab-count">{t.count}</span>}
              </button>
            ))}
          </nav>

          <div className="ab-pane">
            {tab === "setup" && <ABSetup confirm={confirm} setConfirm={setConfirm}/>}
            {tab === "params" && <ABParams params={params} setParams={setParams}/>}
            {tab === "request" && <ABRequest headers={headers} setHeaders={setHeaders} bodyType={bodyType} setBodyType={setBodyType} bodyJson={bodyJson} setBodyJson={setBodyJson} method={method}/>}
            {tab === "auth" && <ABAuth auth={auth} setAuth={setAuth} authValue={authValue} setAuthValue={setAuthValue}/>}
            {tab === "response" && <ABResponse responseMap={responseMap} setResponseMap={setResponseMap}/>}
            {tab === "when" && <ABWhenToCall whenToCall={whenToCall} setWhenToCall={setWhenToCall}/>}
          </div>
        </div>

        <aside className="ab-right">
          <ABTester
            method={method} url={url} headers={headers} body={bodyType === "json" ? bodyJson : ""}
            params={params} status={testStatus} response={testResponse} runTest={runTest}
            onClear={() => { setTestStatus(null); setTestResponse(null); }}
          />
        </aside>
      </div>
    </div>
  );
}

/* ---------- Setup tab ---------- */
function ABSetup({ confirm, setConfirm }) {
  return (
    <div>
      <div className="ab-section-eyebrow">Behavior</div>
      <div className="card" style={{marginBottom: 14}}>
        <div className="card-body" style={{padding: 14}}>
          <label className="ab-row">
            <div>
              <div style={{fontWeight: 500, fontSize: 13.5}}>Require user confirmation</div>
              <div className="muted" style={{fontSize: 12}}>Agent shows the inputs and asks the user to approve before calling. Recommended for destructive or paid actions.</div>
            </div>
            <button
              className={`toggle ${confirm ? "toggle--on" : ""}`}
              onClick={() => setConfirm(c => !c)}
              aria-pressed={confirm}
            >
              <span className="toggle-thumb"/>
            </button>
          </label>
          <div className="divider"/>
          <label className="ab-row">
            <div>
              <div style={{fontWeight: 500, fontSize: 13.5}}>Allow streaming responses to user</div>
              <div className="muted" style={{fontSize: 12}}>Let the agent narrate the API result as it streams back.</div>
            </div>
            <button className="toggle toggle--on">
              <span className="toggle-thumb"/>
            </button>
          </label>
        </div>
      </div>

      <div className="ab-section-eyebrow">Categorization</div>
      <div className="card">
        <div className="card-body" style={{padding: 14}}>
          <label className="field">
            <span className="field-label">Tags</span>
            <div className="ab-tags">
              {["billing", "internal"].map(t => (
                <span key={t} className="ab-tag-chip">{t} <button>×</button></span>
              ))}
              <input className="ab-tag-input" placeholder="Add tag…"/>
            </div>
            <span className="field-hint">Tags help group actions and filter logs.</span>
          </label>

          <label className="field" style={{marginBottom: 0}}>
            <span className="field-label">Rate limit</span>
            <div className="row" style={{gap: 6}}>
              <input className="input" style={{width: 80}} type="number" defaultValue="30"/>
              <select className="select" style={{width: 140}}>
                <option>calls / minute</option>
                <option>calls / hour</option>
                <option>calls / day</option>
              </select>
              <span className="muted" style={{fontSize: 12, marginLeft: 8}}>per conversation</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ---------- Parameters tab ---------- */
function ABParams({ params, setParams }) {
  const update = (id, patch) => setParams(p => p.map(x => x.id === id ? { ...x, ...patch } : x));
  const remove = (id) => setParams(p => p.filter(x => x.id !== id));
  const add = () => setParams(p => [...p, { id: Date.now(), name: "", type: "string", required: false, source: "agent", description: "" }]);

  return (
    <div>
      <div className="ab-section-eyebrow">Input parameters</div>
      <p className="muted" style={{fontSize: 12.5, marginTop: 4, marginBottom: 14}}>
        The agent will fill these from the conversation. Each parameter becomes available as <code className="code-inline">{`{{name}}`}</code> in the URL, headers, or body.
      </p>

      <div className="ab-params-table">
        <div className="ab-params-row ab-params-row--head">
          <span>Name</span>
          <span>Type</span>
          <span>Source</span>
          <span>Required</span>
          <span></span>
        </div>
        {params.map(p => (
          <div key={p.id} className="ab-params-row">
            <input className="input" placeholder="e.g. order_id" value={p.name} onChange={e => update(p.id, { name: e.target.value })}/>
            <select className="select" value={p.type} onChange={e => update(p.id, { type: e.target.value })}>
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="enum">enum</option>
              <option value="object">object</option>
            </select>
            <select className="select" value={p.source} onChange={e => update(p.id, { source: e.target.value })}>
              <option value="agent">From conversation</option>
              <option value="user">Ask user</option>
              <option value="fixed">Fixed value</option>
              <option value="context">Workspace context</option>
            </select>
            <button
              className={`toggle ${p.required ? "toggle--on" : ""}`}
              onClick={() => update(p.id, { required: !p.required })}
            >
              <span className="toggle-thumb"/>
            </button>
            <button className="icon-btn" onClick={() => remove(p.id)} aria-label="Remove">
              <window.Icon name="trash" size={13}/>
            </button>

            <div className="ab-param-desc">
              <input
                className="input"
                placeholder="Description — tell the agent how to extract this value"
                value={p.description}
                onChange={e => update(p.id, { description: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn--ghost btn--sm" onClick={add} style={{marginTop: 8}}>
        <window.Icon name="plus" size={12}/> Add parameter
      </button>
    </div>
  );
}

/* ---------- Request tab ---------- */
function ABRequest({ headers, setHeaders, bodyType, setBodyType, bodyJson, setBodyJson, method }) {
  const update = (id, patch) => setHeaders(h => h.map(x => x.id === id ? { ...x, ...patch } : x));
  const remove = (id) => setHeaders(h => h.filter(x => x.id !== id));
  const add = () => setHeaders(h => [...h, { id: Date.now(), key: "", value: "" }]);

  const hasBody = ["POST","PUT","PATCH"].includes(method);

  return (
    <div>
      <div className="ab-section-eyebrow">Headers</div>
      <div className="ab-headers">
        {headers.map(h => (
          <div key={h.id} className="ab-header-row">
            <input className="input mono" placeholder="Header-Name" value={h.key} onChange={e => update(h.id, { key: e.target.value })}/>
            <input className="input mono" placeholder="value or {{template}}" value={h.value} onChange={e => update(h.id, { value: e.target.value })}/>
            <button className="icon-btn" onClick={() => remove(h.id)}><window.Icon name="trash" size={13}/></button>
          </div>
        ))}
        <button className="btn btn--ghost btn--sm" onClick={add}><window.Icon name="plus" size={12}/> Add header</button>
      </div>

      {hasBody && (
        <>
          <div className="ab-section-eyebrow" style={{marginTop: 24}}>Request body</div>
          <div className="ab-body-type">
            {["json","form","none"].map(t => (
              <button key={t} className={`ab-pill ${bodyType === t ? "ab-pill--active" : ""}`} onClick={() => setBodyType(t)}>
                {t === "json" ? "JSON" : t === "form" ? "Form data" : "None"}
              </button>
            ))}
          </div>
          {bodyType === "json" && (
            <div className="ab-code-wrap">
              <div className="ab-code-head">
                <span className="mono">application/json</span>
                <button className="ab-mini-btn">
                  <window.Icon name="spark" size={11}/> Format
                </button>
              </div>
              <textarea className="ab-code" rows={8} value={bodyJson} onChange={e => setBodyJson(e.target.value)} spellCheck={false}/>
            </div>
          )}
          {bodyType === "form" && (
            <div className="muted" style={{fontSize: 12.5, padding: 14, background: "var(--bg-2)", borderRadius: 8}}>
              Form fields will be auto-generated from your <strong>Parameters</strong>. Switch to <strong>JSON</strong> for custom shapes.
            </div>
          )}
          {bodyType === "none" && (
            <div className="muted" style={{fontSize: 12.5, padding: 14, background: "var(--bg-2)", borderRadius: 8}}>
              No body will be sent. Parameters will be passed as URL query strings or path segments.
            </div>
          )}
        </>
      )}

      <div className="ab-tip">
        <window.Icon name="spark" size={12}/>
        <div>
          Use <code className="code-inline">{`{{param_name}}`}</code> to insert parameter values. They get filled at runtime.
        </div>
      </div>
    </div>
  );
}

/* ---------- Auth tab ---------- */
function ABAuth({ auth, setAuth, authValue, setAuthValue }) {
  return (
    <div>
      <div className="ab-section-eyebrow">Authentication</div>
      <div className="ab-auth-options">
        {[
          { id: "none", label: "None", desc: "Public endpoint" },
          { id: "bearer", label: "Bearer token", desc: "Authorization: Bearer …" },
          { id: "basic", label: "Basic auth", desc: "Username + password" },
          { id: "apikey", label: "API key in header", desc: "Custom header name" },
          { id: "oauth", label: "OAuth 2.0", desc: "Connect a provider" },
        ].map(o => (
          <label key={o.id} className={`model-option ${auth === o.id ? "model-option--active" : ""}`}>
            <input type="radio" name="auth" checked={auth === o.id} onChange={() => setAuth(o.id)}/>
            <div className="model-option-body">
              <div style={{fontWeight: 500, fontSize: 13.5}}>{o.label}</div>
              <div className="muted" style={{fontSize: 12.5}}>{o.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {auth !== "none" && (
        <div className="card" style={{marginTop: 14}}>
          <div className="card-body" style={{padding: 14}}>
            {auth === "bearer" && (
              <>
                <label className="field" style={{marginBottom: 0}}>
                  <span className="field-label">Token</span>
                  <input className="input mono" value={authValue} onChange={e => setAuthValue(e.target.value)} placeholder="env.MY_API_KEY or paste a literal token"/>
                  <span className="field-hint">Use <code className="code-inline">env.NAME</code> to reference a workspace secret. <a className="link" href="#">Manage secrets →</a></span>
                </label>
              </>
            )}
            {auth === "basic" && (
              <div className="row" style={{gap: 8}}>
                <label className="field" style={{flex: 1, marginBottom: 0}}>
                  <span className="field-label">Username</span>
                  <input className="input" placeholder="env.STRIPE_USER"/>
                </label>
                <label className="field" style={{flex: 1, marginBottom: 0}}>
                  <span className="field-label">Password</span>
                  <input className="input" placeholder="env.STRIPE_PASS" type="password"/>
                </label>
              </div>
            )}
            {auth === "apikey" && (
              <div className="row" style={{gap: 8}}>
                <label className="field" style={{flex: 1, marginBottom: 0}}>
                  <span className="field-label">Header name</span>
                  <input className="input mono" defaultValue="X-API-Key"/>
                </label>
                <label className="field" style={{flex: 1, marginBottom: 0}}>
                  <span className="field-label">Value</span>
                  <input className="input mono" placeholder="env.MY_API_KEY"/>
                </label>
              </div>
            )}
            {auth === "oauth" && (
              <div className="ab-oauth-empty">
                <window.Icon name="key" size={20}/>
                <div>
                  <div style={{fontWeight: 500}}>Connect an OAuth provider</div>
                  <div className="muted" style={{fontSize: 12.5}}>The agent will use your team's connected account when calling this action.</div>
                </div>
                <button className="btn btn--primary btn--sm">Connect</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Response tab ---------- */
function ABResponse({ responseMap, setResponseMap }) {
  return (
    <div>
      <div className="ab-section-eyebrow">Response mapping</div>
      <p className="muted" style={{fontSize: 12.5, marginTop: 4, marginBottom: 14}}>
        Extract the fields the agent should remember from the response. Use JSONPath syntax.
      </p>

      <div className="ab-code-wrap">
        <div className="ab-code-head">
          <span className="mono">extracted fields</span>
          <button className="ab-mini-btn"><window.Icon name="copy" size={11}/> Insert example</button>
        </div>
        <textarea className="ab-code" rows={6} value={responseMap} onChange={e => setResponseMap(e.target.value)} spellCheck={false}/>
      </div>

      <div className="ab-section-eyebrow" style={{marginTop: 24}}>On failure</div>
      <div className="card">
        <div className="card-body" style={{padding: 0}}>
          {[
            { code: "401, 403", label: "Auth errors", action: "Tell the user the integration needs attention", default: true },
            { code: "404", label: "Not found", action: "Tell the user the resource doesn't exist" },
            { code: "429", label: "Rate limited", action: "Retry once with backoff, then tell the user" },
            { code: "5xx", label: "Server errors", action: "Retry twice, then apologize and offer to escalate" },
          ].map((r, i) => (
            <div key={i} className="ab-failure-row">
              <span className="badge badge--neutral mono">{r.code}</span>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500, fontSize: 13}}>{r.label}</div>
                <div className="muted" style={{fontSize: 12}}>{r.action}</div>
              </div>
              <button className="btn btn--ghost btn--sm">Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- When to call tab ---------- */
function ABWhenToCall({ whenToCall, setWhenToCall }) {
  return (
    <div>
      <div className="ab-section-eyebrow">Trigger instructions</div>
      <p className="muted" style={{fontSize: 12.5, marginTop: 4, marginBottom: 14}}>
        Plain-English description of when the agent should call this action. The agent uses this to decide between actions and to ask for missing parameters.
      </p>
      <textarea
        className="textarea"
        rows={4}
        value={whenToCall}
        onChange={e => setWhenToCall(e.target.value)}
        placeholder="e.g. When the user asks about an order status, refund, or shipment."
      />

      <div className="ab-section-eyebrow" style={{marginTop: 24}}>Examples (few-shot)</div>
      <p className="muted" style={{fontSize: 12.5, marginTop: 4, marginBottom: 12}}>Give the agent examples of conversations that should — and shouldn't — trigger this action.</p>

      <div className="ab-examples">
        {[
          { kind: "positive", text: "Where is my order #4421?", extracted: { order_id: "4421" } },
          { kind: "positive", text: "Has order ORD-5512 shipped yet?", extracted: { order_id: "ORD-5512" } },
          { kind: "negative", text: "What are your business hours?", note: "General question, no order ID — answer from knowledge base." },
        ].map((ex, i) => (
          <div key={i} className={`ab-example ab-example--${ex.kind}`}>
            <div className="ab-example-head">
              {ex.kind === "positive"
                ? <span className="badge badge--success"><window.Icon name="check" size={10}/> Should call</span>
                : <span className="badge badge--neutral">Should NOT call</span>}
              <button className="icon-btn"><window.Icon name="trash" size={13}/></button>
            </div>
            <div className="ab-example-body">"{ex.text}"</div>
            {ex.extracted && (
              <div className="ab-example-extract">
                <span className="muted" style={{fontSize: 11.5}}>Extracted →</span>
                <code className="code-inline">{JSON.stringify(ex.extracted)}</code>
              </div>
            )}
            {ex.note && <div className="muted" style={{fontSize: 12, marginTop: 4}}>{ex.note}</div>}
          </div>
        ))}
        <button className="btn btn--ghost btn--sm"><window.Icon name="plus" size={12}/> Add example</button>
      </div>
    </div>
  );
}

/* ---------- Tester (right pane) ---------- */
function ABTester({ method, url, headers, body, params, status, response, runTest, onClear }) {
  const [paramValues, setParamValues] = aState({});
  const filledUrl = url.replace(/{{(\w+)}}/g, (_, k) => paramValues[k] || `{{${k}}}`);

  return (
    <div className="ab-tester">
      <div className="ab-tester-head">
        <div>
          <div className="ab-section-eyebrow" style={{margin: 0}}>Test runner</div>
          <div className="muted" style={{fontSize: 11.5, marginTop: 2}}>Try this action with sample inputs without saving.</div>
        </div>
        {status && status !== "running" && (
          <button className="btn btn--ghost btn--sm" onClick={onClear}>Clear</button>
        )}
      </div>

      <div className="ab-tester-body">
        <div className="ab-tester-section">
          <div className="ab-tester-eyebrow">Sample inputs</div>
          {params.length === 0 ? (
            <div className="muted" style={{fontSize: 12.5}}>No parameters defined. Add some on the Parameters tab.</div>
          ) : (
            params.map(p => (
              <label key={p.id} className="field" style={{marginBottom: 8}}>
                <span className="field-label row" style={{justifyContent: "space-between"}}>
                  <span className="mono">{p.name || "unnamed"}</span>
                  <span className="muted" style={{fontSize: 11, fontWeight: 400}}>{p.type}{p.required ? " · required" : ""}</span>
                </span>
                <input
                  className="input"
                  placeholder={`Sample ${p.type} value`}
                  value={paramValues[p.name] || ""}
                  onChange={e => setParamValues(v => ({ ...v, [p.name]: e.target.value }))}
                />
              </label>
            ))
          )}
        </div>

        <div className="ab-tester-section">
          <div className="ab-tester-eyebrow">Outgoing request</div>
          <div className="ab-preview-block">
            <div className="ab-preview-row">
              <span className={`http-method http-method--${method.toLowerCase()}`}>{method}</span>
              <span className="mono ab-preview-url">{filledUrl}</span>
            </div>
            {headers.filter(h => h.key).map(h => (
              <div key={h.id} className="ab-preview-header"><span className="mono ab-preview-hk">{h.key}:</span> <span className="mono ab-preview-hv">{h.value}</span></div>
            ))}
            {body && body.trim() && (
              <pre className="ab-preview-body">{body}</pre>
            )}
          </div>
        </div>

        <button
          className="btn btn--primary"
          style={{width: "100%"}}
          onClick={runTest}
          disabled={status === "running"}
        >
          {status === "running" ? <>
            <span className="dot-pulse"/> Sending test request…
          </> : <>
            <window.Icon name="play" size={12}/> Run test request
          </>}
        </button>

        {response && (
          <div className="ab-tester-section">
            <div className="ab-tester-eyebrow row" style={{justifyContent: "space-between"}}>
              <span>Response</span>
              <span className={`badge ${status === "ok" ? "badge--success" : "badge--danger"}`}>
                {response.status} · {response.time}
              </span>
            </div>
            <div className="ab-preview-block">
              {Object.entries(response.headers).map(([k, v]) => (
                <div key={k} className="ab-preview-header"><span className="mono ab-preview-hk">{k}:</span> <span className="mono ab-preview-hv">{v}</span></div>
              ))}
              <pre className="ab-preview-body">{JSON.stringify(response.body, null, 2)}</pre>
            </div>
            {status === "ok" && (
              <div className="ab-tester-extract">
                <window.Icon name="check" size={11}/>
                <div>
                  <div style={{fontWeight: 500, fontSize: 12.5}}>Agent will remember:</div>
                  <div className="mono" style={{fontSize: 11.5, marginTop: 4}}>
                    order_id = <strong>ord_4421</strong> · status = <strong>shipped</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== CHAT WIDGET ===================== */
function ChatWidgetScreen() {
  const [tab, setTab] = aState("theme");
  const [primary, setPrimary] = aState("#0e9b6b");
  return (
    <div className="widget-page">
      <div className="widget-config">
        <div style={{padding: "14px 16px 0"}}>
          <h1 className="page-title" style={{fontSize: 17, marginBottom: 4}}>Chat widget</h1>
          <p className="page-subtitle" style={{fontSize: 12.5}}>Customize how your widget looks and add it to your site.</p>
          <div className="row" style={{marginTop: 12, gap: 8}}>
            <button className="btn btn--primary btn--sm"><window.Icon name="check" size={12}/> Save changes</button>
            <button className="btn btn--ghost btn--sm">Reset</button>
          </div>
        </div>

        <div className="wp-tabs">
          {["theme","components","embed"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`wp-tab ${tab===t?"wp-tab--active":""}`}>
              {t === "theme" ? "Theme" : t === "components" ? "Components" : "Embed"}
            </button>
          ))}
        </div>

        <div className="wp-content">
          {tab === "theme" && <WidgetThemeTab primary={primary} setPrimary={setPrimary}/>}
          {tab === "components" && <WidgetComponentsTab/>}
          {tab === "embed" && <WidgetEmbedTab/>}
        </div>
      </div>

      <div className="pg-canvas">
        <div className="pg-canvas-toolbar">
          <span className="section-eyebrow" style={{margin: 0}}>Live preview</span>
          <select className="select" style={{height: 26, fontSize: 11.5, padding: "0 8px", width: 120}}>
            <option>Desktop</option><option>Mobile</option>
          </select>
        </div>
        <div className="pg-bg">
          <ChatWidget primary={primary} title="Domaine Carneros: California Sparkling W…" messages={[
            { from: "bot", text: "Hi! How can I help you today?" },
            { from: "user", text: "I'd like to see how the widget looks." },
            { from: "bot", text: "Changes you make on the left will appear here in real time." },
          ]}/>
        </div>
      </div>
    </div>
  );
}

function WidgetThemeTab({ primary, setPrimary }) {
  return (
    <div>
      <div className="wp-section">
        <div className="wp-section-head"><window.Icon name="spark" size={13}/> Color palette</div>
        <p className="muted" style={{fontSize: 12, margin: "0 0 10px"}}>Set colors used across the widget.</p>
        <ColorField label="Primary" value={primary} onChange={setPrimary}/>
        <ColorField label="Background" value="#ffffff"/>
        <ColorField label="Text" value="#000000"/>
      </div>
      <div className="wp-section">
        <div className="wp-section-head"><window.Icon name="bot" size={13}/> Typography</div>
        <label className="field" style={{marginBottom: 10}}>
          <span className="field-label">Font family</span>
          <select className="select"><option>Inter</option><option>System UI</option><option>Geist</option></select>
        </label>
        <label className="field" style={{marginBottom: 0}}>
          <span className="field-label">Base size</span>
          <select className="select"><option>14 px</option><option>15 px</option><option>16 px</option></select>
        </label>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="color-field">
      <span className="color-label">{label}</span>
      <label className="color-swatch" style={{background: value}}>
        <input type="color" value={value} onChange={e => onChange && onChange(e.target.value)}/>
      </label>
      <input className="input" value={value} onChange={e => onChange && onChange(e.target.value)} style={{flex: 1, fontFamily: "var(--font-mono)", fontSize: 12}}/>
    </div>
  );
}

function WidgetComponentsTab() {
  const [open, setOpen] = aState({ window: true, header: true, messages: true, input: true });
  const toggle = (k) => setOpen(s => ({...s, [k]: !s[k]}));
  return (
    <div>
      {[
        { key: "window", title: "Window", body: (
          <div className="row" style={{gap: 10}}>
            <label className="field" style={{flex: 1, marginBottom: 0}}>
              <span className="field-label">Border radius</span>
              <input className="input" defaultValue="20"/>
            </label>
            <label className="field" style={{flex: 1, marginBottom: 0}}>
              <span className="field-label">Shadow</span>
              <select className="select"><option>Large</option><option>Medium</option><option>None</option></select>
            </label>
          </div>
        )},
        { key: "header", title: "Header", body: (
          <>
            <CheckRow label="Show header" checked/>
            <CheckRow label="Show title" checked indent/>
            <label className="field" style={{marginLeft: 22, marginBottom: 10}}>
              <span className="field-label">Title</span>
              <input className="input" defaultValue="Domaine Carneros: California Sparkling Win…"/>
            </label>
            <CheckRow label="Show image alongside title" checked indent/>
            <CheckRow label="Show minimize" checked/>
            <CheckRow label="Show close" checked/>
          </>
        )},
        { key: "messages", title: "Messages", body: (
          <>
            <div className="row" style={{gap: 10, marginBottom: 10}}>
              <label className="field" style={{flex: 1, marginBottom: 0}}>
                <span className="field-label">Layout</span>
                <select className="select"><option>List</option><option>Stack</option></select>
              </label>
              <label className="field" style={{flex: 1, marginBottom: 0}}>
                <span className="field-label">Bubble style</span>
                <select className="select"><option>Minimal</option><option>Rounded</option></select>
              </label>
            </div>
            <CheckRow label="Show avatars" checked/>
            <CheckRow label="Show chatbot icon" checked indent/>
            <CheckRow label="Show user icon" checked indent/>
            <CheckRow label="Show timestamps"/>
          </>
        )},
        { key: "input", title: "Input", body: (
          <>
            <label className="field">
              <span className="field-label">Placeholder</span>
              <input className="input" defaultValue="Message…"/>
            </label>
            <CheckRow label="Show send button" checked/>
            <CheckRow label="Enable dictation (microphone)" checked/>
          </>
        )},
      ].map(s => (
        <div key={s.key} className="wp-section wp-collapse">
          <button className="wp-collapse-head" onClick={() => toggle(s.key)}>
            <span><window.Icon name="bot" size={12}/> {s.title}</span>
            <window.Icon name={open[s.key] ? "chevron-down" : "chevron-right"} size={12}/>
          </button>
          {open[s.key] && <div className="wp-collapse-body">{s.body}</div>}
        </div>
      ))}
    </div>
  );
}

function CheckRow({ label, checked, indent }) {
  const [c, setC] = aState(!!checked);
  return (
    <label className="check-row" style={indent ? {marginLeft: 22} : undefined}>
      <span className={`checkbox ${c ? "checkbox--on" : ""}`} onClick={() => setC(!c)}>{c && <window.Icon name="check" size={10}/>}</span>
      <span>{label}</span>
    </label>
  );
}

function WidgetEmbedTab() {
  return (
    <div className="wp-section">
      <div className="wp-section-head"><window.Icon name="external" size={13}/> Install</div>
      <p className="muted" style={{fontSize: 12, margin: "0 0 10px"}}>Insert before <code className="code-inline">&lt;/body&gt;</code>. The widget uses the look you saved here.</p>
      <div className="code-block-wrap">
        <div className="code-block-head">
          <span>HTML</span>
          <button className="btn btn--ghost btn--sm" style={{color: "#cfcfd6"}}><window.Icon name="copy" size={11}/> Copy</button>
        </div>
        <pre className="code-block code-block--small">{`<!-- Conciara chat widget -->
<script
  src="https://conciara.app/embed.js"
  data-api-url="https://api.conciara.app"
  data-workspace-id="ws_2k9"
  data-agent-id="ag_dom_carn"
  data-position="bottom-right"
></script>`}</pre>
      </div>
      <div className="row" style={{justifyContent: "space-between", marginTop: 12}}>
        <button className="btn btn--secondary btn--sm">Preview on a URL<window.Icon name="external" size={11}/></button>
        <button className="btn btn--ghost btn--sm">React / Next.js<window.Icon name="arrow-up-right" size={11}/></button>
      </div>
    </div>
  );
}

/* ===================== AGENT GENERAL ===================== */
function AgentGeneralScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Agent settings</span>
          <h1 className="page-title">General</h1>
          <p className="page-subtitle">Identity and danger zone for this agent.</p>
        </div>
      </div>

      <div className="settings-split">
        <div className="settings-side">
          <h4>Identity</h4>
          <p>Name and avatar are visible to end users in the chat widget.</p>
        </div>
        <div className="col">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Identity</div>
            </div>
            <div className="card-body">
              <label className="field">
                <span className="field-label">Agent name</span>
                <input className="input" defaultValue="Domaine Carneros: California Sparkling Wine & Pinot Noir"/>
              </label>
              <label className="field" style={{marginBottom: 0}}>
                <span className="field-label">Public agent ID</span>
                <input className="input mono" defaultValue="ag_dom_carn" readOnly/>
                <span className="field-hint">Used in API calls and the embed snippet.</span>
              </label>
            </div>
            <div className="card-footer">
              <button className="btn btn--ghost">Discard</button>
              <button className="btn btn--primary">Save changes</button>
            </div>
          </div>

          <div className="card card--danger">
            <div className="card-header">
              <div>
                <div className="card-title" style={{color: "var(--danger)"}}><window.Icon name="alert" size={14}/> Danger zone</div>
                <div className="card-subtitle">Permanently delete this agent and all its data — files, Q&amp;A pairs, website crawls, chat logs, and widget settings. This cannot be undone.</div>
              </div>
            </div>
            <div className="card-body">
              <div className="danger-row">
                <div>
                  <div style={{fontWeight: 500}}>Delete agent</div>
                  <div className="muted" style={{fontSize: 12.5}}>Type the agent name to confirm.</div>
                </div>
                <button className="btn btn--danger-outline"><window.Icon name="trash" size={13}/> Delete agent</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.AgentApp = AgentApp;
