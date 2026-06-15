/* Conciara landing — Tweaks panel + content variants + context */

const { createContext: tCreateContext, useContext: tUseContext } = React;

/* ---------- Voice variants: copy gets rewritten end-to-end ---------- */
const VOICE = {
  restrained: {
    heroEyebrow: "v3.1 · Inbox & live handoff is live",
    heroHeadline: ["AI agents that actually ", "know your business."],
    heroSub: "Drop in your docs, point at your site, connect your tools. Ship a support agent, sales concierge, or internal helper in an afternoon — with cited answers, real actions, and a human-handoff inbox that doesn't feel bolted on.",
    heroCtaPrimary: "Start free",
    heroCtaSecondary: "Book a demo",
    heroMeta: ["No credit card", "500 free messages / mo", "Live in < 10 min"],
    howTitle: ["Three steps. ", "One afternoon."],
    howSub: "No prompt-engineering rabbit hole. Bring your sources, define what the agent can do, and ship it where your customers already are.",
    featTitle: ["The serious parts, ", "without the seriousness."],
    featSub: "Most agent platforms are a demo wrapper. Conciara is what happens after the demo — when you have real users, real tickets, and a security team.",
    demoTitle: ["Talk to one. ", "Live, right here."],
    demoSub: "Three demo agents built on three different sets of fake docs. Same platform, same patterns — switch preset, then talk to it. Responses are unscripted.",
    casesTitle: ["One platform. ", "Three jobs."],
    casesSub: "The same building blocks — sources, actions, handoff — wear different hats.",
    pricingTitle: ["Pricing that ", "doesn't punish growth."],
    pricingSub: "Start free, upgrade only when you're shipping volume. No per-seat tax, no \"contact us\" for line items.",
    faqTitle: ["Honest answers to ", "the questions you'll ask anyway."],
    ctaEyebrow: "Start free, ship today",
    ctaTitle: ["Your customers are ", "already asking."],
    ctaSub: "Give them an agent that actually answers. 500 free messages, 1 agent, every channel. No credit card.",
    securityTitle: ["Built for the ", "security review."],
    securitySub: "Not bolted on. The controls your buyer's CISO will ask about are in the product from day one.",
    integTitle: ["Plays well with ", "the tools you already pay for."],
    integSub: "Pre-built connectors for the obvious ones. Webhooks and a REST API for everything else.",
    statsTitle: ["The bar we hold ", "ourselves to."],
    quotesTitle: ["Not a pilot. ", "In production."],
  },
  punchy: {
    heroEyebrow: "NEW — LIVE HANDOFF SHIPPING",
    heroHeadline: ["Ship an AI agent ", "your customers trust."],
    heroSub: "Cited answers. Real actions. Live handoff. Built for production from minute one.",
    heroCtaPrimary: "Start building",
    heroCtaSecondary: "See a 2-min demo",
    heroMeta: ["No credit card", "Free forever tier", "10-minute setup"],
    howTitle: ["Connect. ", "Configure. Ship."],
    howSub: "Three steps. One afternoon. Done.",
    featTitle: ["Built for ", "the real world."],
    featSub: "The features other platforms call \"enterprise\" — we just call them table stakes.",
    demoTitle: ["Don't take our word. ", "Talk to one."],
    demoSub: "Three live agents, three different industries, same platform. Type something. See what happens.",
    casesTitle: ["Support. Sales. ", "Internal."],
    casesSub: "One agent platform. Every job your team needs.",
    pricingTitle: ["Simple pricing. ", "No surprises."],
    pricingSub: "Free tier covers most prototypes. Pay when you scale.",
    faqTitle: ["FAQs. ", "Straight answers."],
    ctaEyebrow: "Stop reading. Start building.",
    ctaTitle: ["Your competition ", "shipped theirs last week."],
    ctaSub: "500 free messages. No credit card. Live before your next coffee.",
    securityTitle: ["SOC 2. ", "GDPR. Done."],
    securitySub: "Compliance from day one — not an enterprise add-on.",
    integTitle: ["Slack. WhatsApp. ", "Anywhere."],
    integSub: "12 native integrations. REST API for the rest.",
    statsTitle: ["The numbers ", "you'll cite at the next pitch."],
    quotesTitle: ["Real teams. ", "Real wins."],
  },
  manifesto: {
    heroEyebrow: "A manifesto for serious AI",
    heroHeadline: ["Most AI agents are demos ", "pretending to be products."],
    heroSub: "We think an agent should know what it knows, cite what it claims, do what it promises, and hand off when it can't. We built Conciara so the easy thing and the right thing are the same thing — for the team shipping it, for the customer using it, and for the security review that will eventually arrive.",
    heroCtaPrimary: "Read the principles",
    heroCtaSecondary: "Try the product",
    heroMeta: ["Open changelog", "Auditable by design", "No model lock-in"],
    howTitle: ["A simpler shape, ", "for a complicated thing."],
    howSub: "We resisted the urge to invent new abstractions. There are sources, there are actions, and there is conversation. Everything else is decoration we tried to leave out.",
    featTitle: ["The features no one ", "puts on the homepage."],
    featSub: "Citations that hold up. Rollback that works at 3am. Audit logs your security team will actually trust. The unglamorous things that decide whether an agent survives contact with reality.",
    demoTitle: ["A demo is not a product. ", "But here is a demo."],
    demoSub: "Three agents, three fake businesses, one platform. You will see them refuse, cite, escalate, and occasionally surprise you. That last part is on purpose.",
    casesTitle: ["The same shape, ", "rearranged."],
    casesSub: "Support, sales, internal — they look different on the surface but they are the same problem underneath. We optimized for the underneath.",
    pricingTitle: ["Pricing that ", "respects you."],
    pricingSub: "No per-seat tax. No \"contact us\" for line items. No phantom enterprise tier with the features you actually need.",
    faqTitle: ["The questions ", "we wish more people asked."],
    ctaEyebrow: "An invitation",
    ctaTitle: ["Build the agent ", "you would want to use."],
    ctaSub: "Most platforms make the easy thing easy and the right thing painful. We worked very hard so they are the same thing here.",
    securityTitle: ["Security is a ", "first-class concern."],
    securitySub: "Not because we love compliance theater, but because the things compliance theater is gesturing at — confidentiality, integrity, accountability — actually matter. We tried to build the underneath, not the certificate.",
    integTitle: ["A short list of ", "well-supported integrations."],
    integSub: "Twelve connectors we maintain ourselves, and a clean API for the long tail. We would rather support fewer things well than many things poorly.",
    statsTitle: ["Numbers we ", "are willing to be measured on."],
    quotesTitle: ["Words from teams ", "who shipped real things."],
  },
};

/* ---------- Context ---------- */
const TweakCtx = tCreateContext({ t: VOICE.restrained, mood: "editorial", voice: "restrained", heroLayout: "product" });
const useTweakContent = () => tUseContext(TweakCtx);
window.useTweakContent = useTweakContent;
window.TweakCtx = TweakCtx;

/* ---------- The actual panel ---------- */
function LandingTweaks({ tweaks, setTweak }) {
  return (
    <window.TweaksPanel>
      <window.TweakSection label="Brand mood" />
      <window.TweakRadio
        label="Palette & shape"
        value={tweaks.mood}
        options={[
          { value: "editorial", label: "Editorial" },
          { value: "brutalist", label: "Brutalist" },
          { value: "soft",      label: "Soft tech" },
        ]}
        onChange={(v) => setTweak("mood", v)}
      />

      <window.TweakSection label="Voice" />
      <window.TweakRadio
        label="Copy tone"
        value={tweaks.voice}
        options={[
          { value: "restrained", label: "Restrained" },
          { value: "punchy",     label: "Punchy" },
          { value: "manifesto",  label: "Manifesto" },
        ]}
        onChange={(v) => setTweak("voice", v)}
      />

      <window.TweakSection label="Hero composition" />
      <window.TweakRadio
        label="Layout"
        value={tweaks.heroLayout}
        options={[
          { value: "product",  label: "Product mock" },
          { value: "demo",     label: "Demo-first" },
          { value: "bigtype",  label: "Big type" },
        ]}
        onChange={(v) => setTweak("heroLayout", v)}
      />
    </window.TweaksPanel>
  );
}

window.LandingTweaks = LandingTweaks;
window.LANDING_VOICE = VOICE;
