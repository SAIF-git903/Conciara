/* Conciara landing — icon set */

const LIcon = ({ name, size = 16, stroke = 1.5, className = "" }) => {
  const s = size;
  const c = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", className };
  switch (name) {
    case "logo":      return <svg width={s} height={s} viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M10 16a6 6 0 0 1 12 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="11" cy="20" r="1.6" fill="white"/><circle cx="21" cy="20" r="1.6" fill="white"/></svg>;
    case "arrow-right": return <svg {...c}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "arrow-up-right": return <svg {...c}><path d="M7 17 17 7M9 7h8v8"/></svg>;
    case "check":     return <svg {...c}><path d="m5 13 4 4 10-10"/></svg>;
    case "plus":      return <svg {...c}><path d="M12 5v14M5 12h14"/></svg>;
    case "chevron-down": return <svg {...c}><path d="m6 9 6 6 6-6"/></svg>;
    case "send":      return <svg {...c}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></svg>;
    case "bot":       return <svg {...c}><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 7V3M9 3h6"/><circle cx="9" cy="13" r=".9" fill="currentColor"/><circle cx="15" cy="13" r=".9" fill="currentColor"/><path d="M9 17h6"/></svg>;
    case "spark":     return <svg {...c}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>;
    case "users":     return <svg {...c}><circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M22 18a5 5 0 0 0-5-5"/></svg>;
    case "shield":    return <svg {...c}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z"/></svg>;
    case "shield-check": return <svg {...c}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "lock":      return <svg {...c}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case "key":       return <svg {...c}><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 1 1-2 2 2 2-2 2-2-2-3 3"/></svg>;
    case "scroll":    return <svg {...c}><path d="M8 21h8a3 3 0 0 0 3-3V7a4 4 0 0 1-4-4H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3z"/><path d="M8 7h7M8 11h7M8 15h5"/></svg>;
    case "book":      return <svg {...c}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
    case "globe":     return <svg {...c}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    case "flow":      return <svg {...c}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><path d="M9 6h6M18 9v6M6 9v6a3 3 0 0 0 3 3h6"/></svg>;
    case "chart":     return <svg {...c}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>;
    case "play":      return <svg {...c}><path d="M6 4v16l14-8z" fill="currentColor"/></svg>;
    case "inbox":     return <svg {...c}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>;
    case "branch":    return <svg {...c}><circle cx="6" cy="3" r="2"/><circle cx="6" cy="21" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 5v14M6 13a6 6 0 0 0 6-6 4 4 0 0 1 4-4"/></svg>;
    case "puzzle":    return <svg {...c}><path d="M19 11a3 3 0 0 0 0-6V3h-4a3 3 0 0 0-6 0H5v4a3 3 0 0 1 0 6H5v8h4a3 3 0 0 1 6 0h4v-4a3 3 0 0 1 0-6z"/></svg>;
    case "lightning": return <svg {...c}><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/></svg>;
    case "compass":   return <svg {...c}><circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-5 2 3-6z" fill="currentColor"/></svg>;
    case "handshake": return <svg {...c}><path d="m11 17 2 2 4-4M7 11l3-3 2 2 4-4 5 5-4 4-1-1-4 4-2-2-3 3-4-4z"/></svg>;
    case "sliders":   return <svg {...c}><path d="M4 21V14M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>;
    default: return null;
  }
};

window.LIcon = LIcon;
