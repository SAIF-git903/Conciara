'use client'

import { ArrowUp, Mic } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'
import { useRef, useEffect, useState, useCallback } from 'react'

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

const LINE_HEIGHT_PX = 24
const MAX_LINES = 3
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

  const [isListening, setIsListening] = useState(false)
  const [dictationError, setDictationError] = useState<string | null>(null)
  const [voiceLevels, setVoiceLevels] = useState<number[]>([0.25, 0.25, 0.25, 0.25])
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

  const handleMicClick = () => {
    if (!isListening) startDictation()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !isLoading) {
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) onSubmit()
    }
    // Shift+Enter: allow default (insert newline, height grows)
  }

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), MAX_HEIGHT_PX)
    el.style.height = h + 'px'
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t" style={{ borderColor }}>
      <div
        className="flex items-end gap-1 rounded-full border bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-offset-0"
        style={{
          borderColor,
          '--tw-ring-color': primaryColor,
        } as React.CSSProperties}
      >
        <textarea
          ref={setRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 py-2.5 pl-4 pr-1 border-0 focus:outline-none focus:ring-0 bg-transparent text-sm resize-none overflow-y-auto rounded-full placeholder:text-gray-400"
          style={{
            minHeight: MIN_HEIGHT_PX,
            maxHeight: MAX_HEIGHT_PX,
          }}
          maxLength={inputConfig.maxLength}
          autoFocus={inputConfig.autoFocus !== false}
        />
        <div className="flex items-center gap-0.5 shrink-0 pr-1.5 pb-1.5 pt-1">
          {isListening && (
            <button
              type="button"
              aria-label="End dictation"
              title="End"
              onClick={stopListening}
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
          {!isListening && (
            <button
              type="button"
              aria-label="Dictate (speech to text)"
              title="Dictate"
              onClick={handleMicClick}
              disabled={!isDictationSupported || isLoading}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          {showSendButton && (
            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {(inputConfig.showCharacterCount && inputConfig.maxLength) || dictationError ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          {dictationError ? (
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

