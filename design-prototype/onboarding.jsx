/* Conciara — New Agent onboarding flow (3 steps) */

const { useState: oState } = React;

function NewAgentFlow({ setScreen }) {
  const [step, setStep] = oState(0);
  const [url, setUrl] = oState("");
  const [crawled, setCrawled] = oState(false);
  const [name, setName] = oState("Order Lab Tests and Blood Tests Online | Testing.com");

  const steps = [
    { id: "link", label: "Link", icon: "external" },
    { id: "configure", label: "Configure", icon: "settings" },
    { id: "agent", label: "Agent", icon: "bot" },
  ];

  return (
    <div className="onboarding">
      <div className="onb-top">
        <button className="back-link" onClick={() => setScreen("agents")}>
          <window.Icon name="chevron-right" size={12} className="back-arrow"/> Go back to workspace dashboard
        </button>
      </div>

      <div className="onb-stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`onb-step ${i < step ? "onb-step--done" : i === step ? "onb-step--current" : ""}`}>
              <div className="onb-step-circle">
                {i < step ? <window.Icon name="check" size={14}/> : <window.Icon name={s.icon} size={14}/>}
              </div>
              <div className="onb-step-label">{s.label}</div>
            </div>
            {i < steps.length - 1 && <div className={`onb-step-line ${i < step ? "onb-step-line--done" : ""}`}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="onb-body">
        {step === 0 && <OnbStep1 url={url} setUrl={setUrl} crawled={crawled} setCrawled={setCrawled} onContinue={() => setStep(1)}/>}
        {step === 1 && <OnbStep2 name={name} setName={setName} onContinue={() => setStep(2)} onBack={() => setStep(0)}/>}
        {step === 2 && <OnbStep3 onComplete={() => setScreen("agents")} onBack={() => setStep(1)}/>}
      </div>
    </div>
  );
}

function OnbStep1({ url, setUrl, crawled, setCrawled, onContinue }) {
  return (
    <div className="onb-grid">
      <div>
        <span className="onb-eyebrow"><span className="dot dot--accent"/> Data source</span>
        <h2 className="onb-title">Let's start with a link</h2>
        <p className="onb-sub">Share your website URL and we'll automatically build an AI agent trained on your content.</p>

        <label className="field" style={{marginTop: 26}}>
          <span className="field-label">Your website URL</span>
          <div className="row" style={{gap: 6}}>
            <select className="select" style={{width: 100, fontFamily: "var(--font-mono)"}}><option>https://</option><option>http://</option></select>
            <input className="input" placeholder="yoursite.com" value={url} onChange={e => setUrl(e.target.value)} style={{flex: 1}}/>
          </div>
        </label>
        <label className="field">
          <span className="field-label">Use case</span>
          <select className="select"><option>General AI agent</option><option>Customer support</option><option>Sales assistant</option><option>Internal knowledge base</option></select>
        </label>

        {!crawled ? (
          <button className="btn btn--primary btn--lg" style={{width: "100%", marginTop: 8}} disabled={!url} onClick={() => setCrawled(true)}>
            Crawl website <window.Icon name="arrow-right" size={14}/>
          </button>
        ) : (
          <div className="onb-success">
            <div className="onb-success-head">
              <span className="badge badge--success"><window.Icon name="check" size={10}/> Crawl successful</span>
            </div>
            <p style={{margin: "10px 0 14px", fontSize: 13}}>Your website content is ready. Train the agent now, or skip and retrain later from Data sources.</p>
            <button className="btn btn--primary btn--lg" style={{width: "100%"}} onClick={onContinue}>
              Continue <window.Icon name="arrow-right" size={14}/>
            </button>
          </div>
        )}
      </div>

      <div className="onb-preview">
        <div className="onb-browser">
          <div className="onb-browser-head">
            <span className="dot dot--red"/><span className="dot dot--yellow"/><span className="dot dot--green"/>
            <div className="onb-browser-url">{url ? `https://${url}` : "https://your-site.com"}</div>
          </div>
          <div className="onb-browser-body">
            {!crawled ? (
              <div className="onb-empty-preview">
                <window.Icon name="external" size={28}/>
                <div style={{marginTop: 10, fontSize: 12.5, color: "var(--ink-3)"}}>Preview your website crawl</div>
              </div>
            ) : (
              <div className="onb-crawl-card">
                <div className="row" style={{gap: 10}}>
                  <div className="onb-favicon">t</div>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>Order Lab Tests and Blood Tests Onl…</div>
                    <div className="muted mono" style={{fontSize: 11}}>https://{url || "testing.com"}</div>
                  </div>
                </div>
                <div className="muted" style={{fontSize: 12, marginTop: 12}}>Order Lab Tests and Blood Tests Online | Testing.com</div>
                <div style={{marginTop: 10}}>
                  <span className="badge badge--success"><window.Icon name="check" size={10}/> Saved for agent training</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OnbStep2({ name, setName, onContinue, onBack }) {
  return (
    <div className="onb-grid">
      <div>
        <span className="onb-eyebrow"><span className="dot dot--accent"/> Look &amp; feel</span>
        <h2 className="onb-title">Configure your agent</h2>
        <p className="onb-sub">Customize the look and feel. You can change all of this later.</p>

        <label className="field" style={{marginTop: 26}}>
          <span className="field-label">Agent name</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)}/>
          <span className="field-hint">Pre-filled from your website title.</span>
        </label>

        <label className="field">
          <span className="field-label">Chat icon</span>
          <div className="onb-icon-upload">
            <div className="onb-icon-preview">t</div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 500, fontSize: 13}}>Click to change icon</div>
              <div className="muted" style={{fontSize: 12}}>Shown in the chat widget · 64×64 PNG or SVG</div>
            </div>
            <button className="btn btn--secondary btn--sm">Upload</button>
          </div>
        </label>

        <label className="field">
          <span className="field-label">Primary color</span>
          <div className="row" style={{gap: 6}}>
            {["#1a1d24","#5b6cff","#0e9b6b","#b86a17","#c33665"].map(c => (
              <button key={c} className="swatch-btn" style={{background: c}}/>
            ))}
            <input className="input mono" defaultValue="#1a1d24" style={{flex: 1, fontSize: 12}}/>
          </div>
        </label>

        <div className="row" style={{gap: 8, marginTop: 8}}>
          <button className="btn btn--ghost" onClick={onBack}>Back</button>
          <button className="btn btn--primary btn--lg" style={{flex: 1}} onClick={onContinue}>
            Save &amp; continue <window.Icon name="arrow-right" size={14}/>
          </button>
        </div>
      </div>

      <div className="onb-preview">
        <div className="cw cw--lg">
          <div className="cw-head" style={{background: "var(--ink)"}}>
            <div className="row" style={{gap: 8}}>
              <span className="onb-favicon onb-favicon--sm">t</span>
              <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{name.slice(0, 36)}…</span>
            </div>
            <button className="cw-close">×</button>
          </div>
          <div className="cw-body">
            <div className="cw-msg cw-msg--bot"><span>Hi there! How can I help you today?</span></div>
            <div className="cw-msg cw-msg--user"><span>Hello! I'm interested in your services.</span></div>
            <div className="cw-msg cw-msg--bot"><span>Great! I can help with information about our services. What would you like to know?</span></div>
            <div className="cw-msg cw-msg--user"><span>What are your pricing plans?</span></div>
            <div className="cw-msg cw-msg--bot"><span>We offer various plans. Would you like me to list them?</span></div>
          </div>
          <div className="cw-input">
            <input placeholder="Type your message…"/>
            <button><window.Icon name="arrow-up-right" size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnbStep3({ onComplete, onBack }) {
  return (
    <div className="onb-grid">
      <div>
        <span className="onb-eyebrow"><span className="dot dot--accent"/> AI behavior</span>
        <h2 className="onb-title">Agent personality</h2>
        <p className="onb-sub">Define core behavior and the AI model. Pre-prompt is generated from your website — edit or regenerate as needed.</p>

        <label className="field" style={{marginTop: 26}}>
          <span className="field-label">AI model</span>
          <select className="select"><option>GPT-4o Mini — fast & cheap</option><option>Claude Haiku 4.5 — balanced</option><option>Claude Sonnet 4 — best reasoning</option></select>
        </label>

        <label className="field">
          <span className="field-label row" style={{justifyContent: "space-between"}}>
            <span>Pre-prompt</span>
            <span className="muted" style={{fontSize: 11.5, fontWeight: 400}}><span className="dot-pulse"/> Generating from your website…</span>
          </span>
          <textarea className="textarea" rows="6" placeholder="Generating pre-prompt from your website…" defaultValue="You are the support assistant for Testing.com, dedicated to providing helpful and professional information about our lab and blood test ordering service. Answer questions concisely and accurately based on the website content."></textarea>
          <span className="field-hint">Edit or regenerate as needed.</span>
        </label>

        <div className="row" style={{gap: 8, marginTop: 8}}>
          <button className="btn btn--ghost" onClick={onBack}>Back</button>
          <button className="btn btn--primary btn--lg" style={{flex: 1}} onClick={onComplete}>
            Confirm &amp; go to playground <window.Icon name="arrow-right" size={14}/>
          </button>
        </div>
      </div>

      <div className="onb-preview">
        <div className="onb-loader">
          <div className="onb-loader-icon"><window.Icon name="bot" size={20}/></div>
          <div className="onb-loader-bar"><span/></div>
          <div className="muted" style={{fontSize: 12.5, marginTop: 14}}>Configuring your agent…</div>
          <div className="muted" style={{fontSize: 11.5, marginTop: 4, fontFamily: "var(--font-mono)"}}>Indexing 30 pages · 138 KB</div>
        </div>
      </div>
    </div>
  );
}

window.NewAgentFlow = NewAgentFlow;
