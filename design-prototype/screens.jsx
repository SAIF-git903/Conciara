/* Conciara — primary screens: Agents, Usage, Activity, General, Members */

const { useState, useMemo } = React;

/* ===================== AGENTS ===================== */
function AgentsScreen({ tweaks, setScreen }) {
  const accent = window.ACCENTS[tweaks.accent];
  const agents = useMemo(() => {
    const all = [
      { id: "lab-tests", name: "Order Lab Tests & Blood Tests", desc: "Helps clinicians order, track and reconcile lab orders.", model: "claude-haiku-4-5", status: "running", messages: 1284, lastRun: "2m ago", color: "var(--accent)" },
      { id: "intake", name: "Patient Intake Triage", desc: "Pre-visit symptom intake and triage to specialist.", model: "claude-sonnet-4", status: "idle", messages: 412, lastRun: "1h ago", color: "#0e9b6b" },
      { id: "billing", name: "Billing & Coding Helper", desc: "Suggests ICD-10 codes from clinical notes.", model: "gpt-4.1", status: "idle", messages: 88, lastRun: "yesterday", color: "#b86a17" },
      { id: "med-q", name: "Medication Q&A", desc: "Drug interactions and dosing assistant.", model: "claude-haiku-4-5", status: "warn", messages: 19, lastRun: "3d ago", color: "#c33665" },
    ];
    if (tweaks.agentCount === "empty") return [];
    if (tweaks.agentCount === "few") return all.slice(0, 1);
    return all;
  }, [tweaks.agentCount]);

  return (
    <div className="page page--wide">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Test 01 / Workspace</span>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">AI agents that act on behalf of your team. Click any agent to open its playground, training data, or analytics.</p>
        </div>
        <div className="row">
          <button className="btn btn--secondary"><window.Icon name="copy" size={14}/>Templates</button>
          <button className="btn btn--primary" onClick={() => setScreen && setScreen("new-agent")}><window.Icon name="plus" size={14}/>New agent</button>
        </div>
      </div>

      {agents.length === 0 ? (
        <EmptyAgents/>
      ) : (
        <div className="agents-layout">
          <div className="agents-grid">
            {agents.map(a => <AgentCard key={a.id} a={a} setScreen={setScreen}/>)}
            <NewAgentTile setScreen={setScreen}/>
          </div>
          <OnboardingRail/>
        </div>
      )}
    </div>
  );
}

function AgentCard({ a, setScreen }) {
  const status = a.status === "running" ? { dot: "badge-dot--running", label: "Active" } :
                 a.status === "warn"    ? { dot: "badge-dot--warn", label: "Needs attention" } :
                                          { dot: "badge-dot--idle", label: "Idle" };
  return (
    <article className="agent-card" tabIndex={0} onClick={() => setScreen && setScreen("agent-inner")} style={{cursor: "pointer"}}>
      <div className="agent-card-top">
        <div className="agent-mark" style={{background: a.color}}>
          <window.Icon name="bot" size={18}/>
        </div>
        <button className="icon-btn" aria-label="More options"><window.Icon name="more" size={16}/></button>
      </div>
      <div className="agent-card-body">
        <h3 className="agent-name">{a.name}</h3>
        <p className="agent-desc">{a.desc}</p>
      </div>
      <dl className="agent-meta">
        <div><dt>Status</dt><dd className={`badge-dot ${status.dot}`}>{status.label}</dd></div>
        <div><dt>Model</dt><dd className="mono">{a.model}</dd></div>
        <div><dt>Messages</dt><dd className="mono">{a.messages.toLocaleString()}</dd></div>
        <div><dt>Last run</dt><dd>{a.lastRun}</dd></div>
      </dl>
      <div className="agent-card-actions">
        <button className="agent-action">
          <window.Icon name="play" size={11}/>
          Open playground
        </button>
        <span className="agent-divider"/>
        <button className="agent-action agent-action--ghost">
          <window.Icon name="settings" size={12}/>
          Configure
        </button>
      </div>
    </article>
  );
}

function NewAgentTile({ setScreen }) {
  return (
    <button className="agent-card agent-card--new" onClick={() => setScreen && setScreen("new-agent")}>
      <div className="new-agent-mark"><window.Icon name="plus" size={20}/></div>
      <div className="new-agent-text">
        <div className="new-agent-title">Create a new agent</div>
        <div className="new-agent-sub">Start blank or from a template</div>
      </div>
    </button>
  );
}

function EmptyAgents() {
  return (
    <div className="empty-agents">
      <div className="empty-art">
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
          <rect x="20" y="14" width="80" height="58" rx="10" stroke="var(--line-strong)" strokeWidth="1.2" strokeDasharray="2 4"/>
          <rect x="40" y="34" width="40" height="20" rx="4" fill="var(--bg-2)"/>
          <circle cx="50" cy="44" r="2" fill="var(--ink-4)"/>
          <circle cx="70" cy="44" r="2" fill="var(--ink-4)"/>
          <path d="M50 6v8M70 6v8" stroke="var(--ink-5)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
      <h3>No agents yet</h3>
      <p>Create your first agent in under a minute. Connect data sources, write a system prompt, and ship.</p>
      <div className="row">
        <button className="btn btn--primary"><window.Icon name="plus" size={14}/>New agent</button>
        <button className="btn btn--ghost">Browse templates<window.Icon name="arrow-right" size={14}/></button>
      </div>
    </div>
  );
}

function OnboardingRail() {
  const tasks = [
    { done: true, label: "Create your workspace" },
    { done: true, label: "Build your first agent" },
    { done: false, label: "Connect a data source", action: "Connect" },
    { done: false, label: "Invite a teammate", action: "Invite" },
    { done: false, label: "Embed on your website", action: "Get snippet" },
  ];
  const completed = tasks.filter(t => t.done).length;
  return (
    <aside className="rail">
      <div className="rail-header">
        <div>
          <span className="section-eyebrow">Get started</span>
          <h4 className="rail-title">{completed} of {tasks.length} complete</h4>
        </div>
        <button className="icon-btn" aria-label="Dismiss"><window.Icon name="more" size={14}/></button>
      </div>
      <div className="rail-progress"><span style={{width: `${(completed/tasks.length)*100}%`}}/></div>
      <ul className="rail-list">
        {tasks.map((t,i) => (
          <li key={i} className={`rail-item ${t.done ? "rail-item--done" : ""}`}>
            <span className="rail-check">{t.done ? <window.Icon name="check" size={11}/> : <span className="rail-num">{i+1}</span>}</span>
            <span className="rail-label">{t.label}</span>
            {!t.done && t.action && <button className="rail-action">{t.action}</button>}
          </li>
        ))}
      </ul>
      <div className="rail-divider"/>
      <a className="rail-link" href="#">
        <span><window.Icon name="book" size={13}/> Read the docs</span>
        <window.Icon name="arrow-up-right" size={13}/>
      </a>
      <a className="rail-link" href="#">
        <span><window.Icon name="command" size={13}/> Keyboard shortcuts</span>
        <span className="kbd-inline">?</span>
      </a>
    </aside>
  );
}

/* ===================== USAGE ===================== */
function UsageScreen({ tweaks }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usage</h1>
          <p className="page-subtitle">Message credits used this billing period. Resets at the start of each period.</p>
        </div>
        <div className="row">
          <select className="select" style={{width: 160, height: 32}} defaultValue="this">
            <option value="this">This period</option>
            <option value="last">Last period</option>
            <option value="all">All time</option>
          </select>
          <button className="btn btn--secondary"><window.Icon name="external" size={13}/>Export CSV</button>
        </div>
      </div>

      <div className="usage-grid">
        <div className="card stat-card">
          <div className="stat-eyebrow">Credits remaining</div>
          <div className="stat-num"><span className="stat-num-big">500</span><span className="stat-num-small">of 500</span></div>
          <div className="stat-bar"><span style={{width: "0.5%"}}/></div>
          <div className="stat-foot">
            <span><span className="dot dot--ink"/>0 used</span>
            <span className="muted">Period ends Jun 1, 2026</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-eyebrow">Avg. credits / day</div>
          <div className="stat-num"><span className="stat-num-big">0</span><span className="stat-num-small">per day</span></div>
          <div className="stat-spark">
            <UsageSparkline data={[2,3,1,4,2,5,3,2,4,1,2,3,2,1,2,4,3,2,1,2,3,2,1,4,3,2,1,2]} />
          </div>
          <div className="stat-foot">
            <span className="muted">28 days · trending flat</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-eyebrow">Projected</div>
          <div className="stat-num"><span className="stat-num-big">~12</span><span className="stat-num-small">/ 500 by Jun 1</span></div>
          <div className="stat-projection">
            <span className="badge badge--success">2.4% utilization</span>
            <span className="muted" style={{marginLeft: 8}}>Plenty of headroom</span>
          </div>
          <div className="stat-foot">
            <span className="muted">At current rate</span>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card-header">
          <div>
            <div className="card-title">Daily usage</div>
            <div className="card-subtitle">Credits consumed per day across all agents</div>
          </div>
          <div className="row">
            <SegmentedTabs
              options={[{label: "All agents", value: "all"}, {label: "By agent", value: "by"}, {label: "By type", value: "type"}]}
              defaultValue="all"
            />
          </div>
        </div>
        <div className="card-body" style={{padding: 0}}>
          <UsageChart/>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card-header">
          <div className="card-title">By agent</div>
          <div className="card-subtitle">No assistant messages this period</div>
        </div>
        <div className="empty-row">
          <window.Icon name="bot" size={20}/>
          <div>
            <div style={{fontWeight: 500}}>Nothing here yet</div>
            <div className="muted" style={{fontSize: 12.5}}>Per-agent usage will appear once your agents start sending messages.</div>
          </div>
          <button className="btn btn--secondary btn--sm" style={{marginLeft: "auto"}}>Open agents<window.Icon name="arrow-right" size={12}/></button>
        </div>
      </div>
    </div>
  );
}

function UsageSparkline({ data }) {
  const max = Math.max(...data);
  const w = 200, h = 36;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} fill="var(--accent-soft)"/>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5"/>
    </svg>
  );
}

function UsageChart() {
  // 30 days of synthetic data, mostly low (you have 0 usage).
  const days = Array.from({ length: 30 }, (_, i) => {
    const base = i < 25 ? 0 : Math.max(0, Math.floor(Math.sin(i * 0.6) * 3 + Math.random() * 4));
    return base;
  });
  const max = Math.max(8, ...days);
  const W = 1000, H = 220, padL = 36, padR = 12, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const barW = innerW / days.length - 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{display: "block"}}>
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)} stroke="var(--line)" strokeWidth="1" strokeDasharray={p === 0 ? "" : "2 3"}/>
          <text x={padL - 8} y={padT + innerH * (1 - p) + 3} fontSize="9.5" textAnchor="end" fontFamily="var(--font-mono)" fill="var(--ink-4)">{Math.round(max * p)}</text>
        </g>
      ))}
      {/* Bars */}
      {days.map((v, i) => {
        const x = padL + (i * innerW) / days.length + 2;
        const h = (v / max) * innerH;
        const y = padT + innerH - h;
        return <rect key={i} x={x} y={y} width={barW} height={Math.max(h, 1)} rx="2" fill={v > 0 ? "var(--accent)" : "var(--line-2)"}/>;
      })}
      {/* X labels */}
      {[0, 7, 14, 21, 29].map(i => (
        <text key={i} x={padL + (i * innerW) / days.length + barW/2} y={H - 8} fontSize="9.5" textAnchor="middle" fontFamily="var(--font-mono)" fill="var(--ink-4)">
          {`${i + 1}`}
        </text>
      ))}
    </svg>
  );
}

function SegmentedTabs({ options, defaultValue, onChange }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="segmented">
      {options.map(o => (
        <button
          key={o.value}
          className={`segmented-btn ${v === o.value ? "segmented-btn--active" : ""}`}
          onClick={() => { setV(o.value); onChange && onChange(o.value); }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ===================== ACTIVITY ===================== */
function ActivityScreen() {
  const events = [
    { t: "2 minutes ago", who: "Saif Ali", action: "updated agent", target: "Order Lab Tests & Blood Tests" },
    { t: "1 hour ago", who: "Saif Ali", action: "created API key", target: "key_…7af2 (read-only)" },
    { t: "Yesterday, 4:15 PM", who: "System", action: "applied invoice", target: "INV-1042 · $0.00" },
    { t: "Yesterday, 11:02 AM", who: "Saif Ali", action: "updated workspace name", target: "→ Test 01" },
    { t: "May 1, 9:00 AM", who: "System", action: "reset credits", target: "500 credits" },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">Recent changes across this workspace.</p>
        </div>
      </div>
      <div className="card">
        <ul className="activity-list">
          {events.map((e, i) => (
            <li key={i} className="activity-item">
              <div className="activity-time mono">{e.t}</div>
              <div className="activity-body">
                <span className="activity-who">{e.who}</span>
                <span className="muted"> {e.action} </span>
                <span className="activity-target">{e.target}</span>
              </div>
              <button className="icon-btn" aria-label="Details"><window.Icon name="chevron-right" size={14}/></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ===================== GENERAL SETTINGS ===================== */
function GeneralScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Settings</span>
          <h1 className="page-title">General</h1>
          <p className="page-subtitle">Workspace name, slug, and basic settings. Only the owner can change these.</p>
        </div>
      </div>

      <div className="settings-split">
        <div className="settings-side">
          <h4>About this workspace</h4>
          <p>Your workspace is the container for agents, members, and billing. Renaming it doesn't break links.</p>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Workspace name</div>
                <div className="card-subtitle">Used in invitations, invoices, and the workspace switcher.</div>
              </div>
            </div>
            <div className="card-body">
              <label className="field">
                <span className="field-label">Name</span>
                <input className="input" defaultValue="Test 01"/>
              </label>
              <label className="field" style={{marginBottom: 0}}>
                <span className="field-label">Workspace URL</span>
                <div className="input-group">
                  <span className="input-prefix mono">conciara.app/</span>
                  <input className="input" defaultValue="test-01" style={{borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 0}}/>
                </div>
                <span className="field-hint">Lowercase letters, numbers and hyphens.</span>
              </label>
            </div>
            <div className="card-footer">
              <button className="btn btn--ghost">Discard</button>
              <button className="btn btn--primary">Save changes</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Default agent model</div>
                <div className="card-subtitle">New agents will use this model by default.</div>
              </div>
            </div>
            <div className="card-body">
              <div className="model-row">
                {[
                  { id: "haiku", name: "Claude Haiku 4.5", desc: "Fast, cheap, great for high-volume agents", tag: "Recommended" },
                  { id: "sonnet", name: "Claude Sonnet 4", desc: "Balanced reasoning and speed", tag: null },
                  { id: "gpt", name: "GPT-4.1", desc: "External provider — uses your own key", tag: "Bring your own key" },
                ].map((m, i) => (
                  <label key={m.id} className={`model-option ${i === 0 ? "model-option--active" : ""}`}>
                    <input type="radio" name="model" defaultChecked={i === 0}/>
                    <div className="model-option-body">
                      <div className="row" style={{gap: 8}}>
                        <span className="model-option-name">{m.name}</span>
                        {m.tag && <span className="badge badge--neutral">{m.tag}</span>}
                      </div>
                      <div className="muted" style={{fontSize: 12.5}}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="card card--danger">
            <div className="card-header">
              <div>
                <div className="card-title" style={{color: "var(--danger)"}}><window.Icon name="alert" size={14}/> Danger zone</div>
                <div className="card-subtitle">Irreversible actions. Delete the workspace, or leave it if you're a member.</div>
              </div>
            </div>
            <div className="card-body">
              <div className="danger-row">
                <div>
                  <div style={{fontWeight: 500}}>Delete workspace</div>
                  <div className="muted" style={{fontSize: 12.5}}>Permanently removes Test 01, all agents, and all data.</div>
                </div>
                <button className="btn btn--danger-outline"><window.Icon name="trash" size={13}/> Delete workspace</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== MEMBERS ===================== */
function MembersScreen() {
  const members = [
    { name: "Saif Ali", email: "saifali@truemedit.com", initials: "SA", role: "Owner", joined: "May 1, 2026", color: "var(--accent)" },
  ];
  const pending = [];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Settings</span>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">People in this workspace. You can invite up to 2 members on the Hobby plan.</p>
        </div>
        <div className="row">
          <button className="btn btn--secondary"><window.Icon name="external" size={13}/>Copy invite link</button>
          <button className="btn btn--primary"><window.Icon name="plus" size={14}/>Invite member</button>
        </div>
      </div>

      <div className="seat-meter">
        <div className="seat-meter-row">
          <span className="section-eyebrow">Seats</span>
          <span className="mono">1 of 2 used</span>
        </div>
        <div className="seat-meter-bar">
          <span style={{width: "50%"}}/>
        </div>
        <span className="muted" style={{fontSize: 12}}>1 seat remaining on Hobby. <a className="link" href="#">Upgrade to Standard</a> for 3 seats.</span>
      </div>

      <div className="card" style={{marginTop: 16}}>
        <div className="card-header">
          <div className="card-title">Active members</div>
          <div className="row">
            <input className="input" placeholder="Filter…" style={{width: 200, height: 28}}/>
          </div>
        </div>
        <div className="member-table">
          <div className="member-row member-row--head">
            <span>Member</span>
            <span>Role</span>
            <span>Joined</span>
            <span></span>
          </div>
          {members.map(m => (
            <div className="member-row" key={m.email}>
              <div className="row">
                <div className="member-avatar" style={{background: m.color}}>{m.initials}</div>
                <div>
                  <div style={{fontWeight: 500}}>{m.name}</div>
                  <div className="muted mono" style={{fontSize: 12}}>{m.email}</div>
                </div>
              </div>
              <div><span className="badge badge--ink">{m.role}</span></div>
              <div className="mono muted">{m.joined}</div>
              <div style={{textAlign: "right"}}><button className="icon-btn"><window.Icon name="more" size={16}/></button></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{marginTop: 16}}>
        <div className="card-header">
          <div>
            <div className="card-title">Pending invitations</div>
            <div className="card-subtitle">Invitations expire after 7 days.</div>
          </div>
        </div>
        {pending.length === 0 ? (
          <div className="empty-row">
            <window.Icon name="users" size={18}/>
            <div className="muted" style={{fontSize: 13}}>No pending invitations.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

window.AgentsScreen = AgentsScreen;
window.UsageScreen = UsageScreen;
window.ActivityScreen = ActivityScreen;
window.GeneralScreen = GeneralScreen;
window.MembersScreen = MembersScreen;
