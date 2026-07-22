'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, ChevronRight, FileText, Loader2, Pencil, RotateCcw, Save, X } from 'lucide-react'
import api from '@/lib/api'

interface FileContentPanelProps {
  docId: number
  fileName: string
  mimeType: string
  workspaceId: number
  agentId: string
  onClose: () => void
  onSaved: () => void
}

type Mode = 'loading' | 'view' | 'edit' | 'saving' | 'error'
type FileKind = 'md' | 'txt' | 'pdf' | 'docx'

function getFileKind(mimeType: string, fileName: string): FileKind {
  const mt = mimeType.toLowerCase()
  const name = fileName.toLowerCase()
  if (mt.includes('markdown') || name.endsWith('.md')) return 'md'
  if (mt === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (mt.includes('wordprocessingml') || mt.includes('msword') || name.endsWith('.docx') || name.endsWith('.doc')) return 'docx'
  return 'txt'
}

function isEditable(kind: FileKind): boolean {
  return kind === 'txt' || kind === 'md'
}

// ── Markdown viewer ────────────────────────────────────────────
const mdComponents: Components = {
  h1: ({ children }) => <h1 style={{ fontSize: 22, fontWeight: 700, margin: '24px 0 10px', color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 600, margin: '20px 0 8px', color: 'var(--ink)' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 14.5, fontWeight: 600, margin: '16px 0 6px', color: 'var(--ink)' }}>{children}</h3>,
  p:  ({ children }) => <p  style={{ margin: '0 0 12px', lineHeight: 1.75, color: 'var(--ink-2)' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '0 0 12px' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4, lineHeight: 1.65, color: 'var(--ink-2)' }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 14, margin: '12px 0', color: 'var(--ink-3)', fontStyle: 'italic' }}>
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = !!className
    return isBlock
      ? <pre style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '12px 14px', overflowX: 'auto', margin: '12px 0' }}>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{children}</code>
        </pre>
      : <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4, color: 'var(--ink)' }}>{children}</code>
  },
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{children}</a>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '20px 0' }} />,
  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  table: ({ children }) => <div style={{ overflowX: 'auto', margin: '12px 0' }}><table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table></div>,
  th: ({ children }) => <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--line)', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: '7px 12px', borderBottom: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-2)' }}>{children}</td>,
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px', fontSize: 14 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ── Document viewer (PDF / DOCX) ───────────────────────────────
function DocumentViewer({ content, kind }: { content: string; kind: 'pdf' | 'docx' }) {
  const label = kind === 'pdf' ? 'PDF' : 'DOCX'
  const paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-2)', padding: '24px 20px' }}>
      {/* Extracted-text notice */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 8,
        background: 'var(--surface)', border: '1px solid var(--line)',
        fontSize: 12, color: 'var(--ink-3)', marginBottom: 20,
      }}>
        <FileText style={{ width: 13, height: 13, flexShrink: 0 }} />
        Showing text extracted from {label}. Formatting and images from the original are not preserved.
      </div>

      {/* Simulated document page */}
      <div style={{
        background: '#fff',
        boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
        borderRadius: 4,
        padding: '48px 56px',
        maxWidth: 680,
        margin: '0 auto',
        minHeight: 400,
      }}>
        {paragraphs.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            No text content extracted.
          </p>
        ) : paragraphs.map((para, i) => (
          <p key={i} style={{
            margin: '0 0 14px',
            fontSize: 14,
            lineHeight: 1.8,
            color: '#1f2937',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}>
            {para}
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Plain text viewer ──────────────────────────────────────────
function TextViewer({ content }: { content: string }) {
  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      padding: '24px 28px',
      fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.75,
      color: 'var(--ink-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      background: 'var(--bg)',
    }}>
      {content || <span style={{ color: 'var(--ink-4)' }}>Empty file.</span>}
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────
export default function FileContentPanel({
  docId, fileName, mimeType, workspaceId, agentId, onClose, onSaved,
}: FileContentPanelProps) {
  const [mode, setMode]       = useState<Mode>('loading')
  const [content, setContent] = useState('')
  const [draft, setDraft]     = useState('')
  const [error, setError]     = useState('')
  const [saved, setSaved]     = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const kind     = getFileKind(mimeType, fileName)
  const canEdit  = isEditable(kind)

  useEffect(() => {
    let cancelled = false
    setMode('loading'); setError('')
    api.get<{ content: string }>(
      `/workspaces/${workspaceId}/agents/${agentId}/documents/${docId}/content`
    ).then(({ data }) => {
      if (cancelled) return
      setContent(data.content ?? '')
      setDraft(data.content ?? '')
      setMode('view')
    }).catch(() => {
      if (!cancelled) { setError('Failed to load content.'); setMode('error') }
    })
    return () => { cancelled = true }
  }, [docId, workspaceId, agentId])

  useEffect(() => {
    if (mode === 'edit') textareaRef.current?.focus()
  }, [mode])

  const handleSave = async () => {
    setMode('saving'); setError('')
    try {
      await api.put(
        `/workspaces/${workspaceId}/agents/${agentId}/documents/${docId}/content`,
        { content: draft }
      )
      setContent(draft)
      setMode('view')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch {
      setError('Failed to save. Please try again.')
      setMode('edit')
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const isDirty   = draft !== content

  const kindLabel: Record<FileKind, string> = { md: 'Markdown', txt: 'Plain text', pdf: 'PDF', docx: 'DOCX' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'stretch' }}>
      {/* Backdrop */}
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        width: 'min(680px, 100vw)', display: 'flex', flexDirection: 'column',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--line)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 18px', borderBottom: '1px solid var(--line)',
          background: 'var(--surface)', flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} className="icon-btn">
            <X style={{ width: 16, height: 16 }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName}
            </div>
            {mode !== 'loading' && mode !== 'error' && (
              <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                {kindLabel[kind]} · {wordCount.toLocaleString()} words
              </div>
            )}
          </div>

          {mode === 'view' && canEdit && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMode('edit')}>
              <Pencil style={{ width: 12, height: 12 }} /> Edit
            </button>
          )}

          {(mode === 'edit' || mode === 'saving') && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setDraft(content); setMode('view') }} disabled={mode === 'saving'}>
                <RotateCcw style={{ width: 12, height: 12 }} /> Discard
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => void handleSave()} disabled={mode === 'saving' || !isDirty}>
                {mode === 'saving'
                  ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Saving…</>
                  : <><Save style={{ width: 12, height: 12 }} /> Save</>}
              </button>
            </div>
          )}

          {saved && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>
              <Check style={{ width: 13, height: 13 }} /> Saved — re-train to apply
            </span>
          )}
        </div>

        {/* Edit notice */}
        {mode === 'edit' && (
          <div style={{
            padding: '7px 18px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--accent-ring)',
            fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            <ChevronRight style={{ width: 12, height: 12, color: 'var(--accent)' }} />
            Editing extracted text. Click <strong>Train agent</strong> after saving to apply changes.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '8px 18px', flexShrink: 0, fontSize: 12.5, color: 'var(--danger)', background: 'var(--danger-soft)', borderBottom: '1px solid rgba(195,54,101,0.15)' }}>
            {error}
          </div>
        )}

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

          {mode === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Loader2 style={{ width: 22, height: 22, color: 'var(--ink-4)' }} className="animate-spin" />
            </div>
          )}

          {mode === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Could not load file content.</p>
            </div>
          )}

          {(mode === 'view' || mode === 'saving') && (
            kind === 'md'   ? <MarkdownViewer content={content} /> :
            kind === 'pdf'  ? <DocumentViewer content={content} kind="pdf" /> :
            kind === 'docx' ? <DocumentViewer content={content} kind="docx" /> :
                              <TextViewer content={content} />
          )}

          {mode === 'edit' && (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', height: '100%', padding: '20px 24px',
                border: 'none', outline: 'none', resize: 'none',
                fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.75,
                color: 'var(--ink)', background: 'var(--bg)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
