'use client'

import { useState } from 'react'
import { ChevronDown, Bot, RefreshCw, Mic, Send, Briefcase } from 'lucide-react'

const defaultInstructions = `### Business Context
ConversaTree is a platform designed for creating and managing dialog trees with vector embeddings. It provides a login portal with different user roles, including System Administrator, Manager, and User.`

export default function PlaygroundPage() {
  const [instructions, setInstructions] = useState(defaultInstructions)
  const [message, setMessage] = useState('')

  return (
    <div className="flex min-h-0 flex-1">
      {/* Central content */}
      <div className="flex-1 min-w-0 overflow-auto p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Playground</h1>

        {/* Status: Trained */}
        <div className="mt-3 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-sm font-medium text-emerald-600">Trained</span>
          </div>
          <p className="text-xs text-slate-500">Last trained Just now</p>
        </div>

        {/* Compare AI models */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Compare AI models
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300"
          >
            Compare
          </button>
        </div>

        {/* Limit exceeded alert - below Compare for ref order */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600" aria-hidden>
            <span className="text-lg leading-none">!</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-800">Limit exceeded</p>
            <p className="mt-0.5 text-sm text-amber-700">You&apos;re using 885 KB of 400 KB in your plan.</p>
            <a
              href="/v2/pricing"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--v2-primary)] hover:underline"
            >
              ↑ Upgrade to train on more data
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Model section */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Model</h2>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50">
                <Bot className="h-5 w-5 text-slate-600" />
              </div>
              <span className="font-medium text-slate-900">GPT-5.1</span>
            </div>
            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600" aria-label="Expand">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--v2-primary)]/20 bg-[var(--v2-primary)]/5 px-4 py-3">
            <span className="text-sm text-slate-600">Upgrade for more advanced models</span>
            <a
              href="/v2/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--v2-primary)] px-3 py-1.5 text-sm font-medium text-[var(--v2-primary-foreground)] transition hover:bg-[var(--v2-primary-hover)]"
            >
              <Briefcase className="h-4 w-4" />
              ↑ Upgrade
            </a>
          </div>
        </div>

        {/* AI Actions */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">AI Actions</h2>
          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Add your first action
          </button>
        </div>

        {/* Instructions (System prompt) */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Instructions (System prompt)</h2>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-slate-500" />
                Base Instructions
              </span>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={12}
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
            placeholder="Enter system prompt..."
          />
        </div>
      </div>

      {/* Right chat panel */}
      <div className="flex w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--v2-primary)]/10">
            <Bot className="h-4 w-4 text-[var(--v2-primary)]" />
          </div>
          <span className="font-semibold text-slate-900">ConversaTree</span>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col justify-end min-h-[320px]">
          <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-700 max-w-[90%]">
            Hi! What can I help you with?
          </div>
        </div>
        <div className="border-t border-slate-100 p-3">
          <p className="mb-2 text-center text-xs text-slate-400">Powered by Chatbase</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
            />
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
              aria-label="Voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-xl bg-[var(--v2-primary)] p-2.5 text-[var(--v2-primary-foreground)] transition hover:bg-[var(--v2-primary-hover)]"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
