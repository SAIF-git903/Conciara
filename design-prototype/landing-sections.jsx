/* Conciara landing — logos, how it works, features, cases, integrations, stats, quotes, security, pricing, FAQ, CTA, footer */

const { useState: sState } = React;

/* ============== Logo wall ============== */
function LandingLogos() {
  const logos = [
    { name: "Domaine Carneros", style: { fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17 }},
    { name: "Northwind Labs",   style: { fontWeight: 700, letterSpacing: "-0.04em", fontSize: 18 }},
    { name: "Cabin Co-op",      style: { fontWeight: 500, fontSize: 16, fontVariant: "small-caps" }},
    { name: "Lumen",            style: { fontWeight: 800, fontSize: 19, letterSpacing: "0.06em" }},
    { name: "Saffron",          style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }},
    { name: "Quanta•",          style: { fontWeight: 600, fontSize: 17 }},
  ];
  return (
    <section className="logos">
      <div className="shell">
        <div className="logos-label">Trusted by teams building serious agents — from 3-person studios to 300-person ops floors</div>
        <div className="logos-row">
          {logos.map(l => (
            <div key={l.name} className="logo-mark" style={l.style}>{l.name}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== How it works ============== */
function HowItWorks() {
  const t = window.useTweakContent().t;
  return (
    <section className="section" id="product">
      <div className="shell">
        <div className="section-head">
          <span className="eyebrow"><span className="eyebrow-dot"/>How it works</span>
          <h2 className="section-title">{t.howTitle[0]}<em>{t.howTitle[1]}</em></h2>
          <p className="section-lede">{t.howSub}</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">STEP 01</div>
            <h3 className="step-title">Connect your knowledge.</h3>
            <p className="step-body">Drop PDFs, point at a sitemap, paste Q&amp;A pairs, or sync from Notion / Drive. We chunk, embed, and re-index automatically.</p>
            <div className="step-visual">
              <div className="sv-file">
                <span className="sv-file-ico">PDF</span>
                <span>handbook.pdf</span>
                <span className="sv-file-meta">2.4 MB</span>
              </div>
              <div className="sv-file">
                <span className="sv-file-ico" style={{background: "#e6f6ef", color: "#0e9b6b"}}>MD</span>
                <span>policies.md</span>
                <span className="sv-file-meta">312 KB</span>
              </div>
              <div className="sv-bar"><span className="sv-bar-fill"/></div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">STEP 02</div>
            <h3 className="step-title">Define what it can do.</h3>
            <p className="step-body">Wire up Actions (book, refund, lookup), set guardrails, pick a voice. Test it in the playground until you'd ship it.</p>
            <div className="step-visual">
              <div className="sv-toggle">
                <span>Can issue refunds</span>
                <span className="sv-switch"/>
              </div>
              <div className="sv-toggle">
                <span>Escalate to human after 3 turns</span>
                <span className="sv-switch"/>
              </div>
              <div className="sv-toggle">
                <span>Discuss competitors</span>
                <span className="sv-switch sv-switch--off"/>
              </div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">STEP 03</div>
            <h3 className="step-title">Ship it everywhere.</h3>
            <p className="step-body">Embed the widget, drop it into Slack or WhatsApp, or hit the API. One agent, every channel — same source of truth.</p>
            <div className="step-visual">
              <div className="sv-channel">
                <span className="sv-channel-mark" style={{background: "#eef0ff", color: "#5b6cff"}}><window.LIcon name="globe" size={11}/></span>
                <span>Web widget</span>
                <span className="sv-channel-status">live</span>
              </div>
              <div className="sv-channel">
                <span className="sv-channel-mark" style={{background: "#e0f3ff", color: "#1d4ed8", fontWeight: 700, fontSize: 9}}>S</span>
                <span>Slack</span>
                <span className="sv-channel-status">live</span>
              </div>
              <div className="sv-channel">
                <span className="sv-channel-mark" style={{background: "#dcf7e3", color: "#0e9b6b", fontWeight: 700, fontSize: 9}}>W</span>
                <span>WhatsApp</span>
                <span className="sv-channel-status">live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============== Feature grid ============== */
function FeatureGrid() {
  const t = window.useTweakContent().t;
  const items = [
    { ico: "scroll",  title: "Cited answers, never invented",     body: "Every claim links back to the source chunk it came from. Hover a citation to see the exact passage." },
    { ico: "lightning", title: "Real actions, not just chat",      body: "Function-calling with auth, rate limits, and a full run history. Book, refund, look up — actually do things." },
    { ico: "inbox",   title: "Live human handoff",                body: "When the agent can't, your team takes over in the same Inbox. No tab-juggling, no context loss." },
    { ico: "branch",  title: "Evals, versions, rollback",         body: "Snapshot your agent. Run golden Q&A sets on every change. Roll back if a regression slips through." },
    { ico: "shield",  title: "Guardrails you can reason about",   body: "Topic allowlists, PII redaction, profanity filter, refusal policies — declarative, auditable." },
    { ico: "key",     title: "Fine-grained permissions",          body: "Workspace roles, per-agent access, SSO, audit logs. Built so a security review doesn't kill the deal." },
  ];
  return (
    <section className="section">
      <div className="shell">
        <div className="section-head">
          <span className="eyebrow"><span className="eyebrow-dot"/>What you get</span>
          <h2 className="section-title">{t.featTitle[0]}<em>{t.featTitle[1]}</em></h2>
          <p className="section-lede">{t.featSub}</p>
        </div>
        <div className="feat">
          {items.map((it, i) => (
            <div className="feat-card" key={i}>
              <div className="feat-icon"><window.LIcon name={it.ico} size={18}/></div>
              <h3 className="feat-title">{it.title}</h3>
              <p className="feat-body">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== Use cases ============== */
function UseCases() {
  const t = window.useTweakContent().t;
  return (
    <section className="section" id="cases">
      <div className="shell">
        <div className="section-head">
          <span className="eyebrow"><span className="eyebrow-dot"/>Use cases</span>
          <h2 className="section-title">{t.casesTitle[0]}<em>{t.casesTitle[1]}</em></h2>
          <p className="section-lede">{t.casesSub}</p>
        </div>
        <div className="cases">
          <div className="case case--featured">
            <span className="case-eyebrow">Most popular</span>
            <h3 className="case-title">Customer support that deflects without ducking.</h3>
            <p className="case-body">First-line resolution for 60–80% of tickets, full context handed to a human when it can't. Cited answers, refund/lookup actions, and a CSAT survey baked in.</p>
            <div className="case-stats">
              <div>
                <div className="case-stat-num">67%</div>
                <div className="case-stat-label">avg. ticket deflection</div>
              </div>
              <div>
                <div className="case-stat-num">4.6<span style={{fontSize: "0.5em", color: "rgba(255,255,255,0.5)"}}>/5</span></div>
                <div className="case-stat-label">CSAT after handoff</div>
              </div>
            </div>
            <a href="#" className="case-link">Read the support playbook <window.LIcon name="arrow-right" size={12}/></a>
          </div>

          <div className="case">
            <span className="case-eyebrow">Sales</span>
            <h3 className="case-title">A concierge that qualifies, books, and never sleeps.</h3>
            <p className="case-body">Greet on your pricing page, qualify against your ICP, propose times against your calendar. Hot leads dropped into your CRM with full transcript.</p>
            <div className="case-stats">
              <div>
                <div className="case-stat-num">2.3×</div>
                <div className="case-stat-label">qualified meetings booked</div>
              </div>
              <div>
                <div className="case-stat-num">$0</div>
                <div className="case-stat-label">leads dropped overnight</div>
              </div>
            </div>
            <a href="#" className="case-link">See the sales template <window.LIcon name="arrow-right" size={12}/></a>
          </div>

          <div className="case">
            <span className="case-eyebrow">Internal</span>
            <h3 className="case-title">An IT and HR helper your team will actually use.</h3>
            <p className="case-body">Wired to your runbooks, Okta, and ticketing. Resets, lookups, policy questions — sub-second. Escalates with a pre-filled ticket.</p>
            <div className="case-stats">
              <div>
                <div className="case-stat-num">−42%</div>
                <div className="case-stat-label">tickets to IT</div>
              </div>
              <div>
                <div className="case-stat-num">11s</div>
                <div className="case-stat-label">median time-to-answer</div>
              </div>
            </div>
            <a href="#" className="case-link">Browse internal recipes <window.LIcon name="arrow-right" size={12}/></a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============== Integrations ============== */
function Integrations() {
  const t = window.useTweakContent().t;
  const cells = [
    { name: "Slack",      mark: "S",  color: "#4a154b" },
    { name: "WhatsApp",   mark: "W",  color: "#25d366" },
    { name: "Zendesk",    mark: "Z",  color: "#03363d" },
    { name: "Intercom",   mark: "I",  color: "#1f8ded" },
    { name: "HubSpot",    mark: "H",  color: "#ff7a59" },
    { name: "Salesforce", mark: "SF", color: "#00a1e0" },
    { name: "Notion",     mark: "N",  color: "#000000" },
    { name: "Google Drive", mark: "G", color: "#1a73e8" },
    { name: "Gmail",      mark: "M",  color: "#ea4335" },
    { name: "Stripe",     mark: "$",  color: "#635bff" },
    { name: "Webhooks",   mark: "{}", color: "#1a1a1d" },
    { name: "REST API",   mark: "</>",color: "#5b6cff" },
  ];
  return (
    <section className="section integrations" id="integrations">
      <div className="shell">
        <div className="section-head">
          <span className="eyebrow"><span className="eyebrow-dot"/>Integrations</span>
          <h2 className="section-title">{t.integTitle[0]}<em>{t.integTitle[1]}</em></h2>
          <p className="section-lede">{t.integSub}</p>
        </div>
        <div className="int-grid">
          {cells.map(c => (
            <div key={c.name} className="int-cell">
              <div className="int-cell-mark" style={{background: c.color, color: "white"}}>{c.mark}</div>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== Stats ============== */
function StatsBand() {
  const t = window.useTweakContent().t;
  const stats = [
    { num: "4.2", suffix: "M", label: "Messages handled across customer agents this month." },
    { num: "67",  suffix: "%", label: "Average deflection rate after week-one tuning." },
    { num: "1,200", suffix: "+", label: "Teams shipping agents in production today." },
    { num: "287", suffix: "ms", label: "Median response time, citations included." },
  ];
  return (
    <section className="section stats">
      <div className="shell">
        <div className="section-head" style={{maxWidth: 720}}>
          <span className="eyebrow" style={{color: "rgba(255,255,255,0.55)"}}><span className="eyebrow-dot"/>The numbers</span>
          <h2 className="section-title" style={{color: "white"}}>{t.statsTitle[0]}{t.statsTitle[1]}</h2>
        </div>
        <div className="stats-grid">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="stat-num">{s.num}<span className="stat-suffix">{s.suffix}</span></div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== Testimonials ============== */
function Testimonials() {
  const t = window.useTweakContent().t;
  const quotes = [
    { body: "We replaced two thirds of our tier-1 tickets in three weeks. The cited-answer thing is what got it past our trust review.", name: "Priya Ramanathan", role: "Head of CX · Northwind Labs", initials: "PR" },
    { body: "Our agent qualifies leads on the pricing page at 2am and drops them in HubSpot before the rep wakes up. Felt like cheating.", name: "Marc Delaroche", role: "GTM Lead · Cabin Co-op", initials: "MD" },
    { body: "Built our internal IT helper in an afternoon. The Inbox + Slack handoff is the part most platforms get wrong — Conciara doesn't.", name: "Saif Ali", role: "Staff Eng · Acme", initials: "SA" },
  ];
  return (
    <section className="section">
      <div className="shell">
        <div className="section-head">
          <span className="eyebrow"><span className="eyebrow-dot"/>What teams say</span>
          <h2 className="section-title">{t.quotesTitle[0]}<em>{t.quotesTitle[1]}</em></h2>
        </div>
        <div className="quotes">
          {quotes.map((q, i) => (
            <div className="quote" key={i}>
              <div className="quote-mark">"</div>
              <p className="quote-body">{q.body}</p>
              <div className="quote-attr">
                <div className="quote-avatar">{q.initials}</div>
                <div>
                  <div className="quote-name">{q.name}</div>
                  <div className="quote-role">{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== Security ============== */
function Security() {
  const t = window.useTweakContent().t;
  return (
    <section className="section security" id="security">
      <div className="shell sec-wrap">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot"/>Security & compliance</span>
          <h2 className="section-title">{t.securityTitle[0]}<em>{t.securityTitle[1]}</em></h2>
          <p className="section-lede">{t.securitySub}</p>
          <div className="sec-badges">
            <div className="sec-badge">
              <div className="sec-badge-mark"><window.LIcon name="shield-check" size={16}/></div>
              <div className="sec-badge-title">SOC 2 Type II</div>
              <div className="sec-badge-sub">Annually audited</div>
            </div>
            <div className="sec-badge">
              <div className="sec-badge-mark"><window.LIcon name="globe" size={16}/></div>
              <div className="sec-badge-title">GDPR</div>
              <div className="sec-badge-sub">EU data residency available</div>
            </div>
            <div className="sec-badge">
              <div className="sec-badge-mark"><window.LIcon name="lock" size={16}/></div>
              <div className="sec-badge-title">HIPAA-ready</div>
              <div className="sec-badge-sub">BAA on Pro plans</div>
            </div>
            <div className="sec-badge">
              <div className="sec-badge-mark"><window.LIcon name="key" size={16}/></div>
              <div className="sec-badge-title">SAML SSO</div>
              <div className="sec-badge-sub">SCIM provisioning</div>
            </div>
          </div>
        </div>

        <ul className="sec-list">
          <li className="sec-item">
            <div className="sec-item-ico"><window.LIcon name="lock" size={13}/></div>
            <div>
              <div className="sec-item-title">Your data, your model, your call.</div>
              <div className="sec-item-body">Pick where your data lives — US, EU, or your own cloud. Opt out of model training. Encrypted at rest with KMS keys you can rotate.</div>
            </div>
          </li>
          <li className="sec-item">
            <div className="sec-item-ico"><window.LIcon name="users" size={13}/></div>
            <div>
              <div className="sec-item-title">Roles that match how teams actually work.</div>
              <div className="sec-item-body">Owner, admin, editor, viewer — per agent. Approval flows for destructive actions. A real audit log, not a CSV dump.</div>
            </div>
          </li>
          <li className="sec-item">
            <div className="sec-item-ico"><window.LIcon name="scroll" size={13}/></div>
            <div>
              <div className="sec-item-title">PII redaction before it leaves your perimeter.</div>
              <div className="sec-item-body">Configurable scrubbing of emails, phone numbers, SSNs, custom regex. Redacted spans visible in the transcript so reviewers know what was masked.</div>
            </div>
          </li>
          <li className="sec-item">
            <div className="sec-item-ico"><window.LIcon name="shield" size={13}/></div>
            <div>
              <div className="sec-item-title">Prompt-injection defenses, baked in.</div>
              <div className="sec-item-body">Source isolation, tool-call signing, and output validators that block exfiltration patterns. Updated as the attack surface evolves.</div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ============== Pricing teaser ============== */
function PricingTeaser() {
  const t = window.useTweakContent().t;
  const plans = [
    { id: "hobby",    name: "Hobby",    price: 32,  pitch: "Builders trying things out.", credit: "500 messages / mo",
      features: ["1 AI agent", "2 team members", "Web widget", "10 MB sources / agent", "Community support"], cta: "Start free", tag: null },
    { id: "standard", name: "Standard", price: 120, pitch: "Small teams in production.",  credit: "4,000 messages / mo",
      features: ["3 AI agents", "5 team members", "All channels", "20 MB sources / agent", "API access", "1-day support"], cta: "Start free trial", tag: "Most popular", rec: true },
    { id: "pro",      name: "Pro",      price: 400, pitch: "Growing teams with compliance needs.", credit: "15,000 messages / mo",
      features: ["10 AI agents", "Unlimited members", "All channels + custom domain", "40 MB sources / agent", "SAML SSO", "Audit logs", "Dedicated support"], cta: "Talk to sales", tag: null },
  ];
  return (
    <section className="section" id="pricing">
      <div className="shell">
        <div className="section-head">
          <span className="eyebrow"><span className="eyebrow-dot"/>Pricing</span>
          <h2 className="section-title">{t.pricingTitle[0]}<em>{t.pricingTitle[1]}</em></h2>
          <p className="section-lede">{t.pricingSub}</p>
        </div>
        <div className="plans">
          {plans.map(p => (
            <div key={p.id} className={`plan ${p.rec ? "plan--rec" : ""}`}>
              {p.tag && <span className="plan-tag">{p.tag}</span>}
              <div className="plan-name">{p.name}</div>
              <div className="plan-pitch">{p.pitch}</div>
              <div className="plan-price">
                <span style={{fontSize: 20, color: "var(--ink-3)"}}>$</span>
                <span className="plan-price-num">{p.price}</span>
                <span className="plan-price-per">/mo</span>
              </div>
              <div className="plan-billing">billed annually · {p.credit}</div>
              <ul className="plan-features">
                {p.features.map(f => (
                  <li key={f} className="plan-feat">
                    <span className="plan-feat-tick"><window.LIcon name="check" size={10} stroke={2.4}/></span>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`btn plan-cta ${p.rec ? "btn--primary" : "btn--secondary"}`}>
                {p.cta} <window.LIcon name="arrow-right" size={13}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== FAQ ============== */
function FAQ() {
  const t = window.useTweakContent().t;
  const items = [
    { q: "Which LLMs can I use?", a: "Claude (Haiku, Sonnet, Opus), GPT-4 family, Gemini, and open-weights models via your own hosting. You pick per-agent. Pricing is metered by message credits — same regardless of model, so you can swap freely." },
    { q: "How accurate are the cited answers?", a: "Citations are tied to retrieved chunks, not generated text — so when the agent claims something with a citation, you can verify the source by clicking through. We also surface a confidence score per answer and route low-confidence ones to a review queue you can set up." },
    { q: "Can the agent take real actions, or just answer questions?", a: "Real actions. You define them as typed function specs (book, refund, lookup, write to CRM, etc.) with auth handled in our action runtime. Each invocation is logged with arguments, response, and latency for replay or debugging." },
    { q: "What about prompt injection and data exfiltration?", a: "Sources are isolated from user instructions, tool calls are signed, and outbound responses run through validators. We also strip PII before it leaves your perimeter when you turn that on. None of this is foolproof — but it's the controls a security review actually asks for." },
    { q: "How long does it take to ship something real?", a: "Most teams have a usable v1 within an afternoon. Tuning, evals, and channel rollout typically takes 1–2 weeks. You can install the web widget the same day you sign up." },
    { q: "Where does my data live? Can I bring my own cloud?", a: "US and EU regions on our infra by default. Enterprise plans support BYOC on AWS, GCP, and Azure with KMS keys you control. We never train on your data, full stop." },
    { q: "What happens when the agent can't answer?", a: "Three options, configurable: (1) escalate to a human in our Inbox with full conversation context, (2) drop into your existing helpdesk (Zendesk, Intercom, Front) as a ticket, or (3) collect the user's email and follow up async. The unanswered question lands in a review queue you can turn into Q&A pairs." },
    { q: "Do you have a free plan?", a: "Yes — 500 messages/month, 1 agent, web widget, community support. No credit card required. Most builders can prototype an entire product on the free tier before paying a cent." },
  ];
  const [open, setOpen] = sState(0);
  return (
    <section className="section" id="faq">
      <div className="shell" style={{display: "grid", gridTemplateColumns: "1fr", gap: 48, maxWidth: 920}}>
        <div>
          <span className="eyebrow"><span className="eyebrow-dot"/>FAQ</span>
          <h2 className="section-title">{t.faqTitle[0]}<em>{t.faqTitle[1]}</em></h2>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <div key={i} className={`faq-item ${open === i ? "faq-item--open" : ""}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span>{it.q}</span>
                <span className="faq-toggle"><window.LIcon name="plus" size={12} stroke={2}/></span>
              </button>
              <div className="faq-a">{it.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============== Footer CTA ============== */
function FooterCTA() {
  const t = window.useTweakContent().t;
  return (
    <div className="shell">
      <div className="cta-banner">
        <div className="cta-eyebrow">{t.ctaEyebrow}</div>
        <h2 className="cta-title">{t.ctaTitle[0]}<em>{t.ctaTitle[1]}</em></h2>
        <p className="cta-body">{t.ctaSub}</p>
        <div className="cta-buttons">
          <button className="btn btn--accent btn--lg">Start free <window.LIcon name="arrow-right" size={14}/></button>
          <button className="btn btn--secondary btn--lg" style={{background: "rgba(255,255,255,0.08)", color: "white", borderColor: "rgba(255,255,255,0.18)"}}>Book a 20-min walkthrough</button>
        </div>
        <div className="cta-meta">Used by 1,200+ teams · SOC 2 Type II · No credit card</div>
      </div>
    </div>
  );
}

/* ============== Footer ============== */
function LandingFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <a className="nav-brand" href="#">
              <span className="nav-brand-mark">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 12a4 4 0 0 1 8 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="16" r="1.2" fill="white"/><circle cx="15" cy="16" r="1.2" fill="white"/></svg>
              </span>
              Conciara
            </a>
            <p className="footer-brand-line">The platform for shipping AI agents that actually know your business.</p>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            <ul>
              <li><a href="#">Agents</a></li>
              <li><a href="#">Inbox</a></li>
              <li><a href="#">Actions</a></li>
              <li><a href="#">Analytics</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Solutions</div>
            <ul>
              <li><a href="#">Customer support</a></li>
              <li><a href="#">Sales</a></li>
              <li><a href="#">Internal IT</a></li>
              <li><a href="#">Healthcare</a></li>
              <li><a href="#">E-commerce</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Resources</div>
            <ul>
              <li><a href="#">Docs</a></li>
              <li><a href="#">API reference</a></li>
              <li><a href="#">Playbooks</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Community</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Company</div>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Customers</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 Conciara, Inc.</div>
          <div className="footer-bottom-meta">
            <span className="footer-status">All systems operational</span>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">DPA</a>
            <a href="#">Sub-processors</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

window.LandingLogos = LandingLogos;
window.HowItWorks = HowItWorks;
window.FeatureGrid = FeatureGrid;
window.UseCases = UseCases;
window.Integrations = Integrations;
window.StatsBand = StatsBand;
window.Testimonials = Testimonials;
window.Security = Security;
window.PricingTeaser = PricingTeaser;
window.FAQ = FAQ;
window.FooterCTA = FooterCTA;
window.LandingFooter = LandingFooter;
