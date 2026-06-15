/* Conciara landing — Live interactive demo using window.claude.complete */

const { useState: dState, useRef: dRef, useEffect: dEffect } = React;

const DEMO_PRESETS = [
  {
    id: "support",
    label: "Support agent",
    name: "Lumen Headphones · Support",
    domain: "Audio product company",
    seed: "I bought the Lumen Pro 2s last month and the left ear cuts out. Help?",
    sources: ["product-manual.pdf", "warranty-policy.md", "troubleshooting.faq"],
    system: "You are Lumen Headphones' customer-support agent. You sell premium audio products (Lumen Pro 2 wireless headphones, Lumen Air earbuds, Lumen Studio reference monitors). Be warm, concise (3 short paragraphs max), and helpful. When asked about a problem: diagnose, then propose 2 concrete options (e.g. firmware reset, RMA). Lumen Pro 2 has a 2-year warranty and 30-day return window. Always end by offering to escalate to a human agent. Cite sources in brackets like [product-manual.pdf §4.2] when relevant. Never invent product features.",
  },
  {
    id: "sales",
    label: "Sales concierge",
    name: "Cabin Cooperative · Sales",
    domain: "Boutique cabin rental network",
    seed: "Looking for a 4-bed cabin in the Catskills for July 4 weekend, dog-friendly.",
    sources: ["inventory.json", "rates-2026.csv", "policies.md"],
    system: "You are a sales concierge for Cabin Cooperative, a boutique cabin rental network in the Catskills, Berkshires, and White Mountains. Be warm and consultative. When matching guests: ask 1 clarifying question if needed (budget, vibe), then suggest 2-3 specific properties with: invented but plausible names, sleeping capacity, key features, and a per-night rate ($280-$680 range). Mention dog fees are $40/night. Always offer to hold a property for 24 hours. Cite sources like [inventory.json] when listing properties.",
  },
  {
    id: "internal",
    label: "Internal IT",
    name: "Acme Internal · IT Helpdesk",
    domain: "Mid-size company IT helpdesk",
    seed: "How do I reset my VPN password and reinstall the certificate on macOS?",
    sources: ["it-runbooks.notion", "vpn-cert-policy.pdf", "onboarding.md"],
    system: "You are Acme Inc's internal IT helpdesk agent. Be concise, technical, and direct (assume the user is an engineer). Provide numbered steps with concrete commands (Terminal, System Settings paths) when appropriate. Reference internal tools when relevant: Okta for SSO, Tailscale for VPN, 1Password for secrets. For sensitive operations, mention that a ticket will be opened and an admin will approve. Cite runbooks like [vpn-cert-policy.pdf §3] in brackets.",
  },
];

function LiveDemo({ embedded }) {
  const voice = window.useTweakContent().t;
  const [presetId, setPresetId] = dState("support");
  const preset = DEMO_PRESETS.find(p => p.id === presetId);

  const [messages, setMessages] = dState([]);
  const [input, setInput] = dState("");
  const [busy, setBusy] = dState(false);
  const bodyRef = dRef(null);

  // Seed greeting on preset change
  dEffect(() => {
    setMessages([
      { from: "bot", text: `Hey — I'm the ${preset.name.split(" · ")[1] || ""} agent. ${preset.domain}. What can I help with?`, cite: null },
    ]);
    setInput(preset.seed);
  }, [presetId]);

  dEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const next = [...messages, { from: "user", text: q }];
    setMessages(next);
    setBusy(true);

    try {
      const history = next
        .filter(m => m.from === "user" || m.from === "bot")
        .map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

      const reply = await window.claude.complete({
        messages: [
          { role: "user", content: `System: ${preset.system}\n\nRespond to the next user message as that agent.` },
          ...history,
        ],
      });

      // Pick 1-2 plausible cite sources at random
      const cites = preset.sources.slice(0, 1 + Math.floor(Math.random() * 2));

      setMessages(m => [...m, { from: "bot", text: reply.trim(), cite: cites }]);
    } catch (e) {
      setMessages(m => [...m, { from: "bot", text: "I had trouble reaching the model just now — try again in a moment.", cite: null, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const initials = preset.name.split("·")[0].trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const widget = (
    <div className="demo-widget">
      <header className="demo-head">
        <div className="demo-head-mark">{initials}</div>
        <div>
          <div className="demo-head-title">{preset.name}</div>
          <div className="demo-head-sub">{preset.domain}</div>
        </div>
        <span className="demo-head-status">Live</span>
      </header>

      <div className="demo-body" ref={bodyRef}>
        {messages.map((m, i) => (
          m.from === "user" ? (
            <div key={i} className="demo-msg demo-msg--user">{m.text}</div>
          ) : (
            <div key={i} className="demo-msg demo-msg--bot">
              <div className="demo-msg-row">
                <div className="demo-msg-avatar">{initials}</div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div className="demo-msg-bubble">{m.text}</div>
                  {m.cite && m.cite.length > 0 && (
                    <div className="demo-msg-cite">
                      {m.cite.map(s => (
                        <span key={s} className="demo-cite-pill">
                          <window.LIcon name="scroll" size={9}/> {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        {busy && (
          <div className="demo-msg demo-msg--bot">
            <div className="demo-msg-row">
              <div className="demo-msg-avatar">{initials}</div>
              <div className="demo-msg-bubble demo-typing" style={{borderRadius: "4px 14px 14px 14px"}}>
                <span/><span/><span/>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="demo-input">
        <input
          type="text"
          value={input}
          placeholder="Ask anything…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
        />
        <button className="demo-send" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send">
          <window.LIcon name="send" size={15}/>
        </button>
      </div>

      <div className="demo-foot">
        <span>Powered by Conciara</span>
        <span>claude-haiku-4-5</span>
      </div>
    </div>
  );

  if (embedded) {
    // Slim presets above the widget when used as a hero visual
    return (
      <div className="demo-embedded">
        <div className="demo-presets" style={{marginTop: 0, marginBottom: 14, justifyContent: "center"}}>
          {DEMO_PRESETS.map(p => (
            <button
              key={p.id}
              className={`demo-preset ${p.id === presetId ? "demo-preset--on" : ""}`}
              onClick={() => setPresetId(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {widget}
      </div>
    );
  }

  return (
    <section className="section" id="demo">
      <div className="shell demo-wrap">
        <div className="demo-copy">
          <span className="eyebrow"><span className="eyebrow-dot"/>Try it live</span>
          <h2 className="section-title">{voice.demoTitle[0]}<em>{voice.demoTitle[1]}</em></h2>
          <p className="section-lede">{voice.demoSub}</p>
          <div className="demo-presets">
            {DEMO_PRESETS.map(p => (
              <button
                key={p.id}
                className={`demo-preset ${p.id === presetId ? "demo-preset--on" : ""}`}
                onClick={() => setPresetId(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{marginTop: 26, padding: "16px 18px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12}}>
            <div className="eyebrow" style={{marginBottom: 10}}>Sources this agent has</div>
            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
              {preset.sources.map(s => (
                <div key={s} style={{display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-2)"}}>
                  <window.LIcon name="scroll" size={12} className="muted" stroke={1.6}/> <span style={{fontFamily: "var(--font-mono)"}}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {widget}
      </div>
    </section>
  );
}

window.LiveDemo = LiveDemo;
