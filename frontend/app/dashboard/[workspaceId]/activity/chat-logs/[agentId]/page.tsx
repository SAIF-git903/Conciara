'use client'

import { useState } from 'react'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  Copy,
  Play,
  ScrollText,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

/* ─── Static data ───────────────────────────────────────────── */

const SESSIONS = [
  { id: '1', title: 'Hi there tell me about something that I…', time: '5d ago', count: 24 },
  { id: '2', title: 'What type of wine do you sell?', time: '5d ago', count: 10 },
  { id: '3', title: 'Who is the CEO for business', time: '5d ago', count: 6 },
  { id: '4', title: 'Tell me about your business?', time: '5d ago', count: 8 },
  { id: '5', title: 'What do you know about Domaine Carn…', time: '5d ago', count: 8 },
]

type Source = {
  kind: 'file' | 'fallback'
  title: string
  page?: number
  confidence: number
}

type Message = {
  id: string
  from: 'user' | 'bot'
  text: string
  time: string
  revisable?: boolean
  source?: Source
}

const MESSAGES: Message[] = [
  {
    id: '1',
    from: 'user',
    text: 'Hi there\ntell me about something that I might not know already',
    time: '07:53 PM',
  },
  {
    id: '2',
    from: 'bot',
    text: "Did you know our commitment to sustainability has been a core value since 1987? We've received certifications including Napa Green Winery and integrate practices like natural pest management and solar power. If you have any specific questions, feel free to ask!",
    time: '07:53 PM',
    revisable: true,
    source: { kind: 'file', title: 'About Domaine Carneros.pdf', page: 3, confidence: 0.78 },
  },
  {
    id: '3',
    from: 'user',
    text: "no i didn't know that, thanks for telling me",
    time: '07:54 PM',
  },
  {
    id: '4',
    from: 'bot',
    text: 'I appreciate your feedback! If you have more questions or need assistance, feel free to ask.',
    time: '07:54 PM',
    revisable: true,
    source: { kind: 'fallback', title: 'No source matched — used base prompt', confidence: 0.32 },
  },
]

/* ─── Label style shared ────────────────────────────────────── */
const SectionLabel: React.CSSProperties = {
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ink-4)',
  fontWeight: 500,
  fontFamily: 'var(--font-mono)',
  marginBottom: 8,
}

/* ─── Revise side panel ─────────────────────────────────────── */
function RevisePanel({
  question,
  answer,
  onClose,
}: {
  question: Message | null
  answer: Message
  onClose: () => void
}) {
  const [draft, setDraft] = useState(answer.text)
  const [mode, setMode] = useState<'qa' | 'source' | 'flag'>('qa')
  const [tested, setTested] = useState(false)
  const [testing, setTesting] = useState(false)

  const dirty = draft.trim() !== answer.text.trim()
  const src = answer.source
  const conf = src ? Math.round(src.confidence * 100) : 0
  const lowConf = src ? src.confidence < 0.5 : false

  const applyTone = (t: string) => {
    if (t === 'shorter') {
      setDraft(draft.split(/[.!?]\s+/).filter(Boolean).slice(0, 2).join('. ') + '.')
    } else if (t === 'warmer') {
      setDraft(draft.replace(/!\s*$/, '') + ' — happy to help with anything else!')
    } else if (t === 'tighter') {
      setDraft(draft.replace(/\s+/g, ' ').replace(/\b(very|really|actually|basically|just)\s+/gi, '').trim())
    }
  }

  const runTest = () => {
    setTesting(true)
    setTested(false)
    setTimeout(() => { setTesting(false); setTested(true) }, 1200)
  }

  const saveLabel =
    mode === 'qa' ? 'Save to Q&A' :
    mode === 'source' ? 'Update source' :
    'Flag for review'

  const saveOptions = [
    {
      id: 'qa' as const,
      icon: <BookOpen style={{ width: 12, height: 12 }} />,
      title: 'New Q&A pair',
      desc: 'Agent learns this answer for similar questions. Available immediately.',
      disabled: false,
    },
    {
      id: 'source' as const,
      icon: <ScrollText style={{ width: 12, height: 12 }} />,
      title: 'Patch source document',
      desc: 'Edit the underlying file. Affects every answer drawn from it. Triggers re-index.',
      disabled: src?.kind !== 'file',
    },
    {
      id: 'flag' as const,
      icon: <AlertTriangle style={{ width: 12, height: 12 }} />,
      title: 'Flag for review',
      desc: 'Log feedback without training. Shows up in Unanswered queue.',
      disabled: false,
    },
  ]

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(15,23,42,0.32)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'revFade .15s ease',
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Revise answer"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 81,
          width: 480, maxWidth: '92vw',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--line-2)',
          boxShadow: '-16px 0 40px rgba(15,23,42,0.12)',
          display: 'flex', flexDirection: 'column',
          animation: 'revSlide .22s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '18px 20px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)',
            }}>
              <Sparkles style={{ width: 11, height: 11 }} /> Revise answer
            </span>
            <h2 style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              Teach the agent a better reply
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: 7,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--line)', background: 'transparent',
              cursor: 'pointer', color: 'var(--ink-4)',
            }}
            className="hover:bg-[var(--bg-2)]"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </header>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* User asked */}
          <section>
            <div style={SectionLabel}>User asked</div>
            <div style={{
              fontSize: 13, lineHeight: 1.55, padding: '10px 13px',
              borderRadius: 10, border: '1px solid transparent',
              background: 'var(--bg-2)', color: 'var(--ink-2)',
              whiteSpace: 'pre-wrap',
            }}>
              {question?.text ?? '—'}
            </div>
          </section>

          {/* Agent replied */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ ...SectionLabel, marginBottom: 0 }}>Agent replied</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{answer.time}</span>
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.55, padding: '10px 13px',
              borderRadius: 10, border: '1px solid var(--line-2)',
              background: 'var(--surface)', color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
            }}>
              {answer.text}
            </div>

            {/* Source attribution */}
            {src && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                marginTop: 8, padding: '9px 11px', borderRadius: 8,
                background: lowConf ? 'var(--warn-soft)' : 'var(--surface-2)',
                border: `1px solid ${lowConf ? 'rgba(184,106,23,0.2)' : 'var(--line)'}`,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface)', border: '1px solid var(--line-2)',
                  color: lowConf ? 'var(--warn)' : 'var(--ink-2)',
                }}>
                  {src.kind === 'file'
                    ? <ScrollText style={{ width: 12, height: 12 }} />
                    : <AlertTriangle style={{ width: 12, height: 12 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>
                    {src.kind === 'file' ? 'Drawn from ' : 'Source '}
                    <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{src.title}</strong>
                    {src.page && <span style={{ color: 'var(--ink-4)' }}> · page {src.page}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 11, color: 'var(--ink-3)' }}>
                    <div style={{ width: 60, height: 4, borderRadius: 4, background: 'var(--line)', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ height: '100%', width: `${conf}%`, borderRadius: 4, background: lowConf ? 'var(--warn)' : 'var(--success)' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{conf}% match</span>
                    {src.kind === 'file' && (
                      <button style={{
                        marginLeft: 'auto', fontSize: 11, color: 'var(--ink-2)',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 6px', borderRadius: 4,
                        border: '1px solid var(--line-2)', background: 'var(--surface)',
                        cursor: 'pointer',
                      }}
                      className="hover:bg-[var(--bg-2)]"
                      >
                        Open source <ArrowUpRight style={{ width: 10, height: 10 }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Better answer */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ ...SectionLabel, marginBottom: 0 }}>Better answer</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{draft.length} chars</span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write the answer the agent should have given…"
              rows={7}
              style={{
                width: '100%', padding: '11px 13px',
                border: '1px solid var(--line-2)', borderRadius: 10,
                background: 'var(--surface)', fontFamily: 'var(--font-sans)',
                fontSize: 13, lineHeight: 1.55,
                resize: 'vertical', minHeight: 120, boxSizing: 'border-box',
                transition: 'border-color .12s ease, box-shadow .12s ease',
                outline: 'none', display: 'block',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {/* Tone chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', marginRight: 2 }}>Quick edits</span>
              {(['Shorter', 'Warmer', 'Remove filler'] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyTone(label.toLowerCase().replace(' ', ''))}
                  style={{
                    height: 24, padding: '0 9px',
                    fontSize: 11.5, color: 'var(--ink-2)',
                    border: '1px solid var(--line-2)', borderRadius: 999,
                    background: 'var(--surface)', display: 'inline-flex', alignItems: 'center',
                    cursor: 'pointer', transition: 'all .12s',
                  }}
                  className="hover:bg-[var(--bg-2)] hover:border-[var(--line-strong)] hover:!text-[var(--ink)]"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDraft(answer.text)}
                disabled={!dirty}
                style={{
                  height: 24, padding: '0 9px',
                  fontSize: 11.5, color: 'var(--ink-3)',
                  border: '1px solid var(--line-2)', borderRadius: 999,
                  background: 'var(--surface)', display: 'inline-flex', alignItems: 'center',
                  cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.4,
                  marginLeft: 'auto', transition: 'all .12s',
                }}
              >
                Reset
              </button>
            </div>
          </section>

          {/* Test the fix */}
          <section>
            <div style={SectionLabel}>Test the fix</div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                <span style={{
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
                  padding: '2px 5px', borderRadius: 4, background: 'var(--bg-2)',
                  flexShrink: 0, marginTop: 1,
                }}>
                  Re-ask
                </span>
                <span style={{ color: 'var(--ink-2)' }}>{question?.text}</span>
              </div>
              <button
                type="button"
                onClick={runTest}
                disabled={testing || !dirty}
                style={{
                  marginTop: 10, width: '100%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 30, padding: '0 12px', borderRadius: 7,
                  border: '1px solid var(--line-2)', background: 'var(--surface)',
                  fontSize: 12.5, color: testing || !dirty ? 'var(--ink-4)' : 'var(--ink)',
                  cursor: testing || !dirty ? 'not-allowed' : 'pointer',
                  opacity: !dirty ? 0.6 : 1, transition: 'all .12s',
                }}
                className={dirty && !testing ? 'hover:bg-[var(--bg-2)]' : ''}
              >
                {testing ? (
                  <>
                    <span style={{
                      width: 11, height: 11,
                      border: '1.5px solid var(--line-strong)', borderTopColor: 'var(--ink)',
                      borderRadius: '50%', display: 'inline-block',
                      animation: 'revSpin .7s linear infinite',
                    }} />
                    Running…
                  </>
                ) : (
                  <><Play style={{ width: 11, height: 11 }} /> Run with revised agent</>
                )}
              </button>

              {tested && (
                <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px dashed var(--line-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 500,
                      background: 'var(--success-soft)', color: 'var(--success)',
                      border: '1px solid rgba(14,155,107,0.2)',
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      <Check style={{ width: 10, height: 10 }} /> Match
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                      0.41s · 312 tokens
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink)',
                    padding: '9px 11px', background: 'var(--bg-2)', borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {draft}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Save as */}
          <section>
            <div style={SectionLabel}>Save as</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saveOptions.map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '11px 13px',
                    border: `1px solid ${mode === opt.id ? 'var(--accent)' : 'var(--line-2)'}`,
                    borderRadius: 10,
                    background: mode === opt.id ? 'var(--accent-soft)' : 'var(--surface)',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.5 : 1,
                    boxShadow: mode === opt.id ? '0 0 0 2px var(--accent-ring) inset' : 'none',
                    transition: 'border-color .12s, background .12s',
                  }}
                  className={!opt.disabled && mode !== opt.id ? 'hover:border-[var(--line-strong)]' : ''}
                >
                  <input
                    type="radio"
                    name="rev-mode"
                    checked={mode === opt.id}
                    onChange={() => !opt.disabled && setMode(opt.id)}
                    disabled={opt.disabled}
                    style={{ margin: '2px 0 0', accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {opt.icon} {opt.title}
                      {opt.disabled && (
                        <span style={{
                          fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
                          padding: '1px 5px', borderRadius: 3,
                          background: 'var(--bg-2)', border: '1px solid var(--line-2)',
                          marginLeft: 4,
                        }}>
                          no source
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 500,
              background: 'var(--bg-2)', color: 'var(--ink-3)',
              border: '1px solid var(--line-2)', padding: '2px 7px', borderRadius: 4,
            }}>
              session <span style={{ fontFamily: 'var(--font-mono)' }}>#a4f1</span>
            </span>
            {dirty && <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Unsaved changes</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={onClose} className="btn btn--ghost btn--sm">Cancel</button>
            <button
              type="button"
              disabled={!dirty}
              className="btn btn--primary btn--sm"
              style={{ minWidth: 130 }}
            >
              {saveLabel} <ArrowRight style={{ width: 11, height: 11 }} />
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function ChatLogsPage() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [reviseIdx, setReviseIdx] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState('week1')

  const questionFor = (i: number): Message | null => {
    for (let j = i - 1; j >= 0; j--) {
      if (MESSAGES[j].from === 'user') return MESSAGES[j]
    }
    return null
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        minHeight: 'calc(100vh - 52px)',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* ── Left: session list ───────────────────────────────── */}
      <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        {/* Page header */}
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            Chat logs
          </h1>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 30, padding: '0 10px',
            border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
            color: 'var(--ink-3)', background: 'var(--bg)',
          }}>
            <Search style={{ width: 13, height: 13, flexShrink: 0 }} />
            <input
              placeholder="Search sessions…"
              style={{ border: 0, background: 'transparent', flex: 1, outline: 'none', fontSize: 12.5 }}
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger compact style={{ height: 30, fontSize: 12 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week1">Apr 28 – May 4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session list */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}>
          {SESSIONS.map((s, i) => (
            <li
              key={s.id}
              onClick={() => setActiveIdx(i)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--line)',
                cursor: 'pointer',
                background: activeIdx === i ? 'var(--surface)' : 'transparent',
                boxShadow: activeIdx === i ? 'inset 2px 0 0 var(--accent)' : 'none',
                transition: 'background .12s ease',
              }}
              className={activeIdx === i ? '' : 'hover:bg-[var(--bg-2)]'}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>{s.time}</span>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span>{s.count} msg</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right: thread ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Thread header */}
        <div style={{
          padding: '14px 22px',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexShrink: 0, background: 'var(--bg)',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
              {SESSIONS[activeIdx].title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              {SESSIONS[activeIdx].time} · {SESSIONS[activeIdx].count} messages · session{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>#a4f1</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" className="btn btn--ghost btn--sm">
              <Copy style={{ width: 11, height: 11 }} /> Copy transcript
            </button>
            <button type="button" className="btn btn--secondary btn--sm">
              Open in playground <ArrowUpRight style={{ width: 11, height: 11 }} />
            </button>
          </div>
        </div>

        {/* Thread body */}
        <div style={{ flex: 1, padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {MESSAGES.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'flex', gap: 10, maxWidth: '70%',
                alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                flexDirection: m.from === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: 'white', marginTop: 2,
                background: m.from === 'user' ? 'var(--ink)' : 'var(--accent)',
              }}>
                {m.from === 'user' ? 'U' : <Bot style={{ width: 12, height: 12 }} />}
              </div>

              {/* Bubble */}
              <div style={{
                background: m.from === 'user' ? 'var(--ink)' : 'var(--surface)',
                border: `1px solid ${m.from === 'user' ? 'var(--ink)' : 'var(--line)'}`,
                borderRadius: 12, padding: '10px 14px',
                fontSize: 13, lineHeight: 1.5,
                color: m.from === 'user' ? 'white' : 'var(--ink)',
              }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: m.revisable ? 'space-between' : 'flex-start',
                  marginTop: 6, gap: 8,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10.5,
                    color: m.from === 'user' ? 'rgba(255,255,255,0.5)' : 'var(--ink-4)',
                  }}>
                    {m.time}
                  </span>
                  {m.revisable && (
                    <button
                      type="button"
                      onClick={() => setReviseIdx(i)}
                      style={{
                        fontSize: 10.5, color: 'var(--ink-3)',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 6px', borderRadius: 4,
                        border: '1px solid var(--line-2)', background: 'var(--bg)',
                        cursor: 'pointer', transition: 'border-color .12s, color .12s',
                      }}
                      className="hover:border-[var(--accent)] hover:!text-[var(--accent)]"
                    >
                      <Sparkles style={{ width: 10, height: 10 }} /> Revise
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revise panel */}
      {reviseIdx !== null && (
        <RevisePanel
          question={questionFor(reviseIdx)}
          answer={MESSAGES[reviseIdx]}
          onClose={() => setReviseIdx(null)}
        />
      )}
    </div>
  )
}
