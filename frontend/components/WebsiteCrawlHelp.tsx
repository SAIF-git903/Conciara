'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'

export interface WebsiteCrawlHelpProps {
  /** When true, show as compact inline block (e.g. onboarding). When false, show with border/card (e.g. Data Sources). */
  variant?: 'inline' | 'card'
  /** When true, start expanded. */
  defaultExpanded?: boolean
}

export default function WebsiteCrawlHelp({ variant = 'card', defaultExpanded = false }: WebsiteCrawlHelpProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const content = (
    <div className="space-y-4 text-sm text-slate-600">
      <div>
        <p className="font-medium text-slate-700">Starts from the URL you give</p>
        <p className="mt-0.5">
          Typically your homepage or any public page. It treats that as the entry point.
        </p>
      </div>
      <div>
        <p className="font-medium text-slate-700">Follows internal links</p>
        <p className="mt-0.5">
          It discovers and visits other pages linked from that URL, staying within the same domain. All discovered pages are grouped under that domain in Data sources → Website.
        </p>
      </div>
      <div>
        <p className="font-medium text-slate-700">Extracts text content</p>
        <p className="mt-0.5">
          It reads machine-readable text on each page (headings, paragraphs, lists, etc.). It does not process images (no OCR), videos, or other non-text elements. If your pages contain image URLs in the HTML/text, the agent can later reference those links in answers, but it does not “understand” the image itself.
        </p>
      </div>
      <div>
        <p className="font-medium text-slate-700">Respects include / exclude paths (if configured)</p>
        <p className="mt-0.5">
          You can later refine what gets crawled using include paths (only crawl URLs that match) and exclude paths (skip URLs that match). You can then recrawl to update the data.
        </p>
      </div>
      <div>
        <p className="font-medium text-slate-700">Stores content as training data</p>
        <p className="mt-0.5">
          All fetched pages and their text are stored as part of your agent’s knowledge base. You can click into each URL to preview the extracted content, and exclude specific links or delete groups if you don’t want them used.
        </p>
      </div>
      <div>
        <p className="font-medium text-slate-700">It does not</p>
        <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-slate-600">
          <li>Access password-protected or non-public pages.</li>
          <li>Run custom JavaScript like a browser would for dynamic interactions — it focuses on the rendered text content it can access.</li>
        </ul>
      </div>
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center gap-2 text-left text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          )}
          <Info className="h-4 w-4 shrink-0 text-slate-500" />
          How website crawl works
        </button>
        {expanded && <div className="mt-4 pl-6">{content}</div>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-slate-800"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <Info className="h-4 w-4 shrink-0 text-[var(--v2-primary)]" />
        How website crawl works
      </button>
      {expanded && <div className="mt-4 border-t border-slate-100 pt-4">{content}</div>}
    </div>
  )
}
