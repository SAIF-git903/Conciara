'use client'

import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  id?: string
  placeholder?: string
  className?: string
  /** Compact style for inline use (e.g. protocol selector) */
  compact?: boolean
  /** Use as a segment of a combined control (e.g. protocol + URL input); removes border/ring/radius so parent can wrap both */
  segment?: boolean
}

export default function V2Select({
  value,
  onChange,
  options,
  label,
  id,
  placeholder = 'Select...',
  className = '',
  compact = false,
  segment = false,
}: Props) {
  return (
    <div className={cn('w-full font-[var(--v2-font-sans)]', segment && 'flex h-full min-h-0 flex-col', className)}>
      {label && (
        <label
          id={id ? `${id}-label` : undefined}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <ShadcnSelect value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          compact={compact}
          segment={segment}
          aria-labelledby={id ? `${id}-label` : undefined}
          className={cn(
            !value && 'text-slate-500',
            compact && 'text-sm',
            !compact && 'text-base',
            segment && 'flex-1'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent compact={compact}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} compact={compact}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
    </div>
  )
}
