'use client'

import { ArrowUp, Mic } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'
import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react'

// Web Speech API (SpeechRecognition) - not in all TS libs
type SpeechRecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
       (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition)
    : undefined

const LINE_HEIGHT_PX = 18
const MAX_LINES = 4
const MIN_HEIGHT_PX = LINE_HEIGHT_PX + 16
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES + 16

interface DynamicInputProps {
  config: MergedSkinConfig
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement>
}

export default function DynamicInput({
  config,
  value,
  onChange,
  onSubmit,
  isLoading,
  inputRef
}: DynamicInputProps) {
  const inputConfig = config.components?.input || {}
  const primaryColor = config.theme?.primaryColor || '#6366f1'
  const borderColor = config.theme?.borderColor || '#e5e7eb'
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const setRef = (el: HTMLTextAreaElement | null) => {
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    if (inputRef && typeof inputRef === 'object' && 'current' in inputRef)
      (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
  }

  const placeholder = inputConfig.placeholder || 'Message...'
  const showSendButton = inputConfig.showSendButton !== false
  const enableDictation = inputConfig.enableDictation !== false

  const [isListening, setIsListening] = useState(false)
  const [dictationError, setDictationError] = useState<string | null>(null)
  const [voiceLevels, setVoiceLevels] = useState<number[]>([0.25, 0.25, 0.25, 0.25])
  const [isExpanded, setIsExpanded] = useState(false)
  const recognitionRef = useRef<InstanceType<NonNullable<typeof SpeechRecognitionAPI>> | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafIdRef = useRef<number>(0)

  const isDictationSupported = !!SpeechRecognitionAPI

  const stopListening = useCallback(() => {
    rafIdRef.current && cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    try {
      audioContextRef.current?.close()
    } catch {
      //
    }
    audioContextRef.current = null
    analyserRef.current = null
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.stop()
      } catch {
        // already stopped
      }
      recognitionRef.current = null
    }
    setIsListening(false)
    setDictationError(null)
    setVoiceLevels([0.25, 0.25, 0.25, 0.25])
  }, [])

  const startDictation = useCallback(() => {
    if (!SpeechRecognitionAPI || isLoading) return
    setDictationError(null)
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    recognition.onresult = (event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        }
      }
      if (finalTranscript) {
        const current = valueRef.current
        const newValue = current ? `${current} ${finalTranscript}`.trim() : finalTranscript
        onChange(newValue)
      }
    }

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'not-allowed') {
        setDictationError('Microphone access denied')
      } else if (event.error !== 'aborted') {
        setDictationError('Speech recognition error')
      }
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
    }

    const setupVoiceVisualization = (stream: MediaStream) => {
      streamRef.current = stream
      try {
        const ctx = new AudioContext()
        audioContextRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.4
        analyser.minDecibels = -80
        analyser.maxDecibels = 0
        src.connect(analyser)
        analyserRef.current = analyser
      } catch {
        // AudioContext not supported or blocked
      }
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setupVoiceVisualization(stream)
        try {
          recognition.start()
          recognitionRef.current = recognition
          setIsListening(true)
        } catch (err) {
          stream.getTracks().forEach((t) => t.stop())
          setDictationError('Dictation not supported')
        }
      })
      .catch(() => {
        setDictationError('Microphone access denied')
      })
  }, [onChange, isLoading])

  // Voice-reactive animation: use overall volume so all 4 bars respond to speech
  useEffect(() => {
    if (!isListening || !analyserRef.current) return
    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const bars = 4
    // Slight per-bar multiplier for variation (so they don't all look identical)
    const barScale = [1, 0.92, 0.88, 0.85]

    const update = () => {
      if (!analyserRef.current) return
      analyserRef.current.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
      const raw = (sum / dataArray.length) / 255
      // Boost sensitivity: power curve so quiet sounds still move the bars
      const level = Math.min(1, Math.pow(raw, 0.5) * 2.2)
      const next = barScale.map((s) => Math.max(0.15, level * s))
      setVoiceLevels(next)
      rafIdRef.current = requestAnimationFrame(update)
    }
    rafIdRef.current = requestAnimationFrame(update)
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
  }, [isListening])

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current
      if (rec) {
        try {
          rec.abort()
        } catch {
          //
        }
        recognitionRef.current = null
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioContextRef.current?.close?.()
    }
  }, [])

  useEffect(() => {
    if (!enableDictation && isListening) stopListening()
  }, [enableDictation, isListening, stopListening])

  const handleMicClick = () => {
    if (enableDictation && !isListening) startDictation()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !isLoading) {
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) onSubmit()
    }
    // Shift+Enter / Ctrl+Enter: allow default (insert newline, height grows)
  }

  const resizeTextarea = useCallback((elOverride?: HTMLTextAreaElement | null) => {
    const el = elOverride || textareaRef.current
    if (!el) return
    const isEmpty = el.value.trim().length === 0
    const isFocused = document.activeElement === el
    const selectionStart = el.selectionStart
    const selectionEnd = el.selectionEnd
    const selectionDirection = el.selectionDirection
    const scrollTop = el.scrollTop

    // Reset first so shrink-on-delete works without jump.
    el.style.height = '0px'
    if (isEmpty) {
      // Hard reset when cleared so visual height always returns to compact mode.
      el.style.height = `${MIN_HEIGHT_PX}px`
      el.style.overflowY = 'hidden'
      el.scrollTop = 0
      setIsExpanded(false)
      return
    }
    const contentHeight = Math.max(el.scrollHeight, MIN_HEIGHT_PX)
    const nextHeight = Math.min(contentHeight, MAX_HEIGHT_PX)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = contentHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden'
    setIsExpanded(contentHeight > MIN_HEIGHT_PX + 2)
    const isOverflowing = contentHeight > MAX_HEIGHT_PX
    const caretAtEnd = selectionEnd === el.value.length

    // Keep caret stable while resizing to avoid cursor jumps.
    if (isFocused) {
      requestAnimationFrame(() => {
        try {
          el.setSelectionRange(selectionStart, selectionEnd, selectionDirection || 'none')
        } catch {
          //
        }
        el.scrollTop = isOverflowing && caretAtEnd ? el.scrollHeight : scrollTop
      })
    }
  }, [])

  useLayoutEffect(() => {
    resizeTextarea()
  }, [value, resizeTextarea])

  useEffect(() => {
    const onResize = () => resizeTextarea()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [resizeTextarea])

  const renderActionButtons = (variant: 'inline' | 'bottom') => {
    const hidden = (variant === 'inline' && isExpanded) || (variant === 'bottom' && !isExpanded)
    return (
      <>
        {enableDictation && isListening && (
          <button
            type="button"
            aria-label="End dictation"
            title="End"
            onClick={stopListening}
            tabIndex={hidden ? -1 : 0}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-end gap-0.5 h-4" aria-hidden>
              {voiceLevels.map((level, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-white transition-[height] duration-75 ease-out"
                  style={{
                    height: Math.max(3, Math.round(level * 14)),
                    transformOrigin: 'bottom',
                  }}
                />
              ))}
            </div>
            <span>End</span>
          </button>
        )}
        {enableDictation && !isListening && (
          <button
            type="button"
            aria-label="Dictate (speech to text)"
            title="Dictate"
            onClick={handleMicClick}
            disabled={!isDictationSupported || isLoading}
            tabIndex={hidden ? -1 : 0}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
        {showSendButton && (
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            tabIndex={hidden ? -1 : 0}
            className={`p-2 rounded-full transition-all duration-150 active:scale-95 disabled:cursor-not-allowed ${
              value.trim() && !isLoading
                ? 'text-white shadow-sm hover:opacity-90'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100'
            }`}
            style={value.trim() && !isLoading ? { backgroundColor: primaryColor } : undefined}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 pt-2">
      <div
        className={`relative flex flex-col border bg-white shadow-sm focus-within:ring-2 focus-within:ring-offset-0 transition-[padding,border-radius] duration-200 ease-out ${
          isExpanded ? 'rounded-3xl p-3' : 'rounded-full p-2'
        }`}
        style={{
          borderColor,
          '--tw-ring-color': primaryColor,
        } as React.CSSProperties}
      >
        <textarea
          ref={setRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            resizeTextarea(e.currentTarget)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className={`w-full border-0 focus:outline-none focus:ring-0 bg-transparent text-sm resize-none transition-[height,padding] duration-200 ease-out placeholder:text-gray-400 ${
            isExpanded ? 'rounded-2xl px-2 py-2 pr-2' : 'rounded-full pl-3 pr-24 py-2'
          }`}
          style={{
            minHeight: MIN_HEIGHT_PX,
            maxHeight: MAX_HEIGHT_PX,
          }}
          maxLength={inputConfig.maxLength}
          autoFocus={inputConfig.autoFocus !== false}
        />

        <div
          aria-hidden={isExpanded}
          className={`absolute right-2 bottom-2 flex items-center gap-0.5 transition-[opacity,transform] duration-200 ease-out ${
            isExpanded ? 'opacity-0 translate-y-1 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
        >
          {renderActionButtons('inline')}
        </div>

        <div
          aria-hidden={!isExpanded}
          className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out ${
            isExpanded ? 'max-h-16 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <div className="flex items-center justify-end gap-0.5">
            {renderActionButtons('bottom')}
          </div>
        </div>
      </div>
      {(inputConfig.showCharacterCount && inputConfig.maxLength) || (enableDictation && dictationError) ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          {enableDictation && dictationError ? (
            <span className="text-xs text-amber-600">{dictationError}</span>
          ) : (
            <span />
          )}
          {inputConfig.showCharacterCount && inputConfig.maxLength ? (
            <div className="text-xs text-gray-500">
              {value.length} / {inputConfig.maxLength}
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}

