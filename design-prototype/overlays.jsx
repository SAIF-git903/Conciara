/* Conciara — Command palette (⌘K) + Upgrade plan modal */

const { useState: ovState, useEffect: ovEffect, useMemo: ovMemo, useRef: ovRef } = React;

/* ============================================================ */
/* Command Palette                                              */
/* ============================================================ */

const PALETTE_DATA = [
  { group: "Agents", items: [
    { id: "open-lab",     label: "Order Lab Tests & Blood Tests", hint: "claude-haiku-4-5 · 1.2k msg", icon: "bot",      action: "open-agent" },
    { id: "open-intake",  label: "Patient Intake Triage",          hint: "claude-sonnet-4 · 412 msg",   icon: "bot",      action: "open-agent" },
    { id: "open-billing", label: "Billing & Coding Helper",        hint: "gpt-4.1 · 88 msg",            icon: "bot",      action: "open-agent" },
    { id: "open-medq",    label: "Medication Q&A",                 hint: "claude-haiku-4-5 · 19 msg",   icon: "bot",      action: "open-agent" },
  ]},
  { group: "Quick actions", items: [
    { id: "new-agent",     label: "Create new agent",        hint: "Start blank or from template", icon: "plus",     action: "screen", target: "new-agent",     kbd: ["N"] },
    { id: "invite",        label: "Invite a teammate",       hint: "Members · Test 01",            icon: "users",    action: "screen", target: "members" },
    { id: "upgrade",       label: "Upgrade plan",            hint: "From Hobby → Standard",        icon: "spark",    action: "upgrade",                       kbd: ["U"] },
    { id: "api-key",       label: "Create API key",          hint: "Programmatic access",          icon: "key",      action: "screen", target: "api" },
  ]},
  { group: "Go to", items: [
    { id: "go-agents",   label: "Agents",        icon: "bot",       action: "screen", target: "agents",        kbd: ["G", "A"] },
    { id: "go-usage",    label: "Usage",         icon: "usage",     action: "screen", target: "usage",         kbd: ["G", "U"] },
    { id: "go-general",  label: "General settings", icon: "settings", action: "screen", target: "general" },
    { id: "go-members",  label: "Members",       icon: "users",     action: "screen", target: "members" },
    { id: "go-billing",  label: "Billing",       icon: "card",      action: "screen", target: "billing" },
    { id: "go-plans",    label: "Plans",         icon: "spark",     action: "screen", target: "plans",         kbd: ["G", "P"] },
    { id: "go-api",      label: "API keys",      icon: "key",       action: "screen", target: "api" },
  ]},
  { group: "Help", items: [
    { id: "docs",     label: "Read the docs",       icon: "book",     action: "external" },
    { id: "shortcut", label: "Keyboard shortcuts",  icon: "command",  action: "shortcuts", kbd: ["?"] },
    { id: "support",  label: "Contact support",     icon: "alert",    action: "external" },
  ]},
];

function CommandPalette({ open, onClose, setScreen, openUpgrade }) {
  const [q, setQ] = ovState("");
  const [active, setActive] = ovState(0);
  const inputRef = ovRef(null);

  // Filter
  const flat = ovMemo(() => {
    const term = q.trim().toLowerCase();
    const out = [];
    for (const group of PALETTE_DATA) {
      const items = term
        ? group.items.filter(it => it.label.toLowerCase().includes(term) || (it.hint || "").toLowerCase().includes(term))
        : group.items;
      if (items.length) out.push({ group: group.group, items });
    }
    return out;
  }, [q]);

  const linear = ovMemo(() => flat.flatMap(g => g.items.map(it => ({ ...it, group: g.group }))), [flat]);

  ovEffect(() => { setActive(0); }, [q]);
  ovEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    if (!open) setQ("");
  }, [open]);

  const exec = (item) => {
    if (!item) return;
    if (item.action === "open-agent") {
      setScreen("agent-inner");
    } else if (item.action === "screen") {
      setScreen(item.target);
    } else if (item.action === "upgrade") {
      onClose();
      setTimeout(openUpgrade, 50);
      return;
    }
    onClose();
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, linear.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); exec(linear[active]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  if (!open) return null;

  let runIdx = -1;
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <header className="cmdk-input-row">
          <window.Icon name="search" size={16}/>
          <input
            ref={inputRef}
            placeholder="Search agents, settings, docs… or type a command"
            value={q}
            onChange={e => setQ(e.target.value)}
            spellCheck="false"
            autoComplete="off"
          />
          <span className="cmdk-esc">esc</span>
        </header>

        <div className="cmdk-list">
          {linear.length === 0 && (
            <div className="cmdk-empty">
              <window.Icon name="search" size={22}/>
              <div>No matches for <strong>"{q}"</strong></div>
              <span>Try "agent", "plan", "billing", "API"…</span>
            </div>
          )}
          {flat.map(group => (
            <div className="cmdk-group" key={group.group}>
              <div className="cmdk-group-label">{group.group}</div>
              {group.items.map(item => {
                runIdx += 1;
                const isActive = runIdx === active;
                const myIdx = runIdx;
                return (
                  <button
                    key={item.id}
                    className={`cmdk-item ${isActive ? "cmdk-item--active" : ""}`}
                    onMouseEnter={() => setActive(myIdx)}
                    onClick={() => exec(item)}
                  >
                    <span className="cmdk-icon"><window.Icon name={item.icon} size={14}/></span>
                    <span className="cmdk-label">{item.label}</span>
                    {item.hint && <span className="cmdk-hint">{item.hint}</span>}
                    {item.kbd && (
                      <span className="cmdk-kbd-row">
                        {item.kbd.map((k, i) => <span key={i} className="cmdk-kbd">{k}</span>)}
                      </span>
                    )}
                    <window.Icon name="arrow-right" size={12} className="cmdk-go"/>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <footer className="cmdk-footer">
          <span className="cmdk-foot-item"><span className="cmdk-kbd">↵</span>open</span>
          <span className="cmdk-foot-item"><span className="cmdk-kbd">↑</span><span className="cmdk-kbd">↓</span>navigate</span>
          <span className="cmdk-foot-item"><span className="cmdk-kbd">esc</span>close</span>
          <span className="cmdk-foot-spacer"/>
          <span className="cmdk-foot-item"><strong>Conciara</strong> · Test 01 workspace</span>
        </footer>
      </div>
    </div>
  );
}

/* ============================================================ */
/* Upgrade Plan Modal                                           */
/* ============================================================ */

const UPGRADE_PLANS = [
  {
    id: "hobby", name: "Hobby", current: true,
    price: { monthly: 32, annual: 26 },
    pitch: "Builders trying things out.",
    creditTag: "500 / mo",
    features: [
      { ok: true, label: "500 message credits / month" },
      { ok: true, label: "1 AI agent" },
      { ok: true, label: "2 team members" },
      { ok: true, label: "10 MB training data per agent" },
      { ok: false, label: "API access" },
      { ok: false, label: "Audit logs" },
    ],
  },
  {
    id: "standard", name: "Standard", recommended: true,
    price: { monthly: 120, annual: 96 },
    pitch: "Small teams in production.",
    creditTag: "4,000 / mo",
    features: [
      { ok: true, label: "4,000 message credits / month" },
      { ok: true, label: "1 AI agent" },
      { ok: true, label: "3 team members" },
      { ok: true, label: "20 MB training data per agent" },
      { ok: true, label: "API access" },
      { ok: false, label: "Audit logs" },
    ],
  },
  {
    id: "pro", name: "Pro",
    price: { monthly: 400, annual: 320 },
    pitch: "Growing teams with compliance needs.",
    creditTag: "15,000 / mo",
    features: [
      { ok: true, label: "15,000 message credits / month" },
      { ok: true, label: "1 AI agent" },
      { ok: true, label: "5 team members" },
      { ok: true, label: "40 MB training data per agent" },
      { ok: true, label: "API access" },
      { ok: true, label: "Audit logs & SSO" },
    ],
  },
];

function UpgradeModal({ open, onClose }) {
  const [billing, setBilling] = ovState("annual");
  const [selected, setSelected] = ovState("standard");

  ovEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const sel = UPGRADE_PLANS.find(p => p.id === selected);
  const monthlyCost = sel.price[billing];
  const yearTotal = billing === "annual" ? monthlyCost * 12 : monthlyCost;
  const savings = billing === "annual" ? (sel.price.monthly - sel.price.annual) * 12 : 0;

  return (
    <div className="upgrade-overlay" onClick={onClose}>
      <div className="upgrade" role="dialog" aria-label="Upgrade plan" onClick={(e) => e.stopPropagation()}>
        <header className="upgrade-head">
          <div>
            <div className="upgrade-eyebrow">Upgrade · Test 01</div>
            <h2>Pick the plan that fits</h2>
            <p>You can switch any time. We'll prorate.</p>
          </div>
          <div className="upgrade-head-right">
            <div className="seg" role="tablist">
              <button className={billing === "monthly" ? "is-on" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
              <button className={billing === "annual"  ? "is-on" : ""} onClick={() => setBilling("annual")}>Annual <span className="seg-tag">−20%</span></button>
            </div>
            <button className="upgrade-close" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
        </header>

        <div className="upgrade-body">
          <div className="upgrade-plans">
            {UPGRADE_PLANS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`upl ${selected === p.id ? "upl--sel" : ""} ${p.recommended ? "upl--rec" : ""} ${p.current ? "upl--cur" : ""}`}
              >
                {p.recommended && <span className="upl-tag">Recommended</span>}
                {p.current && <span className="upl-tag upl-tag--cur">Current</span>}

                <div className="upl-head">
                  <span className="upl-name">{p.name}</span>
                  <span className="upl-credit">{p.creditTag}</span>
                </div>

                <div className="upl-price">
                  <span className="upl-currency">$</span>
                  <span className="upl-amount">{p.price[billing]}</span>
                  <span className="upl-period">/mo</span>
                </div>
                <div className="upl-billing">{billing === "annual" ? "billed yearly" : "billed monthly"}</div>

                <p className="upl-pitch">{p.pitch}</p>

                <ul className="upl-features">
                  {p.features.map((f, i) => (
                    <li key={i} className={f.ok ? "" : "upl-feat--off"}>
                      <span className="upl-tick">
                        {f.ok
                          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4 10-10"/></svg>
                          : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                        }
                      </span>
                      {f.label}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <aside className="upgrade-summary">
            <div className="upsum-eyebrow">Order summary</div>
            <div className="upsum-row">
              <span>Plan</span>
              <strong>{sel.name}</strong>
            </div>
            <div className="upsum-row">
              <span>Billing</span>
              <strong>{billing === "annual" ? "Annual" : "Monthly"}</strong>
            </div>
            <div className="upsum-row">
              <span>Includes</span>
              <strong>{sel.creditTag} credits</strong>
            </div>
            <div className="upsum-divider"/>
            <div className="upsum-row upsum-row--big">
              <span>Total today</span>
              <strong>${yearTotal.toLocaleString()}<span className="upsum-per">{billing === "annual" ? "/yr" : "/mo"}</span></strong>
            </div>
            {savings > 0 && (
              <div className="upsum-savings">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4 10-10"/></svg>
                You save <strong>${savings.toLocaleString()}</strong> with annual billing
              </div>
            )}

            <button className="upsum-cta" disabled={sel.current}>
              {sel.current ? "This is your current plan" : <>Upgrade to {sel.name} <window.Icon name="arrow-right" size={13}/></>}
            </button>

            <div className="upsum-pay">
              <div className="upsum-pay-row">
                <span className="upsum-card-mark">VISA</span>
                <span>Visa ending <strong>4242</strong></span>
                <button className="upsum-pay-change">Change</button>
              </div>
              <div className="upsum-fineprint">
                Secured by <strong>Paddle</strong>. You'll be charged today and on each renewal.
                Cancel any time from <em>Billing</em>.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

window.CommandPalette = CommandPalette;
window.UpgradeModal = UpgradeModal;
