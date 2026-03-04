'use client'

import { Listbox, Transition } from '@headlessui/react'
import { ChevronDownIcon } from 'lucide-react'

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
  const selectedOption = options.find((o) => o.value === value)
  const display = selectedOption?.label ?? placeholder

  const buttonClass = segment
    ? `w-full rounded-none border-0 bg-slate-50 text-left shadow-none ring-0 transition hover:bg-slate-100 focus:border-0 focus:outline-none focus:ring-0 focus:ring-offset-0 ${compact ? 'px-3 py-3 text-sm' : 'px-4 py-3 text-sm text-slate-900'} ${!selectedOption ? 'text-slate-500' : ''}`
    : `w-full rounded-xl border border-slate-200 bg-white text-left shadow-sm ring-1 ring-slate-200/50 transition hover:border-slate-300 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20 ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm text-slate-900'} ${!selectedOption ? 'text-slate-500' : ''}`

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              id={id}
              className={buttonClass}
            >
              <span className="block truncate pr-8">{display}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <ChevronDownIcon
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                />
              </span>
            </Listbox.Button>
            <Transition
              show={open}
              enter="transition duration-100 ease-out"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <Listbox.Options
                className="absolute z-30 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-slate-900/5 focus:outline-none"
              >
                {options.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                    className="group relative cursor-pointer select-none py-2.5 pl-4 pr-10 text-sm text-slate-900 outline-none hover:bg-slate-50 data-[headlessui-state~=active]:bg-slate-50 data-[headlessui-state~=selected]:bg-[var(--v2-primary-soft)] data-[headlessui-state~=active]:data-[headlessui-state~=selected]:bg-[var(--v2-primary-soft)]"
                  >
                    <span className="block truncate font-normal group-data-[headlessui-state~=selected]:font-medium">
                      {option.label}
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--v2-primary)] opacity-0 group-data-[headlessui-state~=selected]:opacity-100">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  )
}
