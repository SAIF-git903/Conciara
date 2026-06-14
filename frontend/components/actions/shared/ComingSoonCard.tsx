'use client'

export default function ComingSoonCard() {
  return (
    <div style={{
      marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', borderRadius: 'var(--r-sm)',
      border: '1px solid var(--line)', background: 'var(--bg)',
      opacity: 0.6,
    }}>
      <span style={{
        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--ink-4)',
        fontFamily: 'var(--font-mono)',
      }}>
        Coming soon
      </span>
      <button
        type="button"
        disabled
        className="btn btn--secondary btn--sm"
        style={{ cursor: 'not-allowed', opacity: 0.5 }}
      >
        Coming soon
      </button>
    </div>
  )
}
