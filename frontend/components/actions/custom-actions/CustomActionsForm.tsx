'use client'

import { useMemo, useState } from 'react'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ConfigurationTab from './ConfigurationTab'
import TestTab from './TestTab'
import type { CustomActionConfig } from '@/components/actions/types'
import { Switch } from '@/components/ui/switch'

interface CustomActionsFormProps {
  isSaved: boolean
  name: string
  isEnabled: boolean
  config: CustomActionConfig
  errors: Record<string, string>
  functionNameConflict: string | null
  testLoading: boolean
  testResult: { success: boolean; statusCode: number; responseBody: unknown; durationMs: number } | null
  testError: string | null
  onNameChange: (name: string) => void
  onEnabledChange: (enabled: boolean) => void
  onConfigChange: (config: CustomActionConfig) => void
  onFunctionNameBlur: () => void
  onRunTest: (inputs: Record<string, unknown>) => Promise<void>
}

export default function CustomActionsForm({
  isSaved,
  name,
  isEnabled,
  config,
  errors,
  functionNameConflict,
  testLoading,
  testResult,
  testError,
  onNameChange,
  onEnabledChange,
  onConfigChange,
  onFunctionNameBlur,
  onRunTest,
}: CustomActionsFormProps) {
  const [tab, setTab] = useState<'configuration' | 'test'>('configuration')
  const testDisabledReason = useMemo(() => (!isSaved ? 'Save first to test' : ''), [isSaved])

  return (
    <div className="space-y-4">
      <TabsList>
        <TabsTrigger active={tab === 'configuration'} onClick={() => setTab('configuration')}>
          Configuration
        </TabsTrigger>
        <TabsTrigger
          active={tab === 'test'}
          onClick={() => {
            if (isSaved) setTab('test')
          }}
          disabled={!isSaved}
        >
          <span title={testDisabledReason || undefined}>Test</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent active={tab === 'configuration'}>
        <ConfigurationTab
          name={name}
          config={config}
          errors={errors}
          functionNameConflict={functionNameConflict}
          onNameChange={onNameChange}
          onConfigChange={onConfigChange}
          onFunctionNameBlur={onFunctionNameBlur}
        />
      </TabsContent>

      <TabsContent active={tab === 'test'}>
        <TestTab inputFields={config.inputFields} loading={testLoading} result={testResult} error={testError} onRun={onRunTest} />
      </TabsContent>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-slate-800">Enable action</p>
          <p className="text-xs text-slate-500">Keep off until fully configured and validated.</p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={onEnabledChange} />
      </div>
    </div>
  )
}
