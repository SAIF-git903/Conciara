/* Conciara — secondary screens: Notifications, Audit, Plans, Billing, API keys */

const { useState: useS2 } = React;

/* ===================== NOTIFICATIONS ===================== */
function NotificationsScreen() {
  const groups = [
    {
      title: "Workspace activity",
      items: [
        { id: "agent-error", label: "An agent fails or stops responding", desc: "Critical failures only.", email: true, push: true },
        { id: "credit-50", label: "Reach 50% of credit limit", desc: "Heads-up before you run out.", email: true, push: false },
        { id: "credit-90", label: "Reach 90% of credit limit", desc: "Final warning.", email: true, push: true },
      ],
    },
    {
      title: "Team",
      items: [
        { id: "invite", label: "New member joins", desc: "When an invitation is accepted.", email: true, push: false },
        { id: "role", label: "Role changed", desc: "Someone promoted or demoted.", email: false, push: false },
      ],
    },
    {
      title: "Product",
      items: [
        { id: "release", label: "Product updates", desc: "Major releases (about once a month).", email: true, push: false },
        { id: "tips", label: "Tips & best practices", desc: "We send these sparingly.", email: false, push: false },
      ],
    },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Settings</span>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Choose what we email you about. You'll always get critical security alerts.</p>
        </div>
      </div>

      <div className="settings-split">
        <div className="settings-side">
          <h4>Heads-up</h4>
          <p>We'll email <strong>saifali@truemedit.com</strong>. <a href="#">Change</a></p>
        </div>

        <div className="col">
          {groups.map(g => (
            <div className="card" key={g.title}>
              <div className="card-header">
                <div className="card-title">{g.title}</div>
                <div className="row notif-head">
                  <span className="section-eyebrow" style={{margin: 0, width: 56, textAlign: "center"}}>Email</span>
                  <span className="section-eyebrow" style={{margin: 0, width: 56, textAlign: "center"}}>In-app</span>
                </div>
              </div>
              <div>
                {g.items.map((it, i) => (
                  <div key={it.id} className="notif-row">
                    <div>
                      <div style={{fontWeight: 500}}>{it.label}</div>
                      <div className="muted" style={{fontSize: 12.5}}>{it.desc}</div>
                    </div>
                    <NotifToggle defaultChecked={it.email}/>
                    <NotifToggle defaultChecked={it.push}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotifToggle({ defaultChecked }) {
  const [on, setOn] = useS2(defaultChecked);
  return (
    <button className={`toggle ${on ? "toggle--on" : ""}`} onClick={() => setOn(!on)} aria-pressed={on}>
      <span className="toggle-thumb"/>
    </button>
  );
}

/* ===================== AUDIT ===================== */
function AuditScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Settings</span>
          <h1 className="page-title">Audit logs</h1>
          <p className="page-subtitle">Tamper-evident record of who did what and when. Available on Standard and Pro.</p>
        </div>
      </div>

      <div className="lock-notice">
        <div className="lock-icon"><window.Icon name="shield" size={18}/></div>
        <div style={{flex: 1}}>
          <div style={{fontWeight: 600, fontSize: 14}}>Audit logs aren't included in your plan</div>
          <div className="muted" style={{fontSize: 13, marginTop: 2}}>Upgrade to Standard or Pro to access detailed audit trails for compliance and security review.</div>
        </div>
        <button className="btn btn--primary">Compare plans<window.Icon name="arrow-right" size={13}/></button>
      </div>

      <div className="card" style={{marginTop: 16, opacity: 0.7}}>
        <div className="audit-table">
          <div className="audit-row audit-row--head">
            <span>Timestamp</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Target</span>
            <span>IP</span>
          </div>
          {[1,2,3,4,5,6].map(i => (
            <div className="audit-row" key={i}>
              <span className="mono muted">— —</span>
              <span className="muted">— —</span>
              <span className="muted">— —</span>
              <span className="muted">— —</span>
              <span className="mono muted">— —</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== PLANS ===================== */
function PlansScreen() {
  const [billing, setBilling] = useS2("monthly");
  const plans = [
    {
      id: "hobby", name: "Hobby", current: true,
      price: { monthly: 32, annual: 26 },
      tagline: "For builders trying things out.",
      features: ["500 message credits / month", "1 AI agent", "2 team members", "10 MB training data per agent", "Community support"],
    },
    {
      id: "standard", name: "Standard", recommended: true,
      price: { monthly: 120, annual: 96 },
      tagline: "For small teams in production.",
      features: ["4,000 message credits / month", "1 AI agent", "3 team members", "20 MB training data per agent", "API access", "Priority email support"],
    },
    {
      id: "pro", name: "Pro",
      price: { monthly: 400, annual: 320 },
      tagline: "For growing teams with compliance needs.",
      features: ["15,000 message credits / month", "1 AI agent", "5 team members", "40 MB training data per agent", "API access", "Audit logs & SSO", "Dedicated support"],
    },
  ];

  return (
    <div className="page page--wide">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Settings</span>
          <h1 className="page-title">Plans &amp; pricing</h1>
          <p className="page-subtitle">Pick the plan that fits this workspace. You can switch any time — we'll prorate.</p>
        </div>
        <div className="billing-toggle">
          <button className={billing === "monthly" ? "is-on" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
          <button className={billing === "annual" ? "is-on" : ""} onClick={() => setBilling("annual")}>
            Annual <span className="save-tag">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="plans-grid">
        {plans.map(p => (
          <article key={p.id} className={`plan ${p.current ? "plan--current" : ""} ${p.recommended ? "plan--recommended" : ""}`}>
            {p.recommended && <span className="plan-flag">Recommended</span>}
            {p.current && <span className="plan-flag plan-flag--current">Current plan</span>}

            <header className="plan-head">
              <h3>{p.name}</h3>
              <p>{p.tagline}</p>
            </header>

            <div className="plan-price">
              <span className="plan-price-currency">$</span>
              <span className="plan-price-num">{p.price[billing]}</span>
              <span className="plan-price-cadence">/ month{billing === "annual" && <span className="muted"> · billed annually</span>}</span>
            </div>

            <ul className="plan-features">
              {p.features.map(f => (
                <li key={f}><span className="plan-tick"><window.Icon name="check" size={11}/></span>{f}</li>
              ))}
            </ul>

            <div className="plan-cta">
              {p.current ? (
                <button className="btn btn--secondary" style={{width: "100%"}}>Current plan</button>
              ) : (
                <button className={`btn ${p.recommended ? "btn--primary" : "btn--secondary"}`} style={{width: "100%"}}>
                  Upgrade to {p.name}<window.Icon name="arrow-right" size={13}/>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="enterprise-strip">
        <div>
          <div className="section-eyebrow" style={{margin: 0}}>Enterprise</div>
          <div style={{fontWeight: 600, fontSize: 15, marginTop: 4}}>Need SSO, custom DPA, or volume pricing?</div>
        </div>
        <button className="btn btn--secondary">Talk to sales<window.Icon name="arrow-up-right" size={13}/></button>
      </div>
    </div>
  );
}

/* ===================== BILLING ===================== */
function BillingScreen() {
  const invoices = [
    { date: "May 1, 2026", amount: "$32.00", status: "paid", id: "INV-1042" },
    { date: "Apr 1, 2026", amount: "$32.00", status: "paid", id: "INV-1031" },
    { date: "Mar 1, 2026", amount: "$32.00", status: "paid", id: "INV-1019" },
    { date: "Feb 1, 2026", amount: "$32.00", status: "paid", id: "INV-1003" },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Settings</span>
          <h1 className="page-title">Billing &amp; subscription</h1>
          <p className="page-subtitle">View your plan, billing cycle, and invoice history. Only the workspace owner can change billing.</p>
        </div>
        <button className="btn btn--secondary"><window.Icon name="play" size={11}/> Refresh</button>
      </div>

      <div className="billing-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Current plan</div>
            <button className="btn btn--ghost btn--sm">Change plan<window.Icon name="arrow-up-right" size={12}/></button>
          </div>
          <div className="card-body">
            <div className="row" style={{gap: 14}}>
              <div className="plan-mark">H</div>
              <div style={{flex: 1}}>
                <div className="row" style={{gap: 8}}>
                  <span style={{fontWeight: 600, fontSize: 15}}>Hobby</span>
                  <span className="badge badge--success"><span className="dot dot--success"/>Active</span>
                </div>
                <div className="muted" style={{fontSize: 12.5, marginTop: 2}}>$32 / month · Billed monthly</div>
              </div>
              <div style={{textAlign: "right"}}>
                <div className="muted" style={{fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em"}}>Next billing</div>
                <div className="mono" style={{fontWeight: 500, marginTop: 2}}>May 23, 2026</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Payment method</div>
            <button className="btn btn--ghost btn--sm">Update<window.Icon name="arrow-up-right" size={12}/></button>
          </div>
          <div className="card-body">
            <div className="row" style={{gap: 14}}>
              <div className="card-brand">VISA</div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500}}>Visa ending 4242</div>
                <div className="muted mono" style={{fontSize: 12}}>Expires 09 / 2028</div>
              </div>
              <span className="badge badge--neutral"><window.Icon name="shield" size={10}/> Secured by Paddle</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 16}}>
        <div className="card-header">
          <div>
            <div className="card-title">Invoice history</div>
            <div className="card-subtitle">Receipts are also emailed to you by Paddle.</div>
          </div>
          <button className="btn btn--ghost btn--sm">Download all<window.Icon name="external" size={12}/></button>
        </div>
        <div className="invoice-table">
          <div className="invoice-row invoice-row--head">
            <span>Date</span>
            <span>Invoice</span>
            <span>Amount</span>
            <span>Status</span>
            <span></span>
          </div>
          {invoices.map(inv => (
            <div className="invoice-row" key={inv.id}>
              <span className="mono">{inv.date}</span>
              <span className="mono muted">{inv.id}</span>
              <span className="mono">{inv.amount}</span>
              <span><span className="badge badge--success">Paid</span></span>
              <span style={{textAlign: "right"}}>
                <button className="btn btn--ghost btn--sm">PDF<window.Icon name="external" size={11}/></button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== API KEYS ===================== */
function ApiKeysScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-title-eyebrow">Settings</span>
          <h1 className="page-title">API keys</h1>
          <p className="page-subtitle">Programmatic access to your agents. Use <code className="code-inline">Authorization: Bearer &lt;key&gt;</code> on every request.</p>
        </div>
        <button className="btn btn--primary" disabled style={{opacity: 0.55, cursor: "not-allowed"}}><window.Icon name="plus" size={13}/> New API key</button>
      </div>

      <div className="lock-notice">
        <div className="lock-icon"><window.Icon name="key" size={18}/></div>
        <div style={{flex: 1}}>
          <div style={{fontWeight: 600, fontSize: 14}}>API access isn't included in Hobby</div>
          <div className="muted" style={{fontSize: 13, marginTop: 2}}>Upgrade to Standard to create API keys, set rate limits, and rotate credentials programmatically.</div>
        </div>
        <button className="btn btn--secondary">View plans</button>
        <button className="btn btn--primary">Upgrade to Standard<window.Icon name="arrow-right" size={13}/></button>
      </div>

      <div style={{marginTop: 24}}>
        <div className="section-eyebrow">What you'll be able to do</div>
        <div className="api-preview-grid">
          {[
            { title: "Send messages", desc: "Programmatically chat with any agent.", code: "POST /v1/agents/:id/messages" },
            { title: "Manage data sources", desc: "Upload, list, or remove training data.", code: "POST /v1/agents/:id/sources" },
            { title: "Stream events", desc: "Subscribe to agent runs over WebSocket.", code: "WSS /v1/events" },
            { title: "Read usage", desc: "Pull credit usage for billing systems.", code: "GET /v1/usage?period=current" },
          ].map(c => (
            <div key={c.title} className="api-preview-card">
              <div style={{fontWeight: 500, fontSize: 13.5}}>{c.title}</div>
              <div className="muted" style={{fontSize: 12.5, marginTop: 2}}>{c.desc}</div>
              <div className="api-code">{c.code}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{marginTop: 24}}>
        <div className="card-header">
          <div>
            <div className="card-title">Quickstart</div>
            <div className="card-subtitle">Once enabled, you'll send messages like this.</div>
          </div>
          <button className="btn btn--ghost btn--sm"><window.Icon name="copy" size={12}/> Copy</button>
        </div>
        <pre className="code-block">{`curl https://api.conciara.app/v1/agents/lab-tests/messages \\
  -H "Authorization: Bearer $CONCIARA_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Order a CBC for patient #4421",
    "stream": true
  }'`}</pre>
      </div>
    </div>
  );
}

window.NotificationsScreen = NotificationsScreen;
window.AuditScreen = AuditScreen;
window.PlansScreen = PlansScreen;
window.BillingScreen = BillingScreen;
window.ApiKeysScreen = ApiKeysScreen;
