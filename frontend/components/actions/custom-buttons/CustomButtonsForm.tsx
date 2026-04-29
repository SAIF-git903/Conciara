'use client'

import { useMemo } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ButtonItem from './ButtonItem'
import type { CustomButtonsConfig, CustomButtonsButton } from '@/components/actions/types'
import { Switch } from '@/components/ui/switch'

const MAX_BUTTONS = 6

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function SortableButtonItem({
  button,
  index,
  canDelete,
  urlError,
  onChange,
  onDelete,
}: {
  button: CustomButtonsButton
  index: number
  canDelete: boolean
  urlError?: string
  onChange: (next: CustomButtonsButton) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: button.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <ButtonItem
        button={button}
        index={index}
        canDelete={canDelete}
        urlError={urlError}
        attributes={attributes}
        listeners={listeners}
        onChange={onChange}
        onDelete={onDelete}
      />
    </div>
  )
}

interface CustomButtonsFormProps {
  value: {
    name: string
    isEnabled: boolean
    config: CustomButtonsConfig
  }
  errors: Record<string, string>
  onChange: (next: { name: string; isEnabled: boolean; config: CustomButtonsConfig }) => void
}

export default function CustomButtonsForm({ value, errors, onChange }: CustomButtonsFormProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const buttonIds = useMemo(() => value.config.buttons.map((button) => button.id), [value.config.buttons])

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = value.config.buttons.findIndex((button) => button.id === active.id)
    const newIndex = value.config.buttons.findIndex((button) => button.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const nextButtons = arrayMove(value.config.buttons, oldIndex, newIndex)
    onChange({ ...value, config: { ...value.config, buttons: nextButtons } })
  }

  const addButton = () => {
    if (value.config.buttons.length >= MAX_BUTTONS) return
    const next: CustomButtonsButton = {
      id: crypto.randomUUID(),
      label: '',
      url: '',
      openInNewTab: true,
    }
    onChange({
      ...value,
      config: {
        ...value.config,
        buttons: [...value.config.buttons, next],
      },
    })
  }

  const updateButton = (buttonId: string, next: CustomButtonsButton) => {
    onChange({
      ...value,
      config: {
        ...value.config,
        buttons: value.config.buttons.map((button) => (button.id === buttonId ? next : button)),
      },
    })
  }

  const removeButton = (buttonId: string) => {
    if (value.config.buttons.length <= 1) return
    onChange({
      ...value,
      config: {
        ...value.config,
        buttons: value.config.buttons.filter((button) => button.id !== buttonId),
      },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Action Name</label>
        <input
          type="text"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
          placeholder="View Pricing"
        />
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">When should the chatbot show these buttons?</label>
        <textarea
          value={value.config.triggerInstructions}
          onChange={(event) => onChange({ ...value, config: { ...value.config, triggerInstructions: event.target.value } })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
          placeholder='e.g. "Show these buttons when the user asks about pricing or wants to explore the product"'
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Buttons</p>
          <button
            type="button"
            onClick={addButton}
            disabled={value.config.buttons.length >= MAX_BUTTONS}
            title={value.config.buttons.length >= MAX_BUTTONS ? 'Maximum 6 buttons per action' : undefined}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Button
          </button>
        </div>

        {value.config.buttons.length >= MAX_BUTTONS ? (
          <p className="text-xs text-amber-600">Maximum 6 buttons per action</p>
        ) : null}
        {errors.buttons ? <p className="text-xs text-red-600">{errors.buttons}</p> : null}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={buttonIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {value.config.buttons.map((button, index) => {
                const urlError = button.url && !isValidUrl(button.url) ? 'URL must start with http:// or https://' : undefined
                return (
                  <SortableButtonItem
                    key={button.id}
                    button={button}
                    index={index}
                    canDelete={value.config.buttons.length > 1}
                    urlError={urlError}
                    onChange={(next) => updateButton(button.id, next)}
                    onDelete={() => removeButton(button.id)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-slate-800">Enable action</p>
          <p className="text-xs text-slate-500">Keep off until reviewed</p>
        </div>
        <Switch checked={value.isEnabled} onCheckedChange={(next) => onChange({ ...value, isEnabled: next })} />
      </div>
    </div>
  )
}
