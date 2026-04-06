'use client'

import { Badge } from '@/components/ui/badge'

export default function ComingSoonCard() {
  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-60">
      <Badge variant="secondary">Coming Soon</Badge>
      <button
        type="button"
        className="cursor-not-allowed rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500"
        disabled
      >
        Coming Soon
      </button>
    </div>
  )
}
