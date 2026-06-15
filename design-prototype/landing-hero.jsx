/* Conciara landing — Nav + Hero */

function LandingNav() {
  return (
    <nav className="nav">
      <div className="shell nav-inner">
        <a className="nav-brand" href="#">
          <span className="nav-brand-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 12a4 4 0 0 1 8 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="16" r="1.2" fill="white"/><circle cx="15" cy="16" r="1.2" fill="white"/></svg>
          </span>
          Conciara
        </a>
        <div className="nav-links" role="navigation">
          <a className="nav-link nav-link--has-caret" href="#product">Product <window.LIcon name="chevron-down" size={12}/></a>
          <a className="nav-link" href="#cases">Use cases</a>
          <a className="nav-link" href="#integrations">Integrations</a>
          <a className="nav-link" href="#pricing">Pricing</a>
          <a className="nav-link" href="#">Docs</a>
        </div>
        <div className="nav-cta">
          <button className="btn btn--ghost btn--sm">Sign in</button>
          <button className="btn btn--primary btn--sm">Start free <window.LIcon name="arrow-right" size={13}/></button>
        </div>
      </div>
    </nav>
  );
}

function LandingHero() {
  const { t, heroLayout } = window.useTweakContent();

  if (heroLayout === "bigtype") return <HeroBigType t={t}/>;
  if (heroLayout === "demo")    return <HeroDemoFirst t={t}/>;

  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot"/>{t.heroEyebrow}</span>
          <h1 className="hero-headline">
            {t.heroHeadline[0]}<em>{t.heroHeadline[1]}</em>
          </h1>
          <p className="hero-sub">{t.heroSub}</p>
          <div className="hero-cta">
            <button className="btn btn--primary btn--lg">{t.heroCtaPrimary} <window.LIcon name="arrow-right" size={14}/></button>
            <button className="btn btn--secondary btn--lg">{t.heroCtaSecondary}</button>
          </div>
          <div className="hero-meta">
            {t.heroMeta.map((m, i) => (
              <React.Fragment key={i}>
                <span>{m}</span>
                {i < t.heroMeta.length - 1 && <span className="hero-meta-dot"/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <HeroProductMock/>
          <div className="hero-chip hero-chip--cite">
            <div className="hero-chip-mark">
              <window.LIcon name="scroll" size={14}/>
            </div>
            <div>
              <div className="hero-chip-num">100%</div>
              <div className="hero-chip-label">Cited</div>
            </div>
          </div>
          <div className="hero-chip hero-chip--metric">
            <div className="hero-chip-mark" style={{background: "#e6f6ef", color: "#0e9b6b"}}>
              <window.LIcon name="check" size={14}/>
            </div>
            <div>
              <div className="hero-chip-num">67%</div>
              <div className="hero-chip-label">Deflected</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- BIG TYPE hero: copy takes the stage, no visual ---- */
function HeroBigType({ t }) {
  return (
    <section className="hero hero--bigtype">
      <div className="shell">
        <span className="eyebrow"><span className="eyebrow-dot"/>{t.heroEyebrow}</span>
        <h1 className="hero-headline hero-headline--big">
          {t.heroHeadline[0]}<em>{t.heroHeadline[1]}</em>
        </h1>
        <p className="hero-sub hero-sub--big">{t.heroSub}</p>
        <div className="hero-cta hero-cta--big">
          <button className="btn btn--primary btn--lg">{t.heroCtaPrimary} <window.LIcon name="arrow-right" size={14}/></button>
          <button className="btn btn--secondary btn--lg">{t.heroCtaSecondary}</button>
        </div>
        <div className="hero-meta" style={{justifyContent: "center", marginTop: 32}}>
          {t.heroMeta.map((m, i) => (
            <React.Fragment key={i}>
              <span>{m}</span>
              {i < t.heroMeta.length - 1 && <span className="hero-meta-dot"/>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="hero-bigtype-marquee" aria-hidden="true">
        <div className="hero-marquee-track">
          {Array(2).fill(null).map((_, k) => (
            <React.Fragment key={k}>
              <span>cited answers</span><span>·</span>
              <span>real actions</span><span>·</span>
              <span>live handoff</span><span>·</span>
              <span>evals & rollback</span><span>·</span>
              <span>SOC 2 type II</span><span>·</span>
              <span>built for production</span><span>·</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- DEMO-FIRST hero: chat widget IS the hero ---- */
function HeroDemoFirst({ t }) {
  return (
    <section className="hero hero--demo">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot"/>{t.heroEyebrow}</span>
          <h1 className="hero-headline hero-headline--demo">
            {t.heroHeadline[0]}<em>{t.heroHeadline[1]}</em>
          </h1>
          <p className="hero-sub">Type something into the agent on the right. No signup, no demo schedule — the platform is the pitch.</p>
          <div className="hero-cta">
            <button className="btn btn--primary btn--lg">{t.heroCtaPrimary} <window.LIcon name="arrow-right" size={14}/></button>
            <button className="btn btn--secondary btn--lg">{t.heroCtaSecondary}</button>
          </div>
          <div className="hero-meta">
            {t.heroMeta.map((m, i) => (
              <React.Fragment key={i}>
                <span>{m}</span>
                {i < t.heroMeta.length - 1 && <span className="hero-meta-dot"/>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="hero-visual hero-visual--demo">
          <window.LiveDemo embedded/>
        </div>
      </div>
    </section>
  );
}

function HeroProductMock() {
  return (
    <div className="hero-product">
      <div className="hp-bar">
        <div className="hp-bar-dot"/>
        <div className="hp-bar-dot"/>
        <div className="hp-bar-dot"/>
        <span className="hp-bar-url">conciara.app / agents / lab-tests / playground</span>
      </div>
      <div className="hp-frame">
        <aside className="hp-side">
          <div className="hp-side-section">Agent</div>
          <div className="hp-nav-item hp-nav-item--active"><span className="hp-nav-ico"><window.LIcon name="play" size={11}/></span>Playground</div>
          <div className="hp-nav-item"><span className="hp-nav-ico"><window.LIcon name="inbox" size={11}/></span>Inbox</div>
          <div className="hp-nav-item"><span className="hp-nav-ico"><window.LIcon name="chart" size={11}/></span>Analytics</div>
          <div className="hp-side-section">Sources</div>
          <div className="hp-nav-item"><span className="hp-nav-ico"><window.LIcon name="scroll" size={11}/></span>Files <span style={{marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:9,color:"#a3a3ad"}}>14</span></div>
          <div className="hp-nav-item"><span className="hp-nav-ico"><window.LIcon name="book" size={11}/></span>Q&amp;A <span style={{marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:9,color:"#a3a3ad"}}>62</span></div>
          <div className="hp-nav-item"><span className="hp-nav-ico"><window.LIcon name="globe" size={11}/></span>Website</div>
          <div className="hp-side-section">Build</div>
          <div className="hp-nav-item"><span className="hp-nav-ico"><window.LIcon name="lightning" size={11}/></span>Actions <span style={{marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:9,color:"#a3a3ad"}}>7</span></div>
        </aside>
        <div className="hp-main">
          <div className="hp-head">
            <div>
              <div className="hp-h-title">Order Lab Tests & Blood Tests</div>
              <div className="hp-h-sub">claude-haiku-4-5 · 1,284 sessions this week</div>
            </div>
            <span className="hp-pill">Live</span>
          </div>
          <div className="hp-chat">
            <div className="hp-msg hp-msg--user">Can you order a CBC for me before Friday?</div>
            <div className="hp-msg hp-msg--bot">
              I can book a Complete Blood Count at <strong>Quest, San Mateo</strong> Thursday 10:40 AM. Fasting isn't required.
              <div className="hp-cite">
                <window.LIcon name="scroll" size={9}/> lab-protocols.pdf · §4.2
              </div>
            </div>
            <div className="hp-action">
              <div className="hp-action-ico"><window.LIcon name="lightning" size={11}/></div>
              <div>
                <div style={{fontWeight:600}}>book_appointment</div>
                <div style={{color:"#74747e", fontSize: 10.5}}>quest-labs · CBC · Thu 10:40 AM</div>
              </div>
              <span className="hp-action-status">RAN · 312ms</span>
            </div>
            <div className="hp-msg hp-msg--user">Perfect, lock it in.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LandingNav = LandingNav;
window.LandingHero = LandingHero;
