/* Conciara landing — page composer + tweaks host */

const { useEffect: lUseEffect } = React;

function Landing() {
  const [tweaks, setTweak] = window.useTweaks(window.LANDING_TWEAK_DEFAULTS);
  const voice = window.LANDING_VOICE[tweaks.voice] || window.LANDING_VOICE.restrained;

  // Apply mood attribute to <body> so CSS can scope everything
  lUseEffect(() => {
    document.body.setAttribute("data-mood", tweaks.mood);
    document.body.setAttribute("data-voice", tweaks.voice);
    document.body.setAttribute("data-hero", tweaks.heroLayout);
  }, [tweaks.mood, tweaks.voice, tweaks.heroLayout]);

  return (
    <window.TweakCtx.Provider value={{ t: voice, mood: tweaks.mood, voice: tweaks.voice, heroLayout: tweaks.heroLayout }}>
      <div data-screen-label="Landing page">
        <window.LandingNav/>
        <window.LandingHero/>
        <window.LandingLogos/>
        <window.HowItWorks/>
        <window.FeatureGrid/>
        {tweaks.heroLayout !== "demo" && <window.LiveDemo/>}
        <window.UseCases/>
        <window.Integrations/>
        <window.StatsBand/>
        <window.Testimonials/>
        <window.Security/>
        <window.PricingTeaser/>
        <window.FAQ/>
        <window.FooterCTA/>
        <window.LandingFooter/>
        <window.LandingTweaks tweaks={tweaks} setTweak={setTweak}/>
      </div>
    </window.TweakCtx.Provider>
  );
}

window.Landing = Landing;
