'use client'

import { useMemo, useState } from 'react'

export default function ClientSideCodeSnippet({ functionName }: { functionName: string }) {
  const [copied, setCopied] = useState(false)

  const snippet = useMemo(
    () =>
      `// Add this to your website after loading the chatbot embed script
window.ChatbotActions.register("${functionName || 'YOUR_FUNCTION_NAME'}", async (inputs) => {
  // Your logic here
  const result = await yourCustomLogic(inputs);
  return { success: true, data: result };
});`,
    [functionName]
  )

  const copy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-2">
      {!functionName && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Set an action name above — the function identifier will be auto-filled in the snippet below before you copy.
        </p>
      )}
      <div className="rounded-lg border border-slate-200 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">JavaScript</p>
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!functionName}
            title={!functionName ? 'Set an action name first' : undefined}
            className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto p-3 text-xs leading-5 text-slate-100">
          <code>{snippet}</code>
        </pre>
        <div className="border-t border-slate-700 px-3 py-2 text-xs text-slate-400">
          The function name must match exactly. This code runs in your visitor&apos;s browser when the action is triggered.
        </div>
      </div>
    </div>
  )
}
