'use client'

import { useState, useRef } from 'react'
import {
  HelpCircle,
  Pencil,
  Trash2,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  Code,
  Quote,
} from 'lucide-react'
import { DataSourcesTrainingCard, type TrainingStatus } from '../DataSourcesTrainingCard'

type QAPair = { id: string; question: string; answer: string }

const MOCK_QA: QAPair[] = [
  {
    id: '1',
    question: 'How do I reset my password?',
    answer: 'Go to the login page and click "Forgot password?". Enter your email to receive a reset link.',
  },
  {
    id: '2',
    question: 'What are your business hours?',
    answer: 'Monday–Friday, 9 AM–6 PM EST. Email support is available 24/7.',
  },
  {
    id: '3',
    question: 'How can I contact support?',
    answer: 'Email support@example.com or use live chat on our website during business hours.',
  },
]

const MARKDOWN_ACTIONS: { icon: typeof Bold; wrap: [string, string]; label: string }[] = [
  { icon: Bold, wrap: ['**', '**'], label: 'Bold' },
  { icon: Italic, wrap: ['*', '*'], label: 'Italic' },
  { icon: Underline, wrap: ['<u>', '</u>'], label: 'Underline' },
  { icon: Link, wrap: ['[', '](url)'], label: 'Link' },
  { icon: List, wrap: ['\n- ', ''], label: 'Bullet list' },
  { icon: ListOrdered, wrap: ['\n1. ', ''], label: 'Numbered list' },
  { icon: Code, wrap: ['`', '`'], label: 'Code' },
  { icon: Quote, wrap: ['\n> ', ''], label: 'Quote' },
]

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
  textarea.value = newValue
  textarea.focus()
  textarea.setSelectionRange(start + before.length, end + before.length)
  return newValue
}

export default function DataSourcesQAPage() {
  const [pairs, setPairs] = useState<QAPair[]>(MOCK_QA)
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('trained')
  const [lastTrainedAt, setLastTrainedAt] = useState<string | null>('5 min ago')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const answerRef = useRef<HTMLTextAreaElement>(null)

  const handleTrain = () => {
    setTrainingStatus('training')
    setLastTrainedAt(null)
    setTimeout(() => {
      setTrainingStatus('trained')
      setLastTrainedAt('Just now')
    }, 2000)
  }

  const handleSave = () => {
    const q = question.trim()
    const a = answer.trim()
    if (!q || !a) return
    setPairs((prev) => [{ id: String(Date.now()), question: q, answer: a }, ...prev])
    setQuestion('')
    setAnswer('')
  }

  const handleRemove = (id: string) => setPairs((p) => p.filter((x) => x.id !== id))
  const handleFormat = (before: string, after: string) => {
    const el = answerRef.current
    if (!el) return
    const newValue = insertAtCursor(el, before, after)
    setAnswer(newValue)
  }

  const hasData = pairs.length > 0
  const canSave = question.trim() && answer.trim()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Q&A</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Add question–answer pairs for exact answers. The agent uses these when users ask matching questions.
          </p>
        </div>
        <div className="mt-4">
          <DataSourcesTrainingCard
            status={trainingStatus}
            lastTrainedAt={lastTrainedAt}
            onTrain={handleTrain}
            disabled={!hasData}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Add new Q&A card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label htmlFor="qa-question" className="block text-sm font-medium text-slate-700">
                  Question
                </label>
                <input
                  id="qa-question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter your question"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="qa-answer" className="block text-sm font-medium text-slate-700">
                    Answer
                  </label>
                  <span className="text-xs text-slate-500">Markdown supported</span>
                </div>
                <div className="mt-1.5 rounded-lg border border-slate-200 bg-white focus-within:border-[var(--v2-primary)] focus-within:ring-1 focus-within:ring-[var(--v2-primary)]">
                  <div className="flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
                    {MARKDOWN_ACTIONS.map(({ icon: Icon, wrap, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleFormat(wrap[0], wrap[1])}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        title={label}
                        aria-label={label}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="qa-answer"
                    ref={answerRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={5}
                    className="w-full resize-y rounded-b-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setQuestion('')
                    setAnswer('')
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                >
                  Save Q&A
                </button>
              </div>
            </div>
          </div>

          {/* Existing Q&A */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Existing Q&A</h2>
              {hasData && (
                <span className="text-xs text-slate-500">{pairs.length} pair{pairs.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {!hasData ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <HelpCircle className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No Q&A pairs yet. Add one above.</p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {pairs.map((pair, index) => (
                    <div
                      key={pair.id}
                      className="group flex items-start gap-4 px-4 py-3 transition-colors hover:bg-slate-50/80 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-sm font-medium text-slate-900">{pair.question}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{pair.answer}</p>
                      </div>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(pair.id)}
                          className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
