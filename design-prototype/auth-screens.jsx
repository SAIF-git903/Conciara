/* Auth + Account + Workspace Picker + Pricing
   Full-bleed screens (no workspace shell).
*/
const { useState } = React;

/* ===================== Sign In ===================== */
function SignInScreen({ setScreen }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("sumeet@geniusai.biz");
  const [pwd, setPwd] = useState("");

  return (
    <div className="auth-shell">
      {/* Left: form */}
      <div className="auth-pane auth-pane--form">
        <div className="auth-form-wrap">
          <a className="auth-logo" onClick={() => setScreen("agents")}>
            <window.Icon name="logo-mark" size={26}/>
            <span>Conciara</span>
          </a>

          <div className="auth-head">
            <h1 className="auth-title">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
            <p className="auth-subtitle">
              {mode === "signin"
                ? "Sign in to manage your agents and workspaces."
                : "Start with 500 free credits. No card required."}
            </p>
          </div>

          <div className="auth-oauth">
            <button className="oauth-btn">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.3-4.6 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.2v2.8C4 20.4 7.7 23 12 23z"/><path fill="#FBBC04" d="M5.8 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.2C1.4 8.6 1 10.3 1 12s.4 3.4 1.2 4.9l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 4 3.6 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
              Continue with Google
            </button>
            <button className="oauth-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0f172a"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>
              Continue with GitHub
            </button>
          </div>

          <div className="auth-divider"><span>or with email</span></div>

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); setScreen("choose-workspace"); }}>
            <label className="field">
              <span className="field-label">Work email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/>
            </label>
            <label className="field">
              <span className="field-label auth-pwd-row">
                <span>Password</span>
                {mode === "signin" && <a className="auth-link-sm">Forgot?</a>}
              </span>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••"/>
            </label>

            {mode === "signup" && (
              <label className="auth-check">
                <span className="checkbox checkbox--on"><window.Icon name="check" size={10}/></span>
                <span className="muted" style={{fontSize: 12.5}}>I agree to the <a className="auth-link-sm">Terms</a> and <a className="auth-link-sm">Privacy Policy</a></span>
              </label>
            )}

            <button type="submit" className="btn btn--primary auth-cta">
              {mode === "signin" ? "Sign in" : "Create account"}
              <window.Icon name="arrow-right" size={13}/>
            </button>
          </form>

          <div className="auth-foot">
            {mode === "signin" ? (
              <>New to Conciara? <a className="auth-link" onClick={() => setMode("signup")}>Create an account</a></>
            ) : (
              <>Already have an account? <a className="auth-link" onClick={() => setMode("signin")}>Sign in</a></>
            )}
          </div>
        </div>
      </div>

      {/* Right: editorial side */}
      <div className="auth-pane auth-pane--marketing">
        <div className="auth-marketing">
          <div className="am-eyebrow">Conciara · for product teams</div>
          <h2 className="am-quote">
            “Replaced our entire support tier-1 in three weeks.<br/>
            <span className="am-quote-soft">Twelve languages, one knowledge base, zero scripts.”</span>
          </h2>
          <div className="am-attribution">
            <div className="am-avatar">EM</div>
            <div>
              <div className="am-name">Elena Morais</div>
              <div className="am-role muted">Head of CX, Domaine Carneros</div>
            </div>
          </div>

          <div className="am-grid">
            <div className="am-stat">
              <div className="am-stat-num">94%</div>
              <div className="am-stat-label muted">resolved without a human</div>
            </div>
            <div className="am-stat">
              <div className="am-stat-num">2.1s</div>
              <div className="am-stat-label muted">avg first response</div>
            </div>
            <div className="am-stat">
              <div className="am-stat-num">12</div>
              <div className="am-stat-label muted">languages, day one</div>
            </div>
          </div>

          <div className="am-logos">
            <span className="muted" style={{fontSize: 11.5}}>Trusted by 4,200+ teams</span>
            <div className="am-logo-row">
              <div className="am-logo">DOMAINE</div>
              <div className="am-logo">linear</div>
              <div className="am-logo">Mercury</div>
              <div className="am-logo">VERCEL</div>
              <div className="am-logo">Notion</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Choose Workspace ===================== */
function ChooseWorkspaceScreen({ setScreen }) {
  const workspaces = [
    { id: "ws1", name: "Test 01", plan: "Hobby", agents: 1, members: 1, role: "Owner", recent: true },
    { id: "ws2", name: "Test 02 — Paid Workspace", plan: "Standard", agents: 4, members: 6, role: "Owner" },
    { id: "ws3", name: "Genius AI", plan: "Pro", agents: 12, members: 24, role: "Admin" },
    { id: "ws4", name: "Domaine Carneros", plan: "Pro", agents: 3, members: 8, role: "Member" },
  ];

  return (
    <div className="ws-picker">
      <header className="ws-picker-top">
        <a className="auth-logo" onClick={() => setScreen("agents")}>
          <window.Icon name="logo-mark" size={22}/>
          <span>Conciara</span>
        </a>
        <div className="ws-picker-account">
          <span className="muted">sumeet@geniusai.biz</span>
          <button className="btn btn--ghost btn--sm" onClick={() => setScreen("signin")}>Sign out</button>
        </div>
      </header>

      <div className="ws-picker-body">
        <div className="ws-picker-head">
          <div className="auth-eyebrow">Step 2 of 2</div>
          <h1 className="ws-picker-title">Choose a workspace</h1>
          <p className="ws-picker-sub">A workspace is where agents, members, and billing live. You can switch any time.</p>
        </div>

        <div className="ws-picker-list">
          {workspaces.map(w => (
            <button key={w.id} className="ws-picker-row" onClick={() => setScreen("agents")}>
              <span className="ws-picker-mark"><window.Icon name="logo-mark" size={20}/></span>
              <span className="ws-picker-meta">
                <span className="ws-picker-name">
                  {w.name}
                  {w.recent && <span className="badge badge--soft" style={{marginLeft: 8, fontSize: 10.5}}>Last used</span>}
                </span>
                <span className="ws-picker-line muted">
                  <span>{w.plan} plan</span>
                  <span className="ws-picker-dot">·</span>
                  <span>{w.agents} agent{w.agents === 1 ? "" : "s"}</span>
                  <span className="ws-picker-dot">·</span>
                  <span>{w.members} member{w.members === 1 ? "" : "s"}</span>
                  <span className="ws-picker-dot">·</span>
                  <span className="ws-picker-role">{w.role}</span>
                </span>
              </span>
              <window.Icon name="arrow-right" size={14} className="ws-picker-go"/>
            </button>
          ))}
        </div>

        <div className="ws-picker-create">
          <div>
            <div style={{fontWeight: 500, fontSize: 14}}>Need a fresh start?</div>
            <div className="muted" style={{fontSize: 12.5}}>Spin up a new workspace for a different team or product.</div>
          </div>
          <button className="btn btn--secondary btn--sm">
            <window.Icon name="plus" size={12}/>
            Create new workspace
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Account Settings ===================== */
function AccountScreen({ setScreen }) {
  const [tab, setTab] = useState("profile");
  return (
    <div className="account-shell">
      <header className="account-top">
        <div className="row" style={{gap: 14}}>
          <button className="back-to-ws" onClick={() => setScreen("agents")}>
            <window.Icon name="chevron-right" size={12} className="back-arrow"/>
            Back to workspace
          </button>
          <span className="bc-sep" style={{color: "var(--line)"}}>/</span>
          <span style={{fontWeight: 500}}>Account</span>
        </div>
        <div className="muted" style={{fontSize: 12.5}}>sumeet@geniusai.biz</div>
      </header>

      <div className="account-body">
        <aside className="account-rail">
          <div className="nav-group-label">Account</div>
          {[
            { id: "profile", label: "Profile", icon: "user" },
            { id: "security", label: "Security", icon: "shield" },
            { id: "sessions", label: "Sessions", icon: "scroll" },
            { id: "preferences", label: "Preferences", icon: "settings" },
            { id: "danger", label: "Delete account", icon: "trash", danger: true },
          ].map(i => (
            <button
              key={i.id}
              className={`nav-item ${tab === i.id ? "nav-item--active" : ""} ${i.danger ? "nav-item--danger" : ""}`}
              onClick={() => setTab(i.id)}
            >
              <window.Icon name={i.icon} size={15}/>
              <span className="nav-label">{i.label}</span>
            </button>
          ))}
        </aside>

        <main className="account-main">
          {tab === "profile" && <AccountProfile/>}
          {tab === "security" && <AccountSecurity/>}
          {tab === "sessions" && <AccountSessions/>}
          {tab === "preferences" && <AccountPreferences/>}
          {tab === "danger" && <AccountDanger/>}
        </main>
      </div>
    </div>
  );
}

function AccountProfile() {
  return (
    <div className="account-page">
      <div className="account-page-head">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">How you appear across Conciara.</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="row" style={{gap: 18, alignItems: "center", marginBottom: 18}}>
            <div className="avatar-xl">SA</div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 500}}>Profile photo</div>
              <div className="muted" style={{fontSize: 12.5}}>PNG or JPG, 1MB max. Square images work best.</div>
            </div>
            <button className="btn btn--secondary btn--sm">Upload</button>
            <button className="btn btn--ghost btn--sm">Remove</button>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Full name</span>
              <input defaultValue="Sumeet Anand"/>
            </label>
            <label className="field">
              <span className="field-label">Display name</span>
              <input defaultValue="Sumeet"/>
            </label>
            <label className="field">
              <span className="field-label">Work email</span>
              <input defaultValue="sumeet@geniusai.biz" disabled/>
              <span className="muted" style={{fontSize: 11.5, marginTop: 6}}>To change, contact support.</span>
            </label>
            <label className="field">
              <span className="field-label">Time zone</span>
              <select defaultValue="ist">
                <option value="ist">India Standard Time (UTC+5:30)</option>
                <option value="pt">Pacific Time (UTC−8)</option>
                <option value="utc">UTC</option>
              </select>
            </label>
          </div>
        </div>
        <div className="card-foot">
          <span className="muted" style={{fontSize: 12}}>Saved automatically</span>
          <button className="btn btn--primary btn--sm"><window.Icon name="check" size={12}/> Save changes</button>
        </div>
      </div>
    </div>
  );
}

function AccountSecurity() {
  return (
    <div className="account-page">
      <div className="account-page-head">
        <h1 className="page-title">Security</h1>
        <p className="page-subtitle">Password, two-factor authentication, and connected identities.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Password</div>
            <div className="card-subtitle">Last changed 4 months ago</div>
          </div>
          <button className="btn btn--secondary btn--sm">Change password</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Two-factor authentication</div>
            <div className="card-subtitle">Require a code from your authenticator app on every sign-in.</div>
          </div>
          <span className="badge badge--success"><window.Icon name="check" size={10}/> Enabled</span>
        </div>
        <div className="card-body" style={{borderTop: "1px solid var(--line)"}}>
          <div className="row" style={{justifyContent: "space-between"}}>
            <div className="muted" style={{fontSize: 13}}>Authenticator app · Added Jan 12</div>
            <button className="btn btn--ghost btn--sm">Reconfigure</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Connected accounts</div>
            <div className="card-subtitle">Sign in with these identities</div>
          </div>
        </div>
        <div className="card-body" style={{borderTop: "1px solid var(--line)", padding: 0}}>
          {[
            { name: "Google", email: "sumeet@geniusai.biz", connected: true },
            { name: "GitHub", email: null, connected: false },
            { name: "SAML SSO", email: null, connected: false, hint: "Available on Pro" },
          ].map((p, i) => (
            <div key={i} className="link-row" style={{borderTop: i ? "1px solid var(--line)" : "none"}}>
              <div className="url-icon"><window.Icon name="external" size={13}/></div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500}}>{p.name}</div>
                <div className="muted" style={{fontSize: 12}}>{p.connected ? p.email : (p.hint || "Not connected")}</div>
              </div>
              {p.connected
                ? <button className="btn btn--ghost btn--sm">Disconnect</button>
                : <button className="btn btn--secondary btn--sm">Connect</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountSessions() {
  const sessions = [
    { device: "MacBook Pro · Chrome 134", loc: "Bengaluru, IN", time: "Active now", current: true },
    { device: "iPhone 15 · Safari", loc: "Bengaluru, IN", time: "2 hours ago" },
    { device: "Windows · Firefox 124", loc: "Mumbai, IN", time: "Yesterday, 4:30 PM" },
    { device: "MacBook Air · Chrome", loc: "Pune, IN", time: "Apr 21, 2026" },
  ];
  return (
    <div className="account-page">
      <div className="account-page-head">
        <h1 className="page-title">Active sessions</h1>
        <p className="page-subtitle">Devices currently signed in to your account.</p>
      </div>
      <div className="card">
        <div className="card-body" style={{padding: 0}}>
          {sessions.map((s, i) => (
            <div key={i} className="link-row" style={{borderTop: i ? "1px solid var(--line)" : "none"}}>
              <div className="url-icon"><window.Icon name="user" size={13}/></div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500}}>{s.device}</div>
                <div className="muted" style={{fontSize: 12}}>{s.loc} · {s.time}</div>
              </div>
              {s.current
                ? <span className="badge badge--success"><window.Icon name="check" size={10}/> This device</span>
                : <button className="btn btn--ghost btn--sm" style={{color: "var(--danger)"}}>Sign out</button>}
            </div>
          ))}
        </div>
        <div className="card-foot">
          <span className="muted" style={{fontSize: 12}}>4 active sessions</span>
          <button className="btn btn--secondary btn--sm" style={{color: "var(--danger)"}}>Sign out everywhere else</button>
        </div>
      </div>
    </div>
  );
}

function AccountPreferences() {
  return (
    <div className="account-page">
      <div className="account-page-head">
        <h1 className="page-title">Preferences</h1>
        <p className="page-subtitle">Personal settings — these apply across all your workspaces.</p>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Theme</span>
              <select defaultValue="system">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">Match system</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Language</span>
              <select defaultValue="en">
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Hindi</option>
                <option>Español</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Default landing page</span>
              <select defaultValue="agents">
                <option value="agents">Agents</option>
                <option value="usage">Usage</option>
                <option value="recent">Last viewed agent</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Keyboard shortcut style</span>
              <select defaultValue="mac">
                <option value="mac">macOS (⌘)</option>
                <option value="win">Windows / Linux (Ctrl)</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountDanger() {
  return (
    <div className="account-page">
      <div className="account-page-head">
        <h1 className="page-title" style={{color: "var(--danger)"}}>Delete account</h1>
        <p className="page-subtitle">Permanently delete your account and remove your access to all workspaces.</p>
      </div>
      <div className="card" style={{borderColor: "var(--danger-soft)"}}>
        <div className="card-body">
          <div style={{fontWeight: 500, marginBottom: 8}}>This will:</div>
          <ul className="muted" style={{fontSize: 13, lineHeight: 1.7, paddingLeft: 18, margin: "0 0 16px"}}>
            <li>Remove you from all workspaces you're a member of.</li>
            <li>Transfer ownership of any workspaces where you're the sole owner — or delete them after 30 days.</li>
            <li>Delete personal preferences, sessions, and connected accounts.</li>
          </ul>
          <div className="row" style={{justifyContent: "space-between", padding: 14, background: "rgba(195,54,101,0.04)", borderRadius: 8}}>
            <div>
              <div style={{fontWeight: 500}}>Confirm by typing your email</div>
              <div className="muted" style={{fontSize: 12.5}}>sumeet@geniusai.biz</div>
            </div>
            <button className="btn btn--danger-outline"><window.Icon name="trash" size={13}/> Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Pricing (public) ===================== */
function PricingScreen({ setScreen }) {
  const [billing, setBilling] = useState("yearly");
  const plans = [
    {
      name: "Hobby",
      tagline: "Side projects and prototypes",
      price: { monthly: 0, yearly: 0 },
      cta: "Current plan",
      ctaDisabled: true,
      features: [
        "1 agent",
        "500 message credits / mo",
        "5 MB training data",
        "Conciara branding",
        "Community support",
      ],
    },
    {
      name: "Standard",
      tagline: "For teams shipping their first agent",
      price: { monthly: 49, yearly: 39 },
      cta: "Upgrade to Standard",
      features: [
        "5 agents",
        "10,000 message credits / mo",
        "100 MB training data",
        "Remove Conciara branding",
        "Email support, 1 day SLA",
      ],
      popular: true,
    },
    {
      name: "Pro",
      tagline: "Production agents at scale",
      price: { monthly: 199, yearly: 159 },
      cta: "Upgrade to Pro",
      features: [
        "Unlimited agents",
        "60,000 message credits / mo",
        "1 GB training data",
        "Custom domains",
        "Advanced analytics + SLA",
        "Priority support, 4 hr SLA",
      ],
    },
    {
      name: "Enterprise",
      tagline: "Bespoke deployments",
      price: null,
      cta: "Contact sales",
      features: [
        "SAML SSO + SCIM",
        "Custom credit caps",
        "On-prem / VPC deployment",
        "Dedicated solutions architect",
        "99.95% uptime SLA",
        "DPA + custom MSAs",
      ],
    },
  ];

  return (
    <div className="pricing-shell">
      <header className="pricing-top">
        <a className="auth-logo" onClick={() => setScreen("agents")}>
          <window.Icon name="logo-mark" size={22}/>
          <span>Conciara</span>
        </a>
        <nav className="pricing-nav">
          <a className="muted">Product</a>
          <a className="muted">Customers</a>
          <a style={{color: "var(--ink)", fontWeight: 500}}>Pricing</a>
          <a className="muted">Docs</a>
        </nav>
        <div className="row" style={{gap: 8}}>
          <button className="btn btn--ghost btn--sm" onClick={() => setScreen("signin")}>Sign in</button>
          <button className="btn btn--primary btn--sm" onClick={() => setScreen("signin")}>Start free</button>
        </div>
      </header>

      <section className="pricing-hero">
        <div className="auth-eyebrow">Pricing</div>
        <h1 className="pricing-title">Pay for the message volume,<br/>not the seats.</h1>
        <p className="pricing-sub">Every plan includes unlimited workspaces, all integrations, and the full feature set. The only thing that changes is how many conversations you can run.</p>

        <div className="pricing-toggle">
          <button className={billing === "monthly" ? "is-active" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
          <button className={billing === "yearly" ? "is-active" : ""} onClick={() => setBilling("yearly")}>
            Yearly <span className="pricing-toggle-save">Save 20%</span>
          </button>
        </div>
      </section>

      <section className="pricing-grid">
        {plans.map((p, i) => (
          <div key={p.name} className={`pricing-card ${p.popular ? "pricing-card--featured" : ""}`}>
            {p.popular && <div className="pricing-badge">Most popular</div>}
            <div className="pricing-card-head">
              <div className="pricing-name">{p.name}</div>
              <div className="pricing-tagline muted">{p.tagline}</div>
            </div>
            <div className="pricing-price">
              {p.price === null ? (
                <span className="pricing-price-num">Custom</span>
              ) : p.price[billing] === 0 ? (
                <>
                  <span className="pricing-price-num">$0</span>
                  <span className="pricing-price-suffix muted">forever</span>
                </>
              ) : (
                <>
                  <span className="pricing-price-num">${p.price[billing]}</span>
                  <span className="pricing-price-suffix muted">
                    /mo{billing === "yearly" && <><br/><span style={{fontSize: 11}}>billed annually</span></>}
                  </span>
                </>
              )}
            </div>
            <button
              className={`btn ${p.popular ? "btn--primary" : "btn--secondary"} pricing-cta`}
              disabled={p.ctaDisabled}
              onClick={() => p.ctaDisabled ? null : setScreen("signin")}
            >
              {p.cta}
              {!p.ctaDisabled && <window.Icon name="arrow-right" size={12}/>}
            </button>
            <ul className="pricing-features">
              {p.features.map((f, j) => (
                <li key={j}>
                  <window.Icon name="check" size={12}/>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="pricing-compare">
        <h2 className="pricing-compare-title">Compare plans</h2>
        <div className="pricing-table">
          <div className="pricing-table-row pricing-table-head">
            <div className="muted">Feature</div>
            {plans.map(p => <div key={p.name}>{p.name}</div>)}
          </div>
          {[
            ["Agents", "1", "5", "Unlimited", "Unlimited"],
            ["Message credits / month", "500", "10,000", "60,000", "Custom"],
            ["Training data per agent", "5 MB", "100 MB", "1 GB", "Custom"],
            ["Workspaces", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
            ["Custom domain", "—", "—", "✓", "✓"],
            ["Remove branding", "—", "✓", "✓", "✓"],
            ["SAML SSO", "—", "—", "—", "✓"],
            ["Audit logs (90d)", "—", "30d", "90d", "Unlimited"],
            ["Support SLA", "Community", "1 day", "4 hours", "1 hour"],
          ].map((row, i) => (
            <div key={i} className="pricing-table-row">
              {row.map((c, j) => (
                <div key={j} className={j === 0 ? "muted" : ""}>{c}</div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-faq">
        <h2 className="pricing-faq-title">Common questions</h2>
        <div className="faq-grid">
          {[
            { q: "What counts as a message credit?", a: "Each user message that gets a reply from your agent uses 1 credit. Tool calls and document re-indexing are free." },
            { q: "What happens if I run out of credits?", a: "Your agents pause new conversations until next period or until you top up. Existing conversations finish gracefully — no abrupt cutoffs." },
            { q: "Can I switch plans any time?", a: "Yes. Upgrades take effect immediately and we prorate. Downgrades apply at the end of the current billing period." },
            { q: "Do you offer a startup or non-profit discount?", a: "We offer 30% off Standard and Pro for early-stage startups (under $5M raised) and registered non-profits." },
          ].map((f, i) => (
            <div key={i} className="faq-card">
              <div className="faq-q">{f.q}</div>
              <div className="faq-a muted">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="pricing-foot">
        <div className="row" style={{gap: 8, alignItems: "center"}}>
          <window.Icon name="logo-mark" size={18}/>
          <span style={{fontWeight: 500}}>Conciara</span>
          <span className="muted" style={{fontSize: 12}}>© 2026</span>
        </div>
        <div className="row" style={{gap: 18}}>
          <a className="muted" style={{fontSize: 12.5}}>Privacy</a>
          <a className="muted" style={{fontSize: 12.5}}>Terms</a>
          <a className="muted" style={{fontSize: 12.5}}>Status</a>
          <a className="muted" style={{fontSize: 12.5}}>Changelog</a>
        </div>
      </footer>
    </div>
  );
}

window.SignInScreen = SignInScreen;
window.ChooseWorkspaceScreen = ChooseWorkspaceScreen;
window.AccountScreen = AccountScreen;
window.PricingScreen = PricingScreen;
