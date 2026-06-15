/* Conciara — main app shell.
   Tokens, layout, routing between screens, tweaks wiring.
*/

const { useState, useEffect, useMemo, useRef, createContext, useContext } = React;

/* --------- Tweak defaults (persisted by the host between markers) --------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "indigo",
  "density": "comfortable",
  "sidebarStyle": "labeled",
  "screen": "dashboard",
  "agentCount": "few"
}/*EDITMODE-END*/;

const ACCENTS = {
  indigo:  { name: "Indigo",  hex: "#5b6cff", soft: "#eef0ff", ring: "rgba(91,108,255,0.18)" },
  emerald: { name: "Emerald", hex: "#0e9b6b", soft: "#e6f6ef", ring: "rgba(14,155,107,0.18)" },
  amber:   { name: "Amber",   hex: "#b86a17", soft: "#fbeed8", ring: "rgba(184,106,23,0.18)" },
  rose:    { name: "Rose",    hex: "#c33665", soft: "#fbe6ee", ring: "rgba(195,54,101,0.18)" },
  ink:     { name: "Ink",     hex: "#1a1d24", soft: "#eef0f3", ring: "rgba(26,29,36,0.18)" },
};

/* --------- App context for current screen --------- */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* --------- Tiny icon set (lucide-ish, hand-rolled to keep weight identical) --------- */
const Icon = ({ name, size = 16, stroke = 1.5, className = "" }) => {
  const s = size, sw = stroke;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", className };
  switch (name) {
    case "agents": return (<svg {...common}><path d="M12 8V4M8 4h8"/><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M2 14h2M20 14h2"/></svg>);
    case "usage": return (<svg {...common}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>);
    case "settings": return (<svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case "bell": return (<svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>);
    case "book": return (<svg {...common}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>);
    case "user": return (<svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>);
    case "plus": return (<svg {...common}><path d="M12 5v14M5 12h14"/></svg>);
    case "search": return (<svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>);
    case "chevron-down": return (<svg {...common}><path d="m6 9 6 6 6-6"/></svg>);
    case "chevron-right": return (<svg {...common}><path d="m9 6 6 6-6 6"/></svg>);
    case "chevron-up-down": return (<svg {...common}><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>);
    case "more": return (<svg {...common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>);
    case "external": return (<svg {...common}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg>);
    case "spark": return (<svg {...common}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>);
    case "bot": return (<svg {...common}><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 7V3M9 3h6"/><circle cx="9" cy="13" r=".8" fill="currentColor"/><circle cx="15" cy="13" r=".8" fill="currentColor"/><path d="M9 17h6"/></svg>);
    case "key": return (<svg {...common}><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 1 1-2 2 2 2-2 2-2-2-3 3"/></svg>);
    case "card": return (<svg {...common}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 11h20"/></svg>);
    case "users": return (<svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M22 18a5 5 0 0 0-5-5"/></svg>);
    case "shield": return (<svg {...common}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z"/></svg>);
    case "scroll": return (<svg {...common}><path d="M8 21h8a3 3 0 0 0 3-3V7a4 4 0 0 1-4-4H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3z"/><path d="M8 7h7M8 11h7M8 15h5"/></svg>);
    case "check": return (<svg {...common}><path d="m5 13 4 4 10-10"/></svg>);
    case "alert": return (<svg {...common}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>);
    case "trash": return (<svg {...common}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>);
    case "copy": return (<svg {...common}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>);
    case "play": return (<svg {...common}><path d="M6 4v16l14-8z" fill="currentColor"/></svg>);
    case "arrow-right": return (<svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>);
    case "arrow-up-right": return (<svg {...common}><path d="M7 17 17 7M9 7h8v8"/></svg>);
    case "circle-dot": return (<svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>);
    case "command": return (<svg {...common}><path d="M9 6V4a2 2 0 1 0-2 2h2zm0 0v12m0 0v2a2 2 0 1 1-2-2h2zm0-12h6m-6 12h6m0-12V4a2 2 0 1 1 2 2h-2zm0 0v12m0 0v2a2 2 0 1 0 2-2h-2z"/></svg>);
    case "kbd": return (<svg {...common}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M11 10h2v4M16 10v4"/></svg>);
    case "logo-mark": return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="currentColor"/>
        <path d="M10 16a6 6 0 0 1 12 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="11" cy="20" r="1.6" fill="white"/>
        <circle cx="21" cy="20" r="1.6" fill="white"/>
      </svg>
    );
    default: return null;
  }
};

/* ===================== TopBar ===================== */
function TopBar({ tweaks, setScreen }) {
  const accent = ACCENTS[tweaks.accent];
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="ws-switcher" aria-label="Switch workspace">
          <span className="ws-mark"><Icon name="logo-mark" size={22}/></span>
          <span className="ws-meta">
            <span className="ws-name">Test 01</span>
            <span className="ws-plan">Hobby plan</span>
          </span>
          <Icon name="chevron-up-down" size={14} className="ws-caret"/>
        </button>

        <div className="cmd-pill" role="search">
          <Icon name="search" size={14}/>
          <span>Search agents, settings, docs…</span>
          <span className="kbd">⌘K</span>
        </div>
      </div>

      <div className="topbar-right">
        <CreditsPill tweaks={tweaks}/>
        <button className="icon-btn" aria-label="Notifications"><Icon name="bell" size={16}/></button>
        <button className="icon-btn icon-btn--text" aria-label="Docs"><Icon name="book" size={16}/><span>Docs</span></button>
        <button className="avatar" aria-label="Account" onClick={() => setScreen && setScreen("account")}>SA</button>
      </div>
    </header>
  );
}

function CreditsPill({ tweaks }) {
  const used = 0, total = 500;
  const pct = (used / total) * 100;
  return (
    <div className="credits-pill" title="Credits this period">
      <span className="cp-label">Credits</span>
      <span className="cp-num">{used.toLocaleString()}<span className="cp-sep">/</span>{total.toLocaleString()}</span>
      <span className="cp-bar"><span className="cp-bar-fill" style={{width: `${Math.max(pct, 1.5)}%`}}/></span>
      <button className="cp-upgrade">Upgrade<Icon name="arrow-up-right" size={12}/></button>
    </div>
  );
}

/* ===================== Sidebar ===================== */
function Sidebar({ tweaks, screen, setScreen }) {
  const collapsed = tweaks.sidebarStyle === "icon";
  const items = [
    { group: "Workspace", entries: [
      { id: "dashboard",      label: "Dashboard",      icon: "circle-dot" },
      { id: "agents",         label: "Agents",         icon: "bot", count: 1 },
      { id: "conversations",  label: "Conversations",  icon: "scroll", count: 3 },
      { id: "channels",       label: "Channels",       icon: "external" },
      { id: "usage",          label: "Usage",          icon: "usage" },
    ]},
    { group: "Settings", entries: [
      { id: "general", label: "General", icon: "settings" },
      { id: "members", label: "Members", icon: "users" },
      { id: "notifications", label: "Notifications", icon: "bell" },
      { id: "plans", label: "Plans", icon: "spark" },
      { id: "billing", label: "Billing", icon: "card" },
      { id: "api", label: "API keys", icon: "key" },
    ]},
  ];
  return (
    <nav className={`sidebar ${collapsed ? "sidebar--icon" : ""}`}>
      {items.map(group => (
        <div key={group.group} className="nav-group">
          {!collapsed && <div className="nav-group-label">{group.group}</div>}
          {group.entries.map(e => (
            <button
              key={e.id}
              onClick={() => setScreen(e.id)}
              className={`nav-item ${screen === e.id ? "nav-item--active" : ""} ${e.muted ? "nav-item--muted" : ""}`}
              title={collapsed ? e.label : undefined}
            >
              <Icon name={e.icon} size={16}/>
              {!collapsed && <span className="nav-label">{e.label}</span>}
              {!collapsed && typeof e.count === "number" && <span className="nav-count">{e.count}</span>}
            </button>
          ))}
        </div>
      ))}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="period-note">
            <span className="period-dot"/>
            <span>Resets <strong>Jun 1</strong> · 5:00 AM</span>
          </div>
        )}
      </div>
    </nav>
  );
}

/* Helper to compute CSS vars from tweaks */
function accentVars(tweaks) {
  const accent = ACCENTS[tweaks.accent] || ACCENTS.indigo;
  return {
    "--accent": accent.hex,
    "--accent-soft": accent.soft,
    "--accent-ring": accent.ring,
    "--row-h": tweaks.density === "compact" ? "32px" : tweaks.density === "spacious" ? "44px" : "38px",
    "--pad": tweaks.density === "compact" ? "10px" : tweaks.density === "spacious" ? "20px" : "14px",
  };
}

/* ===================== App root ===================== */
function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreenLocal] = useState(tweaks.screen || "agents");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // sync screen back to tweaks so the panel can show it
  const setScreen = (s) => { setScreenLocal(s); setTweak("screen", s); };
  useEffect(() => { if (tweaks.screen && tweaks.screen !== screen) setScreenLocal(tweaks.screen); /* eslint-disable-next-line */ }, [tweaks.screen]);

  // ⌘K / Ctrl+K to open command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const overlayProps = {
    paletteOpen, setPaletteOpen,
    upgradeOpen, setUpgradeOpen,
    setScreen,
  };

  // Special full-page modes (no workspace shell)
  const overlays = (
    <>
      <window.CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        setScreen={setScreen}
        openUpgrade={() => setUpgradeOpen(true)}
      />
      <window.UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)}/>
    </>
  );

  // Full-bleed shell-less screens
  if (screen === "signin") {
    return (
      <AppCtx.Provider value={{ tweaks, setTweak, screen, setScreen, openPalette: () => setPaletteOpen(true), openUpgrade: () => setUpgradeOpen(true) }}>
        <div className="app app--plain" style={accentVars(tweaks)} data-screen={screen}>
          <window.SignInScreen setScreen={setScreen}/>
          <ConciaraTweaks tweaks={tweaks} setTweak={setTweak}/>
          {overlays}
        </div>
      </AppCtx.Provider>
    );
  }
  if (screen === "choose-workspace") {
    return (
      <AppCtx.Provider value={{ tweaks, setTweak, screen, setScreen, openPalette: () => setPaletteOpen(true), openUpgrade: () => setUpgradeOpen(true) }}>
        <div className="app app--plain" style={accentVars(tweaks)} data-screen={screen}>
          <window.ChooseWorkspaceScreen setScreen={setScreen}/>
          <ConciaraTweaks tweaks={tweaks} setTweak={setTweak}/>
          {overlays}
        </div>
      </AppCtx.Provider>
    );
  }
  if (screen === "account") {
    return (
      <AppCtx.Provider value={{ tweaks, setTweak, screen, setScreen, openPalette: () => setPaletteOpen(true), openUpgrade: () => setUpgradeOpen(true) }}>
        <div className="app app--plain" style={accentVars(tweaks)} data-screen={screen}>
          <window.AccountScreen setScreen={setScreen}/>
          <ConciaraTweaks tweaks={tweaks} setTweak={setTweak}/>
          {overlays}
        </div>
      </AppCtx.Provider>
    );
  }
  if (screen === "pricing") {
    return (
      <AppCtx.Provider value={{ tweaks, setTweak, screen, setScreen, openPalette: () => setPaletteOpen(true), openUpgrade: () => setUpgradeOpen(true) }}>
        <div className="app app--plain" style={accentVars(tweaks)} data-screen={screen}>
          <window.PricingScreen setScreen={setScreen}/>
          <ConciaraTweaks tweaks={tweaks} setTweak={setTweak}/>
          {overlays}
        </div>
      </AppCtx.Provider>
    );
  }
  if (screen === "agent-inner") {
    return (
      <AppCtx.Provider value={{ tweaks, setTweak, screen, setScreen, openPalette: () => setPaletteOpen(true), openUpgrade: () => setUpgradeOpen(true) }}>
        <div className="app" style={accentVars(tweaks)} data-screen={screen}>
          <window.AgentApp tweaks={tweaks} setScreen={setScreen}/>
          <ConciaraTweaks tweaks={tweaks} setTweak={setTweak}/>
          {overlays}
        </div>
      </AppCtx.Provider>
    );
  }
  if (screen === "new-agent") {
    return (
      <AppCtx.Provider value={{ tweaks, setTweak, screen, setScreen, openPalette: () => setPaletteOpen(true), openUpgrade: () => setUpgradeOpen(true) }}>
        <div className="app app--plain" style={accentVars(tweaks)} data-screen={screen}>
          <window.NewAgentFlow setScreen={setScreen}/>
          <ConciaraTweaks tweaks={tweaks} setTweak={setTweak}/>
          {overlays}
        </div>
      </AppCtx.Provider>
    );
  }

  const rootStyle = accentVars(tweaks);

  const ctxValue = { tweaks, setTweak, screen, setScreen, openPalette: () => setPaletteOpen(true), openUpgrade: () => setUpgradeOpen(true) };

  return (
    <AppCtx.Provider value={ctxValue}>
      <div className="app" style={rootStyle} data-screen={screen}>
        <TopBar tweaks={tweaks} setScreen={setScreen}/>
        <div className="app-body">
          <Sidebar tweaks={tweaks} screen={screen} setScreen={setScreen}/>
          <main className="content">
            <ScreenRouter screen={screen} tweaks={tweaks} setScreen={setScreen}/>
          </main>
        </div>
        <ConciaraTweaks tweaks={tweaks} setTweak={setTweak}/>
        {overlays}
      </div>
    </AppCtx.Provider>
  );
}

function ScreenRouter({ screen, tweaks, setScreen }) {
  switch (screen) {
    case "dashboard":     return <window.WorkspaceDashboardScreen tweaks={tweaks} setScreen={setScreen}/>;
    case "conversations": return <window.ConversationsScreen tweaks={tweaks} setScreen={setScreen}/>;
    case "channels":      return <window.ChannelsScreen tweaks={tweaks} setScreen={setScreen}/>;
    case "agents": return <window.AgentsScreen tweaks={tweaks} setScreen={setScreen}/>;
    case "usage": return <window.UsageScreen tweaks={tweaks}/>;
    case "general": return <window.GeneralScreen tweaks={tweaks}/>;
    case "members": return <window.MembersScreen tweaks={tweaks}/>;
    case "notifications": return <window.NotificationsScreen tweaks={tweaks}/>;
    case "audit": return <window.AuditScreen tweaks={tweaks}/>;
    case "plans": return <window.PlansScreen tweaks={tweaks}/>;
    case "billing": return <window.BillingScreen tweaks={tweaks}/>;
    case "api": return <window.ApiKeysScreen tweaks={tweaks}/>;
    case "activity": return <window.ActivityScreen tweaks={tweaks}/>;
    default: return <window.WorkspaceDashboardScreen tweaks={tweaks} setScreen={setScreen}/>;
  }
}

/* ===================== Tweaks Panel ===================== */
function ConciaraTweaks({ tweaks, setTweak }) {
  return (
    <window.TweaksPanel title="Tweaks">
      <window.TweakSection title="Screen">
        <window.TweakSelect
          label="Current view"
          value={tweaks.screen}
          onChange={(v) => setTweak("screen", v)}
          options={[
            {label: "Dashboard (home)", value: "dashboard"},
            {label: "Agents", value: "agents"},
            {label: "Conversations", value: "conversations"},
            {label: "Channels", value: "channels"},
            {label: "Usage", value: "usage"},
            {label: "General settings", value: "general"},
            {label: "Members", value: "members"},
            {label: "Notifications", value: "notifications"},
            {label: "Audit logs", value: "audit"},
            {label: "Plans", value: "plans"},
            {label: "Billing", value: "billing"},
            {label: "API keys", value: "api"},
            {label: "Activity", value: "activity"},
            {label: "— Agent inner shell —", value: "agent-inner"},
            {label: "New agent (onboarding)", value: "new-agent"},
            {label: "— Sign in —", value: "signin"},
            {label: "Choose workspace", value: "choose-workspace"},
            {label: "Account settings", value: "account"},
            {label: "Pricing (public)", value: "pricing"},
          ]}
        />
      </window.TweakSection>

      <window.TweakSection title="Accent">
        <window.TweakRadio
          value={tweaks.accent}
          onChange={(v) => setTweak("accent", v)}
          options={Object.entries(ACCENTS).map(([k,v]) => ({label: v.name, value: k}))}
        />
      </window.TweakSection>

      <window.TweakSection title="Density">
        <window.TweakRadio
          value={tweaks.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            {label: "Compact", value: "compact"},
            {label: "Comfortable", value: "comfortable"},
            {label: "Spacious", value: "spacious"},
          ]}
        />
      </window.TweakSection>

      <window.TweakSection title="Sidebar">
        <window.TweakRadio
          value={tweaks.sidebarStyle}
          onChange={(v) => setTweak("sidebarStyle", v)}
          options={[
            {label: "Labeled", value: "labeled"},
            {label: "Icon-only", value: "icon"},
          ]}
        />
      </window.TweakSection>

      <window.TweakSection title="Agents page state">
        <window.TweakRadio
          value={tweaks.agentCount}
          onChange={(v) => setTweak("agentCount", v)}
          options={[
            {label: "1 agent (your real state)", value: "few"},
            {label: "Several agents", value: "many"},
            {label: "Empty", value: "empty"},
          ]}
        />
      </window.TweakSection>
    </window.TweaksPanel>
  );
}

window.App = App;
window.Icon = Icon;
window.useApp = useApp;
window.ACCENTS = ACCENTS;
