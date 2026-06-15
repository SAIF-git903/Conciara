/* Conciara Landing v2 — all sections */

/* ───────────────────────────────────────────────── NAV */
function V2Nav() {
  return (
    <nav className="v2-nav">
      <div className="shell v2-nav-inner">
        <a className="v2-logo" href="#">
          <span className="v2-logo-mark">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M8 12a4 4 0 0 1 8 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="16" r="1.3" fill="white"/>
              <circle cx="15" cy="16" r="1.3" fill="white"/>
            </svg>
          </span>
          Conciara
        </a>
        <div className="v2-nav-links">
          <a className="v2-nav-link" href="#product">Product</a>
          <a className="v2-nav-link" href="#pricing">Pricing</a>
          <a className="v2-nav-link" href="#">Docs</a>
          <a className="v2-nav-link" href="#">Changelog</a>
        </div>
        <div className="v2-nav-cta">
          <a className="v2-nav-signin" href="#">Sign in</a>
          <button className="btn btn--primary btn--sm">Get started <window.LIcon name="arrow-right" size={12}/></button>
        </div>
      </div>
    </nav>
  );
}

/* ───────────────────────────────────────────────── HERO */
function V2Hero() {
  return (
    <section className="v2-hero">
      <div className="shell">
        <div className="v2-hero-text">
          <div className="v2-hero-eyebrow">The agent platform for real business</div>
          <h1 className="v2-headline">Build AI agents that actually know<em> your business.</em></h1>
          <p className="v2-hero-sub">
            Drop in your docs, connect your tools, define what it can do. Ship a support agent, sales concierge, or internal helper — with cited answers, real actions, and live human handoff.
          </p>
          <div className="v2-hero-cta">
            <button className="btn btn--primary btn--lg">Start free <window.LIcon name="arrow-right" size={14}/></button>
            <button className="btn btn--ghost-dark btn--lg">See a demo</button>
          </div>
          <div className="v2-hero-meta">
            <span>No credit card</span>
            <span className="v2-hero-meta-sep">·</span>
            <span>500 messages free</span>
            <span className="v2-hero-meta-sep">·</span>
            <span>Live in under 10 minutes</span>
          </div>
        </div>
      </div>
      <div className="v2-hero-shot-wrap">
        <div className="v2-hero-glow"/>
        <div className="v2-hero-shot">
          <div className="v2-shot-bar">
            <div className="v2-shot-dot"/>
            <div className="v2-shot-dot"/>
            <div className="v2-shot-dot"/>
            <span className="v2-shot-url">conciara.app / agents / lab-tests</span>
            <div className="v2-shot-tabs" style={{marginLeft: "auto"}}>
              <div className="v2-shot-tab">Playground</div>
              <div className="v2-shot-tab v2-shot-tab--on">Chat logs</div>
              <div className="v2-shot-tab">Analytics</div>
            </div>
          </div>
          <div className="v2-shot-body">
            <aside className="v2-shot-side">
              <div className="v2-shot-agent-head">
                <div className="v2-shot-agent-name">Order Lab Tests & Blood Tests</div>
                <div className="v2-shot-agent-sub">claude-haiku-4-5 · Standard plan</div>
              </div>
              {[
                { label: "Hi there tell me about…",    meta: "5d · 24 msg", on: false },
                { label: "What type of wine do you…",  meta: "5d · 10 msg", on: true  },
                { label: "Can you order a CBC?",        meta: "5d · 8 msg",  on: false },
                { label: "Who is the CEO for busines…", meta: "5d · 6 msg",  on: false },
                { label: "Tell me about your busine…",  meta: "6d · 8 msg",  on: false },
              ].map((s, i) => (
                <div key={i} className={`v2-shot-item ${s.on ? "v2-shot-item--on" : ""}`}>
                  <span className="v2-shot-item-dot"/>
                  <span style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: 11.5, fontWeight: s.on ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{s.label}</div>
                    <div style={{fontFamily: "var(--font-mono)", fontSize: 9.5, color: "#a3a3ad", marginTop: 2}}>{s.meta}</div>
                  </span>
                </div>
              ))}
            </aside>
            <div className="v2-shot-main">
              <div className="v2-shot-thread-head">
                <div>
                  <div className="v2-shot-thread-title">What type of wine do you sell?</div>
                  <div className="v2-shot-thread-meta">5d ago · 10 messages · session <span style={{fontFamily:"var(--font-mono)"}}>#b2e9</span></div>
                </div>
                <span className="v2-shot-pill">Live</span>
              </div>
              <div className="v2-shot-messages">
                <div className="v2-shot-msg v2-shot-msg--user">
                  <div className="v2-shot-avatar">U</div>
                  <div>
                    <div className="v2-shot-bubble">What type of wine do you sell?</div>
                  </div>
                </div>
                <div className="v2-shot-msg v2-shot-msg--bot">
                  <div className="v2-shot-avatar"><window.LIcon name="bot" size={11}/></div>
                  <div>
                    <div className="v2-shot-bubble">
                      We specialise in California sparkling wine and Pinot Noir. Our flagship is the <strong>Blanc de Blancs NV</strong>, made from 100% Chardonnay grown in the Carneros AVA.
                    </div>
                    <div className="v2-shot-cite"><window.LIcon name="scroll" size={9}/> product-catalogue.pdf · §2.1</div>
                  </div>
                </div>
                <div className="v2-shot-msg v2-shot-msg--user">
                  <div className="v2-shot-avatar">U</div>
                  <div><div className="v2-shot-bubble">Can you hold two cases for pickup this Friday?</div></div>
                </div>
                <div className="v2-shot-msg v2-shot-msg--bot">
                  <div className="v2-shot-avatar"><window.LIcon name="bot" size={11}/></div>
                  <div>
                    <div className="v2-shot-bubble">Done — 2 cases of Blanc de Blancs NV held for Friday pickup. Confirmation sent to your email.</div>
                    <div className="v2-shot-action">
                      <div className="v2-shot-action-mark"><window.LIcon name="lightning" size={10}/></div>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 600, fontSize: 11}}>hold_order</div>
                        <div style={{color: "#74747e", fontSize: 10.5}}>2 cases · Blanc de Blancs NV · Fri pickup</div>
                      </div>
                      <span className="v2-shot-action-status">✓ 218ms</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="v2-shot-input-bar">
                <div className="v2-shot-input">Reply to this session…</div>
                <div className="v2-shot-send"><window.LIcon name="send" size={12}/></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────── LOGOS */
function V2Logos() {
  const marks = [
    { text: "Domaine Carneros",  cls: "v2-logo-pill--serif" },
    { text: "NORTHWIND",         cls: "" },
    { text: "cabin co-op",       cls: "v2-logo-pill--mono" },
    { text: "Lumen",             cls: "" },
    { text: "Saffron",           cls: "v2-logo-pill--serif" },
    { text: "QUANTA",            cls: "v2-logo-pill--mono" },
  ];
  return (
    <div className="v2-logos">
      <div className="shell">
        <div className="v2-logos-label">Trusted by teams at</div>
        <div className="v2-logos-row">
          {marks.map(m => (
            <span key={m.text} className={`v2-logo-pill ${m.cls}`}>{m.text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────── OUTCOMES */
function V2Outcomes() {
  return (
    <section className="v2-section" id="product">
      <div className="shell">
        <div className="v2-sh">
          <div className="v2-sh-eyebrow">What you get</div>
          <h2 className="v2-sh-title">Three outcomes. <em>One platform.</em></h2>
          <p className="v2-sh-sub">Not features — the things your team will actually report back on after the first month.</p>
        </div>
        <div className="v2-outcomes">
          <div className="v2-outcome">
            <div className="v2-outcome-ico"><window.LIcon name="scroll" size={22}/></div>
            <h3 className="v2-outcome-title">Train in minutes.</h3>
            <p className="v2-outcome-body">Drop in PDFs, paste your docs URL, or write Q&A pairs. The agent is re-indexed and ready to answer from those sources immediately. No prompt engineering required.</p>
            <div className="v2-outcome-stat"><strong>14 min</strong>Avg. setup to first live answer</div>
          </div>
          <div className="v2-outcome">
            <div className="v2-outcome-ico"><window.LIcon name="globe" size={22}/></div>
            <h3 className="v2-outcome-title">Deploy anywhere.</h3>
            <p className="v2-outcome-body">Web widget, Slack, WhatsApp, or REST API — one agent, every channel it needs to be in. Same sources, same actions, same conversation history, regardless of where the message originates.</p>
            <div className="v2-outcome-stat"><strong>4</strong>Channels live from a single agent config</div>
          </div>
          <div className="v2-outcome">
            <div className="v2-outcome-ico"><window.LIcon name="inbox" size={22}/></div>
            <h3 className="v2-outcome-title">See every conversation.</h3>
            <p className="v2-outcome-body">A unified Inbox shows every live and historical chat, which source each answer came from, and where the agent wasn't sure. Click Revise to fix a bad answer and teach the agent inline.</p>
            <div className="v2-outcome-stat"><strong>100%</strong>Answers cited back to source</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────── WALKTHROUGH */
function PlaygroundShot() {
  return (
    <div className="v2-wt-frame">
      <div className="v2-wt-bar">
        <div className="v2-wt-dot"/><div className="v2-wt-dot"/><div className="v2-wt-dot"/>
        <span className="v2-wt-title-bar">Playground — Domaine Carneros</span>
      </div>
      <div className="v2-chat-thread">
        <div className="v2-chat-msg v2-chat-msg--user">
          <div className="v2-chat-avatar">U</div>
          <div className="v2-chat-bubble">Can you order a CBC for me before Friday?</div>
        </div>
        <div className="v2-chat-msg">
          <div className="v2-chat-avatar" style={{background: "var(--accent)"}}>C</div>
          <div>
            <div className="v2-chat-bubble">
              I can book a Complete Blood Count at <strong>Quest, San Mateo</strong> for Thursday 10:40 AM. Fasting isn't required for this panel.
            </div>
            <div style={{marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap"}}>
              <span className="v2-chat-cite"><window.LIcon name="scroll" size={9}/> lab-protocols.pdf §4.2</span>
            </div>
          </div>
        </div>
        <div style={{padding: "8px 0 2px 30px"}}>
          <div style={{display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#faf9f7", border: "1px dashed #cfcec9", borderRadius: 7, fontSize: 11.5}}>
            <span style={{width: 20, height: 20, borderRadius: 5, background: "#1a1a1d", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
              <window.LIcon name="lightning" size={10}/>
            </span>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 600, color: "#1a1a1d"}}>book_appointment</div>
              <div style={{color: "#74747e", fontSize: 10.5}}>quest-labs · CBC · Thu 10:40 AM</div>
            </div>
            <span style={{fontFamily: "var(--font-mono)", fontSize: 9.5, color: "#0e9b6b"}}>✓ 312ms</span>
          </div>
        </div>
        <div className="v2-chat-msg v2-chat-msg--user">
          <div className="v2-chat-avatar">U</div>
          <div className="v2-chat-bubble">Perfect, lock it in.</div>
        </div>
      </div>
    </div>
  );
}

function ChatLogsShot() {
  return (
    <div className="v2-wt-frame">
      <div className="v2-wt-bar">
        <div className="v2-wt-dot"/><div className="v2-wt-dot"/><div className="v2-wt-dot"/>
        <span className="v2-wt-title-bar">Chat logs</span>
      </div>
      <div className="v2-logs-layout">
        <div className="v2-logs-list">
          {[
            { t: "Can you order a CBC…", m: "5d · 8 msg", on: true },
            { t: "What type of wine?",   m: "5d · 10 msg", on: false },
            { t: "Hi there, tell me…",   m: "5d · 24 msg", on: false },
            { t: "Who is the CEO?",      m: "6d · 6 msg",  on: false },
          ].map((s, i) => (
            <div key={i} className={`v2-log-row ${s.on ? "v2-log-row--on" : ""}`}>
              <div className="v2-log-title">{s.t}</div>
              <div className="v2-log-meta">{s.m}</div>
            </div>
          ))}
        </div>
        <div className="v2-logs-thread">
          <div className="v2-chat-msg v2-chat-msg--user">
            <div className="v2-chat-avatar">U</div>
            <div className="v2-chat-bubble" style={{fontSize: 11.5}}>Can you order a CBC for me before Friday?</div>
          </div>
          <div className="v2-chat-msg">
            <div className="v2-chat-avatar" style={{background: "var(--accent)"}}>C</div>
            <div>
              <div className="v2-chat-bubble" style={{fontSize: 11.5}}>Booked at Quest, San Mateo — Thu 10:40 AM.</div>
              <span className="v2-chat-cite" style={{marginTop: 4}}><window.LIcon name="scroll" size={9}/> lab-protocols.pdf</span>
            </div>
          </div>
          <div style={{marginTop: 8, padding: "8px 10px", background: "#faf9f7", border: "1px dashed #cfcec9", borderRadius: 7}}>
            <div style={{display: "flex", alignItems: "center", gap: 6}}>
              <span style={{fontFamily: "var(--font-mono)", fontSize: 9.5, color: "#1a1a1d", fontWeight: 600}}>Revise this answer</span>
              <span style={{marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9.5, color: "#5b6cff", display: "inline-flex", alignItems: "center", gap: 3}}>
                <window.LIcon name="spark" size={9}/> Revise
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsShot() {
  const bars = [22, 35, 28, 48, 56, 44, 70, 62, 88, 74, 95, 80, 68, 90];
  return (
    <div className="v2-wt-frame">
      <div className="v2-wt-bar">
        <div className="v2-wt-dot"/><div className="v2-wt-dot"/><div className="v2-wt-dot"/>
        <span className="v2-wt-title-bar">Analytics — Apr 28 – May 14</span>
      </div>
      <div className="v2-analytics-body">
        <div className="v2-analytics-stats">
          <div className="v2-analytics-stat">
            <div className="v2-analytics-stat-val">56</div>
            <div className="v2-analytics-stat-label">Messages</div>
          </div>
          <div className="v2-analytics-stat">
            <div className="v2-analytics-stat-val">5</div>
            <div className="v2-analytics-stat-label">Sessions</div>
          </div>
          <div className="v2-analytics-stat">
            <div className="v2-analytics-stat-val" style={{color: "var(--success)"}}>+150%</div>
            <div className="v2-analytics-stat-label">vs prev</div>
          </div>
        </div>
        <div className="v2-analytics-chart">
          <div style={{fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--ink-4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em"}}>Messages per day</div>
          <div className="v2-chart-bars">
            {bars.map((h, i) => (
              <div
                key={i}
                className={`v2-chart-bar ${i === bars.length - 1 ? "v2-chart-bar--on" : i > 8 ? "v2-chart-bar--hi" : ""}`}
                style={{height: `${h}%`}}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function V2Walkthrough() {
  const items = [
    {
      step: "01 — Playground",
      title: "Test the agent before you ship it.",
      body: "Have a real conversation in the Playground. Watch it draw on your sources, run actions, and escalate — before a single customer sees it. Tweak the prompt and hit send again.",
      tags: ["Cited answers", "Action runner", "Real-time testing"],
      visual: <PlaygroundShot/>,
      flip: false,
    },
    {
      step: "02 — Chat logs",
      title: "See every exchange. Fix what's off.",
      body: "Every conversation is stored with the source chunk it drew from. See where the agent hesitated, where it was wrong, and close the gap with one click — no re-deployment required.",
      tags: ["Source attribution", "Revise inline", "Q&A from transcript"],
      visual: <ChatLogsShot/>,
      flip: true,
    },
    {
      step: "03 — Analytics",
      title: "Measure what you actually care about.",
      body: "Message volume, session counts, deflection rate, and trend vs. the prior period. Enough signal to know when you need to add sources or tune a guardrail. Not a dashboard built to impress the CFO.",
      tags: ["Deflection rate", "Topic clusters", "Cost per session"],
      visual: <AnalyticsShot/>,
      flip: false,
    },
  ];

  return (
    <section className="v2-section">
      <div className="shell">
        <div className="v2-sh">
          <div className="v2-sh-eyebrow">Product walkthrough</div>
          <h2 className="v2-sh-title">From first message to <em>full operation.</em></h2>
          <p className="v2-sh-sub">Build, monitor, and improve — without leaving the platform.</p>
        </div>
        <div className="v2-walkthrough">
          {items.map((item, i) => (
            <div key={i} className={`v2-wt-item ${item.flip ? "v2-wt-item--flip" : ""}`}>
              <div className="v2-wt-copy">
                <div className="v2-wt-step">{item.step}</div>
                <h3 className="v2-wt-title">{item.title}</h3>
                <p className="v2-wt-body">{item.body}</p>
                <div className="v2-wt-tags">
                  {item.tags.map(t => <span key={t} className="v2-wt-tag"><window.LIcon name="check" size={10}/>{t}</span>)}
                </div>
              </div>
              <div className="v2-wt-visual">{item.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────── HOW IT WORKS */
function V2HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Create an agent.",
      body: "Pick a model, name it, give it a persona. Takes 90 seconds. You can always change the model and tone later without re-training your sources.",
      detail: ["Pick model (Claude, GPT-4, Gemini)", "Set persona & guardrails", "Define escalation rules"],
    },
    {
      num: "02",
      title: "Connect your data.",
      body: "Drop in PDFs, paste a sitemap, sync a Notion workspace. Sources are chunked, embedded, and ready to retrieve — no vector database to configure.",
      detail: ["PDF · DOCX · TXT · CSV", "Website crawler (sitemap or URL)", "Notion · Google Drive sync"],
    },
    {
      num: "03",
      title: "Embed or deploy.",
      body: "Copy the web widget snippet, connect Slack, or hit the API. One agent config, every channel. Monitor and revise from the same place you built it.",
      detail: ["Web widget (1 script tag)", "Slack · WhatsApp · API", "Live in under 10 minutes"],
    },
  ];

  return (
    <section className="v2-section v2-how" id="how-it-works">
      <div className="shell">
        <div className="v2-sh">
          <div className="v2-sh-eyebrow">How it works</div>
          <h2 className="v2-sh-title">Create. Connect. Deploy.</h2>
          <p className="v2-sh-sub">Three steps that take an afternoon — not a sprint.</p>
        </div>
        <div className="v2-how-steps">
          {steps.map((s, i) => (
            <div key={i} className="v2-how-step">
              {i < steps.length - 1 && <div className="v2-how-connector"/>}
              <span className="v2-how-num">{s.num}</span>
              <h3 className="v2-how-title">{s.title}</h3>
              <p className="v2-how-body">{s.body}</p>
              <div className="v2-how-detail">
                {s.detail.map(d => <span key={d}>{d}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────── PRICING */
function V2Pricing() {
  const plans = [
    {
      name: "Hobby",
      pitch: "Try it. Ship a prototype.",
      price: 32,
      credits: "500 messages / month",
      feats: ["1 AI agent", "2 team members", "Web widget", "10 MB sources / agent", "Community support"],
      cta: "Start free", rec: false,
    },
    {
      name: "Standard",
      pitch: "Small teams in production.",
      price: 120,
      credits: "4,000 messages / month",
      feats: ["3 AI agents", "5 team members", "All channels", "20 MB sources / agent", "API access", "1-day SLA"],
      cta: "Start free trial", rec: true,
    },
    {
      name: "Pro",
      pitch: "Growth with compliance.",
      price: 400,
      credits: "15,000 messages / month",
      feats: ["10 AI agents", "Unlimited members", "Custom domain", "40 MB sources / agent", "SAML SSO", "Dedicated support"],
      cta: "Talk to us", rec: false,
    },
  ];
  return (
    <section className="v2-section" id="pricing">
      <div className="shell">
        <div className="v2-sh">
          <div className="v2-sh-eyebrow">Pricing</div>
          <h2 className="v2-sh-title">Start free. <em>Pay when it works.</em></h2>
          <p className="v2-sh-sub">No credit card to start. Upgrade when you're shipping real volume — not before.</p>
        </div>
        <div className="v2-plans">
          {plans.map(p => (
            <div key={p.name} className={`v2-plan ${p.rec ? "v2-plan--rec" : ""}`}>
              {p.rec && <span className="v2-plan-badge">Most popular</span>}
              <div className="v2-plan-name">{p.name}</div>
              <div className="v2-plan-pitch">{p.pitch}</div>
              <div className="v2-plan-price">
                <span className="v2-plan-currency">$</span>
                <span className="v2-plan-num">{p.price}</span>
                <span className="v2-plan-per">/mo</span>
              </div>
              <div className="v2-plan-credits">{p.credits} · billed annually</div>
              <div className="v2-plan-divider"/>
              <ul className="v2-plan-feats">
                {p.feats.map(f => (
                  <li key={f} className="v2-plan-feat">
                    <span className="v2-plan-check"><window.LIcon name="check" size={10} stroke={2.4}/></span>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`btn v2-plan-cta ${p.rec ? "btn--primary" : "btn--secondary"}`}>
                {p.cta} <window.LIcon name="arrow-right" size={13}/>
              </button>
              <div className="v2-plan-link"><a href="#">See full comparison →</a></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────── CTA */
function V2CTA() {
  return (
    <section className="v2-cta-section">
      <div className="shell">
        <div className="v2-cta-eyebrow">Start free, ship today</div>
        <h2 className="v2-cta-title">The right answer, <em>every time.</em></h2>
        <p className="v2-cta-sub">500 messages free, 1 agent, every channel. No credit card. You'll be live before your next coffee.</p>
        <div className="v2-cta-btns">
          <button className="btn btn--primary btn--lg">Start free <window.LIcon name="arrow-right" size={14}/></button>
          <button className="btn btn--secondary btn--lg">Book a 20-min walkthrough</button>
        </div>
        <div className="v2-cta-meta">
          <span>Used by 1,200+ teams</span>
          <span>·</span>
          <span>SOC 2 Type II</span>
          <span>·</span>
          <span>No credit card required</span>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────── FOOTER */
function V2Footer() {
  return (
    <footer className="v2-footer">
      <div className="shell">
        <div className="v2-footer-grid">
          <div>
            <div className="v2-footer-brand">
              <span className="v2-footer-brand-mark">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M8 12a4 4 0 0 1 8 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="16" r="1.3" fill="white"/>
                  <circle cx="15" cy="16" r="1.3" fill="white"/>
                </svg>
              </span>
              Conciara
            </div>
            <p className="v2-footer-tagline">AI agents that actually know your business — built for teams that ship real things.</p>
          </div>
          {[
            { title: "Product", links: ["Agents", "Inbox", "Actions", "Analytics", "Changelog"] },
            { title: "Solutions", links: ["Customer support", "Sales", "Internal IT", "Healthcare"] },
            { title: "Resources", links: ["Docs", "API reference", "Playbooks", "Blog"] },
            { title: "Company", links: ["About", "Customers", "Careers", "Security"] },
          ].map(col => (
            <div key={col.title} className="v2-footer-col">
              <div className="v2-footer-col-title">{col.title}</div>
              <ul>{col.links.map(l => <li key={l}><a href="#">{l}</a></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="v2-footer-bottom">
          <span>© 2026 Conciara, Inc.</span>
          <div style={{display: "flex", gap: 20, alignItems: "center"}}>
            <span className="v2-status">All systems operational</span>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">DPA</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  V2Nav, V2Hero, V2Logos, V2Outcomes, V2Walkthrough,
  V2HowItWorks, V2Pricing, V2CTA, V2Footer,
});
