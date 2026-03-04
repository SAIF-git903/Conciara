'use client'

import { useState } from 'react'
import { Palette, Layout, Zap, ChevronDown, ChevronRight, Monitor, Save } from 'lucide-react'
import type { SkinConfig, ThemeColors, ComponentsConfig, StatesConfig } from '@/types/skinConfig'

type TabType = 'theme' | 'components' | 'states'

const DEFAULT_WINDOW = { width: 384, height: 600, minWidth: 320, minHeight: 400, borderRadius: 8 }

const PREVIEW_SAMPLE_MESSAGES = [
  { id: '1', type: 'bot' as const, content: "Hi! How can I help you today?", timestamp: new Date() },
  { id: '2', type: 'user' as const, content: "I'd like to see how the widget looks.", timestamp: new Date() },
  { id: '3', type: 'bot' as const, content: "Changes you make on the left will appear here in real time.", timestamp: new Date() },
]

function emptyConfig(): SkinConfig {
  return { theme: {}, components: {}, states: {} }
}

// ----- Helpers (v2 styled) -----
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value || '#0f172a'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer"
          style={{ backgroundColor: value || '#0f172a' }}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0f172a"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
        />
      </div>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
      />
    </div>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
      />
    </div>
  )
}

function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: T[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[var(--v2-primary)] focus:ring-[var(--v2-primary)]"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

function Section({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          {icon}
          <span>{title}</span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
      </button>
      {expanded && <div className="p-4 border-t border-slate-100">{children}</div>}
    </div>
  )
}

export default function ChatbotCustomizationsPage() {
  const [config, setConfig] = useState<SkinConfig>(emptyConfig())
  const [activeTab, setActiveTab] = useState<TabType>('theme')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    button: true,
    window: false,
    header: false,
    messages: false,
    input: false,
    quickReplies: false,
    loading: false,
    empty: false,
    error: false,
  })

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }))
  const updateTheme = (u: Partial<ThemeColors>) =>
    setConfig((c) => ({ ...c, theme: { ...c.theme, ...u } }))
  const updateComponents = (component: keyof ComponentsConfig, u: object) =>
    setConfig((c) => ({
      ...c,
      components: {
        ...c.components,
        [component]: { ...(c.components?.[component] || {}), ...u },
      },
    }))
  const updateStates = (state: keyof StatesConfig, u: object) =>
    setConfig((c) => ({
      ...c,
      states: { ...c.states, [state]: { ...(c.states?.[state] || {}), ...u } },
    }))

  const theme = config.theme || {}
  const comp = config.components || {}
  const states = config.states || {}

  const bg = theme.backgroundColor || '#ffffff'
  const text = theme.textColor || '#1f2937'
  const primary = theme.primaryColor || '#0f172a'
  const border = theme.borderColor || '#e5e7eb'
  const windowConfig = comp.window || {}
  const radius = windowConfig.borderRadius ?? 8
  const headerTitle = comp.header?.title || 'Chat Assistant'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Chatbot customizations</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Customize how your chat widget looks and behaves. Changes appear in the live preview on the right.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90"
          >
            <Save className="h-4 w-4" />
            Save changes
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Customization form */}
        <div className="w-full lg:w-[420px] lg:max-w-[420px] shrink-0 flex flex-col border-r border-slate-200 bg-slate-50/30">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-5">
              <p className="text-xs text-slate-500 mb-4">
                Use the tabs below to edit theme colors, widget components, and loading/empty/error states.
              </p>

              {/* Tabs */}
              <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                {[
                  { id: 'theme' as TabType, label: 'Theme', Icon: Palette },
                  { id: 'components' as TabType, label: 'Components', Icon: Layout },
                  { id: 'states' as TabType, label: 'States', Icon: Zap },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                      activeTab === id
                        ? 'bg-[var(--v2-primary)] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'theme' && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-slate-500" />
                    Color palette
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">Set colors used across the widget.</p>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput label="Primary" value={theme.primaryColor || ''} onChange={(v) => updateTheme({ primaryColor: v })} />
                <ColorInput label="Background" value={theme.backgroundColor || ''} onChange={(v) => updateTheme({ backgroundColor: v })} />
                <ColorInput label="Text" value={theme.textColor || ''} onChange={(v) => updateTheme({ textColor: v })} />
                <ColorInput label="Accent" value={theme.accentColor || ''} onChange={(v) => updateTheme({ accentColor: v })} />
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-1">Button, window, header, messages, input, and quick replies.</p>
              <Section
                title="Chat button"
                icon={<Layout className="h-4 w-4" />}
                expanded={expanded.button}
                onToggle={() => toggle('button')}
              >
                <div className="grid grid-cols-2 gap-4">
                  <SelectInput
                    label="Type"
                    value={(comp.button?.type as 'circular' | 'rounded' | 'square') || 'circular'}
                    options={['circular', 'rounded', 'square']}
                    onChange={(v) => updateComponents('button', { type: v })}
                  />
                  <SelectInput
                    label="Size"
                    value={(comp.button?.size as 'small' | 'medium' | 'large') || 'large'}
                    options={['small', 'medium', 'large']}
                    onChange={(v) => updateComponents('button', { size: v })}
                  />
                  <SelectInput
                    label="Icon"
                    value={(comp.button?.icon as string) || 'bot'}
                    options={['bot', 'chat', 'message', 'custom']}
                    onChange={(v) => updateComponents('button', { icon: v })}
                  />
                  <SelectInput
                    label="Position"
                    value={(comp.button?.position as string) || 'bottom-right'}
                    options={['bottom-right', 'bottom-left', 'top-right', 'top-left']}
                    onChange={(v) => updateComponents('button', { position: v })}
                  />
                </div>
              </Section>

              <Section
                title="Window"
                icon={<Layout className="h-4 w-4" />}
                expanded={expanded.window}
                onToggle={() => toggle('window')}
              >
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput
                    label="Width"
                    value={comp.window?.width ?? DEFAULT_WINDOW.width}
                    onChange={(v) => updateComponents('window', { width: v })}
                  />
                  <NumberInput
                    label="Height"
                    value={comp.window?.height ?? DEFAULT_WINDOW.height}
                    onChange={(v) => updateComponents('window', { height: v })}
                  />
                  <NumberInput
                    label="Border radius"
                    value={comp.window?.borderRadius ?? DEFAULT_WINDOW.borderRadius}
                    onChange={(v) => updateComponents('window', { borderRadius: v })}
                  />
                  <SelectInput
                    label="Shadow"
                    value={(comp.window?.shadow as string) || 'large'}
                    options={['none', 'small', 'medium', 'large']}
                    onChange={(v) => updateComponents('window', { shadow: v })}
                  />
                </div>
              </Section>

              <Section
                title="Header"
                icon={<Layout className="h-4 w-4" />}
                expanded={expanded.header}
                onToggle={() => toggle('header')}
              >
                <div className="space-y-4">
                  <CheckboxInput
                    label="Show header"
                    checked={comp.header?.show !== false}
                    onChange={(v) => updateComponents('header', { show: v })}
                  />
                  {comp.header?.show !== false && (
                    <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-slate-200">
                      <div className="col-span-2">
                        <CheckboxInput
                          label="Show title"
                          checked={comp.header?.showTitle !== false}
                          onChange={(v) => updateComponents('header', { showTitle: v })}
                        />
                      </div>
                      {comp.header?.showTitle !== false && (
                        <div className="col-span-2">
                          <TextInput
                            label="Title"
                            value={comp.header?.title || 'Chat Assistant'}
                            onChange={(v) => updateComponents('header', { title: v })}
                          />
                        </div>
                      )}
                      <CheckboxInput
                        label="Show minimize"
                        checked={comp.header?.showMinimize !== false}
                        onChange={(v) => updateComponents('header', { showMinimize: v })}
                      />
                      <CheckboxInput
                        label="Show close"
                        checked={comp.header?.showClose !== false}
                        onChange={(v) => updateComponents('header', { showClose: v })}
                      />
                    </div>
                  )}
                </div>
              </Section>

              <Section
                title="Messages"
                icon={<Layout className="h-4 w-4" />}
                expanded={expanded.messages}
                onToggle={() => toggle('messages')}
              >
                <div className="grid grid-cols-2 gap-4">
                  <SelectInput
                    label="Layout"
                    value={(comp.messages?.layout as string) || 'bubbles'}
                    options={['bubbles', 'list', 'cards']}
                    onChange={(v) => updateComponents('messages', { layout: v })}
                  />
                  <SelectInput
                    label="Bubble style"
                    value={(comp.messages?.bubbleStyle as string) || 'rounded'}
                    options={['rounded', 'square', 'minimal']}
                    onChange={(v) => updateComponents('messages', { bubbleStyle: v })}
                  />
                  <div className="col-span-2">
                    <CheckboxInput
                      label="Show avatars"
                      checked={comp.messages?.showAvatars !== false}
                      onChange={(v) => updateComponents('messages', { showAvatars: v })}
                    />
                  </div>
                  <div className="col-span-2">
                    <CheckboxInput
                      label="Show timestamps"
                      checked={!!comp.messages?.showTimestamps}
                      onChange={(v) => updateComponents('messages', { showTimestamps: v })}
                    />
                  </div>
                  {comp.messages?.showTimestamps && (
                    <div className="col-span-2">
                      <SelectInput
                        label="Timestamp format"
                        value={(comp.messages?.timestampFormat as string) || 'relative'}
                        options={['relative', 'absolute']}
                        onChange={(v) => updateComponents('messages', { timestampFormat: v })}
                      />
                    </div>
                  )}
                </div>
              </Section>

              <Section
                title="Input"
                icon={<Layout className="h-4 w-4" />}
                expanded={expanded.input}
                onToggle={() => toggle('input')}
              >
                <div className="space-y-4">
                  <TextInput
                    label="Placeholder"
                    value={comp.input?.placeholder || 'Type your message...'}
                    onChange={(v) => updateComponents('input', { placeholder: v })}
                  />
                  <CheckboxInput
                    label="Show send button"
                    checked={comp.input?.showSendButton !== false}
                    onChange={(v) => updateComponents('input', { showSendButton: v })}
                  />
                  <NumberInput
                    label="Max length (0 = no limit)"
                    value={comp.input?.maxLength || 0}
                    onChange={(v) => updateComponents('input', { maxLength: v || undefined })}
                  />
                </div>
              </Section>

              <Section
                title="Quick replies"
                icon={<Layout className="h-4 w-4" />}
                expanded={expanded.quickReplies}
                onToggle={() => toggle('quickReplies')}
              >
                <div className="space-y-4">
                  <CheckboxInput
                    label="Show quick replies"
                    checked={comp.quickReplies?.show !== false}
                    onChange={(v) => updateComponents('quickReplies', { show: v })}
                  />
                  {comp.quickReplies?.show !== false && (
                    <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-slate-200">
                      <SelectInput
                        label="Layout"
                        value={(comp.quickReplies?.layout as string) || 'horizontal'}
                        options={['horizontal', 'vertical', 'grid']}
                        onChange={(v) => updateComponents('quickReplies', { layout: v })}
                      />
                      <SelectInput
                        label="Style"
                        value={(comp.quickReplies?.style as string) || 'buttons'}
                        options={['buttons', 'chips', 'links']}
                        onChange={(v) => updateComponents('quickReplies', { style: v })}
                      />
                    </div>
                  )}
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'states' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-1">Loading, empty, and error state copy and styling.</p>
              <Section
                title="Loading state"
                icon={<Zap className="h-4 w-4" />}
                expanded={expanded.loading}
                onToggle={() => toggle('loading')}
              >
                <div className="space-y-4">
                  <SelectInput
                    label="Type"
                    value={(states.loading?.type as string) || 'dots'}
                    options={['dots', 'spinner', 'skeleton', 'pulse']}
                    onChange={(v) => updateStates('loading', { type: v })}
                  />
                  <TextInput
                    label="Message"
                    value={states.loading?.message || ''}
                    onChange={(v) => updateStates('loading', { message: v })}
                  />
                </div>
              </Section>

              <Section
                title="Empty state"
                icon={<Zap className="h-4 w-4" />}
                expanded={expanded.empty}
                onToggle={() => toggle('empty')}
              >
                <TextInput
                  label="Message"
                  value={states.empty?.message || 'Starting conversation...'}
                  onChange={(v) => updateStates('empty', { message: v })}
                />
              </Section>

              <Section
                title="Error state"
                icon={<Zap className="h-4 w-4" />}
                expanded={expanded.error}
                onToggle={() => toggle('error')}
              >
                <div className="space-y-4">
                  <TextInput
                    label="Message"
                    value={states.error?.message || "Sorry, I'm having trouble. Please try again."}
                    onChange={(v) => updateStates('error', { message: v })}
                  />
                  <CheckboxInput
                    label="Show retry button"
                    checked={states.error?.showRetry !== false}
                    onChange={(v) => updateStates('error', { showRetry: v })}
                  />
                  {states.error?.showRetry !== false && (
                    <TextInput
                      label="Retry button text"
                      value={states.error?.retryText || 'Retry'}
                      onChange={(v) => updateStates('error', { retryText: v })}
                    />
                  )}
                </div>
              </Section>
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="hidden lg:flex flex-1 min-w-0 flex-col bg-white">
          <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-5 py-3">
            <Monitor className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Live preview</span>
            <span className="text-xs text-slate-500 ml-1">· Changes update as you edit</span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-6">
            <div
              className="flex w-full max-w-sm flex-col rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
              style={{
                height: 540,
                backgroundColor: bg,
                borderRadius: radius,
              }}
            >
              {/* Header */}
              <div
                className="flex shrink-0 items-center gap-2 px-4 py-3 border-b"
                style={{ borderColor: border, color: text }}
              >
                <span className="font-medium text-sm">{headerTitle}</span>
              </div>
              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3" style={{ backgroundColor: bg }}>
                {PREVIEW_SAMPLE_MESSAGES.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                      style={
                        msg.type === 'user'
                          ? { backgroundColor: primary, color: '#fff' }
                          : { backgroundColor: border, color: text }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              {/* Input area */}
              <div
                className="shrink-0 flex gap-2 p-3 border-t"
                style={{ borderColor: border, backgroundColor: bg }}
              >
                <input
                  type="text"
                  readOnly
                  placeholder={comp.input?.placeholder || 'Type your message...'}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm placeholder:text-slate-400"
                  style={{ borderColor: border, color: text }}
                />
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white shrink-0"
                  style={{ backgroundColor: primary }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
