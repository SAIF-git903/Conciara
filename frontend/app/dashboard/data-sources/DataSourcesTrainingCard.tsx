'use client'

import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'

export type TrainingStatus = 'idle' | 'training' | 'trained' | 'error'

type DataSourcesTrainingCardProps = {
  status: TrainingStatus
  lastTrainedAt: string | null
  onTrain: () => void
  disabled?: boolean
}

export function DataSourcesTrainingCard({
  status,
  lastTrainedAt,
  onTrain,
  disabled = false,
}: DataSourcesTrainingCardProps) {
  const isTraining = status === 'training'
  const isTrained = status === 'trained'
  const isError = status === 'error'

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isTraining
              ? 'bg-amber-100 text-amber-800'
              : isTrained
                ? 'bg-emerald-100 text-emerald-800'
                : isError
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-200 text-slate-600'
          }`}
        >
          {isTraining ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isTrained ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : isError ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : null}
          {isTraining ? 'Training…' : isTrained ? 'Trained' : isError ? 'Failed' : 'Not trained'}
        </span>
        <span className="text-xs text-slate-500">
          {lastTrainedAt ? `Last trained ${lastTrainedAt}` : 'Train after adding data'}
        </span>
      </div>
      <button
        type="button"
        onClick={onTrain}
        disabled={disabled || isTraining}
        className="inline-flex items-center gap-2 rounded-md bg-[var(--v2-primary)] px-3 py-2 text-xs font-medium text-[var(--v2-primary-foreground)] transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
      >
        {isTraining ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isTrained ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : null}
        {isTraining ? 'Training…' : isTrained ? 'Retrain' : 'Train'}
      </button>
    </div>
  )
}
